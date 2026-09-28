import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { analyzeText, analyzeImage } from "../services/api";
import { COLORS } from "../theme/colors";
import type { Analysis } from "../types";

type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  Result: { result: Analysis };
  History: undefined;
  Settings: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Analyze">;

export default function AnalyzeScreen({ navigation }: Props) {
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
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.base} />
        <Text style={styles.loadingText}>Analizando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado morado */}
        <View style={styles.header}>
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

        <View style={styles.content}>
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
        </View>

        {/* Botón de analizar */}
        <View style={styles.footer}>
          <Pressable style={styles.analyzeButton} onPress={handleAnalyzeText}>
            <Text style={styles.analyzeIcon}>🔍</Text>
            <Text style={styles.analyzeText}>Analizar ahora</Text>
          </Pressable>
          <Text style={styles.footerNote}>
            Tu mensaje no se guarda ni se comparte con terceros
          </Text>
        </View>
      </ScrollView>

      {/* Barra inferior */}
      <View style={styles.tabBar}>
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
    </SafeAreaView>
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
  const color = active ? COLORS.base : COLORS.textMuted;
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
  scrollContent: { paddingBottom: 20 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },

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
  subtitle: { color: COLORS.headerTint, fontSize: 14, marginTop: 6 },

  content: { paddingHorizontal: 24, paddingTop: 24 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.label,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: COLORS.card,
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
    borderColor: "#C9C3F0",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: COLORS.baseBg,
  },
  uploadIcon: { fontSize: 18, marginRight: 8 },
  uploadText: { fontSize: 14, fontWeight: "600", color: COLORS.base },

  footer: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 12 },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.base,
    paddingVertical: 16,
    borderRadius: 16,
  },
  analyzeIcon: { fontSize: 18, marginRight: 8 },
  analyzeText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF2",
    paddingVertical: 10,
    paddingBottom: 16,
  },
});
