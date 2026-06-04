'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Copy, CheckCircle, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL } from '@/lib/format';

function CheckoutContent() {
  const params = useSearchParams();
  const expedition = params.get('expedition') || 'Expedição 4x4 Mundo Afora';
  const amount = Number(params.get('amount') || 0);
  const phone = params.get('phone') || '';

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const gerar = async () => {
    if (amount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name,
          phone,
          cpf,
          value: amount,
          installments,
          description: expedition,
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else toast.error(data.error || 'Erro');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success('Copiado!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pagamento</h1>
          <p className="text-gray-500 text-sm mt-1">{expedition}</p>
          <p className="text-3xl font-bold text-blue-600 mt-3">{formatBRL(amount)}</p>
        </div>

        {!result ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <input
                className="input"
                placeholder="CPF (para cartão ou parcelar)"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Sem CPF, geramos um PIX à vista (taxa zero).
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Parcelas</label>
              <select
                className="input"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista' : `${n}x de ${formatBRL(amount / n)}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={gerar}
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              {loading ? 'Gerando...' : 'Gerar pagamento'}
            </button>
          </div>
        ) : result.provider === 'asaas' ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-gray-600 text-sm">
              Tudo pronto! Escolha PIX, cartão ou parcelamento na página segura:
            </p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full block">
              Abrir pagamento
            </a>
          </div>
        ) : result.provider === 'pix' ? (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
              <QrCode size={18} /> PIX gerado
            </div>
            {result.qrDataUrl && (
              <img src={result.qrDataUrl} alt="QR PIX" className="w-52 h-52 mx-auto" />
            )}
            <p className="text-xs text-gray-500">Escaneie ou use o copia e cola:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs break-all text-left">
              {result.pixPayload}
            </div>
            <button onClick={() => copy(result.pixPayload)} className="btn btn-secondary w-full flex items-center justify-center gap-2">
              <Copy size={16} /> Copiar código PIX
            </button>
            {result.message && <p className="text-xs text-amber-600">{result.message}</p>}
          </div>
        ) : (
          <p className="text-center text-amber-600 text-sm">{result.message}</p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
