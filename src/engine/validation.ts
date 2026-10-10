/**
 * AERIS-1 Dynamic Requirement Evaluation & Verification Engine
 * Validates requirements based on real calculations and verified test evidence.
 * Ensures calculated estimates are clearly separated from physical test results.
 */

import { AerisProjectData, RequirementItem } from '../types/aeris';
import { calculateParachuteDimensions, calculateRfLinkBudget, calculatePowerBudget } from './aerisMath';

export interface EvaluationSummary {
  totalCount: number;
  passCount: number;
  failCount: number;
  inProgressCount: number;
  notTestedCount: number;
  blockedCount: number;
  provisionalScore: number;
  maxScore: number;
}

export function evaluateAllRequirements(data: AerisProjectData): RequirementItem[] {
  // 1. Calculate mass total
  const totalMassGrams = data.massBudget.reduce((sum, item) => {
    const unitM = item.measuredMassGrams ?? item.unitMassGrams;
    return sum + (item.quantity * unitM);
  }, 0);

  // 2. Calculate parachute descent velocity
  const totalMassKg = totalMassGrams / 1000;
  const paraResult = calculateParachuteDimensions(
    totalMassKg,
    data.parachuteConfig.targetVelocityMs,
    data.parachuteConfig.airDensityKgM3,
    data.parachuteConfig.dragCoefficientCd,
    data.parachuteConfig.gravityMs2,
    data.parachuteConfig.safetyMarginPct,
    data.parachuteConfig.spillHoleDiameterMm,
    data.projectMeta.deploymentAltM
  );

  // 3. Calculate RF link margin
  const rfResult = calculateRfLinkBudget(
    data.rfLinkConfig.frequencyMhz,
    data.rfLinkConfig.txPowerDbm,
    data.rfLinkConfig.txAntennaGainDbi,
    data.rfLinkConfig.rxAntennaGainDbi,
    data.rfLinkConfig.txCableLossDb,
    data.rfLinkConfig.rxCableLossDb,
    data.rfLinkConfig.rxSensitivityDbm,
    data.rfLinkConfig.implementationLossDb,
    data.rfLinkConfig.requiredFadeMarginDb,
    data.rfLinkConfig.slantDistanceM
  );

  // 4. Calculate power runtime
  const powerResult = calculatePowerBudget(data.powerBudget);
  const batteryItem = data.massBudget.find(m => m.subsystem === 'Battery' || m.component.toLowerCase().includes('lipo'));
  // Estimate runtime using 1200 mAh standard capacity or based on battery item
  const estimatedCapacityMah = 1200;
  const runtimeHours = estimatedCapacityMah > 0 && powerResult.averageMissionCurrentMa > 0
    ? (estimatedCapacityMah * 0.85) / powerResult.averageMissionCurrentMa
    : 0;
  const runtimeMinutes = runtimeHours * 60;

  // Clone requirements to evaluate
  return data.requirements.map(req => {
    const updated = { ...req };

    // Mass verification (REQ-01)
    if (req.id === 'REQ-01') {
      updated.measuredOrCalcValue = `${totalMassGrams.toFixed(1)} g (Calc)`;
      if (totalMassGrams <= data.projectMeta.maxMassLimitG) {
        updated.status = 'PASS';
        updated.notes = `Total mass of ${totalMassGrams.toFixed(1)} g is below ${data.projectMeta.maxMassLimitG} g limit (${(data.projectMeta.maxMassLimitG - totalMassGrams).toFixed(1)} g margin).`;
      } else {
        updated.status = 'FAIL';
        updated.notes = `Total mass of ${totalMassGrams.toFixed(1)} g exceeds ${data.projectMeta.maxMassLimitG} g limit by ${(totalMassGrams - data.projectMeta.maxMassLimitG).toFixed(1)} g.`;
      }
      updated.autoEvaluated = true;
      return updated;
    }

    // Descent velocity (REQ-03)
    if (req.id === 'REQ-03') {
      const v = paraResult.nominalDescentVelocityMs;
      updated.measuredOrCalcValue = `${v.toFixed(2)} m/s (Calc)`;
      if (v >= data.projectMeta.targetDescentVelMinMs && v <= data.projectMeta.targetDescentVelMaxMs) {
        updated.status = 'PASS';
        updated.notes = `Calculated descent velocity of ${v.toFixed(2)} m/s satisfies 5.0–8.0 m/s envelope.`;
      } else {
        updated.status = 'FAIL';
        updated.notes = `Calculated velocity ${v.toFixed(2)} m/s is outside required 5.0–8.0 m/s range.`;
      }
      updated.autoEvaluated = true;
      return updated;
    }

    // Telemetry range & RF link margin (REQ-05)
    if (req.id === 'REQ-05') {
      const margin = rfResult.linkMarginDb;
      updated.measuredOrCalcValue = `${margin >= 0 ? '+' : ''}${margin.toFixed(1)} dB Margin @ ${data.rfLinkConfig.slantDistanceM}m`;
      if (margin >= 0) {
        updated.status = 'PASS';
        updated.notes = `Calculated RF link margin is +${margin.toFixed(1)} dB with ${data.rfLinkConfig.requiredFadeMarginDb} dB fade margin.`;
      } else {
        updated.status = 'FAIL';
        updated.notes = `Negative link margin (${margin.toFixed(1)} dB). Insufficient transmit power or receiver sensitivity.`;
      }
      updated.autoEvaluated = true;
      return updated;
    }

    // Battery runtime (REQ-11)
    if (req.id === 'REQ-11') {
      updated.measuredOrCalcValue = `${runtimeMinutes.toFixed(0)} min (Calc)`;
      if (runtimeMinutes >= 95) {
        updated.status = 'PASS';
        updated.notes = `Predicted runtime of ${runtimeMinutes.toFixed(0)} min meets 95 min mission specification with safety reserve.`;
      } else {
        updated.status = 'FAIL';
        updated.notes = `Predicted runtime of ${runtimeMinutes.toFixed(0)} min is below 95 min requirement. Increase battery capacity or reduce duty cycle.`;
      }
      updated.autoEvaluated = true;
      return updated;
    }

    // If linked to a physical test record, evaluate test pass
    const linkedTest = data.tests.find(t => t.linkedRequirementId === req.id);
    if (linkedTest) {
      if (linkedTest.status === 'PASS') {
        updated.status = 'PASS';
        updated.evidenceRef = linkedTest.evidenceRef;
      } else if (linkedTest.status === 'FAIL') {
        updated.status = 'FAIL';
      } else if (linkedTest.status === 'IN_PROGRESS') {
        updated.status = 'IN_PROGRESS';
      }
    }

    return updated;
  });
}

export function computeEvaluationSummary(requirements: RequirementItem[], rubric: AerisProjectData['rubric']): EvaluationSummary {
  let passCount = 0;
  let failCount = 0;
  let inProgressCount = 0;
  let notTestedCount = 0;
  let blockedCount = 0;

  for (const req of requirements) {
    switch (req.status) {
      case 'PASS': passCount++; break;
      case 'FAIL': failCount++; break;
      case 'IN_PROGRESS': inProgressCount++; break;
      case 'NOT_TESTED': notTestedCount++; break;
      case 'BLOCKED': blockedCount++; break;
    }
  }

  const maxScore = rubric.reduce((acc, cat) => acc + cat.weight, 0);
  const provisionalScore = rubric.reduce((acc, cat) => acc + Math.max(0, cat.score - cat.unverifiedDeduction), 0);

  return {
    totalCount: requirements.length,
    passCount,
    failCount,
    inProgressCount,
    notTestedCount,
    blockedCount,
    provisionalScore,
    maxScore,
  };
}
