import { useEffect } from "react";
import { AlertCircle, Check, X } from "lucide-react";

export function Field({ label, name, value, onChange, type = "text", required = false, placeholder = "", options, rows, min, max, maxLength, inputMode, step, disabled, autoComplete }) {
  const common = {
    id: name, name, value: value ?? "", onChange,
    required, placeholder, disabled, min, max, maxLength, inputMode, step, autoComplete, className: "form-field",
    "aria-label": label,
  };
  return <label className="block">
    <span className="form-label">{label}{required && <span className="text-rose-600"> *</span>}</span>
    {options ? <select {...common}>
      <option value="">Select {label.toLowerCase()}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : rows ? <textarea {...common} rows={rows} /> : <input {...common} type={type} />}
  </label>;
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`} {...props}>{children}</button>;
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-keyar-500">{eyebrow}</p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}</div>
    {action}
  </div>;
}

export function Notice({ notice, clear }) {
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(clear, 4500);
    return () => clearTimeout(timer);
  }, [notice, clear]);
  if (!notice) return null;
  const positive = notice.type === "success";
  return <div role="status" className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${positive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
    {positive ? <Check size={18} /> : <AlertCircle size={18} />}
    <p className="flex-1 text-sm">{notice.message}</p>
    <button aria-label="Dismiss notification" onClick={clear}><X size={16} /></button>
  </div>;
}

export function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 id="modal-title" className="text-xl font-bold text-slate-900">{title}</h2><button aria-label="Close dialog" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

export function EmptyState({ title, description }) {
  return <div className="py-12 text-center"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function Loading({ label = "Loading your workspace…" }) {
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-keyar-100 border-t-keyar-700" />{label}</div>;
}
