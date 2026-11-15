import * as THREE from 'three';
import { solveDlsIK, IKResult, IKSolveOptions } from './dlsIK';
import { ARM_CONFIG } from './dh';

export type { IKResult, IKSolveOptions };

/**
 * Standard IK API for RoboTwin system.
 * Dispatches to high-precision Numerical Damped Least Squares (DLS) solver
 * with joint limit clamping, multi-seed search, and 2mm tolerance.
 */
export function solveIK(
  targetPos: THREE.Vector3,
  targetPitchDeg: number = 0,
  initialJointsDeg: number[] = [0, 20, -20, 0, 0, 0],
  options?: Partial<IKSolveOptions>
): IKResult {
  return solveDlsIK(targetPos, {
    targetPitchDeg,
    initialJointsDeg,
    ...options
  });
}
