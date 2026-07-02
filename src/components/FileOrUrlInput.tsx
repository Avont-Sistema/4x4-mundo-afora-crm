'use client';

import { useRef, useState } from 'react';
import { Upload, Link } from 'lucide-react';

// Input de mídia com upload (Vercel Blob via /api/upload) ou URL manual.
// Arquivos grandes (vídeo ou >4MB) sobem direto do navegador (client upload);
// os demais passam pelo endpoint server-side.
export default function FileOrUrlInput({
  type,
  value,
  onChange,
  folder = 'flows',
}: {
  type: 'image' | 'audio' | 'video';
  value: string;
  onChange: (url: string) => void;
  folder?: string; // prefixo no Blob store (ex.: 'flows', 'broadcasts')
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>(value ? 'url' : 'upload');

  const borderColor = type === 'image' ? 'border-green-200' : type === 'audio' ? 'border-purple-200' : 'border-red-200';
  const ringColor = type === 'image' ? 'focus:ring-green-400' : type === 'audio' ? 'focus:ring-purple-400' : 'focus:ring-red-400';
  const accept = type === 'image'
    ? 'image/jpeg,image/png,image/gif,image/webp'
    : type === 'audio'
    ? 'audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/opus'
    : 'video/mp4,video/webm,video/ogg,video/quicktime';
  const label = type === 'image' ? 'imagem (JPG, PNG, GIF)' : type === 'audio' ? 'áudio (.ogg, .mp3, .m4a)' : 'vídeo (.mp4, .webm)';

  async function handleFile(file: File) {
    setError('');
    setUploading(true);
    setUploadProgress('');
    try {
      const isLarge = file.type.startsWith('video/') || file.size > 4 * 1024 * 1024;
      let url = '';
      if (isLarge) {
        setUploadProgress('Enviando vídeo (pode demorar)...');
        const { upload } = await import('@vercel/blob/client');
        const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const blob = await upload(filename, file, { access: 'public', handleUploadUrl: '/api/upload' });
        url = blob.url;
      } else {
        setUploadProgress('Enviando...');
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folder);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no upload');
        url = data.url;
      }
      onChange(url);
      setMode('url');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1 px-2 py-1 rounded ${mode === 'upload' ? 'bg-gray-200 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Upload size={11} /> Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1 px-2 py-1 rounded ${mode === 'url' ? 'bg-gray-200 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Link size={11} /> URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          className={`border-2 border-dashed ${borderColor} rounded-lg p-4 text-center cursor-pointer hover:bg-white/60 transition`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {uploading ? (
            <p className="text-sm text-gray-500">{uploadProgress || 'Enviando...'}</p>
          ) : value ? (
            <div className="space-y-1">
              {type === 'image' ? (
                <img src={value} alt="preview" className="max-h-24 mx-auto rounded object-cover" />
              ) : type === 'audio' ? (
                <audio controls src={value} className="mx-auto w-full" />
              ) : (
                <video src={value} controls className="max-h-32 mx-auto rounded" />
              )}
              <p className="text-xs text-gray-400">Clique ou arraste para trocar</p>
            </div>
          ) : (
            <div className="text-gray-400">
              <Upload size={20} className="mx-auto mb-1" />
              <p className="text-sm">Clique ou arraste o arquivo de {label}</p>
              <p className="text-xs mt-1">{type === 'video' ? 'Máx 100 MB (upload direto)' : 'Máx 10 MB'}</p>
            </div>
          )}
        </div>
      ) : (
        <input
          type="url"
          className={`w-full text-sm border ${borderColor} rounded p-2 focus:outline-none focus:ring-1 ${ringColor} bg-white`}
          placeholder={type === 'image' ? 'https://... (URL da imagem)' : type === 'audio' ? 'https://... (URL do áudio .ogg)' : 'https://... (URL do vídeo .mp4)'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
