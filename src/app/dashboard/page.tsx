'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, MapPin, DollarSign } from 'lucide-react';

const statsData = [
  { month: 'Jan', leads: 40, clientes: 24, revenue: 2400 },
  { month: 'Fev', leads: 30, clientes: 13, revenue: 2210 },
  { month: 'Mar', leads: 20, clientes: 98, revenue: 2290 },
  { month: 'Abr', leads: 27, clientes: 39, revenue: 2000 },
  { month: 'Mai', leads: 35, clientes: 48, revenue: 2181 },
  { month: 'Jun', leads: 45, clientes: 52, revenue: 2500 },
];

const revenueData = [
  { name: 'Expedições', value: 60 },
  { name: 'Serviços', value: 25 },
  { name: 'Outros', value: 15 },
];

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981'];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total de Leads</p>
            <p className="text-3xl font-bold">284</p>
          </div>
          <Users className="w-12 h-12 text-blue-600 opacity-20" />
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Clientes Ativos</p>
            <p className="text-3xl font-bold">127</p>
          </div>
          <Users className="w-12 h-12 text-green-600 opacity-20" />
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Expedições</p>
            <p className="text-3xl font-bold">12</p>
          </div>
          <MapPin className="w-12 h-12 text-orange-600 opacity-20" />
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Receita (Este mês)</p>
            <p className="text-3xl font-bold">R$ 28.4k</p>
          </div>
          <DollarSign className="w-12 h-12 text-red-600 opacity-20" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Leads e Clientes */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Leads vs Clientes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#0ea5e9" />
              <Bar dataKey="clientes" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Receita Mensal */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Receita Mensal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Distribuição de Receita</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={revenueData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {revenueData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
