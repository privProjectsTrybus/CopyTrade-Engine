"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await fetch("/api/auth/register",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,email,password}) });
    const d = await res.json(); setLoading(false);
    if(!res.ok){ setError(d.error??"Something went wrong"); return; }
    router.push("/login");
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="card animate-fade" style={{ width:"100%", maxWidth:380, padding:36 }}>
        <div style={{ marginBottom:28 }}>
          <span style={{ fontWeight:800, fontSize:20 }}>Copy</span>
          <span style={{ fontWeight:800, fontSize:20, color:"var(--accent-light)" }}>Trade</span>
          <p style={{ color:"var(--text-muted)", fontSize:13, marginTop:6 }}>Create your account</p>
        </div>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Name</label>
            <input required value={name} onChange={e=>setName(e.target.value)} className="input" style={{ marginTop:5 }} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="input" style={{ marginTop:5 }} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:12, fontWeight:500 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="input" style={{ marginTop:5 }} />
            <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:5 }}>Min 10 chars · one uppercase · one number</p>
          </div>
          {error && <p style={{ color:"var(--loss)", fontSize:12, padding:"8px 12px", background:"rgba(255,68,102,0.08)", borderRadius:8, border:"1px solid rgba(255,68,102,0.2)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:"100%", padding:"11px", marginTop:4 }}>
            {loading?"Creating…":"Create Account"}
          </button>
        </form>
        <p style={{ color:"var(--text-faint)", fontSize:12, textAlign:"center", marginTop:20 }}>
          Already have an account? <a href="/login" style={{ color:"var(--accent-light)", textDecoration:"none" }}>Sign in</a>
        </p>
      </div>
    </main>
  );
}
