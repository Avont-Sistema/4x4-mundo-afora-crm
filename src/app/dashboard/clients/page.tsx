'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, UserPlus, Car, Briefcase, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface FamilyMember {
  id?: string;
  name: string;
  relation: 'conjuge' | 'filho' | 'filha' | 'outro';
  birthDate?: string;
  isChild: boolean;
}
interface Vehicle {
  model?: string;
  plate?: string;
  year?: string;
  color?: string;
}
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  state?: string;
  job?: string;
  company?: string;
  family: FamilyMember[];
  vehicle?: Vehicle;
  notes?: string;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthDate: '',
  address: '',
  city: '',
  state: '',
  job: '',
  company: '',
  family: [] as FamilyMember[],
  vehicle: { model: '', plate: '', year: '', color: '' } as Vehicle,
  notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

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

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, family: [], vehicle: { model: '', plate: '', year: '', color: '' } });
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      cpf: c.cpf || '',
      birthDate: c.birthDate || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      job: c.job || '',
      company: c.company || '',
      family: c.family || [],
      vehicle: c.vehicle || { model: '', plate: '', year: '', color: '' },
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const addMember = () =>
    setForm((f) => ({
      ...f,
      family: [...f.family, { name: '', relation: 'filho', isChild: true }],
    }));

  const updateMember = (i: number, patch: Partial<FamilyMember>) =>
    setForm((f) => ({
      ...f,
      family: f.family.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));

  const removeMember = (i: number) =>
    setForm((f) => ({ ...f, family: f.family.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome');
      return;
    }
    const payload = { ...form, whatsapp: form.phone };
    try {
      if (editingId) {
        const res = await fetch(`/api/clients/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setClients((c) => c.map((x) => (x.id === editingId ? data.client : x)));
        toast.success('Cliente atualizado');
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setClients((c) => [data.client, ...c]);
        toast.success('Cliente criado');
      }
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir cliente?')) return;
    const prev = clients;
    setClients((c) => c.filter((x) => x.id !== id));
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setClients(prev);
      toast.error('Erro ao excluir');
    } else toast.success('Excluído');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Cadastro completo: família, veículo e profissão
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold">{c.name}</h3>
                  {c.job && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Briefcase size={12} /> {c.job}
                      {c.company ? ` · ${c.company}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 hover:bg-blue-50 rounded">
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button onClick={() => remove(c.id)} className="p-2 hover:bg-rose-50 rounded">
                    <Trash2 size={16} className="text-rose-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-500 mb-3">
                {c.phone && <p>{c.phone}</p>}
                {c.email && <p>{c.email}</p>}
                {(c.city || c.state) && (
                  <p>
                    {c.city}
                    {c.state ? `, ${c.state}` : ''}
                  </p>
                )}
              </div>

              {c.family && c.family.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Users size={12} /> {c.family.length} familiar(es):{' '}
                  {c.family.map((m) => m.name.split(' ')[0]).join(', ')}
                </div>
              )}
              {c.vehicle?.model && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Car size={12} /> {c.vehicle.model}
                  {c.vehicle.plate ? ` · ${c.vehicle.plate}` : ''}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      )}

      {/* Modal cadastro */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Dados pessoais */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Dados do titular</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input className="input md:col-span-2" placeholder="Nome completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <input className="input" placeholder="Telefone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <input className="input" placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                  <div>
                    <label className="text-xs text-gray-500">Nascimento</label>
                    <input type="date" className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                </div>
              </section>

              {/* Endereço */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Endereço</h3>
                <div className="grid md:grid-cols-4 gap-3">
                  <input className="input md:col-span-2" placeholder="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  <input className="input" placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <input className="input" placeholder="UF" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
              </section>

              {/* Profissão */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                  <Briefcase size={14} /> Profissão
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input className="input" placeholder="Emprego / profissão" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                  <input className="input" placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </section>

              {/* Família */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1">
                    <Users size={14} /> Família (cônjuge, filhos)
                  </h3>
                  <button onClick={addMember} className="text-sm text-blue-600 flex items-center gap-1">
                    <UserPlus size={14} /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.family.map((m, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <input className="input col-span-4 !py-1.5" placeholder="Nome" value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} />
                      <select
                        className="input col-span-3 !py-1.5"
                        value={m.relation}
                        onChange={(e) => {
                          const relation = e.target.value as FamilyMember['relation'];
                          updateMember(i, { relation, isChild: relation === 'filho' || relation === 'filha' ? true : m.isChild });
                        }}
                      >
                        <option value="conjuge">Cônjuge</option>
                        <option value="filho">Filho</option>
                        <option value="filha">Filha</option>
                        <option value="outro">Outro</option>
                      </select>
                      <input type="date" className="input col-span-3 !py-1.5" value={m.birthDate || ''} onChange={(e) => updateMember(i, { birthDate: e.target.value })} />
                      <label className="col-span-1 flex items-center gap-1 text-xs" title="Conta como criança">
                        <input type="checkbox" checked={m.isChild} onChange={(e) => updateMember(i, { isChild: e.target.checked })} />
                        Cri.
                      </label>
                      <button onClick={() => removeMember(i)} className="col-span-1 p-1 hover:bg-rose-100 rounded justify-self-center">
                        <Trash2 size={14} className="text-rose-500" />
                      </button>
                    </div>
                  ))}
                  {form.family.length === 0 && (
                    <p className="text-xs text-gray-400">Nenhum familiar adicionado.</p>
                  )}
                </div>
              </section>

              {/* Veículo */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                  <Car size={14} /> Veículo
                </h3>
                <div className="grid md:grid-cols-4 gap-3">
                  <input className="input md:col-span-2" placeholder="Modelo" value={form.vehicle.model} onChange={(e) => setForm({ ...form, vehicle: { ...form.vehicle, model: e.target.value } })} />
                  <input className="input" placeholder="Placa" value={form.vehicle.plate} onChange={(e) => setForm({ ...form, vehicle: { ...form.vehicle, plate: e.target.value } })} />
                  <input className="input" placeholder="Ano" value={form.vehicle.year} onChange={(e) => setForm({ ...form, vehicle: { ...form.vehicle, year: e.target.value } })} />
                  <input className="input md:col-span-2" placeholder="Cor" value={form.vehicle.color} onChange={(e) => setForm({ ...form, vehicle: { ...form.vehicle, color: e.target.value } })} />
                </div>
              </section>

              <textarea className="input h-20 w-full" placeholder="Observações gerais" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              <div className="flex gap-2">
                <button onClick={save} className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Criar Cliente'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
