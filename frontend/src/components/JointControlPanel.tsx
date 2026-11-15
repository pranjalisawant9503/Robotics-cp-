import React, { useState } from 'react';
import { useRobotStore } from '../store/useRobotStore';
import { DEFAULT_DH_PARAMS, DHParameter } from '../kinematics/dh';
import { Sliders, Move, Hand, Target } from 'lucide-react';
import * as THREE from 'three';

export function JointControlPanel() {
  const { jointAngles, setJointAngle, gripperState, setGripper, currentPose, moveToIKTarget } = useRobotStore();
  
  const [ikX, setIkX] = useState<number>(Math.round(currentPose.position.x));
  const [ikY, setIkY] = useState<number>(Math.round(currentPose.position.y));
  const [ikZ, setIkZ] = useState<number>(Math.round(currentPose.position.z));
  const [activeTab, setActiveTab] = useState<'fk' | 'ik'>('fk');

  const handleIkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moveToIKTarget(new THREE.Vector3(ikX, ikY, ikZ));
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Panel Tab Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('fk')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'fk' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
            color: activeTab === 'fk' ? '#00e5ff' : '#9ca3af',
            fontWeight: activeTab === 'fk' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          <Sliders size={15} /> FK Jog Control
        </button>
        <button
          onClick={() => setActiveTab('ik')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'ik' ? 'rgba(157, 78, 221, 0.15)' : 'transparent',
            color: activeTab === 'ik' ? '#9d4edd' : '#9ca3af',
            fontWeight: activeTab === 'ik' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          <Target size={15} /> IK Target (XYZ)
        </button>
      </div>

      {/* Tab Content: Forward Kinematics Sliders */}
      {activeTab === 'fk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DEFAULT_DH_PARAMS.map((dh, idx) => (
            <div key={dh.jointIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                <span>{dh.name} (J{dh.jointIndex})</span>
                <span className="font-mono" style={{ color: '#00e5ff' }}>{Math.round(jointAngles[idx])}°</span>
              </div>
              <input
                type="range"
                min={dh.minAngle}
                max={dh.maxAngle}
                value={jointAngles[idx]}
                onChange={(e) => setJointAngle(idx, parseFloat(e.target.value))}
                style={{ accentColor: '#00e5ff', cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Inverse Kinematics Position Input */}
      {activeTab === 'ik' && (
        <form onSubmit={handleIkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>X (mm)</label>
              <input
                type="number"
                value={ikX}
                onChange={(e) => setIkX(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Y (mm)</label>
              <input
                type="number"
                value={ikY}
                onChange={(e) => setIkY(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Z (mm)</label>
              <input
                type="number"
                value={ikZ}
                onChange={(e) => setIkZ(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Move size={15} /> Solve & Move IK
          </button>
        </form>
      )}

      {/* End-Effector Gripper & Pose Feedback */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hand size={14} /> End-Effector Gripper
          </span>
          <button
            onClick={() => setGripper(gripperState === 'open' ? 'closed' : 'open')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: `1px solid ${gripperState === 'closed' ? '#f43f5e' : '#10b981'}`,
              background: gripperState === 'closed' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: gripperState === 'closed' ? '#f43f5e' : '#10b981',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {gripperState.toUpperCase()}
          </button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', color: '#9ca3af' }}>
          <div>FK EE Pose:</div>
          <div className="font-mono" style={{ color: '#00e5ff', marginTop: '2px' }}>
            X: {currentPose.position.x.toFixed(1)} | Y: {currentPose.position.y.toFixed(1)} | Z: {currentPose.position.z.toFixed(1)} mm
          </div>
        </div>
      </div>
    </div>
  );
}
