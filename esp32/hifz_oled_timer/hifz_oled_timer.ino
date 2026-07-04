/*
  AyahTrack ESP32 OLED Timer

  Required Arduino libraries:
  - U8g2
  - ArduinoJson

  Hardware:
  - ESP32 DevKit
  - SSD1306 128x64 OLED over I2C
  - Momentary button from BUTTON_PIN to GND

  Controls:
  - Short press: cycle Sabaq / Sabaq Para / Revision
  - Long press: start or stop timer for selected section
  - Double press: upload all recorded durations
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <U8g2lib.h>
#include "hifz_config.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define BUTTON_PIN 27
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22
#define USE_SH1106 1

#if USE_SH1106
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE, OLED_SCL_PIN, OLED_SDA_PIN);
#else
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE, OLED_SCL_PIN, OLED_SDA_PIN);
#endif

WiFiClient wifiClient;
uint8_t oledAddress = 0x3C;

enum LessonMode {
  SABAQ = 0,
  SABAQ_PARA = 1,
  REVISION = 2,
};

LessonMode currentMode = SABAQ;
bool timerRunning = false;
unsigned long timerStartedAt = 0;
unsigned long lastPressAt = 0;
unsigned long buttonDownAt = 0;
unsigned long pendingShortPressAt = 0;
bool buttonWasDown = false;

unsigned long sabaqMillis = 0;
unsigned long sabaqParaMillis = 0;
unsigned long revisionMillis = 0;

String studentName = "Student";
String sabaqLesson = "Loading...";
String sabaqParaLesson = "Loading...";
String revisionLesson = "Loading...";
String statusLine = "Booting";
unsigned long lastScreenDrawAt = 0;

void setStatus(String message) {
  statusLine = message;
  Serial.println(message);
}

uint8_t findOledAddress() {
  Serial.println("Scanning I2C...");

  for (uint8_t address = 1; address < 127; address += 1) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("I2C device found at 0x");
      Serial.println(address, HEX);

      if (address == 0x3C || address == 0x3D) {
        return address;
      }
    }
  }

  Serial.println("No SSD1306 address found; using 0x3C");
  return 0x3C;
}

void drawBootScreen(String message) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x10_tf);
  display.drawStr(0, 10, "Hifz Tracker");
  display.drawHLine(0, 14, 128);
  display.drawStr(0, 28, message.c_str());
  display.sendBuffer();
}

void printFixedLine(String text, int y, int maxChars) {
  display.drawStr(0, y, text.substring(0, maxChars).c_str());
}

String modeTitle() {
  if (currentMode == SABAQ) return "Sabaq";
  if (currentMode == SABAQ_PARA) return "Sabaq Para";
  return "Revision";
}

String currentLesson() {
  if (currentMode == SABAQ) return sabaqLesson;
  if (currentMode == SABAQ_PARA) return sabaqParaLesson;
  return revisionLesson;
}

unsigned long* currentMillisTotal() {
  if (currentMode == SABAQ) return &sabaqMillis;
  if (currentMode == SABAQ_PARA) return &sabaqParaMillis;
  return &revisionMillis;
}

unsigned long millisToSeconds(unsigned long totalMillis) {
  return (totalMillis + 500) / 1000;
}

String formatDuration(unsigned long totalMillis) {
  unsigned long totalSeconds = millisToSeconds(totalMillis);
  unsigned long minutes = totalSeconds / 60;
  unsigned long seconds = totalSeconds % 60;
  char buffer[12];
  snprintf(buffer, sizeof(buffer), "%02lu:%02lu", minutes, seconds);
  return String(buffer);
}

String wrappedLine(String text, int maxChars, int lineIndex) {
  text.trim();
  int start = lineIndex * maxChars;
  if (start >= text.length()) return "";
  return text.substring(start, min(start + maxChars, (int)text.length()));
}

void drawScreen() {
  unsigned long shownMillis = *currentMillisTotal();
  if (timerRunning) {
    shownMillis += millis() - timerStartedAt;
  }

  display.clearBuffer();
  display.setFont(u8g2_font_6x10_tf);
  display.drawStr(0, 10, modeTitle().c_str());
  display.drawHLine(0, 13, 128);

  printFixedLine(wrappedLine(currentLesson(), 20, 0), 25, 20);
  printFixedLine(wrappedLine(currentLesson(), 20, 1), 36, 20);

  display.setFont(u8g2_font_logisoso16_tf);
  display.drawStr(0, 57, formatDuration(shownMillis).c_str());

  display.setFont(u8g2_font_6x10_tf);
  display.drawStr(76, 49, timerRunning ? "RUN" : "STOP");
  display.drawStr(76, 61, statusLine.substring(0, 8).c_str());
  display.sendBuffer();
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  setStatus("Connecting WiFi");
  drawScreen();

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(350);
  }

  if (WiFi.status() == WL_CONNECTED) {
    setStatus("WiFi " + WiFi.localIP().toString());
    Serial.println("ESP32 IP " + WiFi.localIP().toString());
    Serial.println("Gateway " + WiFi.gatewayIP().toString());
    Serial.println("Subnet " + WiFi.subnetMask().toString());
  } else {
    setStatus("WiFi failed");
  }
}

bool fetchTodayLessons() {
  if (WiFi.status() != WL_CONNECTED) {
    setStatus("WiFi offline");
    return false;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/today";
  Serial.println("GET " + url);
  http.begin(wifiClient, url);
  http.setTimeout(8000);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  int statusCode = http.GET();
  Serial.println("Fetch status " + String(statusCode));
  if (statusCode != 200) {
    Serial.println("Fetch error " + http.errorToString(statusCode));
    setStatus("Fetch failed " + String(statusCode));
    http.end();
    return false;
  }

  StaticJsonDocument<1536> doc;
  DeserializationError error = deserializeJson(doc, http.getString());
  http.end();

  if (error) {
    setStatus("JSON failed");
    return false;
  }

  studentName = doc["studentName"] | "Student";
  sabaqLesson = doc["lessons"]["sabaq"] | "No Sabaq";
  sabaqParaLesson = doc["lessons"]["sabaqPara"] | "No Sabaq Para";
  revisionLesson = doc["lessons"]["revision"] | "No Revision";
  setStatus("Lessons loaded");
  return true;
}

bool uploadSession() {
  if (timerRunning) {
    *currentMillisTotal() += millis() - timerStartedAt;
    timerRunning = false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    setStatus("WiFi offline");
    return false;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/session";
  Serial.println("POST " + url);
  http.begin(wifiClient, url);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<256> doc;
  doc["sabaqSeconds"] = millisToSeconds(sabaqMillis);
  doc["sabaqParaSeconds"] = millisToSeconds(sabaqParaMillis);
  doc["revisionSeconds"] = millisToSeconds(revisionMillis);

  String body;
  serializeJson(doc, body);

  int statusCode = http.POST(body);
  Serial.println("Upload status " + String(statusCode));
  http.end();

  if (statusCode != 201) {
    Serial.println("Upload error " + http.errorToString(statusCode));
    setStatus("Upload failed " + String(statusCode));
    return false;
  }

  sabaqMillis = 0;
  sabaqParaMillis = 0;
  revisionMillis = 0;
  setStatus("Upload complete");
  return true;
}

void cycleMode() {
  if (timerRunning) return;
  currentMode = (LessonMode)(((int)currentMode + 1) % 3);
  setStatus(modeTitle());
}

void toggleTimer() {
  if (timerRunning) {
    *currentMillisTotal() += millis() - timerStartedAt;
    timerRunning = false;
    setStatus("Timer stopped");
  } else {
    timerStartedAt = millis();
    timerRunning = true;
    setStatus("Timer running");
  }
}

void handleButton() {
  bool buttonDown = digitalRead(BUTTON_PIN) == LOW;

  if (buttonDown && !buttonWasDown) {
    buttonDownAt = millis();
  }

  if (!buttonDown && buttonWasDown) {
    unsigned long pressLength = millis() - buttonDownAt;

    if (pressLength > 850) {
      pendingShortPressAt = 0;
      toggleTimer();
    } else if (millis() - lastPressAt < 420) {
      pendingShortPressAt = 0;
      uploadSession();
      lastPressAt = 0;
    } else {
      pendingShortPressAt = millis();
      lastPressAt = millis();
    }
  }

  buttonWasDown = buttonDown;

  if (pendingShortPressAt > 0 && millis() - pendingShortPressAt >= 430) {
    cycleMode();
    pendingShortPressAt = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  oledAddress = findOledAddress();
  display.setI2CAddress(oledAddress << 1);
  display.begin();
  display.setPowerSave(0);
  display.clearBuffer();
  display.sendBuffer();
  drawBootScreen("OLED ready");
  delay(1200);

  connectWifi();
  fetchTodayLessons();
}

void loop() {
  handleButton();

  if (millis() - lastScreenDrawAt >= 250) {
    drawScreen();
    lastScreenDrawAt = millis();
  }

  delay(20);
}