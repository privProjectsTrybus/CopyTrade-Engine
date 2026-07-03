"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,email,password}) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
    router.push("/login");
  }

  const inputStyle: React.CSSProperties = {
    marginTop:6, width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)",
    borderRadius:8, padding:"9px 12px", color:"var(--text)", fontSize:14, boxSizing:"border-box"
  };

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:360, background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:16, padding:32 }}>
        <h1 style={{ color:"var(--text)", fontSize:22, fontWeight:600, margin:"0 0 24px" }}>Create account</h1>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:13 }}>Name</label>
            <input required value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:13 }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color:"var(--text-muted)", fontSize:13 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
            <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:4 }}>Min 10 chars, one uppercase, one number.</p>
          </div>
          {error && <p style={{ color:"var(--loss)", fontSize:13, margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:8,
                     padding:"10px", fontSize:14, fontWeight:500, cursor:"pointer", opacity:loading?0.6:1 }}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p style={{ color:"var(--text-faint)", fontSize:13, marginTop:20, textAlign:"center" }}>
          Already have an account? <a href="/login" style={{ color:"var(--accent)" }}>Sign in</a>
        </p>
      </div>
    </main>
  );
}
