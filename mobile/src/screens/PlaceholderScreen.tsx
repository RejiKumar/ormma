import { StyleSheet, Text, View } from "react-native";

export const DISCLAIMER = "This app does not provide medical advice.";

export function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ormma</Text>
      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "600", marginBottom: 16 },
  disclaimer: { fontSize: 18, textAlign: "center" },
});
