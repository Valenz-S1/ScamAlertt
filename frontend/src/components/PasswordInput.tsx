import React, { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  error?: string | null;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  error,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.row, error && styles.rowError]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
        <Text style={styles.eye}>{show ? "🙈" : "👁️"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  rowError: { borderColor: COLORS.red },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eye: { fontSize: 18, marginLeft: 8, padding: 4 },
});
