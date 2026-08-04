import { PaletteMode } from "@mui/material";

type CssVarMap = Record<string, string>;

const lightVars: CssVarMap = {
  "--app-bg-default": "#f8fafc",
  "--app-bg-paper": "#ffffff",
  "--app-text-primary": "#0f172a",
  "--app-text-secondary": "#475569",
  "--app-border": "#e2e8f0",
  "--app-primary": "#2563eb",
  "--app-primary-contrast": "#ffffff",
  "--app-secondary": "#0f766e",
};

const darkVars: CssVarMap = {
  "--app-bg-default": "#020617",
  "--app-bg-paper": "#0f172a",
  "--app-text-primary": "#f8fafc",
  "--app-text-secondary": "#cbd5e1",
  "--app-border": "#334155",
  "--app-primary": "#60a5fa",
  "--app-primary-contrast": "#0b1220",
  "--app-secondary": "#5eead4",
};

export function getCssVarsByMode(mode: PaletteMode): CssVarMap {
  return mode === "dark" ? darkVars : lightVars;
}
