'use client';

import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialRecord {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  date: string;
}

const mockRecords: FinancialRecord[] = [
  { id: '1', type: 'receita', category: 'vendas', description: 'Expedição Lençóis', amount: 5000, date: '2024-06-01' },
  { id: '2', type: 'despesa', category: 'fornecedores', description: 'Hotel Lençol Branco', amount: 1500, date: '2024-06-02' },
  { id: '3', type: 'receita', category: 'vendas', description: 'Vale da Lua', amount: 3600, date: '2024-06-05' },
];

const chartData = [
  { month: 'Jan', receita: 10000, despesa: 5000 },
  { month: 'Fev', receita: 12000, despesa: 6000 },
  { month: 'Mar', receita: 15000, despesa: 7000 },
  { month: 'Abr', receita: 13000, despesa: 6500 },
  { month: 'Mai', receita: 18000, despesa: 8000 },
  { month: 'Jun', receita: 21000, despesa: 9000 },
];

export default function FinancialPage() {
  const [records, setRecords] = useState<FinancialRecord[]>(mockRecords);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'receita' as const,
    category: 'vendas',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const totalReceita = records.filter((r) => r.type === 'receita').reduce((sum, r) => sum + r.amount, 0);
  const totalDespesa = records.filter((r) => r.type === 'despesa').reduce((sum, r) => sum + r.amount, 0);
  const lucro = totalReceita - totalDespesa;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

  const handleAddRecord = () => {
    setRecords([...records, { ...formData, id: Date.now().toString() }]);
    setFormData({
      type: 'receita',
      category: 'vendas',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Financeiro</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Registro
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-gray-600 text-sm mb-2">Total Receita</p>
          <p className="text-3xl font-bold text-green-600 flex items-center gap-2">
            <TrendingUp size={24} />
            R$ {totalReceita.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm mb-2">Total Despesa</p>
          <p className="text-3xl font-bold text-red-600 flex items-center gap-2">
            <TrendingDown size={24} />
            R$ {totalDespesa.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm mb-2">Lucro Líquido</p>
          <p className={`text-3xl font-bold flex items-center gap-2 ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {lucro.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm mb-2">Margem de Lucro</p>
          <p className={`text-3xl font-bold ${margemLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {margemLucro.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Receita vs Despesa (Mensal)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="receita" fill="#10b981" />
              <Bar dataKey="despesa" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Lucratividade Mensal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData.map((d) => ({
                ...d,
                lucro: d.receita - d.despesa,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="lucro" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Novo Registro Financeiro</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="input"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
            >
              <option value="vendas">Vendas</option>
              <option value="fornecedores">Fornecedores</option>
              <option value="operacional">Operacional</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="text"
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input md:col-span-2"
            />
            <input
              type="number"
              placeholder="Valor (R$)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="input"
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddRecord} className="btn btn-primary">
              Adicionar Registro
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="card overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Registros Recentes</h2>
        <table className="w-full text-left">
          <thead className="border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 font-semibold">Descrição</th>
              <th className="px-6 py-3 font-semibold">Categoria</th>
              <th className="px-6 py-3 font-semibold">Data</th>
              <th className="px-6 py-3 font-semibold text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4">{record.description}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.category}</td>
                <td className="px-6 py-4 text-sm">{new Date(record.date).toLocaleDateString('pt-BR')}</td>
                <td className={`px-6 py-4 text-right font-bold ${record.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                  {record.type === 'receita' ? '+' : '-'} R$ {record.amount.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
