import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/conversationsStore';
import { getLeads } from '@/lib/leadsStore';

// Estatísticas do dia para o painel do WhatsApp IA.
export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const cutoff = startOfDay.toISOString();

  const convs = await listConversations();

  let msgsHoje = 0;
  let respostasBotHoje = 0;
  let respostasEquipeHoje = 0;
  let conversasAtivasHoje = 0;

  for (const c of convs) {
    let activeToday = false;
    for (const m of c.messages) {
      if (m.at < cutoff) continue;
      activeToday = true;
      msgsHoje++;
      if (m.role === 'assistant') {
        if (m.via === 'human') respostasEquipeHoje++;
        else respostasBotHoje++;
      }
    }
    if (activeToday) conversasAtivasHoje++;
  }

  const leads = await getLeads();
  const leadsHoje = leads.filter((l) => l.createdAt >= cutoff && l.source === 'whatsapp').length;

  return NextResponse.json({
    conversasAtivasHoje,
    msgsHoje,
    respostasBotHoje,
    respostasEquipeHoje,
    leadsHoje,
    aguardandoEquipe: convs.filter((c) => c.mode === 'human').length,
  });
}
