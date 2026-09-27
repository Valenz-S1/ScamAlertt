export type NivelRiesgo = "bajo" | "medio" | "alto";

export interface ResultadoAnalisis {
  es_sospechoso: boolean;
  tipo_estafa: string;
  nivel_riesgo: NivelRiesgo;
  explicacion: string;
  reportes_similares?: number;
}
