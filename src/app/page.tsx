'use client';

import Link from 'next/link';
import { BarChart3, Users, MapPin, DollarSign, MessageCircle, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">4x4 Mundo Afora</div>
          <div className="space-x-4">
            <Link href="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Registrar
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Sistema CRM Completo para Expedições Offroad
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Gerencie leads, clientes, expedições, financeiro e integrações com IA em um único lugar
        </p>
        <Link href="/dashboard" className="btn btn-primary text-lg px-8 py-4">
          Acessar Dashboard
        </Link>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades Principais</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CRM */}
          <div className="card">
            <div className="flex items-center mb-4">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">CRM Completo</h3>
            </div>
            <p className="text-gray-600">Gerencie leads, clientes e histórico de interações em um só lugar</p>
          </div>

          {/* Expedições */}
          <div className="card">
            <div className="flex items-center mb-4">
              <MapPin className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">Expedições</h3>
            </div>
            <p className="text-gray-600">Crie e gerencie expedições com disponibilidade e reservas automáticas</p>
          </div>

          {/* Financeiro */}
          <div className="card">
            <div className="flex items-center mb-4">
              <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">Financeiro</h3>
            </div>
            <p className="text-gray-600">Controle receitas, despesas, fornecedores e estatísticas detalhadas</p>
          </div>

          {/* IA WhatsApp */}
          <div className="card">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">IA WhatsApp</h3>
            </div>
            <p className="text-gray-600">Agente IA que vende, cadastra e consulta expedições via WhatsApp</p>
          </div>

          {/* Pagamentos */}
          <div className="card">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">Pagamentos</h3>
            </div>
            <p className="text-gray-600">Gere links de pagamento e controle o status de todas as transações</p>
          </div>

          {/* Relatórios */}
          <div className="card">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold">Relatórios</h3>
            </div>
            <p className="text-gray-600">Dashboard com gráficos, métricas e análises em tempo real</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-lg mb-8">Acesse o dashboard e comece a gerenciar suas expedições</p>
          <Link href="/dashboard" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
            Abrir Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 4x4 Mundo Afora. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
