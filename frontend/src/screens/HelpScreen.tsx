import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";

type Props = NativeStackScreenProps<any, any>;

const TIPS = [
  {
    icon: "🔗",
    title: "Enlaces sospechosos",
    description:
      "No hagas clic en enlaces acortados (bit.ly, tinyurl) o URLs que empiezan diferente al sitio oficial.",
  },
  {
    icon: "⏰",
    title: "Urgencia falsa",
    description:
      "Las estafas presionan para que actúes rápido. Si el mensaje dice 'urgente', 'ahora mismo' o 'expira hoy', desconfía.",
  },
  {
    icon: "💰",
    title: "Piden dinero o datos",
    description:
      "Ningún banco te pedirá tu contraseña o PIN por mensaje. Si piden datos personales, es probable estafa.",
  },
  {
    icon: "📦",
    title: "Paquetes falsos",
    description:
      "Si no esperas un paquete y te piden pagar un 'cargo de aduana' o 'liberación', es estafa.",
  },
  {
    icon: "🎁",
    title: "Premios y loterías",
    description:
      "Si ganaste un premio que no recuerdas haber participado, especialmente si te piden datos, es estafa.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Falsos familiares",
    description:
      "Mensajes de 'hijos' o 'familiares' que piden dinero urgente desde números desconocidos. Verifica siempre.",
  },
  {
    icon: "🏦",
    title: "Bancos falsos",
    description:
      "Los bancos nunca te piden datos por WhatsApp o SMS. Llama al número oficial de tu banco para verificar.",
  },
  {
    icon: "📱",
    title: "Número desconocido",
    description:
      "Si recibes un mensaje de un número que no conoces, especialmente con enlaces o pidiendo algo, ten cuidado.",
  },
];

export default function HelpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Encabezado morado */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>
          <Text style={styles.title}>Ayuda</Text>
          <Text style={styles.subtitle}>
            Señales para detectar una estafa digital
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.list}>
          {TIPS.map((tip, i) => (
            <View key={i} style={styles.tipCard}>
              <View style={styles.tipIconBox}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Nota final */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            🛡️ Si tienes dudas, usa ScamAlert para analizar el mensaje antes de
            actuar. Es mejor prevenir que curar.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 32 },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  backText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  title: { color: COLORS.white, fontSize: 24, fontWeight: "700" },
  subtitle: { color: COLORS.headerTint, fontSize: 14, marginTop: 6 },

  list: { paddingHorizontal: 20, paddingTop: 16 },
  tipCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  tipIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.baseBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipIcon: { fontSize: 20 },
  tipContent: { flex: 1 },
  tipTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },

  noteBox: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.greenBg,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
});
