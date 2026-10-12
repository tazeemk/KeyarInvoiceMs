import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, fetchAll } from "../api/client";
import { Button, Card, Empty, FormModal, Header, Input, Loading, Page, SearchInput, confirmAction } from "../components/UI";
import { colors } from "../theme";
import { getApiMessage, money } from "../utils/money";

const CUSTOMER_FIELDS = [
  ["name", "Customer name", "text", false],
  ["gstin", "GSTIN", "text", false],
  ["address", "Address", "text", false, true],
  ["state", "State", "text", false],
  ["pincode", "PIN code", "number-pad", false],
  ["mobile", "Mobile number", "phone-pad", false],
];

const PRODUCT_FIELDS = [
  ["name", "Product name", "text", true],
  ["hsn_code", "HSN code", "number", true],
  ["size", "Pack / size", "text", false],
  ["colour", "Colour", "text", false],
  ["unit", "Unit", "text", true],
  ["default_price", "Default price (INR)", "decimal-pad", true],
  ["gst_rate", "GST rate (%)", "decimal-pad", true],
];

export default function RecordsScreen({ kind, navigation }) {
  const isCustomer = kind === "customers";
  const endpoint = isCustomer ? "customers/" : "products/";
  const title = isCustomer ? "Customers" : "Products";
  const fields = isCustomer ? CUSTOMER_FIELDS : PRODUCT_FIELDS;
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRows(await fetchAll(endpoint, { search, ...(isCustomer ? {} : { active: "true" }) }));
      setError("");
    } catch (issue) {
      setError(getApiMessage(issue));
    } finally {
      setBusy(false);
    }
  }, [endpoint, isCustomer, search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const initial = useMemo(() => isCustomer
    ? { name: "", address: "", gstin: "", state: "", state_code: "", pincode: "", mobile: "" }
    : { name: "", hsn_code: "", size: "", colour: "", unit: "PCS", default_price: "", gst_rate: "18.00", active: true }, [isCustomer]);

  async function save() {
    const missing = fields.find(([key, , , required]) => required && !String(editing?.[key] ?? "").trim());
    if (missing) {
      Alert.alert("Check the form", `${missing[1]} is required.`);
      return;
    }
    setSaving(true);
    const payload = { ...editing };
    delete payload.id;
    delete payload.created_at;
    if (isCustomer) {
      for (const key of ["name", "address", "gstin", "state", "state_code", "pincode", "mobile"]) {
        payload[key] = payload[key] ?? "";
      }
    } else {
      payload.default_price = Number(payload.default_price);
      payload.gst_rate = Number(payload.gst_rate);
    }
    try {
      if (editing.id) await api.patch(`${endpoint}${editing.id}/`, payload);
      else await api.post(endpoint, payload);
      setEditing(null);
      await load();
    } catch (issue) {
      Alert.alert(`Unable to save ${isCustomer ? "customer" : "product"}`, getApiMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  function remove(row) {
    confirmAction(`Delete ${isCustomer ? "customer" : "product"}?`, `${row.name} will be removed if it is not already used on an invoice.`, async () => {
      try {
        await api.delete(`${endpoint}${row.id}/`);
        await load();
      } catch (issue) {
        Alert.alert("Unable to delete", getApiMessage(issue));
      }
    });
  }

  return (
    <Page>
      <Header title={title} subtitle={isCustomer ? "Billing contacts and GST details." : "Prices, HSN codes, and default GST rates."} right={<Pressable accessibilityRole="button" style={styles.addButton} onPress={() => setEditing({ ...initial })}><Text style={styles.addText}>＋ Add</Text></Pressable>} />
      <SearchInput value={search} onChangeText={setSearch} placeholder={isCustomer ? "Search name, GSTIN, PIN, mobile" : "Search product or HSN"} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {busy ? <Loading label={`Loading ${title.toLowerCase()}…`} /> : rows.length ? rows.map((row) => (
        <Card key={row.id} style={styles.record}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{row.name || (isCustomer ? "Unnamed customer" : "Unnamed product")}</Text>
              {isCustomer
                ? <Text style={styles.meta}>{[row.state, row.pincode ? `PIN ${row.pincode}` : ""].filter(Boolean).join(" · ") || "State not set"}</Text>
                : <Text style={styles.meta}>HSN {row.hsn_code || "—"} · {row.size || row.unit || "No size"}</Text>}
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityLabel={`Edit ${row.name}`} onPress={() => setEditing({ ...row })} style={styles.action}><Text style={styles.actionText}>Edit</Text></Pressable>
              <Pressable accessibilityLabel={`Delete ${row.name}`} onPress={() => remove(row)} style={styles.deleteAction}><Text style={styles.deleteText}>Delete</Text></Pressable>
            </View>
          </View>
          {isCustomer
            ? <Text style={styles.detail}>{row.mobile || "No mobile"}{row.gstin ? ` · GSTIN ${row.gstin}` : ""}</Text>
            : <Text style={styles.detail}>{money(row.default_price)} · GST {row.gst_rate}%{row.colour ? ` · ${row.colour}` : ""}</Text>}
        </Card>
      )) : <Empty title={`No ${title.toLowerCase()} found`} subtitle="Add a record or change your search." />}
      <FormModal visible={Boolean(editing)} title={`${editing?.id ? "Edit" : "Add"} ${isCustomer ? "customer" : "product"}`} onClose={() => setEditing(null)}>
        {editing && <>
          {fields.map(([key, label, keyboardType, required, multiline]) => (
            <Input key={key} label={label} value={editing[key]} required={required} keyboardType={keyboardType === "text" ? undefined : keyboardType} multiline={multiline} maxLength={key === "pincode" ? 6 : undefined} autoCapitalize={key === "gstin" || key === "hsn_code" ? "characters" : undefined}
              onChangeText={(value) => setEditing((current) => ({ ...current, [key]: key === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value }))} />
          ))}
          {!isCustomer && <View style={styles.switchRow}><Text style={styles.switchLabel}>Available for new invoices</Text><Switch value={editing.active !== false} onValueChange={(active) => setEditing((current) => ({ ...current, active }))} trackColor={{ true: colors.teal }} /></View>}
          <Button title={saving ? "Saving…" : "Save record"} onPress={save} loading={saving} />
          <Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} style={{ marginTop: 8 }} />
        </>}
      </FormModal>
    </Page>
  );
}

const styles = StyleSheet.create({
  addButton: { borderRadius: 11, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10 },
  addText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  record: { gap: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  detail: { color: colors.ink, fontSize: 13 },
  actions: { flexDirection: "row", gap: 5 },
  action: { backgroundColor: colors.tealSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  actionText: { color: colors.teal, fontSize: 11, fontWeight: "800" },
  deleteAction: { backgroundColor: "#fbefef", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  deleteText: { color: colors.red, fontSize: 11, fontWeight: "800" },
  error: { color: colors.red, fontSize: 13, marginTop: -6 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 },
  switchLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" },
});
