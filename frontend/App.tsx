import React from "react";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/Appnavigator";

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
