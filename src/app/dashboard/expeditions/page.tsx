'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Expedition {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  maxPeople: number;
  pricePerPerson: number;
  difficulty: 'fácil' | 'intermediária' | 'difícil';
}

const mockExpeditions: Expedition[] = [
  {
    id: '1',
    name: 'Lençóis Maranhenses',
    description: 'Aventura pelos lençóis brancos e lagoas cristalinas',
    startDate: '2024-07-15',
    endDate: '2024-07-20',
    location: 'Maranhão',
    maxPeople: 12,
    pricePerPerson: 2500,
    difficulty: 'intermediária',
  },
  {
    id: '2',
    name: 'Vale da Lua',
    description: 'Exploração do canyon e cachoeiras',
    startDate: '2024-08-01',
    endDate: '2024-08-05',
    location: 'Goiás',
    maxPeople: 15,
    pricePerPerson: 1800,
    difficulty: 'fácil',
  },
];

const difficultyColors = {
  fácil: 'bg-green-100 text-green-800',
  intermediária: 'bg-yellow-100 text-yellow-800',
  difícil: 'bg-red-100 text-red-800',
};

export default function ExpeditionsPage() {
  const [expeditions, setExpeditions] = useState<Expedition[]>(mockExpeditions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    maxPeople: 10,
    pricePerPerson: 0,
    difficulty: 'intermediária' as 'fácil' | 'intermediária' | 'difícil',
  });

  const handleAddExpedition = () => {
    if (editingId) {
      setExpeditions(expeditions.map((e) => (e.id === editingId ? { ...formData, id: e.id } : e)));
      setEditingId(null);
    } else {
      setExpeditions([...expeditions, { ...formData, id: Date.now().toString() }]);
    }
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      maxPeople: 10,
      pricePerPerson: 0,
      difficulty: 'intermediária',
    });
    setShowForm(false);
  };

  const handleDeleteExpedition = (id: string) => {
    setExpeditions(expeditions.filter((e) => e.id !== id));
  };

  const handleEditExpedition = (expedition: Expedition) => {
    setFormData({
      name: expedition.name,
      description: expedition.description || '',
      startDate: expedition.startDate,
      endDate: expedition.endDate,
      location: expedition.location,
      maxPeople: expedition.maxPeople,
      pricePerPerson: expedition.pricePerPerson,
      difficulty: expedition.difficulty,
    });
    setEditingId(expedition.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Expedições</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              startDate: '',
              endDate: '',
              location: '',
              maxPeople: 10,
              pricePerPerson: 0,
              difficulty: 'intermediária',
            });
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Expedição
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar Expedição' : 'Nova Expedição'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome da Expedição"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input md:col-span-2"
            />
            <textarea
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input md:col-span-2 h-20"
            />
            <input
              type="date"
              placeholder="Data Início"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="input"
            />
            <input
              type="date"
              placeholder="Data Fim"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Local"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input"
            />
            <input
              type="number"
              placeholder="Máximo de Pessoas"
              value={formData.maxPeople}
              onChange={(e) => setFormData({ ...formData, maxPeople: parseInt(e.target.value) })}
              className="input"
            />
            <input
              type="number"
              placeholder="Preço por Pessoa (R$)"
              value={formData.pricePerPerson}
              onChange={(e) => setFormData({ ...formData, pricePerPerson: parseFloat(e.target.value) })}
              className="input"
            />
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'fácil' | 'intermediária' | 'difícil' })}
              className="input"
            >
              <option value="fácil">Fácil</option>
              <option value="intermediária">Intermediária</option>
              <option value="difícil">Difícil</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddExpedition} className="btn btn-primary">
              {editingId ? 'Atualizar' : 'Criar'} Expedição
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

      {/* Expeditions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expeditions.map((expedition) => (
          <div key={expedition.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{expedition.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditExpedition(expedition)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  <Edit2 size={16} className="text-blue-600" />
                </button>
                <button
                  onClick={() => handleDeleteExpedition(expedition.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            {expedition.description && (
              <p className="text-gray-600 text-sm mb-4">{expedition.description}</p>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                <span>{expedition.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span>{expedition.maxPeople} pessoas no máximo</span>
              </div>
              <div className="text-gray-600">
                {format(new Date(expedition.startDate), 'dd MMM yyyy', { locale: ptBR })} -{' '}
                {format(new Date(expedition.endDate), 'dd MMM yyyy', { locale: ptBR })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[expedition.difficulty]}`}>
                {expedition.difficulty}
              </span>
              <span className="text-lg font-bold text-blue-600">R$ {expedition.pricePerPerson.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>

      {expeditions.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <MapPin size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma expedição cadastrada</p>
        </div>
      )}
    </div>
  );
}
