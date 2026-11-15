const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/robot-state' });

let commandParserModule;
async function getCommandParser() {
  if (!commandParserModule) {
    commandParserModule = await import('../shared/commandParser.mjs');
  }
  return commandParserModule;
}

// ROS 2 bridge transport. The web simulator remains usable when Mosquitto is
// not running; when it is available, commands and joint telemetry are relayed.
const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883', {
  connectTimeout: 2000,
  reconnectPeriod: 5000
});
let mqttUnavailableLogged = false;

mqttClient.on('connect', () => {
  mqttUnavailableLogged = false;
  console.log('[MQTT] Connected to robot bridge');
  mqttClient.subscribe('robot/telemetry/joints');
  mqttClient.subscribe('robot/arm/state');
  mqttClient.subscribe('robot/arm/events');
});

mqttClient.on('message', (topic, message) => {
  try {
    const telemetry = JSON.parse(message.toString());
    if ((topic === 'robot/telemetry/joints' || topic === 'robot/arm/state') && Array.isArray(telemetry.joints) && telemetry.joints.length >= 5) {
      robotState.joints = telemetry.joints.slice(0, 5).map(Number);
      if (telemetry.gripper) robotState.gripper = telemetry.gripper;
      if (telemetry.attachedObject !== undefined) robotState.attachedObject = telemetry.attachedObject;
      robotState.lastUpdated = telemetry.timestamp || Date.now();
      broadcastState();
    }
    if (topic === 'robot/arm/events') {
      broadcast({ type: 'ARM_EVENT', event: telemetry });
    }
  } catch (error) {
    console.error('[MQTT] Invalid joint telemetry:', error.message);
  }
});

mqttClient.on('error', (error) => {
  if (!mqttUnavailableLogged) {
    console.warn('[MQTT] Robot bridge unavailable:', error.message);
    mqttUnavailableLogged = true;
  }
});

app.use(cors());
app.use(express.json());

// In-memory state (mirrors Postgres database)
let robotState = {
  joints: [0, 20, -20, 0, 0],
  gripper: 'open',
  mode: 'sim', // 'sim' | 'real'
  lastUpdated: Date.now()
};

let tasksHistory = [];
const commandPlans = new Map();
const simulationRuns = new Map();

// REST API Surface
app.get('/api/robot/state', (req, res) => {
  res.json(robotState);
});

app.post('/api/robot/command', (req, res) => {
  const { joints, gripper, mode, durationMs } = req.body;
  if (joints) robotState.joints = joints;
  if (gripper) robotState.gripper = gripper;
  if (mode) robotState.mode = mode;
  robotState.lastUpdated = Date.now();

  if (Array.isArray(joints) && joints.length >= 5 && mqttClient.connected) {
    mqttClient.publish('robot/cmd/joint_target', JSON.stringify({
      joints: joints.slice(0, 5),
      durationMs: Number.isFinite(durationMs) ? durationMs : 800
    }));
  }
  if ((gripper === 'open' || gripper === 'closed') && mqttClient.connected) {
    mqttClient.publish('robot/cmd/gripper', JSON.stringify({
      state: gripper,
      timestamp: robotState.lastUpdated
    }));
  }

  broadcastState();
  res.json({ status: 'ok', state: robotState });
});

app.post('/api/robot/estop', (req, res) => {
  console.log('[E-STOP] Emergency stop commanded!');
  if (mqttClient.connected) {
    mqttClient.publish('robot/cmd/estop', JSON.stringify({
      stop: true,
      reason: 'Operator Emergency Stop',
      timestamp: Date.now()
    }));
  }
  broadcast({ type: 'ESTOP', stop: true, timestamp: Date.now() });
  res.json({ status: 'ok', message: 'Emergency stop broadcasted' });
});

// Command-plan contract used by both the local simulator and future planner
// services. The parser is deterministic today and can be replaced behind the
// same endpoint without changing the frontend payload.
app.post('/api/commands', async (req, res) => {
  try {
    const { parseCommand } = await getCommandParser();
    const rawText = req.body.raw_text || req.body.commandText || '';
    const result = parseCommand(rawText, req.body.objects);
    if (!result.plan) {
      return res.status(400).json({ error: 'Unable to build an action plan.' });
    }
    commandPlans.set(result.plan.command_id, result.plan);
    if (mqttClient.connected) {
      mqttClient.publish('robot/arm/plan', JSON.stringify(result.plan));
    }
    broadcast({ type: 'ARM_PLAN', plan: result.plan });
    return res.json(result.plan);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/plans/validate', async (req, res) => {
  try {
    const { validatePlan } = await getCommandParser();
    return res.json(validatePlan(req.body.plan || req.body));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/runs', (req, res) => {
  res.json(Array.from(simulationRuns.values()));
});

app.get('/api/runs/:id', (req, res) => {
  const run = simulationRuns.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  return res.json(run);
});

app.post('/api/settings/target', (req, res) => {
  const { mode } = req.body;
  if (mode === 'sim' || mode === 'real') {
    robotState.mode = mode;
    broadcastState();
    return res.json({ status: 'ok', mode });
  }
  res.status(400).json({ error: 'Invalid mode' });
});

app.post('/api/ai/command', async (req, res) => {
  const { commandText, steps: clientSteps } = req.body;
  const cmd = (commandText || '').toLowerCase();
  
  let steps = clientSteps;
  let actionPlan = req.body.plan || null;
  if (!actionPlan && commandText) {
    try {
      const { parseCommand, planToTaskSteps } = await getCommandParser();
      const parsed = parseCommand(commandText, req.body.objects);
      actionPlan = parsed.plan;
      if (!steps || steps.length === 0) steps = planToTaskSteps(actionPlan);
    } catch (error) {
      console.warn('[Planner] Shared parser unavailable:', error.message);
    }
  }
  if (!steps || steps.length === 0) {
    if (cmd.includes('home') || cmd.includes('reset') || cmd.includes('park')) {
      steps = [
        { stepIndex: 1, agent: 'SafetyAgent', action: 'CHECK_PAYLOAD', target: 'gripper', status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'HOME_JOINTS', target: 'robot_arm', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' },
        { stepIndex: 3, agent: 'GripperAgent', action: 'RELEASE', target: 'gripper', status: 'pending' },
        { stepIndex: 4, agent: 'SafetyAgent', action: 'VERIFY_STABILITY', target: 'pose', status: 'pending' }
      ];
    } else if (cmd.includes('wave') || cmd.includes('greet')) {
      steps = [
        { stepIndex: 1, agent: 'KinematicsAgent', action: 'MOVE_JOINTS', target: 'wave_start', params: { joints: [0, 45, 30, -20, 0] }, status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'MOVE_JOINTS', target: 'wave_left', params: { joints: [0, 45, 30, -20, -50] }, status: 'pending' },
        { stepIndex: 3, agent: 'KinematicsAgent', action: 'MOVE_JOINTS', target: 'wave_right', params: { joints: [0, 45, 30, -20, 50] }, status: 'pending' },
        { stepIndex: 4, agent: 'SafetyAgent', action: 'HOME_JOINTS', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (cmd.includes('scan') || cmd.includes('search')) {
      steps = [
        { stepIndex: 1, agent: 'VisionAgent', action: 'ACTIVATE_CAMERA', target: 'camera', status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'MOVE_JOINTS', target: 'sweep_left', params: { joints: [-50, 15, -15, 30, 0] }, status: 'pending' },
        { stepIndex: 3, agent: 'KinematicsAgent', action: 'MOVE_JOINTS', target: 'sweep_right', params: { joints: [50, 15, -15, 30, 0] }, status: 'pending' },
        { stepIndex: 4, agent: 'SafetyAgent', action: 'HOME_JOINTS', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (cmd.includes('remove') || cmd.includes('take out') || cmd.includes('empty') || (cmd.includes('from') && cmd.includes('bin'))) {
      const isGreen = cmd.includes('green') || cmd.includes('cylinder');
      const targetLabel = isGreen ? 'green_cylinder' : 'red_cube';
      const destPos = isGreen ? { x: 100, y: -90, z: 25 } : { x: 140, y: -50, z: 20 };
      steps = [
        { stepIndex: 1, agent: 'VisionAgent', action: 'LOCATE_TARGET', target: `${targetLabel}_in_bin`, params: { position: [140, 80, 25] }, status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'APPROACH_OBJECT', target: `${targetLabel}_in_bin`, params: { x: 140, y: 80, z: 105 }, status: 'pending' },
        { stepIndex: 3, agent: 'KinematicsAgent', action: 'MOVE_TO_POSE', target: `${targetLabel}_inside_bin`, params: { x: 140, y: 80, z: 38 }, status: 'pending' },
        { stepIndex: 4, agent: 'GripperAgent', action: 'GRASP', target: targetLabel, status: 'pending' },
        { stepIndex: 5, agent: 'KinematicsAgent', action: 'LIFT_OBJECT', target: `${targetLabel}_out_of_bin`, params: { x: 140, y: 80, z: 115 }, status: 'pending' },
        { stepIndex: 6, agent: 'KinematicsAgent', action: 'MOVE_TO_POSE', target: 'table_surface', params: { x: destPos.x, y: destPos.y, z: 85 }, status: 'pending' },
        { stepIndex: 7, agent: 'KinematicsAgent', action: 'LOWER_TO_TARGET', target: 'table_surface', params: { x: destPos.x, y: destPos.y, z: destPos.z }, status: 'pending' },
        { stepIndex: 8, agent: 'GripperAgent', action: 'RELEASE', target: targetLabel, params: { dropPosition: [destPos.x, destPos.y, destPos.z] }, status: 'pending' },
        { stepIndex: 9, agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    } else if (cmd.includes('green') || cmd.includes('cylinder')) {
      steps = [
        { stepIndex: 1, agent: 'VisionAgent', action: 'LOCATE_TARGET', target: 'green_cylinder', status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'MOVE_TO_POSE', target: 'green_cylinder', params: { x: 100, y: -90, z: 40 }, status: 'pending' },
        { stepIndex: 3, agent: 'GripperAgent', action: 'GRASP', target: 'green_cylinder', status: 'pending' },
        { stepIndex: 4, agent: 'KinematicsAgent', action: 'LIFT_OBJECT', target: 'green_cylinder', params: { x: 100, y: -90, z: 90 }, status: 'pending' },
        { stepIndex: 5, agent: 'SafetyAgent', action: 'INSPECT_OBJECT', target: 'camera', status: 'pending' }
      ];
    } else {
      steps = [
        { stepIndex: 1, agent: 'VisionAgent', action: 'LOCATE_TARGET', target: 'red_cube', status: 'pending' },
        { stepIndex: 2, agent: 'KinematicsAgent', action: 'APPROACH_OBJECT', target: 'red_cube', params: { x: 140, y: -50, z: 70 }, status: 'pending' },
        { stepIndex: 3, agent: 'KinematicsAgent', action: 'MOVE_TO_POSE', target: 'red_cube', params: { x: 140, y: -50, z: 35 }, status: 'pending' },
        { stepIndex: 4, agent: 'GripperAgent', action: 'GRASP', target: 'red_cube', status: 'pending' },
        { stepIndex: 5, agent: 'KinematicsAgent', action: 'LIFT_OBJECT', target: 'red_cube', params: { x: 140, y: -50, z: 90 }, status: 'pending' },
        { stepIndex: 6, agent: 'KinematicsAgent', action: 'MOVE_TO_POSE', target: 'blue_bin', params: { x: 140, y: 80, z: 60 }, status: 'pending' },
        { stepIndex: 7, agent: 'GripperAgent', action: 'RELEASE', target: 'blue_bin', status: 'pending' },
        { stepIndex: 8, agent: 'SafetyAgent', action: 'RETURN_HOME', target: 'home', params: { joints: [0, 20, -20, 0, 0] }, status: 'pending' }
      ];
    }
  }

  const taskPlan = {
    taskId: 'task-' + Date.now(),
    goal: commandText,
    steps,
    actionPlan,
    status: 'running',
    createdAt: new Date().toISOString()
  };

  tasksHistory.push(taskPlan);
  if (actionPlan?.command_id) commandPlans.set(actionPlan.command_id, actionPlan);
  broadcast({ type: 'TASK_STARTED', task: taskPlan });

  if (mqttClient.connected) {
    mqttClient.publish('robot/task/current', JSON.stringify(taskPlan));
    if (actionPlan) mqttClient.publish('robot/arm/plan', JSON.stringify(actionPlan));
    mqttClient.publish('robot/status/task', JSON.stringify({
      taskId: taskPlan.taskId,
      goal: commandText,
      status: 'running',
      timestamp: Date.now()
    }));
  }

  res.json({ status: 'ok', task: taskPlan, plan: actionPlan });
});

app.get('/api/tasks', (req, res) => {
  res.json(tasksHistory);
});

app.get('/api/vision/objects', (req, res) => {
  res.json({
    objects: [
      { label: 'red_cube', bbox: [120, 80, 220, 180], pos3d: [140.0, -50.0, 20.0] },
      { label: 'blue_bin', bbox: [300, 150, 420, 270], pos3d: [140.0, 80.0, 10.0] }
    ]
  });
});

// WebSocket broadcasting
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function broadcastState() {
  broadcast({ type: 'ROBOT_STATE', state: robotState });
}

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  ws.send(JSON.stringify({ type: 'ROBOT_STATE', state: robotState }));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[Backend API] Digital Twin Server listening on port ${PORT}`);
});
