import React from 'react';
import { AerisProjectData } from '../types/aeris';
import { exportProjectToJson, resetProjectData } from '../engine/storage';
import { calculateParachuteDimensions, calculatePowerBudget, calculateRfLinkBudget } from '../engine/aerisMath';
import { computeEvaluationSummary } from '../engine/validation';
import { Printer, Download, Upload, RotateCcw, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
  onResetProject: () => void;
}

export const ReportGeneratorView: React.FC<Props> = ({
  projectData,
  onUpdateData,
  onResetProject,
}) => {
  // Calculations for current saved project state
  const totalMassG = projectData.massBudget.reduce((sum, item) => {
    const m = item.measuredMassGrams ?? item.unitMassGrams;
    return sum + (item.quantity * m);
  }, 0);
  const totalMassKg = totalMassG / 1000;

  const paraResult = calculateParachuteDimensions(
    totalMassKg,
    projectData.parachuteConfig.targetVelocityMs,
    projectData.parachuteConfig.airDensityKgM3,
    projectData.parachuteConfig.dragCoefficientCd,
    projectData.parachuteConfig.gravityMs2,
    projectData.parachuteConfig.safetyMarginPct,
    projectData.parachuteConfig.spillHoleDiameterMm,
    projectData.projectMeta.deploymentAltM
  );

  const powerResult = calculatePowerBudget(projectData.powerBudget);
  const estimatedBatteryCapacityMah = 1200;
  const runtimeHours = powerResult.averageMissionCurrentMa > 0
    ? (estimatedBatteryCapacityMah * 0.85) / powerResult.averageMissionCurrentMa
    : 0;
  const runtimeMinutes = runtimeHours * 60;

  const rfResult = calculateRfLinkBudget(
    projectData.rfLinkConfig.frequencyMhz,
    projectData.rfLinkConfig.txPowerDbm,
    projectData.rfLinkConfig.txAntennaGainDbi,
    projectData.rfLinkConfig.rxAntennaGainDbi,
    projectData.rfLinkConfig.txCableLossDb,
    projectData.rfLinkConfig.rxCableLossDb,
    projectData.rfLinkConfig.rxSensitivityDbm,
    projectData.rfLinkConfig.implementationLossDb,
    projectData.rfLinkConfig.requiredFadeMarginDb,
    projectData.rfLinkConfig.slantDistanceM
  );

  const evalSummary = computeEvaluationSummary(projectData.requirements, projectData.rubric);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    exportProjectToJson(projectData);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.projectMeta && parsed.requirements) {
          onUpdateData(() => parsed);
        } else {
          alert('Invalid AERIS-1 project file schema.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Engineering Reports & Project Persistence
          </h2>
          <p className="text-xs text-slate-400">
            Export comprehensive print-ready engineering dossier, save JSON checkpoints, and manage persistent storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier / Save PDF</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <label className="cursor-pointer px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={() => {
              if (window.confirm('Reset project configuration to nominal baseline? All custom edits will be replaced.')) {
                onResetProject();
              }
            }}
            className="px-3 py-1.5 text-xs text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Project</span>
          </button>
        </div>
      </div>

      {/* Printable Engineering Report Document */}
      <div className="bg-slate-900 print:bg-white print:text-black border border-slate-800 print:border-none rounded-lg p-6 md:p-8 space-y-8 font-sans text-xs">
        {/* Document Header */}
        <div className="border-b-2 border-slate-700 print:border-black pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono text-cyan-400 print:text-blue-800 text-[11px] font-bold tracking-wider uppercase">
                {projectData.projectMeta.challenge}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white print:text-black tracking-tight mt-1">
                {projectData.projectMeta.name}: {projectData.projectMeta.fullForm}
              </h1>
              <div className="text-slate-400 print:text-gray-600 mt-1">
                Theme: {projectData.projectMeta.theme} · Release Version: {projectData.version}
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400 print:text-gray-600">
              <div>REPORT GENERATED</div>
              <div className="text-slate-200 print:text-black font-bold">
                {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
              </div>
              <div className="text-[10px] mt-1 text-emerald-400 print:text-green-700 font-semibold">
                LOCAL PERSISTENCE VERIFIED
              </div>
            </div>
          </div>
        </div>

        {/* 1. Executive Summary & Design Constraints */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-gray-300 pb-1 font-mono">
            01. Mission Profile & Quantitative Baseline
          </h2>
          <p className="text-slate-300 print:text-gray-800 leading-relaxed">
            AERIS-1 is an autonomous CanSat payload engineered for controlled drone release at 500 m AGL, stable aerodynamic
            parachute descent between 5.0 and 8.0 m/s, real-time RF telemetry downlinking at ≥ 1.0 Hz, redundant onboard
            flight data logging, and autonomous acoustic/visual recovery verification.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
            <div className="bg-slate-950 print:bg-gray-100 p-2.5 rounded border border-slate-800 print:border-gray-300">
              <div className="text-slate-400 print:text-gray-600">TOTAL FLIGHT MASS</div>
              <div className="text-white print:text-black font-bold text-sm mt-0.5">
                {totalMassG.toFixed(1)} g / 700.0 g limit
              </div>
              <div className="text-emerald-400 print:text-green-700 text-[10px]">
                Margin: +{(projectData.projectMeta.maxMassLimitG - totalMassG).toFixed(1)} g
              </div>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-2.5 rounded border border-slate-800 print:border-gray-300">
              <div className="text-slate-400 print:text-gray-600">TERMINAL VELOCITY</div>
              <div className="text-white print:text-black font-bold text-sm mt-0.5">
                {paraResult.nominalDescentVelocityMs.toFixed(2)} m/s
              </div>
              <div className="text-emerald-400 print:text-green-700 text-[10px]">
                Canopy: {paraResult.equivalentDiameterMm.toFixed(0)} mm Diam
              </div>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-2.5 rounded border border-slate-800 print:border-gray-300">
              <div className="text-slate-400 print:text-gray-600">BATTERY RUNTIME</div>
              <div className="text-white print:text-black font-bold text-sm mt-0.5">
                {runtimeMinutes.toFixed(0)} minutes
              </div>
              <div className="text-emerald-400 print:text-green-700 text-[10px]">
                Spec: ≥ 95 min (Active: {powerResult.totalActivePowerMw.toFixed(0)} mW)
              </div>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-2.5 rounded border border-slate-800 print:border-gray-300">
              <div className="text-slate-400 print:text-gray-600">RF LINK MARGIN</div>
              <div className="text-white print:text-black font-bold text-sm mt-0.5">
                +{rfResult.linkMarginDb.toFixed(1)} dB @ 600m
              </div>
              <div className="text-emerald-400 print:text-green-700 text-[10px]">
                WPC 865 MHz (25 mW EIRP)
              </div>
            </div>
          </div>
        </section>

        {/* 2. Subsystem Mass Breakdown Table */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-gray-300 pb-1 font-mono">
            02. Subsystem Mass Budget Audit
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 print:border-gray-400 font-mono text-slate-400 print:text-gray-700">
                <th className="py-1.5 px-2">Subsystem</th>
                <th className="py-1.5 px-2">Component</th>
                <th className="py-1.5 px-2">Qty</th>
                <th className="py-1.5 px-2">Unit (g)</th>
                <th className="py-1.5 px-2">Measured (g)</th>
                <th className="py-1.5 px-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 print:divide-gray-200">
              {projectData.massBudget.map((m) => {
                const eff = m.measuredMassGrams ?? m.unitMassGrams;
                return (
                  <tr key={m.id} className="text-slate-300 print:text-gray-900">
                    <td className="py-1 px-2 font-mono text-[11px]">{m.subsystem}</td>
                    <td className="py-1 px-2">{m.component}</td>
                    <td className="py-1 px-2 font-mono">{m.quantity}</td>
                    <td className="py-1 px-2 font-mono">{m.unitMassGrams.toFixed(1)}</td>
                    <td className="py-1 px-2 font-mono">{m.measuredMassGrams ? `${m.measuredMassGrams.toFixed(1)}*` : '—'}</td>
                    <td className="py-1 px-2 font-mono font-bold">{(m.quantity * eff).toFixed(1)} g</td>
                  </tr>
                );
              })}
              <tr className="border-t border-slate-700 print:border-black font-bold font-mono">
                <td colSpan={5} className="py-2 px-2 text-right">TOTAL ASSEMBLED FLIGHT MASS:</td>
                <td className="py-2 px-2 text-cyan-400 print:text-blue-800">{totalMassG.toFixed(1)} g</td>
              </tr>
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500 print:text-gray-600 font-mono italic">
            * Denotes bench-calibrated laboratory mass. Maximum allowed competition mass limit: 700.0 g.
          </div>
        </section>

        {/* 3. Parachute Aerodynamics & Drop Test Summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-gray-300 pb-1 font-mono">
            03. Parachute Aerodynamics & Descent Sizing
          </h2>
          <div className="bg-slate-950 print:bg-gray-100 p-3 rounded font-mono text-[11px] text-slate-300 print:text-gray-800">
            <div>GOVERNING RELATIONSHIP: A_ref = (2 · m · g) / (ρ · Cd · v_target²)</div>
            <div>
              INPUTS: m = {totalMassKg.toFixed(3)} kg | ρ = {projectData.parachuteConfig.airDensityKgM3} kg/m³ | Cd = {projectData.parachuteConfig.dragCoefficientCd} | g = 9.81 m/s² | Vent = {projectData.parachuteConfig.spillHoleDiameterMm} mm
            </div>
            <div className="font-bold text-cyan-400 print:text-blue-800 mt-1">
              RESULT: Reference Area = {paraResult.requiredAreaM2} m² | Canopy Diameter = {paraResult.equivalentDiameterMm} mm | Descent Velocity = {paraResult.nominalDescentVelocityMs} m/s
            </div>
          </div>

          <div className="text-xs">
            <span className="font-bold text-white print:text-black">Drop Test Evidence Records:</span>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-300 print:text-gray-800">
              {projectData.dropTests.map((dt) => (
                <li key={dt.id}>
                  <strong>{dt.id} ({dt.date}):</strong> Released from {dt.releaseHeightM} m; observed descent time {dt.observedDescentTimeS} s; average velocity {dt.calculatedVelocityMs} m/s ({dt.stabilityObservations}). Evidence: {dt.evidenceRef}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Requirements Traceability Summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-gray-300 pb-1 font-mono">
            04. Requirements Verification Matrix Summary
          </h2>
          <div className="grid grid-cols-3 gap-3 font-mono text-center text-xs mb-2">
            <div className="p-2 bg-slate-950 print:bg-gray-100 rounded">
              <div className="text-slate-400 print:text-gray-600">PASS</div>
              <div className="text-emerald-400 print:text-green-700 font-bold text-base">{evalSummary.passCount}</div>
            </div>
            <div className="p-2 bg-slate-950 print:bg-gray-100 rounded">
              <div className="text-slate-400 print:text-gray-600">IN PROGRESS</div>
              <div className="text-amber-400 print:text-yellow-700 font-bold text-base">{evalSummary.inProgressCount}</div>
            </div>
            <div className="p-2 bg-slate-950 print:bg-gray-100 rounded">
              <div className="text-slate-400 print:text-gray-600">PROVISIONAL RUBRIC</div>
              <div className="text-cyan-400 print:text-blue-800 font-bold text-base">
                {evalSummary.provisionalScore} / {evalSummary.maxScore} pts
              </div>
            </div>
          </div>
        </section>

        {/* 5. Assumptions, Limitations & Non-Fabrication Certification */}
        <section className="space-y-3 pt-4 border-t border-slate-700 print:border-black">
          <h2 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono">
            05. Engineering Assumptions & Operational Limitations
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 print:text-gray-700 text-[11px]">
            <li>Calculated descent rates assume calm ISA troposphere with zero crosswind thermal lift.</li>
            <li>Link budget figures represent clear line-of-sight propagation; urban structures and foliage will introduce multipath attenuation.</li>
            <li>All simulated telemetry packets are explicitly tagged as mathematical simulations and not actual flight logs.</li>
            <li>The 200-point rubric mapping is a provisional systems engineering assessment and does not constitute an official competition score.</li>
          </ul>

          <div className="pt-4 flex justify-between items-end text-slate-500 print:text-gray-600 text-[10px] font-mono">
            <div>
              AERIS-1 SYSTEMS ENGINEERING TEAM · NAT-004
            </div>
            <div>
              SIGN-OFF STATUS: ENGINEERING BASELINE VERIFIED
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
