const THREE = require('three');

function computeFK(jointAngles) {
  const d1 = 120; // base height
  const [j1, j2, j3, j4, j5] = jointAngles;

  // Build Three.js hierarchy identical to ArmModel
  const root = new THREE.Group();
  const baseGroup = new THREE.Group();
  baseGroup.position.set(0, 80, 0);
  root.add(baseGroup);

  const shoulderGroup = new THREE.Group();
  shoulderGroup.position.set(0, 40, 0); // 80 + 40 = 120
  baseGroup.add(shoulderGroup);

  const elbowGroup = new THREE.Group();
  elbowGroup.position.set(0, 120, 0);
  shoulderGroup.add(elbowGroup);

  const wristPitchGroup = new THREE.Group();
  wristPitchGroup.position.set(0, 100, 0);
  elbowGroup.add(wristPitchGroup);

  const wristRollGroup = new THREE.Group();
  wristRollGroup.position.set(0, 20, 0);
  wristPitchGroup.add(wristRollGroup);

  const tip = new THREE.Group();
  tip.position.set(0, 65, 0); // 20 + 40 + 5 from wrist roll to gripper center
  wristRollGroup.add(tip);

  // Apply rotations
  baseGroup.rotation.y = THREE.MathUtils.degToRad(j1);
  shoulderGroup.rotation.x = THREE.MathUtils.degToRad(j2);
  elbowGroup.rotation.x = THREE.MathUtils.degToRad(j3);
  wristPitchGroup.rotation.x = THREE.MathUtils.degToRad(j4);
  wristRollGroup.rotation.y = THREE.MathUtils.degToRad(j5);

  root.updateMatrixWorld(true);

  const worldPos = new THREE.Vector3();
  tip.getWorldPosition(worldPos);

  // ArmModel scale is [0.01, 0.01, 0.01], but internal units are mm:
  // Three.js X = worldPos.x
  // Three.js Y = worldPos.y (height)
  // Three.js Z = worldPos.z (depth)
  return {
    x: worldPos.x, // maps to target x
    y: worldPos.z, // maps to target y (Three.js Z is y)
    z: worldPos.y  // maps to target z (Three.js Y is z/height)
  };
}

// Solve IK logic from ik.ts
function solveIK(targetPos, targetPitchDeg = 0) {
  const d1 = 120;
  const L2 = 120;
  const L3 = 100;
  const L4 = 65; // from wrist pitch hinge (100) to tip: 20 (hinge to roll) + 45 (roll to grip tip) = 65

  const x = targetPos.x;
  const y = targetPos.y;
  const z = targetPos.z ?? 25;

  let j1 = Math.atan2(x, y) * 180 / Math.PI;

  const R = Math.sqrt(x * x + y * y);
  const deltaZ = z - d1;

  let approachPitch = targetPitchDeg;
  if (approachPitch === 0 || approachPitch === undefined) {
    approachPitch = z < 50 ? 172 : 145;
  }
  const phiRad = approachPitch * Math.PI / 180;

  const Rw = R - L4 * Math.sin(phiRad);
  const Zw = deltaZ - L4 * Math.cos(phiRad);

  const D2 = Rw * Rw + Zw * Zw;
  const maxReach = L2 + L3 - 2;
  const clampedD2 = Math.min(D2, maxReach * maxReach);

  let cosJ3 = (clampedD2 - L2 * L2 - L3 * L3) / (2 * L2 * L3);
  cosJ3 = Math.max(-1, Math.min(1, cosJ3));

  const j3Rad = -Math.acos(cosJ3);
  const alpha = Math.atan2(Rw, Zw);
  const beta = Math.atan2(L3 * Math.sin(j3Rad), L2 + L3 * Math.cos(j3Rad));
  const j2Rad = alpha - beta;
  const j4Rad = phiRad - j2Rad - j3Rad;

  return [
    j1,
    j2Rad * 180 / Math.PI,
    j3Rad * 180 / Math.PI,
    j4Rad * 180 / Math.PI,
    0
  ];
}

// Test targets
const targets = [
  { name: 'red_cube', pos: new THREE.Vector3(140, -50, 20) },
  { name: 'blue_bin', pos: new THREE.Vector3(140, 80, 25) },
  { name: 'green_cylinder', pos: new THREE.Vector3(100, -90, 25) },
  { name: 'weld_start', pos: new THREE.Vector3(110, -40, 24) },
  { name: 'weld_end', pos: new THREE.Vector3(155, -40, 24) }
];

for (const t of targets) {
  const joints = solveIK(t.pos);
  const fk = computeFK(joints);
  const err = Math.sqrt(
    Math.pow(fk.x - t.pos.x, 2) +
    Math.pow(fk.y - t.pos.y, 2) +
    Math.pow(fk.z - t.pos.z, 2)
  );
  console.log(`Target: ${t.name} -> Target: (${t.pos.x}, ${t.pos.y}, ${t.pos.z})`);
  console.log(`   Joints: [${joints.map(j => j.toFixed(1)).join(', ')}]`);
  console.log(`   Arm Tip FK: (${fk.x.toFixed(1)}, ${fk.y.toFixed(1)}, ${fk.z.toFixed(1)}) -> Error: ${err.toFixed(2)} mm`);
}
