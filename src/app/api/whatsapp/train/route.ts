import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { resolve } from '@/lib/integrationsStore';
import { getSettings, updateSettings } from '@/lib/settingsStore';
import { createFlow, updateFlow, listFlows } from '@/lib/flowsStore';
import { kvLoad, kvSave } from '@/lib/kvStore';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TrainAttachment {
  type: 'image' | 'audio' | 'video' | 'link';
  url: string;
  name: string;
}

export interface TrainMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: TrainAttachment[];
  actionsCreated?: string[];
  at: string;
}

const KV_KEY = 'training_history';

async function loadHistory(): Promise<TrainMessage[]> {
  return (await kvLoad<TrainMessage[]>(KV_KEY)) ?? [];
}

async function saveHistory(h: TrainMessage[]): Promise<void> {
  await kvSave(KV_KEY, h.slice(-60));
}

// ── Prompt do treinador ───────────────────────────────────────────────────────

function buildSystemPrompt(currentNotes: string, existingFlows: string): string {
  return `Você é o configurador inteligente do bot de WhatsApp da 4x4 Mundo Afora (expedições offroad).
O operador está te treinando: ele vai mandar instruções em texto e pode anexar imagens, áudios, vídeos e links.

INSTRUÇÕES DO OPERADOR ATUAIS:
${currentNotes || '(nenhuma ainda)'}

FLUXOS EXISTENTES:
${existingFlows || '(nenhum)'}

Analise o que o operador enviou e responda APENAS em JSON válido, sem markdown:
{
  "reply": "resposta conversacional para o operador confirmando o que entendeu e o que foi feito",
  "updatedNotes": "texto completo das instruções do operador (null se não mudar nada)",
  "createFlows": [
    {
      "name": "Nome EXATO do fluxo (mesmo nome se for atualização)",
      "description": "descrição",
      "trigger": "new_lead | keyword | manual",
      "triggerData": {"keywords": "palavra1,palavra2"},
      "steps": [
        {"order": 0, "type": "text | image | audio | video | delay", "content": "texto ou URL", "delayMin": 0}
      ]
    }
  ]
}

REGRAS CRÍTICAS:
- Se o operador pedir para ADICIONAR algo a um fluxo existente → coloque o fluxo COMPLETO em createFlows com o nome EXATO, incluindo os steps já existentes + os novos. O sistema substitui o fluxo com o mesmo nome.
- Se o operador pedir para REMOVER algo de um fluxo existente → coloque o fluxo COMPLETO sem o step removido.
- Se o operador mostrou uma mídia (foto/audio/video) + disse "quando X, manda isso" → crie um fluxo com a URL da mídia
- Se o operador deu regras gerais de atendimento → atualize updatedNotes
- Se for misto → faça os dois
- createFlows: array vazio [] se não precisar criar ou atualizar nenhum
- updatedNotes: null se não mudar as notas
- Na reply seja específico: "Entendido! Adicionei o step de vídeo ao final do fluxo 'X' — agora ele tem Y etapas."
- Para fluxos com keyword, coloque as palavras que ativam em triggerData.keywords
- Para imagens: step type="image", content=URL
- Para áudio: step type="audio", content=URL
- Para vídeo: step type="video", content=URL
- Não invente URLs — use as URLs que o operador forneceu
- NUNCA retorne um fluxo com steps incompletos ou vazios`;
}

// ── GET: histórico ────────────────────────────────────────────────────────────

export async function GET() {
  const history = await loadHistory();
  return NextResponse.json({ history });
}

// ── DELETE: limpar histórico ──────────────────────────────────────────────────

export async function DELETE() {
  await saveHistory([]);
  return NextResponse.json({ ok: true });
}

// ── POST: processar instrução ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, attachments = [] }: { message: string; attachments: TrainAttachment[] } = body;

  if (!message?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: 'message ou attachments obrigatório' }, { status: 400 });
  }

  // Monta contexto da mensagem do usuário com as mídias
  let userContent = message || '';
  if (attachments.length > 0) {
    const mediaLines = attachments.map((a) => {
      const label = a.type === 'image' ? '📷 Imagem' : a.type === 'audio' ? '🎤 Áudio' : a.type === 'video' ? '🎬 Vídeo' : '🔗 Link';
      return `${label} "${a.name}": ${a.url}`;
    });
    userContent += (userContent ? '\n\n' : '') + 'Mídias anexadas:\n' + mediaLines.join('\n');
  }

  // Carrega estado atual
  const [settings, flows, history, cfg] = await Promise.all([
    getSettings(),
    listFlows(),
    loadHistory(),
    resolve(),
  ]);

  const existingFlows = flows.map((f) => {
    const steps = (f.steps || []).map((s: any) =>
      s.type === 'delay'
        ? `[delay ${s.delayMin}min]`
        : `[${s.type}: ${(s.content || '').slice(0, 80)}]`
    ).join(' → ');
    return `- "${f.name}" (trigger: ${f.trigger}, keywords: ${f.triggerData?.keywords || '-'})\n  Etapas: ${steps || '(vazio)'}`;
  }).join('\n');
  const client = cfg.deepseekApiKey
    ? new OpenAI({ apiKey: cfg.deepseekApiKey, baseURL: 'https://api.deepseek.com' })
    : null;

  if (!client) {
    return NextResponse.json({ error: 'DeepSeek API não configurada' }, { status: 503 });
  }

  // Histórico de conversa para contexto
  const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(settings.operatorNotes, existingFlows) },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content + (m.attachments?.length
        ? '\nMídias: ' + m.attachments.map((a) => `${a.type}: ${a.url}`).join(', ')
        : ''),
    })),
    { role: 'user', content: userContent },
  ];

  let aiResponse: { reply: string; updatedNotes?: string | null; createFlows?: any[] };

  try {
    const res = await client.chat.completions.create({
      model: cfg.agentModel || 'deepseek-chat',
      max_tokens: 4096,
      messages: contextMessages,
      response_format: { type: 'json_object' },
    });
    const raw = res.choices[0].message.content || '{}';
    try {
      aiResponse = JSON.parse(raw);
    } catch {
      // JSON truncado: extrai o que for possível
      const replyMatch = raw.match(/"reply"\s*:\s*"([^"]+)"/);
      aiResponse = {
        reply: replyMatch?.[1] ?? 'Entendido! Apliquei as instruções.',
        updatedNotes: null,
        createFlows: [],
      };
    }
  } catch (err: any) {
    console.error('[train] AI error:', err?.message);
    return NextResponse.json({ error: 'Erro na IA: ' + err?.message }, { status: 500 });
  }

  const actionsCreated: string[] = [];

  // Aplica: atualiza operatorNotes
  if (aiResponse.updatedNotes && aiResponse.updatedNotes !== settings.operatorNotes) {
    await updateSettings({ operatorNotes: aiResponse.updatedNotes });
    actionsCreated.push('Instruções do operador atualizadas');
  }

  // Aplica: cria ou atualiza fluxos
  for (const f of aiResponse.createFlows || []) {
    try {
      const flowData = {
        name: f.name || 'Fluxo treinamento',
        description: f.description || '',
        trigger: f.trigger || 'manual',
        triggerData: f.triggerData || {},
        active: true,
        steps: (f.steps || []).map((s: any, i: number) => ({ ...s, order: i })),
      };
      const existing = flows.find((ef) => ef.name.toLowerCase() === flowData.name.toLowerCase());
      if (existing) {
        await updateFlow(existing.id, flowData);
        actionsCreated.push(`Fluxo atualizado: "${f.name}"`);
      } else {
        await createFlow(flowData);
        actionsCreated.push(`Fluxo criado: "${f.name}"`);
      }
    } catch (e: any) {
      console.error('[train] erro ao salvar fluxo:', e?.message);
    }
  }

  // Salva histórico
  const newHistory: TrainMessage[] = [
    ...history,
    {
      role: 'user',
      content: message || '',
      attachments: attachments.length > 0 ? attachments : undefined,
      at: new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: aiResponse.reply || 'Entendido!',
      actionsCreated: actionsCreated.length > 0 ? actionsCreated : undefined,
      at: new Date().toISOString(),
    },
  ];
  await saveHistory(newHistory);

  return NextResponse.json({
    reply: aiResponse.reply || 'Entendido!',
    actionsCreated,
  });
}
