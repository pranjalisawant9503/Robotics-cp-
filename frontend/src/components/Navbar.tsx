import React from 'react';
import { useRobotStore } from '../store/useRobotStore';
import { Cpu, OctagonAlert, Wifi, ShieldCheck, CpuIcon } from 'lucide-react';

export function Navbar() {
  const { executionMode, setMode, emergencyStop } = useRobotStore();

  return (
    <header style={{
      height: '60px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(11, 15, 25, 0.9)',
      backdropFilter: 'blur(10px)',
      zIndex: 10
    }}>
      {/* Brand Title */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit', textDecoration: 'none' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #00e5ff 0%, #9d4edd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000'
        }}>
          <Cpu size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
            Robotic Arm <span className="gradient-text">Digital Twin</span>
          </h1>
          <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Simulate</span> → <span>Think</span> → <span>Act</span> → <span>ESP32</span>
          </div>
        </div>
      </a>

      {/* Target Mode Switcher & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/simulation" className="nav-link">Simulation</a>
        {/* Heartbeat Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <Wifi size={14} className="spin-slow" />
          <span>MQTT: CONNECTED</span>
        </div>

        {/* Hot-Swap Target Selector (Simulated Gazebo Arm vs Real ESP32 Arm) */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '4px'
        }}>
          <button
            onClick={() => setMode('sim')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: executionMode === 'sim' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: executionMode === 'sim' ? '#00e5ff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} /> 3D Gazebo Sim
          </button>
          <button
            onClick={() => setMode('real')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: executionMode === 'real' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: executionMode === 'real' ? '#f59e0b' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CpuIcon size={14} /> Real ESP32 Arm
          </button>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={emergencyStop}
          style={{
            background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 15px rgba(244, 63, 94, 0.4)'
          }}
        >
          <OctagonAlert size={16} /> E-STOP
        </button>
      </div>
    </header>
  );
}
