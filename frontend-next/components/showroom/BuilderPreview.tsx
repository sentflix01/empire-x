/**
 * BuilderPreview — ported from use 1.html LivePreview + getExportHTML
 * Renders all 25 section types with full fidelity.
 */
import React from "react";

interface Props {
  formData: Record<string, any>;
  activeSections: string[];
  mode: "desktop" | "tablet" | "mobile";
  showWhatsapp: boolean;
  fontFamily: string;
}

const brandPrimary = "#2563EB";
const brandSurface = "#F8FAFC";

function esc(s: any): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const sec = (extra: React.CSSProperties = {}): React.CSSProperties =>
  ({ padding: "20px 16px", ...extra });
const h2 = (extra: React.CSSProperties = {}): React.CSSProperties =>
  ({ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, textAlign: "center" as const, ...extra });
const grid: React.CSSProperties =
  { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 };
const card: React.CSSProperties =
  { background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 10, textAlign: "center" as const, fontSize: 12 };

function renderSection(key: string, d: any): React.ReactNode {
  switch (key) {
    // ── Hero ──────────────────────────────────────────────────────────────────
    case "hero":
      return (
        <div style={{ background: `linear-gradient(135deg,${d.heroBg||"#333"},${d.heroBg2||"#555"})`, padding: "36px 16px", textAlign: "center", color: "#fff" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>{d.title || "Business Name"}</h1>
          {d.subtitle && <p style={{ margin: "8px 0 0", opacity: 0.88, fontSize: "0.95rem" }}>{d.subtitle}</p>}
          {d.cta && <a style={{ display: "inline-block", background: "#fff", color: d.heroBg||brandPrimary, padding: "8px 22px", borderRadius: 24, fontWeight: 700, fontSize: "0.85rem", marginTop: 12, textDecoration: "none" }}>{d.cta}</a>}
        </div>
      );

    // ── About ─────────────────────────────────────────────────────────────────
    case "about":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.aboutTitle || "About Us"}</h2>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, textAlign: "center" }}>{d.aboutDesc || "Tell your story here."}</p>
        </div>
      );

    // ── Items / Products ──────────────────────────────────────────────────────
    case "items":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.itemsTitle || "Products / Services"}</h2>
          {(d.items||[]).length === 0 ? <p style={{ textAlign:"center", color:"#aaa", fontSize:12 }}>Add items from the editor →</p> : (
            <div style={grid}>
              {(d.items||[]).map((it:any, i:number) => (
                <div key={i} style={card}>
                  <i className={`fa-solid ${it.icon||"fa-box"}`} style={{ fontSize:20, color:brandPrimary, marginBottom:4 }} />
                  <strong style={{ display:"block", fontSize:11 }}>{it.name}</strong>
                  <small style={{ color:"#888", fontSize:10 }}>{it.desc}</small>
                  {it.price && <span style={{ display:"block", color:brandPrimary, fontWeight:700, fontSize:11, marginTop:4 }}>{it.price}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // ── Gallery ───────────────────────────────────────────────────────────────
    case "gallery":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.galleryTitle || "Gallery"}</h2>
          {(d.galleryImages||[]).length === 0 ? <p style={{ textAlign:"center",color:"#aaa",fontSize:12 }}>Add images from the editor →</p> : (
            <div style={grid}>
              {(d.galleryImages||[]).map((img:any,i:number) => (
                <div key={i} style={card}>
                  <img loading="lazy" src={img.url||"https://placehold.co/200x150/eee/999?text=Photo"} alt={img.caption} style={{ width:"100%",height:64,objectFit:"cover",borderRadius:4 }} />
                  {img.caption && <small style={{ fontSize:10 }}>{img.caption}</small>}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // ── Testimonials ──────────────────────────────────────────────────────────
    case "testimonials":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.testTitle || "Testimonials"}</h2>
          {(d.testimonials||[]).map((t:any,i:number) => (
            <blockquote key={i} style={{ borderLeft:`3px solid ${brandPrimary}`, paddingLeft:10, marginBottom:10, fontSize:12 }}>
              <p style={{ fontStyle:"italic", margin:0 }}>{t.quote}</p>
              <footer style={{ fontSize:11, color:"#888", marginTop:4 }}>— {t.author}{t.role?`, ${t.role}`:""}</footer>
            </blockquote>
          ))}
        </div>
      );

    // ── Team ─────────────────────────────────────────────────────────────────
    case "team":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.teamTitle || "Our Team"}</h2>
          <div style={grid}>
            {(d.members||[]).map((m:any,i:number) => (
              <div key={i} style={card}>
                <img loading="lazy" src={m.image||"https://placehold.co/80/eee/999?text=T"} alt={m.name} style={{ width:48,height:48,borderRadius:"50%",objectFit:"cover",marginBottom:6 }} />
                <strong style={{ display:"block", fontSize:11 }}>{m.name}</strong>
                <small style={{ color:brandPrimary, fontSize:10 }}>{m.role}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── FAQ ───────────────────────────────────────────────────────────────────
    case "faq":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.faqTitle || "FAQ"}</h2>
          {(d.faqs||[]).map((f:any,i:number) => (
            <div key={i} style={{ borderBottom:"1px solid #eee", padding:"8px 0" }}>
              <p style={{ fontWeight:600, fontSize:12, margin:0 }}>{f.question}</p>
              <p style={{ fontSize:11, color:"#666", marginTop:4 }}>{f.answer}</p>
            </div>
          ))}
        </div>
      );

    // ── Pricing ───────────────────────────────────────────────────────────────
    case "pricing":
      return (
        <div style={sec({ background:brandSurface })}>
          <h2 style={h2()}>{d.pricingTitle || "Pricing"}</h2>
          <div style={grid}>
            {(d.plans||[]).map((p:any,i:number) => (
              <div key={i} style={{ ...card, border: p.name?.toLowerCase().includes("pro") ? `2px solid ${brandPrimary}` : "1px solid #eee" }}>
                <strong style={{ fontSize:12 }}>{p.name}</strong>
                <div style={{ fontSize:18, fontWeight:700, color:brandPrimary, margin:"6px 0" }}>{p.price}<small style={{ fontSize:10, color:"#888" }}>{p.period}</small></div>
                {(p.features||"").split(",").map((f:string,j:number) => <div key={j} style={{ fontSize:10, padding:"2px 0" }}>{f.trim()}</div>)}
              </div>
            ))}
          </div>
        </div>
      );

    // ── Features ──────────────────────────────────────────────────────────────
    case "features":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.featTitle || "Why Choose Us"}</h2>
          <div style={grid}>
            {(d.features||[]).map((f:any,i:number) => (
              <div key={i} style={card}>
                <i className={`fa-solid ${f.icon||"fa-star"}`} style={{ fontSize:22, color:brandPrimary, marginBottom:4 }} />
                <strong style={{ display:"block", fontSize:11 }}>{f.name}</strong>
                <small style={{ color:"#888", fontSize:10 }}>{f.desc}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Services ──────────────────────────────────────────────────────────────
    case "services":
      return (
        <div style={sec({ background:brandSurface })}>
          <h2 style={h2()}>{d.servTitle || "Services"}</h2>
          <div style={grid}>
            {(d.services||[]).map((s:any,i:number) => (
              <div key={i} style={card}>
                <i className={`fa-solid ${s.icon||"fa-cog"}`} style={{ fontSize:22, color:brandPrimary, marginBottom:4 }} />
                <strong style={{ display:"block", fontSize:11 }}>{s.name}</strong>
                <small style={{ color:"#888", fontSize:10 }}>{s.desc}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Portfolio ─────────────────────────────────────────────────────────────
    case "portfolio":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.portTitle || "Our Work"}</h2>
          <div style={grid}>
            {(d.portfolio||[]).map((p:any,i:number) => (
              <div key={i} style={card}>
                <img loading="lazy" src={p.image||"https://placehold.co/200x150/eee/999?text=Project"} alt={p.title} style={{ width:"100%",height:64,objectFit:"cover",borderRadius:4,marginBottom:6 }} />
                <strong style={{ fontSize:11 }}>{p.title}</strong>
                <small style={{ color:brandPrimary, fontSize:10, display:"block" }}>{p.client}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Stats ─────────────────────────────────────────────────────────────────
    case "stats":
      return (
        <div style={sec({ background:"#faf8f4" })}>
          <h2 style={h2()}>{d.statsTitle || "By The Numbers"}</h2>
          <div style={grid}>
            {(d.stats||[]).map((st:any,i:number) => (
              <div key={i} style={card}>
                <i className={`fa-solid ${st.icon||"fa-rocket"}`} style={{ fontSize:22, color:brandPrimary, marginBottom:4 }} />
                <div style={{ fontSize:22, fontWeight:700, color:brandPrimary }}>{st.number}</div>
                <small style={{ fontSize:10 }}>{st.label}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── CTA ───────────────────────────────────────────────────────────────────
    case "cta":
      return (
        <div style={{ background:d.ctaBg||brandPrimary, padding:"28px 16px", textAlign:"center" }}>
          <h2 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:700, marginBottom:8 }}>{d.ctaTitle||"Ready to Get Started?"}</h2>
          {d.ctaDesc && <p style={{ color:"rgba(255,255,255,.85)", fontSize:13, margin:"0 0 10px" }}>{d.ctaDesc}</p>}
          {d.ctaBtn && <button style={{ background:"#fff", color:d.ctaBg||brandPrimary, padding:"8px 22px", borderRadius:24, border:"none", fontWeight:700, fontSize:13 }}>{d.ctaBtn}</button>}
        </div>
      );

    // ── Video ─────────────────────────────────────────────────────────────────
    case "video":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.vidTitle || "Watch Our Story"}</h2>
          {d.vidUrl ? (
            <div style={{ position:"relative", paddingBottom:"56.25%", height:0, overflow:"hidden", borderRadius:8 }}>
              <iframe src={d.vidUrl.replace("watch?v=","embed/").replace("youtu.be/","youtube.com/embed/")}
                style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none" }} allowFullScreen />
            </div>
          ) : <div style={{ background:"#111",borderRadius:8,height:100,display:"flex",alignItems:"center",justifyContent:"center" }}><i className="fa-solid fa-play" style={{ color:"#fff",fontSize:28 }} /></div>}
          {d.vidDesc && <p style={{ fontSize:12,textAlign:"center",marginTop:8 }}>{d.vidDesc}</p>}
        </div>
      );

    // ── Map ───────────────────────────────────────────────────────────────────
    case "map":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.mapTitle || "Find Us"}</h2>
          {d.mapUrl ? (
            <div style={{ borderRadius:8, overflow:"hidden", height:160 }}>
              <iframe src={d.mapUrl} style={{ width:"100%",height:"100%",border:"none" }} loading="lazy" />
            </div>
          ) : (
            <div style={{ background:"#e8ecf1",borderRadius:8,padding:24,textAlign:"center" }}>
              <i className="fa-solid fa-map-pin" style={{ fontSize:28,color:brandPrimary,display:"block",marginBottom:8 }} />
              <p style={{ fontSize:12,margin:"4px 0" }}>{d.address || "Address will appear here"}</p>
              <p style={{ fontSize:11,color:"#888" }}>{d.hours || ""}</p>
            </div>
          )}
        </div>
      );

    // ── Process / How It Works ────────────────────────────────────────────────
    case "process":
      return (
        <div style={sec({ background:"#faf8f4" })}>
          <h2 style={h2()}>{d.processTitle || "How It Works"}</h2>
          <div style={grid}>
            {(d.processSteps||[]).map((step:any,i:number) => (
              <div key={i} style={card}>
                <div style={{ width:24,height:24,borderRadius:"50%",background:brandPrimary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,margin:"0 auto 6px" }}>{i+1}</div>
                <i className={`fa-solid ${step.icon||"fa-arrow-right"}`} style={{ fontSize:16,color:brandPrimary,marginBottom:4 }} />
                <strong style={{ display:"block",fontSize:11 }}>{step.title}</strong>
                <small style={{ color:"#888",fontSize:10 }}>{step.desc}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Case Studies ──────────────────────────────────────────────────────────
    case "caseStudies":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.caseTitle || "Success Stories"}</h2>
          {(d.caseStudies||[]).map((item:any,i:number) => (
            <div key={i} style={{ background:"#fff",borderLeft:`4px solid ${brandPrimary}`,borderRadius:8,padding:14,marginBottom:10,border:"1px solid #eee" }}>
              <strong style={{ display:"block",fontSize:12 }}>{item.title}</strong>
              <p style={{ fontSize:11,color:"#888",margin:"4px 0" }}>{item.summary}</p>
              {item.result && <p style={{ fontSize:11,color:"#27ae60",fontWeight:600,marginTop:6 }}>✅ {item.result}</p>}
            </div>
          ))}
        </div>
      );

    // ── Partners ──────────────────────────────────────────────────────────────
    case "partners":
      return (
        <div style={sec({ background:"#faf8f4" })}>
          <h2 style={h2()}>{d.partnersTitle || "Our Partners"}</h2>
          <div style={grid}>
            {(d.partners||[]).map((p:any,i:number) => (
              <div key={i} style={card}>
                <img loading="lazy" src={p.logo||"https://placehold.co/120x60/eee/999?text=Partner"} alt={p.name} style={{ maxWidth:"100%",height:40,objectFit:"contain",marginBottom:6 }} />
                <strong style={{ fontSize:11 }}>{p.name}</strong>
                <small style={{ color:"#888",fontSize:10,display:"block" }}>{p.note}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Awards ────────────────────────────────────────────────────────────────
    case "awards":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.awardsTitle || "Awards & Recognition"}</h2>
          {(d.awards||[]).map((a:any,i:number) => (
            <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid #eee" }}>
              <i className="fa-solid fa-medal" style={{ color:brandPrimary,fontSize:20,flexShrink:0,marginTop:2 }} />
              <div>
                <strong style={{ fontSize:12 }}>{a.title}</strong>
                <p style={{ fontSize:11,color:"#888",margin:"2px 0 0" }}>{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      );

    // ── Resources / Downloads ─────────────────────────────────────────────────
    case "resources":
      return (
        <div style={sec({ background:"#faf8f4" })}>
          <h2 style={h2()}>{d.resourcesTitle || "Resources"}</h2>
          {(d.resources||[]).map((r:any,i:number) => (
            <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,background:"#fff",borderRadius:8,padding:12,marginBottom:8,border:"1px solid #eee" }}>
              <i className="fa-solid fa-file-arrow-down" style={{ color:brandPrimary,fontSize:18,flexShrink:0,marginTop:2 }} />
              <div>
                <strong style={{ fontSize:12 }}>{r.title}</strong>
                <p style={{ fontSize:11,color:"#888",margin:"2px 0 4px" }}>{r.desc}</p>
                {r.link && <a href={r.link} style={{ color:brandPrimary,fontWeight:600,fontSize:11,textDecoration:"none" }}>Download →</a>}
              </div>
            </div>
          ))}
        </div>
      );

    // ── Careers ───────────────────────────────────────────────────────────────
    case "careers":
      return (
        <div style={sec()}>
          <h2 style={h2()}>{d.careersTitle || "Join Our Team"}</h2>
          {(d.careers||[]).map((c:any,i:number) => (
            <div key={i} style={{ background:"#fff",borderRadius:8,padding:16,marginBottom:8,border:"1px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
              <div>
                <strong style={{ fontSize:12,display:"block" }}>{c.title}</strong>
                <small style={{ color:"#888",fontSize:11 }}>{c.location} · {c.type}</small>
              </div>
              <button style={{ background:brandPrimary,color:"#fff",padding:"5px 14px",borderRadius:20,border:"none",fontSize:11,fontWeight:600 }}>Apply</button>
            </div>
          ))}
        </div>
      );

    // ── Booking ───────────────────────────────────────────────────────────────
    case "booking":
      return (
        <div style={sec({ background:"#faf8f4", textAlign:"center" })}>
          <h2 style={h2()}>{d.bookingTitle || "Book an Appointment"}</h2>
          {d.bookingDesc && <p style={{ fontSize:12,color:"#555",marginBottom:14 }}>{d.bookingDesc}</p>}
          <button style={{ background:brandPrimary,color:"#fff",padding:"10px 28px",borderRadius:24,border:"none",fontWeight:700,fontSize:13 }}>{d.bookingBtn || "Book Now"}</button>
        </div>
      );

    // ── Industries ────────────────────────────────────────────────────────────
    case "industries":
      return (
        <div style={sec({ background:"#fffcf8" })}>
          <h2 style={h2()}>{d.industriesTitle || "Industries We Serve"}</h2>
          <div style={grid}>
            {(d.industries||[]).map((ind:any,i:number) => (
              <div key={i} style={card}>
                <strong style={{ fontSize:11,display:"block" }}>{ind.name}</strong>
                <small style={{ color:"#888",fontSize:10 }}>{ind.desc}</small>
              </div>
            ))}
          </div>
        </div>
      );

    // ── Contact ───────────────────────────────────────────────────────────────
    case "contact":
      return (
        <div style={{ background:"#1e1b16",color:"#fff",padding:"24px 16px",textAlign:"center" }}>
          <h2 style={{ ...h2(), color:"#fff" }}>Contact</h2>
          {d.location && <p style={{ fontSize:12,margin:"4px 0" }}>📍 {d.location}</p>}
          {d.phone    && <p style={{ fontSize:12,margin:"4px 0" }}>📞 {d.phone}</p>}
          {d.email    && <p style={{ fontSize:12,margin:"4px 0" }}>✉️ {d.email}</p>}
          {d.hours    && <p style={{ fontSize:12,margin:"4px 0" }}>🕐 {d.hours}</p>}
          {d.whatsapp && <p style={{ fontSize:12,margin:"4px 0" }}>💬 {d.whatsapp}</p>}
        </div>
      );

    // ── Social Links ──────────────────────────────────────────────────────────
    case "social":
      return (d.facebook||d.instagram||d.telegram||d.youtube||d.tiktok||d.twitter||d.linkedin) ? (
        <div style={{ display:"flex",gap:12,justifyContent:"center",padding:14,background:"#fff",borderTop:"1px solid #eee",fontSize:22,flexWrap:"wrap" }}>
          {d.facebook  && <a href={d.facebook}  style={{ color:"#1877f2",textDecoration:"none" }}><i className="fa-brands fa-facebook" /></a>}
          {d.instagram && <a href={d.instagram} style={{ color:"#e4405f",textDecoration:"none" }}><i className="fa-brands fa-instagram" /></a>}
          {d.twitter   && <a href={d.twitter}   style={{ color:"#1da1f2",textDecoration:"none" }}><i className="fa-brands fa-x-twitter" /></a>}
          {d.youtube   && <a href={d.youtube}   style={{ color:"#ff0000",textDecoration:"none" }}><i className="fa-brands fa-youtube" /></a>}
          {d.tiktok    && <a href={d.tiktok}    style={{ color:"#000",   textDecoration:"none" }}><i className="fa-brands fa-tiktok" /></a>}
          {d.linkedin  && <a href={d.linkedin}  style={{ color:"#0077b5",textDecoration:"none" }}><i className="fa-brands fa-linkedin" /></a>}
          {d.telegram  && <a href={d.telegram}  style={{ color:"#26a5e4",textDecoration:"none" }}><i className="fa-brands fa-telegram" /></a>}
          {d.whatsapp  && <a href={`https://wa.me/${d.whatsapp.replace(/\D/g,"")}`} style={{ color:"#25d366",textDecoration:"none" }}><i className="fa-brands fa-whatsapp" /></a>}
        </div>
      ) : null;

    // ── Newsletter ────────────────────────────────────────────────────────────
    case "newsletter":
      return (
        <div style={sec({ background:"#faf8f4",textAlign:"center",borderRadius:8 })}>
          <h2 style={h2()}>{d.newsTitle || "Stay Updated"}</h2>
          {d.newsDesc && <p style={{ fontSize:12,color:"#666",marginBottom:10 }}>{d.newsDesc}</p>}
          <div style={{ display:"flex",gap:6,justifyContent:"center" }}>
            <input readOnly placeholder="Enter your email" style={{ padding:"7px 14px",borderRadius:20,border:"1px solid #ddd",fontSize:12,width:160 }} />
            <button style={{ padding:"7px 16px",background:brandPrimary,color:"#fff",border:"none",borderRadius:20,fontSize:12,fontWeight:600 }}>{d.newsBtn||"Subscribe"}</button>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function BuilderPreview({ formData: d, activeSections, mode, showWhatsapp, fontFamily }: Props) {
  const maxW = mode === "mobile" ? "375px" : mode === "tablet" ? "768px" : "100%";
  return (
    <div style={{ background:"#e8ecf1",borderRadius:12,padding:10,height:"100%",overflow:"auto" }}>
      {/* Browser chrome */}
      <div style={{ background:"#d4d4d4",padding:"5px 8px",display:"flex",alignItems:"center",gap:4,borderRadius:"8px 8px 0 0" }}>
        <span style={{ width:8,height:8,borderRadius:"50%",background:"#e74c3c",display:"inline-block" }} />
        <span style={{ width:8,height:8,borderRadius:"50%",background:"#f39c12",display:"inline-block" }} />
        <span style={{ width:8,height:8,borderRadius:"50%",background:"#27ae60",display:"inline-block" }} />
        <span style={{ flex:1,background:"#fff",borderRadius:8,padding:"2px 8px",fontSize:10,color:"#888",textAlign:"center",marginLeft:4 }}>
          🌐 {(d.title||"your-site").toLowerCase().replace(/\s+/g,"-")}.com
        </span>
      </div>

      {/* Frame */}
      <div style={{ background:"#fff",color:"#1e1b16",fontFamily:`'${fontFamily||"Inter"}',sans-serif`,borderRadius:"0 0 8px 8px",overflow:"hidden",maxWidth:maxW,margin:"0 auto",minHeight:200,boxShadow:"0 2px 16px rgba(0,0,0,.1)" }}>
        {activeSections.length === 0 ? (
          <div style={{ padding:40,textAlign:"center",color:"#aaa" }}>
            <p style={{ fontSize:14 }}>👈 Enable sections from the Build panel</p>
          </div>
        ) : activeSections.map((key,i) => <React.Fragment key={`${key}-${i}`}>{renderSection(key, d)}</React.Fragment>)}

        {/* WhatsApp float */}
        {showWhatsapp && d.whatsapp && (
          <div style={{ textAlign:"right",padding:"8px 12px" }}>
            <span style={{ display:"inline-flex",width:36,height:36,borderRadius:"50%",background:"#25d366",color:"#fff",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 2px 8px rgba(37,211,102,.4)" }}>
              <i className="fa-brands fa-whatsapp" />
            </span>
          </div>
        )}
        <div style={{ padding:"10px 12px",textAlign:"center",fontSize:10,color:"#aaa",borderTop:"1px solid #f0f0f0" }}>
          {d.title||"Business"} © {new Date().getFullYear()} — Built with Showroom Studio
        </div>
      </div>
    </div>
  );
}
