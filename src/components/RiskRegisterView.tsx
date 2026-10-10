import React, { useState } from 'react';
import { AerisProjectData, RiskEntry } from '../types/aeris';
import { AlertTriangle, Plus, Edit3, Trash2, Download, ShieldCheck, Info } from 'lucide-react';
import { exportTableToCsv } from '../engine/storage';
import { MetricCard } from './ui/MetricCard';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const RiskRegisterView: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [editingRisk, setEditingRisk] = useState<RiskEntry | null>(null);
  const [isAddingRisk, setIsAddingRisk] = useState<boolean>(false);

  const [newRisk, setNewRisk] = useState<RiskEntry>({
    id: `RSK-${String(projectData.risks.length + 1).padStart(2, '0')}`,
    title: '',
    category: 'Avionics',
    likelihood: 2,
    severity: 4,
    detectability: 2,
    rpn: 16,
    mitigation: '',
    owner: 'Lead Engineer',
    verificationMethod: 'Bench Inspection',
    status: 'Open',
  });

  const handleSaveEdit = () => {
    if (!editingRisk) return;
    const computedRpn = editingRisk.likelihood * editingRisk.severity * editingRisk.detectability;
    const itemToSave = { ...editingRisk, rpn: computedRpn };

    onUpdateData((prev) => ({
      ...prev,
      risks: prev.risks.map((r) => (r.id === itemToSave.id ? itemToSave : r)),
    }));
    setEditingRisk(null);
  };

  const handleAddRisk = () => {
    if (!newRisk.title.trim()) return;
    const computedRpn = newRisk.likelihood * newRisk.severity * newRisk.detectability;
    const itemToAdd = { ...newRisk, rpn: computedRpn };

    onUpdateData((prev) => ({
      ...prev,
      risks: [...prev.risks, itemToAdd],
    }));
    setIsAddingRisk(false);
  };

  const handleDeleteRisk = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      risks: prev.risks.filter((r) => r.id !== id),
    }));
  };

  const handleExportCsv = () => {
    const headers = [
      'Risk ID',
      'Category',
      'Title',
      'Likelihood (1-5)',
      'Severity (1-5)',
      'Detectability (1-5)',
      'RPN (L*S*D)',
      'Mitigation Strategy',
      'Owner',
      'Verification Method',
      'Status',
    ];
    const rows = projectData.risks.map((r) => [
      r.id,
      r.category,
      r.title,
      r.likelihood,
      r.severity,
      r.detectability,
      r.rpn,
      r.mitigation,
      r.owner,
      r.verificationMethod,
      r.status,
    ]);
    exportTableToCsv('AERIS1_Engineering_Risk_Register.csv', headers, rows);
  };

  const highRpnCount = projectData.risks.filter((r) => r.rpn >= 30).length;
  const mitigatedCount = projectData.risks.filter((r) => r.status === 'Mitigated').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cyan-400" />
            Engineering Risk Register & FMEA Analysis
          </h2>
          <p className="text-xs text-slate-400">
            Failure Modes and Effects Analysis (FMEA) tracking failure severity, likelihood, detectability, and Risk Priority Numbers (RPN).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingRisk(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Risk Item</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* RPN Disclaimer & Formula Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <div className="font-semibold text-cyan-400 uppercase font-mono">
            Scoring Scale: RPN = Likelihood (1–5) × Severity (1–5) × Detectability (1–5)
          </div>
          <div className="mt-1 text-slate-400">
            Risk ratings represent internal systems engineering prioritizations, not certified aerospace safety determinations.
            Risks with RPN ≥ 30 require active mitigation protocols and documented physical verification prior to flight approval.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Identified Risks"
          value={projectData.risks.length}
          unit="items"
          sublabel="FMEA Coverage"
          status="neutral"
          classification="FMEA"
        />
        <MetricCard
          label="High Risk Items (RPN ≥ 30)"
          value={highRpnCount}
          unit="high RPN"
          sublabel="Requires Mitigation Action"
          status={highRpnCount === 0 ? 'nominal' : 'warning'}
          classification="RPN ≥ 30"
        />
        <MetricCard
          label="Mitigated & Controlled"
          value={`${mitigatedCount} / ${projectData.risks.length}`}
          unit="mitigated"
          sublabel="Safety Measures Enforced"
          status={mitigatedCount >= 4 ? 'nominal' : 'warning'}
          classification="Status"
        />
      </div>

      {/* Risks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 min-w-[200px]">Risk Description & Failure Mode</th>
                <th className="py-2.5 px-3">L × S × D</th>
                <th className="py-2.5 px-3">RPN</th>
                <th className="py-2.5 px-3 min-w-[220px]">Mitigation Strategy</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectData.risks.map((r) => {
                const isHigh = r.rpn >= 30;
                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{r.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{r.category}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Method: {r.verificationMethod}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {r.likelihood} × {r.severity} × {r.detectability}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={isHigh ? 'text-rose-400' : 'text-emerald-400'}>
                        {r.rpn}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">{r.mitigation}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{r.owner}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span
                        className={
                          r.status === 'Mitigated'
                            ? 'text-emerald-400 font-bold'
                            : r.status === 'Open'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingRisk(r)}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRisk(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Risk Modal */}
      {editingRisk && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Edit Risk {editingRisk.id}</span>
              <button onClick={() => setEditingRisk(null)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Risk Title</label>
                <input
                  type="text"
                  value={editingRisk.title}
                  onChange={(e) => setEditingRisk({ ...editingRisk, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Likelihood (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingRisk.likelihood}
                    onChange={(e) => setEditingRisk({ ...editingRisk, likelihood: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingRisk.severity}
                    onChange={(e) => setEditingRisk({ ...editingRisk, severity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Detectability (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingRisk.detectability}
                    onChange={(e) => setEditingRisk({ ...editingRisk, detectability: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mitigation Strategy</label>
                <textarea
                  value={editingRisk.mitigation}
                  onChange={(e) => setEditingRisk({ ...editingRisk, mitigation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Owner</label>
                  <input
                    type="text"
                    value={editingRisk.owner}
                    onChange={(e) => setEditingRisk({ ...editingRisk, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={editingRisk.status}
                    onChange={(e) => setEditingRisk({ ...editingRisk, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="Open">Open</option>
                    <option value="Mitigated">Mitigated</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingRisk(null)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Risk Modal */}
      {isAddingRisk && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add New Risk Item</span>
              <button onClick={() => setIsAddingRisk(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Parachute Shroud Line Snagging"
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Likelihood (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newRisk.likelihood}
                    onChange={(e) => setNewRisk({ ...newRisk, likelihood: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newRisk.severity}
                    onChange={(e) => setNewRisk({ ...newRisk, severity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Detectability (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newRisk.detectability}
                    onChange={(e) => setNewRisk({ ...newRisk, detectability: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mitigation Strategy</label>
                <textarea
                  value={newRisk.mitigation}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Owner</label>
                <input
                  type="text"
                  value={newRisk.owner}
                  onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingRisk(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRisk}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Add Risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
