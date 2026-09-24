// Apple/iOS-inspired theme (custom fork). Colours follow Apple's system colours:
// https://developer.apple.com/design/human-interface-guidelines/color

const fontFamily = [
  "-apple-system",
  "BlinkMacSystemFont",
  '"SF Pro Text"',
  '"SF Pro Display"',
  '"Helvetica Neue"',
  "system-ui",
  "Roboto",
  "sans-serif",
].join(",");

export const iosColors = {
  light: {
    blue: "#007AFF",
    accent: "#3A3A3C", // dark grey used for icons, buttons and links instead of blue
    red: "#FF3B30",
    green: "#34C759",
    orange: "#FF9500",
    groupedBackground: "#F2F2F7",
    card: "#FFFFFF",
    label: "#000000",
    secondaryLabel: "rgba(60, 60, 67, 0.6)",
    separator: "rgba(60, 60, 67, 0.18)",
    fill: "rgba(120, 120, 128, 0.12)",
    bar: "rgba(255, 255, 255, 0.82)",
  },
  dark: {
    blue: "#0A84FF",
    accent: "#D1D1D6",
    red: "#FF453A",
    green: "#30D158",
    orange: "#FF9F0A",
    groupedBackground: "#000000",
    card: "#1C1C1E",
    label: "#FFFFFF",
    secondaryLabel: "rgba(235, 235, 245, 0.6)",
    separator: "rgba(84, 84, 88, 0.6)",
    fill: "rgba(120, 120, 128, 0.24)",
    bar: "rgba(28, 28, 30, 0.82)",
  },
};

/** @returns {import("@mui/material").ThemeOptions} */
const makeTheme = (mode) => {
  const c = iosColors[mode];
  return {
    shape: { borderRadius: 10 },
    typography: {
      fontFamily,
      h5: { fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
      h6: { fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.01em" },
      body1: { fontSize: "1rem", lineHeight: 1.4, letterSpacing: "-0.005em" },
      body2: { fontSize: "0.9375rem", lineHeight: 1.4 },
      button: { textTransform: "none", fontWeight: 600, fontSize: "0.9375rem" },
    },
    palette: {
      mode,
      primary: { main: c.accent },
      info: { main: c.blue },
      secondary: { main: c.green },
      error: { main: c.red },
      success: { main: c.green },
      warning: { main: c.orange },
      background: { default: c.groupedBackground, paper: c.card },
      text: { primary: c.label, secondary: c.secondaryLabel },
      divider: c.separator,
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
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: {
          root: {
            backgroundColor: c.bar,
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            borderBottom: `0.5px solid ${c.separator}`,
            color: c.label,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `0.5px solid ${c.separator}`,
            boxShadow: mode === "light" ? "0 1px 3px rgba(0, 0, 0, 0.04)" : "none",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: "14px 16px",
            ":last-child": { paddingBottom: "14px" },
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
          root: { borderRadius: 10, paddingLeft: 12, paddingRight: 12 },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: c.groupedBackground,
            borderRight: `0.5px solid ${c.separator}`,
          },
        },
      },
      MuiListSubheader: {
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
            color: c.secondaryLabel,
            fontSize: "0.8125rem",
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: "36px",
            paddingLeft: 24,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: "1px 8px",
            "&.Mui-selected": {
              backgroundColor: c.fill,
              color: c.label,
              "& .MuiListItemIcon-root": { color: c.label },
              "& .MuiListItemText-primary": { fontWeight: 600 },
            },
            "&.Mui-selected:hover": { backgroundColor: c.fill },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: "36px", color: c.accent },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 14 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
            border: `0.5px solid ${c.separator}`,
          },
        },
      },
      MuiPopover: {
        styleOverrides: { paper: { borderRadius: 12 } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { fontSize: "1rem", minHeight: 44 } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            ...(mode === "dark" && { color: "#000", backgroundColor: "#e5e5ea" }),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: "0.8125rem" } },
      },
      // iOS-style toggle switch
      MuiSwitch: {
        styleOverrides: {
          root: { width: 51, height: 31, padding: 0, margin: 8 },
          switchBase: {
            padding: 2,
            "&.Mui-checked": {
              transform: "translateX(20px)",
              color: "#fff",
              "& + .MuiSwitch-track": { backgroundColor: c.green, opacity: 1, border: 0 },
            },
          },
          thumb: { width: 27, height: 27, boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" },
          track: { borderRadius: 31 / 2, backgroundColor: c.fill, opacity: 1 },
        },
      },
    },
  };
};

export const lightTheme = makeTheme("light");
export const darkTheme = makeTheme("dark");
