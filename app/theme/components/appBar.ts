import { ThemeOptions } from "@mui/material/styles";

export const muiAppBar: NonNullable<ThemeOptions["components"]>["MuiAppBar"] = {
  defaultProps: {
    color: "transparent",
    elevation: 0,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      borderBottom: `1px solid ${theme.palette.divider}`,
      backdropFilter: "blur(6px)",
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(2, 6, 23, 0.84)"
          : "rgba(248, 250, 252, 0.84)",
    }),
  },
};
