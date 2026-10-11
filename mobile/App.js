import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import DashboardScreen from "./src/screens/DashboardScreen";
import InvoiceDetailsScreen, { InvoiceFormScreen, InvoiceListScreen } from "./src/screens/InvoicesScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MoreScreen from "./src/screens/MoreScreen";
import RecordsScreen from "./src/screens/RecordsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import UsersScreen from "./src/screens/UsersScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tabConfig = {
  Overview: { label: "Home", glyph: "⌂" },
  Customers: { label: "Customers", glyph: "◉" },
  Products: { label: "Products", glyph: "▦" },
  InvoicesTab: { label: "Invoices", glyph: "▤" },
  More: { label: "More", glyph: "•••" },
};

function WorkspaceTabs() {
  const { user } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginBottom: 2 },
        tabBarStyle: { height: 63, paddingTop: 7, borderTopColor: colors.line, backgroundColor: colors.white },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: route.name === "More" ? 16 : 22, lineHeight: 24, color, fontWeight: "700" }}>{tabConfig[route.name].glyph}</Text>,
      })}
    >
      <Tabs.Screen name="Overview" component={DashboardScreen} options={{ title: tabConfig.Overview.label }} />
      <Tabs.Screen name="Customers" options={{ title: tabConfig.Customers.label }}>{(props) => <RecordsScreen {...props} kind="customers" />}</Tabs.Screen>
      <Tabs.Screen name="Products" options={{ title: tabConfig.Products.label }}>{(props) => <RecordsScreen {...props} kind="products" />}</Tabs.Screen>
      <Tabs.Screen name="InvoicesTab" options={{ title: tabConfig.InvoicesTab.label }}>
        {(props) => <InvoiceListScreen {...props} />}
      </Tabs.Screen>
      <Tabs.Screen name="More" component={MoreScreen} options={{ title: tabConfig.More.label }} />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.teal} /><Text style={styles.loadingText}>Opening Keyar workspace…</Text></View>;
  }
  return (
    <NavigationContainer theme={DefaultTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: colors.canvas },
      }}>
        {user ? <>
          <Stack.Screen name="Workspace" component={WorkspaceTabs} options={{ headerShown: false }} />
          <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          {isAdmin && <Stack.Screen name="Users" component={UsersScreen} options={{ headerShown: false }} />}
        </> : <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, animationTypeForReplace: "pop" }} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><AppNavigator /></AuthProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.canvas },
  loadingText: { color: colors.muted, fontSize: 13 },
});
