'use client';

import { MessageCircle, Send, Loader } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  { id: '1', sender: 'bot', message: 'Olá! 👋 Bem-vindo à 4x4 Mundo Afora! Como posso ajudá-lo hoje?', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [contactPhone, setContactPhone] = useState('+5511988887777');
  const [contactName, setContactName] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputValue,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/whatsapp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          phone: contactPhone,
          contactName: contactName || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: data.message,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMessage]);
        if (data.leadCreated) {
          toast.success('🎯 Novo lead cadastrado automaticamente pela IA!');
        }
        if (data.aiEnabled === false) {
          // aviso discreto só na primeira vez
        }
      } else {
        toast.error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">WhatsApp IA</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2 card flex flex-col h-[600px]">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold">Chat com IA</h2>
            <span className="ml-auto text-sm text-green-600 font-medium">● Online</span>
          </div>

          {/* Simulação de contato (testa o auto-cadastro de lead) */}
          <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Telefone do contato (ex: +5511988887777)"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="input flex-1 min-w-[180px] !py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="Nome (opcional)"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="input flex-1 min-w-[140px] !py-1.5 text-sm"
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-600'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Digitando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
              disabled={loading}
              className="input flex-1 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="btn btn-primary disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold mb-4">Configuração da IA</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium text-green-600">Ativo</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Modelo</p>
                <p className="font-medium">Claude 3.5 Sonnet</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Prompt</p>
                <p className="font-medium">Vendas + Suporte</p>
              </div>
            </div>
          </div>

          <div className="card bg-blue-50 border-blue-200">
            <h3 className="font-bold mb-2">💡 Funcionalidades</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✅ Responder perguntas sobre expedições</li>
              <li>✅ Processar reservas</li>
              <li>✅ Gerar links de pagamento</li>
              <li>✅ Enviar documentos e mídia</li>
              <li>⏳ Integração bancária (em breve)</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="font-bold mb-4">Estatísticas</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Mensagens</p>
                <p className="font-bold">1.247</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Taxa Conversão</p>
                <p className="font-bold text-green-600">23%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Tempo Médio</p>
                <p className="font-bold">2m 30s</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
