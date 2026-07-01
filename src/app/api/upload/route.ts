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
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/opus', 'audio/wav'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 400 });
  }

  // Limite de 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo maior que 10 MB' }, { status: 400 });
  }

  const filename = `flows/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const blob = await put(filename, file, { access: 'private' });

  return NextResponse.json({ url: blob.url });
}
