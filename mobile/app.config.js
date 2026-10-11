export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    "expo-secure-store",
    "expo-sharing",
    "expo-status-bar",
    ["expo-build-properties", {
      android: {
        usesCleartextTraffic: (process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl || "").startsWith("http://"),
      },
    }],
  ],
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl || "http://10.0.2.2:8000/api/",
  },
});
