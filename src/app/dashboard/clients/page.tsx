'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Car, Briefcase, ChevronRight, MapPin, Mountain } from 'lucide-react';
import toast from 'react-hot-toast';
import ClientForm from './ClientForm';

interface LastExpedition {
  id: string;
  name: string;
  isLive: boolean;
}

interface FamilyMember {
  id?: string;
  name: string;
  relation: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  job?: string;
  company?: string;
  family: FamilyMember[];
  vehicle?: { model?: string };
  lastExpedition?: LastExpedition | null;
  expeditionIds?: string[];
}

const FAMILY_RELATION_LABELS: Record<string, string> = {
  conjuge: 'Cônjuge',
  filho: 'Filho',
  filha: 'Filha',
  pai: 'Pai',
  mae: 'Mãe',
  amigo: 'Amigo(a)',
  outro: 'Acompanhante',
};

interface ExpeditionOption {
  id: string;
  routeName: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [expeditions, setExpeditions] = useState<ExpeditionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expeditionFilter, setExpeditionFilter] = useState('');
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
    fetch('/api/expeditions')
      .then((r) => r.json())
      .then((d) => setExpeditions(d.expeditions || []))
      .catch(() => {});
  }, [fetchClients]);

  const filtered = clients.filter(
    (c) =>
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)) &&
      (!expeditionFilter || (c.expeditionIds || []).includes(expeditionFilter))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length === clients.length ? `${clients.length} clientes` : `${filtered.length} de ${clients.length} clientes`} — clique para abrir o perfil completo
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-64"
          value={expeditionFilter}
          onChange={(e) => setExpeditionFilter(e.target.value)}
        >
          <option value="">Todas as expedições</option>
          {expeditions.map((exp) => (
            <option key={exp.id} value={exp.id}>{exp.routeName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/clients/${c.id}`)}
              className="card w-full text-left flex items-center gap-4 hover:shadow-md hover:border-yellow-300 transition-all py-4"
            >
              <div className="w-11 h-11 rounded-full bg-yellow-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{c.name}</p>
                  {c.lastExpedition && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        c.lastExpedition.isLive
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.lastExpedition.isLive ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                      ) : (
                        <Mountain size={11} />
                      )}
                      {c.lastExpedition.name}
                    </span>
                  )}
                </div>
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
                  {c.vehicle?.model && (
                    <span className="flex items-center gap-1">
                      <Car size={11} /> {c.vehicle.model}
                    </span>
                  )}
                </div>
                {c.family?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Users size={11} className="text-gray-400" />
                    {c.family.map((m, i) => (
                      <span
                        key={m.id || i}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      >
                        {FAMILY_RELATION_LABELS[m.relation] || 'Acompanhante'}: {m.name}
                      </span>
                    ))}
                  </div>
                )}
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
