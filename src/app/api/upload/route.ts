import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob não configurado. Crie um Blob Store no painel do Vercel e vincule ao projeto.' },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  // Valida tipo (imagens e áudio apenas)
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/opus', 'audio/wav',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
  ];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 400 });
  }

  // Limite de 50 MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo maior que 50 MB' }, { status: 400 });
  }

  const filename = `flows/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const blob = await put(filename, file, { access: 'private' });

  // Retorna URL do proxy público (o blob privado exige auth que o bot não tem)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://4x4-mundo-afora-crm-iota.vercel.app';
  const proxyUrl = `${baseUrl}/api/blob?src=${encodeURIComponent(blob.url)}`;

  return NextResponse.json({ url: proxyUrl });
}
