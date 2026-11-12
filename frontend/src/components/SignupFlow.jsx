import { useState } from "react";
import { AuthLayout } from "../ui/components.jsx";
import { Field, PasswordField, isEmail } from "./Forms.jsx";
import { LOCAL_KEYS, readLocalData, writeLocalData } from "../lib/localData.js";

// Validate and save a demo account in this browser's local storage.
export default function SignupFlow({ onSwitch }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Enter your full name.");
    if (!isEmail(f.email)) return setError("Enter a valid email address.");
    if (!/^[+\d\s-]{7,}$/.test(f.phone)) return setError("Enter a valid phone number.");
    if (f.password.length < 8) return setError("Password needs at least 8 characters.");
    if (!f.role) return setError("Select a role.");
    const accounts = readLocalData(LOCAL_KEYS.accounts, []);
    if (accounts.some((account) => account.email.toLowerCase() === f.email.trim().toLowerCase())) {
      return setError("An account with this email already exists on this device.");
    }
    const account = {
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      role: f.role,
      status: f.role === "CUSTOMER" ? "APPROVED" : "PENDING_APPROVAL",
      createdAt: new Date().toISOString(),
    };
    try {
      writeLocalData(LOCAL_KEYS.accounts, [...accounts, account]);
      setError("");
      setDone(f.role === "CUSTOMER"
        ? "Your account is ready. You can sign in now."
        : `Your ${f.role === "RIDER" ? "rider" : "restaurant"} account was submitted for admin approval. We’ll notify you when an admin approves it. Notifications aren’t active in this demo, so please check back and sign in after approval.`);
    } catch (saveError) {
      setError("Could not save your account in this browser. Free storage space and try again.");
    }
  };
  if (done) {
    return (
      <AuthLayout>
        <section className="box signup-success" aria-labelledby="signup-success-title">
          <span className="confirmation-icon" aria-hidden="true">✓</span>
          <h2 id="signup-success-title">{f.role === "CUSTOMER" ? "Sign-up complete" : "Application submitted"}</h2>
          <p className="signup-success-message" role="status">{done}</p>
          <button type="button" className="btn" style={{ justifyContent: "center" }} onClick={() => onSwitch("signin")}>Go to Sign In →</button>
          <button type="button" className="or signup-home-button" onClick={() => onSwitch("home")}>Back to Home</button>
        </section>
      </AuthLayout>
    );
  }
  // Collect the account details and show the result of local registration.
  return (
    <AuthLayout>
      <form className="box" onSubmit={submit} noValidate>
        <button type="button" className="ib" onClick={() => onSwitch("home")} aria-label="Back">←</button>
        <h2>Create Account</h2><p>Join DashBite and enjoy delicious food delivered to your door.</p>
        <Field icon="👤"><input value={f.name} onChange={set("name")} placeholder="Full Name" /></Field>
        <Field icon="✉️"><input type="email" value={f.email} onChange={set("email")} placeholder="Email Address" /></Field>
        <Field icon="📞"><input value={f.phone} onChange={set("phone")} placeholder="Phone Number" /></Field>
        <PasswordField value={f.password} onChange={set("password")} placeholder="Password (min. 8 characters)" />
        <Field icon="🏪"><select value={f.role} onChange={set("role")}><option value="">Select Role</option><option value="CUSTOMER">Customer</option><option value="RESTAURANT">Restaurant</option><option value="RIDER">Rider</option></select></Field>
        <small style={{ color: "var(--mu)", textAlign: "right" }}>Restaurant owners will need to provide restaurant details.</small>
        <div className={`msg ${done ? "ok" : ""}`} role="alert">{done || error}</div>
        <button className="btn" style={{ justifyContent: "center" }}>Sign Up →</button>
        <p>Already have an account? <button type="button" className="or" style={{ background: "none", border: 0, fontWeight: 700 }} onClick={() => onSwitch("signin")}>Sign In →</button></p>
      </form>
    </AuthLayout>
  );
}
