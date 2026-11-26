import { useEffect, useRef, useState } from "react";
import { AuthLayout, Logo, toast } from "../ui/components.jsx";
import { Field, PasswordField, isEmail } from "./Forms.jsx";
import { api, setAuthToken, formatError } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";

const DEMO_OTP = "123456";

const EMAIL_ROLE_MAP = [
  ["customer", "CUSTOMER"],
  ["restaurant", "RESTAURANT"],
  ["rider", "RIDER"],
  ["admin", "ADMIN"],
];

function detectRoleFromEmail(email = "") {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return "CUSTOMER";
  for (const [token, role] of EMAIL_ROLE_MAP) {
    if (normalized.includes(token)) return role;
  }
  return "CUSTOMER";
}

export default function LoginFlow({ onSignedIn, onSwitch }) {
  const [step, setStep] = useState("credentials");
  const [loginMethod, setLoginMethod] = useState("password"); // "password" or "otp"
  const [form, setForm] = useState({ email: "", password: "", role: "CUSTOMER" });
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authData, setAuthData] = useState(null);
  
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleForgotPassword = async () => {
    if (!resetEmail) return setResetMsg("Please enter your email.");
    setResetLoading(true);
    setResetMsg("");
    try {
      await api.forgotPassword({ email: resetEmail });
      setResetMsg("Success! Check your email for the reset link.");
    } catch (err) {
      setResetMsg(err.message || "Failed to send reset link.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEmail(form.email)) return setError("Enter a valid email address.");

    if (loginMethod === "password") {
      if (!form.password) return setError("Enter your password.");
      setLoading(true);
      try {
        const data = await api.login({ email: form.email.trim(), password: form.password });
        finishLogin(data);
      } catch (err) {
        if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
          setError("Login failed. Check your email and password.");
        } else {
          setError(formatError(err));
        }
      } finally {
        setLoading(false);
      }
    } else {
      // OTP Login Method
      setLoading(true);
      try {
        await api.requestOtp({ email: form.email.trim() });
        toast("OTP Sent! Use code: 123456");
        setStep("otp");
      } catch (err) {
        if (err.code === "OTP_THROTTLED" || err.status === 429) {
          setError("Too many requests. Try again in 60 seconds.");
        } else {
          setError(formatError(err));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const finishLogin = (data) => {
    if (data?.token) setAuthToken(data.token);
    setAuthData(data);

    if (data.status === "PENDING_APPROVAL") {
      toast("Note: Your account is pending admin approval.");
    }

    // TRUST THE BACKEND: Use data.role from the database. Do not guess from email.
    const actualRole = data?.role?.toUpperCase() || "CUSTOMER";
    
    onSignedIn({
      role: actualRole,
      email: form.email,
      status: data?.status || "APPROVED",
      user: data?.user || null,
      token: data?.token || null,
    });
  };

  if (step === "otp") {
    return (
      <AuthLayout onSwitch={onSwitch}>
        <Otp
          email={form.email}
          onBack={() => setStep("credentials")}
          onVerified={finishLogin}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout onSwitch={onSwitch}>
      <form className="box login-box" onSubmit={handleCredentialsSubmit} noValidate>
        <div className="login-topline">
          <button type="button" className="ib login-back" onClick={() => onSwitch("home")} aria-label="Back"><Icon name="arrow" size={18} /></button>
          <Logo />
        </div>
        
        <div className="login-heading">
          <span className="login-eyebrow">WELCOME BACK</span>
          <h2>Sign in to DashBite</h2>
          <p>Enter your account details to continue.</p>
        </div>

        {/* Toggle between Password and OTP */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            type="button"
            className={`btn sm ${loginMethod === "password" ? "" : "gh"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setLoginMethod("password"); setError(""); }}
          >
            Use Password
          </button>
          <button
            type="button"
            className={`btn sm ${loginMethod === "otp" ? "" : "gh"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setLoginMethod("otp"); setError(""); }}
          >
            Use Login Code
          </button>
        </div>

        <div className="login-field">
          <span>Email address</span>
          <Field icon="✉️">
            <input
              type="email"
              value={form.email}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  email: nextEmail,
                  role: detectRoleFromEmail(nextEmail) || prev.role,
                }));
              }}
              placeholder="customer@test.com"
              autoComplete="email"
              disabled={loading}
            />
          </Field>
        </div>

        {/* Conditional Password Field */}
        {loginMethod === "password" && (
          <div className="login-field">
                        <PasswordField
              value={form.password}
              onChange={set("password")}
              autoComplete="current-password"
              disabled={loading}
            />
            
            {/* FORGOT PASSWORD LINK */}
            <div style={{ textAlign: "right", marginTop: "6px" }}>
              <button 
                type="button" 
                className="or" 
                style={{ fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setShowForgot(true)}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD MODAL */}
        {showForgot && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForgot(false)}>
            <div className="card" style={{ maxWidth: 400, padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Reset Password</h3>
              <p style={{ fontSize: "14px", color: "var(--mu)", marginBottom: 16 }}>
                Enter your email and we'll send you a secure link to reset your password.
              </p>
              <div className="login-field">
                <span>Email address</span>
                <Field icon="✉️">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="customer@test.com"
                  />
                </Field>
              </div>
              <div className="msg" role="alert">{resetMsg}</div>
              <div className="row" style={{ marginTop: 16, justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn gh sm" onClick={() => setShowForgot(false)}>Cancel</button>
                <button type="button" className="btn sm" onClick={handleForgotPassword} disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Link"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="msg" role="alert">{error}</div>
        
        <button className="btn login-submit" disabled={loading}>
          {loading ? "Processing..." : loginMethod === "password" ? "Sign In" : "Send Login Code"} <Icon name="arrow" size={18} />
        </button>
        
        <p className="login-signup">
          New to DashBite? <button type="button" className="or" onClick={() => onSwitch("signup")}>Create an account</button>
        </p>
      </form>
    </AuthLayout>
  );
}

// OTP input, countdown, rate limit handling, and code validation.
function Otp({ email, onBack, onVerified }) {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [secs, setSecs] = useState(59);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(secs - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const change = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits(digits.map((x, k) => (k === i ? d : x)));
    if (d && refs.current[i + 1]) refs.current[i + 1].focus();
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await api.requestOtp({ email });
      setSecs(59);
      toast("New OTP requested. Use code: 123456");
    } catch (err) {
      if (err.code === "OTP_THROTTLED" || err.status === 429) {
        setError("Too many requests. Try again in 60 seconds.");
      } else {
        setError(formatError(err));
      }
    } finally {
      setResending(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) return setError("Enter all 6 digits.");
    
    setLoading(true);
    setError("");
    
    try {
      // Call the real backend verify endpoint
      const data = await api.verifyOtp({ email, otp: code });
      onVerified(data);
    } catch (err) {
      if (err.code === "OTP_THROTTLED" || err.status === 429) {
        setError("Too many attempts. Try again in 60 seconds.");
      } else {
        setError("That code is incorrect. Use demo code: 123456");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="box" onSubmit={submit} noValidate>
      <button type="button" className="ib" onClick={onBack} aria-label="Back"><Icon name="arrow" size={18} /></button>
      <h2>Enter Login Code</h2>
      <p>We’ve sent a 6-digit code to <b>{email}</b>.</p>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
        <div className="otp">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              type={showOtp ? "text" : "password"}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => change(i, e.target.value)}
              onKeyDown={(e) => e.key === "Backspace" && !d && refs.current[i - 1]?.focus()}
              disabled={loading}
            />
          ))}
        </div>
        <button
          type="button"
          className="ib"
          aria-label={showOtp ? "Hide OTP digits" : "Show OTP digits"}
          onClick={() => setShowOtp((prev) => !prev)}
        >
          <Icon name={showOtp ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
      
      <div className="msg" role="alert" style={{ textAlign: "center" }}>{error}</div>
      
      <button className="btn login-submit" type="submit" disabled={loading}>
        {loading ? "Verifying..." : "Verify & Sign In"} <Icon name="arrow" size={18} />
      </button>

      <p style={{ textAlign: "center", marginTop: "15px" }}>
        🕒 <b className="or">00:{String(secs).padStart(2, "0")}</b>{" "}
        <button
          type="button"
          className="btn gh sm"
          disabled={secs > 0 || resending}
          onClick={handleResend}
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </p>
      <p style={{ fontSize: 12, color: "#888", textAlign: "center" }}>Demo OTP: 123456</p>
    </form>
  );
}