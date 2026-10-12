import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";

const COLORS = {
  bg: "#F2F4F7",
  card: "#FFFFFF",
  text: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  accent: "#51A2E2",
  accentSoft: "#EAF4FC",
  red: "#EF4444",
  redBg: "#FCEAE8",
  yellow: "#F59E0B",
  yellowBg: "#FEF8E4",
  green: "#22C55E",
  greenBg: "#E9FBF1",
  white: "#FFFFFF",
};

interface ComoFuncionaModalProps {
  visible: boolean;
  onClose: () => void;
  /** Opcional: se llama cuando el usuario toca "Comenzar" en el último paso */
  onStart?: () => void;
}

const STEPS = [
  {
    icon: "📋",
    title: "1. Copia el mensaje",
    description:
      "En WhatsApp, SMS o correo: mantén presionado el mensaje sospechoso y toca \"Copiar\".",
    hint: "💡 También puedes tomar una captura de pantalla y subirla a la app.",
  },
  {
    icon: "📥",
    title: "2. Pégalo en ScamAlert",
    description:
      "En el inicio toca \"Analizar mensaje\", pega el texto en el cuadro y presiona \"Analizar ahora\".",
    hint: "💡 Si tienes una captura, usa la opción \"Subir captura de pantalla\".",
  },
  {
    icon: "⚡",
    title: "3. Espera unos segundos",
    description:
      "ScamAlert revisa las palabras, los enlaces y compara el mensaje con reportes de otros usuarios.",
    hint: "💡 No necesitas saber de tecnología: la app hace el trabajo por ti.",
  },
  {
    icon: "🚦",
    title: "4. Interpreta el semáforo",
    description:
      "El resultado aparece con un color para que sepas qué hacer sin ser experto.",
    hint: "",
  },
];

const LIGHTS = [
  {
    color: COLORS.green,
    bg: COLORS.greenBg,
    label: "VERDE · Sin señales de estafa",
    desc: "Puedes estar tranquilo. Aun así, ante la duda, no compartas datos ni códigos.",
  },
  {
    color: COLORS.yellow,
    bg: COLORS.yellowBg,
    label: "AMARILLO · Sospechoso",
    desc: "Verifica antes de actuar: llama a la empresa o persona por un número que ya conozcas.",
  },
  {
    color: COLORS.red,
    bg: COLORS.redBg,
    label: "ROJO · Posible estafa",
    desc: "No respondas, no abras enlaces y no compartas datos, contraseñas ni códigos.",
  },
];

const DEMO_MESSAGE =
  "\"Su paquete está retenido. Realice el pago de $2.99 para completar la entrega: bit.ly/paq-99\"";

export default function ComoFuncionaModal({
  visible,
  onClose,
  onStart,
}: ComoFuncionaModalProps) {
  const [step, setStep] = useState(0);
  const [showDemoResult, setShowDemoResult] = useState(false);

  // Siempre abrir en el primer paso
  useEffect(() => {
    if (visible) {
      setStep(0);
      setShowDemoResult(false);
    }
  }, [visible]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Encabezado */}
          <Text style={styles.title}>¿Cómo funciona ScamAlert?</Text>
          <Text style={styles.subtitle}>Aprende lo básico en 1 minuto</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Indicador de pasos */}
            <View style={styles.dotsRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === step && styles.dotActive]}
                />
              ))}
            </View>

            {/* Paso actual */}
            <View style={styles.stepCard}>
              <View style={styles.stepIconBox}>
                <Text style={styles.stepIcon}>{current.icon}</Text>
              </View>
              <Text style={styles.stepTitle}>{current.title}</Text>
              <Text style={styles.stepDescription}>
                {current.description}
              </Text>
              {current.hint ? (
                <Text style={styles.stepHint}>{current.hint}</Text>
              ) : null}
            </View>

            {/* Semáforo (solo en el último paso) */}
            {isLast && (
              <>
                {LIGHTS.map((l) => (
                  <View
                    key={l.label}
                    style={[styles.lightRow, { backgroundColor: l.bg }]}
                  >
                    <View
                      style={[styles.lightDot, { backgroundColor: l.color }]}
                    />
                    <View style={styles.lightTextBox}>
                      <Text style={[styles.lightLabel, { color: l.color }]}>
                        {l.label}
                      </Text>
                      <Text style={styles.lightDesc}>{l.desc}</Text>
                    </View>
                  </View>
                ))}

                {/* Ejemplo interactivo */}
                <View style={styles.demoBox}>
                  <Text style={styles.demoLabel}>
                    PRUÉBALO CON UN EJEMPLO
                  </Text>
                  <View style={styles.demoMessage}>
                    <Text style={styles.demoText}>{DEMO_MESSAGE}</Text>
                  </View>

                  {!showDemoResult ? (
                    <Pressable
                      style={styles.demoButton}
                      onPress={() => setShowDemoResult(true)}
                    >
                      <Text style={styles.demoButtonText}>
                        🔍 Ver resultado del análisis
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.demoResult}>
                      <Text style={styles.demoResultIcon}>🔴</Text>
                      <Text style={styles.demoResultTitle}>
                        ROJO · Posible estafa
                      </Text>
                      <Text style={styles.demoResultType}>
                        Tipo: Paquetería falsa
                      </Text>
                      <Text style={styles.demoResultDesc}>
                        Pide un pago para \"liberar\" un paquete y usa un
                        enlace acortado que oculta el destino real. No abras
                        el enlace ni realices el pago.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* Botones de navegación */}
          <View style={styles.buttonsRow}>
            {!isLast ? (
              <>
                {step > 0 ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setStep(step - 1)}
                  >
                    <Text style={styles.secondaryText}>← Anterior</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={onClose}
                  >
                    <Text style={styles.secondaryText}>Cerrar</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setStep(step + 1)}
                >
                  <Text style={styles.primaryText}>Siguiente →</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryText}>Cerrar</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => (onStart ? onStart() : onClose())}
                >
                  <Text style={styles.primaryText}>Comenzar</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(30,41,59,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 24,
    shadowColor: "#1E293B",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: COLORS.accent, width: 20 },
  stepCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepIcon: { fontSize: 24 },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
  stepHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  lightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  lightDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
    marginRight: 10,
  },
  lightTextBox: { flex: 1 },
  lightLabel: { fontSize: 13, fontWeight: "700" },
  lightDesc: { fontSize: 12, color: COLORS.text, lineHeight: 17, marginTop: 2 },
  demoBox: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 14,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  demoMessage: { backgroundColor: COLORS.bg, borderRadius: 14, padding: 12 },
  demoText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  demoButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 12,
  },
  demoButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
  demoResult: {
    backgroundColor: COLORS.redBg,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  demoResultIcon: { fontSize: 22 },
  demoResultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.red,
    marginTop: 4,
  },
  demoResultType: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 4,
  },
  demoResultDesc: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 6,
  },
  buttonsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  secondaryText: { color: COLORS.accent, fontWeight: "700", fontSize: 14 },
});