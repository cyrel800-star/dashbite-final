import { useState } from "react";
import { getPreviewSession, startPreviewSession, clearPreviewSession } from "./lib/previewSession.js";
import { ROLES } from "./data/constants.js";
import { setAuthToken } from "./lib/api.js";
import Landing from "./components/Landing.jsx";
import LoginFlow from "./components/LoginFlow.jsx";
import SignupFlow from "./components/SignupFlow.jsx";
import CustomerPortal from "./components/customer/CustomerPortal.jsx";
import RestaurantPortal from "./components/restaurant/RestaurantPortal.jsx";
import RiderPortal from "./components/rider/RiderPortal.jsx";
import AdminPortal from "./components/admin/AdminPortal.jsx";
import { Toaster } from "./ui/components.jsx";
import { getProfileKey, LOCAL_KEYS, readLocalData } from "./lib/localData.js";

// Route each signed-in role to its portal and assign readable demo identities.
const PORTALS = { CUSTOMER: CustomerPortal, RESTAURANT: RestaurantPortal, RIDER: RiderPortal, ADMIN: AdminPortal };
const DEMO_NAMES = { CUSTOMER: "Archie Demo", RESTAURANT: "Burger House", RIDER: "Mark Santos", ADMIN: "Admin" };

// Restore the preview session and its profile from this browser.
export default function App() {
  const [screen, setScreen] = useState("home");
  const [session, setSession] = useState(() => ROLES.map((r) => getPreviewSession(r)).find(Boolean) || null);
  const [user, setUser] = useState(() => {
    if (!session) return { name: "Archie Demo", email: "", phone: "+63 912 345 6789" };
    const savedProfile = readLocalData(getProfileKey(session.role, session.email), null);
    const account = readLocalData(LOCAL_KEYS.accounts, []).find((item) =>
      item.email.toLowerCase() === session.email.toLowerCase() && item.role === session.role);
    return savedProfile || (account ? { name: account.name, email: account.email, phone: account.phone } : {
      name: DEMO_NAMES[session.role], email: session.email, phone: "+63 912 345 6789",
    });
  });
  const [img, setImg] = useState(() => session ? readLocalData(getProfileKey(session.role, session.email), null)?.image || null : null);

  // Start and clear sessions.
  const signIn = ({ role, email, status = "APPROVED", user: authUser, token }) => {
    if (token) setAuthToken(token);
    startPreviewSession({ role, status, email });
    const account = readLocalData(LOCAL_KEYS.accounts, []).find((item) =>
      item.email.toLowerCase() === email.toLowerCase() && item.role === role);
    const savedProfile = readLocalData(getProfileKey(role, email), null);
    setUser(savedProfile || (account ? { name: account.name, email: account.email, phone: account.phone } : {
      name: authUser?.name || DEMO_NAMES[role], email, phone: authUser?.phone || "+63 912 345 6789",
    }));
    setImg(savedProfile?.image || null);
    setSession({ role, status, email, user: authUser });
  };
  const logout = () => {
    setAuthToken(null);
    clearPreviewSession();
    setSession(null);
    setImg(null);
    setScreen("home");
  };

  // Render the current auth, landing, or portal screen.
  const Portal = session && PORTALS[session.role];
  return (
    <>
      {Portal ? <Portal user={user} setUser={setUser} img={img} setImg={setImg} onLogout={logout} session={session} />
        : screen === "signin" ? <LoginFlow onSignedIn={signIn} onSwitch={setScreen} />
        : screen === "signup" ? <SignupFlow onSwitch={setScreen} />
        : <Landing onSwitch={setScreen} />}
      <Toaster />
    </>
  );
}
