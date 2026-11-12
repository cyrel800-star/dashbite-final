import { useEffect, useRef, useState } from "react";
import { AuthLayout, Logo, toast } from "../ui/components.jsx";
import { Field, PasswordField, isEmail } from "./Forms.jsx";
import { api, setAuthToken, formatError } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";

const DEMO_OTP = "123456";

// Determine the portal role from the email so users can sign in without the old dropdown selector.
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
  const [form, setForm] = useState({ email: "", password: "", role: "CUSTOMER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authData, setAuthData] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEmail(form.email)) return setError("Enter a valid email address.");
    if (!form.password) return setError("Enter your password.");

    setLoading(true);
    try {
      const data = await api.login({
        email: form.email.trim(),
        password: form.password,
      });

      // Save token to localStorage
      if (data?.token) {
        setAuthToken(data.token);
      }

      setAuthData(data);

      // If pending approval, user can proceed to portal in pending mode
      if (data.status === "PENDING_APPROVAL") {
        toast("Note: Your account is pending admin approval. Operational actions will be restricted.");
      }

      // Sync role selection to the server response while keeping the email-based routing behavior.
      const serverRole = data.role?.toUpperCase();
      const detectedRole = detectRoleFromEmail(form.email) || serverRole || form.role;
      if (serverRole && serverRole !== detectedRole) {
        setForm((prev) => ({ ...prev, role: serverRole }));
      } else if (detectedRole && detectedRole !== form.role) {
        setForm((prev) => ({ ...prev, role: detectedRole }));
      }

      // Continue to OTP verification step (W1.03)
      setStep("otp");
    } catch (err) {
      if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
        setError("Login failed. Check your email and password.");
      } else if (err.code === "ACCOUNT_DISABLED" || err.status === 403) {
        setError("This account has been disabled. Sign-in is blocked.");
      } else if (err.code === "OTP_THROTTLED" || err.status === 429) {
        setError("Too many requests. Try again in 60 seconds.");
      } else {
        setError(formatError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <AuthLayout>
        <Otp
          email={form.email}
          onBack={() => setStep("credentials")}
          onVerified={() => {
            onSignedIn({
              role: authData?.role || form.role,
              email: form.email,
              status: authData?.status || "APPROVED",
              user: authData?.user || null,
              token: authData?.token || null,
            });
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="box login-box" onSubmit={submit} noValidate>
        <div className="login-topline">
          <button type="button" className="ib login-back" onClick={() => onSwitch("home")} aria-label="Back"><Icon name="arrow" size={18} /></button>
          <Logo />
        </div>
        <div className="login-heading">
          <span className="login-eyebrow">WELCOME BACK</span>
          <h2>Sign in to DashBite</h2>
          <p>Enter your account details to continue.</p>
        </div>
        {/* Email-driven role detection is handled here so the login screen stays simple. */}
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
        <div className="login-field">
          <span>Password</span>
          <PasswordField
            value={form.password}
            onChange={set("password")}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <div className="msg" role="alert">{error}</div>
        <button
          type="button"
          className="or login-forgot"
          onClick={() => toast("Seeded test password is 'password'. Demo OTP is 123456.")}
        >
          Forgot Password?
        </button>
        <button className="btn login-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"} <Icon name="arrow" size={18} />
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
  const [resending, setResending] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  // OTP auto-verify: once all six digits are entered, the system validates the code immediately.
  useEffect(() => {
    const code = digits.join("");
    if (code.length !== 6) return;
    const normalized = code.trim();
    if (normalized !== DEMO_OTP) {
      setError("That code is incorrect. Use demo code: 123456");
      return;
    }
    setError("");
    onVerified();
  }, [digits, onVerified]);
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

  const submit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) return setError("Enter all 6 digits.");
    if (code !== DEMO_OTP) return setError("That code is incorrect. Use demo code: 123456");
    onVerified();
  };

  return (
    <form className="box" onSubmit={submit} noValidate>
      <button type="button" className="ib" onClick={onBack} aria-label="Back"><Icon name="arrow" size={18} /></button>
      <h2>OTP Verification</h2>
      <p>We’ve sent a 6-digit code to your account.</p>
      {/* OTP field group: masked inputs with a reveal toggle for password-like entry. */}
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
            />
          ))}
        </div>
        <button
          type="button"
          className="ib"
          aria-label={showOtp ? "Hide OTP digits" : "Show OTP digits"}
          onClick={() => setShowOtp((prev) => !prev)}
          title={showOtp ? "Hide code" : "Show code"}
        >
          <Icon name={showOtp ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
      <div className="msg" role="alert" style={{ textAlign: "center" }}>{error}</div>
      <p>
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
      <p style={{ fontSize: 12, color: "#888" }}>Demo OTP: 123456 (Throttle limit: 5 requests/minute)</p>
    </form>
  );
}
