# MQTT Topic & Payload Contract

This contract defines the messaging interface shared identically between the **3D Simulation (Gazebo/Browser)** and the **Physical Robot (ESP32)**.

---

## Topic Registry

| Topic Name | Direction | Payload Type | Description |
|---|---|---|---|
| `robot/cmd/joint_target` | Dashboard/Backend → Robot | JSON | Direct joint angle positioning target |
| `robot/cmd/gripper` | Dashboard/Backend → Robot | JSON | Gripper open/close command |
| `robot/cmd/estop` | Dashboard/Backend → Robot | JSON | Emergency stop trigger |
| `robot/telemetry/joints` | Robot → Backend/Dashboard | JSON | Real-time joint angle feedback & currents |
| `robot/telemetry/sensors` | Robot → Backend/Dashboard | JSON | Environmental & power telemetry |
| `robot/vision/detections` | Vision Service → Backend | JSON | Detected objects & 3D bounding boxes |
| `robot/status/heartbeat` | Robot → Backend/Dashboard | JSON | Watchdog & current system mode |

---

## Payload Schemas

### 1. `robot/cmd/joint_target`
```json
{
  "joints": [0.0, 45.0, -30.0, 15.0, 0.0],
  "durationMs": 800,
  "timestamp": 1727500000000
}
```

### 2. `robot/cmd/gripper`
```json
{
  "state": "closed",
  "effortPct": 80,
  "timestamp": 1727500000000
}
```

### 3. `robot/cmd/estop`
```json
{
  "stop": true,
  "reason": "Operator Emergency Stop",
  "timestamp": 1727500000000
}
```

### 4. `robot/telemetry/joints`
```json
{
  "joints": [0.0, 45.1, -29.8, 15.0, 0.2],
  "currents": [120, 340, 210, 80, 45],
  "timestamp": 1727500000100
}
```

### 5. `robot/telemetry/sensors`
```json
{
  "ultrasonicCm": 34.2,
  "imu": {
    "pitch": 0.12,
    "roll": -0.05,
    "yaw": 89.9
  },
  "tempC": 28.4,
  "batteryPct": 87.5,
  "timestamp": 1727500000100
}
```

### 6. `robot/status/heartbeat`
```json
{
  "alive": true,
  "mode": "sim",
  "uptimeSec": 3420,
  "firmwareVersion": "1.0.0-esp32"
}
```
