#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// ===============================
// Configuration
// ===============================

const char* WIFI_SSID     = "M-LINK";
const char* WIFI_PASSWORD = "22092005";

// Replace with your computer's IP address
const char* SERVER_URL = "http://192.168.1.100:8000";

const int CAPTEUR_ID_TEMP = 1;
const int CAPTEUR_ID_HUM  = 2;

const unsigned long INTERVAL_MS = 30000;

// ===============================

#define DHT_PIN 4

DHTesp dht;

// ===============================
// Wi-Fi
// ===============================

void connecterWiFi() {

  Serial.print("Connexion à ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connecté !");
  Serial.print("Adresse IP ESP32 : ");
  Serial.println(WiFi.localIP());
}

// ===============================
// Envoi HTTP
// ===============================

bool envoyerMesure(int capteur_id, float valeur, const String &unite) {

  if (WiFi.status() != WL_CONNECTED) {
    connecterWiFi();
  }

  HTTPClient http;

  String url = String(SERVER_URL) + "/api/mesures/";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;

  doc["capteur_id"] = capteur_id;
  doc["valeur"] = valeur;
  doc["unite"] = unite;

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("Mesure envoyée.");
  } else {
    Serial.print("Erreur HTTP : ");
    Serial.println(httpCode);
    Serial.println(http.getString());
  }

  http.end();

  return (httpCode == 200 || httpCode == 201);
}

// ===============================
// Setup
// ===============================

void setup() {

  Serial.begin(115200);

  dht.setup(DHT_PIN, DHTesp::DHT11);

  connecterWiFi();

  Serial.println("MedAssist AI prêt.");
}

// ===============================
// Loop
// ===============================

void loop() {

  TempAndHumidity data = dht.getTempAndHumidity();

  if (dht.getStatus() == 0) {

    Serial.print("Température : ");
    Serial.print(data.temperature);
    Serial.println(" °C");

    Serial.print("Humidité : ");
    Serial.print(data.humidity);
    Serial.println(" %");

    envoyerMesure(CAPTEUR_ID_TEMP, data.temperature, "°C");

    delay(200);

    envoyerMesure(CAPTEUR_ID_HUM, data.humidity, "%");

  } else {

    Serial.print("Erreur DHT11 : ");
    Serial.println(dht.getStatusString());
  }

  Serial.println("----------------------------");

  delay(INTERVAL_MS);
}