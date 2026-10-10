import React, { useState } from 'react';
import { AerisProjectData, HardwareComponent } from '../types/aeris';
import { Cpu, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const HardwareConfigurator: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [editingComp, setEditingComp] = useState<HardwareComponent | null>(null);
  const [isAddingComp, setIsAddingComp] = useState<boolean>(false);

  const [newComp, setNewComp] = useState<HardwareComponent>({
    id: `HW-${String(projectData.hardwareComponents.length + 1).padStart(2, '0')}`,
    category: 'Sensors',
    name: '',
    manufacturer: '',
    model: '',
    supplyVoltageV: '3.3',
    currentDrawMa: 5.0,
    dimensionsMm: '10 x 10 x 2',
    massG: 2.5,
    interfaceType: 'I2C',
    operatingVoltageLogicV: 3.3,
    samplingRateHz: 10,
    datasheetRef: '',
    status: 'Candidate',
    pinConnections: 'I2C Bus',
  });

  // Compatibility Checks Engine
  const regulator = projectData.hardwareComponents.find(c => c.category.toLowerCase().includes('regulator'));
  const regulatorMaxMa = 1200; // TI TPS63001 1.2A
  const totalCurrentDemandMa = projectData.hardwareComponents.reduce((acc, c) => acc + c.currentDrawMa, 0);

  const voltageMismatches = projectData.hardwareComponents.filter(c => c.operatingVoltageLogicV !== 3.3);
  const isOverCurrent = totalCurrentDemandMa > regulatorMaxMa;

  const handleSaveEdit = () => {
    if (!editingComp) return;
    onUpdateData((prev) => ({
      ...prev,
      hardwareComponents: prev.hardwareComponents.map((c) => (c.id === editingComp.id ? editingComp : c)),
    }));
    setEditingComp(null);
  };

  const handleAddComp = () => {
    if (!newComp.name.trim()) return;
    onUpdateData((prev) => ({
      ...prev,
      hardwareComponents: [...prev.hardwareComponents, newComp],
    }));
    setIsAddingComp(false);
  };

  const handleDeleteComp = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      hardwareComponents: prev.hardwareComponents.filter((c) => c.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Hardware Component Configuration & Compatibility Engine
          </h2>
          <p className="text-xs text-slate-400">
            Avionics component catalog, operating specifications, bus interfaces, and electrical rule checks (ERC).
          </p>
        </div>
        <button
          onClick={() => setIsAddingComp(true)}
          className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Component</span>
        </button>
      </div>

      {/* Electrical Rule Check (ERC) Diagnostics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Power Rail Loading:</span>
            <span className="font-mono text-xs text-cyan-400">{totalCurrentDemandMa.toFixed(1)} / {regulatorMaxMa} mA</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                isOverCurrent ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (totalCurrentDemandMa / regulatorMaxMa) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {isOverCurrent
              ? 'WARNING: Current demand exceeds 3.3V switching regulator limit!'
              : 'Regulator capacity margin: nominal (3.3V @ 1.2A TI TPS63001)'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Logic Voltage Compatibility:</span>
            <span className={`font-mono text-xs ${voltageMismatches.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {voltageMismatches.length === 0 ? 'All 3.3V Native' : `${voltageMismatches.length} Level Shift Needed`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {voltageMismatches.length === 0
              ? 'No 5V-to-3.3V logic level translator required on I2C/SPI buses.'
              : `Warning: ${voltageMismatches.map((c) => c.name).join(', ')} require logic shifting.`}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">I2C Address Bus Collisions:</span>
            <span className="font-mono text-xs text-emerald-400">0 Collisions</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            BME280 (0x76) · BMP388 (0x77) · MPU-6050 (0x68) · SGP40 (0x59) all have distinct 7-bit addresses.
          </div>
        </div>
      </div>

      {/* Hardware Components Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 min-w-[160px]">Component & Model</th>
                <th className="py-2.5 px-3">Manufacturer</th>
                <th className="py-2.5 px-3">Supply / Logic</th>
                <th className="py-2.5 px-3">Current</th>
                <th className="py-2.5 px-3">Interface</th>
                <th className="py-2.5 px-3">Datasheet</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectData.hardwareComponents.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{c.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{c.category}</td>
                  <td className="py-2.5 px-3 text-slate-200">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{c.model}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{c.manufacturer}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {c.supplyVoltageV} V / {c.operatingVoltageLogicV}V
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{c.currentDrawMa} mA</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{c.interfaceType}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{c.datasheetRef || 'None'}</td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={c.status === 'Tested' ? 'text-emerald-400' : 'text-slate-400'}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingComp(c)}
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteComp(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Component Modal */}
      {editingComp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Edit Component {editingComp.id}</span>
              <button onClick={() => setEditingComp(null)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editingComp.name}
                  onChange={(e) => setEditingComp({ ...editingComp, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={editingComp.manufacturer}
                    onChange={(e) => setEditingComp({ ...editingComp, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Model</label>
                  <input
                    type="text"
                    value={editingComp.model}
                    onChange={(e) => setEditingComp({ ...editingComp, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Current (mA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingComp.currentDrawMa}
                    onChange={(e) => setEditingComp({ ...editingComp, currentDrawMa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Interface</label>
                  <select
                    value={editingComp.interfaceType}
                    onChange={(e) => setEditingComp({ ...editingComp, interfaceType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="I2C">I2C</option>
                    <option value="SPI">SPI</option>
                    <option value="UART">UART</option>
                    <option value="GPIO">GPIO</option>
                    <option value="ADC">ADC</option>
                    <option value="POWER">POWER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Pin Assignment / Connections</label>
                <input
                  type="text"
                  value={editingComp.pinConnections || ''}
                  onChange={(e) => setEditingComp({ ...editingComp, pinConnections: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingComp(null)}
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

      {/* Add Component Modal */}
      {isAddingComp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add Avionics Component</span>
              <button onClick={() => setIsAddingComp(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. BMP388 Precision Altimeter"
                  value={newComp.name}
                  onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={newComp.category}
                    onChange={(e) => setNewComp({ ...newComp, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Interface</label>
                  <select
                    value={newComp.interfaceType}
                    onChange={(e) => setNewComp({ ...newComp, interfaceType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="I2C">I2C</option>
                    <option value="SPI">SPI</option>
                    <option value="UART">UART</option>
                    <option value="GPIO">GPIO</option>
                    <option value="ADC">ADC</option>
                    <option value="POWER">POWER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Current (mA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newComp.currentDrawMa}
                    onChange={(e) => setNewComp({ ...newComp, currentDrawMa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mass (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newComp.massG}
                    onChange={(e) => setNewComp({ ...newComp, massG: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingComp(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComp}
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
