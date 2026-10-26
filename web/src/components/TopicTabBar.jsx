import * as React from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import routes from "./routes";
import { topicDisplayName } from "../app/utils";
import { topicColor } from "../app/topicColors";
import { look } from "./theme";

const ALL_TAB = "all";

/**
 * Row of topic tabs under the header (custom fork; replaces the sidebar topic list). The first tab
 * is the combined "All" view. Shown on every page so Settings has a way back; no tab is selected
 * there. Tabs keep subscription order so they never move.
 */
const TopicTabBar = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subscriptions, selected, onAllView } = props;
  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  const totalNew = subscriptions.reduce((sum, s) => sum + s.new, 0);
  let value = false;
  if (selected) {
    value = selected.id;
  } else if (onAllView) {
    value = ALL_TAB;
  }

  const handleChange = (ev, newValue) => {
    if (newValue === ALL_TAB) {
      navigate(routes.app);
    } else {
      navigate(routes.forSubscription(subscriptions.find((s) => s.id === newValue)));
    }
  };

  return (
    <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}`, px: { xs: 1, sm: 2 } }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons={false}
        aria-label={t("notifications_topic_tabs")}
        sx={{
          minHeight: look.tabsHeight,
          "& .MuiTabs-indicator": { display: "none" },
          "& .MuiTabs-flexContainer": { gap: 0.5, alignItems: "center", height: look.tabsHeight },
        }}
      >
        <TopicTab value={ALL_TAB} label={t("notifications_topic_tabs_all")} newCount={totalNew} />
        {subscriptions.map((subscription) => (
          <TopicTab
            key={subscription.id}
            value={subscription.id}
            label={topicDisplayName(subscription)}
            newCount={subscription.new}
            dotColor={topicColor(subscription)?.background}
          />
        ))}
      </Tabs>
    </Box>
  );
};

// Selected: light grey fill and primary text (Finance Tracker's active tab). Topic colour is a small dot.
const TopicTab = ({ label, newCount, dotColor, ...props }) => (
  <Tab
    {...props}
    disableRipple
    label={
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
        {dotColor && <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 }} />}
        {label}
        {newCount > 0 && (
          <Box
            component="span"
            sx={{
              minWidth: 18,
              height: 18,
              px: 0.5,
              borderRadius: `${look.radiusSelector}px`,
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {newCount > 99 ? "99+" : newCount}
          </Box>
        )}
      </Box>
    }
    sx={{
      minHeight: 32,
      height: 32,
      minWidth: 0,
      px: 1.25,
      py: 0,
      borderRadius: `${look.radiusField}px`,
      textTransform: "none",
      fontSize: 14,
      fontWeight: 600,
      color: "text.secondary",
      "&:hover": { color: "text.primary" },
      "&.Mui-selected": {
        backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.08), // base-content 8%, like the .tabbar active item
        color: "primary.main",
      },
    }}
  />
);

export default TopicTabBar;
