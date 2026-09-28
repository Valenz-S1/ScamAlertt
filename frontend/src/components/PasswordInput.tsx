import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

// Color del ícono — naranja de marca (ya usado en la app).
// Si prefieren morado, cámbialo a COLORS.base aquí y se actualiza en todas las pantallas.
const ICON_COLOR = "#FF6B4A";

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
      <Pressable
        onPress={() => setShow((s) => !s)}
        hitSlop={8}
        style={styles.eyeButton}
        accessibilityRole="button"
        accessibilityLabel={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        <EyeIcon visible={show} />
      </Pressable>
    </View>
  );
}

//  Ícono vectorial plano de ojo (dibujado con Views, sin emojis)
//  visible=false → ojo tachado con línea diagonal (contraseña oculta)
//  visible=true  → ojo abierto (contraseña a la vista)

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View style={eyeStyles.container}>
      {/* Contorno del ojo */}
      <View style={eyeStyles.outline} />
      {/* Pupila */}
      <View style={eyeStyles.pupil} />
      {/* Línea diagonal del tachado (solo cuando está oculta) */}
      <View style={[eyeStyles.slash, { opacity: visible ? 0 : 1 }]} />
    </View>
  );
}

const eyeStyles = StyleSheet.create({
  // Tamaño fijo: el campo no "salta" al alternar entre estados
  container: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // Elipse = contorno del ojo
  outline: {
    width: 20,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: ICON_COLOR,
  },
  // Pupila centrada
  pupil: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ICON_COLOR,
    left: 11.5,
    top: 11.5,
  },
  // Diagonal que cruza el ojo de esquina a esquina
  slash: {
    position: "absolute",
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: ICON_COLOR,
    left: 1,
    top: 13,
    transform: [{ rotate: "45deg" }],
  },
});

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
  eyeButton: { marginLeft: 8, padding: 4 },
});
