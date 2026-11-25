import { useState } from "react";
import { NAV } from "../data/sample.js";
import { Empty, PortalShell } from "../ui/components.jsx";
import { ProfilePage, SettingsPage } from "./ProfileSettings.jsx";

// Shared portal router for role screens, profile, and settings.
export default function PortalFrame({ role, user, setUser, img, setImg, onLogout, placeholder, screens, isGuest, onSwitch }) {
  // 1. Force guests to land on "browse" instead of "dash"
  const [view, setView] = useState(isGuest ? "browse" : "dash");
  const [q, setQ] = useState("");
  
  // 2. Filter the sidebar so guests only see "Browse Restaurants"
  const nav = isGuest 
    ? [["browse", "store", "Browse Restaurants"]] 
    : NAV[role];
    
  const current = nav.find((n) => n[0] === view) || nav[0];
  let body;
  
  // Resolve role-specific screens first, then fallback to shared screens.
  if (screens && screens[view]) body = screens[view]({ q, setView });
  else if (view === "profile") body = <ProfilePage role={role} user={user} setUser={setUser} img={img} setImg={setImg} />;
  else if (view === "settings") body = <SettingsPage role={role} onLogout={onLogout} />;
  else body = <Empty icon="🧭"><b>{current[2]}</b><br />No records are available for this section yet.</Empty>;
  
  return (
    <PortalShell role={role} nav={nav} view={view} setView={setView} user={user} img={img} placeholder={placeholder} q={q} setQ={setQ} onLogout={onLogout} isGuest={isGuest} onSwitch={onSwitch}>
      {body}
    </PortalShell>
  );
}