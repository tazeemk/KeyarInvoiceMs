import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, fetchAll } from "../api/client";
import { printInvoicePdf, saveInvoicePdf, shareInvoicePdf } from "../api/invoices";
import { Button, Card, Empty, FormModal, Header, Input, Loading, Page, SearchInput, confirmAction } from "../components/UI";
import { colors } from "../theme";
import { calculateLines, getApiMessage, money } from "../utils/money";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function InvoiceListScreen({ navigation, route }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const params = { search, ...(from ? { from } : {}), ...(to ? { to } : {}) };
      setRows(await fetchAll("invoices/", params));
      setError("");
    } catch (issue) {
      setError(getApiMessage(issue));
    } finally {
      setBusy(false);
    }
  }, [from, search, to]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (route.params?.invoiceId) {
      navigation.getParent()?.navigate("InvoiceDetails", { invoiceId: route.params.invoiceId });
      navigation.setParams({ invoiceId: undefined });
    }
  }, [navigation, route.params?.invoiceId]);

  return (
    <Page>
      <Header title="Invoices" subtitle="Search, review, and share your tax invoices." right={<Pressable style={styles.addButton} onPress={() => navigation.getParent()?.navigate("InvoiceForm")}><Text style={styles.addText}>＋ New</Text></Pressable>} />
      <SearchInput value={search} onChangeText={setSearch} placeholder="Invoice number or customer" />
      <View style={styles.filters}>
        <Input label="From date" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" autoCapitalize="none" style={styles.dateInput} />
        <Input label="To date" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" autoCapitalize="none" style={styles.dateInput} />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {busy ? <Loading label="Loading invoices…" /> : rows.length ? rows.map((invoice) => (
        <Card key={invoice.id} onPress={() => navigation.getParent()?.navigate("InvoiceDetails", { invoiceId: invoice.id })} style={styles.invoice}>
          <View style={styles.invoiceTop}><Text style={styles.number}>{invoice.invoice_number}</Text><Text style={styles.amount}>{money(invoice.grand_total)}</Text></View>
          <Text style={styles.customer}>{invoice.customer_name}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.date}>{invoice.invoice_date} · {invoice.place_of_supply || "Supply location not set"}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>ISSUED</Text></View>
          </View>
        </Card>
      )) : <Empty title="No invoices found" subtitle="Try different filters or create your first invoice." />}
    </Page>
  );
}

export function InvoiceDetailsScreen({ navigation, route }) {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get(`invoices/${invoiceId}/`);
      setInvoice(data);
      setError("");
    } catch (issue) {
      setError(getApiMessage(issue));
    } finally {
      setBusy(false);
    }
  }, [invoiceId]);
  useEffect(() => { load(); }, [load]);

  async function pdfAction(action) {
    setWorking(true);
    try {
      if (action === "download") {
        const saved = await saveInvoicePdf(invoice);
        if (saved) Alert.alert("PDF saved", "The invoice PDF is saved to your selected folder.");
        else Alert.alert("Save cancelled", "Choose a folder to save the PDF.");
      } else if (action === "share") await shareInvoicePdf(invoice);
      else await printInvoicePdf(invoice);
    } catch (issue) {
      Alert.alert("PDF action failed", getApiMessage(issue));
    } finally {
      setWorking(false);
    }
  }

  function remove() {
    confirmAction("Delete invoice?", `Invoice ${invoice.invoice_number} will be permanently removed.`, async () => {
      try {
        await api.delete(`invoices/${invoice.id}/`);
        navigation.goBack();
      } catch (issue) {
        Alert.alert("Unable to delete invoice", getApiMessage(issue));
      }
    });
  }

  if (busy) return <Page><Loading label="Loading invoice…" /></Page>;
  if (!invoice) return <Page><Header title="Invoice" /><Empty title="Invoice unavailable" subtitle={error || "This invoice could not be loaded."} /></Page>;
  const interstate = Number(invoice.igst_total) > 0;

  return (
    <Page>
      <Header title="Invoice details" subtitle={invoice.invoice_number} />
      <Card style={styles.summary}>
        <Text style={styles.invoiceName}>{invoice.customer_name}</Text>
        <Text style={styles.detail}>{invoice.customer_address || "Customer address not set"}</Text>
        <Text style={styles.detail}>{invoice.invoice_date}{invoice.due_date ? ` · Due ${invoice.due_date}` : ""}</Text>
        <Text style={styles.detail}>Place of supply: {invoice.place_of_supply || invoice.customer_state || "Not set"}</Text>
        <Text style={styles.status}>ISSUED · The backend does not currently expose payment status.</Text>
      </Card>
      <Text style={styles.section}>Products</Text>
      {(invoice.lines || []).map((line, index) => (
        <Card key={line.id || index} style={styles.lineCard}>
          <View style={styles.invoiceTop}><Text style={styles.lineName}>{line.description}</Text><Text style={styles.amount}>{money(line.total)}</Text></View>
          <Text style={styles.detail}>HSN {line.hsn_code} · {line.quantity} {line.unit} × {money(line.rate)}</Text>
          <Text style={styles.detail}>GST {line.gst_rate}% · Taxable {money(line.taxable_value)}</Text>
          <Text style={styles.detail}>{interstate ? `IGST ${money(line.igst)}` : `CGST ${money(line.cgst)} · SGST ${money(line.sgst)}`}</Text>
        </Card>
      ))}
      <Card style={styles.totals}>
        <Total label="Taxable amount" value={invoice.taxable_total} />
        {interstate ? <Total label="IGST" value={invoice.igst_total} /> : <>
          <Total label="CGST" value={invoice.cgst_total} />
          <Total label="SGST" value={invoice.sgst_total} />
        </>}
        <View style={styles.totalDivider} />
        <Total label="Grand total" value={invoice.grand_total} strong />
        {!!invoice.amount_in_words && <Text style={styles.words}>{invoice.amount_in_words}</Text>}
      </Card>
      {!!invoice.notes && <Card><Text style={styles.detail}>Notes</Text><Text style={styles.note}>{invoice.notes}</Text></Card>}
      <Button title="Edit invoice" onPress={() => navigation.navigate("InvoiceForm", { invoice })} />
      <View style={styles.pdfActions}>
        <Button title={working ? "Working…" : "Download PDF"} variant="secondary" disabled={working} onPress={() => pdfAction("download")} style={styles.flex} />
        <Button title="Share PDF" variant="secondary" disabled={working} onPress={() => pdfAction("share")} style={styles.flex} />
      </View>
      <Button title="Preview / Print PDF" variant="secondary" disabled={working} onPress={() => pdfAction("print")} />
      <Button title="Delete invoice" variant="danger" onPress={remove} style={{ marginTop: 4 }} />
    </Page>
  );
}

export function InvoiceFormScreen({ navigation, route }) {
  const invoice = route.params?.invoice;
  const { id, invoice_number } = invoice || {};
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productPicker, setProductPicker] = useState(null);
  const [form, setForm] = useState(() => invoice ? {
    customer: String(invoice.customer),
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date || "",
    vehicle_number: invoice.vehicle_number || "",
    mobile_number: invoice.mobile_number || "",
    notes: invoice.notes || "",
    items: (invoice.lines || []).map((line) => ({
      product: String(line.product_id),
      quantity: String(line.quantity),
      rate: String(line.rate),
      gst_rate: String(line.gst_rate),
    })),
  } : {
    customer: "",
    invoice_date: localDate(),
    due_date: "",
    vehicle_number: "",
    mobile_number: "",
    notes: "",
    items: [{ product: "", quantity: "1", rate: "", gst_rate: "" }],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const [customerRows, productRows, settings] = await Promise.all([
          fetchAll("customers/"),
          fetchAll("products/", { active: "true" }),
          api.get("settings/"),
        ]);
        setCustomers(customerRows);
        setProducts(productRows);
        setCompany(settings.data);
      } catch (issue) {
        setError(getApiMessage(issue));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const customer = customers.find((item) => String(item.id) === form.customer);
  const interstate = Boolean(company && customer && company.state_code !== customer.state_code);
  const lines = form.items.map((line) => {
    const product = products.find((item) => String(item.id) === line.product);
    return { ...line, gst_rate: line.gst_rate === "" ? Number(product?.gst_rate || 0) : Number(line.gst_rate) };
  });
  const totals = calculateLines(lines, interstate);

  function updateItem(index, key, value) {
    setForm((current) => ({ ...current, items: current.items.map((line, i) => i === index ? { ...line, [key]: value } : line) }));
  }

  function chooseProduct(index, product) {
    updateItem(index, "product", String(product.id));
    updateItem(index, "rate", String(product.default_price));
    updateItem(index, "gst_rate", String(product.gst_rate));
    setProductPicker(null);
  }

  async function submit() {
    if (!form.customer) return Alert.alert("Customer required", "Select the customer for this invoice.");
    if (!form.invoice_date || !/^\d{4}-\d{2}-\d{2}$/.test(form.invoice_date)) return Alert.alert("Invoice date required", "Enter the date as YYYY-MM-DD.");
    if (!form.items.length || form.items.some((line) => !line.product || !Number(line.quantity) || Number(line.quantity) <= 0)) {
      return Alert.alert("Check invoice lines", "Choose a product and enter a quantity greater than zero for every line.");
    }
    if (form.items.some((line) => {
      const rate = Number(line.gst_rate ?? products.find((item) => String(item.id) === line.product)?.gst_rate);
      return !Number.isFinite(rate) || rate < 0 || rate > 100;
    })) {
      return Alert.alert("Invalid GST", "Each GST percentage must be from 0% to 100%.");
    }
    setSaving(true);
    setError("");
    const payload = {
      customer: Number(form.customer),
      invoice_date: form.invoice_date,
      due_date: form.due_date || null,
      vehicle_number: form.vehicle_number,
      mobile_number: form.mobile_number,
      notes: form.notes,
      items: form.items.map((line) => {
        const product = products.find((item) => String(item.id) === line.product);
        return {
          product: Number(line.product),
          quantity: Number(line.quantity),
          ...(line.rate !== "" ? { rate: Number(line.rate) } : {}),
          gst_rate: Number(line.gst_rate === "" ? product.gst_rate : line.gst_rate),
        };
      }),
    };
    try {
      const result = id ? await api.patch(`invoices/${id}/`, payload) : await api.post("invoices/", payload);
      navigation.replace("InvoiceDetails", { invoiceId: result.data.id });
    } catch (issue) {
      setError(getApiMessage(issue));
      Alert.alert("Unable to save invoice", getApiMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  if (busy) return <Page><Loading label="Preparing invoice form…" /></Page>;
  if (error && !customers.length && !products.length) return <Page><Header title="Create invoice" /><Empty title="Invoice form unavailable" subtitle={error} /></Page>;

  return (
    <Page>
      <Header title={id ? "Edit invoice" : "New invoice"} subtitle={invoice_number || "Create a tax invoice"} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Card style={styles.formCard}>
        <Text style={styles.section}>Customer & dates</Text>
        <Text style={styles.formLabel}>CUSTOMER *</Text>
        <ChoiceButton label={customer ? `${customer.name} · ${customer.state_code}` : "Choose customer"} onPress={() => setProductPicker({ type: "customer" })} />
        <Input label="Invoice date (YYYY-MM-DD)" value={form.invoice_date} onChangeText={(invoice_date) => setForm((current) => ({ ...current, invoice_date }))} autoCapitalize="none" />
        <Input label="Due date (YYYY-MM-DD)" value={form.due_date} onChangeText={(due_date) => setForm((current) => ({ ...current, due_date }))} autoCapitalize="none" />
        <Input label="Vehicle number" value={form.vehicle_number} onChangeText={(vehicle_number) => setForm((current) => ({ ...current, vehicle_number }))} />
        <Input label="Mobile number" value={form.mobile_number || customer?.mobile} onChangeText={(mobile_number) => setForm((current) => ({ ...current, mobile_number }))} keyboardType="phone-pad" />
        <Text style={styles.supply}>{customer ? `Place of supply: ${customer.state} · ${interstate ? "IGST" : "CGST + SGST"}` : "GST type follows supplier and customer state."}</Text>
      </Card>
      <View style={styles.sectionHeader}><Text style={styles.section}>Invoice products</Text><Pressable onPress={() => setForm((current) => ({ ...current, items: [...current.items, { product: "", quantity: "1", rate: "", gst_rate: "" }] }))}><Text style={styles.addLine}>＋ Add line</Text></Pressable></View>
      {form.items.map((line, index) => {
        const product = products.find((item) => String(item.id) === line.product);
        const gstRate = line.gst_rate === "" ? Number(product?.gst_rate || 0) : Number(line.gst_rate);
        return <Card key={index} style={styles.lineForm}>
          <View style={styles.sectionHeader}><Text style={styles.lineTitle}>Product {index + 1}</Text>{form.items.length > 1 && <Pressable onPress={() => setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><Text style={styles.removeLine}>Remove</Text></Pressable>}</View>
          <ChoiceButton label={product ? `${product.name} · HSN ${product.hsn_code}` : "Choose product"} onPress={() => setProductPicker({ type: "product", index })} />
          <View style={styles.inlineInputs}>
            <Input label="Quantity" keyboardType="decimal-pad" value={line.quantity} onChangeText={(value) => updateItem(index, "quantity", value)} style={styles.smallInput} />
            <Input label="Rate (INR)" keyboardType="decimal-pad" value={line.rate} onChangeText={(value) => updateItem(index, "rate", value)} style={styles.smallInput} />
            <Input label="GST %" keyboardType="decimal-pad" value={line.gst_rate ?? product?.gst_rate} onChangeText={(value) => updateItem(index, "gst_rate", value)} style={styles.smallInput} />
          </View>
          <View style={styles.taxable}><Text style={styles.taxableLabel}>Taxable amount</Text><Text style={styles.taxableValue}>{money(Number(line.quantity || 0) * Number(line.rate || 0))}</Text><Text style={styles.taxableLabel}>GST at {gstRate}%</Text></View>
        </Card>;
      })}
      <Input label="Invoice notes" value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} multiline />
      <Card style={styles.totals}>
        <Total label="Taxable value" value={totals.taxable} />
        {interstate ? <Total label="IGST" value={totals.igst} /> : <><Total label="CGST" value={totals.cgst} /><Total label="SGST" value={totals.sgst} /></>}
        <View style={styles.totalDivider} />
        <Total label="Grand total" value={totals.grand} strong />
      </Card>
      <Button title={saving ? "Saving invoice…" : id ? "Save changes" : "Create invoice"} onPress={submit} loading={saving} />
      <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      <FormModal visible={Boolean(productPicker)} title={productPicker?.type === "customer" ? "Choose customer" : "Choose product"} onClose={() => setProductPicker(null)}>
        {(productPicker?.type === "customer" ? customers : products).map((item) => (
          <Pressable key={item.id} onPress={() => productPicker.type === "customer" ? (setForm((current) => ({ ...current, customer: String(item.id) })), setProductPicker(null)) : chooseProduct(productPicker.index, item)} style={styles.pickerRow}>
            <Text style={styles.pickerTitle}>{item.name}</Text>
            <Text style={styles.pickerMeta}>{productPicker.type === "customer" ? `${item.state || "State unset"} · ${item.state_code || "—"}` : `HSN ${item.hsn_code} · ${money(item.default_price)} · GST ${item.gst_rate}%`}</Text>
          </Pressable>
        ))}
        {!(productPicker?.type === "customer" ? customers : products).length && <Empty title="No records available" subtitle="Add customers and active products before creating an invoice." />}
      </FormModal>
    </Page>
  );
}

function ChoiceButton({ label, onPress }) {
  return <Pressable onPress={onPress} style={styles.choice}><Text style={styles.choiceText}>{label}</Text><Text style={styles.chevron}>⌄</Text></Pressable>;
}

function Total({ label, value, strong }) {
  return <View style={styles.totalRow}><Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text><Text style={[styles.totalValue, strong && styles.totalStrong]}>{money(value)}</Text></View>;
}

const styles = StyleSheet.create({
  addButton: { borderRadius: 11, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10 },
  addText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  filters: { flexDirection: "row", gap: 10 },
  dateInput: { fontSize: 12, paddingHorizontal: 9 },
  invoice: { gap: 6 },
  invoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  number: { color: colors.navy, fontWeight: "800", fontSize: 14, flex: 1 },
  amount: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  customer: { color: colors.ink, fontSize: 14 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 3 },
  date: { color: colors.muted, fontSize: 11, flex: 1 },
  badge: { backgroundColor: colors.tealSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  badgeText: { color: colors.teal, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  error: { color: colors.red, fontSize: 13 },
  summary: { gap: 8 },
  invoiceName: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  status: { color: colors.teal, backgroundColor: colors.tealSoft, overflow: "hidden", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, fontSize: 10, fontWeight: "800", marginTop: 4 },
  section: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  lineCard: { gap: 6 },
  lineName: { flex: 1, color: colors.ink, fontWeight: "800", fontSize: 14 },
  totals: { gap: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: colors.muted, fontSize: 13 },
  totalValue: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  totalStrong: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  totalDivider: { height: 1, backgroundColor: colors.line, marginVertical: 3 },
  words: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  note: { color: colors.ink, fontSize: 14 },
  pdfActions: { flexDirection: "row", gap: 9 },
  flex: { flex: 1 },
  formCard: { gap: 10 },
  formLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginTop: 4 },
  supply: { color: colors.teal, backgroundColor: colors.tealSoft, padding: 10, borderRadius: 9, fontSize: 12 },
  addLine: { color: colors.teal, fontWeight: "800", fontSize: 13, padding: 5 },
  lineForm: { gap: 4 },
  lineTitle: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  removeLine: { color: colors.red, fontWeight: "700", fontSize: 12, padding: 5 },
  inlineInputs: { flexDirection: "row", gap: 8, marginTop: 4 },
  smallInput: { paddingHorizontal: 8, fontSize: 13 },
  taxable: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 7, rowGap: 4, paddingTop: 4 },
  taxableLabel: { color: colors.muted, fontSize: 11 },
  taxableValue: { color: colors.ink, fontWeight: "800", fontSize: 12, marginRight: "auto" },
  choice: { minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  choiceText: { color: colors.ink, fontSize: 14, flex: 1 },
  chevron: { color: colors.muted, fontSize: 20, marginLeft: 10 },
  pickerRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  pickerTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  pickerMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
