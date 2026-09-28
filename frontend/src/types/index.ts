// ── Usuario ──
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  age_range: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Auth ──
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// ── Análisis ──
export type RiskLevel = "green" | "yellow" | "red";

export interface Analysis {
  id: string;
  user_id: string;
  input_type: "text" | "image";
  input_text: string | null;
  image_url: string | null;
  ocr_extracted_text: string | null;
  risk_level: RiskLevel;
  risk_score: number | null;
  is_scam: boolean | null;
  scam_type: string | null;
  explanation: string | null;
  detected_rules: Record<string, unknown> | null;
  similar_reports_count: number;
  created_at: string;
}

// ── Reporte ──
export interface Report {
  id: string;
  user_id: string;
  analysis_id: string | null;
  message_text: string;
  scam_type: string | null;
  source_type: "whatsapp" | "sms" | "email" | "other" | null;
  sender_info: string | null;
  is_confirmed_scam: boolean | null;
  created_at: string;
}

export interface AnalysisStats {
  total: number;
  safe: number;
  suspicious: number;
  danger: number;
}
