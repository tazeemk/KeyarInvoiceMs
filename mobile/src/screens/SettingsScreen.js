import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  ["authorised_signatory_name", "Authorised signatory name", "text", false],
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

  async function chooseSignature() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      base64: true,
      quality: 1,
    });
    if (result.canceled) return;
    const image = result.assets?.[0];
    if (!image?.base64) return Alert.alert("Unable to load signature", "Choose a PNG or JPEG image and try again.");
    if ((image.fileSize && image.fileSize > 1_000_000) || image.base64.length > 1_333_336) return Alert.alert("Signature too large", "Signature images must be smaller than 1 MB.");
    const uri = image.uri?.toLowerCase() || "";
    const mime = image.mimeType === "image/jpeg" || uri.endsWith(".jpg") || uri.endsWith(".jpeg") ? "jpeg" : image.mimeType === "image/png" || uri.endsWith(".png") ? "png" : "";
    if (!mime) return Alert.alert("Unsupported signature", "Choose a PNG or JPEG image.");
    setForm((current) => ({ ...current, authorised_signature_data: `data:image/${mime};base64,${image.base64}` }));
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
      <Text style={styles.signatureLabel}>Authorised signature image</Text>
      <Card style={styles.signatureCard}>
        {form.authorised_signature_data ? <Image source={{ uri: form.authorised_signature_data }} style={styles.signaturePreview} resizeMode="contain" /> : <Text style={styles.signatureHint}>No company signature saved.</Text>}
        {isAdmin && <Button title="Choose signature image" variant="secondary" onPress={chooseSignature} />}
        {isAdmin && !!form.authorised_signature_data && <Button title="Remove signature" variant="secondary" onPress={() => setForm((current) => ({ ...current, authorised_signature_data: "" }))} />}
        <Text style={styles.signatureHint}>PNG or JPEG, up to 1 MB. New invoices will use this saved signature.</Text>
      </Card>
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
  signatureLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginTop: 4 },
  signatureCard: { gap: 10 },
  signaturePreview: { width: "100%", height: 90 },
  signatureHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
