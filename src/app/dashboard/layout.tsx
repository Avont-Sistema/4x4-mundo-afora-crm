'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, X, LogOut, BarChart3, Users, MapPin, DollarSign,
  MessageCircle, Settings, Mail, Plug, Calendar, Zap,
  type LucideIcon,
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  adminOnly?: boolean; // hidden from operator role
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users, adminOnly: true },
  { href: '/dashboard/expeditions', label: 'Expedições', icon: MapPin, adminOnly: true },
  { href: '/dashboard/suppliers', label: 'Fornecedores', icon: Settings, adminOnly: true },
  { href: '/dashboard/financial', label: 'Financeiro', icon: DollarSign, adminOnly: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar, adminOnly: true },
  { href: '/dashboard/campaigns', label: 'Campanhas', icon: Mail, soon: true, adminOnly: true },
  { href: '/dashboard/whatsapp', label: 'WhatsApp IA', icon: MessageCircle },
  { href: '/dashboard/flows', label: 'Fluxos Bot', icon: Zap, adminOnly: true },
  { href: '/dashboard/settings', label: 'Configurações', icon: Plug, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'operator'>('admin');
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.role === 'operator') setRole('operator');
    }).catch(() => {});
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close drawer on outside tap
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  const visibleItems = role === 'operator'
    ? menuItems.filter(i => !i.adminOnly)
    : menuItems;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  const NavItem = ({ item }: { item: MenuItem }) => {
    if (item.soon) {
      return (
        <div
          className="px-4 py-3 flex items-center gap-3 text-gray-600 cursor-default select-none"
          title={`${item.label} (em breve)`}
        >
          <item.icon size={20} className="shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0 md:hidden lg:flex">
            <span className="text-sm truncate">{item.label}</span>
            <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              em breve
            </span>
          </div>
          {/* Desktop collapsed label */}
          <div className="hidden md:flex lg:hidden items-center gap-2 flex-1 min-w-0">
            {desktopExpanded && (
              <>
                <span className="text-sm truncate">{item.label}</span>
                <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  em breve
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    const exact = item.href === '/dashboard';
    const isActive = exact ? pathname === '/dashboard' : pathname?.startsWith(item.href);

    return (
      <Link
        href={item.href}
        title={item.label}
        className={`px-4 py-3 flex items-center gap-3 transition-colors ${
          isActive ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:bg-gray-800'
        }`}
      >
        <item.icon size={20} className="shrink-0" />
        {/* Always show label on mobile drawer */}
        <span className="md:hidden">{item.label}</span>
        {/* Desktop: show when expanded */}
        <span className={`hidden md:block ${desktopExpanded ? '' : 'sr-only'}`}>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar (desktop: always visible, mobile: drawer) ── */}
      <aside
        ref={drawerRef}
        className={`
          fixed inset-y-0 left-0 z-40 bg-gray-900 text-white flex flex-col transition-transform duration-300
          md:relative md:translate-x-0 md:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopExpanded ? 'md:w-64' : 'md:w-20'}
          w-64
        `}
      >
        {/* Logo / toggle */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex flex-col min-w-0">
            <img src="/logo.png" alt="4x4 Mundo Afora" className={`h-9 w-auto transition-opacity ${desktopExpanded ? 'opacity-100' : 'md:opacity-0 md:w-0'}`} />
            {role === 'operator' && desktopExpanded && (
              <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-widest mt-1">Operador</span>
            )}
          </div>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 hover:bg-gray-800 rounded md:hidden"
          >
            <X size={20} />
          </button>
          {/* Desktop toggle */}
          <button
            onClick={() => setDesktopExpanded(!desktopExpanded)}
            className="p-1 hover:bg-gray-800 rounded hidden md:block"
          >
            {desktopExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {visibleItems.map((item) => <NavItem key={item.href} item={item} />)}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-700 p-4 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800 rounded transition-colors text-left text-gray-300"
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`${desktopExpanded ? '' : 'md:hidden'}`}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <Menu size={22} />
          </button>
          <img src="/logo.png" alt="4x4 Mundo Afora" className="h-8 w-auto" />
          {role === 'operator' && (
            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Operador
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
