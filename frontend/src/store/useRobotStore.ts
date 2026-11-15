import { create } from 'zustand';
import * as THREE from 'three';
import { computeFK, Pose3D } from '../kinematics/fk';
import { solveIK } from '../kinematics/ik';
import { planTaskFromNaturalLanguage } from './nlpPlanner';
// @ts-ignore shared ESM parser (same module the API uses)
import { parseCommand, planToTaskSteps, DEFAULT_SCENE_OBJECTS } from '../../../shared/commandParser.mjs';

export type ExecutionMode = 'sim' | 'real';
export type ArmMode = 'local' | 'gazebo' | 'physical';
export type GripperState = 'open' | 'closed';
export type ToolEffectType = 'welding' | 'laser' | 'dispense' | 'polish' | 'pour' | 'scan' | 'inspect' | null;

export interface TaskStep {
  id: string;
  actionId?: number;
  agent?: string;
  action: string;
  target?: string;
  params?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reason?: string;
}

export interface DetectedObject {
  id: string;
  label: string;
  color: string;
  position: [number, number, number];
  bbox: [number, number, number, number];
}

export interface Telemetry {
  ultrasonicCm: number;
  imu: { pitch: number; roll: number; yaw: number };
  tempC: number;
  batteryPct: number;
  currents: number[];
  timestamp: number;
}

export interface WeldSeam {
  start: [number, number, number];
  end: [number, number, number];
}

interface RobotState {
  // Joint angles in degrees [Base, Shoulder, Elbow, ForearmRoll, WristPitch, WristRoll]
  jointAngles: number[];
  targetAngles: number[];
  gripperState: GripperState;
  executionMode: ExecutionMode;
  isMoving: boolean;

  // EE Pose derived from FK
  currentPose: Pose3D;
  targetPosition: THREE.Vector3;

  // Telemetry & Vision
  telemetry: Telemetry;
  telemetryHistory: Telemetry[];
  detectedObjects: DetectedObject[];

  // AI Task Graph & Active Agent System
  currentTaskGoal: string | null;
  recognizedIntent: string | null;
  currentExecutionId: number;
  commandHistory: { id: string; command: string; time: string; intent: string }[];
  taskSteps: TaskStep[];
  currentStepIndex: number;
  stepProgress: number; // 0 - 100
  isAiProcessing: boolean;
  activeAgent: string | null;
  currentActionName: string | null;
  graspedObjectId: string | null;
  activeTrajectory: THREE.Vector3[];
  trajectoryTrail: THREE.Vector3[];

  // Active Gazebo 3D Simulation Effects
  activeToolEffect: ToolEffectType;
  weldSeams: WeldSeam[];
  dispensePath: [number, number, number][];

  // Actions
  setJointAngle: (index: number, angleDeg: number) => void;
  setAllJoints: (anglesDeg: number[]) => void;
  setLiveJoints: (anglesDeg: number[]) => void;
  setGripper: (state: GripperState) => void;
  setMode: (mode: ExecutionMode) => void;
  setTargetPosition: (pos: THREE.Vector3) => void;
  moveToIKTarget: (pos: THREE.Vector3) => void;
  updateTelemetry: (telemetry: Partial<Telemetry>) => void;
  submitAiCommand: (commandText: string) => Promise<void>;
  resetTaskGoal: () => void;
  emergencyStop: () => void;
  spawnObject: (obj: DetectedObject) => void;
  moveObject: (id: string, position: [number, number, number]) => void;
  removeObject: (id: string) => void;
  setActiveToolEffect: (effect: ToolEffectType) => void;
  clearWorkpieceEffects: () => void;
  setArmMode: (mode: ArmMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  setStepMode: (on: boolean) => void;
  armStep: () => void;
  setOverlays: (partial: Partial<RobotState['overlays']>) => void;
  actionPlan: any | null;
  armMode: ArmMode;
  playbackSpeed: number;
  paused: boolean;
  stepMode: boolean;
  stepArmed: boolean;
  runLock: boolean;
  commandQueue: string[];
  lastEvent: { code: string; message: string; at: number } | null;
  jointHistory: { t: number; j1: number; j2: number; j3: number; speed: number; done: number }[];
  overlays: { workspace: boolean; trail: boolean; waypoints: boolean; collisions: boolean };
  activeJointIndex: number;
}

export const useRobotStore = create<RobotState>((set, get) => ({
  jointAngles: [0, 20, -20, 0, 0, 0],
  targetAngles: [0, 20, -20, 0, 0, 0],
  gripperState: 'open',
  executionMode: 'sim',
  isMoving: false,

  currentPose: computeFK([0, 20, -20, 0, 0]),
  targetPosition: new THREE.Vector3(120, 0, 150),

  telemetry: {
    ultrasonicCm: 34.2,
    imu: { pitch: 0.1, roll: -0.2, yaw: 89.9 },
    tempC: 28.5,
    batteryPct: 92,
    currents: [110, 240, 180, 75, 40],
    timestamp: Date.now()
  },
  telemetryHistory: [],

  detectedObjects: DEFAULT_SCENE_OBJECTS.map((o: any) => ({
    id: o.id,
    label: o.label,
    color: o.color,
    position: o.position as [number, number, number],
    bbox: [10, 10, 100, 100] as [number, number, number, number]
  })),

  currentTaskGoal: null,
  recognizedIntent: null,
  currentExecutionId: 0,
  commandHistory: [],
  taskSteps: [],
  currentStepIndex: -1,
  stepProgress: 0,
  isAiProcessing: false,
  activeAgent: null,
  currentActionName: null,
  graspedObjectId: null,
  activeTrajectory: [],
  trajectoryTrail: [],

  activeToolEffect: null,
  weldSeams: [],
  dispensePath: [],
  actionPlan: null,
  armMode: 'local',
  playbackSpeed: 1,
  paused: false,
  stepMode: false,
  stepArmed: false,
  runLock: false,
  commandQueue: [],
  lastEvent: null,
  jointHistory: [],
  overlays: { workspace: false, trail: true, waypoints: true, collisions: false },
  activeJointIndex: -1,

  resetTaskGoal: () => {
    set({
      currentTaskGoal: null,
      recognizedIntent: null,
      taskSteps: [],
      currentStepIndex: -1,
      stepProgress: 0,
      activeAgent: null,
      currentActionName: null,
      activeToolEffect: null,
      activeTrajectory: [],
      trajectoryTrail: []
    });
  },

  setActiveToolEffect: (effect) => set({ activeToolEffect: effect }),
  clearWorkpieceEffects: () => set({ weldSeams: [], dispensePath: [] }),

  spawnObject: (newObj) => {
    set(state => ({
      detectedObjects: [...state.detectedObjects, newObj]
    }));
  },

  setJointAngle: (index, angleDeg) => {
    const newJoints = [...get().targetAngles];
    newJoints[index] = angleDeg;
    const pose = computeFK(newJoints);
    set({
      targetAngles: newJoints,
      jointAngles: newJoints,
      currentPose: pose
    });
  },

  setAllJoints: (anglesDeg) => {
    const pose = computeFK(anglesDeg);
    set({
      targetAngles: anglesDeg,
      jointAngles: anglesDeg,
      currentPose: pose
    });
  },

  // Called smoothly by 3D scene animation frame loop
  setLiveJoints: (anglesDeg) => {
    const pose = computeFK(anglesDeg);
    const eeZ = pose.position.z;
    const ultrasonic = Math.max(5, Math.min(60, Number((eeZ / 10).toFixed(1))));

    // Calculate dynamic motor load proportional to joint distance from zero
    const dynamicCurrents = anglesDeg.map((a, i) => Math.round(80 + Math.abs(a) * (i === 1 ? 4.2 : 2.5)));

    set(state => ({
      jointAngles: anglesDeg,
      currentPose: pose,
      trajectoryTrail: (() => {
        const last = state.trajectoryTrail[state.trajectoryTrail.length - 1];
        if (last && last.distanceTo(pose.position) < 1) return state.trajectoryTrail;
        return [...state.trajectoryTrail, pose.position.clone()].slice(-600);
      })(),
      jointHistory: [
        ...state.jointHistory,
        {
          t: Date.now(),
          j1: Number((anglesDeg[0] ?? 0).toFixed(1)),
          j2: Number((anglesDeg[1] ?? 0).toFixed(1)),
          j3: Number((anglesDeg[2] ?? 0).toFixed(1)),
          speed: Number(Math.hypot(...anglesDeg.map((angle, index) => angle - (state.jointAngles[index] ?? 0))).toFixed(1)),
          done: state.stepProgress
        }
      ].slice(-180),
      telemetry: {
        ...state.telemetry,
        ultrasonicCm: ultrasonic,
        imu: {
          pitch: Number((anglesDeg[1] * 0.4).toFixed(1)),
          roll: Number((anglesDeg[4] * 0.5).toFixed(1)),
          yaw: Number((anglesDeg[0] * 0.8).toFixed(1))
        },
        currents: dynamicCurrents,
        timestamp: Date.now()
      }
    }));
  },

  setGripper: (state) => {
    set({ gripperState: state });
    try {
      fetch('http://localhost:8080/api/robot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gripper: state })
      }).catch(() => {});
    } catch (e) {}
  },

  setMode: (mode) => set({ executionMode: mode }),

  setTargetPosition: (pos) => set({ targetPosition: pos }),

  moveToIKTarget: (pos) => {
    const ikResult = solveIK(pos, 0, get().targetAngles);
    if (ikResult.jointAngles) {
      const pose = computeFK(ikResult.jointAngles);
      set({
        targetAngles: ikResult.jointAngles,
        currentPose: pose,
        targetPosition: pos
      });
    }
  },

  updateTelemetry: (newTelem) => {
    const updated = { ...get().telemetry, ...newTelem, timestamp: Date.now() };
    const history = [...get().telemetryHistory, updated].slice(-30);
    set({ telemetry: updated, telemetryHistory: history });
  },

  submitAiCommand: async (commandText) => {
    const trimmedCommand = commandText.trim();
    if (!trimmedCommand) return;

    // Commands entered while a run is active are queued for deterministic
    // execution instead of cancelling the current action plan.
    if (get().runLock) {
      set(state => ({ commandQueue: [...state.commandQueue, trimmedCommand] }));
      return;
    }

    const executionId = Date.now();
    const state = get();
    set({
      currentExecutionId: executionId,
      runLock: true,
      isAiProcessing: true,
      currentTaskGoal: trimmedCommand,
      activeAgent: 'PlannerAgent',
      currentActionName: 'DECOMPOSING_INTENT_GRAPH',
      stepProgress: 10,
      currentStepIndex: -1,
      trajectoryTrail: [state.currentPose.position.clone()],
      activeTrajectory: []
    });

    // The shared deterministic parser is the source of truth for the
    // documented command-plan contract. Keep the older industrial planner as
    // a compatibility fallback for its existing welding/inspection presets.
    const parsed = parseCommand(trimmedCommand, state.detectedObjects as any);
    const legacyCommand = /\b(weld|laser|polish|screw|sealant|dispense|pour|scan|inspect|calibrat|stress|patrol|dance|remove from|unload)\b/i.test(trimmedCommand);
    let actionPlan: any | null = parsed.plan;
    let steps: TaskStep[];
    let recognizedIntent: string;
    let newObjects: DetectedObject[] | undefined;

    const sharedPlanIsUnsupportedLegacy = legacyCommand && parsed.plan?.feasibility?.issues?.some((issue: any) => issue.code === 'UNSUPPORTED_ACTION');
    if (parsed.handled && !sharedPlanIsUnsupportedLegacy) {
      recognizedIntent = parsed.plan?.understood || 'Command plan ready';
      steps = planToTaskSteps(parsed.plan).map((step: any) => ({
        ...step,
        status: step.status === 'failed' ? 'failed' : 'pending'
      }));
    } else {
      const legacyPlan = planTaskFromNaturalLanguage(
        trimmedCommand,
        state.currentPose.position,
        state.jointAngles,
        state.detectedObjects
      );
      recognizedIntent = legacyPlan.recognizedIntent;
      steps = legacyPlan.steps;
      newObjects = legacyPlan.newObjects;
      actionPlan = null;
    }

    // If new objects were spawned
    if (newObjects && newObjects.length > 0) {
      set(s => ({
        detectedObjects: [...s.detectedObjects, ...newObjects!]
      }));
    }

    const historyEntry = {
      id: `cmd-${executionId}`,
      command: trimmedCommand,
      time: new Date().toLocaleTimeString(),
      intent: recognizedIntent
    };

    // Notify backend API asynchronously without blocking 3D animation
    try {
      fetch('http://localhost:8080/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandText: trimmedCommand,
          plan: actionPlan,
          recognizedIntent,
          steps
        })
      }).catch(() => {});
    } catch (e) {}

    set(s => ({
      actionPlan,
      recognizedIntent,
      commandHistory: [historyEntry, ...s.commandHistory.filter(h => h.command !== commandText)].slice(0, 25),
      taskSteps: steps,
      isAiProcessing: false,
      stepProgress: 0
    }));

    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    const waitForPlayback = async (durationMs: number) => {
      let simulatedMs = 0;
      let stepGranted = !get().stepMode;
      while (simulatedMs < durationMs) {
        if (get().currentExecutionId !== executionId) return false;
        if (get().stepMode && get().stepArmed) {
          stepGranted = true;
          set({ stepArmed: false });
        }
        if (get().paused || (get().stepMode && !stepGranted)) {
          await sleep(50);
          continue;
        }
        const speed = Math.max(0.25, Math.min(4, get().playbackSpeed));
        const wallTime = Math.min(50, (durationMs - simulatedMs) / speed);
        await sleep(wallTime);
        simulatedMs += wallTime * speed;
        set({ stepProgress: Math.min(100, Math.round((simulatedMs / durationMs) * 100)) });
      }
      return true;
    };

    const failStep = (stepIndex: number, code: string, message: string) => {
      set(curr => ({
        lastEvent: { code, message, at: Date.now() },
        currentActionName: `FAILED: ${steps[stepIndex]?.action || 'action'}`,
        taskSteps: curr.taskSteps.map((item, index) => index === stepIndex ? { ...item, status: 'failed', reason: message } : item)
      }));
    };

    // Autonomous Robotic Execution Loop with Gazebo Physics Simulation
    for (let i = 0; i < steps.length; i++) {
      if (get().currentExecutionId !== executionId) return;
      const step = steps[i];
      let stepFailed = false;

      set(curr => ({
        activeAgent: step.agent || 'ExecutorAgent',
        currentStepIndex: i,
        currentActionName: `${step.action} [${step.target || ''}]`,
        stepProgress: 15,
        taskSteps: curr.taskSteps.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s))
      }));

      // A failed feasibility check is surfaced in the timeline and never sent
      // to the robot target.
      if (step.status === 'failed' || step.params?.blocked) {
        const issue = actionPlan?.feasibility?.issues?.find((item: any) => item.action_id === step.actionId);
        set(curr => ({
          lastEvent: {
            code: step.params?.code || issue?.code || 'UNSUPPORTED_ACTION',
            message: step.reason || issue?.message || 'Action was blocked before execution.',
            at: Date.now()
          },
          currentActionName: `BLOCKED: ${step.target || 'action'}`,
          taskSteps: curr.taskSteps.map((s, idx) => (idx === i ? { ...s, status: 'failed' } : s))
        }));
        break;
      }

      // ========================================================
      // 1. TOOL / SIMULATION EFFECT ACTIVATION
      // ========================================================
      if (step.action === 'IGNITE_ARC' || step.action.includes('WELD')) {
        set({ activeToolEffect: 'welding' });
        if (step.params?.x !== undefined && step.params?.y !== undefined) {
          const pt: [number, number, number] = [step.params.x, step.params.y, step.params.z ?? 20];
          set(s => ({
            weldSeams: [...s.weldSeams, { start: pt, end: pt }]
          }));
        }
      } else if (step.action === 'ACTIVATE_LASER' || step.action.includes('LASER')) {
        set({ activeToolEffect: 'laser' });
      } else if (step.action.includes('DISPENSE') || step.action.includes('GLUE')) {
        set({ activeToolEffect: 'dispense' });
        if (step.params?.x !== undefined && step.params?.y !== undefined) {
          const px = step.params.x;
          const py = step.params.y;
          const pz = step.params.z ?? 20;
          set(s => ({
            dispensePath: [...s.dispensePath, [px, py, pz]]
          }));
        }
      } else if (step.action.includes('POLISH') || step.action.includes('SAND') || step.action.includes('DEBURR')) {
        set({ activeToolEffect: 'polish' });
      } else if (step.action.includes('POUR') || step.action.includes('TILT')) {
        set({ activeToolEffect: 'pour' });
      } else if (step.action.includes('INSPECT') || step.action.includes('SCAN') || step.action === 'SURFACE_SURVEY') {
        set({ activeToolEffect: 'scan' });
      } else if (
        step.action.includes('EXTINGUISH') ||
        step.action.includes('DEACTIVATE') ||
        step.action.includes('DISENGAGE') ||
        step.action.includes('HOME') ||
        step.action === 'STOP'
      ) {
        set({ activeToolEffect: null });
      }

      // ========================================================
      // 2. KINEMATIC MOTIONS (IK WAYPOINTS & JOINT ANGLES)
      // ========================================================
      let targetX = step.params?.x;
      let targetY = step.params?.y;
      let targetZ = step.params?.z;

      if (targetX === undefined && step.params?.position && Array.isArray(step.params.position)) {
        targetX = step.params.position[0];
        targetY = step.params.position[1];
        targetZ = step.params.position[2];
      }

      if (targetX === undefined && step.target) {
        const obj = get().detectedObjects.find(
          o => o.label === step.target || o.id === step.target || step.target?.includes(o.label)
        );
        if (obj) {
          targetX = obj.position[0];
          targetY = obj.position[1];
          targetZ = obj.position[2] + (step.action.includes('APPROACH') || step.action.includes('LOCATE') ? 50 : 15);
        }
      }

      if (targetX !== undefined && targetY !== undefined) {
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ ?? 25);
        const pitchAngle = step.params?.wristPitch ?? 0;
        const ik = solveIK(targetPos, pitchAngle, get().targetAngles);

        if (ik.jointAngles && ik.feasible !== false) {
          // If a custom wrist pitch or roll was commanded
          if (step.params?.wristPitch !== undefined) {
            ik.jointAngles[4] = step.params.wristPitch;
          }
          if (step.params?.wristRoll !== undefined) {
            ik.jointAngles[5] = step.params.wristRoll;
          }

          set({
            targetAngles: ik.jointAngles,
            targetPosition: targetPos,
            activeTrajectory: [get().currentPose.position.clone(), targetPos]
          });
        } else {
          stepFailed = true;
          failStep(i, ik.issueCode || 'JOINT_LIMIT', ik.suggestion || `The arm could not reach ${step.target || 'the commanded pose'}.`);
        }
      } else if (step.params?.joints) {
        const pose = computeFK(step.params.joints);
        set({
          targetAngles: step.params.joints,
          targetPosition: pose.position,
          activeTrajectory: [get().currentPose.position.clone(), pose.position]
        });
      } else if (step.action === 'GRASP') {
        const graspTarget = step.params?.objectId || (step.target && step.target !== 'gripper' ? step.target : null);
        if (!graspTarget) {
          set({ gripperState: 'closed' });
        } else {
          const object = get().detectedObjects.find(obj => obj.id === graspTarget || obj.label === graspTarget);
          const distance = object
            ? get().currentPose.position.distanceTo(new THREE.Vector3(...object.position))
            : Infinity;
          if (!object) {
            stepFailed = true;
            failStep(i, 'UNKNOWN_OBJECT', `The gripper could not find ${graspTarget}.`);
          } else if (distance > 50) {
            stepFailed = true;
            failStep(i, 'GRASP_FAILED', `${object.label} is ${distance.toFixed(1)} mm from the gripper; the grasp was outside its bounds.`);
          } else {
            set({ gripperState: 'closed', graspedObjectId: object.id });
          }
        }
      } else if (step.action === 'RELEASE') {
        set({ gripperState: 'open' });

        const graspedId = get().graspedObjectId;
        if (graspedId) {
          // Accurate drop position in Gazebo world
          const currentEE = get().currentPose.position;
          const dropPosition: [number, number, number] = step.params?.dropPosition || (
            step.params?.x !== undefined && step.params?.y !== undefined
              ? [Number(step.params.x), Number(step.params.y), Number(step.params.z ?? 22)]
              : [Number(currentEE.x.toFixed(1)), Number(currentEE.y.toFixed(1)), 22]
          );

          set(curr => ({
            graspedObjectId: null,
            detectedObjects: curr.detectedObjects.map(obj =>
              obj.label === graspedId || obj.id === graspedId
                ? { ...obj, position: dropPosition }
                : obj
            )
          }));
        }
      } else if (step.action === 'EMERGENCY_STOP') {
        get().emergencyStop();
        break;
      }

      if (stepFailed) break;

      // ========================================================
      // 3. PHYSICAL MANIPULATION OF OBJECTS (PUSHING & STACKING)
      // ========================================================
      if (step.action === 'PUSH_OBJECT_FORWARD' && step.target) {
        const tgt = step.target;
        const pushDistance = step.params?.distance ?? 40;
        set(s => ({
          detectedObjects: s.detectedObjects.map(obj =>
            obj.label === tgt || obj.id === tgt
              ? { ...obj, position: [obj.position[0] + pushDistance, obj.position[1], obj.position[2]] as [number, number, number] }
              : obj
          )
        }));
      }

      // ========================================================
      // 4. ANIMATED PROGRESS SIMULATION (Physics velocity clock)
      // ========================================================
      const durationMs =
        step.action.includes('MOVE') || step.action.includes('TRACE') || step.action.includes('POLISH')
          ? 1300
          : step.action.includes('APPROACH')
          ? 1100
          : 700;

      // Send this waypoint as soon as it becomes active. The backend relays
      // joint targets to ROS 2/Gazebo over MQTT; waiting until the step ends
      // made the real simulation appear one step behind the planner.
      try {
        fetch('http://localhost:8080/api/robot/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            joints: get().targetAngles,
            gripper: get().gripperState,
            durationMs
          })
        }).catch(() => {});
      } catch (e) {}

      if (!(await waitForPlayback(durationMs))) return;

      // Mark step completed
      set(curr => ({
        taskSteps: curr.taskSteps.map((s, idx) => (idx === i ? { ...s, status: 'completed' } : s))
      }));

    }

    if (get().currentExecutionId !== executionId) return;

    const failedSteps = get().taskSteps.filter(step => step.status === 'failed');
    const failed = failedSteps.length > 0;
    set({
      activeAgent: null,
      currentActionName: failed ? `TASK_FAILED: ${failedSteps[0].reason || 'execution stopped'}` : 'TASK_COMPLETED',
      activeToolEffect: null,
      stepProgress: failed ? get().stepProgress : 100,
      activeTrajectory: [],
      runLock: false
    });

    const nextCommand = get().commandQueue[0];
    if (nextCommand) {
      set(state => ({ commandQueue: state.commandQueue.slice(1) }));
      void get().submitAiCommand(nextCommand);
    }
  },

  emergencyStop: () => {
    const cur = get().jointAngles;
    set({
      currentExecutionId: get().currentExecutionId + 1,
      targetAngles: cur,
      isMoving: false,
      runLock: false,
      commandQueue: [],
      activeAgent: null,
      activeToolEffect: null,
      currentActionName: 'EMERGENCY_STOPPED',
      graspedObjectId: null,
      stepProgress: 0,
      taskSteps: get().taskSteps.map(s => (s.status === 'running' ? { ...s, status: 'failed' } : s))
    });

    try {
      fetch('http://localhost:8080/api/robot/estop', { method: 'POST' }).catch(() => {});
    } catch (e) {}
  },

  moveObject: (id, position) => {
    set(state => ({
      detectedObjects: state.detectedObjects.map(obj => obj.id === id ? { ...obj, position } : obj)
    }));
  },

  removeObject: (id) => {
    set(state => ({
      detectedObjects: state.detectedObjects.filter(obj => obj.id !== id),
      graspedObjectId: state.graspedObjectId === id ? null : state.graspedObjectId
    }));
  },

  setArmMode: (mode) => set({ armMode: mode }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.25, Math.min(4, speed)) }),
  setPaused: (paused) => set({ paused }),
  setStepMode: (stepMode) => set({ stepMode, stepArmed: !stepMode }),
  armStep: () => set({ stepArmed: true, paused: false }),
  setOverlays: (partial) => set(state => ({ overlays: { ...state.overlays, ...partial } }))
}));
