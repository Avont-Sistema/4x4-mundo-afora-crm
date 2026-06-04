'use client';

import { MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
}

const mockMessages: Message[] = [
  { id: '1', sender: 'user', message: 'Olá, qual a próxima expedição disponível?', timestamp: '10:30' },
  { id: '2', sender: 'bot', message: 'Olá! Temos duas expedições disponíveis:\n1. Lençóis Maranhenses (15-20 de julho) - R$ 2.500\n2. Vale da Lua (1-5 de agosto) - R$ 1.800\n\nQual interesse em conhecer mais?', timestamp: '10:31' },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        message: inputValue,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputValue('');

      // Simular resposta do bot após 1 segundo
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: 'Entendi sua pergunta. Como posso ajudar melhor?',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 1000);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">WhatsApp IA</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2 card flex flex-col h-[600px]">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold">Chat com IA</h2>
            <span className="ml-auto text-sm text-green-600 font-medium">● Online</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
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
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="input flex-1"
            />
            <button
              onClick={handleSendMessage}
              className="btn btn-primary"
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
