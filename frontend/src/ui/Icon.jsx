const paths = {
  home: ["M3 10.5 12 3l9 7.5", "M5.5 9.5V21h13V9.5", "M9 21v-7h6v7"],
  utensils: ["M3 3v7a3 3 0 0 0 6 0V3", "M6 3v18", "M18 3v18", "M18 3c-2 2-3 4-3 7h3"],
  receipt: ["M5 3 7 4.5 9 3l3 1.5L15 3l2 1.5L19 3v18l-2-1.5-2 1.5-3-1.5L9 21l-2-1.5L5 21z", "M8 9h8", "M8 13h8", "M8 17h4"],
  heart: ["M20.8 8.8c0 5.2-8.8 11-8.8 11S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"],
  star: ["m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"],
  message: ["M21 11.5a8.4 8.4 0 0 1-9 8.5 9.3 9.3 0 0 1-4-.9L3 21l1.5-4A8.3 8.3 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"],
  store: ["M3 10h18", "M5 10v11h14V10", "M4 10 5 4h14l1 6", "M9 21v-6h6v6"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v6l4 2"],
  chart: ["M3 3v18h18", "m7 14 4-4 3 3 6-7"],
  motorcycle: ["M5 17a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M19 17a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M5 20h5l4-8h4l2 5", "M10 12h4", "m14 12-2-4h-3"],
  package: ["m12 3 9 5-9 5-9-5 9-5Z", "M3 8v9l9 5 9-5V8", "M12 13v9", "M7.5 5.5l9 5"],
  wallet: ["M4 6h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h13", "M21 11h-5a2 2 0 0 0 0 4h5", "M16 13h.01"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M20 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  alert: ["M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z", "M12 9v4", "M12 17h.01"],
  card: ["M3 5h18v14H3z", "M3 10h18", "M7 15h3"],
  coins: ["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Z", "M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 10v5c0 1.7 3.6 3 8 3", "M20 10v2", "M16 17.5 18 19l4-4"],
  mapPin: ["M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  "eye-off": ["m3 3 18 18", "M10.6 10.6a2 2 0 0 0 2.8 2.8", "M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15.7 15.7 0 0 1-3.2 4.2", "M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.8"],
  utensilsCrossed: ["m16 2 6 6", "m17 7-3 3", "M2 22l10-10", "m3 3 8 8", "M5 2 2 5l7 7", "m13 11 7-7a2 2 0 0 1 3 3l-7 7"],
  loading: ["M12 2v4", "M12 18v4", "m4.9 4.9 2.8 2.8", "m16.3 16.3 2.8 2.8", "M2 12h4", "M18 12h4", "m4.9 19.1 2.8-2.8", "m16.3 7.7 2.8-2.8"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
  party: ["M5 3 21 19", "m5 3 2 13 13 3", "M11 9 8 18", "m15 13-9 3", "M5 3l-2 2"],
  shield: ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m9 12 2 2 4-4"],
  headphones: ["M3 14v-3a9 9 0 0 1 18 0v3", "M3 14h4v7H5a2 2 0 0 1-2-2v-5Z", "M21 14h-4v7h2a2 2 0 0 0 2-2v-5Z"],
  arrow: ["M5 12h14", "m12 5 7 7-7 7"],
  check: ["m5 12 4 4L19 6"],
  circle: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0"],
  restaurant: ["M3 3v7a3 3 0 0 0 6 0V3", "M6 3v18", "M15 3v18", "M15 3c3 2 5 5 5 8h-5"],
  burger: ["M4 10a8 8 0 0 1 16 0", "M3 12h18", "M4 15h16", "M5 18h14"],
  pizza: ["M4 4c5-2 11-2 16 0l-7 17L4 4Z", "M8 7h.01", "M14 8h.01", "M10 12h.01"],
  noodles: ["M3 12h18", "M5 12a7 7 0 0 0 14 0", "M8 3v5", "M12 2v6", "M16 3v5"],
  cake: ["M4 12h16v9H4z", "M4 16h16", "M8 12V8", "M12 12V5", "M16 12V8"],
  drink: ["M6 3h12l-1 18H7L6 3Z", "M7 8h10", "M10 3V1", "m14 3 2-2"],
  phone: ["M7 3h10v18H7z", "M11 17h2"],
  mail: ["M3 5h18v14H3z", "m3 6 9 7 9-7"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"],
  plus: ["M12 5v14", "M5 12h14"],
};

const aliases = {
  "🏠": "home", "🍴": "utensils", "🍽️": "utensils", "🛍️": "receipt",
  "❤️": "heart", "🤍": "heart", "⭐": "star", "💬": "message",
  "👤": "user", "⚙️": "settings", "🏪": "store", "🕒": "clock",
  "📊": "chart", "🛵": "motorcycle", "📦": "package", "👛": "wallet",
  "👥": "users", "⚠️": "alert", "💳": "card", "💰": "coins",
  "📍": "mapPin", "🔎": "search", "🔍": "search", "🔔": "bell",
  "☰": "menu", "🚪": "logout", "👁️": "eye", "🙈": "eye-off",
  "🍔": "burger", "🍕": "pizza", "🍜": "noodles", "🍗": "utensils",
  "🧁": "cake", "🥤": "drink", "⏳": "loading", "🧭": "mapPin",
  "🧾": "receipt", "🍳": "utensils", "🔒": "lock", "😴": "clock",
  "🎉": "party",   "🛡️": "shield", "🎧": "headphones", "✉️": "mail", "📞": "phone", "₱": "coins", "✓": "check",
  "📄": "receipt", "📋": "receipt", "🟢": "circle", "⚪": "circle",
};

// Small, dependency-free outline icon set shared by desktop and mobile UI.
export default function Icon({ name = "circle", size = 20, className = "", strokeWidth = 1.8, ...props }) {
  const iconName = aliases[name] || name;
  const iconPaths = paths[iconName] || paths.circle;

  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ width: size, height: size }}
      {...props}
    >
      {iconPaths.map((path, index) => <path d={path} key={`${iconName}-${index}`} />)}
    </svg>
  );
}
