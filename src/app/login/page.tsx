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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await signIn("credentials", { email, password, totpCode: needs2fa ? totpCode : undefined, redirect: false });
    setLoading(false);
    if (res?.error === "2FA_REQUIRED") { setNeeds2fa(true); return; }
    if (res?.error) { setError("Invalid email, password, or code."); return; }
    router.push("/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    marginTop:6, width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)",
    borderRadius:8, padding:"9px 12px", color:"var(--text)", fontSize:14, boxSizing:"border-box"
  };

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:360, background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:16, padding:32 }}>
        <h1 style={{ color:"var(--text)", fontSize:22, fontWeight:600, margin:"0 0 24px" }}>Sign in</h1>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:13 }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:13 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
          </div>
          {needs2fa && (
            <div>
              <label style={{ color:"var(--text-muted)", fontSize:13 }}>Authenticator code</label>
              <input type="text" inputMode="numeric" required value={totpCode} onChange={e=>setTotpCode(e.target.value)} style={inputStyle} />
            </div>
          )}
          {error && <p style={{ color:"var(--loss)", fontSize:13, margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:8,
                     padding:"10px", fontSize:14, fontWeight:500, cursor:"pointer", opacity:loading?0.6:1 }}>
            {loading ? "Signing in…" : needs2fa ? "Verify & Sign in" : "Sign in"}
          </button>
        </form>
        <button onClick={() => signIn("google", { callbackUrl:"/dashboard" })}
          style={{ marginTop:12, width:"100%", background:"none", border:"1px solid var(--border)",
                   color:"var(--text)", borderRadius:8, padding:"10px", fontSize:14, cursor:"pointer" }}>
          Continue with Google
        </button>
        <p style={{ color:"var(--text-faint)", fontSize:13, marginTop:20, textAlign:"center" }}>
          No account? <a href="/register" style={{ color:"var(--accent)" }}>Register</a>
        </p>
      </div>
    </main>
  );
}
