#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// WiFi & MQTT Configuration
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";
const char* MQTT_SERVER = "broker.hivemq.com"; // Default public or local broker
const int MQTT_PORT = 1883;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// PCA9685 Servo Driver (I2C address 0x40)
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);

#define SERVO_FREQ 50 // Analog servos run at ~50 Hz updates
#define SERVOMIN  150 // Minimum pulse length count (0 degrees)
#define SERVOMAX  600 // Maximum pulse length count (180 degrees)

// Robotic Arm Joint State (Angles in degrees)
float currentJoints[5] = {0.0, 20.0, -20.0, 0.0, 0.0};
float targetJoints[5]  = {0.0, 20.0, -20.0, 0.0, 0.0};
bool isEStopped = false;

// Convert Angle (Degrees -180 to 180) to PCA9685 PWM pulse length
int angleToPulse(float angleDeg) {
  float clamped = constrain(angleDeg, -180.0, 180.0);
  float norm = (clamped + 180.0) / 360.0;
  return SERVOMIN + (int)(norm * (SERVOMAX - SERVOMIN));
}

// MQTT Message Received Callback
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  String topicStr = String(topic);

  // Emergency Stop Handler
  if (topicStr == "robot/cmd/estop") {
    if (doc["stop"] == true) {
      isEStopped = true;
      Serial.println("[ESP32] EMERGENCY STOP ACTIVATED!");
    }
  }

  if (isEStopped) return;

  // Joint Target Command Handler
  if (topicStr == "robot/cmd/joint_target") {
    JsonArray jointsArr = doc["joints"];
    for (int i = 0; i < 5 && i < jointsArr.size(); i++) {
      targetJoints[i] = jointsArr[i].as<float>();
    }
    Serial.println("[ESP32] Joint targets updated via MQTT");
  }

  // Gripper Command Handler
  if (topicStr == "robot/cmd/gripper") {
    String state = doc["state"].as<String>();
    if (state == "closed") {
      targetJoints[4] = 45.0; // Closed servo position
    } else {
      targetJoints[4] = -45.0; // Open servo position
    }
  }
}

void setupWiFi() {
  delay(10);
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected. IP: " + WiFi.localIP().toString());
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker...");
    String clientId = "ESP32RobotArm-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("CONNECTED");
      mqttClient.subscribe("robot/cmd/joint_target");
      mqttClient.subscribe("robot/cmd/gripper");
      mqttClient.subscribe("robot/cmd/estop");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2s...");
      delay(2000);
    }
  }
}

void publishTelemetry() {
  // 1. Joint Telemetry
  StaticJsonDocument<256> jointDoc;
  JsonArray jArr = jointDoc.createNestedArray("joints");
  JsonArray cArr = jointDoc.createNestedArray("currents");
  for (int i = 0; i < 5; i++) {
    jArr.add(currentJoints[i]);
    cArr.add(100 + random(20)); // Simulated motor current mA
  }
  jointDoc["timestamp"] = millis();

  char jointBuf[256];
  serializeJson(jointDoc, jointBuf);
  mqttClient.publish("robot/telemetry/joints", jointBuf);

  // 2. Sensor Telemetry
  StaticJsonDocument<256> sensorDoc;
  sensorDoc["ultrasonicCm"] = 30.0 + (random(0, 100) / 10.0);
  JsonObject imu = sensorDoc.createNestedObject("imu");
  imu["pitch"] = 0.1;
  imu["roll"] = -0.2;
  imu["yaw"] = 90.0;
  sensorDoc["tempC"] = 28.5;
  sensorDoc["batteryPct"] = 94.0;
  sensorDoc["timestamp"] = millis();

  char sensorBuf[256];
  serializeJson(sensorDoc, sensorBuf);
  mqttClient.publish("robot/telemetry/sensors", sensorBuf);

  // 3. Heartbeat Status
  StaticJsonDocument<128> hbDoc;
  hbDoc["alive"] = true;
  hbDoc["mode"] = "real";
  hbDoc["uptimeSec"] = millis() / 1000;
  hbDoc["firmwareVersion"] = "1.0.0-esp32";

  char hbBuf[128];
  serializeJson(hbDoc, hbBuf);
  mqttClient.publish("robot/status/heartbeat", hbBuf);
}

unsigned long lastTelemetryTime = 0;

void setup() {
  Serial.begin(115200);
  pwm.begin();
  pwm.setPWMFreq(SERVO_FREQ);

  setupWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Smooth Joint Interpolation towards target angle
  if (!isEStopped) {
    for (int i = 0; i < 5; i++) {
      currentJoints[i] += (targetJoints[i] - currentJoints[i]) * 0.1;
      int pulse = angleToPulse(currentJoints[i]);
      pwm.setPWM(i, 0, pulse);
    }
  }

  // Telemetry publish at 5Hz (every 200ms)
  if (millis() - lastTelemetryTime > 200) {
    lastTelemetryTime = millis();
    publishTelemetry();
  }
}
