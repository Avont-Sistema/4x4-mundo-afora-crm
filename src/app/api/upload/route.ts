import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/opus', 'audio/wav',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
];

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob não configurado. Crie um Blob Store no painel do Vercel e vincule ao projeto.' },
      { status: 503 }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  // Rota do cliente (client-side upload para arquivos grandes como vídeo)
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as HandleUploadBody;
    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
        }),
        onUploadCompleted: async ({ blob }) => {
          console.log('[upload] client upload concluído:', blob.url);
        },
      });
      return NextResponse.json(jsonResponse);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  // Upload via FormData (server-side, para áudio e imagens)
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const filename = `flows/${Date.now()}-${sanitizeName(file.name)}`;
  const blob = await put(filename, file.stream(), { access: 'public', contentType: file.type });
  return NextResponse.json({ url: blob.url });
}
