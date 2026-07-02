"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      totpCode: needs2fa ? totpCode : undefined,
      redirect: false,
    });

    setLoading(false);

    if (res?.error === "2FA_REQUIRED") {
      setNeeds2fa(true);
      return;
    }

    if (res?.error) {
      setError("Invalid email, password, or code.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <h1 className="text-white text-2xl font-semibold mb-6">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-sm">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white"
            />
          </div>

          {needs2fa && (
            <div>
              <label className="text-zinc-400 text-sm">
                Authenticator code
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md py-2 font-medium transition-colors"
          >
            {loading ? "Signing in…" : needs2fa ? "Verify & Sign in" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-4 w-full border border-zinc-700 text-white rounded-md py-2 hover:bg-zinc-800 transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-zinc-500 text-sm mt-6 text-center">
          No account?{" "}
          <a href="/register" className="text-blue-500 hover:underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
