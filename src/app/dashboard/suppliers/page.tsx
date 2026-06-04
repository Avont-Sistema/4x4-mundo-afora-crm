'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  rating: number;
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Hotel Lençol Branco',
    type: 'hotel',
    email: 'contato@lencol.com',
    phone: '98999999999',
    address: 'Barreirinhas, MA',
    rating: 4.8,
  },
  {
    id: '2',
    name: 'Restaurante da Amazônia',
    type: 'restaurante',
    email: 'contato@amazonia.com',
    phone: '92988888888',
    rating: 4.5,
  },
];

const typeColors = {
  hotel: 'bg-blue-100 text-blue-800',
  restaurante: 'bg-orange-100 text-orange-800',
  transporte: 'bg-green-100 text-green-800',
  guia: 'bg-purple-100 text-purple-800',
  outro: 'bg-gray-100 text-gray-800',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'hotel',
    email: '',
    phone: '',
    address: '',
    rating: 0,
  });

  const handleAddSupplier = () => {
    if (editingId) {
      setSuppliers(suppliers.map((s) => (s.id === editingId ? { ...formData, id: s.id } : s)));
      setEditingId(null);
    } else {
      setSuppliers([...suppliers, { ...formData, id: Date.now().toString() }]);
    }
    setFormData({
      name: '',
      type: 'hotel',
      email: '',
      phone: '',
      address: '',
      rating: 0,
    });
    setShowForm(false);
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter((s) => s.id !== id));
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      type: supplier.type,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      rating: supplier.rating,
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Fornecedores</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              type: 'hotel',
              email: '',
              phone: '',
              address: '',
              rating: 0,
            });
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Fornecedor
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="hotel">Hotel</option>
              <option value="restaurante">Restaurante</option>
              <option value="transporte">Transporte</option>
              <option value="guia">Guia</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
            <input
              type="tel"
              placeholder="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Endereço"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
            />
            <input
              type="number"
              placeholder="Avaliação (0-5)"
              min="0"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddSupplier} className="btn btn-primary">
              {editingId ? 'Atualizar' : 'Adicionar'} Fornecedor
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">{supplier.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSupplier(supplier)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  <Edit2 size={16} className="text-blue-600" />
                </button>
                <button
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${typeColors[supplier.type as keyof typeof typeColors] || typeColors.outro}`}>
              {supplier.type}
            </span>

            <div className="space-y-2 text-sm mb-4">
              {supplier.email && <p className="text-gray-600">{supplier.email}</p>}
              {supplier.phone && <p className="text-gray-600">{supplier.phone}</p>}
              {supplier.address && <p className="text-gray-600">{supplier.address}</p>}
            </div>

            {supplier.rating > 0 && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.floor(supplier.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{supplier.rating}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p>Nenhum fornecedor cadastrado</p>
        </div>
      )}
    </div>
  );
}
