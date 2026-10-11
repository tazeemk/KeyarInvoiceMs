import axios from "axios";

const api = axios.create({ baseURL: "/api/", timeout: 20000 });
let refreshing;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("keyar_access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retried && !original?.url?.includes("auth/token")) {
      const refresh = localStorage.getItem("keyar_refresh");
      if (refresh) {
        original._retried = true;
        try {
          refreshing ??= axios.post("/api/auth/token/refresh/", { refresh }).finally(() => { refreshing = undefined; });
          const { data } = await refreshing;
          localStorage.setItem("keyar_access", data.access);
          if (data.refresh) localStorage.setItem("keyar_refresh", data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("keyar_access");
          localStorage.removeItem("keyar_refresh");
          window.dispatchEvent(new Event("keyar:logout"));
        }
      }
    }
    return Promise.reject(error);
  },
);

export async function signIn(username, password) {
  const { data } = await axios.post("/api/auth/token/", { username, password });
  localStorage.setItem("keyar_access", data.access);
  localStorage.setItem("keyar_refresh", data.refresh);
}

export async function signOut() {
  const refresh = localStorage.getItem("keyar_refresh");
  let revocationError;
  if (refresh) {
    try { await api.post("auth/logout/", { refresh }); }
    catch (error) {
      if (![400, 401].includes(error.response?.status)) revocationError = error;
    }
  }
  localStorage.removeItem("keyar_access");
  localStorage.removeItem("keyar_refresh");
  if (revocationError) throw revocationError;
}

export async function downloadInvoicePdf(id, invoiceNumber) {
  const { data } = await api.get(`invoices/${id}/pdf/`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNumber.replaceAll("/", "-")}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default api;
