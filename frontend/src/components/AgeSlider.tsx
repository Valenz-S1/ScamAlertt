import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder } from "react-native";
import { COLORS } from "../theme/colors";

export default function AgeSlider({
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
