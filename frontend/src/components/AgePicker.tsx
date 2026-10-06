import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { COLORS } from "../theme/colors";

const ITEM_HEIGHT = 42;
const VISIBLE_ITEMS = 5;
const AGES = Array.from({ length: 101 }, (_, i) => i); // 0 a 100

interface AgePickerProps {
  value: number | null;
  onChange: (age: number) => void;
}

export default function AgePicker({ value, onChange }: AgePickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const padding = (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2;

  // Posicionar el scroll en la edad actual (solo al montar)
  useEffect(() => {
    if (value !== null) {
      scrollRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
    }
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(100, Math.round(y / ITEM_HEIGHT)));
    if (index !== value) onChange(index);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingVertical: padding }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {AGES.map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              style={styles.item}
              onPress={() => {
                onChange(n);
                scrollRef.current?.scrollTo({
                  y: n * ITEM_HEIGHT,
                  animated: true,
                });
              }}
            >
              <Text
                style={[styles.itemText, selected && styles.itemTextSelected]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Líneas guía del item central */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.flexGap} />
        <View style={styles.line} />
        <View style={styles.centerGap} />
        <View style={styles.line} />
        <View style={styles.flexGap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 16, color: COLORS.textMuted },
  itemTextSelected: { fontSize: 20, fontWeight: "700", color: COLORS.base },
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "column",
  },
  flexGap: { flex: 1 },
  centerGap: { height: ITEM_HEIGHT },
  line: { height: 1.5, backgroundColor: "#C9C3F0", marginHorizontal: 12 },
});
