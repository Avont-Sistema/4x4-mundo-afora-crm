import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, executeTool } from './tools';
import { masterPrompt, negocio } from './negocio';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';

const apiKey = process.env.ANTHROPIC_API_KEY || '';
const client = apiKey ? new Anthropic({ apiKey }) : null;
const MODEL = process.env.AGENT_MODEL || 'claude-haiku-4-5';
const MAX_HISTORY = 20;

export const aiEnabled = () => Boolean(client);

type Msg = { role: 'user' | 'assistant'; content: any };

// ── Triagem ──────────────────────────────────────────────────────────────
export async function classify(message: string): Promise<string> {
  if (!client) return 'INFO';
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      system: `Classifique a mensagem do cliente de uma agência de expedições offroad.
Responda SOMENTE com uma palavra:
- COMERCIAL → interesse em contratar, preços, datas, vagas, fechar
- SUPORTE → já é cliente, dúvidas sobre expedição contratada, pagamento, logística
- INFO → dúvidas gerais, como funciona, o que está incluso`,
      messages: [{ role: 'user', content: message }],
    });
    const cat = (res.content[0] as any).text?.trim().toUpperCase().split(/\s/)[0];
    return ['COMERCIAL', 'SUPORTE', 'INFO'].includes(cat) ? cat : 'INFO';
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
  if (!client) {
    return { reply: fallbackReply(history[history.length - 1]?.content || ''), usedTools: [] };
  }

  const system = masterPrompt(operatorNotes);
  const messages: Msg[] = history.slice(-MAX_HISTORY).map((m) => ({ ...m }));
  const usedTools: string[] = [];

  for (let i = 0; i < 6; i++) {
    const res: any = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages,
    } as any);

    if (res.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: res.content });
      const toolResults: any[] = [];
      for (const block of res.content as any[]) {
        if (block.type !== 'tool_use') continue;
        usedTools.push(block.name);
        const result = await executeTool(block.name, block.input, phone);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // resposta final
    const text =
      (res.content.find((b: any) => b.type === 'text') as any)?.text || '';
    return { reply: text || 'Pode repetir, por favor?', usedTools };
  }

  return { reply: 'Desculpe, tive um problema. Pode repetir?', usedTools };
}

// ── Fallback sem IA (mantém o sistema funcional sem ANTHROPIC_API_KEY) ──────
function fallbackReply(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('preç') || m.includes('valor') || m.includes('quanto') || m.includes('expedi') || m.includes('próxim') || m.includes('proxim') || m.includes('disponí')) {
    const open = expeditionsStore
      .all()
      .filter((e) => e.status === 'aberta' || e.status === 'em_andamento');
    if (open.length === 0) {
      return 'No momento estou organizando as próximas saídas. Me deixa seu nome que assim que abrir eu te aviso? 😊';
    }
    const lines = open.map((e) => {
      const d = buildExpeditionDetail(e);
      return `• ${e.routeName} — R$ ${e.pricePerPerson.toLocaleString('pt-BR')} por pessoa (${d.finance.slotsAvailable} vagas)`;
    });
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
