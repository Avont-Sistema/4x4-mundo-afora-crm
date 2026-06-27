'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  CreditCard,
  MessageCircle,
  Megaphone,
  Mail,
  Save,
  Copy,
  CheckCircle,
  XCircle,
  Loader,
  ExternalLink,
  FileSignature,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_IMAGE_RIGHTS_TERM, DEFAULT_SIGN_CITY } from '@/lib/imageRightsTerm';

type FieldMeta = { value: string; set: boolean; secret: boolean; fromEnv: boolean };
type View = Record<string, FieldMeta>;

export default function SettingsPage() {
  const [view, setView] = useState<View>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState('');
  const [tests, setTests] = useState<Record<string, { ok: boolean; message: string } | 'loading'>>({});

  // Termo de uso de imagem (template editável)
  const [termTemplate, setTermTemplate] = useState('');
  const [signCity, setSignCity] = useState('');
  const [termSaving, setTermSaving] = useState(false);

  useEffect(() => {
    fetch('/api/contract-template')
      .then((r) => r.json())
      .then((d) => {
        setTermTemplate(d.template || '');
        setSignCity(d.signCity || '');
      })
      .catch(() => {});
  }, []);

  const saveTerm = async () => {
    setTermSaving(true);
    try {
      const res = await fetch('/api/contract-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: termTemplate, signCity }),
      });
      if (!res.ok) throw new Error();
      toast.success('Termo salvo');
    } catch {
      toast.error('Erro ao salvar termo');
    } finally {
      setTermSaving(false);
    }
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/integrations');
    const data = await res.json();
    setView(data.integrations);
    // inicializa form: não-segredos com valor atual; segredos vazios (placeholder mascarado)
    const init: Record<string, string> = {};
    Object.entries(data.integrations as View).forEach(([k, m]) => {
      init[k] = m.secret ? '' : m.value;
    });
    setForm(init);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    // envia tudo; segredos vazios são ignorados pelo backend (mantém o atual)
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setView(data.integrations);
    setSaving(false);
    toast.success('Integrações salvas');
  };

  const test = async (target: string) => {
    setTests((t) => ({ ...t, [target]: 'loading' }));
    const res = await fetch('/api/integrations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    });
    const data = await res.json();
    setTests((t) => ({ ...t, [target]: { ok: data.ok, message: data.message } }));
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success('Copiado!');
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  }

  // helper de campo
  const Field = ({
    k,
    label,
    placeholder,
    type = 'text',
  }: {
    k: string;
    label: string;
    placeholder?: string;
    type?: string;
  }) => {
    const m = view[k];
    return (
      <div>
        <label className="text-xs text-gray-500 flex items-center gap-2">
          {label}
          {m?.fromEnv && (
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              do .env
            </span>
          )}
          {m?.secret && m?.set && (
            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              configurado
            </span>
          )}
        </label>
        <input
          type={type}
          className="input mt-1"
          placeholder={m?.secret && m?.set ? `${m.value} (deixe vazio p/ manter)` : placeholder}
          value={form[k] ?? ''}
          onChange={(e) => setField(k, e.target.value)}
        />
      </div>
    );
  };

  const TestBtn = ({ target }: { target: string }) => {
    const r = tests[target];
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => test(target)} className="btn btn-secondary text-sm">
          Testar conexão
        </button>
        {r === 'loading' && <Loader size={16} className="animate-spin text-gray-400" />}
        {r && r !== 'loading' && (
          <span className={`text-sm flex items-center gap-1 ${r.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {r.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {r.message}
          </span>
        )}
      </div>
    );
  };

  const connectorUrl = form.whatsappConnectorUrl || '';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-4xl font-bold">Configurações</h1>
        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar tudo'}
        </button>
      </div>
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <span className="pb-3 text-sm font-medium text-amber-600 border-b-2 border-yellow-400 flex items-center gap-2">
          <Plug size={16} /> Integrações
        </span>
      </div>

      <div className="space-y-6">
        {/* Pagamentos */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold">Pagamentos</h2>
          </div>

          <h3 className="text-sm font-semibold text-gray-600 mb-2">PIX grátis (sua chave)</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <Field k="pixKey" label="Chave PIX" placeholder="CNPJ, email, telefone..." />
            <Field k="pixMerchantName" label="Nome do recebedor" />
            <Field k="pixMerchantCity" label="Cidade" />
          </div>

          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Asaas (PIX taxa fixa, cartão, parcelado)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="asaasApiKey" label="Asaas API Key" placeholder="$aas_..." type="password" />
            <div>
              <label className="text-xs text-gray-500">Ambiente</label>
              <select
                className="input mt-1"
                value={form.asaasEnv || 'sandbox'}
                onChange={(e) => setField('asaasEnv', e.target.value)}
              >
                <option value="sandbox">Sandbox (testes)</option>
                <option value="production">Produção</option>
              </select>
            </div>
            <Field k="asaasWebhookToken" label="Token do webhook (opcional)" type="password" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TestBtn target="asaas" />
            <span className="text-xs text-gray-400">
              Webhook p/ colar no Asaas:
            </span>
            <code className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">
              {origin}/api/payments/asaas/webhook
            </code>
            <button onClick={() => copy(`${origin}/api/payments/asaas/webhook`)} className="p-1 hover:bg-gray-100 rounded">
              <Copy size={14} />
            </button>
          </div>
        </section>

        {/* WhatsApp */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="text-green-600" size={20} />
            <h2 className="text-lg font-bold">WhatsApp</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            O número conecta pelo serviço <strong>conector</strong> (pasta
            whatsapp-connector). Informe a URL pública dele e um token
            compartilhado (o mesmo precisa estar no <code>.env</code> do conector).
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="whatsappConnectorUrl" label="URL do conector" placeholder="https://conector.up.railway.app" />
            <Field k="whatsappConnectorToken" label="Token do conector" type="password" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TestBtn target="whatsapp" />
            {connectorUrl && (
              <a
                href={`${connectorUrl}/qr`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-sm flex items-center gap-1"
              >
                <ExternalLink size={14} /> Abrir QR code
              </a>
            )}
          </div>
        </section>

        {/* Ads */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="text-rose-600" size={20} />
            <h2 className="text-lg font-bold">Captação de Leads (Google / Meta Ads)</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field k="leadsWebhookToken" label="Token de verificação do webhook" type="password" />
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Google Ads', url: `${origin}/api/leads/webhook?source=google_ads` },
              { label: 'Meta Ads', url: `${origin}/api/leads/webhook?source=meta_ads` },
            ].map((w) => (
              <div key={w.label} className="flex items-center gap-2">
                <span className="w-24 text-gray-500">{w.label}:</span>
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs overflow-x-auto whitespace-nowrap">
                  {w.url}
                </code>
                <button onClick={() => copy(w.url)} className="p-1 hover:bg-gray-100 rounded">
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* E-mail */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="text-amber-600" size={20} />
            <h2 className="text-lg font-bold">E-mail (SMTP)</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="smtpHost" label="Servidor SMTP" placeholder="smtp.gmail.com" />
            <Field k="smtpPort" label="Porta" placeholder="587" />
            <Field k="smtpUser" label="Usuário" placeholder="seu@email.com" />
            <Field k="smtpPassword" label="Senha" type="password" />
          </div>
        </section>

        {/* Termo de uso de imagem */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSignature className="text-gray-700" size={20} />
              <h2 className="text-lg font-bold">Termo de Uso de Imagem</h2>
            </div>
            <button
              onClick={() => { setTermTemplate(DEFAULT_IMAGE_RIGHTS_TERM); setSignCity(DEFAULT_SIGN_CITY); }}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
              <RotateCcw size={13} /> Restaurar padrão
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Texto que o cliente assina ao final do cadastro. Use os marcadores{' '}
            <code className="bg-gray-100 px-1 rounded">{'{EVENT_NAME}'}</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">{'{EVENT_DATES}'}</code> e{' '}
            <code className="bg-gray-100 px-1 rounded">{'{EVENT_LOCATION_SUFFIX}'}</code> — eles são
            preenchidos automaticamente com os dados de cada expedição.
          </p>
          <div className="mb-4 max-w-xs">
            <label className="text-xs text-gray-500">Cidade de assinatura</label>
            <input
              className="input mt-1"
              placeholder="Ex: Capão Alto/SC"
              value={signCity}
              onChange={(e) => setSignCity(e.target.value)}
            />
          </div>
          <textarea
            className="input w-full h-72 font-mono text-xs leading-relaxed resize-y"
            value={termTemplate}
            onChange={(e) => setTermTemplate(e.target.value)}
          />
          <div className="mt-3">
            <button onClick={saveTerm} disabled={termSaving} className="btn btn-primary flex items-center gap-2">
              <Save size={16} /> {termSaving ? 'Salvando...' : 'Salvar termo'}
            </button>
          </div>
        </section>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-gray-600">
          🔒 As chaves ficam salvas no servidor (arquivo local, fora do git). Em
          produção no Vercel, você também pode definir as mesmas como variáveis de
          ambiente — o sistema usa a UI primeiro e o <code>.env</code> como fallback.
        </div>

        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar tudo'}
        </button>
      </div>
    </div>
  );
}
