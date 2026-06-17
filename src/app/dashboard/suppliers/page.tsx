'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL } from '@/lib/format';
import { EXPORT_FIELDS, BILLING_LABELS, type BillingMode } from '@/lib/supplierFields';

interface Supplier {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  billingMode: BillingMode;
  costPerPerson: number;
  costPerChild: number;
  costPerStudent?: number;
  costPerSenior?: number;
  childMaxAge?: number;
  seniorMinAge?: number;
  costPerCar: number;
  costPerRoom: number;
  flatFee: number;
  exportFields: string[];
  rating: number;
  notes?: string;
}

const typeColors: Record<string, string> = {
  hotel: 'bg-yellow-100 text-amber-800',
  restaurante: 'bg-orange-100 text-orange-800',
  transporte: 'bg-green-100 text-green-800',
  guia: 'bg-purple-100 text-purple-800',
  passeio: 'bg-cyan-100 text-cyan-800',
  outro: 'bg-gray-100 text-gray-800',
};

const emptyForm = {
  name: '',
  type: 'hotel',
  email: '',
  phone: '',
  address: '',
  billingMode: 'per_person' as BillingMode,
  costPerPerson: 0,
  costPerChild: 0,
  costPerStudent: 0,
  costPerSenior: 0,
  childMaxAge: 12,
  seniorMinAge: 60,
  costPerCar: 0,
  costPerRoom: 0,
  flatFee: 0,
  exportFields: ['name', 'role', 'document', 'responsible'] as string[],
  rating: 0,
  notes: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      type: s.type,
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      billingMode: s.billingMode || 'per_person',
      costPerPerson: s.costPerPerson || 0,
      costPerChild: s.costPerChild || 0,
      costPerStudent: s.costPerStudent || 0,
      costPerSenior: s.costPerSenior || 0,
      childMaxAge: s.childMaxAge ?? 12,
      seniorMinAge: s.seniorMinAge ?? 60,
      costPerCar: s.costPerCar || 0,
      costPerRoom: s.costPerRoom || 0,
      flatFee: s.flatFee || 0,
      exportFields: s.exportFields?.length ? s.exportFields : ['name', 'role', 'document', 'responsible'],
      rating: s.rating,
      notes: s.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome');
      return;
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/suppliers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        setSuppliers((s) => s.map((x) => (x.id === editingId ? data.supplier : x)));
        toast.success('Fornecedor atualizado');
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        setSuppliers((s) => [data.supplier, ...s]);
        toast.success('Fornecedor criado');
      }
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir fornecedor?')) return;
    const prev = suppliers;
    setSuppliers((s) => s.filter((x) => x.id !== id));
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setSuppliers(prev);
      toast.error('Erro ao excluir');
    } else toast.success('Excluído');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Fornecedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            Custos por pessoa/criança alimentam o cálculo das expedições
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Fornecedor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <div key={s.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold">{s.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-2 hover:bg-yellow-50 rounded">
                    <Edit2 size={16} className="text-amber-600" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-2 hover:bg-rose-50 rounded">
                    <Trash2 size={16} className="text-rose-600" />
                  </button>
                </div>
              </div>

              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                  typeColors[s.type] || typeColors.outro
                }`}
              >
                {s.type}
              </span>

              {/* regra de pagamento + custo */}
              <div className="mb-3">
                <p className="text-[10px] uppercase text-gray-400 mb-1">
                  {BILLING_LABELS[s.billingMode] || 'Por pessoa'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(!s.billingMode || s.billingMode === 'per_person') && (
                    <>
                      <CostChip label="Adulto" value={s.costPerPerson} />
                      <CostChip label={`Criança (≤${s.childMaxAge ?? 12})`} value={s.costPerChild} />
                      {(s.costPerStudent ?? 0) > 0 && <CostChip label="Estudante" value={s.costPerStudent || 0} />}
                      {(s.costPerSenior ?? 0) > 0 && <CostChip label={`Idoso (≥${s.seniorMinAge ?? 60})`} value={s.costPerSenior || 0} />}
                    </>
                  )}
                  {s.billingMode === 'per_car' && <CostChip label="Por carro" value={s.costPerCar} />}
                  {s.billingMode === 'per_room' && <CostChip label="Por quarto" value={s.costPerRoom} />}
                  {s.billingMode === 'flat' && <CostChip label="Valor fixo" value={s.flatFee} />}
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-500">
                {s.phone && <p>{s.phone}</p>}
                {s.email && <p>{s.email}</p>}
                {s.address && <p>{s.address}</p>}
              </div>

              {s.rating > 0 && (
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.floor(s.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{s.rating}</span>
                </div>
              )}
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Nenhum fornecedor cadastrado.
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 grid md:grid-cols-2 gap-4">
              <input
                className="input"
                placeholder="Nome *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="hotel">Hotel</option>
                <option value="restaurante">Restaurante</option>
                <option value="transporte">Transporte</option>
                <option value="guia">Guia</option>
                <option value="passeio">Passeio</option>
                <option value="outro">Outro</option>
              </select>
              {/* Regra de pagamento */}
              <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Regra de pagamento
                </label>
                <select
                  className="input mt-1"
                  value={form.billingMode}
                  onChange={(e) => setForm({ ...form, billingMode: e.target.value as BillingMode })}
                >
                  {Object.entries(BILLING_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  {form.billingMode === 'per_person' && (
                    <>
                      <div className="col-span-2">
                        <p className="text-[11px] text-gray-400 mb-1">
                          Tarifário por categoria (idades, valores e ingressos)
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Adulto (R$)</label>
                        <input type="number" className="input" value={form.costPerPerson}
                          onChange={(e) => setForm({ ...form, costPerPerson: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Criança (R$)</label>
                        <input type="number" className="input" value={form.costPerChild}
                          onChange={(e) => setForm({ ...form, costPerChild: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Estudante (R$)</label>
                        <input type="number" className="input" value={form.costPerStudent}
                          onChange={(e) => setForm({ ...form, costPerStudent: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Idoso (R$)</label>
                        <input type="number" className="input" value={form.costPerSenior}
                          onChange={(e) => setForm({ ...form, costPerSenior: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Criança: idade até (anos)</label>
                        <input type="number" min={0} className="input" value={form.childMaxAge}
                          onChange={(e) => setForm({ ...form, childMaxAge: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Idoso: idade a partir de (anos)</label>
                        <input type="number" min={0} className="input" value={form.seniorMinAge}
                          onChange={(e) => setForm({ ...form, seniorMinAge: Number(e.target.value) })} />
                      </div>
                      <p className="col-span-2 text-[11px] text-gray-400">
                        Criança e idoso são aplicados automaticamente pela idade. Estudante é definido
                        manualmente no cadastro do cliente.
                      </p>
                    </>
                  )}
                  {form.billingMode === 'per_car' && (
                    <div>
                      <label className="text-xs text-gray-500">Custo por carro (R$)</label>
                      <input type="number" className="input" value={form.costPerCar}
                        onChange={(e) => setForm({ ...form, costPerCar: Number(e.target.value) })} />
                    </div>
                  )}
                  {form.billingMode === 'per_room' && (
                    <div>
                      <label className="text-xs text-gray-500">Custo por quarto/diária (R$)</label>
                      <input type="number" className="input" value={form.costPerRoom}
                        onChange={(e) => setForm({ ...form, costPerRoom: Number(e.target.value) })} />
                    </div>
                  )}
                  {form.billingMode === 'flat' && (
                    <div>
                      <label className="text-xs text-gray-500">Valor fixo da expedição (R$)</label>
                      <input type="number" className="input" value={form.flatFee}
                        onChange={(e) => setForm({ ...form, flatFee: Number(e.target.value) })} />
                    </div>
                  )}
                </div>
              </div>

              {/* Dados a exportar na planilha */}
              <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Dados na planilha deste fornecedor
                </label>
                <p className="text-xs text-gray-400 mb-2">Marque as colunas que aparecem no CSV (uma pessoa por linha).</p>
                <div className="flex flex-wrap gap-2">
                  {EXPORT_FIELDS.map((f) => {
                    const active = form.exportFields.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            exportFields: active
                              ? form.exportFields.filter((x) => x !== f.id)
                              : [...form.exportFields, f.id],
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          active
                            ? 'bg-yellow-400 border-yellow-400 text-black'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-yellow-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                className="input"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="input md:col-span-2"
                placeholder="Endereço"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div>
                <label className="text-xs text-gray-500">Avaliação (0-5)</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  className="input"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                />
              </div>
              <textarea
                className="input md:col-span-2 h-16"
                placeholder="Observações"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-2">
                <button onClick={save} className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Criar'}
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

function CostChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2 py-1">
      <span className="text-[10px] uppercase text-gray-400">{label}: </span>
      <span className="font-bold text-rose-600 text-sm">{formatBRL(value || 0)}</span>
    </div>
  );
}
