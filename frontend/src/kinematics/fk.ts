import * as THREE from 'three';
import { DHParameter, DEFAULT_6DOF_DH_PARAMS, ARM_CONFIG } from './dh';

export interface Pose3D {
  position: THREE.Vector3; // in mm
  rotation: THREE.Euler;   // in radians
  quaternion: THREE.Quaternion;
  matrices: THREE.Matrix4[];
  jointPositions: THREE.Vector3[];
  jointAxes: THREE.Vector3[];
}

/**
 * 6-DOF Forward Kinematics (FK)
 * Accurately models the kinematic chain configured in arm.config.json:
 * Base pedestal (d1=120) -> Shoulder (a2=220) -> Elbow (a3=180) -> Forearm Roll (d4=60) -> Wrist Pitch (a5=50) -> Wrist Roll & Tool Flange (d6=60)
 */
export function computeFK(
  jointAnglesDeg: number[],
  dhParams: DHParameter[] = DEFAULT_6DOF_DH_PARAMS
): Pose3D {
  // Pad or slice to 6 joints
  const angles = [
    jointAnglesDeg[0] ?? 0,
    jointAnglesDeg[1] ?? 0,
    jointAnglesDeg[2] ?? 0,
    jointAnglesDeg[3] ?? 0,
    jointAnglesDeg[4] ?? 0,
    jointAnglesDeg[5] ?? 0
  ];

  // Accumulate coordinate frame transformation matrices starting at base origin
  let accumulatedMatrix = new THREE.Matrix4();
  const matrices: THREE.Matrix4[] = [accumulatedMatrix.clone()];
  const jointPositions: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
  const jointAxes: THREE.Vector3[] = [new THREE.Vector3(0, 1, 0)]; // Base yaw rotates around Y in Three.js world

  for (let i = 0; i < dhParams.length && i < angles.length; i++) {
    const dh = dhParams[i];
    const theta = angles[i];
    const thetaRad = THREE.MathUtils.degToRad(theta);
    const alphaRad = THREE.MathUtils.degToRad(dh.alpha);

    const ct = Math.cos(thetaRad);
    const st = Math.sin(thetaRad);
    const ca = Math.cos(alphaRad);
    const sa = Math.sin(alphaRad);

    const Ti = new THREE.Matrix4();
    Ti.set(
      ct, -st * ca,  st * sa, dh.a * ct,
      st,  ct * ca, -ct * sa, dh.a * st,
      0,   sa,       ca,      dh.d,
      0,   0,        0,       1
    );

    accumulatedMatrix = accumulatedMatrix.clone().multiply(Ti);
    matrices.push(accumulatedMatrix.clone());

    // Extract current joint position
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(accumulatedMatrix);
    jointPositions.push(pos);

    // Extract current z-axis (rotation axis of link)
    const zAxis = new THREE.Vector3(
      accumulatedMatrix.elements[8],
      accumulatedMatrix.elements[9],
      accumulatedMatrix.elements[10]
    ).normalize();
    jointAxes.push(zAxis);
  }

  // End-effector tip position and rotation
  const endMatrix = matrices[matrices.length - 1];
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  endMatrix.decompose(position, quaternion, scale);

  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

  return {
    position,
    rotation,
    quaternion,
    matrices,
    jointPositions,
    jointAxes
  };
}

/**
 * Geometric helper that calculates direct end-effector position matching Three.js visual scene
 * (Coordinate systems: X=lateral, Y=depth/forward, Z=up/vertical in Gazebo world coordinates)
 */
export function getEndEffectorPositionWorld(jointAnglesDeg: number[]): THREE.Vector3 {
  const fk = computeFK(jointAnglesDeg);
  return fk.position;
}
