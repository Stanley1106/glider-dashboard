#include <Arduino.h>

#define SENSOR_PIN   4
#define DEBOUNCE_MS  100
#define WHEEL_CIRC_M 0.88f

unsigned long lapCount = 0;
unsigned long lastTrigger = 0;
bool lastPin = HIGH;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  delay(500);
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  Serial.println("Wheel counter ready.");
}

void loop() {
  bool currentPin = digitalRead(SENSOR_PIN);
  unsigned long now = millis();

  if (currentPin == LOW && lastPin == HIGH && (now - lastTrigger > DEBOUNCE_MS)) {
    lapCount++;
    lastTrigger = now;
    float distance = lapCount * WHEEL_CIRC_M;
    Serial.printf("Laps: %lu  Distance: %.2f m\n", lapCount, distance);
    Serial.printf(">laps:%lu\n", lapCount);
    Serial.printf(">distance:%.2f\n", distance);
  }

  lastPin = currentPin;
  delay(1);
}
