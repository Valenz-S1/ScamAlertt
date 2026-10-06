import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { analyzeText, analyzeImage } from "../services/api";
import type { Analysis } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  Result: { result: Analysis };
  History: undefined;
  Settings: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Analyze">;

const COLORS = {
  bg: "#F2F4F7",
  card: "#FFFFFF",
  text: "#1E293B",
  textMuted: "#64748B",
  label: "#64748B",
  border: "#E2E8F0",
  accent: "#51A2E2",
  accentSoft: "#EAF4FC",
  white: "#FFFFFF",
};

const softShadow = {
  shadowColor: "#1E293B",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

export default function AnalyzeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyzeText = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Escribe o pega un mensaje primero");
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeText(text);
      setText("");
      navigation.navigate("Result", { result });
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo analizar el mensaje",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Se necesita acceso a tus imágenes");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (picked.canceled) return;

    setLoading(true);
    try {
      const result = await analyzeImage(picked.assets[0].uri);
      navigation.navigate("Result", { result });
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo analizar la imagen",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Analizando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>
          <Text style={styles.title}>Analizar mensaje</Text>
          <Text style={styles.subtitle}>
            Pega el texto o sube una captura de pantalla
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>PEGA EL MENSAJE AQUÍ</Text>

          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder={
              "Ejemplo: Su paquete está retenido.\nPague $2.99 para liberarlo..."
            }
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Separador */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O también</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.uploadBox} onPress={handlePickImage}>
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadText}>Subir captura de pantalla</Text>
          </Pressable>

          {/* Botón de analizar */}
          <Pressable style={styles.analyzeButton} onPress={handleAnalyzeText}>
            <Text style={styles.analyzeIcon}>🔍</Text>
            <Text style={styles.analyzeText}>Analizar ahora</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          Tu mensaje no se guarda ni se comparte con terceros
        </Text>
      </ScrollView>

      {/* Barra inferior */}
      <View style={[styles.tabBar, { paddingBottom: 16 + insets.bottom }]}>
        <TabItem
          icon="🏠"
          label="Inicio"
          onPress={() => navigation.navigate("Home")}
        />
        <TabItem icon="🔍" label="Analizar" active />
        <TabItem
          icon="🗂️"
          label="Historial"
          onPress={() => navigation.navigate("History")}
        />
        <TabItem
          icon="⚙️"
          label="Ajustes"
          onPress={() => navigation.navigate("Settings")}
        />
      </View>
    </View>
  );
}

function TabItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const color = active ? COLORS.accent : COLORS.textMuted;
  return (
    <Pressable style={tabStyles.tabItem} onPress={onPress}>
      <Text style={[tabStyles.tabIcon, { opacity: active ? 1 : 0.6 }]}>
        {icon}
      </Text>
      <Text style={[tabStyles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  tabItem: { flex: 1, alignItems: "center" },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },

  header: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    ...softShadow,
  },
  backText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 6 },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 24,
    marginTop: 20,
    ...softShadow,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.label,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    minHeight: 140,
    fontSize: 15,
    color: COLORS.text,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  uploadBox: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: COLORS.accentSoft,
  },
  uploadIcon: { fontSize: 18, marginRight: 8 },
  uploadText: { fontSize: 14, fontWeight: "600", color: COLORS.accent },

  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 24,
    ...softShadow,
  },
  analyzeIcon: { fontSize: 18, marginRight: 8 },
  analyzeText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 14,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...softShadow,
  },
});