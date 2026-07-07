export interface Utilisateur {
  id: number; nom: string; email: string; role: string; actif: boolean; cree_le: string;
}
export interface Capteur {
  id: number; nom: string; type: string; emplacement: string; actif: boolean; cree_le: string;
}
export interface Mesure {
  id: number; capteur_id: number; valeur: number; unite: string; timestamp: string;
}
export interface Alerte {
  id: number; capteur_id: number | null; niveau: 'info' | 'attention' | 'critique';
  message: string; traitee: boolean; cree_le: string;
}
export interface Document {
  id: number; nom: string; taille: number | null; indexe: boolean; uploade_le: string;
}
export interface ChatMessage {
  role: 'user' | 'assistant'; content: string; sources?: Source[];
}
export interface Source {
  document: string; page: string | number; score: number;
}