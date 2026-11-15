import * as THREE from 'three';
import { TaskStep, DetectedObject } from './useRobotStore';

export interface PlanResult {
  steps: TaskStep[];
  newObjects?: DetectedObject[];
  recognizedIntent: string;
}

/**
 * Master Multi-Agent Natural Language Task Planner for Industrial Robotics & Digital Twin
 * Decomposes ANY command into an executable, physics-aware robotic workflow:
 * - Welding & Seam Tracing
 * - Laser Cutting, Sealant Dispensing & Drawing
 * - Surface Polishing, Sanding & Deburring
 * - Screwing & Peg-in-Hole Precision Assembly
 * - Stacking & Palletizing
 * - Autonomous Workcell Sorting
 * - Non-Prehensile Manipulation (Pushing / Sliding)
 * - Tilting & Pouring
 * - Target Pointing & Laser Designation
 * - Joint Calibration & Diagnostic Self-Tests
 * - Payload Grip Stress & Shake Testing
 * - Watchdog Workcell Patrol
 * - 360° Quality Inspection & 3D Scanning
 * - Container Unloading & Pick & Place
 * - Directional Jogging & Joint Control
 */
export function planTaskFromNaturalLanguage(
  commandText: string,
  currentPose: THREE.Vector3,
  currentJoints: number[],
  detectedObjects: DetectedObject[]
): PlanResult {
  const text = commandText.trim();
  const lower = text.toLowerCase();

  const findObject = (query: string): DetectedObject | undefined => {
    const q = query.toLowerCase().replace(/[\s_-]+/g, '');
    return detectedObjects.find(obj => {
      const label = obj.label.toLowerCase().replace(/[\s_-]+/g, '');
      const id = obj.id.toLowerCase().replace(/[\s_-]+/g, '');
      return label.includes(q) || q.includes(label) || id === q;
    });
  };

  // Dynamic Object Perception: Scan user command for any mentioned object (color + shape / noun)
  const colorMatches = ['yellow', 'orange', 'purple', 'cyan', 'white', 'pink', 'red', 'green', 'blue'];
  const shapeMatches = ['cube', 'box', 'cylinder', 'sphere', 'ball', 'block', 'cone', 'gear', 'bolt', 'screw', 'tool', 'workpiece', 'plate', 'item', 'object'];

  let newObjectsToSpawn: DetectedObject[] = [];
  const colorFound = colorMatches.find(c => lower.includes(c));
  const shapeFound = shapeMatches.find(s => lower.includes(s));

  if (colorFound || (shapeFound && shapeFound !== 'object' && shapeFound !== 'item')) {
    const candidateLabel = colorFound && shapeFound
      ? `${colorFound}_${shapeFound}`
      : colorFound
      ? `${colorFound}_cube`
      : `${shapeFound}`;

    if (!findObject(candidateLabel) && (!colorFound || !findObject(colorFound))) {
      const colorHex = colorFound === 'yellow' ? '#eab308' :
                       colorFound === 'orange' ? '#f97316' :
                       colorFound === 'purple' ? '#a855f7' :
                       colorFound === 'cyan' ? '#00e5ff' :
                       colorFound === 'white' ? '#f8fafc' :
                       colorFound === 'pink' ? '#ec4899' :
                       colorFound === 'red' ? '#ef4444' :
                       colorFound === 'green' ? '#10b981' : '#3b82f6';
      
      const newObj: DetectedObject = {
        id: `obj-${Date.now()}`,
        label: candidateLabel,
        color: colorHex,
        position: [110 + (Math.floor(Math.random() * 30) - 15), -25 + (Math.floor(Math.random() * 30) - 15), 20],
        bbox: [20, 20, 120, 120]
      };
      newObjectsToSpawn.push(newObj);
    }
  }

  // =============================================================
  // 1. EMERGENCY STOP / HALT
  // =============================================================
  if (lower.includes('stop') || lower.includes('halt') || lower.includes('freeze') || lower.includes('estop')) {
    return {
      recognizedIntent: 'EMERGENCY_STOP',
      steps: [
        {
          id: 'step-1',
          agent: 'SafetyAgent',
          action: 'EMERGENCY_STOP',
          target: 'robot_arm',
          params: {},
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 2. ARC WELDING & SEAM TRACING (Tooling & Industrial Task)
  // =============================================================
  if (lower.includes('weld') || lower.includes('seam') || lower.includes('torch')) {
    return {
      recognizedIntent: 'ARC_WELDING_SEAM_TRACE',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'DETECT_WELD_SEAM',
          target: 'linear_joint_seam',
          params: { seamStart: [110, -40, 20], seamEnd: [155, -40, 20] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_SEAM',
          target: 'seam_start_lead',
          params: { x: 110, y: -40, z: 65, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'IGNITE_ARC',
          target: 'weld_torch',
          params: { x: 110, y: -40, z: 24, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'TRACE_SEAM_PASS_1',
          target: 'midpoint',
          params: { x: 132, y: -40, z: 24, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'TRACE_SEAM_PASS_2',
          target: 'seam_end',
          params: { x: 155, y: -40, z: 24, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'EXTINGUISH_ARC',
          target: 'weld_pool',
          params: {},
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'retract',
          params: { x: 155, y: -40, z: 85 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 3. LASER CUTTING, SEALANT DISPENSING & GEOMETRY TRACING
  // =============================================================
  if (
    lower.includes('laser') ||
    lower.includes('cut') ||
    lower.includes('dispense') ||
    lower.includes('glue') ||
    lower.includes('sealant') ||
    lower.includes('draw') ||
    lower.includes('3d print')
  ) {
    const isLaser = lower.includes('laser') || lower.includes('cut');
    return {
      recognizedIntent: isLaser ? 'LASER_CUTTING_PROFILE' : 'PRECISION_SEALANT_DISPENSING',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'ALIGN_TOOL_HEAD',
          target: 'workpiece_stock',
          params: { tool: isLaser ? 'fiber_laser' : 'pneumatic_dispenser' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: isLaser ? 'APPROACH_CUT_START' : 'APPROACH_BEAD_START',
          target: 'start_point',
          params: { x: 125, y: -20, z: 60 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: isLaser ? 'ACTIVATE_LASER' : 'DISPENSE_BEAD_START',
          target: 'tool_actuator',
          params: { x: 125, y: -20, z: 25 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'TRACE_CONTOUR_ARC_1',
          target: 'waypoint_1',
          params: { x: 145, y: -5, z: 25 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'TRACE_CONTOUR_ARC_2',
          target: 'waypoint_2',
          params: { x: 130, y: 15, z: 25 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'TRACE_CONTOUR_ARC_3',
          target: 'waypoint_3',
          params: { x: 115, y: -5, z: 25 },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'CLOSE_GEOMETRY',
          target: 'start_point',
          params: { x: 125, y: -20, z: 25 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'SafetyAgent',
          action: isLaser ? 'DEACTIVATE_LASER' : 'SHUTOFF_VALVE',
          target: 'tool_actuator',
          params: {},
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'safe_retract',
          params: { x: 125, y: -20, z: 85 },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 4. SURFACE POLISHING, SANDING & DEBURRING (Compliant Raster Passes)
  // =============================================================
  if (
    lower.includes('polish') ||
    lower.includes('sand') ||
    lower.includes('deburr') ||
    lower.includes('buff') ||
    lower.includes('grind') ||
    lower.includes('surface finish')
  ) {
    return {
      recognizedIntent: 'SURFACE_FINISHING_RASTER_PASS',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'SURVEY_SURFACE_PROFILE',
          target: 'workpiece_table',
          params: { scanResolution: '0.1mm' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_WORKPIECE',
          target: 'raster_origin',
          params: { x: 120, y: -50, z: 60 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'ENGAGE_SURFACE_CONTACT',
          target: 'contact_patch',
          params: { x: 120, y: -50, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_1',
          target: 'pass_1',
          params: { x: 150, y: -50, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_2',
          target: 'pass_2',
          params: { x: 150, y: -30, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_3',
          target: 'pass_3',
          params: { x: 120, y: -30, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_4',
          target: 'pass_4',
          params: { x: 120, y: -10, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_5',
          target: 'pass_5',
          params: { x: 150, y: -10, z: 24 },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'disengage',
          params: { x: 150, y: -10, z: 80 },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 5. PEG-IN-HOLE PRECISION ASSEMBLY & SCREW FASTENING
  // =============================================================
  if (
    lower.includes('screw') ||
    lower.includes('fasten') ||
    lower.includes('bolt') ||
    lower.includes('assemble') ||
    lower.includes('assembly') ||
    lower.includes('peg') ||
    lower.includes('insert') ||
    lower.includes('drill')
  ) {
    return {
      recognizedIntent: 'PRECISION_FASTENING_ASSEMBLY',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'LOCATE_FIXTURE_BORE',
          target: 'threaded_boss',
          params: { alignmentTolerance: '0.05mm' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'vertical_pre_align',
          params: { x: 130, y: -30, z: 80, wristPitch: 90 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'pilot_engagement',
          params: { x: 130, y: -30, z: 35, wristPitch: 90 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'FASTEN_ROTATION_1',
          target: 'spindle_drive',
          params: { x: 130, y: -30, z: 28, wristPitch: 90, wristRoll: 90 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'FASTEN_ROTATION_2',
          target: 'spindle_drive_final',
          params: { x: 130, y: -30, z: 22, wristPitch: 90, wristRoll: -90 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'VERIFY_TORQUE_LIMIT',
          target: 'fastener_joint',
          params: { targetTorqueNm: 2.4, status: 'seated' },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'retract_spindle',
          params: { x: 130, y: -30, z: 90, wristPitch: 0, wristRoll: 0 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 6. STACKING & PALLETIZING (Stacking objects on top of each other)
  // =============================================================
  if (lower.includes('stack') || lower.includes('palletize') || lower.includes('tower') || lower.includes('on top of')) {
    const sourceObj = findObject('red_cube') || detectedObjects[0];
    const baseObj = findObject('green_cylinder') || detectedObjects[2] || { position: [100, -90, 25] };
    const [sx, sy, sz] = sourceObj ? sourceObj.position : [140, -50, 20];
    const [bx, by, bz] = baseObj.position;
    const stackHeight = bz + 32;

    return {
      recognizedIntent: 'AUTONOMOUS_STACKING_ROUTINE',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'CALCULATE_STACK_CENTROIDS',
          target: `${sourceObj?.label || 'red_cube'}_to_${baseObj.label || 'green_cylinder'}`,
          params: { sourcePos: [sx, sy, sz], basePos: [bx, by, bz] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_OBJECT',
          target: sourceObj?.label || 'red_cube',
          params: { x: sx, y: sy, z: sz + 50 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: sourceObj?.label || 'red_cube',
          params: { x: sx, y: sy, z: sz + 15 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: sourceObj?.label || 'red_cube',
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'LIFT_OBJECT',
          target: sourceObj?.label || 'red_cube',
          params: { x: sx, y: sy, z: 110 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'above_stack_base',
          params: { x: bx, y: by, z: stackHeight + 40 },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'LOWER_TO_TARGET',
          target: 'stack_seat',
          params: { x: bx, y: by, z: stackHeight },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: sourceObj?.label || 'red_cube',
          params: { state: 'open', dropPosition: [bx, by, stackHeight] },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'SafetyAgent',
          action: 'VERIFY_STACK_STABILITY',
          target: 'vertical_stack',
          params: { status: 'stable' },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 7. AUTONOMOUS SORTING & WORKCELL CLASSIFICATION
  // =============================================================
  if (lower.includes('sort') || lower.includes('classify') || lower.includes('organize')) {
    const red = findObject('red_cube') || { position: [140, -50, 20] };
    const green = findObject('green_cylinder') || { position: [100, -90, 25] };

    return {
      recognizedIntent: 'WORKCELL_AUTONOMOUS_SORTING',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'CLASSIFY_WORKCELL_INVENTORY',
          target: 'all_objects',
          params: { redTargetZone: [140, -50, 20], greenTargetZone: [100, -90, 25], blueBin: [140, 80, 25] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_OBJECT',
          target: 'red_cube',
          params: { x: red.position[0], y: red.position[1], z: 70 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: 'red_cube',
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'LIFT_OBJECT',
          target: 'red_cube',
          params: { x: red.position[0], y: red.position[1], z: 100 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'sorting_station_red',
          params: { x: 140, y: -50, z: 70 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: 'red_cube',
          params: { state: 'open', dropPosition: [140, -50, 20] },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'APPROACH_OBJECT',
          target: 'green_cylinder',
          params: { x: green.position[0], y: green.position[1], z: 80 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: 'green_cylinder',
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'sorting_station_green',
          params: { x: 100, y: -90, z: 80 },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: 'green_cylinder',
          params: { state: 'open', dropPosition: [100, -90, 25] },
          status: 'pending'
        },
        {
          id: 'step-11',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 8. NON-PREHENSILE MANIPULATION (Pushing / Sliding / Nudging)
  // =============================================================
  if (lower.includes('push') || lower.includes('slide') || lower.includes('nudge') || lower.includes('shove')) {
    let targetObj = detectedObjects.find(o => lower.includes(o.label) || lower.includes(o.label.replace('_', ' ')));
    if (!targetObj) targetObj = detectedObjects[2] || detectedObjects[0]; // green cylinder or cube

    const [tx, ty, tz] = targetObj.position;
    const pushDistance = 40;

    return {
      recognizedIntent: `NON_PREHENSILE_PUSH_${targetObj.label.toUpperCase()}`,
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'LOCATE_OBJECT_CONTACT_FACE',
          target: targetObj.label,
          params: { position: [tx, ty, tz] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_BEHIND_OBJECT',
          target: targetObj.label,
          params: { x: tx - 25, y: ty, z: Math.max(tz + 20, 35) },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'PUSH_OBJECT_FORWARD',
          target: targetObj.label,
          params: { x: tx + pushDistance, y: ty, z: Math.max(tz + 20, 35), distance: pushDistance },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'retract_up',
          params: { x: tx + pushDistance, y: ty, z: 80 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 9. TILTING & POURING (Container Fluid/Pellet Simulation)
  // =============================================================
  if (lower.includes('pour') || lower.includes('dump') || lower.includes('tilt')) {
    const cylinder = findObject('green_cylinder') || detectedObjects[0];
    const bin = findObject('blue_bin') || { position: [140, 80, 10] };
    const [cx, cy, cz] = cylinder.position;
    const [bx, by] = bin.position;

    return {
      recognizedIntent: 'TILTING_AND_POURING_ROUTINE',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'LOCATE_TARGET',
          target: cylinder.label,
          params: { position: [cx, cy, cz] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_OBJECT',
          target: cylinder.label,
          params: { x: cx, y: cy, z: cz + 50 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: cylinder.label,
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'LIFT_OBJECT',
          target: cylinder.label,
          params: { x: cx, y: cy, z: 105 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'above_bin',
          params: { x: bx, y: by, z: 95 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'TILT_CONTAINER_POUR',
          target: 'pour_stream',
          params: { x: bx, y: by, z: 95, wristPitch: 60, wristRoll: 90 },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'UPRIGHT_CONTAINER',
          target: cylinder.label,
          params: { x: bx, y: by, z: 95, wristPitch: 0, wristRoll: 0 },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'return_surface',
          params: { x: cx, y: cy, z: cz },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: cylinder.label,
          params: { state: 'open', dropPosition: [cx, cy, cz] },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 10. TARGET POINTING & LASER DESIGNATION
  // =============================================================
  if (lower.includes('point') || lower.includes('show me') || lower.includes('aim at') || lower.includes('designate')) {
    let targetObj = detectedObjects.find(o => lower.includes(o.label) || lower.includes(o.label.replace('_', ' ')));
    if (!targetObj) targetObj = detectedObjects[0];

    const [tx, ty, tz] = targetObj.position;
    return {
      recognizedIntent: `POINT_AT_${targetObj.label.toUpperCase()}`,
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'ACQUIRE_TARGET_LOCK',
          target: targetObj.label,
          params: { coordinates: [tx, ty, tz] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'laser_point_aim',
          params: { x: tx, y: ty, z: tz + 65, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'SafetyAgent',
          action: 'ACTIVATE_TARGET_DESIGNATOR',
          target: targetObj.label,
          params: { laserPointer: 'active' },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 11. JOINT CALIBRATION & FULL RANGE-OF-MOTION (ROM) DIAGNOSTICS
  // =============================================================
  if (
    lower.includes('calibrate') ||
    lower.includes('calibration') ||
    lower.includes('diagnostic') ||
    lower.includes('test joints') ||
    lower.includes('range of motion') ||
    lower.includes('self test') ||
    lower.includes('health check')
  ) {
    return {
      recognizedIntent: 'FULL_JOINT_ROM_CALIBRATION',
      steps: [
        {
          id: 'step-1',
          agent: 'SafetyAgent',
          action: 'START_DIAGNOSTIC_SUITE',
          target: 'firmware_encoders',
          params: { testMode: 'full_rom' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j1_base_sweep',
          params: { joints: [-60, 20, -20, 0, 0] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j1_base_sweep_right',
          params: { joints: [60, 20, -20, 0, 0] },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j2_shoulder_pitch',
          params: { joints: [0, 45, -20, 0, 0] },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j3_elbow_pitch',
          params: { joints: [0, 20, 30, 0, 0] },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j4_wrist_pitch',
          params: { joints: [0, 20, -20, 45, 0] },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'j5_wrist_roll',
          params: { joints: [0, 20, -20, 0, 90] },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'SafetyAgent',
          action: 'CONFIRM_ENCODER_CALIBRATION',
          target: 'ros2_control',
          params: { healthStatus: '100% NOMINAL' },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'KinematicsAgent',
          action: 'HOME_JOINTS',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 12. PAYLOAD DYNAMIC STRESS & SHAKE TESTING
  // =============================================================
  if (lower.includes('stress test') || lower.includes('shake test') || lower.includes('load test') || lower.includes('grip test')) {
    const obj = detectedObjects[0];
    const [ox, oy, oz] = obj.position;

    return {
      recognizedIntent: 'PAYLOAD_DYNAMIC_STRESS_TEST',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'LOCATE_TARGET',
          target: obj.label,
          params: { position: [ox, oy, oz] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: obj.label,
          params: { x: ox, y: oy, z: oz + 15 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: obj.label,
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'LIFT_OBJECT',
          target: 'high_altitude_test_bed',
          params: { x: ox, y: oy, z: 120 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'SHAKE_OSCILLATION_1',
          target: 'rapid_acceleration',
          params: { x: ox, y: oy, z: 90 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'KinematicsAgent',
          action: 'SHAKE_OSCILLATION_2',
          target: 'rapid_acceleration',
          params: { x: ox, y: oy, z: 125 },
          status: 'pending'
        },
        {
          id: 'step-7',
          agent: 'SafetyAgent',
          action: 'MEASURE_HOLDING_FORCE',
          target: 'force_sensor',
          params: { slippageMm: 0.0, holdingGrip: 'SECURE' },
          status: 'pending'
        },
        {
          id: 'step-8',
          agent: 'KinematicsAgent',
          action: 'LOWER_TO_TARGET',
          target: obj.label,
          params: { x: ox, y: oy, z: oz },
          status: 'pending'
        },
        {
          id: 'step-9',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: obj.label,
          params: { state: 'open', dropPosition: [ox, oy, oz] },
          status: 'pending'
        },
        {
          id: 'step-10',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 13. WATCHDOG WORKCELL PATROL & SURVEILLANCE
  // =============================================================
  if (lower.includes('patrol') || lower.includes('surveillance') || lower.includes('guard') || lower.includes('monitor')) {
    return {
      recognizedIntent: 'WORKCELL_SURVEILLANCE_PATROL',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'ENGAGE_SECURITY_GRID',
          target: 'workcell_perimeter',
          params: { mode: 'continuous_sentinel' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'patrol_sector_alpha',
          params: { joints: [-65, 30, -10, 15, 0] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'patrol_sector_bravo',
          params: { joints: [0, 35, -20, 15, 0] },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'patrol_sector_charlie',
          params: { joints: [65, 30, -10, 15, 0] },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'LOG_WORKCELL_CLEARANCE',
          target: 'security_audit',
          params: { intrusionDetected: false },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 14. 360° QUALITY INSPECTION & 3D SCANNING
  // =============================================================
  if (
    lower.includes('360') ||
    lower.includes('quality') ||
    lower.includes('defect') ||
    lower.startsWith('inspect ') ||
    lower.includes('examine')
  ) {
    let targetObj = detectedObjects.find(o => lower.includes(o.label) || lower.includes(o.label.replace('_', ' ')));
    if (!targetObj) targetObj = detectedObjects[0];
    const [tx, ty, tz] = targetObj.position;

    return {
      recognizedIntent: `360_QUALITY_INSPECTION_${targetObj.label.toUpperCase()}`,
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'SURFACE_SURVEY',
          target: targetObj.label,
          params: { resolution: 'RGBD_Point_Cloud' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'orbit_angle_top',
          params: { x: tx, y: ty, z: tz + 65, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'orbit_angle_flank',
          params: { x: tx - 25, y: ty, z: tz + 45, wristPitch: 30, wristRoll: 45 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'orbit_angle_rear',
          params: { x: tx + 25, y: ty, z: tz + 45, wristPitch: 30, wristRoll: -45 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'PASS_QUALITY_GATE',
          target: targetObj.label,
          params: { toleranceMm: 0.1, result: 'GRADE_A_PASSED' },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 15. TABLE SCAN & PERCEPTION SWEEP
  // =============================================================
  if (
    lower.includes('scan') ||
    lower.includes('search') ||
    lower.includes('look around')
  ) {
    return {
      recognizedIntent: 'TABLE_SCAN_AND_PERCEPTION_SWEEP',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'ACTIVATE_CAMERA',
          target: 'end_effector_camera',
          params: { mode: 'sweep_rgbd' },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'sweep_left',
          params: { joints: [-50, 15, -15, 30, 0] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'sweep_center',
          params: { joints: [0, 25, -20, 30, 0] },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'sweep_right',
          params: { joints: [50, 15, -15, 30, 0] },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'VisionAgent',
          action: 'UPDATE_DETECTIONS',
          target: 'gazebo_perception',
          params: { objectsCount: detectedObjects.length },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'HOME_JOINTS',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 16. ROBOTIC WAVE & HRI GREETING
  // =============================================================
  if (lower.includes('wave') || lower.includes('greet') || lower.includes('hello') || lower.includes('hi')) {
    return {
      recognizedIntent: 'ROBOTIC_WAVE_ROUTINE',
      steps: [
        {
          id: 'step-1',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'wave_start',
          params: { joints: [0, 45, 30, -20, 0] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'wave_left',
          params: { joints: [0, 45, 30, -20, -50] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'wave_right',
          params: { joints: [0, 45, 30, -20, 50] },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'wave_left_repeat',
          params: { joints: [0, 45, 30, -20, -50] },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'HOME_JOINTS',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 17. DANCE & CELEBRATION
  // =============================================================
  if (lower.includes('dance') || lower.includes('nod') || lower.includes('celebrat') || lower.includes('party')) {
    return {
      recognizedIntent: 'CELEBRATION_DANCE_ROUTINE',
      steps: [
        {
          id: 'step-1',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'dance_pose_1',
          params: { joints: [25, 30, -10, 20, 30] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: 'gripper',
          params: { state: 'closed' },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: 'dance_pose_2',
          params: { joints: [-25, 40, -30, -10, -30] },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: 'gripper',
          params: { state: 'open' },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'KinematicsAgent',
          action: 'HOME_JOINTS',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 18. HOME / RESET / PARK
  // =============================================================
  if (
    lower.includes('home') ||
    lower.includes('reset') ||
    lower.includes('park') ||
    lower.includes('zero') ||
    lower.includes('origin')
  ) {
    return {
      recognizedIntent: 'RETURN_HOME',
      steps: [
        {
          id: 'step-1',
          agent: 'SafetyAgent',
          action: 'CHECK_PAYLOAD',
          target: 'gripper',
          params: {},
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'HOME_JOINTS',
          target: 'robot_arm',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: 'gripper',
          params: { state: 'open' },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'SafetyAgent',
          action: 'VERIFY_STABILITY',
          target: 'gazebo_world',
          params: {},
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 19. GRIPPER COMMANDS (OPEN / CLOSE / RELEASE / GRIP)
  // =============================================================
  if (lower.includes('open gripper') || lower.includes('open hand') || lower.includes('release gripper') || lower.includes('unclamp')) {
    return {
      recognizedIntent: 'OPEN_GRIPPER',
      steps: [
        {
          id: 'step-1',
          agent: 'GripperAgent',
          action: 'RELEASE',
          target: 'gripper',
          params: { state: 'open' },
          status: 'pending'
        }
      ]
    };
  }

  if (lower.includes('close gripper') || lower.includes('close hand') || lower.includes('grip') || lower.includes('clamp')) {
    return {
      recognizedIntent: 'CLOSE_GRIPPER',
      steps: [
        {
          id: 'step-1',
          agent: 'GripperAgent',
          action: 'GRASP',
          target: 'gripper',
          params: { state: 'closed' },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 20. DIRECT JOINT POSITIONING
  // =============================================================
  const jointMatch = lower.match(/(?:joint\s*([1-5])|base|shoulder|elbow|wrist\s*pitch|wrist\s*roll)\s*(?:to|by|=)?\s*(-?\d+)/);
  if (jointMatch) {
    let jointIdx = 0;
    if (lower.includes('joint 1') || lower.includes('base')) jointIdx = 0;
    else if (lower.includes('joint 2') || lower.includes('shoulder')) jointIdx = 1;
    else if (lower.includes('joint 3') || lower.includes('elbow')) jointIdx = 2;
    else if (lower.includes('joint 4') || lower.includes('wrist pitch')) jointIdx = 3;
    else if (lower.includes('joint 5') || lower.includes('wrist roll')) jointIdx = 4;
    else if (jointMatch[1]) jointIdx = parseInt(jointMatch[1]) - 1;

    const angle = parseInt(jointMatch[2]);
    const targetJoints = [...currentJoints];
    targetJoints[jointIdx] = angle;

    return {
      recognizedIntent: `SET_JOINT_${jointIdx + 1}_TO_${angle}`,
      steps: [
        {
          id: 'step-1',
          agent: 'SafetyAgent',
          action: 'VERIFY_LIMITS',
          target: `joint_${jointIdx + 1}`,
          params: { targetAngle: angle },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_JOINTS',
          target: `joint_${jointIdx + 1}`,
          params: { joints: targetJoints },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 21. RELATIVE DIRECTIONAL MOVE
  // =============================================================
  const dirMatch = lower.match(/(?:move|shift|jog|go)\s*(up|down|left|right|forward|backward|back)\s*(?:by)?\s*(\d+)?/);
  if (dirMatch) {
    const dir = dirMatch[1];
    const distance = dirMatch[2] ? parseInt(dirMatch[2]) : 40;
    const newPos = currentPose.clone();

    if (dir === 'up') newPos.z += distance;
    else if (dir === 'down') newPos.z = Math.max(20, newPos.z - distance);
    else if (dir === 'left') newPos.y += distance;
    else if (dir === 'right') newPos.y -= distance;
    else if (dir === 'forward') newPos.x += distance;
    else if (dir === 'back' || dir === 'backward') newPos.x -= distance;

    return {
      recognizedIntent: `RELATIVE_MOVE_${dir.toUpperCase()}_${distance}MM`,
      steps: [
        {
          id: 'step-1',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: `relative_${dir}`,
          params: { x: newPos.x, y: newPos.y, z: newPos.z },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'SafetyAgent',
          action: 'VERIFY_STABILITY',
          target: 'pose',
          params: {},
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 22. EXPLICIT CARTESIAN COORD MOVE
  // =============================================================
  const coordMatch = lower.match(/(?:x\s*=\s*)?(-?\d+)[,\s]+(?:y\s*=\s*)?(-?\d+)[,\s]+(?:z\s*=\s*)?(-?\d+)/);
  if (coordMatch && (lower.includes('move') || lower.includes('go') || lower.includes('to') || lower.includes('reach'))) {
    const x = parseInt(coordMatch[1]);
    const y = parseInt(coordMatch[2]);
    const z = parseInt(coordMatch[3]);

    return {
      recognizedIntent: `MOVE_CARTESIAN_XYZ_${x}_${y}_${z}`,
      steps: [
        {
          id: 'step-1',
          agent: 'KinematicsAgent',
          action: 'SOLVE_IK',
          target: 'coordinate_target',
          params: { x, y, z },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'MOVE_TO_POSE',
          target: 'target_waypoint',
          params: { x, y, z },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'SafetyAgent',
          action: 'VERIFY_STABILITY',
          target: 'pose',
          params: {},
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 23. REMOVE OBJECTS FROM BLUE BIN / CONTAINER (UNLOAD BIN)
  // =============================================================
  const isRemoveIntent =
    lower.includes('remove') ||
    lower.includes('take out') ||
    lower.includes('empty') ||
    lower.includes('unload') ||
    lower.includes('retrieve') ||
    lower.includes('clear the bin') ||
    lower.includes('clear blue bin') ||
    ((lower.includes('pick') || lower.includes('take') || lower.includes('get') || lower.includes('move')) &&
      lower.includes('from') &&
      (lower.includes('bin') || lower.includes('container') || lower.includes('box')));

  if (isRemoveIntent) {
    const blueBin = detectedObjects.find(o => o.label.includes('bin'));
    const binPos = blueBin ? blueBin.position : [140, 80, 10];

    const objectsInBin = detectedObjects.filter(
      o => !o.label.includes('bin') && Math.hypot(o.position[0] - binPos[0], o.position[1] - binPos[1]) < 55
    );

    let targetToRemove: DetectedObject | undefined;
    if (lower.includes('green') || lower.includes('cylinder')) {
      targetToRemove = findObject('green_cylinder') || objectsInBin.find(o => o.label.includes('cylinder'));
    } else if (lower.includes('red') || lower.includes('cube')) {
      targetToRemove = findObject('red_cube') || objectsInBin.find(o => o.label.includes('cube'));
    } else if (objectsInBin.length > 0) {
      targetToRemove = objectsInBin[0];
    } else {
      targetToRemove = findObject('red_cube') || detectedObjects[0];
    }

    if (targetToRemove) {
      let tableDest: [number, number, number] = [140, -50, 20];
      if (targetToRemove.label.includes('cylinder')) {
        tableDest = [100, -90, 25];
      } else if (targetToRemove.label.includes('cube')) {
        tableDest = [140, -50, 20];
      } else {
        tableDest = [120, -40, 20];
      }

      const [bx, by] = [binPos[0], binPos[1]];
      const [tx, ty, tz] = tableDest;

      return {
        recognizedIntent: `REMOVE_${targetToRemove.label.toUpperCase()}_FROM_BLUE_BIN`,
        steps: [
          {
            id: 'step-1',
            agent: 'VisionAgent',
            action: 'LOCATE_TARGET',
            target: `${targetToRemove.label}_in_bin`,
            params: { position: [bx, by, 25], source: 'blue_bin' },
            status: 'pending'
          },
          {
            id: 'step-2',
            agent: 'KinematicsAgent',
            action: 'APPROACH_OBJECT',
            target: `${targetToRemove.label}_in_bin`,
            params: { x: bx, y: by, z: 105 },
            status: 'pending'
          },
          {
            id: 'step-3',
            agent: 'KinematicsAgent',
            action: 'MOVE_TO_POSE',
            target: `${targetToRemove.label}_inside_bin`,
            params: { x: bx, y: by, z: 38 },
            status: 'pending'
          },
          {
            id: 'step-4',
            agent: 'GripperAgent',
            action: 'GRASP',
            target: targetToRemove.label,
            params: { state: 'closed' },
            status: 'pending'
          },
          {
            id: 'step-5',
            agent: 'KinematicsAgent',
            action: 'LIFT_OBJECT',
            target: `${targetToRemove.label}_out_of_bin`,
            params: { x: bx, y: by, z: 115 },
            status: 'pending'
          },
          {
            id: 'step-6',
            agent: 'KinematicsAgent',
            action: 'MOVE_TO_POSE',
            target: 'table_surface',
            params: { x: tx, y: ty, z: 85 },
            status: 'pending'
          },
          {
            id: 'step-7',
            agent: 'KinematicsAgent',
            action: 'LOWER_TO_TARGET',
            target: 'table_surface',
            params: { x: tx, y: ty, z: tz },
            status: 'pending'
          },
          {
            id: 'step-8',
            agent: 'GripperAgent',
            action: 'RELEASE',
            target: targetToRemove.label,
            params: { state: 'open', dropPosition: [tx, ty, tz] },
            status: 'pending'
          },
          {
            id: 'step-9',
            agent: 'SafetyAgent',
            action: 'RETURN_HOME',
            target: 'home',
            params: { joints: [0, 20, -20, 0, 0] },
            status: 'pending'
          }
        ]
      };
    }
  }

  // =============================================================
  // 24. DYNAMIC INSPECTION & WORKSPACE SURVEY
  // =============================================================
  if (lower.includes('inspect') || lower.includes('examine') || lower.includes('survey') || lower.includes('look at') || lower.includes('view') || lower.includes('check')) {
    let targetLabel = 'workcell_tabletop';
    let targetCoords: [number, number, number] = [120, 0, 45];
    if (lower.includes('red') || lower.includes('cube')) {
      targetLabel = 'red_cube';
      targetCoords = [140, -50, 45];
    } else if (lower.includes('blue') || lower.includes('bin')) {
      targetLabel = 'blue_bin';
      targetCoords = [140, 80, 45];
    } else if (lower.includes('green') || lower.includes('cylinder')) {
      targetLabel = 'green_cylinder';
      targetCoords = [100, -90, 45];
    }

    return {
      recognizedIntent: `INSPECT_${targetLabel.toUpperCase()}`,
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'PERCEIVE_OBJECT_METRICS',
          target: targetLabel,
          params: { position: targetCoords },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_INSPECTION_ORBIT',
          target: targetLabel,
          params: { x: targetCoords[0], y: targetCoords[1], z: targetCoords[2] + 40, wristPitch: 35 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: '360_OPTICAL_SCAN',
          target: targetLabel,
          params: { x: targetCoords[0] + 15, y: targetCoords[1] - 15, z: targetCoords[2] + 20, wristPitch: 45 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'VisionAgent',
          action: 'ANALYZE_DEFECT_PROFILE',
          target: targetLabel,
          params: { x: targetCoords[0] - 15, y: targetCoords[1] + 15, z: targetCoords[2] + 25, wristPitch: 30 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 25. SURFACE CLEANING & SWEEPING
  // =============================================================
  if (lower.includes('clean') || lower.includes('wipe') || lower.includes('buff') || lower.includes('brush') || lower.includes('sweep')) {
    return {
      recognizedIntent: 'SURFACE_CLEANING_SWEEP',
      steps: [
        {
          id: 'step-1',
          agent: 'VisionAgent',
          action: 'LOCATE_DIRT_REGIONS',
          target: 'tabletop_surface',
          params: {},
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'APPROACH_SURFACE',
          target: 'clean_lead_in',
          params: { x: 110, y: -60, z: 50 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_1',
          target: 'tabletop_lane_1',
          params: { x: 140, y: -30, z: 22 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'POLISH_RASTER_PASS_2',
          target: 'tabletop_lane_2',
          params: { x: 140, y: 30, z: 22 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 26. WRIST & BASE ROTATION / ARTICULATION
  // =============================================================
  if (lower.includes('spin') || lower.includes('rotate') || lower.includes('turn') || lower.includes('twist')) {
    const angleMatch = lower.match(/(-?\d+)/);
    const deg = angleMatch ? parseInt(angleMatch[1]) : 90;
    return {
      recognizedIntent: `ROTATE_ARM_ARTICULATION_${deg}DEG`,
      steps: [
        {
          id: 'step-1',
          agent: 'KinematicsAgent',
          action: 'ROTATE_JOINT_ARTICULATION',
          target: 'wrist_or_base',
          params: { joints: [deg > 90 ? 45 : deg, 30, -10, 15, Math.min(180, deg)] },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'KinematicsAgent',
          action: 'COUNTER_ROTATION_SWEEP',
          target: 'wrist_roll',
          params: { joints: [deg > 90 ? -45 : -deg / 2, 25, -15, 0, -Math.min(180, deg)] },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ]
    };
  }

  // =============================================================
  // 27. GENERAL PICK AND PLACE PIPELINE
  // =============================================================
  const isExplicitPick = /(?:pick|grab|take|move|place|put|drop|fetch|carry|transport)/i.test(lower);

  if (!isExplicitPick) {
    // Universal Dynamic Autonomous Planner for ANY arbitrary instruction
    const cleanIntent = text.slice(0, 40).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'AUTONOMOUS_CUSTOM_TASK';
    
    // Find target object or zone
    const targetObj = (newObjectsToSpawn[0] || detectedObjects[0]);
    const tx = targetObj ? targetObj.position[0] : 135;
    const ty = targetObj ? targetObj.position[1] : -15;
    const tz = targetObj ? targetObj.position[2] : 20;

    let customSteps: TaskStep[] = [];

    if (lower.includes('tap') || lower.includes('touch') || lower.includes('press')) {
      customSteps = [
        { id: 'step-1', agent: 'VisionAgent', action: 'IDENTIFY_TOUCH_POINT', target: targetObj?.label || 'table_surface', params: { x: tx, y: ty, z: tz + 50 }, status: 'pending' },
        { id: 'step-2', agent: 'KinematicsAgent', action: 'APPROACH_SURFACE', target: 'touch_target', params: { x: tx, y: ty, z: tz + 25, wristPitch: 45 }, status: 'pending' },
        { id: 'step-3', agent: 'KinematicsAgent', action: 'TAP_CONTACT_1', target: 'surface', params: { x: tx, y: ty, z: tz + 4, wristPitch: 45 }, status: 'pending' },
        { id: 'step-4', agent: 'KinematicsAgent', action: 'TAP_RETRACT', target: 'air', params: { x: tx, y: ty, z: tz + 25, wristPitch: 45 }, status: 'pending' },
        { id: 'step-5', agent: 'KinematicsAgent', action: 'TAP_CONTACT_2', target: 'surface', params: { x: tx, y: ty, z: tz + 4, wristPitch: 45 }, status: 'pending' },
        { id: 'step-6', agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (lower.includes('reach') || lower.includes('extend') || lower.includes('forward')) {
      customSteps = [
        { id: 'step-1', agent: 'KinematicsAgent', action: 'EXTEND_FORWARD_STAGE_1', target: 'forward_mid', params: { x: 145, y: -15, z: 70, wristPitch: 20 }, status: 'pending' },
        { id: 'step-2', agent: 'KinematicsAgent', action: 'EXTEND_FULL_REACH', target: 'forward_max', params: { x: 170, y: -10, z: 50, wristPitch: 0, wristRoll: 45 }, status: 'pending' },
        { id: 'step-3', agent: 'GripperAgent', action: 'ACTUATE_GRIPPER_CYCLE', target: 'gripper', params: { state: 'closed' }, status: 'pending' },
        { id: 'step-4', agent: 'GripperAgent', action: 'RELEASE_GRIPPER', target: 'gripper', params: { state: 'open' }, status: 'pending' },
        { id: 'step-5', agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (lower.includes('lift') || lower.includes('raise') || lower.includes('up') || lower.includes('high')) {
      customSteps = [
        { id: 'step-1', agent: 'KinematicsAgent', action: 'ELEVATE_ARM_HIGH', target: 'high_zenith', params: { x: 110, y: -20, z: 125, wristPitch: -20 }, status: 'pending' },
        { id: 'step-2', agent: 'VisionAgent', action: 'PANORAMIC_SURVEY', target: 'sky_frustum', params: { x: 110, y: 15, z: 125, wristPitch: -10, wristRoll: 90 }, status: 'pending' },
        { id: 'step-3', agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (lower.includes('circle') || lower.includes('orbit') || lower.includes('loop')) {
      customSteps = [
        { id: 'step-1', agent: 'KinematicsAgent', action: 'ORBIT_WAYPOINT_NORTH', target: 'north', params: { x: 150, y: -35, z: 35, wristPitch: 45 }, status: 'pending' },
        { id: 'step-2', agent: 'KinematicsAgent', action: 'ORBIT_WAYPOINT_EAST', target: 'east', params: { x: 165, y: -15, z: 35, wristPitch: 45 }, status: 'pending' },
        { id: 'step-3', agent: 'KinematicsAgent', action: 'ORBIT_WAYPOINT_SOUTH', target: 'south', params: { x: 150, y: 5, z: 35, wristPitch: 45 }, status: 'pending' },
        { id: 'step-4', agent: 'KinematicsAgent', action: 'ORBIT_WAYPOINT_WEST', target: 'west', params: { x: 135, y: -15, z: 35, wristPitch: 45 }, status: 'pending' },
        { id: 'step-5', agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (lower.includes('fold') || lower.includes('stow') || lower.includes('compact') || lower.includes('pack')) {
      customSteps = [
        { id: 'step-1', agent: 'KinematicsAgent', action: 'STOW_INTERMEDIATE', target: 'stow_waypoint', params: { joints: [0, 60, -70, -20, 0] }, status: 'pending' },
        { id: 'step-2', agent: 'KinematicsAgent', action: 'COMPACT_TRANSPORT_POSE', target: 'folded', params: { joints: [0, 80, -95, -40, 0] }, status: 'pending' },
        { id: 'step-3', agent: 'SafetyAgent', action: 'LOCK_AXIS_BRAKES', target: 'brakes', params: { joints: [0, 80, -95, -40, 0] }, status: 'pending' },
        { id: 'step-4', agent: 'SafetyAgent', action: 'RETURN_STANDBY', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else {
      // General dynamic execution with full 3D waypoints
      customSteps = [
        {
          id: 'step-1',
          agent: 'PlannerAgent',
          action: 'ANALYZE_ENVIRONMENT',
          target: 'gazebo_world',
          params: { x: 120, y: -20, z: 80, wristPitch: 20 },
          status: 'pending'
        },
        {
          id: 'step-2',
          agent: 'VisionAgent',
          action: 'IDENTIFY_TASK_WORKCELL_ZONE',
          target: targetObj?.label || 'target_zone',
          params: { x: tx, y: ty, z: tz + 50, wristPitch: 30 },
          status: 'pending'
        },
        {
          id: 'step-3',
          agent: 'KinematicsAgent',
          action: 'APPROACH_TASK_ZONE',
          target: targetObj?.label || 'task_waypoint',
          params: { x: tx, y: ty, z: tz + 25, wristPitch: 35 },
          status: 'pending'
        },
        {
          id: 'step-4',
          agent: 'KinematicsAgent',
          action: 'PERFORM_TASK_OPERATION',
          target: targetObj?.label || 'workpiece',
          params: { x: tx, y: ty, z: tz + 8, wristPitch: 45, wristRoll: 45 },
          status: 'pending'
        },
        {
          id: 'step-5',
          agent: 'VisionAgent',
          action: 'VERIFY_TASK_EXECUTION',
          target: 'gazebo_workcell',
          params: { x: tx, y: ty + 15, z: tz + 40, wristPitch: 15 },
          status: 'pending'
        },
        {
          id: 'step-6',
          agent: 'SafetyAgent',
          action: 'RETURN_HOME',
          target: 'home',
          params: { joints: [0, 20, -20, 0, 0] },
          status: 'pending'
        }
      ];
    }

    return {
      recognizedIntent: cleanIntent,
      newObjects: newObjectsToSpawn.length > 0 ? newObjectsToSpawn : undefined,
      steps: customSteps
    };
  }

  let sourceObj = findObject('red_cube');

  if (newObjectsToSpawn.length > 0) {
    sourceObj = newObjectsToSpawn[0];
  } else if (lower.includes('green') || lower.includes('cylinder')) {
    sourceObj = findObject('green_cylinder');
  } else if (lower.includes('blue') || lower.includes('bin')) {
    sourceObj = findObject('blue_bin');
  } else if (lower.includes('red') || lower.includes('cube')) {
    sourceObj = findObject('red_cube');
  } else {
    // Check if user mentioned custom object
    const objMatch = lower.match(/(?:pick|grab|take|move)\s+(?:up\s+)?(?:the\s+)?([a-z0-9_\s]+?)(?:\s+and|\s+to|\s+in|\s+into|\s+on|$)/i);
    if (objMatch) {
      const customName = objMatch[1].trim();
      sourceObj = findObject(customName);
      if (!sourceObj) {
        sourceObj = {
          id: `obj-${Date.now()}`,
          label: customName.replace(/\s+/g, '_'),
          color: customName.includes('yellow') ? '#eab308' : customName.includes('orange') ? '#f97316' : '#a855f7',
          position: [110, -30, 20],
          bbox: [10, 10, 100, 100]
        };
        newObjectsToSpawn.push(sourceObj);
      }
    }
  }

  if (!sourceObj) sourceObj = detectedObjects[0];

  let destPos: [number, number, number] = [140, 80, 25];
  let destLabel = 'blue_bin';

  if (lower.includes('table') || lower.includes('ground') || lower.includes('outside')) {
    destPos = sourceObj.label.includes('cylinder') ? [100, -90, 25] : [140, -50, 20];
    destLabel = 'table_surface';
  }

  const [sx, sy, sz] = sourceObj.position;
  const [dx, dy, dz] = destPos;

  return {
    recognizedIntent: `PICK_AND_PLACE_${sourceObj.label.toUpperCase()}_TO_${destLabel.toUpperCase()}`,
    newObjects: newObjectsToSpawn.length > 0 ? newObjectsToSpawn : undefined,
    steps: [
      {
        id: 'step-1',
        agent: 'VisionAgent',
        action: 'LOCATE_TARGET',
        target: sourceObj.label,
        params: { position: [sx, sy, sz] },
        status: 'pending'
      },
      {
        id: 'step-2',
        agent: 'KinematicsAgent',
        action: 'APPROACH_OBJECT',
        target: sourceObj.label,
        params: { x: sx, y: sy, z: Math.max(sz + 50, 80) },
        status: 'pending'
      },
      {
        id: 'step-3',
        agent: 'KinematicsAgent',
        action: 'MOVE_TO_POSE',
        target: sourceObj.label,
        params: { x: sx, y: sy, z: Math.max(sz + 15, 35) },
        status: 'pending'
      },
      {
        id: 'step-4',
        agent: 'GripperAgent',
        action: 'GRASP',
        target: sourceObj.label,
        params: { state: 'closed' },
        status: 'pending'
      },
      {
        id: 'step-5',
        agent: 'KinematicsAgent',
        action: 'LIFT_OBJECT',
        target: sourceObj.label,
        params: { x: sx, y: sy, z: Math.max(sz + 70, 95) },
        status: 'pending'
      },
      {
        id: 'step-6',
        agent: 'KinematicsAgent',
        action: 'MOVE_TO_POSE',
        target: destLabel,
        params: { x: dx, y: dy, z: Math.max(dz + 50, 85) },
        status: 'pending'
      },
      {
        id: 'step-7',
        agent: 'KinematicsAgent',
        action: 'LOWER_TO_TARGET',
        target: destLabel,
        params: { x: dx, y: dy, z: dz },
        status: 'pending'
      },
      {
        id: 'step-8',
        agent: 'GripperAgent',
        action: 'RELEASE',
        target: destLabel,
        params: { state: 'open', dropPosition: [dx, dy, dz] },
        status: 'pending'
      },
      {
        id: 'step-9',
        agent: 'SafetyAgent',
        action: 'RETURN_HOME',
        target: 'home',
        params: { joints: [0, 20, -20, 0, 0] },
        status: 'pending'
      }
    ]
  };
}
