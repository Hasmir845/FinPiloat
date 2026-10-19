import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Landmark,
  Bot,
  ExternalLink,
  ShieldCheck,
  Building2,
  X,
  Compass,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { StatusBadge } from './StatusBadge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  backendConnected?: boolean;
}

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: 'Live Demo',
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    badge: 'Live Engine',
  },
  {
    name: 'Cash Flow',
    href: '/cash-flow',
    icon: TrendingUp,
    badge: 'Forecast',
  },
  {
    name: 'Financing',
    href: '/financing',
    icon: Landmark,
    badge: 'Upcoming',
  },
  {
    name: 'AI Copilot',
    href: '/copilot',
    icon: Bot,
    badge: 'Preview',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  backendConnected = false,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-30 shadow-subtle',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                FinPilot <span className="text-blue-600 text-xs px-1 py-0.5 rounded bg-blue-50 font-semibold border border-blue-100">AI</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                SME Finance Copilot
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice Pill */}
        <div className="px-4 pt-4 pb-2">
          <div className="px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-medium text-indigo-900">Competition Sandbox</span>
            </div>
            <StatusBadge variant="demo" size="sm">Demo</StatusBadge>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-blue-50/80 text-blue-700 font-semibold border border-blue-100/80 shadow-subtle'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-medium',
                          item.badge === 'Live Demo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Public Website
          </div>
          <NavLink
            to="/"
            onClick={() => onClose()}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Product Overview</span>
            </div>
          </NavLink>
        </div>

        {/* Demo Business Profile Card */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 className="w-4 h-4 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  Apex Supply Chain Co.
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span>Illustrative SME Demo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Express API
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border',
                backendConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  backendConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                )}
              />
              {backendConnected ? 'Connected' : 'Offline / Checking'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
