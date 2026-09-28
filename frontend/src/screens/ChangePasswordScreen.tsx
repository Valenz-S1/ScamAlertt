import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { changePassword } from "../services/api";
import { COLORS } from "../theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PasswordInput from "../components/PasswordInput";

type Props = NativeStackScreenProps<any, any>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!current || !newPass || !confirm) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }
    if (newPass.length < 8) {
      Alert.alert(
        "Error",
        "La nueva contraseña debe tener al menos 8 caracteres",
      );
      return;
    }
    if (newPass !== confirm) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, newPass);
      Alert.alert("Éxito", "Contraseña actualizada correctamente");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo cambiar la contraseña",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Encabezado */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>← Volver</Text>
            </Pressable>
            <Text style={styles.title}>Cambiar contraseña</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>CONTRASEÑA ACTUAL</Text>
            <PasswordInput
              value={current}
              onChangeText={setCurrent}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>NUEVA CONTRASEÑA</Text>
            <PasswordInput
              value={newPass}
              onChangeText={setNewPass}
              placeholderTextColor={COLORS.textMuted}
              error={
                newPass.length > 0 && newPass.length < 8
                  ? "Mínimo 8 caracteres"
                  : null
              }
            />

            <Text style={styles.label}>CONFIRMAR NUEVA CONTRASEÑA</Text>
            <PasswordInput
              value={confirm}
              onChangeText={setConfirm}
              placeholderTextColor={COLORS.textMuted}
              error={
                confirm && confirm !== newPass
                  ? "Las contraseñas no coinciden"
                  : null
              }
            />

            <Pressable
              style={[styles.mainButton, loading && styles.buttonDisabled]}
              onPress={handleChange}
              disabled={loading}
            >
              <Text style={styles.mainButtonText}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

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
