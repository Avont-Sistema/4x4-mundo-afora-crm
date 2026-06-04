'use client';

import { Plus, Eye } from 'lucide-react';

const mockBookings = [
  {
    id: '1',
    clientName: 'João Silva',
    expeditionName: 'Lençóis Maranhenses',
    quantity: 2,
    totalPrice: 5000,
    status: 'confirmada',
    paymentStatus: 'pago',
    date: '2024-07-15',
  },
];

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  aguardando: 'bg-gray-100 text-gray-800',
  pagto_parcial: 'bg-blue-100 text-blue-800',
  pago: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export default function BookingsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Reservas</h1>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Nova Reserva
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 font-semibold">Cliente</th>
              <th className="px-6 py-3 font-semibold">Expedição</th>
              <th className="px-6 py-3 font-semibold">Quantidade</th>
              <th className="px-6 py-3 font-semibold">Valor Total</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Pagamento</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockBookings.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{booking.clientName}</td>
                <td className="px-6 py-4">{booking.expeditionName}</td>
                <td className="px-6 py-4 text-center">{booking.quantity}</td>
                <td className="px-6 py-4 font-bold text-blue-600">R$ {booking.totalPrice.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusColors[booking.paymentStatus as keyof typeof paymentStatusColors]}`}>
                    {booking.paymentStatus === 'pagto_parcial' ? 'Parcial' : booking.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-2 hover:bg-blue-100 rounded transition-colors">
                    <Eye size={16} className="text-blue-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
