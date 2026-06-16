'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Car, Users, AlertCircle, ChevronRight, Check, Plus, Trash2, Phone,
  Shirt, BedDouble, Mountain, Calendar, Search, UserCheck, Ruler, ChevronDown,
  PenLine, Eraser, Download, FileSignature, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContractPdf, type ContractPdfData } from '@/lib/contractPdf';

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

// Tabela de medidas (cm) — dados oficiais 4x4 Mundo Afora (Dry Fit)
const SHIRT_TABLE_ADULT = {
  sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'],
  torax: [49, 52, 54, 58, 62, 64, 67, 69, 71],
  comprimento: [69, 72, 74, 76, 80, 80, 82, 84, 85],
  manga: [17, 18, 20, 22, 24, 25, 25, 25, 25],
};
const SHIRT_TABLE_INFANTIL = {
  sizes: ['2', '4', '6', '8', '10', '12', '14'],
  torax: [34, 36, 38, 40, 42, 44, 46],
  comprimento: [41, 44, 48, 52, 55, 59, 63],
  manga: [9, 10, 11, 13, 14, 15, 16],
};

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

interface TermInfo {
  text: string;
  signLine: string;
  version: string;
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

const emptyForm: FormData = {
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
};

function formatDateBR(d?: string) {
  if (!d) return '';
  const date = new Date(d.length <= 10 ? d + 'T12:00:00' : d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Phase = 'form' | 'sign' | 'done';

export default function CadastroPage() {
  const [expId, setExpId] = useState<string | null>(null);
  const [expedition, setExpedition] = useState<ExpeditionInfo | null>(null);
  const [term, setTerm] = useState<TermInfo | null>(null);

  const [phase, setPhase] = useState<Phase>('form');
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [expeditionName, setExpeditionName] = useState<string | undefined>(undefined);
  const [signedContract, setSignedContract] = useState<ContractPdfData | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  // lookup "já sou cliente"
  const [showLookup, setShowLookup] = useState(false);
  const [lookupCpf, setLookupCpf] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // lê ?exp=<id> do link específico da expedição
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('exp');
    setExpId(p);
  }, []);

  // Carrega informações da expedição + termo
  useEffect(() => {
    const qs = expId ? `?exp=${expId}` : '';
    fetch(`/api/cadastro${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setExpedition(d.expedition || null);
        setTerm(d.term || null);
      })
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

  // --- Feature 2: buscar cliente já cadastrado por CPF ---
  const doLookup = async () => {
    const cpf = lookupCpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      toast.error('Digite um CPF válido (11 dígitos)');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/cadastro/lookup?cpf=${cpf}`);
      const data = await res.json();
      if (!data.found) {
        toast.error('Não encontramos um cadastro com esse CPF. Preencha o formulário normalmente.');
        return;
      }
      const c = data.client;
      setForm((f) => ({
        ...f,
        name: c.name || f.name,
        email: c.email || f.email,
        phone: c.phone || f.phone,
        cpf: c.cpf || lookupCpf,
        birthDate: c.birthDate || f.birthDate,
        job: c.job || f.job,
        address: c.address || f.address,
        addressNumber: c.addressNumber || f.addressNumber,
        neighborhood: c.neighborhood || f.neighborhood,
        cep: c.cep || f.cep,
        cityState: c.city ? `${c.city}${c.state ? '/' + c.state : ''}` : f.cityState,
        car: c.vehicleModel || f.car,
        vehiclePlate: c.vehiclePlate || f.vehiclePlate,
        roomConfig: c.roomConfig || f.roomConfig,
        shirtSizes: c.shirtSizes && c.shirtSizes.length ? c.shirtSizes : f.shirtSizes,
      }));
      setPrefilled(true);
      setShowLookup(false);
      toast.success('Cadastro encontrado! Confira e altere o que precisar.');
    } catch {
      toast.error('Erro ao buscar cadastro');
    } finally {
      setLookupLoading(false);
    }
  };

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

      for (const p of form.additionalPassengers) {
        if (p.name.trim()) {
          family.push({
            name: p.name,
            relation: p.isChild ? 'filho' : 'outro',
            isChild: p.isChild,
          });
        }
      }

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
      setClientId(data.clientId);
      setExpeditionName(data.expeditionName || expedition?.routeName);
      setPhase('sign');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar formulário');
    } finally {
      setSaving(false);
    }
  };

  // --- Feature 1: registra a assinatura do termo ---
  const handleSign = async (signatureDataUrl: string) => {
    if (!clientId) { toast.error('Sessão expirada, recarregue a página'); return; }
    setSigning(true);
    try {
      const party: { name: string; cpf?: string }[] = [{ name: form.name, cpf: form.cpf }];
      if (form.companionName.trim()) party.push({ name: form.companionName, cpf: form.companionCpf });
      form.additionalPassengers.forEach((p) => { if (p.name.trim()) party.push({ name: p.name }); });

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: form.name,
          signerCpf: form.cpf,
          expeditionId: expId || undefined,
          expeditionName,
          termVersion: term?.version,
          termSnapshot: term?.text,
          signLine: term?.signLine,
          signatureDataUrl,
          party,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar assinatura');

      // busca o contrato completo (IP/dispositivo) para o PDF
      let full: any = null;
      try {
        const r2 = await fetch(`/api/contracts/${data.contractId}`);
        const d2 = await r2.json();
        full = d2.contract;
      } catch { /* segue sem ip/userAgent */ }

      setSignedContract({
        clientName: form.name,
        signerCpf: form.cpf,
        expeditionName,
        termSnapshot: term?.text || '',
        signLine: term?.signLine,
        signatureDataUrl,
        party,
        signedAt: data.signedAt,
        hash: data.hash,
        termVersion: term?.version,
        ip: full?.ip,
        userAgent: full?.userAgent,
      });
      setPhase('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  };

  // ====== TELA FINAL ======
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Inscrição concluída!</h2>
          <p className="text-gray-500 mb-6">
            {expeditionName
              ? <>Sua inscrição para <strong>{expeditionName}</strong> e o termo de uso de imagem foram registrados. Em breve entraremos em contato pelo WhatsApp.</>
              : 'Suas informações e o termo de uso de imagem foram registrados. Em breve entraremos em contato pelo WhatsApp.'}
          </p>
          {signedContract && (
            <button
              onClick={() => generateContractPdf(signedContract)}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"
            >
              <Download size={18} /> Baixar contrato (PDF)
            </button>
          )}
          <p className="text-sm text-orange-500 font-medium mt-2">📸 @4x4mundoafora</p>
        </div>
      </div>
    );
  }

  // ====== TELA DE ASSINATURA ======
  if (phase === 'sign') {
    return (
      <SignatureStep
        term={term}
        signerName={form.name}
        expeditionName={expeditionName}
        signing={signing}
        onSign={handleSign}
      />
    );
  }

  // ====== FORMULÁRIO ======
  return (
    <div className="min-h-screen bg-gray-100">
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

        {/* Banner da expedição */}
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

        {/* Feature 2: Já sou cliente cadastrado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {!showLookup ? (
            <button
              onClick={() => setShowLookup(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600 py-1"
            >
              <UserCheck size={16} className="text-orange-500" /> Já sou cliente cadastrado
            </button>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <UserCheck size={15} className="text-orange-500" /> Buscar meu cadastro pelo CPF
              </p>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Digite seu CPF"
                  value={lookupCpf}
                  onChange={(e) => setLookupCpf(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }}
                />
                <button
                  onClick={doLookup}
                  disabled={lookupLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 rounded-lg flex items-center gap-1.5 text-sm font-semibold"
                >
                  <Search size={15} /> {lookupLoading ? '...' : 'Buscar'}
                </button>
              </div>
              <button onClick={() => setShowLookup(false)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
                Cancelar
              </button>
            </div>
          )}
          {prefilled && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5">
              <Check size={13} /> Cadastro encontrado. Confira os campos abaixo e altere o que precisar.
            </p>
          )}
        </div>

        {/* E-mail */}
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
            <input className="input md:col-span-2" placeholder="Nome completo *" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <input className="input" placeholder="Idade *" value={form.age} onChange={(e) => set('age', e.target.value)} />
            <input className="input" placeholder="CPF *" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
            <div>
              <label className="text-xs text-gray-500">Data de nascimento *</label>
              <input type="date" className="input" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
            </div>
            <input className="input" placeholder="Profissão *" value={form.job} onChange={(e) => set('job', e.target.value)} />
            <input className="input md:col-span-2" placeholder="Número de contato (telefone/WhatsApp) *" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </Card>

        {/* Endereço */}
        <Card title="Endereço" icon={<MapPin size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Endereço residencial *" value={form.address} onChange={(e) => set('address', e.target.value)} />
            <input className="input" placeholder="Número e complemento *" value={form.addressNumber} onChange={(e) => set('addressNumber', e.target.value)} />
            <input className="input" placeholder="Bairro" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            <input className="input" placeholder="Cidade/Estado (ex: Porto Alegre/RS) *" value={form.cityState} onChange={(e) => set('cityState', e.target.value)} />
            <input className="input" placeholder="CEP *" value={form.cep} onChange={(e) => set('cep', e.target.value)} />
          </div>
        </Card>

        {/* Veículo */}
        <Card title="Veículo" icon={<Car size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Carro — Modelo, Cor, Ano (ex: Jimny, Cinza, 2023) *" value={form.car} onChange={(e) => set('car', e.target.value)} />
            <input className="input" placeholder="Placa do veículo *" value={form.vehiclePlate} onChange={(e) => set('vehiclePlate', e.target.value.toUpperCase())} />
          </div>
        </Card>

        {/* Acompanhante */}
        <Card title="Acompanhante" icon={<Users size={15} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Nome completo do acompanhante *" value={form.companionName} onChange={(e) => set('companionName', e.target.value)} />
            <input className="input" placeholder="CPF do acompanhante *" value={form.companionCpf} onChange={(e) => set('companionCpf', e.target.value)} />
            <input className="input" placeholder="Idade do acompanhante *" value={form.companionAge} onChange={(e) => set('companionAge', e.target.value)} />
            <div>
              <label className="text-xs text-gray-500">Data de nascimento do acompanhante *</label>
              <input type="date" className="input" value={form.companionBirthDate} onChange={(e) => set('companionBirthDate', e.target.value)} />
            </div>
            <input className="input" placeholder="Profissão do acompanhante *" value={form.companionJob} onChange={(e) => set('companionJob', e.target.value)} />
          </div>
        </Card>

        {/* Passageiros adicionais */}
        <Card title="Passageiros Adicionais" icon={<Plus size={15} />}>
          <p className="text-xs text-gray-500 mb-3">Existe passageiro adicional? *</p>
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input type="radio" name="hasAdditional" checked={form.hasAdditional === false} onChange={() => set('hasAdditional', false)} className="accent-orange-500" />
              Não!
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input type="radio" name="hasAdditional" checked={form.hasAdditional === true} onChange={() => { set('hasAdditional', true); if (form.additionalPassengers.length === 0) addPassenger(); }} className="accent-orange-500" />
              Sim!
            </label>
          </div>

          {form.hasAdditional && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              {form.additionalPassengers.map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex gap-2 items-center">
                    <input className="input flex-1 bg-white" placeholder={`Passageiro adicional ${i + 1} — nome completo`} value={p.name} onChange={(e) => updatePassenger(i, { name: e.target.value })} />
                    <button onClick={() => removePassenger(i)} className="p-2 hover:bg-rose-50 rounded">
                      <Trash2 size={15} className="text-rose-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pl-1">
                    <span className="text-xs text-gray-500">Esse passageiro é filho(a)?</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input type="radio" name={`child-${i}`} checked={!p.isChild} onChange={() => updatePassenger(i, { isChild: false })} className="accent-orange-500" />
                      Não
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input type="radio" name={`child-${i}`} checked={p.isChild} onChange={() => updatePassenger(i, { isChild: true })} className="accent-orange-500" />
                      Sim, é filho(a)
                    </label>
                  </div>
                </div>
              ))}
              {form.additionalPassengers.length < 4 && (
                <button onClick={addPassenger} className="text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1">
                  <Plus size={14} /> Adicionar passageiro
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Pet */}
        <Card title="Pet">
          <input className="input" placeholder="Vai levar pet? Informe raça, porte e nome (deixe em branco se não)" value={form.petInfo} onChange={(e) => set('petInfo', e.target.value)} />
        </Card>

        {/* Emergência */}
        <Card title="Contato de Emergência" icon={<Phone size={15} />}>
          <input className="input" placeholder="Nome e número de contato para emergência *" value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />
        </Card>

        {/* Configuração do Quarto */}
        <Card title="Configuração do Quarto" icon={<BedDouble size={15} />}>
          <p className="text-xs text-gray-500 mb-3">Selecione a opção que melhor atende sua necessidade *</p>
          <div className="space-y-2">
            {ROOM_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input type="radio" name="roomConfig" value={opt} checked={form.roomConfig === opt} onChange={() => set('roomConfig', opt)} className="accent-orange-500 w-4 h-4" />
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

          {/* Feature 5: tabela de medidas */}
          <ShirtSizeTable />

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adulto</p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_SIZES_ADULT.map((s) => (
                <button key={s} type="button" onClick={() => toggleShirt(s)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.shirtSizes.includes(s) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Infantil</p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_SIZES_INFANTIL.map((s) => (
                <button key={s} type="button" onClick={() => toggleShirt(s)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.shirtSizes.includes(s) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                  {s.replace('Infantil ', '')}
                </button>
              ))}
              <button type="button" onClick={() => toggleShirt('Outro')}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.shirtSizes.includes('Outro') ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                Outro
              </button>
            </div>
          </div>
          {form.shirtSizes.length > 0 && (
            <p className="text-xs text-emerald-600 mt-2">Selecionado: {form.shirtSizes.join(', ')}</p>
          )}
        </Card>

        {/* Observações */}
        <Card title="Observações">
          <textarea className="input h-24 w-full resize-none" placeholder="Observações gerais, restrições alimentares, condições médicas, dúvidas..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Card>

        {/* Feature 4: Política de cancelamento */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <div className="flex gap-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold mb-2">Política de Cancelamento e Devolução de Valores</p>
              <p className="text-xs mb-2">Em caso de desistência da viagem, a devolução segue a antecedência do cancelamento:</p>
              <ul className="text-xs leading-relaxed space-y-0.5 mb-2">
                <li>• Até <strong>120 dias</strong> antes da viagem: <strong>100%</strong> devolvido.</li>
                <li>• Até <strong>90 dias</strong> antes da viagem: <strong>90%</strong> devolvido.</li>
                <li>• Até <strong>60 dias</strong> antes da viagem: <strong>80%</strong> devolvido.</li>
                <li>• Até <strong>30 dias</strong> antes da viagem: <strong>50%</strong> devolvido.</li>
                <li>• Até <strong>15 dias</strong> antes da viagem: <strong>30%</strong> devolvido.</li>
                <li>• <strong>Após os 15 dias</strong> que antecedem a viagem: <strong>sem devolução</strong> por desistência.</li>
              </ul>
              <p className="text-xs leading-relaxed">
                Podemos segurar o valor aportado como <strong>crédito futuro</strong>, mas será descontado <strong>30% do valor integral</strong> da expedição
                para cobrir os custos operacionais já assumidos pela organização.
              </p>
            </div>
          </div>
        </div>

        {/* Responsabilidade de dados */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0" checked={form.confirmedResponsibility} onChange={(e) => set('confirmedResponsibility', e.target.checked)} />
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
              Continuar para o Termo
              <ChevronRight size={20} />
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400">
          Após enviar, você assinará o Termo de Uso de Imagem para concluir a inscrição.
        </p>
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

// ───────────────────────── Tabela de medidas (Feature 5) ─────────────────────
function ShirtSizeTable() {
  const [open, setOpen] = useState(false);
  const renderTable = (
    title: string,
    data: { sizes: string[]; torax: number[]; comprimento: number[]; manga: number[] }
  ) => (
    <div className="mb-3">
      <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-[11px] border-collapse">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="px-2 py-1 text-left font-semibold rounded-l">Medida (cm)</th>
              {data.sizes.map((s) => (<th key={s} className="px-2 py-1 font-semibold">{s}</th>))}
            </tr>
          </thead>
          <tbody>
            {([['Tórax (A)', data.torax], ['Comprimento (B)', data.comprimento], ['Manga (C)', data.manga]] as const).map(
              ([label, vals], idx) => (
                <tr key={label} className={idx % 2 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-2 py-1 text-left font-medium text-gray-600 whitespace-nowrap">{label}</td>
                  {vals.map((v, i) => (<td key={i} className="px-2 py-1 text-gray-700">{v}</td>))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
      >
        <span className="flex items-center gap-2"><Ruler size={15} className="text-orange-500" /> Tabela de medidas (cm)</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-3">
          {renderTable('Tradicional', SHIRT_TABLE_ADULT)}
          {renderTable('Infantil', SHIRT_TABLE_INFANTIL)}
          <div className="text-[10px] text-gray-500 leading-relaxed mt-1 space-y-0.5">
            <p><strong>Tórax (A):</strong> medida em linha reta, de uma axila à outra.</p>
            <p><strong>Comprimento (B):</strong> da costura do ombro até a barra inferior.</p>
            <p><strong>Manga (C):</strong> comprimento da manga.</p>
            <p className="text-orange-600">Obs.: para camisetas mais justas (Baby look), a Tradicional PP equivale à Baby look GG.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Assinatura do termo (Feature 1) ───────────────────
function SignatureStep({
  term,
  signerName,
  expeditionName,
  signing,
  onSign,
}: {
  term: TermInfo | null;
  signerName: string;
  expeditionName?: string;
  signing: boolean;
  onSign: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    }
  }, []);

  const posOf = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try { canvasRef.current?.setPointerCapture(e.pointerId); } catch { /* alguns navegadores rejeitam */ }
    drawing.current = true;
    last.current = posOf(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = posOf(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasDrawn) setHasDrawn(true);
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  const finish = () => {
    if (!accepted) { toast.error('Marque que leu e aceita o termo'); return; }
    if (!hasDrawn) { toast.error('Desenhe sua rubrica no quadro'); return; }
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    onSign(dataUrl);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-900 text-white py-8 px-4 text-center">
        <p className="text-orange-400 text-xs tracking-[0.3em] uppercase font-semibold mb-2 flex items-center justify-center gap-2">
          <FileSignature size={14} /> 4x4 Mundo Afora
        </p>
        <h1 className="text-2xl font-bold">Termo de Uso de Imagem</h1>
        <p className="text-gray-400 text-sm mt-1">Leia, aceite e assine para concluir sua inscrição</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-12">
        {expeditionName && (
          <p className="text-sm text-gray-500 text-center">
            Inscrição: <strong className="text-gray-700">{expeditionName}</strong> · Signatário: <strong className="text-gray-700">{signerName}</strong>
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-center text-gray-800 mb-4 text-sm uppercase tracking-wide">
            Termo de Responsabilidade, Compromisso e Autorização de Uso de Imagem
          </h2>
          <div className="max-h-[55vh] overflow-y-auto pr-2 text-[13px] leading-relaxed text-gray-700 whitespace-pre-line border border-gray-100 rounded-lg p-4 bg-gray-50">
            {term ? term.text : 'Carregando termo...'}
            {term?.signLine && <p className="mt-4 font-medium text-gray-800">{term.signLine}</p>}
          </div>
        </div>

        <label className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span className="text-sm text-gray-700">
            Li, compreendi e <strong>aceito integralmente</strong> os termos acima, e autorizo o uso de imagem nos termos descritos. Assino de forma livre e voluntária. <span className="text-orange-500">*</span>
          </span>
        </label>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <PenLine size={15} className="text-orange-500" /> Sua rubrica (assinatura)
          </p>
          <p className="text-xs text-gray-400 mb-3">Desenhe sua assinatura no quadro abaixo com o dedo ou o mouse.</p>
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full h-44 border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
          />
          <div className="flex justify-between items-center mt-2">
            <button onClick={clear} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
              <Eraser size={15} /> Limpar
            </button>
            <span className="text-[11px] text-gray-400">{hasDrawn ? 'Rubrica desenhada ✔' : 'Aguardando rubrica'}</span>
          </div>
        </div>

        <button
          onClick={finish}
          disabled={signing}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          {signing ? 'Registrando assinatura...' : (<><Check size={20} /> Assinar e finalizar inscrição</>)}
        </button>
        <p className="text-center text-[11px] text-gray-400 leading-relaxed flex items-center justify-center gap-1.5">
          <ArrowLeft size={12} className="opacity-0" />
          Assinatura eletrônica registrada com data, IP e código de verificação (LGPD / MP 2.200-2).
        </p>
      </div>
    </div>
  );
}
