import { ThemeOptions } from "@mui/material/styles";

export const muiCard: NonNullable<ThemeOptions["components"]>["MuiCard"] = {
  defaultProps: {
    elevation: 0,
  },
  styleOverrides: {
    root: ({ theme }) => {
      const radius =
        typeof theme.shape.borderRadius === "number"
          ? theme.shape.borderRadius * 1.5
          : theme.shape.borderRadius;

      return {
        borderRadius: radius,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === "dark" ? "none" : theme.shadows[1],
        backgroundImage: "none",
      };
    },
  },
};
