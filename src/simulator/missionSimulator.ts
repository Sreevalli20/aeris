/**
 * AERIS-1 Deterministic Mission Simulator & Telemetry Packet Generator
 * Simulates complete 500m AGL drone deployment, controlled descent,
 * landing detection with debouncing & hysteresis, and acoustic recovery beacon activation.
 */

import { MissionState, TelemetryPacket } from '../types/aeris';
import { calculateBarometricAltitude, calculateCrc16Ccitt, calculatePressureFromAltitude } from '../engine/aerisMath';

export interface SimulatorConfig {
  deploymentAltitudeM: number;
  descentVelocityMs: number;
  simulationTickMs: number; // e.g. 1000 ms = 1 Hz
  seed: number;
  // Fault Injections
  packetDropRatePct: number;
  injectSensorFault: boolean;
  injectLowBattery: boolean;
  // Landing thresholds
  velocityLandingThresholdMs: number;
  altitudeDeltaThresholdM: number;
  landingDebounceSec: number;
}

export const DEFAULT_SIM_CONFIG: SimulatorConfig = {
  deploymentAltitudeM: 500,
  descentVelocityMs: 6.12,
  simulationTickMs: 1000, // 1 Hz
  seed: 42,
  packetDropRatePct: 0,
  injectSensorFault: false,
  injectLowBattery: false,
  velocityLandingThresholdMs: 0.5,
  altitudeDeltaThresholdM: 1.0,
  landingDebounceSec: 3.0,
};

export class MissionSimulator {
  private config: SimulatorConfig;
  private state: MissionState = 'SAFE_OFF';
  private packetId: number = 0;
  private simTimeSec: number = 0;
  private currentAltitudeM: number = 0;
  private currentVelocityMs: number = 0;
  private landingSamplesCount: number = 0;
  private randomSeed: number;

  // Track logs
  public onboardLog: TelemetryPacket[] = [];
  public groundStationLog: TelemetryPacket[] = [];

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = { ...DEFAULT_SIM_CONFIG, ...config };
    this.randomSeed = this.config.seed;
    this.reset();
  }

  public updateConfig(newConfig: Partial<SimulatorConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public reset() {
    this.state = 'SAFE_OFF';
    this.packetId = 0;
    this.simTimeSec = 0;
    this.currentAltitudeM = 0;
    this.currentVelocityMs = 0;
    this.landingSamplesCount = 0;
    this.randomSeed = this.config.seed;
    this.onboardLog = [];
    this.groundStationLog = [];
  }

  // Linear congruential pseudo-random generator for reproducible deterministic noise
  private nextRandom(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  private gaussianNoise(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-6, this.nextRandom());
    const u2 = this.nextRandom();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * stdDev;
  }

  public getState(): MissionState {
    return this.state;
  }

  public setState(newState: MissionState) {
    this.state = newState;
  }

  public step(): { packet: TelemetryPacket; groundReceived: boolean } {
    this.simTimeSec += 1;
    this.packetId += 1;

    // Atmospheric calculations (Sea-level base: 28.0°C, 1013.25 hPa)
    const seaLevelTempC = 28.0;
    const lapseRatePerM = 0.0065; // 6.5°C per 1000m standard ISA lapse rate

    const priorState = this.state;

    // State machine transitions
    switch (this.state) {
      case 'SAFE_OFF':
        this.currentAltitudeM = 0;
        this.currentVelocityMs = 0;
        break;

      case 'PRE_LAUNCH':
        this.currentAltitudeM = 0;
        this.currentVelocityMs = 0;
        // Pre-launch stays at ground level for initial calibration
        break;

      case 'ARMED':
        // Carrier drone ascension / ready at altitude
        this.currentAltitudeM = this.config.deploymentAltitudeM;
        this.currentVelocityMs = 0;
        break;

      case 'DEPLOYMENT_DETECTED':
        // Sudden freefall / parachute opening shock
        this.currentAltitudeM = Math.max(0, this.currentAltitudeM - 4.5);
        this.currentVelocityMs = -4.5;
        this.state = 'CONTROLLED_DESCENT';
        break;

      case 'CONTROLLED_DESCENT': {
        const velNoise = this.gaussianNoise(0, 0.15);
        const actualVel = this.config.descentVelocityMs + velNoise;
        this.currentVelocityMs = -actualVel;
        this.currentAltitudeM = Math.max(0, this.currentAltitudeM - actualVel);

        if (this.currentAltitudeM <= 50.0) {
          this.state = 'LOW_ALTITUDE';
        }
        break;
      }

      case 'LOW_ALTITUDE': {
        const velNoise = this.gaussianNoise(0, 0.12);
        const actualVel = this.config.descentVelocityMs + velNoise;
        this.currentVelocityMs = -actualVel;
        this.currentAltitudeM = Math.max(0, this.currentAltitudeM - actualVel);

        // Landing condition check with debouncing & hysteresis
        if (this.currentAltitudeM <= 1.0) {
          this.currentAltitudeM = 0;
          this.currentVelocityMs = 0;
          this.landingSamplesCount += 1;

          const requiredSamples = Math.max(1, Math.round(this.config.landingDebounceSec));
          if (this.landingSamplesCount >= requiredSamples) {
            this.state = 'LANDING_DETECTED';
          }
        } else {
          this.landingSamplesCount = 0;
        }
        break;
      }

      case 'LANDING_DETECTED':
        this.currentAltitudeM = 0;
        this.currentVelocityMs = 0;
        // Wait 2 ticks then enter RECOVERY_MODE (activate acoustic buzzer & strobe)
        this.state = 'RECOVERY_MODE';
        break;

      case 'RECOVERY_MODE':
        this.currentAltitudeM = 0;
        this.currentVelocityMs = 0;
        // Active recovery beacon
        if (this.simTimeSec > 180) {
          // If recovery active for > 3 minutes in simulation, user can mark complete
        }
        break;

      case 'MISSION_COMPLETE':
        this.currentAltitudeM = 0;
        this.currentVelocityMs = 0;
        break;
    }

    // Physical sensor readings synthesis
    const baseTemp = seaLevelTempC - (this.currentAltitudeM * lapseRatePerM);
    const tempNoise = this.config.injectSensorFault ? 25.0 : this.gaussianNoise(0, 0.2);
    const temperatureC = Number((baseTemp + tempNoise).toFixed(2));

    const nominalPressureHpa = calculatePressureFromAltitude(this.currentAltitudeM);
    const pressNoise = this.config.injectSensorFault ? 50.0 : this.gaussianNoise(0, 0.35);
    const pressureHpa = Number((nominalPressureHpa + pressNoise).toFixed(2));

    const barometricAltitudeM = Number(calculateBarometricAltitude(pressureHpa).toFixed(1));

    // GPS coordinates (Chennai ground coordinates example: 13.0827° N, 80.2707° E)
    // Small wind drift during descent: ~ 0.000005 deg per second (~0.5 m/s wind)
    const drift = (this.config.deploymentAltitudeM - this.currentAltitudeM) * 0.0000015;
    const gpsLat = Number((13.082700 + drift + this.gaussianNoise(0, 0.000008)).toFixed(6));
    const gpsLon = Number((80.270700 + (drift * 0.8) + this.gaussianNoise(0, 0.000008)).toFixed(6));
    const gpsAltitudeM = Number((this.currentAltitudeM + this.gaussianNoise(0, 1.2)).toFixed(1));

    // Humidity profile (increases slightly near ground or cloud boundary)
    const humidityPct = Number(Math.min(95, Math.max(25, 62.0 + (this.currentAltitudeM * 0.015) + this.gaussianNoise(0, 0.8))).toFixed(1));

    // Air Quality VOC raw ADC / index (NAT-004 boundary layer sensing)
    const rawAirQualityVoc = Number(Math.round(Math.max(50, 135 - (this.currentAltitudeM * 0.08) + this.gaussianNoise(0, 4.0))));

    // Acceleration (G)
    let accelG = 1.0;
    if (priorState === 'DEPLOYMENT_DETECTED') {
      accelG = 3.8 + this.gaussianNoise(0, 0.4); // parachute deployment shock
    } else if (this.state === 'CONTROLLED_DESCENT' || this.state === 'LOW_ALTITUDE') {
      accelG = 1.0 + this.gaussianNoise(0, 0.06); // aerodynamic oscillation
    } else if (this.state === 'LANDING_DETECTED' && this.landingSamplesCount === 1) {
      accelG = 4.5 + this.gaussianNoise(0, 0.5); // touchdown impact deceleration
    } else {
      accelG = 1.0 + this.gaussianNoise(0, 0.01); // stationary bench / rest
    }

    // Battery voltage discharge model (4.20V fully charged, drops ~ 0.001V per second)
    let batteryV = 4.18 - (this.simTimeSec * 0.0012);
    if (this.config.injectLowBattery) {
      batteryV = 3.35 - (this.simTimeSec * 0.003); // rapid brownout trigger
    }
    const batteryVoltageV = Number(Math.max(3.20, batteryV).toFixed(2));

    // RF Link telemetry measurements
    const slantDistM = Math.sqrt(Math.pow(this.currentAltitudeM, 2) + Math.pow(300, 2)); // 300m ground station baseline
    const nominalRssi = -60 - (20 * Math.log10(Math.max(10, slantDistM) / 10));
    const rfRssiDbm = Number((nominalRssi + this.gaussianNoise(0, 2.5)).toFixed(1));
    const rfSnrDb = Number(Math.max(-15, Math.min(12, 10.5 - (slantDistM / 100) + this.gaussianNoise(0, 0.8))).toFixed(1));

    // Error flags bitmask:
    // bit 0: GPS fix lost
    // bit 1: Baro sensor fault
    // bit 2: Low battery warning (< 3.5V)
    // bit 3: High descent rate warning (> 8.0 m/s)
    let errorFlags = 0;
    if (this.config.injectSensorFault) errorFlags |= 0x02;
    if (batteryVoltageV < 3.50) errorFlags |= 0x04;
    if (Math.abs(this.currentVelocityMs) > 8.0) errorFlags |= 0x08;

    // Build raw packet string for CRC calculation
    const rawDataStr = `ID=${this.packetId};ST=${this.state};ALT=${barometricAltitudeM};P=${pressureHpa};T=${temperatureC};V=${this.currentVelocityMs.toFixed(2)};BATT=${batteryVoltageV}`;
    const crc16 = calculateCrc16Ccitt(rawDataStr);

    const packet: TelemetryPacket = {
      packetId: this.packetId,
      timestampMs: this.simTimeSec * 1000,
      isoTime: new Date(Date.now() + this.simTimeSec * 1000).toISOString(),
      missionState: this.state,
      gpsLatitude: gpsLat,
      gpsLongitude: gpsLon,
      gpsAltitudeM,
      barometricAltitudeM,
      temperatureC,
      pressureHpa,
      humidityPct,
      rawAirQualityVoc,
      verticalVelocityMs: Number(this.currentVelocityMs.toFixed(2)),
      accelerationG: Number(accelG.toFixed(2)),
      batteryVoltageV,
      rfRssiDbm,
      rfSnrDb,
      errorFlags,
      crc16,
      isSimulated: true,
      checksumValid: true,
    };

    // Store in onboard flight memory unconditionally (onboard logging REQ-06)
    this.onboardLog.push(packet);

    // Ground station reception check (subject to drop rate and RF range)
    let groundReceived = true;
    if (this.config.packetDropRatePct > 0) {
      const dropRoll = this.nextRandom() * 100;
      if (dropRoll < this.config.packetDropRatePct) {
        groundReceived = false;
      }
    }

    if (groundReceived) {
      this.groundStationLog.push(packet);
    }

    return { packet, groundReceived };
  }
}
