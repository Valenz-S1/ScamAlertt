import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RISK_CONFIG, RiskLevel } from "../theme/colors";

interface RiskBadgeProps {
  level: RiskLevel;
  large?: boolean;
}

export default function RiskBadge({ level, large = false }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        large && styles.badgeLarge,
      ]}
    >
      <Text style={[styles.icon, large && styles.iconLarge]}>
        {config.icon}
      </Text>
      <Text
        style={[
          styles.label,
          { color: config.color },
          large && styles.labelLarge,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  badgeLarge: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 8,
  },
  icon: { fontSize: 16, marginRight: 8 },
  iconLarge: { fontSize: 28, marginRight: 12 },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  labelLarge: { fontSize: 20, letterSpacing: 1.5 },
});
