import React, { useState } from 'react';
import { TelemetryPacket } from '../types/aeris';
import { exportTableToCsv } from '../engine/storage';
import { MetricCard } from './ui/MetricCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { LineChart as ChartIcon, Download, Sliders, Database, Layers } from 'lucide-react';

interface Props {
  packets: TelemetryPacket[];
  onGenerateSampleDataset: () => void;
}

export const EnvironmentalDashboard: React.FC<Props> = ({
  packets,
  onGenerateSampleDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'thermo' | 'alt' | 'air' | 'power'>('thermo');
  const [plotMode, setPlotMode] = useState<'vs_time' | 'vs_alt'>('vs_time');

  const validCount = packets.filter((p) => p.pressureHpa > 0).length;
  const missingCount = packets.length - validCount;

  const chartData = packets.map((p, idx) => ({
    timeSec: Math.round(p.timestampMs / 1000),
    altitudeM: p.barometricAltitudeM,
    gpsAltitudeM: p.gpsAltitudeM,
    tempC: p.temperatureC,
    pressHpa: p.pressureHpa,
    humidityPct: p.humidityPct,
    rawVoc: p.rawAirQualityVoc,
    velocityMs: p.verticalVelocityMs,
    batteryV: p.batteryVoltageV,
    rssiDbm: p.rfRssiDbm,
    accelG: p.accelerationG,
    state: p.missionState,
  }));

  const handleExportCsv = () => {
    const headers = [
      'Time (s)',
      'Baro Alt (m)',
      'GPS Alt (m)',
      'Temperature (C)',
      'Pressure (hPa)',
      'Humidity (%)',
      'Raw VOC Index',
      'Vertical Velocity (m/s)',
      'Battery Voltage (V)',
      'RF RSSI (dBm)',
    ];
    const rows = chartData.map((d) => [
      d.timeSec,
      d.altitudeM,
      d.gpsAltitudeM,
      d.tempC,
      d.pressHpa,
      d.humidityPct,
      d.rawVoc,
      d.velocityMs,
      d.batteryV,
      d.rssiDbm,
    ]);
    exportTableToCsv('AERIS1_Environmental_Telemetry_Dataset.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-cyan-400" />
            Environmental Monitoring & Atmospheric Profiling
          </h2>
          <p className="text-xs text-slate-400">
            NAT-004 boundary layer profiles: Temperature, Pressure, Humidity, and VOC Air Quality vs Time & Altitude.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {packets.length === 0 ? (
            <button
              onClick={onGenerateSampleDataset}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Nominal 500m Flight Dataset</span>
            </button>
          ) : (
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Environmental CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Telemetry Samples Recorded"
          value={packets.length}
          unit="points"
          sublabel={`Valid: ${validCount} · Missing: ${missingCount}`}
          status={packets.length > 0 ? 'nominal' : 'neutral'}
          classification="Dataset"
        />
        <MetricCard
          label="Peak Altitude Reached"
          value={packets.length > 0 ? Math.max(...packets.map((p) => p.barometricAltitudeM)).toFixed(1) : '0.0'}
          unit="m AGL"
          sublabel="Drone Deployment Apogee"
          status="nominal"
          classification="Baro Peak"
        />
        <MetricCard
          label="Atmospheric Lapse Rate"
          value="-6.5"
          unit="°C / km"
          sublabel="Standard Troposphere Gradient"
          status="neutral"
          classification="ISA Model"
        />
        <MetricCard
          label="Air Quality VOC Channel"
          value={packets.length > 0 ? packets[packets.length - 1].rawAirQualityVoc : '—'}
          unit="raw ADC"
          sublabel="Sensirion SGP40 Metal Oxide"
          status="neutral"
          classification="Uncalibrated Raw"
        />
      </div>

      {/* Empty State if No Data */}
      {packets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center space-y-4">
          <Database className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No Telemetry Observations Loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Start the live Mission Simulator or load the nominal 500m AGL descent dataset to inspect boundary-layer
              lapse rates, vertical velocity profiles, and power consumption.
            </p>
          </div>
          <button
            onClick={onGenerateSampleDataset}
            className="px-4 py-2 text-xs font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors inline-flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            <span>Generate & Load 500m Descent Dataset</span>
          </button>
        </div>
      ) : (
        <>
          {/* Chart Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('thermo')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'thermo' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                Thermodynamic (P / T)
              </button>
              <button
                onClick={() => setActiveTab('alt')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'alt' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                Altimetry & Velocity (Baro vs GPS)
              </button>
              <button
                onClick={() => setActiveTab('air')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'air' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                Humidity & Air Quality VOC
              </button>
              <button
                onClick={() => setActiveTab('power')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'power' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                Battery Voltage & RF Link
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Horizontal Axis:</span>
              <button
                onClick={() => setPlotMode('vs_time')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  plotMode === 'vs_time' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-500'
                }`}
              >
                Time (s)
              </button>
              <button
                onClick={() => setPlotMode('vs_alt')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  plotMode === 'vs_alt' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-500'
                }`}
              >
                Altitude (m)
              </button>
            </div>
          </div>

          {/* Time Series Recharts Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'thermo' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={plotMode === 'vs_time' ? 'timeSec' : 'altitudeM'}
                      stroke="#64748b"
                      fontSize={11}
                      unit={plotMode === 'vs_time' ? ' s' : ' m'}
                    />
                    <YAxis
                      yAxisId="temp"
                      stroke="#f59e0b"
                      fontSize={11}
                      unit=" °C"
                      domain={['auto', 'auto']}
                    />
                    <YAxis
                      yAxisId="press"
                      orientation="right"
                      stroke="#06b6d4"
                      fontSize={11}
                      unit=" hPa"
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="tempC"
                      name="Temperature (°C)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="press"
                      type="monotone"
                      dataKey="pressHpa"
                      name="Pressure (hPa)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                ) : activeTab === 'alt' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeSec" stroke="#64748b" fontSize={11} unit=" s" />
                    <YAxis
                      yAxisId="alt"
                      stroke="#06b6d4"
                      fontSize={11}
                      unit=" m"
                      domain={['auto', 'auto']}
                    />
                    <YAxis
                      yAxisId="vel"
                      orientation="right"
                      stroke="#ec4899"
                      fontSize={11}
                      unit=" m/s"
                      domain={['auto', 'auto']}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      yAxisId="alt"
                      type="monotone"
                      dataKey="altitudeM"
                      name="Barometric Alt (m)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      yAxisId="alt"
                      type="monotone"
                      dataKey="gpsAltitudeM"
                      name="GPS Altitude (m)"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      yAxisId="vel"
                      type="monotone"
                      dataKey="velocityMs"
                      name="Vertical Velocity (m/s)"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                ) : activeTab === 'air' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeSec" stroke="#64748b" fontSize={11} unit=" s" />
                    <YAxis
                      yAxisId="hum"
                      stroke="#3b82f6"
                      fontSize={11}
                      unit=" %"
                      domain={[0, 100]}
                    />
                    <YAxis
                      yAxisId="voc"
                      orientation="right"
                      stroke="#8b5cf6"
                      fontSize={11}
                      unit=" VOC"
                      domain={['auto', 'auto']}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      yAxisId="hum"
                      type="monotone"
                      dataKey="humidityPct"
                      name="Relative Humidity (%)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="voc"
                      type="monotone"
                      dataKey="rawVoc"
                      name="Raw VOC Index (ADC)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeSec" stroke="#64748b" fontSize={11} unit=" s" />
                    <YAxis
                      yAxisId="batt"
                      stroke="#10b981"
                      fontSize={11}
                      unit=" V"
                      domain={[3.0, 4.4]}
                    />
                    <YAxis
                      yAxisId="rssi"
                      orientation="right"
                      stroke="#f59e0b"
                      fontSize={11}
                      unit=" dBm"
                      domain={[-125, -40]}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      yAxisId="batt"
                      type="monotone"
                      dataKey="batteryV"
                      name="Battery Voltage (V)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="rssi"
                      type="monotone"
                      dataKey="rssiDbm"
                      name="RF RSSI (dBm)"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
