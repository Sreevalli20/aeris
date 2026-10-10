import React, { useState } from 'react';
import { TelemetryPacket } from '../types/aeris';
import { calculateCrc16Ccitt } from '../engine/aerisMath';
import { exportTableToCsv } from '../engine/storage';
import { MetricCard } from './ui/MetricCard';
import { FileCode, AlertCircle, CheckCircle2, Upload, Download, RefreshCw, Layers } from 'lucide-react';

interface Props {
  onboardPackets: TelemetryPacket[];
  groundPackets: TelemetryPacket[];
  onImportPackets?: (packets: TelemetryPacket[]) => void;
}

export interface IntegrityReport {
  totalReceived: number;
  expectedPackets: number;
  duplicateCount: number;
  missingSeqCount: number;
  crcErrorCount: number;
  invalidRangeCount: number;
  outOfOrderCount: number;
  packetLossPct: number;
  anomalies: string[];
}

export const TelemetryPacketEngine: React.FC<Props> = ({
  onboardPackets,
  groundPackets,
  onImportPackets,
}) => {
  const [selectedLogSource, setSelectedLogSource] = useState<'ground' | 'onboard'>('ground');
  const [manualPacketInput, setManualPacketInput] = useState<string>('');
  const [parsedManualResult, setParsedManualResult] = useState<any>(null);

  const activePackets = selectedLogSource === 'ground' ? groundPackets : onboardPackets;

  // Perform full integrity audit on active packet stream
  const analyzeIntegrity = (packets: TelemetryPacket[]): IntegrityReport => {
    if (packets.length === 0) {
      return {
        totalReceived: 0,
        expectedPackets: 0,
        duplicateCount: 0,
        missingSeqCount: 0,
        crcErrorCount: 0,
        invalidRangeCount: 0,
        outOfOrderCount: 0,
        packetLossPct: 0,
        anomalies: [],
      };
    }

    const seenIds = new Set<number>();
    let duplicateCount = 0;
    let crcErrorCount = 0;
    let invalidRangeCount = 0;
    let outOfOrderCount = 0;
    const anomalies: string[] = [];

    const minId = packets[0].packetId;
    const maxId = packets[packets.length - 1].packetId;
    const expectedPackets = Math.max(packets.length, maxId - minId + 1);

    let lastSeq = -1;

    for (const pkt of packets) {
      // 1. Duplicate check
      if (seenIds.has(pkt.packetId)) {
        duplicateCount++;
        anomalies.push(`Duplicate Packet ID #${pkt.packetId} detected`);
      } else {
        seenIds.add(pkt.packetId);
      }

      // 2. Out of order check
      if (lastSeq !== -1 && pkt.packetId < lastSeq) {
        outOfOrderCount++;
        anomalies.push(`Out of sequence: Packet #${pkt.packetId} followed #${lastSeq}`);
      }
      lastSeq = pkt.packetId;

      // 3. Sensor range plausibility validation
      if (pkt.pressureHpa < 300 || pkt.pressureHpa > 1100) {
        invalidRangeCount++;
        anomalies.push(`Packet #${pkt.packetId}: Pressure ${pkt.pressureHpa} hPa outside realistic atmospheric range [300, 1100]`);
      }
      if (pkt.temperatureC < -30 || pkt.temperatureC > 70) {
        invalidRangeCount++;
        anomalies.push(`Packet #${pkt.packetId}: Temperature ${pkt.temperatureC} °C outside operating limits`);
      }
      if (pkt.batteryVoltageV < 2.5 || pkt.batteryVoltageV > 4.5) {
        invalidRangeCount++;
        anomalies.push(`Packet #${pkt.packetId}: Battery voltage ${pkt.batteryVoltageV} V out of bounds`);
      }

      // 4. CRC verification
      const rawDataStr = `ID=${pkt.packetId};ST=${pkt.missionState};ALT=${pkt.barometricAltitudeM};P=${pkt.pressureHpa};T=${pkt.temperatureC};V=${pkt.verticalVelocityMs.toFixed(2)};BATT=${pkt.batteryVoltageV}`;
      const expectedCrc = calculateCrc16Ccitt(rawDataStr);
      if (pkt.crc16 !== expectedCrc) {
        crcErrorCount++;
        anomalies.push(`CRC Checksum mismatch on Packet #${pkt.packetId}: Recv 0x${pkt.crc16.toString(16)}, Calc 0x${expectedCrc.toString(16)}`);
      }
    }

    const missingSeqCount = Math.max(0, expectedPackets - seenIds.size);
    const packetLossPct = expectedPackets > 0 ? (missingSeqCount / expectedPackets) * 100 : 0;

    return {
      totalReceived: packets.length,
      expectedPackets,
      duplicateCount,
      missingSeqCount,
      crcErrorCount,
      invalidRangeCount,
      outOfOrderCount,
      packetLossPct,
      anomalies: anomalies.slice(0, 15),
    };
  };

  const integrity = analyzeIntegrity(activePackets);

  // Compare Ground Station vs Onboard Flash Log
  const groundIds = new Set(groundPackets.map((p) => p.packetId));
  const onboardIds = new Set(onboardPackets.map((p) => p.packetId));
  const missingFromGround = onboardPackets.filter((p) => !groundIds.has(p.packetId));

  const handleTestParseString = () => {
    try {
      // Expected format: ID=101;ST=CONTROLLED_DESCENT;ALT=412.5;P=965.2;T=25.4;V=-6.12;BATT=4.05
      const parts = manualPacketInput.split(';');
      const parsed: Record<string, string> = {};
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k && v) parsed[k.trim()] = v.trim();
      }

      const rawCrc = calculateCrc16Ccitt(manualPacketInput);
      setParsedManualResult({
        parsed,
        computedCrc: `0x${rawCrc.toString(16).toUpperCase()}`,
        status: parsed.ID && parsed.ALT ? 'Valid Structure' : 'Missing Fields',
      });
    } catch (err: any) {
      setParsedManualResult({ error: err.message });
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Packet ID',
      'Timestamp (ms)',
      'ISO Time',
      'Mission State',
      'Baro Alt (m)',
      'GPS Lat',
      'GPS Lon',
      'GPS Alt (m)',
      'Pressure (hPa)',
      'Temp (C)',
      'Humidity (%)',
      'Air Quality VOC',
      'Vert Velocity (m/s)',
      'Accel (G)',
      'Battery (V)',
      'RSSI (dBm)',
      'SNR (dB)',
      'CRC16',
      'Simulated',
    ];

    const rows = activePackets.map((p) => [
      p.packetId,
      p.timestampMs,
      p.isoTime,
      p.missionState,
      p.barometricAltitudeM,
      p.gpsLatitude,
      p.gpsLongitude,
      p.gpsAltitudeM,
      p.pressureHpa,
      p.temperatureC,
      p.humidityPct,
      p.rawAirQualityVoc,
      p.verticalVelocityMs,
      p.accelerationG,
      p.batteryVoltageV,
      p.rfRssiDbm,
      p.rfSnrDb,
      `0x${p.crc16.toString(16)}`,
      p.isSimulated ? 'YES' : 'NO',
    ]);

    exportTableToCsv(`AERIS1_Telemetry_${selectedLogSource}_Log.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            Telemetry Packet Schema & Data Integrity Engine
          </h2>
          <p className="text-xs text-slate-400">
            Documented 64-byte framing, CRC-16-CCITT polynomial validation, and Ground Station vs Onboard Log reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setSelectedLogSource('ground')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedLogSource === 'ground' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
              }`}
            >
              Ground Station Log ({groundPackets.length})
            </button>
            <button
              onClick={() => setSelectedLogSource('onboard')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedLogSource === 'onboard' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
              }`}
            >
              Onboard Flash Log ({onboardPackets.length})
            </button>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={activePackets.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Telemetry Packets Logged"
          value={activePackets.length}
          unit="frames"
          sublabel={`Source: ${selectedLogSource === 'ground' ? 'RF Receiver' : 'SPI Flash'}`}
          status="neutral"
          classification="Stream Count"
        />
        <MetricCard
          label="Packet Loss Percentage"
          value={integrity.packetLossPct.toFixed(2)}
          unit="%"
          sublabel={`Missing Frames: ${integrity.missingSeqCount} / ${integrity.expectedPackets}`}
          trend={integrity.packetLossPct < 2.0 ? 'Compliant (< 2.0% Req)' : 'EXCEEDS PACKET LOSS LIMIT'}
          status={integrity.packetLossPct < 2.0 ? 'nominal' : 'alert'}
          classification="Loss = ΔSeq / Total"
        />
        <MetricCard
          label="CRC-16 Error Count"
          value={integrity.crcErrorCount}
          unit="faults"
          sublabel="Polynomial: 0x1021 CCITT"
          trend={integrity.crcErrorCount === 0 ? 'Zero Frame Corruptions' : 'Checksum Violations'}
          status={integrity.crcErrorCount === 0 ? 'nominal' : 'alert'}
          classification="16-Bit Checksum"
        />
        <MetricCard
          label="Sequence Anomalies"
          value={integrity.duplicateCount + integrity.outOfOrderCount}
          unit="anomalies"
          sublabel={`Dup: ${integrity.duplicateCount} · Out of Order: ${integrity.outOfOrderCount}`}
          status={integrity.duplicateCount + integrity.outOfOrderCount === 0 ? 'nominal' : 'warning'}
          classification="Sequence Parser"
        />
      </div>

      {/* Ground Station vs Onboard Flash Log Comparison Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Ground Station vs Onboard Flash Log Reconciliation
            </h3>
            <p className="text-xs text-slate-400">
              Verifies whether RF dropouts during descent are safely captured on the redundant non-volatile flight computer storage.
            </p>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-slate-400">Ground: </span>
            <span className="text-cyan-400 font-bold">{groundPackets.length}</span>
            <span className="text-slate-400"> | Onboard: </span>
            <span className="text-emerald-400 font-bold">{onboardPackets.length}</span>
          </div>
        </div>

        {missingFromGround.length > 0 ? (
          <div className="bg-amber-950/40 border border-amber-600/40 rounded p-3 text-xs text-amber-200">
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>RF Telemetry Gaps Recovered from Onboard Flash: {missingFromGround.length} Packets</span>
            </div>
            <p className="text-[11px] text-amber-300">
              The following packet IDs were dropped over the RF link due to distance/multipath fading but successfully recovered from internal storage:
              {' '}
              <span className="font-mono font-bold">
                {missingFromGround.slice(0, 10).map((p) => `#${p.packetId}`).join(', ')}
                {missingFromGround.length > 10 ? ` and ${missingFromGround.length - 10} more` : ''}
              </span>
            </p>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-600/40 rounded p-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              100% Data Integrity Reconciliation: All packets recorded in onboard flash were received cleanly by the ground station radio.
            </span>
          </div>
        )}
      </div>

      {/* Documented Schema Definition & Parser Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documented Binary/ASCII Schema Specification */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800 mb-3">
            AERIS-1 Telemetry Packet Specification (Format Spec V1.2)
          </h3>
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 00–03:</span> Packet Sequence ID (uint32_t, big-endian)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 04–07:</span> Mission Elapsed Time in ms (uint32_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 08–08:</span> Mission State Machine Enum (uint8_t: 0=OFF..8=DONE)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 09–16:</span> GNSS Lat & Lon (float32_t × 2, microdegrees)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 17–20:</span> Barometric Altitude (float32_t, 0.1m res)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 21–24:</span> Pressure in hPa (float32_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 25–26:</span> Temperature in 0.01 °C (int16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 27–28:</span> Relative Humidity in 0.1 % (uint16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 29–30:</span> Raw VOC Gas Sensor ADC (uint16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 31–32:</span> Vertical Velocity in 0.01 m/s (int16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 33–34:</span> Battery Voltage in mV (uint16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Byte 35–36:</span> Error Flags Bitmask (uint16_t)
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-emerald-400 font-bold">Byte 37–38:</span> CRC-16-CCITT Checksum (uint16_t, Poly: 0x1021)
            </div>
          </div>
        </div>

        {/* Live Packet Parser & CRC Sandbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-slate-800">
            Interactive Telemetry String & CRC-16 Tester
          </h3>
          <p className="text-xs text-slate-400">
            Test string parser with arbitrary frame values or paste sample data from radio receiver terminal.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="ID=42;ST=CONTROLLED_DESCENT;ALT=342.1;P=972.4;T=24.8;V=-6.15;BATT=3.95"
              value={manualPacketInput}
              onChange={(e) => setManualPacketInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleTestParseString}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Compute CRC-16 & Parse
              </button>
              <button
                onClick={() =>
                  setManualPacketInput(
                    'ID=101;ST=CONTROLLED_DESCENT;ALT=480.0;P=958.2;T=24.88;V=-6.12;BATT=4.12'
                  )
                }
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 font-mono"
              >
                Load Sample Frame
              </button>
            </div>

            {parsedManualResult && (
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono space-y-1">
                {parsedManualResult.error ? (
                  <div className="text-rose-400">Error: {parsedManualResult.error}</div>
                ) : (
                  <>
                    <div className="text-emerald-400 font-bold">
                      Calculated CRC-16-CCITT: {parsedManualResult.computedCrc}
                    </div>
                    <div className="text-slate-400">Status: {parsedManualResult.status}</div>
                    <pre className="text-[11px] text-slate-300 mt-2 bg-slate-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(parsedManualResult.parsed, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
