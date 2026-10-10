import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  trend?: string;
  status?: 'nominal' | 'warning' | 'alert' | 'neutral';
  classification?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  sublabel,
  trend,
  status = 'neutral',
  classification,
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'nominal': return 'border-emerald-500/40';
      case 'warning': return 'border-amber-500/40';
      case 'alert': return 'border-rose-500/40';
      default: return 'border-slate-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'nominal': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'alert': return 'text-rose-400';
      default: return 'text-slate-100';
    }
  };

  return (
    <div className={`bg-slate-900/80 border ${getStatusBorder()} rounded-lg p-4 transition-colors`}>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span className="font-medium tracking-wide">{label}</span>
        {classification && (
          <span className="font-mono text-[10px] text-slate-500">[{classification}]</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-2xl font-bold font-mono tabular-nums ${getStatusText()}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs uppercase font-mono text-slate-400">{unit}</span>
        )}
      </div>
      {(sublabel || trend) && (
        <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
          <span>{sublabel}</span>
          {trend && <span className="font-mono text-slate-500">{trend}</span>}
        </div>
      )}
    </div>
  );
};

interface FormulaBoxProps {
  title: string;
  formula: string;
  variables: Record<string, string | number>;
  result: string | number;
  resultUnit?: string;
  limitations?: string;
}

export const FormulaBox: React.FC<FormulaBoxProps> = ({
  title,
  formula,
  variables,
  result,
  resultUnit,
  limitations,
}) => {
  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
        <span className="text-cyan-400 font-semibold tracking-wider">{title}</span>
        <span className="text-slate-400">SI Governing Relationship</span>
      </div>
      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-slate-200 text-center font-semibold mb-3">
        {formula}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-slate-300">
        {Object.entries(variables).map(([k, v]) => (
          <div key={k} className="bg-slate-900/40 p-2 rounded border border-slate-800/40">
            <span className="text-slate-400">{k}: </span>
            <span className="text-slate-200 font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-slate-400">Computed Output:</span>
        <span className="text-base font-bold text-emerald-400">
          {result} {resultUnit}
        </span>
      </div>
      {limitations && (
        <div className="mt-2 pt-2 border-t border-slate-800/50 text-[11px] text-slate-400 font-sans italic">
          Limitation: {limitations}
        </div>
      )}
    </div>
  );
};
