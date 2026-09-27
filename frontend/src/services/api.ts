import axios from "axios";

// Cambia esto por la IP de tu backend cuando pruebes en un dispositivo físico
const BASE_URL = "http://localhost:8000";

export const api = axios.create({ baseURL: BASE_URL });

export async function analizarMensaje(texto: string) {
  const { data } = await api.post("/analyze", { texto });
  return data;
}
