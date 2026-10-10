import React, { useState } from 'react';
import { AerisProjectData, MassItem, DataClassification } from '../types/aeris';
import { exportTableToCsv } from '../engine/storage';
import { MetricCard } from './ui/MetricCard';
import { Plus, Download, Upload, Trash2, Edit3, AlertTriangle, Scale } from 'lucide-react';
import { DataClassificationBadge } from './ui/DataClassificationBadge';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

const SUBSYSTEM_CATEGORIES = [
  'Flight Computer',
  'Environmental Sensors',
  'GPS Subsystem',
  'Barometric Sensor',
  'IMU Subsystem',
  'RF Transceiver',
  'Antenna',
  'Data Storage',
  'Battery',
  'Power Conversion',
  'PCB & Connectors',
  'Structural Enclosure',
  'Parachute & Suspension',
  'Recovery Locator',
  'Mounting Hardware',
  'Miscellaneous',
];

export const MassBudget: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [editingItem, setEditingItem] = useState<MassItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  const [newItem, setNewItem] = useState<MassItem>({
    id: `M-${String(projectData.massBudget.length + 1).padStart(2, '0')}`,
    subsystem: 'Structural Enclosure',
    component: '',
    quantity: 1,
    unitMassGrams: 0,
    classification: 'analytical_estimate',
    notes: '',
  });

  // Calculate totals
  let totalMassG = 0;
  let totalMeasuredCount = 0;
  const subsystemTotals: Record<string, number> = {};

  for (const item of projectData.massBudget) {
    const effectiveMass = item.measuredMassGrams ?? item.unitMassGrams;
    const itemTotal = item.quantity * effectiveMass;
    totalMassG += itemTotal;

    if (item.measuredMassGrams !== undefined && item.measuredMassGrams !== null) {
      totalMeasuredCount++;
    }

    subsystemTotals[item.subsystem] = (subsystemTotals[item.subsystem] || 0) + itemTotal;
  }

  const limitG = projectData.projectMeta.maxMassLimitG; // 700 g
  const marginG = limitG - totalMassG;
  const utilizationPct = (totalMassG / limitG) * 100;

  // Heaviest subsystems ranking
  const sortedSubsystems = Object.entries(subsystemTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([subsystem, mass]) => ({
      subsystem,
      mass,
      percentage: totalMassG > 0 ? (mass / totalMassG) * 100 : 0,
    }));

  const handleSaveEdit = () => {
    if (!editingItem) return;
    onUpdateData((prev) => ({
      ...prev,
      massBudget: prev.massBudget.map((m) => (m.id === editingItem.id ? editingItem : m)),
    }));
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!newItem.component.trim()) return;
    onUpdateData((prev) => ({
      ...prev,
      massBudget: [...prev.massBudget, newItem],
    }));
    setIsAddingItem(false);
    setNewItem({
      id: `M-${String(projectData.massBudget.length + 2).padStart(2, '0')}`,
      subsystem: 'Structural Enclosure',
      component: '',
      quantity: 1,
      unitMassGrams: 0,
      classification: 'analytical_estimate',
      notes: '',
    });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      massBudget: prev.massBudget.filter((m) => m.id !== id),
    }));
  };

  const handleExportCsv = () => {
    const headers = [
      'Item ID',
      'Subsystem',
      'Component',
      'Quantity',
      'Unit Mass (g)',
      'Measured Mass (g)',
      'Subtotal Mass (g)',
      'Classification',
      'Notes',
    ];
    const rows = projectData.massBudget.map((item) => {
      const effectiveM = item.measuredMassGrams ?? item.unitMassGrams;
      return [
        item.id,
        item.subsystem,
        item.component,
        item.quantity,
        item.unitMassGrams,
        item.measuredMassGrams ?? '',
        (item.quantity * effectiveM).toFixed(2),
        item.classification,
        item.notes || '',
      ];
    });
    exportTableToCsv('AERIS1_Subsystem_Mass_Budget.csv', headers, rows);
  };

  const handleImportCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) return;

        const importedItems: MassItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 5) {
            importedItems.push({
              id: cols[0] || `M-IMP-${i}`,
              subsystem: cols[1] || 'Miscellaneous',
              component: cols[2] || `Component ${i}`,
              quantity: parseFloat(cols[3]) || 1,
              unitMassGrams: parseFloat(cols[4]) || 0,
              measuredMassGrams: cols[5] ? parseFloat(cols[5]) : undefined,
              classification: (cols[7] as DataClassification) || 'imported_measurement',
              notes: cols[8] || '',
            });
          }
        }

        if (importedItems.length > 0) {
          onUpdateData((prev) => ({
            ...prev,
            massBudget: importedItems,
          }));
        }
      } catch (err) {
        console.error('Failed to import CSV:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            Subsystem Mass Budget Calculator
          </h2>
          <p className="text-xs text-slate-400">
            Component-level mass tally enforcing strict NAT-004 ≤ 700 g maximum launch envelope.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingItem(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Component</span>
          </button>
          <label className="cursor-pointer px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </label>
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
          label="Total Flight Mass"
          value={totalMassG.toFixed(1)}
          unit="g"
          sublabel={`Limit: ${limitG} g`}
          trend={`${utilizationPct.toFixed(1)}% limit utilized`}
          status={marginG >= 0 ? 'nominal' : 'alert'}
          classification="Dynamic Sum"
        />
        <MetricCard
          label="Remaining Mass Margin"
          value={`${marginG >= 0 ? '+' : ''}${marginG.toFixed(1)}`}
          unit="g"
          sublabel="Launch Safety Margin"
          trend={marginG >= 0 ? 'Within Specification' : 'OVERWEIGHT ALERT'}
          status={marginG >= 0 ? 'nominal' : 'alert'}
          classification="700g - Total"
        />
        <MetricCard
          label="Component Count"
          value={projectData.massBudget.reduce((acc, m) => acc + m.quantity, 0)}
          unit="parts"
          sublabel={`${projectData.massBudget.length} unique line items`}
          status="neutral"
          classification="Inventory"
        />
        <MetricCard
          label="Physical Weigh-in Rigor"
          value={`${totalMeasuredCount} / ${projectData.massBudget.length}`}
          unit="verified"
          sublabel={`${((totalMeasuredCount / Math.max(1, projectData.massBudget.length)) * 100).toFixed(0)}% bench weighed`}
          status={totalMeasuredCount > 8 ? 'nominal' : 'warning'}
          classification="Metrology"
        />
      </div>

      {/* Mass Warning Banner if over limit */}
      {marginG < 0 && (
        <div className="bg-rose-950/60 border border-rose-600/60 rounded-lg p-4 flex items-center gap-3 text-rose-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold">MASS ENVELOPE EXCEEDED</div>
            <div>
              Total mass of {totalMassG.toFixed(1)} g exceeds the 700.0 g competition constraint by {Math.abs(marginG).toFixed(1)} g.
              Lighten the chassis infill, optimize battery capacity, or shorten wiring harnesses.
            </div>
          </div>
        </div>
      )}

      {/* Heaviest Subsystems Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-3">
          Subsystem Mass Distribution & Heaviest Assemblies
        </h3>
        <div className="space-y-2">
          {sortedSubsystems.slice(0, 5).map((sub) => (
            <div key={sub.subsystem} className="text-xs">
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-medium">{sub.subsystem}</span>
                <span className="font-mono text-slate-400">
                  {sub.mass.toFixed(1)} g ({sub.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, sub.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mass Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Item ID</th>
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-3 min-w-[200px]">Component</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Unit Mass (Est)</th>
                <th className="py-2.5 px-3">Measured Mass</th>
                <th className="py-2.5 px-3">Subtotal</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectData.massBudget.map((item) => {
                const effectiveMass = item.measuredMassGrams ?? item.unitMassGrams;
                const subtotal = item.quantity * effectiveMass;
                const isMeasured = item.measuredMassGrams !== undefined && item.measuredMassGrams !== null;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{item.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{item.subsystem}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      <div>{item.component}</div>
                      {item.notes && <div className="text-[11px] text-slate-500 italic">{item.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{item.quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.unitMassGrams.toFixed(1)} g</td>
                    <td className="py-2.5 px-3 font-mono">
                      {isMeasured ? (
                        <span className="text-emerald-400 font-semibold">{item.measuredMassGrams?.toFixed(1)} g</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{subtotal.toFixed(1)} g</td>
                    <td className="py-2.5 px-3">
                      <DataClassificationBadge classification={item.classification} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                          title="Delete Item"
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

      {/* Edit Component Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Edit Component {editingItem.id}</span>
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

              <div>
                <label className="block text-slate-400 mb-1">Subsystem</label>
                <select
                  value={editingItem.subsystem}
                  onChange={(e) => setEditingItem({ ...editingItem, subsystem: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  {SUBSYSTEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit Mass (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingItem.unitMassGrams}
                    onChange={(e) => setEditingItem({ ...editingItem, unitMassGrams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Measured (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Optional"
                    value={editingItem.measuredMassGrams ?? ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        measuredMassGrams: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        classification: e.target.value !== '' ? 'physically_tested' : editingItem.classification,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Classification</label>
                <select
                  value={editingItem.classification}
                  onChange={(e) => setEditingItem({ ...editingItem, classification: e.target.value as DataClassification })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                >
                  <option value="analytical_estimate">analytical_estimate</option>
                  <option value="physically_tested">physically_tested</option>
                  <option value="user_design">user_design</option>
                  <option value="imported_measurement">imported_measurement</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
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
                Save Component
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add New Mass Component</span>
              <button onClick={() => setIsAddingItem(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Component Name</label>
                <input
                  type="text"
                  placeholder="e.g. Carbon Fiber Top Bulkhead"
                  value={newItem.component}
                  onChange={(e) => setNewItem({ ...newItem, component: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subsystem</label>
                <select
                  value={newItem.subsystem}
                  onChange={(e) => setNewItem({ ...newItem, subsystem: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  {SUBSYSTEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit Mass (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItem.unitMassGrams}
                    onChange={(e) => setNewItem({ ...newItem, unitMassGrams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Classification</label>
                <select
                  value={newItem.classification}
                  onChange={(e) => setNewItem({ ...newItem, classification: e.target.value as DataClassification })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                >
                  <option value="analytical_estimate">analytical_estimate</option>
                  <option value="physically_tested">physically_tested</option>
                  <option value="user_design">user_design</option>
                </select>
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
                Add Component
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
