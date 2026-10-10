/**
 * AERIS-1 Data Models & Engineering Types
 * Autonomous Environmental Intelligence & Recovery System
 * NAT-004: Energy & Sustainable Technology & Environment
 */

export type DataClassification =
  | 'user_design'
  | 'analytical_estimate'
  | 'simulated_measurement'
  | 'imported_measurement'
  | 'physically_tested'
  | 'independently_verified';

export type MissionState =
  | 'SAFE_OFF'
  | 'PRE_LAUNCH'
  | 'ARMED'
  | 'DEPLOYMENT_DETECTED'
  | 'CONTROLLED_DESCENT'
  | 'LOW_ALTITUDE'
  | 'LANDING_DETECTED'
  | 'RECOVERY_MODE'
  | 'MISSION_COMPLETE';

export type VerificationStatus =
  | 'NOT_TESTED'
  | 'IN_PROGRESS'
  | 'PASS'
  | 'FAIL'
  | 'BLOCKED';

export type RequirementCategory =
  | 'MASS_STRUCTURE'
  | 'DEPLOYMENT_DESCENT'
  | 'TELEMETRY_RF'
  | 'POWER_ENERGY'
  | 'SENSING_ENVIRONMENT'
  | 'LANDING_RECOVERY'
  | 'DATA_INTEGRITY'
  | 'REGULATORY';

export interface RequirementItem {
  id: string;
  description: string;
  category: RequirementCategory;
  target: string;
  measuredOrCalcValue: string;
  unit: string;
  verificationMethod: 'Analysis' | 'Laboratory Test' | 'Drop Test' | 'Hardware Simulation' | 'Inspection';
  evidenceRef: string;
  status: VerificationStatus;
  notes: string;
  correctiveAction: string;
  autoEvaluated?: boolean;
}

export interface RubricCategory {
  id: string;
  name: string;
  weight: number; // Sums to 200
  score: number;
  unverifiedDeduction: number;
  notes: string;
}

export interface MassItem {
  id: string;
  subsystem: string;
  component: string;
  quantity: number;
  unitMassGrams: number;
  measuredMassGrams?: number;
  classification: DataClassification;
  notes?: string;
}

export interface PowerItem {
  id: string;
  subsystem: string;
  component: string;
  voltageV: number;
  currentMa: number;
  operatingMode: string;
  activeDutyCyclePct: number; // 0 - 100
  activeDurationSec: number;
  standbyCurrentMa: number;
  standbyDurationSec: number;
  measuredPowerMw?: number;
  classification: DataClassification;
}

export interface ParachuteConfig {
  canopyType: 'hemispherical' | 'cross' | 'flat_circular';
  dragCoefficientCd: number;
  targetVelocityMs: number;
  airDensityKgM3: number;
  gravityMs2: number;
  safetyMarginPct: number;
  spillHoleDiameterMm: number;
  shroudLineCount: number;
  shroudLineLengthMm: number;
}

export interface DropTestEntry {
  id: string;
  date: string;
  testMassG: number;
  canopyConfig: string;
  releaseHeightM: number;
  observedDescentTimeS: number;
  calculatedVelocityMs: number;
  stabilityObservations: string;
  openingBehavior: 'Immediate' | 'Delayed' | 'Partial' | 'Tangled';
  damage: string;
  evidenceRef: string;
  verified: boolean;
}

export interface RfLinkConfig {
  frequencyMhz: number; // e.g. 433.2 or 865.5
  txPowerDbm: number; // e.g. 14 dBm (25 mW) or 20 dBm (100 mW)
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
  txCableLossDb: number;
  rxCableLossDb: number;
  rxSensitivityDbm: number; // e.g. -118 dBm for LoRa SF7/125kHz
  implementationLossDb: number;
  requiredFadeMarginDb: number; // e.g. 10 dB
  slantDistanceM: number; // default 500
  wpcComplianceAcknowledged: boolean;
  selectedBand: '433_MHZ' | '865_867_MHZ' | '2400_MHZ';
}

export interface TelemetryPacket {
  packetId: number;
  timestampMs: number;
  isoTime: string;
  missionState: MissionState;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAltitudeM: number;
  barometricAltitudeM: number;
  temperatureC: number;
  pressureHpa: number;
  humidityPct: number;
  rawAirQualityVoc: number; // raw ADC/ppm
  verticalVelocityMs: number;
  accelerationG: number;
  batteryVoltageV: number;
  rfRssiDbm: number;
  rfSnrDb: number;
  errorFlags: number; // bitmask
  crc16: number;
  isSimulated: boolean;
  checksumValid?: boolean;
}

export interface HardwareComponent {
  id: string;
  category: string;
  name: string;
  manufacturer: string;
  model: string;
  supplyVoltageV: string;
  currentDrawMa: number;
  dimensionsMm: string;
  massG: number;
  interfaceType: 'I2C' | 'SPI' | 'UART' | 'GPIO' | 'ADC' | 'POWER';
  operatingVoltageLogicV: number;
  samplingRateHz: number;
  datasheetRef: string;
  status: 'Selected' | 'Candidate' | 'Tested';
  pinConnections?: string;
}

export interface LandingDetectionConfig {
  verticalVelocityThresholdMs: number; // e.g. < 0.5 m/s
  altitudeDeltaThresholdM: number;     // e.g. < 1.0 m over window
  accelerationThresholdG: number;     // e.g. between 0.95 and 1.05 G
  confirmationDurationSec: number;    // e.g. 3.0 sec (consecutive)
  requireGpsStability: boolean;
  gpsSpeedThresholdKnots: number;
  beaconActivationDelaySec: number;
  buzzerFrequencyHz: number;
}

export interface RecoveryLog {
  id: string;
  landingTimestamp: string;
  finalGpsCoords: string;
  finalAltitudeM: number;
  recoveryTeamNotified: boolean;
  beaconAudibleDistanceM?: number;
  visualStreamerSpotted: boolean;
  structuralCondition: string;
  payloadIntegrity: string;
  notes: string;
}

export interface TestEntry {
  id: string;
  category: string;
  name: string;
  procedure: string;
  preconditions: string;
  expectedResult: string;
  actualResult: string;
  status: VerificationStatus;
  date: string;
  operator: string;
  evidenceRef: string;
  linkedRequirementId: string;
  correctiveAction?: string;
}

export interface RiskEntry {
  id: string;
  title: string;
  category: string;
  likelihood: number; // 1-5
  severity: number;   // 1-5
  detectability: number; // 1-5
  rpn: number; // L * S * D
  mitigation: string;
  owner: string;
  verificationMethod: string;
  status: 'Open' | 'Mitigated' | 'Accepted' | 'Closed';
}

export interface AerisProjectData {
  version: string;
  lastUpdated: string;
  projectMeta: {
    name: string;
    fullForm: string;
    challenge: string;
    theme: string;
    maxMassLimitG: number;
    deploymentAltM: number;
    targetDescentVelMinMs: number;
    targetDescentVelMaxMs: number;
    minTelemetryRateHz: number;
    targetRangeM: number;
  };
  requirements: RequirementItem[];
  rubric: RubricCategory[];
  massBudget: MassItem[];
  powerBudget: PowerItem[];
  parachuteConfig: ParachuteConfig;
  dropTests: DropTestEntry[];
  rfLinkConfig: RfLinkConfig;
  landingConfig: LandingDetectionConfig;
  hardwareComponents: HardwareComponent[];
  recoveryLogs: RecoveryLog[];
  tests: TestEntry[];
  risks: RiskEntry[];
}
