"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME, CRAFT_KEYS } from "@/config/app";
import { useI18n } from "./providers";

const DEMOS = [
  { email: "elena@hojnost.local", label: "Elena" },
  { email: "amina@hojnost.local", label: "Amina" },
  { email: "admin@hojnost.local", label: "Admin" },
];

export function LoginForm() {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("elena@hojnost.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail = email, nextPassword = password) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? m.auth.invalid : m.common.error);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="kicker">{APP_NAME}</p>
        <h1>{m.auth.login}</h1>
        <p className="lede">{m.tagline}</p>
        <p className="lede">{m.intro}</p>
      </div>
      <label className="field">
        <span>{m.auth.email}</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" />
      </label>
      <label className="field">
        <span>{m.auth.password}</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="button" className="btn-primary" disabled={busy} onClick={() => submit()}>
        {m.auth.submitLogin}
      </button>
      <div className="card">
        <strong>{m.auth.demoTitle}</strong>
        <p className="muted">{m.auth.demoPassword}</p>
        <div className="demo-grid">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEmail(demo.email);
                setPassword("DobrySkutok-1");
                void submit(demo.email, "DobrySkutok-1");
              }}
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>
      <Link href="/register">{m.auth.noAccount}</Link>
    </div>
  );
}

export function RegisterForm() {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<"SUPPORTER" | "CREATOR">("SUPPORTER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      role,
      displayName: String(formData.get("displayName") ?? ""),
      city: String(formData.get("city") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      craftKey: String(formData.get("craftKey") ?? "") || undefined,
    };
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error === "ACCOUNT_EXISTS" ? m.auth.taken : m.common.error);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
    >
      <div>
        <p className="kicker">{APP_NAME}</p>
        <h1>{m.auth.register}</h1>
        <p className="lede">{m.tagline}</p>
      </div>
      <div className="pair">
        <button type="button" className={role === "SUPPORTER" ? "btn-primary" : "btn-ghost"} onClick={() => setRole("SUPPORTER")}>
          {m.auth.supporter}
        </button>
        <button type="button" className={role === "CREATOR" ? "btn-primary" : "btn-ghost"} onClick={() => setRole("CREATOR")}>
          {m.auth.creator}
        </button>
      </div>
      <label className="field">
        <span>{m.auth.name}</span>
        <input name="name" required minLength={2} />
      </label>
      <label className="field">
        <span>{m.auth.email}</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>{m.auth.password}</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>{m.auth.phone}</span>
        <input name="phone" inputMode="tel" autoComplete="tel" />
      </label>
      {role === "CREATOR" ? (
        <>
          <label className="field">
            <span>{m.auth.name}</span>
            <input name="displayName" required minLength={2} />
          </label>
          <label className="field">
            <span>{m.auth.city}</span>
            <input name="city" required />
          </label>
          <label className="field">
            <span>{m.auth.bio}</span>
            <textarea name="bio" required minLength={8} />
          </label>
          <label className="field">
            <span>{m.auth.craft}</span>
            <select name="craftKey" defaultValue="weaving">
              {CRAFT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {m.crafts[key]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn-primary" disabled={busy} type="submit">
        {m.auth.submitRegister}
      </button>
      <Link href="/login">{m.auth.haveAccount}</Link>
    </form>
  );
}
