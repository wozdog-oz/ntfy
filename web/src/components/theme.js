// homelab-look v1 (custom fork): the shared look of the homelab apps, copied from the homelab-app
// skill template (apps/fintrack/src/assets/styles/main.css). The oklch tokens there are converted
// to hex here because MUI's colour helpers can't parse oklch. Look upgrades: diff against that file.

const fontFamily = ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"].join(",");

// Each app sets its brand once (primary); everything else is neutral greys and the status colours
export const homelabColors = {
  light: {
    primary: "#554d5e",
    primaryContent: "#ffffff",
    base100: "#ffffff",
    base200: "#f6f6f9",
    base300: "#e6e6e9",
    baseContent: "#18181b",
    secondary: "#51515c",
    info: "#0a8fd1",
    success: "#25984d",
    warning: "#f2a618",
    error: "#db2b33",
  },
  dark: {
    primary: "#b4abbf",
    primaryContent: "#1e1a22",
    base100: "#161618",
    base200: "#1e1e20",
    base300: "#303033",
    baseContent: "#e4e4e7",
    secondary: "#a4a4ac",
    info: "#4fa8e1",
    success: "#4cb86a",
    warning: "#f5ae39",
    error: "#f3625d",
  },
};

// The look: one set of non-colour values for both themes (homelab-look --radius-* / --border)
export const look = {
  radiusField: 4, // buttons, inputs, selects, tabs
  radiusSelector: 4, // checkboxes, toggles, badges
  radiusBox: 8, // cards, modals, alerts, dropdowns
  headerHeight: 48,
  tabsHeight: 44,
};

/** @returns {import("@mui/material").ThemeOptions} */
const makeTheme = (mode) => {
  const c = homelabColors[mode];
  const border = `1px solid ${c.base300}`;
  return {
    shape: { borderRadius: look.radiusField },
    shadows: Array(25).fill("none"), // flat: --depth 0
    typography: {
      fontFamily,
      h5: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 },
      h6: { fontSize: "1rem", fontWeight: 600 },
      body1: { fontSize: "0.9375rem", lineHeight: 1.45 },
      body2: { fontSize: "0.875rem", lineHeight: 1.45 },
      button: { textTransform: "none", fontWeight: 600, fontSize: "0.875rem" },
    },
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.primaryContent },
      secondary: { main: c.secondary },
      info: { main: c.info },
      error: { main: c.error },
      success: { main: c.success },
      warning: { main: c.warning },
      background: { default: c.base100, paper: c.base100 },
      text: { primary: c.baseContent, secondary: c.secondary },
      divider: c.base300,
      action: { selected: c.base200, hover: c.base200 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            WebkitTapHighlightColor: "transparent",
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: {
          root: { backgroundColor: c.base100, borderBottom: border, color: c.baseContent },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { borderRadius: look.radiusBox, border, boxShadow: "none" },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            ":last-child": { paddingBottom: "12px" },
          },
        },
      },
      MuiCardActions: {
        styleOverrides: {
          root: { overflowX: "auto", padding: "0 8px 10px" },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: look.radiusField, paddingLeft: 12, paddingRight: 12 },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: look.radiusField } },
      },
      MuiFab: {
        styleOverrides: { root: { borderRadius: look.radiusBox, boxShadow: "none" } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: look.radiusSelector } },
      },
      MuiBadge: {
        styleOverrides: { badge: { borderRadius: look.radiusSelector } },
      },
      MuiListSubheader: {
        styleOverrides: {
          root: { backgroundColor: "transparent", color: c.secondary, fontSize: "0.75rem", fontWeight: 600, lineHeight: "32px" },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: look.radiusField,
            "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: c.base200, color: c.primary },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: "36px", color: c.baseContent } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: look.radiusBox, border } },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: look.radiusBox, border } },
      },
      MuiPopover: {
        styleOverrides: { paper: { borderRadius: look.radiusBox } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { fontSize: "0.875rem", minHeight: 40 } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: look.radiusField } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: look.radiusBox } },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: { borderRadius: look.radiusBox, backgroundColor: c.baseContent, color: c.base100 },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: look.radiusField, fontSize: "0.75rem" } },
      },
      // DaisyUI-style toggle: square-ish track and thumb (--radius-selector)
      MuiSwitch: {
        styleOverrides: {
          root: { width: 40, height: 24, padding: 0, margin: 8 },
          switchBase: {
            padding: 3,
            color: c.base100,
            "&.Mui-checked": {
              transform: "translateX(16px)",
              color: c.primaryContent,
              "& + .MuiSwitch-track": { backgroundColor: c.primary, opacity: 1, border: 0 },
            },
          },
          thumb: { width: 18, height: 18, borderRadius: look.radiusSelector - 1, boxShadow: "none" },
          track: { borderRadius: look.radiusSelector, backgroundColor: c.base300, opacity: 1 },
        },
      },
    },
  };
};

export const lightTheme = makeTheme("light");
export const darkTheme = makeTheme("dark");
