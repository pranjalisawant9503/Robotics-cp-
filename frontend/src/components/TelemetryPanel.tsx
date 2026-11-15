import React, { useEffect } from 'react';
import { useRobotStore } from '../store/useRobotStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, BatteryCharging, Thermometer, Radio, Gauge } from 'lucide-react';

export function TelemetryPanel() {
  const { telemetry, telemetryHistory, updateTelemetry, executionMode } = useRobotStore();

  // Simulate live telemetry stream at 5Hz in frontend mode
  useEffect(() => {
    const interval = setInterval(() => {
      updateTelemetry({
        ultrasonicCm: +(30 + Math.random() * 8).toFixed(1),
        tempC: +(28 + Math.random() * 2).toFixed(1),
        batteryPct: +(88 - Math.random() * 0.1).toFixed(1),
        currents: [
          100 + Math.random() * 20,
          220 + Math.random() * 40,
          170 + Math.random() * 30,
          70 + Math.random() * 15,
          40 + Math.random() * 10
        ]
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateTelemetry]);

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="#10b981" />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#f3f4f6' }}>MQTT Live Telemetry Stream</span>
        </div>
        <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
          {executionMode === 'sim' ? 'GAZEBO MQTT' : 'ESP32 MQTT'}
        </span>
      </div>

      {/* Sensor Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
            <Radio size={13} color="#00e5ff" /> Ultrasonic
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: '#00e5ff', marginTop: '4px' }}>
            {telemetry.ultrasonicCm} <span style={{ fontSize: '11px' }}>cm</span>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
            <Thermometer size={13} color="#f59e0b" /> Temp
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b', marginTop: '4px' }}>
            {telemetry.tempC} <span style={{ fontSize: '11px' }}>°C</span>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
            <BatteryCharging size={13} color="#10b981" /> Battery
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', marginTop: '4px' }}>
            {telemetry.batteryPct} <span style={{ fontSize: '11px' }}>%</span>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
            <Gauge size={13} color="#9d4edd" /> IMU Pitch
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: '#9d4edd', marginTop: '4px' }}>
            {telemetry.imu.pitch}°
          </div>
        </div>
      </div>

      {/* Joint Current Time-Series Chart */}
      <div style={{ height: '110px', width: '100%', marginTop: '4px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Motor Current Draw (mA)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={telemetryHistory}>
            <Tooltip
              contentStyle={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="currents[0]" stroke="#00e5ff" strokeWidth={1.5} dot={false} name="J1" />
            <Line type="monotone" dataKey="currents[1]" stroke="#9d4edd" strokeWidth={1.5} dot={false} name="J2" />
            <Line type="monotone" dataKey="currents[2]" stroke="#10b981" strokeWidth={1.5} dot={false} name="J3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
