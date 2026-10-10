import React, { useState } from 'react';
import { AerisProjectData } from '../types/aeris';
import { Network, Download, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
}

export const SystemArchitectureDiagram: React.FC<Props> = ({ projectData }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>('MCU');

  const nodesInfo: Record<
    string,
    { title: string; bus: string; pins: string; voltage: string; current: string; notes: string }
  > = {
    MCU: {
      title: 'Flight Computer (ESP32-S3-WROOM-1)',
      bus: 'System Master Core (Dual-Core 240 MHz)',
      pins: 'GPIO21 (SDA), GPIO22 (SCL), GPIO17 (TX1), GPIO18 (RX1), SPI0/1, GPIO25 (REC_EN)',
      voltage: '3.3V DC Main Rail',
      current: '95 mA nominal active draw',
      notes: 'Executes state machine, sensor sampling, GNC landing detection, and packet formatting.',
    },
    I2C: {
      title: 'I2C Sensor Bus (400 kHz Fast-Mode)',
      bus: 'I2C (2-Wire Shared Open-Drain)',
      pins: 'SDA: GPIO21, SCL: GPIO22 (Dual 4.7kΩ pull-up resistors to 3.3V)',
      voltage: '3.3V Logic Level',
      current: 'Combined sensor draw: ~7.2 mA',
      notes: 'Connects BME280 (0x76), BMP388 (0x77), MPU-6050 (0x68), and SGP40 (0x59).',
    },
    GPS: {
      title: 'GNSS Subsystem (u-blox NEO-8M)',
      bus: 'UART Serial (9600 Baud, 8-N-1)',
      pins: 'TX: GPIO18, RX: GPIO17',
      voltage: '3.3V Logic / Supply',
      current: '22 mA tracking mode',
      notes: 'Provides latitude, longitude, UTC timestamp, and horizontal velocity vector.',
    },
    RF: {
      title: 'RF Transceiver (SX1276 LoRa 865 MHz)',
      bus: 'SPI High-Speed (10 MHz Clock)',
      pins: 'MOSI: GPIO13, MISO: GPIO12, SCK: GPIO14, NSS: GPIO15, DIO0: GPIO4',
      voltage: '3.3V Logic / Supply',
      current: '45 mA burst transmit (+14 dBm / 25 mW)',
      notes: 'Downlink telemetry stream at 1.0 Hz with CRC-16 checksum framing.',
    },
    SD: {
      title: 'Non-Volatile Storage (MicroSD & SPI Flash)',
      bus: 'SPI Bus (Shared with RF NSS CS line)',
      pins: 'MOSI: GPIO13, MISO: GPIO12, SCK: GPIO14, CS: GPIO10',
      voltage: '3.3V Clean Rail',
      current: '25 mA write peak (1 Hz burst)',
      notes: 'Redundant flight blackbox recording raw sensor values and state transitions.',
    },
    PWR: {
      title: 'Power Distribution Subsystem',
      bus: 'Analog DC Power Rail',
      pins: 'VBAT: 3.0–4.2V -> TPS63001 Buck-Boost -> 3.3V VCC (1.2A Peak)',
      voltage: '3.7V Nominal 1S LiPo (1200 mAh)',
      current: 'Regulator capacity: 1200 mA (System requires ~210 mA peak)',
      notes: 'Provides clean ripple-free power with 470uF tantalum transient decoupling.',
    },
    REC: {
      title: 'Recovery Outputs (Buzzer & Visual Strobe)',
      bus: 'GPIO Driven Low-Side N-MOSFET (2N7002)',
      pins: 'Gate: GPIO25 (Active HIGH), Drain to Piezo Buzzer & High-vis LED',
      voltage: '3.3V Switched',
      current: '50 mA pulsed post-landing (20% duty cycle)',
      notes: 'Acoustic locator (≥ 85 dBA @ 1m) and flashing strobe activated post-landing.',
    },
    GS: {
      title: 'Ground Station Base Receiver',
      bus: 'RF Wireless 865.5 MHz -> USB UART Dongle',
      pins: 'SMA 3.0 dBi Dipole Antenna -> SX1276 -> CP2102 USB Bridge',
      voltage: 'USB 5V Powered Ground Station',
      current: 'Receiver sensitivity: -118 dBm',
      notes: 'Local telemetry reception terminal and real-time dashboard display.',
    },
  };

  const handleDownloadSvg = () => {
    const svgElem = document.getElementById('aeris-architecture-svg');
    if (!svgElem) return;
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AERIS1_System_Architecture_Wiring_${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            System Architecture Block Diagram & Wiring Bus Map
          </h2>
          <p className="text-xs text-slate-400">
            Interactive system architecture representing avionics buses, pin allocations, power rails, and ground station link.
          </p>
        </div>
        <button
          onClick={handleDownloadSvg}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export SVG Diagram</span>
        </button>
      </div>

      {/* SVG Canvas Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
        <svg
          id="aeris-architecture-svg"
          viewBox="0 0 960 520"
          className="w-full min-w-[800px] h-auto select-none font-sans"
        >
          {/* Background Grid Lines */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            {/* Arrow marker */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
            </marker>
            <marker id="arrow-pwr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
          </defs>
          <rect width="960" height="520" fill="#0b0f19" />
          <rect width="960" height="520" fill="url(#grid)" opacity="0.6" />

          {/* Boundaries */}
          <rect x="20" y="20" width="700" height="480" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="35" y="45" fill="#64748b" fontSize="11" fontFamily="monospace" fontWeight="bold">
            AERIS-1 ONBOARD FLIGHT ENCLOSURE (CANVAS AIRFRAME)
          </text>

          {/* Ground Station Boundary */}
          <rect x="745" y="20" width="195" height="480" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="760" y="45" fill="#64748b" fontSize="11" fontFamily="monospace" fontWeight="bold">
            GROUND SEGMENT
          </text>

          {/* Central Flight Computer (MCU) */}
          <g
            className="cursor-pointer transition-transform"
            onClick={() => setSelectedNode('MCU')}
          >
            <rect
              x="250"
              y="180"
              width="240"
              height="160"
              rx="8"
              fill={selectedNode === 'MCU' ? '#0e2439' : '#0f172a'}
              stroke={selectedNode === 'MCU' ? '#06b6d4' : '#334155'}
              strokeWidth="2"
            />
            <text x="370" y="210" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
              ESP32-S3 FLIGHT COMPUTER
            </text>
            <text x="370" y="228" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              Dual-Core Xtensa LX7 @ 240 MHz
            </text>
            <line x1="265" y1="238" x2="475" y2="238" stroke="#1e293b" strokeWidth="1" />
            <text x="270" y="258" fill="#38bdf8" fontSize="9" fontFamily="monospace">
              • I2C Master (GPIO 21/22)
            </text>
            <text x="270" y="275" fill="#38bdf8" fontSize="9" fontFamily="monospace">
              • SPI Master (SCK/MISO/MOSI)
            </text>
            <text x="270" y="292" fill="#38bdf8" fontSize="9" fontFamily="monospace">
              • UART1 (TX17 / RX18 @ 9600)
            </text>
            <text x="270" y="309" fill="#38bdf8" fontSize="9" fontFamily="monospace">
              • GPIO 25 (Recovery MOSFET Gate)
            </text>
            <text x="270" y="326" fill="#10b981" fontSize="9" fontFamily="monospace">
              • 3.3V Logic Level / Clean Ground
            </text>
          </g>

          {/* 1. Power Distribution (Top Left) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('PWR')}
          >
            <rect
              x="45"
              y="65"
              width="170"
              height="95"
              rx="6"
              fill={selectedNode === 'PWR' ? '#1c1917' : '#0f172a'}
              stroke={selectedNode === 'PWR' ? '#f59e0b' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="130" y="90" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">
              POWER SUBSYSTEM
            </text>
            <text x="130" y="108" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              1S LiPo (3.7V / 1200 mAh)
            </text>
            <text x="130" y="125" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              TI TPS63001 Buck-Boost
            </text>
            <text x="130" y="142" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">
              VOUT: 3.3V Rail @ 1.2A
            </text>
          </g>

          {/* Power Rail Line to MCU and Sensors */}
          <path
            d="M 215 112 L 370 112 L 370 180"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            markerEnd="url(#arrow-pwr)"
          />

          {/* 2. Environmental Sensor Bus (Bottom Left) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('I2C')}
          >
            <rect
              x="45"
              y="200"
              width="170"
              height="140"
              rx="6"
              fill={selectedNode === 'I2C' ? '#082f49' : '#0f172a'}
              stroke={selectedNode === 'I2C' ? '#06b6d4' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="130" y="222" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
              I2C SENSOR BUS (400kHz)
            </text>
            <text x="60" y="244" fill="#e2e8f0" fontSize="9" fontFamily="monospace">• BME280 (P/T/RH: 0x76)</text>
            <text x="60" y="262" fill="#e2e8f0" fontSize="9" fontFamily="monospace">• BMP388 (Baro Alt: 0x77)</text>
            <text x="60" y="280" fill="#e2e8f0" fontSize="9" fontFamily="monospace">• MPU-6050 (IMU 6-DoF: 0x68)</text>
            <text x="60" y="298" fill="#e2e8f0" fontSize="9" fontFamily="monospace">• SGP40 (VOC Index: 0x59)</text>
            <text x="60" y="322" fill="#64748b" fontSize="8" fontFamily="monospace">Dual 4.7kΩ Pull-Ups to 3.3V</text>
          </g>

          {/* Bus connection I2C to MCU */}
          <line x1="215" y1="270" x2="250" y2="270" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* 3. GNSS Module (Top Center-Right) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('GPS')}
          >
            <rect
              x="520"
              y="65"
              width="170"
              height="95"
              rx="6"
              fill={selectedNode === 'GPS' ? '#082f49' : '#0f172a'}
              stroke={selectedNode === 'GPS' ? '#06b6d4' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="605" y="90" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
              GNSS SUBSYSTEM
            </text>
            <text x="605" y="108" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              u-blox NEO-8M Module
            </text>
            <text x="605" y="125" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              UART1 (TX:18 / RX:17)
            </text>
            <text x="605" y="142" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">
              Ceramic Patch Antenna
            </text>
          </g>

          {/* GNSS Line to MCU */}
          <path d="M 520 112 L 440 112 L 440 180" fill="none" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* 4. SPI Flash / MicroSD Storage (Bottom Left-Center) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('SD')}
          >
            <rect
              x="45"
              y="370"
              width="170"
              height="95"
              rx="6"
              fill={selectedNode === 'SD' ? '#082f49' : '#0f172a'}
              stroke={selectedNode === 'SD' ? '#06b6d4' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="130" y="395" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
              NON-VOLATILE STORAGE
            </text>
            <text x="130" y="413" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              16GB MicroSD Card
            </text>
            <text x="130" y="430" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              SPI Mode (CS: GPIO 10)
            </text>
            <text x="130" y="448" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">
              1 Hz Blackbox Logging
            </text>
          </g>

          <path d="M 215 417 L 310 417 L 310 340" fill="none" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* 5. RF LoRa Transceiver (Right) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('RF')}
          >
            <rect
              x="520"
              y="200"
              width="170"
              height="120"
              rx="6"
              fill={selectedNode === 'RF' ? '#082f49' : '#0f172a'}
              stroke={selectedNode === 'RF' ? '#06b6d4' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="605" y="224" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
              RF TRANSCEIVER (LORA)
            </text>
            <text x="605" y="242" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              Semtech SX1276 (865 MHz)
            </text>
            <text x="605" y="260" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              SPI (NSS:15, DIO0:4)
            </text>
            <text x="605" y="278" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              Tx Power: +14 dBm (25mW)
            </text>
            <text x="605" y="298" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">
              1/4λ Whip Antenna (2.15 dBi)
            </text>
          </g>

          <line x1="490" y1="260" x2="520" y2="260" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* 6. Recovery Subsystem (Bottom Right) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('REC')}
          >
            <rect
              x="520"
              y="350"
              width="170"
              height="115"
              rx="6"
              fill={selectedNode === 'REC' ? '#14532d' : '#0f172a'}
              stroke={selectedNode === 'REC' ? '#22c55e' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="605" y="375" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">
              RECOVERY LOCATOR
            </text>
            <text x="605" y="393" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              90 dBA Piezo Buzzer @ 2.7kHz
            </text>
            <text x="605" y="411" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              High-Visibility Strobe LED
            </text>
            <text x="605" y="429" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              MOSFET Switch (GPIO 25)
            </text>
            <text x="605" y="448" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">
              Post-Touchdown Activated
            </text>
          </g>

          <path d="M 430 340 L 430 407 L 520 407" fill="none" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* RF Downlink Wireless Waves to Ground Station */}
          <path
            d="M 690 260 C 715 240, 715 280, 745 260"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <text x="718" y="240" fill="#38bdf8" fontSize="8" fontFamily="monospace">
            865 MHz RF
          </text>

          {/* 7. Ground Station Box (Right Column) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode('GS')}
          >
            <rect
              x="760"
              y="180"
              width="165"
              height="180"
              rx="8"
              fill={selectedNode === 'GS' ? '#0e2439' : '#0f172a'}
              stroke={selectedNode === 'GS' ? '#06b6d4' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="842" y="210" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
              GROUND STATION
            </text>
            <text x="842" y="228" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              3.0 dBi Dipole Antenna
            </text>
            <line x1="775" y1="238" x2="910" y2="238" stroke="#1e293b" strokeWidth="1" />
            <text x="775" y="258" fill="#38bdf8" fontSize="9" fontFamily="monospace">• SX1276 LoRa Receiver</text>
            <text x="775" y="278" fill="#38bdf8" fontSize="9" fontFamily="monospace">• Sens: -118 dBm</text>
            <text x="775" y="298" fill="#38bdf8" fontSize="9" fontFamily="monospace">• USB-UART Bridge</text>
            <text x="775" y="318" fill="#38bdf8" fontSize="9" fontFamily="monospace">• Telemetry Parser</text>
            <text x="775" y="338" fill="#10b981" fontSize="9" fontFamily="monospace">• Live CSV / JSON Record</text>
          </g>
        </svg>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && nodesInfo[selectedNode] && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Node Inspector & Interface Configuration
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {nodesInfo[selectedNode].title}
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              Verified Pin Allocation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono mb-3">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">BUS / PROTOCOL</div>
              <div className="text-slate-200 font-semibold mt-1">{nodesInfo[selectedNode].bus}</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">OPERATING VOLTAGE</div>
              <div className="text-slate-200 font-semibold mt-1">{nodesInfo[selectedNode].voltage}</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">CURRENT DRAW</div>
              <div className="text-slate-200 font-semibold mt-1">{nodesInfo[selectedNode].current}</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-400 text-[10px]">PIN ASSIGNMENTS</div>
              <div className="text-cyan-300 font-semibold mt-1">{nodesInfo[selectedNode].pins}</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded border border-slate-800/60">
            <span className="font-semibold text-slate-300">Engineering Notes: </span>
            {nodesInfo[selectedNode].notes}
          </div>
        </div>
      )}
    </div>
  );
};
