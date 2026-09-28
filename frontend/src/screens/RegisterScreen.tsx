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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { register, login } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import AgeSlider from "../components/AgeSlider";
import { COLORS } from "../theme/colors";
import {
  validateName,
  validateEmail,
  validatePhone,
} from "../utils/validation";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

// ── Validaciones ──
type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
};

function validatePassword(v: string): string | undefined {
  if (!v) return "La contraseña es obligatoria";
  if (v.length < 8) return "Mínimo 8 caracteres";
  return undefined;
}

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  // ── Cambios con validación en vivo ──
  const onNameChange = (t: string) => {
    const clean = t.replace(/[0-9]/g, ""); // los números ni se escriben
    setFullName(clean);
    setErrors((p) => ({ ...p, name: validateName(clean) }));
  };

  const onEmailChange = (t: string) => {
    setEmail(t);
    setErrors((p) => ({ ...p, email: validateEmail(t) }));
  };

  const onPhoneChange = (t: string) => {
    const clean = t.replace(/\D/g, "").slice(0, 10); // solo dígitos, máx 10
    setPhone(clean);
    setErrors((p) => ({ ...p, phone: validatePhone(clean) }));
  };

  const onPasswordChange = (t: string) => {
    setPassword(t);
    setErrors((p) => ({
      ...p,
      password: validatePassword(t),
      confirm: confirm
        ? confirm === t
          ? undefined
          : "Las contraseñas no coinciden"
        : undefined,
    }));
  };

  const onConfirmChange = (t: string) => {
    setConfirm(t);
    setErrors((p) => ({
      ...p,
      confirm: t === password ? undefined : "Las contraseñas no coinciden",
    }));
  };

  const handleRegister = async () => {
    // Validar TODO al enviar (por si algo se escapó)
    const next: FieldErrors = {
      name: validateName(full_name),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
    };
    if (!confirm) next.confirm = "Confirma tu contraseña";
    else if (confirm !== password)
      next.confirm = "Las contraseñas no coinciden";

    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      Alert.alert("Error", "Revisa los campos marcados en rojo");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        full_name: full_name.trim(),
        phone: phone || undefined,
        age_range: age !== null ? String(age) : undefined,
      });
      // Auto-login después del registro
      await login(email.trim(), password);
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
            style={[styles.input, errors.name && styles.inputError]}
            value={full_name}
            onChangeText={onNameChange}
            placeholder="Juan Pérez"
            placeholderTextColor={COLORS.textMuted}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>CORREO ELECTRÓNICO *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={onEmailChange}
            placeholder="tucorreo@gmail.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>TELÉFONO (opcional)</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={onPhoneChange}
            placeholder="5512345678"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Text style={styles.label}>EDAD (opcional)</Text>
          <AgeSlider value={age} onChange={setAge} />
          <Text style={styles.ageHint}>
            {age !== null
              ? `Edad seleccionada: ${age} años`
              : "Desliza para seleccionar tu edad"}
          </Text>

          <Text style={styles.label}>CONTRASEÑA *</Text>
          <PasswordInput
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={COLORS.textMuted}
            error={errors.password}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <Text style={styles.label}>CONFIRMAR CONTRASEÑA *</Text>
          <PasswordInput
            value={confirm}
            onChangeText={onConfirmChange}
            placeholder="Repite tu contraseña"
            placeholderTextColor={COLORS.textMuted}
            error={errors.confirm}
          />
          {errors.confirm && (
            <Text style={styles.errorText}>{errors.confirm}</Text>
          )}

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
  inputError: { borderColor: COLORS.red },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  ageHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },

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
