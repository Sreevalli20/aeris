import React, { useState } from 'react';
import { AerisProjectData, PowerItem } from '../types/aeris';
import { calculatePowerBudget } from '../engine/aerisMath';
import { FormulaBox } from './ui/FormulaBox';
import { MetricCard } from './ui/MetricCard';
import { exportTableToCsv } from '../engine/storage';
import { Zap, Plus, Download, Edit3, Trash2, BatteryCharging } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const PowerEnergyBudget: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [converterEfficiencyPct, setConverterEfficiencyPct] = useState<number>(90); // 90% TI TPS63001
  const [safetyReservePct, setSafetyReservePct] = useState<number>(25); // 25% safety margin
  const [batteryCapacityMah, setBatteryCapacityMah] = useState<number>(1200); // 1200 mAh 1S LiPo
  const [editingItem, setEditingItem] = useState<PowerItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  const [newItem, setNewItem] = useState<PowerItem>({
    id: `P-${String(projectData.powerBudget.length + 1).padStart(2, '0')}`,
    subsystem: 'Environmental Sensors',
    component: '',
    voltageV: 3.3,
    currentMa: 5.0,
    operatingMode: 'Continuous 10Hz',
    activeDutyCyclePct: 100,
    activeDurationSec: 5700,
    standbyCurrentMa: 0.1,
    standbyDurationSec: 0,
    classification: 'analytical_estimate',
  });

  const summary = calculatePowerBudget(
    projectData.powerBudget,
    converterEfficiencyPct / 100,
    safetyReservePct,
    3.7 // Nominal 3.7V LiPo
  );

  const usableCapacityMah = batteryCapacityMah * 0.85; // 85% DoD to protect LiPo chemistry
  const runtimeHours = summary.averageMissionCurrentMa > 0
    ? usableCapacityMah / summary.averageMissionCurrentMa
    : 0;
  const runtimeMinutes = runtimeHours * 60;
  const capacityMarginMah = usableCapacityMah - summary.recommendedBatteryCapacityMah;

  const chartData = Object.entries(summary.subsystemBreakdown).map(([name, data]) => ({
    name,
    powerMw: data.powerMw,
    pct: data.pct,
  }));

  const COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

  const handleSaveEdit = () => {
    if (!editingItem) return;
    onUpdateData((prev) => ({
      ...prev,
      powerBudget: prev.powerBudget.map((p) => (p.id === editingItem.id ? editingItem : p)),
    }));
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!newItem.component.trim()) return;
    onUpdateData((prev) => ({
      ...prev,
      powerBudget: [...prev.powerBudget, newItem],
    }));
    setIsAddingItem(false);
  };

  const handleDeleteItem = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      powerBudget: prev.powerBudget.filter((p) => p.id !== id),
    }));
  };

  const handleExportCsv = () => {
    const headers = [
      'Item ID',
      'Subsystem',
      'Component',
      'Operating Mode',
      'Voltage (V)',
      'Active Current (mA)',
      'Active Power (mW)',
      'Duty Cycle (%)',
      'Standby Current (mA)',
    ];
    const rows = projectData.powerBudget.map((p) => [
      p.id,
      p.subsystem,
      p.component,
      p.operatingMode,
      p.voltageV,
      p.currentMa,
      (p.voltageV * p.currentMa).toFixed(1),
      p.activeDutyCyclePct,
      p.standbyCurrentMa,
    ]);
    exportTableToCsv('AERIS1_Component_Power_Energy_Budget.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Component Power & Energy Budget
          </h2>
          <p className="text-xs text-slate-400">
            Time-weighted current integration, duty cycle profiling, switching losses, and mission life endurance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingItem(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Power Load</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Active Power"
          value={summary.totalActivePowerMw.toFixed(0)}
          unit="mW"
          sublabel={`Active Load: ${summary.totalActiveCurrentMa.toFixed(1)} mA`}
          trend="Peak Simultaneous Draw"
          status="neutral"
          classification="Instantaneous"
        />
        <MetricCard
          label="Time-Weighted Mission Power"
          value={summary.averageMissionPowerMw.toFixed(1)}
          unit="mW"
          sublabel={`Avg Current: ${summary.averageMissionCurrentMa.toFixed(1)} mA`}
          trend="Duty-Cycle Integrated"
          status="nominal"
          classification="Average"
        />
        <MetricCard
          label="Predicted Mission Life"
          value={runtimeMinutes.toFixed(0)}
          unit="min"
          sublabel={`Spec: ≥ 95 min (${(runtimeMinutes / 60).toFixed(1)} hours)`}
          trend={runtimeMinutes >= 95 ? 'Nominal Life (+ Reserve)' : 'INSUFFICIENT CAPACITY'}
          status={runtimeMinutes >= 95 ? 'nominal' : 'alert'}
          classification="3.7V / 1200mAh"
        />
        <MetricCard
          label="Recommended Battery Capacity"
          value={summary.recommendedBatteryCapacityMah.toFixed(0)}
          unit="mAh"
          sublabel={`Usable: ${usableCapacityMah.toFixed(0)} mAh (${batteryCapacityMah} mAh cell)`}
          trend={`Margin: ${capacityMarginMah >= 0 ? '+' : ''}${capacityMarginMah.toFixed(0)} mAh`}
          status={capacityMarginMah >= 0 ? 'nominal' : 'warning'}
          classification="Includes 25% Reserve"
        />
      </div>

      {/* Governing Equations & Power Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            Converter & Chemistry Configuration
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Manufacturer Rated Cell Capacity (mAh)</label>
              <input
                type="number"
                step="50"
                value={batteryCapacityMah}
                onChange={(e) => setBatteryCapacityMah(parseFloat(e.target.value) || 1200)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">1S LiPo nominal 3.7V (4.2V fully charged)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Buck-Boost Converter Efficiency (%)</label>
              <input
                type="number"
                step="1"
                min="50"
                max="99"
                value={converterEfficiencyPct}
                onChange={(e) => setConverterEfficiencyPct(parseFloat(e.target.value) || 90)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">TPS63001 Synchronous Regulator ≈ 90–94%</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Safety Energy Reserve (%)</label>
              <input
                type="number"
                step="5"
                min="0"
                max="50"
                value={safetyReservePct}
                onChange={(e) => setSafetyReservePct(parseFloat(e.target.value) || 25)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">Safety margin against low ambient temperatures</span>
            </div>

            {/* Mission Phase Allocation Summary */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-slate-300 font-medium">Mission Phase Energy Allocation:</span>
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-400">Pre-Launch Calibration (15%)</span>
                <span className="font-mono text-cyan-400">{summary.phases.preLaunchMwh} mWh</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-400">Controlled Descent (35%)</span>
                <span className="font-mono text-cyan-400">{summary.phases.descentMwh} mWh</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-400">Post-Landing Recovery Beacon (50%)</span>
                <span className="font-mono text-emerald-400">{summary.phases.recoveryMwh} mWh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <FormulaBox
            title="ENERGY CONSERVATION & RUNTIME INTEGRATION"
            formula="E_total = ∑ [ (V · I_active · t_active) + (V · I_sleep · t_sleep) ] / η_reg"
            variables={{
              'Total Energy': `${summary.totalMissionEnergyWh.toFixed(3)} Wh (${summary.totalMissionEnergyMwh.toFixed(0)} mWh)`,
              'Avg Power': `${summary.averageMissionPowerMw.toFixed(1)} mW`,
              'Avg Current': `${summary.averageMissionCurrentMa.toFixed(1)} mA`,
              'Efficiency (η)': `${converterEfficiencyPct}%`,
              'Usable Battery': `${usableCapacityMah.toFixed(0)} mAh`,
              'Reserve': `+${safetyReservePct}%`,
            }}
            result={runtimeMinutes.toFixed(0)}
            resultUnit="Minutes (Mission Endurance)"
            limitations="Assumes constant 25°C ambient temperature. Discharge below 3.0V cut-off is prohibited to prevent irreversible lithium cell degradation."
          />

          {/* Subsystem Power Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Power Consumption Breakdown by Subsystem (mW)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#64748b" fontSize={11} unit=" mW" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} mW`, 'Active Power']}
                  />
                  <Bar dataKey="powerMw" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Component Power Loads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Component Operating Current & Duty Cycle Matrix
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {projectData.powerBudget.length} Electronic Components
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-3 min-w-[180px]">Component</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Voltage</th>
                <th className="py-2.5 px-3">Active I</th>
                <th className="py-2.5 px-3">Duty %</th>
                <th className="py-2.5 px-3">Power (mW)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectData.powerBudget.map((p) => {
                const activePowerMw = p.voltageV * p.currentMa;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{p.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{p.subsystem}</td>
                    <td className="py-2.5 px-3 text-slate-200">{p.component}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{p.operatingMode}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{p.voltageV.toFixed(1)} V</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{p.currentMa.toFixed(1)} mA</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{p.activeDutyCyclePct}%</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{activePowerMw.toFixed(1)} mW</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingItem(p)}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(p.id)}
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

      {/* Edit Power Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Edit Power Load {editingItem.id}</span>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Component Name</label>
                <input
                  type="text"
                  value={editingItem.component}
                  onChange={(e) => setEditingItem({ ...editingItem, component: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Operating Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingItem.voltageV}
                    onChange={(e) => setEditingItem({ ...editingItem, voltageV: parseFloat(e.target.value) || 3.3 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Active Current (mA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingItem.currentMa}
                    onChange={(e) => setEditingItem({ ...editingItem, currentMa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Duty Cycle (%)</label>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    max="100"
                    value={editingItem.activeDutyCyclePct}
                    onChange={(e) => setEditingItem({ ...editingItem, activeDutyCyclePct: parseFloat(e.target.value) || 100 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Standby Current (mA)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editingItem.standbyCurrentMa}
                    onChange={(e) => setEditingItem({ ...editingItem, standbyCurrentMa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operating Mode Description</label>
                <input
                  type="text"
                  value={editingItem.operatingMode}
                  onChange={(e) => setEditingItem({ ...editingItem, operatingMode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Power Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add New Power Load</span>
              <button onClick={() => setIsAddingItem(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Component Name</label>
                <input
                  type="text"
                  placeholder="e.g. Laser Altimeter ToF"
                  value={newItem.component}
                  onChange={(e) => setNewItem({ ...newItem, component: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItem.voltageV}
                    onChange={(e) => setNewItem({ ...newItem, voltageV: parseFloat(e.target.value) || 3.3 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Current (mA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItem.currentMa}
                    onChange={(e) => setNewItem({ ...newItem, currentMa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Duty Cycle (%)</label>
                <input
                  type="number"
                  step="5"
                  min="1"
                  max="100"
                  value={newItem.activeDutyCyclePct}
                  onChange={(e) => setNewItem({ ...newItem, activeDutyCyclePct: parseFloat(e.target.value) || 100 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingItem(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Add Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
