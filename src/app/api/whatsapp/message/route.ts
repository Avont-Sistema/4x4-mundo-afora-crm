import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { findLeadByPhone, upsertLeadFromContact } from '@/lib/leadsStore';

const apiKey = process.env.ANTHROPIC_API_KEY || '';
const client = apiKey ? new Anthropic({ apiKey }) : null;

// Mock de expedições disponíveis
const expeditions = [
  {
    name: 'Lençóis Maranhenses',
    date: '15-20 de julho',
    price: 2500,
    description: 'Aventura pelos lençóis brancos e lagoas cristalinas',
  },
  {
    name: 'Vale da Lua',
    date: '1-5 de agosto',
    price: 1800,
    description: 'Exploração do canyon e cachoeiras',
  },
  {
    name: 'Cachoeira do Riachão',
    date: '10-12 de agosto',
    price: 1200,
    description: 'Trilha e banho em cachoeira',
  },
];

const systemPrompt = `Você é um agente de vendas da 4x4 Mundo Afora, uma agência de expedições offroad no Brasil.

Suas responsabilidades:
1. Responder perguntas sobre expedições (datas, preços, descrição)
2. Ajudar clientes a fazer reservas
3. Gerar links de pagamento (forneça o link: https://4x4mundoafora.com/checkout)
4. Enviar informações sobre a próxima expedição
5. Obter dados do cliente para cadastro

EXPEDIÇÕES DISPONÍVEIS:
${expeditions.map((e) => `- ${e.name}: ${e.date} | R$ ${e.price} | ${e.description}`).join('\n')}

REGRAS:
- Sempre seja cordial e profissional
- Se o cliente quer fazer uma reserva, solicite: nome completo, email, telefone, data preferida
- Para gerar link de pagamento, diga que enviará um link seguro de checkout
- Se o cliente perguntar sobre expedição específica, dê detalhes
- Sempre termine oferecendo próximos passos

Responda em português brasileiro e seja conciso.`;

// Detecta interesse em alguma expedição pela mensagem
function detectInterest(message: string): string | undefined {
  const m = message.toLowerCase();
  const found = expeditions.find((e) =>
    m.includes(e.name.toLowerCase().split(' ')[0])
  );
  return found?.name;
}

// Resposta sem IA (fallback quando não há ANTHROPIC_API_KEY configurada)
function fallbackReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('preço') || m.includes('valor') || m.includes('quanto')) {
    return `Nossas expedições:\n${expeditions
      .map((e) => `• ${e.name}: R$ ${e.price.toLocaleString('pt-BR')} (${e.date})`)
      .join('\n')}\n\nQual te interessa? Posso já reservar pra você. 🚙`;
  }
  if (m.includes('próxima') || m.includes('proxima') || m.includes('expedi') || m.includes('disponí')) {
    return `A próxima é a *${expeditions[0].name}* (${expeditions[0].date}) por R$ ${expeditions[0].price.toLocaleString('pt-BR')}. ${expeditions[0].description}. Quer garantir sua vaga?`;
  }
  if (m.includes('pagar') || m.includes('pagamento') || m.includes('link') || m.includes('reserv')) {
    return 'Perfeito! Para gerar seu link de pagamento seguro preciso confirmar: nome completo, email e a expedição escolhida. Pode me passar?';
  }
  return 'Olá! 👋 Sou o assistente da 4x4 Mundo Afora. Posso te falar sobre nossas expedições, valores e já reservar sua vaga. O que você procura?';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, phone, contactName, clientId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // --- Auto-cadastro de lead ---------------------------------------------
    // Toda nova mensagem de um telefone desconhecido vira um novo lead,
    // atendido pela IA. Telefones já conhecidos apenas atualizam a última msg.
    let leadCreated = false;
    let lead = null;
    if (phone) {
      const existing = findLeadByPhone(phone);
      const result = upsertLeadFromContact({
        name: contactName || existing?.name || phone,
        phone,
        whatsapp: phone,
        source: 'whatsapp',
        stage: 'novo',
        handledBy: 'ia',
        interest: detectInterest(message),
        lastMessage: message,
        notes: 'Lead criado automaticamente pelo bot do WhatsApp',
      });
      lead = result.lead;
      leadCreated = result.created;
    }

    // --- Resposta da IA ----------------------------------------------------
    let botMessage: string;
    if (client) {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });
      botMessage =
        response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      botMessage = fallbackReply(message);
    }

    return NextResponse.json({
      success: true,
      message: botMessage,
      timestamp: new Date(),
      leadCreated,
      lead,
      clientId,
      aiEnabled: Boolean(client),
    });
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar mensagem' },
      { status: 500 }
    );
  }
}
