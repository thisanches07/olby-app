import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// expo-router v6 already calls preventAutoHideAsync() internally

import DevPanel from "@/app/dev/DevPanel";
import type { DevUser } from "@/constants/dev-users";
import { ToastProvider } from "@/components/obra/toast";
import { ProjectsProvider } from "@/contexts/projects-context";
import {
  SubscriptionProvider,
  useSubscription,
} from "@/contexts/subscription-context";
import { AppSessionProvider, useAppSession } from "@/hooks/use-app-session";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { setPlanErrorHandler } from "@/services/api";
import { loginWithEmail } from "@/services/auth.service";
import { pendingInviteToken } from "@/utils/pending-invite";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, registrationInProgress } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const onLoginPage = pathname === "/login";
    const onInvitePage = pathname === "/invite";

    // Convites sao publicos, a tela /invite gerencia seu proprio auth check
    if (!user && !onLoginPage && !onInvitePage) {
      router.replace("/login");
      return;
    }

    if (user && onLoginPage && !registrationInProgress) {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      pendingInviteToken.get().then((pending) => {
        if (pending) {
          void pendingInviteToken.clear();
          router.replace({ pathname: "/invite", params: { token: pending } });
        } else {
          router.replace("/(tabs)");
        }
        navigatingRef.current = false;
      });
    } else {
      navigatingRef.current = false;
    }
  }, [user, isLoading, pathname, router, registrationInProgress]);

  if (isLoading) {
    return (
      <View
        pointerEvents="auto"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#EFF6FF",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const onLoginPage = pathname === "/login";
  const onInvitePage = pathname === "/invite";

  // Evita renderizar telas protegidas por um frame antes do redirect.
  if (!user && !onLoginPage && !onInvitePage) return null;

  return <>{children}</>;
}
/** Loads subscription data once the user is authenticated. */
function SubscriptionLoader() {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh } = useSubscription();

  useEffect(() => {
    if (!authLoading && user) {
      refresh();
    }
  }, [user, authLoading, refresh]);

  return null;
}

/** Registers the global 403 plan-error handler that redirects to paywall. */
function PlanErrorInterceptor() {
  const router = useRouter();

  useEffect(() => {
    setPlanErrorHandler(() => {
      router.push("/subscription/plans");
    });
    return () => setPlanErrorHandler(null);
  }, [router]);

  return null;
}

function DevPanelBridge() {
  const { role, setRole, dataState, setDataState } = useAppSession();
  const { user, signOut } = useAuth();

  async function handleLoginAs(devUser: DevUser) {
    await loginWithEmail(devUser.email, devUser.password);
    setRole(devUser.role);
  }

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
      <DevPanel
        role={role}
        setRole={setRole}
        dataState={dataState}
        setDataState={setDataState}
        currentUserEmail={user?.email ?? null}
        onLoginAs={handleLoginAs}
        onSignOut={signOut}
      />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hide();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <AuthProvider>
            <SubscriptionProvider>
              <AppSessionProvider>
                {/* ✅ ToastProvider precisa ficar acima de qualquer provider que use useToast (ex: ProjectsProvider) */}
                <ToastProvider>
                  <ProjectsProvider>
                    <AuthGate>
                      <SubscriptionLoader />
                      <PlanErrorInterceptor />

                      <Stack>
                        <Stack.Screen
                          name="login"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="obra/[id]"
                          options={{
                            headerShown: false,
                            headerBackButtonMenuEnabled: false,
                          }}
                        />
                        <Stack.Screen
                          name="diario/[id]"
                          options={{ headerShown: false }}
                        />
<Stack.Screen
                          name="profile"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="invite"
                          options={{
                            headerShown: false,
                            presentation: "modal",
                            animation: "slide_from_bottom",
                          }}
                        />
                        <Stack.Screen
                          name="subscription/plans"
                          options={{
                            headerShown: false,
                            presentation: "modal",
                            animation: "slide_from_bottom",
                          }}
                        />
                        <Stack.Screen
                          name="subscription/my-plan"
                          options={{
                            headerShown: false,
                            presentation: "modal",
                            animation: "slide_from_bottom",
                          }}
                        />
                        <Stack.Screen
                          name="modal"
                          options={{ presentation: "modal", title: "Modal" }}
                        />
                      </Stack>
                    </AuthGate>

                    <StatusBar style="dark" />
                    {__DEV__ ? <DevPanelBridge /> : null}
                  </ProjectsProvider>
                </ToastProvider>
              </AppSessionProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

