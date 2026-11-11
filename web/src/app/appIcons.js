// Sender icons for notification cards. A sender adds an `app-<key>` tag
// (`notify send --app <key>`, NTFY_APP, or the ntfy MCP, which sends `app-claude`).
// PNGs live in web/public/static/app-icons/<key>.png. Add a key here and a PNG there for a new sender.

export const APP_TAG_PREFIX = "app-";

const APPS = {
  // Apps (their own icons)
  jot: "Jot",
  "health-tracker": "Health Tracker",
  "pool-log": "Pool Log",
  "web-clipper": "Web Clipper",
  dashboard: "Homelab Dashboard",
  fintrack: "Finance Tracker",
  "bear-tools": "Bear Tools",
  claude: "Claude",
  // Script families (made icons)
  backup: "Backup",
  vault: "Vault",
  "health-check": "Health check",
  deploy: "Deploy",
  maintenance: "Maintenance",
  bear: "Bear",
};

export const isAppTag = (tag) => typeof tag === "string" && tag.startsWith(APP_TAG_PREFIX);

/** The sender of a notification, from its first known `app-*` tag, or null. */
export const appFromTags = (tags) => {
  const key = tags
    ?.filter(isAppTag)
    .map((tag) => tag.slice(APP_TAG_PREFIX.length).toLowerCase())
    .find((k) => k in APPS);
  return key ? { key, name: APPS[key], icon: `/static/app-icons/${key}.png` } : null;
};
