// Colores base de ScamAlert — usados en todo el frontend
export const COLORS = {
  // Primario
  base: "#51A2E2",
  baseDark: "#3A87C4",
  baseLight: "#6FB4E9",
  baseBg: "#EAF4FC",

  // Semáforo — verde (seguro)
  green: "#2ECC71",
  greenBg: "#E9FBF1",

  // Semáforo — amarillo (sospechoso)
  yellow: "#F1C40F",
  yellowBg: "#FEF8E4",

  // Semáforo — rojo (peligro)
  red: "#E74C3C",
  redBg: "#FCEAE8",

  // Generales
  bg: "#F5F5F8",
  card: "#FFFFFF",
  border: "#E9E9F0",
  text: "#1E1E2A",
  textMuted: "#8A8A9A",
  label: "#9C9CB0",
  white: "#FFFFFF",
  headerTint: "#C9C3F0",
};

// Mapeo del backend → UI
// El backend usa: "green", "yellow", "red"
// La UI muestra: SEGURO, SOSPECHOSO, PELIGRO
export type RiskLevel = "green" | "yellow" | "red";

export const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; icon: string }
> = {
  red: {
    label: "PELIGRO",
    color: COLORS.red,
    bg: COLORS.redBg,
    icon: "🔒",
  },
  yellow: {
    label: "SOSPECHOSO",
    color: COLORS.yellow,
    bg: COLORS.yellowBg,
    icon: "⚠️",
  },
  green: {
    label: "SEGURO",
    color: COLORS.green,
    bg: COLORS.greenBg,
    icon: "🛡️",
  },
};
