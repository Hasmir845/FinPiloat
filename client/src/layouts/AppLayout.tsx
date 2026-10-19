import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Navbar } from '../components/common/Navbar';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { FinancialProvider } from '../context/FinancialContext';
import { Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { health, loading: healthLoading, refetch: refreshHealth } = useHealthCheck();

  const isBackendConnected = Boolean(health && health.status === 'ok');

  return (
    <FinancialProvider>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased">
        <div className="flex flex-1">
          {/* Responsive Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            backendConnected={isBackendConnected}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              health={health}
              healthLoading={healthLoading}
              onRefreshHealth={refreshHealth}
            />

            {/* Illustrative Demo Notice Banner */}
            <div className="bg-blue-50/70 border-b border-blue-100/80 px-4 sm:px-6 py-2 text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong className="font-semibold">Demonstration Sandbox:</strong> All financial
                  metrics, transactions, and cash flow figures are illustrative demo data for the FinTech competition.
                </span>
              </div>
              <span className="hidden sm:inline-block font-mono text-[11px] text-blue-700 bg-white/70 px-2 py-0.5 rounded border border-blue-200">
                MVP Stage
              </span>
            </div>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <Outlet context={{ isBackendConnected, health }} />
            </main>

            {/* Clean App Footer */}
            <footer className="py-4 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400">
              FinPilot AI — SME Finance Copilot &bull; University FinTech Competition Prototype
            </footer>
          </div>
        </div>
      </div>
    </FinancialProvider>
  );
};
