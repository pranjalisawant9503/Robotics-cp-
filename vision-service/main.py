import time
import json
import random
from fastapi import FastAPI
import paho.mqtt.client as mqtt

app = FastAPI(title="Robotic Arm Computer Vision Microservice")

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_DETECTIONS = "robot/vision/detections"

mqtt_client = mqtt.Client(client_id="VisionService-FastAPI")

@app.on_event("startup")
def startup_event():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        print(f"[Vision] Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
    except Exception as e:
        print(f"[Vision] Warning: Could not connect to MQTT broker ({e})")

@app.get("/api/vision/objects")
def get_detected_objects():
    """
    Returns latest detected 3D object bounding boxes and table projections
    """
    objects = [
        {
            "id": "obj-1",
            "label": "red_cube",
            "bbox": [120, 80, 220, 180],
            "confidence": 0.94,
            "pos3d": [140.0, -50.0, 20.0]
        },
        {
            "id": "obj-2",
            "label": "blue_bin",
            "bbox": [300, 150, 420, 270],
            "confidence": 0.98,
            "pos3d": [140.0, 80.0, 10.0]
        },
        {
            "id": "obj-3",
            "label": "green_cylinder",
            "bbox": [50, 200, 130, 280],
            "confidence": 0.89,
            "pos3d": [100.0, -90.0, 25.0]
        }
    ]

    # Publish to MQTT topic
    payload = {
        "objects": objects,
        "timestamp": int(time.time() * 1000)
    }
    try:
        mqtt_client.publish(TOPIC_DETECTIONS, json.dumps(payload))
    except Exception as e:
        pass

    return payload

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "vision-service"}
