import { PaletteMode } from "@mui/material";
import { ThemeOptions, createTheme, responsiveFontSizes } from "@mui/material/styles";
import { muiAppBar } from "./components/appBar";
import { muiButton } from "./components/button";
import { muiCard } from "./components/card";
import { muiOutlinedInput, muiTextField } from "./components/textField";
import { getPalette } from "./palette";
import { getShadows } from "./shadows";
import { getTypography } from "./typography";

const shape = {
  borderRadius: 12,
};

const zIndex: ThemeOptions["zIndex"] = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};

export function createAppTheme(mode: PaletteMode, fontFamily: string) {
  const theme = createTheme({
    palette: {
      mode,
      ...getPalette(mode),
    },
    typography: getTypography(fontFamily),
    spacing: 8,
    breakpoints: {
      values: {
        xs: 0,
        sm: 480,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    shape,
    shadows: getShadows(),
    zIndex,
    components: {
      MuiButton: muiButton,
      MuiTextField: muiTextField,
      MuiOutlinedInput: muiOutlinedInput,
      MuiCard: muiCard,
      MuiAppBar: muiAppBar,
    },
  });

  return responsiveFontSizes(theme, {
    breakpoints: ["sm", "md", "lg"],
    factor: 2,
  });
}
