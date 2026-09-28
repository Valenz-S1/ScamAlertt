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
import { login } from "../services/api";
import { COLORS } from "../theme/colors";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Ingresa email y contraseña");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "No se pudo iniciar sesión";
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
        {/* Encabezado morado */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.brandName}>ScamAlert</Text>
          <Text style={styles.tagline}>
            Detecta estafas digitales antes de que sea tarde
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Iniciar sesión</Text>

          <Text style={styles.label}>EMAIL</Text>
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

          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
          />

          <Pressable
            style={[styles.mainButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿No tienes cuenta?</Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={styles.footerLink}> Regístrate</Text>
            </Pressable>
          </View>
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
    paddingTop: 48,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FF6B4A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: { fontSize: 28 },
  brandName: { color: COLORS.white, fontSize: 28, fontWeight: "700" },
  tagline: {
    color: COLORS.headerTint,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },

  form: { paddingHorizontal: 24, paddingTop: 32 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
  },
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

  mainButton: {
    backgroundColor: COLORS.base,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  mainButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { fontSize: 14, color: COLORS.textMuted },
  footerLink: { fontSize: 14, color: COLORS.base, fontWeight: "700" },
});
