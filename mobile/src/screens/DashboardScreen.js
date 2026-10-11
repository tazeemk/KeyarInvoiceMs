import { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { Card, Empty, Header, Loading, Page } from "../components/UI";
import { colors } from "../theme";
import { getApiMessage, money } from "../utils/money";

function Metric({ label, value, accent }) {
  return <View style={[styles.metric, accent && styles.accentMetric]}><Text style={[styles.metricLabel, accent && styles.accentText]}>{label}</Text><Text style={[styles.metricValue, accent && styles.accentText]}>{value}</Text></View>;
}

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setBusy(true);
    try {
      const { data } = await api.get("dashboard/summary/");
      setSummary(data);
      setError("");
    } catch (issue) {
      setError(getApiMessage(issue));
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.teal} />}>
      <Header title="Good to see you" subtitle="Here’s the latest from your Keyar workspace." />
      {!!error && <Card><Text style={styles.error}>{error}</Text></Card>}
      {busy && !summary ? <Loading label="Loading your dashboard…" /> : summary && <>
        <View style={styles.grid}>
          <Metric label="Invoices" value={summary.invoice_count ?? 0} />
          <Metric label="Customers" value={summary.customer_count ?? 0} />
          <Metric label="This month" value={summary.month_invoice_count ?? 0} />
          <Metric label="Active products" value={summary.product_count ?? 0} />
        </View>
        <Card style={styles.revenue}>
          <Text style={styles.revenueLabel}>SALES THIS MONTH</Text>
          <Text style={styles.revenueValue}>{money(summary.month_revenue)}</Text>
          <View style={styles.divider} />
          <Text style={styles.totalLabel}>All-time sales <Text style={styles.totalValue}>{money(summary.total_revenue)}</Text></Text>
        </Card>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Recent invoices</Text><Text onPress={() => navigation.navigate("InvoicesTab")} style={styles.link}>View all</Text></View>
        {(summary.recent_invoices || []).length ? summary.recent_invoices.map((invoice) => (
          <Card key={invoice.id} onPress={() => navigation.navigate("InvoicesTab", { invoiceId: invoice.id })} style={styles.invoice}>
            <View style={styles.invoiceTop}><Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text><Text style={styles.invoiceTotal}>{money(invoice.grand_total)}</Text></View>
            <Text style={styles.customer}>{invoice.customer_name}</Text>
            <Text style={styles.date}>{invoice.invoice_date} · {invoice.place_of_supply || "Place of supply not set"}</Text>
          </Card>
        )) : <Empty title="No invoices yet" subtitle="Create an invoice to see your recent sales here." />}
      </>}
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  metric: { width: "48%", flexGrow: 1, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 100, justifyContent: "space-between" },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  accentMetric: { backgroundColor: colors.teal, borderColor: colors.teal },
  accentText: { color: colors.white },
  revenue: { backgroundColor: colors.navy, borderColor: colors.navy, padding: 20 },
  revenueLabel: { color: "#c6d9e8", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  revenueValue: { color: colors.white, fontSize: 31, fontWeight: "800", marginTop: 7 },
  divider: { height: 1, backgroundColor: "#ffffff30", marginVertical: 15 },
  totalLabel: { color: "#c6d9e8", fontSize: 13 },
  totalValue: { color: colors.white, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 },
  sectionTitle: { fontSize: 17, color: colors.ink, fontWeight: "800" },
  link: { color: colors.teal, fontWeight: "700", fontSize: 13, padding: 5 },
  invoice: { padding: 14, gap: 5 },
  invoiceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invoiceNumber: { color: colors.navy, fontWeight: "800", fontSize: 14 },
  invoiceTotal: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  customer: { color: colors.ink, fontSize: 14 },
  date: { color: colors.muted, fontSize: 12 },
  error: { color: colors.red, fontSize: 13 },
});
