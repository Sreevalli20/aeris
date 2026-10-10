/**
 * AERIS-1 Engineering Math & Validation Unit Tests
 * Verifies core physics formulas, unit conversions, boundary assertions, and CRC-16.
 */

import {
  calculateParachuteDimensions,
  calculateRfLinkBudget,
  calculatePowerBudget,
  calculateCrc16Ccitt,
  calculateBarometricAltitude,
  calculatePressureFromAltitude,
} from './aerisMath';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function testParachuteMath() {
  console.log('Testing Parachute Aerodynamics Calculation...');
  // Case: Mass = 0.615 kg, target v = 6.0 m/s, rho = 1.2 kg/m3, Cd = 1.5, g = 9.80665 m/s2
  // A = (2 * 0.615 * 9.80665) / (1.2 * 1.5 * 36) = 12.062 / 64.8 = 0.1861 m2
  // With 10% safety margin: ~ 0.2048 m2
  // D = sqrt(4 * 0.2048 / pi) = sqrt(0.2608) = 0.510 m = 510 mm
  const res = calculateParachuteDimensions(0.615, 6.0, 1.2, 1.5, 9.80665, 10, 25, 500);

  assert(res.isValid, 'Parachute result should be valid');
  assert(res.requiredAreaM2 > 0.18 && res.requiredAreaM2 < 0.25, `Required area ${res.requiredAreaM2} in expected range`);
  assert(res.equivalentDiameterMm > 450 && res.equivalentDiameterMm < 600, `Equivalent diameter ${res.equivalentDiameterMm} mm in expected range`);
  assert(res.nominalDescentVelocityMs >= 5.0 && res.nominalDescentVelocityMs <= 8.0, 'Nominal velocity within 5.0 - 8.0 m/s specification');
  assert(res.estimatedDescentTimeS > 60 && res.estimatedDescentTimeS < 110, `Descent time from 500m (${res.estimatedDescentTimeS}s) in expected range`);
  console.log('✔ Parachute Aerodynamics: PASS');
}

function testRfLinkBudget() {
  console.log('Testing RF Link Budget Calculation...');
  // Case: 865.5 MHz, distance = 600m (0.6 km)
  // FSPL = 32.44 + 20*log10(865.5) + 20*log10(0.6) = 32.44 + 58.745 - 4.437 = 86.75 dB
  const rf = calculateRfLinkBudget(865.5, 14, 2.15, 3.0, 0.5, 0.8, -118, 2.0, 10.0, 600);

  assert(rf.fsplDb > 84 && rf.fsplDb < 89, `FSPL ${rf.fsplDb} dB should be ~86.7 dB`);
  assert(rf.rxPowerDbm > -75 && rf.rxPowerDbm < -65, `Received power ${rf.rxPowerDbm} dBm should be in expected bracket`);
  assert(rf.linkMarginDb > 20 && rf.linkMarginDb < 45, `Link margin ${rf.linkMarginDb} dB should be comfortably positive`);
  assert(rf.eval500m.linkMarginDb > rf.eval600m.linkMarginDb, '500m link margin must be strictly higher than 600m');
  assert(rf.isViable, 'RF link must be viable');
  console.log('✔ RF Link Budget: PASS');
}

function testPowerBudget() {
  console.log('Testing Power & Battery Runtime Calculation...');
  const items = [
    {
      subsystem: 'Flight Computer',
      voltageV: 3.3,
      currentMa: 95.0,
      activeDutyCyclePct: 100,
      activeDurationSec: 5700,
      standbyCurrentMa: 15.0,
      standbyDurationSec: 0,
    },
    {
      subsystem: 'RF Transceiver',
      voltageV: 3.3,
      currentMa: 45.0,
      activeDutyCyclePct: 15,
      activeDurationSec: 855,
      standbyCurrentMa: 0.2,
      standbyDurationSec: 4845,
    },
  ];

  const pwr = calculatePowerBudget(items, 0.90, 25, 3.7);
  assert(pwr.totalActivePowerMw > 0, 'Total active power must be positive');
  assert(pwr.averageMissionPowerMw > 0, 'Average mission power must be positive');
  assert(pwr.requiredBatteryCapacityMah > 0, 'Required battery capacity must be positive');
  console.log('✔ Power & Energy Budget: PASS');
}

function testCrc16Ccitt() {
  console.log('Testing CRC-16-CCITT Checksum Algorithm...');
  const testStr = '123456789';
  const crc = calculateCrc16Ccitt(testStr);
  // Standard CRC-16-CCITT (poly 0x1021, init 0xFFFF) for "123456789" is 0x29B1
  assert(crc === 0x29b1, `CRC-16 for "123456789" expected 0x29B1, got 0x${crc.toString(16).toUpperCase()}`);
  console.log('✔ CRC-16-CCITT Checksum: PASS (Verified with test vector "123456789" => 0x29B1)');
}

function testBarometricAltimetry() {
  console.log('Testing ISA Barometric Altimetry Model...');
  // Standard sea-level: 1013.25 hPa => h = 0m
  const hSea = calculateBarometricAltitude(1013.25);
  assert(Math.abs(hSea) < 0.1, `Sea level altitude should be 0, got ${hSea}`);

  // At 500m AGL, expected pressure: ~ 954.6 hPa
  const p500 = calculatePressureFromAltitude(500);
  assert(p500 > 940 && p500 < 970, `Pressure at 500m expected ~954 hPa, got ${p500}`);

  const h500 = calculateBarometricAltitude(p500);
  assert(Math.abs(h500 - 500) < 0.5, `Barometric altitude inversion should return 500m, got ${h500}`);
  console.log('✔ Barometric Altimetry & ISA Inversion: PASS');
}

function runAllTests() {
  try {
    console.log('====================================');
    console.log('AERIS-1 Core Engineering Unit Tests');
    console.log('====================================');
    testParachuteMath();
    testRfLinkBudget();
    testPowerBudget();
    testCrc16Ccitt();
    testBarometricAltimetry();
    console.log('====================================');
    console.log('ALL 5 UNIT TEST SUITES PASSED SUCCESSFULLY');
    console.log('====================================');
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
}

runAllTests();
