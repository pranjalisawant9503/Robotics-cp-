# MASTER BUILD PROMPT
## AI-Powered Robotic Arm Digital Twin — Simulate → Think → Act → Connect to Real ESP32

> Use this document as the master specification/prompt for building the project. It is written so it can be fed section-by-section into an AI coding assistant (Claude Code, Cursor, etc.) or handed to a dev team as a phased roadmap.

---

## 1. PROJECT VISION

Build a **full-stack digital twin platform** for a robotic arm that:

1. Simulates a robotic arm in 3D (kinematics, joints, physics) in the browser and in ROS 2/Gazebo.
2. Understands natural-language commands via an LLM ("pick up the red cube and place it in the bin").
3. Plans tasks autonomously — decomposing language into navigation + manipulation steps.
4. Perceives its environment using computer vision (object detection).
5. Computes motion using FK/IK/D-H parameters.
6. Streams real-time telemetry (joints, sensors) over MQTT/WebSocket to a web dashboard.
7. Stores trajectory/task history in PostgreSQL for analytics/replay.
8. Can be re-pointed from the simulated arm to a **real ESP32-driven physical arm** with no architecture changes — only the transport layer's endpoint changes.

**USP:** One control/planning/AI stack; two bodies (simulated Gazebo arm now, real ESP32 arm later) — hot-swappable.

---

## 2. SYSTEM ARCHITECTURE

```
                     ┌────────────────────────┐
                     │   User (Web Dashboard)  │
                     │  "Pick the red cube up  │
                     │   and place it in bin"  │
                     └───────────┬─────────────┘
                                 │ REST/WebSocket
                     ┌───────────▼─────────────┐
                     │   AI ROBOT BRAIN (LLM)   │
                     │  Intent → Task Graph     │
                     └───────────┬─────────────┘
                                 │
                 ┌───────────────▼────────────────┐
                 │  TASK + NAVIGATION PLANNER      │
                 │  (state machine / behavior tree)│
                 └───────────────┬────────────────┘
                                 │
                     ┌───────────▼─────────────┐
                     │   COMPUTER VISION        │
                     │  Object detect + pose    │
                     └───────────┬─────────────┘
                                 │
                     ┌───────────▼─────────────┐
                     │   FK / IK / D-H SOLVER   │
                     └───────────┬─────────────┘
                                 │
                     ┌───────────▼─────────────┐
                     │   ROS 2 + GAZEBO         │
                     │ (or real ESP32 firmware) │
                     └───────────┬─────────────┘
                                 │
                     ┌───────────▼─────────────┐
                     │ Sensors + Joint Telemetry│
                     │ (ultrasonic, IMU, temp,  │
                     │  battery, encoders)      │
                     └───────────┬─────────────┘
                                 │ MQTT
                     ┌───────────▼─────────────┐
                     │      SPRING BOOT         │
                     │  MQTT↔WebSocket bridge   │
                     │  REST API, Auth, Planner │
                     └───────────┬─────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 ▼                                 ▼
        ┌─────────────────┐             ┌────────────────────┐
        │   PostgreSQL     │             │ WebSocket (STOMP)  │
        │ (history, logs)  │             │  → Live Dashboard  │
        └─────────────────┘             └────────────────────┘
                                                     │
                                         ┌───────────▼─────────────┐
                                         │  REACT + THREE.JS (R3F)  │
                                         │  3D Twin + Charts + Ctrl │
                                         └──────────────────────────┘
```

Key design principle: **the transport contract (MQTT topics + payload schema) is identical whether the "robot" is Gazebo or a physical ESP32.** Everything above the MQTT layer never knows which one it's talking to.

---

## 3. TECH STACK (confirmed + filled gaps)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React.js (Vite) + TypeScript | SPA, component-driven |
| 3D Engine | Three.js + React Three Fiber + drei | Robot twin, scene, object meshes |
| State Mgmt | Zustand or Redux Toolkit | Joint angles, telemetry, task state |
| Charts | Recharts / D3 | Trajectory & sensor history |
| AI / LLM | Claude API (function calling / tool use) | Natural language → structured task JSON |
| Computer Vision | YOLOv8 (Python microservice) or TensorFlow.js in-browser | Object detection & pose |
| Backend | Spring Boot (Java 21) | REST, WebSocket (STOMP), MQTT client, security |
| Robotics Core | ROS 2 (Humble/Jazzy) + Gazebo (or Ignition/Gz Sim) | Physics sim, joint control, URDF |
| Bridge | `rosbridge_suite` (ROS↔WebSocket) or a custom ROS2↔MQTT node | Connects ROS 2 to Spring Boot |
| Communication | MQTT (Mosquitto broker) + WebSocket (STOMP over SockJS) | Telemetry down, commands down/up |
| Database | PostgreSQL + TimescaleDB extension (optional, for telemetry time-series) | Jobs, trajectories, users, logs |
| Hardware | ESP32 (Arduino/PlatformIO firmware) | PWM servo driver, sensor reads |
| ESP32 Sim | Wokwi (optional, CI-testable) | Firmware testing without hardware |
| Auth | Spring Security + JWT | Dashboard login, role-based access |
| Containerization | Docker Compose | Postgres, Mosquitto, Spring Boot, ROS2 container, frontend |
| CI/CD | GitHub Actions | Build/test/lint on push |

---

## 4. REPOSITORY / MONOREPO STRUCTURE

```
robotic-arm-digital-twin/
├── frontend/                     # React + R3F dashboard
│   ├── src/
│   │   ├── scene/                # Three.js robot, links, joints, world
│   │   ├── components/           # UI panels: control, telemetry, chat
│   │   ├── hooks/                # useWebSocket, useMqttTelemetry, useRobotState
│   │   ├── store/                # Zustand slices
│   │   ├── kinematics/           # FK/IK math (mirrors backend for live preview)
│   │   └── pages/                # Dashboard, History, Settings, Login
├── backend/                       # Spring Boot
│   ├── src/main/java/.../
│   │   ├── ai/                   # LLM client, prompt templates, planner
│   │   ├── vision/                # CV service client/wrapper
│   │   ├── kinematics/            # FK/IK/DH engine (Java)
│   │   ├── mqtt/                  # Mosquitto client, topic handlers
│   │   ├── ws/                    # STOMP config, broadcast services
│   │   ├── planner/               # Task graph executor, navigation planner
│   │   ├── persistence/           # JPA entities, repositories
│   │   ├── security/              # JWT auth
│   │   └── api/                   # REST controllers
│   └── src/main/resources/application.yml
├── vision-service/                 # Python FastAPI microservice (YOLO)
│   ├── main.py
│   └── model/
├── ros2_ws/                        # ROS 2 workspace
│   ├── src/arm_description/        # URDF/xacro of the robotic arm
│   ├── src/arm_control/            # ros2_control hardware interfaces
│   ├── src/arm_bridge/             # ROS2 <-> MQTT bridge node
│   └── src/arm_gazebo/             # Gazebo launch + world files
├── esp32_firmware/                  # PlatformIO project
│   ├── src/main.cpp
│   └── wokwi.toml
├── docker-compose.yml
└── docs/
    ├── dh-parameters.md
    ├── mqtt-topics.md
    └── api-spec.md
```

---

## 5. STEP-BY-STEP BUILD PHASES

### Phase 0 — Foundations
- Set up monorepo, Docker Compose with Postgres + Mosquitto + backend + frontend skeletons.
- Define the **robot model**: number of joints (recommend 5–6 DOF arm + gripper), link lengths, joint limits.
- Write `docs/dh-parameters.md` with the D-H table for your chosen arm (see Section 6).

### Phase 1 — 3D Simulation (Frontend)
- Build the R3F scene: base, links, joints as meshes (or import a URDF-derived GLTF).
- Implement **Forward Kinematics** in TypeScript: given joint angles → end-effector pose, and update mesh transforms per link using D-H transformation matrices.
- Add joint sliders / manual control panel bound to FK to sanity-check the model visually before IK.

### Phase 2 — Inverse Kinematics
- Implement IK solver: start with **analytical IK** if geometry is simple (e.g., 3-DOF planar + wrist), or **numerical IK** (Jacobian transpose / damped least squares / CCD) for general 5-6 DOF.
- Add a "click a target in 3D space" or "enter X,Y,Z" UI that solves IK and animates the arm to that pose.
- Validate: FK(IK(target)) ≈ target within tolerance.

### Phase 3 — Backend Skeleton (Spring Boot)
- REST API scaffolding: `/api/robot/state`, `/api/robot/command`, `/api/tasks`, `/api/history`.
- WebSocket (STOMP) endpoint `/ws` broadcasting robot state at ~20–30Hz.
- JPA entities: `RobotState`, `JointTelemetry`, `SensorReading`, `Task`, `TaskStep`, `Trajectory`, `User`.
- JWT auth + role-based endpoints (operator vs admin).

### Phase 4 — MQTT Communication Layer
- Stand up Mosquitto broker (Docker).
- Define **topic contract** (Section 7) shared by simulation, backend, and (later) ESP32.
- Spring Boot MQTT client (Eclipse Paho or Spring Integration MQTT) subscribes to telemetry topics, republishes to WebSocket; publishes command topics from REST/AI planner output.

### Phase 5 — ROS 2 + Gazebo Simulation
- Write URDF/xacro for the arm matching your D-H table.
- Launch in Gazebo with `ros2_control` joint position/velocity controllers.
- Build `arm_bridge` node: subscribes to `/joint_states`, publishes MQTT telemetry; subscribes to MQTT command topic, publishes `JointTrajectory` commands into ROS 2.
- Add simulated sensors in Gazebo (IMU plugin, ultrasonic/range plugin) publishing into the same bridge.

### Phase 6 — Computer Vision
- Stand up `vision-service` (FastAPI + YOLOv8, or a lighter model for real-time).
- Feed it a camera feed: either a Gazebo camera plugin topic (`sensor_msgs/Image`) or a webcam feed from the frontend.
- Output: bounding boxes + class + estimated 3D position (via depth camera or known table-plane projection).
- Expose `/api/vision/objects` and/or push detections over MQTT topic `robot/vision/detections`.

### Phase 7 — AI Task Planning (Natural Language)
- Design the **LLM tool-use schema** (Section 8) so the model outputs structured task steps, not free text.
- Backend `ai/` module: sends user command + current world state (detected objects, robot pose) to Claude, receives a task graph, validates it against a schema, and hands it to the Task Planner/executor.
- Task Planner executes steps sequentially: `NAVIGATE_TO`, `DETECT_OBJECT`, `MOVE_TO_POSE`, `GRASP`, `RELEASE`, `WAIT`, each translated into IK targets / gripper commands sent over MQTT.

### Phase 8 — Navigation & Path Planning
- If the arm is mobile-base + arm (mobile manipulator), integrate ROS 2 `nav2` for base path planning (occupancy grid, costmap, A*/DWB planner). If it's a fixed-base arm only, "navigation" = collision-free joint-space path planning (e.g., RRT/RRT* or simple linear interpolation with collision checks) between IK waypoints.
- Visualize the planned path/trajectory in the 3D frontend as a spline.

### Phase 9 — Virtual Sensors + Telemetry
- Simulate ultrasonic distance, IMU (orientation/accel), temperature, battery drain model in Gazebo/ROS2 (or mocked in the bridge if no plugin exists).
- Persist telemetry to PostgreSQL (batch-insert every N seconds or via Timescale hypertable for high frequency).
- Frontend telemetry panel: live gauges + historical charts (Recharts) pulling from `/api/history/telemetry`.

### Phase 10 — Dashboard Completion
- Pages: **Live Control** (3D twin + manual joint/IK control + NL command box), **Task History** (list + replay trajectory), **Sensors** (charts), **Settings** (target selection: Simulation vs Real ESP32).
- Chat-style command interface showing the AI's task decomposition transparently (so users see *what* the robot decided to do).

### Phase 11 — ESP32 Integration
- Firmware (PlatformIO): reads the same MQTT command topic contract, drives servos via PWM (e.g., PCA9685 or native ESP32 LEDC), reads real ultrasonic/IMU/temperature/battery sensors, publishes telemetry on the identical topic names used by the simulation.
- Test firmware logic first in **Wokwi** (simulated ESP32 + virtual sensors) before flashing real hardware.
- In the dashboard "Settings" page, add a toggle: **Simulated Arm (Gazebo)** vs **Real Arm (ESP32)** — this only changes which device is publishing/subscribing to the MQTT topics; the rest of the stack is unchanged.

### Phase 12 — Hardening & Ops
- Add authentication/authorization on MQTT (username/password or TLS certs) so a real robot can't be hijacked.
- Add safety limits: joint angle clamps, emergency-stop topic (`robot/cmd/estop`), watchdog timeout (if no heartbeat, freeze motors).
- Add logging/observability (structured logs, task execution audit trail in Postgres).
- Load-test WebSocket broadcast, write integration tests for FK/IK correctness.

---

## 6. D-H PARAMETERS & KINEMATICS SPEC

Define a table like this for your chosen arm (example: 5-DOF arm, values are placeholders you must replace with your real geometry):

| Joint i | θᵢ (variable) | dᵢ (mm) | aᵢ (mm) | αᵢ (deg) |
|---|---|---|---|---|
| 1 (base yaw) | θ1 | 80 | 0 | 90 |
| 2 (shoulder) | θ2 | 0 | 120 | 0 |
| 3 (elbow) | θ3 | 0 | 100 | 0 |
| 4 (wrist pitch) | θ4 | 0 | 0 | 90 |
| 5 (wrist roll) | θ5 | 60 | 0 | 0 |

**Transformation matrix per joint (standard D-H):**

```
T_i = Rz(θi) · Tz(di) · Tx(ai) · Rx(αi)
```

**FK:** `T_0_n = T_1 · T_2 · ... · T_n` → end-effector pose = last column of `T_0_n`.

**IK approach:**
- Geometric/analytical for the first 2-3 joints (shoulder/elbow, solvable via law of cosines) when the wrist is a spherical wrist.
- Numerical (Jacobian pseudo-inverse or damped least squares) for the full chain if no closed-form exists — implement iterative solver with configurable tolerance and max iterations, and a joint-limit clamp each iteration.

Implement this **twice**: once in TypeScript (frontend, for instant visual feedback / jog control) and once in Java (backend, authoritative — used before sending commands to the robot). Keep both in sync via the same D-H table stored in `docs/dh-parameters.md` (and ideally a shared JSON config both sides load).

---

## 7. MQTT TOPIC CONTRACT (identical for sim and real ESP32)

| Topic | Direction | Payload (JSON) | Purpose |
|---|---|---|---|
| `robot/cmd/joint_target` | → robot | `{ "joints": [j1..jn], "durationMs": 800 }` | Move joints to target angles |
| `robot/cmd/gripper` | → robot | `{ "state": "open" \| "closed" }` | Gripper control |
| `robot/cmd/estop` | → robot | `{ "stop": true }` | Emergency stop |
| `robot/telemetry/joints` | → backend | `{ "joints": [...], "currents": [...], "timestamp": ... }` | Joint feedback |
| `robot/telemetry/sensors` | → backend | `{ "ultrasonicCm": 34.2, "imu": {...}, "tempC": 28.4, "batteryPct": 87 }` | Sensor stream |
| `robot/vision/detections` | → backend | `{ "objects": [{ "label": "red_cube", "bbox": [...], "pos3d": [x,y,z] }] }` | Vision output |
| `robot/status/heartbeat` | → backend | `{ "alive": true, "mode": "sim" \| "real" }` | Liveness/watchdog |

Publish rate guideline: joints/sensors at 5–20Hz; detections event-driven or 1–5Hz.

---

## 8. AI TASK-PLANNING SCHEMA (LLM tool-use contract)

Design the LLM call so it **must** return structured steps (use Claude's tool/function-calling so output is schema-validated, not free text). Example tool schema:

```json
{
  "name": "submit_task_plan",
  "description": "Return the decomposed robot task plan for the user's command.",
  "input_schema": {
    "type": "object",
    "properties": {
      "goal": { "type": "string" },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": ["NAVIGATE_TO", "DETECT_OBJECT", "MOVE_TO_POSE", "GRASP", "RELEASE", "WAIT"]
            },
            "target": { "type": "string", "description": "object label or pose name" },
            "params": { "type": "object" }
          },
          "required": ["action"]
        }
      }
    },
    "required": ["goal", "steps"]
  }
}
```

**Planner loop (backend):**
1. Gather world state: latest detections (`robot/vision/detections`), current joint pose, task history.
2. Send: system prompt (robot capabilities, coordinate frame, object list) + user command + world state → Claude with the tool above forced/preferred.
3. Validate returned JSON against schema; reject/re-prompt on malformed output.
4. Execute steps sequentially via the Task Executor, converting each into IK targets/gripper MQTT commands, waiting for telemetry confirmation (position reached within tolerance) before advancing.
5. Store the full plan + execution log in Postgres (`Task`, `TaskStep` tables) for later replay/audit in the dashboard.

---

## 9. DATABASE SCHEMA (PostgreSQL — core tables)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'operator'
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  command_text TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  step_index INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  params JSONB,
  status VARCHAR(16) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE joint_telemetry (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joints JSONB NOT NULL,
  source VARCHAR(8) NOT NULL -- 'sim' | 'real'
);

CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultrasonic_cm DOUBLE PRECISION,
  imu JSONB,
  temp_c DOUBLE PRECISION,
  battery_pct DOUBLE PRECISION,
  source VARCHAR(8) NOT NULL
);

CREATE TABLE trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  waypoints JSONB NOT NULL, -- array of joint-angle sets with timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);
```

(Consider making `joint_telemetry` and `sensor_readings` TimescaleDB hypertables if you expect high-frequency, long-retention data.)

---

## 10. REST API SURFACE (Spring Boot)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | JWT login |
| GET | `/api/robot/state` | Current joint angles, pose, mode (sim/real) |
| POST | `/api/robot/command` | Manual command (joint set / IK target / gripper) |
| POST | `/api/robot/estop` | Emergency stop |
| POST | `/api/ai/command` | Natural-language command → triggers AI planner |
| GET | `/api/tasks` | Task history list |
| GET | `/api/tasks/{id}` | Task detail + steps + trajectory |
| GET | `/api/history/telemetry?from&to` | Time-range telemetry for charts |
| GET | `/api/vision/objects` | Latest detections |
| POST | `/api/settings/target` | Switch sim ↔ real ESP32 |
| WS | `/ws/robot-state` | STOMP topic broadcasting live state |

---

## 11. FRONTEND COMPONENT BREAKDOWN

- `<RobotScene />` — R3F canvas, arm meshes (grouped by joint, each `<group>` rotated by its joint angle from state), ground plane, detected-object markers, target-pose gizmo.
- `<JointControlPanel />` — sliders per joint (manual FK jog) + "Go to XYZ" (IK) form.
- `<CommandConsole />` — chat-like input for natural language commands; shows the AI's returned step list as it executes (progress indicators per step).
- `<TelemetryPanel />` — live gauges (battery, temp, ultrasonic) + Recharts time-series.
- `<TaskHistoryTable />` — list of past tasks, click to replay trajectory in the 3D scene.
- `<ModeToggle />` — Simulation / Real ESP32 switch, shows connection health (heartbeat topic).
- Hooks: `useRobotWebSocket()` (subscribes to `/ws/robot-state`), `useAiCommand()` (posts to `/api/ai/command` and streams step updates).

---

## 12. SUGGESTED BUILD ORDER (fastest path to a demoable product)

1. FK visualization only (arm + sliders) — **demoable in days**.
2. Add IK + click-to-target.
3. Backend + WebSocket streaming fake/simulated telemetry (no ROS2 yet) — full-stack loop working.
4. Swap in real ROS 2 + Gazebo behind the same MQTT contract — no frontend changes needed.
5. Add computer vision detections overlaid in the 3D scene.
6. Add the AI planner wired to the same task executor already used for manual IK commands.
7. Add navigation/path planning once single-pose IK is solid.
8. Port the same MQTT contract to ESP32 firmware last — by design, everything above it should already work unchanged.

---

## 13. NEXT STEPS

Pick one phase above and I can generate the actual starter code for it — e.g., the React Three Fiber scene with FK, the Java IK solver, the Spring Boot MQTT bridge, the URDF/xacro file, or the Claude tool-use planner prompt. Given the size of this project, building it phase-by-phase (rather than all at once) will get you a working, testable system much faster.
