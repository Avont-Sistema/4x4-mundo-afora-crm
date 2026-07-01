import { NextRequest, NextResponse } from 'next/server';

// Proxy público para blobs privados do Vercel Blob.
// O servidor do bot não tem token, então busca aqui com auth.
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) return new NextResponse('Missing src', { status: 400 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse('Blob not configured', { status: 503 });

  const response = await fetch(src, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return new NextResponse('Blob not found', { status: response.status });
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
