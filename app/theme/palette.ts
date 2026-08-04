import { PaletteMode } from "@mui/material";
import { PaletteOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    neutral: Palette["primary"];
  }

  interface PaletteOptions {
    neutral?: PaletteOptions["primary"];
  }
}

const lightPalette: PaletteOptions = {
  primary: {
    main: "#3b82f6",
    light: "#60a5fa",
    dark: "#1d4ed8",
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#0f766e",
    light: "#2dd4bf",
    dark: "#115e59",
    contrastText: "#ffffff",
  },
  success: {
    main: "#16a34a",
    light: "#4ade80",
    dark: "#15803d",
  },
  warning: {
    main: "#d97706",
    light: "#fbbf24",
    dark: "#b45309",
  },
  error: {
    main: "#dc2626",
    light: "#f87171",
    dark: "#b91c1c",
  },
  info: {
    main: "#0284c7",
    light: "#38bdf8",
    dark: "#0369a1",
  },
  neutral: {
    main: "#475569",
    light: "#94a3b8",
    dark: "#334155",
    contrastText: "#ffffff",
  },
  background: {
    default: "#f8fafc",
    paper: "#ffffff",
  },
  text: {
    primary: "#0f172a",
    secondary: "#475569",
  },
  divider: "#e2e8f0",
};

const darkPalette: PaletteOptions = {
  primary: {
    main: "#60a5fa",
    light: "#93c5fd",
    dark: "#3b82f6",
    contrastText: "#0b1220",
  },
  secondary: {
    main: "#5eead4",
    light: "#99f6e4",
    dark: "#14b8a6",
    contrastText: "#042f2e",
  },
  success: {
    main: "#4ade80",
    light: "#86efac",
    dark: "#22c55e",
  },
  warning: {
    main: "#f59e0b",
    light: "#fcd34d",
    dark: "#d97706",
  },
  error: {
    main: "#f87171",
    light: "#fca5a5",
    dark: "#ef4444",
  },
  info: {
    main: "#38bdf8",
    light: "#7dd3fc",
    dark: "#0ea5e9",
  },
  neutral: {
    main: "#94a3b8",
    light: "#cbd5e1",
    dark: "#64748b",
    contrastText: "#0f172a",
  },
  background: {
    default: "#020617",
    paper: "#0f172a",
  },
  text: {
    primary: "#f8fafc",
    secondary: "#cbd5e1",
  },
  divider: "#334155",
};

export function getPalette(mode: PaletteMode): PaletteOptions {
  return mode === "dark" ? darkPalette : lightPalette;
}