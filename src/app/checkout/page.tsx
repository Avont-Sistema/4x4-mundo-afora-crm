'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const bookingId = searchParams.get('bookingId');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    expeditionName: '',
    quantity: 1,
    pricePerPerson: 0,
  });

  const totalPrice = formData.quantity * formData.pricePerPerson;

  const handleCreateCheckout = async () => {
    if (!formData.clientName || !formData.clientEmail || !formData.expeditionName || formData.pricePerPerson === 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId || `booking_${Date.now()}`,
          clientEmail: formData.clientEmail,
          clientName: formData.clientName,
          expeditionName: formData.expeditionName,
          totalPrice,
          quantity: formData.quantity,
        }),
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        // Redirecionar para Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || 'Erro ao criar checkout');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento Confirmado! ✅</h1>
          <p className="text-gray-600 mb-6">
            Sua reserva foi confirmada com sucesso. Você receberá um email em breve com todos os detalhes.
          </p>
          <Link href="/dashboard/bookings" className="btn btn-primary w-full">
            Ver Minhas Reservas
          </Link>
        </div>
      </div>
    );
  }

  // Canceled state
  if (canceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento Cancelado</h1>
          <p className="text-gray-600 mb-6">
            O pagamento foi cancelado. Nenhuma cobrança foi realizada.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary w-full"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Checkout form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Cliente *</label>
            <input
              type="text"
              placeholder="João Silva"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              placeholder="joao@email.com"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Expedição *</label>
            <input
              type="text"
              placeholder="Lençóis Maranhenses"
              value={formData.expeditionName}
              onChange={(e) => setFormData({ ...formData, expeditionName: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade *</label>
              <input
                type="number"
                min="1"
                placeholder="2"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço por Pessoa *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="2500.00"
                value={formData.pricePerPerson}
                onChange={(e) => setFormData({ ...formData, pricePerPerson: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Taxa (2%):</span>
            <span>R$ {(totalPrice * 0.02).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-blue-600">R$ {(totalPrice * 1.02).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <button
          onClick={handleCreateCheckout}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <CreditCard size={20} />
          {loading ? 'Processando...' : 'Ir para Pagamento'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Powered by Stripe | Pagamento 100% seguro
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
