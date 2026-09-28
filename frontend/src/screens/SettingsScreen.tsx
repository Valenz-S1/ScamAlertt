import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getProfile, logout } from "../services/api";
import { COLORS } from "../theme/colors";
import type { User } from "../types";

type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  History: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  Help: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      getProfile()
        .then(setUser)
        .catch(() => {});
    });
    return unsub;
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Encabezado morado */}
        <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
          <Text style={styles.title}>Ajustes</Text>
          <Text style={styles.subtitle}>Tu cuenta y preferencias</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={COLORS.base}
            style={{ marginTop: 20 }}
          />
        ) : (
          <View style={styles.card}>
            {/* Datos del usuario */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.full_name || "Usuario"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Opciones */}
            <SettingsItem
              icon="🔑"
              label="Cambiar contraseña"
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <SettingsItem
              icon="❓"
              label="Ayuda para detectar estafas"
              onPress={() => navigation.navigate("Help")}
            />

            <View style={styles.divider} />

            <SettingsItem
              icon="🚪"
              label="Cerrar sesión"
              onPress={handleLogout}
              danger
            />
          </View>
        )}
      </ScrollView>

      {/* Barra inferior */}
      <View style={[styles.tabBar, { paddingBottom: 16 + insets.bottom }]}>
        <TabItem
          icon="🏠"
          label="Inicio"
          onPress={() => navigation.navigate("Home")}
        />
        <TabItem
          icon="🔍"
          label="Analizar"
          onPress={() => navigation.navigate("Analyze")}
        />
        <TabItem
          icon="🗂️"
          label="Historial"
          onPress={() => navigation.navigate("History")}
        />
        <TabItem icon="⚙️" label="Ajustes" active />
      </View>
    </View>
  );
}

function SettingsItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={sItemStyles.row} onPress={onPress}>
      <Text style={sItemStyles.icon}>{icon}</Text>
      <Text style={[sItemStyles.label, danger && { color: COLORS.red }]}>
        {label}
      </Text>
      <Text style={sItemStyles.arrow}>›</Text>
    </Pressable>
  );
}

const sItemStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  icon: { fontSize: 18, marginRight: 12 },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.text },
  arrow: { fontSize: 20, color: COLORS.textMuted },
});

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
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.6 }]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 24 },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: { color: COLORS.white, fontSize: 26, fontWeight: "700" },
  subtitle: { color: COLORS.headerTint, fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.baseBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.base,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingBottom: 16,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});
