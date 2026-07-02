import type OpenAI from 'openai';
import { negocio } from './negocio';
import {
  expeditionsStore,
  buildExpeditionDetail,
  type Expedition,
} from '@/lib/expeditionsStore';
import { clientsStore } from '@/lib/clientsStore';
import { upsertLeadFromContact, findLeadByPhone } from '@/lib/leadsStore';
import { setMode } from '@/lib/conversationsStore';
import { createCharge } from '@/lib/payments';

// ── Definições de tools no formato OpenAI (compatível com DeepSeek) ──────────
export const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_expedicoes',
      description:
        'Lista as expedições abertas com datas, vagas disponíveis e preços reais. Use sempre que o cliente perguntar sobre opções, próximas saídas, valores ou disponibilidade.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_expedicao',
      description:
        'Detalha uma expedição específica pelo nome (ou parte dele): datas, vagas, preço por adulto e por criança.',
      parameters: {
        type: 'object',
        properties: { nome: { type: 'string', description: 'Nome ou parte do nome da expedição' } },
        required: ['nome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_cliente',
      description:
        'Busca se o telefone já é um lead ou cliente cadastrado (nome, estágio, expedições).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_lead',
      description:
        'Registra/atualiza o interesse do cliente como lead no CRM. Use assim que souber o nome e o interesse.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome do cliente' },
          interesse: { type: 'string', description: 'Expedição ou assunto de interesse' },
          observacoes: { type: 'string', description: 'Outras informações relevantes' },
        },
        required: ['nome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gerar_link_pagamento',
      description:
        'Gera o pagamento da expedição. Suporta PIX, cartão e parcelamento (quando informado parcelas). Informe a expedição, quantidade de pessoas e, para cartão/parcelado, peça o CPF do cliente.',
      parameters: {
        type: 'object',
        properties: {
          expedicao: { type: 'string', description: 'Nome da expedição' },
          adultos: { type: 'number', description: 'Quantidade de adultos' },
          criancas: { type: 'number', description: 'Quantidade de crianças' },
          nome: { type: 'string', description: 'Nome do cliente' },
          cpf: { type: 'string', description: 'CPF do cliente (necessário para cartão/parcelado via Asaas)' },
          parcelas: { type: 'number', description: 'Número de parcelas (1 = à vista)' },
        },
        required: ['expedicao'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cadastrar_cliente',
      description:
        'Cadastra o cliente no CRM (use após o cliente confirmar interesse de fechar ou efetuar pagamento).',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome completo' },
          email: { type: 'string', description: 'Email (se tiver)' },
        },
        required: ['nome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'matricular_cliente',
      description:
        'Matricula o cliente em uma expedição. Use após cadastrar o cliente e ele confirmar a ida.',
      parameters: {
        type: 'object',
        properties: {
          expedicao: { type: 'string', description: 'Nome da expedição' },
          adultos: { type: 'number' },
          criancas: { type: 'number' },
        },
        required: ['expedicao'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_pagamento',
      description:
        'Lança um pagamento do cliente numa expedição que ele já está matriculado.',
      parameters: {
        type: 'object',
        properties: {
          expedicao: { type: 'string' },
          valor: { type: 'number', description: 'Valor pago em reais' },
          metodo: { type: 'string', description: 'pix, cartao, link...' },
        },
        required: ['expedicao', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_faq',
      description: 'Responde dúvidas frequentes (carro 4x4, criança, o que está incluso, pagamento).',
      parameters: {
        type: 'object',
        properties: { pergunta: { type: 'string' } },
        required: ['pergunta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalar_humano',
      description:
        'Transfere a conversa para um atendente humano. Use APENAS em reclamações graves ou quando absolutamente não souber responder E as instruções do operador não cobrirem o caso. Se as instruções do operador já dizem o que fazer (ex: dar um número de telefone, explicar uma regra), siga as instruções e NÃO use esta ferramenta.',
      parameters: {
        type: 'object',
        properties: { motivo: { type: 'string' } },
      },
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

// URL pública do CRM — usada para montar o link de formulário exclusivo de cada
// expedição (o MESMO link do botão "Link de Formulário" na tela da expedição).
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  'https://4x4-mundo-afora-crm-iota.vercel.app';

export function expeditionFormUrl(expeditionId: string): string {
  return `${APP_URL}/cadastro?exp=${expeditionId}`;
}

async function findExpeditionByName(nome: string): Promise<Expedition | undefined> {
  const q = (nome || '').toLowerCase();
  const all = await expeditionsStore.all();
  return (
    all.find((e) => e.routeName.toLowerCase() === q) ||
    all.find((e) => e.routeName.toLowerCase().includes(q)) ||
    all.find((e) => q.includes(e.routeName.toLowerCase().split(' ')[0]))
  );
}

async function clientByPhone(phone: string) {
  const n = (phone || '').replace(/\D/g, '');
  return (await clientsStore.all()).find(
    (c) =>
      (c.phone || '').replace(/\D/g, '') === n ||
      (c.whatsapp || '').replace(/\D/g, '') === n
  );
}

// ── Execução ────────────────────────────────────────────────────────────────
export async function executeTool(
  name: string,
  input: any,
  phone: string
): Promise<any> {
  switch (name) {
    case 'consultar_expedicoes': {
      const ativas = (await expeditionsStore.all()).filter(
        (e) => e.status === 'aberta' || e.status === 'em_andamento'
      );
      const open = await Promise.all(
        ativas.map(async (e) => {
          const d = await buildExpeditionDetail(e);
          return {
            nome: e.routeName,
            local: e.location,
            inicio: e.startDate,
            fim: e.endDate,
            vagas_disponiveis: d.finance.slotsAvailable,
            preco_adulto: e.pricePerPerson,
            preco_crianca: e.pricePerChild,
            link_formulario: expeditionFormUrl(e.id),
          };
        })
      );
      return { total: open.length, expedicoes: open };
    }

    case 'consultar_expedicao': {
      const exp = await findExpeditionByName(input.nome);
      if (!exp) return { encontrada: false, mensagem: 'Expedição não encontrada.' };
      const d = await buildExpeditionDetail(exp);
      return {
        encontrada: true,
        nome: exp.routeName,
        descricao: exp.description,
        local: exp.location,
        inicio: exp.startDate,
        fim: exp.endDate,
        vagas_disponiveis: d.finance.slotsAvailable,
        preco_adulto: exp.pricePerPerson,
        preco_crianca: exp.pricePerChild,
        link_formulario: expeditionFormUrl(exp.id),
      };
    }

    case 'consultar_cliente': {
      const lead = await findLeadByPhone(phone);
      const client = await clientByPhone(phone);
      return {
        e_lead: !!lead,
        e_cliente: !!client,
        nome: client?.name || lead?.name || null,
        estagio_lead: lead?.stage || null,
      };
    }

    case 'registrar_lead': {
      const { lead, created } = await upsertLeadFromContact({
        name: input.nome,
        phone,
        whatsapp: phone,
        source: 'whatsapp',
        stage: 'novo',
        handledBy: 'ia',
        interest: input.interesse,
        notes: input.observacoes,
        lastMessage: input.observacoes,
      });
      return { sucesso: true, novo: created, lead_id: lead.id };
    }

    case 'gerar_link_pagamento': {
      const exp = await findExpeditionByName(input.expedicao);
      if (!exp) return { sucesso: false, mensagem: 'Expedição não encontrada.' };
      const adultos = Number(input.adultos) || 1;
      const criancas = Number(input.criancas) || 0;
      const valor = adultos * exp.pricePerPerson + criancas * exp.pricePerChild;
      const client = await clientByPhone(phone);
      const charge = await createCharge({
        clientName: input.nome || client?.name || 'Cliente',
        phone,
        email: client?.email,
        cpf: input.cpf || client?.cpf,
        value: valor,
        installments: input.parcelas ? Number(input.parcelas) : undefined,
        description: `Expedição ${exp.routeName}`,
        expeditionId: exp.id,
      });
      if (charge.provider === 'asaas') {
        return { sucesso: true, valor_total: valor, link: charge.url, forma: 'Asaas (PIX, cartão ou parcelado)' };
      }
      if (charge.provider === 'pix') {
        return {
          sucesso: true,
          valor_total: valor,
          pix_copia_e_cola: charge.pixPayload,
          forma: 'PIX',
          aviso: charge.message,
        };
      }
      return { sucesso: false, mensagem: charge.message };
    }

    case 'cadastrar_cliente': {
      let client = await clientByPhone(phone);
      let novo = false;
      if (!client) {
        client = await clientsStore.create({
          name: input.nome,
          email: input.email,
          phone,
          whatsapp: phone,
          family: [],
          origin: 'whatsapp_bot',
          notes: 'Cadastrado pelo agente do WhatsApp',
        });
        novo = true;
      }
      // converte o lead
      const lead = await findLeadByPhone(phone);
      if (lead) await upsertLeadFromContact({ name: client.name, phone, source: 'whatsapp', stage: 'finalizado' });
      return { sucesso: true, novo, cliente_id: client.id };
    }

    case 'matricular_cliente': {
      const exp = await findExpeditionByName(input.expedicao);
      if (!exp) return { sucesso: false, mensagem: 'Expedição não encontrada.' };
      let client = await clientByPhone(phone);
      if (!client) {
        client = await clientsStore.create({
          name: input.nome || phone,
          phone,
          whatsapp: phone,
          family: [],
          origin: 'whatsapp_bot',
        });
      }
      const exists = exp.enrollments.find(
        (e) => e.clientId === client!.id && e.status !== 'cancelado'
      );
      if (exists) return { sucesso: true, ja_matriculado: true, matricula_id: exists.id };
      const adultos = Number(input.adultos) || 1;
      const criancas = Number(input.criancas) || 0;
      const enr = {
        id: crypto.randomUUID(),
        clientId: client.id,
        clientName: client.name,
        adults: adultos,
        children: criancas,
        agreedPrice: adultos * exp.pricePerPerson + criancas * exp.pricePerChild,
        payments: [],
        observations: 'Matriculado pelo agente do WhatsApp',
        status: 'reservado' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      exp.enrollments.push(enr);
      await expeditionsStore.touch(exp.id);
      return { sucesso: true, matricula_id: enr.id, valor: enr.agreedPrice };
    }

    case 'registrar_pagamento': {
      const exp = await findExpeditionByName(input.expedicao);
      if (!exp) return { sucesso: false, mensagem: 'Expedição não encontrada.' };
      const client = await clientByPhone(phone);
      const enr = exp.enrollments.find(
        (e) => client && e.clientId === client.id && e.status !== 'cancelado'
      );
      if (!enr) return { sucesso: false, mensagem: 'Cliente não está matriculado nessa expedição.' };
      enr.payments.push({
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: Number(input.valor),
        method: input.metodo || 'link',
        description: 'Pagamento via WhatsApp',
      });
      enr.status = 'confirmado';
      enr.updatedAt = new Date().toISOString();
      await expeditionsStore.touch(exp.id);
      return { sucesso: true };
    }

    case 'buscar_faq': {
      const q = (input.pergunta || '').toLowerCase();
      const found = negocio.faq.find((f) => q.includes(f.pergunta));
      return found || { mensagem: 'Não tenho essa resposta exata, posso verificar com a equipe.' };
    }

    case 'escalar_humano': {
      await setMode(phone, 'human');
      return { sucesso: true, mensagem: 'Conversa transferida para atendimento humano.' };
    }

    default:
      return { erro: `Ferramenta ${name} não encontrada.` };
  }
}
