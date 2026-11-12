import { useEffect, useState } from "react";
import logoUrl from "../../assets/logo.png";
import logoWhiteUrl from "../../assets/logo-white.png";
import { ROLE_LABELS } from "../data/sample.js";
import { authLeft } from "../data/images.js";
import Icon from "./Icon.jsx";

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
export const Logo = ({ dark, className = "", style, ...props }) => (
  <div className={`logo ${dark ? "dark" : ""} ${className}`.trim()} style={style} {...props}>
    <img
      src={dark ? logoWhiteUrl : logoUrl}
      alt="DashBite"
      className="logo-img"
    />
  </div>
);
export const Food = ({ src, alt = "", className = "", style }) => <div className={`food ${className}`} style={style}><img src={src} alt={alt} /></div>;
export const Tag = ({ tone = "a", children }) => <span className={`tg ${tone}`}>{children}</span>;
export const Empty = ({ icon, children }) => <div className="card empty"><em><Icon name={icon} size={34} /></em>{children}</div>;

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
      <div className="st"><span className="ic"><Icon name={icon} size={22} /></span><span>{label}<b>{value}</b>{delta && <span className="up">{delta}</span>}</span></div>
      {spark && <Chart points={[3, 5, 4, 7, 6, 9, 8, 11]} h={34} />}
    </div>
  );
}

// Restaurant preview card shared by public landing and customer browse screens.
export function RestaurantCard({ r, fav, onFav, onViewMenu = () => toast("Sign in to browse this restaurant's menu.") }) {
  return (
    <article className="rc">
      <Food src={r.img} alt={r.name} style={{ minHeight: 130, borderRadius: 0 }} />
      <button className="fav" onClick={() => onFav(r.name)} aria-label={`Favorite ${r.name}`} aria-pressed={fav}><Icon name="heart" size={18} className={fav ? "filled" : ""} /></button>
      <div className="b">
        <b>{r.name}</b>
        <span><Icon name="star" size={14} /> {r.rating} <small>({r.reviews})</small></span>
        <small><Icon name="clock" size={14} /> {r.eta} min · ₱{r.fee} delivery fee</small>
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
          <Icon name={icon} size={19} />{label}{badge && <span className="badge">{badge}</span>}
        </button>
      ))}
      <span className="sp" />
      <button onClick={onLogout}><Icon name="logout" size={19} />Log Out</button>
      <div className="ad">Good Food<br /><span className="or">Faster Delivery</span></div>
    </aside>
  );
}

// Search, notifications, and account controls above every portal screen.
export function TopBar({ placeholder, q, setQ, user, img, role, onMenu, onProfile }) {
  return (
    <div className="top">
      <button className="ib menu-btn" onClick={onMenu} aria-label="Menu"><Icon name="menu" /></button>
      <label className="fld"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} /></label>
      <button className="ib" onClick={() => toast("3 new notifications (sample data)")} aria-label="Notifications"><Icon name="bell" /><span className="badge">3</span></button>
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
  const mobileKeys = {
    CUSTOMER: [["dash", "home", "Home"], ["browse", "store", "Browse"], ["orders", "receipt", "Orders"], ["profile", "user", "Profile"]],
    RESTAURANT: [["dash", "home", "Home"], ["orders", "receipt", "Orders"], ["menu", "utensils", "Menu"], ["profile", "user", "Profile"]],
    RIDER: [["dash", "home", "Home"], ["offers", "motorcycle", "Offers"], ["deliveries", "package", "Deliveries"], ["earnings", "wallet", "Earnings"]],
    ADMIN: [["dash", "home", "Home"], ["users", "users", "Users"], ["payments", "card", "Payments"], ["orders", "receipt", "Orders"]],
  };
  const mobileNav = mobileKeys[role] || mobileKeys.CUSTOMER;
  return (
    <div className="shell">
      <Sidebar nav={nav} view={view} setView={go} open={open} onLogout={onLogout} />
      <main className="main">
        <TopBar placeholder={placeholder} q={q} setQ={setQ} user={user} img={img} role={role} onMenu={() => setOpen(!open)} onProfile={() => go("profile")} />
        {children}
      </main>
      {/* Four primary destinations stay reachable in a fixed, touch-friendly mobile tab bar. */}
      <nav className="mobile-tabs" aria-label="Main navigation">
        {mobileNav.map(([key, icon, label]) => (
          <button key={key} className={key === view ? "on" : ""} onClick={() => go(key)} aria-current={key === view ? "page" : undefined}>
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
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
        <span className="tag"><Icon name="motorcycle" size={16} /> Fast Delivery</span><span className="tag"><Icon name="shield" size={16} /> Secure Payment</span><span className="tag"><Icon name="headphones" size={16} /> 24/7 Support</span>
        <Food src={authLeft} alt="" />
      </div>
      <div className="r">{children}</div>
    </div>
  );
}
