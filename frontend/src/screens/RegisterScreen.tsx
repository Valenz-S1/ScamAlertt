import React, { useRef, useState } from "react";
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
  PanResponder,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { register, login } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import { COLORS } from "../theme/colors";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

// ── Validaciones ──
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Dominios de correo aceptados — agrega más aquí si lo necesitan
const EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.com.mx",
  "hotmail.com",
  "hotmail.com.mx",
  "hotmail.es",
  "live.com",
  "live.com.mx",
  "yahoo.com",
  "yahoo.com.mx",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "terra.com.mx",
  "prodigy.net.mx",
];

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
};

function validateName(v: string): string | undefined {
  if (!v.trim()) return "El nombre es obligatorio";
  if (/\d/.test(v)) return "El nombre no puede contener números";
  if (!NAME_RE.test(v.trim())) return "El nombre solo puede contener letras";
  return undefined;
}

function validateEmail(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "El correo es obligatorio";
  if (!EMAIL_RE.test(t)) return "Formato inválido. Ejemplo: nombre@gmail.com";
  const domain = t.split("@")[1]?.toLowerCase() ?? "";
  if (!EMAIL_DOMAINS.includes(domain)) {
    return "Dominio no permitido. Usa gmail, outlook, hotmail, yahoo, icloud...";
  }
  return undefined;
}

function validatePhone(v: string): string | undefined {
  if (!v) return undefined; // es opcional
  if (v.length !== 10) return "El teléfono debe tener 10 dígitos";
  return undefined;
}

function validatePassword(v: string): string | undefined {
  if (!v) return "La contraseña es obligatoria";
  if (v.length < 8) return "Mínimo 8 caracteres";
  return undefined;
}

// ══════════════════════════════════════════════════════════════
//  Selector de edad — slider horizontal 0-100
// ══════════════════════════════════════════════════════════════

function AgeSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (age: number) => void;
}) {
  const trackRef = useRef<View | null>(null);
  const trackInfo = useRef({ x: 0, width: 0 });
  const [dragging, setDragging] = useState(false);

  const shownValue = value ?? 0;
  const ratio = shownValue / 100;

  const applyValue = (pageX: number) => {
    const { x, width } = trackInfo.current;
    if (width <= 0) return;
    const r = Math.max(0, Math.min(1, (pageX - x) / width));
    onChange(Math.round(r * 100));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        // Medir al tocar (soporta taps que "saltan" a una posición)
        trackRef.current?.measureInWindow((x, _y, width) => {
          trackInfo.current = { x, width };
          applyValue(evt.nativeEvent.pageX);
        });
      },
      onPanResponderMove: (_evt, gesture) => applyValue(gesture.moveX),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  return (
    <View style={sliderStyles.card}>
      {/* Indicador dinámico — número exacto conforme desliza */}
      <View style={sliderStyles.indicatorBox}>
        <Text
          style={[
            sliderStyles.valueText,
            dragging && sliderStyles.valueTextActive,
          ]}
        >
          {value !== null ? value : "—"}
        </Text>
      </View>

      {/* Barra deslizante */}
      <View style={sliderStyles.trackWrap} {...panResponder.panHandlers}>
        <View ref={trackRef} style={sliderStyles.track}>
          {/* Sección activa (más oscura) */}
          <View
            style={[sliderStyles.trackFill, { width: `${ratio * 100}%` }]}
          />
          {/* Punto central deslizable */}
          <View style={[sliderStyles.thumbBox, { left: `${ratio * 100}%` }]}>
            <View
              style={[sliderStyles.thumb, dragging && sliderStyles.thumbActive]}
            />
          </View>
        </View>
      </View>

      {/* Etiquetas de extremos */}
      <View style={sliderStyles.labelsRow}>
        <Text style={sliderStyles.labelText}>0</Text>
        <Text style={sliderStyles.labelText}>100</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  indicatorBox: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.base,
    fontVariant: ["tabular-nums"],
  },
  valueTextActive: { fontSize: 34 },
  trackWrap: { paddingVertical: 16 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2DDF6",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: COLORS.baseLight,
  },
  thumbBox: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    marginLeft: -13,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.base,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  thumbActive: { transform: [{ scale: 1.15 }] },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
});

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
