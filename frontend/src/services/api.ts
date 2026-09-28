import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  User,
  LoginResponse,
  Analysis,
  Report,
  AnalysisStats,
} from "../types";

export const API_BASE = "http://10.0.2.2:8000"; // Android emulator
// Si usas dispositivo físico, cámbialo a tu IP local:
// const API_BASE = "http://192.168.x.x:8000";

const api = axios.create({ baseURL: API_BASE });

// ── Interceptor: agregar token a cada request ──
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── AUTH ──
export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  age_range?: string;
}): Promise<User> {
  const res = await api.post<User>("/auth/register", data);
  return res.data;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", { email, password });
  await AsyncStorage.setItem("token", res.data.access_token);
  return res.data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem("token");
}

export async function getProfile(): Promise<User> {
  const res = await api.get<User>("/auth/profile");
  return res.data;
}

export async function updateProfile(data: {
  email?: string;
  full_name?: string;
  phone?: string;
  age_range?: string;
}): Promise<User> {
  const res = await api.put<User>("/auth/profile", data);
  return res.data;
}

export async function uploadAvatar(uri: string): Promise<User> {
  const form = new FormData();
  const filename = uri.split("/").pop() || "avatar.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";
  form.append("file", { uri, name: filename, type } as any);
  const res = await api.post<User>("/auth/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  await api.put("/auth/change-password", { current_password, new_password });
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await AsyncStorage.getItem("token");
  return !!token;
}

// ── ANÁLISIS ──
export async function analyzeText(input_text: string): Promise<Analysis> {
  const form = new FormData();
  form.append("input_text", input_text);
  const res = await api.post<Analysis>("/analysis/text", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function analyzeImage(uri: string): Promise<Analysis> {
  const form = new FormData();
  const filename = uri.split("/").pop() || "image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  form.append("file", { uri, name: filename, type } as any);
  const res = await api.post<Analysis>("/analysis/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getHistory(
  skip: number = 0,
  limit: number = 20,
): Promise<Analysis[]> {
  const res = await api.get<Analysis[]>("/analysis/history", {
    params: { skip, limit },
  });
  return res.data;
}

export async function getAnalysis(id: string): Promise<Analysis> {
  const res = await api.get<Analysis>(`/analysis/${id}`);
  return res.data;
}

export async function getStats(): Promise<AnalysisStats> {
  const res = await api.get<AnalysisStats>("/analysis/stats");
  return res.data;
}

// ── REPORTES ──
export async function createReport(data: {
  message_text: string;
  scam_type?: string;
  source_type?: string;
  sender_info?: string;
  is_confirmed_scam?: boolean;
  analysis_id?: string;
}): Promise<Report> {
  const res = await api.post<Report>("/reports/", data);
  return res.data;
}

export async function confirmReport(
  id: string,
  is_confirmed_scam: boolean,
): Promise<Report> {
  const res = await api.put<Report>(`/reports/${id}/confirm`, {
    is_confirmed_scam,
  });
  return res.data;
}

export async function getReports(
  skip: number = 0,
  limit: number = 20,
): Promise<Report[]> {
  const res = await api.get<Report[]>("/reports/", {
    params: { skip, limit },
  });
  return res.data;
}
