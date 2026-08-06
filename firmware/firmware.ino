#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// ============================================================================
// Configuration
// ============================================================================

// Identifiants Wi-Fi
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Broker MQTT (Mosquitto tourne dans un conteneur Docker)
// Mettre ici l'IP de la machine hôte qui expose le port 1883 du conteneur
const char* MQTT_BROKER    = "192.168.1.100";
const int   MQTT_PORT      = 1883;
const char* MQTT_CLIENT_ID = "esp32-sensor-1";

// Identifiant de la salle, utilisé dans les topics MQTT (medassist/salle/salle-1/...)
#define SALLE "salle-1"

const char* MQTT_TOPIC_PREFIX = "medassist/salle/" SALLE;

// Intervalle entre deux mesures (ms)
const unsigned long INTERVAL_MS = 3000;

// ============================================================================
// Matériel
// ============================================================================

// Broche data du DHT11
#define DHT_PIN 4

DHTesp dht;

// ============================================================================
// Clients Wi-Fi & MQTT
// ============================================================================

WiFiClient espWifi;
PubSubClient mqtt(espWifi);

// Connexion au Wi-Fi (bloquant jusqu'à succès)
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
  Serial.print  ("Salle déclarée  : ");
  Serial.println(SALLE);
  Serial.print  ("Sleep Wi-Fi désactivé : ");
  Serial.println(WiFi.getSleep() ? "non" : "oui");
}

// Connexion au broker MQTT Docker (bloquant, retry toutes les 2s)
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

// Publie une mesure sur medassist/salle/<salle>/<type>
// Payload JSON : { ip, type, valeur, unite }
bool envoyerMesure(const char* type, float valeur, const char* unite) {

  if (WiFi.status() != WL_CONNECTED) {
    connecterWiFi();
  }
  if (!mqtt.connected()) {
    connecterMQTT();
  }
  mqtt.loop();   // maintient la connexion en vie entre deux publications

  char topic[96];
  snprintf(topic, sizeof(topic), "%s/%s", MQTT_TOPIC_PREFIX, type);

  JsonDocument doc;
  doc["ip"]     = WiFi.localIP().toString();
  doc["type"]   = type;
  doc["valeur"] = valeur;
  doc["unite"]  = unite;

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

// ============================================================================
// Diagnostic réseau
// ============================================================================

// Affiche les infos réseau et teste la connectivité vers le broker Docker
void diagnosticReseau() {
  Serial.println();
  Serial.println("=== DIAGNOSTIC RESEAU ===");
  Serial.print  ("SSID connecte        : "); Serial.println(WiFi.SSID());
  Serial.print  ("RSSI                 : "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  Serial.print  ("Adresse IP ESP32     : "); Serial.println(WiFi.localIP());
  Serial.print  ("Salle (topic prefix) : "); Serial.println(SALLE);
  Serial.print  ("Masque               : "); Serial.println(WiFi.subnetMask());
  Serial.print  ("Passerelle           : "); Serial.println(WiFi.gatewayIP());
  Serial.print  ("DNS primaire         : "); Serial.println(WiFi.dnsIP(0));

  // Résolution broker (littéral IPv4 ou hostname) + test TCP brut
  IPAddress brokerIP;
  if (brokerIP.fromString(MQTT_BROKER)) {
    // OK — c'était déjà un littéral IPv4 (ex. "192.168.1.102")
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

// ============================================================================
// Initialisation
// ============================================================================

void setup() {

  Serial.begin(115200);
  delay(500);

  dht.setup(DHT_PIN, DHTesp::DHT11);

  connecterWiFi();
  diagnosticReseau();

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);

  connecterMQTT();

  Serial.println("MedAssist AI prêt.");
}

// ===============================
// Boucle principale
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

    envoyerMesure("temperature", data.temperature, "°C");

    delay(200);

    envoyerMesure("humidite", data.humidity, "%");

    // Capteurs additionnels possibles (déjà supportés côté backend/dashboard) :
    // envoyerMesure("pression",    readBmp(), "hPa");    // BMP280
    // envoyerMesure("qualite_air", readSgp(), "ppm");    // SGP40 / SGP30

  } else {

    Serial.print("Erreur DHT11 : ");
    Serial.println(dht.getStatusString());
  }

  Serial.println("----------------------------");

  delay(INTERVAL_MS);
}