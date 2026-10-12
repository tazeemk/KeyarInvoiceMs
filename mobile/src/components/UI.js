import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

export function Page({ children, scroll = true, style, refreshControl }) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Container
        style={[styles.page, style]}
        {...(scroll ? {
          contentContainerStyle: styles.pageContent,
          keyboardShouldPersistTaps: "handled",
          keyboardDismissMode: Platform.OS === "ios" ? "interactive" : "on-drag",
          scrollsChildToFocus: true,
          automaticallyAdjustKeyboardInsets: Platform.OS === "ios",
          refreshControl,
        } : {})}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right }) {
  return (
    <View style={styles.header}>
      <Image source={require("../../assets/keyar-logo.png")} style={styles.brandImage} resizeMode="contain" accessibilityLabel="Keyar logo" />
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const Container = onPress ? Pressable : View;
  return <Container onPress={onPress} style={[styles.card, style]}>{children}</Container>;
}

export function Button({ title, onPress, variant = "primary", disabled = false, loading = false, style }) {
  const secondary = variant === "secondary";
  const danger = variant === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.navy : colors.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, editable = true, required, autoCapitalize, style, ...props }) {
  return (
    <View style={styles.inputWrap}>
      {!!label && <Text style={styles.label}>{label}{required ? " *" : ""}</Text>}
      <TextInput
        value={value == null ? "" : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#9aa8b5"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
        autoCapitalize={autoCapitalize || "sentences"}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

export function SearchInput({ value, onChangeText, placeholder = "Search" }) {
  return (
    <View style={styles.search}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9aa8b5" style={styles.searchInput} returnKeyType="search" />
    </View>
  );
}

export function Empty({ title, subtitle }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptySubtitle}>{subtitle}</Text></View>;
}

export function Loading({ label = "Loading…" }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.teal} size="large" /><Text style={styles.loadingText}>{label}</Text></View>;
}

export function FormModal({ visible, title, children, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"} onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close form" onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          scrollsChildToFocus
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentContainerStyle={styles.modalContent}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function confirmAction(title, message, onConfirm) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Continue", style: "destructive", onPress: onConfirm },
  ]);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { flex: 1, paddingHorizontal: 18 },
  pageContent: { flexGrow: 1, paddingTop: 14, paddingBottom: 36, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  brandImage: { width: 78, height: 42 },
  headerTitle: { color: colors.ink, fontWeight: "800", fontSize: 25, letterSpacing: -0.5 },
  headerSubtitle: { color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 16, gap: 9 },
  button: { backgroundColor: colors.navy, paddingHorizontal: 17, paddingVertical: 13, minHeight: 47, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  buttonSecondary: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 },
  buttonDanger: { backgroundColor: colors.red },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  buttonTextSecondary: { color: colors.navy },
  disabled: { opacity: 0.55 },
  inputWrap: { gap: 7, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.white, paddingHorizontal: 13, color: colors.ink, fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  search: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  searchIcon: { fontSize: 25, color: colors.muted, marginRight: 8, lineHeight: 30 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15 },
  empty: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 18, gap: 7 },
  emptyTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  emptySubtitle: { color: colors.muted, textAlign: "center", lineHeight: 20, fontSize: 13 },
  loading: { flex: 1, minHeight: 200, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.muted, fontSize: 14 },
  modal: { flex: 1, backgroundColor: colors.canvas },
  modalHeader: { minHeight: 58, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  close: { fontSize: 20, color: colors.muted, padding: 4 },
  modalContent: { flexGrow: 1, padding: 18, paddingBottom: 40 },
});
