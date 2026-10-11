import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, BadgeIndianRupee, Bell, Boxes,
  Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList,
  FilePlus2, FileText, LayoutDashboard, LogOut, Menu, Package, PanelLeftClose, Pencil,
  Plus, Search, Settings, ShieldCheck, Trash2, UserRound, Users, X,
} from "lucide-react";
import api, { downloadInvoicePdf, signIn, signOut } from "./api";
import { calculateInvoice } from "./invoiceMath";
import { Button, EmptyState, Field, Loading, Modal, Notice, PageHeader } from "./components/ui";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const today = () => new Date().toLocaleDateString("en-CA");
async function fetchAll(path) {
  const first = await api.get(path);
  if (Array.isArray(first.data)) return first.data;
  const { count, results } = first.data;
  if (!results?.length || results.length >= count) return results || [];
  const pageSize = results.length;
  const pageCount = Math.ceil(count / pageSize);
  const separator = path.includes("?") ? "&" : "?";
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => api.get(`${path}${separator}page=${index + 2}`)),
  );
  return results.concat(...rest.map((response) => response.data.results || []));
}
const errorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat(Infinity).find((value) => typeof value === "string");
    if (first) return first;
  }
  return error.message || "Something went wrong. Please try again.";
};

const navigation = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "customers", label: "Customers", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "users", label: "Team members", icon: UserRound, admin: true },
  { id: "settings", label: "Company settings", icon: Settings, admin: true },
];

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      await signIn(form.username, form.password);
      await onLogin();
    } catch (issue) {
      setError(issue.response?.status === 401 ? "The username or password is incorrect." : errorMessage(issue));
    } finally {
      setWorking(false);
    }
  }
  return <main className="flex min-h-screen bg-white">
    <section className="flex w-full items-center justify-center px-6 py-12 lg:w-[48%]">
      <div className="w-full max-w-md">
        <div className="mb-12 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-keyar-900 text-xl font-black tracking-tight text-white">K</div><div><p className="text-xl font-extrabold tracking-tight text-keyar-900">KEYAR</p><p className="text-xs font-medium text-slate-500">Invoice management</p></div></div>
        <p className="mb-2 text-sm font-semibold text-keyar-700">NAMASTE SS INTERNATIONAL PVT. LTD.</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to manage your invoices, customers, and product catalog.</p>
        {error && <div role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Username" name="username" value={form.username} required autoComplete="username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Field label="Password" name="password" type="password" value={form.password} required autoComplete="current-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" disabled={working} className="w-full">{working ? "Signing in…" : "Sign in securely"}</Button>
        </form>
        <p className="mt-6 text-xs text-slate-400">Access is managed by your Keyar administrator.</p>
      </div>
    </section>
    <aside className="relative hidden flex-1 overflow-hidden bg-keyar-900 p-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-28 -top-20 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-8 top-28 h-72 w-72 rounded-full border border-white/10" />
      <div className="relative max-w-lg pt-24"><div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em]">Built for your business</div>
        <h2 className="text-5xl font-bold leading-[1.12] tracking-tight">Clear books.<br />Confident business.</h2>
        <p className="mt-6 max-w-md text-base leading-7 text-blue-100/80">Create GST-ready invoices, keep customer and product records in order, and see your business at a glance.</p></div>
      <div className="relative flex items-center gap-3 text-xs text-blue-100/70"><ShieldCheck size={16} /> Protected workspace · Role-based access · GST calculations</div>
    </aside>
  </main>;
}

function Sidebar({ page, setPage, user, logout, open, close }) {
  return <>
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={close} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-keyar-900 text-lg font-black text-white">K</div><div><p className="font-extrabold tracking-tight text-keyar-900">KEYAR</p><p className="text-[10px] text-slate-500">NAMASTE SS INTERNATIONAL</p></div></div>
        <button aria-label="Close navigation" onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Workspace</p>
        {navigation.filter((item) => !item.admin || user?.role_display === "Admin").map(({ id, label, icon: Icon }) =>
          <button key={id} onClick={() => { setPage(id); close(); }} aria-current={page === id ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${page === id ? "bg-keyar-50 text-keyar-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
            <Icon size={18} strokeWidth={page === id ? 2.3 : 1.8} />{label}{page === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-keyar-500" />}
          </button>)}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-keyar-100 text-sm font-bold text-keyar-900">{(user?.first_name || user?.username || "K").slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{user?.first_name || user?.username}</p><p className="text-xs text-slate-500">{user?.role_display}</p></div>
          <button onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><LogOut size={17} /></button>
        </div>
      </div>
    </aside>
  </>;
}

function DataTable({ columns, rows, empty, rowKey = "id" }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead><tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{columns.map((column) => <th key={column.label} className="px-4 py-3 first:pl-2">{column.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-50">
        {rows.length ? rows.map((row) => <tr key={row[rowKey]} className="group hover:bg-slate-50/70">{columns.map((column) => <td key={column.label} className="px-4 py-3.5 first:pl-2 align-middle">{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)
          : <tr><td colSpan={columns.length}><EmptyState title={empty.title} description={empty.description} /></td></tr>}
      </tbody>
    </table>
  </div>;
}

function Dashboard({ summary, goInvoices, goCreate }) {
  const cards = [
    { label: "Invoices this month", value: summary.month_invoice_count || 0, icon: FileText, tint: "bg-blue-50 text-blue-700", note: "Issued this month" },
    { label: "Revenue this month", value: money(summary.month_revenue), icon: BadgeIndianRupee, tint: "bg-emerald-50 text-emerald-700", note: "Based on invoice date" },
    { label: "Customers", value: summary.customer_count || 0, icon: Users, tint: "bg-violet-50 text-violet-700", note: "In your customer book" },
    { label: "Active products", value: summary.product_count || 0, icon: Boxes, tint: "bg-amber-50 text-amber-700", note: "Ready to invoice" },
  ];
  const max = Math.max(...(summary.monthly || []).map((month) => Number(month.total)), 1);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return <div>
    <PageHeader eyebrow="Your workspace" title="Good business starts here." description="A current view of your invoices, customers, and revenue."
      action={<Button onClick={goCreate}><Plus size={17} /> Create invoice</Button>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tint, note }) => <div key={label} className="card">
        <div className="flex items-start justify-between"><div className={`rounded-lg p-2.5 ${tint}`}><Icon size={19} /></div><ArrowUpRight size={17} className="text-slate-300" /></div>
        <p className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-xs text-slate-400">{note}</p>
      </div>)}
    </div>
    <div className="mb-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="card">
        <div className="mb-6 flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Revenue overview</h2><p className="mt-1 text-xs text-slate-500">Invoice totals by month · {new Date().getFullYear()}</p></div><Activity size={19} className="text-keyar-500" /></div>
        <div className="flex h-44 items-end gap-2 sm:gap-4">
          {months.map((month, index) => {
            const record = (summary.monthly || []).find((entry) => Number(entry.invoice_date__month) === index + 1);
            const height = record ? Math.max(8, Number(record.total) / max * 100) : 4;
            return <div key={month} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={record ? money(record.total) : "No invoices"}>
              <div className={`w-full max-w-9 rounded-t-md transition-all ${record ? "bg-keyar-500 hover:bg-keyar-700" : "bg-slate-100"}`} style={{ height: `${height}%` }} />
              <span className="text-[10px] text-slate-400">{month}</span>
            </div>;
          })}
        </div>
      </section>
      <section className="card flex flex-col justify-between bg-keyar-900 text-white">
        <div><span className="inline-flex rounded-full bg-white/10 p-2.5"><ClipboardList size={20} /></span><p className="mt-5 text-sm font-medium text-blue-100">All-time invoiced</p><p className="mt-1 text-3xl font-bold tracking-tight">{money(summary.total_revenue)}</p>
          <p className="mt-3 text-xs leading-5 text-blue-100/75">{summary.invoice_count || 0} invoices recorded across your Keyar workspace.</p></div>
        <button onClick={goInvoices} className="mt-8 flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-100">Explore invoices <ChevronRight size={16} /></button>
      </section>
    </div>
    <section className="card">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent invoices</h2><p className="mt-1 text-xs text-slate-500">The latest activity in your workspace</p></div><button onClick={goInvoices} className="text-sm font-semibold text-keyar-700 hover:text-keyar-900">View all</button></div>
      <DataTable columns={[
        { label: "Invoice", render: (row) => <span className="font-semibold text-keyar-900">{row.invoice_number}</span> },
        { label: "Customer", render: (row) => row.customer_name },
        { label: "Date", render: (row) => new Date(`${row.invoice_date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
        { label: "Amount", render: (row) => <span className="font-semibold text-slate-800">{money(row.grand_total)}</span> },
      ]} rows={summary.recent_invoices || []} empty={{ title: "No invoices yet", description: "Create your first tax invoice to see it here." }} />
    </section>
  </div>;
}

const CUSTOMER_FIELDS = [
  { name: "name", label: "Customer name" }, { name: "gstin", label: "GSTIN" },
  { name: "address", label: "Address", rows: 2 }, { name: "state", label: "State" },
  { name: "state_code", label: "State code", placeholder: "Two-digit code" },
  { name: "mobile", label: "Mobile number" },
];
const PRODUCT_FIELDS = [
  { name: "name", label: "Product name" }, { name: "hsn_code", label: "HSN code" },
  { name: "size", label: "Pack / size" }, { name: "colour", label: "Colour" },
  { name: "unit", label: "Unit" }, { name: "default_price", label: "Default rate (INR)", type: "number" },
  { name: "gst_rate", label: "GST rate (%)", type: "number" },
];

function ManagedRecords({ kind, notify }) {
  const isCustomer = kind === "customers";
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const fields = isCustomer ? CUSTOMER_FIELDS : PRODUCT_FIELDS;
  const endpoint = isCustomer ? "customers/" : "products/";
  const title = isCustomer ? "Customers" : "Product catalogue";
  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await fetchAll(`${endpoint}?search=${encodeURIComponent(search)}`)); }
    catch (error) { notify("error", errorMessage(error)); }
    finally { setBusy(false); }
  }, [endpoint, search, notify]);
  useEffect(() => { load(); }, [load]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...editing };
    if (!isCustomer) {
      payload.default_price = Number(payload.default_price);
      payload.gst_rate = Number(payload.gst_rate);
    }
    try {
      if (editing.id) await api.patch(`${endpoint}${editing.id}/`, payload);
      else await api.post(endpoint, payload);
      notify("success", `${isCustomer ? "Customer" : "Product"} ${editing.id ? "updated" : "added"}.`);
      setEditing(null);
      await load();
    } catch (error) { notify("error", errorMessage(error)); }
    finally { setSaving(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete ${isCustomer ? "customer" : "product"} "${row.name}"?`)) return;
    try { await api.delete(`${endpoint}${row.id}/`); notify("success", "Record deleted."); await load(); }
    catch (error) { notify("error", errorMessage(error)); }
  }
  const columns = isCustomer ? [
    { label: "Customer", render: (row) => <div><p className="font-semibold text-slate-800">{row.name}</p><p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">{row.address}</p></div> },
    { label: "GSTIN", render: (row) => row.gstin || <span className="text-slate-400">Unregistered</span> },
    { label: "State", render: (row) => `${row.state} · ${row.state_code}` },
    { label: "Mobile", key: "mobile" },
  ] : [
    { label: "Product", render: (row) => <div><p className="font-semibold text-slate-800">{row.name}</p><p className="mt-0.5 text-xs text-slate-400">{[row.size, row.colour].filter(Boolean).join(" · ")}</p></div> },
    { label: "HSN / SAC", key: "hsn_code" },
    { label: "Default rate", render: (row) => money(row.default_price) },
    { label: "GST", render: (row) => `${row.gst_rate}%` },
    { label: "Unit", key: "unit" },
  ];
  columns.push({ label: "Actions", render: (row) => <div className="flex items-center gap-1"><button aria-label={`Edit ${row.name}`} onClick={() => setEditing({ ...row })} className="rounded-lg p-2 text-slate-400 hover:bg-keyar-50 hover:text-keyar-800"><Pencil size={16} /></button><button aria-label={`Delete ${row.name}`} onClick={() => remove(row)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></div> });
  return <>
    <PageHeader eyebrow="Manage your records" title={title} description={isCustomer ? "Keep billing details and GST registration ready for invoicing." : "Set product details, HSN codes, units, rates, and GST defaults."}
      action={<Button onClick={() => setEditing(isCustomer ? { name: "", address: "", gstin: "", state: "", state_code: "", mobile: "" } : { name: "", hsn_code: "", size: "", colour: "", unit: "PCS", default_price: "", gst_rate: "18.00", active: true })}><Plus size={17} /> Add {isCustomer ? "customer" : "product"}</Button>} />
    <section className="card">
      <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={16} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${isCustomer ? "customers by name, GSTIN, or mobile" : "products by name or HSN"}`} aria-label={`Search ${title.toLowerCase()}`} className="h-10 w-full text-sm outline-none" /></div>
      {busy ? <Loading label={`Loading ${title.toLowerCase()}…`} /> : <DataTable columns={columns} rows={rows} empty={{ title: `No ${isCustomer ? "customers" : "products"} found`, description: "Add a record or change your search." }} />}
    </section>
    {editing && <Modal title={`${editing.id ? "Edit" : "Add"} ${isCustomer ? "customer" : "product"}`} onClose={() => setEditing(null)}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => <div key={field.name} className={field.rows || field.name === "address" ? "sm:col-span-2" : ""}><Field {...field} value={editing[field.name]} onChange={(event) => setEditing({ ...editing, [field.name]: event.target.value })} /></div>)}
        {!isCustomer && editing.id && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Available for new invoices</label>}
        <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save record"}</Button></div>
      </form>
    </Modal>}
  </>;
}

function InvoiceEditor({ invoice, customers, products, company, onClose, onSaved, notify }) {
  const initial = invoice ? {
    customer: String(invoice.customer), invoice_date: invoice.invoice_date, due_date: invoice.due_date || "",
    vehicle_number: invoice.vehicle_number || "", mobile_number: invoice.mobile_number || "", notes: invoice.notes || "",
    items: invoice.lines.map((line) => ({ product: String(line.product_id), quantity: line.quantity, rate: line.rate, gst_rate: line.gst_rate ?? "" })),
  } : { customer: "", invoice_date: today(), due_date: "", vehicle_number: "", mobile_number: "", notes: "", items: [{ product: "", quantity: "1", rate: "", gst_rate: "" }] };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const customer = customers.find((item) => String(item.id) === form.customer);
  const interstate = Boolean(customer && company && customer.state_code !== company.state_code);
  const enriched = form.items.map((line) => {
    const product = products.find((entry) => String(entry.id) === line.product);
    return { ...line, gst_rate: Number(line.gst_rate ?? product?.gst_rate ?? 0) };
  });
  const totals = useMemo(() => calculateInvoice(enriched, interstate), [form.items, products, interstate]);
  function setItem(index, key, value) {
    setForm((current) => ({ ...current, items: current.items.map((line, i) => i === index ? { ...line, [key]: value } : line) }));
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      customer: Number(form.customer), invoice_date: form.invoice_date, due_date: form.due_date || null,
      vehicle_number: form.vehicle_number, mobile_number: form.mobile_number, notes: form.notes,
      items: form.items.map((line) => {
        const product = products.find((entry) => String(entry.id) === line.product);
        return {
          product: Number(line.product),
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          gst_rate: Number(line.gst_rate ?? product?.gst_rate ?? 0),
        };
      }),
    };
    try {
      if (invoice) await api.patch(`invoices/${invoice.id}/`, payload);
      else await api.post("invoices/", payload);
      notify("success", `Invoice ${invoice ? "updated" : "created"} successfully.`);
      await onSaved();
      onClose();
    } catch (error) { notify("error", errorMessage(error)); }
    finally { setSaving(false); }
  }
  return <Modal title={invoice ? `Edit ${invoice.invoice_number}` : "Create tax invoice"} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer" name="customer" value={form.customer} options={customers.map((item) => ({ value: item.id, label: `${item.name} · ${item.state_code}` }))} onChange={(event) => setForm({ ...form, customer: event.target.value })} />
        <Field label="Invoice date" name="invoice_date" type="date" value={form.invoice_date} onChange={(event) => setForm({ ...form, invoice_date: event.target.value })} />
        <Field label="Due date" name="due_date" type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
        <Field label="Vehicle number" name="vehicle_number" value={form.vehicle_number} onChange={(event) => setForm({ ...form, vehicle_number: event.target.value })} />
        <Field label="Mobile number" name="mobile_number" value={form.mobile_number || customer?.mobile} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} />
        <div className="flex items-end pb-2 text-xs text-slate-500">{customer ? <span className="rounded-md bg-keyar-50 px-2.5 py-2 text-keyar-800">Place of supply: {customer.state} · {interstate ? "IGST" : "CGST + SGST"}</span> : "Tax type follows the customer state."}</div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[660px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{["Product", "Qty", "Rate (INR)", "GST", "Taxable"].map((name) => <th key={name} className="px-3 py-2.5">{name}</th>)}<th className="px-3 py-2.5"><span className="sr-only">Remove</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {form.items.map((line, index) => {
              const product = products.find((entry) => String(entry.id) === line.product);
              return <tr key={index}>
                <td className="px-2 py-2"><select aria-label={`Product ${index + 1}`} className="form-field min-w-48 py-2" value={line.product} onChange={(event) => {
                  const chosen = products.find((entry) => String(entry.id) === event.target.value);
                  setForm((current) => ({ ...current, items: current.items.map((currentLine, i) => i === index ? {
                    ...currentLine,
                    product: event.target.value,
                    rate: chosen ? String(chosen.default_price) : currentLine.rate,
                    gst_rate: chosen ? String(chosen.gst_rate) : currentLine.gst_rate,
                  } : currentLine) }));
                }}><option value="">Choose product</option>{products.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.hsn_code}</option>)}</select></td>
                <td className="px-2 py-2"><input aria-label={`Quantity ${index + 1}`} type="number" className="form-field w-24 py-2" value={line.quantity} onChange={(event) => setItem(index, "quantity", event.target.value)} /></td>
                <td className="px-2 py-2"><input aria-label={`Rate ${index + 1}`} type="number" className="form-field w-28 py-2" value={line.rate} onChange={(event) => setItem(index, "rate", event.target.value)} /></td>
                <td className="px-2 py-2"><input aria-label={`GST ${index + 1}`} type="number" className="form-field w-24 py-2" value={line.gst_rate ?? product?.gst_rate ?? 0} onChange={(event) => setItem(index, "gst_rate", event.target.value)} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{money(Number(line.quantity || 0) * Number(line.rate || 0))}</td>
                <td className="px-2 py-2"><button type="button" aria-label={`Remove product ${index + 1}`} disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={15} /></button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product: "", quantity: "1", rate: "", gst_rate: "" }] })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-keyar-700 hover:text-keyar-900"><Plus size={15} /> Add another product</button>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Invoice notes" name="notes" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">Taxable value</span><b>{money(totals.taxable)}</b></div>
          {interstate ? <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">IGST</span><b>{money(totals.igst)}</b></div> : <>
            <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">CGST</span><b>{money(totals.cgst)}</b></div>
            <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">SGST</span><b>{money(totals.sgst)}</b></div>
          </>}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Grand total</span><span className="text-keyar-900">{money(totals.total)}</span></div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !customers.length || !products.length}>{saving ? "Saving…" : invoice ? "Save changes" : "Create invoice"}</Button></div>
      {(!customers.length || !products.length) && <p className="mt-3 text-right text-xs text-amber-700">Add at least one customer and active product before creating an invoice.</p>}
    </form>
  </Modal>;
}

function InvoicesPage({ notify, onCreate, refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const load = useCallback(async () => {
    setBusy(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    try { setRows(await fetchAll(`invoices/?${params}`)); }
    catch (error) { notify("error", errorMessage(error)); }
    finally { setBusy(false); }
  }, [search, range, notify]);
  useEffect(() => { load(); }, [load, refreshSignal]);
  async function openEditor(invoice) {
    try {
      const [customerResult, productResult, settingsResult] = await Promise.all([
        fetchAll("customers/"), fetchAll("products/?active=true"), api.get("settings/"),
      ]);
      setCustomers(customerResult);
      setProducts(productResult);
      setCompany(settingsResult.data);
      setEditing(invoice ? (await api.get(`invoices/${invoice.id}/`)).data : {});
    } catch (error) { notify("error", errorMessage(error)); }
  }
  async function openDetails(row) {
    try { setSelected((await api.get(`invoices/${row.id}/`)).data); }
    catch (error) { notify("error", errorMessage(error)); }
  }
  async function printPdf(invoice) {
    try {
      const { data } = await api.get(`invoices/${invoice.id}/pdf/`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const printWindow = window.open(url, "_blank");
      if (!printWindow) { await downloadInvoicePdf(invoice.id, invoice.invoice_number); return; }
      printWindow.addEventListener("load", () => printWindow.print(), { once: true });
    } catch (error) { notify("error", errorMessage(error)); }
  }
  async function remove(invoice) {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? This action cannot be undone.`)) return;
    try { await api.delete(`invoices/${invoice.id}/`); notify("success", "Invoice deleted."); setSelected(null); await load(); }
    catch (error) { notify("error", errorMessage(error)); }
  }
  return <>
    <PageHeader eyebrow="Sales & billing" title="Invoices" description="Create, review, download, and print your GST tax invoices."
      action={<Button onClick={onCreate}><Plus size={17} /> Create invoice</Button>} />
    <section className="card">
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_170px]">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={16} className="text-slate-400" /><input aria-label="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice number or customer" className="h-10 w-full text-sm outline-none" /></div>
        <Field label="From" name="from-date" type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
        <Field label="To" name="to-date" type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
      </div>
      {busy ? <Loading label="Loading invoices…" /> : <DataTable columns={[
        { label: "Invoice", render: (row) => <button onClick={() => openDetails(row)} className="font-semibold text-keyar-800 hover:underline">{row.invoice_number}</button> },
        { label: "Customer", render: (row) => row.customer_name },
        { label: "Invoice date", render: (row) => new Date(`${row.invoice_date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
        { label: "Amount", render: (row) => <span className="font-semibold">{money(row.grand_total)}</span> },
        { label: "Actions", render: (row) => <div className="flex gap-1"><button aria-label={`View ${row.invoice_number}`} onClick={() => openDetails(row)} className="rounded-lg p-2 text-slate-400 hover:bg-keyar-50 hover:text-keyar-800"><FileText size={16} /></button><button aria-label={`Download ${row.invoice_number}`} onClick={() => downloadInvoicePdf(row.id, row.invoice_number).catch((error) => notify("error", errorMessage(error)))} className="rounded-lg p-2 text-slate-400 hover:bg-keyar-50 hover:text-keyar-800"><ArrowDownToLine size={16} /></button></div> },
      ]} rows={rows} empty={{ title: "No invoices found", description: "Create an invoice or adjust the search and date filters." }} />}
    </section>
    {editing && <InvoiceEditor invoice={editing.id ? editing : null} customers={customers} products={products} company={company} onClose={() => setEditing(null)} onSaved={load} notify={notify} />}
    {selected && <Modal title={selected.invoice_number} onClose={() => setSelected(null)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-sm text-slate-500">Tax invoice for</p><h3 className="mt-1 text-lg font-bold text-slate-900">{selected.customer_name}</h3><p className="mt-1 text-xs text-slate-500">{selected.place_of_supply} · {selected.invoice_date}</p></div><p className="text-right text-2xl font-bold text-keyar-900">{money(selected.grand_total)}</p></div>
      <div className="overflow-x-auto rounded-lg border border-slate-100"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3">GST</th><th className="px-3 py-3 text-right">Taxable</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.lines.map((line) => <tr key={line.id}><td className="px-3 py-3"><p className="font-medium">{line.description}</p><p className="text-xs text-slate-400">HSN {line.hsn_code}</p></td><td className="px-3 py-3">{line.quantity} {line.unit}</td><td className="px-3 py-3">{money(line.rate)}</td><td className="px-3 py-3">{line.gst_rate}%</td><td className="px-3 py-3 text-right">{money(line.taxable_value)}</td></tr>)}</tbody></table></div>
      <div className="ml-auto mt-4 max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Taxable amount</span><b>{money(selected.taxable_total)}</b></div>{selected.igst_total > 0 ? <div className="flex justify-between"><span className="text-slate-500">IGST</span><b>{money(selected.igst_total)}</b></div> : <><div className="flex justify-between"><span className="text-slate-500">CGST</span><b>{money(selected.cgst_total)}</b></div><div className="flex justify-between"><span className="text-slate-500">SGST</span><b>{money(selected.sgst_total)}</b></div></>}<div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span>{money(selected.grand_total)}</span></div></div>
      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><b>Amount in words:</b> {selected.amount_in_words}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => printPdf(selected)}>Print</Button><Button variant="secondary" onClick={() => downloadInvoicePdf(selected.id, selected.invoice_number).catch((error) => notify("error", errorMessage(error)))}><ArrowDownToLine size={16} /> Download PDF</Button><Button variant="secondary" onClick={async () => { setSelected(null); await openEditor(selected); }}><Pencil size={16} /> Edit</Button><Button variant="secondary" className="text-rose-700 hover:bg-rose-50" onClick={() => remove(selected)}><Trash2 size={16} /> Delete</Button></div>
    </Modal>}
  </>;
}

function UsersPage({ notify, currentUser }) {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try { setUsers(await fetchAll("users/")); }
    catch (error) { notify("error", errorMessage(error)); }
    finally { setBusy(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...editing };
    if (!payload.password) delete payload.password;
    try {
      if (editing.id) await api.patch(`users/${editing.id}/`, payload);
      else await api.post("users/", payload);
      notify("success", `Team member ${editing.id ? "updated" : "created"}.`);
      setEditing(null);
      await load();
    } catch (error) { notify("error", errorMessage(error)); }
    finally { setSaving(false); }
  }
  async function deactivate(user) {
    if (!window.confirm(`Deactivate ${user.username}?`)) return;
    try { await api.delete(`users/${user.id}/`); notify("success", "Account deactivated."); await load(); }
    catch (error) { notify("error", errorMessage(error)); }
  }
  return <>
    <PageHeader eyebrow="Access control" title="Team members" description="Manage user access and assign Admin or Staff roles."
      action={<Button onClick={() => setEditing({ username: "", email: "", first_name: "", last_name: "", role: "Staff", password: "", is_active: true })}><Plus size={17} /> Add user</Button>} />
    <section className="card">
      {busy ? <Loading label="Loading team members…" /> : <DataTable columns={[
        { label: "Member", render: (user) => <div><p className="font-semibold">{user.first_name || user.username} {user.last_name}</p><p className="text-xs text-slate-400">{user.email || user.username}</p></div> },
        { label: "Role", render: (user) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.role_display === "Admin" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.role_display}</span> },
        { label: "Status", render: (user) => <span className={`inline-flex items-center gap-1.5 text-xs ${user.is_active ? "text-emerald-700" : "text-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />{user.is_active ? "Active" : "Inactive"}</span> },
        { label: "Actions", render: (user) => <div className="flex gap-1">{user.id !== currentUser.id && <><button aria-label={`Edit ${user.username}`} onClick={() => setEditing({ ...user, role: user.role_display, password: "" })} className="rounded-lg p-2 text-slate-400 hover:bg-keyar-50 hover:text-keyar-800"><Pencil size={16} /></button><button aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.username}`} onClick={() => user.is_active ? deactivate(user) : api.patch(`users/${user.id}/`, { is_active: true }).then(load).catch((error) => notify("error", errorMessage(error)))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700">{user.is_active ? <Trash2 size={16} /> : <Check size={16} />}</button></>}</div> },
      ]} rows={users} empty={{ title: "No team members yet", description: "Create a Staff or Admin account to grant workspace access." }} />}
    </section>
    {editing && <Modal title={editing.id ? "Edit team member" : "Add team member"} onClose={() => setEditing(null)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="Username" name="username" value={editing.username} required onChange={(event) => setEditing({ ...editing, username: event.target.value })} />
      <Field label="Email" name="email" type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
      <Field label="First name" name="first_name" value={editing.first_name} onChange={(event) => setEditing({ ...editing, first_name: event.target.value })} />
      <Field label="Last name" name="last_name" value={editing.last_name} onChange={(event) => setEditing({ ...editing, last_name: event.target.value })} />
      <Field label="Role" name="role" value={editing.role} required options={[{ value: "Staff", label: "Staff" }, { value: "Admin", label: "Admin" }]} onChange={(event) => setEditing({ ...editing, role: event.target.value })} />
      <Field label={editing.id ? "New password (optional)" : "Temporary password"} name="password" type="password" value={editing.password} required={!editing.id} onChange={(event) => setEditing({ ...editing, password: event.target.value })} />
      {editing.id && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })} /> Account active</label>}
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save user"}</Button></div>
    </form></Modal>}
  </>;
}

const SETTING_FIELDS = [
  ["company_name", "Registered company name", "text", true], ["brand_name", "Brand name", "text", true],
  ["address", "Registered address", "textarea", true], ["gstin", "Company GSTIN", "text", true],
  ["state", "Supplier state", "text", true], ["state_code", "Supplier state code", "text", true],
  ["phone", "Company phone", "text", false], ["email", "Accounts email", "email", false],
  ["invoice_prefix", "Invoice number prefix", "text", true],
  ["bank_name", "Bank name", "text", false], ["bank_account", "Bank account number", "text", false],
  ["bank_ifsc", "Bank IFSC", "text", false], ["bank_branch", "Bank branch", "text", false],
  ["footer_text", "Invoice footer", "text", false],
];

function SettingsPage({ notify }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get("settings/").then(({ data }) => setForm(data)).catch((error) => notify("error", errorMessage(error))).finally(() => setBusy(false));
  }, [notify]);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("settings/", form);
      setForm(data);
      setSaved(true);
      notify("success", "Company settings saved.");
    } catch (error) { notify("error", errorMessage(error)); }
    finally { setSaving(false); }
  }
  if (busy || !form) return <Loading label="Loading company settings…" />;
  return <>
    <PageHeader eyebrow="Business profile" title="Company settings" description="Maintain the supplier identity and banking details shown on invoices." />
    {form.is_sample && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Sample company profile:</b> update and verify company GSTIN, address, phone, bank account, and IFSC before issuing invoices.</div>}
    <form onSubmit={submit} className="space-y-5">
      <section className="card"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-keyar-50 p-2.5 text-keyar-700"><Building2 size={19} /></div><div><h2 className="font-bold">Business identity</h2><p className="text-xs text-slate-500">Used for tax calculation, invoice branding, and supplier details.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SETTING_FIELDS.slice(0, 9).map(([name, label, type, required]) => <div key={name} className={type === "textarea" ? "sm:col-span-2" : ""}><Field label={label} name={name} type={type === "textarea" ? "text" : type} rows={type === "textarea" ? 3 : undefined} value={form[name]} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /></div>)}
          <div className="sm:col-span-2 lg:col-span-3"><span className="form-label">Company logo</span><div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-slate-300 p-4">
            {form.logo_data ? <img src={form.logo_data} alt="Company logo preview" className="h-14 max-w-40 object-contain" /> : <div className="flex h-14 w-28 items-center justify-center rounded-lg bg-keyar-50 text-sm font-extrabold tracking-wide text-keyar-900">{form.brand_name}</div>}
            <div className="flex-1"><input aria-label="Upload company logo" type="file" accept="image/png,image/jpeg" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-keyar-50 file:px-3 file:py-2 file:font-semibold file:text-keyar-800" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 1_000_000) { notify("error", "Logo images must be smaller than 1 MB."); event.target.value = ""; return; }
              const reader = new FileReader();
              reader.onload = () => setForm((current) => ({ ...current, logo_data: reader.result }));
              reader.onerror = () => notify("error", "Unable to read the selected logo.");
              reader.readAsDataURL(file);
            }} /><p className="mt-1.5 text-xs text-slate-400">PNG or JPEG, up to 1 MB. Printed in the invoice header.</p></div>
            {form.logo_data && <Button type="button" variant="secondary" onClick={() => setForm({ ...form, logo_data: "" })}>Remove logo</Button>}
          </div></div>
        </div>
      </section>
      <section className="card"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><BadgeIndianRupee size={19} /></div><div><h2 className="font-bold">Bank details & invoice footer</h2><p className="text-xs text-slate-500">Printed in the payment and signature section of the invoice PDF.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SETTING_FIELDS.slice(9).map(([name, label, type, required]) => <Field key={name} label={label} name={name} type={type} value={form[name]} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />)}</div>
      </section>
      <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm text-emerald-700">Changes saved</span>}<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></div>
    </form>
  </>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("keyar_access")));
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState(null);
  const [invoiceCreate, setInvoiceCreate] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [summary, setSummary] = useState({});
  const notify = useCallback((type, message) => setNotice({ type, message }), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const loadProfile = useCallback(async () => {
    const { data } = await api.get("auth/me/");
    setUser(data);
    return data;
  }, []);
  useEffect(() => {
    if (!localStorage.getItem("keyar_access")) return;
    loadProfile().catch(() => { signOut(); setUser(null); }).finally(() => setLoading(false));
    const logoutHandler = () => { setUser(null); setLoading(false); };
    window.addEventListener("keyar:logout", logoutHandler);
    return () => window.removeEventListener("keyar:logout", logoutHandler);
  }, [loadProfile]);
  const logout = useCallback(() => {
    signOut()
      .catch((error) => notify("error", `Signed out on this device, but the server could not revoke the refresh token: ${errorMessage(error)}`))
      .finally(() => { setUser(null); setPage("dashboard"); });
  }, [notify]);
  useEffect(() => {
    if (user) api.get("dashboard/summary/").then(({ data }) => setSummary(data)).catch((error) => notify("error", errorMessage(error)));
  }, [user, refreshSignal, notify]);

  async function afterLogin() {
    await loadProfile();
    setLoading(false);
    setPage("dashboard");
  }
  function changePage(nextPage) {
    setPage(nextPage);
    if (nextPage === "invoices") setRefreshSignal((value) => value + 1);
  }
  if (loading) return <Loading label="Opening your secure workspace…" />;
  if (!user) return <Login onLogin={afterLogin} />;

  return <div className="min-h-screen bg-[#f5f7f9]">
    <Sidebar page={page} setPage={changePage} user={user} logout={logout} open={mobileMenu} close={() => setMobileMenu(false)} />
    <div className="min-h-screen lg:pl-[260px]">
      <header className="no-print sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
          <div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{navigation.find((item) => item.id === page)?.label || "Workspace"}</p><p className="text-xs text-slate-400">Namaste SS International Pvt. Ltd.</p></div></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems ready</span><button aria-label="Notifications" title="No new notifications" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><Bell size={18} /></button><div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-keyar-100 text-sm font-bold text-keyar-900">{(user.first_name || user.username).slice(0, 1).toUpperCase()}</div></div>
      </header>
      {page === "settings" && user.role_display !== "Admin" ? <div className="m-7 card text-sm text-rose-700">Administrator access is required to view settings.</div> : <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9">
        {page === "dashboard" && <Dashboard summary={summary} goInvoices={() => changePage("invoices")} goCreate={() => setInvoiceCreate(true)} />}
        {(page === "customers" || page === "products") && <ManagedRecords key={page} kind={page} notify={notify} />}
        {page === "invoices" && <InvoicesPage notify={notify} onCreate={() => setInvoiceCreate(true)} refreshSignal={refreshSignal} />}
        {page === "users" && (user.role_display === "Admin" ? <UsersPage notify={notify} currentUser={user} /> : <div className="card text-sm text-rose-700">Administrator access is required to manage users.</div>)}
        {page === "settings" && user.role_display === "Admin" && <SettingsPage notify={notify} />}
      </main>}
    </div>
    {invoiceCreate && <CreateInvoiceGate companyNotify={notify} onClose={() => setInvoiceCreate(false)} onSaved={() => setRefreshSignal((value) => value + 1)} />}
    <Notice notice={notice} clear={clearNotice} />
  </div>;
}

function CreateInvoiceGate({ companyNotify, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([fetchAll("customers/"), fetchAll("products/?active=true"), api.get("settings/")])
      .then(([customers, products, company]) => setData({ customers, products, company: company.data }))
      .catch((issue) => setError(errorMessage(issue)));
  }, []);
  if (error) return <Modal title="Cannot create invoice" onClose={onClose}><div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div><div className="mt-4 flex justify-end"><Button onClick={onClose}>Close</Button></div></Modal>;
  if (!data) return <Modal title="Create tax invoice" onClose={onClose}><Loading label="Preparing customer and product lists…" /></Modal>;
  return <InvoiceEditor invoice={null} customers={data.customers} products={data.products} company={data.company} onClose={onClose} onSaved={onSaved} notify={companyNotify} />;
}
