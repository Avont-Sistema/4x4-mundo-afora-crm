'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, X, LogOut, BarChart3, Users, MapPin, DollarSign,
  MessageCircle, Settings, Mail, Plug, Calendar,
  type LucideIcon,
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/expeditions', label: 'Expedições', icon: MapPin },
  { href: '/dashboard/suppliers', label: 'Fornecedores', icon: Settings },
  { href: '/dashboard/financial', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/campaigns', label: 'Campanhas', icon: Mail, soon: true },
  { href: '/dashboard/whatsapp', label: 'WhatsApp IA', icon: MessageCircle, soon: true },
  { href: '/dashboard/settings', label: 'Configurações', icon: Plug },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          {sidebarOpen && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/logo.png" alt="4x4 Mundo Afora" className="h-9 w-auto" />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            if (item.soon) {
              return (
                <div
                  key={item.href}
                  className="px-4 py-3 flex items-center gap-3 text-gray-600 cursor-default select-none"
                  title={`${item.label} (em breve)`}
                >
                  <item.icon size={20} />
                  {sidebarOpen && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{item.label}</span>
                      <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        em breve
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            const exact = item.href === '/dashboard';
            const isActive = exact ? pathname === '/dashboard' : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                  isActive ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800 rounded transition-colors text-left text-gray-300"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
