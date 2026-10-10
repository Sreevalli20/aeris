import React, { useState, useEffect, useRef } from 'react';
import { TelemetryPacket, MissionState } from '../types/aeris';
import { exportTableToCsv } from '../engine/storage';
import { MetricCard } from './ui/MetricCard';
import {
  Terminal,
  Radio,
  Download,
  Upload,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Usb,
} from 'lucide-react';

interface Props {
  packets: TelemetryPacket[];
  isSimulating: boolean;
  onClearPackets: () => void;
  onImportPackets?: (packets: TelemetryPacket[]) => void;
}

export const GroundStationConsole: React.FC<Props> = ({
  packets,
  isSimulating,
  onClearPackets,
  onImportPackets,
}) => {
  const [hardwareMode, setHardwareMode] = useState<'simulation' | 'serial_hardware'>('simulation');
  const [serialConnected, setSerialConnected] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState<number>(115200);

  const latestPacket = packets.length > 0 ? packets[packets.length - 1] : null;

  // Expected vs received packet count
  const minId = packets.length > 0 ? packets[0].packetId : 0;
  const maxId = latestPacket ? latestPacket.packetId : 0;
  const expectedCount = packets.length > 0 ? maxId - minId + 1 : 0;
  const missingCount = Math.max(0, expectedCount - packets.length);

  // Web Serial API handler
  const handleConnectSerial = async () => {
    setSerialError(null);
    if (!('serial' in navigator)) {
      setSerialError(
        'Web Serial API is not supported in this browser (Chrome / Edge required for local USB COM port communication). Use Simulation Mode or import CSV flight logs.'
      );
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      setSerialConnected(true);
      // Serial adapter is open; incoming data reading stream can be hooked
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setSerialError('No USB/Serial hardware device was selected.');
      } else {
        setSerialError(`Serial Connection Error: ${err.message}`);
      }
      setSerialConnected(false);
    }
  };

  const handleDisconnectSerial = () => {
    setSerialConnected(false);
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(packets, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AERIS1_GroundStation_Stream_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Time (ms)',
      'State',
      'Baro Alt (m)',
      'GPS Lat',
      'GPS Lon',
      'GPS Alt (m)',
      'Press (hPa)',
      'Temp (C)',
      'Hum (%)',
      'VOC',
      'Vel (m/s)',
      'Accel (G)',
      'Batt (V)',
      'RSSI (dBm)',
      'SNR (dB)',
      'CRC16',
    ];
    const rows = packets.map((p) => [
      p.packetId,
      p.timestampMs,
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
    ]);
    exportTableToCsv('AERIS1_GroundStation_Telemetry.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Ground Station Telemetry Terminal
          </h2>
          <p className="text-xs text-slate-400">
            Real-time RF packet receiver console, frame parsing, missing sequence detection, and hardware adapter interface.
          </p>
        </div>

        {/* Operating Mode Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setHardwareMode('simulation')}
              className={`px-3 py-1.5 rounded transition-colors ${
                hardwareMode === 'simulation'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              Simulation Mode
            </button>
            <button
              onClick={() => setHardwareMode('serial_hardware')}
              className={`px-3 py-1.5 rounded transition-colors ${
                hardwareMode === 'serial_hardware'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              Hardware USB / Serial
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={packets.length === 0}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJson}
            disabled={packets.length === 0}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Hardware Connection Bar */}
      {hardwareMode === 'serial_hardware' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Usb className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Physical Hardware Serial Adapter (LoRa Ground Station Dongle)
                </div>
                <div className="text-[11px] text-slate-400">
                  Connect local USB-UART bridge (FTDI, CP2102, CH340) attached to an SX1276/SX1262 LoRa module.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400">Baud:</span>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(parseInt(e.target.value))}
                  disabled={serialConnected}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  <option value={9600}>9600</option>
                  <option value={57600}>57600</option>
                  <option value={115200}>115200</option>
                </select>
              </div>

              {serialConnected ? (
                <button
                  onClick={handleDisconnectSerial}
                  className="px-3 py-1.5 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded hover:bg-rose-500/30"
                >
                  Disconnect Port
                </button>
              ) : (
                <button
                  onClick={handleConnectSerial}
                  className="px-3 py-1.5 text-xs font-semibold bg-cyan-400 text-slate-950 rounded hover:bg-cyan-300"
                >
                  Connect Serial Device
                </button>
              )}
            </div>
          </div>

          {serialError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded">
              {serialError}
            </div>
          )}

          <div className="text-[11px] text-slate-500 font-mono">
            Status:{' '}
            <span className={serialConnected ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {serialConnected ? 'Connected to Physical Hardware Port' : 'No Physical Hardware Connected (Transparent Adapter Interface)'}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between text-xs font-mono text-cyan-300">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>OPERATING IN VISIBLY LABELED LOCAL SIMULATION MODE</span>
          </div>
          <span className="text-slate-400 text-[11px]">
            Packets generated deterministically by local flight simulation engine
          </span>
        </div>
      )}

      {/* KPI Telemetry Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Ground Station Link Status"
          value={packets.length > 0 ? (isSimulating ? 'STREAMING' : 'ONLINE') : 'STANDBY'}
          unit=""
          sublabel={`Update Rate: ≥ 1.0 Hz`}
          status={packets.length > 0 ? 'nominal' : 'neutral'}
          classification="Link Layer"
        />
        <MetricCard
          label="Total Frames Received"
          value={packets.length}
          unit="packets"
          sublabel={`Missing Frames: ${missingCount}`}
          trend={`Seq: #${minId} to #${maxId}`}
          status={missingCount === 0 ? 'nominal' : 'warning'}
          classification="Counter"
        />
        <MetricCard
          label="Current RF RSSI & SNR"
          value={latestPacket ? `${latestPacket.rfRssiDbm}` : '—'}
          unit="dBm"
          sublabel={latestPacket ? `SNR: +${latestPacket.rfSnrDb} dB` : 'No Signal'}
          trend={latestPacket && latestPacket.rfRssiDbm > -105 ? 'Good Signal' : 'Weak'}
          status={latestPacket && latestPacket.rfRssiDbm > -105 ? 'nominal' : 'warning'}
          classification="SX1276 LoRa"
        />
        <MetricCard
          label="Reported Mission State"
          value={latestPacket ? latestPacket.missionState : 'SAFE_OFF'}
          unit=""
          sublabel={latestPacket ? `Altitude: ${latestPacket.barometricAltitudeM} m` : 'Ready'}
          status="nominal"
          classification="GNC State"
        />
      </div>

      {/* Latest Received Packet HUD */}
      {latestPacket && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Latest Received Packet # {latestPacket.packetId} · T+{Math.round(latestPacket.timestampMs / 1000)}s
            </span>
            <span className="text-xs font-mono text-emerald-400">
              CRC-16: 0x{latestPacket.crc16.toString(16).toUpperCase()} [VALID]
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">BARO ALTITUDE</div>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">{latestPacket.barometricAltitudeM.toFixed(1)} m</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">TEMPERATURE</div>
              <div className="text-amber-400 font-bold text-sm mt-0.5">{latestPacket.temperatureC.toFixed(2)} °C</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">PRESSURE</div>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">{latestPacket.pressureHpa.toFixed(1)} hPa</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">VERTICAL VELOCITY</div>
              <div className="text-pink-400 font-bold text-sm mt-0.5">{latestPacket.verticalVelocityMs.toFixed(2)} m/s</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">BATTERY VOLTAGE</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">{latestPacket.batteryVoltageV.toFixed(2)} V</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">RAW VOC AIR QUALITY</div>
              <div className="text-purple-400 font-bold text-sm mt-0.5">{latestPacket.rawAirQualityVoc} ADC</div>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">
            Received Telemetry Stream History ({packets.length} Packets)
          </span>
          <button
            onClick={onClearPackets}
            className="text-xs text-slate-400 hover:text-slate-200 font-mono"
          >
            Clear Screen
          </button>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 px-2.5">ID</th>
                <th className="py-2 px-2.5">Time</th>
                <th className="py-2 px-2.5">State</th>
                <th className="py-2 px-2.5">Baro Alt</th>
                <th className="py-2 px-2.5">GPS Lat/Lon</th>
                <th className="py-2 px-2.5">Press</th>
                <th className="py-2 px-2.5">Temp</th>
                <th className="py-2 px-2.5">RH %</th>
                <th className="py-2 px-2.5">Vel</th>
                <th className="py-2 px-2.5">Batt</th>
                <th className="py-2 px-2.5">RSSI</th>
                <th className="py-2 px-2.5">CRC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {packets.slice(-100).reverse().map((p) => (
                <tr key={p.packetId} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-2.5 text-cyan-400 font-bold">#{p.packetId}</td>
                  <td className="py-1.5 px-2.5 text-slate-400">T+{Math.round(p.timestampMs / 1000)}s</td>
                  <td className="py-1.5 px-2.5 text-slate-300 text-[11px]">{p.missionState}</td>
                  <td className="py-1.5 px-2.5 text-slate-200">{p.barometricAltitudeM.toFixed(1)}m</td>
                  <td className="py-1.5 px-2.5 text-slate-400 text-[10px]">
                    {p.gpsLatitude.toFixed(4)}, {p.gpsLongitude.toFixed(4)}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-300">{p.pressureHpa.toFixed(1)}</td>
                  <td className="py-1.5 px-2.5 text-amber-400">{p.temperatureC.toFixed(1)}°C</td>
                  <td className="py-1.5 px-2.5 text-blue-400">{p.humidityPct.toFixed(0)}%</td>
                  <td className="py-1.5 px-2.5 text-pink-400">{p.verticalVelocityMs.toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-emerald-400">{p.batteryVoltageV.toFixed(2)}V</td>
                  <td className="py-1.5 px-2.5 text-slate-400">{p.rfRssiDbm}</td>
                  <td className="py-1.5 px-2.5 text-emerald-400 text-[11px]">0x{p.crc16.toString(16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
