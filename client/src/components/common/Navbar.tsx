import React from 'react';
import { Menu, RefreshCw, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import { HealthCheckResponse } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  health: HealthCheckResponse | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  health,
  healthLoading,
  onRefreshHealth,
}) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      {/* Left controls: mobile menu button & context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline-block">
            FinPilot AI
          </span>
          <span className="text-slate-300 hidden sm:inline-block">/</span>
          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
            SME Demo Workspace
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend connectivity status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium">API:</span>
          {healthLoading ? (
            <span className="text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
              checking
            </span>
          ) : health?.status === 'ok' ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Active (DB Connected)
            </span>
          ) : health?.status === 'degraded' ? (
            <span className="text-amber-600 font-semibold flex items-center gap-1" title={health.database?.message || 'Database disconnected'}>
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Degraded (DB Offline)
            </span>
          ) : (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Offline
            </span>
          )}
          <button
            onClick={onRefreshHealth}
            title="Refresh backend status"
            disabled={healthLoading}
            className="ml-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Competition Badge */}
        <StatusBadge variant="demo" size="md">
          FinTech MVP
        </StatusBadge>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            alert(
              'FinPilot AI — SME Finance Copilot\n\nBuilt for international FinTech competition.\nAll figures shown in this prototype are illustrative demo data for demonstration purposes.'
            );
          }}
          leftIcon={<HelpCircle className="w-4 h-4 text-slate-500" />}
          className="hidden md:inline-flex"
        >
          About Demo
        </Button>
      </div>
    </header>
  );
};
