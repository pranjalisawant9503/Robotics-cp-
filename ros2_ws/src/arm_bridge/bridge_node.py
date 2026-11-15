#!/usr/bin/env python3
import json
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
import paho.mqtt.client as mqtt

class ArmRosMqttBridge(Node):
    def __init__(self):
        super().__init__('arm_ros_mqtt_bridge')
        
        self.mqtt_broker = "localhost"
        self.mqtt_port = 1883
        
        # ROS 2 Publishers & Subscribers
        self.joint_pub = self.create_publisher(JointTrajectory, '/arm_controller/joint_trajectory', 10)
        self.create_subscription(JointState, '/joint_states', self.joint_state_callback, 10)
        
        # MQTT Client Setup
        self.mqtt_client = mqtt.Client(client_id="ROS2-Arm-Bridge")
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        
        try:
            self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
            self.get_logger().info(f"Connected to MQTT broker at {self.mqtt_broker}:{self.mqtt_port}")
        except Exception as e:
            self.get_logger().error(f"MQTT connection failed: {e}")

    def on_mqtt_connect(self, client, userdata, flags, rc):
        self.get_logger().info("Subscribing to MQTT topic: robot/cmd/joint_target")
        client.subscribe("robot/cmd/joint_target")

    def on_mqtt_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            joints_deg = payload.get("joints", [])
            duration_ms = payload.get("durationMs", 800)
            
            # Convert degrees to radians for ROS 2 JointTrajectory
            joints_rad = [float(j) * 3.14159 / 180.0 for j in joints_deg]
            
            traj_msg = JointTrajectory()
            traj_msg.joint_names = ['joint1', 'joint2', 'joint3', 'joint4', 'joint5']
            
            point = JointTrajectoryPoint()
            point.positions = joints_rad
            point.time_from_start.sec = int(duration_ms / 1000)
            point.time_from_start.nanosec = int((duration_ms % 1000) * 1e6)
            
            traj_msg.points.append(point)
            self.joint_pub.publish(traj_msg)
            self.get_logger().info(f"Published JointTrajectory command to ROS 2: {joints_deg}")
        except Exception as e:
            self.get_logger().error(f"Error handling MQTT message: {e}")

    def joint_state_callback(self, msg: JointState):
        # Convert ROS 2 joint state radians back to degrees and publish MQTT telemetry
        joints_deg = [round(float(pos) * 180.0 / 3.14159, 2) for pos in msg.position]
        telemetry = {
            "joints": joints_deg,
            "currents": [120, 240, 180, 80, 45],
            "timestamp": int(self.get_clock().now().nanoseconds / 1e6)
        }
        self.mqtt_client.publish("robot/telemetry/joints", json.dumps(telemetry))

def main(args=None):
    rclpy.init(args=args)
    bridge = ArmRosMqttBridge()
    try:
        rclpy.spin(bridge)
    except KeyboardInterrupt:
        pass
    finally:
        bridge.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
