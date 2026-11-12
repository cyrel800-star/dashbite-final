// Temporary frontend sample data. Replace with API data as endpoints become available.
import { burger, pizza, noodles, chicken } from "./images.js";

// Static restaurant cards, category filters, and role labels.
export const RESTAURANTS = [
  { name: "Burger House", rating: 4.8, reviews: "120+", eta: "20–35", fee: 20, cuisine: "Burgers", img: burger },
  { name: "Pizza Corner", rating: 4.7, reviews: "95+", eta: "25–40", fee: 25, cuisine: "Pizza", img: pizza },
  { name: "Noodle City", rating: 4.6, reviews: "78+", eta: "20–35", fee: 20, cuisine: "Noodles", img: noodles },
  { name: "Chicken Express", rating: 4.5, reviews: "64+", eta: "25–40", fee: 25, cuisine: "Chicken", img: chicken },
];
export const CATEGORIES = [["All", "utensils"], ["Burgers", "burger"], ["Pizza", "pizza"], ["Noodles", "noodles"], ["Chicken", "utensils"], ["Dessert", "cake"], ["Drinks", "drink"]];
export const ROLE_LABELS = { CUSTOMER: "Customer", RESTAURANT: "Restaurant Owner", RIDER: "Rider", ADMIN: "Administrator" };

// Role-specific sidebar links: [screen key, icon, label, optional badge].
export const NAV = {
  CUSTOMER: [["dash", "home", "Home"], ["browse", "store", "Browse Restaurants"], ["orders", "receipt", "My Orders"], ["favorites", "heart", "Favorites"], ["reviews", "star", "Reviews"], ["chat", "message", "Chat"], ["profile", "user", "Profile"], ["settings", "settings", "Settings"]],
  RESTAURANT: [["dash", "home", "Dashboard"], ["orders", "receipt", "Orders", 12], ["menu", "utensils", "Menu Management"], ["hours", "clock", "Operating Hours"], ["analytics", "chart", "Analytics"], ["reviews", "star", "Reviews"], ["chat", "message", "Customer Chat"], ["profile", "user", "Profile"], ["settings", "settings", "Settings"]],
  RIDER: [["dash", "home", "Dashboard"], ["offers", "motorcycle", "Delivery Offers", 3], ["deliveries", "package", "My Deliveries"], ["earnings", "wallet", "Earnings"], ["chat", "message", "Chat"], ["profile", "user", "Profile"], ["settings", "settings", "Settings"]],
  ADMIN: [["dash", "home", "Dashboard"], ["users", "users", "Manage Users"], ["discrepancies", "alert", "Discrepancy Queue"], ["payments", "card", "Payments & Settlement"], ["settings", "settings", "Settings & Boundary"], ["orders", "receipt", "All Orders"], ["restaurants", "store", "Restaurants"], ["riders", "motorcycle", "Riders"], ["reports", "chart", "Reports"], ["logs", "receipt", "System Logs"]],
};
