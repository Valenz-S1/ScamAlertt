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
  Image,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { login } from "../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PasswordInput from "../components/PasswordInput";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const COLORS = {
  bg: "#F2F4F7",
  card: "#FFFFFF",
  text: "#1E293B",
  textMuted: "#64748B",
  label: "#64748B",
  border: "#E2E8F0",
  accent: "#51A2E2",
  white: "#FFFFFF",
};

const softShadow = {
  shadowColor: "#1E293B",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

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
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo iniciar sesión",
      );

      // Credenciales incorrectas: vaciar ambos campos
      setEmail("");
      setPassword("");
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tarjeta superior: logo y nombre de la app */}
        <View style={styles.headerCard}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logoImage}
          />

          <Text style={styles.brandName}>ScamAlert</Text>

          <Text style={styles.tagline}>
            Detecta estafas digitales antes de que sea tarde
          </Text>
        </View>

        {/* Tarjeta del formulario */}
        <View style={styles.formCard}>
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
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 20,
    marginHorizontal: 20,
    ...softShadow,
  },

  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 16,
  },

  brandName: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "700",
  },

  tagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 24,
    ...softShadow,
  },

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },

  mainButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 28,
    ...softShadow,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

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

  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  footerLink: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});