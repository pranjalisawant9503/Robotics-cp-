import * as THREE from 'three';
import armConfigData from '../config/arm.config.json';

export interface DHParameter {
  jointIndex: number;
  name: string;
  theta: number; // joint angle in degrees
  d: number;     // link offset along Z in mm
  a: number;     // link length along X in mm
  alpha: number; // link twist around X in degrees
  minAngle: number;
  maxAngle: number;
  axis: 'x' | 'y' | 'z';
}

export interface ArmConfig {
  name: string;
  version: string;
  dof: number;
  reach_m: number;
  reach_mm: number;
  mounting: string;
  base_height_mm: number;
  links: {
    base_pedestal_mm: number;
    upper_arm_mm: number;
    forearm_mm: number;
    wrist_1_mm: number;
    wrist_2_mm: number;
    flange_gripper_mm: number;
  };
  joints: Array<{
    id: number;
    name: string;
    type: string;
    axis: 'x' | 'y' | 'z';
    min_deg: number;
    max_deg: number;
    min_rad: number;
    max_rad: number;
    max_velocity_rad_s: number;
    max_accel_rad_s2: number;
    dh: { d: number; a: number; alpha: number; theta_offset: number };
    servo_mapping: { channel: number; pwm_min_us: number; pwm_max_us: number; zero_deg: number };
  }>;
  gripper: {
    type: string;
    stroke_mm: number;
    max_width_mm: number;
    min_width_mm: number;
    max_payload_kg: number;
    finger_length_mm: number;
    finger_width_mm: number;
    open_offset_mm: number;
    closed_offset_mm: number;
    servo_mapping: { channel: number; pwm_min_us: number; pwm_max_us: number };
  };
  tolerances: {
    position_mm: number;
    orientation_deg: number;
    ik_max_iterations: number;
    ik_damping_lambda: number;
  };
}

export const ARM_CONFIG: ArmConfig = armConfigData as ArmConfig;

/**
 * 6-DOF DH parameter table derived from arm.config.json
 */
export const DEFAULT_6DOF_DH_PARAMS: DHParameter[] = ARM_CONFIG.joints.map((j) => ({
  jointIndex: j.id,
  name: j.name,
  theta: 0,
  d: j.dh.d,
  a: j.dh.a,
  alpha: j.dh.alpha,
  minAngle: j.min_deg,
  maxAngle: j.max_deg,
  axis: j.axis
}));

export const DEFAULT_DH_PARAMS = DEFAULT_6DOF_DH_PARAMS;

/**
 * Computes standard D-H transformation matrix T_i for joint i
 */
export function getDHMatrix(dh: DHParameter, currentThetaDeg: number): THREE.Matrix4 {
  const thetaRad = THREE.MathUtils.degToRad(currentThetaDeg);
  const alphaRad = THREE.MathUtils.degToRad(dh.alpha);
  const d = dh.d;
  const a = dh.a;

  const ct = Math.cos(thetaRad);
  const st = Math.sin(thetaRad);
  const ca = Math.cos(alphaRad);
  const sa = Math.sin(alphaRad);

  const m = new THREE.Matrix4();
  m.set(
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
    0,   sa,       ca,      d,
    0,   0,        0,       1
  );

  return m;
}
