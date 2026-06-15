import { NextRequest, NextResponse } from 'next/server';
import { clientsStore } from '@/lib/clientsStore';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';
import { findLeadByPhone, updateLead } from '@/lib/leadsStore';

/**
 * Cadastro de cliente pelo bot do WhatsApp após o cliente iniciar/efetivar o
 * pagamento do pacote. Faz:
 *  1. Cria (ou reaproveita) o cliente a partir do contato
 *  2. Move o lead correspondente para "finalizado"
 *  3. (opcional) Matricula o cliente numa expedição
 *  4. (opcional) Lança um pagamento inicial
 *
 * Body:
 * {
 *   "name": "...", "phone": "...", "email": "...",
 *   "expeditionId": "...",          // opcional
 *   "adults": 2, "children": 1,      // opcional
 *   "agreedPrice": 5000,             // opcional
 *   "paymentAmount": 1000,           // opcional (entrada já paga)
 *   "paymentMethod": "pix"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name && !body.phone) {
      return NextResponse.json(
        { error: 'Informe ao menos nome ou telefone' },
        { status: 400 }
      );
    }

    // 1. dedupe de cliente por telefone
    const phone: string | undefined = body.phone;
    const normalized = (phone || '').replace(/\D/g, '');
    let client = (await clientsStore.all()).find(
      (c) =>
        normalized &&
        ((c.phone || '').replace(/\D/g, '') === normalized ||
          (c.whatsapp || '').replace(/\D/g, '') === normalized)
    );

    let clientCreated = false;
    if (!client) {
      client = await clientsStore.create({
        name: body.name || phone || 'Cliente WhatsApp',
        phone,
        whatsapp: phone,
        email: body.email,
        family: [],
        origin: 'whatsapp_bot',
        notes: 'Cliente cadastrado pelo bot após início de pagamento',
      });
      clientCreated = true;
    }

    // 2. move o lead para finalizado (conversão)
    const lead = await findLeadByPhone(phone);
    if (lead) await updateLead(lead.id, { stage: 'finalizado' });

    // 3 + 4. matrícula + pagamento (se a expedição foi informada)
    let enrollment = null;
    let expeditionDetail = null;
    if (body.expeditionId) {
      const exp = await expeditionsStore.get(body.expeditionId);
      if (exp) {
        let enr = exp.enrollments.find(
          (e) => e.clientId === client!.id && e.status !== 'cancelado'
        );
        if (!enr) {
          const adults = Number(body.adults) || 1;
          const children = Number(body.children) || 0;
          const agreedPrice =
            body.agreedPrice !== undefined
              ? Number(body.agreedPrice)
              : adults * exp.pricePerPerson + children * exp.pricePerChild;
          enr = {
            id: crypto.randomUUID(),
            clientId: client!.id,
            clientName: client!.name,
            adults,
            children,
            agreedPrice,
            payments: [],
            observations: 'Matriculado pelo bot do WhatsApp',
            status: 'reservado',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          exp.enrollments.push(enr);
        }
        if (body.paymentAmount && Number(body.paymentAmount) > 0) {
          enr.payments.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: Number(body.paymentAmount),
            method: body.paymentMethod || 'link',
            description: 'Pagamento via WhatsApp',
          });
          enr.status = 'confirmado';
        }
        enr.updatedAt = new Date().toISOString();
        await expeditionsStore.touch(exp.id);
        enrollment = enr;
        expeditionDetail = await buildExpeditionDetail(exp);
      }
    }

    return NextResponse.json({
      success: true,
      clientCreated,
      client,
      enrollment,
      expedition: expeditionDetail,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao cadastrar cliente' },
      { status: 500 }
    );
  }
}
