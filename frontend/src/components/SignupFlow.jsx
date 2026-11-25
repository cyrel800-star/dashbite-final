import { useState } from "react";
import { AuthLayout } from "../ui/components.jsx";
import { Field, PasswordField, isEmail } from "./Forms.jsx";
import { api, formatError } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";

// Validate and save a real account in the database.
export default function SignupFlow({ onSwitch }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDone("");
    
    if (!f.name.trim()) return setError("Enter your full name.");
    if (!isEmail(f.email)) return setError("Enter a valid email address.");
    if (!/^[+\d\s-]{7,}$/.test(f.phone)) return setError("Enter a valid phone number.");
    if (f.password.length < 8) return setError("Password needs at least 8 characters.");
    if (!f.role) return setError("Select a role.");

    try {
      await api.register({
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        password: f.password,
        role: f.role, // Sends "CUSTOMER", "RIDER", or "RESTAURANT"
      });
      
      setDone(f.role === "CUSTOMER"
        ? "Your account is ready. You can sign in now."
        : `Your ${f.role === "RIDER" ? "rider" : "restaurant"} account was submitted for admin approval.`);
    } catch (err) {
      setError(formatError(err));
    }
  };

  if (done) {
    return (
      <AuthLayout onSwitch={onSwitch}>
        <section className="box signup-success" aria-labelledby="signup-success-title">
          <span className="confirmation-icon" aria-hidden="true"><Icon name="check" size={28} /></span>
          <h2 id="signup-success-title">{f.role === "CUSTOMER" ? "Sign-up complete" : "Application submitted"}</h2>
          <p className="signup-success-message" role="status">{done}</p>
          <button type="button" className="btn" style={{ justifyContent: "center" }} onClick={() => onSwitch("signin")}>Go to Sign In →</button>
          <button type="button" className="or signup-home-button" onClick={() => onSwitch("home")}>Back to Home</button>
        </section>
      </AuthLayout>
    );
  }
  
  // Collect the account details and show the result of registration.
  return (
    <AuthLayout onSwitch={onSwitch}>
            <form className="box" onSubmit={submit} noValidate autoComplete="off">
        <button type="button" className="ib" onClick={() => onSwitch("home")} aria-label="Back"><Icon name="arrow" size={18} /></button>
        <h2>Create Account</h2><p>Join DashBite and enjoy delicious food delivered to your door.</p>
        <Field icon="👤"><input value={f.name} onChange={set("name")} placeholder="Full Name" /></Field>
        <Field icon="✉️"><input type="email" value={f.email} onChange={set("email")} placeholder="Email Address" /></Field>
        <Field icon="📞"><input value={f.phone} onChange={set("phone")} placeholder="Phone Number" /></Field>
                <PasswordField value={f.password} onChange={set("password")} placeholder="Password (min. 8 characters)" autoComplete="new-password" />
        <Field icon="🏪"><select value={f.role} onChange={set("role")}><option value="">Select Role</option><option value="CUSTOMER">Customer</option><option value="RESTAURANT">Restaurant</option><option value="RIDER">Rider</option></select></Field>
        <small style={{ color: "var(--mu)", textAlign: "right" }}>Restaurant owners will need to provide restaurant details.</small>
        <div className={`msg ${done ? "ok" : ""}`} role="alert">{done || error}</div>
        <button className="btn" style={{ justifyContent: "center" }}>Sign Up →</button>
        <p>Already have an account? <button type="button" className="or" style={{ background: "none", border: 0, fontWeight: 700 }} onClick={() => onSwitch("signin")}>Sign In →</button></p>
      </form>
    </AuthLayout>
  );
}