import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getHistory, getStats } from "../services/api";
import { RISK_CONFIG, RiskLevel } from "../theme/colors";
import type { Analysis, AnalysisStats } from "../types";

type Props = NativeStackScreenProps<any, any>;

const COLORS = {
  bg: "#F2F4F7",
  card: "#FFFFFF",
  text: "#1E293B",
  textMuted: "#64748B",
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

type FilterOption = "all" | RiskLevel;

const FILTERS: { key: FilterOption; label: string; icon?: string }[] = [
  { key: "all", label: "Todos" },
  { key: "red", label: "Peligro", icon: "🔒" },
  { key: "yellow", label: "Sospechoso", icon: "⚠️" },
  { key: "green", label: "Seguro", icon: "🛡️" },
];

// Utilidades de fecha

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const YEARS_BACK = 6;

const pad2 = (n: number) => String(n).padStart(2, "0");

function isoFrom(d: number, m: number, y: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function esFromIso(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysInMonth(m: number, y: number) {
  return new Date(y, m, 0).getDate();
}

// Rueda deslizable día / mes / año

const WHEEL_ITEM = 40;
const WHEEL_VISIBLE = 5;

type WheelValue = {
  value: number;
  label: string;
};

function Wheel({
  values,
  value,
  onChange,
  width,
}: {
  values: WheelValue[];
  value: number;
  onChange: (v: number) => void;
  width: number;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const pad = (WHEEL_ITEM * (WHEEL_VISIBLE - 1)) / 2;

  const index = values.findIndex((v) => v.value === value);

  useEffect(() => {
    if (index >= 0) {
      scrollRef.current?.scrollTo({
        y: index * WHEEL_ITEM,
        animated: false,
      });
    }
  }, [index, values.length]);

  const handleEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;

    const i = Math.max(
      0,
      Math.min(values.length - 1, Math.round(y / WHEEL_ITEM)),
    );

    if (values[i] && values[i].value !== value) {
      onChange(values[i].value);
    }
  };

  return (
    <View style={[wheelStyles.wheel, { width }]}>
      <ScrollView
        ref={scrollRef}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: pad,
        }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {values.map((v) => (
          <Pressable
            key={v.value}
            style={wheelStyles.item}
            onPress={() => onChange(v.value)}
          >
            <Text
              style={[
                wheelStyles.itemText,
                v.value === value && wheelStyles.itemTextSelected,
              ]}
            >
              {v.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View pointerEvents="none" style={wheelStyles.overlay}>
        <View style={wheelStyles.flexGap} />
        <View style={wheelStyles.line} />
        <View style={wheelStyles.centerGap} />
        <View style={wheelStyles.line} />
        <View style={wheelStyles.flexGap} />
      </View>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  wheel: {
    height: WHEEL_ITEM * WHEEL_VISIBLE,
    overflow: "hidden",
  },

  item: {
    height: WHEEL_ITEM,
    alignItems: "center",
    justifyContent: "center",
  },

  itemText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },

  itemTextSelected: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  flexGap: {
    flex: 1,
  },

  centerGap: {
    height: WHEEL_ITEM,
  },

  line: {
    height: 1.5,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
});

// Modal selector de fecha

function DateFilterModal({
  visible,
  initialIso,
  onApply,
  onClose,
}: {
  visible: boolean;
  initialIso: string | null;
  onApply: (iso: string) => void;
  onClose: () => void;
}) {
  const today = new Date();

  const init = initialIso
    ? initialIso.split("-").map(Number)
    : [today.getDate(), today.getMonth() + 1, today.getFullYear()];

  const [d, setD] = useState(init[0]);
  const [m, setM] = useState(init[1]);
  const [y, setY] = useState(init[2]);

  useEffect(() => {
    if (visible) {
      const current = initialIso
        ? initialIso.split("-").map(Number)
        : [today.getDate(), today.getMonth() + 1, today.getFullYear()];

      setD(current[2]);
      setM(current[1]);
      setY(current[0]);
    }
  }, [visible, initialIso]);

  const maxD = daysInMonth(m, y);

  useEffect(() => {
    if (d > maxD) {
      setD(maxD);
    }
  }, [maxD, d]);

  const years = Array.from(
    { length: YEARS_BACK + 2 },
    (_, i) => today.getFullYear() - YEARS_BACK + i,
  );

  const days = Array.from({ length: maxD }, (_, i) => i + 1);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable style={modalStyles.card} onPress={() => {}}>
          <Text style={modalStyles.title}>Filtrar por fecha</Text>

          <Text style={modalStyles.subtitle}>
            Desliza para elegir día, mes y año
          </Text>

          <View style={modalStyles.wheelsRow}>
            <Wheel
              values={days.map((n) => ({
                value: n,
                label: String(n),
              }))}
              value={d}
              onChange={setD}
              width={64}
            />

            <Wheel
              values={MONTHS.map((label, i) => ({
                value: i + 1,
                label,
              }))}
              value={m}
              onChange={setM}
              width={88}
            />

            <Wheel
              values={years.map((n) => ({
                value: n,
                label: String(n),
              }))}
              value={y}
              onChange={setY}
              width={80}
            />
          </View>

          <View style={modalStyles.buttonsRow}>
            <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={modalStyles.applyBtn}
              onPress={() => onApply(isoFrom(d, m, y))}
            >
              <Text style={modalStyles.applyText}>Aplicar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(30,41,59,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 24,
    shadowColor: "#1E293B",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 8,
  },

  wheelsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: COLORS.accentSoft,
  },

  cancelText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 14,
  },

  applyBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: COLORS.accent,
  },

  applyText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
});

// Pantalla Historial

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterOption>("all");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [list, s] = await Promise.all([
        getHistory(0, 100, {
          riskLevel: filter !== "all" ? filter : undefined,

          date: selectedDate ?? undefined,
        }),

        getStats(),
      ]);

      setItems(list);
      setStats(s);
    } catch {
      // Silencioso.
      // La pantalla mostrará el estado vacío.
    } finally {
      setLoading(false);
    }
  }, [filter, selectedDate]);

  // Cargar cuando cambia un filtro.
  useEffect(() => {
    load();
  }, [load]);

  // Refrescar cuando regresamos a Historial.
  useEffect(() => {
    const unsub = navigation.addListener("focus", load);

    return unsub;
  }, [navigation, load]);

  const hasFilters = filter !== "all" || selectedDate !== null;

  return (
    <View style={styles.safeArea}>
      {/* Encabezado */}
      <View
        style={[
          styles.header,
          {
            paddingTop: 16 + insets.top,
          },
        ]}
      >
        <Text style={styles.title}>Historial</Text>

        <Text style={styles.subtitle}>
          {hasFilters
            ? `${items.length} resultado(s)`
            : `${stats?.total ?? items.length} análisis realizados`}
        </Text>
      </View>

      {/* Filtros por tipo */}
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

      {/* Selector de fecha */}
      <View style={styles.dateRow}>
        <Pressable
          style={[styles.dateBox, selectedDate && styles.dateBoxActive]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.dateIcon}>📅</Text>

          <Text
            style={[
              styles.dateText,
              !selectedDate && styles.dateTextPlaceholder,
            ]}
          >
            {selectedDate ? esFromIso(selectedDate) : "Filtrar por fecha..."}
          </Text>

          {selectedDate ? (
            <Pressable
              hitSlop={10}
              style={styles.dateClearBtn}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={styles.dateClear}>✕</Text>
            </Pressable>
          ) : null}

          <Text style={styles.dateArrow}>{pickerOpen ? "▲" : "▼"}</Text>
        </Pressable>
      </View>

      {/* Lista */}
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            onPress={() =>
              navigation.navigate("Result", {
                result: item,
                fromHistory: true,
              })
            }
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>
              {hasFilters
                ? "No hay análisis que coincidan con los filtros."
                : "Aún no hay mensajes analizados."}
            </Text>
          )
        }
      />

      {/* Barra inferior */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
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

      {/* Modal selector de fecha */}
      <DateFilterModal
        visible={pickerOpen}
        initialIso={selectedDate}
        onClose={() => setPickerOpen(false)}
        onApply={(iso) => {
          setSelectedDate(iso);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

// Fila de historial

function HistoryRow({
  item,
  onPress,
}: {
  item: Analysis;
  onPress: () => void;
}) {
  const risk = item.risk_level as RiskLevel;

  const config = RISK_CONFIG[risk];

  const date = new Date(item.created_at).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View
        style={[
          styles.rowIconBox,
          {
            backgroundColor: config.bg,
          },
        ]}
      >
        <Text style={styles.rowIcon}>{config.icon}</Text>
      </View>

      <View style={styles.rowTextBox}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.scam_type || "Mensaje analizado"}
          </Text>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: config.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: config.color,
                },
              ]}
            >
              {config.label}
            </Text>
          </View>
        </View>

        <Text style={styles.rowDescription} numberOfLines={1}>
          {item.input_text || "Imagen"}
        </Text>

        <Text style={styles.rowDate}>{date}</Text>
      </View>
    </Pressable>
  );
}

// Barra inferior

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
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text
        style={[
          styles.tabIcon,
          {
            opacity: active ? 1 : 0.6,
          },
        ]}
      >
        {icon}
      </Text>

      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// Estilos

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...softShadow,
  },

  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  filterIcon: {
    fontSize: 12,
    marginRight: 4,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },

  filterLabelActive: {
    color: COLORS.white,
  },

  dateRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 4,
  },

  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...softShadow,
  },

  dateBoxActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },

  dateIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  dateTextPlaceholder: {
    fontWeight: "400",
    color: COLORS.textMuted,
  },

  dateClearBtn: {
    paddingHorizontal: 6,
  },

  dateClear: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  dateArrow: {
    fontSize: 11,
    color: COLORS.accent,
    marginLeft: 4,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  row: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    ...softShadow,
  },

  rowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rowIcon: {
    fontSize: 18,
  },

  rowTextBox: {
    flex: 1,
  },

  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  rowDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  rowDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: COLORS.textMuted,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...softShadow,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
  },

  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});