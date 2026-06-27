import OpenAI from 'openai';
import { TOOLS, executeTool } from './tools';
import { masterPrompt, negocio } from './negocio';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';
import { resolve } from '@/lib/integrationsStore';

const MAX_HISTORY = 20;

function getClient(): OpenAI | null {
  const key = resolve().deepseekApiKey;
  return key
    ? new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' })
    : null;
}

function getModel(): string {
  return resolve().agentModel || 'deepseek-chat';
}

export const aiEnabled = () => Boolean(resolve().deepseekApiKey);

type Msg = OpenAI.Chat.ChatCompletionMessageParam;

// ── Triagem ──────────────────────────────────────────────────────────────
export async function classify(message: string): Promise<string> {
  const client = getClient();
  if (!client) return 'INFO';
  try {
    const res = await client.chat.completions.create({
      model: getModel(),
      max_tokens: 10,
      messages: [
        {
          role: 'system',
          content: `Classifique a mensagem do cliente de uma agência de expedições offroad.
Responda SOMENTE com uma palavra:
- COMERCIAL → interesse em contratar, preços, datas, vagas, fechar
- SUPORTE → já é cliente, dúvidas sobre expedição contratada, pagamento, logística
- INFO → dúvidas gerais, como funciona, o que está incluso`,
        },
        { role: 'user', content: message },
      ],
    });
    const cat = res.choices[0].message.content?.trim().toUpperCase().split(/\s/)[0];
    return ['COMERCIAL', 'SUPORTE', 'INFO'].includes(cat || '') ? cat! : 'INFO';
  } catch {
    return 'INFO';
  }
}

// ── Loop principal com tool use ─────────────────────────────────────────────
export async function runAgent(
  phone: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  operatorNotes?: string
): Promise<{ reply: string; usedTools: string[] }> {
  const client = getClient();
  if (!client) {
    return { reply: await fallbackReply(history[history.length - 1]?.content || ''), usedTools: [] };
  }

  const system = masterPrompt(operatorNotes);
  const messages: Msg[] = [
    { role: 'system', content: system },
    ...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content } as Msg)),
  ];
  const usedTools: string[] = [];
  const model = getModel();

  try {
    for (let i = 0; i < 6; i++) {
      const res = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      const choice = res.choices[0];

      if (choice.finish_reason === 'tool_calls') {
        messages.push(choice.message);
        for (const call of choice.message.tool_calls || []) {
          usedTools.push(call.function.name);
          const input = JSON.parse(call.function.arguments || '{}');
          const result = await executeTool(call.function.name, input, phone);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      const text = choice.message.content || '';
      return { reply: text || 'Pode repetir, por favor?', usedTools };
    }
    return { reply: 'Desculpe, tive um problema. Pode repetir?', usedTools };
  } catch (err: any) {
    console.error('[agent] erro na IA, usando fallback:', err?.message);
    return {
      reply: await fallbackReply(history[history.length - 1]?.content || ''),
      usedTools,
    };
  }
}

// ── Fallback sem IA ──────────────────────────────────────────────────────────
async function fallbackReply(message: string): Promise<string> {
  const m = message.toLowerCase();

  if (m.includes('preç') || m.includes('valor') || m.includes('quanto') || m.includes('expedi') || m.includes('próxim') || m.includes('proxim') || m.includes('disponí')) {
    const open = (await expeditionsStore.all()).filter(
      (e) => e.status === 'aberta' || e.status === 'em_andamento'
    );
    if (open.length === 0) {
      return 'No momento estou organizando as próximas saídas. Me deixa seu nome que assim que abrir eu te aviso? 😊';
    }
    const lines = await Promise.all(
      open.map(async (e) => {
        const d = await buildExpeditionDetail(e);
        return `• ${e.routeName} — R$ ${e.pricePerPerson.toLocaleString('pt-BR')} por pessoa (${d.finance.slotsAvailable} vagas)`;
      })
    );
    return `Temos estas expedições abertas:\n${lines.join('\n')}\n\nQual delas te interessa? Posso já reservar sua vaga.`;
  }

  if (m.includes('pagar') || m.includes('pagamento') || m.includes('reserv') || m.includes('fechar') || m.includes('link')) {
    return 'Perfeito! Me confirma seu nome completo e qual expedição você quer que eu já preparo o link de pagamento seguro pra você 😊';
  }

  if (m.includes('criança') || m.includes('crianca') || m.includes('filho')) {
    return negocio.faq.find((f) => f.pergunta === 'crianca')!.resposta;
  }

  return `Olá! 👋 Sou a assistente da ${negocio.empresa}. Posso te mostrar as expedições, valores e já reservar sua vaga. O que você procura?`;
}
