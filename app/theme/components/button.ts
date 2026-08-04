import { ThemeOptions } from "@mui/material/styles";

export const muiButton: NonNullable<ThemeOptions["components"]>["MuiButton"] = {
  defaultProps: {
    disableElevation: true,
    variant: "contained",
  },
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: theme.shape.borderRadius,
      padding: "10px 18px",
      minHeight: 42,
      fontWeight: 600,
      transition: "all 180ms ease",
      "&:focus-visible": {
        outline: `3px solid ${theme.palette.primary.light}`,
        outlineOffset: 2,
      },
    }),
    contained: ({ theme }) => ({
      boxShadow: theme.shadows[1],
      "&:hover": {
        boxShadow: theme.shadows[4],
      },
      "&:disabled": {
        boxShadow: "none",
      },
    }),
    outlined: ({ theme }) => ({
      borderColor: theme.palette.divider,
      "&:hover": {
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.action.hover,
      },
    }),
    text: ({ theme }) => ({
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
    }),
    sizeSmall: {
      minHeight: 36,
      padding: "8px 14px",
      fontSize: "0.875rem",
    },
    sizeLarge: {
      minHeight: 48,
      padding: "12px 22px",
      fontSize: "1rem",
    },
  },
};
