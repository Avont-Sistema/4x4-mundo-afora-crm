'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpfCnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  birthDate?: string;
}

const mockClients: Client[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    whatsapp: '11999999999',
    cpfCnpj: '123.456.789-00',
    address: 'Rua A, 123',
    city: 'São Paulo',
    state: 'SP',
    birthDate: '1990-05-15',
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpfCnpj: '',
    address: '',
    city: '',
    state: '',
    birthDate: '',
  });

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
  );

  const handleAddClient = () => {
    if (editingId) {
      setClients(clients.map((c) => (c.id === editingId ? { ...formData, id: c.id } : c)));
      setEditingId(null);
    } else {
      setClients([...clients, { ...formData, id: Date.now().toString() }]);
    }
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      cpfCnpj: '',
      address: '',
      city: '',
      state: '',
      birthDate: '',
    });
    setShowForm(false);
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter((c) => c.id !== id));
  };

  const handleEditClient = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      cpfCnpj: client.cpfCnpj || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      birthDate: client.birthDate || '',
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Clientes</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              whatsapp: '',
              cpfCnpj: '',
              address: '',
              city: '',
              state: '',
              birthDate: '',
            });
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome Completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
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
              type="tel"
              placeholder="WhatsApp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="CPF/CNPJ"
              value={formData.cpfCnpj}
              onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
              className="input"
            />
            <input
              type="date"
              placeholder="Data de Nascimento"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Endereço"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input md:col-span-2"
            />
            <input
              type="text"
              placeholder="Cidade"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Estado (UF)"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              maxLength={2}
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddClient} className="btn btn-primary">
              {editingId ? 'Atualizar' : 'Adicionar'} Cliente
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

      {/* Clients Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 font-semibold">Nome</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">WhatsApp</th>
              <th className="px-6 py-3 font-semibold">Cidade</th>
              <th className="px-6 py-3 font-semibold">CPF/CNPJ</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{client.name}</td>
                <td className="px-6 py-4 text-sm">{client.email || '-'}</td>
                <td className="px-6 py-4 text-sm">{client.whatsapp || '-'}</td>
                <td className="px-6 py-4 text-sm">{client.city ? `${client.city}, ${client.state}` : '-'}</td>
                <td className="px-6 py-4 text-sm">{client.cpfCnpj || '-'}</td>
                <td className="px-6 py-4 text-center flex justify-center gap-2">
                  <button
                    onClick={() => handleEditClient(client)}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum cliente encontrado
          </div>
        )}
      </div>
    </div>
  );
}
