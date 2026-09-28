import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { register, login } from "../services/api";
import { COLORS } from "../theme/colors";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const AGE_OPTIONS = ["18-30", "31-50", "51-65", "65+"];

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age_range, setAgeRange] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !full_name) {
      Alert.alert("Error", "Completa todos los campos obligatorios");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        full_name,
        phone: phone || undefined,
        age_range: age_range || undefined,
      });
      // Auto-login después del registro
      await login(email, password);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "No se pudo crear la cuenta";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate para proteger tus mensajes
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.label}>NOMBRE COMPLETO *</Text>
          <TextInput
            style={styles.input}
            value={full_name}
            onChangeText={setFullName}
            placeholder="Juan Pérez"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>EMAIL *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>CONTRASEÑA *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
          />

          <Text style={styles.label}>TELÉFONO (opcional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="5551234567"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>RANGO DE EDAD (opcional)</Text>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.chip, age_range === opt && styles.chipActive]}
                onPress={() => setAgeRange(opt)}
              >
                <Text
                  style={[
                    styles.chipText,
                    age_range === opt && styles.chipTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.mainButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 40 },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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

  form: { paddingHorizontal: 24, paddingTop: 24 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.label,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.base,
    borderColor: COLORS.base,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  chipTextActive: { color: COLORS.white },

  mainButton: {
    backgroundColor: COLORS.base,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  mainButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
