import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import AnalyzeScreen from "../screens/AnalyzeScreen";
import ResultScreen from "../screens/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import HelpScreen from "../screens/HelpScreen";
import type { Analysis } from "../types";

// ── Tipos de navegación ──
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Analyze: undefined;
  Result: { result: Analysis };
  History: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  Help: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Verificar si hay token al arrancar
  useEffect(() => {
    const check = async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
    };
    check();
  }, []);

  // Escuchar cambios en el token (login/logout)
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await AsyncStorage.getItem("token");
      const loggedIn = !!token;
      setIsLoggedIn((prev) => {
        if (prev !== loggedIn) return loggedIn;
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoggedIn === null) return null; // Cargando

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen name="Analyze" component={AnalyzeScreen} />
      <MainStack.Screen name="Result" component={ResultScreen} />
      <MainStack.Screen name="History" component={HistoryScreen} />
      <MainStack.Screen name="Settings" component={SettingsScreen} />
      <MainStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
      />
      <MainStack.Screen name="Help" component={HelpScreen} />
    </MainStack.Navigator>
  );
}
