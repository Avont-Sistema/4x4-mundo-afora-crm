'use client';

import { useState } from 'react';
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string;
  email?: string;
}

const mockLeads: Lead[] = [
  { id: '1', name: 'João Silva', email: 'joao@email.com' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@email.com' },
];

export default function CampaignsPage() {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expeditionName, setExpeditionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === mockLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(mockLeads.map((l) => l.id));
    }
  };

  const handleSendCampaign = async () => {
    if (!subject || !message || selectedLeads.length === 0) {
      toast.error('Preencha todos os campos e selecione pelo menos um lead');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/emails/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeads,
          subject,
          message,
          expeditionName,
          expeditionLink: '',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSentCount(selectedLeads.length);
        setShowResults(true);
        toast.success(`✅ Campanha enviada! ${selectedLeads.length} emails despachados`);
        setSubject('');
        setMessage('');
        setExpeditionName('');
        setSelectedLeads([]);
      } else {
        toast.error(data.error || 'Erro ao enviar campanha');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Campanhas de Email</h1>
        <button
          onClick={() => setShowResults(false)}
          className="btn btn-secondary"
        >
          Nova Campanha
        </button>
      </div>

      {showResults ? (
        <div className="card max-w-2xl">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Campanha Enviada! ✅</h2>
            <p className="text-gray-600 mb-6">
              Sua campanha foi enviada com sucesso para <strong>{sentCount} leads</strong>
            </p>
            <button
              onClick={() => {
                setShowResults(false);
                setSelectedLeads([]);
              }}
              className="btn btn-primary"
            >
              Enviar Nova Campanha
            </button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Detalhes da Campanha</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Expedição (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Lençóis Maranhenses"
                    value={expeditionName}
                    onChange={(e) => setExpeditionName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assunto do Email *</label>
                  <input
                    type="text"
                    placeholder="Ex: Confira as novas expedições!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mensagem *</label>
                  <textarea
                    placeholder="Escreva sua mensagem aqui..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input h-32"
                    required
                  />
                </div>

                <button
                  onClick={handleSendCampaign}
                  disabled={loading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Send size={20} />
                  {loading ? 'Enviando...' : 'Enviar Campanha'}
                </button>
              </div>
            </div>
          </div>

          {/* Lead Selection */}
          <div className="card h-fit">
            <h2 className="text-xl font-bold mb-4">Selecionar Leads</h2>
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === mockLeads.length && mockLeads.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4"
                />
                <span className="font-medium text-sm">Selecionar Todos ({mockLeads.length})</span>
              </label>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {mockLeads.map((lead) => (
                <label key={lead.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.email || 'Sem email'}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>{selectedLeads.length}</strong> lead(s) selecionado(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-2">Dicas para Campanhas Efetivas</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>✓ Personalize com o nome da expedição</li>
                <li>✓ Use assuntos claros e concisos</li>
                <li>✓ Inclua call-to-action específico</li>
                <li>✓ Envie para segmentos específicos</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-2">Configuração Necessária</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>⚙️ Configure SMTP_HOST em .env.local</li>
                <li>⚙️ Adicione SMTP_USER e SMTP_PASSWORD</li>
                <li>⚙️ Use Gmail, SendGrid ou similar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
