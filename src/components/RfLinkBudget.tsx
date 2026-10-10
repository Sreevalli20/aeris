import React from 'react';
import { AerisProjectData } from '../types/aeris';
import { calculateRfLinkBudget } from '../engine/aerisMath';
import { FormulaBox } from './ui/FormulaBox';
import { MetricCard } from './ui/MetricCard';
import { Radio, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const RfLinkBudget: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const rf = projectData.rfLinkConfig;

  const result = calculateRfLinkBudget(
    rf.frequencyMhz,
    rf.txPowerDbm,
    rf.txAntennaGainDbi,
    rf.rxAntennaGainDbi,
    rf.txCableLossDb,
    rf.rxCableLossDb,
    rf.rxSensitivityDbm,
    rf.implementationLossDb,
    rf.requiredFadeMarginDb,
    rf.slantDistanceM
  );

  const handleUpdate = <K extends keyof typeof rf>(key: K, value: typeof rf[K]) => {
    onUpdateData((prev) => ({
      ...prev,
      rfLinkConfig: {
        ...prev.rfLinkConfig,
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            RF Telemetry Link Budget & Friis Path Loss
          </h2>
          <p className="text-xs text-slate-400">
            Free-space path loss calculations, slant range evaluations (500m & 600m), and Indian WPC/DoT regulatory compliance.
          </p>
        </div>
      </div>

      {/* Real-World Limitations Disclaimer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex items-start gap-3 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <div className="font-semibold text-amber-400 uppercase font-mono">
            RF Propagation Limitations Notice
          </div>
          <div className="mt-1">
            Calculated link margins represent ideal line-of-sight (LOS) free-space conditions.
            In actual flight, antenna tilt angle during parachute oscillation, body shadowing by carbon-fiber bulkheads,
            1st Fresnel zone ground clearance, and urban RF noise significantly degrade reception. A minimum +10.0 dB fade margin is mandatory.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`Link Margin @ ${rf.slantDistanceM}m`}
          value={`${result.linkMarginDb >= 0 ? '+' : ''}${result.linkMarginDb.toFixed(1)}`}
          unit="dB"
          sublabel={`Rx Sensitivity: ${rf.rxSensitivityDbm} dBm`}
          trend={result.linkMarginDb >= 0 ? 'Viable Link (Positive Margin)' : 'LINK CLOSED / NEGATIVE'}
          status={result.linkMarginDb >= 0 ? 'nominal' : 'alert'}
          classification="Prx - Sens - Fade"
        />
        <MetricCard
          label="Received Signal Power (Prx)"
          value={result.rxPowerDbm.toFixed(1)}
          unit="dBm"
          sublabel={`FSPL: ${result.fsplDb.toFixed(1)} dB`}
          trend={`Tx: ${rf.txPowerDbm} dBm (${Math.pow(10, rf.txPowerDbm / 10).toFixed(0)} mW)`}
          status="neutral"
          classification="Friis Balance"
        />
        <MetricCard
          label="500m Target Evaluation"
          value={`${result.eval500m.linkMarginDb >= 0 ? '+' : ''}${result.eval500m.linkMarginDb.toFixed(1)}`}
          unit="dB"
          sublabel={`Prx: ${result.eval500m.rxPowerDbm} dBm`}
          trend={`FSPL: ${result.eval500m.fsplDb} dB`}
          status={result.eval500m.linkMarginDb >= 0 ? 'nominal' : 'alert'}
          classification="500m Slant AGL"
        />
        <MetricCard
          label="600m Target Evaluation"
          value={`${result.eval600m.linkMarginDb >= 0 ? '+' : ''}${result.eval600m.linkMarginDb.toFixed(1)}`}
          unit="dB"
          sublabel={`Prx: ${result.eval600m.rxPowerDbm} dBm`}
          trend={`FSPL: ${result.eval600m.fsplDb} dB`}
          status={result.eval600m.linkMarginDb >= 0 ? 'nominal' : 'alert'}
          classification="600m Slant AGL"
        />
      </div>

      {/* Form Controls & Formula Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RF Link Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Transceiver & Antenna Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Carrier Frequency (MHz)</label>
              <input
                type="number"
                step="0.1"
                value={rf.frequencyMhz}
                onChange={(e) => handleUpdate('frequencyMhz', parseFloat(e.target.value) || 865.5)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500">Selected Band: {rf.selectedBand}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Tx Power (dBm)</label>
                <input
                  type="number"
                  step="1"
                  value={rf.txPowerDbm}
                  onChange={(e) => handleUpdate('txPowerDbm', parseFloat(e.target.value) || 14)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Slant Range (m)</label>
                <input
                  type="number"
                  step="25"
                  value={rf.slantDistanceM}
                  onChange={(e) => handleUpdate('slantDistanceM', parseFloat(e.target.value) || 600)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Tx Antenna Gain (dBi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rf.txAntennaGainDbi}
                  onChange={(e) => handleUpdate('txAntennaGainDbi', parseFloat(e.target.value) || 2.15)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Rx Antenna Gain (dBi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rf.rxAntennaGainDbi}
                  onChange={(e) => handleUpdate('rxAntennaGainDbi', parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Rx Sensitivity (dBm)</label>
                <input
                  type="number"
                  step="1"
                  value={rf.rxSensitivityDbm}
                  onChange={(e) => handleUpdate('rxSensitivityDbm', parseFloat(e.target.value) || -118)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Fade Margin (dB)</label>
                <input
                  type="number"
                  step="1"
                  value={rf.requiredFadeMarginDb}
                  onChange={(e) => handleUpdate('requiredFadeMarginDb', parseFloat(e.target.value) || 10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Cable & Connector Loss (dB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rf.txCableLossDb + rf.rxCableLossDb}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 1.3;
                    handleUpdate('txCableLossDb', total / 2);
                    handleUpdate('rxCableLossDb', total / 2);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Implementation Loss (dB)</label>
                <input
                  type="number"
                  step="0.5"
                  value={rf.implementationLossDb}
                  onChange={(e) => handleUpdate('implementationLossDb', parseFloat(e.target.value) || 2.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Formula Box & Compliance */}
        <div className="lg:col-span-2 space-y-4">
          <FormulaBox
            title="FREE-SPACE PATH LOSS & LINK MARGIN"
            formula="FSPL = 32.44 + 20·log10(f_MHz) + 20·log10(d_km) | Margin = P_rx - Rx_sens - FadeMargin"
            variables={{
              'Frequency (f)': `${rf.frequencyMhz} MHz`,
              'Distance (d)': `${rf.slantDistanceM} m (${(rf.slantDistanceM / 1000).toFixed(3)} km)`,
              'Tx Power': `${rf.txPowerDbm} dBm`,
              'Gains (Tx+Rx)': `+${(rf.txAntennaGainDbi + rf.rxAntennaGainDbi).toFixed(2)} dBi`,
              'Total Losses': `-${(rf.txCableLossDb + rf.rxCableLossDb + rf.implementationLossDb).toFixed(1)} dB`,
              'FSPL': `${result.fsplDb.toFixed(2)} dB`,
            }}
            result={result.linkMarginDb >= 0 ? `+${result.linkMarginDb.toFixed(1)}` : `${result.linkMarginDb.toFixed(1)}`}
            resultUnit="dB (Net Link Margin)"
            limitations="Assumes isotropic free-space spherical wave spreading. Obstacles, ground reflections (2-ray multipath), and polarization mismatch are not modeled in free space."
          />

          {/* Indian WPC / DoT Regulatory Compliance Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Indian WPC / DoT License-Exempt Compliance Check
              </span>
              <span className="text-xs font-mono text-emerald-400">GSR 564(E) Standard</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In India, RF operations without an individual wireless telegraphy license are governed by Wireless Planning and Coordination (WPC)
              Gazette Notifications. Under GSR 564(E) and ETA exemptions:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-mono font-semibold text-cyan-400">865 – 867 MHz</div>
                <div className="text-slate-400 text-[11px] mt-1">
                  License-exempt for RFID/IoT up to 1 Watt (30 dBm) EIRP. Current config: {rf.txPowerDbm} dBm (25 mW).
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-mono font-semibold text-cyan-400">433.05 – 434.79 MHz</div>
                <div className="text-slate-400 text-[11px] mt-1">
                  License-exempt for low-power devices up to 10 mW (+10 dBm) EIRP with max 10% duty cycle.
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-mono font-semibold text-cyan-400">2400 – 2483.5 MHz</div>
                <div className="text-slate-400 text-[11px] mt-1">
                  License-exempt for low power equipment up to 100 mW (+20 dBm) in indoor/outdoor installations.
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rf.wpcComplianceAcknowledged}
                onChange={(e) => handleUpdate('wpcComplianceAcknowledged', e.target.checked)}
                className="rounded text-cyan-500"
              />
              <span>
                I acknowledge that the CanSat RF hardware operates strictly within the license-exempt power limits of the Indian WPC regulations and adheres to equipment type approval (ETA) requirements.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
