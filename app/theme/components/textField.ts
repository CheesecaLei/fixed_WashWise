import { ThemeOptions } from "@mui/material/styles";

export const muiTextField: NonNullable<ThemeOptions["components"]>["MuiTextField"] = {
  defaultProps: {
    variant: "outlined",
    fullWidth: true,
  },
};

export const muiOutlinedInput: NonNullable<ThemeOptions["components"]>["MuiOutlinedInput"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: theme.shape.borderRadius,
      backgroundColor:
        theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.55)" : theme.palette.common.white,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.primary.main,
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderWidth: 2,
        borderColor: theme.palette.primary.main,
      },
    }),
    input: {
      padding: "12px 14px",
    },
  },
};
