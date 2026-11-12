import { useEffect, useState } from "react";
import { ROLE_LABELS } from "../data/sample.js";
import { toast } from "../ui/components.jsx";
import { isEmail } from "./Forms.jsx";
import ImageAdjuster from "./ImageAdjuster.jsx";
import { getProfileKey, LOCAL_KEYS, readLocalImage, usePersistentState, writeLocalData } from "../lib/localData.js";

// Edit user details and save an optional profile photo on this device.
export function ProfilePage({ role, user, setUser, img, setImg }) {
  const [form, setForm] = useState(user);
  const [msg, setMsg] = useState("");
  const [fileMsg, setFileMsg] = useState("");
  const [imageDraft, setImageDraft] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageDraft(await readLocalImage(file));
      setFileMsg("");
    } catch (error) {
      setFileMsg(error.message);
    } finally {
      e.target.value = "";
    }
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setMsg("Name is required.");
    if (!isEmail(form.email)) return setMsg("Enter a valid email address.");
    try {
      writeLocalData(getProfileKey(role, form.email), { ...form, image: img });
      setMsg(""); setUser(form); toast("Profile saved on this device.");
    } catch (error) {
      setMsg("Could not save your profile in this browser. Free storage space and try again.");
    }
  };
  return (
    <>
      <div className="card"><h3>Profile</h3>
        <form className="prof" onSubmit={save} noValidate>
          <div style={{ textAlign: "center" }}>
            <div className="av">{img ? <img src={img} alt="Profile preview" /> : form.name[0]}</div><br />
            <label className="btn ol sm" style={{ cursor: "pointer" }}>{img ? "Change" : "Upload"} Profile Picture
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden /></label>
            <div className="msg" role="alert">{fileMsg}</div>
            <small style={{ color: "var(--mu)" }}>JPG, PNG or WEBP, max 8 MB. Save changes to keep it on this device.</small>
          </div>
          <div className="frm">
            <label>Full Name<span className="fld"><input value={form.name} onChange={set("name")} /></span></label>
            <label>Email Address<span className="fld"><input type="email" value={form.email} onChange={set("email")} /></span></label>
            <label>Phone Number<span className="fld"><input value={form.phone} onChange={set("phone")} /></span></label>
            <label>Role<span className="fld"><input value={ROLE_LABELS[role]} disabled /></span></label>
            <div className="msg" role="alert" style={{ gridColumn: "1/-1" }}>{msg}</div>
            <button className="btn" style={{ width: "max-content" }}>Save Changes</button>
          </div>
        </form>
      </div>
      {imageDraft && <ImageAdjuster src={imageDraft} aspect={1} title="profile picture" onCancel={() => setImageDraft("")} onSave={(image) => { setImg(image); setImageDraft(""); }} onError={setFileMsg} />}
    </>
  );
}

// Reusable persisted preference toggle for portal settings.
function Switch({ label, value, onChange }) {
  return <div className="li"><span className="f">{label}</span><button className={`sw ${value ? "on" : ""}`} role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} /></div>;
}

const DEFAULT_PREFERENCES = { orderNotifications: true, promotions: true, publicProfile: false, darkMode: false };

// Persist account preferences and expose homepage image controls to admins.
export function SettingsPage({ onLogout, role }) {
  const [preferences, setPreferences] = usePersistentState(LOCAL_KEYS.preferences, DEFAULT_PREFERENCES);
  const [featureImages, setFeatureImages] = usePersistentState(LOCAL_KEYS.featureImages, {});
  const [imageError, setImageError] = useState("");
  const [imageDraft, setImageDraft] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.darkMode ? "dark" : "light";
  }, [preferences.darkMode]);

  const updatePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
  const selectFeatureImage = async (key, label, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const src = await readLocalImage(file);
      setImageDraft({ key, label, src, aspect: key === "hero" ? 4 / 3 : 1 });
      setImageError("");
    } catch (error) {
      setImageError(error.message);
    } finally {
      event.target.value = "";
    }
  };
  const features = [
    ["hero", "Homepage hero image"],
    ["fastDelivery", "Fast Delivery feature"],
    ["securePayment", "Secure Payment feature"],
    ["topRestaurants", "Top Restaurants feature"],
    ["support", "Support feature"],
  ];

  return (
    <div className="card"><h3>Settings</h3>
      <Switch label="Order and delivery notifications" value={preferences.orderNotifications} onChange={(value) => updatePreference("orderNotifications", value)} />
      <Switch label="Promotions and offers" value={preferences.promotions} onChange={(value) => updatePreference("promotions", value)} />
      <Switch label="Show my profile to restaurants and riders" value={preferences.publicProfile} onChange={(value) => updatePreference("publicProfile", value)} />
      <Switch label="Dark theme" value={preferences.darkMode} onChange={(value) => updatePreference("darkMode", value)} />
      {role === "ADMIN" && <section className="feature-settings">
        <h3>System Feature Images</h3>
        <p>Upload images used on the public homepage. Images are resized and saved in this browser.</p>
        {features.map(([key, label]) => <div className="feature-upload" key={key}>
          <div className="feature-preview">{featureImages[key] ? <img src={featureImages[key]} alt={`${label} preview`} /> : <span>Default image</span>}</div>
          <label className="btn ol sm upload-button">{label}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFeatureImage(key, label, event)} /></label>
          {featureImages[key] && <button className="btn gh sm" onClick={() => setFeatureImages((current) => { const next = { ...current }; delete next[key]; return next; })}>Use default</button>}
        </div>)}
        <div className="msg" role="alert">{imageError}</div>
      </section>}
      <button className="btn ol sm" style={{ marginTop: 12 }} onClick={onLogout}>Log Out</button>
      {imageDraft && <ImageAdjuster src={imageDraft.src} aspect={imageDraft.aspect} title={imageDraft.label} onCancel={() => setImageDraft(null)} onSave={(image) => {
        setFeatureImages((current) => ({ ...current, [imageDraft.key]: image }));
        setImageDraft(null);
        toast("Feature image saved on this device.");
      }} onError={setImageError} />}
    </div>
  );
}
