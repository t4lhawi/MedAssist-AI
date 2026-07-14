#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// ===============================
// Configuration
// ===============================

const char* WIFI_SSID     = "M-LINK";
const char* WIFI_PASSWORD = "22092005";

// Adresse IP du PC qui fait tourner Mosquitto (sur le même Wi-Fi que l'ESP32)
const char* MQTT_BROKER     = "192.168.1.100";
const int   MQTT_PORT       = 1883;
const char* MQTT_CLIENT_ID  = "esp32-sensor-1";
const char* MQTT_TOPIC_PREFIX = "medassist/mesures";

const int CAPTEUR_ID_TEMP = 1;
const int CAPTEUR_ID_HUM  = 2;

const unsigned long INTERVAL_MS = 3000;

// ===============================

#define DHT_PIN 4

DHTesp dht;

// ===============================
// Wi-Fi + MQTT
// ===============================

WiFiClient   espWifi;
PubSubClient mqtt(espWifi);

void connecterWiFi() {

  Serial.print("Connexion à ");
  Serial.println(WIFI_SSID);

  // Désactive le power-save Wi-Fi — sinon l'ESP32 peut endormir la radio
  // au milieu de la poignée de main MQTT (CONNACK perdue → rc=-2).
  WiFi.setSleep(false);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connecté !");
  Serial.print("Adresse IP ESP32 : ");
  Serial.println(WiFi.localIP());
  Serial.print  ("Sleep Wi-Fi désactivé : ");
  Serial.println(WiFi.getSleep() ? "non" : "oui");
}

void connecterMQTT() {

  while (!mqtt.connected()) {
    Serial.print("Connexion MQTT ");
    Serial.print(MQTT_BROKER);
    Serial.print(":");
    Serial.print(MQTT_PORT);
    Serial.print(" ... ");

    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("ok");
    } else {
      Serial.print("échec, rc=");
      Serial.print(mqtt.state());
      Serial.println(" — retry dans 2s");
      delay(2000);
    }
  }
}

// ===============================
// Envoi MQTT
// ===============================

bool envoyerMesure(int capteur_id, float valeur, const String &unite) {

  if (WiFi.status() != WL_CONNECTED) {
    connecterWiFi();
  }
  if (!mqtt.connected()) {
    connecterMQTT();
  }
  mqtt.loop();   // maintient la connexion en vie entre deux publications

  char topic[64];
  snprintf(topic, sizeof(topic), "%s/%d", MQTT_TOPIC_PREFIX, capteur_id);

  JsonDocument doc;
  doc["valeur"]        = valeur;
  doc["unite"]         = unite;
  doc["timestamp_iso"] = "";   // vide — le backend stamp via func.now()

  String payload;
  serializeJson(doc, payload);

  bool ok = mqtt.publish(topic, payload.c_str());   // QoS 0, retain false
  if (ok) {
    Serial.print("MQTT -> ");
    Serial.print(topic);
    Serial.print(" : ");
    Serial.println(payload);
  } else {
    Serial.print("MQTT publish échoué (topic=");
    Serial.print(topic);
    Serial.println(")");
  }
  return ok;
}

// ===============================
// Diagnostic — diagnostic réseau avant MQTT
// ===============================

void diagnosticReseau() {
  Serial.println();
  Serial.println("=== DIAGNOSTIC RESEAU ===");
  Serial.print  ("SSID connecte        : "); Serial.println(WiFi.SSID());
  Serial.print  ("RSSI                 : "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  Serial.print  ("Adresse IP ESP32     : "); Serial.println(WiFi.localIP());
  Serial.print  ("Masque               : "); Serial.println(WiFi.subnetMask());
  Serial.print  ("Passerelle           : "); Serial.println(WiFi.gatewayIP());
  Serial.print  ("DNS primaire         : "); Serial.println(WiFi.dnsIP(0));

  // Résolution broker (littéral IPv4 ou hostname) + test TCP brut
  IPAddress brokerIP;
  if (brokerIP.fromString(MQTT_BROKER)) {
    // OK — c'était déjà un littéral IPv4 (ex. "192.168.1.100")
  } else {
    // Sinon on tente une résolution DNS
    Serial.print("Resolution DNS de "); Serial.print(MQTT_BROKER); Serial.print(" ... ");
    if (WiFi.hostByName(MQTT_BROKER, brokerIP)) {
      Serial.print("OK -> "); Serial.println(brokerIP);
    } else {
      Serial.println("ECHEC DNS");
    }
  }

  Serial.print  ("Broker cible         : "); Serial.print(MQTT_BROKER);
  Serial.print  ("  utilise -> "); Serial.println(brokerIP);

  Serial.print  ("Test TCP brut 1883   : ");
  WiFiClient probe;
  probe.setTimeout(3000);
  unsigned long t0 = millis();
  bool ok = probe.connect(brokerIP, MQTT_PORT);
  Serial.print(ok ? "OK" : "ECHEC");
  Serial.print(" ("); Serial.print(millis() - t0); Serial.println(" ms)");
  if (ok) probe.stop();
  Serial.println("=== FIN DIAGNOSTIC ===");
  Serial.println();
}

// ===============================
// Setup
// ===============================

void setup() {

  Serial.begin(115200);
  delay(500);

  dht.setup(DHT_PIN, DHTesp::DHT11);

  connecterWiFi();
  diagnosticReseau();

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);   // <-- this line was missing

  connecterMQTT();

  Serial.println("MedAssist AI prêt.");
}

// ===============================
// Loop
// ===============================

void loop() {

  mqtt.loop();   // draine le trafic entrant et entretient la connexion

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