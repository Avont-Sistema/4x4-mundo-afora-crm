'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL } from '@/lib/format';
import { BILLING_LABELS } from '@/lib/supplierFields';
import SupplierFormModal, {
  type Supplier,
  SUPPLIER_TYPE_LABELS as typeLabels,
  SUPPLIER_TYPE_COLORS as typeColors,
} from '@/components/SupplierFormModal';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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
    setEditingSupplier(null);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setShowForm(true);
  };

  const handleSaved = (saved: Supplier) => {
    setSuppliers((prev) =>
      prev.some((x) => x.id === saved.id)
        ? prev.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...prev]
    );
    setShowForm(false);
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
                {typeLabels[s.type] || s.type}
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
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
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
