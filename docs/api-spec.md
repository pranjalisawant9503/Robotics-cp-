# REST & WebSocket API Specification

## Base URL
`/api`

---

## Endpoint Summary

### Authentication
- `POST /api/auth/login`: User login, returns JWT token.

### Robot State & Control
- `GET /api/robot/state`: Fetches current joint state, end-effector position, mode (`sim` | `real`).
- `POST /api/robot/command`: Direct command input (joint angle set or IK target position).
- `POST /api/robot/estop`: Triggers immediate emergency stop.

### AI Task Planner
- `POST /api/ai/command`: Receives natural-language input (e.g., "pick up the red cube and place it in the bin"), runs LLM tool-calling logic, generates step plan, and initiates task execution graph.

### Task History & Telemetry
- `GET /api/tasks`: List of executed and pending tasks.
- `GET /api/tasks/{id}`: Detailed task breakdown with step telemetry and trajectory waypoints.
- `GET /api/history/telemetry`: Historical sensor and joint data for time-series charts.

### Computer Vision & System Settings
- `GET /api/vision/objects`: Latest detected 3D objects and bounding boxes.
- `POST /api/settings/target`: Hot-swaps system execution target between `sim` (Gazebo/Browser) and `real` (ESP32).

---

## WebSocket Specifications
- Endpoint: `/ws`
- Protocol: STOMP over SockJS
- Subscriptions:
  - `/topic/robot-state`: Live joint state, sensor readings, and heartbeat broadcasted at 20Hz.
  - `/topic/task-progress`: Live execution status updates per step in active task graph.
