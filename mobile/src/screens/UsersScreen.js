import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, fetchAll } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Empty, FormModal, Header, Input, Loading, Page, SearchInput, confirmAction } from "../components/UI";
import { colors } from "../theme";
import { getApiMessage } from "../utils/money";

export default function UsersScreen() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!isAdmin) return setBusy(false);
    setBusy(true);
    try { setUsers(await fetchAll("users/", { search })); }
    catch (issue) { Alert.alert("Unable to load team members", getApiMessage(issue)); }
    finally { setBusy(false); }
  }, [isAdmin, search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (!editing.username?.trim() || (!editing.id && !editing.password)) return Alert.alert("Required fields", "Username and a password are required.");
    if (editing.password && editing.password.length < 8) return Alert.alert("Password too short", "Use at least 8 characters.");
    setSaving(true);
    const payload = { ...editing };
    delete payload.role_display;
    if (!payload.password) delete payload.password;
    try {
      if (editing.id) await api.patch(`users/${editing.id}/`, payload);
      else await api.post("users/", payload);
      setEditing(null);
      await load();
    } catch (issue) {
      Alert.alert("Unable to save user", getApiMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  function deactivate(target) {
    confirmAction("Deactivate account?", `${target.username} will no longer be able to sign in.`, async () => {
      try { await api.delete(`users/${target.id}/`); await load(); }
      catch (issue) { Alert.alert("Unable to deactivate account", getApiMessage(issue)); }
    });
  }

  if (!isAdmin) return <Page><Header title="Team members" /><Empty title="Admin access required" subtitle="Only administrators can manage user accounts." /></Page>;

  return (
    <Page>
      <Header title="Team members" subtitle="Admin-only account and role management." right={<Pressable style={styles.addButton} onPress={() => setEditing({ username: "", email: "", first_name: "", last_name: "", password: "", role: "Staff", is_active: true })}><Text style={styles.addText}>＋ Add</Text></Pressable>} />
      <SearchInput value={search} onChangeText={setSearch} placeholder="Search username or email" />
      {busy ? <Loading label="Loading team…" /> : users.length ? users.map((member) => (
        <Card key={member.id} style={styles.member}>
          <View style={styles.memberHead}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(member.first_name || member.username).slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.username}>{member.first_name || member.username} {member.last_name || ""}</Text><Text style={styles.memberMeta}>@{member.username} · {member.role_display}</Text></View>
            <View style={[styles.status, member.is_active ? styles.active : styles.inactive]}><Text style={styles.statusText}>{member.is_active ? "ACTIVE" : "OFF"}</Text></View>
          </View>
          <View style={styles.memberActions}>
            {member.email ? <Text style={styles.email}>{member.email}</Text> : <View style={{ flex: 1 }} />}
            {member.id !== currentUser?.id && <><Pressable onPress={() => setEditing({ ...member, role: member.role_display, password: "" })} style={styles.action}><Text style={styles.actionText}>Edit</Text></Pressable>
              <Pressable onPress={() => member.is_active ? deactivate(member) : api.patch(`users/${member.id}/`, { is_active: true }).then(load).catch((issue) => Alert.alert("Unable to activate", getApiMessage(issue)))} style={styles.action}><Text style={styles.actionText}>{member.is_active ? "Deactivate" : "Activate"}</Text></Pressable></>}
          </View>
        </Card>
      )) : <Empty title="No users found" subtitle="Add a team account or change your search." />}
      <FormModal visible={Boolean(editing)} title={`${editing?.id ? "Edit" : "Add"} team member`} onClose={() => setEditing(null)}>
        {editing && <>
          <Input label="Username" required value={editing.username} onChangeText={(username) => setEditing((current) => ({ ...current, username }))} autoCapitalize="none" />
          <Input label="First name" value={editing.first_name} onChangeText={(first_name) => setEditing((current) => ({ ...current, first_name }))} />
          <Input label="Last name" value={editing.last_name} onChangeText={(last_name) => setEditing((current) => ({ ...current, last_name }))} />
          <Input label="Email" value={editing.email} onChangeText={(email) => setEditing((current) => ({ ...current, email }))} keyboardType="email-address" autoCapitalize="none" />
          <Input label={editing.id ? "New password (optional)" : "Password"} required={!editing.id} value={editing.password} secureTextEntry onChangeText={(password) => setEditing((current) => ({ ...current, password }))} />
          <View style={styles.roleRow}>
            <Pressable onPress={() => setEditing((current) => ({ ...current, role: "Staff" }))} style={[styles.roleButton, editing.role !== "Admin" && styles.roleSelected]}><Text style={[styles.roleText, editing.role !== "Admin" && styles.roleSelectedText]}>Staff</Text></Pressable>
            <Pressable onPress={() => setEditing((current) => ({ ...current, role: "Admin" }))} style={[styles.roleButton, editing.role === "Admin" && styles.roleSelected]}><Text style={[styles.roleText, editing.role === "Admin" && styles.roleSelectedText]}>Admin</Text></Pressable>
          </View>
          {!!editing.id && <View style={styles.switchRow}><Text style={styles.switchLabel}>Account active</Text><Switch value={Boolean(editing.is_active)} onValueChange={(is_active) => setEditing((current) => ({ ...current, is_active }))} trackColor={{ true: colors.teal }} /></View>}
          <Button title={saving ? "Saving…" : "Save user"} onPress={save} loading={saving} />
          <Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} style={{ marginTop: 8 }} />
        </>}
      </FormModal>
    </Page>
  );
}

const styles = StyleSheet.create({
  addButton: { borderRadius: 11, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10 },
  addText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  member: { gap: 11 },
  memberHead: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { height: 40, width: 40, borderRadius: 14, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.teal, fontWeight: "900", fontSize: 16 },
  username: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  memberMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  status: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  active: { backgroundColor: colors.tealSoft },
  inactive: { backgroundColor: "#f7eeee" },
  statusText: { color: colors.teal, fontSize: 9, fontWeight: "900" },
  memberActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  email: { color: colors.muted, fontSize: 11, flex: 1 },
  action: { padding: 6 },
  actionText: { color: colors.teal, fontSize: 11, fontWeight: "800" },
  roleRow: { flexDirection: "row", gap: 9, marginVertical: 8 },
  roleButton: { flex: 1, alignItems: "center", borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 12 },
  roleSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  roleText: { color: colors.muted, fontWeight: "700" },
  roleSelectedText: { color: colors.white },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 },
  switchLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" },
});
