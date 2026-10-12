const productionApiUrl = "https://keyar-invoice-api.onrender.com/api/";

export default ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || productionApiUrl;

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      "expo-secure-store",
      "expo-sharing",
      "expo-status-bar",
      ["expo-build-properties", {
        android: {
          usesCleartextTraffic: apiUrl.startsWith("http://"),
        },
      }],
    ],
    extra: {
      ...config.extra,
      apiUrl,
    },
  };
};
