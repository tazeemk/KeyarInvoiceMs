import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button, Input, Page } from "../components/UI";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";
import { getApiMessage } from "../utils/money";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      Alert.alert("Sign in", "Enter both your username and password.");
      return;
    }
    setWorking(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      Alert.alert("Unable to sign in", getApiMessage(error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Page scroll={false} style={styles.page}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View style={styles.hero}>
          <View style={styles.mark}><Text style={styles.markText}>K</Text></View>
          <Text style={styles.brand}>KEYAR</Text>
          <Text style={styles.company}>NAMASTE SS INTERNATIONAL PVT. LTD.</Text>
          <Text style={styles.title}>Your business, in hand.</Text>
          <Text style={styles.caption}>Sign in to manage customers, products, and GST invoices.</Text>
        </View>
        <View style={styles.form}>
          <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" returnKeyType="next" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
          <Button title="Sign in securely" onPress={submit} loading={working} style={{ marginTop: 5 }} />
          <Text style={styles.footnote}>Access is managed by your Keyar administrator.</Text>
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.navyDeep, paddingHorizontal: 25 },
  center: { flex: 1, justifyContent: "center", paddingBottom: 25 },
  hero: { alignItems: "center", marginBottom: 37 },
  mark: { height: 62, width: 62, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  markText: { fontSize: 35, lineHeight: 42, color: colors.navy, fontWeight: "900" },
  brand: { color: colors.white, fontSize: 26, fontWeight: "900", letterSpacing: 3 },
  company: { color: "#c6d9e8", fontSize: 10, letterSpacing: 1, marginTop: 6, fontWeight: "700" },
  title: { color: colors.white, fontSize: 28, fontWeight: "800", marginTop: 32, textAlign: "center" },
  caption: { color: "#c6d9e8", textAlign: "center", marginTop: 8, lineHeight: 21, fontSize: 14, maxWidth: 300 },
  form: { backgroundColor: colors.white, borderRadius: 20, padding: 20 },
  footnote: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
