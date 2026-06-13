import { clientsStore, type Client } from './clientsStore';
import { expeditionsStore } from './expeditionsStore';
import { findLeadByPhone } from './leadsStore';

export interface ClientExpedition {
  expeditionId: string;
  expeditionName: string;
  expeditionStatus: string;
  enrollmentId: string;
  enrollmentStatus: string;
  startDate?: string;
  endDate?: string;
  adults: number;
  children: number;
  agreedPrice: number;
  paid: number;
  balance: number;
  progress: number;
  ativa: boolean;
}

export interface ClientPayment {
  date: string;
  amount: number;
  method: string;
  expeditionName: string;
}

export interface Activity {
  date: string;
  type: 'cadastro' | 'matricula' | 'pagamento' | 'mensagem';
  text: string;
}

export function buildClientDetail(id: string) {
  const client = clientsStore.get(id);
  if (!client) return null;

  const expeditions = expeditionsStore.all();
  const clientExpeditions: ClientExpedition[] = [];
  const payments: ClientPayment[] = [];
  const activities: Activity[] = [];

  for (const exp of expeditions) {
    for (const enr of exp.enrollments) {
      if (enr.clientId !== id) continue;
      const paid = enr.payments.reduce((s, p) => s + p.amount, 0);
      const ativa =
        (exp.status === 'aberta' || exp.status === 'em_andamento') &&
        enr.status !== 'cancelado';
      clientExpeditions.push({
        expeditionId: exp.id,
        expeditionName: exp.routeName,
        expeditionStatus: exp.status,
        enrollmentId: enr.id,
        enrollmentStatus: enr.status,
        startDate: exp.startDate,
        endDate: exp.endDate,
        adults: enr.adults,
        children: enr.children,
        agreedPrice: enr.agreedPrice,
        paid,
        balance: Math.max(enr.agreedPrice - paid, 0),
        progress: enr.agreedPrice > 0 ? (paid / enr.agreedPrice) * 100 : 0,
        ativa,
      });
      activities.push({
        date: enr.createdAt,
        type: 'matricula',
        text: `Matriculado em ${exp.routeName}`,
      });
      for (const p of enr.payments) {
        payments.push({
          date: p.date,
          amount: p.amount,
          method: p.method,
          expeditionName: exp.routeName,
        });
        activities.push({
          date: p.date,
          type: 'pagamento',
          text: `Pagou ${p.amount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })} (${exp.routeName})`,
        });
      }
    }
  }

  // cadastro
  activities.push({ date: client.createdAt, type: 'cadastro', text: 'Cliente cadastrado' });

  // lead vinculado (origem / última mensagem)
  const lead = findLeadByPhone(client.phone || client.whatsapp);
  if (lead?.lastMessage) {
    activities.push({
      date: lead.updatedAt,
      type: 'mensagem',
      text: `WhatsApp: "${lead.lastMessage}"`,
    });
  }

  payments.sort((a, b) => (a.date < b.date ? 1 : -1));
  activities.sort((a, b) => (a.date < b.date ? 1 : -1));
  clientExpeditions.sort((a, b) => (a.ativa === b.ativa ? 0 : a.ativa ? -1 : 1));

  const ativa = clientExpeditions.find((e) => e.ativa) || null;
  const totalPago = payments.reduce((s, p) => s + p.amount, 0);
  const totalContratado = clientExpeditions
    .filter((e) => e.enrollmentStatus !== 'cancelado')
    .reduce((s, e) => s + e.agreedPrice, 0);

  return {
    client,
    lead: lead ? { source: lead.source, stage: lead.stage } : null,
    ativa,
    expeditions: clientExpeditions,
    payments,
    activities: activities.slice(0, 30),
    resumo: {
      totalExpedicoes: clientExpeditions.length,
      totalPago,
      totalContratado,
      saldo: Math.max(totalContratado - totalPago, 0),
    },
  };
}

export type { Client };
