"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./login-form.css";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(res.status === 429 ? "Too many attempts. Wait a minute and try again." : (body.error ?? "Couldn't sign in."));
      setBusy(false);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="login-form">
      <h1 className="login-form__title">Admin sign in</h1>
      <label className="login-form__label" htmlFor="admin-password">
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="login-form__input"
      />
      {error && (
        <p role="alert" className="login-form__error">
          {error}
        </p>
      )}
      <button disabled={busy || !password} className="button login-form__submit">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
