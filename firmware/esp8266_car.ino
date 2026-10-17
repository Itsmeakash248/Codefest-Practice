/*
 * FlowPilot ESP8266 firmware (Arduino, NodeMCU / Wemos D1 mini + L298N).
 * Polls Supabase car_commands over HTTPS every ~300ms, executes the oldest
 * pending row, marks it done. Failsafe: stops if idle > 1.5s.
 *
 * Required libraries: ESP8266WiFi, ESP8266HTTPClient, ArduinoJson.
 * Set WIFI_SSID / WIFI_PASS and SUPABASE_URL / SUPABASE_ANON_KEY below.
 * Never put the service-role key on the device.
 */
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "PHONE_HOTSPOT";
const char* WIFI_PASS = "HOTSPOT_PASS";
const char* SUPABASE_URL = "https://xyzcompany.supabase.co";
const char* SUPABASE_ANON = "ANON_KEY_HERE";

// L298N pins
const int ENA = D1, IN1 = D2, IN2 = D3;
const int ENB = D4, IN3 = D5, IN4 = D6;

unsigned long lastFresh = 0;
const unsigned long FAILSAFE_MS = 1500;

void drive(char cmd, int speed) {
  speed = constrain(speed, 0, 255);
  analogWrite(ENA, speed);
  analogWrite(ENB, speed);
  digitalWrite(IN1, cmd == 'F' || cmd == 'R');
  digitalWrite(IN2, cmd == 'B' || cmd == 'L');
  digitalWrite(IN3, cmd == 'F' || cmd == 'L');
  digitalWrite(IN4, cmd == 'B' || cmd == 'R');
  if (cmd == 'S') {
    analogWrite(ENA, 0);
    analogWrite(ENB, 0);
  }
}

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  drive('S', 0);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
}

void loop() {
  if (millis() - lastFresh > FAILSAFE_MS) drive('S', 0);  // failsafe stop
  if (WiFi.status() != WL_CONNECTED) { delay(300); return; }

  WiFiClientSecure client;
  client.setInsecure();  // use cert fingerprint in production
  HTTPClient http;
  String url = String(SUPABASE_URL) +
    "/rest/v1/car_commands?status=eq.pending&order=created_at.asc&limit=1";
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);

  if (http.GET() == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    if (doc.size() > 0) {
      String id = doc[0]["id"].as<String>();
      char cmd = ((String)doc[0]["command"]).charAt(0);
      int speed = doc[0]["speed"];
      drive(cmd, speed);
      lastFresh = millis();
      // mark done
      HTTPClient patch;
      patch.begin(client, String(SUPABASE_URL) + "/rest/v1/car_commands?id=eq." + id);
      patch.addHeader("apikey", SUPABASE_ANON);
      patch.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);
      patch.addHeader("Content-Type", "application/json");
      patch.PATCH("{\"status\":\"done\"}");
      patch.end();
      delay((cmd == 'S') ? 100 : 300);
    }
  }
  http.end();
  delay(300);
}
