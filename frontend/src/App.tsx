import React from 'react';
import { Navbar } from './components/Navbar';
import { RobotScene } from './scene/RobotScene';
import { JointControlPanel } from './components/JointControlPanel';
import { CommandConsole } from './components/CommandConsole';
import { TelemetryPanel } from './components/TelemetryPanel';
import { SimulationPage } from './pages/SimulationPage';

export default function App() {
  if (window.location.pathname === '/simulation') {
    return <SimulationPage />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '16px', padding: '16px', height: 'calc(100vh - 60px)' }}>
        {/* Left Sidebar: Kinematics & Jog Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <JointControlPanel />
        </div>

        {/* Center Canvas: 3D Robot Twin Scene */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
          <RobotScene />
        </div>

        {/* Right Sidebar: AI Console & Telemetry Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
          <div style={{ flex: 1 }}>
            <CommandConsole />
          </div>
          <TelemetryPanel />
        </div>
      </main>
    </div>
  );
}
