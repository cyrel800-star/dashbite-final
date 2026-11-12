// Temporary frontend sample data. Replace with API data as endpoints become available.
import { burger, pizza, noodles, chicken } from "./images.js";

// Static restaurant cards, category filters, and role labels.
export const RESTAURANTS = [
  { name: "Burger House", rating: 4.8, reviews: "120+", eta: "20–35", fee: 20, cuisine: "Burgers", img: burger },
  { name: "Pizza Corner", rating: 4.7, reviews: "95+", eta: "25–40", fee: 25, cuisine: "Pizza", img: pizza },
  { name: "Noodle City", rating: 4.6, reviews: "78+", eta: "20–35", fee: 20, cuisine: "Noodles", img: noodles },
  { name: "Chicken Express", rating: 4.5, reviews: "64+", eta: "25–40", fee: 25, cuisine: "Chicken", img: chicken },
];
export const CATEGORIES = [["All", "🍽️"], ["Burgers", "🍔"], ["Pizza", "🍕"], ["Noodles", "🍜"], ["Chicken", "🍗"], ["Dessert", "🧁"], ["Drinks", "🥤"]];
export const ROLE_LABELS = { CUSTOMER: "Customer", RESTAURANT: "Restaurant Owner", RIDER: "Rider", ADMIN: "Administrator" };

// Role-specific sidebar links: [screen key, icon, label, optional badge].
export const NAV = {
  CUSTOMER: [["dash", "🏠", "Home"], ["browse", "🍴", "Browse Restaurants"], ["orders", "🛍️", "My Orders"], ["favorites", "❤️", "Favorites"], ["reviews", "⭐", "Reviews"], ["chat", "💬", "Chat"], ["profile", "👤", "Profile"], ["settings", "⚙️", "Settings"]],
  RESTAURANT: [["dash", "🏠", "Dashboard"], ["orders", "🛍️", "Orders", 12], ["menu", "🍴", "Menu Management"], ["hours", "🕒", "Operating Hours"], ["analytics", "📊", "Analytics"], ["reviews", "⭐", "Reviews"], ["chat", "💬", "Customer Chat"], ["profile", "👤", "Profile"], ["settings", "⚙️", "Settings"]],
  RIDER: [["dash", "🏠", "Dashboard"], ["offers", "🛵", "Delivery Offers", 3], ["deliveries", "📦", "My Deliveries"], ["earnings", "👛", "Earnings"], ["chat", "💬", "Chat"], ["profile", "👤", "Profile"], ["settings", "⚙️", "Settings"]],
  ADMIN: [["dash", "🏠", "Dashboard"], ["users", "👥", "Manage Users"], ["discrepancies", "⚠️", "Discrepancy Queue"], ["payments", "💳", "Payments & Settlement"], ["settings", "⚙️", "Settings & Boundary"], ["orders", "🛍️", "All Orders"], ["restaurants", "🏪", "Restaurants"], ["riders", "🛵", "Riders"], ["reports", "📊", "Reports"], ["logs", "📄", "System Logs"]],
};
