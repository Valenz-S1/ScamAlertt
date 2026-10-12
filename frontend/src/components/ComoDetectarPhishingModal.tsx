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

interface ComoDetectarPhishingModalProps {
  visible: boolean;
  onClose: () => void;
}

// Señales de alerta (tocables para ver un ejemplo real)
const SIGNALS = [
  {
    icon: "🔗",
    title: "Enlaces raros o acortados",
    example:
      "\"bit.ly/paq-99\" o \"banco-seguro.xyz\" ocultan el destino real. Desconfía si el enlace no es el sitio oficial que conoces.",
  },
  {
    icon: "⏰",
    title: "Urgencia y amenazas",
    example:
      "\"Su cuenta será bloqueada en 24 horas\". Que te presionen a actuar rápido es su técnica favorita.",
  },
  {
    icon: "💳",
    title: "Pide datos o contraseñas",
    example:
      "Ningún banco te pedirá tu PIN, tu contraseña o un código de verificación por mensaje. Nunca.",
  },
  {
    icon: "🎁",
    title: "Premios que no esperabas",
    example:
      "\"¡Ganaste un iPhone!\" Si no participaste en ningún sorteo, es estafa. No abras el enlace.",
  },
  {
    icon: "👤",
    title: "Remitente desconocido",
    example:
      "Un \"familiar\" que escribe desde un número nuevo pidiendo dinero. Llama al número de siempre para verificar.",
  },
  {
    icon: "💰",
    title: "Pagos por adelantado",
    example:
      "\"Paga $2.99 para liberar tu paquete\". Las empresas legítimas no te cobran así por sorpresa.",
  },
];

// Quiz interactivo: el usuario decide si es estafa o seguro
const QUIZ = [
  {
    message:
      "Su paquete está retenido en aduana. Realice el pago de $2.99 hoy mismo para liberarlo: bit.ly/paq-2024",
    answer: "scam",
    explanation:
      "Pide un pago inesperado, presiona con urgencia (\"hoy mismo\") y usa un enlace acortado que oculta el destino real.",
  },
  {
    message:
      "Tu pedido #48291 fue entregado el día de hoy. ¡Gracias por tu compra!",
    answer: "safe",
    explanation:
      "Es un mensaje informativo: no pide datos, no trae enlaces y no te presiona a hacer nada.",
  },
  {
    message:
      "¡FELICIDADES! Ganaste un iPhone 15. Reclama tu premio AHORA antes de que expire: premio-ganador.top",
    answer: "scam",
    explanation:
      "Premio que no esperabas, urgencia exagerada y un dominio extraño (.top) que no pertenece a ninguna tienda conocida.",
  },
] as const;

type QuizAnswer = "scam" | "safe" | null;

export default function ComoDetectarPhishingModal({
  visible,
  onClose,
}: ComoDetectarPhishingModalProps) {
  const [openSignal, setOpenSignal] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState<QuizAnswer>(null);

  // Reiniciar todo cada vez que se abre
  useEffect(() => {
    if (visible) {
      setOpenSignal(null);
      setQuizIndex(0);
      setAnswer(null);
    }
  }, [visible]);

  const quizDone = quizIndex >= QUIZ.length;
  const current = QUIZ[Math.min(quizIndex, QUIZ.length - 1)];
  const isCorrect = answer !== null && answer === current.answer;

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
          <Text style={styles.title}>
            Cómo detectar un mensaje de phishing en segundos
          </Text>
          <Text style={styles.subtitle}>
            Señales de alerta y práctica interactiva
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* ── Señales de alerta ── */}
            <Text style={styles.sectionLabel}>SEÑALES DE ALERTA</Text>
            <Text style={styles.sectionHint}>
              Toca cada señal para ver un ejemplo
            </Text>

            {SIGNALS.map((s, i) => (
              <Pressable
                key={i}
                style={styles.signalCard}
                onPress={() => setOpenSignal(openSignal === i ? null : i)}
              >
                <View style={styles.signalIconBox}>
                  <Text style={styles.signalIcon}>{s.icon}</Text>
                </View>
                <View style={styles.signalTextBox}>
                  <Text style={styles.signalTitle}>{s.title}</Text>
                  {openSignal === i ? (
                    <Text style={styles.signalExample}>{s.example}</Text>
                  ) : null}
                </View>
                <Text style={styles.signalChevron}>
                  {openSignal === i ? "▲" : "▼"}
                </Text>
              </Pressable>
            ))}

            {/* ── Quiz interactivo ── */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              PONLO A PRUEBA
            </Text>

            {!quizDone ? (
              <View style={styles.quizBox}>
                <Text style={styles.quizProgress}>
                  Ejemplo {quizIndex + 1} de {QUIZ.length}
                </Text>

                <View style={styles.quizMessage}>
                  <Text style={styles.quizText}>{current.message}</Text>
                </View>

                {!answer ? (
                  <View style={styles.quizButtons}>
                    <Pressable
                      style={[styles.quizButton, styles.quizButtonDanger]}
                      onPress={() => setAnswer("scam")}
                    >
                      <Text style={styles.quizButtonText}>🚨 Es estafa</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.quizButton, styles.quizButtonSafe]}
                      onPress={() => setAnswer("safe")}
                    >
                      <Text style={styles.quizButtonText}>✅ Es seguro</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.quizFeedback,
                      {
                        backgroundColor: isCorrect
                          ? COLORS.greenBg
                          : COLORS.yellowBg,
                        borderLeftColor: isCorrect
                          ? COLORS.green
                          : COLORS.yellow,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quizFeedbackTitle,
                        { color: isCorrect ? COLORS.green : COLORS.yellow },
                      ]}
                    >
                      {isCorrect ? "¡Correcto! 🎉" : "Casi... 👀"}
                    </Text>
                    <Text style={styles.quizFeedbackText}>
                      {current.explanation}
                    </Text>
                    <Pressable
                      style={styles.quizNextButton}
                      onPress={() => {
                        setAnswer(null);
                        setQuizIndex(quizIndex + 1);
                      }}
                    >
                      <Text style={styles.quizNextText}>
                        Siguiente ejemplo →
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.quizDoneBox}>
                <Text style={styles.quizDoneIcon}>🎉</Text>
                <Text style={styles.quizDoneTitle}>
                  ¡Completaste la práctica!
                </Text>
                <Text style={styles.quizDoneDesc}>
                  Ya reconoces las señales principales. Ante la duda, analiza
                  el mensaje con ScamAlert antes de actuar.
                </Text>
                <Pressable
                  style={styles.quizRetryButton}
                  onPress={() => {
                    setQuizIndex(0);
                    setAnswer(null);
                  }}
                >
                  <Text style={styles.quizRetryText}>🔄 Practicar de nuevo</Text>
                </Pressable>
              </View>
            )}

            {/* ── Consejos rápidos ── */}
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>CONSEJOS RÁPIDOS</Text>
              <Text style={styles.noteText}>
                • Nunca compartas códigos de verificación: con ellos roban tus
                cuentas.
              </Text>
              <Text style={styles.noteText}>
                • Verifica por otro medio: llama a la empresa por su número
                oficial, no al que llega en el mensaje.
              </Text>
              <Text style={styles.noteText}>
                • Si el mensaje te preocupa, analízalo con ScamAlert antes de
                responder.
              </Text>
            </View>
          </ScrollView>

          {/* Botón cerrar */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </Pressable>
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
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
  },

  // Señales
  signalCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  signalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  signalIcon: { fontSize: 16 },
  signalTextBox: { flex: 1 },
  signalTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  signalExample: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  signalChevron: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 8,
    marginTop: 4,
  },

  // Quiz
  quizBox: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 14,
    marginTop: 6,
  },
  quizProgress: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accent,
    textAlign: "center",
    marginBottom: 8,
  },
  quizMessage: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 12,
  },
  quizText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  quizButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
  quizButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  quizButtonDanger: { backgroundColor: COLORS.redBg },
  quizButtonSafe: { backgroundColor: COLORS.greenBg },
  quizButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  quizFeedback: {
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 4,
  },
  quizFeedbackTitle: { fontSize: 15, fontWeight: "700" },
  quizFeedbackText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 4,
  },
  quizNextButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  quizNextText: { fontSize: 13, fontWeight: "700", color: COLORS.accent },
  quizDoneBox: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
    alignItems: "center",
  },
  quizDoneIcon: { fontSize: 28 },
  quizDoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 6,
  },
  quizDoneDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  quizRetryButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginTop: 12,
  },
  quizRetryText: { fontSize: 13, fontWeight: "700", color: COLORS.accent },

  // Consejos rápidos
  noteBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 2,
  },

  closeButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
});