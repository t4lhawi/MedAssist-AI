export interface Utilisateur {
  id: number; nom: string; email: string; role: string; actif: boolean; cree_le: string;
}

// ─── ESP32 devices (source-of-truth registry) ───────────────────
export interface Esp32Device {
  id: number;
  ip: string;
  salle: string;
  note: string | null;
  actif: boolean;
  cree_le: string;
  derniere_mesure_le: string | null;
}

// ─── Aggregated salle view (consumed by /admin/salles) ──────────
export type SensorType = 'temperature' | 'humidite' | 'pression' | 'qualite_air';
export type SensorState = 'active' | 'offline' | 'not_installed';

export interface SensorStatus {
  type: SensorType;
  state: SensorState;
  last_value: number | null;
  last_unite: string | null;
  last_timestamp: string | null;
  last_seen_label: string | null;
}

export interface SalleStatus {
  esp32_id: number | null;
  salle: string;
  ip: string | null;
  actif: boolean;
  online: boolean;
  sensors: SensorStatus[];
  derniere_mesure_le: string | null;
}

export interface UnregisteredSource {
  ip: string;
  last_seen: string | null;
  measurement_count: number;
  last_type: SensorType | string | null;
  last_valeur: number | null;
  last_unite: string | null;
}

// ─── Mesures ────────────────────────────────────────────────────
export interface Mesure {
  id: number;
  esp32_id: number | null;
  type: SensorType | string | null;
  source_ip: string | null;
  salle: string | null;
  topic_salle: string | null;
  valeur: number;
  unite: string | null;
  timestamp: string;
}

// ─── Alertes ────────────────────────────────────────────────────
export interface Alerte {
  id: number;
  esp32_id: number | null;
  type: SensorType | string | null;
  salle: string | null;
  niveau: 'info' | 'attention' | 'critique';
  message: string;
  traitee: boolean;
  cree_le: string;
}

// ─── Documents ──────────────────────────────────────────────────
export interface Document {
  id: number; nom: string; taille: number | null; indexe: boolean; uploade_le: string;
}

// ─── Chat ───────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'; content: string; sources?: Source[];
}
export interface Source {
  document: string; page: string | number; score: number;
}
