import { useState } from "react";

// Shared accessible wrappers for text fields and password visibility.
export function Field({ icon, children }) { return <label className="fld">{icon}{children}</label>; }

export function PasswordField({ value, onChange, placeholder = "Password", autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <Field icon="🔒">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" className="ib" style={{ width: 30, height: 30, boxShadow: "none" }} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>👁</button>
    </Field>
  );
}

// Basic client-side email shape check used by the demo auth forms.
export const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
