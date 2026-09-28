import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RiskBadge from "../components/RiskBadge";
import { COLORS, RISK_CONFIG, RiskLevel } from "../theme/colors";
import { API_BASE } from "../services/api";
import type { Analysis } from "../types";

type MainStackParamList = {
  Analyze: undefined;
  Result: { result: Analysis; fromHistory?: boolean };
  History: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Result">;

// Recomendaciones por nivel
const RECOMMENDATIONS: Record<RiskLevel, string> = {
  red: "No respondas, no abras enlaces, no descargues nada y no compartas datos, contraseñas ni códigos. Bloquea al remitente y repórtalo. Si dice ser de una institución, contáctala por sus canales oficiales.",
  yellow:
    "Verifica antes de actuar: no hagas clic en enlaces ni des datos. Confirma por otro medio (llamando a la institución o a la persona por un número que ya conozcas).",
  green:
    "No se detectaron señales claras de estafa, pero ante cualquier duda no compartas datos ni códigos de verificación.",
};

// Traducción de las reglas detectadas
const RULE_LABELS: Record<string, string> = {
  shortened_links: "Enlaces acortados",
  urgent_language: "Lenguaje de urgencia",
  personal_info_request: "Pide datos personales o bancarios",
  scam_types_detected: "Tipo(s) de estafa detectado(s)",
  urls_found: "URLs encontradas",
  link_flags: "Señales en los enlaces",
  threat_language: "Amenazas o consecuencias",
  payment_request: "Solicitud de pago",
  secrecy_request: "Pide guardar secreto",
  remote_access_request: "Pide acceso remoto / instalar apps",
  verification_code_request: "Pide un código de verificación",
  unexpected_benefit: "Premio o beneficio inesperado",
  fine_or_debt_terms: "Multas o adeudos",
  bank_claim: "Aviso bancario",
  promotional_language: "Lenguaje promocional",
  phones_found: "Teléfonos en el mensaje",
  hosts_in_previous_reports: "Dominios vistos en otros reportes",
  phones_in_previous_reports: "Teléfonos vistos en otros reportes",
};

function formatRuleValue(val: unknown): string {
  if (val === true) return "Sí";

  if (Array.isArray(val)) {
    return val.join(", ");
  }

  if (val && typeof val === "object") {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join(" · ");
  }

  return String(val);
}

export default function ResultScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { result, fromHistory } = route.params;

  const risk = result.risk_level as RiskLevel;
  const config = RISK_CONFIG[risk];

  const date = new Date(result.created_at).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rules = result.detected_rules
    ? Object.entries(result.detected_rules)
    : [];

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Encabezado con color según riesgo */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: config.bg,
              paddingTop: 12 + insets.top,
            },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              ← {fromHistory ? "Historial" : "Volver"}
            </Text>
          </Pressable>

          <RiskBadge level={risk} large />

          <Text style={[styles.scoreText, { color: config.color }]}>
            Riesgo: {Math.round((result.risk_score ?? 0) * 100)}%
          </Text>

          <Text style={styles.dateText}>{date}</Text>
        </View>

        {/* ── Lo que se analizó ── */}
        {result.input_type === "image" && result.image_url ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>IMAGEN ANALIZADA</Text>

            <Image
              source={{ uri: `${API_BASE}${result.image_url}` }}
              style={styles.image}
              resizeMode="contain"
            />

            {result.ocr_extracted_text ? (
              <>
                <Text style={styles.sectionLabel}>TEXTO DETECTADO (OCR)</Text>

                <Text style={styles.sectionValueMultiline}>
                  {result.ocr_extracted_text}
                </Text>
              </>
            ) : null}
          </View>
        ) : result.input_text ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>MENSAJE ANALIZADO</Text>

            <Text style={styles.sectionValueMultiline}>
              {result.input_text}
            </Text>
          </View>
        ) : null}

        {/* ── Resultado ── */}
        <View style={styles.card}>
          <SectionRow
            label="Tipo de estafa"
            value={result.scam_type || "No identificado"}
          />

          <SectionRow
            label="Reportes similares"
            value={String(result.similar_reports_count)}
          />

          <SectionRow
            label="¿Es estafa?"
            value={result.is_scam ? "Sí" : "No"}
            valueColor={result.is_scam ? COLORS.red : COLORS.green}
          />

          <SectionRow
            label="Explicación"
            value={result.explanation || "Sin detalles"}
            multiline
          />
        </View>

        {/* ── Señales detectadas ── */}
        {rules.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>SEÑALES DETECTADAS</Text>

            {rules.map(([key, val]) => (
              <View key={key} style={styles.ruleRow}>
                <Text style={styles.ruleBullet}>•</Text>

                <Text style={styles.ruleText}>
                  <Text style={styles.ruleName}>
                    {RULE_LABELS[key] || key.replace(/_/g, " ")}
                  </Text>
                  {": "}
                  {formatRuleValue(val)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Recomendación ── */}
        <View
          style={[
            styles.recoBox,
            {
              borderLeftColor: config.color,
              backgroundColor: config.bg,
            },
          ]}
        >
          <Text style={styles.sectionLabel}>RECOMENDACIÓN</Text>

          <Text style={styles.recoText}>{RECOMMENDATIONS[risk]}</Text>
        </View>

        {/* ── Acciones ── */}
        <View style={styles.actions}>
          {fromHistory ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryButtonText}>
                ← Volver al historial
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Analyze")}
            >
              <Text style={styles.primaryButtonText}>
                🔍 Analizar otro mensaje
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionRow({
  label,
  value,
  valueColor,
  multiline = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>

      <Text
        style={[
          styles.sectionValue,
          valueColor && { color: valueColor },
          multiline && styles.sectionValueMultiline,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 32,
  },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
  },

  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },

  backText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  scoreText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },

  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: COLORS.bg,
  },

  section: {
    marginTop: 16,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.label,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  sectionValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },

  sectionValueMultiline: {
    fontWeight: "400",
    lineHeight: 22,
    fontSize: 14,
  },

  ruleRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  ruleBullet: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginRight: 6,
  },

  ruleText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },

  ruleName: {
    fontWeight: "700",
  },

  recoBox: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },

  recoText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  actions: {
    paddingHorizontal: 24,
    marginTop: 24,
  },

  primaryButton: {
    backgroundColor: COLORS.base,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
