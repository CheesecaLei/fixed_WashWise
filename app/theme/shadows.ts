import { Shadows, createTheme } from "@mui/material/styles";

export function getShadows(): Shadows {
  const base = createTheme().shadows.slice() as string[];

  base[1] = "0px 1px 2px rgba(15, 23, 42, 0.08)";
  base[2] = "0px 2px 6px rgba(15, 23, 42, 0.1)";
  base[4] = "0px 6px 16px rgba(15, 23, 42, 0.14)";
  base[8] = "0px 10px 30px rgba(15, 23, 42, 0.18)";
  base[16] = "0px 16px 40px rgba(15, 23, 42, 0.24)";

  return base as Shadows;
}
