import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getHistory, getStats, getProfile } from "../services/api";
import { COLORS, RISK_CONFIG, RiskLevel } from "../theme/colors";
import type { Analysis, AnalysisStats } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  History: undefined;
  Settings: undefined;
  Help: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [recent, setRecent] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadHome = () => {
    getHistory(0, 3)
      .then(setRecent)
      .catch(() => {});
    getStats()
      .then(setStats)
      .catch(() => {});
    getProfile()
      .then((u) => setUserName(u.full_name.split(" ")[0]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHome();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadHome);
    return unsub;
  }, [navigation]);

  // Estado general según TODO el historial (no solo lo visible)
  const state =
    stats && stats.danger > 0
      ? { icon: "⚠", color: COLORS.red, label: "Con peligro" }
      : stats && stats.suspicious > 0
        ? { icon: "⚠", color: COLORS.yellow, label: "Sospechoso" }
        : { icon: "✓", color: COLORS.green, label: "Seguro" };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado morado */}
        <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.brandName}>ScamAlert</Text>
          </View>

          <Text style={styles.greeting}>
            {userName ? `Hola, ${userName} 👋` : "Bienvenido 👋"}
          </Text>
          <Text style={styles.headline}>¿Recibiste un mensaje sospechoso?</Text>

          <Pressable
            style={styles.analyzeButton}
            onPress={() => navigation.navigate("Analyze")}
          >
            <Text style={styles.analyzeIcon}>🔍</Text>
            <Text style={styles.analyzeText}>Analizar mensaje</Text>
          </Pressable>
        </View>

        {/* Tarjetas de estadísticas */}
        <View style={styles.statsRow}>
          <StatCard
            value={String(stats?.total ?? 0)}
            label="Tus análisis"
            valueColor={COLORS.base}
          />
          <StatCard
            value={state.icon}
            label={state.label}
            valueColor={state.color}
          />
          <StatCard value="24/7" label="Disponible" valueColor={COLORS.base} />
        </View>

        {/* Análisis recientes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Análisis recientes</Text>
          <Pressable onPress={() => navigation.navigate("History")}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={COLORS.base}
            style={{ marginTop: 20 }}
          />
        ) : recent.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no tienes análisis. ¡Analiza tu primer mensaje!
          </Text>
        ) : (
          <View style={styles.list}>
            {recent.map((item) => (
              <AnalysisRow key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Barra inferior */}
      <TabBar
        active="Home"
        bottomInset={insets.bottom}
        onNavigate={(screen) => navigation.navigate(screen as any)}
      />
    </View>
  );
}

function StatCard({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AnalysisRow({ item }: { item: Analysis }) {
  const risk = item.risk_level as RiskLevel;
  const config = RISK_CONFIG[risk];
  const date = new Date(item.created_at).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });

  return (
    <View style={styles.row}>
      <View style={[styles.rowIconBox, { backgroundColor: config.bg }]}>
        <Text style={styles.rowIcon}>{config.icon}</Text>
      </View>

      <View style={styles.rowTextBox}>
        <Text style={styles.rowTitle}>
          {item.scam_type || "Mensaje analizado"}
        </Text>
        <Text style={styles.rowDescription} numberOfLines={1}>
          {item.input_text || "Imagen analizada"}
        </Text>
        <Text style={styles.rowDate}>{date}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    </View>
  );
}

// Barra de navegación inferior
function TabBar({
  active,
  bottomInset = 0,
  onNavigate,
}: {
  active: string;
  bottomInset?: number;
  onNavigate: (screen: string) => void;
}) {
  const tabs = [
    { key: "Home", icon: "🏠", label: "Inicio" },
    { key: "Analyze", icon: "🔍", label: "Analizar" },
    { key: "History", icon: "🗂️", label: "Historial" },
    { key: "Settings", icon: "⚙️", label: "Ajustes" },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: 16 + bottomInset }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? COLORS.base : COLORS.textMuted;
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onNavigate(tab.key)}
          >
            <Text style={[styles.tabIcon, { opacity: isActive ? 1 : 0.6 }]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FF6B4A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoImage: { width: 40, height: 40, borderRadius: 12 },
  logoIcon: { fontSize: 20 },
  brandName: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  greeting: { color: COLORS.headerTint, fontSize: 16, marginBottom: 6 },
  headline: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 24,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.baseLight,
    paddingVertical: 16,
    borderRadius: 16,
  },
  analyzeIcon: { fontSize: 18, marginRight: 8 },
  analyzeText: { color: COLORS.white, fontSize: 17, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    marginTop: -32,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  sectionLink: { fontSize: 14, color: "#5B4BD6", fontWeight: "600" },

  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  rowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowIcon: { fontSize: 18 },
  rowTextBox: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  rowDescription: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  rowDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingHorizontal: 24,
    marginTop: 16,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF2",
    paddingVertical: 10,
    paddingBottom: 16,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});
