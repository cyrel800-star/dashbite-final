import { useState } from "react";
import { api } from "../lib/api.js";
import { Field, PasswordField } from "./Forms.jsx";
import { Logo } from "../ui/components.jsx";
import Icon from "../ui/Icon.jsx";

export default function ResetPasswordFlow({ token, email, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setMsg("Passwords do not match.");
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");

    setLoading(true);
    setMsg("");
    try {
      await api.resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      setMsg(err.message || "Failed to reset password. The link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div className="card" style={{ width: "min(100%, 400px)", padding: 32 }}>
        <Logo dark style={{ margin: "0 auto 20px" }} />
        <h2 style={{ textAlign: "center", marginBottom: 8 }}>New Password</h2>
        
        {success ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--green)", marginBottom: 20 }}>Password reset successfully!</p>
            <button className="btn" onClick={onComplete} style={{ width: "100%" }}>Back to Login</button>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <p style={{ fontSize: 13, color: "var(--mu)", textAlign: "center", marginBottom: 20 }}>
              Enter a new password for <b>{email}</b>
            </p>
            
            <div className="login-field">
              <span>New Password</span>
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            
            <div className="login-field">
              <span>Confirm Password</span>
              <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <div className="msg" role="alert">{msg}</div>
            
            <button className="btn" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
              {loading ? "Resetting..." : "Reset Password"} <Icon name="arrow" size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}