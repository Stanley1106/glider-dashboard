#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include <BH1750.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

#define SENSOR_PIN         4
#define DHT_PIN            2
#define I2C_SDA            5
#define I2C_SCL            6
#define DEBOUNCE_MS        100
#define WHEEL_CIRC_M       0.88f
#define UPLOAD_INTERVAL_MS 30000

#define OLED_WIDTH  128
#define OLED_HEIGHT 64
#define OLED_ADDR   0x3C

DHT dht(DHT_PIN, DHT22);
BH1750 lightMeter;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

unsigned long lapCount = 0;
unsigned long lastTrigger = 0;
bool lastPin = HIGH;

unsigned long lastUploadMs = 0;
unsigned long lastUploadLaps = 0;

float lastTemp = 0, lastHum = 0, lastLux = 0, lastRpm = 0;

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.printf("Laps: %lu", lapCount);

  display.setCursor(0, 12);
  display.printf("Dist: %.2f m", lapCount * WHEEL_CIRC_M);

  display.setCursor(0, 24);
  display.printf("RPM:  %.1f", lastRpm);

  display.setCursor(0, 36);
  display.printf("T:%.1fC  H:%.0f%%", lastTemp, lastHum);

  display.setCursor(0, 48);
  display.printf("Lux: %.0f", lastLux);

  display.setCursor(80, 48);
  display.print(WiFi.status() == WL_CONNECTED ? "WiFi OK" : "No WiFi");

  display.display();
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi connected: %s\n", WiFi.localIP().toString().c_str());
}

void uploadData(unsigned long totalLaps, unsigned long lapsDelta, float distanceM, float rpm,
                float temp, float hum, float lux) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  HTTPClient http;
  String url = String(SCRIPT_URL)
    + "?total_laps="  + totalLaps
    + "&laps_delta="  + lapsDelta
    + "&distance_m="  + distanceM
    + "&rpm="         + rpm
    + "&temperature=" + temp
    + "&humidity="    + hum
    + "&lux="         + lux;

  http.begin(url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  int code = http.GET();
  Serial.printf("Upload: HTTP %d  T=%.1f H=%.1f Lux=%.0f\n", code, temp, hum, lux);
  http.end();
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  delay(500);

  Wire.begin(I2C_SDA, I2C_SCL);
  dht.begin();
  lightMeter.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED init failed");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.print("Connecting WiFi...");
    display.display();
  }

  pinMode(SENSOR_PIN, INPUT_PULLUP);
  connectWiFi();
  Serial.println("Wheel counter ready.");
  updateDisplay();
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
    updateDisplay();
  }
  lastPin = currentPin;

  if (now - lastUploadMs >= UPLOAD_INTERVAL_MS) {
    lastTemp = dht.readTemperature();
    lastHum  = dht.readHumidity();
    lastLux  = lightMeter.readLightLevel();

    if (isnan(lastTemp)) lastTemp = 0;
    if (isnan(lastHum))  lastHum  = 0;
    if (lastLux < 0)     lastLux  = 0;

    unsigned long delta = lapCount - lastUploadLaps;
    lastRpm = delta * (60000.0f / UPLOAD_INTERVAL_MS);

    uploadData(lapCount, delta, lapCount * WHEEL_CIRC_M, lastRpm, lastTemp, lastHum, lastLux);
    lastUploadLaps = lapCount;
    lastUploadMs = now;
    updateDisplay();
  }

  delay(1);
}
