import { useAuth } from "@/hooks/useAuth";
import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_400Regular_Italic,
  AtkinsonHyperlegible_700Bold,
  AtkinsonHyperlegible_700Bold_Italic,
  useFonts,
} from "@expo-google-fonts/atkinson-hyperlegible";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "../global.css";
import { useColorScheme } from "react-native";
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoggedIn, checkAuthStatus } = useAuth();
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_400Regular_Italic,
    AtkinsonHyperlegible_700Bold,
    AtkinsonHyperlegible_700Bold_Italic,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      colorScheme === 'dark' ? '#18181b' : '#ffffff'
    );
  }, [colorScheme]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <React.Fragment>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Protected guard={isLoggedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!isLoggedIn}>
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </React.Fragment>
      </SafeAreaProvider>
    </KeyboardProvider>
  );

}