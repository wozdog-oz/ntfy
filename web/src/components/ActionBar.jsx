import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  MenuItem,
  Button,
  Divider,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  EllipsisVertical as MoreVertIcon,
  Bell as NotificationsIcon,
  BellOff as NotificationsOffIcon,
  RotateCw as RefreshIcon,
  CircleUserRound as AccountCircleIcon,
  LogOut as Logout,
  User as Person,
  Settings,
  Trash2 as ClearIcon,
  Plus as AddIcon,
  CircleMinus as UnsubscribeIcon,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import session from "../app/Session";
import subscriptionManager from "../app/SubscriptionManager";
import routes from "./routes";
import db from "../app/db";
import { topicDisplayName } from "../app/utils";
import { fadeNavigate } from "../app/transition";
import accountApi from "../app/AccountApi";
import prefs, { THEME } from "../app/Prefs";
import { UnauthorizedError } from "../app/errors";
import PopupMenu from "./PopupMenu";
import SubscribeDialog from "./SubscribeDialog";
import TopicTabBar from "./TopicTabBar";
import { useIsLaunchedPWA } from "./hooks";
import { look } from "./theme";

/**
 * Header in the homelab-look style (copied from Finance Tracker's AppNavbar): "ntfy" on the left;
 * version, theme toggle and the menu on the right; topic tabs underneath. Replaces the sidebar.
 */
const ActionBar = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <AppBar position="fixed" sx={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Toolbar disableGutters sx={{ minHeight: `${look.headerHeight}px !important`, px: { xs: 1, sm: 2 }, gap: 0.5 }}>
        <Typography
          variant="h6"
          noWrap
          component="button"
          onClick={() => navigate(routes.app)}
          sx={{
            flexGrow: 0,
            px: 1,
            color: "text.primary",
            background: "none",
            border: 0,
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
          }}
        >
          ntfy
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography
          variant="caption"
          sx={{ display: { xs: "none", sm: "inline" }, color: "text.secondary", fontVariantNumeric: "tabular-nums", mr: 1 }}
        >
          v{__APP_VERSION__}
        </Typography>
        <ThemeToggle />
        <ProfileIcon />
        <AppMenu subscriptions={props.subscriptions} selected={props.selected} />
      </Toolbar>
      <TopicTabBar subscriptions={props.subscriptions} selected={props.selected} onAllView={location.pathname === routes.app} />
    </AppBar>
  );
};

// Cycles system -> light -> dark, like Finance Tracker's ThemeToggle
const themeIcons = { [THEME.SYSTEM]: Monitor, [THEME.LIGHT]: Sun, [THEME.DARK]: Moon };
const themeCycle = { [THEME.SYSTEM]: THEME.LIGHT, [THEME.LIGHT]: THEME.DARK, [THEME.DARK]: THEME.SYSTEM };

const ThemeToggle = () => {
  const { t } = useTranslation();
  const theme = useLiveQuery(() => prefs.theme()) ?? THEME.SYSTEM;
  const Icon = themeIcons[theme] ?? Monitor;
  const label = t("action_bar_theme_toggle", { theme });
  return (
    <IconButton size="small" onClick={() => prefs.setTheme(themeCycle[theme] ?? THEME.SYSTEM)} aria-label={label} title={label}>
      <Icon size={20} />
    </IconButton>
  );
};

// One menu that changes with the tab: topic actions on a topic tab, "clear all" on All
const AppMenu = ({ subscriptions, selected }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isLaunchedPWA = useIsLaunchedPWA();
  const [anchorEl, setAnchorEl] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [subscribeDialogKey, setSubscribeDialogKey] = useState(0);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const onAllView = location.pathname === routes.app;

  const handleSubscribeReset = () => {
    setSubscribeDialogOpen(false);
    setSubscribeDialogKey((prev) => prev + 1);
  };

  const handleSubscribeSubmit = (subscription) => {
    console.log(`[ActionBar] New subscription: ${subscription.id}`, subscription);
    handleSubscribeReset();
    navigate(routes.forSubscription(subscription));
  };

  const handleToggleMute = async () => {
    await subscriptionManager.setMutedUntil(selected.id, selected.mutedUntil ? 0 : 1); // 1 = muted indefinitely
  };

  const handleUnsubscribe = async () => {
    console.log(`[ActionBar] Unsubscribing from ${selected.id}`, selected);
    await subscriptionManager.remove(selected);
    if (session.exists() && !selected.internal) {
      try {
        await accountApi.deleteSubscription(selected.baseUrl, selected.topic);
      } catch (e) {
        console.log(`[ActionBar] Error unsubscribing`, e);
        if (e instanceof UnauthorizedError) {
          await session.resetAndRedirect(routes.login);
        }
      }
    }
    navigate(routes.app);
  };

  const handleClear = async () => {
    setClearOpen(false);
    const targets = selected ? [selected] : await subscriptionManager.all();
    await Promise.all(targets.map((s) => subscriptionManager.deleteNotifications(s.id)));
  };

  // A plain reload would just serve the precached PWA shell, so purge the service worker caches first
  const handleReload = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn("[ActionBar] Error clearing caches during reload", e);
    } finally {
      window.location.reload();
    }
  };

  return (
    <>
      <IconButton size="small" edge="end" onClick={(ev) => setAnchorEl(ev.currentTarget)} aria-label={t("action_bar_toggle_action_menu")}>
        <MoreVertIcon size={20} />
      </IconButton>
      <PopupMenu horizontal="right" anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {selected && (
          <MenuItem onClick={() => setClearOpen(true)}>
            <ListItemIcon>
              <ClearIcon size={18} />
            </ListItemIcon>
            {t("action_bar_clear_topic_notifications")}
          </MenuItem>
        )}
        {selected && (
          <MenuItem onClick={handleToggleMute}>
            <ListItemIcon>{selected.mutedUntil ? <NotificationsIcon size={18} /> : <NotificationsOffIcon size={18} />}</ListItemIcon>
            {selected.mutedUntil ? t("action_bar_unmute_notifications") : t("action_bar_mute_notifications")}
          </MenuItem>
        )}
        {selected && (
          <MenuItem onClick={handleUnsubscribe}>
            <ListItemIcon>
              <UnsubscribeIcon size={18} />
            </ListItemIcon>
            {t("action_bar_unsubscribe")}
          </MenuItem>
        )}
        {onAllView && (
          <MenuItem onClick={() => setClearOpen(true)}>
            <ListItemIcon>
              <ClearIcon size={18} />
            </ListItemIcon>
            {t("action_bar_clear_notifications")}
          </MenuItem>
        )}
        {(selected || onAllView) && <Divider />}
        <MenuItem onClick={() => setSubscribeDialogOpen(true)}>
          <ListItemIcon>
            <AddIcon size={18} />
          </ListItemIcon>
          {t("nav_button_subscribe")}
        </MenuItem>
        <MenuItem onClick={() => navigate(routes.settings)}>
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          {t("action_bar_settings")}
        </MenuItem>
        {isLaunchedPWA && (
          <MenuItem onClick={handleReload}>
            <ListItemIcon>
              <RefreshIcon size={18} />
            </ListItemIcon>
            {t("action_bar_reload")}
          </MenuItem>
        )}
      </PopupMenu>
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{selected ? t("action_bar_clear_topic_notifications") : t("action_bar_clear_notifications")}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selected
              ? `This removes every notification in "${topicDisplayName(selected)}" from this device.`
              : "This removes every notification in all topics from this device."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)}>{t("common_cancel")}</Button>
          <Button color="error" onClick={handleClear}>
            {t("notifications_delete")}
          </Button>
        </DialogActions>
      </Dialog>
      <SubscribeDialog
        key={`subscribeDialog${subscribeDialogKey}`} // Resets dialog when canceled/closed
        open={subscribeDialogOpen}
        subscriptions={subscriptions}
        onCancel={handleSubscribeReset}
        onSuccess={handleSubscribeSubmit}
      />
    </>
  );
};

const ProfileIcon = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await accountApi.logout();
      await db().delete();
    } finally {
      await session.resetAndRedirect(routes.app, { fade: true });
    }
  };

  return (
    <>
      {session.exists() && (
        <IconButton size="small" onClick={(ev) => setAnchorEl(ev.currentTarget)} aria-label={t("action_bar_profile_title")}>
          <AccountCircleIcon size={20} />
        </IconButton>
      )}
      {!session.exists() && config.enable_login && (
        <Button size="small" onClick={() => fadeNavigate(navigate, routes.login)} aria-label={t("action_bar_sign_in")}>
          {t("action_bar_sign_in")}
        </Button>
      )}
      {!session.exists() && config.enable_signup && (
        <Button size="small" variant="outlined" onClick={() => fadeNavigate(navigate, routes.signup)} aria-label={t("action_bar_sign_up")}>
          {t("action_bar_sign_up")}
        </Button>
      )}
      <PopupMenu horizontal="right" anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => navigate(routes.account)}>
          <ListItemIcon>
            <Person size={18} />
          </ListItemIcon>
          <b>{session.username()}</b>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout size={18} />
          </ListItemIcon>
          {t("action_bar_profile_logout")}
        </MenuItem>
      </PopupMenu>
    </>
  );
};

export default ActionBar;
