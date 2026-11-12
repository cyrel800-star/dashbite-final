import { useEffect, useState } from "react";
import logoUrl from "../../assets/logo.svg";
import { ROLE_LABELS } from "../data/sample.js";
import { authLeft } from "../data/images.js";

export const toast = (message) => window.dispatchEvent(new CustomEvent("dashbite:toast", { detail: message }));

// Global transient status message listener for portal actions.
export function Toaster() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer;
    const onToast = (e) => { setMessage(e.detail); clearTimeout(timer); timer = setTimeout(() => setMessage(""), 2600); };
    window.addEventListener("dashbite:toast", onToast);
    return () => { window.removeEventListener("dashbite:toast", onToast); clearTimeout(timer); };
  }, []);
  return message ? <div className="toast" role="status">{message}</div> : null;
}

// Shared logo, food image, tag, and empty-state primitives.
export const Logo = ({ dark }) => (
  <div className="logo" style={dark ? { color: "#fff" } : undefined}>
    <img src={logoUrl} alt="" width="38" height="38" />Dash<b>Bite</b>
  </div>
);
export const Food = ({ src, alt = "", className = "", style }) => <div className={`food ${className}`} style={style}><img src={src} alt={alt} /></div>;
export const Tag = ({ tone = "a", children }) => <span className={`tg ${tone}`}>{children}</span>;
export const Empty = ({ icon, children }) => <div className="card empty"><em>{icon}</em>{children}</div>;

// Lightweight SVG analytics chart used in portal dashboards.
export function Chart({ points, h = 140 }) {
  const values = points.length > 1 ? points : points.length === 1 ? [points[0], points[0]] : [0, 0];
  const w = 300, max = Math.max(...values, 1) * 1.15;
  const pts = values.map((v, i) => `${(i * w) / (values.length - 1)},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: h }} aria-hidden="true">
      <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF6B00" stopOpacity=".35" /><stop offset="1" stopColor="#FF6B00" stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#fill)" />
      <polyline points={pts} fill="none" stroke="#FF6B00" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Summary statistic card used across admin, restaurant, and rider views.
export function StatCard({ icon, label, value, delta, spark }) {
  return (
    <div className="card">
      <div className="st"><span className="ic">{icon}</span><span>{label}<b>{value}</b>{delta && <span className="up">{delta}</span>}</span></div>
      {spark && <Chart points={[3, 5, 4, 7, 6, 9, 8, 11]} h={34} />}
    </div>
  );
}

// Restaurant preview card shared by public landing and customer browse screens.
export function RestaurantCard({ r, fav, onFav, onViewMenu = () => toast("Sign in to browse this restaurant's menu.") }) {
  return (
    <article className="rc">
      <Food src={r.img} alt={r.name} style={{ minHeight: 130, borderRadius: 0 }} />
      <button className="fav" onClick={() => onFav(r.name)} aria-label={`Favorite ${r.name}`} aria-pressed={fav}>{fav ? "❤️" : "🤍"}</button>
      <div className="b">
        <b>{r.name}</b>
        <span>⭐ {r.rating} <small>({r.reviews})</small></span>
        <small>🕒 {r.eta} min · ₱{r.fee} delivery fee</small>
        <button className="btn ol sm" onClick={onViewMenu}>View Menu →</button>
      </div>
    </article>
  );
}

// Portal navigation, top bar, and responsive shell.
export function Sidebar({ nav, view, setView, open, onLogout }) {
  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <Logo dark />
      {nav.map(([key, icon, label, badge]) => (
        <button key={key} className={key === view ? "on" : ""} onClick={() => setView(key)}>
          <span>{icon}</span>{label}{badge && <span className="badge">{badge}</span>}
        </button>
      ))}
      <span className="sp" />
      <button onClick={onLogout}>🚪 Log Out</button>
      <div className="ad">Good Food<br /><span className="or">Faster Delivery</span></div>
    </aside>
  );
}

// Search, notifications, and account controls above every portal screen.
export function TopBar({ placeholder, q, setQ, user, img, role, onMenu, onProfile }) {
  return (
    <div className="top">
      <button className="ib menu-btn" onClick={onMenu} aria-label="Menu">☰</button>
      <label className="fld">🔍<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} /></label>
      <button className="ib" onClick={() => toast("3 new notifications (sample data)")} aria-label="Notifications">🔔<span className="badge">3</span></button>
      <button className="me" onClick={onProfile}>
        <span className="av">{img ? <img src={img} alt="" /> : user.name[0]}</span>
        <span><b>Hi, {user.name.split(" ")[0]}!</b><small style={{ display: "block", color: "var(--mu)" }}>{ROLE_LABELS[role]}</small></span>
      </button>
    </div>
  );
}

// Responsive application shell that coordinates sidebar and active content.
export function PortalShell({ role, nav, view, setView, user, img, placeholder, q, setQ, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const go = (v) => { setView(v); setOpen(false); };
  return (
    <div className="shell">
      <Sidebar nav={nav} view={view} setView={go} open={open} onLogout={onLogout} />
      <main className="main">
        <TopBar placeholder={placeholder} q={q} setQ={setQ} user={user} img={img} role={role} onMenu={() => setOpen(!open)} onProfile={() => go("profile")} />
        {children}
      </main>
    </div>
  );
}

// Shared split layout for sign-in and account creation pages.
export function AuthLayout({ children }) {
  return (
    <div className="auth">
      <div className="l">
        <Logo dark />
        <h1 style={{ color: "#fff" }}>Your Favorite Food <span>Delivered Fast</span></h1>
        <p>Good Food. Faster Delivery.</p>
        <span className="tag">🛵 Fast Delivery</span><span className="tag">🛡️ Secure Payment</span><span className="tag">🎧 24/7 Support</span>
        <Food src={authLeft} alt="" />
      </div>
      <div className="r">{children}</div>
    </div>
  );
}
