import React, { useState } from 'react';
import { AerisProjectData, RecoveryLog } from '../types/aeris';
import { ShieldAlert, Volume2, Eye, CheckSquare, Plus, BellRing, AlertCircle } from 'lucide-react';
import { MetricCard } from './ui/MetricCard';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
  activeMissionState?: string;
}

export const LandingRecoverySubsystem: React.FC<Props> = ({
  projectData,
  onUpdateData,
  activeMissionState = 'SAFE_OFF',
}) => {
  const landingCfg = projectData.landingConfig;
  const [isAddingLog, setIsAddingLog] = useState<boolean>(false);

  const [newLog, setNewLog] = useState<RecoveryLog>({
    id: `REC-${String(projectData.recoveryLogs.length + 1).padStart(2, '0')}`,
    landingTimestamp: new Date().toISOString(),
    finalGpsCoords: '13.0827° N, 80.2707° E',
    finalAltitudeM: 14.2,
    recoveryTeamNotified: true,
    beaconAudibleDistanceM: 110,
    visualStreamerSpotted: true,
    structuralCondition: 'Nominal, no cracks',
    payloadIntegrity: 'Operational, all logs intact',
    notes: 'CanSat recovered 5.8 min after landing trigger.',
  });

  const handleUpdateConfig = <K extends keyof typeof landingCfg>(key: K, value: typeof landingCfg[K]) => {
    onUpdateData((prev) => ({
      ...prev,
      landingConfig: {
        ...prev.landingConfig,
        [key]: value,
      },
    }));
  };

  const handleAddLog = () => {
    onUpdateData((prev) => ({
      ...prev,
      recoveryLogs: [...prev.recoveryLogs, newLog],
    }));
    setIsAddingLog(false);
  };

  const isSoftwareBeaconActive =
    activeMissionState === 'LANDING_DETECTED' || activeMissionState === 'RECOVERY_MODE';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Landing Detection Algorithm & Recovery Subsystem
          </h2>
          <p className="text-xs text-slate-400">
            Multi-sensor fused landing detection, debounce hysteresis logic, acoustic locator beacon, and recovery logs.
          </p>
        </div>
      </div>

      {/* Software vs Hardware Disclaimer Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start gap-3 text-xs">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <div className="font-semibold text-amber-400 uppercase font-mono">
            Hardware Output Activation Requirement
          </div>
          <div className="mt-1">
            In simulation mode, beacon activation triggers a software indicator.
            In actual flight, activating the physical 90 dBA buzzer and high-intensity strobe LED requires
            a verified hardware output stage (GPIO 25 switching a 2N7002 N-channel MOSFET from the 3.3V power bus).
            A software state transition does not generate physical sound without integrated hardware wiring.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Software Beacon Status"
          value={isSoftwareBeaconActive ? 'PULSING LOCATOR' : 'ARMED / STANDBY'}
          unit=""
          sublabel={`Delay: ${landingCfg.beaconActivationDelaySec}s post-landing`}
          trend={isSoftwareBeaconActive ? 'Active in Simulation' : 'Waiting for touchdown'}
          status={isSoftwareBeaconActive ? 'nominal' : 'neutral'}
          classification="Software Flag"
        />
        <MetricCard
          label="Touchdown Debounce Window"
          value={landingCfg.confirmationDurationSec}
          unit="sec"
          sublabel="Consecutive Stable Samples"
          trend="Prevents False Landing in Gusts"
          status="nominal"
          classification="Persistence Filter"
        />
        <MetricCard
          label="Vertical Velocity Cutoff"
          value={`< ${landingCfg.verticalVelocityThresholdMs}`}
          unit="m/s"
          sublabel="dz/dt Equilibrium Check"
          status="nominal"
          classification="Altimetry Threshold"
        />
        <MetricCard
          label="Acoustic Piezo Locator"
          value={landingCfg.buzzerFrequencyHz}
          unit="Hz"
          sublabel="Target Sound Pressure: ≥ 85 dBA"
          status="nominal"
          classification="PK-20A38PQ Spec"
        />
      </div>

      {/* Configuration Form & Algorithm Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Landing Detection Thresholds
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Vertical Velocity Limit (m/s)</label>
              <input
                type="number"
                step="0.1"
                value={landingCfg.verticalVelocityThresholdMs}
                onChange={(e) =>
                  handleUpdateConfig('verticalVelocityThresholdMs', parseFloat(e.target.value) || 0.5)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Altitude Delta Window (m)</label>
              <input
                type="number"
                step="0.2"
                value={landingCfg.altitudeDeltaThresholdM}
                onChange={(e) =>
                  handleUpdateConfig('altitudeDeltaThresholdM', parseFloat(e.target.value) || 1.0)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Debounce Persistence (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={landingCfg.confirmationDurationSec}
                onChange={(e) =>
                  handleUpdateConfig('confirmationDurationSec', parseFloat(e.target.value) || 3.0)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Beacon Activation Delay (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={landingCfg.beaconActivationDelaySec}
                onChange={(e) =>
                  handleUpdateConfig('beaconActivationDelaySec', parseFloat(e.target.value) || 2.0)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <label className="flex items-center gap-2 pt-2 border-t border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={landingCfg.requireGpsStability}
                onChange={(e) => handleUpdateConfig('requireGpsStability', e.target.checked)}
                className="rounded text-cyan-500"
              />
              <span className="text-slate-300">
                Require GPS horizontal ground speed &lt; 0.8 knots as secondary confirmation
              </span>
            </label>
          </div>
        </div>

        {/* Algorithm Flow & Recovery Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">
              Autonomous Fused Landing Detection State Logic
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              The landing detection algorithm uses triple-criteria sensor fusion with strict debounce persistence
              to prevent turbulent atmospheric updrafts from falsely declaring landing:
            </p>
            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">1. Vertical Velocity:</span> |dz/dt| &lt; {landingCfg.verticalVelocityThresholdMs} m/s continuously
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">2. Altimeter Stability:</span> Peak-to-peak barometric variation Δh &lt; {landingCfg.altitudeDeltaThresholdM} m
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">3. Accelerometer Baseline:</span> Magnitude |a| = 1.00 ± 0.05 G (stationary ground gravity)
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">4. Persistence Guard:</span> All 3 conditions must remain TRUE for ≥ {landingCfg.confirmationDurationSec}s before shifting to RECOVERY_MODE.
              </div>
            </div>
          </div>

          {/* Recovery Field Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-semibold text-white">
                Field Recovery & Post-Flight Inspection Logs
              </h3>
              <button
                onClick={() => setIsAddingLog(true)}
                className="px-2.5 py-1 text-xs bg-cyan-400 text-slate-950 font-medium rounded hover:bg-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Recovery</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <th className="py-2 px-2.5">ID</th>
                    <th className="py-2 px-2.5">Timestamp</th>
                    <th className="py-2 px-2.5">GPS Coordinates</th>
                    <th className="py-2 px-2.5">Buzzer Heard</th>
                    <th className="py-2 px-2.5">Streamer Visible</th>
                    <th className="py-2 px-2.5">Structure Condition</th>
                    <th className="py-2 px-2.5">Payload Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {projectData.recoveryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-2.5 text-cyan-400 font-bold">{log.id}</td>
                      <td className="py-2 px-2.5 text-slate-400">{log.landingTimestamp}</td>
                      <td className="py-2 px-2.5 text-slate-200">{log.finalGpsCoords}</td>
                      <td className="py-2 px-2.5 text-emerald-400">{log.beaconAudibleDistanceM} m</td>
                      <td className="py-2 px-2.5 text-slate-300">{log.visualStreamerSpotted ? 'YES' : 'NO'}</td>
                      <td className="py-2 px-2.5 text-slate-300">{log.structuralCondition}</td>
                      <td className="py-2 px-2.5 text-emerald-400">{log.payloadIntegrity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Recovery Log Modal */}
      {isAddingLog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add Recovery Mission Record</span>
              <button onClick={() => setIsAddingLog(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Final GPS Coordinates</label>
                <input
                  type="text"
                  value={newLog.finalGpsCoords}
                  onChange={(e) => setNewLog({ ...newLog, finalGpsCoords: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Final Altitude (m)</label>
                  <input
                    type="number"
                    value={newLog.finalAltitudeM}
                    onChange={(e) => setNewLog({ ...newLog, finalAltitudeM: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Audible Range (m)</label>
                  <input
                    type="number"
                    value={newLog.beaconAudibleDistanceM || 100}
                    onChange={(e) => setNewLog({ ...newLog, beaconAudibleDistanceM: parseFloat(e.target.value) || 100 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Structural Condition Post-Touchdown</label>
                <input
                  type="text"
                  value={newLog.structuralCondition}
                  onChange={(e) => setNewLog({ ...newLog, structuralCondition: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Field Recovery Notes</label>
                <input
                  type="text"
                  value={newLog.notes}
                  onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingLog(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLog}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
