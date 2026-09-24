import * as React from "react";
import { useState } from "react";
import { Paper, IconButton, TextField, Portal, Snackbar } from "@mui/material";
import { ArrowUp as SendIcon, ChevronUp as KeyboardArrowUpIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import PublishDialog from "./PublishDialog";
import api from "../app/Api";
import Navigation from "./Navigation";

const Messaging = (props) => {
  const [message, setMessage] = useState("");
  const [attachFile, setAttachFile] = useState(null);
  const [dialogKey, setDialogKey] = useState(0);

  const { dialogOpenMode } = props;
  const subscription = props.selected;

  const handleOpenDialogClick = () => {
    props.onDialogOpenModeChange(PublishDialog.OPEN_MODE_DEFAULT);
  };

  const handleDialogClose = () => {
    props.onDialogOpenModeChange("");
    setDialogKey((prev) => prev + 1);
    setAttachFile(null);
  };

  const getPastedImage = (ev) => {
    const { items } = ev.clipboardData;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.indexOf("image") !== -1) {
        return items[i].getAsFile();
      }
    }
    return null;
  };

  return (
    <>
      {subscription && (
        <MessageBar
          subscription={subscription}
          message={message}
          onMessageChange={setMessage}
          onFilePasted={setAttachFile}
          onOpenDialogClick={handleOpenDialogClick}
          getPastedImage={getPastedImage}
        />
      )}
      <PublishDialog
        key={`publishDialog${dialogKey}`} // Resets dialog when canceled/closed
        openMode={dialogOpenMode}
        baseUrl={subscription?.baseUrl ?? config.base_url}
        topic={subscription?.topic ?? ""}
        message={message}
        attachFile={attachFile}
        getPastedImage={getPastedImage}
        onClose={handleDialogClose}
        onDragEnter={() => props.onDialogOpenModeChange((prev) => prev || PublishDialog.OPEN_MODE_DRAG)} // Only update if not already open
        onResetOpenMode={() => props.onDialogOpenModeChange(PublishDialog.OPEN_MODE_DEFAULT)}
      />
    </>
  );
};

const MessageBar = (props) => {
  const { t } = useTranslation();
  const { subscription } = props;
  const [snackOpen, setSnackOpen] = useState(false);
  const handleSendClick = async () => {
    try {
      await api.publish(subscription.baseUrl, subscription.topic, props.message);
    } catch (e) {
      console.log(`[MessageBar] Error publishing message`, e);
      setSnackOpen(true);
    }
    props.onMessageChange("");
  };

  const handlePaste = (ev) => {
    const blob = props.getPastedImage(ev);
    if (blob) {
      props.onFilePasted(blob);
      props.onOpenDialogClick();
    }
  };

  return (
    <Paper
      elevation={0}
      square
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        position: "fixed",
        bottom: 0,
        right: 0,
        padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
        width: { xs: "100%", sm: `calc(100% - ${Navigation.width}px)` },
        backgroundColor: (theme) => (theme.palette.mode === "light" ? "rgba(249, 249, 249, 0.85)" : "rgba(28, 28, 30, 0.85)"),
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderTop: (theme) => `0.5px solid ${theme.palette.divider}`,
      }}
    >
      <IconButton color="primary" edge="start" onClick={props.onOpenDialogClick} aria-label={t("message_bar_show_dialog")}>
        <KeyboardArrowUpIcon size={24} />
      </IconButton>
      <TextField
        autoFocus
        placeholder={t("message_bar_type_message")}
        aria-label={t("message_bar_type_message")}
        role="textbox"
        type="text"
        fullWidth
        variant="standard"
        slotProps={{ input: { disableUnderline: true } }}
        sx={{
          "& .MuiInputBase-root": {
            borderRadius: "18px",
            border: (theme) => `0.5px solid ${theme.palette.divider}`,
            backgroundColor: "background.paper",
            padding: "5px 14px",
          },
        }}
        value={props.message}
        onChange={(ev) => props.onMessageChange(ev.target.value)}
        onKeyPress={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            handleSendClick();
          }
        }}
        onPaste={handlePaste}
      />
      <IconButton
        onClick={handleSendClick}
        aria-label={t("message_bar_publish")}
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          color: "primary.contrastText",
          backgroundColor: "primary.main",
          "&:hover": { backgroundColor: "primary.dark" },
        }}
      >
        <SendIcon size={20} strokeWidth={2.5} />
      </IconButton>
      <Portal>
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
          message={t("message_bar_error_publishing")}
        />
      </Portal>
    </Paper>
  );
};

export default Messaging;
