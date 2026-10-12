import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Empty, Header, Input, Loading, Page } from "../components/UI";
import { colors } from "../theme";
import { getApiMessage } from "../utils/money";

const FIELDS = [
  ["company_name", "Legal company name", "text", true],
  ["brand_name", "Brand name", "text", true],
  ["address", "Registered address", "text", true, true],
  ["gstin", "GSTIN", "text", true],
  ["state", "State", "text", true],
  ["pincode", "PIN code", "number-pad", true],
  ["phone", "Company phone", "phone-pad", false],
  ["email", "Accounts email", "email-address", false],
  ["invoice_prefix", "Invoice prefix", "text", true],
  ["bank_name", "Bank name", "text", false],
  ["bank_account", "Bank account", "number", false],
  ["bank_ifsc", "Bank IFSC", "characters", false],
  ["bank_branch", "Bank branch", "text", false],
  ["footer_text", "Invoice footer", "text", false, true],
];

export default function SettingsScreen() {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("settings/").then(({ data }) => {
      setForm(data);
      setError("");
    }).catch((issue) => setError(getApiMessage(issue))).finally(() => setBusy(false));
  }, []);

  async function save() {
    const missing = FIELDS.find(([key, label, , required]) => required && !String(form?.[key] || "").trim());
    if (missing) return Alert.alert("Check company details", `${missing[1]} is required.`);
    setSaving(true);
    try {
      const { data } = await api.patch("settings/", form);
      setForm(data);
      Alert.alert("Settings saved", "Company details will apply to new invoices.");
      setError("");
    } catch (issue) {
      setError(getApiMessage(issue));
      Alert.alert("Unable to save settings", getApiMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  if (busy) return <Page><Loading label="Loading company settings…" /></Page>;
  if (!form) return <Page><Header title="Company settings" /><Empty title="Settings unavailable" subtitle={error} /></Page>;

  return (
    <Page>
      <Header title="Company settings" subtitle="Company details used on future invoice PDFs." />
      {form.is_sample && <Card style={styles.sample}><Text style={styles.sampleTitle}>Sample company profile</Text><Text style={styles.sampleText}>Verify company identity, GSTIN, bank account, IFSC and contact details before issuing invoices.</Text></Card>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!isAdmin && <Card><Text style={styles.readOnly}>You can view settings, but only an Admin can change them.</Text></Card>}
      {FIELDS.map(([key, label, keyboardType, required, multiline]) => (
        <Input key={key} label={label} value={form[key]} required={required} editable={isAdmin} keyboardType={keyboardType === "characters" ? "default" : keyboardType} multiline={multiline}
          maxLength={key === "pincode" ? 6 : undefined}
          autoCapitalize={["gstin", "bank_ifsc"].includes(key) ? "characters" : key === "email" ? "none" : undefined}
          onChangeText={(value) => setForm((current) => ({ ...current, [key]: key === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value }))} />
      ))}
      {isAdmin && <Button title={saving ? "Saving…" : "Save company settings"} onPress={save} loading={saving} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  sample: { borderColor: "#f1dcaf", backgroundColor: "#fff8e9" },
  sampleTitle: { color: "#966219", fontWeight: "800", fontSize: 14 },
  sampleText: { color: "#826639", fontSize: 12, lineHeight: 18 },
  readOnly: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.red, fontSize: 13 },
});
