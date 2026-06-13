'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Car, Briefcase, ChevronRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import ClientForm from './ClientForm';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  job?: string;
  company?: string;
  family: any[];
  vehicle?: { model?: string };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} clientes — clique para abrir o perfil completo</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/clients/${c.id}`)}
              className="card w-full text-left flex items-center gap-4 hover:shadow-md hover:border-blue-300 transition-all py-4"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{c.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  {c.phone && <span>{c.phone}</span>}
                  {(c.city || c.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {c.city}
                      {c.state ? `/${c.state}` : ''}
                    </span>
                  )}
                  {c.job && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={11} /> {c.job}
                    </span>
                  )}
                  {c.family?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {c.family.length} familiar(es)
                    </span>
                  )}
                  {c.vehicle?.model && (
                    <span className="flex items-center gap-1">
                      <Car size={11} /> {c.vehicle.model}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhum cliente encontrado.</div>
          )}
        </div>
      )}

      {showForm && (
        <ClientForm
          onClose={() => setShowForm(false)}
          onSaved={(client) => {
            setClients((c) => [client, ...c]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
