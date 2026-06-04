'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut, BarChart3, Users, MapPin, DollarSign, MessageCircle, Settings, Mail, Plug } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/dashboard/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/clients', label: 'Clientes', icon: Users },
    { href: '/dashboard/expeditions', label: 'Expedições', icon: MapPin },
    { href: '/dashboard/bookings', label: 'Reservas', icon: MapPin },
    { href: '/dashboard/suppliers', label: 'Fornecedores', icon: Settings },
    { href: '/dashboard/financial', label: 'Financeiro', icon: DollarSign },
    { href: '/dashboard/campaigns', label: 'Campanhas', icon: Mail },
    { href: '/dashboard/whatsapp', label: 'WhatsApp IA', icon: MessageCircle },
    { href: '/dashboard/settings', label: 'Configurações', icon: Plug },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          {sidebarOpen && <h1 className="text-lg font-bold">4x4 Mundo Afora</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors"
              title={item.label}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-700 p-4">
          <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800 rounded transition-colors text-left">
            <LogOut size={20} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
