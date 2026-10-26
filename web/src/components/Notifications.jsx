import {
  Container,
  ButtonBase,
  CardActions,
  CardContent,
  CircularProgress,
  Fade,
  Link,
  Modal,
  Snackbar,
  Stack,
  Tooltip,
  Card,
  Typography,
  IconButton,
  Box,
  Button,
  ListItemIcon,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import * as React from "react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  Check as CheckIcon,
  Copy as CopyIcon,
  EllipsisVertical as MoreVertIcon,
  Trash2 as DeleteIcon,
  ListX as DeleteDayIcon,
  CalendarX2 as DeleteOlderIcon,
} from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useTranslation } from "react-i18next";
import { alpha } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import {
  copyToClipboard,
  formatBytes,
  formatDateTime,
  maybeActionErrors,
  openUrl,
  shortUrl,
  topicDisplayName,
  unmatchedTags,
} from "../app/utils";
import { ACTION_BROADCAST, ACTION_COPY, ACTION_HTTP, ACTION_VIEW } from "../app/actions";
import { formatMessage, formatTitle, isImage } from "../app/notificationUtils";
import { topicColor } from "../app/topicColors";
import { LightboxBackdrop, VerticallyCenteredContainer } from "./styles";
import subscriptionManager from "../app/SubscriptionManager";
import notifier from "../app/Notifier";
import priority1 from "../img/priority-1.svg";
import priority2 from "../img/priority-2.svg";
import priority4 from "../img/priority-4.svg";
import priority5 from "../img/priority-5.svg";
import AttachmentIcon from "./AttachmentIcon";
import SwipeToDelete from "./SwipeToDelete";
import { useAutoSubscribe } from "./hooks";
import { usePrefCache } from "./PrefCache";

const priorityFiles = {
  1: priority1,
  2: priority2,
  4: priority4,
  5: priority5,
};

export const AllSubscriptions = () => {
  // allNotifications is preloaded in Layout, so this view has its data on mount (no empty frame on switch).
  const { subscriptions, allNotifications } = useOutletContext();
  if (!subscriptions || allNotifications === null || allNotifications === undefined) {
    return <DeferredLoading />;
  }
  return <AllSubscriptionsList subscriptions={subscriptions} notifications={allNotifications} />;
};

export const SingleSubscription = () => {
  const { subscriptions, selected, allNotifications } = useOutletContext();
  useAutoSubscribe(subscriptions, selected);
  if (!selected || allNotifications === null || allNotifications === undefined) {
    return <DeferredLoading />;
  }
  return <SingleSubscriptionList subscription={selected} allNotifications={allNotifications} />;
};

const AllSubscriptionsList = (props) => {
  const { subscriptions, notifications } = props;
  // Looking at All means everything has been seen: clear every topic's unread count (and the app badge)
  const hasNew = subscriptions.some((s) => s.new > 0);
  useEffect(() => {
    if (hasNew) {
      subscriptions.filter((s) => s.new > 0).forEach((s) => subscriptionManager.markNotificationsRead(s.id));
    }
  }, [hasNew, subscriptions]);
  // Custom fork: empty states are blank (no curl hints)
  if (subscriptions.length === 0 || notifications.length === 0) {
    return null;
  }
  const topics = Object.fromEntries(subscriptions.map((s) => [s.id, { name: topicDisplayName(s), color: topicColor(s) }]));
  return <NotificationList key="all" notifications={notifications} topics={topics} />;
};

const SingleSubscriptionList = (props) => {
  const { subscription, allNotifications } = props;
  // Filter the preloaded allNotifications instead of a per-topic query (getNotifications(id) ==
  // getAllNotifications() filtered by id), so topic switches are instant.
  const notifications = useMemo(
    () => allNotifications.filter((notification) => notification.subscriptionId === subscription.id),
    [allNotifications, subscription.id],
  );
  // Opening a topic tab clears that topic's unread count
  useEffect(() => {
    if (subscription.new > 0) {
      subscriptionManager.markNotificationsRead(subscription.id);
    }
  }, [subscription.id, subscription.new]);
  if (notifications.length === 0) {
    return null;
  }
  return <NotificationList id={subscription.id} notifications={notifications} />;
};

// Local calendar day of a notification timestamp (seconds), e.g. "2026-10-16"
const dayKey = (timestamp) => {
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Notifications are already sorted newest first, so consecutive runs with the same day form a group
const groupByDay = (notifications) => {
  const groups = [];
  notifications.forEach((notification) => {
    const key = dayKey(notification.time);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.notifications.push(notification);
    } else {
      groups.push({ key, notifications: [notification] });
    }
  });
  return groups;
};

const dayLabel = (key, t) => {
  const now = Date.now() / 1000;
  if (key === dayKey(now)) {
    return t("notifications_day_today");
  }
  if (key === dayKey(now - 86400)) {
    return t("notifications_day_yesterday");
  }
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
};

const NotificationList = (props) => {
  const { t } = useTranslation();
  const pageSize = 20;
  const { notifications } = props;
  const [snackOpen, setSnackOpen] = useState(false);
  const [maxCount, setMaxCount] = useState(pageSize);
  const [pendingDelete, setPendingDelete] = useState(null); // { title, description, ids } awaiting confirmation
  const count = Math.min(notifications.length, maxCount);

  // Day groups are built from the visible (paged) slice, but deleting a day removes all of that
  // day's notifications in this list, including ones not scrolled into view yet.
  const groups = useMemo(() => groupByDay(notifications.slice(0, count)), [notifications, count]);
  const todayKey = dayKey(Date.now() / 1000);
  const olderIds = useMemo(() => notifications.filter((n) => dayKey(n.time) !== todayKey).map((n) => n.id), [notifications, todayKey]);

  const handleDeleteDayClick = (group) => {
    const ids = notifications.filter((n) => dayKey(n.time) === group.key).map((n) => n.id);
    setPendingDelete({
      title: t("notifications_delete_day_title", { day: dayLabel(group.key, t) }),
      description: t("notifications_delete_confirm_description", { count: ids.length }),
      ids,
    });
  };

  const handleDeleteOlderClick = () => {
    setPendingDelete({
      title: t("notifications_delete_older_title"),
      description: t("notifications_delete_confirm_description", { count: olderIds.length }),
      ids: olderIds,
    });
  };

  const handleConfirmDelete = async () => {
    console.log(`[Notifications] Deleting ${pendingDelete.ids.length} notification(s)`);
    await subscriptionManager.deleteNotificationsById(pendingDelete.ids);
    setPendingDelete(null);
  };

  useEffect(
    () => () => {
      setMaxCount(pageSize);
      const main = document.getElementById("main");
      if (main) {
        main.scrollTo(0, 0);
      }
    },
    [props.id],
  );

  return (
    <InfiniteScroll
      dataLength={count}
      next={() => setMaxCount((prev) => prev + pageSize)}
      hasMore={count < notifications.length}
      loader={<>Loading ...</>}
      scrollThreshold={0.7}
      scrollableTarget="main"
    >
      <Container
        maxWidth="md"
        role="list"
        aria-label={t("notifications_list")}
        sx={{
          marginTop: 1.5,
          marginBottom: "calc(24px + env(safe-area-inset-bottom))",
          paddingLeft: { xs: 1.5, sm: 2 },
          paddingRight: { xs: 1.5, sm: 2 },
        }}
      >
        <Stack spacing={1.5}>
          {olderIds.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", marginBottom: -0.5 }}>
              <Button size="small" color="error" startIcon={<DeleteOlderIcon size={16} />} onClick={handleDeleteOlderClick}>
                {t("notifications_delete_older_button")}
              </Button>
            </Box>
          )}
          {groups.map((group) => (
            <Stack key={group.key} spacing={1.5} role="group" aria-label={dayLabel(group.key, t)}>
              <DayHeader label={dayLabel(group.key, t)} onDeleteClick={() => handleDeleteDayClick(group)} />
              {group.notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  topic={props.topics?.[notification.subscriptionId]}
                  onShowSnack={() => setSnackOpen(true)}
                />
              ))}
            </Stack>
          ))}
          <Snackbar
            open={snackOpen}
            autoHideDuration={3000}
            onClose={() => setSnackOpen(false)}
            message={t("notifications_copied_to_clipboard")}
          />
        </Stack>
      </Container>
      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{pendingDelete?.title}?</DialogTitle>
        <DialogContent>
          <DialogContentText>{pendingDelete?.description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>{t("common_cancel")}</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            {t("notifications_delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </InfiniteScroll>
  );
};

const DayHeader = (props) => {
  const { t } = useTranslation();
  const label = t("notifications_delete_day_title", { day: props.label });
  return (
    <Box sx={{ display: "flex", alignItems: "center", paddingLeft: 0.5, marginBottom: -0.5 }}>
      <Typography
        variant="subtitle2"
        component="h2"
        sx={{ flexGrow: 1, fontSize: 13, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.4 }}
      >
        {props.label}
      </Typography>
      <Tooltip title={label} enterDelay={500}>
        <IconButton size="small" onClick={props.onDeleteClick} aria-label={label} sx={{ color: "text.secondary" }}>
          <DeleteDayIcon size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

/**
 * Replace links with <Link/> components; this is a combination of the genius function
 * in [1] and the regex in [2].
 *
 * [1] https://github.com/facebook/react/issues/3386#issuecomment-78605760
 * [2] https://github.com/bryanwoods/autolink-js/blob/master/autolink.js#L9
 */
const autolink = (s) => {
  const parts = s.split(/(\bhttps?:\/\/[-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026@#/%=~()_|]\b)/gi);
  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = (
      <Link key={i} href={parts[i]} underline="always" target="_blank" rel="noreferrer">
        {shortUrl(parts[i])}
      </Link>
    );
  }
  return <>{parts}</>;
};

// Loaded lazily so the heavy react-remark/unified markdown stack is only fetched when a
// text/markdown notification is actually rendered (see MarkdownContent.jsx).
const MarkdownContent = lazy(() => import("./MarkdownContent"));

const NotificationBody = ({ notification }) => {
  const displayAsMarkdown = notification.content_type === "text/markdown";
  const formatted = formatMessage(notification);
  if (displayAsMarkdown) {
    return (
      <Suspense fallback={null}>
        <MarkdownContent content={formatted} />
      </Suspense>
    );
  }
  return autolink(formatted);
};

const NotificationItem = (props) => {
  const { t } = useTranslation();
  const { dateFormat, timeFormat } = usePrefCache();
  const { notification } = props;
  const { attachment } = notification;
  const date = formatDateTime(notification.time, dateFormat, timeFormat);
  const otherTags = unmatchedTags(notification.tags);
  const tags = otherTags.length > 0 ? otherTags.join(", ") : null;
  const handleDelete = async () => {
    console.log(`[Notifications] Deleting notification ${notification.id}`);
    await subscriptionManager.deleteNotification(notification.id);
  };
  const handleMarkRead = async () => {
    console.log(`[Notifications] Marking notification ${notification.id} as read`);
    await subscriptionManager.markNotificationRead(notification.id);
  };
  const handleCopy = (s) => {
    copyToClipboard(s);
    props.onShowSnack();
  };
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const handleMenuAction = (action) => async () => {
    setMenuAnchorEl(null);
    await action();
  };
  const expired = attachment && attachment.expires && attachment.expires < Date.now() / 1000;
  const hasAttachmentActions = attachment && !expired;
  const hasClickAction = notification.click;
  const hasUserActions = notification.actions && notification.actions.length > 0;
  const showActions = hasAttachmentActions || hasClickAction || hasUserActions;

  return (
    <SwipeToDelete onDelete={handleDelete} label={t("notifications_delete")}>
      <Card role="listitem" aria-label={t("notifications_list_item")}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", marginTop: -0.5 }}>
            <Typography sx={{ fontSize: 13, flexGrow: 1, display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
              {notification.new === 1 && (
                <Box
                  component="span"
                  aria-label={t("notifications_new_indicator")}
                  sx={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "primary.main", flexShrink: 0, marginRight: 0.25 }}
                />
              )}
              {props.topic && (
                // Neutral tag; the topic colour is only a small dot (homelab-look: colour as accent)
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: "20px",
                    px: 0.75,
                    borderRadius: "4px",
                    color: "text.primary",
                    backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.08),
                    marginRight: 0.5,
                  }}
                >
                  {props.topic.color && (
                    <Box
                      component="span"
                      sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: props.topic.color.background }}
                    />
                  )}
                  {props.topic.name}
                </Box>
              )}
              {date}
              {[1, 2, 4, 5].includes(notification.priority) && (
                <img
                  src={priorityFiles[notification.priority]}
                  alt={t("notifications_priority_x", {
                    priority: notification.priority,
                  })}
                  style={{ height: 20 }}
                />
              )}
            </Typography>
            <IconButton
              onClick={(ev) => setMenuAnchorEl(ev.currentTarget)}
              sx={{ marginRight: -1, color: "text.secondary" }}
              aria-label={t("action_bar_toggle_action_menu")}
            >
              <MoreVertIcon size={20} />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={() => setMenuAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {notification.new === 1 && (
                <MenuItem onClick={handleMenuAction(handleMarkRead)}>
                  <ListItemIcon>
                    <CheckIcon size={18} />
                  </ListItemIcon>
                  {t("notifications_mark_read")}
                </MenuItem>
              )}
              <MenuItem onClick={handleMenuAction(() => handleCopy(formatMessage(notification)))}>
                <ListItemIcon>
                  <CopyIcon size={18} />
                </ListItemIcon>
                {t("common_copy_to_clipboard")}
              </MenuItem>
              <MenuItem onClick={handleMenuAction(handleDelete)} sx={{ color: "error.main" }}>
                <ListItemIcon sx={{ color: "error.main" }}>
                  <DeleteIcon size={18} />
                </ListItemIcon>
                {t("notifications_delete")}
              </MenuItem>
            </Menu>
          </Box>
          {notification.title && (
            <Typography
              variant="h5"
              component="div"
              role="rowheader"
              sx={{ fontSize: "1rem", lineHeight: 1.35, marginTop: 0.25, marginBottom: 0.25 }}
            >
              {formatTitle(notification)}
            </Typography>
          )}
          <Typography variant="body1" sx={{ fontSize: "0.9375rem", lineHeight: 1.4, whiteSpace: "pre-line", overflowX: "auto" }}>
            <NotificationBody notification={notification} />
            {maybeActionErrors(notification)}
          </Typography>
          {attachment && <Attachment attachment={attachment} />}
          {tags && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", marginTop: 0.5 }}>
              {t("notifications_tags")}: {tags}
            </Typography>
          )}
        </CardContent>
        {showActions && (
          <CardActions sx={{ paddingTop: 0 }}>
            {hasAttachmentActions && (
              <>
                <Tooltip title={t("notifications_attachment_copy_url_title")}>
                  <Button onClick={() => handleCopy(attachment.url)}>{t("notifications_attachment_copy_url_button")}</Button>
                </Tooltip>
                <Tooltip
                  title={t("notifications_attachment_open_title", {
                    url: attachment.url,
                  })}
                >
                  <Button onClick={() => openUrl(attachment.url)}>{t("notifications_attachment_open_button")}</Button>
                </Tooltip>
              </>
            )}
            {hasClickAction && (
              <>
                <Tooltip title={t("notifications_click_copy_url_title")}>
                  <Button onClick={() => handleCopy(notification.click)}>{t("notifications_click_copy_url_button")}</Button>
                </Tooltip>
                <Tooltip
                  title={t("notifications_actions_open_url_title", {
                    url: notification.click,
                  })}
                >
                  <Button onClick={() => openUrl(notification.click)}>{t("notifications_click_open_button")}</Button>
                </Tooltip>
              </>
            )}
            {hasUserActions && <UserActions notification={notification} onShowSnack={props.onShowSnack} />}
          </CardActions>
        )}
      </Card>
    </SwipeToDelete>
  );
};

const Attachment = (props) => {
  const { t } = useTranslation();
  const { dateFormat, timeFormat } = usePrefCache();
  const { attachment } = props;
  const expired = attachment.expires && attachment.expires < Date.now() / 1000;
  const expires = attachment.expires && attachment.expires > Date.now() / 1000;
  const displayableImage = !expired && isImage(attachment);

  // Unexpired image
  if (displayableImage) {
    return <Image attachment={attachment} />;
  }

  // Anything else: Show box
  const infos = [];
  if (attachment.size) {
    infos.push(formatBytes(attachment.size));
  }
  if (expires) {
    infos.push(
      t("notifications_attachment_link_expires", {
        date: formatDateTime(attachment.expires, dateFormat, timeFormat),
      }),
    );
  }
  if (expired) {
    infos.push(t("notifications_attachment_link_expired"));
  }
  const maybeInfoText =
    infos.length > 0 ? (
      <>
        <br />
        {infos.join(", ")}
      </>
    ) : null;

  // If expired, just show infos without click target
  if (expired) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          marginTop: 2,
          padding: 1,
          borderRadius: "4px",
        }}
      >
        <AttachmentIcon type={attachment.type} />
        <Typography variant="body2" sx={{ marginLeft: 1, textAlign: "left", color: "text.primary" }}>
          <b>{attachment.name}</b>
          {maybeInfoText}
        </Typography>
      </Box>
    );
  }

  // Not expired
  return (
    <ButtonBase
      sx={{
        marginTop: 2,
      }}
    >
      <Link
        href={attachment.url}
        target="_blank"
        rel="noopener"
        underline="none"
        sx={{
          display: "flex",
          alignItems: "center",
          padding: 1,
          borderRadius: "4px",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.05)",
          },
        }}
      >
        <AttachmentIcon type={attachment.type} />
        <Typography variant="body2" sx={{ marginLeft: 1, textAlign: "left", color: "text.primary" }}>
          <b>{attachment.name}</b>
          {maybeInfoText}
        </Typography>
      </Link>
    </ButtonBase>
  );
};

const Image = (props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box
        component="img"
        src={props.attachment.url}
        loading="lazy"
        alt={t("notifications_attachment_image")}
        onClick={() => setOpen(true)}
        sx={{
          marginTop: 2,
          borderRadius: "4px",
          boxShadow: 2,
          width: 1,
          maxHeight: "400px",
          objectFit: "cover",
          cursor: "pointer",
        }}
      />
      <Modal open={open} onClose={() => setOpen(false)} slots={{ backdrop: LightboxBackdrop }}>
        <Fade in={open}>
          <Box
            component="img"
            src={props.attachment.url}
            alt={t("notifications_attachment_image")}
            loading="lazy"
            sx={{
              maxWidth: 1,
              maxHeight: 1,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              padding: 4,
            }}
          />
        </Fade>
      </Modal>
    </>
  );
};

const UserActions = (props) => (
  <>
    {props.notification.actions.map((action) => (
      <UserAction key={action.id} notification={props.notification} action={action} onShowSnack={props.onShowSnack} />
    ))}
  </>
);

const ACTION_PROGRESS_ONGOING = 1;
const ACTION_PROGRESS_SUCCESS = 2;
const ACTION_PROGRESS_FAILED = 3;

const ACTION_LABEL_SUFFIX = {
  [ACTION_PROGRESS_ONGOING]: " …",
  [ACTION_PROGRESS_SUCCESS]: " ✔",
  [ACTION_PROGRESS_FAILED]: " ❌",
};

const updateActionStatus = (notification, action, progress, error) => {
  subscriptionManager.updateNotification({
    ...notification,
    actions: notification.actions.map((a) => (a.id === action.id ? { ...a, progress, error } : a)),
  });
};

const clearNotification = async (notification) => {
  console.log(`[Notifications] Clearing notification ${notification.id}`);
  const subscription = await subscriptionManager.get(notification.subscriptionId);
  if (subscription) {
    await notifier.cancel(subscription, notification);
  }
  await subscriptionManager.markNotificationRead(notification.id);
};

const performHttpAction = async (notification, action) => {
  console.log(`[Notifications] Performing HTTP user action`, action);
  try {
    updateActionStatus(notification, action, ACTION_PROGRESS_ONGOING, null);
    const response = await fetch(action.url, {
      method: action.method ?? "POST",
      headers: action.headers ?? {},
      // This must not null-coalesce to a non nullish value. Otherwise, the fetch API
      // will reject it for "having a body"
      body: action.body,
    });
    console.log(`[Notifications] HTTP user action response`, response);
    const success = response.status >= 200 && response.status <= 299;
    if (success) {
      updateActionStatus(notification, action, ACTION_PROGRESS_SUCCESS, null);
      if (action.clear) {
        await clearNotification(notification);
      }
    } else {
      updateActionStatus(notification, action, ACTION_PROGRESS_FAILED, `${action.label}: Unexpected response HTTP ${response.status}`);
    }
  } catch (e) {
    console.log(`[Notifications] HTTP action failed`, e);
    updateActionStatus(notification, action, ACTION_PROGRESS_FAILED, `${action.label}: ${e} Check developer console for details.`);
  }
};

const UserAction = (props) => {
  const { t } = useTranslation();
  const { notification } = props;
  const { action } = props;
  if (action.action === ACTION_BROADCAST) {
    return (
      <Tooltip title={t("notifications_actions_not_supported")}>
        <span>
          <Button disabled aria-label={t("notifications_actions_not_supported")}>
            {action.label}
          </Button>
        </span>
      </Tooltip>
    );
  }
  if (action.action === ACTION_VIEW) {
    const handleClick = () => {
      openUrl(action.url);
      if (action.clear) {
        clearNotification(notification);
      }
    };
    return (
      <Tooltip title={t("notifications_actions_open_url_title", { url: action.url })}>
        <Button
          onClick={handleClick}
          aria-label={t("notifications_actions_open_url_title", {
            url: action.url,
          })}
        >
          {action.label}
        </Button>
      </Tooltip>
    );
  }
  if (action.action === ACTION_HTTP) {
    const method = action.method ?? "POST";
    const label = action.label + (ACTION_LABEL_SUFFIX[action.progress ?? 0] ?? "");
    return (
      <Tooltip
        title={t("notifications_actions_http_request_title", {
          method,
          url: action.url,
        })}
      >
        <Button
          onClick={() => performHttpAction(notification, action)}
          aria-label={t("notifications_actions_http_request_title", {
            method,
            url: action.url,
          })}
        >
          {label}
        </Button>
      </Tooltip>
    );
  }
  if (action.action === ACTION_COPY) {
    const handleClick = async () => {
      await copyToClipboard(action.value);
      props.onShowSnack();
      if (action.clear) {
        await clearNotification(notification);
      }
    };
    return (
      <Tooltip title={t("common_copy_to_clipboard")}>
        <Button onClick={handleClick} aria-label={t("common_copy_to_clipboard")}>
          {action.label}
        </Button>
      </Tooltip>
    );
  }
  return null; // Others
};

const Loading = () => {
  const { t } = useTranslation();
  return (
    <VerticallyCenteredContainer>
      <Typography variant="h5" color="text.secondary" align="center" sx={{ paddingBottom: 1 }}>
        <CircularProgress disableShrink sx={{ marginBottom: 1 }} />
        <br />
        {t("notifications_loading")}
      </Typography>
    </VerticallyCenteredContainer>
  );
};

// Render nothing until a load takes at least `delayMs`, so the centered spinner only shows on
// genuinely slow loads -- normal sub-frame IndexedDB reads don't flash it on every remount.
const DeferredLoading = ({ delayMs = 250 }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return show ? <Loading /> : null;
};
