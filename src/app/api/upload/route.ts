import { put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/opus', 'audio/wav',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://4x4-mundo-afora-crm-iota.vercel.app';

function proxyUrl(blobUrl: string) {
  return `${BASE_URL}/api/blob?src=${encodeURIComponent(blobUrl)}`;
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob não configurado. Crie um Blob Store no painel do Vercel e vincule ao projeto.' },
      { status: 503 }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  // ── Client-side upload (token request + completion callback) ─────────────────
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: 50 * 1024 * 1024,
      }),
      onUploadCompleted: async () => { /* noop */ },
    });
    return NextResponse.json(jsonResponse);
  }

  // ── Server-side upload via FormData (arquivos pequenos) ──────────────────────
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo maior que 4 MB — use o upload direto' }, { status: 413 });
  }

  const filename = `flows/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const blob = await put(filename, file, { access: 'private' });

  return NextResponse.json({ url: proxyUrl(blob.url) });
}
