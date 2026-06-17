'use client';

import { useState } from 'react';
import { X, UserPlus, Car, Briefcase, Users, Trash2, Phone, Shirt } from 'lucide-react';
import toast from 'react-hot-toast';

type PriceCategory = '' | 'adulto' | 'crianca' | 'estudante' | 'idoso';

const ADULT_SHIRTS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'];
const INFANTIL_SHIRTS = ['02', '04', '06', '08', '10', '12', '14'];
const PRICE_CATEGORIES: { value: PriceCategory; label: string }[] = [
  { value: '', label: 'Automático (idade)' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'crianca', label: 'Criança' },
  { value: 'estudante', label: 'Estudante' },
  { value: 'idoso', label: 'Idoso' },
];

interface FamilyMember {
  id?: string;
  name: string;
  relation: 'conjuge' | 'filho' | 'filha' | 'outro';
  birthDate?: string;
  isChild: boolean;
  weight?: number | string;
  height?: number | string;
  priceCategory?: PriceCategory;
}

export interface ClientInitial {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  weight?: number | string;
  height?: number | string;
  shirtSizes?: string[];
  priceCategory?: PriceCategory;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  cep?: string;
  city?: string;
  state?: string;
  job?: string;
  company?: string;
  emergencyContact?: { name: string; phone: string };
  petInfo?: string;
  family?: FamilyMember[];
  vehicle?: { model?: string; plate?: string; year?: string; color?: string };
  notes?: string;
}

export default function ClientForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ClientInitial;
  onClose: () => void;
  onSaved: (client: any) => void;
}) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    cpf: initial?.cpf || '',
    birthDate: initial?.birthDate || '',
    weight: initial?.weight ?? '',
    height: initial?.height ?? '',
    shirtSize: initial?.shirtSizes?.[0] || '',
    priceCategory: (initial?.priceCategory || '') as PriceCategory,
    address: initial?.address || '',
    addressNumber: initial?.addressNumber || '',
    neighborhood: initial?.neighborhood || '',
    cep: initial?.cep || '',
    city: initial?.city || '',
    state: initial?.state || '',
    job: initial?.job || '',
    company: initial?.company || '',
    emergencyContact: initial?.emergencyContact || { name: '', phone: '' },
    petInfo: initial?.petInfo || '',
    family: (initial?.family || []) as FamilyMember[],
    vehicle: initial?.vehicle || { model: '', plate: '', year: '', color: '' },
    notes: initial?.notes || '',
  });

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
    const { shirtSize, ...rest } = form;
    const payload = {
      ...rest,
      whatsapp: form.phone,
      shirtSizes: shirtSize ? [shirtSize] : [],
      priceCategory: form.priceCategory || undefined,
      emergencyContact: form.emergencyContact?.name ? form.emergencyContact : undefined,
    };
    try {
      const res = await fetch(editing ? `/api/clients/${initial!.id}` : '/api/clients', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.client);
      toast.success(editing ? 'Cliente atualizado' : 'Cliente criado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Titular */}
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
              <div>
                <label className="text-xs text-gray-500">Peso (kg)</label>
                <input type="number" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Altura (cm)</label>
                <input type="number" className="input" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><Shirt size={11} /> Camiseta</label>
                <select className="input" value={form.shirtSize} onChange={(e) => setForm({ ...form, shirtSize: e.target.value })}>
                  <option value="">—</option>
                  <optgroup label="Adulto">
                    {ADULT_SHIRTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="Infantil">
                    {INFANTIL_SHIRTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Categoria (tarifário)</label>
                <select className="input" value={form.priceCategory} onChange={(e) => setForm({ ...form, priceCategory: e.target.value as PriceCategory })}>
                  {PRICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Endereço</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <input className="input md:col-span-2" placeholder="Rua / Avenida" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input className="input" placeholder="Número e complemento" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.target.value })} />
              <input className="input" placeholder="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              <input className="input" placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input className="input" placeholder="UF" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              <input className="input" placeholder="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
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
              <button onClick={addMember} className="text-sm text-amber-600 flex items-center gap-1">
                <UserPlus size={14} /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {form.family.map((m, i) => (
                <div key={i} className="bg-gray-50 p-2 rounded-lg grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-3 !py-1.5" placeholder="Nome" value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} />
                  <select
                    className="input col-span-2 !py-1.5"
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
                  <input type="date" className="input col-span-2 !py-1.5" value={m.birthDate || ''} onChange={(e) => updateMember(i, { birthDate: e.target.value })} />
                  <input type="number" className="input col-span-2 !py-1.5" placeholder="Peso" value={m.weight ?? ''} onChange={(e) => updateMember(i, { weight: e.target.value })} />
                  <input type="number" className="input col-span-2 !py-1.5" placeholder="Altura" value={m.height ?? ''} onChange={(e) => updateMember(i, { height: e.target.value })} />
                  <button onClick={() => removeMember(i)} className="col-span-1 p-1 hover:bg-rose-100 rounded justify-self-center">
                    <Trash2 size={14} className="text-rose-500" />
                  </button>
                  <div className="col-span-12 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1">
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      <input type="checkbox" checked={m.isChild} onChange={(e) => updateMember(i, { isChild: e.target.checked })} />
                      Conta como criança (preço/custo)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Categoria:
                      <select className="input !py-1 !text-xs !w-auto" value={m.priceCategory || ''} onChange={(e) => updateMember(i, { priceCategory: e.target.value as PriceCategory })}>
                        {PRICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              {form.family.length === 0 && <p className="text-xs text-gray-400">Nenhum familiar adicionado.</p>}
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

          {/* Emergência & Pet */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
              <Phone size={14} /> Contato de emergência
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="input" placeholder="Nome" value={form.emergencyContact.name} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} />
              <input className="input" placeholder="Telefone" value={form.emergencyContact.phone} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} />
            </div>
            <input className="input mt-3" placeholder="Pet (raça, porte, nome — opcional)" value={form.petInfo} onChange={(e) => setForm({ ...form, petInfo: e.target.value })} />
          </section>

          <textarea className="input h-20 w-full" placeholder="Observações gerais" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex gap-2">
            <button onClick={save} className="btn btn-primary">
              {editing ? 'Salvar' : 'Criar Cliente'}
            </button>
            <button onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
