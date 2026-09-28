import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RiskBadge from "../components/RiskBadge";
import { COLORS, RISK_CONFIG, RiskLevel } from "../theme/colors";
import type { Analysis } from "../types";

type MainStackParamList = {
  Analyze: undefined;
  Result: { result: Analysis };
  History: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Result">;

export default function ResultScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { result } = route.params;
  const risk = result.risk_level as RiskLevel;
  const config = RISK_CONFIG[risk];

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
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>

          <RiskBadge level={risk} large />

          <Text style={[styles.scoreText, { color: config.color }]}>
            Riesgo: {Math.round((result.risk_score ?? 0) * 100)}%
          </Text>
        </View>

        {/* Detalles del resultado */}
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

          {/* Reglas detectadas */}
          {result.detected_rules &&
            Object.keys(result.detected_rules).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>REGLAS DETECTADAS</Text>
                {Object.entries(result.detected_rules).map(([key, val]) => (
                  <View key={key} style={styles.ruleRow}>
                    <Text style={styles.ruleBullet}>•</Text>
                    <Text style={styles.ruleText}>
                      {key.replace(/_/g, " ")}:{" "}
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
        </View>

        {/* Botones de acción */}
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Analyze")}
          >
            <Text style={styles.primaryButtonText}>
              🔍 Analizar otro mensaje
            </Text>
          </Pressable>
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
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
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
  backText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  section: { marginTop: 16 },
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
  sectionValueMultiline: { fontWeight: "400", lineHeight: 22 },

  ruleRow: { flexDirection: "row", marginTop: 4 },
  ruleBullet: { fontSize: 13, color: COLORS.textMuted, marginRight: 6 },
  ruleText: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 18 },

  actions: { paddingHorizontal: 24, marginTop: 24 },
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
