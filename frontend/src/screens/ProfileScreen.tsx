import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
  Image,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  API_BASE,
} from "../services/api";
import AgeSlider from "../components/AgeSlider";
import {
  validateName,
  validateEmail,
  validatePhone,
} from "../utils/validation";
import { COLORS } from "../theme/colors";

type Props = NativeStackScreenProps<any, any>;

// Traduce errores de FastAPI (incluye 422 que manda un array, no un string)
function getErrMsg(err: any): string {
  const d = err?.response?.data?.detail;

  if (typeof d === "string") return d;

  if (Array.isArray(d)) {
    return d
      .map(
        (e: any) =>
          (e.msg || "").replace("Value error, ", "") || JSON.stringify(e),
      )
      .join("\n");
  }

  return "No se pudo guardar. Verifica tu conexión.";
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [avatarRemote, setAvatarRemote] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    getProfile()
      .then((u) => {
        setEmail(u.email);
        setFullName(u.full_name);
        setPhone(u.phone || "");
        setAge(
          u.age_range && /^\d+$/.test(u.age_range)
            ? parseInt(u.age_range, 10)
            : null,
        );
        setAvatarRemote(u.avatar_url);
      })
      .catch(() => Alert.alert("Error", "No se pudo cargar el perfil"))
      .finally(() => setLoading(false));
  }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Se necesita acceso a tus imágenes");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!picked.canceled) {
      setAvatarLocal(picked.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const next: typeof errors = {
      name: validateName(fullName),
      email: validateEmail(email),
      phone: validatePhone(phone),
    };

    setErrors(next);

    if (Object.values(next).some(Boolean)) {
      Alert.alert("Error", "Revisa los campos marcados en rojo");
      return;
    }

    setSaving(true);

    try {
      // 1º los datos (lo esencial — nunca lo bloquea la foto)
      await updateProfile({
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone || undefined,
        age_range: age !== null ? String(age) : undefined,
      });

      // 2º la foto, por separado: si falla, avisa pero NO deshace los datos
      if (avatarLocal) {
        try {
          await uploadAvatar(avatarLocal);
        } catch {
          Alert.alert(
            "Aviso",
            "Los datos se guardaron, pero la foto no pudo actualizarse.",
          );
        }
      }

      Alert.alert("Éxito", "Perfil actualizado");
      navigation.goBack(); // Settings y Home refrescan solos (listener de focus)
    } catch (err: any) {
      Alert.alert("Error", getErrMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.base} />
      </View>
    );
  }

  const shownAvatar =
    avatarLocal ?? (avatarRemote ? `${API_BASE}${avatarRemote}` : null);

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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>

          <Text style={styles.title}>Mi perfil</Text>
        </View>

        <View style={styles.form}>
          {/* Foto tocable */}
          <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
            {shownAvatar ? (
              <Image source={{ uri: shownAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {fullName.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}

            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </Pressable>

          <Text style={styles.avatarHint}>Toca la foto para cambiarla</Text>

          <Text style={styles.label}>NOMBRE COMPLETO</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setErrors((p) => ({
                ...p,
                name: validateName(t),
              }));
            }}
            placeholderTextColor={COLORS.textMuted}
          />

          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((p) => ({
                ...p,
                email: validateEmail(t),
              }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={COLORS.textMuted}
          />

          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>TELÉFONO</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={(t) => {
              const clean = t.replace(/\D/g, "").slice(0, 10);

              setPhone(clean);

              setErrors((p) => ({
                ...p,
                phone: validatePhone(clean),
              }));
            }}
            keyboardType="phone-pad"
            placeholder="5512345678"
            placeholderTextColor={COLORS.textMuted}
          />

          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Text style={styles.label}>EDAD</Text>
          <AgeSlider value={age} onChange={setAge} />

          <Pressable
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Text>
          </Pressable>
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
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
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

  backText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },

  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "700",
  },

  form: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  avatarWrap: {
    alignSelf: "center",
    marginTop: -44,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.white,
  },

  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.baseBg,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.base,
  },

  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: COLORS.base,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  cameraIcon: {
    fontSize: 13,
  },

  avatarHint: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
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

  inputError: {
    borderColor: COLORS.red,
  },

  errorText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: COLORS.base,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 28,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
