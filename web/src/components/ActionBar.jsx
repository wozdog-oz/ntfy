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
  Menu as MenuIcon,
  EllipsisVertical as MoreVertIcon,
  Bell as NotificationsIcon,
  BellOff as NotificationsOffIcon,
  RotateCw as RefreshIcon,
  CircleUserRound as AccountCircleIcon,
  LogOut as Logout,
  User as Person,
  Settings,
  Trash2 as ClearIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import session from "../app/Session";
import logo from "../img/ntfy.svg";
import subscriptionManager from "../app/SubscriptionManager";
import routes from "./routes";
import db from "../app/db";
import { topicDisplayName } from "../app/utils";
import { fadeNavigate } from "../app/transition";
import Navigation from "./Navigation";
import accountApi from "../app/AccountApi";
import PopupMenu from "./PopupMenu";
import { SubscriptionPopup } from "./SubscriptionPopup";
import { useIsLaunchedPWA } from "./hooks";

const ActionBar = (props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isLaunchedPWA = useIsLaunchedPWA();

  let title = "ntfy";
  if (props.selected) {
    title = topicDisplayName(props.selected);
  } else if (location.pathname === routes.settings) {
    title = t("action_bar_settings");
  } else if (location.pathname === routes.account) {
    title = t("action_bar_account");
  }

  return (
    <AppBar
      position="fixed"
      sx={{
        width: "100%",
        zIndex: { sm: 1250 }, // > Navigation (1200), but < Dialog (1300)
        ml: { sm: `${Navigation.width}px` },
      }}
    >
      <Toolbar
        sx={{
          pr: { xs: "12px", sm: "24px" },
        }}
      >
        <IconButton
          color="primary"
          edge="start"
          aria-label={t("action_bar_show_menu")}
          onClick={props.onMobileDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon size={26} />
        </IconButton>
        <Box
          component="img"
          src={logo}
          alt={t("action_bar_logo_alt")}
          sx={{
            display: { xs: "none", sm: "block" },
            marginRight: "10px",
            height: "28px",
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: "text.primary" }}>
          {title}
        </Typography>
        {(props.selected || location.pathname === routes.app) && <ClearListIcon subscription={props.selected} />}
        {isLaunchedPWA && <ReloadIcon />}
        {props.selected && <SettingsIcons subscription={props.selected} onUnsubscribe={props.onUnsubscribe} />}
        <ProfileIcon />
      </Toolbar>
    </AppBar>
  );
};

const SettingsIcons = (props) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const { subscription } = props;

  const handleToggleMute = async () => {
    const mutedUntil = subscription.mutedUntil ? 0 : 1; // Make this a timestamp in the future
    await subscriptionManager.setMutedUntil(subscription.id, mutedUntil);
  };

  return (
    <>
      <IconButton color="primary" size="large" edge="end" onClick={handleToggleMute} aria-label={t("action_bar_toggle_mute")}>
        {subscription.mutedUntil ? <NotificationsOffIcon size={22} /> : <NotificationsIcon size={22} />}
      </IconButton>
      <IconButton
        color="primary"
        size="large"
        edge="end"
        onClick={(ev) => setAnchorEl(ev.currentTarget)}
        aria-label={t("action_bar_toggle_action_menu")}
      >
        <MoreVertIcon size={22} />
      </IconButton>
      <SubscriptionPopup subscription={subscription} anchor={anchorEl} placement="right" onClose={() => setAnchorEl(null)} />
    </>
  );
};

// ClearListIcon deletes every notification in the current list (one topic, or all topics), after confirming.
const ClearListIcon = ({ subscription }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClear = async () => {
    setOpen(false);
    const subscriptions = subscription ? [subscription] : await subscriptionManager.all();
    await Promise.all(subscriptions.map((s) => subscriptionManager.deleteNotifications(s.id)));
  };

  return (
    <>
      <IconButton color="primary" size="large" edge="end" onClick={() => setOpen(true)} aria-label={t("action_bar_clear_notifications")}>
        <ClearIcon size={21} />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("action_bar_clear_notifications")}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {subscription
              ? `This removes every notification in "${topicDisplayName(subscription)}" from this device.`
              : "This removes every notification in all topics from this device."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("common_cancel")}</Button>
          <Button color="error" onClick={handleClear}>
            {t("notifications_delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ReloadIcon hard-refreshes the app. A plain reload would just serve the precached PWA shell,
// so we first purge the service worker caches to force fresh assets from the network.
const ReloadIcon = () => {
  const { t } = useTranslation();

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
    <IconButton color="primary" size="large" edge="end" onClick={handleReload} aria-label={t("action_bar_reload")}>
      <RefreshIcon size={21} />
    </IconButton>
  );
};

const ProfileIcon = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

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
        <IconButton color="primary" size="large" edge="end" onClick={handleClick} aria-label={t("action_bar_profile_title")}>
          <AccountCircleIcon size={24} />
        </IconButton>
      )}
      {!session.exists() && config.enable_login && (
        <Button
          color="primary"
          variant="text"
          onClick={() => fadeNavigate(navigate, routes.login)}
          sx={{ m: 1 }}
          aria-label={t("action_bar_sign_in")}
        >
          {t("action_bar_sign_in")}
        </Button>
      )}
      {!session.exists() && config.enable_signup && (
        <Button
          color="primary"
          variant="outlined"
          onClick={() => fadeNavigate(navigate, routes.signup)}
          aria-label={t("action_bar_sign_up")}
        >
          {t("action_bar_sign_up")}
        </Button>
      )}
      <PopupMenu horizontal="right" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => navigate(routes.account)}>
          <ListItemIcon>
            <Person size={18} />
          </ListItemIcon>
          <b>{session.username()}</b>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate(routes.settings)}>
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          {t("action_bar_profile_settings")}
        </MenuItem>
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
