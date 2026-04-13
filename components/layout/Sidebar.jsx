'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Users, BarChart3, Settings, TrendingUp,
  LogOut, ChevronRight, X,
  Share2, Database, Clock, Shield, Cog, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { useSidebar } from './SidebarContext';
import { usePermission } from '@/hooks/use-permission';

const navItems = [
  // ─ Main
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales_member'], permission: 'dashboard.view' },

  // ─ Leads
  { section: 'Leads', roles: ['admin', 'sales_member'] },
  { href: '/leads', label: 'Legacy Leads', icon: Users, roles: ['admin', 'sales_member'] },
  { href: '/leads/social', label: 'Social Leads', icon: Share2, roles: ['admin', 'sales_member'] },
  { href: '/leads/data-entry', label: 'Data Entry Leads', icon: Database, roles: ['admin', 'sales_member'] },
  { href: '/leads/follow-ups', label: 'Follow-ups', icon: Clock, roles: ['admin', 'sales_member'] },

  // ─ Analytics
  { section: 'Analytics', roles: ['admin'] },
  { href: '/ad-performance', label: 'Ad Performance', icon: TrendingUp, roles: ['admin'] },
  { href: '/admin/reports', label: 'Reports', icon: FileText, roles: ['admin'] },

  // ─ Admin
  { section: 'Admin', roles: ['admin'] },
  { href: '/team', label: 'Team', icon: BarChart3, roles: ['admin'] },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: Shield, roles: ['admin'] },
  { href: '/admin/config', label: 'Configuration', icon: Cog, roles: ['admin'] },
  { href: '/admin/audit', label: 'Audit Log', icon: FileText, roles: ['admin'] },

  // ─ Settings
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'sales_member'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { isOpen, close } = useSidebar();
  const permissions = session?.user?.permissions || [];
  const isAdmin = role === 'admin';

  const hasPermission = (permKey) => {
    if (isAdmin) return true;
    return permissions.includes('*') || permissions.includes(permKey);
  };

  const visibleItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    // Hide section headers if all items in section are hidden
    return true;
  });

  return (
    <> 
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-black text-white flex flex-col transition-transform duration-300 ease-in-out',
          'md:static md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + mobile close */}
        <div className="p-6 flex items-center gap-3 flex-shrink-0">
          <div className="p-2 rounded-lg">
            <Image
              src="/logo.jpeg"
              alt="Walshkon logo"
              width={52}
              height={52}
              className="rounded-lg"
            />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-none">Webix CRM</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Solutions Dashboard</p>
          </div>
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator className="bg-zinc-800 flex-shrink-0" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item, i) => {
            // Section header
            if (item.section) {
              return (
                <p key={`section-${i}`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pt-4 pb-1 px-3">
                  {item.section}
                </p>
              );
            }

            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-zinc-800 flex-shrink-0" />

        {/* User info + logout */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
              <p className="text-xs text-zinc-400 truncate capitalize">{role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-900"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
