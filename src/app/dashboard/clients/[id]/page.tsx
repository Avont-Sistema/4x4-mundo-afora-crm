'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageCircle,
  Edit2,
  Trash2,
  ChevronDown,
  MapPin,
  Briefcase,
  Car,
  Users,
  Mountain,
  Wallet,
  Activity as ActivityIcon,
  User,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL, formatDate } from '@/lib/format';
import ClientForm from '../ClientForm';

function age(birthDate?: string): string {
  if (!birthDate) return '';
  const d = new Date(birthDate.length <= 10 ? birthDate + 'T12:00:00' : birthDate);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return `${a} anos`;
}

const relationLabel: Record<string, string> = {
  conjuge: 'Cônjuge',
  filho: 'Filho',
  filha: 'Filha',
  outro: 'Outro',
};

const expStatusColor: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-emerald-100 text-emerald-700',
  finalizada: 'bg-purple-100 text-purple-700',
  planejamento: 'bg-gray-100 text-gray-600',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setDetail(data.detail);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!detail) return <div className="text-center py-20 text-gray-400">Cliente não encontrado.</div>;

  const c = detail.client;
  const waNumber = (c.whatsapp || c.phone || '').replace(/\D/g, '');
  const waLink = waNumber ? `https://wa.me/${waNumber}` : null;

  const remove = async () => {
    if (!confirm('Excluir este cliente?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    toast.success('Cliente excluído');
    router.push('/dashboard/clients');
  };

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/clients" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={16} /> Voltar para Clientes
      </Link>

      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <p className="text-sm text-gray-500">
                {c.phone || 'sem telefone'}
                {age(c.birthDate) ? ` · ${age(c.birthDate)}` : ''}
                {detail.lead ? ` · veio de ${detail.lead.source}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn flex items-center gap-2 bg-green-500 text-white hover:bg-green-600">
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
            <button onClick={() => setEditing(true)} className="btn btn-secondary flex items-center gap-2">
              <Edit2 size={16} /> Editar
            </button>
            <button onClick={remove} className="btn btn-danger flex items-center gap-2">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* expedição ativa */}
        {detail.ativa && (
          <Link
            href={`/dashboard/expeditions/${detail.ativa.expeditionId}`}
            className="mt-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Ativo em expedição</p>
                <p className="font-semibold">{detail.ativa.expeditionName}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-emerald-700 font-semibold">{detail.ativa.progress.toFixed(0)}% pago</p>
              <p className="text-xs text-gray-500">Saldo {formatBRL(detail.ativa.balance)}</p>
            </div>
          </Link>
        )}

        {/* resumo */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Mini label="Expedições" value={String(detail.resumo.totalExpedicoes)} />
          <Mini label="Total pago" value={formatBRL(detail.resumo.totalPago)} color="text-emerald-600" />
          <Mini label="Saldo a pagar" value={formatBRL(detail.resumo.saldo)} color="text-blue-600" />
        </div>
      </div>

      {/* Dados básicos sempre visíveis: titular + família */}
      <div className="card mb-3">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <User size={16} /> Titular
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Idade" value={age(c.birthDate) || '—'} />
          <Field label="Peso" value={c.weight ? `${c.weight} kg` : '—'} />
          <Field label="Altura" value={c.height ? `${c.height} cm` : '—'} />
          <Field label="CPF" value={c.cpf || '—'} />
          <Field label="Email" value={c.email || '—'} />
          {c.shirtSizes?.length > 0 && <Field label="Camisetas" value={c.shirtSizes.join(', ')} />}
          {c.origin === 'formulario' && <Field label="Origem" value="Formulário online" />}
        </div>

        {c.family?.length > 0 && (
          <>
            <h3 className="font-bold mt-5 mb-3 flex items-center gap-2">
              <Users size={16} /> Família ({c.family.length})
            </h3>
            <div className="space-y-2">
              {c.family.map((m: any) => (
                <div key={m.id} className="bg-gray-50 rounded-lg p-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-400 text-xs px-2 py-0.5 bg-white rounded-full border border-gray-200">
                    {relationLabel[m.relation] || m.relation}
                    {m.isChild ? ' · criança' : ''}
                  </span>
                  <span className="text-gray-500">{age(m.birthDate) || '—'}</span>
                  <span className="text-gray-500">{m.weight ? `${m.weight} kg` : '—'}</span>
                  <span className="text-gray-500">{m.height ? `${m.height} cm` : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Seções em accordion */}
      <Section icon={<MapPin size={16} />} title="Endereço">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Field label="Rua" value={[c.address, c.addressNumber].filter(Boolean).join(', ') || '—'} />
          <Field label="Bairro" value={c.neighborhood || '—'} />
          <Field label="CEP" value={c.cep || '—'} />
          <Field label="Cidade" value={c.city || '—'} />
          <Field label="Estado" value={c.state || '—'} />
        </div>
      </Section>

      {(c.emergencyContact?.name || c.petInfo || c.roomConfig) && (
        <Section icon={<Phone size={16} />} title="Extras">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {c.emergencyContact?.name && (
              <Field label="Emergência" value={`${c.emergencyContact.name}${c.emergencyContact.phone ? ` · ${c.emergencyContact.phone}` : ''}`} />
            )}
            {c.petInfo && <Field label="Pet" value={c.petInfo} />}
            {c.roomConfig && <Field label="Quarto" value={c.roomConfig} />}
          </div>
        </Section>
      )}

      <Section icon={<Briefcase size={16} />} title="Profissão">
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <Field label="Emprego" value={c.job || '—'} />
          <Field label="Empresa" value={c.company || '—'} />
        </div>
      </Section>

      <Section icon={<Car size={16} />} title="Veículo">
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <Field label="Modelo" value={c.vehicle?.model || '—'} />
          <Field label="Placa" value={c.vehicle?.plate || '—'} />
          <Field label="Ano" value={c.vehicle?.year || '—'} />
          <Field label="Cor" value={c.vehicle?.color || '—'} />
        </div>
      </Section>

      <Section icon={<Mountain size={16} />} title={`Histórico de Expedições (${detail.expeditions.length})`}>
        {detail.expeditions.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma expedição.</p>
        ) : (
          <div className="space-y-2">
            {detail.expeditions.map((e: any) => (
              <Link
                key={e.enrollmentId}
                href={`/dashboard/expeditions/${e.expeditionId}`}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 text-sm"
              >
                <div>
                  <p className="font-medium">{e.expeditionName}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(e.startDate)} · {e.adults} adulto(s){e.children > 0 ? ` · ${e.children} criança(s)` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${expStatusColor[e.expeditionStatus] || ''}`}>
                    {e.expeditionStatus}
                  </span>
                  <p className="text-xs mt-1 text-gray-500">
                    {formatBRL(e.paid)} / {formatBRL(e.agreedPrice)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<Wallet size={16} />} title={`Histórico de Pagamentos (${detail.payments.length})`}>
        {detail.payments.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum pagamento.</p>
        ) : (
          <div className="space-y-1">
            {detail.payments.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 py-2">
                <div>
                  <span className="text-emerald-600 font-medium">{formatBRL(p.amount)}</span>
                  <span className="text-gray-400 text-xs ml-2">{p.method}</span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {formatDate(p.date)} · {p.expeditionName}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<ActivityIcon size={16} />} title="Atividades Recentes">
        {detail.activities.length === 0 ? (
          <p className="text-sm text-gray-400">Sem atividades.</p>
        ) : (
          <div className="space-y-3">
            {detail.activities.map((a: any, i: number) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p>{a.text}</p>
                  <p className="text-xs text-gray-400">{formatDate(a.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {c.notes && (
        <Section icon={<Edit2 size={16} />} title="Observações">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.notes}</p>
        </Section>
      )}

      {editing && (
        <ClientForm
          initial={c}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Mini({ label, value, color }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`font-bold ${color || ''}`}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card mb-3 p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold flex items-center gap-2">
          {icon} {title}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
