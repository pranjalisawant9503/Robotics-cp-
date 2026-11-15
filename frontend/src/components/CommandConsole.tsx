import React, { useState } from 'react';
import { useRobotStore } from '../store/useRobotStore';
import { Bot, Send, CheckCircle2, Loader2, AlertCircle, Cpu, Sparkles, Octagon, Play, Eye } from 'lucide-react';

export function CommandConsole() {
  const {
    currentTaskGoal,
    taskSteps,
    currentStepIndex,
    stepProgress,
    currentActionName,
    isAiProcessing,
    activeAgent,
    submitAiCommand,
    emergencyStop
  } = useRobotStore();

  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'industrial' | 'manipulation' | 'inspection' | 'diagnostics'>('all');

  const presetCategories = [
    { id: 'all', label: 'All Tasks' },
    { id: 'industrial', label: '⚡ Industrial' },
    { id: 'manipulation', label: '🦾 Manipulation' },
    { id: 'inspection', label: '📐 Quality/LiDAR' },
    { id: 'diagnostics', label: '🔬 Diagnostics' }
  ] as const;

  const presets = [
    // 1. Industrial Processes
    {
      category: 'industrial',
      icon: '⚡',
      label: 'TIG Arc Welding Seam',
      desc: 'Ignites torch, 180A arc, traces 50mm seam with sparks & glow',
      cmd: 'Arc weld along the workpiece seam'
    },
    {
      category: 'industrial',
      icon: '✂️',
      label: 'CNC CO2 Laser Cutting',
      desc: '450W ruby laser cutting beam contour at 0.2mm kerf',
      cmd: 'Laser cut square contour on table'
    },
    {
      category: 'industrial',
      icon: '🧽',
      label: 'Surface Orbital Polishing',
      desc: 'Spindle 4,200 RPM compliant buffing sweep pass',
      cmd: 'Polish table surface with orbital sweeps'
    },
    {
      category: 'industrial',
      icon: '🔩',
      label: 'Screw Driving & Fastening',
      desc: 'Approaches M6 hole, continuous 360° torque rotation',
      cmd: 'Drive M6 screw with continuous wrist rotation'
    },
    {
      category: 'industrial',
      icon: '🧴',
      label: 'Pneumatic Sealant Dispense',
      desc: 'Dispenses adhesive bead along workpiece seam',
      cmd: 'Dispense sealant along workpiece seam'
    },

    // 2. Advanced Manipulation
    {
      category: 'manipulation',
      icon: '🧱',
      label: 'Pallet Stacking (Red on Green)',
      desc: 'Picks red cube & stacks atop green cylinder at +57mm',
      cmd: 'Stack red cube on green cylinder'
    },
    {
      category: 'manipulation',
      icon: '🧲',
      label: 'Non-Prehensile Push (+40mm)',
      desc: 'Positions behind cylinder & slides it across table',
      cmd: 'Push green cylinder forward by 40mm'
    },
    {
      category: 'manipulation',
      icon: '🧪',
      label: 'Tilt & Pour into Blue Bin',
      desc: 'Picks cylinder & tilts wrist 85° downwards over bin',
      cmd: 'Tilt and pour cylinder into blue bin'
    },
    {
      category: 'manipulation',
      icon: '📤',
      label: 'Unload Objects from Blue Bin',
      desc: 'Clears high rim & retrieves parts back to tabletop',
      cmd: 'Remove the objects from the blue bin and place on table'
    },
    {
      category: 'manipulation',
      icon: '🎯',
      label: 'Pick Red Cube to Blue Bin',
      desc: 'Classic pick-and-place manipulation with safety waypoints',
      cmd: 'Pick up the red cube and place it in the blue bin'
    },
    {
      category: 'manipulation',
      icon: '🟢',
      label: 'Pick Green Cylinder to Blue Bin',
      desc: 'Approaches cylinder & transfers safely to container',
      cmd: 'Pick up green cylinder and place in blue bin'
    },
    {
      category: 'manipulation',
      icon: '🔀',
      label: 'Autonomous Color Sorting',
      desc: 'Classifies and sorts all tabletop parts into zones',
      cmd: 'Sort all objects by color'
    },

    // 3. Inspection & Quality
    {
      category: 'inspection',
      icon: '📐',
      label: '360° LiDAR & Optical Scan',
      desc: 'Holographic frustum point-cloud quality inspection',
      cmd: 'Perform 360 degree optical quality scan'
    },
    {
      category: 'inspection',
      icon: '🎯',
      label: 'Laser Target Lock (Red Cube)',
      desc: 'Designates target object with collimated pointer ray',
      cmd: 'Point laser at red cube'
    },
    {
      category: 'inspection',
      icon: '🔍',
      label: 'Workspace Object Detection',
      desc: 'YOLO 3D bounding box detection and localization',
      cmd: 'Scan workspace and detect objects'
    },

    // 4. Diagnostics & Calibration
    {
      category: 'diagnostics',
      icon: '🔬',
      label: 'Full Joint ROM Calibration',
      desc: 'Cycles all 5 axes from -90° to +90° checking encoders',
      cmd: 'Run full joint range calibration'
    },
    {
      category: 'diagnostics',
      icon: '📳',
      label: 'Payload Grip Stress Shake',
      desc: 'Vigorous 12Hz oscillation test under heavy clamp force',
      cmd: 'Perform payload dynamic grip stress test'
    },
    {
      category: 'diagnostics',
      icon: '🛡️',
      label: 'Workcell Perimeter Patrol',
      desc: 'Autonomous surveillance patrol around safety zones',
      cmd: 'Patrol workcell boundaries'
    },
    {
      category: 'diagnostics',
      icon: '👋',
      label: 'Wave Robotic Arm',
      desc: 'Friendly sinusoidal gesture waving gripper',
      cmd: 'Wave robotic arm'
    },
    {
      category: 'diagnostics',
      icon: '🏠',
      label: 'Return Robot Home',
      desc: 'Safely resets all joints to standard standby pose',
      cmd: 'Reset pose and return to home'
    }
  ];

  const filteredPresets = selectedCategory === 'all'
    ? presets
    : presets.filter(p => p.category === selectedCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    submitAiCommand(inputText);
    setInputText('');
  };

  const handlePresetClick = (presetText: string) => {
    submitAiCommand(presetText);
  };

  const isExecuting = activeAgent !== null;
  const taskFailed = currentActionName?.startsWith('TASK_FAILED') || taskSteps.some(step => step.status === 'failed');

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} color="#00e5ff" />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#f3f4f6' }}>AI Task Planner</span>
        </div>

        {/* Active AI Agent Indicator or E-Stop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeAgent && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(157, 78, 221, 0.25)',
                border: '1px solid rgba(157, 78, 221, 0.6)',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#c084fc',
                fontWeight: 600
              }}
            >
              <Cpu size={12} className="spin" color="#c084fc" />
              <span>{activeAgent}</span>
            </div>
          )}

          {isExecuting && (
            <button
              onClick={emergencyStop}
              title="Emergency Stop"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Octagon size={12} />
              <span>E-STOP</span>
            </button>
          )}
        </div>
      </div>

      {/* Goal & Task Graph Display */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingRight: '4px'
        }}
      >
        {currentTaskGoal ? (
          <div
            style={{
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              padding: '10px',
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: '#00e5ff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600
                }}
              >
                Current Active Goal
              </span>
              <span
                style={{
                  fontSize: '10px',
                   background: isExecuting ? 'rgba(157, 78, 221, 0.3)' : taskFailed ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                   color: isExecuting ? '#c084fc' : taskFailed ? '#fb7185' : '#34d399',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                 {isExecuting ? 'GAZEBO RUNNING' : taskFailed ? 'FAILED' : 'DONE'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#fff', marginTop: '4px', fontWeight: 500 }}>
              "{currentTaskGoal}"
            </p>

            {/* Current Action Banner */}
            {isExecuting && currentActionName && (
              <div
                style={{
                  marginTop: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '6px 8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
                  <span>GAZEBO ACTION</span>
                  <span style={{ color: '#00e5ff', fontWeight: 600 }}>{stepProgress}%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#00e5ff', fontWeight: 600, marginTop: '2px' }}>
                  {currentActionName}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    marginTop: '4px',
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
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '6px 0' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.4' }}>
              Type any command to control the Gazebo 3D robot twin:
              <br />
              <em style={{ color: '#00e5ff' }}>"Pick red cube and place in blue bin"</em>
            </div>

            {/* Category Selector Tabs */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {presetCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    border: selectedCategory === cat.id ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedCategory === cat.id ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: selectedCategory === cat.id ? '#00e5ff' : '#9ca3af',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Categorized Command Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {filteredPresets.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(item.cmd)}
                  style={{
                    ...presetButtonStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15, 23, 42, 0.65)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f3f4f6' }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', paddingLeft: '22px' }}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task Step Graph Execution Checklist */}
        {taskSteps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
                Multi-Agent Task Steps ({taskSteps.filter(s => s.status === 'completed').length}/{taskSteps.length})
              </span>
            </div>

            {taskSteps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex || step.status === 'running';
              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: isCurrent ? 'rgba(157, 78, 221, 0.25)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isCurrent ? '#9d4edd' : 'rgba(255,255,255,0.06)'}`,
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', fontFamily: 'monospace' }}>
                      0{idx + 1}
                    </span>
                    {step.agent && (
                      <span
                        style={{
                          background: isCurrent ? 'rgba(157, 78, 221, 0.4)' : 'rgba(0, 229, 255, 0.12)',
                          color: isCurrent ? '#e9d5ff' : '#00e5ff',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                      >
                        {step.agent}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: isCurrent ? 600 : 400,
                        color: step.status === 'completed' ? '#10b981' : isCurrent ? '#fff' : '#cbd5e1'
                      }}
                    >
                      {step.action} {step.target ? `[${step.target}]` : ''}
                    </span>
                  </div>

                  <div>
                    {step.status === 'completed' && <CheckCircle2 size={16} color="#10b981" />}
                    {step.status === 'running' && <Loader2 size={16} color="#c084fc" className="spin" />}
                    {step.status === 'pending' && (
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>QUEUED</span>
                    )}
                    {step.status === 'failed' && <AlertCircle size={16} color="#f43f5e" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <input
          type="text"
          placeholder="Type any command (e.g. 'move up 40', 'pick red cube')..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={isAiProcessing}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={isAiProcessing || !inputText.trim()}
          style={{
            background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '0 16px',
            color: '#000',
            fontWeight: 700,
            cursor: isAiProcessing ? 'not-allowed' : 'pointer',
            opacity: isAiProcessing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'opacity 0.2s'
          }}
        >
          {isAiProcessing ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

const presetButtonStyle: React.CSSProperties = {
  textAlign: 'left',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  padding: '6px 10px',
  color: '#e5e7eb',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};
