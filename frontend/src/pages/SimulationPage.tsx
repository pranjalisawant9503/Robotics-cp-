import React, { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, ChevronLeft, CircleStop, Pause, Play, Plus, RotateCcw, SkipForward, Square, Trash2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { RobotScene } from '../scene/RobotScene';
import { useRobotStore } from '../store/useRobotStore';
// @ts-ignore shared ESM parser used by the backend as well
import { parseCommand } from '../../../shared/commandParser.mjs';

const examples = [
  'pick up the red cube and place it on the blue zone',
  'stack the three cubes into one tower',
  'sort the cubes into left and right bins by color',
  'move to x 0.3 y 0.2 z 0.25',
  'push the green cylinder forward 20 cm',
  'wave hello, then go home'
];

const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.78)',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  borderRadius: 12,
  padding: 14,
  boxShadow: '0 12px 30px rgba(0,0,0,0.22)'
};

function statusColor(status: string) {
  if (status === 'completed' || status === 'done') return '#34d399';
  if (status === 'failed') return '#fb7185';
  if (status === 'running') return '#c084fc';
  return '#94a3b8';
}

export function SimulationPage() {
  const {
    detectedObjects,
    taskSteps,
    actionPlan,
    currentTaskGoal,
    currentStepIndex,
    stepProgress,
    currentActionName,
    activeAgent,
    lastEvent,
    commandQueue,
    commandHistory,
    jointAngles,
    jointHistory,
    armMode,
    playbackSpeed,
    paused,
    stepMode,
    submitAiCommand,
    emergencyStop,
    resetTaskGoal,
    setArmMode,
    setPlaybackSpeed,
    setPaused,
    setStepMode,
    armStep,
    spawnObject,
    removeObject,
    setOverlays
  } = useRobotStore();

  const [input, setInput] = useState('');
  const [autoRun, setAutoRun] = useState(true);
  const [objectCount, setObjectCount] = useState(1);

  const preview = useMemo(() => {
    if (!input.trim()) return null;
    return parseCommand(input, detectedObjects as any).plan;
  }, [input, detectedObjects]);

  const chartData = jointHistory.length
    ? jointHistory.map((sample, index) => ({ ...sample, index }))
    : [{ index: 0, j1: jointAngles[0], j2: jointAngles[1], j3: jointAngles[2], done: stepProgress }];
  const taskFailed = taskSteps.some(step => step.status === 'failed') || currentActionName?.startsWith('TASK_FAILED');

  const runInput = () => {
    if (!input.trim()) return;
    void submitAiCommand(input.trim());
    setInput('');
  };

  const addCube = () => {
    const i = objectCount;
    spawnObject({
      id: `cube_custom_${Date.now()}`,
      label: `custom_cube_${i}`,
      color: i % 2 ? '#a855f7' : '#f97316',
      position: [70 + i * 35, -20, 20],
      bbox: [10, 10, 100, 100]
    });
    setObjectCount(i + 1);
  };

  return (
    <div className="app-shell simulation-shell">
      <Navbar />
      <main className="simulation-layout">
        <section className="simulation-stage glass-panel">
          <div className="simulation-stage-header">
            <div>
              <div className="eyebrow">ROBOTWIN / SIMULATION</div>
              <h2>Autonomous arm execution</h2>
              <p>Deterministic local replay with joint-level state and grasp events.</p>
            </div>
            <div className="mode-switch" aria-label="Execution mode">
              {(['local', 'gazebo', 'physical'] as const).map(mode => (
                <button
                  key={mode}
                  className={armMode === mode ? 'mode-active' : ''}
                  disabled={mode === 'physical'}
                  onClick={() => setArmMode(mode)}
                  title={mode === 'physical' ? 'Future mode' : `Use ${mode} mode`}
                >
                  {mode === 'physical' ? 'Physical · future' : mode}
                </button>
              ))}
            </div>
          </div>
          <div className="simulation-viewport">
            <RobotScene />
          </div>
          <div className="transport-bar" aria-label="Simulation transport controls">
            <button onClick={() => setPaused(!paused)} title={paused ? 'Resume' : 'Pause'}>
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <button onClick={armStep} disabled={!stepMode} title="Advance one action">
              <SkipForward size={15} />
            </button>
            <button onClick={emergencyStop} className="danger-button" title="Emergency stop"><CircleStop size={15} /></button>
            <button onClick={resetTaskGoal} title="Reset current task"><RotateCcw size={15} /></button>
            <button onClick={() => setStepMode(!stepMode)} className={stepMode ? 'transport-active' : ''}>
              <span>Step mode</span>
            </button>
            <label className="speed-control">
              Speed
              <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))}>
                {[0.25, 0.5, 1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}
              </select>
            </label>
            <div className="transport-status">{activeAgent ? currentActionName : 'READY'} · {stepProgress}%</div>
          </div>
        </section>

        <aside className="simulation-sidebar">
          <section style={panelStyle}>
            <div className="section-heading"><span>Command console</span><span className="status-dot" /></div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (autoRun) runInput(); } }}
              placeholder="Describe a feasible task..."
              aria-label="Robot command"
            />
            <div className="chip-row">
              {examples.map(example => <button key={example} onClick={() => setInput(example)}>{example}</button>)}
            </div>
            <div className="understood-card">
              <div className="eyebrow">UNDERSTOOD AS</div>
              <div>{preview?.understood || 'Type a command to preview its action plan.'}</div>
              {preview?.feasibility?.issues?.length ? (
                <div className="issue-text">{preview.feasibility.issues[0].code}: {preview.feasibility.issues[0].message}</div>
              ) : null}
            </div>
            <div className="console-actions">
              <label className="toggle-label"><input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} /> auto-run</label>
              <button className="primary-button" onClick={runInput} disabled={!input.trim()}><Play size={14} /> Run</button>
            </div>
          </section>

          <section style={panelStyle}>
            <div className="section-heading"><span>Action timeline</span><span>{taskSteps.filter(step => step.status === 'completed').length}/{taskSteps.length}</span></div>
            <div className="timeline-list">
              {taskSteps.length === 0 && <div className="muted-copy">No run yet. Every command becomes an explicit action or a visible failure.</div>}
              {taskSteps.map((step, index) => (
                <div key={step.id} className={index === currentStepIndex ? 'timeline-item timeline-current' : 'timeline-item'}>
                  <span className="timeline-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="timeline-copy"><strong>{step.action}</strong><small>{step.target || 'arm'} {step.reason ? `· ${step.reason}` : ''}</small></div>
                  <span style={{ color: statusColor(step.status) }}>{step.status}</span>
                </div>
              ))}
            </div>
            {lastEvent && <div className="issue-text">{lastEvent.code}: {lastEvent.message}</div>}
          </section>

          <section style={panelStyle}>
            <div className="section-heading"><span>Arm state</span><span className="mono">{taskFailed ? 'FAILED' : currentTaskGoal ? 'RUN' : 'IDLE'}</span></div>
            <div className="joint-bars">
              {jointAngles.slice(0, 6).map((angle, index) => <div className="joint-row" key={index}><span>J{index + 1}</span><div><i style={{ width: `${Math.min(100, Math.abs(angle) / 1.8)}%` }} /></div><b>{angle.toFixed(1)}°</b></div>)}
            </div>
            <div className="readout-grid"><span>IK tolerance</span><b>2 mm / 1°</b><span>Mode</span><b>{armMode}</b><span>Queue</span><b>{commandQueue.length}</b></div>
          </section>

          <section style={panelStyle}>
            <div className="section-heading"><span>Scene objects</span><button onClick={addCube} className="icon-button" title="Add cube"><Plus size={14} /></button></div>
            <div className="object-list">
              {detectedObjects.map(obj => <div className="object-row" key={obj.id}><span className="object-swatch" style={{ background: obj.color }} /><span>{obj.label}</span><button onClick={() => removeObject(obj.id)} title={`Remove ${obj.label}`}><Trash2 size={13} /></button></div>)}
            </div>
            <div className="overlay-grid">
              {(['workspace', 'trail', 'waypoints', 'collisions'] as const).map(key => <label key={key}><input type="checkbox" defaultChecked={key === 'trail' || key === 'waypoints'} onChange={e => setOverlays({ [key]: e.target.checked })} /> {key}</label>)}
            </div>
          </section>

          <section style={panelStyle}>
            <div className="section-heading"><span>Replay telemetry</span><span className="mono">LIVE</span></div>
            <div role="img" aria-label="Joint angles over time" className="chart-box">
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData}><XAxis dataKey="index" hide /><YAxis domain={['auto', 'auto']} width={28} tick={{ fill: '#64748b', fontSize: 9 }} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 10 }} /><Line type="monotone" dataKey="j1" stroke="#00e5ff" dot={false} strokeWidth={1.5} /><Line type="monotone" dataKey="j2" stroke="#a855f7" dot={false} strokeWidth={1.5} /><Line type="monotone" dataKey="j3" stroke="#34d399" dot={false} strokeWidth={1.5} /></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="history-list">{commandHistory.slice(0, 3).map(entry => <button key={entry.id} onClick={() => setInput(entry.command)}><Check size={12} /> {entry.command}</button>)}</div>
          </section>
        </aside>
      </main>
    </div>
  );
}

