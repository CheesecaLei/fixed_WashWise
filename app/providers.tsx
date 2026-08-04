"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PaletteMode } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import { getCssVarsByMode } from "./theme/cssVars";
import { createAppTheme } from "./theme";
import { LayoutShellProvider } from "./providers/layout-shell-provider";
import { OfflineQueueProvider } from "./providers/offline-queue-provider";
import type { ColorModeContextValue } from "./types/providers";
import { OfflineQueueBadge } from "../components/offline-queue-badge";
import { OfflineSyncBanner } from "../components/OfflineSyncBanner";
import { SyncConfirmationModal } from "../components/SyncConfirmationModal";
import { ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "react-toastify/dist/ReactToastify.css";

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

// const STORAGE_KEY = "washwise-color-mode";

// function getPreferredMode(): PaletteMode {
//   const storedMode = localStorage.getItem(STORAGE_KEY);
//   if (storedMode === "light" || storedMode === "dark") {
//     return storedMode;
//   }
//
//   return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
// }

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>("light");

  useEffect(() => {
    // Temporary: lock app theme to light mode.
    document.documentElement.dataset.theme = "light";
  }, []);

  const colorMode = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      setMode: () => setMode("light"),
      toggleMode: () => setMode("light"),
    }),
    [mode],
  );

  const theme = useMemo(() => createAppTheme(mode, "var(--font-geist-sans), Arial, sans-serif"), [mode]);
  const cssVars = useMemo(() => getCssVarsByMode(mode), [mode]);

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles styles={{ ":root": cssVars }} />
          <OfflineQueueProvider>
            <LayoutShellProvider>
              {children}
              <OfflineQueueBadge />
              <OfflineSyncBanner />
              <SyncConfirmationModal />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </LayoutShellProvider>
          </OfflineQueueProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used inside AppProviders");
  }

  return context;
}
