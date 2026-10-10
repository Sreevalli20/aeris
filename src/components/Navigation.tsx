import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Scale,
  Zap,
  Wind,
  Radio,
  FileCode,
  Compass,
  LineChart,
  Terminal,
  Cpu,
  ShieldAlert,
  TestTube2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'requirements'
  | 'mass'
  | 'power'
  | 'parachute'
  | 'rf'
  | 'telemetry'
  | 'simulator'
  | 'environment'
  | 'groundstation'
  | 'hardware'
  | 'recovery'
  | 'testing'
  | 'risks'
  | 'reports';

interface Props {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onQuickSimulate: () => void;
  activeMissionState?: string;
}

export const navItems: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requirements', label: 'Requirements & Evaluation', icon: ClipboardCheck },
  { id: 'mass', label: 'Mass Budget', icon: Scale },
  { id: 'power', label: 'Power Budget', icon: Zap },
  { id: 'parachute', label: 'Parachute & Descent', icon: Wind },
  { id: 'rf', label: 'RF Link Budget', icon: Radio },
  { id: 'telemetry', label: 'Telemetry & Integrity', icon: FileCode },
  { id: 'simulator', label: 'Mission Simulator', icon: Compass },
  { id: 'environment', label: 'Environmental Data', icon: LineChart },
  { id: 'groundstation', label: 'Ground Station', icon: Terminal },
  { id: 'hardware', label: 'Hardware & Architecture', icon: Cpu },
  { id: 'recovery', label: 'Recovery Subsystem', icon: ShieldAlert },
  { id: 'testing', label: 'Testing & Evidence', icon: TestTube2 },
  { id: 'risks', label: 'Risk Register', icon: AlertTriangle },
  { id: 'reports', label: 'Reports & Settings', icon: FileText },
];

export const TopNavigation: React.FC<Props> = ({
  activeSection,
  onSelectSection,
  onQuickSimulate,
  activeMissionState = 'SAFE_OFF',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      {/* 3-Zone Top Bar Contract */}
      <div className="flex items-center justify-between gap-8 px-6 py-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45" />
          <span className="text-base font-bold tracking-tight text-white font-mono">
            AERIS-1 Workstation
          </span>
          <span className="hidden sm:inline text-xs font-mono text-slate-500">
            / NAT-004
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => onSelectSection('overview')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'overview' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Engineering Summary
          </button>
          <button
            onClick={() => onSelectSection('requirements')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'requirements' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Traceability Matrix
          </button>
          <button
            onClick={() => onSelectSection('mass')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'mass' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Mass & Power
          </button>
          <button
            onClick={() => onSelectSection('simulator')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'simulator' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Flight Simulation
          </button>
          <button
            onClick={() => onSelectSection('reports')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'reports' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Project Dossier
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 mr-2">
            <span>State:</span>
            <span className="text-cyan-300 font-semibold">{activeMissionState}</span>
          </div>
          <button
            onClick={onQuickSimulate}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mission Simulator</span>
          </button>
        </div>
      </div>

      {/* Secondary Horizontal Module Bar for instant access across all 15 engineering disciplines */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-t border-slate-900 bg-slate-950/80 overflow-x-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-800 text-cyan-300 font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
