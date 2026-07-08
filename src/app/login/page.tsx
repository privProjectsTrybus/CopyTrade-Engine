"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [totp, setTotp] = useState(""); const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await signIn("credentials",{ email, password, totpCode:needs2fa?totp:undefined, redirect:false });
    setLoading(false);
    if(res?.error==="2FA_REQUIRED"){ setNeeds2fa(true); return; }
    if(res?.error){ setError("Invalid email or password."); return; }
    router.push("/dashboard");
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="card animate-fade" style={{ width:"100%", maxWidth:380, padding:36 }}>
        <div style={{ marginBottom:28 }}>
          <span style={{ fontWeight:800, fontSize:20 }}>Copy</span>
          <span style={{ fontWeight:800, fontSize:20, color:"var(--accent-light)" }}>Trade</span>
          <p style={{ color:"var(--text-muted)", fontSize:13, marginTop:6 }}>Sign in to your account</p>
        </div>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="input" style={{ marginTop:5 }} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="input" style={{ marginTop:5 }} />
          </div>
          {needs2fa && (
            <div className="animate-fade">
              <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Authenticator Code</label>
              <input type="text" inputMode="numeric" required value={totp} onChange={e=>setTotp(e.target.value)} className="input" style={{ marginTop:5 }} />
            </div>
          )}
          {error && <p style={{ color:"var(--loss)", fontSize:12, padding:"8px 12px", background:"rgba(255,68,102,0.08)", borderRadius:8, border:"1px solid rgba(255,68,102,0.2)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:"100%", padding:"11px", marginTop:4 }}>
            {loading?"Signing in…":needs2fa?"Verify & Sign in":"Sign in"}
          </button>
        </form>

        <div style={{ margin:"16px 0", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1, borderTop:"1px solid var(--border)" }} />
          <span style={{ color:"var(--text-faint)", fontSize:11 }}>or</span>
          <div style={{ flex:1, borderTop:"1px solid var(--border)" }} />
        </div>

        <button onClick={() => signIn("google",{callbackUrl:"/dashboard"})} className="btn btn-ghost" style={{ width:"100%", padding:"11px" }}>
          Continue with Google
        </button>

        <p style={{ color:"var(--text-faint)", fontSize:12, textAlign:"center", marginTop:20 }}>
          No account? <a href="/register" style={{ color:"var(--accent-light)", textDecoration:"none" }}>Create one</a>
        </p>
      </div>
    </main>
  );
}
