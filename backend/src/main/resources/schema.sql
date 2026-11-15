-- PostgreSQL Database Schema for AI Robotic Arm Digital Twin

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'operator'
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  command_text TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  step_index INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  params JSONB,
  status VARCHAR(16) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS joint_telemetry (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joints JSONB NOT NULL,
  source VARCHAR(8) NOT NULL -- 'sim' | 'real'
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultrasonic_cm DOUBLE PRECISION,
  imu JSONB,
  temp_c DOUBLE PRECISION,
  battery_pct DOUBLE PRECISION,
  source VARCHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  waypoints JSONB NOT NULL, -- array of joint-angle sets with timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS robot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_text TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE robot_commands ADD COLUMN IF NOT EXISTS action_plan JSONB;

CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES robot_commands(id),
  mode VARCHAR(10) CHECK (mode IN ('local','gazebo','physical')),
  status VARCHAR(12),
  joint_log JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);
