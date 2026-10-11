import { Alert, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Header, Page } from "../components/UI";
import { colors } from "../theme";

export default function MoreScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();
  async function confirmLogout() {
    Alert.alert("Sign out?", "Your session on this device will end.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        try { await logout(); }
        catch { Alert.alert("Signed out", "Your device session ended, but the server could not confirm token revocation."); }
      } },
    ]);
  }
  return (
    <Page>
      <Header title="More" subtitle="Account and company workspace." />
      <Card style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.first_name || user?.username || "K").slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.username}>{user?.first_name || user?.username} {user?.last_name || ""}</Text><Text style={styles.role}>{user?.role_display || "Staff"} · @{user?.username}</Text></View>
      </Card>
      <MenuRow title="Company settings" subtitle="Company, GST, bank and invoice details" onPress={() => navigation.getParent()?.navigate("Settings")} />
      {isAdmin && <MenuRow title="Team members" subtitle="Manage admin and staff access" onPress={() => navigation.getParent()?.navigate("Users")} />}
      {!isAdmin && <Card><Text style={styles.note}>User management is available to administrators only.</Text></Card>}
      <Button title="Sign out" variant="secondary" onPress={confirmLogout} style={{ marginTop: 6 }} />
      <Text style={styles.version}>KEYAR INVOICE MANAGEMENT · MOBILE</Text>
    </Page>
  );
}

function MenuRow({ title, subtitle, onPress }) {
  return <Card onPress={onPress} style={styles.menu}><View style={styles.menuIcon}><Text style={styles.menuGlyph}>›</Text></View><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View><Text style={styles.arrow}>›</Text></Card>;
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.teal, fontWeight: "900", fontSize: 18 },
  username: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  role: { color: colors.muted, fontSize: 12, marginTop: 3 },
  menu: { flexDirection: "row", alignItems: "center", gap: 11 },
  menuIcon: { height: 39, width: 39, borderRadius: 12, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  menuGlyph: { color: colors.teal, fontSize: 26, lineHeight: 28, fontWeight: "700" },
  menuTitle: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  menuSubtitle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  arrow: { color: colors.muted, fontSize: 22, paddingHorizontal: 5 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  version: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textAlign: "center", marginTop: 10 },
});
