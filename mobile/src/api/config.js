export const PRODUCTION_API_URL = "https://keyar-invoice-api.onrender.com/api/";

export function resolveApiBaseUrl(configuredUrl, appConfigUrl) {
  const apiUrl = configuredUrl || appConfigUrl || PRODUCTION_API_URL;
  return `${apiUrl.replace(/\/+$/, "")}/`;
}
