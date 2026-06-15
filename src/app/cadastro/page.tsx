'use client';

import { useState, useEffect } from 'react';
import { MapPin, Car, Users, AlertCircle, ChevronRight, Check, Plus, Trash2, Phone, Shirt, BedDouble, Mountain, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const SHIRT_SIZES_ADULT = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'];
const SHIRT_SIZES_INFANTIL = ['Infantil 02', 'Infantil 04', 'Infantil 06', 'Infantil 08', 'Infantil 10', 'Infantil 12', 'Infantil 14'];

const ROOM_OPTIONS = [
  'Suíte Casal',
  'Suíte Casal + 1 Cama de Solteiro',
  'Suíte Casal + 2 Camas de Solteiro',
  '2 Suítes Casal',
  '3 Suítes Casal',
  'Suíte Casal + Segundo Quarto 1 Cama Solteiro',
  'Suíte Casal + Segundo Quarto 2 Camas Solteiro',
  'Outro',
];

interface Passenger {
  name: string;
  isChild: boolean;
}

interface ExpeditionInfo {
  id: string;
  routeName: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

interface FormData {
  confirmedData: boolean;
  confirmedResponsibility: boolean;
  email: string;
  name: string;
  age: string;
  cpf: string;
  birthDate: string;
  job: string;
  phone: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  cityState: string;
  cep: string;
  car: string;
  vehiclePlate: string;
  companionName: string;
  companionCpf: string;
  companionAge: string;
  companionBirthDate: string;
  companionJob: string;
  hasAdditional: boolean | null;
  additionalPassengers: Passenger[];
  petInfo: string;
  emergencyContact: string;
  roomConfig: string;
  shirtSizes: string[];
  notes: string;
}

function formatDateBR(d?: string) {
  if (!d) return '';
  const date = new Date(d.length <= 10 ? d + 'T12:00:00' : d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CadastroPage() {
  const [expId, setExpId] = useState<string | null>(null);
  const [expedition, setExpedition] = useState<ExpeditionInfo | null>(null);

  // lê ?exp=<id> do link específico da expedição (client-side, evita Suspense)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('exp');
    if (p) setExpId(p);
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({
    confirmedData: false,
    confirmedResponsibility: false,
    email: '',
    name: '',
    age: '',
    cpf: '',
    birthDate: '',
    job: '',
    phone: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    cityState: '',
    cep: '',
    car: '',
    vehiclePlate: '',
    companionName: '',
    companionCpf: '',
    companionAge: '',
    companionBirthDate: '',
    companionJob: '',
    hasAdditional: null,
    additionalPassengers: [],
    petInfo: '',
    emergencyContact: '',
    roomConfig: '',
    shirtSizes: [],
    notes: '',
  });

  // Carrega informações da expedição do link específico
  useEffect(() => {
    if (!expId) return;
    fetch(`/api/cadastro?exp=${expId}`)
      .then((r) => r.json())
      .then((d) => setExpedition(d.expedition))
      .catch(() => {});
  }, [expId]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleShirt = (size: string) =>
    setForm((f) => ({
      ...f,
      shirtSizes: f.shirtSizes.includes(size)
        ? f.shirtSizes.filter((s) => s !== size)
        : [...f.shirtSizes, size],
    }));

  const addPassenger = () => {
    if (form.additionalPassengers.length >= 4) return;
    setForm((f) => ({ ...f, additionalPassengers: [...f.additionalPassengers, { name: '', isChild: false }] }));
  };

  const updatePassenger = (i: number, patch: Partial<Passenger>) =>
    setForm((f) => ({
      ...f,
      additionalPassengers: f.additionalPassengers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));

  const removePassenger = (i: number) =>
    setForm((f) => ({ ...f, additionalPassengers: f.additionalPassengers.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    if (!form.confirmedData) { toast.error('Confirme que os dados são reais'); return; }
    if (!form.name.trim()) { toast.error('Informe o nome completo'); return; }
    if (!form.cpf.trim()) { toast.error('Informe o CPF'); return; }
    if (!form.phone.trim()) { toast.error('Informe o telefone/WhatsApp'); return; }
    if (!form.companionName.trim()) { toast.error('Informe o nome do acompanhante'); return; }
    if (!form.companionCpf.trim()) { toast.error('Informe o CPF do acompanhante'); return; }
    if (form.hasAdditional === null) { toast.error('Informe se há passageiros adicionais'); return; }
    if (!form.emergencyContact.trim()) { toast.error('Informe o contato de emergência'); return; }
    if (!form.roomConfig) { toast.error('Selecione a configuração do quarto'); return; }
    if (form.shirtSizes.length === 0) { toast.error('Selecione ao menos um tamanho de camiseta'); return; }
    if (!form.confirmedResponsibility) { toast.error('Confirme a responsabilidade sobre os dados'); return; }

    setSaving(true);
    try {
      const family: any[] = [];

      // Acompanhante (sempre adulto)
      if (form.companionName.trim()) {
        family.push({
          name: form.companionName,
          relation: 'outro',
          birthDate: form.companionBirthDate || undefined,
          document: form.companionCpf || undefined,
          job: form.companionJob || undefined,
          isChild: false,
        });
      }

      // Passageiros adicionais (filho(a) = criança)
      for (const p of form.additionalPassengers) {
        if (p.name.trim()) {
          family.push({
            name: p.name,
            relation: p.isChild ? 'filho' : 'outro',
            isChild: p.isChild,
          });
        }
      }

      // "Cidade/Estado" -> city + state
      const [city, state] = form.cityState.split('/').map((s) => s.trim());

      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expeditionId: expId || undefined,
          name: form.name,
          email: form.email || undefined,
          phone: form.phone,
          whatsapp: form.phone,
          cpf: form.cpf,
          birthDate: form.birthDate || undefined,
          job: form.job || undefined,
          address: form.address || undefined,
          addressNumber: form.addressNumber || undefined,
          neighborhood: form.neighborhood || undefined,
          cep: form.cep || undefined,
          city: city || undefined,
          state: state || undefined,
          vehicle: (form.car || form.vehiclePlate)
            ? { model: form.car, plate: form.vehiclePlate }
            : undefined,
          family,
          shirtSizes: form.shirtSizes,
          roomConfig: form.roomConfig || undefined,
          emergencyContact: form.emergencyContact || undefined,
          petInfo: form.petInfo || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar formulário');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Cadastro recebido!</h2>
          <p className="text-gray-500 mb-6">
            {expedition
              ? <>Sua inscrição para <strong>{expedition.routeName}</strong> foi enviada com sucesso. Em breve entraremos em contato pelo WhatsApp.</>
              : 'Suas informações foram enviadas com sucesso. Em breve entraremos em contato pelo WhatsApp.'}
          </p>
          <p className="text-sm text-orange-500 font-medium">📸 @4x4mundoafora</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900 text-white py-8 px-4 text-center">
        <p className="text-orange-400 text-xs tracking-[0.3em] uppercase font-semibold mb-2">
          4x4 Mundo Afora
        </p>
        <h1 className="text-2xl font-bold">Ficha de Cadastro</h1>
        <p className="text-gray-400 text-sm mt-1">
          Preencha todas as informações para confirmar sua participação
        </p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-12">

        {/* Banner da expedição (quando o link é específico) */}
        {expedition && (
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-5 shadow-md">
            <p className="text-orange-100 text-xs uppercase tracking-wide font-semibold flex items-center gap-1.5 mb-1">
              <Mountain size={13} /> Inscrição para a expedição
            </p>
            <h2 className="text-xl font-bold">{expedition.routeName}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-orange-50 mt-2">
              {expedition.location && (
                <span className="flex items-center gap-1"><MapPin size={13} /> {expedition.location}</span>
              )}
              {(expedition.startDate || expedition.endDate) && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> {formatDateBR(expedition.startDate)}
                  {expedition.endDate ? ` – ${formatDateBR(expedition.endDate)}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Confirmação inicial */}
        <Card title="E-mail">
          <input
            className="input mb-3"
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0"
              checked={form.confirmedData}
              onChange={(e) => set('confirmedData', e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Confirmo que todas as informações fornecidas neste formulário são verdadeiras. <span className="text-orange-500 font-medium">*</span>
            </span>
          </label>
        </Card>

        {/* Motorista principal */}
        <Card title="Dados do Motorista Principal">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input md:col-span-2"
              placeholder="Nome completo *"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <input
              className="input"
              placeholder="Idade *"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
            />
            <input
              className="input"
              placeholder="CPF *"
              value={form.cpf}
              onChange={(e) => set('cpf', e.target.value)}
            />
            <div>
              <label className="text-xs text-gray-500">Data de nascimento *</label>
              <input
                type="date"
                className="input"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </div>
            <input
              className="input"
              placeholder="Profissão *"
              value={form.job}
              onChange={(e) => set('job', e.target.value)}
            />
            <input
              className="input md:col-span-2"
              placeholder="Número de contato (telefone/WhatsApp) *"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
        </Card>

        {/* Endereço */}
        <Card title="Endereço" icon={<MapPin size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input md:col-span-2"
              placeholder="Endereço residencial *"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
            <input
              className="input"
              placeholder="Número e complemento *"
              value={form.addressNumber}
              onChange={(e) => set('addressNumber', e.target.value)}
            />
            <input
              className="input"
              placeholder="Bairro"
              value={form.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
            />
            <input
              className="input"
              placeholder="Cidade/Estado (ex: Porto Alegre/RS) *"
              value={form.cityState}
              onChange={(e) => set('cityState', e.target.value)}
            />
            <input
              className="input"
              placeholder="CEP *"
              value={form.cep}
              onChange={(e) => set('cep', e.target.value)}
            />
          </div>
        </Card>

        {/* Veículo */}
        <Card title="Veículo" icon={<Car size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input md:col-span-2"
              placeholder="Carro — Modelo, Cor, Ano (ex: Jimny, Cinza, 2023) *"
              value={form.car}
              onChange={(e) => set('car', e.target.value)}
            />
            <input
              className="input"
              placeholder="Placa do veículo *"
              value={form.vehiclePlate}
              onChange={(e) => set('vehiclePlate', e.target.value.toUpperCase())}
            />
          </div>
        </Card>

        {/* Acompanhante */}
        <Card title="Acompanhante" icon={<Users size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input md:col-span-2"
              placeholder="Nome completo do acompanhante *"
              value={form.companionName}
              onChange={(e) => set('companionName', e.target.value)}
            />
            <input
              className="input"
              placeholder="CPF do acompanhante *"
              value={form.companionCpf}
              onChange={(e) => set('companionCpf', e.target.value)}
            />
            <input
              className="input"
              placeholder="Idade do acompanhante *"
              value={form.companionAge}
              onChange={(e) => set('companionAge', e.target.value)}
            />
            <div>
              <label className="text-xs text-gray-500">Data de nascimento do acompanhante *</label>
              <input
                type="date"
                className="input"
                value={form.companionBirthDate}
                onChange={(e) => set('companionBirthDate', e.target.value)}
              />
            </div>
            <input
              className="input"
              placeholder="Profissão do acompanhante *"
              value={form.companionJob}
              onChange={(e) => set('companionJob', e.target.value)}
            />
          </div>
        </Card>

        {/* Passageiros adicionais */}
        <Card title="Passageiros Adicionais" icon={<Plus size={15} />}>
          <p className="text-xs text-gray-500 mb-3">Existe passageiro adicional? *</p>
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="radio"
                name="hasAdditional"
                checked={form.hasAdditional === false}
                onChange={() => set('hasAdditional', false)}
                className="accent-orange-500"
              />
              Não!
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="radio"
                name="hasAdditional"
                checked={form.hasAdditional === true}
                onChange={() => { set('hasAdditional', true); if (form.additionalPassengers.length === 0) addPassenger(); }}
                className="accent-orange-500"
              />
              Sim!
            </label>
          </div>

          {form.hasAdditional && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              {form.additionalPassengers.map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex gap-2 items-center">
                    <input
                      className="input flex-1 bg-white"
                      placeholder={`Passageiro adicional ${i + 1} — nome completo`}
                      value={p.name}
                      onChange={(e) => updatePassenger(i, { name: e.target.value })}
                    />
                    <button onClick={() => removePassenger(i)} className="p-2 hover:bg-rose-50 rounded">
                      <Trash2 size={15} className="text-rose-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pl-1">
                    <span className="text-xs text-gray-500">Esse passageiro é filho(a)?</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        name={`child-${i}`}
                        checked={!p.isChild}
                        onChange={() => updatePassenger(i, { isChild: false })}
                        className="accent-orange-500"
                      />
                      Não
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        name={`child-${i}`}
                        checked={p.isChild}
                        onChange={() => updatePassenger(i, { isChild: true })}
                        className="accent-orange-500"
                      />
                      Sim, é filho(a)
                    </label>
                  </div>
                </div>
              ))}
              {form.additionalPassengers.length < 4 && (
                <button
                  onClick={addPassenger}
                  className="text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar passageiro
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Pet */}
        <Card title="Pet">
          <input
            className="input"
            placeholder="Vai levar pet? Informe raça, porte e nome (deixe em branco se não)"
            value={form.petInfo}
            onChange={(e) => set('petInfo', e.target.value)}
          />
        </Card>

        {/* Emergência */}
        <Card title="Contato de Emergência" icon={<Phone size={15} />}>
          <input
            className="input"
            placeholder="Nome e número de contato para emergência *"
            value={form.emergencyContact}
            onChange={(e) => set('emergencyContact', e.target.value)}
          />
        </Card>

        {/* Configuração do Quarto */}
        <Card title="Configuração do Quarto" icon={<BedDouble size={15} />}>
          <p className="text-xs text-gray-500 mb-3">Selecione a opção que melhor atende sua necessidade *</p>
          <div className="space-y-2">
            {ROOM_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="roomConfig"
                  value={opt}
                  checked={form.roomConfig === opt}
                  onChange={() => set('roomConfig', opt)}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Camisetas */}
        <Card title="Seleção de Camisetas" icon={<Shirt size={15} />}>
          <p className="text-xs text-gray-500 mb-3">
            Selecione todos os tamanhos necessários para sua comitiva (pode marcar mais de um) *
          </p>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adulto</p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_SIZES_ADULT.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleShirt(s)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.shirtSizes.includes(s)
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Infantil</p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_SIZES_INFANTIL.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleShirt(s)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.shirtSizes.includes(s)
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  {s.replace('Infantil ', '')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => toggleShirt('Outro')}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.shirtSizes.includes('Outro')
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                }`}
              >
                Outro
              </button>
            </div>
          </div>
          {form.shirtSizes.length > 0 && (
            <p className="text-xs text-emerald-600 mt-2">
              Selecionado: {form.shirtSizes.join(', ')}
            </p>
          )}
        </Card>

        {/* Observações */}
        <Card title="Observações">
          <textarea
            className="input h-24 w-full resize-none"
            placeholder="Observações gerais, restrições alimentares, condições médicas, dúvidas..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Card>

        {/* Política de cancelamento */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <div className="flex gap-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold mb-1">Política de Cancelamento</p>
              <p className="text-xs leading-relaxed">
                Em caso de cancelamento, informar com antecedência mínima de 30 dias para reembolso integral.
                Cancelamentos entre 15 e 30 dias antes da expedição terão reembolso de 50%.
                Cancelamentos com menos de 15 dias não terão reembolso.
                A organização se reserva o direito de cancelar a expedição por motivos de força maior,
                com reembolso integral aos participantes.
              </p>
            </div>
          </div>
        </div>

        {/* Responsabilidade de dados */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0"
              checked={form.confirmedResponsibility}
              onChange={(e) => set('confirmedResponsibility', e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Estou ciente de que os dados fornecidos serão utilizados exclusivamente para organização
              desta expedição pela <strong>4x4 Mundo Afora</strong> e confirmo minha responsabilidade
              sobre a veracidade das informações. <span className="text-orange-500 font-medium">*</span>
            </span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving ? 'Enviando...' : (
            <>
              Enviar Cadastro
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
        {icon && <span className="text-orange-500">{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
