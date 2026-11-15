import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Send, Loader2, RotateCcw } from 'lucide-react';
import { useRobotStore } from '../store/useRobotStore';
import { computeFK } from '../kinematics/fk';

/**
 * 3D End-Effector Process Tool Effects (Welding Sparks, Laser Beam, Dispensing, Polishing Swirl, Pouring Stream, Holographic Scan)
 */
function EndEffectorToolEffects() {
  const { activeToolEffect, currentActionName } = useRobotStore();
  const sparksRef = useRef<THREE.Group>(null);
  const scanSweepRef = useRef<THREE.Mesh>(null);
  const polishDiscRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Welding electric spark jitter & arc flicker
    if (activeToolEffect === 'welding') {
      if (sparksRef.current) {
        sparksRef.current.rotation.z = Math.sin(t * 50) * 0.5;
        sparksRef.current.rotation.y = Math.cos(t * 40) * 0.5;
        sparksRef.current.scale.setScalar(0.7 + Math.random() * 0.6);
      }
      if (lightRef.current) {
        lightRef.current.intensity = 3 + Math.random() * 4;
      }
    }

    // 2. Optical laser scan sweeping plane
    if (activeToolEffect === 'scan' && scanSweepRef.current) {
      scanSweepRef.current.position.y = 35 + Math.sin(t * 6) * 20;
    }

    // 3. Surface polishing rotary swirl
    if (activeToolEffect === 'polish' && polishDiscRef.current) {
      polishDiscRef.current.rotation.y = t * 30; // 4000 RPM feel
    }
  });

  const isWelding = activeToolEffect === 'welding';
  const isLaser = activeToolEffect === 'laser';
  const isDispense = activeToolEffect === 'dispense';
  const isPolish = activeToolEffect === 'polish';
  const isPour = activeToolEffect === 'pour';
  const isScan = activeToolEffect === 'scan';
  const isScrewing = Boolean(currentActionName?.includes('SCREW') || currentActionName?.includes('FASTEN'));
  const isPointing = Boolean(currentActionName?.includes('POINT') || currentActionName?.includes('DESIGNAT'));

  if (!isWelding && !isLaser && !isDispense && !isPolish && !isPour && !isScan && !isScrewing && !isPointing) {
    return null;
  }

  return (
    <group position={[0, 32, 0]}>
      {/* 1. ARC WELDING: Electric Sparks, Plasma Core & High-Intensity Point Light */}
      {isWelding && (
        <group>
          {/* Torch Ceramic Gas Nozzle */}
          <mesh position={[0, -5, 0]}>
            <cylinderGeometry args={[4, 7, 16, 16]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 8, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>

          {/* Intense Core White/Cyan Plasma Sphere */}
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[4.5, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Fiery Corona Aura */}
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[9, 16, 16]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.65} />
          </mesh>

          {/* Dynamic Arc Light */}
          <pointLight ref={lightRef} position={[0, 7, 0]} color="#00e5ff" intensity={5} distance={300} decay={2} />

          {/* Animated Jittering Sparks Array */}
          <group ref={sparksRef} position={[0, 7, 0]}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, idx) => (
              <mesh key={idx} rotation={[0, 0, (deg * Math.PI) / 180]}>
                <cylinderGeometry args={[0.5, 0.2, 18, 6]} />
                <meshBasicMaterial color={idx % 2 === 0 ? '#ffea00' : '#00e5ff'} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* 2. CNC CO2 LASER CUTTING: Ruby Laser Beam, Cutting Collar & Plasma Contact */}
      {isLaser && (
        <group>
          {/* Laser Focusing Lens Nozzle */}
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[5, 8, 14, 16]} />
            <meshStandardMaterial color="#dc2626" metalness={0.8} roughness={0.2} emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>

          {/* Ruby-Red Laser Beam Projected Downward to Workpiece */}
          <mesh position={[0, 35, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 70, 12]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>

          {/* Laser Beam Outer Glow */}
          <mesh position={[0, 35, 0]}>
            <cylinderGeometry args={[2.5, 2.5, 70, 12]} />
            <meshBasicMaterial color="#f43f5e" transparent opacity={0.4} />
          </mesh>

          {/* High Energy Cutting Focal Spot */}
          <mesh position={[0, 70, 0]}>
            <sphereGeometry args={[4, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <pointLight position={[0, 70, 0]} color="#ef4444" intensity={6} distance={200} />
        </group>
      )}

      {/* 3. PNEUMATIC SEALANT DISPENSING: Extrusion Nozzle & Liquid Bead */}
      {isDispense && (
        <group>
          <mesh position={[0, -4, 0]}>
            <cylinderGeometry args={[2, 6, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <sphereGeometry args={[4, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} roughness={0.1} />
          </mesh>
          <mesh position={[0, 18, 0]}>
            <cylinderGeometry args={[1.5, 2.5, 22, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} transparent opacity={0.85} />
          </mesh>
        </group>
      )}

      {/* 4. SURFACE FINISHING & POLISHING: High-RPM Rotary Buffing Pad & Friction Swirls */}
      {isPolish && (
        <group ref={polishDiscRef}>
          <mesh position={[0, -5, 0]}>
            <cylinderGeometry args={[4, 4, 12, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[22, 22, 5, 32]} />
            <meshStandardMaterial color="#0284c7" roughness={0.7} />
          </mesh>
          <mesh position={[0, 6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[24, 28, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[14, 18, 32]} />
            <meshBasicMaterial color="#bae6fd" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 8, 0]} color="#38bdf8" intensity={2.5} distance={120} />
        </group>
      )}

      {/* 5. POURING SIMULATION: Fluid Cascade Downward Stream */}
      {isPour && (
        <group position={[0, 15, 0]}>
          <mesh position={[0, 35, 0]}>
            <cylinderGeometry args={[2, 4, 70, 12]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} />
          </mesh>
          <mesh position={[0, 70, 0]}>
            <sphereGeometry args={[5, 12, 12]} />
            <meshStandardMaterial color="#7dd3fc" transparent opacity={0.85} />
          </mesh>
        </group>
      )}

      {/* 6. HOLOGRAPHIC 3D OPTICAL / LIDAR QUALITY SCAN */}
      {isScan && (
        <group position={[0, 5, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[6, 9, 8, 16]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 40, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[32, 75, 4, 1, true]} />
            <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.45} />
          </mesh>
          <mesh ref={scanSweepRef} position={[0, 35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[45, 45]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 40, 0]} color="#00e5ff" intensity={3} distance={200} />
        </group>
      )}

      {/* 7. FASTENER / SCREW DRIVER ASSEMBLY TOOL */}
      {isScrewing && (
        <group>
          <mesh position={[0, 8, 0]}>
            <cylinderGeometry args={[2.5, 2.5, 20, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 20, 0]}>
            <cylinderGeometry args={[3.5, 1.5, 10, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} />
          </mesh>
          <mesh position={[0, 12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[8, 12, 24]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 8. TARGET DESIGNATION POINTER LASER RAY */}
      {isPointing && (
        <group>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[3, 5, 8, 12]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 50, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 100, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}
    </group>
  );
}

type CameraView = 'perspective' | 'top' | 'front' | 'isometric';

const CAMERA_PRESETS: Record<CameraView, { position: [number, number, number]; target: [number, number, number] }> = {
  perspective: { position: [2.5, 2.0, 3.5], target: [0, 0.8, 0] },
  top: { position: [0, 5.5, 0.01], target: [0, 0, 0] },
  front: { position: [0, 1.4, 4.5], target: [0, 0.8, 0] },
  isometric: { position: [3.2, 3.0, 3.2], target: [0, 0.8, 0] }
};

function CameraController({ view }: { view: CameraView }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const preset = CAMERA_PRESETS[view];

    camera.position.set(...preset.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
    }
  }, [camera, view]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={1.2}
      maxDistance={10}
      target={CAMERA_PRESETS[view].target}
    />
  );
}

/**
 * Tabletop Workcell Process Visualizer (Weld Seams, Laser Kerf, Dispense Trails, Stacking Alignment, Screws)
 */
function WorkcellProcessVisualizer() {
  const { activeToolEffect, currentActionName, currentTaskGoal, detectedObjects, weldSeams, dispensePath } = useRobotStore();

  const isWelding = activeToolEffect === 'welding' || Boolean(currentTaskGoal?.toLowerCase().includes('weld')) || weldSeams.length > 0;
  const isLaser = activeToolEffect === 'laser' || Boolean(currentTaskGoal?.toLowerCase().includes('laser'));
  const isDispense = activeToolEffect === 'dispense' || Boolean(currentTaskGoal?.toLowerCase().includes('dispense')) || dispensePath.length > 0;
  const isPolish = activeToolEffect === 'polish' || Boolean(currentTaskGoal?.toLowerCase().includes('polish'));
  const isScrewing = Boolean(currentActionName?.includes('SCREW') || currentTaskGoal?.toLowerCase().includes('screw'));
  const isPointing = Boolean(currentActionName?.includes('POINT') || currentTaskGoal?.toLowerCase().includes('point'));

  // Stacking check: e.g. red cube stacked at elevation z > 35
  const redObj = detectedObjects.find(o => o.label.includes('red_cube'));
  const greenObj = detectedObjects.find(o => o.label.includes('green_cylinder'));
  const isStacked = redObj && redObj.position[2] > 35;

  return (
    <group>
      {/* 1. TABLETOP WELDING SEAM WITH THERMAL HEAT DISCOLORATION */}
      {isWelding && (
        <group position={[1.45, 0.012, -0.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.55, 0.08]} />
            <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.5} />
          </mesh>
          {[-0.22, -0.18, -0.14, -0.1, -0.06, -0.02, 0.02, 0.06, 0.1, 0.14, 0.18, 0.22].map((xOffset, idx) => (
            <mesh key={idx} position={[xOffset, 0.006, 0]}>
              <sphereGeometry args={[0.016, 12, 12]} />
              <meshStandardMaterial
                color={idx % 3 === 0 ? '#d97706' : '#94a3b8'}
                roughness={0.2}
                metalness={0.9}
                emissive={activeToolEffect === 'welding' ? '#ea580c' : '#000'}
                emissiveIntensity={activeToolEffect === 'welding' ? 0.4 : 0}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 2. TABLETOP LASER CUT CONTOUR KERF */}
      {isLaser && (
        <group position={[1.25, 0.012, -0.45]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.23, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          {activeToolEffect === 'laser' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.25, 32]} />
              <meshBasicMaterial color="#f87171" transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}

      {/* 3. TABLETOP DISPENSED ADHESIVE BEAD TRAIL */}
      {isDispense && (
        <group position={[1.35, 0.012, -0.35]}>
          {[-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15].map((off, idx) => (
            <mesh key={idx} position={[off, 0.005, Math.sin(off * 15) * 0.04]}>
              <sphereGeometry args={[0.014, 12, 12]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {/* 4. TABLETOP POLISHED MIRROR FINISH ZONE */}
      {isPolish && (
        <group position={[1.35, 0.012, -0.45]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.26, 32]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.05} metalness={0.9} transparent opacity={0.65} />
          </mesh>
        </group>
      )}

      {/* 5. STACKING VERTICAL ALIGNMENT DATUM GUIDE */}
      {isStacked && greenObj && (
        <group position={[greenObj.position[0] * 0.01, 0, greenObj.position[1] * 0.01]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.9, 8]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.16, 0.19, 32]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 6. FASTENER SOCKET & TARGET RETICLE FOR SCREWING */}
      {isScrewing && (
        <group position={[1.3, 0.012, -0.4]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.03, 0.07, 24]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.12, 24]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 7. TARGET DESIGNATION RETICLE */}
      {isPointing && redObj && (
        <group position={[redObj.position[0] * 0.01, (redObj.position[2] + 25) * 0.01, redObj.position[1] * 0.01]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.22, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * 3D Robot Arm Model with real-time smooth joint lerping and dynamic grasped object attachment
 */
function ArmModel() {
  const {
    targetAngles,
    gripperState,
    graspedObjectId,
    detectedObjects,
    setLiveJoints,
    currentTaskGoal,
    activeAgent,
    currentActionName,
    stepProgress
  } = useRobotStore();

  // Internal visual angles for 60fps physics interpolation
  const visualJoints = useRef<number[]>([...targetAngles]);
  const lastSyncTime = useRef<number>(0);

  // Group refs for butter-smooth joint transformations
  const baseGroupRef = useRef<THREE.Group>(null);
  const shoulderGroupRef = useRef<THREE.Group>(null);
  const elbowGroupRef = useRef<THREE.Group>(null);
  const wristPitchGroupRef = useRef<THREE.Group>(null);
  const wristRollGroupRef = useRef<THREE.Group>(null);
  const terminalRollGroupRef = useRef<THREE.Group>(null);
  const leftFingerRef = useRef<THREE.Mesh>(null);
  const rightFingerRef = useRef<THREE.Mesh>(null);

  // Find currently grasped object payload
  const graspedObject = graspedObjectId
    ? detectedObjects.find(o => o.label === graspedObjectId || o.id === graspedObjectId)
    : null;

  useFrame((_, delta) => {
    let moving = false;
    const speed = 7.5; // Smooth trajectory lerp factor

    for (let i = 0; i < 6; i++) {
      const target = targetAngles[i] ?? 0;
      const current = visualJoints.current[i] ?? 0;
      const diff = target - current;

      if (Math.abs(diff) > 0.05) {
        visualJoints.current[i] += diff * Math.min(1, delta * speed);
        moving = true;
      } else {
        visualJoints.current[i] = target;
      }
    }

    // Apply rotations directly to 3D joints
    const [j1, j2, j3, j4, j5, j6] = visualJoints.current;

    if (baseGroupRef.current) {
      baseGroupRef.current.rotation.y = THREE.MathUtils.degToRad(j1);
    }
    if (shoulderGroupRef.current) {
      shoulderGroupRef.current.rotation.x = THREE.MathUtils.degToRad(j2);
    }
    if (elbowGroupRef.current) {
      elbowGroupRef.current.rotation.x = THREE.MathUtils.degToRad(j3);
    }
    if (wristPitchGroupRef.current) {
      wristPitchGroupRef.current.rotation.x = THREE.MathUtils.degToRad(j4);
    }
    if (wristRollGroupRef.current) {
      wristRollGroupRef.current.rotation.y = THREE.MathUtils.degToRad(j5);
    }
    if (terminalRollGroupRef.current) {
      terminalRollGroupRef.current.rotation.y = THREE.MathUtils.degToRad(j6);
    }

    // Smooth gripper finger actuation
    const targetFingerOffset = gripperState === 'closed' ? 0.02 : 0.07;
    if (leftFingerRef.current && rightFingerRef.current) {
      const curX = leftFingerRef.current.position.x;
      const targetX = -targetFingerOffset * 300;
      const newX = THREE.MathUtils.lerp(curX, targetX, delta * 12);
      leftFingerRef.current.position.x = newX;
      rightFingerRef.current.position.x = -newX;
    }

    // Periodically sync live joints to store for FK & Telemetry updates
    const now = performance.now();
    if (moving && now - lastSyncTime.current > 40) {
      lastSyncTime.current = now;
      setLiveJoints([...visualJoints.current]);
    }
  });

  return (
    <group position={[0, 0, 0]} scale={[0.01, 0.01, 0.01]}>
      {/* Base Pedestal (Fixed to Gazebo ground) */}
      <mesh position={[0, 60, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[50, 60, 120, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Base Ring Cyan Glow Accent */}
      <mesh position={[0, 118, 0]}>
        <cylinderGeometry args={[45, 45, 4, 32]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} />
      </mesh>

      {/* Joint 1: Base Yaw (Rotates around Y) */}
      <group ref={baseGroupRef} position={[0, 120, 0]}>
        <mesh position={[0, 20, 0]} castShadow>
          <cylinderGeometry args={[40, 40, 40, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Joint 2: Shoulder Pitch (Rotates around X) */}
        <group ref={shoulderGroupRef} position={[0, 0, 0]}>
          {/* Shoulder Hinge */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[25, 25, 60, 32]} />
            <meshStandardMaterial color="#00e5ff" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Upper Arm Link (Length a2 = 120mm) */}
          <mesh position={[0, 110, 0]} castShadow>
            <boxGeometry args={[36, 220, 42]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Joint 3: Elbow Pitch (Rotates around X) */}
          <group ref={elbowGroupRef} position={[0, 220, 0]}>
            {/* Elbow Hinge */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[20, 20, 50, 32]} />
              <meshStandardMaterial color="#9d4edd" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Forearm Link (Length a3 = 100mm) */}
            <mesh position={[0, 90, 0]} castShadow>
              <boxGeometry args={[30, 180, 36]} />
              <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* Joint 4: Wrist Pitch (Rotates around X) */}
            <group ref={wristPitchGroupRef} position={[0, 180, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[15, 15, 40, 32]} />
                <meshStandardMaterial color="#00e5ff" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Joint 5: Wrist Roll (Rotates around Y) */}
              <group ref={wristRollGroupRef} position={[0, 60, 0]}>
                {/* Wrist Link (Length d5 = 60mm) */}
                <mesh position={[0, 25, 0]} castShadow>
                  <cylinderGeometry args={[14, 14, 50, 32]} />
                  <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
                </mesh>

                {/* Gripper Base Assembly */}
                <group ref={terminalRollGroupRef} position={[0, 50, 0]}>
                  <mesh position={[0, 5, 0]} castShadow>
                    <boxGeometry args={[50, 10, 20]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                  </mesh>

                  {/* Left Finger */}
                  <mesh ref={leftFingerRef} position={[-21, 25, 0]} castShadow>
                    <boxGeometry args={[8, 30, 14]} />
                    <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.3} />
                  </mesh>

                  {/* Right Finger */}
                  <mesh ref={rightFingerRef} position={[21, 25, 0]} castShadow>
                    <boxGeometry args={[8, 30, 14]} />
                    <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.3} />
                  </mesh>

                  {/* Optical Distance Sensor Guide Beam */}
                  <mesh position={[0, 15, 0]}>
                    <cylinderGeometry args={[1, 1, 30, 8]} />
                    <meshBasicMaterial color="#00e5ff" transparent opacity={0.25} />
                  </mesh>

                  {/* DYNAMIC GRASPED OBJECT CARRIED IN 3D SPACE */}
                  {graspedObject && (
                    <group position={[0, 25, 0]}>
                      {graspedObject.label.includes('cylinder') ? (
                        <mesh castShadow>
                          <cylinderGeometry args={[14, 14, 35, 24]} />
                          <meshStandardMaterial
                            color={graspedObject.color}
                            emissive={graspedObject.color}
                            emissiveIntensity={0.2}
                            roughness={0.3}
                          />
                        </mesh>
                      ) : graspedObject.label.includes('bin') ? (
                        <mesh castShadow>
                          <boxGeometry args={[45, 30, 45]} />
                          <meshStandardMaterial
                            color={graspedObject.color}
                            emissive={graspedObject.color}
                            emissiveIntensity={0.2}
                            roughness={0.3}
                          />
                        </mesh>
                      ) : (
                        <mesh castShadow>
                          <boxGeometry args={[28, 28, 28]} />
                          <meshStandardMaterial
                            color={graspedObject.color}
                            emissive={graspedObject.color}
                            emissiveIntensity={0.2}
                            roughness={0.3}
                          />
                        </mesh>
                      )}

                      {/* Grasp contact sparkle indicator */}
                      <mesh position={[0, 20, 0]}>
                        <sphereGeometry args={[4, 12, 12]} />
                        <meshBasicMaterial color="#10b981" wireframe />
                      </mesh>
                    </group>
                  )}

                  {/* Dynamic 3D End-Effector Process Tool Effects (Welding, Laser, Dispense, Polish, Pour, Scan, Screwing, Pointing) */}
                  <EndEffectorToolEffects />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * World Objects rendered in the Gazebo 3D simulation environment
 */
function WorldObjects() {
  const { detectedObjects, graspedObjectId, currentActionName } = useRobotStore();

  // If an object is currently grasped, it is attached to the arm's gripper instead of the table!
  const ungraspedObjects = detectedObjects.filter(
    obj => obj.id !== graspedObjectId && obj.label !== graspedObjectId
  );

  return (
    <group>
      {ungraspedObjects.map((obj) => {
        const [x, y, z] = obj.position;
        // Gazebo Coordinate Mapping: X=x, Y=z (height), Z=y
        return (
          <group key={obj.id} position={[x * 0.01, z * 0.01, y * 0.01]}>
            {/* 3D Object Geometry */}
            {obj.label.includes('bin') ? (
              <group position={[0, 0, 0]}>
                {/* Bin Floor */}
                <mesh position={[0, 0.02, 0]} receiveShadow>
                  <boxGeometry args={[0.5, 0.04, 0.5]} />
                  <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} />
                </mesh>
                {/* Left Wall */}
                <mesh position={[-0.23, 0.15, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.04, 0.26, 0.5]} />
                  <meshStandardMaterial color={obj.color} transparent opacity={0.75} roughness={0.3} metalness={0.4} />
                </mesh>
                {/* Right Wall */}
                <mesh position={[0.23, 0.15, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.04, 0.26, 0.5]} />
                  <meshStandardMaterial color={obj.color} transparent opacity={0.75} roughness={0.3} metalness={0.4} />
                </mesh>
                {/* Front Wall */}
                <mesh position={[0, 0.15, 0.23]} castShadow receiveShadow>
                  <boxGeometry args={[0.42, 0.26, 0.04]} />
                  <meshStandardMaterial color={obj.color} transparent opacity={0.75} roughness={0.3} metalness={0.4} />
                </mesh>
                {/* Back Wall */}
                <mesh position={[0, 0.15, -0.23]} castShadow receiveShadow>
                  <boxGeometry args={[0.42, 0.26, 0.04]} />
                  <meshStandardMaterial color={obj.color} transparent opacity={0.75} roughness={0.3} metalness={0.4} />
                </mesh>
                {/* Open Top Rim Accent Wireframe */}
                <mesh position={[0, 0.28, 0]}>
                  <boxGeometry args={[0.51, 0.02, 0.51]} />
                  <meshBasicMaterial color="#60a5fa" wireframe />
                </mesh>
              </group>
            ) : (
              <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
                {obj.label.includes('sphere') || obj.label.includes('ball') ? (
                  <sphereGeometry args={[0.15, 24, 24]} />
                ) : obj.label.includes('cone') ? (
                  <coneGeometry args={[0.15, 0.35, 24]} />
                ) : obj.label.includes('cylinder') ? (
                  <cylinderGeometry args={[0.14, 0.14, 0.35, 24]} />
                ) : (
                  <boxGeometry args={[0.28, 0.28, 0.28]} />
                )}
                <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} />
              </mesh>
            )}

            {/* YOLO 3D Bounding Box Holographic Wireframe */}
            <mesh position={[0, 0.15, 0]}>
              {obj.label.includes('bin') ? (
                <boxGeometry args={[0.55, 0.35, 0.55]} />
              ) : obj.label.includes('sphere') || obj.label.includes('ball') ? (
                <sphereGeometry args={[0.18, 16, 16]} />
              ) : (
                <boxGeometry args={[0.32, 0.32, 0.32]} />
              )}
              <meshBasicMaterial color={obj.color} wireframe transparent opacity={0.35} />
            </mesh>

            {/* Ground Contact Shadow / Placement Ring */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.22, 32]} />
              <meshBasicMaterial color={obj.color} transparent opacity={0.6} />
            </mesh>

            {/* 3D Active Target Lock Beacon when object is being manipulated */}
            {currentActionName && (
              currentActionName.toLowerCase().includes(obj.label.replace('_', '')) ||
              currentActionName.toLowerCase().includes(obj.label.split('_')[0]) ||
              (obj.label.includes('cube') && currentActionName.toLowerCase().includes('cube')) ||
              (obj.label.includes('cylinder') && currentActionName.toLowerCase().includes('cylinder')) ||
              (obj.label.includes('bin') && currentActionName.toLowerCase().includes('bin'))
            ) && (
              <group position={[0, obj.label.includes('bin') ? 0.38 : 0.45, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.22, 0.26, 32]} />
                  <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}>
                  <octahedronGeometry args={[0.05, 0]} />
                  <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} wireframe />
                </mesh>
              </group>
            )}

            {/* Floating Object HUD Tag */}
            <Html position={[0, obj.label.includes('bin') ? 0.38 : (Math.hypot(x - 140, y - 80) < 45 ? 0.6 : 0.45), 0]} center>
              <div
                style={{
                  background: 'rgba(11, 15, 25, 0.92)',
                  border: `1px solid ${obj.color}`,
                  boxShadow: `0 0 10px ${obj.color}33`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: obj.color
                  }}
                />
                <span>
                  {obj.label}
                  {!obj.label.includes('bin') && Math.hypot(x - 140, y - 80) < 45 ? ' (in bin)' : ''}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '9px' }}>
                  ({x.toFixed(0)}, {y.toFixed(0)}, {z.toFixed(0)})
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/**
 * 3D Task Representation in Gazebo Space
 * Visualizes the inputted task purely using 3D spatial geometry:
 * - 3D Motion Trajectory Tube & Directional Flow Cones
 * - 3D Animated Travelling Light Orb along the path
 * - 3D Pick & Place Ghost Hologram at intended destination
 * - 3D Parabolic Transfer Arc & Vertical Lift/Drop Arrows
 * - 3D Waypoint Nodes with ground projection rings
 * - 3D Destination Target Gizmo with XYZ orientation tripod
 */
function Task3DVisualizer() {
  const {
    currentTaskGoal,
    targetPosition,
    currentPose,
    taskSteps,
    currentStepIndex,
    detectedObjects,
    trajectoryTrail,
    overlays
  } = useRobotStore();

  const travelingOrbRef = useRef<THREE.Mesh>(null);

  const currentVec = useMemo(() => new THREE.Vector3(
    currentPose.position.x * 0.01,
    currentPose.position.z * 0.01,
    currentPose.position.y * 0.01
  ), [currentPose.position.x, currentPose.position.y, currentPose.position.z]);

  const targetVec = useMemo(() => new THREE.Vector3(
    targetPosition.x * 0.01,
    targetPosition.z * 0.01,
    targetPosition.y * 0.01
  ), [targetPosition.x, targetPosition.y, targetPosition.z]);

  const trailGeo = useMemo(() => {
    if (!overlays.trail || trajectoryTrail.length < 2) return null;
    const points = trajectoryTrail.map(point => new THREE.Vector3(point.x * 0.01, point.z * 0.01, point.y * 0.01));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [trajectoryTrail, overlays.trail]);

  // Extract all 3D waypoints for the task
  const resolvedWaypoints = useMemo(() => {
    return taskSteps.map((step, idx) => {
      let x: number | null = null;
      let y: number | null = null;
      let z: number | null = null;

      if (step.params?.x !== undefined && step.params?.y !== undefined) {
        x = Number(step.params.x);
        y = Number(step.params.y);
        z = Number(step.params.z ?? 25);
      } else if (step.params?.joints && Array.isArray(step.params.joints)) {
        const fk = computeFK(step.params.joints).position;
        x = fk.x;
        y = fk.y;
        z = fk.z;
      } else if (step.params?.position && Array.isArray(step.params.position)) {
        x = Number(step.params.position[0]);
        y = Number(step.params.position[1]);
        z = Number(step.params.position[2] ?? 25);
      } else if (step.target) {
        const obj = detectedObjects.find(
          o => o.label === step.target || o.id === step.target || step.target?.includes(o.label)
        );
        if (obj) {
          x = obj.position[0];
          y = obj.position[1];
          z = obj.position[2] + (step.action.includes('APPROACH') || step.action.includes('LOCATE') ? 50 : 20);
        } else if (step.target === 'blue_bin') {
          x = 140; y = 80; z = 45;
        } else if (step.target === 'home') {
          const fk = computeFK([0, 20, -20, 0, 0]).position;
          x = fk.x; y = fk.y; z = fk.z;
        }
      }

      if (x === null || y === null || z === null) return null;

      return {
        ...step,
        stepIndex: idx,
        coord: [x, y, z] as [number, number, number],
        pos: new THREE.Vector3(x * 0.01, z * 0.01, y * 0.01)
      };
    }).filter((w): w is NonNullable<typeof w> => w !== null);
  }, [taskSteps, detectedObjects]);

  // Build continuous 3D Catmull-Rom or Bezier spline curve
  const trajectoryCurve = useMemo(() => {
    if (resolvedWaypoints.length === 0) {
      if (currentVec.distanceTo(targetVec) > 0.05) {
        const midPoint = currentVec.clone().lerp(targetVec, 0.5);
        midPoint.y += 0.2;
        return new THREE.QuadraticBezierCurve3(currentVec, midPoint, targetVec);
      }
      return null;
    }

    const pts = resolvedWaypoints.length > 0
      ? resolvedWaypoints.map(w => w.pos)
      : [currentVec, targetVec];
    const deduped: THREE.Vector3[] = [];
    pts.forEach(p => {
      if (deduped.length === 0 || deduped[deduped.length - 1].distanceTo(p) > 0.03) {
        deduped.push(p);
      }
    });

    if (deduped.length < 2) return null;
    if (deduped.length === 2) {
      const mid = deduped[0].clone().lerp(deduped[1], 0.5);
      mid.y += 0.18;
      return new THREE.QuadraticBezierCurve3(deduped[0], mid, deduped[1]);
    }

    return new THREE.CatmullRomCurve3(deduped, false, 'centripetal', 0.5);
  }, [currentVec, targetVec, resolvedWaypoints]);

  // Directional flow cones along the 3D trajectory
  const directionalCones = useMemo(() => {
    if (!trajectoryCurve) return [];
    const samples = [0.2, 0.45, 0.7, 0.9];
    return samples.map((t, idx) => {
      const pt = trajectoryCurve.getPointAt(t);
      const tangent = trajectoryCurve.getTangentAt(t).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);
      return { id: idx, position: pt, quaternion };
    });
  }, [trajectoryCurve]);

  // Tube geometry for the 3D path
  const tubeGeo = useMemo(() => {
    if (!trajectoryCurve) return null;
    return new THREE.TubeGeometry(trajectoryCurve, 48, 0.007, 8, false);
  }, [trajectoryCurve]);

  // Animate traveling energy orb along 3D trajectory curve
  useFrame(({ clock }) => {
    if (travelingOrbRef.current && trajectoryCurve) {
      const t = (clock.getElapsedTime() * 0.4) % 1;
      const pt = trajectoryCurve.getPointAt(t);
      travelingOrbRef.current.position.copy(pt);
    }
  });

  // Pick-and-place & target ghost holographic parameters
  const goalLower = (currentTaskGoal || '').toLowerCase();
  const isPickPlace = Boolean(
    goalLower.includes('pick') ||
    goalLower.includes('place') ||
    goalLower.includes('sort') ||
    goalLower.includes('move') ||
    goalLower.includes('bin')
  );

  // Identify source and destination objects
  const targetSourceObj = useMemo(() => {
    if (goalLower.includes('green') || goalLower.includes('cylinder')) {
      return detectedObjects.find(o => o.label.includes('cylinder'));
    }
    if (goalLower.includes('blue') && goalLower.includes('bin') && goalLower.includes('table')) {
      return detectedObjects.find(o => o.label.includes('cube') || o.label.includes('cylinder'));
    }
    return detectedObjects.find(o => o.label.includes('cube')) || detectedObjects[0];
  }, [goalLower, detectedObjects]);

  // Destination drop pose in 3D:
  const dropPose = useMemo((): { pos: [number, number, number]; shape: 'cube' | 'cylinder' | 'bin'; color: string } | null => {
    if (!isPickPlace && !goalLower.includes('stack')) return null;

    if (goalLower.includes('stack')) {
      // Stacking red cube on green cylinder
      const green = detectedObjects.find(o => o.label.includes('cylinder'));
      const gx = green ? green.position[0] * 0.01 : 1.0;
      const gz = green ? green.position[1] * 0.01 : -0.9;
      return { pos: [gx, 0.57, gz], shape: 'cube', color: '#ef4444' };
    }

    if (goalLower.includes('table') || goalLower.includes('surface') || goalLower.includes('outside')) {
      return {
        pos: [1.4, 0.15, -0.4],
        shape: targetSourceObj?.label.includes('cylinder') ? 'cylinder' : 'cube',
        color: targetSourceObj?.color || '#ef4444'
      };
    }

    // Default to placing inside blue bin
    const bin = detectedObjects.find(o => o.label.includes('bin'));
    const bx = bin ? bin.position[0] * 0.01 : 1.4;
    const bz = bin ? bin.position[1] * 0.01 : 0.8;
    return {
      pos: [bx, 0.16, bz],
      shape: targetSourceObj?.label.includes('cylinder') ? 'cylinder' : 'cube',
      color: targetSourceObj?.color || '#ef4444'
    };
  }, [isPickPlace, goalLower, targetSourceObj, detectedObjects]);

  // 3D Parabolic Transfer Arc connecting source and destination ghost
  const transferArcGeo = useMemo(() => {
    if (!dropPose || !targetSourceObj) return null;
    const src = new THREE.Vector3(targetSourceObj.position[0] * 0.01, 0.35, targetSourceObj.position[1] * 0.01);
    const dst = new THREE.Vector3(dropPose.pos[0], dropPose.pos[1] + 0.15, dropPose.pos[2]);
    const mid = src.clone().lerp(dst, 0.5);
    mid.y += 0.45; // High 3D parabolic transfer arc
    const curve = new THREE.QuadraticBezierCurve3(src, mid, dst);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
  }, [dropPose, targetSourceObj]);

  return (
    <group>
      {/* 1. 3D Waypoint Nodes (Pure 3D geometry: Glowing Spheres & Ground Projection Rings) */}
      {overlays.waypoints && resolvedWaypoints.map((wp, i) => {
        const wx = wp.pos.x;
        const wy = wp.pos.y;
        const wz = wp.pos.z;
        const isCurrent = wp.stepIndex === currentStepIndex;
        const isPast = wp.status === 'completed';

        return (
          <group key={wp.id || i} position={[wx, wy, wz]}>
            {/* 3D Waypoint Sphere Node */}
            <mesh>
              <sphereGeometry args={[isCurrent ? 0.045 : 0.028, 16, 16]} />
              <meshStandardMaterial
                color={isCurrent ? '#00e5ff' : isPast ? '#10b981' : '#a855f7'}
                emissive={isCurrent ? '#00e5ff' : isPast ? '#10b981' : '#a855f7'}
                emissiveIntensity={isCurrent ? 1.2 : 0.5}
              />
            </mesh>

            {/* Vertical Laser Projection Line to Table */}
            <line>
              <bufferGeometry
                attach="geometry"
                {...new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(0, 0, 0),
                  new THREE.Vector3(0, -wy + 0.005, 0)
                ])}
              />
              <lineBasicMaterial
                attach="material"
                color={isCurrent ? '#00e5ff' : '#64748b'}
                transparent
                opacity={isCurrent ? 0.8 : 0.3}
              />
            </line>

            {/* 3D Ground Contact Ring */}
            <mesh position={[0, -wy + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.04, 0.06, 24]} />
              <meshBasicMaterial
                color={isCurrent ? '#00e5ff' : isPast ? '#10b981' : '#64748b'}
                transparent
                opacity={isCurrent ? 0.9 : 0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* The trail is sourced from the live FK pose, so it remains accurate
          while the arm is moving and after the task reaches its final state. */}
      {trailGeo && (
        <line>
          <primitive object={trailGeo} attach="geometry" />
          <lineBasicMaterial color="#00e5ff" transparent opacity={0.85} />
        </line>
      )}

      {/* Reach envelope in the same world mapping used by the arm and objects. */}
      {overlays.workspace && (
        <mesh position={[0, 1.2, 0]} scale={[6.2, 1.2, 6.2]}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.16} />
        </mesh>
      )}

      {/* 2. 3D Motion Trajectory Tube */}
      {tubeGeo && (
        <mesh geometry={tubeGeo}>
          <meshStandardMaterial
            color="#00e5ff"
            emissive="#00e5ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* 3. 3D Directional Flow Cones along Trajectory */}
      {directionalCones.map(cone => (
        <mesh key={cone.id} position={cone.position} quaternion={cone.quaternion}>
          <coneGeometry args={[0.02, 0.045, 12]} />
          <meshStandardMaterial
            color="#00e5ff"
            emissive="#00e5ff"
            emissiveIntensity={1.0}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* 4. 3D Animated Travelling Energy Orb */}
      {trajectoryCurve && (
        <mesh ref={travelingOrbRef}>
          <sphereGeometry args={[0.024, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#00e5ff"
            emissiveIntensity={2.0}
            roughness={0.1}
          />
          <pointLight color="#00e5ff" intensity={1.5} distance={0.6} />
        </mesh>
      )}

      {/* 5. Destination Target Gizmo with 3D Orientation Axes */}
      {targetVec && (
        <group position={[targetVec.x, targetVec.y, targetVec.z]}>
          <mesh>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial color="#f43f5e" wireframe />
          </mesh>
          <mesh position={[0, -targetVec.y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.07, 0.11, 32]} />
            <meshBasicMaterial color="#f43f5e" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 6. 3D GHOST HOLOGRAPHIC PREVIEW OF THE TARGET OBJECT AT DESTINATION */}
      {dropPose && (
        <group position={dropPose.pos}>
          <mesh castShadow={false}>
            {dropPose.shape === 'cylinder' ? (
              <cylinderGeometry args={[0.14, 0.14, 0.35, 24]} />
            ) : (
              <boxGeometry args={[0.28, 0.28, 0.28]} />
            )}
            <meshStandardMaterial
              color={dropPose.color}
              emissive={dropPose.color}
              emissiveIntensity={0.6}
              transparent
              opacity={0.4}
              roughness={0.2}
            />
          </mesh>

          <mesh>
            {dropPose.shape === 'cylinder' ? (
              <cylinderGeometry args={[0.145, 0.145, 0.355, 24]} />
            ) : (
              <boxGeometry args={[0.29, 0.29, 0.29]} />
            )}
            <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.65} />
          </mesh>

          {/* 3D Downward Landing Placement Arrow */}
          <group position={[0, 0.28, 0]}>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.14, 12]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.024, 0.05, 12]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
          </group>

          {/* 3D Ground Placement Ring */}
          <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.22, 32]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 7. 3D High Parabolic Transfer Arc connecting source and destination ghost */}
      {transferArcGeo && (
        <line>
          <bufferGeometry attach="geometry" {...transferArcGeo} />
          <lineBasicMaterial attach="material" color="#a855f7" transparent opacity={0.6} />
        </line>
      )}

      {/* 8. 3D Upward Lift Arrow at Source Object */}
      {targetSourceObj && isPickPlace && (
        <group position={[targetSourceObj.position[0] * 0.01, (targetSourceObj.position[2] + 25) * 0.01 + 0.15, targetSourceObj.position[1] * 0.01]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.14, 12]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.024, 0.05, 12]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Gazebo Origin XYZ Reference Frame Tripod
 */
function GazeboOriginTripod() {
  return (
    <group position={[0, 0.01, 0]}>
      {/* X Axis - Red */}
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Y Axis - Green */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      {/* Z Axis - Blue */}
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

export function RobotScene() {
  const {
    currentPose,
    activeAgent,
    currentActionName,
    stepProgress,
    currentTaskGoal,
    recognizedIntent,
    taskSteps,
    currentStepIndex,
    isAiProcessing,
    commandHistory,
    executionMode,
    gripperState,
    graspedObjectId,
    activeToolEffect,
    submitAiCommand,
    emergencyStop,
    resetTaskGoal
  } = useRobotStore();

  const [cameraView, setCameraView] = useState<CameraView>('perspective');
  const [inSceneInput, setInSceneInput] = useState('');

  const inSceneQuickTasks = [
    { label: '🎯 Pick Red Cube', cmd: 'Pick red cube and place in blue bin' },
    { label: '⚡ Arc Weld', cmd: 'Arc weld along the workpiece seam' },
    { label: '✂️ Laser Cut', cmd: 'Laser cut square contour on table' },
    { label: '🧱 Pallet Stack', cmd: 'Stack red cube on green cylinder' },
    { label: '🧲 Push Object', cmd: 'Push green cylinder forward by 40mm' },
    { label: '🧪 Tilt & Pour', cmd: 'Tilt and pour cylinder into blue bin' },
    { label: '🧽 Surface Polish', cmd: 'Polish table surface with orbital sweeps' },
    { label: '🧴 Dispense Sealant', cmd: 'Dispense sealant along workpiece seam' },
    { label: '📐 360° LiDAR Scan', cmd: 'Inspect red cube with 360 LiDAR scan' },
    { label: '👋 Robotic Wave', cmd: 'Wave hello to operator' },
    { label: '🕺 Celebration Dance', cmd: 'Perform celebration dance routine' },
    { label: '🏠 Home Pose', cmd: 'Return arm to home position' },
    { label: '🛑 E-Stop', cmd: 'Emergency stop' }
  ];

  const taskFailed = taskSteps.some(step => step.status === 'failed') || currentActionName?.startsWith('TASK_FAILED');

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Gazebo Simulation Live HUD */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
          maxWidth: '420px'
        }}
      >
        {/* World Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            padding: '7px 14px',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981'
            }}
          />
          <span style={{ fontWeight: 700, color: '#00e5ff', letterSpacing: '0.5px' }}>
            GAZEBO 3D SIMULATION WORLD
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#9ca3af',
              borderLeft: '1px solid rgba(255,255,255,0.2)',
              paddingLeft: '8px'
            }}
          >
            ROS2 {executionMode.toUpperCase()} SYNCED
          </span>
        </div>

        {/* PROMINENT LIVE INPUT COMMAND BANNER IN GAZEBO */}
        {currentTaskGoal ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(23, 15, 38, 0.96) 100%)',
              border: '1px solid #00e5ff',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.35)',
              padding: '10px 14px',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#00e5ff',
                    boxShadow: '0 0 10px #00e5ff'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  INPUTTED COMMAND
                </span>
              </div>
              <span
                style={{
                  fontSize: '9px',
                   background: activeAgent ? 'rgba(168, 85, 247, 0.3)' : taskFailed ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.3)',
                   color: activeAgent ? '#c084fc' : taskFailed ? '#fb7185' : '#34d399',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                   border: `1px solid ${activeAgent ? '#a855f7' : taskFailed ? '#f43f5e' : '#10b981'}`
                }}
              >
                {activeAgent ? 'GAZEBO 3D EXECUTING' : taskFailed ? 'TASK FAILED' : 'TASK COMPLETED'}
              </span>
            </div>

            <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, lineHeight: '1.3' }}>
              "{currentTaskGoal}"
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
              color: '#9ca3af',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💬</span>
            <span>
              <strong style={{ color: '#cbd5e1' }}>Ready for command:</strong> Type any instruction in the AI planner or click a preset to see it executed in Gazebo.
            </span>
          </div>
        )}

        {/* Live Active AI Agent Action HUD */}
        {activeAgent && (
          <div
            style={{
              background: 'rgba(23, 15, 38, 0.92)',
              border: '1px solid #9d4edd',
              boxShadow: '0 0 16px rgba(157, 78, 221, 0.35)',
              padding: '10px 14px',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  color: '#c084fc',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>⚡ AGENT ACTIVE: [{activeAgent}]</span>
              </span>
              <span style={{ color: '#00e5ff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600 }}>
                {stepProgress}%
              </span>
            </div>

            {currentActionName && (
              <span style={{ color: '#f3f4f6', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                ▶ {currentActionName}
              </span>
            )}

            {/* Smooth Animated Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${stepProgress}%`,
                  background: 'linear-gradient(90deg, #00e5ff, #9d4edd)',
                  transition: 'width 0.15s ease-out'
                }}
              />
            </div>
          </div>
        )}

        {/* Dynamic Industrial Process Telemetry Badge in Gazebo */}
        {(activeToolEffect ||
          currentActionName?.includes('SCREW') ||
          currentActionName?.includes('STACK') ||
          currentActionName?.includes('PUSH') ||
          currentActionName?.includes('CALIBRAT') ||
          currentActionName?.includes('SHAKE') ||
          currentActionName?.includes('PATROL')) && (
          <div
            style={{
              background: 'rgba(11, 15, 25, 0.95)',
              border: `1px solid ${
                activeToolEffect === 'welding'
                  ? '#ea580c'
                  : activeToolEffect === 'laser'
                  ? '#ef4444'
                  : activeToolEffect === 'dispense'
                  ? '#f59e0b'
                  : activeToolEffect === 'polish'
                  ? '#38bdf8'
                  : activeToolEffect === 'pour'
                  ? '#0284c7'
                  : activeToolEffect === 'scan'
                  ? '#00e5ff'
                  : currentActionName?.includes('SCREW')
                  ? '#10b981'
                  : currentActionName?.includes('STACK')
                  ? '#a855f7'
                  : '#3b82f6'
              }`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              padding: '8px 12px',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#f3f4f6' }}>
                {activeToolEffect === 'welding' && '⚡ TIG ARC WELDING ACTIVE'}
                {activeToolEffect === 'laser' && '✂️ CNC CO2 LASER CUTTING'}
                {activeToolEffect === 'dispense' && '🧴 PNEUMATIC SEALANT DISPENSING'}
                {activeToolEffect === 'polish' && '🧽 HIGH-SPEED ROTARY POLISHING'}
                {activeToolEffect === 'pour' && '🧪 FLUID / PELLET GRAVITY TRANSFER'}
                {activeToolEffect === 'scan' && '📐 360° LIDAR & OPTICAL INSPECTION'}
                {!activeToolEffect && currentActionName?.includes('SCREW') && '🔩 AUTOMATED FASTENER ASSEMBLY'}
                {!activeToolEffect && currentActionName?.includes('STACK') && '🧱 VERTICAL PALLET STACKING'}
                {!activeToolEffect && currentActionName?.includes('PUSH') && '🧲 NON-PREHENSILE SURFACE SLIDE'}
                {!activeToolEffect && currentActionName?.includes('CALIBRAT') && '🔬 ENCODER ROM CALIBRATION'}
                {!activeToolEffect && currentActionName?.includes('SHAKE') && '📳 PAYLOAD GRIP STRESS ANALYSIS'}
                {!activeToolEffect && currentActionName?.includes('PATROL') && '🛡️ WORKCELL PERIMETER PATROL'}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#9ca3af'
                }}
              >
                GAZEBO SIM
              </span>
            </div>

            <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeToolEffect === 'welding' && (
                <>
                  <span>Current: <strong style={{ color: '#00e5ff' }}>180 A</strong></span>
                  <span>Gas: <strong style={{ color: '#00e5ff' }}>Ar 80% / CO2 20%</strong></span>
                  <span>Arc: <strong style={{ color: '#10b981' }}>IGNITED</strong></span>
                </>
              )}
              {activeToolEffect === 'laser' && (
                <>
                  <span>Power: <strong style={{ color: '#f87171' }}>450 W</strong></span>
                  <span>Assist: <strong style={{ color: '#f87171' }}>N2 12 Bar</strong></span>
                  <span>Focal Spot: <strong style={{ color: '#10b981' }}>0.2 mm</strong></span>
                </>
              )}
              {activeToolEffect === 'dispense' && (
                <>
                  <span>Flow: <strong style={{ color: '#fbbf24' }}>1.4 mL/s</strong></span>
                  <span>Viscosity: <strong style={{ color: '#fbbf24' }}>3,500 cP</strong></span>
                  <span>Bead: <strong style={{ color: '#10b981' }}>CONTINUOUS</strong></span>
                </>
              )}
              {activeToolEffect === 'polish' && (
                <>
                  <span>Spindle: <strong style={{ color: '#38bdf8' }}>4,200 RPM</strong></span>
                  <span>Pad: <strong style={{ color: '#38bdf8' }}>Wool Buff</strong></span>
                  <span>Downforce: <strong style={{ color: '#10b981' }}>15 N</strong></span>
                </>
              )}
              {activeToolEffect === 'pour' && (
                <>
                  <span>Pour Angle: <strong style={{ color: '#38bdf8' }}>85°</strong></span>
                  <span>Flow Rate: <strong style={{ color: '#38bdf8' }}>25 mL/s</strong></span>
                  <span>Target: <strong style={{ color: '#10b981' }}>Blue Container</strong></span>
                </>
              )}
              {activeToolEffect === 'scan' && (
                <>
                  <span>Resolution: <strong style={{ color: '#00e5ff' }}>0.05 mm</strong></span>
                  <span>Cloud: <strong style={{ color: '#00e5ff' }}>48,200 pts</strong></span>
                  <span>Defects: <strong style={{ color: '#10b981' }}>0 DETECTED</strong></span>
                </>
              )}
              {!activeToolEffect && currentActionName?.includes('SCREW') && (
                <>
                  <span>Torque: <strong style={{ color: '#34d399' }}>5.2 Nm</strong></span>
                  <span>Speed: <strong style={{ color: '#34d399' }}>360°/s</strong></span>
                  <span>Seat Depth: <strong style={{ color: '#10b981' }}>12 mm</strong></span>
                </>
              )}
              {!activeToolEffect && currentActionName?.includes('STACK') && (
                <>
                  <span>Target Height: <strong style={{ color: '#d8b4fe' }}>+57 mm</strong></span>
                  <span>Datum: <strong style={{ color: '#d8b4fe' }}>Cylinder Cap</strong></span>
                  <span>Stability: <strong style={{ color: '#10b981' }}>VERIFIED</strong></span>
                </>
              )}
              {!activeToolEffect && currentActionName?.includes('PUSH') && (
                <>
                  <span>Slide Delta: <strong style={{ color: '#60a5fa' }}>+40 mm</strong></span>
                  <span>Friction Coeff: <strong style={{ color: '#60a5fa' }}>µ = 0.22</strong></span>
                  <span>Contact: <strong style={{ color: '#10b981' }}>NORMAL</strong></span>
                </>
              )}
              {!activeToolEffect && currentActionName?.includes('CALIBRAT') && (
                <>
                  <span>Encoder ROM: <strong style={{ color: '#00e5ff' }}>Sweep [-170°..+170°]</strong></span>
                  <span>Backlash: <strong style={{ color: '#10b981' }}>&lt; 0.02°</strong></span>
                </>
              )}
              {!activeToolEffect && currentActionName?.includes('SHAKE') && (
                <>
                  <span>Oscillation: <strong style={{ color: '#f43f5e' }}>12 Hz</strong></span>
                  <span>Clamping Force: <strong style={{ color: '#f43f5e' }}>45 N</strong></span>
                  <span>Slip: <strong style={{ color: '#10b981' }}>0 mm</strong></span>
                </>
              )}
            </div>
          </div>
        )}

        {/* End-Effector 3D Coordinate & Gripper Status */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '6px 10px',
            borderRadius: '6px',
            color: '#cbd5e1',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span>
            EE: X={currentPose.position.x.toFixed(1)} Y={currentPose.position.y.toFixed(1)} Z={currentPose.position.z.toFixed(1)} mm
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              background: gripperState === 'closed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: gripperState === 'closed' ? '#f87171' : '#34d399',
              border: `1px solid ${gripperState === 'closed' ? '#ef4444' : '#10b981'}`
            }}
          >
            {gripperState === 'closed' ? `GRIP: ${graspedObjectId || 'HELD'}` : 'GRIP: OPEN'}
          </span>
        </div>
      </div>

      {/* Camera Viewport Presets Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          gap: '4px',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {(['perspective', 'top', 'front', 'isometric'] as const).map(view => (
          <button
            key={view}
            onClick={() => setCameraView(view)}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              background: cameraView === view ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
              color: cameraView === view ? '#00e5ff' : '#9ca3af',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease'
            }}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Docked 3D Gazebo In-Scene Task Command Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          width: 'calc(100% - 32px)',
          maxWidth: '740px',
          background: 'rgba(10, 15, 30, 0.94)',
          border: '1px solid rgba(0, 229, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 229, 255, 0.2)',
          borderRadius: '12px',
          padding: '10px 14px',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Header & Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: activeAgent ? '#00e5ff' : '#10b981',
                boxShadow: activeAgent ? '0 0 10px #00e5ff' : '0 0 8px #10b981'
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.6px', fontFamily: 'monospace' }}>
              ⚡ 3D GAZEBO TASK RUNNER
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {activeAgent ? `[${activeAgent} ACTIVE]` : currentTaskGoal ? '[TASK COMPLETE]' : '[READY FOR INPUT]'}
            </span>
          </div>

          {currentTaskGoal && !activeAgent && (
            <button
              onClick={() => submitAiCommand(currentTaskGoal)}
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: '5px',
                padding: '2px 8px',
                color: '#00e5ff',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={10} /> Replay in Gazebo
            </button>
          )}
        </div>

        {/* Quick Task Preset Chips */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none'
          }}
        >
          {inSceneQuickTasks.map((t, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (t.cmd === 'Emergency stop') {
                  emergencyStop();
                } else {
                  submitAiCommand(t.cmd);
                }
              }}
              disabled={isAiProcessing}
              style={{
                whiteSpace: 'nowrap',
                padding: '4px 9px',
                borderRadius: '6px',
                border: t.cmd === 'Emergency stop' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                background: t.cmd === 'Emergency stop' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                color: t.cmd === 'Emergency stop' ? '#f87171' : '#e2e8f0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* In-Scene Command Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inSceneInput.trim() && !isAiProcessing) {
              submitAiCommand(inSceneInput.trim());
              setInSceneInput('');
            }
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <input
            type="text"
            placeholder="Input any task to execute in 3D Gazebo (e.g. 'pick red cube', 'weld seam', 'rotate 90', 'dance')..."
            value={inSceneInput}
            onChange={(e) => setInSceneInput(e.target.value)}
            disabled={isAiProcessing}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '7px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            disabled={isAiProcessing || !inSceneInput.trim()}
            style={{
              background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
              border: 'none',
              borderRadius: '7px',
              padding: '0 16px',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              cursor: isAiProcessing || !inSceneInput.trim() ? 'not-allowed' : 'pointer',
              opacity: isAiProcessing || !inSceneInput.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isAiProcessing ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            <span>Run in Gazebo</span>
          </button>
        </form>
      </div>

      {/* 3D WebGL Gazebo Scene */}
      <Canvas
        camera={{ position: CAMERA_PRESETS.perspective.position, fov: 45 }}
        shadows
        style={{ background: '#070b14' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 12, 6]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-4, 6, -4]} intensity={0.6} color="#9d4edd" />

        {/* Robotic Arm Physical Model */}
        <ArmModel />

        {/* Gazebo World Objects (detected tabletop objects) */}
        <WorldObjects />

        {/* Tabletop Process Seams & Traces (Welding, Laser Cut, Dispensing, Stacking, Fasteners) */}
        <WorkcellProcessVisualizer />

        {/* Pure 3D Spatial Representation of the Inputted Task */}
        <Task3DVisualizer />

        {/* Gazebo RGB Tripod Reference Frame (X=Red, Y=Green, Z=Blue) */}
        <GazeboOriginTripod />

        {/* Gazebo Simulation Ground Grid */}
        <Grid
          infiniteGrid
          cellSize={0.2}
          sectionSize={1.0}
          sectionColor="#00e5ff"
          cellColor="#1e293b"
          fadeDistance={12}
        />

        <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={10} blur={2.5} far={4} />
        <CameraController view={cameraView} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
