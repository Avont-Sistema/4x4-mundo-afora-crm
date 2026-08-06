'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { EXPORT_FIELDS, BILLING_LABELS, type BillingMode } from '@/lib/supplierFields';

export interface CommonCategoryPricing {
  perPerson: number;
  casal: number;
  child0to5: number;
  child5to10: number;
  above10: number;
  senior: number;
}

export interface HotelCategoryPricing {
  single: number;
  casal: number;
  triplo: number;
  quadruplo: number;
  familia: number;
  adicional: number;
}

export interface Supplier {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  billingMode: BillingMode;
  commonPricing?: CommonCategoryPricing;
  hotelPricing?: HotelCategoryPricing;
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

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  hotel_internacional: 'Hotel Internacional',
  restaurante: 'Restaurante',
  transporte: 'Transporte',
  guia: 'Guia',
  passeio: 'Passeio',
  outro: 'Outro',
};

const HOTEL_TYPES = ['hotel', 'hotel_internacional'];

const EMPTY_COMMON_PRICING: CommonCategoryPricing = {
  perPerson: 0, casal: 0, child0to5: 0, child5to10: 0, above10: 0, senior: 0,
};
const EMPTY_HOTEL_PRICING: HotelCategoryPricing = {
  single: 0, casal: 0, triplo: 0, quadruplo: 0, familia: 0, adicional: 0,
};

export const SUPPLIER_TYPE_COLORS: Record<string, string> = {
  hotel: 'bg-yellow-100 text-amber-800',
  hotel_internacional: 'bg-blue-100 text-blue-800',
  restaurante: 'bg-orange-100 text-orange-800',
  transporte: 'bg-green-100 text-green-800',
  guia: 'bg-purple-100 text-purple-800',
  passeio: 'bg-cyan-100 text-cyan-800',
  outro: 'bg-gray-100 text-gray-800',
};

type SupplierFormState = {
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  billingMode: BillingMode;
  commonPricing: CommonCategoryPricing;
  hotelPricing: HotelCategoryPricing;
  costPerPerson: number;
  costPerChild: number;
  costPerStudent: number;
  costPerSenior: number;
  childMaxAge: number;
  seniorMinAge: number;
  costPerCar: number;
  costPerRoom: number;
  flatFee: number;
  exportFields: string[];
  rating: number;
  notes: string;
};

const emptyForm: SupplierFormState = {
  name: '',
  type: 'hotel',
  email: '',
  phone: '',
  address: '',
  billingMode: 'per_category',
  commonPricing: { ...EMPTY_COMMON_PRICING },
  hotelPricing: { ...EMPTY_HOTEL_PRICING },
  costPerPerson: 0,
  costPerChild: 0,
  costPerStudent: 0,
  costPerSenior: 0,
  childMaxAge: 12,
  seniorMinAge: 60,
  costPerCar: 0,
  costPerRoom: 0,
  flatFee: 0,
  exportFields: ['name', 'role', 'document', 'responsible'],
  rating: 0,
  notes: '',
};

function formFromSupplier(s: Supplier): SupplierFormState {
  return {
    name: s.name,
    type: s.type,
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    billingMode: s.billingMode || 'per_category',
    commonPricing: { ...EMPTY_COMMON_PRICING, ...s.commonPricing },
    hotelPricing: { ...EMPTY_HOTEL_PRICING, ...s.hotelPricing },
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
  };
}

export default function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: (supplier: Supplier) => void;
}) {
  const [form, setForm] = useState<SupplierFormState>(supplier ? formFromSupplier(supplier) : emptyForm);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome');
      return;
    }
    setSaving(true);
    try {
      const res = supplier
        ? await fetch(`/api/suppliers/${supplier.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      toast.success(supplier ? 'Fornecedor atualizado' : 'Fornecedor criado');
      onSaved(data.supplier);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
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
            {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
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
              {form.billingMode === 'per_category' && HOTEL_TYPES.includes(form.type) && (
                <>
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-400 mb-1">
                      Preço por quarto conforme ocupação. As quantidades de cada tipo são
                      lançadas depois, dentro de cada expedição (aba Fornecedores).
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Single (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.single}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, single: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Casal (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.casal}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, casal: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Triplo (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.triplo}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, triplo: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Quádruplo (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.quadruplo}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, quadruplo: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Família (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.familia}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, familia: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Adicional (R$)</label>
                    <input type="number" className="input" value={form.hotelPricing.adicional}
                      onChange={(e) => setForm({ ...form, hotelPricing: { ...form.hotelPricing, adicional: Number(e.target.value) } })} />
                  </div>
                </>
              )}
              {form.billingMode === 'per_category' && !HOTEL_TYPES.includes(form.type) && (
                <>
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-400 mb-1">
                      Preço por categoria de pessoa. As quantidades contratadas são lançadas
                      depois, dentro de cada expedição (aba Fornecedores).
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Por pessoa (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.perPerson}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, perPerson: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Casal (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.casal}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, casal: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Criança de 0 a 5 anos (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.child0to5}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, child0to5: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Criança de até 10 anos (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.child5to10}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, child5to10: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Acima de 10 anos (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.above10}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, above10: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Idoso (R$)</label>
                    <input type="number" className="input" value={form.commonPricing.senior}
                      onChange={(e) => setForm({ ...form, commonPricing: { ...form.commonPricing, senior: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Idoso: idade a partir de (anos)</label>
                    <input type="number" min={0} className="input" value={form.seniorMinAge}
                      onChange={(e) => setForm({ ...form, seniorMinAge: Number(e.target.value) })} />
                  </div>
                </>
              )}
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
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Salvando...' : supplier ? 'Salvar' : 'Criar'}
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
