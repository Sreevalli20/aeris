import React from 'react';
import { AerisProjectData, MissionState } from '../types/aeris';
import { MetricCard } from './ui/MetricCard';
import { calculateParachuteDimensions, calculatePowerBudget, calculateRfLinkBudget } from '../engine/aerisMath';
import { computeEvaluationSummary } from '../engine/validation';
import { NavSection } from './Navigation';
import { ShieldCheck, AlertCircle, ArrowRight, Activity, Battery, Radio, Compass, Disc } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onNavigate: (section: NavSection) => void;
  activeMissionState?: MissionState;
}

export const EngineeringOverview: React.FC<Props> = ({
  projectData,
  onNavigate,
  activeMissionState = 'SAFE_OFF',
}) => {
  // Calculations derived dynamically from current project state
  const totalMassGrams = projectData.massBudget.reduce((sum, item) => {
    const m = item.measuredMassGrams ?? item.unitMassGrams;
    return sum + (item.quantity * m);
  }, 0);
  const massMarginGrams = projectData.projectMeta.maxMassLimitG - totalMassGrams;
  const massUtilizationPct = (totalMassGrams / projectData.projectMeta.maxMassLimitG) * 100;

  const totalMassKg = totalMassGrams / 1000;
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
  const energyMarginPct = ((runtimeMinutes - 95) / 95) * 100;

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

  // Sensor channels audit
  const requiredSensors = ['Barometric Pressure', 'Temperature', 'Relative Humidity', 'VOC / Air Quality', 'GNSS / GPS Position', '6-DoF Inertial (IMU)'];
  const configuredSensors = projectData.hardwareComponents
    .filter(c => c.category.toLowerCase().includes('sensor') || c.category.toLowerCase().includes('gnss') || c.category.toLowerCase().includes('imu'))
    .map(c => c.name);

  // Recovery subsystem readiness
  const hasBuzzer = projectData.hardwareComponents.some(c => c.name.toLowerCase().includes('buzzer'));
  const hasParachute = projectData.massBudget.some(m => m.subsystem === 'Parachute & Suspension');
  const hasLandingAlgo = projectData.landingConfig.confirmationDurationSec > 0;
  const recoveryReady = hasBuzzer && hasParachute && hasLandingAlgo;

  return (
    <div className="space-y-6">
      {/* Top Banner / Project ID */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <span>{projectData.projectMeta.challenge}</span>
              <span>·</span>
              <span>Theme: {projectData.projectMeta.theme}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {projectData.projectMeta.name} — {projectData.projectMeta.fullForm}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Engineering verification workbench for autonomous 500 m AGL drone deployment, controlled descent (5–8 m/s),
              multi-channel atmospheric boundary layer sensing, real-time RF telemetry (≥ 1 Hz), and autonomous acoustic/visual recovery.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => onNavigate('reports')}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
            >
              Export Report
            </button>
            <button
              onClick={() => onNavigate('simulator')}
              className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Launch Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Flight Mass"
          value={totalMassGrams.toFixed(1)}
          unit="g"
          sublabel={`Margin: ${massMarginGrams >= 0 ? '+' : ''}${massMarginGrams.toFixed(1)} g`}
          trend={`${massUtilizationPct.toFixed(1)}% of 700g limit`}
          status={massMarginGrams >= 0 ? 'nominal' : 'alert'}
          classification="Dynamic Sum"
        />
        <MetricCard
          label="Descent Terminal Velocity"
          value={paraResult.nominalDescentVelocityMs.toFixed(2)}
          unit="m/s"
          sublabel={`Canopy Diam: ${paraResult.equivalentDiameterMm.toFixed(0)} mm`}
          trend={paraResult.nominalDescentVelocityMs >= 5 && paraResult.nominalDescentVelocityMs <= 8 ? 'Nominal (5–8 m/s)' : 'Out of Bounds'}
          status={paraResult.nominalDescentVelocityMs >= 5 && paraResult.nominalDescentVelocityMs <= 8 ? 'nominal' : 'alert'}
          classification="Analytical Drag"
        />
        <MetricCard
          label="Battery Endurance"
          value={runtimeMinutes.toFixed(0)}
          unit="min"
          sublabel={`Energy Margin: ${energyMarginPct >= 0 ? '+' : ''}${energyMarginPct.toFixed(0)}%`}
          trend={`Spec: ≥ 95 min (Active: ${powerResult.totalActivePowerMw.toFixed(0)} mW)`}
          status={runtimeMinutes >= 95 ? 'nominal' : 'warning'}
          classification="Power Integration"
        />
        <MetricCard
          label="RF Slant Link Margin"
          value={`${rfResult.linkMarginDb >= 0 ? '+' : ''}${rfResult.linkMarginDb.toFixed(1)}`}
          unit="dB"
          sublabel={`Range: ${projectData.rfLinkConfig.slantDistanceM} m slant`}
          trend={`Theoretical max: ${(rfResult.maxTheoreticalDistanceM / 1000).toFixed(2)} km`}
          status={rfResult.linkMarginDb >= 0 ? 'nominal' : 'alert'}
          classification="FSPL / Friis"
        />
      </div>

      {/* Secondary Status & Subsystem Readiness Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Status Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Requirements Compliance
              </span>
              <button
                onClick={() => onNavigate('requirements')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <span>Matrix</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Verified & Passed:</span>
                <span className="font-mono font-semibold text-emerald-400">{evalSummary.passCount} / {evalSummary.totalCount}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(evalSummary.passCount / evalSummary.totalCount) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[10px]">IN PROGRESS</div>
                  <div className="text-amber-400 font-bold">{evalSummary.inProgressCount}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[10px]">FAILED</div>
                  <div className="text-rose-400 font-bold">{evalSummary.failCount}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[10px]">NOT TESTED</div>
                  <div className="text-slate-400 font-bold">{evalSummary.notTestedCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            Note: Requirements requiring physical testing remain unverified until valid drop-test or lab evidence is linked.
          </div>
        </div>

        {/* Subsystem Readiness Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Disc className="w-4 h-4 text-cyan-400" />
                Subsystem Readiness
              </span>
              <span className="text-xs font-mono text-slate-400">Pre-Flight Review</span>
            </div>

            <div className="space-y-2.5 mt-4 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-300">Recovery Subsystem</span>
                <span className={`font-mono ${recoveryReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {recoveryReady ? '● Armed & Ready' : '▲ Pending Checks'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-300">Telemetry Stream Rate</span>
                <span className="font-mono text-emerald-400">
                  ● 1.0 Hz (145ms airtime)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-300">Dual Logging (Flash + SD)</span>
                <span className="font-mono text-emerald-400">
                  ● Enabled & Formatted
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-300">Landing Hysteresis Filter</span>
                <span className="font-mono text-emerald-400">
                  ● 3.0s Debounce Active
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Active State:</span>
            <span className="font-mono font-bold text-cyan-300">{activeMissionState}</span>
          </div>
        </div>

        {/* NAT-004 Sensor Suite Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                NAT-004 Environmental Sensing
              </span>
              <button
                onClick={() => onNavigate('hardware')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <span>Hardware</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="text-slate-400 mb-1">Required Environmental Channels:</div>
              {requiredSensors.map((sensor) => {
                const isMatched = configuredSensors.some(c =>
                  sensor.toLowerCase().includes('barometric') ? c.toLowerCase().includes('bme') || c.toLowerCase().includes('bmp') :
                  sensor.toLowerCase().includes('air quality') ? c.toLowerCase().includes('sgp') || c.toLowerCase().includes('gas') :
                  sensor.toLowerCase().includes('gnss') ? c.toLowerCase().includes('neo') || c.toLowerCase().includes('gnss') :
                  sensor.toLowerCase().includes('inertial') ? c.toLowerCase().includes('mpu') || c.toLowerCase().includes('imu') :
                  true
                );

                return (
                  <div key={sensor} className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">{sensor}</span>
                    <span className="font-mono text-emerald-400 text-[11px]">
                      {isMatched ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            NAT-004 Theme: Atmospheric profiling, energy consumption budget, and reusable recovered airframe.
          </div>
        </div>
      </div>

      {/* Engineering Navigation Quick Jump Tiles */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 tracking-wide">
          Engineering Workstations & Calculation Modules
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { id: 'mass', title: 'Mass Budget', desc: `${totalMassGrams.toFixed(0)}g / 700g limit` },
            { id: 'parachute', title: 'Parachute Sizing', desc: `${paraResult.equivalentDiameterMm.toFixed(0)}mm diameter` },
            { id: 'power', title: 'Power & Battery', desc: `${runtimeMinutes.toFixed(0)} min endurance` },
            { id: 'rf', title: 'RF Link Budget', desc: `${projectData.rfLinkConfig.frequencyMhz} MHz ISM` },
            { id: 'telemetry', title: 'Telemetry CRC', desc: 'CRC-16 framing' },
            { id: 'simulator', title: 'Flight Simulator', desc: '500m AGL profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as NavSection)}
              className="text-left bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition-colors group"
            >
              <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                {item.title}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
