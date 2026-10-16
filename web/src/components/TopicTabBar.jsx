import * as React from "react";
import { Badge, Box, Paper, Tab, Tabs } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import routes from "./routes";
import Navigation from "./Navigation";
import { topicDisplayName } from "../app/utils";
import { topicColor } from "../app/topicColors";

const ALL_TAB = "all";

/**
 * Floating tab bar to switch between subscribed topics, shown above the message bar on the
 * notification views. The first tab is the combined "All" view.
 */
const TopicTabBar = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptions, selected } = props;
  const onNotificationsView = ![routes.account, routes.settings].includes(location.pathname);
  if (!onNotificationsView || !subscriptions || subscriptions.length === 0) {
    return null;
  }

  const handleChange = (ev, value) => {
    if (value === ALL_TAB) {
      navigate(routes.app);
    } else {
      navigate(routes.forSubscription(subscriptions.find((s) => s.id === value)));
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        left: { xs: 0, sm: Navigation.width },
        right: 0,
        bottom: selected ? "92px" : "16px", // Sit above the message bar when it is shown
        display: "flex",
        justifyContent: "center",
        paddingX: 2,
        pointerEvents: "none",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Paper elevation={6} sx={{ borderRadius: 999, maxWidth: "100%", pointerEvents: "auto", padding: 0.5 }}>
        <Tabs
          value={selected?.id ?? ALL_TAB}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={t("notifications_topic_tabs")}
          sx={{ minHeight: 40, "& .MuiTabs-indicator": { display: "none" } }}
        >
          <TopicTab value={ALL_TAB} label={t("notifications_topic_tabs_all")} />
          {subscriptions.map((subscription) => (
            <TopicTab
              key={subscription.id}
              value={subscription.id}
              label={topicDisplayName(subscription)}
              newCount={subscription.new}
              color={topicColor(subscription)}
            />
          ))}
        </Tabs>
      </Paper>
    </Box>
  );
};

// Selected tab is filled with the topic's colour (or the theme's primary colour)
const TopicTab = ({ label, newCount, color, ...props }) => (
  <Tab
    {...props}
    label={
      <Badge color="primary" variant="dot" invisible={!newCount}>
        {label}
      </Badge>
    }
    sx={{
      minHeight: 40,
      minWidth: 0,
      paddingX: 2,
      paddingY: 0.5,
      borderRadius: 999,
      textTransform: "none",
      fontWeight: 500,
      "&.Mui-selected": {
        backgroundColor: color?.background ?? "primary.main",
        color: color?.text ?? "primary.contrastText",
      },
    }}
  />
);

export default TopicTabBar;
