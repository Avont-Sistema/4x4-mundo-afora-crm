import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { contractsStore, type SignParty } from '@/lib/contractsStore';
import { TERM_VERSION } from '@/lib/imageRightsTerm';

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconhecido';
}

// GET /api/contracts?expeditionId=xxx  ou  ?clientId=xxx
// Lista resumida (sem a imagem da assinatura, que é pesada) para o CRM.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expeditionId = searchParams.get('expeditionId');
  const clientId = searchParams.get('clientId');

  let all = await contractsStore.all();
  if (expeditionId) all = all.filter((c) => c.expeditionId === expeditionId);
  if (clientId) all = all.filter((c) => c.clientId === clientId);

  const contracts = all.map((c) => ({
    id: c.id,
    clientId: c.clientId,
    clientName: c.clientName,
    signerCpf: c.signerCpf,
    expeditionId: c.expeditionId,
    expeditionName: c.expeditionName,
    signedAt: c.signedAt,
    hash: c.hash,
    termVersion: c.termVersion,
  }));
  return NextResponse.json({ contracts });
}

// POST /api/contracts -> registra o contrato assinado com trilha de auditoria.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }
    if (!body.signatureDataUrl || typeof body.signatureDataUrl !== 'string') {
      return NextResponse.json({ error: 'Assinatura é obrigatória' }, { status: 400 });
    }
    if (!body.termSnapshot) {
      return NextResponse.json({ error: 'Termo é obrigatório' }, { status: 400 });
    }

    const party: SignParty[] = Array.isArray(body.party)
      ? body.party
          .filter((p: any) => p && p.name)
          .map((p: any) => ({ name: String(p.name), cpf: p.cpf ? String(p.cpf) : undefined }))
      : [];

    const signedAt = new Date().toISOString();
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent') || 'desconhecido';

    // Hash da prova: vincula termo + signatário + data + rubrica.
    const hash = createHash('sha256')
      .update(
        [body.termSnapshot, body.signerCpf || '', signedAt, body.signatureDataUrl].join('|'),
        'utf8'
      )
      .digest('hex');

    const contract = await contractsStore.create({
      clientId: String(body.clientId),
      clientName: String(body.clientName || party[0]?.name || ''),
      signerCpf: body.signerCpf ? String(body.signerCpf) : undefined,
      expeditionId: body.expeditionId ? String(body.expeditionId) : undefined,
      expeditionName: body.expeditionName ? String(body.expeditionName) : undefined,
      termVersion: String(body.termVersion || TERM_VERSION),
      termSnapshot: String(body.termSnapshot),
      signLine: body.signLine ? String(body.signLine) : undefined,
      signatureDataUrl: String(body.signatureDataUrl),
      party,
      signedAt,
      ip,
      userAgent,
      hash,
    });

    return NextResponse.json(
      { ok: true, contractId: contract.id, hash, signedAt },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao registrar contrato' },
      { status: 500 }
    );
  }
}
