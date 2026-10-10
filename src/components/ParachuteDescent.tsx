import React, { useState } from 'react';
import { AerisProjectData, DropTestEntry } from '../types/aeris';
import { calculateParachuteDimensions, generateParachuteSensitivityCurve } from '../engine/aerisMath';
import { FormulaBox } from './ui/FormulaBox';
import { MetricCard } from './ui/MetricCard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Wind, Plus, CheckSquare, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const ParachuteDescent: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [overrideMassG, setOverrideMassG] = useState<number | null>(null);
  const [isAddingDropTest, setIsAddingDropTest] = useState<boolean>(false);

  // Default calculated mass from mass budget
  const budgetMassG = projectData.massBudget.reduce((sum, item) => {
    const m = item.measuredMassGrams ?? item.unitMassGrams;
    return sum + (item.quantity * m);
  }, 0);

  const activeMassG = overrideMassG !== null ? overrideMassG : budgetMassG;
  const activeMassKg = activeMassG / 1000;

  const cfg = projectData.parachuteConfig;
  const result = calculateParachuteDimensions(
    activeMassKg,
    cfg.targetVelocityMs,
    cfg.airDensityKgM3,
    cfg.dragCoefficientCd,
    cfg.gravityMs2,
    cfg.safetyMarginPct,
    cfg.spillHoleDiameterMm,
    projectData.projectMeta.deploymentAltM
  );

  const sensitivityData = generateParachuteSensitivityCurve(
    activeMassKg,
    cfg.dragCoefficientCd,
    cfg.airDensityKgM3,
    cfg.gravityMs2
  );

  const [newDropTest, setNewDropTest] = useState<DropTestEntry>({
    id: `DROP-${String(projectData.dropTests.length + 1).padStart(2, '0')}`,
    date: new Date().toISOString().split('T')[0],
    testMassG: Math.round(activeMassG),
    canopyConfig: `${result.equivalentDiameterMm.toFixed(0)}mm Hemispherical Ripstop`,
    releaseHeightM: 50.0,
    observedDescentTimeS: 8.2,
    calculatedVelocityMs: 6.1,
    stabilityObservations: 'Stable descent observed with minimal pendulum swing.',
    openingBehavior: 'Immediate',
    damage: 'None',
    evidenceRef: 'DROP_TEST_VIDEO.mp4',
    verified: true,
  });

  const handleUpdateConfig = <K extends keyof typeof cfg>(key: K, value: typeof cfg[K]) => {
    onUpdateData((prev) => ({
      ...prev,
      parachuteConfig: {
        ...prev.parachuteConfig,
        [key]: value,
      },
    }));
  };

  const handleAddDropTest = () => {
    const calculatedVelocity = newDropTest.observedDescentTimeS > 0
      ? Number((newDropTest.releaseHeightM / newDropTest.observedDescentTimeS).toFixed(2))
      : 0;

    const entry: DropTestEntry = {
      ...newDropTest,
      calculatedVelocityMs: calculatedVelocity,
    };

    onUpdateData((prev) => ({
      ...prev,
      dropTests: [...prev.dropTests, entry],
    }));

    setIsAddingDropTest(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            Parachute Sizing & Descent Aerodynamics
          </h2>
          <p className="text-xs text-slate-400">
            Steady-state aerodynamic drag sizing, sensitivity curves, deployment checklists, and drop test logs.
          </p>
        </div>
      </div>

      {/* Analytical Model Disclaimer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <div className="font-semibold text-amber-400 uppercase font-mono">
            Analytical Estimate Notice — Physical Drop Verification Required
          </div>
          <div className="mt-1">
            Calculated canopy reference area and diameter are <strong>theoretical steady-state estimates</strong> derived from terminal drag equilibrium.
            Opening shocks, canopy porosity, line stretch, apex venting dynamics, and crosswind gusts cannot be validated by equations alone.
            The CanSat must undergo physical drop testing before flight certification.
          </div>
        </div>
      </div>

      {/* Engineering KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Canopy Projected Diameter"
          value={result.equivalentDiameterMm.toFixed(0)}
          unit="mm"
          sublabel={`Equivalent: ${result.equivalentDiameterM.toFixed(3)} m`}
          trend={`Ref Area: ${result.requiredAreaM2.toFixed(4)} m²`}
          status="nominal"
          classification="Analytical SI"
        />
        <MetricCard
          label="Terminal Descent Velocity"
          value={result.nominalDescentVelocityMs.toFixed(2)}
          unit="m/s"
          sublabel="Equilibrium Speed"
          trend={result.nominalDescentVelocityMs >= 5 && result.nominalDescentVelocityMs <= 8 ? '5.0–8.0 m/s [Compliant]' : 'OUT OF SPEC'}
          status={result.nominalDescentVelocityMs >= 5 && result.nominalDescentVelocityMs <= 8 ? 'nominal' : 'alert'}
          classification="v = sqrt(2mg / ρCdA)"
        />
        <MetricCard
          label="Descent Time from 500m"
          value={result.estimatedDescentTimeS.toFixed(1)}
          unit="sec"
          sublabel={`~${(result.estimatedDescentTimeS / 60).toFixed(1)} minutes descent`}
          trend={`Altitude: ${projectData.projectMeta.deploymentAltM} m AGL`}
          status="neutral"
          classification="h / v_term"
        />
        <MetricCard
          label="Apex Spill Hole (Vent)"
          value={cfg.spillHoleDiameterMm}
          unit="mm"
          sublabel={`Vent Area: ${(result.spillHoleAreaM2 * 10000).toFixed(1)} cm²`}
          trend="Prevents Coning Oscillations"
          status="neutral"
          classification="Stabilizer"
        />
      </div>

      {/* Main Grid: Parameters Control + Formula Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aerodynamic Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Descent Parameters Configuration
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Flight Mass (kg):</span>
                <span className="font-mono text-cyan-400 font-bold">{activeMassKg.toFixed(3)} kg ({activeMassG.toFixed(1)} g)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOverrideMassG(null)}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${
                    overrideMassG === null ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  Auto-Sync ({budgetMassG.toFixed(1)}g)
                </button>
                <input
                  type="number"
                  step="5"
                  placeholder="Manual Mass (g)"
                  value={overrideMassG ?? ''}
                  onChange={(e) => setOverrideMassG(e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-32 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Target Descent Velocity (m/s)</label>
              <input
                type="number"
                step="0.1"
                min="3"
                max="12"
                value={cfg.targetVelocityMs}
                onChange={(e) => handleUpdateConfig('targetVelocityMs', parseFloat(e.target.value) || 6.0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">Target Envelope: 5.0 to 8.0 m/s</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Canopy Geometry</label>
              <select
                value={cfg.canopyType}
                onChange={(e) => {
                  const type = e.target.value as any;
                  let cd = 1.5;
                  if (type === 'cross') cd = 1.35;
                  if (type === 'flat_circular') cd = 0.8;
                  handleUpdateConfig('canopyType', type);
                  handleUpdateConfig('dragCoefficientCd', cd);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              >
                <option value="hemispherical">Hemispherical (Cd ≈ 1.50) [Recommended]</option>
                <option value="cross">Cross / Cruciform (Cd ≈ 1.35)</option>
                <option value="flat_circular">Flat Circular (Cd ≈ 0.80)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Drag Coeff (Cd)</label>
                <input
                  type="number"
                  step="0.05"
                  value={cfg.dragCoefficientCd}
                  onChange={(e) => handleUpdateConfig('dragCoefficientCd', parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Air Density (kg/m³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cfg.airDensityKgM3}
                  onChange={(e) => handleUpdateConfig('airDensityKgM3', parseFloat(e.target.value) || 1.2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Safety Margin (%)</label>
                <input
                  type="number"
                  step="1"
                  value={cfg.safetyMarginPct}
                  onChange={(e) => handleUpdateConfig('safetyMarginPct', parseFloat(e.target.value) || 10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Spill Hole (mm)</label>
                <input
                  type="number"
                  step="1"
                  value={cfg.spillHoleDiameterMm}
                  onChange={(e) => handleUpdateConfig('spillHoleDiameterMm', parseFloat(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Governing Formula Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <FormulaBox
            title="AERODYNAMIC DRAG EQUILIBRIUM"
            formula="A_ref = (2 · m · g) / (ρ · Cd · v²)"
            variables={{
              'm (mass)': `${activeMassKg.toFixed(3)} kg`,
              'g (gravity)': `${cfg.gravityMs2} m/s²`,
              'ρ (density)': `${cfg.airDensityKgM3} kg/m³`,
              'Cd (drag coeff)': `${cfg.dragCoefficientCd}`,
              'v (target vel)': `${cfg.targetVelocityMs} m/s`,
              'Margin': `+${cfg.safetyMarginPct}%`,
            }}
            result={result.requiredAreaM2}
            resultUnit="m² (Area) => D = sqrt(4A/π)"
            limitations="Assumes constant density troposphere, negligible side-slip wind shearing, steady-state terminal drag balance, and zero canopy porosity."
          />

          {/* Sensitivity Graph: Descent Velocity vs Canopy Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Sensitivity Curve: Terminal Velocity vs Canopy Projected Area
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                Current Diam: {result.equivalentDiameterMm.toFixed(0)} mm
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensitivityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="areaM2"
                    stroke="#64748b"
                    fontSize={11}
                    unit=" m²"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    unit=" m/s"
                    domain={[3, 12]}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    labelFormatter={(val) => `Area: ${val} m²`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="velocityNominalMs"
                    name={`Nominal (${activeMassG.toFixed(0)}g)`}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="velocityHeavyMs"
                    name={`+15% Overweight (${(activeMassG * 1.15).toFixed(0)}g)`}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="velocityLightMs"
                    name={`-15% Lightweight (${(activeMassG * 0.85).toFixed(0)}g)`}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-2">
              Acceptable target velocity zone (5.0–8.0 m/s) mapped across canopy sizes.
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Checklist & Drop-Test Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parachute Rigging Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800 mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            Parachute Pre-Flight Rigging Checklist
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            {[
              'Canopy fabric inspected for tears, punctures, and frayed stitching.',
              '8-line shroud bridle checked for symmetry and equal line length (650 mm).',
              'Swivel snap hook rated for ≥ 250 N shock load attached to main harness.',
              'Spill hole vent clear of obstruction to ensure stable airflow.',
              'Canopy folded according to accordion / zig-zag SOP to prevent line twists.',
              'Rubber band / deployment loop tension verified for clean release at 500m.',
            ].map((check, idx) => (
              <label key={idx} className="flex items-start gap-2.5 p-2 bg-slate-950 rounded border border-slate-800/60 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded text-cyan-500" />
                <span>{check}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Drop Test Evidence Log */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Physical Drop Test & Tower Release Evidence Log
              </h3>
              <p className="text-xs text-slate-400">
                Empirical field drop records proving terminal velocity compliance.
              </p>
            </div>
            <button
              onClick={() => setIsAddingDropTest(true)}
              className="px-2.5 py-1 text-xs bg-cyan-400 text-slate-950 font-medium rounded hover:bg-cyan-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Drop Test</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <th className="py-2 px-2.5">Test ID</th>
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Mass</th>
                  <th className="py-2 px-2.5">Release H</th>
                  <th className="py-2 px-2.5">Time</th>
                  <th className="py-2 px-2.5">Avg Vel</th>
                  <th className="py-2 px-2.5">Opening</th>
                  <th className="py-2 px-2.5">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projectData.dropTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-2.5 font-mono text-cyan-400 font-bold">{test.id}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-400">{test.date}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-300">{test.testMassG} g</td>
                    <td className="py-2 px-2.5 font-mono text-slate-300">{test.releaseHeightM} m</td>
                    <td className="py-2 px-2.5 font-mono text-slate-300">{test.observedDescentTimeS} s</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-emerald-400">{test.calculatedVelocityMs} m/s</td>
                    <td className="py-2 px-2.5 font-mono text-slate-300">{test.openingBehavior}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-400 text-[11px]">{test.evidenceRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Drop Test Modal */}
      {isAddingDropTest && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Record Physical Drop Test</span>
              <button onClick={() => setIsAddingDropTest(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Test ID</label>
                  <input
                    type="text"
                    value={newDropTest.id}
                    onChange={(e) => setNewDropTest({ ...newDropTest, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDropTest.date}
                    onChange={(e) => setNewDropTest({ ...newDropTest, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Mass (g)</label>
                  <input
                    type="number"
                    value={newDropTest.testMassG}
                    onChange={(e) => setNewDropTest({ ...newDropTest, testMassG: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Height (m)</label>
                  <input
                    type="number"
                    value={newDropTest.releaseHeightM}
                    onChange={(e) => setNewDropTest({ ...newDropTest, releaseHeightM: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Descent Time (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newDropTest.observedDescentTimeS}
                    onChange={(e) => setNewDropTest({ ...newDropTest, observedDescentTimeS: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Opening Behavior</label>
                <select
                  value={newDropTest.openingBehavior}
                  onChange={(e) => setNewDropTest({ ...newDropTest, openingBehavior: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                >
                  <option value="Immediate">Immediate Inflation</option>
                  <option value="Delayed">Delayed Inflation</option>
                  <option value="Partial">Partial Inflation</option>
                  <option value="Tangled">Tangled / Malfunction</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Stability & Pendulum Observations</label>
                <input
                  type="text"
                  value={newDropTest.stabilityObservations}
                  onChange={(e) => setNewDropTest({ ...newDropTest, stabilityObservations: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Evidence File Reference</label>
                <input
                  type="text"
                  value={newDropTest.evidenceRef}
                  onChange={(e) => setNewDropTest({ ...newDropTest, evidenceRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingDropTest(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDropTest}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save Drop Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
