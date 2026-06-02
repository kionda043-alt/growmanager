import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────
const SUPA_URL = "https://spirakozxkymwstelrph.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXJha296eGt5bXdzdGVscnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDgwNzYsImV4cCI6MjA5NDY4NDA3Nn0.wsKIWwEgxmSSWNSzwOwvyqRMnOM1AztZuhvnaQnV7Jw";

const db = {
  async get(table, filters = {}) {
    let url = `${SUPA_URL}/rest/v1/${table}?select=*`;
    Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${v}`; });
    const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  async query(table, queryStr) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${queryStr}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

const logActivity = async (userName, action, entityType = null, details = null) => {
  try {
    await db.insert("activity_log", { user_name: userName, action, entity_type: entityType, details });
  } catch {}
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const C = {
  bg: "#F2F4F0", surface: "#FFFFFF", surfaceAlt: "#F8FAF7",
  border: "#E2E8DE", borderStrong: "#C4D0BE",
  text: "#18251A", textMid: "#445A3E", textSoft: "#7A9272",
  green: "#2A6E35", greenLight: "#E4F0E6",
  amber: "#B87318", amberLight: "#FDF0E0",
  red: "#B83228", redLight: "#FCECEA",
  blue: "#1E5FAD", blueLight: "#EBF3FF",
  shadow: "0 1px 4px rgba(0,0,0,0.07), 0 2px 12px rgba(0,0,0,0.04)",
  shadowUp: "0 4px 20px rgba(0,0,0,0.10)",
};

const GEN_PALETTE = [
  "#2A6E35","#1E5FAD","#B87318","#6B4FA0","#B83228",
  "#0E7A6E","#8B4513","#1A6B8A","#6B6B10","#8B2252",
  "#2E6B8B","#5A7A2A","#8B4A00","#3A3A8B","#7A2A5A",
];

const TYPE_META = {
  riego:      { icon:"💧", label:"Riego",       color:C.blue,   bg:C.blueLight   },
  nutricion:  { icon:"🌱", label:"Nutrición",   color:C.green,  bg:C.greenLight  },
  fumigacion: { icon:"🔬", label:"Fumigación",  color:"#6B4FA0",bg:"#F0EBF9"     },
  poda:       { icon:"✂️", label:"Poda",        color:C.amber,  bg:C.amberLight  },
  limpieza:   { icon:"🧹", label:"Limpieza",    color:"#555",   bg:"#F3F4F6"     },
  revision:   { icon:"👁",  label:"Revisión",    color:"#0891B2",bg:"#ECFEFF"     },
  cosecha:    { icon:"🌾", label:"Cosecha",     color:"#854D0E",bg:"#FEF9C3"     },
  lavado:     { icon:"🚿", label:"Lavado",      color:"#0E7490",bg:"#ECFEFF"     },
};

const PHASE_META = {
  "vegetativo": { label:"Vegetativo", color:C.green,  bg:C.greenLight },
  "floración":  { label:"Floración",  color:C.amber,  bg:C.amberLight },
  "cosechando": { label:"Cosechando", color:C.red,    bg:C.redLight   },
};

const ROOM_POTS = {
  S1: [
    { label:"F", circular:false, wide:false },
    { label:"C", circular:false, wide:false },
    { label:"E", circular:false, wide:false },
    { label:"B", circular:false, wide:false },
    { label:"D", circular:false, wide:false },
    { label:"A", circular:false, wide:false },
  ],
  S2: [
    { label:"B", circular:false, wide:false },
    { label:"A", circular:false, wide:false },
    { label:"C", circular:false, wide:true  },
    { label:"D", circular:false, wide:false },
    { label:"K", circular:true,  wide:false },
  ],
};

const TODAY = new Date();
const todayISO = TODAY.toISOString().split("T")[0];
const daysFrom = (d) => Math.floor((TODAY - new Date(d)) / 86400000);
const daysTo   = (d) => Math.floor((new Date(d) - TODAY) / 86400000);
const fmtDate  = (d) => new Date(d).toLocaleDateString("es-AR", { day:"2-digit", month:"short" });
const fmtFull  = (d) => new Date(d).toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });

// ─── BASE COMPONENTS ───────────────────────────────────────────────────────
function Card({ children, style={}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:C.surface, borderRadius:18, border:`1.5px solid ${C.border}`,
        boxShadow:hov?C.shadowUp:C.shadow, padding:18,
        cursor:onClick?"pointer":"default",
        transform:hov&&onClick?"translateY(-2px)":"none",
        transition:"all 0.15s", ...style }}>
      {children}
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ background:bg, color, borderRadius:20, padding:"3px 11px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>;
}

function PhaseBadge({ phase }) {
  const m = PHASE_META[phase]||PHASE_META["floración"];
  return <Badge label={m.label} color={m.color} bg={m.bg} />;
}

function ProgressBar({ value, max, color=C.green, h=7 }) {
  const pct = max>0?Math.min(100,Math.round(value/max*100)):0;
  return (
    <div style={{ background:C.border, borderRadius:99, height:h, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, background:color, height:"100%", borderRadius:99, transition:"width 0.5s ease" }} />
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:800, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>{children}</div>;
}

function Divider() { return <div style={{ height:1, background:C.border, margin:"14px 0" }} />; }

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.green}`, animation:"spin 0.8s linear infinite" }} />
    </div>
  );
}

function Toast({ msg, type="success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return ()=>clearTimeout(t); }, []);
  const colors = { success:{bg:C.greenLight,color:C.green}, error:{bg:C.redLight,color:C.red} };
  const c = colors[type]||colors.success;
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:1000,
      background:c.bg, color:c.color, border:`1.5px solid ${c.color}44`,
      borderRadius:14, padding:"12px 20px", fontSize:14, fontWeight:700,
      boxShadow:C.shadowUp, whiteSpace:"nowrap" }}>
      {type==="success"?"✓":"✕"} {msg}
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    db.get("users").then(setUsers).catch(()=>setErr("No se pudo conectar a Supabase")).finally(()=>setLoading(false));
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:20, background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 16px" }}>🌿</div>
        <div style={{ fontSize:26, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>GrowManager</div>
        <div style={{ fontSize:13, color:C.textSoft, marginTop:4 }}>Club de Cultivo Orgánico</div>
        {!loading && !err && <div style={{ fontSize:11, color:C.green, marginTop:6, fontWeight:600 }}>● Conectado a Supabase</div>}
        {err && <div style={{ fontSize:11, color:C.red, marginTop:6 }}>✕ {err}</div>}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.1em", textAlign:"center", marginBottom:4 }}>¿Quién sos?</div>
          {users.map(u => (
            <button key={u.id} onClick={()=>onLogin(u)} style={{
              background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:16,
              padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:16, textAlign:"left", transition:"all 0.15s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.boxShadow=C.shadowUp;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{ width:46, height:46, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, fontWeight:900, flexShrink:0 }}>{u.initial}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{u.name}</div>
                <div style={{ fontSize:12, color:C.textSoft, marginTop:2 }}>{u.area}</div>
              </div>
              <Badge label={u.role==="admin"?"Admin":"Usuario"} color={u.role==="admin"?C.green:C.textMid} bg={u.role==="admin"?C.greenLight:C.bg} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TOP BAR ───────────────────────────────────────────────────────────────
function TopBar({ user, page, setPage, onLogout }) {
  const isHome = page==="dashboard";
  return (
    <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 18px", height:60,
      display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 #E2E8DE" }}>
      {!isHome && (
        <button onClick={()=>setPage("dashboard")} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:22, color:C.textMid, padding:"4px 2px", lineHeight:1 }}>←</button>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:9, flex:1 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🌿</div>
        <span style={{ fontSize:16, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>GrowManager</span>
      </div>
      <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, borderRadius:12, padding:"6px 12px", border:`1px solid ${C.border}`, cursor:"pointer" }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:900 }}>{user.initial}</div>
        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{user.name}</span>
      </button>
    </header>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ setPage, user }) {
  const [cycles, setCycles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vegStock, setVegStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.query("cycles", "active=eq.true&select=*"),
      db.query("tasks", `due_date=eq.${todayISO}&select=*`),
      db.get("veg_stock"),
    ]).then(([c, t, v]) => { setCycles(c); setTasks(t); setVegStock(v); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const done = tasks.filter(t=>t.status==="completada").length;
  const pending = tasks.filter(t=>t.status==="pendiente").length;
  const highPri = tasks.filter(t=>t.priority==="alta"&&t.status==="pendiente").length;
  const myPending = tasks.filter(t=>t.assignee===user.name&&t.status==="pendiente").length;
  const mothers = vegStock.filter(v=>v.type==="madre"&&v.status==="activa").reduce((a,v)=>a+v.count,0);
  const cloneCount = vegStock.filter(v=>v.type==="post_esqueje").reduce((a,v)=>a+v.count,0);
  const renewMothers = vegStock.filter(v=>v.type==="madre"&&v.status==="renovar").length;

  const roomCycle = (roomId) => cycles.find(c=>c.room_id===roomId);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:24 }}>
      {/* Greeting */}
      <div style={{ padding:"20px 0 4px" }}>
        <div style={{ fontSize:13, color:C.textSoft, textTransform:"capitalize" }}>{fmtFull(TODAY)}</div>
        <div style={{ fontSize:24, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", marginTop:4 }}>
          Buenas, <span style={{ color:C.green }}>{user.name}</span> 🌿
        </div>
        <div style={{ fontSize:13, color:C.textSoft, marginTop:4 }}>
          {myPending>0 ? `Tenés ${myPending} tareas pendientes hoy` : "Estás al día con tus tareas 👌"}
        </div>
      </div>

      {/* Progress */}
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <SectionLabel>Progreso del día</SectionLabel>
          <span style={{ fontSize:13, fontWeight:700, color:C.green }}>{done}/{tasks.length} tareas</span>
        </div>
        <ProgressBar value={done} max={tasks.length||1} h={10} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
          <span style={{ fontSize:12, color:C.textSoft }}>{tasks.length>0?Math.round(done/tasks.length*100):0}% completado</span>
          {highPri>0 && <span style={{ fontSize:12, color:C.red, fontWeight:700 }}>● {highPri} urgentes</span>}
        </div>
      </Card>

      {/* Alerts */}
      {highPri>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <SectionLabel>Alertas</SectionLabel>
          {tasks.filter(t=>t.priority==="alta"&&t.status==="pendiente").slice(0,3).map(t=>{
            const tm = TYPE_META[t.type]||TYPE_META.revision;
            return (
              <div key={t.id} style={{ background:C.amberLight, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, border:`1px solid ${C.amber}33` }}>
                <span style={{ fontSize:20 }}>{tm.icon}</span>
                <span style={{ fontSize:13, color:C.amber, fontWeight:600 }}>{t.title} — alta prioridad</span>
              </div>
            );
          })}
          {renewMothers>0 && (
            <div style={{ background:C.amberLight, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, border:`1px solid ${C.amber}33` }}>
              <span style={{ fontSize:20 }}>🌳</span>
              <span style={{ fontSize:13, color:C.amber, fontWeight:600 }}>{renewMothers} madre{renewMothers>1?"s":""} para renovar</span>
            </div>
          )}
        </div>
      )}

      {/* Salas */}
      <SectionLabel>Salas de cultivo</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {["S1","S2"].map(roomId => {
          const cycle = roomCycle(roomId);
          return <RoomCard key={roomId} roomId={roomId} cycle={cycle} onClick={()=>setPage(`sala_${roomId}`)} />;
        })}
      </div>

      {/* Otras secciones */}
      <SectionLabel>Otras secciones</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card onClick={()=>setPage("vegetativo")} style={{ padding:0, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#E4F0E6,#CDE6D0)", padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:26 }}>🌱</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", marginTop:6 }}>Vegetativo</div>
          </div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:C.textSoft }}>Madres</span>
              <span style={{ fontSize:16, fontWeight:800, color:C.text, fontFamily:"'Georgia',serif" }}>{mothers}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:C.textSoft }}>Post-esq.</span>
              <span style={{ fontSize:16, fontWeight:800, color:C.text, fontFamily:"'Georgia',serif" }}>{cloneCount}</span>
            </div>
          </div>
        </Card>

        <Card onClick={()=>setPage("tareas")} style={{ padding:0, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#EBF3FF,#D4E6FF)", padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:26 }}>✓</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", marginTop:6 }}>Tareas</div>
          </div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:C.textSoft }}>Hoy</span>
              <span style={{ fontSize:16, fontWeight:800, color:C.text, fontFamily:"'Georgia',serif" }}>{pending} pend.</span>
            </div>
            <ProgressBar value={done} max={tasks.length||1} h={6} />
          </div>
        </Card>
      </div>

      <Card onClick={()=>setPage("geneticas")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px" }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>🧬 Genéticas</div>
        <span style={{ fontSize:13, color:C.textSoft }}>Gestionar →</span>
      </Card>
    </div>
  );
}

function RoomCard({ roomId, cycle, onClick }) {
  if (!cycle) return (
    <Card onClick={onClick} style={{ padding:"20px" }}>
      <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{roomId}</div>
      <div style={{ fontSize:13, color:C.textSoft, marginTop:4 }}>Sin ciclo activo</div>
    </Card>
  );
  const dayIn = daysFrom(cycle.flower_start);
  const daysLeft = daysTo(cycle.estimated_harvest);
  const pct = Math.min(100, Math.round(dayIn/65*100));
  const pm = PHASE_META[cycle.phase]||PHASE_META["floración"];

  return (
    <Card onClick={onClick} style={{ padding:0, overflow:"hidden" }}>
      <div style={{ background:cycle.phase==="floración"?"linear-gradient(135deg,#FDF5E8,#FAE8C8)":"linear-gradient(135deg,#E4F0E6,#CDE6D0)", padding:"18px 20px 14px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.12em" }}>{roomId}</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>{roomId==="S1"?"Sala 1":"Sala 2"}</div>
          </div>
          <PhaseBadge phase={cycle.phase} />
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, marginTop:10 }}>
          <span style={{ fontSize:48, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", lineHeight:1 }}>{dayIn}</span>
          <span style={{ fontSize:14, color:C.textSoft, paddingBottom:9 }}>días</span>
        </div>
      </div>
      <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
            <span style={{ fontSize:12, color:C.textSoft }}>Progreso</span>
            <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>{pct}%</span>
          </div>
          <ProgressBar value={pct} max={100} color={pm.color} h={8} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, color:C.textSoft }}>Cosecha en</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginTop:2 }}>
              <span style={{ fontSize:26, fontWeight:900, fontFamily:"'Georgia',serif", color:daysLeft<=7?C.red:daysLeft<=20?C.amber:C.green }}>{daysLeft}</span>
              <span style={{ fontSize:12, color:C.textSoft, paddingBottom:4 }}>días</span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:C.textSoft }}>Cosecha est.</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.textMid }}>{fmtDate(cycle.estimated_harvest)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── SALA PAGE ─────────────────────────────────────────────────────────────
function SalaPage({ roomId, setPage, user, genetics }) {
  const [cycle, setCycle] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [cycleGenetics, setCycleGenetics] = useState([]);
  const [selectedPot, setSelectedPot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cycles, allTasks] = await Promise.all([
        db.query("cycles", `room_id=eq.${roomId}&active=eq.true`),
        db.query("tasks", `room_id=eq.${roomId}&due_date=eq.${todayISO}`),
      ]);
      const c = cycles[0]||null;
      setCycle(c);
      setTasks(allTasks);
      if (c) {
        const cg = await db.query("cycle_genetics", `cycle_id=eq.${c.id}`);
        setCycleGenetics(cg);
      }
    } finally { setLoading(false); }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  const toggleTask = async (task) => {
    const newStatus = task.status==="completada"?"pendiente":"completada";
    await db.update("tasks", task.id, { status:newStatus, completed_at: newStatus==="completada"?new Date().toISOString():null });
    await logActivity(user.name, `${newStatus==="completada"?"Completó":"Reabrió"} tarea: ${task.title}`, "task", { task_id:task.id });
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:newStatus}:t));
    setToast({ msg: newStatus==="completada"?"Tarea completada ✓":"Tarea reabierta", type:"success" });
  };

  if (loading) return <Spinner />;
  if (!cycle) return (
    <div style={{ padding:"40px 20px", textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🌱</div>
      <div style={{ fontSize:18, fontWeight:700, color:C.text }}>Sin ciclo activo en {roomId}</div>
      <button onClick={()=>setPage("dashboard")} style={{ marginTop:16, background:C.green, border:"none", color:"#fff", borderRadius:12, padding:"12px 24px", cursor:"pointer", fontSize:14, fontWeight:700 }}>← Volver</button>
    </div>
  );

  const dayIn = daysFrom(cycle.flower_start);
  const pm = PHASE_META[cycle.phase]||PHASE_META["floración"];
  const pct = Math.min(100, Math.round(dayIn/65*100));
  const genMap = {};
  genetics.forEach(g=>{ genMap[g.name]=g.color; });

  const milestones = (() => {
    const fs = new Date(cycle.flower_start);
    const off = (n) => { const d=new Date(fs); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
    const lavado = (() => { const d=new Date(cycle.estimated_harvest); d.setDate(d.getDate()-20); return d.toISOString().split("T")[0]; })();
    return [
      { label:"Inicio floración",       date:cycle.flower_start,        done:true,        type:"start"    },
      { label:"Zoil Monkey 1",           date:off(0),                    done:dayIn>=1,    type:"nutricion"},
      { label:"Poda 1 — día 15",         date:off(15),                   done:dayIn>15,    type:"poda"     },
      { label:"Zoil Monkey 2 — día 15",  date:off(15),                   done:dayIn>15,    type:"nutricion"},
      { label:"Poda 2 — día 21",         date:off(21),                   done:dayIn>21,    type:"poda"     },
      { label:"Inicio lavado (−20 días)",date:lavado,                    done:false,       type:"lavado"   },
      { label:"Cosecha estimada",        date:cycle.estimated_harvest,   done:false,       type:"cosecha"  },
    ];
  })();

  const [mDone, setMDone] = useState(milestones.map(m=>m.done));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:32 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Hero */}
      <div style={{ background:cycle.phase==="floración"?"linear-gradient(135deg,#FDF5E8,#FAE8C8)":"linear-gradient(135deg,#E4F0E6,#CDE6D0)", borderRadius:20, padding:"22px 20px 18px", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.12em" }}>{roomId}</div>
            <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>{roomId==="S1"?"Sala 1":"Sala 2"}</div>
          </div>
          <PhaseBadge phase={cycle.phase} />
        </div>
        <div style={{ display:"flex", gap:24, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, color:C.textSoft }}>Día de ciclo</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4 }}>
              <span style={{ fontSize:44, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", lineHeight:1 }}>{dayIn}</span>
              <span style={{ fontSize:13, color:C.textSoft, paddingBottom:7 }}>días</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.textSoft }}>Cosecha en</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4 }}>
              <span style={{ fontSize:44, fontWeight:900, fontFamily:"'Georgia',serif", lineHeight:1, color:daysTo(cycle.estimated_harvest)<=20?C.amber:C.green }}>{daysTo(cycle.estimated_harvest)}</span>
              <span style={{ fontSize:13, color:C.textSoft, paddingBottom:7 }}>días</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom:6, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:C.textSoft }}>Progreso del ciclo</span>
          <span style={{ fontSize:11, fontWeight:700, color:C.textMid }}>{pct}%</span>
        </div>
        <ProgressBar value={pct} max={100} color={pm.color} h={9} />
        <div style={{ fontSize:12, color:C.textSoft, marginTop:8 }}>💧 Riego {cycle.irrigation_type} · {fmtDate(cycle.flower_start)} → {fmtDate(cycle.estimated_harvest)}</div>
      </div>

      {/* Genéticas */}
      {cycleGenetics.length>0 && (
        <Card>
          <SectionLabel>Genéticas en ciclo</SectionLabel>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${cycleGenetics.length},1fr)`, gap:10 }}>
            {cycleGenetics.map(cg=>(
              <div key={cg.id} style={{ background:C.bg, borderRadius:12, padding:"14px", border:`1px solid ${C.border}`, textAlign:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, justifyContent:"center" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:genMap[cg.genetic_name]||C.green }} />
                  <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{cg.genetic_name}</span>
                </div>
                <div style={{ fontSize:32, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>{cg.plant_count}</div>
                <div style={{ fontSize:11, color:C.textSoft }}>plantas</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fechas clave */}
      <Card>
        <SectionLabel>Fechas clave del ciclo</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {milestones.map((m,i)=>{
            const done=mDone[i];
            const tm=TYPE_META[m.type]||{icon:"📅"};
            const dLeft=daysTo(m.date);
            const isToday=m.date===todayISO;
            return (
              <div key={i} onClick={()=>setMDone(prev=>prev.map((v,idx)=>idx===i?!v:v))} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12,
                background:done?C.greenLight:isToday?C.amberLight:C.bg,
                border:`1px solid ${done?C.green+"44":isToday?"#E8C07A":C.border}`,
                cursor:"pointer", opacity:done?0.65:1, transition:"all 0.1s",
              }}>
                <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background:done?C.green:"transparent", border:`2px solid ${done?C.green:C.borderStrong}`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13 }}>{done&&"✓"}</div>
                <span style={{ fontSize:17 }}>{tm.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, textDecoration:done?"line-through":"none" }}>{m.label}</div>
                  <div style={{ fontSize:11, color:C.textSoft }}>
                    {fmtDate(m.date)}{isToday?" — hoy":dLeft>0?` — en ${dLeft}d`:dLeft===0?" — hoy":" — pasado"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mapa macetones */}
      <Card>
        <SectionLabel>Mapa de macetones</SectionLabel>
        <PotMap roomId={roomId} genetics={genetics} selectedPot={selectedPot} onSelect={setSelectedPot} />
      </Card>

      {/* Tareas de hoy */}
      <Card>
        <SectionLabel>Tareas de hoy</SectionLabel>
        {tasks.length===0
          ? <div style={{ fontSize:13, color:C.textSoft, fontStyle:"italic", textAlign:"center", padding:"16px 0" }}>Sin tareas para hoy ✓</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {tasks.map(t=>{
              const tm=TYPE_META[t.type]||TYPE_META.revision;
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, background:t.status==="completada"?C.greenLight:C.bg, border:`1px solid ${t.priority==="alta"&&t.status!=="completada"?"#E8C07A":C.border}`, opacity:t.status==="completada"?0.65:1 }}>
                  <button onClick={()=>toggleTask(t)} style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:t.status==="completada"?C.green:"transparent", border:`2px solid ${t.status==="completada"?C.green:C.borderStrong}`, cursor:"pointer", color:"#fff", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>{t.status==="completada"&&"✓"}</button>
                  <span style={{ fontSize:18 }}>{tm.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, textDecoration:t.status==="completada"?"line-through":"none" }}>{t.title}</div>
                    <div style={{ fontSize:11, color:C.textSoft }}>{t.assignee}</div>
                  </div>
                  {t.priority==="alta"&&t.status!=="completada"&&<Badge label="Alta" color={C.amber} bg={C.amberLight} />}
                </div>
              );
            })}
          </div>
        }
      </Card>
    </div>
  );
}

function PotMap({ roomId, genetics, selectedPot, onSelect }) {
  const pots = ROOM_POTS[roomId]||[];
  const genColors = {};
  genetics.forEach((g,i)=>{ genColors[g.name]=g.color||GEN_PALETTE[i%GEN_PALETTE.length]; });
  const sampleColors = genetics.slice(0,2).map(g=>g.color);

  const PotCell = ({ pot, idx, fullWidth }) => {
    const sel = selectedPot===pot.label;
    const col = sampleColors[idx%sampleColors.length]||C.textSoft;
    if (pot.circular) return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div onClick={()=>onSelect(sel?null:pot.label)} style={{ width:76, height:76, borderRadius:"50%", background:sel?C.green:C.bg, border:`2px solid ${sel?C.green:C.borderStrong}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", boxShadow:sel?`0 0 0 4px ${C.greenLight}`:C.shadow }}>
          <span style={{ fontSize:18, fontWeight:900, color:sel?"#fff":C.text, fontFamily:"'Georgia',serif" }}>{pot.label}</span>
          <span style={{ fontSize:9, color:sel?"#fff":C.textSoft }}>circular</span>
        </div>
      </div>
    );
    return (
      <div onClick={()=>onSelect(sel?null:pot.label)} style={{ background:sel?C.green:col+"22", border:`2px solid ${sel?C.green:col+"66"}`, borderRadius:12, padding:"12px 16px", cursor:"pointer", transition:"all 0.15s", minHeight:64, display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:sel?`0 0 0 4px ${C.greenLight}`:C.shadow, gridColumn:fullWidth?"1 / -1":"auto" }}>
        <span style={{ fontSize:22, fontWeight:900, color:sel?"#fff":C.text, fontFamily:"'Georgia',serif" }}>{pot.label}</span>
        <span style={{ fontSize:10, color:sel?"#ffffffcc":C.textSoft }}>{pot.circular?"~1m²":"2×1m"}</span>
      </div>
    );
  };

  if (roomId==="S1") {
    return (
      <div style={{ background:C.bg, borderRadius:14, padding:10, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[[0,1],[2,3],[4,5]].map((pair,ri)=>(
            <div key={ri} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {pair.map(idx=><PotCell key={pots[idx].label} pot={pots[idx]} idx={idx} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ background:C.bg, borderRadius:14, padding:10, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <PotCell pot={pots[0]} idx={0} /><PotCell pot={pots[1]} idx={1} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
          <PotCell pot={pots[2]} idx={2} fullWidth />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignItems:"center" }}>
          <PotCell pot={pots[3]} idx={3} /><PotCell pot={pots[4]} idx={4} />
        </div>
      </div>
    </div>
  );
}

// ─── TAREAS PAGE ───────────────────────────────────────────────────────────
function TareasPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("hoy");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [newT, setNewT] = useState({ title:"", room_id:"S1", type:"riego", assignee:user.name, due_date:todayISO, priority:"normal", recurrent:false, recurrent_days:1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = view==="hoy"
        ? await db.query("tasks", `due_date=eq.${todayISO}&order=priority.desc,created_at.asc`)
        : await db.query("tasks", `due_date=gte.${todayISO}&order=due_date.asc,priority.desc`);
      setTasks(data);
    } finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); },[load]);

  const toggleTask = async (task) => {
    const newStatus = task.status==="completada"?"pendiente":"completada";
    await db.update("tasks", task.id, { status:newStatus, completed_at:newStatus==="completada"?new Date().toISOString():null });
    await logActivity(user.name, `${newStatus==="completada"?"Completó":"Reabrió"} tarea: ${task.title}`, "task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:newStatus}:t));
    setToast({ msg:newStatus==="completada"?"Completada ✓":"Reabierta", type:"success" });
  };

  const addTask = async () => {
    if (!newT.title.trim()) return;
    setSaving(true);
    try {
      const inserted = await db.insert("tasks", { ...newT, status:"pendiente", created_by:user.name });
      await logActivity(user.name, `Creó tarea: ${newT.title}`, "task");
      setTasks(prev=>[...prev, inserted[0]]);
      setShowForm(false);
      setToast({ msg:"Tarea creada", type:"success" });
    } catch { setToast({ msg:"Error al guardar", type:"error" }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:32 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8 }}>
        <div style={{ fontSize:26, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>Tareas</div>
        <button onClick={()=>setShowForm(!showForm)} style={{ background:C.green, border:"none", color:"#fff", borderRadius:12, padding:"10px 20px", cursor:"pointer", fontSize:14, fontWeight:800 }}>+ Nueva</button>
      </div>

      {showForm && (
        <Card>
          <SectionLabel>Nueva tarea</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.textSoft, display:"block", marginBottom:5 }}>Título *</label>
              <input value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))} placeholder="Ej: Fumigación S1"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:15, color:C.text, background:C.surface, outline:"none" }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                {label:"Sala",key:"room_id",opts:["S1","S2"]},
                {label:"Tipo",key:"type",opts:Object.keys(TYPE_META)},
                {label:"Responsable",key:"assignee",opts:["Lucas","Alex","Gustavo","Alexis"]},
                {label:"Prioridad",key:"priority",opts:["normal","alta"]},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{ fontSize:12, color:C.textSoft, display:"block", marginBottom:5 }}>{f.label}</label>
                  <select value={newT[f.key]} onChange={e=>setNewT(p=>({...p,[f.key]:e.target.value}))}
                    style={{ width:"100%", padding:"11px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text, background:C.surface, outline:"none" }}>
                    {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize:12, color:C.textSoft, display:"block", marginBottom:5 }}>Fecha</label>
              <input type="date" value={newT.due_date} onChange={e=>setNewT(p=>({...p,due_date:e.target.value}))}
                style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text, background:C.surface, outline:"none" }} />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:C.textMid, cursor:"pointer" }}>
              <input type="checkbox" checked={newT.recurrent} onChange={e=>setNewT(p=>({...p,recurrent:e.target.checked}))} style={{ width:18, height:18 }} />
              Tarea recurrente
            </label>
            {newT.recurrent && (
              <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:C.textMid }}>
                Repetir cada
                <input type="number" min={1} max={30} value={newT.recurrent_days} onChange={e=>setNewT(p=>({...p,recurrent_days:+e.target.value}))}
                  style={{ width:56, padding:"8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, textAlign:"center", color:C.text }} />
                días
              </label>
            )}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={addTask} disabled={saving} style={{ flex:1, background:C.green, border:"none", color:"#fff", borderRadius:12, padding:14, cursor:"pointer", fontSize:15, fontWeight:800, opacity:saving?0.7:1 }}>
                {saving?"Guardando...":"Guardar"}
              </button>
              <button onClick={()=>setShowForm(false)} style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, color:C.textMid, borderRadius:12, padding:14, cursor:"pointer", fontSize:14 }}>Cancelar</button>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display:"flex", gap:8 }}>
        {[{id:"hoy",label:"Hoy"},{id:"proximas",label:"Próximas"}].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{ flex:1, padding:"12px", borderRadius:12, cursor:"pointer", fontSize:14, fontWeight:700, background:view===v.id?C.green:C.surface, color:view===v.id?"#fff":C.textMid, border:`1.5px solid ${view===v.id?C.green:C.border}` }}>{v.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {tasks.length===0 && <div style={{ textAlign:"center", color:C.textSoft, fontSize:14, fontStyle:"italic", padding:"24px 0" }}>Sin tareas para este período</div>}
          {tasks.map(t=>{
            const tm=TYPE_META[t.type]||TYPE_META.revision;
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, background:t.status==="completada"?C.greenLight:C.surface, border:`1.5px solid ${t.priority==="alta"&&t.status!=="completada"?"#E8C07A":C.border}`, opacity:t.status==="completada"?0.65:1, boxShadow:C.shadow }}>
                <button onClick={()=>toggleTask(t)} style={{ width:28, height:28, borderRadius:9, flexShrink:0, background:t.status==="completada"?C.green:"transparent", border:`2px solid ${t.status==="completada"?C.green:C.borderStrong}`, cursor:"pointer", color:"#fff", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>{t.status==="completada"&&"✓"}</button>
                <div style={{ width:34, height:34, borderRadius:9, background:tm.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{tm.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, textDecoration:t.status==="completada"?"line-through":"none" }}>{t.title}</div>
                  <div style={{ fontSize:12, color:C.textSoft, marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                    {t.room_id&&<span>{t.room_id}</span>}
                    <span>{t.assignee}</span>
                    {t.due_date!==todayISO&&<span>{fmtDate(t.due_date)}</span>}
                    {t.recurrent&&<span>↻ cada {t.recurrent_days}d</span>}
                    {t.auto_generated&&<span style={{ color:C.green, fontWeight:700 }}>⚡ auto</span>}
                  </div>
                </div>
                {t.priority==="alta"&&t.status!=="completada"&&<Badge label="Alta" color={C.amber} bg={C.amberLight} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VEGETATIVO PAGE ───────────────────────────────────────────────────────
function VegetativoPage({ genetics }) {
  const [stock, setStock] = useState([]);
  const [cloners, setCloners] = useState([]);
  const [tab, setTab] = useState("madres");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([db.get("veg_stock"), db.get("cloners")])
      .then(([s,c])=>{ setStock(s); setCloners(c); })
      .finally(()=>setLoading(false));
  },[]);

  const genMap = {};
  genetics.forEach(g=>{ genMap[g.name]=g.color; });

  const mothers = stock.filter(s=>s.type==="madre");
  const postClone = stock.filter(s=>s.type==="post_esqueje");
  const totalMothers = mothers.filter(m=>m.status==="activa").reduce((a,m)=>a+m.count,0);
  const totalPost = postClone.reduce((a,p)=>a+p.count,0);

  if (loading) return <Spinner />;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:32 }}>
      <div style={{ fontSize:26, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", paddingTop:8 }}>Vegetativo</div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          {label:"Madres",value:totalMothers,warn:mothers.filter(m=>m.status==="renovar").length,icon:"🌳"},
          {label:"Espejeras",value:cloners.length,icon:"🌿"},
          {label:"Post-esq.",value:totalPost,icon:"🪴"},
        ].map(s=>(
          <Card key={s.label} style={{ padding:"14px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", margin:"6px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.textSoft }}>{s.label}</div>
            {s.warn>0&&<div style={{ fontSize:11, color:C.amber, fontWeight:700, marginTop:4 }}>⚠ {s.warn} renovar</div>}
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {[{id:"madres",l:"🌳 Madres"},{id:"espejeras",l:"🌿 Espejeras"},{id:"post",l:"🪴 Post-esq."}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"11px 6px", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, background:tab===t.id?C.green:C.surface, color:tab===t.id?"#fff":C.textMid, border:`1.5px solid ${tab===t.id?C.green:C.border}` }}>{t.l}</button>
        ))}
      </div>

      {tab==="madres" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {mothers.map(m=>{
            const days=daysFrom(m.entry_date);
            const renovar=m.status==="renovar";
            const col=genMap[m.genetic_name]||C.green;
            return (
              <Card key={m.id} style={{ padding:"16px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:col+"22", border:`2px solid ${col+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🌳</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{m.genetic_name}</div>
                    <div style={{ fontSize:12, color:C.textSoft }}>Maceta {m.pot_label} · {fmtDate(m.entry_date)} · {m.count} planta{m.count>1?"s":""}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:26, fontWeight:900, color:days>180?C.amber:C.text, fontFamily:"'Georgia',serif", lineHeight:1 }}>{days}d</div>
                    <Badge label={m.status} color={renovar?C.amber:C.green} bg={renovar?C.amberLight:C.greenLight} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="espejeras" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {cloners.map(cl=>(
            <Card key={cl.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{cl.label}</div>
                <span style={{ fontSize:14, fontWeight:700, color:C.textMid }}>0/{cl.capacity}</span>
              </div>
              <ProgressBar value={0} max={cl.capacity} h={8} />
              <div style={{ fontSize:12, color:C.textSoft, marginTop:8, fontStyle:"italic" }}>Sin esquejes cargados — tocá para configurar</div>
            </Card>
          ))}
        </div>
      )}

      {tab==="post" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {postClone.map(p=>{
            const col=genMap[p.genetic_name]||C.green;
            return (
              <Card key={p.id} style={{ padding:"16px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:col+"22", border:`2px solid ${col+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🪴</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{p.genetic_name}</div>
                    <div style={{ fontSize:12, color:C.textSoft }}>Maceta {p.pot_label} · {p.status}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:32, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif", lineHeight:1 }}>{p.count}</div>
                    <div style={{ fontSize:11, color:C.textSoft }}>plantas</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── GENÉTICAS PAGE ────────────────────────────────────────────────────────
function GeneticasPage({ genetics, setGenetics, user }) {
  const [showForm, setShowForm] = useState(false);
  const [newG, setNewG] = useState({ name:"", color:GEN_PALETTE[0] });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const addGenetic = async () => {
    if (!newG.name.trim()) return;
    setSaving(true);
    try {
      const inserted = await db.insert("genetics", { name:newG.name.trim(), color:newG.color });
      await logActivity(user.name, `Agregó genética: ${newG.name}`, "genetics");
      setGenetics(prev=>[...prev, inserted[0]]);
      setNewG({ name:"", color:GEN_PALETTE[(genetics.length+1)%GEN_PALETTE.length] });
      setShowForm(false);
      setToast({ msg:"Genética agregada", type:"success" });
    } catch { setToast({ msg:"Error al guardar", type:"error" }); }
    finally { setSaving(false); }
  };

  const removeGenetic = async (id, name) => {
    await db.delete("genetics", id);
    await logActivity(user.name, `Eliminó genética: ${name}`, "genetics");
    setGenetics(prev=>prev.filter(g=>g.id!==id));
    setToast({ msg:"Genética eliminada", type:"success" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:32 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8 }}>
        <div style={{ fontSize:26, fontWeight:900, color:C.text, fontFamily:"'Georgia',serif" }}>Genéticas</div>
        <button onClick={()=>setShowForm(!showForm)} style={{ background:C.green, border:"none", color:"#fff", borderRadius:12, padding:"10px 20px", cursor:"pointer", fontSize:14, fontWeight:800 }}>+ Agregar</button>
      </div>

      {showForm && (
        <Card>
          <SectionLabel>Nueva genética</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.textSoft, display:"block", marginBottom:5 }}>Nombre *</label>
              <input value={newG.name} onChange={e=>setNewG(p=>({...p,name:e.target.value}))} placeholder="Ej: Gorilla Glue #4"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:15, color:C.text, background:C.surface, outline:"none" }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.textSoft, display:"block", marginBottom:8 }}>Color</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {GEN_PALETTE.map(col=>(
                  <div key={col} onClick={()=>setNewG(p=>({...p,color:col}))} style={{ width:36, height:36, borderRadius:10, background:col, cursor:"pointer", border:`3px solid ${newG.color===col?"#fff":"transparent"}`, boxShadow:newG.color===col?`0 0 0 3px ${col}`:C.shadow, transition:"all 0.1s" }} />
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={addGenetic} disabled={saving} style={{ flex:1, background:C.green, border:"none", color:"#fff", borderRadius:12, padding:14, cursor:"pointer", fontSize:15, fontWeight:800, opacity:saving?0.7:1 }}>
                {saving?"Guardando...":"Guardar"}
              </button>
              <button onClick={()=>setShowForm(false)} style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, color:C.textMid, borderRadius:12, padding:14, cursor:"pointer", fontSize:14 }}>Cancelar</button>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {genetics.map(g=>(
          <Card key={g.id} style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:g.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, color:"#fff", fontWeight:900 }}>{g.name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{g.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:g.color }} />
                  <span style={{ fontSize:12, color:C.textSoft }}>{g.color}</span>
                </div>
              </div>
              {user.role==="admin" && (
                <button onClick={()=>removeGenetic(g.id,g.name)} style={{ background:C.redLight, border:`1px solid ${C.red}33`, color:C.red, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:700 }}>Eliminar</button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null);
  const [page, setPage]         = useState("dashboard");
  const [genetics, setGenetics] = useState([]);
  const [loadingGen, setLoadingGen] = useState(false);

  useEffect(()=>{
    if (user) {
      setLoadingGen(true);
      db.get("genetics").then(setGenetics).finally(()=>setLoadingGen(false));
      logActivity(user.name, "Inició sesión", "auth");
    }
  },[user]);

  const handleLogin = (u) => { setUser(u); setPage("dashboard"); };
  const handleLogout = () => { setUser(null); setPage("dashboard"); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const render = () => {
    switch(page) {
      case "sala_S1":    return <SalaPage roomId="S1" setPage={setPage} user={user} genetics={genetics} />;
      case "sala_S2":    return <SalaPage roomId="S2" setPage={setPage} user={user} genetics={genetics} />;
      case "vegetativo": return <VegetativoPage genetics={genetics} />;
      case "tareas":     return <TareasPage user={user} />;
      case "geneticas":  return <GeneticasPage genetics={genetics} setGenetics={setGenetics} user={user} />;
      default:           return <Dashboard setPage={setPage} user={user} />;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Segoe UI','Helvetica Neue',sans-serif", color:C.text, maxWidth:480, margin:"0 auto" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:2px;}
        input,select,button{font-family:inherit;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .page{animation:fadeUp 0.2s ease;}
      `}</style>
      <TopBar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <div className="page" style={{ padding:"16px 16px 0" }}>
        {loadingGen ? <Spinner /> : render()}
      </div>
    </div>
  );
}
