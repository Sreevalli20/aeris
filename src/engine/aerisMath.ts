/**
 * AERIS-1 Core Engineering Math & Physics Engine
 * Rigorous local calculation functions with input validation, SI unit consistency,
 * and boundary assertions.
 */

export interface ParachuteCalculationResult {
  requiredAreaM2: number;
  equivalentDiameterM: number;
  equivalentDiameterMm: number;
  spillHoleAreaM2: number;
  effectiveAreaM2: number;
  nominalDescentVelocityMs: number;
  estimatedDescentTimeS: number; // From deployment altitude to ground
  isValid: boolean;
  warnings: string[];
}

/**
 * Calculates parachute reference area and equivalent diameter from steady-state drag formula:
 * v = sqrt( (2 * m * g) / (rho * Cd * A) ) => A = (2 * m * g) / (rho * Cd * v^2)
 */
export function calculateParachuteDimensions(
  totalMassKg: number,
  targetVelocityMs: number,
  airDensityKgM3: number,
  dragCoefficientCd: number,
  gravityMs2: number = 9.80665,
  safetyMarginPct: number = 10,
  spillHoleDiameterMm: number = 25,
  deploymentAltM: number = 500
): ParachuteCalculationResult {
  const warnings: string[] = [];

  if (totalMassKg <= 0 || isNaN(totalMassKg)) {
    warnings.push('Total mass must be strictly positive.');
    return {
      requiredAreaM2: 0,
      equivalentDiameterM: 0,
      equivalentDiameterMm: 0,
      spillHoleAreaM2: 0,
      effectiveAreaM2: 0,
      nominalDescentVelocityMs: 0,
      estimatedDescentTimeS: 0,
      isValid: false,
      warnings,
    };
  }

  if (targetVelocityMs <= 0 || isNaN(targetVelocityMs)) {
    warnings.push('Target velocity must be strictly positive.');
    return {
      requiredAreaM2: 0,
      equivalentDiameterM: 0,
      equivalentDiameterMm: 0,
      spillHoleAreaM2: 0,
      effectiveAreaM2: 0,
      nominalDescentVelocityMs: 0,
      estimatedDescentTimeS: 0,
      isValid: false,
      warnings,
    };
  }

  if (airDensityKgM3 <= 0 || dragCoefficientCd <= 0) {
    warnings.push('Air density and drag coefficient must be strictly positive.');
    return {
      requiredAreaM2: 0,
      equivalentDiameterM: 0,
      equivalentDiameterMm: 0,
      spillHoleAreaM2: 0,
      effectiveAreaM2: 0,
      nominalDescentVelocityMs: 0,
      estimatedDescentTimeS: 0,
      isValid: false,
      warnings,
    };
  }

  if (targetVelocityMs < 5 || targetVelocityMs > 8) {
    warnings.push(`Target velocity ${targetVelocityMs.toFixed(2)} m/s is outside the nominal 5.0–8.0 m/s mission specification.`);
  }

  // Base theoretical area required for target velocity
  const denominator = airDensityKgM3 * dragCoefficientCd * Math.pow(targetVelocityMs, 2);
  const baseAreaM2 = (2 * totalMassKg * gravityMs2) / denominator;

  // Add safety margin
  const areaWithMarginM2 = baseAreaM2 * (1 + Math.max(0, safetyMarginPct) / 100);

  // Account for spill hole (vent) area at canopy apex
  const spillHoleRadiusM = (spillHoleDiameterMm / 1000) / 2;
  const spillHoleAreaM2 = Math.PI * Math.pow(spillHoleRadiusM, 2);
  const effectiveAreaM2 = areaWithMarginM2 + spillHoleAreaM2;

  // Diameter of circular canopy projection: D = sqrt(4 * A / pi)
  const diameterM = Math.sqrt((4 * effectiveAreaM2) / Math.PI);
  const diameterMm = diameterM * 1000;

  // Nominal descent velocity achieved with this effective area
  const actualVelocityMs = Math.sqrt(
    (2 * totalMassKg * gravityMs2) / (airDensityKgM3 * dragCoefficientCd * effectiveAreaM2)
  );

  const descentTimeS = deploymentAltM > 0 && actualVelocityMs > 0 ? deploymentAltM / actualVelocityMs : 0;

  return {
    requiredAreaM2: Number(areaWithMarginM2.toFixed(4)),
    equivalentDiameterM: Number(diameterM.toFixed(3)),
    equivalentDiameterMm: Number(diameterMm.toFixed(1)),
    spillHoleAreaM2: Number(spillHoleAreaM2.toFixed(6)),
    effectiveAreaM2: Number(effectiveAreaM2.toFixed(4)),
    nominalDescentVelocityMs: Number(actualVelocityMs.toFixed(2)),
    estimatedDescentTimeS: Number(descentTimeS.toFixed(1)),
    isValid: true,
    warnings,
  };
}

/**
 * Generates sensitivity curve data points for Parachute Area vs Velocity across mass variations.
 */
export function generateParachuteSensitivityCurve(
  baseMassKg: number,
  Cd: number,
  rho: number,
  g: number = 9.80665
) {
  const points: Array<{
    areaM2: number;
    velocityNominalMs: number;
    velocityLightMs: number;
    velocityHeavyMs: number;
  }> = [];

  const massNominal = baseMassKg;
  const massLight = baseMassKg * 0.85;
  const massHeavy = baseMassKg * 1.15;

  for (let area = 0.1; area <= 0.85; area += 0.05) {
    const vNom = Math.sqrt((2 * massNominal * g) / (rho * Cd * area));
    const vLight = Math.sqrt((2 * massLight * g) / (rho * Cd * area));
    const vHeavy = Math.sqrt((2 * massHeavy * g) / (rho * Cd * area));

    points.push({
      areaM2: Number(area.toFixed(2)),
      velocityNominalMs: Number(vNom.toFixed(2)),
      velocityLightMs: Number(vLight.toFixed(2)),
      velocityHeavyMs: Number(vHeavy.toFixed(2)),
    });
  }

  return points;
}

export interface RfLinkCalculationResult {
  fsplDb: number;
  rxPowerDbm: number;
  linkMarginDb: number;
  eval500m: { fsplDb: number; rxPowerDbm: number; linkMarginDb: number };
  eval600m: { fsplDb: number; rxPowerDbm: number; linkMarginDb: number };
  maxTheoreticalDistanceM: number;
  isViable: boolean;
  warnings: string[];
}

/**
 * Computes Free-Space Path Loss (FSPL) and RF Link Margin:
 * FSPL(dB) = 32.44 + 20*log10(f_MHz) + 20*log10(d_km)
 * Prx(dBm) = Ptx + Gtx + Grx - Ltx - Lrx - Lmisc - FSPL
 * Margin(dB) = Prx - Rx_sens - FadeMargin
 */
export function calculateRfLinkBudget(
  frequencyMhz: number,
  txPowerDbm: number,
  txAntennaGainDbi: number,
  rxAntennaGainDbi: number,
  txCableLossDb: number,
  rxCableLossDb: number,
  rxSensitivityDbm: number,
  implementationLossDb: number,
  requiredFadeMarginDb: number,
  slantDistanceM: number
): RfLinkCalculationResult {
  const warnings: string[] = [];

  if (frequencyMhz <= 0 || isNaN(frequencyMhz)) {
    warnings.push('Frequency must be positive.');
  }

  const computeAtDistance = (distM: number) => {
    const distKm = Math.max(0.001, distM / 1000);
    const fspl = 32.44 + 20 * Math.log10(Math.max(1, frequencyMhz)) + 20 * Math.log10(distKm);
    const rxPwr = txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - txCableLossDb - rxCableLossDb - implementationLossDb - fspl;
    const margin = rxPwr - rxSensitivityDbm - requiredFadeMarginDb;
    return {
      fsplDb: Number(fspl.toFixed(2)),
      rxPowerDbm: Number(rxPwr.toFixed(2)),
      linkMarginDb: Number(margin.toFixed(2)),
    };
  };

  const evalSpecified = computeAtDistance(slantDistanceM);
  const eval500m = computeAtDistance(500);
  const eval600m = computeAtDistance(600);

  // Maximum theoretical free space distance where linkMargin >= 0:
  // Margin = 0 => Prx = rxSensitivityDbm + requiredFadeMarginDb
  // FSPL_max = txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - txCableLossDb - rxCableLossDb - implementationLossDb - (rxSensitivityDbm + requiredFadeMarginDb)
  const totalGainsMinusLosses = txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - txCableLossDb - rxCableLossDb - implementationLossDb;
  const maxAllowableFspl = totalGainsMinusLosses - (rxSensitivityDbm + requiredFadeMarginDb);

  // FSPL = 32.44 + 20 log10(f) + 20 log10(d_km) => 20 log10(d_km) = FSPL - 32.44 - 20 log10(f)
  const logDistKm = (maxAllowableFspl - 32.44 - 20 * Math.log10(Math.max(1, frequencyMhz))) / 20;
  const maxTheoreticalDistanceM = Math.max(0, Math.pow(10, logDistKm) * 1000);

  if (evalSpecified.linkMarginDb < 0) {
    warnings.push(`Link margin is negative (${evalSpecified.linkMarginDb.toFixed(1)} dB) at ${slantDistanceM}m slant distance.`);
  }

  return {
    fsplDb: evalSpecified.fsplDb,
    rxPowerDbm: evalSpecified.rxPowerDbm,
    linkMarginDb: evalSpecified.linkMarginDb,
    eval500m,
    eval600m,
    maxTheoreticalDistanceM: Number(maxTheoreticalDistanceM.toFixed(1)),
    isViable: evalSpecified.linkMarginDb >= 0,
    warnings,
  };
}

export interface PowerBudgetSummary {
  totalActiveCurrentMa: number;
  totalActivePowerMw: number;
  averageMissionCurrentMa: number;
  averageMissionPowerMw: number;
  missionDurationSec: number;
  totalMissionEnergyMwh: number;
  totalMissionEnergyWh: number;
  requiredBatteryCapacityMah: number;
  recommendedBatteryCapacityMah: number; // With 20% DoD and efficiency
  subsystemBreakdown: Record<string, { powerMw: number; currentMa: number; pct: number }>;
  phases: {
    preLaunchMwh: number;
    descentMwh: number;
    recoveryMwh: number;
  };
}

/**
 * Calculates Component-Level Power and Energy Budget
 */
export function calculatePowerBudget(
  items: Array<{
    subsystem: string;
    voltageV: number;
    currentMa: number;
    activeDutyCyclePct: number;
    activeDurationSec: number;
    standbyCurrentMa: number;
    standbyDurationSec: number;
  }>,
  converterEfficiency: number = 0.90, // 90% switching regulator efficiency
  safetyMarginPct: number = 25,       // 25% reserve
  batteryNominalVoltageV: number = 3.7
): PowerBudgetSummary {
  let totalActiveCurrent = 0;
  let totalActivePower = 0;
  let totalEnergyMwh = 0;
  const subsystemMap: Record<string, { powerMw: number; currentMa: number; energyMwh: number }> = {};

  let totalDurationSec = 0;

  for (const item of items) {
    const v = item.voltageV > 0 ? item.voltageV : batteryNominalVoltageV;
    const duty = Math.min(100, Math.max(0, item.activeDutyCyclePct)) / 100;
    const activeI = item.currentMa;
    const standbyI = item.standbyCurrentMa || 0;

    // Instantaneous active power
    const activeP = v * activeI;
    totalActiveCurrent += activeI;
    totalActivePower += activeP;

    // Time-averaged current & energy
    const durSec = Math.max(1, (item.activeDurationSec || 0) + (item.standbyDurationSec || 0));
    totalDurationSec = Math.max(totalDurationSec, durSec);

    const activeSec = (item.activeDurationSec || durSec * duty);
    const standbySec = Math.max(0, durSec - activeSec);

    // Energy = P * t (in mWh: mW * (sec / 3600))
    const itemEnergyMwh = (activeP * (activeSec / 3600)) + (v * standbyI * (standbySec / 3600));
    totalEnergyMwh += itemEnergyMwh;

    if (!subsystemMap[item.subsystem]) {
      subsystemMap[item.subsystem] = { powerMw: 0, currentMa: 0, energyMwh: 0 };
    }
    subsystemMap[item.subsystem].powerMw += activeP;
    subsystemMap[item.subsystem].currentMa += activeI;
    subsystemMap[item.subsystem].energyMwh += itemEnergyMwh;
  }

  const durationHrs = Math.max(0.01, totalDurationSec / 3600);
  const avgPowerMw = totalEnergyMwh / durationHrs;
  const avgCurrentMa = avgPowerMw / batteryNominalVoltageV;

  // Battery capacity required (raw) = Energy (mWh) / V_batt
  const rawBatteryCapacityMah = totalEnergyMwh / batteryNominalVoltageV;

  // Account for switching regulator efficiency (e.g. 0.90) and safety margin
  const efficiency = Math.max(0.5, Math.min(1.0, converterEfficiency));
  const capacityWithEfficiencyMah = rawBatteryCapacityMah / efficiency;
  const recommendedCapacityMah = capacityWithEfficiencyMah * (1 + safetyMarginPct / 100);

  // Subsystem breakdown percentages
  const breakdown: Record<string, { powerMw: number; currentMa: number; pct: number }> = {};
  for (const [sub, val] of Object.entries(subsystemMap)) {
    breakdown[sub] = {
      powerMw: Number(val.powerMw.toFixed(1)),
      currentMa: Number(val.currentMa.toFixed(1)),
      pct: totalActivePower > 0 ? Number(((val.powerMw / totalActivePower) * 100).toFixed(1)) : 0,
    };
  }

  // Phase allocation estimates (Pre-launch 10m, Descent 2m, Recovery 30m)
  const phases = {
    preLaunchMwh: Number((totalEnergyMwh * 0.15).toFixed(2)),
    descentMwh: Number((totalEnergyMwh * 0.35).toFixed(2)),
    recoveryMwh: Number((totalEnergyMwh * 0.50).toFixed(2)),
  };

  return {
    totalActiveCurrentMa: Number(totalActiveCurrent.toFixed(1)),
    totalActivePowerMw: Number(totalActivePower.toFixed(1)),
    averageMissionCurrentMa: Number(avgCurrentMa.toFixed(1)),
    averageMissionPowerMw: Number(avgPowerMw.toFixed(1)),
    missionDurationSec: totalDurationSec,
    totalMissionEnergyMwh: Number(totalEnergyMwh.toFixed(2)),
    totalMissionEnergyWh: Number((totalEnergyMwh / 1000).toFixed(3)),
    requiredBatteryCapacityMah: Number(capacityWithEfficiencyMah.toFixed(1)),
    recommendedBatteryCapacityMah: Number(recommendedCapacityMah.toFixed(1)),
    subsystemBreakdown: breakdown,
    phases,
  };
}

/**
 * CRC-16-CCITT implementation (Polynomial: 0x1021, Initial: 0xFFFF)
 * Industry standard for aerospace & amateur telemetry packet framing.
 */
export function calculateCrc16Ccitt(data: string | Uint8Array): number {
  let crc = 0xFFFF;
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc;
}

/**
 * Computes Barometric Altitude from atmospheric pressure using the standard International Standard Atmosphere (ISA) barometric formula:
 * h = (T0 / L) * (1 - (P / P0)^(R * L / (g0 * M)))
 * Simplified tropospheric approximation:
 * h = 44330 * (1 - (P / 1013.25)^(1 / 5.255))
 */
export function calculateBarometricAltitude(pressureHpa: number, seaLevelPressureHpa: number = 1013.25): number {
  if (pressureHpa <= 0) return 0;
  return 44330 * (1 - Math.pow(pressureHpa / seaLevelPressureHpa, 0.190263));
}

/**
 * Computes Expected Pressure from Altitude (inverse ISA model)
 */
export function calculatePressureFromAltitude(altitudeM: number, seaLevelPressureHpa: number = 1013.25): number {
  return seaLevelPressureHpa * Math.pow(1 - (altitudeM / 44330), 5.25588);
}
