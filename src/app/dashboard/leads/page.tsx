'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source: string;
  status: 'novo' | 'qualificado' | 'em_negociacao' | 'perdido' | 'convertido';
  notes?: string;
}

const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    whatsapp: '11999999999',
    source: 'instagram',
    status: 'novo',
    notes: 'Interessado em expedição Lençóis Maranhenses',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '21988888888',
    whatsapp: '21988888888',
    source: 'website',
    status: 'qualificado',
    notes: 'Consultou valor para grupo de 5 pessoas',
  },
];

const statusColors = {
  novo: 'bg-blue-100 text-blue-800',
  qualificado: 'bg-yellow-100 text-yellow-800',
  em_negociacao: 'bg-purple-100 text-purple-800',
  perdido: 'bg-red-100 text-red-800',
  convertido: 'bg-green-100 text-green-800',
};

const sourceColors = {
  instagram: 'bg-pink-100 text-pink-800',
  website: 'bg-blue-100 text-blue-800',
  referral: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    source: 'website',
    status: 'novo',
    notes: '',
  });

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm)
  );

  const handleAddLead = () => {
    if (editingId) {
      setLeads(leads.map((l) => (l.id === editingId ? { ...formData, id: l.id } : l)));
      setEditingId(null);
    } else {
      setLeads([...leads, { ...formData, id: Date.now().toString() }]);
    }
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      source: 'website',
      status: 'novo',
      notes: '',
    });
    setShowForm(false);
  };

  const handleDeleteLead = (id: string) => {
    setLeads(leads.filter((l) => l.id !== id));
  };

  const handleEditLead = (lead: Lead) => {
    setFormData(lead);
    setEditingId(lead.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Leads</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              whatsapp: '',
              source: 'website',
              status: 'novo',
              notes: '',
            });
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Lead
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
          <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar Lead' : 'Novo Lead'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome"
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
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="input"
            >
              <option value="website">Website</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Indicação</option>
              <option value="other">Outro</option>
            </select>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="input"
            >
              <option value="novo">Novo</option>
              <option value="qualificado">Qualificado</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="perdido">Perdido</option>
              <option value="convertido">Convertido</option>
            </select>
            <textarea
              placeholder="Notas"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input md:col-span-2 h-20"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddLead} className="btn btn-primary">
              {editingId ? 'Atualizar' : 'Adicionar'} Lead
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

      {/* Leads Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 font-semibold">Nome</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">WhatsApp</th>
              <th className="px-6 py-3 font-semibold">Origem</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4">{lead.name}</td>
                <td className="px-6 py-4 text-sm">{lead.email || '-'}</td>
                <td className="px-6 py-4 text-sm">{lead.whatsapp || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${sourceColors[lead.source as keyof typeof sourceColors] || sourceColors.other}`}>
                    {lead.source}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center flex justify-center gap-2">
                  <button
                    onClick={() => handleEditLead(lead)}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteLead(lead.id)}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum lead encontrado
          </div>
        )}
      </div>
    </div>
  );
}
