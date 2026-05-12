#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <Keypad.h>
#include <Preferences.h>

// =============================================
// 1. CONFIGURACIÓN MQTT
// =============================================
const char* mqtt_server = "187.124.146.232";

// =============================================
// 2. CONFIGURACIÓN SUPABASE
// =============================================
// CAMBIO: Ahora buscamos por chip_id directamente
const char* supabaseUrl = "https://vxvrrmtiexpmaqnscydv.supabase.co/rest/v1/devices?chip_id=eq.";
const char* supabaseKey = "TU_ANON_PUBLIC_KEY"; // <--- PON TU KEY REAL AQUÍ

// =============================================
// 3. BLUETOOTH (UUIDs)
// =============================================
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CONFIG_CHAR_UUID  "cba1d466-344c-4be3-ab31-107001afc06a"
#define WIFI_LIST_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define ID_CHAR_UUID      "d27b1658-6927-466d-8e6d-25866163351d"

// =============================================
// 4. TECLADO
// =============================================
const byte ROWS = 4; const byte COLS = 3;
char keys[ROWS][COLS] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{'*','0','#'}};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// =============================================
// 5. VARIABLES GLOBALES
// =============================================
const int relayPin   = 4;
const int ledInterno = 2;
WiFiClient espClient;
PubSubClient client(espClient);
Preferences preferences;

String savedSSID, savedPASS, chipIdStr;
String wifiListJson = "[]";
String codigoAcumulado = "";
unsigned long lastSupabaseCheck = 0;
BLECharacteristic *pWifiListChar;

void abrirAccion(String source) {
  Serial.println(">>> ABRIENDO desde: " + source);
  digitalWrite(relayPin, LOW);
  digitalWrite(ledInterno, HIGH);
  delay(1000); // Un segundo de apertura
  digitalWrite(relayPin, HIGH);
  digitalWrite(ledInterno, LOW);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  if (message == "abrir" || message == "open") abrirAccion("MQTT/n8n");
}

void scanWifi() {
  int n = WiFi.scanNetworks();
  DynamicJsonDocument doc(1024);
  JsonArray array = doc.to<JsonArray>();
  int limit = (n > 8) ? 8 : n;
  for (int i = 0; i < limit; ++i) array.add(WiFi.SSID(i));
  serializeJson(doc, wifiListJson);
  if (pWifiListChar) pWifiListChar->setValue(wifiListJson.c_str());
}

void reconnectMQTT() {
  String myTopic = "onecontrol/" + chipIdStr + "/comando";
  while (!client.connected() && WiFi.status() == WL_CONNECTED) {
    if (client.connect(chipIdStr.c_str())) {
      client.subscribe(myTopic.c_str());
      Serial.println("MQTT Suscrito a: " + myTopic);
    } else {
      delay(5000);
    }
  }
}

void checkSupabase() {
  if (millis() - lastSupabaseCheck < 2000) return; // Chequeo cada 2 seg
  lastSupabaseCheck = millis();

  HTTPClient http;
  // CAMBIO: Consultamos usando el chipIdStr
  http.begin(String(supabaseUrl) + chipIdStr);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));

  int code = http.GET();
  if (code == 200) {
    DynamicJsonDocument doc(512);
    deserializeJson(doc, http.getString());
    if (doc.size() > 0 && String(doc[0]["last_command"]) == "open") {
      abrirAccion("App/Botón");
      
      // Limpiar el comando en la base de datos
      HTTPClient patch;
      patch.begin(String(supabaseUrl) + chipIdStr);
      patch.addHeader("apikey", supabaseKey);
      patch.addHeader("Authorization", "Bearer " + String(supabaseKey));
      patch.addHeader("Content-Type", "application/json");
      patch.PATCH("{\"last_command\": null}");
      patch.end();
    }
  }
  http.end();
}

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { Serial.println("App conectada."); };
    void onDisconnect(BLEServer* pServer) { pServer->getAdvertising()->start(); }
};

class ConfigCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String value = pChar->getValue().c_str();
    DynamicJsonDocument doc(512);
    if (deserializeJson(doc, value) == DeserializationError::Ok) {
      if (doc.containsKey("action") && doc["action"] == "reset") {
        preferences.begin("config", false); preferences.clear(); preferences.end();
        ESP.restart();
      }
      String ssid = doc["s"] | "";
      String pass = doc["p"] | "";
      if (ssid != "") {
        preferences.begin("config", false);
        preferences.putString("ssid", ssid); preferences.putString("pass", pass);
        preferences.end();
        ESP.restart();
      }
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(relayPin, OUTPUT); pinMode(ledInterno, OUTPUT);
  digitalWrite(relayPin, HIGH);

  // Generar Chip ID
  uint64_t chipid = ESP.getEfuseMac();
  char id_buffer[17];
  sprintf(id_buffer, "%04X%08X", (uint16_t)(chipid>>32), (uint32_t)chipid);
  chipIdStr = String(id_buffer);
  Serial.println("Mi Chip ID: " + chipIdStr);

  preferences.begin("config", true);
  savedSSID = preferences.getString("ssid", "");
  savedPASS = preferences.getString("pass", "");
  preferences.end();

  WiFi.mode(WIFI_STA); WiFi.disconnect(); scanWifi();

  BLEDevice::init("OneControl-Gate");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pConfigChar = pService->createCharacteristic(CONFIG_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pConfigChar->setCallbacks(new ConfigCallbacks());

  pWifiListChar = pService->createCharacteristic(WIFI_LIST_UUID, BLECharacteristic::PROPERTY_READ);
  pWifiListChar->setValue(wifiListJson.c_str());

  BLECharacteristic *pIdChar = pService->createCharacteristic(ID_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  pIdChar->setValue(id_buffer);

  pService->start();
  pServer->getAdvertising()->start();

  if (savedSSID != "") {
    WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
    client.setServer(mqtt_server, 1883);
    client.setCallback(mqttCallback);
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) reconnectMQTT();
    client.loop();
    checkSupabase();
  }
  char key = keypad.getKey();
  if (key && key == '#') {
    client.publish(("onecontrol/"+chipIdStr+"/peticion").c_str(), codigoAcumulado.c_str());
    codigoAcumulado = "";
  } else if (key && key != '*') {
    codigoAcumulado += key;
  }
}
