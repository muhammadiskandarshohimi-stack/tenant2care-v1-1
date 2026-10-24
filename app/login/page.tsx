
"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff0f7",
      padding: "20px"
    }}>
      <form onSubmit={handleLogin} style={{
        background: "#ffffff",
        padding: "30px",
        borderRadius: "18px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 8px 30px #a9137220"
      }}>
        <h1 style={{
          color: "#a91372",
          textAlign: "center"
        }}>
          Tenant2Care v1.1
        </h1>

        <p style={{
          textAlign: "center",
          color: "#666",
          marginBottom: "30px"
        }}>
          Private Landlord Login
        </p>

        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            margin: "10px 0 20px",
            boxSizing: "border-box"
          }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            margin: "10px 0 20px",
            boxSizing: "border-box"
          }}
        />

        {error && (
          <p role="alert" style={{ color: "#c62828" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            border: 0,
            borderRadius: "10px",
            background: "#a91372",
            color: "#ffffff",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p style={{ textAlign: "center", marginTop: 20 }}><Link href="/forgot-password">Forgot password?</Link></p>
      </form>
    </main>
  );
}
