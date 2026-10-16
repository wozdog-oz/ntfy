// Fixed colours for well-known topics, keyed by lower-case topic name (or display name).
// Topics not listed here fall back to the theme's default chip/tab styling.
const topicColors = {
  info: { background: "#46668e", text: "#ffffff" },
  claude: { background: "#d97351", text: "#ffffff" },
  alerts: { background: "#c1121f", text: "#ffffff" },
};

export const topicColor = (subscription) => {
  if (!subscription) {
    return null;
  }
  return topicColors[subscription.topic?.toLowerCase()] ?? topicColors[subscription.displayName?.toLowerCase()] ?? null;
};

export default topicColors;
