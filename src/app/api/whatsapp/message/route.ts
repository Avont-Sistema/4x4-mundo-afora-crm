import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, leadId, clientId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Chamar Claude API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const botMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    // Registrar interação (mock - em produção salvar no DB)
    console.log({
      timestamp: new Date(),
      leadId,
      clientId,
      userMessage: message,
      botResponse: botMessage,
    });

    return NextResponse.json({
      success: true,
      message: botMessage,
      timestamp: new Date(),
      leadId,
      clientId,
    });
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
