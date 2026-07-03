/*
  Hifz Tracker ESP32 OLED Timer

  Required Arduino libraries:
  - Adafruit SSD1306
  - Adafruit GFX Library
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
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define BUTTON_PIN 27

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE_URL = "http://YOUR_SERVER_IP:5000";
const char* DEVICE_TOKEN = "PASTE_DEVICE_TOKEN_HERE";

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

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
bool buttonWasDown = false;

long sabaqSeconds = 0;
long sabaqParaSeconds = 0;
long revisionSeconds = 0;

String studentName = "Student";
String sabaqLesson = "Loading...";
String sabaqParaLesson = "Loading...";
String revisionLesson = "Loading...";
String statusLine = "Booting";

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

long* currentSeconds() {
  if (currentMode == SABAQ) return &sabaqSeconds;
  if (currentMode == SABAQ_PARA) return &sabaqParaSeconds;
  return &revisionSeconds;
}

String formatDuration(long totalSeconds) {
  long minutes = totalSeconds / 60;
  long seconds = totalSeconds % 60;
  char buffer[12];
  snprintf(buffer, sizeof(buffer), "%02ld:%02ld", minutes, seconds);
  return String(buffer);
}

String wrappedLine(String text, int maxChars, int lineIndex) {
  text.trim();
  int start = lineIndex * maxChars;
  if (start >= text.length()) return "";
  return text.substring(start, min(start + maxChars, (int)text.length()));
}

void drawScreen() {
  long shownSeconds = *currentSeconds();
  if (timerRunning) {
    shownSeconds += (millis() - timerStartedAt) / 1000;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(modeTitle());
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  display.setCursor(0, 15);
  display.println(wrappedLine(currentLesson(), 20, 0));
  display.setCursor(0, 25);
  display.println(wrappedLine(currentLesson(), 20, 1));

  display.setTextSize(2);
  display.setCursor(0, 39);
  display.println(formatDuration(shownSeconds));

  display.setTextSize(1);
  display.setCursor(72, 44);
  display.println(timerRunning ? "RUN" : "STOP");
  display.setCursor(0, 57);
  display.println(statusLine.substring(0, 21));
  display.display();
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  statusLine = "Connecting WiFi";
  drawScreen();

  while (WiFi.status() != WL_CONNECTED) {
    delay(350);
  }

  statusLine = "WiFi connected";
}

bool fetchTodayLessons() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/today";
  http.begin(url);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  int statusCode = http.GET();
  if (statusCode != 200) {
    statusLine = "Fetch failed " + String(statusCode);
    http.end();
    return false;
  }

  StaticJsonDocument<1536> doc;
  DeserializationError error = deserializeJson(doc, http.getString());
  http.end();

  if (error) {
    statusLine = "JSON failed";
    return false;
  }

  studentName = doc["studentName"] | "Student";
  sabaqLesson = doc["lessons"]["sabaq"] | "No Sabaq";
  sabaqParaLesson = doc["lessons"]["sabaqPara"] | "No Sabaq Para";
  revisionLesson = doc["lessons"]["revision"] | "No Revision";
  statusLine = "Lessons loaded";
  return true;
}

bool uploadSession() {
  if (timerRunning) {
    *currentSeconds() += (millis() - timerStartedAt) / 1000;
    timerRunning = false;
  }

  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/session";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<256> doc;
  doc["sabaqSeconds"] = sabaqSeconds;
  doc["sabaqParaSeconds"] = sabaqParaSeconds;
  doc["revisionSeconds"] = revisionSeconds;

  String body;
  serializeJson(doc, body);

  int statusCode = http.POST(body);
  http.end();

  if (statusCode != 201) {
    statusLine = "Upload failed " + String(statusCode);
    return false;
  }

  sabaqSeconds = 0;
  sabaqParaSeconds = 0;
  revisionSeconds = 0;
  statusLine = "Upload complete";
  return true;
}

void cycleMode() {
  if (timerRunning) return;
  currentMode = (LessonMode)(((int)currentMode + 1) % 3);
  statusLine = modeTitle();
}

void toggleTimer() {
  if (timerRunning) {
    *currentSeconds() += (millis() - timerStartedAt) / 1000;
    timerRunning = false;
    statusLine = "Timer stopped";
  } else {
    timerStartedAt = millis();
    timerRunning = true;
    statusLine = "Timer running";
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
      toggleTimer();
    } else if (millis() - lastPressAt < 420) {
      uploadSession();
      lastPressAt = 0;
    } else {
      cycleMode();
      lastPressAt = millis();
    }
  }

  buttonWasDown = buttonDown;
}

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.display();

  connectWifi();
  fetchTodayLessons();
}

void loop() {
  handleButton();
  drawScreen();
  delay(100);
}
