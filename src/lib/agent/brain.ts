import OpenAI from 'openai';
import { TOOLS, executeTool } from './tools';
import { masterPrompt, negocio } from './negocio';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';
import { resolve } from '@/lib/integrationsStore';

const MAX_HISTORY = 30;

async function getClient(): Promise<OpenAI | null> {
  const key = (await resolve()).deepseekApiKey;
  return key
    ? new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' })
    : null;
}

async function getModel(): Promise<string> {
  return (await resolve()).agentModel || 'deepseek-chat';
}

export const aiEnabled = async () => Boolean((await resolve()).deepseekApiKey);

type Msg = OpenAI.Chat.ChatCompletionMessageParam;

// ── Triagem ──────────────────────────────────────────────────────────────
export async function classify(message: string): Promise<string> {
  const client = await getClient();
  if (!client) return 'INFO';
  try {
    const res = await client.chat.completions.create({
      model: await getModel(),
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
  operatorNotes?: string,
  clientContext?: string
): Promise<{ reply: string; usedTools: string[] }> {
  const client = await getClient();
  if (!client) {
    return { reply: await fallbackReply(history[history.length - 1]?.content || '', history), usedTools: [] };
  }

  let system = masterPrompt(operatorNotes);
  if (clientContext?.trim()) {
    system += `\n\nCONTEXTO DO CLIENTE (dados reais do CRM sobre quem está falando com você):\n${clientContext.trim()}`;
  }
  const messages: Msg[] = [
    { role: 'system', content: system },
    ...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content } as Msg)),
  ];
  const usedTools: string[] = [];
  const model = await getModel();

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
      reply: await fallbackReply(history[history.length - 1]?.content || '', history),
      usedTools,
    };
  }
}

// ── Fallback sem IA ──────────────────────────────────────────────────────────
function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function findExpeditionInText(text: string, allExp: Awaited<ReturnType<typeof expeditionsStore.all>>) {
  const t = normalize(text);
  return allExp.find((e) => {
    const name = normalize(e.routeName);
    return name.split(/\s+/).some((word) => word.length > 3 && t.includes(word));
  });
}

function findLastMentionedExp(
  history: { role: string; content: string }[],
  allExp: Awaited<ReturnType<typeof expeditionsStore.all>>
) {
  // Varre histórico do mais recente para o mais antigo
  for (let i = history.length - 1; i >= 0; i--) {
    const found = findExpeditionInText(history[i].content, allExp);
    if (found) return found;
  }
  return null;
}

async function expDetail(exp: Awaited<ReturnType<typeof expeditionsStore.all>>[number]): Promise<string> {
  const d = await buildExpeditionDetail(exp);
  const price = exp.pricePerPerson > 0
    ? `R$ ${exp.pricePerPerson.toLocaleString('pt-BR')} por pessoa`
    : 'valor a confirmar (entre em contato)';
  const vagas = d.finance.slotsAvailable;
  const status = vagas > 0 ? `${vagas} vagas disponíveis` : 'sem vagas no momento';
  const dates = exp.startDate
    ? `Saída: ${new Date(exp.startDate).toLocaleDateString('pt-BR')}.`
    : '';
  return `*${exp.routeName}*\n${dates}\nValor: ${price}\nVagas: ${status}\n\nQuer reservar ou tem mais alguma dúvida?`;
}

async function fallbackReply(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const m = normalize(message);
  const allExp = await expeditionsStore.all();
  const openExp = allExp.filter((e) => e.status === 'aberta' || e.status === 'em_andamento');

  // 1. Expedição mencionada na mensagem atual
  const currentMention = findExpeditionInText(message, allExp);
  if (currentMention) {
    return expDetail(currentMention);
  }

  // 2. Pergunta sobre a expedição do contexto (sub-perguntas que não citam o nome)
  const contextualQuestion = m.match(
    /mais (detalhe|info|sobre)|detalhe|fale mais|me conta|me diz|como e|como funciona|o que (tem|inclui|incluso)|quantos dias|quanto tempo|duracao|itinerario|roteiro|foto|imagem|incluso|inclui|acampamento|hospedagem|refeicao|comida|dificuldade|nivel|precisa de|essa|nessa|dela|sobre ela/
  );
  if (contextualQuestion) {
    const contextExp = findLastMentionedExp([...history], allExp);
    if (contextExp) {
      // Sub-perguntas específicas que o fallback não tem dados suficientes
      if (m.match(/foto|imagem/)) {
        return `Não tenho as fotos aqui no chat, mas você pode ver no nosso Instagram @4x4mundoafora 📸\n\nQuer mais informações sobre a ${contextExp.routeName} ou fechar sua vaga?`;
      }
      if (m.match(/quantos dias|quanto tempo|duracao/)) {
        const start = contextExp.startDate ? new Date(contextExp.startDate) : null;
        const end = contextExp.endDate ? new Date(contextExp.endDate) : null;
        const dias = start && end ? Math.round((end.getTime() - start.getTime()) / 86400000) : null;
        const durStr = dias ? `${dias} dias` : 'duração a confirmar';
        return `A ${contextExp.routeName} tem ${durStr}${start ? `, saindo em ${start.toLocaleDateString('pt-BR')}` : ''}.\n\nQuer garantir sua vaga? Posso preparar o link de pagamento 😊`;
      }
      return expDetail(contextExp);
    }
    // Pergunta contextual mas sem expedição mencionada — mostra as opções disponíveis
    if (openExp.length > 0) {
      const nomes = openExp.map((e) => `• ${e.routeName}`).join('\n');
      return `Claro! Temos estas expedições disponíveis:\n${nomes}\n\nSobre qual você gostaria de saber mais?`;
    }
    return `Claro! No momento estou organizando as próximas saídas. Me passa seu nome que te aviso quando abrir! 😊`;
  }

  // 3. Lista de expedições abertas (só quando perguntando de forma genérica)
  if (m.match(/prec|valor|expedi|proxim|disponi|opcao|opcoes|tem algo|quais/)) {
    if (openExp.length === 0) {
      return 'No momento estou organizando as próximas saídas. Me deixa seu nome que assim que abrir eu te aviso? 😊';
    }
    const lines = await Promise.all(
      openExp.map(async (e) => {
        const d = await buildExpeditionDetail(e);
        const price = e.pricePerPerson > 0 ? `R$ ${e.pricePerPerson.toLocaleString('pt-BR')}` : 'a consultar';
        return `• ${e.routeName} — ${price} por pessoa (${d.finance.slotsAvailable} vagas)`;
      })
    );
    return `Temos estas expedições abertas:\n${lines.join('\n')}\n\nQual delas te interessa? Posso já reservar sua vaga.`;
  }

  // 4. Quer falar com humano / atendente
  if (m.match(/falar com|chamar|atendente|humano|pessoa|diego|michelle|gerente|responsavel|dono/)) {
    return `Vou avisar nossa equipe para entrar em contato com você em breve! 😊\n\nSe quiser, pode também nos chamar direto no Instagram @4x4mundoafora.`;
  }

  // 5. Fornecedor / parceiro
  if (m.match(/fornecedor|parceiro|parceria|hotel|restaurante|guia|prestador|servico/)) {
    return `Olá! Para parcerias e fornecedores, entre em contato com nossa equipe:\n📸 Instagram: @4x4mundoafora\n📧 Email: regesjunioroficial8@gmail.com\n\nResponderemos em breve! 😊`;
  }

  // 6. Pagamento / reserva
  if (m.match(/pagar|pagamento|reserv|fechar|link|quero ir|vou querer|confirma/)) {
    const contextExp = findLastMentionedExp([...history], allExp);
    const expName = contextExp ? ` para a ${contextExp.routeName}` : '';
    return `Perfeito! Me confirma seu nome completo${expName ? expName : ' e qual expedição você quer'} que eu já preparo o link de pagamento seguro pra você 😊`;
  }

  // 7. FAQs
  if (m.match(/crianca|filho|criança/)) return negocio.faq.find((f) => f.pergunta === 'crianca')!.resposta;
  if (m.match(/inclui|incluso|pacote/)) return negocio.faq.find((f) => f.pergunta === 'incluso')!.resposta;
  if (m.match(/4x4|carro|veiculo|precisa/)) return negocio.faq.find((f) => f.pergunta === 'precisa de carro 4x4')!.resposta;

  // 8. Saudação / social — resposta contextual baseada no histórico
  if (m.match(/^(oi+|ola|bom dia|boa tarde|boa noite|hey|hello|salve)\b/) && message.length < 30) {
    const jaFoiAtendido = history.some((h) => h.role === 'assistant');
    if (jaFoiAtendido) {
      return `Pode falar! Estou aqui para te ajudar com expedições, valores e reservas. 😊`;
    }
    return `Olá! 👋 Sou a assistente da ${negocio.empresa}. Posso te mostrar as expedições, valores e já reservar sua vaga. O que você procura?`;
  }

  if (m.match(/^tudo (bem|bom|certo|ok)\b/) && message.length < 25) {
    return `Tudo ótimo por aqui! 😊 Posso te ajudar com informações sobre expedições, valores ou reservas. O que você procura?`;
  }

  // 9. Mensagem com "mais informações", "me conta", "sobre isso" sem contexto de expedição
  if (m.match(/mais info|mais detal|me conta|me diz|sobre isso|sobre ela|como funciona/)) {
    if (openExp.length > 0) {
      const nomes = openExp.map((e) => `• ${e.routeName}`).join('\n');
      return `Claro! Temos estas expedições disponíveis:\n${nomes}\n\nSobre qual você gostaria de saber mais?`;
    }
    return `Claro! No momento estou organizando as próximas saídas. Me passa seu nome que te aviso quando abrir! 😊`;
  }

  // 10. Contexto: só usa expedição recente se as últimas mensagens ainda falam de expedição
  const recentHistory = history.slice(-4);
  const lastExp = findLastMentionedExp(recentHistory, allExp);
  if (lastExp) {
    return `Posso te ajudar com ${lastExp.routeName}: valor, vagas, datas ou fechar reserva. O que prefere? 😊`;
  }

  return `Pode me contar mais? Consigo te ajudar com informações sobre expedições, valores, vagas e reservas. 😊`;
}
