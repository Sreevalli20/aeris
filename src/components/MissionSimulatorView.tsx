import React, { useState, useEffect, useRef } from 'react';
import { MissionState, TelemetryPacket } from '../types/aeris';
import { MissionSimulator, SimulatorConfig } from '../simulator/missionSimulator';
import { MetricCard } from './ui/MetricCard';
import { Play, Pause, RotateCcw, FastForward, Activity, AlertTriangle, ShieldCheck, Compass } from 'lucide-react';

interface Props {
  simulator: MissionSimulator;
  onPacketGenerated: (packet: TelemetryPacket, groundReceived: boolean) => void;
  onResetSimulation: () => void;
}

const STATE_ORDER: MissionState[] = [
  'SAFE_OFF',
  'PRE_LAUNCH',
  'ARMED',
  'DEPLOYMENT_DETECTED',
  'CONTROLLED_DESCENT',
  'LOW_ALTITUDE',
  'LANDING_DETECTED',
  'RECOVERY_MODE',
  'MISSION_COMPLETE',
];

export const MissionSimulatorView: React.FC<Props> = ({
  simulator,
  onPacketGenerated,
  onResetSimulation,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [simConfig, setSimConfig] = useState<SimulatorConfig>({
    deploymentAltitudeM: 500,
    descentVelocityMs: 6.12,
    simulationTickMs: 1000,
    seed: 42,
    packetDropRatePct: 0,
    injectSensorFault: false,
    injectLowBattery: false,
    velocityLandingThresholdMs: 0.5,
    altitudeDeltaThresholdM: 1.0,
    landingDebounceSec: 3.0,
  });

  const [latestPacket, setLatestPacket] = useState<TelemetryPacket | null>(null);
  const [currentState, setCurrentState] = useState<MissionState>(simulator.getState());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    simulator.updateConfig(simConfig);
  }, [simConfig, simulator]);

  useEffect(() => {
    if (isRunning) {
      const intervalMs = Math.max(50, Math.round(1000 / speedMultiplier));
      timerRef.current = setInterval(() => {
        const { packet, groundReceived } = simulator.step();
        setLatestPacket(packet);
        setCurrentState(packet.missionState);
        onPacketGenerated(packet, groundReceived);

        if (packet.missionState === 'MISSION_COMPLETE') {
          setIsRunning(false);
          clearInterval(timerRef.current);
        }
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, speedMultiplier, simulator, onPacketGenerated]);

  const handleStart = () => {
    if (currentState === 'SAFE_OFF') {
      simulator.setState('PRE_LAUNCH');
      setCurrentState('PRE_LAUNCH');
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    simulator.reset();
    setCurrentState('SAFE_OFF');
    setLatestPacket(null);
    onResetSimulation();
  };

  const handleArmAndDeploy = () => {
    simulator.setState('ARMED');
    setCurrentState('ARMED');
    setTimeout(() => {
      simulator.setState('DEPLOYMENT_DETECTED');
      setCurrentState('DEPLOYMENT_DETECTED');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            Deterministic Mission Simulator & State Machine
          </h2>
          <p className="text-xs text-slate-400">
            Hardware-in-the-loop physics engine modeling drone release at 500m AGL, atmospheric pressure lapse, and landing debounce.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handlePause}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Sim</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentState === 'SAFE_OFF' ? 'Start Sim' : 'Resume'}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Speed Selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-1 rounded transition-colors ${
                  speedMultiplier === spd ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulated Data Watermark Banner */}
      <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 flex items-center justify-between text-xs text-amber-300 font-mono">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>DATA CLASSIFICATION: [EXPLICIT DETERMINISTIC SIMULATION]</span>
        </div>
        <span className="text-[11px] text-amber-400/80">
          This telemetry stream is generated by mathematical equations, not live flight hardware.
        </span>
      </div>

      {/* State Machine Visual Progression Ribbon (SVG Diagram) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="text-sm font-semibold text-white">
            Mission State Machine Progression (AERIS-1 GNC Transitions)
          </span>
          <span className="text-xs font-mono text-cyan-400">
            Active: {currentState}
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-[760px] justify-between">
            {STATE_ORDER.map((st, idx) => {
              const isCurrent = currentState === st;
              const isPast = STATE_ORDER.indexOf(currentState) > idx;

              return (
                <div key={st} className="flex items-center flex-1">
                  <div
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all flex-1 ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : isPast
                        ? 'bg-slate-950 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] font-mono tracking-wider">
                      STAGE 0{idx + 1}
                    </div>
                    <div className="text-xs font-bold font-mono mt-0.5 truncate max-w-[100px]">
                      {st.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {idx < STATE_ORDER.length - 1 && (
                    <div
                      className={`h-0.5 w-4 shrink-0 transition-colors ${
                        isPast ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Transition Injection Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">Manual State Overrides:</span>
          <button
            onClick={() => { simulator.setState('ARMED'); setCurrentState('ARMED'); }}
            className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 font-mono"
          >
            Force Arm
          </button>
          <button
            onClick={handleArmAndDeploy}
            className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 font-mono"
          >
            Trigger 500m Deployment
          </button>
          <button
            onClick={() => { simulator.setState('LANDING_DETECTED'); setCurrentState('LANDING_DETECTED'); }}
            className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 font-mono"
          >
            Simulate Touchdown
          </button>
          <button
            onClick={() => { simulator.setState('RECOVERY_MODE'); setCurrentState('RECOVERY_MODE'); }}
            className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded font-mono"
          >
            Acoustic Recovery Mode
          </button>
        </div>
      </div>

      {/* Live Simulation Telemetry Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Current Altitude (Barometric)"
          value={latestPacket ? latestPacket.barometricAltitudeM.toFixed(1) : '0.0'}
          unit="m"
          sublabel={latestPacket ? `GPS Alt: ${latestPacket.gpsAltitudeM.toFixed(1)} m` : 'Pre-launch'}
          status="nominal"
          classification="Sim Model"
        />
        <MetricCard
          label="Vertical Velocity"
          value={latestPacket ? latestPacket.verticalVelocityMs.toFixed(2) : '0.00'}
          unit="m/s"
          sublabel="Descent Sink Rate"
          trend={latestPacket && latestPacket.verticalVelocityMs < -8.0 ? 'Rapid Descent' : 'Controlled'}
          status={latestPacket && latestPacket.verticalVelocityMs < -8.0 ? 'alert' : 'nominal'}
          classification="dz/dt"
        />
        <MetricCard
          label="Atmospheric Pressure"
          value={latestPacket ? latestPacket.pressureHpa.toFixed(1) : '1013.2'}
          unit="hPa"
          sublabel={latestPacket ? `Temp: ${latestPacket.temperatureC.toFixed(1)} °C` : 'Sea Level'}
          status="neutral"
          classification="ISA Model"
        />
        <MetricCard
          label="Battery Voltage & RF RSSI"
          value={latestPacket ? latestPacket.batteryVoltageV.toFixed(2) : '4.18'}
          unit="V"
          sublabel={latestPacket ? `RSSI: ${latestPacket.rfRssiDbm} dBm` : 'Nominal'}
          status={latestPacket && latestPacket.batteryVoltageV < 3.5 ? 'alert' : 'nominal'}
          classification="Load Curve"
        />
      </div>

      {/* Simulation Configuration & Fault Injection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Physical Flight Parameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Simulation Flight Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Carrier Drone Deployment Altitude (m AGL)</label>
              <input
                type="number"
                step="25"
                value={simConfig.deploymentAltitudeM}
                onChange={(e) =>
                  setSimConfig({ ...simConfig, deploymentAltitudeM: parseFloat(e.target.value) || 500 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nominal Descent Velocity (m/s)</label>
              <input
                type="number"
                step="0.1"
                value={simConfig.descentVelocityMs}
                onChange={(e) =>
                  setSimConfig({ ...simConfig, descentVelocityMs: parseFloat(e.target.value) || 6.12 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Pseudo-Random Generator Seed</label>
              <input
                type="number"
                value={simConfig.seed}
                onChange={(e) => setSimConfig({ ...simConfig, seed: parseInt(e.target.value) || 42 })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">Fixed seed for deterministic, repeatable runs</span>
            </div>
          </div>
        </div>

        {/* Landing Detection Filter Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Landing Detection Thresholds & Debounce
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Vertical Velocity Landing Threshold (m/s)</label>
              <input
                type="number"
                step="0.1"
                value={simConfig.velocityLandingThresholdMs}
                onChange={(e) =>
                  setSimConfig({ ...simConfig, velocityLandingThresholdMs: parseFloat(e.target.value) || 0.5 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">|dz/dt| must remain below this value</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Confirmation Persistence Duration (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={simConfig.landingDebounceSec}
                onChange={(e) =>
                  setSimConfig({ ...simConfig, landingDebounceSec: parseFloat(e.target.value) || 3.0 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">
                Number of consecutive stable 1Hz samples before state transition
              </span>
            </div>
          </div>
        </div>

        {/* Fault Injection Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Failure Mode & Fault Injections
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <div className="flex justify-between mb-1">
                <span>RF Packet Drop Injection Rate:</span>
                <span className="font-mono text-cyan-400 font-bold">{simConfig.packetDropRatePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={simConfig.packetDropRatePct}
                onChange={(e) =>
                  setSimConfig({ ...simConfig, packetDropRatePct: parseInt(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
              <span className="text-[11px] text-slate-500">Tests data loss & CRC integrity recovery</span>
            </div>

            <label className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={simConfig.injectSensorFault}
                onChange={(e) => setSimConfig({ ...simConfig, injectSensorFault: e.target.checked })}
                className="rounded text-cyan-500"
              />
              <div>
                <div className="font-semibold text-slate-200">Inject Sensor Glitch / Fault</div>
                <div className="text-[11px] text-slate-500">Injects spike in pressure/temperature sensor readings</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={simConfig.injectLowBattery}
                onChange={(e) => setSimConfig({ ...simConfig, injectLowBattery: e.target.checked })}
                className="rounded text-cyan-500"
              />
              <div>
                <div className="font-semibold text-slate-200">Trigger Low Battery Brownout</div>
                <div className="text-[11px] text-slate-500">Drops voltage below 3.4V to test safe-state shutdown</div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
