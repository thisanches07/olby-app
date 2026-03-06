import { Stack } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
