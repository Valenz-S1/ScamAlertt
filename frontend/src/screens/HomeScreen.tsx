import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { analizarMensaje } from "../services/api";

export default function HomeScreen() {
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);

  async function handleAnalizar() {
    const respuesta = await analizarMensaje(mensaje);
    setResultado(JSON.stringify(respuesta, null, 2));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Pega el mensaje sospechoso</Text>
      <TextInput
        style={styles.input}
        multiline
        value={mensaje}
        onChangeText={setMensaje}
        placeholder="Su paquete está retenido..."
      />
      <Button title="Analizar" onPress={handleAnalizar} />
      {resultado && <Text style={styles.resultado}>{resultado}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  titulo: { fontSize: 18, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  resultado: { marginTop: 16, fontFamily: "monospace" },
});
