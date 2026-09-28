import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getHistory } from "../services/api";
import { COLORS, RISK_CONFIG, RiskLevel } from "../theme/colors";
import type { Analysis } from "../types";

type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  History: undefined;
  Settings: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, "History">;

type FilterOption = "all" | RiskLevel;

const FILTERS: { key: FilterOption; label: string; icon?: string }[] = [
  { key: "all", label: "Todos" },
  { key: "red", label: "Peligro", icon: "🔒" },
  { key: "yellow", label: "Sospechoso", icon: "⚠️" },
  { key: "green", label: "Seguro", icon: "🛡️" },
];

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");

  const loadHistory = () => {
    getHistory()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadHistory);
    return unsub;
  }, [navigation]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.risk_level === filter);
  }, [items, filter]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.base} />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      {/* Encabezado morado */}
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>{items.length} análisis realizados</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const active = filter === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(option.key)}
            >
              {option.icon ? (
                <Text style={styles.filterIcon}>{option.icon}</Text>
              ) : null}
              <Text
                style={[styles.filterLabel, active && styles.filterLabelActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <HistoryRow item={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === "all"
              ? "Aún no hay mensajes analizados."
              : "No hay análisis en esta categoría."}
          </Text>
        }
      />

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
        <TabItem icon="🗂️" label="Historial" active />
        <TabItem
          icon="⚙️"
          label="Ajustes"
          onPress={() => navigation.navigate("Settings")}
        />
      </View>
    </View>
  );
}

function HistoryRow({ item }: { item: Analysis }) {
  const risk = item.risk_level as RiskLevel;
  const config = RISK_CONFIG[risk];
  const date = new Date(item.created_at).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.row}>
      <View style={[styles.rowIconBox, { backgroundColor: config.bg }]}>
        <Text style={styles.rowIcon}>{config.icon}</Text>
      </View>

      <View style={styles.rowTextBox}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.scam_type || "Mensaje analizado"}
          </Text>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        <Text style={styles.rowDescription} numberOfLines={1}>
          {item.input_text || "Imagen"}
        </Text>
        <Text style={styles.rowDate}>{date}</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  header: {
    backgroundColor: COLORS.base,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: { color: COLORS.white, fontSize: 26, fontWeight: "700" },
  subtitle: { color: COLORS.headerTint, fontSize: 14, marginTop: 4 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.base, borderColor: COLORS.base },
  filterIcon: { fontSize: 12, marginRight: 4 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  filterLabelActive: { color: COLORS.white },

  list: { paddingHorizontal: 20, paddingBottom: 16 },
  row: {
    flexDirection: "row",
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
  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text },
  rowDescription: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  rowDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },

  empty: { textAlign: "center", marginTop: 40, color: COLORS.textMuted },

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
