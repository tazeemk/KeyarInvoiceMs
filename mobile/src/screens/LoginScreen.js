import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button, Input, Page } from "../components/UI";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";
import { getApiMessage } from "../utils/money";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHidden, setPasswordHidden] = useState(true);
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
          <View style={styles.logoFrame}><Image source={require("../../assets/keyar-logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="Keyar logo" /></View>
          <Text style={styles.company}>NAMASTE SS INTERNATIONAL PVT. LTD.</Text>
          <Text style={styles.title}>Your business, in hand.</Text>
          <Text style={styles.caption}>Sign in to manage customers, products, and GST invoices.</Text>
        </View>
        <View style={styles.form}>
          <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" returnKeyType="next" />
          <View style={styles.passwordField}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={passwordHidden}
                autoComplete="current-password"
                onSubmitEditing={submit}
                style={styles.passwordInput}
                accessibilityLabel="Password"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordHidden ? "Show password" : "Hide password"}
                accessibilityState={{ selected: !passwordHidden }}
                onPress={() => setPasswordHidden((hidden) => !hidden)}
                style={styles.visibilityButton}
              >
                <Text style={styles.visibilityText}>{passwordHidden ? "Show" : "Hide"}</Text>
              </Pressable>
            </View>
          </View>
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
  logoFrame: { width: 224, height: 116, padding: 10, borderRadius: 16, backgroundColor: colors.white, marginBottom: 14 },
  logo: { width: "100%", height: "100%" },
  company: { color: "#c6d9e8", fontSize: 10, letterSpacing: 1, marginTop: 2, fontWeight: "700" },
  title: { color: colors.white, fontSize: 28, fontWeight: "800", marginTop: 32, textAlign: "center" },
  caption: { color: "#c6d9e8", textAlign: "center", marginTop: 8, lineHeight: 21, fontSize: 14, maxWidth: 300 },
  form: { backgroundColor: colors.white, borderRadius: 20, padding: 20 },
  passwordField: { gap: 7, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  passwordInputRow: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.white, flexDirection: "row", alignItems: "center" },
  passwordInput: { minHeight: 48, flex: 1, paddingHorizontal: 13, color: colors.ink, fontSize: 15 },
  visibilityButton: { minHeight: 48, justifyContent: "center", paddingHorizontal: 13 },
  visibilityText: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  footnote: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
