import * as THREE from 'three';
import { ARM_CONFIG } from './dh';
import { computeFK } from './fk';
import { solveDlsIK } from './dlsIK';

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string }>;
}

export function runKinematicsUnitTests(): TestSuiteSummary {
  const summary: TestSuiteSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  function assert(condition: boolean, testName: string, details: string) {
    summary.total++;
    if (condition) {
      summary.passed++;
      summary.results.push({ name: testName, passed: true, message: details });
      console.log(`[PASS] ${testName}: ${details}`);
    } else {
      summary.failed++;
      summary.results.push({ name: testName, passed: false, message: details });
      console.error(`[FAIL] ${testName}: ${details}`);
    }
  }

  console.log('--- Running RoboTwin 6-DOF Kinematics Unit Tests ---');

  // Test 1: arm.config.json validation
  assert(
    ARM_CONFIG.dof === 6 && ARM_CONFIG.joints.length === 6,
    'Arm Configuration DOF Check',
    `ARM_CONFIG has ${ARM_CONFIG.dof} DOF with ${ARM_CONFIG.joints.length} joint definitions.`
  );

  assert(
    ARM_CONFIG.reach_mm >= 600 && ARM_CONFIG.reach_mm <= 650,
    'Arm Reach Specification Check',
    `Reach is configured as ${ARM_CONFIG.reach_mm}mm (~0.6m workspace reach).`
  );

  // Test 2: FK calculation at Home Position
  const homeJoints = [0, 0, 0, 0, 0, 0];
  const homePose = computeFK(homeJoints);
  assert(
    homePose.position.z > 400,
    'Forward Kinematics Home Pose',
    `Home vertical height Z is ${homePose.position.z.toFixed(1)}mm (>400mm upright extension).`
  );

  // Test 3: IK Reversibility Test: FK(IK(pose)) ≈ pose within 2.0 mm
  const testConfigurations = [
    { name: 'Front Reach', joints: [0, 45, -45, 0, 10, 0] },
    { name: 'Lateral Left', joints: [-45, 30, -30, 0, 0, 0] },
    { name: 'Lateral Right', joints: [50, 40, -50, 0, 15, 0] },
    { name: 'Tabletop Workpiece', joints: [20, 55, -70, 0, 15, 0] }
  ];

  for (const cfg of testConfigurations) {
    const originalPose = computeFK(cfg.joints);
    const ik = solveDlsIK(originalPose.position, {
      initialJointsDeg: [0, 20, -20, 0, 0, 0],
      toleranceMm: 2.0
    });

    const recoveredPose = computeFK(ik.jointAngles);
    const errorDistance = recoveredPose.position.distanceTo(originalPose.position);

    assert(
      errorDistance <= 2.0,
      `FK(IK(pose)) ≈ pose for ${cfg.name}`,
      `Error distance = ${errorDistance.toFixed(3)}mm (tolerance: 2.0mm). Iterations: ${ik.iterations}. Seed used: ${ik.seedUsed}.`
    );
  }

  // Test 4: Physical Joint Limits Clamping
  const arbitraryPos = new THREE.Vector3(200, 180, 120);
  const ikResult = solveDlsIK(arbitraryPos);
  let withinLimits = true;
  for (let j = 0; j < 6; j++) {
    const angle = ikResult.jointAngles[j];
    const limits = ARM_CONFIG.joints[j];
    if (angle < limits.min_deg - 0.01 || angle > limits.max_deg + 0.01) {
      withinLimits = false;
      break;
    }
  }
  assert(
    withinLimits,
    'Joint Limits Compliance Check',
    `All computed joint angles are within configured limits: [${ikResult.jointAngles.join(', ')}] deg.`
  );

  // Test 5: Out of reach detection (e.g. 2.0 meters away)
  const farPos = new THREE.Vector3(0, 2000, 100); // 2 meters away
  const outOfReachResult = solveDlsIK(farPos);
  assert(
    !outOfReachResult.feasible && outOfReachResult.issueCode === 'OUT_OF_REACH',
    'Out of Reach Detection (2.0 meters)',
    `Correctly flagged OUT_OF_REACH. Suggestion: ${outOfReachResult.suggestion}`
  );

  console.log(`--- Kinematics Tests Complete: ${summary.passed}/${summary.total} Passed ---`);
  return summary;
}

// Self-run when executed in environment
const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
if (proc && proc.argv && proc.argv[1]?.includes('kinematics.test')) {
  const result = runKinematicsUnitTests();
  if (result.failed > 0 && proc.exit) {
    proc.exit(1);
  }
}
