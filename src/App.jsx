import { useState, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://spirakozxkymwstelrph.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXJha296eGt5bXdzdGVscnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDgwNzYsImV4cCI6MjA5NDY4NDA3Nn0.wsKIWwEgxmSSWNSzwOwvyqRMnOM1AztZuhvnaQnV7Jw";

const db = {
  async get(table, filters={}) {
    let url = `${SUPA_URL}/rest/v1/${table}?select=*`;
    Object.entries(filters).forEach(([k,v]) => { url += `&${k}=eq.${encodeURIComponent(v)}`; });
    const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async query(table, qs) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
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
      method: "DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  async deleteWhere(table, field, value) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${field}=eq.${value}`, {
      method: "DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  // Borrado con filtro libre (para condiciones múltiples, ej: pot_id + cycle_id)
  async deleteQuery(table, qs) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, {
      method: "DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  async updateWhere(table, field, value, data) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${field}=eq.${encodeURIComponent(value)}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
};

const logA = async (u,a,e=null,d=null) => { try { await db.insert("activity_log",{user_name:u,action:a,entity_type:e,details:d}); } catch{} };
// Extrae un mensaje legible de un error de Supabase
const errMsg = (e) => {
  let m = e?.message || String(e||"Error desconocido");
  try { const j = JSON.parse(m); m = j.message || j.hint || j.details || m; } catch{}
  if(m.length>120) m = m.slice(0,120)+"…";
  return m;
};
const addDays = (ds,n) => { const d=new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };

// Paleta "Minimalista neutro": fondo gris muy claro, cards blancas, un único
// verde de acento y grises sobrios. Los colores funcionales (amber/red/blue…)
// se mantienen pero más armónicos, para señalizar sin meter ruido visual.
// ── TEMA ─────────────────────────────────────────────────────────────────────
// Dos paletas con las MISMAS claves. `C` es un objeto mutable: al cambiar de tema
// se le sobrescriben los valores y todo el árbol vuelve a leerlos en el próximo
// render. Así no hay que tocar los miles de `C.algo` repartidos por el archivo.
const THEMES = {
  // Oscuro: para trabajar con luz baja.
  dark: {
    bg:"#0F1513", surface:"#18211D", surfaceAlt:"#1F2925",
    border:"rgba(232,239,234,0.08)", borderStrong:"rgba(232,239,234,0.18)",
    text:"#E8EFEA", textMid:"#B4C0B9", textSoft:"#8E9A94",
    green:"#5CC497", greenLight:"rgba(92,196,151,0.15)",
    amber:"#F2B24E", amberLight:"rgba(242,178,78,0.15)",
    red:"#EE7059", redLight:"rgba(238,112,89,0.15)",
    blue:"#7FA6F2", blueLight:"rgba(127,166,242,0.15)",
    purple:"#A992F2", purpleLight:"rgba(169,146,242,0.15)",
    teal:"#5CC9B5", tealLight:"rgba(92,201,181,0.15)",
    onAccent:"#0F1513",
    shadow:"none",
    shadowUp:"0 12px 32px rgba(0,0,0,0.45)",
  },
  // Claro: para sala con todas las luces prendidas.
  // Verde hoja profundo, ámbar tipo luz de sodio para lo que pide atención y rojo para lo urgente.
  light: {
    bg:"#ECEFEA", surface:"#FFFFFF", surfaceAlt:"#F3F5F2",
    border:"rgba(23,32,28,0.10)", borderStrong:"rgba(23,32,28,0.20)",
    text:"#17201C", textMid:"#4A5750", textSoft:"#6F7B75",
    green:"#1D6B4E", greenLight:"rgba(29,107,78,0.12)",
    amber:"#A8640A", amberLight:"rgba(201,122,18,0.15)",
    red:"#BF3F2B", redLight:"rgba(196,67,46,0.13)",
    blue:"#3767C9", blueLight:"rgba(55,103,201,0.12)",
    purple:"#6A4FC2", purpleLight:"rgba(106,79,194,0.12)",
    teal:"#14786A", tealLight:"rgba(20,120,106,0.12)",
    onAccent:"#FFFFFF",
    shadow:"0 1px 2px rgba(23,32,28,0.06)",
    shadowUp:"0 12px 32px rgba(23,32,28,0.16)",
  },
};
const C = { ...THEMES.dark };
const applyTheme = (name) => { Object.assign(C, THEMES[name]||THEMES.dark); };
// Se aplica antes del primer render para que no haya un parpadeo oscuro al abrir.
try { const t = localStorage.getItem("gm_theme"); if (t === "light") applyTheme("light"); } catch { /* SSR o storage bloqueado */ }

// Fuente de títulos: sans moderna y sobria (antes era Georgia serif).
const H = "Manrope,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
const GP = ["#2A6E35","#1E5FAD","#B87318","#6B4FA0","#B83228","#0E7A6E","#8B4513","#1A6B8A","#6B6B10","#8B2252","#2E6B8B","#5A7A2A","#8B4A00","#3A3A8B","#7A2A5A"];
const TM = {
  riego:     {icon:"💧",label:"Riego",     color:"#2563A8",bg:"#EAF1FA"},
  nutricion: {icon:"🌱",label:"Nutrición", color:"#2D7A4B",bg:"#E7F1EB"},
  fumigacion:{icon:"🔬",label:"Fumigación",color:"#6B5BB0",bg:"#EFEBF8"},
  poda:      {icon:"✂️",label:"Poda",      color:"#B26B12",bg:"#FAF0DF"},
  limpieza:  {icon:"🧹",label:"Limpieza",  color:"#6B7280",bg:"#F1F3F2"},
  revision:  {icon:"👁", label:"Revisión",  color:"#1F8A7A",bg:"#E3F2EF"},
  cosecha:   {icon:"🌾",label:"Cosecha",   color:"#9A7A1A",bg:"#F7F1DC"},
  lavado:    {icon:"🚿",label:"Lavado",    color:"#1F8A7A",bg:"#E3F2EF"},
};
const PM = {
  "vegetativo":{label:"Vegetativo",color:"#2D7A4B",bg:"#E7F1EB"},
  "floración": {label:"Floración", color:"#B26B12",bg:"#FAF0DF"},
  "cosechando":{label:"Cosechando",color:"#C0392B",bg:"#FBEAE8"},
};
const ROOM_POTS = {
  S1:[{label:"F"},{label:"C"},{label:"E"},{label:"B"},{label:"D"},{label:"A"}],
  S2:[{label:"D"},{label:"C"},{label:"B"},{label:"A"},{label:"E",circular:true}],
};
// Layout de planos a escala (según croquis reales). Coords en % del contenedor.
// S1 es más grande que S2 (se refleja en aspectRatio del lienzo).
const ROOM_PLANS={
  S1:{ratio:"3 / 4",pots:[
    {label:"F",x:4,y:5,w:44,h:27},
    {label:"C",x:52,y:5,w:44,h:27},
    {label:"E",x:4,y:37,w:44,h:27},
    {label:"B",x:52,y:37,w:44,h:27},
    {label:"D",x:4,y:69,w:44,h:27},
    {label:"A",x:52,y:69,w:44,h:27},
  ]},
  S2:{ratio:"1 / 1",pots:[
    {label:"D",x:4,y:6,w:29,h:38},
    {label:"C",x:36,y:6,w:29,h:38},
    {label:"B",x:68,y:6,w:28,h:38},
    {label:"E",x:6,y:52,w:38,h:42,circular:true},
    {label:"A",x:50,y:58,w:46,h:30},
  ]},
};
// Config por defecto si una sala no tiene fila en room_config
const RC_DEFAULTS = {flower_days:65,flush_days:20,harvest_days:5,veg_days:6,area_m2:null,volume_l:null,temp_min:null,temp_max:null,hum_min:null,hum_max:null,irrigation_type:"manual"};
// Devuelve la config de una sala (de room_config) o defaults
const getRC = (roomConfig,roomId) => {
  const rc=(roomConfig||[]).find(r=>r.room_id===roomId);
  return {...RC_DEFAULTS,...(rc||{}),room_id:roomId,display_name:rc?.display_name||(roomId==="S1"?"Sala 1":roomId==="S2"?"Sala 2":roomId)};
};
const TODAY = new Date();
// "Hoy" en horario de Argentina (UTC-3), no en UTC, para que las tareas del día no se corran de noche.
const todayISO = new Date(Date.now()-3*3600*1000).toISOString().split("T")[0];
const daysFrom = d => Math.floor((TODAY-new Date(d))/86400000);
const daysTo   = d => Math.floor((new Date(d)-TODAY)/86400000);
const fmtDate  = d => new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short"});
const fmtFull  = d => new Date(d).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
const fmtTime  = d => new Date(d).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
// Agrupa tareas por espacio (S1, S2, Vegetativo y General) para las vistas de tareas.
const groupTasks = (list) => {
  const g={S1:[],S2:[],Vegetativo:[],General:[]};
  (list||[]).forEach(t=>{
    if(t.room_id==="S1")g.S1.push(t);
    else if(t.room_id==="S2")g.S2.push(t);
    else if(t.room_id==="Vegetativo")g.Vegetativo.push(t);
    else g.General.push(t);
  });
  return g;
};
const groupMeta = (r) =>
  r==="S1"?{label:"🌿 Sala 1",color:C.amber}
  :r==="S2"?{label:"🏠 Sala 2",color:C.blue}
  :r==="Vegetativo"?{label:"🌱 Vegetativo",color:C.green}
  :{label:"📋 General",color:C.textSoft};

// Esquejeras: grilla FIJA de 8 columnas (lado largo, números 1-8) × filas con letras.
// Misma forma en la vista general y en el detalle → no se deforma ni se mueven posiciones.
const CLONER_COLS = 8;                 // columnas = letras A–H (a lo ancho, como en la realidad)
const COL_LETTERS = ["A","B","C","D","E","F","G","H","I","J"];
const clonerRows = (cap,cols=CLONER_COLS) => Math.max(1, Math.ceil((cap||0)/(cols||CLONER_COLS)));
// La posición se nombra letra + número (ej: "A1"): letra por columna, número por fila.
const slotCoord = (i,cols=CLONER_COLS) => `${COL_LETTERS[i%(cols||CLONER_COLS)]||"?"}${Math.floor(i/(cols||CLONER_COLS))+1}`;

// ── BÚSQUEDA DE FENOS ────────────────────────────────────────────────────────
// Un FENO es una planta nacida de semilla, no un esqueje. De una misma planta
// salen varios clones, y todos siguen siendo el mismo feno: DS-1 puede estar en
// dos slots de la esquejera y en tres celdas de una mesa de producción.
//
// Una BÚSQUEDA (`pheno_hunts`) agrupa los N fenos de una tanda de semillas.
// Ej: 28 semillas de Dos y Choc → DS-1 ... DS-28, todos de la búsqueda.
//
// Numeración de la mesa de semillas: se cuenta desde ABAJO A LA IZQUIERDA
// hacia arriba, igual que en el cuaderno. En una grilla 4×7: A7=1, D7=4,
// A6=5 ... A1=25, D1=28.
const seedNum = (i,w,h) => (h-1-Math.floor(i/w))*w + (i%w) + 1;
// Índice de celda que le corresponde a un número dado (la inversa de seedNum).
const seedIndex = (n,w,h) => { const k=n-1; return (h-1-Math.floor(k/w))*w + (k%w); };
// Coordenada tipo batalla naval, se sigue usando en la esquejera.
const potCoord = (i,w) => `${COL_LETTERS[i%w]||"?"}${Math.floor(i/w)+1}`;
// Prefijo sugerido a partir del nombre. Es solo una sugerencia: el usuario lo edita
// (en el cuaderno "Dos y Choc" se anota DS, no DYC).
const genAbbr = (name) => {
  const clean=(name||"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
  if(!clean)return "GEN";
  const w=clean.split(" ").filter(Boolean);
  if(w.length===1)return w[0].slice(0,3).padEnd(2,"X");
  return w.slice(0,2).map(x=>x[0]).join("");
};
const phenoCode = (prefix,n) => `${prefix||"F"}-${n}`;
const PHENO_ST = {
  activo:      {label:"En búsqueda",  color:C.blue,   bg:C.blueLight},
  candidato:   {label:"Candidato",    color:C.amber,  bg:C.amberLight},
  seleccionado:{label:"Seleccionado", color:C.green,  bg:C.greenLight},
  descartado:  {label:"Descartado",   color:C.red,    bg:C.redLight},
  muerto:      {label:"Perdido",      color:C.textSoft,bg:C.surfaceAlt},
};
// Los ids de otras tablas pueden venir como número o texto según PostgREST.
// Guardamos y comparamos siempre en texto para que nunca falle el match.
const sid = v => (v===null||v===undefined) ? null : String(v);

// ── COLOR DE GENÉTICA ────────────────────────────────────────────────────────
// Cada genética tiene UN solo color, el de la página Genéticas, y se usa igual en
// madres, esquejeras, VG y floración. Si alguna no tiene, se le asigna uno de la
// paleta que no esté usado y queda guardado (después se puede editar en Genéticas).
const nextGenColor = (list=[]) => {
  const used=new Set(list.map(g=>String(g.color||"").toUpperCase()));
  return GP.find(c=>!used.has(c.toUpperCase())) || GP[list.length%GP.length];
};
const ensureGenColors = async (list=[]) => {
  const out=[...list];
  for(let i=0;i<out.length;i++){
    if(out[i].color)continue;
    const c=nextGenColor(out);
    out[i]={...out[i],color:c};
    try{await db.update("genetics",out[i].id,{color:c});}catch{/* si falla, igual se ve con ese color en esta sesión */}
  }
  return out;
};

// ── TANDAS DE ESQUEJERA ──────────────────────────────────────────────────────
// Una bandeja lleva una tanda por vez. La fecha de inicio y los días hasta el
// corte viven en `cloners`; si la bandeja es vieja y no tiene fecha propia, se
// deduce de la fecha de corte más reciente de sus esquejes (dato que ya existía).
const CLONER_READY_DAYS = 11;   // referencia por defecto: 11 días hasta pasar a tierra
const batchStart = (cloner,slots=[]) => {
  if(cloner?.start_date)return cloner.start_date;
  const ds=slots.filter(s=>s.cut_date).map(s=>s.cut_date).sort();
  return ds.length?ds[ds.length-1]:null;
};
const batchReadyDays = (cloner) => {
  const n=Number(cloner?.ready_days);
  return Number.isFinite(n)&&n>0?n:CLONER_READY_DAYS;
};
// Devuelve el estado del contador: día actual, cuántos faltan y con qué color mostrarlo.
const batchProgress = (cloner,slots=[]) => {
  const start=batchStart(cloner,slots);
  if(!start)return null;
  const total=batchReadyDays(cloner);
  const day=-daysTo(start);                  // días transcurridos (el día de corte = 0)
  const left=total-day;
  return {
    start, total, day, left,
    ready: left<=0,
    label: left>0 ? `Día ${day} de ${total} · falta${left===1?"":"n"} ${left} día${left===1?"":"s"}`
                  : left===0 ? `Día ${day} · listos para tierra`
                  : `Día ${day} · ${-left} día${-left===1?"":"s"} pasado de punto`,
    color: left>2 ? C.blue : left>0 ? C.amber : left===0 ? C.green : C.red,
  };
};

const RESET_SCHEDULE = [
  {off:1,title:"Día 1 — Top-dress humus + compost",type:"nutricion",priority:"alta"},
  {off:1,title:"Día 1 — Alfalfa + micorrizas + radicular",type:"nutricion",priority:"normal"},
  {off:2,title:"Día 2 — Minerales: yeso + harina de roca",type:"nutricion",priority:"alta"},
  {off:3,title:"Día 3 — Aplicar ACT (té de compost)",type:"riego",priority:"normal"},
  {off:4,title:"Día 4 — Reponer mulch + regar",type:"limpieza",priority:"normal"},
  {off:5,title:"Día 5 — Trasplante de esquejes",type:"revision",priority:"alta"},
];
// Genera (con dedupe) las tareas del Reset Express para una sala desde una fecha.
// Devuelve cuántas creó. No duplica si ya existe una pendiente con mismo título+sala+fecha.
const generateResetTasks = async (roomId, startISO, assignee, createdBy="sistema") => {
  let created = 0;
  for (const s of RESET_SCHEDULE) {
    const due = addDays(startISO, s.off);
    try {
      const existing = await db.query("tasks", `room_id=eq.${roomId}&due_date=eq.${due}&title=eq.${encodeURIComponent(s.title)}`);
      if (existing && existing.length) continue;
      await db.insert("tasks", {
        title:s.title, room_id:roomId, rooms:roomId, type:s.type, assignee:assignee||"Lucas",
        due_date:due, priority:s.priority||"normal", status:"pendiente", source:"guia",
        auto_generated:true, instructions:`Reset Express · suelo vivo de alta rotación. Cama de ~800 L (ver dosis en la Guía).`,
        created_by:createdBy,
      });
      created++;
    } catch { /* sigue con las demás */ }
  }
  return created;
};

// BASE UI
function Card({children,style={},onClick}){ const[h,sH]=useState(false); return <div onClick={onClick} onMouseEnter={()=>onClick&&sH(true)} onMouseLeave={()=>sH(false)} style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,boxShadow:h&&onClick?C.shadowUp:C.shadow,padding:18,cursor:onClick?"pointer":"default",transform:h&&onClick?"translateY(-2px)":"none",transition:"all 0.15s",...style}}>{children}</div>; }
function Badge({label,color,bg}){return <span style={{background:bg,color,borderRadius:20,padding:"3px 11px",fontSize:12.5,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;}
function PBadge({phase}){const m=PM[phase]||PM["floración"];return <Badge label={m.label} color={m.color} bg={m.bg}/>;}
function Bar({value,max,color=C.green,h=7}){const p=max>0?Math.min(100,Math.round(value/max*100)):0;return<div style={{background:C.border,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:`${p}%`,background:color,height:"100%",borderRadius:99,transition:"width 0.5s"}}/></div>;}
// Grilla de esquejera con forma FIJA: 8 columnas (1-8) × N filas (a, b, c...).
// Idéntica en la vista general y en el detalle. colorAt(i) da el color del slot i; onPaint(i) la hace interactiva.
function ClonerGrid({capacity,colorAt,onPaint=null,cell=null,showCoords=false,labelAt=null,ringAt=null,cols=CLONER_COLS}){
  cols=cols||CLONER_COLS;
  const rows=clonerRows(capacity,cols);
  const interactive=!!onPaint;
  const cellSize=cell||(interactive?34:14);
  const lab=interactive?11:8;
  return <div style={{display:"inline-grid",gridTemplateColumns:`${interactive?16:10}px repeat(${cols},${cellSize}px)`,gap:interactive?5:3,alignItems:"center",justifyItems:"center"}}>
    <span/>
    {Array.from({length:cols},(_,c)=><span key={"h"+c} style={{fontSize:lab,fontWeight:700,color:C.textSoft}}>{COL_LETTERS[c]||"?"}</span>)}
    {Array.from({length:rows},(_,r)=>[
      <span key={"r"+r} style={{fontSize:lab,fontWeight:700,color:C.textSoft}}>{r+1}</span>,
      ...Array.from({length:cols},(_,c)=>{const i=r*cols+c;const used=i<capacity;const col=used?colorAt(i):null;
        const lab=labelAt?labelAt(i):(showCoords&&used&&interactive?slotCoord(i,cols):null);
        const ring=ringAt?ringAt(i):false;
        return <div key={i} onClick={()=>used&&onPaint&&onPaint(i)} title={used?slotCoord(i,cols)+(col?"":" · vacío"):""}
          style={{width:cellSize,height:cellSize,borderRadius:interactive?6:3,background:used?(col||C.border):"transparent",
            border:used?`${ring?2:1}px solid ${ring?C.purple:(col?"transparent":C.borderStrong)}`:"none",cursor:interactive&&used?"pointer":"default",
            opacity:used?1:0.25,transition:"background 0.08s",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:Math.max(7,Math.round(cellSize*0.32)),fontWeight:900,letterSpacing:"-0.03em",
            color:col?"rgba(0,0,0,0.72)":C.textSoft}}>
          {lab}
        </div>;
      }),
    ])}
  </div>;
}
// Reduce miles de lecturas a un máximo dibujable (30 días de sensor = ~4300 puntos).
function decimate(points,max=180){
  if(!points||points.length<=max)return points||[];
  const step=Math.ceil(points.length/max);
  const out=[];
  for(let i=0;i<points.length;i+=step)out.push(points[i]);
  const last=points[points.length-1];
  if(out[out.length-1]!==last)out.push(last);
  return out;
}
// Marcas "lindas" para el eje X: alineadas a horas/días redondos en hora local.
function timeTicks(minX,maxX,target=6){
  const M=60000,HR=3600000,D=86400000;
  if(!(maxX>minX))return {ticks:[minX],step:HR};
  const steps=[5*M,15*M,30*M,HR,2*HR,3*HR,4*HR,6*HR,12*HR,D,2*D,3*D,7*D,14*D,30*D];
  const span=maxX-minX;
  let step=steps[steps.length-1];
  for(const s of steps){if(span/s<=target){step=s;break;}}
  const off=new Date(minX).getTimezoneOffset()*60000;
  const ticks=[];
  for(let t=Math.ceil((minX-off)/step)*step+off;t<=maxX;t+=step)ticks.push(t);
  if(ticks.length===0)ticks.push(minX,maxX);
  return {ticks,step};
}
function hhmm(ms){const d=new Date(ms);return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
function dayShort(ms){const s=new Date(ms).toLocaleDateString("es-AR",{weekday:"short",day:"numeric"});return s.charAt(0).toUpperCase()+s.slice(1);}
function fmtTickX(ms,step){return step<86400000?hhmm(ms):dayShort(ms);}
function fmtTipX(ms,long){return long?`${dayShort(ms)} · ${hhmm(ms)}`:hhmm(ms);}

// Gráfico de línea SVG (sin librerías). Eje X temporal con etiquetas de hora/día.
// Tocá o arrastrá el dedo sobre el gráfico: aparece una línea vertical y un globito
// con la hora exacta y el valor de ese punto. Se cierra tocando afuera.
// series: [{points:[{x:msEpoch,y:number}], color, name?}]
function LineChart({series,height=150,yMin,yMax,bands,unit=""}){
  const svgRef=useRef(null);
  const dragRef=useRef(false);
  const [actX,setActX]=useState(null);
  useEffect(()=>{
    if(actX===null)return;
    const out=e=>{const el=svgRef.current;if(el&&!el.contains(e.target))setActX(null);};
    document.addEventListener("pointerdown",out);
    return ()=>document.removeEventListener("pointerdown",out);
  },[actX]);

  const W=300,H=height,pad={l:30,r:10,t:10,b:26};
  const ser=(series||[]).map(s=>({
    name:s.name||null,
    color:s.color||C.green,
    points:decimate((s.points||[]).slice().sort((a,b)=>a.x-b.x)),
  })).filter(s=>s.points.length>0);
  const allY=ser.flatMap(s=>s.points.map(p=>p.y));
  const allX=ser.flatMap(s=>s.points.map(p=>p.x));
  if(allY.length===0)return <div style={{textAlign:"center",color:C.textSoft,fontSize:13,padding:"20px 0"}}>Sin datos aún</div>;

  // El dominio Y incluye las bandas objetivo, así la franja sombreada siempre se ve.
  const bY=(bands||[]).flatMap(b=>[b.min,b.max]);
  let lo=yMin!=null?yMin:Math.min(...allY,...bY);
  let hi=yMax!=null?yMax:Math.max(...allY,...bY);
  if(hi<=lo){hi=lo+1;lo=lo-1;}
  const air=(hi-lo)*0.1;
  if(yMin==null)lo-=air;
  if(yMax==null)hi+=air;
  const minX=Math.min(...allX),maxX=Math.max(...allX);
  const sx=x=>pad.l+(maxX===minX?0.5:(x-minX)/(maxX-minX))*(W-pad.l-pad.r);
  const sy=y=>pad.t+(1-(y-lo)/(hi-lo||1))*(H-pad.t-pad.b);
  const {ticks,step}=timeTicks(minX,maxX);
  const dec=(hi-lo)<6?1:0;              // etiquetas del eje Y: VPD necesita decimales; temp/humedad no
  const fy=v=>Number(v).toFixed(dec);
  const fv=v=>String(+Number(v).toFixed(2));   // globito: el valor real del sensor, sin ceros de más

  const pick=e=>{
    const el=svgRef.current;if(!el)return;
    const r=el.getBoundingClientRect();
    if(!r.width)return;
    const vx=((e.clientX-r.left)/r.width)*W;
    const frac=(vx-pad.l)/Math.max(1,W-pad.l-pad.r);
    setActX(Math.max(minX,Math.min(maxX,minX+frac*(maxX-minX))));
  };
  const hits=actX===null?[]:ser.map(s=>{
    let best=null,bd=Infinity;
    for(const p of s.points){const d=Math.abs(p.x-actX);if(d<bd){bd=d;best=p;}}
    return best?{x:best.x,y:best.y,color:s.color,name:s.name}:null;
  }).filter(Boolean);

  const tipTime=hits.length?fmtTipX(hits[0].x,step>=86400000):"";
  const tipLines=hits.map(h=>`${h.name?h.name+" ":""}${fv(h.y)}${unit}`);
  const tw=Math.max(...[tipTime,...tipLines].map(s=>s.length),4)*4.7+11;
  const th=13+tipLines.length*10;
  const tx=hits.length?Math.max(2,Math.min(W-tw-2,sx(hits[0].x)-tw/2)):0;

  const chart=<svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
    style={{width:"100%",height:"auto",touchAction:"none",cursor:"crosshair",userSelect:"none",WebkitTapHighlightColor:"transparent"}}
    onPointerDown={e=>{dragRef.current=true;try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}pick(e);}}
    onPointerMove={e=>{if(dragRef.current)pick(e);}}
    onPointerUp={()=>{dragRef.current=false;}}
    onPointerCancel={()=>{dragRef.current=false;}}
    onPointerLeave={()=>{dragRef.current=false;}}>
    {(bands||[]).map((b,i)=><rect key={i} x={pad.l} y={sy(b.max)} width={W-pad.l-pad.r} height={Math.max(0,sy(b.min)-sy(b.max))} fill={b.color} opacity={0.12}/>)}
    {[lo,(lo+hi)/2,hi].map((v,i)=><g key={i}>
      <line x1={pad.l} y1={sy(v)} x2={W-pad.r} y2={sy(v)} stroke={C.border} strokeWidth={0.5}/>
      <text x={pad.l-4} y={sy(v)+3} fontSize={8} fill={C.textSoft} textAnchor="end" fontFamily={MONO}>{fy(v)}</text>
    </g>)}
    <line x1={pad.l} y1={H-pad.b} x2={W-pad.r} y2={H-pad.b} stroke={C.borderStrong} strokeWidth={0.6}/>
    {ticks.map(t=>{
      const x=sx(t);
      const anchor=x<pad.l+13?"start":x>W-pad.r-13?"end":"middle";
      return <g key={t}>
        <line x1={x} y1={pad.t} x2={x} y2={H-pad.b} stroke={C.border} strokeWidth={0.5} opacity={0.55}/>
        <line x1={x} y1={H-pad.b} x2={x} y2={H-pad.b+3} stroke={C.borderStrong} strokeWidth={0.6}/>
        <text x={x} y={H-pad.b+13} fontSize={8} fill={C.textSoft} textAnchor={anchor} fontFamily={MONO}>{fmtTickX(t,step)}</text>
      </g>;
    })}
    {ser.map((s,si)=><g key={si}>
      <polyline fill="none" stroke={s.color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={s.points.map(p=>`${sx(p.x)},${sy(p.y)}`).join(" ")}/>
      {s.points.length<=40&&s.points.map((p,pi)=><circle key={pi} cx={sx(p.x)} cy={sy(p.y)} r={2} fill={s.color}/>)}
    </g>)}
    {hits.length>0&&<g>
      <line x1={sx(hits[0].x)} y1={pad.t} x2={sx(hits[0].x)} y2={H-pad.b} stroke={C.textSoft} strokeWidth={0.8} strokeDasharray="3 2"/>
      {hits.map((h,i)=><circle key={i} cx={sx(h.x)} cy={sy(h.y)} r={3.6} fill={h.color} stroke={C.surface} strokeWidth={1.2}/>)}
      <rect x={tx} y={2} width={tw} height={th} rx={4} fill={C.surfaceAlt} stroke={C.borderStrong} strokeWidth={0.6}/>
      <text x={tx+5} y={10} fontSize={7.5} fill={C.textSoft} fontFamily={MONO}>{tipTime}</text>
      {tipLines.map((l,i)=><text key={i} x={tx+5} y={20+i*10} fontSize={9} fontWeight="700" fill={hits[i].color} fontFamily={MONO}>{l}</text>)}
    </g>}
  </svg>;

  if(!ser.some(s=>s.name))return chart;
  return <div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:5}}>
      {ser.map((s,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.textMid}}>
        <span style={{width:10,height:3,borderRadius:2,background:s.color}}/>{s.name}
      </span>)}
    </div>
    {chart}
  </div>;
}
function SL({children,style={}}){return <div style={{fontSize:14,fontWeight:800,color:C.textMid,marginBottom:12,...style}}>{children}</div>;}
function Accordion({title,icon,children,right}){
  const [open,setOpen]=useState(false);
  return <Card style={{padding:0,overflow:"hidden"}}>
    <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:12,padding:"15px 18px",cursor:"pointer",userSelect:"none"}}>
      <span style={{fontSize:18}}>{icon}</span>
      <span style={{flex:1,fontSize:14.5,fontWeight:700,color:C.text,fontFamily:H}}>{title}</span>
      {right}
      <span style={{fontSize:12,color:C.textSoft,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▼</span>
    </div>
    {open&&<div style={{padding:"0 18px 18px"}}>{children}</div>}
  </Card>;
}
function Spin(){return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.green}`,animation:"spin 0.8s linear infinite"}}/></div>;}
function Divider(){return <div style={{height:1,background:C.border,margin:"14px 0"}}/>;}

function Toast({msg,type="success",onClose,onUndo}){
  useEffect(()=>{const t=setTimeout(onClose,onUndo?5000:3500);return()=>clearTimeout(t);},[onClose,onUndo]);
  const col=type==="success"?{bg:C.greenLight,c:C.green}:type==="error"?{bg:C.redLight,c:C.red}:{bg:C.amberLight,c:C.amber};
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:col.bg,color:col.c,border:`1.5px solid ${col.c}44`,borderRadius:14,padding:"12px 20px",fontSize:14,fontWeight:700,boxShadow:C.shadowUp,maxWidth:"92vw",textAlign:"center",display:"flex",alignItems:"center",gap:14}}>
    <span style={{whiteSpace:"nowrap"}}>{type==="success"?"✓":type==="error"?"✕":"⚠"} {msg}</span>
    {onUndo&&<button onClick={()=>{onUndo();onClose();}} style={{background:col.c,color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0}}>Deshacer</button>}
  </div>;
}

function Modal({title,children,onClose,z}){
  const wide=useIsWide(760);
  return <div style={{position:"fixed",inset:0,zIndex:z||200,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:wide?"center":"flex-end",justifyContent:"center",padding:wide?20:0}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.surface,borderRadius:wide?"18px":"20px 20px 0 0",width:"100%",maxWidth:wide?560:480,maxHeight:wide?"90vh":"88vh",overflowY:"auto",padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>{title}</div>
        <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:26,cursor:"pointer",color:C.textSoft,lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>;
}

function FI({label,value,onChange,type="text",placeholder="",min,max}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:13.5,color:C.textMid,fontWeight:600,display:"block",marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
      style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15.5,color:C.text,background:C.surface,outline:"none"}}/>
  </div>;
}
function FS({label,value,onChange,options}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:13.5,color:C.textMid,fontWeight:600,display:"block",marginBottom:5}}>{label}</label>}
    <select value={value} onChange={onChange} style={{width:"100%",padding:"11px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15,color:C.text,background:C.surface,outline:"none"}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>;
}
function FT({label,value,onChange,placeholder="",rows=3}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:13.5,color:C.textMid,fontWeight:600,display:"block",marginBottom:5}}>{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15.5,color:C.text,background:C.surface,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.5}}/>
  </div>;
}
// Input numérico que deja escribir libremente y recién valida (clamp) al salir del campo.
// Esto evita el bug de "se pone el valor máximo" al teclear.
function NumField({label,value,onCommit,min,max,placeholder="",compact=false}){
  const [txt,setTxt]=useState(value==null||value===""?"":String(value));
  useEffect(()=>{setTxt(value==null||value===""?"":String(value));},[value]);
  const commit=()=>{
    if(txt===""){onCommit("");return;}
    let n=parseInt(txt,10);
    if(isNaN(n)){setTxt(value==null?"":String(value));return;}
    if(min!=null&&n<min)n=min;
    if(max!=null&&n>max)n=max;
    setTxt(String(n));onCommit(n);
  };
  const inp=<input type="text" inputMode="numeric" pattern="[0-9]*" value={txt} placeholder={placeholder}
    onChange={e=>{const v=e.target.value;if(v===""||/^\d+$/.test(v))setTxt(v);}}
    onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}
    style={compact
      ?{width:54,padding:"6px 8px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,textAlign:"center",color:C.text,background:C.surface,outline:"none"}
      :{width:"100%",padding:"11px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15,color:C.text,background:C.surface,outline:"none"}}/>;
  if(compact)return inp;
  return <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:5}}>{label}</label>}
    {inp}
  </div>;
}
// Hook responsive: true si la pantalla es ancha (tablet/PC)
function useIsWide(bp=760){
  const [wide,setWide]=useState(typeof window!=="undefined"?window.innerWidth>=bp:false);
  useEffect(()=>{
    const on=()=>setWide(window.innerWidth>=bp);
    window.addEventListener("resize",on);on();
    return()=>window.removeEventListener("resize",on);
  },[bp]);
  return wide;
}
function Btn({children,onClick,v="primary",disabled=false,full=false,style={}}){
  const s={
    primary:{background:C.green,color:"#fff",border:"none"},
    secondary:{background:C.bg,color:C.textMid,border:`1.5px solid ${C.border}`},
    danger:{background:C.redLight,color:C.red,border:`1px solid ${C.red}33`},
    amber:{background:C.amberLight,color:C.amber,border:`1px solid ${C.amber}44`},
  }[v];
  return <button onClick={onClick} disabled={disabled} style={{...s,borderRadius:12,padding:"12px 20px",cursor:disabled?"default":"pointer",fontSize:14,fontWeight:700,opacity:disabled?0.6:1,width:full?"100%":"auto",transition:"all 0.15s",...style}}>{children}</button>;
}

function TaskRow({t,onToggle,onInfo,onDelete}){
  const tm=TM[t.type]||TM.revision;
  const isGuide=t.source==="guia";
  const done=t.status==="completada";
  const accent=isGuide?C.teal:null;
  const clickable=!!onInfo;
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:14,background:done?C.greenLight:isGuide?C.tealLight:C.surface,borderLeft:isGuide?`5px solid ${C.teal}`:undefined,border:`1.5px solid ${t.priority==="alta"&&!done?"#E0B25C":isGuide?C.teal+"55":C.border}`,opacity:done?0.68:1,boxShadow:C.shadow}}>
    <button onClick={()=>onToggle(t)} style={{width:28,height:28,borderRadius:9,flexShrink:0,background:done?C.green:"transparent",border:`2px solid ${done?C.green:accent||C.borderStrong}`,cursor:"pointer",color:"#fff",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>{done?"✓":""}</button>
    <div onClick={()=>clickable&&onInfo(t)} style={{flex:1,display:"flex",alignItems:"center",gap:12,cursor:clickable?"pointer":"default",minWidth:0}}>
      <div style={{width:34,height:34,borderRadius:9,background:isGuide?"#fff":tm.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,border:isGuide?`1.5px solid ${C.teal}33`:undefined}}>{isGuide?"🌱":tm.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14.5,fontWeight:700,color:C.text,textDecoration:done?"line-through":"none"}}>{t.title}</div>
        <div style={{fontSize:12,color:C.textSoft,marginTop:2,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {isGuide&&<span style={{background:C.teal,color:"#fff",borderRadius:6,padding:"1px 7px",fontWeight:700,fontSize:11}}>🌱 Guía</span>}
          {t.room_id&&<span style={{background:C.greenLight,color:C.green,borderRadius:6,padding:"1px 6px",fontWeight:700}}>{t.room_id}</span>}
          <span>{t.assignee}</span>
          {t.due_date!==todayISO&&<span>{fmtDate(t.due_date)}</span>}
          {t.recurrent&&<span style={{color:C.green,fontWeight:600}}>↻{t.recurrent_days}d</span>}
          {t.auto_generated&&!isGuide&&<span style={{color:C.blue,fontWeight:600}}>⚡</span>}
          {t.instructions&&<span style={{color:C.blue,fontWeight:600}} title="Tiene instrucciones">📋</span>}
        </div>
      </div>
    </div>
    {t.priority==="alta"&&!done&&<Badge label="Alta" color={C.amber} bg={C.amberLight}/>}
    {onDelete&&<button onClick={(e)=>{e.stopPropagation();onDelete(t);}} title="Borrar" style={{background:"transparent",border:"none",cursor:"pointer",fontSize:15,color:C.textSoft,flexShrink:0,padding:"4px 2px",lineHeight:1}}>🗑</button>}
    {clickable&&<span style={{color:C.textSoft,fontSize:20,flexShrink:0,lineHeight:1}}>›</span>}
  </div>;
}

// Modal de detalle de una tarea: muestra todos los datos (sala, tipo, responsable,
// fecha, prioridad, recurrencia, origen) e instrucciones. Accesible tocando la fila.
function TaskDetailModal({task,onClose}){
  if(!task)return null;
  const tm=TM[task.type]||TM.revision;
  const isGuide=task.source==="guia";
  const origen=isGuide?"Sugerida por la Guía":task.auto_generated?"Generada automáticamente":task.created_by?`Creada por ${task.created_by}`:"Manual";
  return <Modal title={`${isGuide?"🌱":tm.icon} ${task.title}`} onClose={onClose}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {task.room_id&&<Badge label={task.room_id} color={C.green} bg={C.greenLight}/>}
      <Badge label={tm.label} color={tm.color} bg={tm.bg}/>
      <Badge label={task.assignee} color={C.blue} bg={C.blueLight}/>
      {task.priority==="alta"&&<Badge label="Prioridad alta" color={C.amber} bg={C.amberLight}/>}
      <Badge label={task.status==="completada"?"Completada ✓":"Pendiente"} color={task.status==="completada"?C.green:C.textMid} bg={task.status==="completada"?C.greenLight:C.bg}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:C.textSoft,marginBottom:2}}>📅 Fecha</div>
        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{fmtDate(task.due_date)}{task.due_date===todayISO?" · hoy":""}</div>
      </div>
      <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:C.textSoft,marginBottom:2}}>↻ Recurrencia</div>
        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{task.recurrent?`Cada ${task.recurrent_days} día${task.recurrent_days>1?"s":""}`:"No recurrente"}</div>
      </div>
    </div>
    <SL>Instrucciones</SL>
    <div style={{fontSize:14,color:task.instructions?C.text:C.textSoft,fontStyle:task.instructions?"normal":"italic",lineHeight:1.6,background:C.bg,borderRadius:12,padding:16,whiteSpace:"pre-wrap"}}>{task.instructions||"Sin instrucciones cargadas para esta tarea."}</div>
    <div style={{fontSize:11.5,color:C.textSoft,marginTop:12,fontStyle:"italic"}}>{origen}{task.completed_at?` · hecho ${fmtDate(task.completed_at.split("T")[0])}`:""}</div>
  </Modal>;
}

// LOGIN
function LoginScreen({onLogin}){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState(null);
  useEffect(()=>{db.get("users").then(setUsers).catch(()=>setErr("No se pudo conectar")).finally(()=>setLoading(false));},[]);
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{marginBottom:32,textAlign:"center"}}>
      <div style={{width:72,height:72,borderRadius:20,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px"}}>🌿</div>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>GrowManager</div>
      <div style={{fontSize:13,color:C.textSoft,marginTop:4}}>Club de Cultivo Orgánico</div>
      {!loading&&!err&&<div style={{fontSize:11,color:C.green,marginTop:6,fontWeight:600}}>● Conectado a Supabase</div>}
      {err&&<div style={{fontSize:11,color:C.red,marginTop:6}}>✕ {err}</div>}
    </div>
    {loading?<Spin/>:<div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:12,fontWeight:700,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",textAlign:"center",marginBottom:4}}>¿Quién sos?</div>
      {users.map(u=><button key={u.id} onClick={()=>onLogin(u)}
        style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,textAlign:"left",transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.boxShadow=C.shadowUp;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
        <div style={{width:46,height:46,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18,fontWeight:900,flexShrink:0}}>{u.initial}</div>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:C.text}}>{u.name}</div><div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{u.area}</div></div>
        <Badge label={u.role==="admin"?"Admin":"Usuario"} color={u.role==="admin"?C.green:C.textMid} bg={u.role==="admin"?C.greenLight:C.bg}/>
      </button>)}
    </div>}
  </div>;
}

// TOP BAR
function TopBar({user,page,setPage,onLogout,wide}){
  const isHome=["dashboard","mi_turno"].includes(page);
  const homeP=user.role==="admin"?"dashboard":"mi_turno";
  const UserBtn=<button onClick={onLogout} title="Cerrar sesión" style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:12,padding:"6px 12px",border:`1px solid ${C.border}`,cursor:"pointer"}}>
    <div style={{width:28,height:28,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900}}>{user.initial}</div>
    <span style={{fontSize:14,fontWeight:700,color:C.text}}>{user.name}</span>
  </button>;
  if(wide){
    return <header style={{display:"flex",alignItems:"center",justifyContent:"flex-end",height:58,padding:"0 28px",position:"sticky",top:0,zIndex:80,background:C.bg+"E6",backdropFilter:"blur(6px)"}}>{UserBtn}</header>;
  }
  return <header style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 16px",height:58,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 0 #DCE4D7"}}>
    {!isHome&&page!=="__more__"&&<button onClick={()=>setPage(page.startsWith("veg_")?"vegetativo":homeP)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:24,color:C.textMid,padding:"4px 2px",lineHeight:1}}>←</button>}
    <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
      <div style={{width:32,height:32,borderRadius:9,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🌿</div>
      <span style={{fontSize:17,fontWeight:900,color:C.text,fontFamily:H}}>GrowManager</span>
    </div>
    {UserBtn}
  </header>;
}

function NavBar({user,page,setPage,wide}){
  const isAdmin=user.role==="admin";
  // Accesos principales (barra inferior en mobile) y secundarios (en "Más" / sidebar)
  const primary=isAdmin
    ?[{id:"dashboard",l:"Inicio",i:"⌂"},{id:"sala_S1",l:"S1",i:"🌿"},{id:"sala_S2",l:"S2",i:"🌿"},{id:"tareas",l:"Tareas",i:"✓"},{id:"guia",l:"Guía",i:"📖"}]
    :[{id:"mi_turno",l:"Mi turno",i:"🌿"},{id:"tareas",l:"Tareas",i:"✓"},{id:"guia",l:"Guía",i:"📖"},{id:"sala_S1",l:"S1",i:"🏠"},{id:"sala_S2",l:"S2",i:"🏠"}];
  const secondary=isAdmin
    ?[{id:"calendario",l:"Agenda",i:"📅"},{id:"bitacora",l:"Bitácora",i:"📓"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"geneticas",l:"Genéticas",i:"🧬"},{id:"fenos",l:"Fenos",i:"🔬"},{id:"estadisticas",l:"Estadísticas",i:"📊"},{id:"historial",l:"Historial",i:"📜"},{id:"plagas",l:"Plagas",i:"🐛"},{id:"bot",l:"Asistente",i:"🤖"},{id:"configuracion",l:"Configuración",i:"⚙"}]
    :[{id:"calendario",l:"Agenda",i:"📅"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"historial",l:"Historial",i:"📜"},{id:"bot",l:"Asistente",i:"🤖"}];

  // ----- SIDEBAR (PC) -----
  if(wide){
    const Sec=({title})=> <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",margin:"18px 8px 8px"}}>{title}</div>;
    const Item=(n)=>{const on=page===n.id||(n.id==="vegetativo"&&page.startsWith("veg_"));return <button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",padding:"11px 14px",borderRadius:12,cursor:"pointer",fontSize:15,fontWeight:on?800:600,background:on?C.green:"transparent",color:on?"#fff":C.textMid,border:"none",marginBottom:2,transition:"all 0.12s"}}><span style={{fontSize:18,width:22,textAlign:"center"}}>{n.i}</span>{n.l}</button>;};
    return <nav style={{width:212,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,height:"100vh",position:"sticky",top:0,overflowY:"auto",padding:"14px 10px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px 12px"}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>🌿</div>
        <span style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:H}}>GrowManager</span>
      </div>
      <Sec title="Principal"/>
      {primary.map(Item)}
      <Sec title="Gestión"/>
      {secondary.map(Item)}
    </nav>;
  }

  // ----- BARRA INFERIOR (mobile/tablet) -----
  const moreActive=secondary.some(s=>s.id===page)||page.startsWith("veg_");
  return <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,background:C.surface,borderTop:`1px solid ${C.border}`,boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-around",padding:"6px 4px 8px",maxWidth:480,margin:"0 auto"}}>
    {primary.map(n=>{const on=page===n.id;return <button key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0"}}>
      <span style={{fontSize:20,filter:on?"none":"grayscale(0.4)",opacity:on?1:0.7}}>{n.i}</span>
      <span style={{fontSize:11,fontWeight:on?800:600,color:on?C.green:C.textSoft}}>{n.l}</span>
    </button>;})}
    <button onClick={()=>setPage("__more__")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0"}}>
      <span style={{fontSize:20,opacity:moreActive||page==="__more__"?1:0.7}}>⋯</span>
      <span style={{fontSize:11,fontWeight:moreActive||page==="__more__"?800:600,color:moreActive||page==="__more__"?C.green:C.textSoft}}>Más</span>
    </button>
  </nav>;
}

// Pantalla "Más" (mobile): accesos secundarios + ajuste de tamaño de texto
function MorePage({user,setPage,textScale,setTextScale,theme,setTheme}){
  const isAdmin=user.role==="admin";
  const items=isAdmin
    ?[{id:"calendario",l:"Agenda",i:"📅"},{id:"bitacora",l:"Bitácora",i:"📓"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"geneticas",l:"Genéticas",i:"🧬"},{id:"fenos",l:"Fenos",i:"🔬"},{id:"estadisticas",l:"Estadísticas",i:"📊"},{id:"historial",l:"Historial",i:"📜"},{id:"plagas",l:"Plagas",i:"🐛"},{id:"bot",l:"Asistente",i:"🤖"},{id:"configuracion",l:"Configuración",i:"⚙"}]
    :[{id:"calendario",l:"Agenda",i:"📅"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"historial",l:"Historial",i:"📜"},{id:"bot",l:"Asistente",i:"🤖"}];
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Más</div>
    <ThemeControl theme={theme} setTheme={setTheme}/>
    <TextScaleControl textScale={textScale} setTextScale={setTextScale}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {items.map(n=><Card key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"18px 18px"}}>
        <span style={{fontSize:26}}>{n.i}</span><span style={{fontSize:15.5,fontWeight:700,color:C.text}}>{n.l}</span>
      </Card>)}
    </div>
  </div>;
}

// Elegir tema. El claro existe porque con las luces de sala prendidas
// la pantalla oscura no se llega a leer.
function ThemeControl({theme,setTheme}){
  const opts=[{v:"dark",l:"Oscuro",i:"🌙",d:"Para trabajar con luz baja"},{v:"light",l:"Claro",i:"☀️",d:"Para sala con luces prendidas"}];
  return <Card>
    <SL>🎨 Tema de la app</SL>
    <div style={{fontSize:13.5,color:C.textSoft,marginBottom:12,lineHeight:1.5}}>Se recuerda en este dispositivo. Cada tablet o celular puede tener el suyo.</div>
    <div style={{display:"flex",gap:8}}>
      {opts.map(o=><button key={o.v} onClick={()=>setTheme(o.v)} style={{flex:1,padding:"13px 8px",borderRadius:12,cursor:"pointer",background:theme===o.v?C.green:C.surface,color:theme===o.v?C.onAccent:C.textMid,border:`1.5px solid ${theme===o.v?C.green:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
        <span style={{fontSize:20}}>{o.i}</span>
        <span style={{fontSize:14,fontWeight:800}}>{o.l}</span>
        <span style={{fontSize:10.5,opacity:0.85,textAlign:"center",lineHeight:1.35}}>{o.d}</span>
      </button>)}
    </div>
  </Card>;
}

// Control de tamaño de texto (accesibilidad) — escala toda la app vía zoom
function TextScaleControl({textScale,setTextScale}){
  const opts=[{v:1,l:"Normal"},{v:1.1,l:"Grande"},{v:1.2,l:"Más grande"}];
  return <Card>
    <SL>🔎 Tamaño de texto</SL>
    <div style={{fontSize:13.5,color:C.textSoft,marginBottom:12,lineHeight:1.5}}>Agranda toda la app para leer más cómodo. Se recuerda en este dispositivo.</div>
    <div style={{display:"flex",gap:8}}>
      {opts.map(o=><button key={o.v} onClick={()=>setTextScale(o.v)} style={{flex:1,padding:"12px 6px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:o.v===1?14:o.v===1.1?15.5:17,background:textScale===o.v?C.green:C.surface,color:textScale===o.v?"#fff":C.textMid,border:`1.5px solid ${textScale===o.v?C.green:C.border}`}}>{o.l}</button>)}
    </div>
  </Card>;
}

// MI TURNO
function MiTurno({user,setPage,roomConfig,rooms=["S1","S2"],targets}){
  const [tasks,setTasks]=useState([]);
  const [cycles,setCycles]=useState([]);
  const [climate,setClimate]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showDone,setShowDone]=useState(false);
  const [infoTask,setInfoTask]=useState(null);
  useEffect(()=>{
    Promise.all([
      db.query("tasks",`due_date=eq.${todayISO}&assignee=eq.${encodeURIComponent(user.name)}&order=priority.desc,created_at.asc`),
      db.query("cycles","active=eq.true"),
      db.query("climate_logs",`recorded_at=gte.${addDays(todayISO,-2)}&order=recorded_at.desc`),
    ]).then(([t,c,cl])=>{setTasks(t);setCycles(c);setClimate(cl);}).finally(()=>setLoading(false));
  },[user.name]);
  const lastClimate=rid=>{const x=climate.find(c=>c.room_id===rid);return x?{temp:x.temperature,humidity:x.humidity}:{temp:null,humidity:null};};
  const toggle=async task=>{
    const ns=task.status==="completada"?"pendiente":"completada";
    await db.update("tasks",task.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
    if(ns==="completada")await pestTaskDone(task,user.name);
    if(ns==="completada"&&task.recurrent&&task.recurrent_days){
      await db.insert("tasks",{title:task.title,room_id:task.room_id,type:task.type,assignee:task.assignee,due_date:addDays(task.due_date,task.recurrent_days),status:"pendiente",priority:task.priority,recurrent:true,recurrent_days:task.recurrent_days,created_by:"sistema"});
    }
    await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${task.title}`,"task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:ns}:t));
    const undo=async()=>{
      await db.update("tasks",task.id,{status:task.status,completed_at:task.status==="completada"?task.completed_at:null});
      setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:task.status}:t));
    };
    setToast({msg:ns==="completada"?"Completada ✓":"Reabierta",type:"success",undo});
  };
  if(loading)return <Spin/>;
  const pending=tasks.filter(t=>t.status==="pendiente");
  const done=tasks.filter(t=>t.status==="completada");
  const byRoom=groupTasks(pending);
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {infoTask&&<TaskDetailModal task={infoTask} onClose={()=>setInfoTask(null)}/>}
    <div style={{padding:"20px 0 4px"}}>
      <div style={{fontSize:13,color:C.textSoft,textTransform:"capitalize"}}>{fmtFull(TODAY)}</div>
      <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:H,marginTop:4}}>Hola, <span style={{color:C.green}}>{user.name}</span> 🌿</div>
      <div style={{fontSize:14,color:C.textSoft,marginTop:4}}>{pending.length>0?`Tenés ${pending.length} tarea${pending.length>1?"s":""} para hoy`:"¡Todo al día! 👌"}</div>
    </div>
    <Card style={{padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><SL style={{marginBottom:0}}>Tu progreso</SL><span style={{fontSize:13,fontWeight:700,color:C.green}}>{done.length}/{tasks.length}</span></div>
      <Bar value={done.length} max={tasks.length||1} h={12}/>
      <div style={{fontSize:12,color:C.textSoft,marginTop:8}}>{tasks.length>0?Math.round(done.length/tasks.length*100):0}% completado</div>
    </Card>
    {/* Estado de salas (solo lectura) + acceso a la Guía por etapa */}
    <Card style={{padding:"14px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <SL style={{marginBottom:0}}>Estado de salas</SL>
        {setPage&&<button onClick={()=>setPage("guia")} style={{background:C.tealLight,color:C.teal,border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📖 Ver guía</button>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {rooms.map(rid=>{
          const c=cycles.find(x=>x.room_id===rid);
          const rc=getRC(roomConfig,rid);
          const cl=lastClimate(rid);
          const sk=stageKey(c,rc);
          const tg=getTargets(targets,rid,c,rc);
          const outT=cl.temp!=null&&(cl.temp<tg.temp.min||cl.temp>tg.temp.max);
          const outH=cl.humidity!=null&&(cl.humidity<tg.hum.min||cl.humidity>tg.hum.max);
          return <div key={rid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.bg,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>{rc.display_name}</div>
              <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{c?(sk?STAGE_SHORT[sk]:PM[c.phase]?.label||c.phase):"Sin ciclo activo"}</div>
            </div>
            {cl.temp!=null&&<span style={{fontSize:12.5,fontWeight:700,color:outT?C.red:C.textMid,background:outT?C.redLight:C.surface,borderRadius:8,padding:"3px 9px",border:`1px solid ${C.border}`}}>🌡 {cl.temp}°{outT?" ⚠":""}</span>}
            {cl.humidity!=null&&<span style={{fontSize:12.5,fontWeight:700,color:outH?C.red:C.textMid,background:outH?C.redLight:C.surface,borderRadius:8,padding:"3px 9px",border:`1px solid ${C.border}`}}>💧 {cl.humidity}%{outH?" ⚠":""}</span>}
          </div>;
        })}
      </div>
    </Card>
    {Object.entries(byRoom).map(([room,tList])=>tList.length===0?null:
      <div key={room}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:groupMeta(room).color}}>{groupMeta(room).label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{tList.map(t=><TaskRow key={t.id} t={t} onToggle={toggle} onInfo={setInfoTask}/>)}</div>
      </div>
    )}
    {pending.length===0&&done.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textSoft}}><div style={{fontSize:40,marginBottom:12}}>✓</div><div style={{fontSize:16,fontWeight:700}}>Sin tareas asignadas hoy</div></div>}
    {done.length>0&&<>
      <button onClick={()=>setShowDone(!showDone)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDone?"▲":"▼"} Completadas ({done.length})</button>
      {showDone&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6}}>{done.map(t=><TaskRow key={t.id} t={t} onToggle={toggle} onInfo={setInfoTask}/>)}</div>}
    </>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// REDISEÑO (admin) — íconos de línea, menú Inicio / Salas / Vege / Tareas / Más,
// Inicio en orden alertas → espacios → hoy, "Más" por carpetas y tarea rápida.
// ══════════════════════════════════════════════════════════════════════════════
const GI={
  home:'<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h4.5v-6h4v6h4.5V9"/>',
  salas:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 12h17M12 4.5v15"/>',
  vege:'<path d="M12 20.5V12"/><path d="M12 12.5c0-4.2-2.8-6.5-7.2-6.5 0 4.2 2.8 6.5 7.2 6.5Z"/><path d="M12 10.5c0-3.8 2.6-6 7-6 0 3.8-2.6 6-7 6Z"/>',
  tareas:'<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m3.8 6.4 1.3 1.3 2.4-2.5M3.8 11.9l1.3 1.3 2.4-2.5M3.8 17.4l1.3 1.3 2.4-2.5"/>',
  mas:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5.5 12.5 4 4L18.5 7.5"/>',
  ok:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
  back:'<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  chev:'<path d="m9.5 6 6 6-6 6"/>',
  x:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  thermo:'<path d="M14 14.6V5.5a2 2 0 1 0-4 0v9.1a3.8 3.8 0 1 0 4 0Z"/>',
  drop:'<path d="M12 3.8s5.8 6 5.8 10.2a5.8 5.8 0 0 1-11.6 0C6.2 9.8 12 3.8 12 3.8Z"/>',
  leaf:'<path d="M5 19.5C5 11 10 5 19.5 4.5 19.5 14 13.5 19.5 5 19.5Z"/><path d="M5 19.5 13 11.5"/>',
  scissors:'<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 7.9 20 18M8.6 16.1 20 6"/>',
  tree:'<path d="M12 21v-6"/><path d="M12 15c-3.8 0-6.3-2.4-6.3-5.6S8.3 3 12 3s6.3 3.2 6.3 6.4S15.8 15 12 15Z"/>',
  pot:'<path d="M6 11.5h12l-1.6 8.5H7.6L6 11.5Z"/><path d="M12 11.5V8M12 8c0-2.2 1.5-3.8 4.2-3.8 0 2.2-1.5 3.8-4.2 3.8Z"/>',
  harvest:'<path d="M12 21V8"/><path d="M12 8C9.6 8 8 6.4 8 4c2.4 0 4 1.6 4 4Zm0 0c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4Zm0 5c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4Zm0 0c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4Z"/>',
  dna:'<path d="M7.5 3c0 5.5 9 6.5 9 12 0 2.6-1.5 4.6-1.5 6"/><path d="M16.5 3c0 5.5-9 6.5-9 12 0 2.6 1.5 4.6 1.5 6"/><path d="M9 7.5h6M9 16.5h6"/>',
  flask:'<path d="M9 3.5h6M10 3.5V9l-5.2 9.2A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.8L14 9V3.5"/><path d="M7.6 15h8.8"/>',
  bug:'<rect x="8" y="7.5" width="8" height="12.5" rx="4"/><path d="M12 7.5V4.5M9.2 4.8l1.3 2.4M14.8 4.8l-1.3 2.4M8 11.5H4.5M19.5 11.5H16M8 16H5M19 16h-3"/>',
  book:'<path d="M3.5 5h6a2.5 2.5 0 0 1 2.5 2.5V20a2 2 0 0 0-2-2H3.5Z"/><path d="M20.5 5h-6A2.5 2.5 0 0 0 12 7.5V20a2 2 0 0 1 2-2h6.5Z"/>',
  notebook:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 3.5v17M12.5 8.5H16M12.5 12H16"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  history:'<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.3l2.8 1.8"/>',
  chart:'<path d="M5 19.5v-8M10.5 19.5V5M16 19.5v-5.5M3 19.5h18"/>',
  cart:'<path d="M3 4.5h2.4l2.1 10h10.8L20.5 7.5H6.4"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  chat:'<path d="M4.5 5.5h15v10h-9.5L4.5 19.5v-14Z"/>',
  sliders:'<path d="M4 7h9M18 7h2M4 17h3M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>',
  sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  text:'<path d="M3.5 18 8 6h1.2l4.5 12M5 14h7"/><path d="M14.5 18l2.7-7h1.1l2.7 7M15.5 15.6h4.5"/>',
  water:'<path d="M12 3.8s5.8 6 5.8 10.2a5.8 5.8 0 0 1-11.6 0C6.2 9.8 12 3.8 12 3.8Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  spray:'<path d="M8 10h7v10.5H8Z"/><path d="M9.5 10V7h4v3M13.5 7.5h3M18.5 5.5h.1M18.5 8h.1M18.5 10.5h.1"/>',
  swap:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  stop:'<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert:'<path d="M12 4.2 3 19.5h18L12 4.2Z"/><path d="M12 10v4.2M12 17v.2"/>',
  seed:'<path d="M12 20.5c-4 0-6.6-2.8-6.6-7S8.4 3.5 12 3.5s6.6 5.8 6.6 10-2.6 7-6.6 7Z"/><path d="M12 17V9.5"/>',
  star:'<path d="m12 4.2 2.5 5 5.5.8-4 3.9.95 5.5L12 16.8l-4.95 2.6L8 13.9 4 10l5.5-.8Z"/>',
  trash:'<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.6 7l1 13h8.8l1-13"/><path d="M10.4 11v5.5M13.6 11v5.5"/>',
  edit:'<path d="M4 20h4L19.2 8.8a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14.6 6.4 3 3"/>',
  filter:'<path d="M4 6h16l-6.2 7.3V19l-3.6-2.1v-3.6Z"/>',
  recycle:'<path d="M7.5 9.5 10 5.3a2.3 2.3 0 0 1 4 0l1.4 2.4"/><path d="m16.8 11.5 2.3 4a2.3 2.3 0 0 1-2 3.5h-3.3"/><path d="M9.5 19H6.9a2.3 2.3 0 0 1-2-3.5l1.3-2.2"/><path d="m13.2 6.3 2.2 1.4.5-2.6M12.8 21l1-2-2-1.2M5 11.2l1.2 2.1 2.1-1"/>',
  moon:'<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  flower:'<circle cx="12" cy="10" r="2.3"/><path d="M12 7.7c0-2.6 1.3-4.2 3-4.2s2.4 2.2 1 4.1M14.2 11.1c2.4.8 3.5 2.6 3 4.2s-3.1 1.6-4.2-.5M9.8 11.1c-2.4.8-3.5 2.6-3 4.2s3.1 1.6 4.2-.5M12 7.7c0-2.6-1.3-4.2-3-4.2S6.6 5.7 8 7.6"/><path d="M12 12.3v8.2"/>',
  mushroom:'<path d="M3.5 12a8.5 7 0 0 1 17 0Z"/><path d="M9.5 12v5.5a2.5 2.5 0 0 0 5 0V12"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  wind:'<path d="M3.5 9h11a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3.5 14.5h14a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3.5 12h6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.2 15.2 5 5"/>',
  shield:'<path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6Z"/><path d="m9 12 2.2 2.2L15.3 10"/>',
  broom:'<path d="M14.5 3.5 11 11"/><path d="M8.2 10.2 13.8 13l-1.9 6.5c-2.5-.6-5.6-2.1-7.4-4.4Z"/><path d="M8.5 16.2 6.8 18"/>',
  rock:'<path d="M4 18.5 6 11l4.5-4.5 5 1.5L20 13l-1.5 5.5Z"/><path d="M10.5 6.5 12 12l-6 -1M12 12l6.5 1"/>',
  jar:'<path d="M8 3.5h8v3H8Z"/><path d="M7.5 6.5h9l1 3v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9Z"/><path d="M6.5 12.5h11"/>',
};
function Icon({n,size=22,sw=1.8,color="currentColor",style}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{display:"block",flexShrink:0,...style}} dangerouslySetInnerHTML={{__html:GI[n]||""}}/>;
}

// ── Clima: qué tan lejos está del óptimo ─────────────────────────────────────
// Dentro del rango = verde. Fuera pero cerca (dentro de la tolerancia) = naranja. Lejos = rojo.
const CLIM_TOL={temp:2,hum:6,vpd:0.2};
const climLevel=(v,r,tol)=>{
  if(v==null||v===""||isNaN(+v)||!r)return null;
  const x=+v;
  if(x>=r.min&&x<=r.max)return {k:"ok",off:0};
  const off=x<r.min?x-r.min:x-r.max;
  return {k:Math.abs(off)<=tol?"near":"far",off};
};
const levelColor=k=>k==="ok"?C.green:k==="near"?C.amber:k==="far"?C.red:C.textSoft;
const fmtNum=(x,d=1)=>{if(x==null||isNaN(+x))return "—";if(d>=2)return (+x).toFixed(d).replace(".",",");const p=Math.pow(10,d);return String(Math.round(+x*p)/p).replace(".",",");};

function Gauge({value,sMin,sMax,bMin,bMax,level}){
  const clamp=x=>Math.max(0,Math.min(100,x));
  const pos=v=>clamp((v-sMin)/(sMax-sMin)*100);
  const l=pos(bMin),r=pos(bMax);const col=levelColor(level);
  return <div style={{height:8,background:C.surfaceAlt,borderRadius:8,position:"relative",margin:"0 6px"}}>
    <div style={{position:"absolute",top:0,bottom:0,left:`${l}%`,width:`${Math.max(0,r-l)}%`,background:C.green,opacity:0.3,borderRadius:8}}/>
    <div style={{position:"absolute",top:"50%",left:`${pos(+value)}%`,width:15,height:15,borderRadius:"50%",transform:"translate(-50%,-50%)",background:col,border:`3px solid ${C.surface}`,boxShadow:`0 0 0 1px ${col}66`}}/>
  </div>;
}
function Metric({icon,label,val,unit,offUnit,r,tol,sMin,sMax,dec=1}){
  const lv=climLevel(val,r,tol);const col=levelColor(lv?.k);
  const txt=!lv?"":lv.k==="ok"?"En rango":`${fmtNum(Math.abs(lv.off),dec)}${offUnit} ${lv.off>0?"arriba":"abajo"}`;
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{color:C.textSoft}}><Icon n={icon} size={18}/></span>
      <span style={{fontSize:14,fontWeight:700,color:C.textMid,flex:1}}>{label}</span>
      <span style={{fontSize:18,fontWeight:800,color:col,fontVariantNumeric:"tabular-nums"}}>{fmtNum(val,dec)}{unit}</span>
    </div>
    <Gauge value={val} sMin={sMin} sMax={sMax} bMin={r.min} bMax={r.max} level={lv?.k}/>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,fontWeight:600}}>
      <span style={{color:C.textSoft}}>Óptimo {fmtNum(r.min,dec)} a {fmtNum(r.max,dec)}{unit}</span>
      <span style={{color:col,fontWeight:800}}>{txt}</span>
    </div>
  </div>;
}
function ClimateMetrics({climate,tR,hR,vR}){
  if(!climate||(climate.temperature==null&&climate.humidity==null))return <div style={{padding:"12px 2px 0",fontSize:13,color:C.textSoft}}>Sin lectura de sensor</div>;
  const t=climate.temperature,h=climate.humidity,v=climate.vpd;
  const vB={min:vR?.min??0.8,max:vR?.max??1.4};
  return <div style={{display:"flex",flexDirection:"column",gap:16,padding:"14px 2px 0"}}>
    {t!=null&&<Metric icon="thermo" label="Temperatura" val={t} unit="°C" offUnit="°" r={tR} tol={CLIM_TOL.temp} sMin={14} sMax={34}/>}
    {h!=null&&<Metric icon="drop" label="Humedad" val={h} unit="%" offUnit="%" r={hR} tol={CLIM_TOL.hum} sMin={20} sMax={100} dec={0}/>}
    {v!=null&&<Metric icon="leaf" label="VPD" val={v} unit=" kPa" offUnit=" kPa" r={vB} tol={CLIM_TOL.vpd} sMin={0} sMax={2.2} dec={2}/>}
  </div>;
}

// ── Menú (admin) ─────────────────────────────────────────────────────────────
const ADMIN_TABS=[{id:"dashboard",l:"Inicio",n:"home"},{id:"salas",l:"Salas",n:"salas"},{id:"vegetativo",l:"Vege",n:"vege"},{id:"tareas",l:"Tareas",n:"tareas"},{id:"__more__",l:"Más",n:"mas"}];
const adminTabOf=p=>p==="dashboard"?"dashboard":(p==="salas"||p.startsWith("sala_"))?"salas":(p==="vegetativo"||p.startsWith("veg_"))?"vegetativo":p==="tareas"?"tareas":"__more__";
const MAIN_PAGES=["dashboard","salas","vegetativo","tareas","__more__"];

function AdminNav({page,setPage,wide}){
  const cur=adminTabOf(page);
  const tab=(t,vertical)=>{const on=cur===t.id;
    return <button key={t.id} onClick={()=>setPage(t.id)} aria-label={t.l} aria-current={on?"page":undefined}
      style={{flex:vertical?"none":1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:vertical?"8px 0":"6px 0 4px",color:on?C.text:C.textSoft,fontSize:11.5,fontWeight:on?800:700,fontFamily:"inherit"}}>
      <span style={{width:54,height:32,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",background:on?C.greenLight:"transparent",color:on?C.green:C.textSoft,transition:"background .2s"}}><Icon n={t.n} size={22}/></span>
      {t.l}
    </button>;};
  if(wide)return <nav style={{width:96,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",alignItems:"stretch",gap:4,padding:"18px 6px"}}>
    <div style={{width:44,height:44,borderRadius:14,background:C.green,color:C.onAccent,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Icon n="vege" size={24}/></div>
    {ADMIN_TABS.map(t=>tab(t,true))}
  </nav>;
  return <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,maxWidth:480,margin:"0 auto",background:C.surface,borderTop:`1px solid ${C.border}`,boxShadow:"0 -6px 24px rgba(0,0,0,0.06)",display:"flex",padding:"4px 4px calc(6px + env(safe-area-inset-bottom))"}}>
    {ADMIN_TABS.map(t=>tab(t,false))}
  </nav>;
}

// Flecha "Volver" en todas las pantallas menos Inicio. Vuelve a la pantalla anterior;
// si se entró directo, va a la sección que corresponde.
function AdminTopBar({page,onBack}){
  if(page==="dashboard")return null;
  const fallback=page.startsWith("veg_")?"vegetativo":(MAIN_PAGES.includes(page)||page.startsWith("sala_"))?"dashboard":"__more__";
  return <header style={{position:"sticky",top:0,zIndex:80,background:C.bg,display:"flex",alignItems:"center",height:50,padding:"0 8px"}}>
    <button onClick={()=>onBack(fallback)} style={{display:"flex",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",color:C.green,fontWeight:800,fontSize:15,padding:"8px 10px 8px 4px",fontFamily:"inherit"}}>
      <Icon n="back" size={22}/>Volver
    </button>
  </header>;
}

// ── Salas: S1 y S2 en una sola pestaña ──────────────────────────────────────
function SalasTab({roomId,rooms,setPage,user,genetics,roomConfig,targets,onTargetsChanged}){
  let rid=roomId;
  if(!rid||!rooms.includes(rid)){try{const s=localStorage.getItem("gm_sala");rid=rooms.includes(s)?s:rooms[0];}catch{rid=rooms[0];}}
  useEffect(()=>{try{localStorage.setItem("gm_sala",rid);}catch{}},[rid]);
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div role="tablist" style={{display:"flex",background:C.surfaceAlt,borderRadius:16,padding:4,border:`1px solid ${C.border}`,marginTop:8}}>
      {rooms.map(r=>{const on=r===rid;const name=getRC(roomConfig,r)?.display_name||r;
        return <button key={r} role="tab" aria-selected={on} onClick={()=>setPage(`sala_${r}`)} style={{flex:1,padding:"11px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:800,fontFamily:"inherit",background:on?C.surface:"transparent",color:on?C.text:C.textSoft,boxShadow:on?C.shadow:"none"}}>{name}</button>;})}
    </div>
    <SalaPage key={rid} roomId={rid} setPage={setPage} user={user} genetics={genetics} rc={getRC(roomConfig,rid)} targets={targets} onTargetsChanged={onTargetsChanged}/>
  </div>;
}

// ── Más: carpetas ────────────────────────────────────────────────────────────
function MorePageAdmin({user,setPage,textScale,setTextScale,theme,setTheme,onLogout}){
  const groups=[
    {t:"Cultivo",c:C.green,items:[["geneticas","dna","Genéticas","Colores, días de flora y notas"],["fenos","flask","Fenos","Búsquedas, cata y ranking"],["plagas","bug","Plagas","Registro de intervenciones"],["guia","book","Guía","Protocolos del cultivo"]]},
    {t:"Registro",c:C.blue,items:[["bitacora","notebook","Bitácora","Notas del día"],["calendario","calendar","Agenda","Calendario de tareas y ciclos"],["historial","history","Historial","Ciclos cerrados y cosechas"],["estadisticas","chart","Estadísticas","Rendimiento y clima"]]},
    {t:"Club",c:C.amber,items:[["bot","chat","Asistente","Consultas de cultivo","Sin conexión"]]},
  ];
  const gTitle=t=><div style={{fontSize:14,fontWeight:800,color:C.textSoft,margin:"22px 4px 8px"}}>{t}</div>;
  const iconBox=(n,c)=><span style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:c,background:`${c}1F`}}><Icon n={n} size={20}/></span>;
  const seg=(opts,cur,set)=><div style={{display:"flex",background:C.surfaceAlt,borderRadius:99,padding:3,border:`1px solid ${C.border}`,width:"100%",marginTop:10}}>
    {opts.map(([v,l])=>{const on=cur===v;return <button key={l} onClick={()=>set(v)} style={{flex:1,padding:"9px 6px",borderRadius:99,border:"none",cursor:"pointer",fontSize:13.5,fontWeight:800,fontFamily:"inherit",background:on?C.surface:"transparent",color:on?C.text:C.textSoft,boxShadow:on?C.shadow:"none"}}>{l}</button>;})}
  </div>;
  const row=(id,n,l,d,c,badge,i)=><button key={id} onClick={()=>setPage(id)} style={{display:"flex",alignItems:"center",gap:13,padding:"12px 14px",minHeight:60,width:"100%",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit",color:C.text}}>
    {iconBox(n,c)}
    <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:15.5,fontWeight:700}}>{l}</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>{d}</span></span>
    {badge&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.redLight,color:C.red}}>{badge}</span>}
    <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
  </button>;
  return <div style={{paddingBottom:24}}>
    <div style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:H,letterSpacing:"-0.02em",padding:"10px 2px 14px"}}>Más</div>
    <Card style={{display:"flex",alignItems:"center",gap:14,padding:14}}>
      <span style={{width:52,height:52,borderRadius:"50%",background:C.green,color:C.onAccent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:20}}>{user.initial||user.name?.[0]}</span>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontWeight:800,color:C.text}}>{user.name}</div><div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Administrador</div></div>
      <button onClick={onLogout} style={{fontSize:13.5,fontWeight:800,color:C.green,background:C.greenLight,border:"none",borderRadius:12,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit"}}>Cambiar</button>
    </Card>
    {groups.map(g=><div key={g.t}>{gTitle(g.t)}<Card style={{padding:0,overflow:"hidden"}}>{g.items.map(([id,n,l,d,badge],i)=>row(id,n,l,d,g.c,badge,i))}</Card></div>)}
    {gTitle("Ajustes")}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"12px 14px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>{iconBox("sun",C.textMid)}<span><span style={{display:"block",fontSize:15.5,fontWeight:700,color:C.text}}>Tema</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>Claro para sala con luces prendidas</span></span></div>
        {seg([["light","Claro"],["dark","Oscuro"]],theme,setTheme)}
      </div>
      <div style={{padding:"12px 14px 14px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>{iconBox("text",C.textMid)}<span><span style={{display:"block",fontSize:15.5,fontWeight:700,color:C.text}}>Tamaño de letra</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>Se guarda en este dispositivo</span></span></div>
        {seg([[1,"Normal"],[1.1,"Grande"],[1.2,"Más grande"]],textScale,setTextScale)}
      </div>
      {row("configuracion","sliders","Configuración","Salas, esquejeras y usuarios",C.textMid,null,1)}
    </Card>
  </div>;
}

// ── Tarea rápida: se escribe o se dicta como hablás, sin bot ─────────────────
// Entiende sala, persona, día, tipo y urgencia. Lo que no entiende queda como título.
const foldTxt=s=>String(s||"").toLowerCase().replace(/[áàä]/g,"a").replace(/[éèë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u").replace(/ñ/g,"n");
const QT_TYPES=[{k:"riego",l:"Riego",re:/\b(regar|riego|regado)\b/},{k:"nutricion",l:"Nutrición",re:/\b(nutri\w*|abon\w*|fertiliz\w*|te de compost|act|top ?dress\w*)\b/},{k:"fumigacion",l:"Fumigación",re:/\b(fumig\w*|plagas?|trips|aranuela|oidio|neem|foliar)\b/},{k:"poda",l:"Poda",re:/\b(pod\w*|defoli\w*|lollipop\w*)\b/},{k:"limpieza",l:"Limpieza",re:/\b(limpi\w*|lavar|barrer)\b/},{k:"revision",l:"Revisión",re:/\b(revis\w*|control\w*|cheque\w*)\b/},{k:"cosecha",l:"Cosecha",re:/\b(cosech\w*)\b/}];
const QT_WD={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
function parseQuickTask(text,people,rooms,me){
  const f=foldTxt(text);const cut=[];const out={};
  const take=re=>{const m=f.match(re);if(m){cut.push([m.index,m.index+m[0].length]);return m;}return null;};
  for(const r of rooms){const n=String(r).replace(/\D/g,"");if(n&&take(new RegExp(`\\b(en (la )?)?(sala ?${n}|s ?${n})\\b`))){out.room_id=r;break;}}
  if(!out.room_id&&take(/\b(en (el )?)?(vege|vegetativo|vg)\b/))out.room_id="Vegetativo";
  if(!out.room_id&&/\b(madres?|esquejeras?|esquejes?)\b/.test(f))out.room_id="Vegetativo";
  const ppl=[...people].sort((a,b)=>b.length-a.length);
  for(const p of ppl){if(take(new RegExp(`\\b(para |a )?${foldTxt(p)}\\b`))){out.assignee=p;break;}}
  if(!out.assignee&&take(/\bpara mi\b/))out.assignee=me;
  if(take(/\b(urgente|importante|ya mismo|prioridad alta)\b/))out.priority="alta";
  let m;
  if(take(/\b(todos los dias|cada dia|diari[oa])\b/))out.recurrent_days=1;
  else if((m=take(/\bcada (\d{1,2}) dias\b/)))out.recurrent_days=+m[1];
  else if(take(/\b(semanal|cada semana|todas las semanas)\b/))out.recurrent_days=7;
  if(take(/\bpasado manana\b/))out.due_date=addDays(todayISO,2);
  else if(take(/\bhoy\b/))out.due_date=todayISO;
  else if(take(/\bmanana\b/))out.due_date=addDays(todayISO,1);
  else if((m=take(/\ben (\d{1,2}) dias?\b/)))out.due_date=addDays(todayISO,+m[1]);
  else if((m=take(/\b(el |este |proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/))){const dow=new Date(todayISO+"T12:00:00").getDay();let d=QT_WD[m[2]]-dow;if(d<=0)d+=7;out.due_date=addDays(todayISO,d);}
  else if((m=take(/\b(\d{1,2})[/-](\d{1,2})\b/))){const y=todayISO.slice(0,4);out.due_date=`${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;}
  for(const t of QT_TYPES){if(t.re.test(f)){out.type=t.k;break;}}
  const chars=String(text).split("");cut.forEach(([a,b])=>{for(let i=a;i<b;i++)chars[i]=" ";});
  const FILL=/^(para|a|en|el|la|los|las|de|del|y|que)$/i;
  const w=chars.join("").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  while(w.length&&FILL.test(w[w.length-1]))w.pop();
  while(w.length&&FILL.test(w[0]))w.shift();
  const title=w.join(" ");
  out.title=title?title[0].toUpperCase()+title.slice(1):(out.type?QT_TYPES.find(x=>x.k===out.type).l:"");
  return out;
}
function QuickTaskSheet({user,rooms,onClose,onCreated,task}){
  const [people,setPeople]=useState([user.name]);
  const [text,setText]=useState("");
  const [manual,setManual]=useState(()=>task?{title:task.title||"",room_id:task.room_id||"General",assignee:task.assignee||user.name,due_date:task.due_date||todayISO,priority:task.priority||"normal",type:task.type||null,recurrent_days:task.recurrent?(task.recurrent_days||null):null}:{});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  useEffect(()=>{db.get("users").then(us=>{const n=us.map(u=>u.name).filter(Boolean);if(n.length)setPeople(n);}).catch(()=>{});},[]);
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=prev;};},[]);
  const auto=text.trim()?parseQuickTask(text,people,rooms,user.name):{};
  const defs={assignee:user.name,due_date:todayISO,priority:"normal",room_id:"General",type:null,title:"",recurrent_days:null};
  const val=k=>manual[k]!==undefined?manual[k]:(auto[k]!==undefined?auto[k]:defs[k]);
  const set=(k,v)=>setManual(p=>({...p,[k]:v}));
  const understood=k=>auto[k]!==undefined&&manual[k]===undefined;
  const roomOpts=[...rooms.map(r=>({k:r,l:r})),{k:"Vegetativo",l:"Vege"},{k:"General",l:"General"}];
  const chip=(on)=>({padding:"9px 13px",minHeight:42,borderRadius:12,fontSize:14,fontWeight:700,fontFamily:"inherit",cursor:"pointer",border:"none",background:on?C.green:C.surfaceAlt,color:on?C.onAccent:C.textMid,boxShadow:on?"none":`inset 0 0 0 1px ${C.border}`});
  const label=(t,k)=><div style={{fontSize:13,fontWeight:800,color:C.textMid,display:"flex",alignItems:"center",gap:6,marginBottom:6}}>{t}{k&&understood(k)&&<span style={{fontSize:11,fontWeight:800,color:C.green,background:C.greenLight,padding:"1px 8px",borderRadius:99}}>entendido</span>}</div>;
  const crear=async()=>{
    const title=String(val("title")||"").trim();if(!title)return;
    setSaving(true);setErr(null);
    try{
      const room=val("room_id");
      const rd=val("recurrent_days");
      const payload={title,room_id:room,rooms:room,type:val("type")||"revision",assignee:val("assignee"),due_date:val("due_date")||todayISO,priority:val("priority"),recurrent:!!rd,recurrent_days:rd||null};
      if(task){
        await db.update("tasks",task.id,payload);
        await logA(user.name,`Editó tarea: ${title}`,"task");
        onCreated&&onCreated({...task,...payload});
      }else{
        const ins=await db.insert("tasks",{...payload,status:"pendiente",created_by:user.name});
        await logA(user.name,`Creó tarea: ${title} (${room})`,"task");
        onCreated&&onCreated(ins?.[0]||payload);
      }
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const due=val("due_date");
  return <div onClick={e=>{if(e.target===e.currentTarget&&!saving)onClose();}} style={{position:"fixed",inset:0,zIndex:250,background:"rgba(10,18,14,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div role="dialog" aria-modal="true" aria-label="Nueva tarea" style={{background:C.surface,width:"100%",maxWidth:560,borderRadius:"26px 26px 0 0",padding:"10px 18px calc(18px + env(safe-area-inset-bottom))",maxHeight:"92vh",overflowY:"auto"}}>
      <div style={{width:40,height:5,borderRadius:99,background:C.borderStrong,margin:"0 auto 12px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div><div style={{fontSize:21,fontWeight:800,color:C.text}}>{task?"Editar tarea":"Nueva tarea"}</div>
          {!task&&<div style={{fontSize:13,color:C.textSoft,marginTop:3,lineHeight:1.45}}>Escribila o dictala como la dirías. Por ejemplo: “poda S1 mañana para Alex” o “riego S2 cada 2 días”.</div>}</div>
        <button onClick={onClose} aria-label="Cerrar" style={{background:"transparent",border:"none",cursor:"pointer",color:C.textSoft,padding:6}}><Icon n="x" size={22}/></button>
      </div>
      {!task&&<textarea value={text} onChange={e=>{setText(e.target.value);setManual(p=>{const {title,...r}=p;return r;});}} placeholder="¿Qué hay que hacer?" rows={2}
        style={{width:"100%",marginTop:14,minHeight:78,resize:"none",border:"none",borderRadius:16,background:C.surfaceAlt,boxShadow:`inset 0 0 0 1.5px ${C.borderStrong}`,padding:"14px 16px",fontSize:17,fontWeight:600,lineHeight:1.4,color:C.text,fontFamily:"inherit",outline:"none"}}/>}
      <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:14}}>
        <div>{label("Qué","title")}<input value={val("title")} onChange={e=>set("title",e.target.value)} placeholder="Título de la tarea"
          style={{width:"100%",border:"none",borderRadius:12,background:C.surfaceAlt,boxShadow:`inset 0 0 0 1px ${C.border}`,padding:"11px 13px",fontSize:15.5,fontWeight:700,color:C.text,fontFamily:"inherit",outline:"none"}}/></div>
        <div>{label("Dónde","room_id")}<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{roomOpts.map(o=><button key={o.k} onClick={()=>set("room_id",o.k)} style={chip(val("room_id")===o.k)}>{o.l}</button>)}</div></div>
        <div>{label("Cuándo","due_date")}<div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
          {[[todayISO,"Hoy"],[addDays(todayISO,1),"Mañana"],[addDays(todayISO,2),"Pasado"]].map(([v,l])=><button key={l} onClick={()=>set("due_date",v)} style={chip(due===v)}>{l}</button>)}
          <input type="date" value={due} onChange={e=>e.target.value&&set("due_date",e.target.value)} aria-label="Elegir fecha" style={{border:"none",borderRadius:12,background:C.surfaceAlt,boxShadow:`inset 0 0 0 1px ${C.border}`,padding:"9px 10px",fontSize:14,fontWeight:700,color:C.text,fontFamily:"inherit",minHeight:42}}/>
        </div></div>
        <div>{label("Para","assignee")}<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{people.map(p=><button key={p} onClick={()=>set("assignee",p)} style={chip(val("assignee")===p)}>{p}</button>)}</div></div>
        <div>{label("Tipo","type")}<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{QT_TYPES.map(t=><button key={t.k} onClick={()=>{set("type",t.k);if(!val("title"))set("title",t.l);}} style={chip(val("type")===t.k)}>{t.l}</button>)}</div></div>
        <div>{label("Prioridad","priority")}<div style={{display:"flex",gap:7}}>{[["normal","Normal"],["alta","Alta"]].map(([k,l])=><button key={k} onClick={()=>set("priority",k)} style={chip(val("priority")===k)}>{l}</button>)}</div></div>
        <div>{label("Repetir","recurrent_days")}<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{[[null,"No"],[1,"Cada día"],[2,"Cada 2 días"],[3,"Cada 3 días"],[7,"Semanal"]].map(([k,l])=><button key={l} onClick={()=>set("recurrent_days",k)} style={chip((val("recurrent_days")||null)===k)}>{l}</button>)}
          {val("recurrent_days")&&![1,2,3,7].includes(val("recurrent_days"))&&<button style={chip(true)}>Cada {val("recurrent_days")} días</button>}</div></div>
      </div>
      {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:13,marginTop:12}}>{err}</div>}
      <button onClick={crear} disabled={saving||!String(val("title")||"").trim()} style={{width:"100%",minHeight:54,borderRadius:16,border:"none",background:C.green,color:C.onAccent,fontWeight:800,fontSize:16.5,fontFamily:"inherit",marginTop:18,cursor:"pointer",opacity:saving||!String(val("title")||"").trim()?0.45:1}}>{saving?"Guardando...":task?"Guardar cambios":"Crear tarea"}</button>
    </div>
  </div>;
}

// ── INICIO (admin) ───────────────────────────────────────────────────────────
function Dashboard({setPage,user,roomConfig,rooms,wide,targets}){
  const [cycles,setCycles]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [overdue,setOverdue]=useState([]);
  const [vegStock,setVegStock]=useState([]);
  const [climate,setClimate]=useState([]);
  const [cloners,setCloners]=useState([]);
  const [clSlots,setClSlots]=useState([]);
  const [drying,setDrying]=useState([]);   // ciclos cosechados que esperan el peso del secado
  const [vgTandas,setVgTandas]=useState([]);   // tandas abiertas de VG: fecha y plantas vivas
  const [vgErr,setVgErr]=useState(false);
  const [loading,setLoading]=useState(true);
  const [who,setWho]=useState("mias");
  const [railIdx,setRailIdx]=useState(0);
  const [showQuick,setShowQuick]=useState(false);
  const [toast,setToast]=useState(null);
  const railRef=useRef(null);

  const loadTasks=useCallback(()=>Promise.all([
    db.query("tasks",`due_date=eq.${todayISO}&order=priority.desc,created_at.asc`),
    db.query("tasks",`status=eq.pendiente&due_date=lt.${todayISO}&order=due_date.desc&limit=30`).catch(()=>[]),
  ]).then(([t,o])=>{setTasks(t);setOverdue(o);}).catch(()=>{}),[]);
  useEffect(()=>{
    Promise.all([
      loadTasks(),
      db.query("cycles","active=eq.true").catch(()=>[]),
      db.get("veg_stock").catch(()=>[]),
      db.query("climate_logs",`recorded_at=gte.${addDays(todayISO,-1)}&order=recorded_at.desc`).catch(()=>[]),
      db.get("cloners").catch(()=>[]),
      db.get("cloner_slots").catch(()=>[]),
      db.query("cycles","active=eq.false&harvest_status=eq.secando&order=closed_at.desc").catch(()=>[]),
      Promise.all([
        db.query("vg_batches","status=eq.vg&select=id,start_date&order=start_date.asc"),
        db.query("vg_lines","select=batch_id,current_count"),
      ]).catch(()=>null),
    ]).then(([,c,v,cl,co,cs,dry,vg])=>{
      setCycles(c);setVegStock(v);setClimate(cl);setCloners(co);setClSlots(cs);setDrying(dry||[]);
      if(!vg){setVgErr(true);return;}
      const [vb,vl]=vg;
      setVgTandas(vb.map(b=>({id:sid(b.id),start_date:b.start_date,plantas:vl.filter(l=>sid(l.batch_id)===sid(b.id)).reduce((a,l)=>a+(l.current_count||0),0)})));
    }).finally(()=>setLoading(false));
  },[loadTasks]);
  useEffect(()=>{
    const id=setInterval(()=>{
      db.query("climate_logs",`recorded_at=gte.${addDays(todayISO,-1)}&order=recorded_at.desc`).then(setClimate).catch(()=>{});
    },120000); // refresca el clima solo cada 2 min
    return ()=>clearInterval(id);
  },[]);
  if(loading)return <Spin/>;

  const lastClimate=rid=>climate.find(c=>c.room_id===rid)||null;
  const renewM=vegStock.filter(v=>v.type==="madre"&&v.status==="renovar").length;
  const madres=vegStock.filter(v=>v.type==="madre"&&v.status==="activa").reduce((a,v)=>a+(v.count||0),0);

  const toggleTask=async t=>{
    const ns=t.status==="completada"?"pendiente":"completada";
    const upd=list=>list.map(x=>x.id===t.id?{...x,status:ns}:x);
    setTasks(upd);setOverdue(upd);
    try{
      await db.update("tasks",t.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
      if(ns==="completada")await pestTaskDone(t,user.name);
      if(ns==="completada"&&t.recurrent&&t.recurrent_days){
        await db.insert("tasks",{title:t.title,room_id:t.room_id,type:t.type,assignee:t.assignee,due_date:addDays(t.due_date,t.recurrent_days),status:"pendiente",priority:t.priority,recurrent:true,recurrent_days:t.recurrent_days,created_by:"sistema"});
      }
      await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${t.title}`,"task");
      setToast({msg:ns==="completada"?`${t.title}: hecha`:`${t.title}: reabierta`,type:"success",undo:async()=>{
        const back=list=>list.map(x=>x.id===t.id?{...x,status:t.status}:x);setTasks(back);setOverdue(back);
        try{await db.update("tasks",t.id,{status:t.status,completed_at:t.status==="completada"?t.completed_at:null});}catch{}
      }});
    }catch(e){setToast({msg:errMsg(e),type:"error"});loadTasks();}
  };

  // ── Alertas (lo más urgente primero) ──
  const alerts=[];
  const climAlert=(label,cl,tg,go)=>{
    if(!cl)return;
    const lt=climLevel(cl.temperature,tg.temp,CLIM_TOL.temp);
    const lh=climLevel(cl.humidity,tg.hum,CLIM_TOL.hum);
    if(lt&&lt.k!=="ok")alerts.push({k:lt.k==="far"?"red":"amber",ic:"thermo",go,t:`${label}: temperatura ${fmtNum(cl.temperature)}°C`,s:`${fmtNum(Math.abs(lt.off))}° ${lt.off>0?"arriba":"abajo"} del óptimo (${fmtNum(tg.temp.min)} a ${fmtNum(tg.temp.max)}°C)`});
    if(lh&&lh.k!=="ok")alerts.push({k:lh.k==="far"?"red":"amber",ic:"drop",go,t:`${label}: humedad ${fmtNum(cl.humidity,0)}%`,s:`${fmtNum(Math.abs(lh.off),0)}% ${lh.off>0?"arriba":"abajo"} del óptimo (${fmtNum(tg.hum.min,0)} a ${fmtNum(tg.hum.max,0)}%)`});
  };
  rooms.forEach(rid=>{const rc=getRC(roomConfig,rid);const cyc=cycles.find(c=>c.room_id===rid);climAlert(rc.display_name,lastClimate(rid),getTargets(targets,rid,cyc,rc),`sala_${rid}`);});
  climAlert("Vege",lastClimate("Vegetativo"),getTargets(targets,"Vegetativo",null,null),"vegetativo");
  cycles.forEach(c=>{const dL=daysTo(c.estimated_harvest);if(c.phase==="floración"&&dL>=0&&dL<=7)alerts.push({k:"amber",ic:"harvest",go:`sala_${c.room_id}`,t:`Cosecha próxima en ${getRC(roomConfig,c.room_id).display_name}`,s:`Estimada en ${dL} día${dL===1?"":"s"}`});});
  if(renewM>0)alerts.push({k:"amber",ic:"tree",go:"veg_madres",t:`${renewM} madre${renewM>1?"s":""} para renovar`,s:"Revisalas en Madres"});
  drying.forEach(c=>{const d=-daysTo(c.real_harvest||c.closed_at);alerts.push({k:"amber",ic:"harvest",go:"historial",t:`${getRC(roomConfig,c.room_id).display_name}: falta cargar la cosecha`,s:`Cortado hace ${d} día${d===1?"":"s"}. Cargalo en Historial.`});});
  cloners.forEach(cl=>{
    const slots=clSlots.filter(s=>sid(s.cloner_id)===sid(cl.id)&&s.genetic_name);
    if(slots.length===0)return;
    const prog=batchProgress(cl,slots);if(!prog)return;
    const d=prog.day;
    if(d===1)alerts.push({k:"amber",ic:"scissors",go:"veg_esquejeras",t:`${cl.label}: prender timer`,s:`Día 1 desde el corte (${slots.length} esquejes)`});
    else if(d===2)alerts.push({k:"amber",ic:"scissors",go:"veg_esquejeras",t:`${cl.label}: dejar semi tapadas`,s:"Día 2 desde el corte"});
    else if(prog.left===1)alerts.push({k:"amber",ic:"scissors",go:"veg_esquejeras",t:`${cl.label}: falta 1 día`,s:`${prog.label}. Preparate para cosechar.`});
    else if(prog.ready)alerts.push({k:prog.left<-2?"red":"amber",ic:"scissors",go:"veg_esquejeras",t:`${cl.label}: lista para cosechar`,s:`${prog.label}. Lo que prendió pasa a VG.`});
  });
  alerts.sort((a,b)=>(a.k==="red"?0:1)-(b.k==="red"?0:1));

  // ── Tareas de hoy ──
  const mine=t=>who==="mias"?t.assignee===user.name:true;
  const pendHoy=[...overdue.filter(t=>mine(t)&&t.status==="pendiente"),...tasks.filter(t=>mine(t)&&t.status==="pendiente"&&t.priority==="alta"),...tasks.filter(t=>mine(t)&&t.status==="pendiente"&&t.priority!=="alta")];
  const hechasHoy=tasks.filter(t=>mine(t)&&t.status==="completada").length;
  const hoy=pendHoy.slice(0,3);
  const myPending=[...overdue,...tasks].filter(t=>t.assignee===user.name&&t.status==="pendiente").length;
  const resumen=`${myPending>0?`Tenés ${myPending} tarea${myPending===1?"":"s"} para hoy`:"Tus tareas de hoy están hechas"}, ${alerts.length>0?`${alerts.length} alerta${alerts.length===1?"":"s"} para revisar`:"todo en rango"}`;
  const fecha=(()=>{const s=fmtFull(TODAY);return s.charAt(0).toUpperCase()+s.slice(1);})();

  const roomTone=r=>r==="S1"?C.amber:r==="S2"?C.blue:r==="Vegetativo"?C.green:C.textSoft;
  const roomShort=r=>r==="Vegetativo"?"Vege":(r||"General");
  const taskRow=(t,i)=>{
    const done=t.status==="completada";const late=!done&&t.due_date<todayISO;const tone=roomTone(t.room_id);
    const meta=[late&&<span key="l" style={{color:C.red}}>Vencida {fmtDM(t.due_date)}</span>,who==="equipo"&&t.assignee&&<span key="a">{t.assignee}</span>,t.priority==="alta"&&!done&&!late&&<span key="p" style={{color:C.amber}}>Prioridad alta</span>].filter(Boolean);
    return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",minHeight:62,borderTop:i?`1px solid ${C.border}`:"none"}}>
      <button onClick={()=>toggleTask(t)} aria-label={done?"Marcar pendiente":"Marcar hecha"} style={{width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:done?C.green:"transparent",boxShadow:done?"none":`inset 0 0 0 2px ${C.borderStrong}`,color:done?C.onAccent:"transparent",transition:"background .15s"}}><Icon n="check" size={18} sw={2.4}/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:700,color:done?C.textSoft:C.text,textDecoration:done?"line-through":"none"}}>{t.title}</div>
        {meta.length>0&&<div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:1,display:"flex",gap:8,flexWrap:"wrap"}}>{meta}</div>}
      </div>
      <span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,color:tone,background:`${tone}1F`,flexShrink:0}}>{roomShort(t.room_id)}</span>
    </div>;
  };

  // ── Espacios ──
  const climMini=(cl,tg)=>{
    if(!cl)return <span style={{fontSize:12,color:C.textSoft,fontWeight:600}}>Sin sensor</span>;
    const vR={min:tg.vpd?.min??0.8,max:tg.vpd?.max??1.4};
    return <span style={{display:"flex",flexDirection:"column",gap:3}}>
      {[["thermo",cl.temperature,tg.temp,CLIM_TOL.temp,"°",1],["drop",cl.humidity,tg.hum,CLIM_TOL.hum,"%",0],["leaf",cl.vpd,vR,CLIM_TOL.vpd,"",2]].filter(x=>x[1]!=null).map(([n,v,r,tol,u,d])=>{
        const lv=climLevel(v,r,tol);return <span key={n} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:800,color:levelColor(lv?.k),fontVariantNumeric:"tabular-nums"}}><Icon n={n} size={14} sw={2}/>{fmtNum(v,d)}{u}</span>;})}
    </span>;
  };
  const track=(pct,marks,tone)=><span style={{position:"relative",display:"block",height:14,margin:"8px 0 2px"}}>
    <span style={{position:"absolute",left:0,right:0,top:6,height:2,borderRadius:2,background:C.borderStrong}}/>
    <span style={{position:"absolute",left:0,top:6,height:2,borderRadius:2,width:`${pct}%`,background:tone}}/>
    {marks.map(m=><span key={m} style={{position:"absolute",top:4,left:`${m}%`,width:2,height:6,borderRadius:1,background:C.textSoft,opacity:0.6}}/>)}
    <span style={{position:"absolute",top:2,left:`${pct}%`,width:10,height:10,marginLeft:-5,borderRadius:"50%",background:tone,boxShadow:`0 0 0 3px ${C.surface}`}}/>
  </span>;
  const spaceCol=(key,{name,tone,big,sub,trackEl,cl,tg,go},i)=><button key={key} onClick={()=>setPage(go)}
    style={{display:"flex",flexDirection:"column",alignItems:"stretch",textAlign:"left",gap:2,padding:"14px 12px 13px",minWidth:0,background:"transparent",border:"none",borderLeft:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",color:C.text}}>
    <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:800,color:C.textMid}}><span style={{width:8,height:8,borderRadius:"50%",background:tone}}/>{name}</span>
    <span style={{fontSize:25,fontWeight:800,letterSpacing:"-0.02em",lineHeight:1.05,marginTop:6,fontVariantNumeric:"tabular-nums"}}>{big}</span>
    <span style={{fontSize:12.5,color:C.textSoft,fontWeight:600,lineHeight:1.3,minHeight:33}}>{sub}</span>
    {trackEl||<span style={{display:"block",height:14,margin:"8px 0 2px"}}/>}
    <span style={{marginTop:6}}>{climMini(cl,tg)}</span>
  </button>;
  const cols=rooms.map(rid=>{
    const rc=getRC(roomConfig,rid);const cyc=cycles.find(c=>c.room_id===rid);const tg=getTargets(targets,rid,cyc,rc);
    const tone=roomTone(rid);const base={name:rc.display_name||rid,tone,cl:lastClimate(rid),tg,go:`sala_${rid}`};
    if(!cyc)return {...base,big:"—",sub:"Sin ciclo activo"};
    if(cyc.phase==="vegetativo"&&cyc.veg_start){
      const day=Math.max(0,daysFrom(cyc.veg_start));const tot=cyc.veg_end?Math.max(1,Math.round((new Date(cyc.veg_end)-new Date(cyc.veg_start))/86400000)):null;
      const left=tot!=null?tot-day:null;
      return {...base,big:`Día ${day}`,sub:left==null?"Vege":left>0?`Vege, a flora en ${left} día${left===1?"":"s"}`:"Vege, toca pasar a flora",trackEl:tot?track(Math.min(100,day/tot*100),[],tone):null};
    }
    const fdays=rc?.flower_days||65;const day=Math.max(0,daysFrom(cyc.flower_start));const left=daysTo(cyc.estimated_harvest);
    return {...base,big:`Día ${day}`,sub:left>0?`Flora, faltan ${left} días`:left===0?"Flora, cosecha hoy":"Flora, cosecha pasada",trackEl:track(Math.min(100,day/fdays*100),[15,21].filter(m=>m<fdays).map(m=>m/fdays*100),tone)};
  });
  const vgPlantas=vgTandas.reduce((a,t)=>a+t.plantas,0);
  const tandasEl=vgTandas.length>0&&<span style={{display:"flex",flexDirection:"column",gap:2,margin:"6px 0 2px"}}>
    {vgTandas.slice(0,3).map(t=>{const d=daysSince(t.start_date);return <span key={t.id} style={{fontSize:12,fontWeight:700,color:C.textMid,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
      <span style={{color:C.green}}>{d<=0?"Entró hoy":`Día ${d}`}</span> · {t.plantas} pl</span>;})}
    {vgTandas.length>3&&<span style={{fontSize:11.5,color:C.textSoft,fontWeight:600}}>y {vgTandas.length-3} más</span>}
  </span>;
  cols.push({name:"Vege",tone:C.green,big:vgErr?"—":vgPlantas,sub:vgErr?"No pude leer VG":`en VG y ${madres} madre${madres===1?"":"s"}`,trackEl:tandasEl,cl:lastClimate("Vegetativo"),tg:getTargets(targets,"Vegetativo",null,null),go:"vegetativo"});

  const onRail=e=>{const el=e.currentTarget;const first=el.firstElementChild;if(!first)return;const w=first.offsetWidth+10;setRailIdx(Math.min(alerts.length-1,Math.max(0,Math.round(el.scrollLeft/w))));};
  const alertTone=k=>k==="red"?{c:C.red,bg:C.redLight}:{c:C.amber,bg:C.amberLight};

  const secHead=(t,right)=><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"24px 2px 10px"}}><div style={{fontSize:18,fontWeight:800,color:C.text,letterSpacing:"-0.01em"}}>{t}</div>{right}</div>;
  const whoSeg=<div style={{display:"inline-flex",background:C.surfaceAlt,borderRadius:99,padding:3,border:`1px solid ${C.border}`}}>
    {[["mias","Mías"],["equipo","Equipo"]].map(([k,l])=>{const on=who===k;return <button key={k} onClick={()=>setWho(k)} style={{padding:"6px 13px",borderRadius:99,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",background:on?C.surface:"transparent",color:on?C.text:C.textSoft,boxShadow:on?C.shadow:"none"}}>{l}</button>;})}
  </div>;

  const alertsBlock=<div>
    {alerts.length===0
      ?<div style={{display:"flex",alignItems:"center",gap:12,padding:"15px 16px",borderRadius:20,background:C.greenLight,color:C.green}}>
        <span style={{width:36,height:36,borderRadius:12,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="ok" size={20}/></span>
        <span><span style={{display:"block",fontWeight:800,fontSize:15.5}}>Todo en orden</span><span style={{display:"block",fontSize:13.5,color:C.textMid}}>Clima en rango y nada vencido en vege.</span></span>
      </div>
      :<>
        <div ref={railRef} className="gm-rail" onScroll={onRail} style={{display:"flex",gap:10,overflowX:"auto",scrollSnapType:"x mandatory",margin:wide?0:"0 -16px",padding:wide?"2px 0 4px":"2px 16px 4px",scrollbarWidth:"none"}}>
          {alerts.map((a,i)=>{const tn=alertTone(a.k);return <button key={i} onClick={()=>setPage(a.go)} style={{scrollSnapAlign:"start",flex:`0 0 ${alerts.length===1?"100%":"86%"}`,borderRadius:20,padding:"15px 16px",display:"flex",gap:12,alignItems:"flex-start",minHeight:92,background:tn.bg,color:tn.c,border:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
            <span style={{width:36,height:36,borderRadius:12,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n={a.ic} size={20}/></span>
            <span style={{minWidth:0}}><span style={{display:"block",fontWeight:800,fontSize:15.5,lineHeight:1.25}}>{a.t}</span><span style={{display:"block",fontSize:13.5,marginTop:3,color:C.textMid}}>{a.s}</span></span>
          </button>;})}
        </div>
        {alerts.length>1&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:10}}>{alerts.map((_,i)=><span key={i} style={{width:i===railIdx?18:6,height:6,borderRadius:99,background:i===railIdx?C.textMid:C.borderStrong,transition:"width .2s"}}/>)}</div>}
      </>}
  </div>;

  const spacesBlock=<div>
    {secHead("Espacios")}
    <Card style={{padding:0,overflow:"hidden",display:"grid",gridTemplateColumns:`repeat(${cols.length},1fr)`}}>{cols.map((c,i)=>spaceCol(c.name+i,c,i))}</Card>
  </div>;

  const tasksBlock=<div>
    {secHead("Hoy",whoSeg)}
    <Card style={{padding:0,overflow:"hidden"}}>
      {hoy.length===0&&<div style={{padding:"20px 16px",textAlign:"center",color:C.textSoft,fontSize:14}}>{hechasHoy>0?"Todo hecho por hoy.":who==="mias"?"No tenés tareas para hoy.":"No hay tareas para hoy."}</div>}
      {hoy.map((t,i)=>taskRow(t,i))}
      <button onClick={()=>setPage("tareas")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"13px 14px",width:"100%",background:"transparent",border:"none",borderTop:`1px solid ${C.border}`,cursor:"pointer",color:C.textMid,fontWeight:800,fontSize:14.5,fontFamily:"inherit"}}>
        <span>Ver todas{pendHoy.length>3?` (${pendHoy.length})`:""}</span><span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
      </button>
      <button onClick={()=>setShowQuick(true)} style={{display:"flex",alignItems:"center",gap:12,padding:14,width:"100%",background:"transparent",border:"none",borderTop:`1px solid ${C.border}`,cursor:"pointer",color:C.green,fontWeight:800,fontSize:15,fontFamily:"inherit"}}>
        <span style={{width:32,height:32,borderRadius:"50%",background:C.greenLight,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="plus" size={18} sw={2.2}/></span>Agregar tarea
      </button>
    </Card>
  </div>;

  return <div style={{paddingBottom:24}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showQuick&&<QuickTaskSheet user={user} rooms={rooms} onClose={()=>setShowQuick(false)} onCreated={t=>{setShowQuick(false);loadTasks();setToast({msg:`Tarea creada para ${t.assignee===user.name?"vos":t.assignee}, ${t.due_date===todayISO?"hoy":fmtDM(t.due_date)}`,type:"success"});}}/>}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,padding:"10px 0 18px"}}>
      <div>
        <div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>{fecha}</div>
        <div style={{fontSize:30,fontWeight:800,color:C.text,fontFamily:H,letterSpacing:"-0.02em",lineHeight:1.1,marginTop:2}}>Hola, {user.name}</div>
        <div style={{fontSize:14.5,color:C.textMid,marginTop:6}}>{resumen}</div>
      </div>
      <button onClick={()=>setPage("__more__")} aria-label="Tu usuario" style={{width:42,height:42,borderRadius:"50%",background:C.green,color:C.onAccent,border:"none",cursor:"pointer",fontWeight:800,fontSize:16,flexShrink:0,fontFamily:"inherit"}}>{user.initial||user.name?.[0]}</button>
    </div>
    {wide
      ?<div style={{display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:"0 28px",alignItems:"start"}}>
        <div>{alertsBlock}{spacesBlock}</div>
        <div style={{marginTop:-24}}>{tasksBlock}</div>
      </div>
      :<>{alertsBlock}{spacesBlock}{tasksBlock}</>}
  </div>;
}

// SALA PAGE
function SalaPage({roomId,setPage,user,genetics,rc,targets,onTargetsChanged}){
  const [cycle,setCycle]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [cg,setCg]=useState([]);
  const [wLog,setWLog]=useState([]);
  const [nLog,setNLog]=useState([]);
  const [msRows,setMsRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selPot,setSelPot]=useState(null);
  const [toast,setToast]=useState(null);
  const [showW,setShowW]=useState(false);
  const [showN,setShowN]=useState(false);
  const [showPh,setShowPh]=useState(false);
  const [showAG,setShowAG]=useState(false);
  const [showFoliar,setShowFoliar]=useState(false);
  const [potCounts,setPotCounts]=useState({});
  const [equipment,setEquipment]=useState([]);
  const [climate,setClimate]=useState([]);
  const [clRange,setClRange]=useState("24h");
  const [showClimate,setShowClimate]=useState(false);
  const [showClose,setShowClose]=useState(false);
  const [showDoneT,setShowDoneT]=useState(false);
  const [showTargets,setShowTargets]=useState(false);
  const [infoTask,setInfoTask]=useState(null);
  const [showMenu,setShowMenu]=useState(false);
  const [showCharts,setShowCharts]=useState(false);
  const [potMix,setPotMix]=useState({});   // mesa → {genética: plantas}
  const [poolLines,setPoolLines]=useState([]);   // líneas de las tandas de VG que entraron a este ciclo
  const [cycleCells,setCycleCells]=useState([]); // todas las celdas del ciclo, para saber qué falta ubicar
  const [phenoAll,setPhenoAll]=useState({});
  const [showDescarte,setShowDescarte]=useState(false);
  const [descBusy,setDescBusy]=useState(false);

  const fdays=rc?.flower_days||65;
  const flushDays=rc?.flush_days||20;
  const roomName=rc?.display_name||(roomId==="S1"?"Sala 1":roomId==="S2"?"Sala 2":roomId);

  const getMilestones=c=>{
    if(!c||!c.flower_start)return[];
    return [
      {label:"Inicio floración",   date:c.flower_start,                          type:"start"    },
      {label:"Zoil Monkey 1",      date:c.flower_start,                          type:"nutricion"},
      {label:"Poda 1 — día 15",    date:addDays(c.flower_start,15),              type:"poda"     },
      {label:"Zoil Monkey 2",      date:addDays(c.flower_start,15),              type:"nutricion"},
      {label:"Poda 2 — día 21",    date:addDays(c.flower_start,21),              type:"poda"     },
      {label:"Inicio lavado",      date:addDays(c.estimated_harvest,-flushDays), type:"lavado"   },
      {label:"Cosecha estimada",   date:c.estimated_harvest,                     type:"cosecha"  },
    ];
  };

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[cycles,allT,wL,nL]=await Promise.all([
        db.query("cycles",`room_id=eq.${roomId}&active=eq.true`),
        db.query("tasks",`room_id=eq.${roomId}&due_date=eq.${todayISO}`),
        db.query("watering_logs",`room_id=eq.${roomId}&order=logged_at.desc&limit=5`),
        db.query("nutrition_logs",`room_id=eq.${roomId}&order=logged_at.desc&limit=5`),
      ]);
      const c=cycles[0]||null;
      setCycle(c);setTasks(allT);setWLog(wL);setNLog(nL);
      db.query("room_equipment",`room_id=eq.${roomId}`).then(setEquipment).catch(()=>setEquipment([]));
      if(c){
        const cgData=await db.query("cycle_genetics",`cycle_id=eq.${c.id}`);
        setCg(cgData);
        const ms=await db.query("cycle_milestones",`cycle_id=eq.${c.id}`);
        setMsRows(ms);
        // Conteo real de plantas: sumar todas las celdas dibujadas en las mesas del ciclo
        const allCells=await db.query("pot_cells",`cycle_id=eq.${c.id}`);
        const counts={};
        allCells.forEach(cell=>{if(cell.genetic_name)counts[cell.genetic_name]=(counts[cell.genetic_name]||0)+1;});
        setPotCounts(counts);
        const potsRows=await db.query("pots",`room_id=eq.${roomId}`).catch(()=>[]);
        const lab={};potsRows.forEach(pr=>{lab[sid(pr.id)]=pr.pot_label;});
        const mix={};
        allCells.forEach(cell=>{if(!cell.genetic_name)return;const l=lab[sid(cell.pot_id)];if(!l)return;mix[l]=mix[l]||{};mix[l][cell.genetic_name]=(mix[l][cell.genetic_name]||0)+1;});
        setPotMix(mix);
        setCycleCells(allCells);
        try{
          const bs=await db.query("vg_batches",`cycle_id=eq.${sid(c.id)}`);
          const ids=bs.map(b=>sid(b.id));
          const ls=ids.length?await db.query("vg_lines",`batch_id=in.(${ids.join(",")})`):[];
          setPoolLines(ls);
          if(ls.some(l=>l.pheno_id)||allCells.some(x=>x.pheno_id)){
            const ps=await db.query("phenos","select=id,code,number").catch(()=>[]);
            const pm={};ps.forEach(p=>{pm[sid(p.id)]=p;});setPhenoAll(pm);
          }
        }catch{setPoolLines([]);/* sin la columna cycle_id todavía: la sala anda igual */}
      }else{setCg([]);setMsRows([]);setPotCounts({});setPotMix({});setCycleCells([]);setPoolLines([]);}
    }finally{setLoading(false);}
  },[roomId]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const loadClimate=()=>{
      const hrs=clRange==="24h"?24:clRange==="7d"?24*7:24*30;
      const since=new Date(Date.now()-hrs*3600*1000).toISOString();
      db.query("climate_logs",`room_id=eq.${roomId}&recorded_at=gte.${since}&order=recorded_at.asc`).then(setClimate).catch(()=>setClimate([]));
    };
    loadClimate();
    const id=setInterval(loadClimate,120000); // refresca el clima solo cada 2 min
    return ()=>clearInterval(id);
  },[roomId,clRange]);

  // Marca/desmarca un milestone y lo persiste en cycle_milestones
  const toggleMilestone=async(m)=>{
    if(!cycle)return;
    const existing=msRows.find(r=>r.label===m.label);
    if(existing){
      const ns=!existing.done;
      await db.update("cycle_milestones",existing.id,{done:ns,done_at:ns?new Date().toISOString():null});
      setMsRows(prev=>prev.map(r=>r.id===existing.id?{...r,done:ns,done_at:ns?new Date().toISOString():null}:r));
    }else{
      const ins=await db.insert("cycle_milestones",{cycle_id:cycle.id,label:m.label,due_date:m.date,type:m.type,done:true,done_at:new Date().toISOString(),auto_generated:false});
      if(ins&&ins[0])setMsRows(prev=>[...prev,ins[0]]);
    }
  };

  const toggleTask=async task=>{
    const ns=task.status==="completada"?"pendiente":"completada";
    await db.update("tasks",task.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
    if(ns==="completada")await pestTaskDone(task,user.name);
    if(ns==="completada"&&task.recurrent&&task.recurrent_days){
      await db.insert("tasks",{title:task.title,room_id:task.room_id,type:task.type,assignee:task.assignee,due_date:addDays(task.due_date,task.recurrent_days),status:"pendiente",priority:task.priority,recurrent:true,recurrent_days:task.recurrent_days,auto_generated:task.auto_generated,created_by:"sistema"});
    }
    await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${task.title}`,"task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:ns}:t));
    setToast({msg:ns==="completada"?"Completada ✓":"Reabierta",type:"success"});
  };

  if(loading)return <Spin/>;
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const milestones=getMilestones(cycle);
  const dayIn=cycle?daysFrom(cycle.flower_start):0;
  const pm=cycle?PM[cycle.phase]||PM["floración"]:PM["vegetativo"];
  const pct=cycle?Math.min(100,Math.round(dayIn/fdays*100)):0;
  const pendingT=tasks.filter(t=>t.status==="pendiente");
  const doneT=tasks.filter(t=>t.status==="completada");
  const byRoom=groupTasks(pendingT);
  const totalPlants=Object.values(potCounts).reduce((a,b)=>a+(b||0),0);
  const pool=buildPool(poolLines,cycleCells);
  const poolLeft=pool.reduce((a,p)=>a+p.left,0);

  if(!cycle)return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={null} rc={rc} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Ciclo iniciado ✓",type:"success"});}}/>}
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green,marginBottom:14}}><Icon n="vege" size={46}/></div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>{roomName}</div>
      <div style={{fontSize:14,color:C.textSoft,marginBottom:24}}>Sin ciclo activo</div>
      {user.role==="admin"&&<Btn onClick={()=>setShowPh(true)} full>Iniciar ciclo</Btn>}
    </div>
  </div>;

  // ── Formato nuevo (admin): cabecera clara, clima, mesas y lo demás plegado ──
  if(user.role==="admin"){
    const tg=getTargets(targets,roomId,cycle,rc);
    const last=climate.length?climate[climate.length-1]:null;
    const isVeg=cycle.phase==="vegetativo";
    const span=(a,b)=>a&&b?Math.round((new Date(String(b).slice(0,10)+"T12:00:00")-new Date(String(a).slice(0,10)+"T12:00:00"))/86400000):null;
    const vStart=cycle.veg_start||null,vEnd=cycle.veg_end||null;
    const hTotal=Math.max(1,isVeg?(span(vStart,vEnd)||rc?.veg_days||6):(span(cycle.flower_start,cycle.estimated_harvest)||fdays));
    const hDay=isVeg?(vStart?Math.max(0,daysSince(vStart)):0):(cycle.flower_start?Math.max(0,daysSince(cycle.flower_start)):0);
    const left=isVeg?hTotal-hDay:daysTo(cycle.estimated_harvest);
    const tone=isVeg?C.green:C.amber;
    const light=C.onAccent==="#FFFFFF";
    const heroBg=isVeg?(light?"linear-gradient(135deg,#E7F2EB,#DAEAE0)":"linear-gradient(135deg,#16211A,#121B14)"):(light?"linear-gradient(135deg,#FBF1DF,#F4E6CE)":"linear-gradient(135deg,#241D12,#1C1710)");
    const marks=isVeg?[]:[{d:15,l:"Poda 1"},{d:21,l:"Poda 2"},{d:hTotal-flushDays,l:"Lavado"},{d:hTotal,l:"Cosecha"}].filter(m=>m.d>=0);
    const pctOf=d=>Math.max(0,Math.min(100,d/hTotal*100));
    const baseDate=isVeg?vStart:cycle.flower_start;
    const genRows=cg.map(g=>[g.genetic_name,potCounts[g.genetic_name]||0]).sort((a,b)=>b[1]-a[1]);
    const menu=[["water","Registrar riego",()=>setShowW(true)],["flask","Registrar nutrición",()=>setShowN(true)],["spray","Aplicación foliar",()=>setShowFoliar(true)],["thermo","Medición manual de clima",()=>setShowClimate(true)],["sliders","Editar objetivos de clima",()=>setShowTargets(true)],["swap","Cambiar fase",()=>setShowPh(true)]];
    const pill=light?"rgba(255,255,255,0.78)":"rgba(255,255,255,0.08)";
    return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {infoTask&&<TaskDetailModal task={infoTask} onClose={()=>setInfoTask(null)}/>}
    {showW&&<WaterModal roomId={roomId} user={user} onClose={()=>setShowW(false)} onSaved={()=>{setShowW(false);load();setToast({msg:"Riego registrado ✓",type:"success"});}}/>}
    {showN&&<NutriModal roomId={roomId} cycleId={cycle.id} user={user} onClose={()=>setShowN(false)} onSaved={()=>{setShowN(false);load();setToast({msg:"Nutrición registrada ✓",type:"success"});}}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={cycle} rc={rc} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Fase actualizada ✓",type:"success"});}}/>}
    {showAG&&<AddGenModal cycleId={cycle.id} genetics={genetics} existing={cg} counts={potCounts} onClose={()=>setShowAG(false)} onSaved={()=>{setShowAG(false);load();setToast({msg:"Genéticas actualizadas ✓",type:"success"});}}/>}
    {showFoliar&&<FoliarModal roomId={roomId} cycleId={cycle.id} user={user} onClose={()=>setShowFoliar(false)} onSaved={()=>{setShowFoliar(false);load();setToast({msg:"Aplicación foliar registrada ✓",type:"success"});}}/>}
    {showClimate&&<ClimateModal roomId={roomId} user={user} onClose={()=>setShowClimate(false)} onSaved={()=>{setShowClimate(false);load();setToast({msg:"Medición registrada ✓",type:"success"});}}/>}
    {showClose&&<CloseCycleModal cycle={cycle} roomId={roomId} rc={rc} cg={cg} potCounts={potCounts} wLog={wLog} nLog={nLog} user={user} onClose={()=>setShowClose(false)} onSaved={()=>{setShowClose(false);load();setToast({msg:"Ciclo cerrado y archivado ✓",type:"success"});}}/>}
    {showTargets&&<TargetsModal roomId={roomId} rc={rc} cycle={cycle} user={user} onClose={()=>setShowTargets(false)} onSaved={()=>{setShowTargets(false);onTargetsChanged&&onTargetsChanged();setToast({msg:"Objetivos de clima guardados ✓",type:"success"});}}/>}

      {showDescarte&&<ConfirmModal title={`¿Dar por perdidas ${poolLeft} planta${poolLeft===1?"":"s"}?`} busy={descBusy} confirmLabel="Dar por perdidas" busyLabel="Guardando..." onClose={()=>setShowDescarte(false)}
        onConfirm={async()=>{setDescBusy(true);try{const n=await descartarSobrantes({cycleId:cycle.id,pool,user:user.name});setShowDescarte(false);await load();setToast({msg:`${n} planta${n===1?"":"s"} anotada${n===1?"":"s"} como pérdida de trasplante`,type:"success"});}catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setDescBusy(false);}}}
        text="Se descuentan de la tanda en VG como pérdida de trasplante y el “por ubicar” queda en cero. Hacelo cuando ya acomodaste todo lo que prendió."/>}
      {showMenu&&<Sheet title={roomName} onClose={()=>setShowMenu(false)}>
        {menu.map(([ic,l,fn],i)=><SheetRow key={l} i={i} icon={ic} label={l} onClick={()=>{setShowMenu(false);fn();}}/>)}
        <SheetRow i={1} icon="stop" label="Cerrar ciclo" danger onClick={()=>{setShowMenu(false);setShowClose(true);}}/>
      </Sheet>}
      {selPot&&<Sheet onClose={()=>setSelPot(null)}>
        <PotEditor inSheet roomId={roomId} potLabel={selPot} cycle={cycle} genetics={genetics} cycleGenetics={cg} user={user} pool={pool} cycleCells={cycleCells} phenoAll={phenoAll} onClose={()=>setSelPot(null)} onSaved={()=>{setSelPot(null);load();setToast({msg:"Mesa guardada ✓",type:"success"});}}/>
      </Sheet>}

      <div style={{background:heroBg,borderRadius:22,padding:"16px 18px 12px",border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:12.5,fontWeight:800,padding:"4px 11px",borderRadius:99,background:pill,color:tone}}>{isVeg?"Vegetativo":cycle.phase==="floración"?"Floración":cycle.phase}</span>
          <button onClick={()=>setShowMenu(true)} aria-label="Más acciones de la sala" style={{width:42,height:42,borderRadius:12,border:"none",cursor:"pointer",background:pill,color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="mas" size={22}/></button>
        </div>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:10}}>
          <span style={{fontSize:44,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1,color:C.text,fontVariantNumeric:"tabular-nums"}}>Día {hDay}</span>
          <span style={{fontSize:17,fontWeight:700,color:C.textSoft}}>de {hTotal}</span>
        </div>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:8,fontSize:14,fontWeight:700,color:C.textMid}}>
          <span>{isVeg?(left>0?<><b style={{color:C.text,fontSize:16}}>{left}</b> días para pasar a flora</>:"Toca pasar a flora"):(left>0?<><b style={{color:left<=7?C.red:C.text,fontSize:16}}>{left}</b> días para la cosecha</>:left===0?"Cosecha hoy":"Cosecha pasada")}</span>
          <span><b style={{color:C.text,fontSize:16}}>{totalPlants}</b> plantas</span>
          {poolLeft>0&&<span style={{color:C.amber}}><b style={{fontSize:16}}>{poolLeft}</b> por ubicar</span>}
        </div>
        <div style={{position:"relative",height:marks.length?66:26,margin:"16px 6px 0"}}>
          <span style={{position:"absolute",left:0,right:0,top:9,height:4,borderRadius:4,background:C.borderStrong}}/>
          <span style={{position:"absolute",left:0,top:9,height:4,borderRadius:4,width:`${pctOf(hDay)}%`,background:tone}}/>
          {marks.map((m,i)=>{const p=pctOf(m.d);const doneM=hDay>=m.d;const edge=p>90?{right:-6}:p<10?{left:-6}:{left:0,transform:"translateX(-50%)"};
            return <span key={m.l} style={{position:"absolute",top:2,left:`${p}%`}}>
              <span style={{display:"block",width:12,height:12,borderRadius:"50%",margin:"3px 0 0 -6px",background:doneM?tone:C.surface,boxShadow:`0 0 0 2px ${doneM?tone:C.borderStrong}`}}/>
              <span style={{position:"absolute",top:i%2?38:22,whiteSpace:"nowrap",fontSize:11,fontWeight:700,color:C.textMid,...edge}}>{m.l} {baseDate?fmtDM(addDays(baseDate,m.d)):""}</span>
            </span>;})}
          <span style={{position:"absolute",top:1,left:`${pctOf(hDay)}%`,width:20,height:20,marginLeft:-10,borderRadius:"50%",background:tone,boxShadow:`0 0 0 4px ${light?"rgba(255,255,255,0.9)":C.bg}`}}/>
        </div>
      </div>

      <Card style={{padding:"16px 16px 14px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>Clima</div><div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Objetivo de {String(tg.label||"").toLowerCase()}</div></div>
          <button onClick={()=>setShowCharts(v=>!v)} style={{display:"flex",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",color:C.green,fontWeight:800,fontSize:14,fontFamily:"inherit",padding:"8px 0 8px 8px"}}>{showCharts?"Ocultar":"Gráficos"}<Icon n="chev" size={16} style={{transform:showCharts?"rotate(90deg)":"none"}}/></button>
        </div>
        <ClimateMetrics climate={last} tR={tg.temp} hR={tg.hum} vR={tg.vpd}/>
        {showCharts&&<ChartsBlock climate={climate} clRange={clRange} setClRange={setClRange} tg={tg} onManual={()=>setShowClimate(true)}/>}
      </Card>

      {poolLeft>0&&<Card style={{padding:"14px 16px",border:`1.5px solid ${C.amber}66`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{width:42,height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:C.amberLight,color:C.amber,flexShrink:0}}><Icon n="pot" size={22}/></span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>{poolLeft} planta{poolLeft===1?"":"s"} por ubicar</div>
            <div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Llegaron de VG. Tocá una mesa, Editar, y usalas como pincel.</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px 12px",flexWrap:"wrap",marginTop:10}}>
          {pool.filter(p=>p.left>0).map(p=>{const f=p.pheno_id?(phenoAll[p.pheno_id]?.code||"Feno"):p.pheno_label;return <span key={p.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,color:C.textMid}}><span style={{width:9,height:9,borderRadius:"50%",background:genMap[p.genetic_name]||C.green}}/>{p.genetic_name}{f&&<FenoChip txt={f}/>}<b style={{color:C.text,marginLeft:2}}>{p.left}</b></span>;})}
        </div>
        <button onClick={()=>setShowDescarte(true)} style={{marginTop:10,background:"transparent",border:"none",color:C.textSoft,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"4px 0",textDecoration:"underline"}}>Ya acomodé todo: dar por perdidas las que sobran</button>
      </Card>}
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"10px 2px 0"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>Mesas</div>
        <span style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Tocá una para editarla</span>
      </div>
      <Card style={{padding:10}}><PotMapV2 roomId={roomId} potMix={potMix} genMap={genMap} onSelect={setSelPot}/></Card>

      <div style={{height:2}}/>
      <Fold icon="dna" title="Genéticas del ciclo" count={cg.length} right={<button onClick={e=>{e.stopPropagation();setShowAG(true);}} style={{fontSize:13,fontWeight:800,color:C.green,background:C.greenLight,border:"none",borderRadius:10,padding:"7px 11px",cursor:"pointer",fontFamily:"inherit"}}>+ Agregar</button>}>
        {genRows.length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"6px 0"}}>Sin genéticas. Tocá “+ Agregar”.</div>}
        {genRows.map(([g,n],i)=><div key={g} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
          <span style={{width:10,alignSelf:"stretch",minHeight:30,borderRadius:4,background:genMap[g]||C.green}}/>
          <span style={{flex:1,fontSize:15,fontWeight:700,color:C.text}}>{g}</span>
          <span style={{fontSize:20,fontWeight:800,color:C.text}}>{n}</span><span style={{fontSize:12,color:C.textSoft,fontWeight:600}}>pl</span>
        </div>)}
        {genRows.length>0&&<div style={{fontSize:12,color:C.textSoft,marginTop:8}}>Las cantidades salen de lo que dibujás en las mesas.</div>}
      </Fold>
      <Fold icon="calendar" title="Fechas clave">
        {milestones.map((m,i)=>{const r=msRows.find(x=>x.label===m.label);const doneM=r?r.done:false;const dL=daysTo(m.date);
          return <button key={m.label} onClick={()=>toggleMilestone(m)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 0",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:C.text}}>
            <span style={{width:26,height:26,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:doneM?C.green:"transparent",boxShadow:doneM?"none":`inset 0 0 0 2px ${C.borderStrong}`,color:C.onAccent}}>{doneM&&<Icon n="check" size={16} sw={2.6}/>}</span>
            <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:15,fontWeight:700,color:doneM?C.textSoft:C.text,textDecoration:doneM?"line-through":"none"}}>{m.label}</span><span style={{fontSize:12.5,color:m.date===todayISO?C.amber:C.textSoft,fontWeight:600}}>{m.date===todayISO?"Hoy":dL>0?`En ${dL} días`:"Pasada"}</span></span>
            <span style={{fontSize:14.5,fontWeight:800,color:C.textMid}}>{fmtDM(m.date)}</span>
          </button>;})}
        <div style={{fontSize:12,color:C.textSoft,marginTop:8}}>Tocá una fecha para marcarla como hecha.</div>
      </Fold>
    </div>;
  }

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {infoTask&&<TaskDetailModal task={infoTask} onClose={()=>setInfoTask(null)}/>}
    {showW&&<WaterModal roomId={roomId} user={user} onClose={()=>setShowW(false)} onSaved={()=>{setShowW(false);load();setToast({msg:"Riego registrado ✓",type:"success"});}}/>}
    {showN&&<NutriModal roomId={roomId} cycleId={cycle.id} user={user} onClose={()=>setShowN(false)} onSaved={()=>{setShowN(false);load();setToast({msg:"Nutrición registrada ✓",type:"success"});}}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={cycle} rc={rc} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Fase actualizada ✓",type:"success"});}}/>}
    {showAG&&<AddGenModal cycleId={cycle.id} genetics={genetics} existing={cg} counts={potCounts} onClose={()=>setShowAG(false)} onSaved={()=>{setShowAG(false);load();setToast({msg:"Genéticas actualizadas ✓",type:"success"});}}/>}
    {showFoliar&&<FoliarModal roomId={roomId} cycleId={cycle.id} user={user} onClose={()=>setShowFoliar(false)} onSaved={()=>{setShowFoliar(false);load();setToast({msg:"Aplicación foliar registrada ✓",type:"success"});}}/>}
    {showClimate&&<ClimateModal roomId={roomId} user={user} onClose={()=>setShowClimate(false)} onSaved={()=>{setShowClimate(false);load();setToast({msg:"Medición registrada ✓",type:"success"});}}/>}
    {showClose&&<CloseCycleModal cycle={cycle} roomId={roomId} rc={rc} cg={cg} potCounts={potCounts} wLog={wLog} nLog={nLog} user={user} onClose={()=>setShowClose(false)} onSaved={()=>{setShowClose(false);load();setToast({msg:"Ciclo cerrado y archivado ✓",type:"success"});}}/>}
    {showTargets&&<TargetsModal roomId={roomId} rc={rc} cycle={cycle} user={user} onClose={()=>setShowTargets(false)} onSaved={()=>{setShowTargets(false);onTargetsChanged&&onTargetsChanged();setToast({msg:"Objetivos de clima guardados ✓",type:"success"});}}/>}

    {/* Hero — cosecha protagonista */}
    <div style={{background:C.onAccent==="#FFFFFF"?(cycle.phase==="floración"?"linear-gradient(135deg,#FBF1DF,#F4E6CE)":"linear-gradient(135deg,#E7F2EB,#DAEAE0)"):(cycle.phase==="floración"?"linear-gradient(135deg,#241D12,#1C1710)":"linear-gradient(135deg,#16211A,#121B14)"),borderRadius:20,padding:"22px 20px 18px",border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>{roomId}</div><div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>{roomName}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <PBadge phase={cycle.phase}/>
          {user.role==="admin"&&<div style={{display:"flex",gap:6}}>
            <button onClick={()=>setShowPh(true)} style={{fontSize:11,color:C.textMid,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Fase</button>
            <button onClick={()=>setShowClose(true)} style={{fontSize:11,color:C.red,background:C.surface,border:`1px solid ${C.red}44`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Cerrar</button>
          </div>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
        <span style={{fontFamily:MONO,fontWeight:700,fontSize:56,lineHeight:0.85,color:daysTo(cycle.estimated_harvest)<=7?C.red:daysTo(cycle.estimated_harvest)<=20?C.amber:C.green}}>{daysTo(cycle.estimated_harvest)}</span>
        <span style={{fontSize:15,color:C.textSoft,paddingBottom:8}}>días para la cosecha</span>
      </div>
      <div style={{display:"flex",gap:20,margin:"12px 0 10px",flexWrap:"wrap"}}>
        <div><span style={{fontFamily:MONO,fontWeight:700,fontSize:22,color:C.text}}>{dayIn}</span><span style={{fontSize:12,color:C.textSoft,marginLeft:6}}>día de {cycle.phase}</span></div>
        <div><span style={{fontFamily:MONO,fontWeight:700,fontSize:22,color:C.green}}>{totalPlants}</span><span style={{fontSize:12,color:C.textSoft,marginLeft:6}}>plantas</span></div>
      </div>
      <Bar value={pct} max={100} color={pm.color} h={8}/>
      <div style={{fontSize:12,color:C.textSoft,marginTop:8}}>💧 {cycle.irrigation_type} · {fmtDate(cycle.flower_start)} → {fmtDate(cycle.estimated_harvest)}</div>
    </div>

    {/* Clima en vivo */}
    {(()=>{const last=climate.length?climate[climate.length-1]:null;const tg=getTargets(targets,roomId,cycle,rc);return <Card style={{padding:"14px 18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 2px"}}>
        <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em"}}>Objetivo · {tg.label}</div>
        {user.role==="admin"&&<button onClick={()=>setShowTargets(true)} style={{fontSize:11,color:C.textMid,background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 9px",cursor:"pointer"}}>✎ Editar</button>}
      </div>
      <ClimateMetrics climate={last} tR={tg.temp} hR={tg.hum} vR={tg.vpd}/>
    </Card>;})()}

    {/* Acciones compactas */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Btn onClick={()=>setShowW(true)} style={{borderRadius:14,padding:12,fontSize:13}}>💧 Riego</Btn>
      <Btn onClick={()=>setShowN(true)} v="secondary" style={{borderRadius:14,padding:12,fontSize:13}}>🌱 Nutrición</Btn>
      <Btn onClick={()=>setShowFoliar(true)} v="secondary" style={{borderRadius:14,padding:12,fontSize:13}}>🍃 Foliar</Btn>
    </div>

    {/* Genéticas */}
    <Accordion title="Genéticas" icon="🧬" right={user.role==="admin"?<button onClick={(e)=>{e.stopPropagation();setShowAG(true);}} style={{fontSize:11,color:C.green,background:C.greenLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700}}>+ Agregar</button>:null}>
      {cg.length===0?<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic"}}>Sin genéticas — tocá + Agregar</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {cg.map(g=><div key={g.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:C.bg,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:11,height:11,borderRadius:"50%",background:genMap[g.genetic_name]||C.green}}/><span style={{fontSize:14,fontWeight:600,color:C.text}}>{g.genetic_name}</span></div>
            <div><span style={{fontFamily:MONO,fontWeight:700,fontSize:18,color:C.text}}>{potCounts[g.genetic_name]||0}</span><span style={{fontSize:12,color:C.textSoft,marginLeft:6}}>plantas</span></div>
          </div>)}
        </div>}
      <div style={{fontSize:11,color:C.textSoft,textAlign:"center",marginTop:10,fontStyle:"italic"}}>Las cantidades se calculan según lo que dibujás en las mesas</div>
    </Accordion>

    {/* Métricas */}
    <Accordion title="Métricas" icon="📊">
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["24h","24 h"],["7d","7 días"],["30d","30 días"]].map(([k,l])=><button key={k} onClick={()=>setClRange(k)} style={{flex:1,fontSize:12.5,fontWeight:700,padding:"8px 0",borderRadius:9,cursor:"pointer",border:`1px solid ${clRange===k?C.green:C.border}`,background:clRange===k?C.greenLight:"transparent",color:clRange===k?C.green:C.textSoft}}>{l}</button>)}
        <button onClick={()=>setShowClimate(true)} style={{fontSize:12.5,fontWeight:700,padding:"8px 12px",borderRadius:9,cursor:"pointer",border:`1px solid ${C.border}`,background:"transparent",color:C.textMid}}>+ Med.</button>
      </div>
      {(()=>{
        const tg=getTargets(targets,roomId,cycle,rc);
        const tR=tg.temp,hR=tg.hum,vR=tg.vpd;
        const tPts=climate.filter(c=>c.temperature!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.temperature}));
        const hPts=climate.filter(c=>c.humidity!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.humidity}));
        const vPts=climate.filter(c=>c.vpd!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.vpd}));
        if(climate.length===0)return <div style={{textAlign:"center",color:C.textSoft,fontSize:13,fontStyle:"italic",padding:"16px 0"}}>Sin datos en este rango todavía</div>;
        return <>
          <div style={{fontSize:11,color:C.textSoft,marginBottom:8,fontStyle:"italic"}}>Franja sombreada = rango objetivo de {tg.label} · tocá o arrastrá el dedo sobre el gráfico para ver hora y valor</div>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,marginBottom:4}}>🌡 Temperatura (°C)</div>
          <LineChart series={[{points:tPts,color:C.amber}]} bands={[{min:tR.min,max:tR.max,color:C.amber}]} unit="°C"/>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,margin:"12px 0 4px"}}>💧 Humedad (%)</div>
          <LineChart series={[{points:hPts,color:C.blue}]} bands={[{min:hR.min,max:hR.max,color:C.blue}]} unit="%"/>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,margin:"12px 0 4px"}}>🍃 VPD (kPa)</div>
          <LineChart series={[{points:vPts,color:C.purple}]} bands={[{min:vR.min,max:vR.max,color:C.purple}]} unit=" kPa"/>
        </>;
      })()}
    </Accordion>

    {/* Mesas */}
    <Accordion title="Mesas" icon="🗺️">
      <PotMap roomId={roomId} genetics={genetics} cycleGenetics={cg} selectedPot={selPot} onSelect={setSelPot} equipment={equipment}/>
      {selPot&&<PotEditor roomId={roomId} potLabel={selPot} cycle={cycle} genetics={genetics} cycleGenetics={cg} user={user} onClose={()=>setSelPot(null)} onSaved={()=>{setSelPot(null);load();setToast({msg:"Macetón guardado ✓",type:"success"});}}/>}
    </Accordion>

    {/* Fechas clave */}
    <Accordion title="Fechas clave del ciclo" icon="📅">
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {milestones.map((m,i)=>{
          const row=msRows.find(r=>r.label===m.label);
          const done=row?row.done:false;
          const tm=TM[m.type]||{icon:"📅"};
          const dL=daysTo(m.date);
          const isToday=m.date===todayISO;
          return <div key={i} onClick={()=>toggleMilestone(m)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:done?C.greenLight:isToday?C.amberLight:C.bg,border:`1px solid ${done?C.green+"44":isToday?C.amber+"66":C.border}`,cursor:"pointer",opacity:done?0.7:1}}>
            <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:done?C.green:"transparent",border:`2px solid ${done?C.green:C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontSize:13}}>{done?"✓":""}</div>
            <span style={{fontSize:17}}>{tm.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,textDecoration:done?"line-through":"none"}}>{m.label}</div>
              <div style={{fontSize:11,color:C.textSoft}}>{fmtDate(m.date)}{isToday?" — hoy":dL>0?` — en ${dL}d`:" — pasado"}</div>
            </div>
          </div>;
        })}
      </div>
    </Accordion>

    {/* Tareas de hoy */}
    <Accordion title="Tareas de hoy" icon="✓" right={<button onClick={(e)=>{e.stopPropagation();setPage("tareas");}} style={{fontSize:11,color:C.textMid,background:C.surfaceAlt,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700}}>Ver todas</button>}>
      {tasks.length===0?<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic",textAlign:"center",padding:"8px 0"}}>Sin tareas para hoy ✓</div>:<>
        {Object.entries(byRoom).map(([r,tl])=>tl.length===0?null:<div key={r} style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:groupMeta(r).color}}>{groupMeta(r).label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{tl.map(t=><TaskRow key={t.id} t={t} onToggle={toggleTask} onInfo={setInfoTask}/>)}</div>
        </div>)}
        {doneT.length>0&&<>
          <button onClick={()=>setShowDoneT(!showDoneT)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDoneT?"▲":"▼"} Completadas ({doneT.length})</button>
          {showDoneT&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6,marginTop:8}}>{doneT.map(t=><TaskRow key={t.id} t={t} onToggle={toggleTask} onInfo={setInfoTask}/>)}</div>}
        </>}
      </>}
    </Accordion>

    {/* Historial */}
    {(wLog.length>0||nLog.length>0)&&<Accordion title="Historial" icon="📜">
      {wLog.length>0&&<><div style={{fontSize:11,fontWeight:700,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Últimos riegos</div>
        {wLog.map((w,i)=><div key={w.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<wLog.length-1?`1px solid ${C.border}`:"none"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>💧 {w.method}{w.duration_minutes?` · ${w.duration_minutes}min`:""}</div><div style={{fontSize:11,color:C.textSoft}}>{w.logged_by} · {fmtDate(w.logged_at)} {fmtTime(w.logged_at)}</div></div>
          {w.notes&&<div style={{fontSize:11,color:C.textSoft,maxWidth:100,textAlign:"right"}}>{w.notes}</div>}
        </div>)}</>}
      {nLog.length>0&&<><div style={{fontSize:11,fontWeight:700,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",margin:wLog.length>0?"14px 0 8px":"0 0 8px"}}>Últimas aplicaciones</div>
        {nLog.map((n,i)=><div key={n.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<nLog.length-1?`1px solid ${C.border}`:"none"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>🌱 {n.products}</div><div style={{fontSize:11,color:C.textSoft}}>{n.logged_by} · {fmtDate(n.logged_at)}{n.dose?` · ${n.dose}`:""}</div></div>
        </div>)}</>}
    </Accordion>}
  </div>;
}

// POT MAP
function PotMap({roomId,genetics,cycleGenetics,selectedPot,onSelect,equipment=[]}){
  const genMap={};genetics.forEach((g,i)=>{genMap[g.name]=g.color||GP[i%GP.length];});
  const cgColors=cycleGenetics.map((cg,i)=>genMap[cg.genetic_name]||GP[i]);
  const plan=ROOM_PLANS[roomId];
  const pots=plan?plan.pots:(ROOM_POTS[roomId]||[]).map((p,i)=>({...p,x:5+(i%2)*48,y:5+Math.floor(i/2)*31,w:44,h:27}));
  const ratio=plan?plan.ratio:"3 / 4";
  const EQ_ICON={aire:"❄️",ventilador:"🌀",extractor:"💨",deshumidificador:"💧",humidificador:"💦",luz:"💡",otro:"⚙️"};
  return <div style={{background:C.bg,borderRadius:14,padding:10,border:`1px solid ${C.border}`}}>
    <div style={{position:"relative",width:"100%",aspectRatio:ratio,background:C.surfaceAlt,borderRadius:10,border:`1.5px dashed ${C.borderStrong}`,overflow:"hidden"}}>
      {pots.map((pot,idx)=>{
        const sel=selectedPot===pot.label;
        const col=cgColors.length>0?cgColors[idx%Math.max(cgColors.length,1)]:C.borderStrong;
        return <div key={pot.label} onClick={()=>onSelect(sel?null:pot.label)} style={{position:"absolute",left:`${pot.x}%`,top:`${pot.y}%`,width:`${pot.w}%`,height:`${pot.h}%`,background:sel?C.green:`${col}22`,border:`2px solid ${sel?C.green:`${col}88`}`,borderRadius:pot.circular?"50%":12,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:sel?`0 0 0 3px ${C.greenLight}`:"none"}}>
          <span style={{fontSize:"clamp(16px,5vw,24px)",fontWeight:900,color:sel?"#fff":C.text,fontFamily:H,lineHeight:1}}>{pot.label}</span>
          <span style={{fontSize:9,color:sel?"#ffffffcc":C.textSoft}}>{pot.circular?"circular":""}</span>
        </div>;
      })}
      {equipment.map(eq=><div key={eq.id} title={eq.label||eq.kind} style={{position:"absolute",left:`${eq.pos_x}%`,top:`${eq.pos_y}%`,transform:"translate(-50%,-50%)",fontSize:20,zIndex:5,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.3))"}}>{EQ_ICON[eq.kind]||"⚙️"}</div>)}
    </div>
    <div style={{fontSize:10,color:C.textSoft,textAlign:"center",marginTop:8,fontStyle:"italic"}}>Tocá un macetón para editar su distribución de plantas</div>
  </div>;
}

// Arrancar una búsqueda: define genética, prefijo y cuántas semillas hay.
// Crea los N fenos de una (DS-1 ... DS-28) y los ubica en la mesa por número.
function NuevaBusquedaModal({cycleGenetics,genetics=[],gridW,gridH,onClose,onCreate}){
  const cap=gridW*gridH;
  // El prefijo sale del que se guardó en Genéticas; si no hay, se deduce del nombre.
  const prefijoDe=n=>{const g=(genetics||[]).find(x=>x.name===n);return (g?.pheno_prefix||"").trim().toUpperCase()||genAbbr(n||"");};
  const [gen,setGen]=useState(cycleGenetics[0]?.genetic_name||"");
  const [prefix,setPrefix]=useState(()=>prefijoDe(cycleGenetics[0]?.genetic_name||""));
  const [count,setCount]=useState(cap);
  const [autofill,setAutofill]=useState(true);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState(null);
  const cambiarGen=v=>{setGen(v);setPrefix(prefijoDe(v));};
  const n=Math.max(1,Math.min(999,+count||1));
  const crear=async()=>{
    if(!gen){setErr("Elegí una genética");return;}
    setBusy(true);setErr(null);
    try{ await onCreate({genetic_name:gen,prefix:prefix.trim().toUpperCase()||"F",count:n,autofill}); }
    catch(e){setErr(errMsg(e));setBusy(false);}
  };
  return <Modal title="Nueva búsqueda de fenos" onClose={onClose} z={300}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:12}}>{err}</div>}
    <div style={{fontSize:13,color:C.textSoft,marginBottom:14,lineHeight:1.55}}>
      Cada semilla es un feno distinto. Se crean todos ahora y después les vas asignando esquejes en las bandejas.
    </div>
    <FS label="Genética" value={gen} onChange={e=>cambiarGen(e.target.value)} options={cycleGenetics.map(g=>({value:g.genetic_name,label:g.genetic_name}))}/>
    <div style={{display:"flex",gap:10}}>
      <div style={{flex:1}}><FI label="Prefijo" value={prefix} onChange={e=>setPrefix(e.target.value.slice(0,5))} placeholder="DS"/></div>
      <div style={{width:126}}><NumField label="Cuántos fenos" value={count} onCommit={v=>setCount(Math.max(1,+v||1))} min={1} max={999}/></div>
    </div>
    <div style={{background:C.purpleLight,borderRadius:11,padding:"10px 13px",marginBottom:12,fontSize:12.5,color:C.purple,lineHeight:1.5}}>
      Se van a crear <strong>{prefix.trim().toUpperCase()||"F"}-1</strong> hasta <strong>{prefix.trim().toUpperCase()||"F"}-{n}</strong>.
    </div>
    <div onClick={()=>setAutofill(a=>!a)} style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"9px 12px",borderRadius:11,cursor:"pointer",background:C.bg,border:`1px solid ${autofill?C.green+"55":C.border}`}}>
      <div style={{width:34,height:20,borderRadius:99,background:autofill?C.green:C.borderStrong,position:"relative",flexShrink:0}}>
        <div style={{position:"absolute",top:3,left:autofill?17:3,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:12.5,fontWeight:800,color:autofill?C.green:C.textMid}}>Ubicar en la mesa por número</div>
        <div style={{fontSize:11,color:C.textSoft,lineHeight:1.4}}>Cuenta desde abajo a la izquierda: el 1 va en A{gridH} y el {cap} en {COL_LETTERS[gridW-1]}1.</div>
      </div>
    </div>
    {n>cap&&autofill&&<div style={{background:C.amberLight,color:C.amber,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12,lineHeight:1.45}}>La mesa tiene {cap} lugares y pediste {n} fenos. Se ubican los primeros {cap}; el resto queda creado sin lugar.</div>}
    <div style={{display:"flex",gap:10}}>
      <Btn onClick={crear} disabled={busy} style={{flex:1}}>{busy?"Creando...":"Crear búsqueda"}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={busy} style={{flex:1}}>Cancelar</Btn>
    </div>
  </Modal>;
}

// POT EDITOR
function PotEditor({roomId,potLabel,cycle,genetics,cycleGenetics,user,onClose,onSaved,pool=[],cycleCells=[],phenoAll={},inSheet=false}){
  const pot=ROOM_POTS[roomId]?.find(p=>p.label===potLabel);
  const isAdmin=user?.role==="admin";
  const W0=pot?.circular?3:4, H0=pot?.circular?4:6;
  const [gridW,setGridW]=useState(W0);
  const [gridH,setGridH]=useState(H0);
  const [cells,setCells]=useState(()=>Array(W0*H0).fill(null));
  const [brush,setBrush]=useState(cycleGenetics[0]?.genetic_name||null);
  // Pincel "por ubicar": una línea de la tanda que llegó de VG (genética + feno si tiene).
  const [brushPool,setBrushPool]=useState(()=>pool.find(p=>p.left>0)?.key||null);
  const [potId,setPotId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toastLocal,setToastLocal]=useState(null);
  const [editing,setEditing]=useState(false);   // arranca en modo lectura: no se pinta hasta tocar "Editar"
  const [snapshot,setSnapshot]=useState(null);   // copia para poder Cancelar sin perder lo guardado
  const [showSize,setShowSize]=useState(false);
  const [showOtras,setShowOtras]=useState(false);
  // Búsqueda de fenos: el modo queda prendido en la mesa hasta que un admin lo apague.
  const [phenoMode,setPhenoMode]=useState(false);
  const [cellPhenos,setCellPhenos]=useState(()=>Array(W0*H0).fill(null)); // pheno_id por celda
  const [cellLabels,setCellLabels]=useState(()=>Array(W0*H0).fill(null)); // feno escrito a mano (sin id)
  const [phenoMap,setPhenoMap]=useState({});    // id -> feno de la búsqueda de esta mesa
  const [hunt,setHunt]=useState(null);          // búsqueda activa en esta mesa
  const [huntPhenos,setHuntPhenos]=useState([]);// los N fenos de esa búsqueda, ordenados
  const [showNueva,setShowNueva]=useState(false);
  const [brushPheno,setBrushPheno]=useState(null); // en modo feno el pincel es un feno
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});

  // Carga la búsqueda de esta mesa y todos sus fenos.
  const reloadHunt=useCallback(async(pid)=>{
    if(!pid)return;
    try{
      const hs=await db.query("pheno_hunts",`pot_id=eq.${sid(pid)}&order=created_at.desc`);
      const h=hs[0]||null;
      setHunt(h);
      if(!h){setHuntPhenos([]);setPhenoMap({});return;}
      const ps=await db.query("phenos",`hunt_id=eq.${sid(h.id)}&order=number.asc`);
      setHuntPhenos(ps);
      const m={};ps.forEach(p=>{m[sid(p.id)]=p;});setPhenoMap(m);
      setBrushPheno(prev=>prev&&ps.some(p=>sid(p.id)===prev)?prev:(ps[0]?sid(ps[0].id):null));
    }catch{ setHunt(null);setHuntPhenos([]); }
  },[]);

  useEffect(()=>{
    db.query("pots",`room_id=eq.${roomId}&pot_label=eq.${potLabel}`).then(async pots=>{
      let p=pots[0];
      if(!p){
        // Auto-crear la fila del macetón si no existe
        try{const ins=await db.insert("pots",{room_id:roomId,pot_label:potLabel,circular:!!pot?.circular,grid_w:W0,grid_h:H0});p=ins[0];}catch(e){setToastLocal(errMsg(e));return;}
      }
      setPotId(p.id);
      setPhenoMode(!!p.pheno_mode);
      const w=p.grid_w||W0, h=p.grid_h||H0;
      setGridW(w); setGridH(h);
      db.query("pot_cells",`pot_id=eq.${p.id}&cycle_id=eq.${cycle.id}&order=cell_index.asc`).then(existingCells=>{
        const arr=Array(w*h).fill(null), ph=Array(w*h).fill(null), lb=Array(w*h).fill(null);
        existingCells.forEach(c=>{if(c.cell_index<arr.length){arr[c.cell_index]=c.genetic_name;ph[c.cell_index]=sid(c.pheno_id);lb[c.cell_index]=c.pheno_label||null;}});
        setCells(arr);setCellPhenos(ph);setCellLabels(lb);
      }).catch(()=>{});
      reloadHunt(p.id);
    }).catch(e=>setToastLocal(errMsg(e)));
  },[roomId,potLabel,cycle.id,reloadHunt]);

  // Al cambiar el tamaño de la grilla, conservamos lo que ya estaba cargado (recorta o agrega vacías).
  const updateGrid=(w,h)=>{
    const remap=prev=>{const n=Array(w*h).fill(null);for(let r=0;r<Math.min(h,gridH);r++)for(let c=0;c<Math.min(w,gridW);c++)n[r*w+c]=prev[r*gridW+c]||null;return n;};
    setCells(remap);setCellPhenos(remap);setCellLabels(remap);
    setGridW(w);setGridH(h);
  };

  // ── Por ubicar: lo que llegó de VG menos lo que ya está en otras mesas y en esta ──
  const keyAt=i=>poolKey(cells[i],cellPhenos[i],cellLabels[i]);
  const elsewhere={};
  cycleCells.forEach(c=>{if(!c.genetic_name||!potId||sid(c.pot_id)===sid(potId))return;const k=poolKey(c.genetic_name,c.pheno_id,c.pheno_label);elsewhere[k]=(elsewhere[k]||0)+1;});
  const here={};cells.forEach((g,i)=>{if(!g)return;const k=keyAt(i);here[k]=(here[k]||0)+1;});
  const poolItems=(potId?pool:[]).map(p=>({...p,left:Math.max(0,p.arrived-(elsewhere[p.key]||0)-(here[p.key]||0))}));
  const poolLeft=poolItems.reduce((a,p)=>a+p.left,0);
  const fenoDe=(pid,lab)=>pid?(phenoMap[sid(pid)]?.code||phenoAll[sid(pid)]?.code||"Feno"):(lab||null);

  const setCell=(i,g,pid,lab)=>{
    setCells(prev=>{const n=[...prev];n[i]=g;return n;});
    setCellPhenos(prev=>{const n=[...prev];n[i]=pid||null;return n;});
    setCellLabels(prev=>{const n=[...prev];n[i]=lab||null;return n;});
  };
  const paint=i=>{
    if(!editing)return;
    if(phenoMode&&hunt){
      // El pincel es un feno concreto. Volver a tocar la misma celda la vacía.
      const ya=cellPhenos[i]===brushPheno;
      const p=phenoMap[brushPheno];
      setCell(i,ya?null:(p?.genetic_name||hunt.genetic_name),ya?null:brushPheno,null);
      return;
    }
    if(brushPool){
      const it=poolItems.find(p=>p.key===brushPool);if(!it)return;
      if(cells[i]&&keyAt(i)===it.key){setCell(i,null,null,null);return;}   // tocar de nuevo la saca
      if(it.left<=0){const f=fenoDe(it.pheno_id,it.pheno_label);setToastLocal(`No quedan más ${it.genetic_name}${f?` ${f}`:""} por ubicar`);return;}
      setCell(i,it.genetic_name,it.pheno_id,it.pheno_label);
      return;
    }
    const borrando=brush!==null&&cells[i]===brush&&!cellPhenos[i]&&!cellLabels[i];
    setCell(i,borrando?null:brush,null,null);
  };
  // Crea la búsqueda y sus N fenos, y opcionalmente los ubica por número en la mesa.
  const crearBusqueda=async({genetic_name,prefix,count,autofill})=>{
    if(!potId)throw new Error("La mesa todavía no terminó de cargar");
    const hs=await db.insert("pheno_hunts",{
      genetic_name,prefix,total:count,room_id:roomId,pot_id:sid(potId),pot_label:potLabel,
      cycle_id:sid(cycle.id),start_date:todayISO,created_by:user?.name||"sistema",
    });
    const h=hs[0];
    const filas=Array.from({length:count},(_,k)=>({
      hunt_id:sid(h.id), code:phenoCode(prefix,k+1), prefix, number:k+1,
      genetic_name, status:"activo",
      seed_room_id:roomId, seed_pot_id:sid(potId), seed_pot_label:potLabel,
      cycle_id:sid(cycle.id), created_by:user?.name||"sistema", updated_at:new Date().toISOString(),
    }));
    const ps=await db.insert("phenos",filas);
    if(autofill){
      const nc=[...cells], np=[...cellPhenos], nl=[...cellLabels];
      ps.forEach(p=>{
        const idx=seedIndex(p.number,gridW,gridH);
        if(idx<0||idx>=nc.length)return;        // más fenos que lugares: quedan sin ubicar
        nc[idx]=genetic_name; np[idx]=sid(p.id); nl[idx]=null;
      });
      setCells(nc);setCellPhenos(np);setCellLabels(nl);
    }
    setHunt(h);setHuntPhenos(ps);
    const m={};ps.forEach(p=>{m[sid(p.id)]=p;});setPhenoMap(m);
    setBrushPheno(ps[0]?sid(ps[0].id):null);
    setPhenoMode(true);
    try{await db.update("pots",potId,{pheno_mode:true});}catch{/* se reintenta al guardar */}
    setShowNueva(false);
    setToastLocal(autofill?`${ps.length} fenos creados y ubicados. Tocá Guardar para confirmar.`:`${ps.length} fenos creados.`);
  };

  const startEdit=()=>{setSnapshot({cells:[...cells],cellPhenos:[...cellPhenos],cellLabels:[...cellLabels],gridW,gridH,phenoMode});setEditing(true);};
  const cancelEdit=()=>{if(snapshot){setCells(snapshot.cells);setCellPhenos(snapshot.cellPhenos);setCellLabels(snapshot.cellLabels);setGridW(snapshot.gridW);setGridH(snapshot.gridH);setPhenoMode(snapshot.phenoMode);}setEditing(false);setShowSize(false);};

  const save=async()=>{
    if(!potId){setToastLocal("Cargando la mesa, esperá un segundo y reintentá");return;}
    setSaving(true);
    try{
      await db.update("pots",potId,{grid_w:gridW,grid_h:gridH,pheno_mode:phenoMode});
      // Los fenos ya existen: acá solo se guarda en qué celda está cada uno.
      // El feno viaja con la planta aunque la mesa no esté en modo búsqueda.
      await db.deleteQuery("pot_cells",`pot_id=eq.${potId}&cycle_id=eq.${cycle.id}`);
      const anyLab=cellLabels.some(Boolean);
      const newCells=cells.map((g,i)=>{
        const r={pot_id:potId,cycle_id:cycle.id,cell_index:i,genetic_name:g,pheno_id:cellPhenos[i]||null,updated_at:new Date().toISOString()};
        if(anyLab)r.pheno_label=cellLabels[i]||null;
        return r;
      }).filter(c=>c.genetic_name);
      if(newCells.length>0)await db.insert("pot_cells",newCells);
      if(phenoMode&&hunt)await logA(user?.name||"sistema",`Fenos actualizados en ${roomId} · Mesa ${potLabel}`,"phenos");
      onSaved();
    }catch(e){setToastLocal(errMsg(e));setSaving(false);}
  };

  const togglePheno=async()=>{
    if(!phenoMode&&!hunt){setShowNueva(true);return;}   // sin búsqueda todavía: hay que crearla
    const next=!phenoMode;
    setPhenoMode(next);
    if(potId){try{await db.update("pots",potId,{pheno_mode:next});}catch{/* queda en pantalla */}}
  };

  // Resumen: genéticas presentes y, adentro, los fenos que viajaron con la planta.
  const summary={};
  cells.forEach((g,i)=>{if(!g)return;const s=summary[g]=summary[g]||{n:0,f:{}};s.n++;const f=fenoDe(cellPhenos[i],cellLabels[i]);if(f)s.f[f]=(s.f[f]||0)+1;});
  const sumRows=Object.entries(summary).sort((a,b)=>b[1].n-a[1].n);
  const total=cells.filter(Boolean).length;
  const ubicados=new Set(cellPhenos.filter(Boolean)).size;
  const sinUbicar=hunt?huntPhenos.filter(p=>!cellPhenos.includes(sid(p.id))).length:0;

  const chip=(on,col,children,onClick,key)=><button key={key} onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
    background:on?col:`${col}1F`,color:on?inkFill(col):inkOn(col),border:`1.5px solid ${col}`}}>{children}</button>;
  const lbl=t=><div style={{fontSize:12.5,fontWeight:800,color:C.textSoft,margin:"2px 0 7px"}}>{t}</div>;
  const wrap=inSheet?{}:{marginTop:16,background:C.surfaceAlt,borderRadius:14,border:`1px solid ${editing?C.green+"66":C.border}`,padding:16};
  const sz=phenoMode?36:34;

  return <div style={wrap}>
    {toastLocal&&<Toast msg={toastLocal} type="error" onClose={()=>setToastLocal(null)}/>}
    {showNueva&&<NuevaBusquedaModal cycleGenetics={cycleGenetics} genetics={genetics} gridW={gridW} gridH={gridH} onClose={()=>setShowNueva(false)} onCreate={crearBusqueda}/>}

    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
      <span style={{width:46,height:46,borderRadius:pot?.circular?"50%":14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:editing?C.greenLight:C.surfaceAlt,color:editing?C.green:C.text,fontSize:21,fontWeight:800}}>{potLabel}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>Mesa {potLabel}</div>
        <div style={{fontSize:13,color:editing?C.green:C.textSoft,fontWeight:700}}>{editing?"Editando":pot?.circular?"Circular":"2 × 1 m"} · {total} planta{total===1?"":"s"}</div>
      </div>
      {isAdmin&&!editing&&<button onClick={startEdit} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:12,padding:"10px 13px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}><Icon n="edit" size={17}/>Editar</button>}
      <button onClick={onClose} aria-label="Cerrar" style={{width:40,height:40,borderRadius:12,border:"none",background:"transparent",color:C.textSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" size={20}/></button>
    </div>

    {/* Por ubicar: lo que llegó de VG a esta sala y todavía no tiene lugar */}
    {poolItems.length>0&&!phenoMode&&(editing||poolLeft>0)&&<div style={{background:C.amberLight,borderRadius:14,padding:"11px 12px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:800,color:C.amber,marginBottom:editing?9:0}}>
        <Icon n="pot" size={18}/>Por ubicar en la sala: {poolLeft}{editing&&<span style={{fontSize:12.5,fontWeight:700,color:C.textMid,marginLeft:4}}>· tocá una y después las celdas</span>}
      </div>
      {!editing&&isAdmin&&<div style={{fontSize:12.5,color:C.textMid,fontWeight:600,marginTop:3}}>Tocá Editar y usalas como pincel.</div>}
      {editing&&<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {poolItems.map(it=>{const col=genMap[it.genetic_name]||C.green;const f=fenoDe(it.pheno_id,it.pheno_label);const on=brushPool===it.key;
          return chip(on,col,<>{it.genetic_name}{f&&<span style={{fontSize:11,fontWeight:800,padding:"1px 6px",borderRadius:99,background:on?"rgba(255,255,255,0.3)":C.purpleLight,color:on?inkFill(col):C.purple}}>{f}</span>}<span style={{fontVariantNumeric:"tabular-nums",opacity:it.left?1:0.6}}>{it.left}</span></>,()=>{setBrushPool(it.key);setBrush(it.genetic_name);},it.key);})}
      </div>}
    </div>}

    {/* Búsqueda de fenos: cada semilla es un feno numerado (DS-1, DS-2...) */}
    {isAdmin&&<button onClick={togglePheno} style={{display:"flex",alignItems:"center",gap:12,width:"100%",marginBottom:12,padding:"10px 12px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",background:phenoMode?C.purpleLight:C.surfaceAlt,border:`1px solid ${phenoMode?C.purple+"55":C.border}`}}>
      <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:phenoMode?C.purple:C.surface,color:phenoMode?"#fff":C.textMid}}><Icon n="flask" size={18}/></span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:14,fontWeight:800,color:phenoMode?C.purple:C.text}}>Búsqueda de fenos</span>
        <span style={{display:"block",fontSize:12,color:C.textSoft,fontWeight:600}}>{hunt?`${hunt.prefix}-1 a ${hunt.prefix}-${hunt.total} · ${hunt.genetic_name}`:"Tocá para arrancar una búsqueda de semillas"}</span>
      </span>
      <span style={{width:38,height:22,borderRadius:99,background:phenoMode?C.purple:C.borderStrong,position:"relative",flexShrink:0}}>
        <span style={{position:"absolute",top:3,left:phenoMode?19:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}/>
      </span>
    </button>}
    {phenoMode&&hunt&&<div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:13,color:C.textSoft,fontWeight:600,margin:"-4px 2px 12px"}}>
      <span><b style={{color:C.text}}>{ubicados}</b> de {hunt.total} ubicados</span>
      {sinUbicar>0&&<span style={{color:C.amber,fontWeight:800}}>{sinUbicar} sin lugar</span>}
    </div>}

    {editing&&phenoMode&&hunt&&<div style={{marginBottom:12}}>
      {lbl("Tocá un feno y después las celdas donde va")}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",maxHeight:150,overflowY:"auto"}}>
        {huntPhenos.map(p=>{
          const pid=sid(p.id);const n=cellPhenos.filter(x=>x===pid).length;const on=brushPheno===pid;
          return <button key={pid} onClick={()=>setBrushPheno(pid)} title={p.code}
            style={{minWidth:40,padding:"7px 8px",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
              background:on?C.purple:(n>0?C.purpleLight:C.surfaceAlt),color:on?"#fff":(n>0?C.purple:C.textSoft),
              border:`1.5px solid ${on?C.purple:(n>0?C.purple+"55":C.border)}`}}>{p.number}{n>1?<sup style={{fontSize:8.5}}>×{n}</sup>:null}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:8,marginTop:9,flexWrap:"wrap"}}>
        <button onClick={()=>{const nc=[...cells],np=[...cellPhenos],nl=[...cellLabels];huntPhenos.forEach(p=>{const idx=seedIndex(p.number,gridW,gridH);if(idx>=0&&idx<nc.length){nc[idx]=p.genetic_name;np[idx]=sid(p.id);nl[idx]=null;}});setCells(nc);setCellPhenos(np);setCellLabels(nl);}}
          style={{padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",background:C.purpleLight,color:C.purple,border:`1px solid ${C.purple}55`}}>Ubicar por número</button>
        <button onClick={()=>{setCells(Array(gridW*gridH).fill(null));setCellPhenos(Array(gridW*gridH).fill(null));setCellLabels(Array(gridW*gridH).fill(null));}}
          style={{padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:C.surfaceAlt,color:C.textMid,border:`1px solid ${C.border}`}}>Limpiar</button>
      </div>
    </div>}

    {editing&&!phenoMode&&(()=>{
      // Si llegó stock de VG, los pinceles son esos (arriba, una sola vez). Las genéticas
      // del ciclo que no vinieron de VG quedan en "Otras genéticas".
      const poolGen=new Set(poolItems.map(p=>p.genetic_name));
      const otras=cycleGenetics.filter(g=>!poolGen.has(g.genetic_name));
      const genChips=list=>list.map(g=>{const col=genMap[g.genetic_name]||C.green;return chip(!brushPool&&brush===g.genetic_name,col,g.genetic_name,()=>{setBrushPool(null);setBrush(g.genetic_name);},g.genetic_name);});
      const tool=(on,children,onClick,key)=><button key={key} onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:on?C.greenLight:C.surfaceAlt,color:on?C.green:C.textMid,border:`1px solid ${on?C.green:C.border}`}}>{children}</button>;
      const hayPool=poolItems.length>0;
      return <div style={{marginBottom:12}}>
        {!hayPool&&cycleGenetics.length>0&&<>{lbl("Genéticas del ciclo")}<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>{genChips(cycleGenetics)}</div></>}
        {hayPool&&showOtras&&otras.length>0&&<>{lbl("Otras genéticas del ciclo")}<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>{genChips(otras)}</div></>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {chip(!brushPool&&brush===null,C.red,"Borrar",()=>{setBrushPool(null);setBrush(null);},"__borrar__")}
          {!brushPool&&brush&&tool(false,`Llenar con ${brush}`,()=>{setCells(Array(gridW*gridH).fill(brush));setCellPhenos(Array(gridW*gridH).fill(null));setCellLabels(Array(gridW*gridH).fill(null));},"llenar")}
          {tool(false,"Limpiar",()=>{setCells(Array(gridW*gridH).fill(null));setCellPhenos(Array(gridW*gridH).fill(null));setCellLabels(Array(gridW*gridH).fill(null));},"limpiar")}
          {tool(showSize,<><Icon n="sliders" size={15}/>Medidas {gridW}×{gridH}</>,()=>setShowSize(s=>!s),"medidas")}
          {hayPool&&otras.length>0&&tool(showOtras,`Otras genéticas (${otras.length})`,()=>setShowOtras(s=>!s),"otras")}
        </div>
      </div>;
    })()}
    {editing&&(showSize||phenoMode)&&<div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      {[{l:"Ancho",v:gridW,set:v=>updateGrid(v===""?1:v,gridH),max:pot?.circular?4:8},{l:"Largo",v:gridH,set:v=>updateGrid(gridW,v===""?1:v),max:pot?.circular?4:10}].map(f=><label key={f.l} style={{display:"flex",alignItems:"center",gap:6,fontSize:13.5,fontWeight:700,color:C.textMid}}>
        {f.l}<NumField value={f.v} onCommit={f.set} min={1} max={f.max} compact/>
      </label>)}
      <span style={{fontSize:13,color:C.textSoft,fontWeight:700}}>{total}/{gridW*gridH} lugares</span>
    </div>}

    <div style={{overflowX:"auto",display:"flex",justifyContent:"center",padding:"4px 0"}}>
      {/* En modo feno cada celda muestra el número del feno, como en el cuaderno */}
      <div style={{display:"inline-grid",gridTemplateColumns:phenoMode?`16px repeat(${gridW},${sz}px)`:`repeat(${gridW},${sz}px)`,gap:5,alignItems:"center",justifyItems:"center"}}>
        {phenoMode&&<span/>}
        {phenoMode&&Array.from({length:gridW},(_,c)=><span key={"ch"+c} style={{fontSize:10,fontWeight:800,color:C.textSoft}}>{COL_LETTERS[c]||"?"}</span>)}
        {cells.map((cell,i)=>{
          const first=phenoMode&&i%gridW===0;
          const ph=cellPhenos[i]?(phenoMap[cellPhenos[i]]||phenoAll[cellPhenos[i]]):null;
          const sel=phenoMode&&editing&&cellPhenos[i]&&cellPhenos[i]===brushPheno;
          const conFeno=!phenoMode&&(cellPhenos[i]||cellLabels[i]);
          const txt=phenoMode?(ph?ph.number:null):(ph?ph.number:(cellLabels[i]?String(cellLabels[i]).slice(0,4):null));
          const box=<div key={i} onClick={()=>paint(i)} title={ph?.code||cellLabels[i]||(phenoMode?`Vacío · pos ${seedNum(i,gridW,gridH)}`:"")}
            style={{width:sz,height:sz,borderRadius:8,cursor:editing?"pointer":"default",background:cell?genMap[cell]||C.green:C.surfaceAlt,
              border:`2px solid ${sel||conFeno?C.purple:(cell?"transparent":C.borderStrong)}`,transition:"background 0.08s",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:txt&&String(txt).length>2?9.5:12.5,fontWeight:800,color:cell?"rgba(0,0,0,0.72)":C.textSoft,letterSpacing:"-0.03em",overflow:"hidden"}}>
            {txt!=null?txt:(phenoMode?<span style={{fontSize:9,opacity:0.5,fontWeight:600}}>{seedNum(i,gridW,gridH)}</span>:(cell?<span style={{width:9,height:9,borderRadius:"50%",background:"rgba(255,255,255,0.45)"}}/>:null))}
          </div>;
          return first?[<span key={"rh"+i} style={{fontSize:10,fontWeight:800,color:C.textSoft}}>{Math.floor(i/gridW)+1}</span>,box]:box;
        })}
      </div>
    </div>
    {phenoMode&&<div style={{fontSize:12,color:C.textSoft,marginTop:6,lineHeight:1.45,textAlign:"center"}}>Los números se cuentan desde abajo a la izquierda, como en el cuaderno.</div>}
    {!phenoMode&&cells.some((c,i)=>c&&(cellPhenos[i]||cellLabels[i]))&&<div style={{fontSize:12,color:C.textSoft,marginTop:6,textAlign:"center"}}>Borde violeta: la planta lleva su feno.</div>}

    <div style={{marginTop:12,borderTop:`1px solid ${C.border}`}}>
      {sumRows.length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"12px 0 0"}}>{editing?"Elegí un pincel arriba y tocá las celdas.":"Esta mesa todavía no tiene plantas cargadas."}</div>}
      {sumRows.map(([g,s],k)=><div key={g} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderTop:k?`1px solid ${C.border}`:"none"}}>
        <span style={{width:10,alignSelf:"stretch",minHeight:26,borderRadius:4,background:genMap[g]||C.green,flexShrink:0}}/>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:"block",fontSize:14.5,fontWeight:800,color:C.text}}>{g}</span>
          {Object.keys(s.f).length>0&&<span style={{display:"block",fontSize:12,color:C.purple,fontWeight:700}}>{Object.entries(s.f).map(([f,n])=>n>1?`${f} ×${n}`:f).join(" · ")}</span>}
        </span>
        <span style={{fontSize:20,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{s.n}</span>
      </div>)}
    </div>

    {editing&&<div style={{display:"flex",gap:10,marginTop:14}}>
      <Btn onClick={save} disabled={saving} style={{flex:1,minHeight:48}}>{saving?"Guardando...":"Guardar mesa"}</Btn>
      <Btn onClick={cancelEdit} v="secondary" disabled={saving} style={{flex:1,minHeight:48}}>Cancelar</Btn>
    </div>}
  </div>;
}
// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIOS — formato nuevo: hoja inferior, opciones tocables, sin emojis.
// ══════════════════════════════════════════════════════════════════════════════
// Colores de genética muy claros (amarillo, rosa, celeste) no se leen como texto:
// en esos casos el texto va oscuro y el color queda en el borde y el fondo.
const isLightColor=hex=>{const h=String(hex||"").replace("#","");if(h.length<6)return false;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (0.299*r+0.587*g+0.114*b)>165;};
const inkOn=col=>isLightColor(col)?C.text:col;                  // texto sobre fondo teñido
const inkFill=col=>isLightColor(col)?"#17201C":"#FFFFFF";       // texto sobre el color lleno
const ErrBox=({err})=>err?<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:13,fontWeight:600,marginBottom:10,lineHeight:1.45}}>{err}</div>:null;
const FLabel=({children,style})=><div style={{fontSize:13,fontWeight:800,color:C.textSoft,margin:"12px 0 7px",...style}}>{children}</div>;
function Pills({options,value,onChange,col,multi=false}){
  const c=col||C.green;
  return <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
    {options.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];const on=multi?(value||[]).includes(v):value===v;
      return <button key={String(v)} type="button" onClick={()=>onChange(v)} style={{padding:"9px 14px",borderRadius:99,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",background:on?c:C.surface,color:on?C.onAccent:C.textMid,border:`1.5px solid ${on?c:C.border}`}}>{l}</button>;})}
  </div>;
}
const SheetActions=({onSave,onCancel,saving,label="Guardar",busyLabel="Guardando...",disabled})=><div style={{display:"flex",gap:10,marginTop:14}}>
  <Btn onClick={onSave} disabled={saving||disabled} style={{flex:1,minHeight:48}}>{saving?busyLabel:label}</Btn>
  <Btn onClick={onCancel} v="secondary" disabled={saving} style={{flex:1,minHeight:48}}>Cancelar</Btn>
</div>;
const roomLabel=r=>r==="S1"?"Sala 1":r==="S2"?"Sala 2":r==="Vegetativo"?"Vege":r;

// Productos: los que más usás (según lo registrado) y los de siempre, tocables. "Otro" para escribir.
const NUTRI_BASE=["Zoil Monkey","Humus de lombriz","Compost","Harina de alfalfa","Yeso agrícola","Harina de roca","Melaza","Micorrizas","Bioestimulante radicular","ACT (té de compost)"];
const FOLIAR_BASE=["Mamboretá","Neem","Silicio","Bt","Jabón potásico"];
function ProductPicker({kind,value,onChange}){
  const [recent,setRecent]=useState([]);
  const [otro,setOtro]=useState("");
  useEffect(()=>{
    db.query("nutrition_logs","select=products,application_type&order=logged_at.desc.nullslast&limit=80").then(rows=>{
      const cnt={};
      (rows||[]).filter(r=>kind==="foliar"?r.application_type==="foliar":r.application_type!=="foliar")
        .forEach(r=>String(r.products||"").split(/\s*[+,;]\s*/).map(s=>s.trim()).filter(Boolean).forEach(p=>{cnt[p]=(cnt[p]||0)+1;}));
      setRecent(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([p])=>p).slice(0,8));
    }).catch(()=>{});
  },[kind]);
  const seen=new Set();
  const opts=[...recent,...(kind==="foliar"?FOLIAR_BASE:NUTRI_BASE),...value].filter(p=>{const k=p.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  const toggle=p=>onChange(value.includes(p)?value.filter(x=>x!==p):[...value,p]);
  const add=()=>{const p=otro.trim();if(!p)return;if(!value.some(x=>x.toLowerCase()===p.toLowerCase()))onChange([...value,p]);setOtro("");};
  return <>
    <Pills options={opts} value={value} onChange={toggle} multi/>
    <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
      <input value={otro} onChange={e=>setOtro(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} placeholder="Otro producto" style={{flex:1,minWidth:0,padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:15,fontFamily:"inherit",outline:"none"}}/>
      <button type="button" onClick={add} disabled={!otro.trim()} aria-label="Agregar producto" style={{width:44,height:44,borderRadius:12,border:"none",background:otro.trim()?C.green:C.surfaceAlt,color:otro.trim()?C.onAccent:C.textSoft,cursor:otro.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="plus" size={20}/></button>
    </div>
  </>;
}

// MODALS
function WaterModal({roomId,user,onClose,onSaved}){
  const [method,setMethod]=useState(roomId==="S1"?"automático":"manual");
  const [duration,setDuration]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{setSaving(true);setErr(null);try{await db.insert("watering_logs",{room_id:roomId,method,duration_minutes:duration?+duration:null,notes:notes||null,logged_by:user.name,logged_at:new Date().toISOString()});onSaved();}catch(e){setErr(errMsg(e));setSaving(false);}};
  return <Sheet title="Registrar riego" sub={roomLabel(roomId)} onClose={onClose}>
    <ErrBox err={err}/>
    <FLabel style={{marginTop:4}}>Cómo</FLabel>
    <Pills options={[["automático","Automático"],["manual","Manual"]]} value={method} onChange={setMethod}/>
    <FLabel>Duración</FLabel>
    <Pills options={[5,10,15,20,30].map(n=>[String(n),`${n} min`])} value={String(duration)} onChange={v=>setDuration(String(duration)===v?"":v)}/>
    <div style={{marginTop:10}}><NumField label="Otra duración (min)" value={duration} onCommit={v=>setDuration(v===""?"":String(v))} min={0} max={600} placeholder="Ej: 12"/></div>
    <FI label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional"/>
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label="Registrar riego"/>
  </Sheet>;
}
function NutriModal({roomId,cycleId,user,onClose,onSaved}){
  const [prods,setProds]=useState([]);
  const [dose,setDose]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(!prods.length){setErr("Elegí al menos un producto.");return;}
    setSaving(true);setErr(null);
    try{await db.insert("nutrition_logs",{room_id:roomId,cycle_id:cycleId,products:prods.join(" + "),dose:dose||null,notes:notes||null,logged_by:user.name,logged_at:new Date().toISOString()});onSaved();}
    catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title="Registrar nutrición" sub={roomLabel(roomId)} onClose={onClose}>
    <ErrBox err={err}/>
    <FLabel style={{marginTop:4}}>Qué aplicaste</FLabel>
    <ProductPicker kind="nutricion" value={prods} onChange={setProds}/>
    <div style={{marginTop:12}}><FI label="Dosis" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ej: 5 ml/L, 10 L por cama"/></div>
    <FI label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional"/>
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label={prods.length?`Registrar (${prods.length})`:"Registrar"}/>
  </Sheet>;
}
function FoliarModal({roomId,cycleId,user,onClose,onSaved}){
  const [prods,setProds]=useState([]);
  const [dose,setDose]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(!prods.length){setErr("Elegí al menos un producto.");return;}
    setSaving(true);setErr(null);
    try{
      await db.insert("nutrition_logs",{room_id:roomId,cycle_id:cycleId,products:prods.join(" + "),dose:dose||null,notes:notes||null,application_type:"foliar",logged_by:user.name,logged_at:new Date().toISOString()});
      await logA(user.name,`Aplicación foliar en ${roomId}`,"foliar");
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title="Aplicación foliar" sub={roomLabel(roomId)} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,borderRadius:12,padding:"10px 12px",fontSize:13.5,color:C.textMid,fontWeight:600,margin:"4px 0 2px"}}><Icon n="moon" size={18}/>Con las luces apagadas.</div>
    <FLabel>Qué aplicaste</FLabel>
    <ProductPicker kind="foliar" value={prods} onChange={setProds}/>
    <div style={{marginTop:12}}><FI label="Dosis" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ej: 5 ml/L"/></div>
    <FI label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional"/>
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label={prods.length?`Registrar (${prods.length})`:"Registrar"}/>
  </Sheet>;
}
function ClimateModal({roomId,user,onClose,onSaved}){
  const [temp,setTemp]=useState("");
  const [hum,setHum]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(temp===""&&hum===""){setErr("Cargá al menos temperatura o humedad.");return;}
    setSaving(true);setErr(null);
    try{
      await db.insert("climate_logs",{room_id:roomId,temperature:temp===""?null:+temp,humidity:hum===""?null:+hum,source:"manual",recorded_by:user.name,recorded_at:new Date().toISOString()});
      await logA(user.name,`Midió clima en ${roomId}`,"clima");
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title="Medición de clima" sub={`${roomLabel(roomId)} · se guarda con la hora de ahora`} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{display:"flex",gap:10,marginTop:4}}>
      <div style={{flex:1}}><NumField label="Temperatura (°C)" value={temp} onCommit={setTemp} min={-10} max={60} placeholder="Ej: 24"/></div>
      <div style={{flex:1}}><NumField label="Humedad (%)" value={hum} onCommit={setHum} min={0} max={100} placeholder="Ej: 55"/></div>
    </div>
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label="Registrar"/>
  </Sheet>;
}
function PhaseModal({roomId,cycle,rc,user,onClose,onSaved}){
  const fdays=rc?.flower_days||65;
  const vdays=rc?.veg_days||30;
  const [phase,setPhase]=useState(cycle?.phase||"vegetativo");
  const [flowerStart,setFlowerStart]=useState(cycle?.phase==="floración"?(cycle?.flower_start||todayISO):todayISO);
  const [estimatedHarvest,setEstimatedHarvest]=useState(cycle?.phase==="floración"&&cycle?.estimated_harvest?cycle.estimated_harvest:addDays(todayISO,fdays));
  const [vegStart,setVegStart]=useState(cycle?.veg_start||todayISO);
  const [vegEnd,setVegEnd]=useState(cycle?.veg_end||addDays(todayISO,vdays));
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    setSaving(true);setErr(null);
    try{
      const vegData={veg_start:phase==="vegetativo"?vegStart:cycle?.veg_start||null,veg_end:phase==="vegetativo"?vegEnd:cycle?.veg_end||null};
      if(cycle){await db.update("cycles",cycle.id,{phase,flower_start:phase==="floración"?flowerStart:cycle.flower_start,estimated_harvest:phase==="floración"?estimatedHarvest:cycle.estimated_harvest,...vegData});}
      else{await db.insert("cycles",{room_id:roomId,phase,flower_start:flowerStart,estimated_harvest:estimatedHarvest,irrigation_type:rc?.irrigation_type||(roomId==="S1"?"automático":"manual"),active:true,...vegData});}
      if(phase==="floración"){
        const hitos=[{l:"Zoil Monkey 1",t:"nutricion",o:0},{l:"Poda 1 — día 15",t:"poda",o:15},{l:"Zoil Monkey 2",t:"nutricion",o:15},{l:"Poda 2 — día 21",t:"poda",o:21}];
        for(const h of hitos)await db.insert("tasks",{title:`${h.l} ${roomId}`,room_id:roomId,type:h.t,assignee:"Lucas",due_date:addDays(flowerStart,h.o),status:"pendiente",priority:h.t==="poda"?"alta":"normal",auto_generated:true,created_by:"sistema"});
        // Crear hitos del ciclo para que se marquen en la Agenda
        const cycleId=cycle?cycle.id:(await db.query("cycles",`room_id=eq.${roomId}&active=eq.true&order=created_at.desc&limit=1`))[0]?.id;
        if(cycleId){
          const flushDays=rc?.flush_days||20;
          const mhitos=[
            {label:"Inicio floración",date:flowerStart,type:"start"},
            {label:"Poda 1 — día 15",date:addDays(flowerStart,15),type:"poda"},
            {label:"Poda 2 — día 21",date:addDays(flowerStart,21),type:"poda"},
            {label:"Inicio lavado",date:addDays(estimatedHarvest,-flushDays),type:"lavado"},
            {label:"Cosecha estimada",date:estimatedHarvest,type:"cosecha"},
          ];
          const existing=await db.query("cycle_milestones",`cycle_id=eq.${cycleId}`);
          const have=existing.map(e=>e.label);
          for(const m of mhitos)if(!have.includes(m.label))await db.insert("cycle_milestones",{cycle_id:cycleId,label:m.label,due_date:m.date,type:m.type,done:false,auto_generated:true});
        }
      }
      await logA(user.name,`Fase ${roomId} → ${phase}`,"cycle");
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const opts=[["vegetativo","Vegetativo","vege"],["floración","Floración","flower"],["cosechando","Cosechando","harvest"]];
  return <Sheet title={cycle?"Cambiar fase":"Iniciar ciclo"} sub={rc?.display_name||roomId} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{display:"flex",flexDirection:"column",gap:8,margin:"4px 0 12px"}}>
      {opts.map(([k,l,ic])=>{const m=PM[k];const on=phase===k;return <button key={k} onClick={()=>setPhase(k)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:C.text,background:on?C.greenLight:C.surfaceAlt,border:`2px solid ${on?C.green:C.border}`}}>
        <span style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:on?C.green:C.surface,color:on?C.onAccent:m.color}}><Icon n={ic} size={20}/></span>
        <span style={{flex:1,fontSize:16,fontWeight:800}}>{l}{cycle?.phase===k&&<span style={{fontSize:12.5,color:C.textSoft,fontWeight:700}}> · actual</span>}</span>
        {on&&<span style={{color:C.green}}><Icon n="check" size={20} sw={2.4}/></span>}
      </button>;})}
    </div>
    {phase==="vegetativo"&&<div style={{display:"flex",gap:10}}>
      <div style={{flex:1}}><FI label="Inicio de vege" type="date" value={vegStart} onChange={e=>setVegStart(e.target.value)}/></div>
      <div style={{flex:1}}><FI label="Pasa a flora" type="date" value={vegEnd} onChange={e=>setVegEnd(e.target.value)}/></div>
    </div>}
    {phase==="floración"&&<>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><FI label="Inicio de flora" type="date" value={flowerStart} onChange={e=>{setFlowerStart(e.target.value);setEstimatedHarvest(addDays(e.target.value,fdays));}}/></div>
        <div style={{flex:1}}><FI label="Cosecha estimada" type="date" value={estimatedHarvest} onChange={e=>setEstimatedHarvest(e.target.value)}/></div>
      </div>
      {cycle?.phase!=="floración"&&<div style={{fontSize:13,color:C.textSoft,fontWeight:600,lineHeight:1.45}}>Se crean solas las tareas de poda (día 15 y 21) y de Zoil Monkey · {fdays} días de flora.</div>}
    </>}
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label="Confirmar"/>
  </Sheet>;
}
// Editor de objetivos de clima por etapa (temp y humedad, por sala). VPD fijo.
function TargetsModal({roomId,rc,cycle,user,onClose,onSaved}){
  const stages=roomId==="Vegetativo"?["vege"]:CLIMA_FLOWER_STAGES;
  const activeStage=climaStageFor(roomId,cycle,rc);
  const roomName=rc?.display_name||(roomId==="S1"?"Sala 1":roomId==="S2"?"Sala 2":roomId);
  const [vals,setVals]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  useEffect(()=>{
    let alive=true;
    db.query("climate_targets",`room_id=eq.${encodeURIComponent(roomId)}`).then(rows=>{
      if(!alive)return;
      const v={};
      stages.forEach(s=>{
        const row=(rows||[]).find(r=>r.stage===s);
        const def=TARGET_DEFAULTS[s]||TARGET_DEFAULTS.veg;
        v[s]={
          _id:row?.id??null,
          temp_min:row?.temp_min!=null?+row.temp_min:def.temp_min,
          temp_max:row?.temp_max!=null?+row.temp_max:def.temp_max,
          hum_min:row?.hum_min!=null?+row.hum_min:def.hum_min,
          hum_max:row?.hum_max!=null?+row.hum_max:def.hum_max,
        };
      });
      setVals(v);
    }).catch(()=>{
      // Si la tabla todavía no existe, arrancamos con los defaults igual.
      const v={};stages.forEach(s=>{const def=TARGET_DEFAULTS[s]||TARGET_DEFAULTS.veg;v[s]={_id:null,...def};});
      setVals(v);setErr("No pude leer los objetivos guardados. ¿Corriste el SQL? Se muestran los valores por defecto.");
    }).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[roomId]);
  const setField=(s,k,n)=>setVals(v=>({...v,[s]:{...v[s],[k]:n===""?null:n}}));
  const save=async()=>{
    setSaving(true);setErr(null);
    try{
      for(const s of stages){
        const d=vals[s];
        const payload={room_id:roomId,stage:s,temp_min:d.temp_min,temp_max:d.temp_max,hum_min:d.hum_min,hum_max:d.hum_max,updated_at:new Date().toISOString(),updated_by:user?.name||null};
        if(d._id)await db.update("climate_targets",d._id,payload);
        else await db.insert("climate_targets",payload);
      }
      await logA(user?.name||"?",`Objetivos de clima ${roomName}`,"config");
      onSaved();
    }catch(e){setErr(errMsg(e));}
    finally{setSaving(false);}
  };
  return <Sheet title="Objetivos de clima" sub={roomName} onClose={onClose}>
    <div style={{fontSize:12.5,color:C.textMid,marginBottom:14,lineHeight:1.5}}>Definí el rango ideal de <b>temperatura</b> y <b>humedad</b> para cada etapa. La app usa el objetivo de la etapa en la que está la sala. El <b>VPD</b> es fijo por etapa.</div>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    {loading||!vals?<Spin/>:<>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {stages.map(s=>{const d=vals[s];const vpd=VPD_BY_STAGE[s];const isActive=s===activeStage;return <div key={s} style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 14px",border:`1.5px solid ${isActive?C.green:C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:13.5,fontWeight:800,color:C.text}}>{CLIMA_STAGE_LABEL[s]}</span>
            {isActive&&<Badge label="Etapa actual" color={C.green} bg={C.greenLight}/>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"58px 1fr 1fr",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:12.5,color:C.textMid}}>Temp</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>min</span><NumField compact value={d.temp_min} onCommit={n=>setField(s,"temp_min",n)} min={5} max={40}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>max</span><NumField compact value={d.temp_max} onCommit={n=>setField(s,"temp_max",n)} min={5} max={40}/><span style={{fontSize:12,color:C.textSoft}}>°C</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"58px 1fr 1fr",alignItems:"center",gap:8}}>
            <span style={{fontSize:12.5,color:C.textMid}}>Hum</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>min</span><NumField compact value={d.hum_min} onCommit={n=>setField(s,"hum_min",n)} min={0} max={100}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>max</span><NumField compact value={d.hum_max} onCommit={n=>setField(s,"hum_max",n)} min={0} max={100}/><span style={{fontSize:12,color:C.textSoft}}>%</span></div>
          </div>
          <div style={{fontSize:11.5,color:C.purple,marginTop:9,fontFamily:MONO}}>VPD {vpd.min}–{vpd.max} kPa <span style={{color:C.textSoft,fontFamily:H}}>· fijo</span></div>
        </div>;})}
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar objetivos"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </>}
  </Sheet>;
}
function AddGenModal({cycleId,genetics,existing,counts,onClose,onSaved}){
  const [rows,setRows]=useState(existing);
  const [busy,setBusy]=useState(null);
  const [confirmId,setConfirmId]=useState(null);
  const [err,setErr]=useState(null);
  const avail=genetics.filter(g=>!rows.some(e=>e.genetic_name===g.name));
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const add=async(name)=>{
    setBusy(name);setErr(null);
    try{const ins=await db.insert("cycle_genetics",{cycle_id:cycleId,genetic_name:name,plant_count:0});setRows(prev=>[...prev,ins[0]]);}
    catch(e){setErr(errMsg(e));}finally{setBusy(null);}
  };
  const remove=async(row)=>{
    if(confirmId!==row.id){setConfirmId(row.id);return;}
    setBusy(row.id);
    try{await db.delete("cycle_genetics",row.id);setRows(prev=>prev.filter(r=>r.id!==row.id));setConfirmId(null);}
    catch(e){setErr(errMsg(e));}finally{setBusy(null);}
  };
  return <Sheet title="Genéticas del ciclo" sub="Las cantidades salen de lo que pintás en las mesas" onClose={()=>onSaved()}>
    <ErrBox err={err}/>
    {rows.length===0&&<div style={{fontSize:13.5,color:C.textSoft,padding:"4px 0 8px"}}>Todavía no hay genéticas en el ciclo.</div>}
    {rows.map((r,i)=><div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
      <span style={{width:10,alignSelf:"stretch",minHeight:30,borderRadius:4,background:genMap[r.genetic_name]||C.green,flexShrink:0}}/>
      <span style={{flex:1,minWidth:0,fontSize:15,fontWeight:700,color:C.text}}>{r.genetic_name}</span>
      <span style={{fontSize:13,color:C.textSoft,fontWeight:700}}>{counts?.[r.genetic_name]||0} pl.</span>
      <button onClick={()=>remove(r)} disabled={busy===r.id} style={{padding:"7px 11px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,border:"none",background:confirmId===r.id?C.red:C.redLight,color:confirmId===r.id?"#fff":C.red}}>{confirmId===r.id?"¿Seguro?":"Quitar"}</button>
    </div>)}
    {avail.length>0&&<>
      <FLabel>Tocá para agregar</FLabel>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {avail.map(g=>{const col=g.color||C.green;return <button key={g.name} onClick={()=>add(g.name)} disabled={!!busy} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:99,fontSize:13.5,fontWeight:800,cursor:"pointer",fontFamily:"inherit",background:`${col}1F`,color:inkOn(col),border:`1.5px solid ${col}`,opacity:busy===g.name?0.5:1}}><Icon n="plus" size={15}/>{g.name}</button>;})}
      </div>
    </>}
    {confirmId&&<div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:10}}>Quitarla del ciclo no borra lo pintado en las mesas.</div>}
    <Btn onClick={()=>onSaved()} full style={{marginTop:16,minHeight:48}}>Listo</Btn>
  </Sheet>;
}
// Arma la foto de "qué había en cada mesa" al momento de cerrar el ciclo.
// Devuelve una fila por mesa+genética con la cantidad de plantas.
// Se congela al cerrar para que editar las mesas después no altere el histórico.
async function buildHarvestRows(roomId,cycleId,cg){
  const rows=[];
  try{
    // Solo mesas que existen de verdad en la sala. Si en la tabla `pots` quedó
    // alguna fila basura (mesas viejas o de pruebas), acá se descarta.
    const reales=new Set((ROOM_POTS[roomId]||[]).map(p=>p.label));
    const pots=await db.query("pots",`room_id=eq.${roomId}`);
    const byId={};pots.forEach(p=>{if(reales.has(p.pot_label))byId[p.id]=p.pot_label;});
    const cells=await db.query("pot_cells",`cycle_id=eq.${cycleId}`);
    const acc={};
    cells.forEach(c=>{
      if(!c.genetic_name)return;
      const label=byId[c.pot_id];
      if(!label)return;
      const k=`${label}||${c.genetic_name}`;
      acc[k]=(acc[k]||0)+1;
    });
    Object.entries(acc).forEach(([k,n])=>{
      const [pot_label,genetic_name]=k.split("||");
      rows.push({pot_label,genetic_name,plant_count:n});
    });
  }catch{}
  // Si nunca se dibujaron las mesas, al menos dejamos una fila por genética.
  if(rows.length===0&&cg&&cg.length>0){
    cg.forEach(g=>rows.push({pot_label:"General",genetic_name:g.genetic_name,plant_count:g.plant_count||0}));
  }
  rows.sort((a,b)=>a.pot_label.localeCompare(b.pot_label)||a.genetic_name.localeCompare(b.genetic_name));
  return rows;
}

function CloseCycleModal({cycle,roomId,rc,cg,potCounts,wLog,nLog,user,onClose,onSaved}){
  const [notes,setNotes]=useState("");
  const [rows,setRows]=useState(null);   // foto por mesa (null = cargando)
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const name=rc?.display_name||roomId;
  const dur=cycle.flower_start?daysFrom(cycle.flower_start):"?";
  const totalPlants=Object.values(potCounts||{}).reduce((a,b)=>a+b,0);

  useEffect(()=>{buildHarvestRows(roomId,cycle.id,cg).then(setRows).catch(()=>setRows([]));},[roomId,cycle.id]);

  const byPot={};
  (rows||[]).forEach(r=>{(byPot[r.pot_label]=byPot[r.pot_label]||[]).push(r);});

  const buildSummary=()=>{
    const lines=[];
    lines.push(`═══ INFORME DE CICLO — ${name} ═══`);
    lines.push(`Cerrado: ${fmtDate(todayISO)} · por ${user.name}`);
    lines.push(`Inicio floración: ${cycle.flower_start?fmtDate(cycle.flower_start):"—"}`);
    lines.push(`Cosecha estimada: ${cycle.estimated_harvest?fmtDate(cycle.estimated_harvest):"—"}`);
    lines.push(`Días en floración: ${dur}`);
    lines.push("");
    lines.push("── Distribución por mesa ──");
    if(!rows||rows.length===0)lines.push("(sin mesas cargadas)");
    else Object.entries(byPot).forEach(([pot,rs])=>{
      lines.push(`• Mesa ${pot}: ${rs.map(r=>`${r.genetic_name} (${r.plant_count})`).join(", ")}`);
    });
    lines.push(`Total plantas: ${totalPlants}`);
    lines.push("");
    lines.push(`── Registros del ciclo ──`);
    lines.push(`Riegos registrados: ${wLog?.length||0}`);
    lines.push(`Nutrición/foliar: ${nLog?.length||0}`);
    lines.push("");
    lines.push("Rendimiento: pendiente de pesar (queda en secado).");
    if(notes){lines.push("");lines.push("── Notas ──");lines.push(notes);}
    return lines.join("\n");
  };

  const close=async()=>{
    setSaving(true);setErr(null);
    try{
      const summary=buildSummary();
      // Congelamos la composición por mesa antes de tocar nada más.
      if(rows&&rows.length>0){
        try{
          await db.deleteQuery("harvest_yields",`cycle_id=eq.${cycle.id}`);
          await db.insert("harvest_yields",rows.map(r=>({
            cycle_id:cycle.id,room_id:roomId,pot_label:r.pot_label,genetic_name:r.genetic_name,
            plant_count:r.plant_count,grams:0,recorded_by:user.name,
          })));
        }catch(e){setErr("No se pudo guardar la foto por mesa. ¿Corriste el SQL de post-cosecha? "+errMsg(e));setSaving(false);return;}
      }
      await db.update("cycles",cycle.id,{active:false,closed_at:new Date().toISOString(),summary,real_harvest:todayISO,harvest_status:"secando"});
      await logA(user.name,`Cerró ciclo de ${roomId} — en secado`,"cycle");
      try{
        const n=await generateResetTasks(roomId,todayISO,user.name,`cierre (${user.name})`);
        await db.updateWhere("room_config","room_id",roomId,{last_reset_at:new Date().toISOString()});
        if(n>0)await logA(user.name,`Generó ${n} tareas de Reset Express en ${roomId}`,"task");
      }catch{}
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };

  return <Sheet title="Cerrar ciclo" sub={name} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{background:C.amberLight,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.textMid,marginBottom:14,lineHeight:1.5}}>
      Esto archiva el ciclo y deja la sala lista para uno nuevo.<br/>
      El ciclo queda <b>en secado</b>: los gramos se cargan después, cuando peses, desde <b>Historial</b>.
    </div>
    <SL>Se va a guardar esta distribución</SL>
    {rows===null&&<div style={{fontSize:13,color:C.textSoft,marginBottom:12}}>Leyendo las mesas…</div>}
    {rows!==null&&rows.length===0&&<div style={{fontSize:13,color:C.amber,marginBottom:12,lineHeight:1.5}}>No hay mesas cargadas en este ciclo. Vas a poder agregar las filas a mano al cargar la cosecha.</div>}
    {rows!==null&&rows.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      {Object.entries(byPot).map(([pot,rs])=><div key={pot} style={{background:C.bg,borderRadius:10,padding:"10px 13px"}}>
        <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>Mesa {pot}</div>
        {rs.map(r=><div key={r.genetic_name} style={{fontSize:12.5,color:C.textMid}}>{r.genetic_name} · {r.plant_count} planta{r.plant_count!==1?"s":""}</div>)}
      </div>)}
      <div style={{fontSize:12,color:C.textSoft,fontStyle:"italic"}}>Esta foto queda congelada: si después editás las mesas para el ciclo nuevo, el histórico no se toca.</div>
    </div>}
    <FT label="Notas finales (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones del ciclo..." rows={2}/>
    <SL>Vista previa</SL>
    <pre style={{background:C.bg,borderRadius:10,padding:14,fontSize:11,color:C.textMid,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:160,overflowY:"auto",lineHeight:1.5}}>{buildSummary()}</pre>
    <Btn onClick={close} disabled={saving||rows===null} full style={{marginTop:12,minHeight:48,background:C.red,color:"#fff",border:"none"}}>{saving?"Cerrando...":"Cerrar y pasar a secado"}</Btn>
  </Sheet>;
}

// Carga de cosecha: gramos por mesa y por genética. Se puede volver las veces que haga falta.
function HarvestModal({cycle,rc,user,onClose,onSaved}){
  const [rows,setRows]=useState(null);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const [notes,setNotes]=useState("");
  const name=rc?.display_name||cycle.room_id;

  useEffect(()=>{
    const reales=new Set((ROOM_POTS[cycle.room_id]||[]).map(p=>p.label));
    const limpiar=rs=>rs.filter(r=>reales.size===0||reales.has(r.pot_label)||r.pot_label==="General");
    db.query("harvest_yields",`cycle_id=eq.${cycle.id}&order=pot_label.asc,genetic_name.asc`)
      .then(async hy=>{
        if(hy.length>0){setRows(limpiar(hy).map(r=>({...r,grams:r.grams??""})));return;}
        // Ciclo viejo sin foto: la reconstruimos desde las mesas (o las genéticas).
        const cg=await db.query("cycle_genetics",`cycle_id=eq.${cycle.id}`).catch(()=>[]);
        const built=await buildHarvestRows(cycle.room_id,cycle.id,cg);
        setRows(built.map(r=>({...r,id:null,grams:""})));
      })
      .catch(e=>{setErr(errMsg(e));setRows([]);});
  },[cycle.id]);

  const setG=(i,v)=>setRows(p=>p.map((r,idx)=>idx===i?{...r,grams:v}:r));
  const total=(rows||[]).reduce((a,r)=>a+(+r.grams||0),0);
  const totalPlants=(rows||[]).reduce((a,r)=>a+(r.plant_count||0),0);
  const cargadas=(rows||[]).filter(r=>+r.grams>0).length;

  const save=async(marcarCompleto)=>{
    setSaving(true);setErr(null);
    try{
      // Reescribimos las filas del ciclo con los gramos cargados.
      await db.deleteQuery("harvest_yields",`cycle_id=eq.${cycle.id}`);
      if(rows.length>0){
        await db.insert("harvest_yields",rows.map(r=>({
          cycle_id:cycle.id,room_id:cycle.room_id,pot_label:r.pot_label,genetic_name:r.genetic_name,
          plant_count:r.plant_count||0,grams:+r.grams||0,recorded_by:user.name,recorded_at:new Date().toISOString(),
        })));
      }
      // Sincronizamos el total por genética para que Estadísticas siga andando.
      const porGen={};
      rows.forEach(r=>{porGen[r.genetic_name]=(porGen[r.genetic_name]||0)+(+r.grams||0);});
      const cg=await db.query("cycle_genetics",`cycle_id=eq.${cycle.id}`).catch(()=>[]);
      for(const g of cg){
        const val=Math.round(porGen[g.genetic_name]||0);
        if(g.id)await db.update("cycle_genetics",g.id,{yield_grams:val>0?val:null});
      }
      const upd={yield_grams:total>0?Math.round(total):null};
      if(marcarCompleto)upd.harvest_status="completo";
      if(notes.trim())upd.summary=`${cycle.summary||""}\n\n── Post-cosecha (${fmtDate(todayISO)}, ${user.name}) ──\n${notes.trim()}`;
      await db.update("cycles",cycle.id,upd);
      await logA(user.name,`Cargó cosecha de ${cycle.room_id}: ${Math.round(total)}g`,"cycle");
      onSaved();
    }catch(e){setErr("No se pudo guardar. ¿Corriste el SQL de post-cosecha? "+errMsg(e));setSaving(false);}
  };

  const byPot={};
  (rows||[]).forEach((r,i)=>{(byPot[r.pot_label]=byPot[r.pot_label]||[]).push({...r,_i:i});});

  return <Sheet title="Cargar cosecha" sub={name} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{fontSize:12,color:C.textSoft,marginBottom:14,lineHeight:1.5}}>
      Cerrado el {cycle.real_harvest?fmtDate(cycle.real_harvest):"—"} · Pesá cada mesa por separado, aunque se repita la genética.
    </div>
    {rows===null&&<Spin/>}
    {rows!==null&&rows.length===0&&<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic",marginBottom:12}}>Este ciclo no tiene mesas ni genéticas registradas, no hay nada que pesar.</div>}
    {rows!==null&&rows.length>0&&<div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
      {Object.entries(byPot).map(([pot,rs])=>{
        const sub=rs.reduce((a,r)=>a+(+r.grams||0),0);
        return <div key={pot} style={{background:C.bg,borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>Mesa {pot}</div>
            {sub>0&&<div style={{fontSize:12,fontWeight:700,color:C.green}}>{Math.round(sub)} g</div>}
          </div>
          {rs.map(r=><div key={r._i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{r.genetic_name}</div>
              <div style={{fontSize:11.5,color:C.textSoft}}>{r.plant_count} planta{r.plant_count!==1?"s":""}{+r.grams>0&&r.plant_count>0?` · ${Math.round(+r.grams/r.plant_count)} g/planta`:""}</div>
            </div>
            <NumField value={r.grams} onCommit={v=>setG(r._i,v===""?"":v)} min={0} max={999999} placeholder="g" compact/>
          </div>)}
        </div>;
      })}
    </div>}
    {rows!==null&&rows.length>0&&<>
      <div style={{background:C.greenLight,borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total del ciclo</div>
          <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{cargadas}/{rows.length} mesas cargadas · {totalPlants} plantas</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:26,fontWeight:900,color:C.green,fontFamily:H,lineHeight:1}}>{Math.round(total)} g</div>
          {totalPlants>0&&total>0&&<div style={{fontSize:11.5,color:C.textSoft}}>{Math.round(total/totalPlants)} g/planta</div>}
        </div>
      </div>
      <FT label="Notas de post-cosecha (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Cómo secó, observaciones..." rows={2}/>
      <div style={{display:"flex",gap:10,marginTop:12}}>
        <Btn onClick={()=>save(false)} v="secondary" disabled={saving} style={{flex:1,fontSize:13}}>Guardar y seguir</Btn>
        <Btn onClick={()=>save(true)} disabled={saving} style={{flex:1,fontSize:13}}>{saving?"Guardando...":"Guardar y finalizar"}</Btn>
      </div>
      <div style={{fontSize:11.5,color:C.textSoft,marginTop:8,fontStyle:"italic",lineHeight:1.5}}>“Guardar y seguir” deja el ciclo en secado por si falta pesar alguna mesa. “Finalizar” lo marca como completo.</div>
    </>}
  </Sheet>;
}

// TAREAS PAGE
function TareasPage({user,rooms}){
  const [tasks,setTasks]=useState([]);
  const [view,setView]=useState("hoy");
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [showDone,setShowDone]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [infoTask,setInfoTask]=useState(null);
  const [delT,setDelT]=useState(null);
  const [newT,setNewT]=useState({title:"",roomsSel:["S1"],assignee:user.name,due_date:todayISO,priority:"normal",recurrent:false,recurrent_days:1,instructions:""});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      let q;
      if(view==="hoy") q=`due_date=eq.${todayISO}&order=priority.desc,created_at.asc`;
      else if(view==="mias") q=`assignee=eq.${encodeURIComponent(user.name)}&status=eq.pendiente&due_date=gte.${todayISO}&order=due_date.asc,priority.desc`;
      else if(view==="proximas") q=`due_date=gt.${todayISO}&status=eq.pendiente&order=due_date.asc,priority.desc`;
      else q=`status=eq.completada&order=completed_at.desc&limit=60`;
      setTasks(await db.query("tasks",q));
    }finally{setLoading(false);}
  },[view,user.name]);
  useEffect(()=>{load();},[load]);

  const toggle=async task=>{
    const ns=task.status==="completada"?"pendiente":"completada";
    await db.update("tasks",task.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
    if(ns==="completada")await pestTaskDone(task,user.name);
    if(ns==="completada"&&task.recurrent&&task.recurrent_days){
      await db.insert("tasks",{title:task.title,room_id:task.room_id,type:task.type,assignee:task.assignee,due_date:addDays(task.due_date,task.recurrent_days),status:"pendiente",priority:task.priority,recurrent:true,recurrent_days:task.recurrent_days,created_by:"sistema"});
    }
    await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${task.title}`,"task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:ns}:t));
    const undo=async()=>{
      await db.update("tasks",task.id,{status:task.status,completed_at:task.status==="completada"?task.completed_at:null});
      setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:task.status}:t));
    };
    setToast({msg:ns==="completada"?"Completada ✓":"Reabierta",type:"success",undo});
  };

  const removeTask=async task=>{
    try{
      await db.delete("tasks",task.id);
      setTasks(prev=>prev.filter(t=>t.id!==task.id));
      await logA(user.name,`Borró tarea: ${task.title}`,"task");
      setToast({msg:"Tarea borrada 🗑",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    setDelT(null);
  };

  const addTask=async()=>{
    if(!newT.title.trim())return;
    const sel=newT.roomsSel.length>0?newT.roomsSel:["S1"];
    setSaving(true);
    try{
      const roomsStr=sel.join(",");
      const created=[];
      for(const room of sel){
        const payload={title:newT.title.trim(),room_id:room,rooms:roomsStr,type:"revision",assignee:newT.assignee,due_date:newT.due_date,priority:newT.priority,recurrent:newT.recurrent,recurrent_days:newT.recurrent?newT.recurrent_days:null,instructions:newT.instructions||null,status:"pendiente",created_by:user.name};
        const ins=await db.insert("tasks",payload);
        if(ins&&ins[0])created.push(ins[0]);
      }
      await logA(user.name,`Creó tarea: ${newT.title} (${roomsStr})`,"task");
      if(view==="hoy"&&newT.due_date===todayISO)setTasks(prev=>[...prev,...created]);
      setShowForm(false);
      setNewT({title:"",roomsSel:["S1"],assignee:user.name,due_date:todayISO,priority:"normal",recurrent:false,recurrent_days:1,instructions:""});
      setToast({msg:created.length>1?`${created.length} tareas creadas ✓`:"Tarea creada ✓",type:"success"});
    }
    catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };

  const pending=tasks.filter(t=>t.status==="pendiente");
  const done=tasks.filter(t=>t.status==="completada");
  const byRoomP=groupTasks(pending);
  const tabs=[{id:"hoy",l:"Hoy"},{id:"mias",l:"Mis tareas"},{id:"proximas",l:"Próximas"},{id:"completadas",l:"Completadas"}];

  const groupedView=(grouped)=><>
    {Object.entries(grouped).map(([room,tList])=>tList.length===0?null:
      <div key={room} style={{marginBottom:4}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:groupMeta(room).color,display:"flex",alignItems:"center",gap:6}}>
          {groupMeta(room).label} <span style={{fontSize:10,color:C.textSoft,fontWeight:400}}>({tList.length})</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>{tList.map(t=><TaskRow key={t.id} t={t} onToggle={toggle} onInfo={setInfoTask} onDelete={setDelT}/>)}</div>
      </div>
    )}
  </>;
  const flatView=(list,empty)=>list.length===0
    ?<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>{empty}</div>
    :<div style={{display:"flex",flexDirection:"column",gap:8}}>{list.map(t=><TaskRow key={t.id} t={t} onToggle={toggle} onInfo={setInfoTask} onDelete={setDelT}/>)}</div>;

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {infoTask&&<TaskDetailModal task={infoTask} onClose={()=>setInfoTask(null)}/>}
    {delT&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={()=>setDelT(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,padding:24,maxWidth:340,width:"100%",border:`1px solid ${C.border}`,boxShadow:C.shadowUp}}>
        <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:8}}>¿Borrar esta tarea?</div>
        <div style={{fontSize:13.5,color:C.textSoft,marginBottom:20}}>"{delT.title}" — esta acción no se puede deshacer.</div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={()=>setDelT(null)} v="secondary" style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={()=>removeTask(delT)} style={{flex:1,background:C.red}}>🗑 Borrar</Btn>
        </div>
      </div>
    </div>}

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>Tareas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Nueva</Btn>
    </div>

    {showForm&&<Card>
      <SL>Nueva tarea</SL>
      <FI label="Título *" value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))} placeholder="Ej: Fumigación S1"/>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:6}}>Salas (podés elegir varias)</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[...(rooms||["S1","S2"]),"Vegetativo"].map(r=>{const on=newT.roomsSel.includes(r);return <button key={r} onClick={()=>setNewT(p=>({...p,roomsSel:on?p.roomsSel.filter(x=>x!==r):[...p.roomsSel,r]}))} style={{padding:"9px 16px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,background:on?C.green:C.surface,color:on?"#fff":C.textMid,border:`1.5px solid ${on?C.green:C.border}`}}>{on?"✓ ":""}{r}</button>;})}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FS label="Responsable" value={newT.assignee} onChange={e=>setNewT(p=>({...p,assignee:e.target.value}))} options={["Lucas","Alex","Gustavo","Alexis"]}/>
        <FS label="Prioridad" value={newT.priority} onChange={e=>setNewT(p=>({...p,priority:e.target.value}))} options={["normal","alta"]}/>
      </div>
      <FI label="Fecha" type="date" value={newT.due_date} onChange={e=>setNewT(p=>({...p,due_date:e.target.value}))}/>
      <FT label="Instrucciones / notas (opcional)" value={newT.instructions} onChange={e=>setNewT(p=>({...p,instructions:e.target.value}))} placeholder="Ej: dosis, pasos a seguir... (opcional)"/>
      <label style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:C.text,marginBottom:12,cursor:"pointer"}}>
        <input type="checkbox" checked={newT.recurrent} onChange={e=>setNewT(p=>({...p,recurrent:e.target.checked}))} style={{width:18,height:18}}/>Tarea recurrente
      </label>
      {newT.recurrent&&<div style={{background:C.greenLight,borderRadius:12,padding:14,marginBottom:12}}>
        <NumField label="Repetir cada (días)" value={newT.recurrent_days} onCommit={v=>setNewT(p=>({...p,recurrent_days:v===""?1:v}))} min={1} max={365} placeholder="Ej: 2"/>
      </div>}
      <div style={{display:"flex",gap:10}}><Btn onClick={addTask} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}

    <div style={{display:"flex",gap:6,overflowX:"auto"}}>
      {tabs.map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{flex:"1 0 auto",padding:"11px 14px",borderRadius:12,cursor:"pointer",fontSize:13.5,fontWeight:700,whiteSpace:"nowrap",background:view===v.id?C.green:C.surface,color:view===v.id?"#fff":C.textMid,border:`1.5px solid ${view===v.id?C.green:C.border}`}}>{v.l}</button>)}
    </div>

    {loading?<Spin/>:view==="hoy"?<>
      {groupedView(byRoomP)}
      {pending.length===0&&done.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>Sin tareas para hoy ✓</div>}
      {done.length>0&&<>
        <button onClick={()=>setShowDone(!showDone)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDone?"▲":"▼"} Completadas ({done.length})</button>
        {showDone&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6}}>{done.map(t=><TaskRow key={t.id} t={t} onToggle={toggle} onInfo={setInfoTask} onDelete={setDelT}/>)}</div>}
      </>}
    </>:view==="mias"?(pending.length===0?flatView([],"No tenés tareas pendientes 🌱"):groupedView(byRoomP))
      :view==="proximas"?flatView(pending,"No hay tareas próximas")
      :flatView(done,"Sin tareas completadas todavía")}
  </div>;
}

// VEGETATIVO PAGE
// ══════════════════════════════════════════════════════════════════════════════
// VEGETATIVO — una portada con el clima y tres estaciones de la cadena:
//   Madres → Esquejeras → VG → sala (S1 / S2)
// Cada estación tiene su propia página para que ninguna quede enterrada en un scroll.
// ══════════════════════════════════════════════════════════════════════════════
// Fecha "2026-09-10" → "10/09", sin pasar por Date (evita el corrimiento de zona horaria).
const fmtDM = d => { const p=String(d||"").slice(0,10).split("-"); return p.length===3?`${p[2]}/${p[1]}`:(d||""); };
// Días entre una fecha y hoy (hora Argentina), contando por calendario.
const daysSince = d => d ? Math.round((new Date(todayISO+"T12:00:00")-new Date(String(d).slice(0,10)+"T12:00:00"))/86400000) : 0;
// Texto del feno de una madre o línea de VG: el código de la búsqueda (DS-7) o una etiqueta
// escrita a mano para selecciones viejas que no están cargadas como búsqueda (ej: "F2").
const fenoTxt = (row,phenoMap) => row?.pheno_id ? (phenoMap?.[sid(row.pheno_id)]?.code || "Feno") : (row?.pheno_label || null);
const FenoChip = ({txt,big=false}) => txt ? <span style={{display:"inline-block",marginLeft:7,fontSize:big?13:11.5,fontWeight:800,color:C.purple,background:C.purpleLight,border:`1px solid ${C.purple}33`,borderRadius:20,padding:big?"2px 10px":"1px 8px",verticalAlign:"middle",whiteSpace:"nowrap"}}>{txt}</span> : null;

// Confirmación genérica para borrados. Todo borrado pasa por acá.
function ConfirmModal({title,text,confirmLabel="Eliminar",busyLabel="Borrando...",onConfirm,onClose,busy=false,z}){
  return <Modal title={title} onClose={()=>{if(!busy)onClose();}} z={z}>
    <div style={{fontSize:14,color:C.textMid,lineHeight:1.55,marginBottom:18}}>{text}</div>
    <div style={{display:"flex",gap:10}}>
      <Btn onClick={onConfirm} disabled={busy} style={{flex:1,background:C.red,color:"#fff",border:"none"}}>{busy?busyLabel:confirmLabel}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={busy} style={{flex:1}}>Cancelar</Btn>
    </div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMATO NUEVO — piezas comunes: hoja inferior, filas de menú, plegables
// ══════════════════════════════════════════════════════════════════════════════
function Sheet({title,sub,onClose,children,z=240}){
  useEffect(()=>{
    const prev=document.body.style.overflow;document.body.style.overflow="hidden";
    const onKey=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",onKey);};
  },[onClose]);
  return <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,zIndex:z,background:"rgba(10,18,14,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div role="dialog" aria-modal="true" style={{background:C.surface,width:"100%",maxWidth:560,borderRadius:"24px 24px 0 0",padding:"10px 18px calc(18px + env(safe-area-inset-bottom))",maxHeight:"88vh",overflowY:"auto"}}>
      <div style={{width:40,height:5,borderRadius:99,background:C.borderStrong,margin:"0 auto 12px"}}/>
      {title&&<div style={{fontSize:20,fontWeight:800,color:C.text,lineHeight:1.25}}>{title}</div>}
      {sub&&<div style={{fontSize:13.5,color:C.textSoft,fontWeight:600,marginTop:3}}>{sub}</div>}
      <div style={{marginTop:title?10:0}}>{children}</div>
    </div>
  </div>;
}
const SheetRow=({icon,label,onClick,danger,i})=><button onClick={onClick} style={{display:"flex",alignItems:"center",gap:13,width:"100%",padding:"12px 2px",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15.5,fontWeight:700,color:danger?C.red:C.text,textAlign:"left"}}>
  <span style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:danger?C.redLight:C.surfaceAlt,color:danger?C.red:C.textMid}}><Icon n={icon} size={20}/></span>{label}
</button>;
function Fold({icon,title,count,right,children,defaultOpen=false}){
  const [open,setOpen]=useState(defaultOpen);
  return <Card style={{padding:0,overflow:"hidden"}}>
    <div role="button" tabIndex={0} onClick={()=>setOpen(o=>!o)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setOpen(o=>!o);}}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer",minHeight:62}}>
      <span style={{width:36,height:36,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:C.surfaceAlt,color:C.textMid,flexShrink:0}}><Icon n={icon} size={20}/></span>
      <span style={{flex:1,fontSize:15.5,fontWeight:800,color:C.text}}>{title}{count!=null&&<span style={{color:C.textSoft,fontWeight:700}}> ({count})</span>}</span>
      {right}
      <span style={{color:C.textSoft,transform:open?"rotate(90deg)":"none",transition:"transform .2s"}}><Icon n="chev" size={18}/></span>
    </div>
    {open&&<div style={{padding:"0 16px 14px"}}>{children}</div>}
  </Card>;
}
const PageTitle=({children,right,sub})=><div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12,padding:"4px 2px 0"}}>
  <div><div style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:H,letterSpacing:"-0.02em",lineHeight:1.1}}>{children}</div>{sub&&<div style={{fontSize:13.5,color:C.textSoft,fontWeight:600,marginTop:3}}>{sub}</div>}</div>{right}
</div>;
const Stripe=({mix,genMap,h=9})=><span style={{display:"flex",height:h,borderRadius:99,overflow:"hidden",gap:2,width:"100%",background:C.surfaceAlt}}>
  {mix.map(([g,c])=><span key={g} style={{flex:c,minWidth:3,background:genMap[g]||C.green}}/>)}
</span>;
const ChartsBlock=({climate,clRange,setClRange,tg,onManual})=>{
  const tPts=climate.filter(c=>c.temperature!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.temperature}));
  const hPts=climate.filter(c=>c.humidity!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.humidity}));
  const vPts=climate.filter(c=>c.vpd!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.vpd}));
  const lbl=t=><div style={{fontSize:12.5,fontWeight:800,color:C.textMid,margin:"14px 0 4px"}}>{t}</div>;
  return <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
    <div style={{display:"flex",gap:6}}>
      {[["24h","24 h"],["7d","7 días"],["30d","30 días"]].map(([k,l])=><button key={k} onClick={()=>setClRange(k)} style={{flex:1,fontSize:13,fontWeight:800,padding:"8px 0",borderRadius:10,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${clRange===k?C.green:C.border}`,background:clRange===k?C.greenLight:"transparent",color:clRange===k?C.green:C.textSoft}}>{l}</button>)}
      {onManual&&<button onClick={onManual} style={{fontSize:13,fontWeight:800,padding:"8px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${C.border}`,background:"transparent",color:C.textMid}}>+ Medición</button>}
    </div>
    {climate.length===0?<div style={{textAlign:"center",color:C.textSoft,fontSize:13,padding:"18px 0"}}>Sin datos en este rango todavía</div>:<>
      {lbl("Temperatura (°C)")}<LineChart series={[{points:tPts,color:C.amber}]} bands={[{min:tg.temp.min,max:tg.temp.max,color:C.green}]} unit="°C"/>
      {lbl("Humedad (%)")}<LineChart series={[{points:hPts,color:C.blue}]} bands={[{min:tg.hum.min,max:tg.hum.max,color:C.green}]} unit="%"/>
      {lbl("VPD (kPa)")}<LineChart series={[{points:vPts,color:C.purple}]} bands={[{min:tg.vpd.min,max:tg.vpd.max,color:C.green}]} unit=" kPa"/>
      <div style={{fontSize:11.5,color:C.textSoft,marginTop:8}}>La franja verde es el óptimo. Tocá o arrastrá el dedo sobre el gráfico para ver hora y valor.</div>
    </>}
  </div>;
};

// Mapa de mesas con la forma real de la sala: cada mesa muestra su línea de genéticas y plantas.
function PotMapV2({roomId,potMix,genMap,onSelect}){
  const plan=ROOM_PLANS[roomId];
  const pots=plan?plan.pots:(ROOM_POTS[roomId]||[]).map((p,i)=>({...p,x:4+(i%2)*48,y:4+Math.floor(i/2)*31,w:44,h:27}));
  const ratio=plan?plan.ratio:"3 / 4";
  return <div style={{position:"relative",width:"100%",aspectRatio:ratio,background:C.surfaceAlt,borderRadius:14,border:`1px solid ${C.border}`}}>
    {pots.map(p=>{
      const mix=Object.entries(potMix[p.label]||{}).sort((a,b)=>b[1]-a[1]);const n=mix.reduce((a,[,c])=>a+c,0);
      return <button key={p.label} onClick={()=>onSelect(p.label)} aria-label={`Mesa ${p.label}, ${n} plantas`}
        style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:`${p.w}%`,height:`${p.h}%`,borderRadius:p.circular?"50%":12,background:C.surface,border:`1px solid ${C.border}`,boxShadow:C.shadow,
          padding:p.circular?"16% 14%":"8px 9px",display:"flex",flexDirection:"column",justifyContent:"space-between",alignItems:p.circular?"center":"stretch",cursor:"pointer",fontFamily:"inherit",color:C.text,overflow:"hidden",textAlign:p.circular?"center":"left"}}>
        <span style={{fontSize:20,fontWeight:800,lineHeight:1}}>{p.label}</span>
        <Stripe mix={mix} genMap={genMap}/>
        <span style={{fontSize:12,fontWeight:700,color:C.textSoft,whiteSpace:"nowrap"}}>{n>0?`${n} plantas`:"Vacía"}</span>
      </button>;
    })}
  </div>;
}

// Madres: "para renovar" a los 120 días (o marcada a mano); "próxima" 15 días antes.
const MADRE_RENOVAR=120, MADRE_AVISO=105;
const madreEstado=m=>{
  if(m.status==="inactiva")return "inactiva";
  const d=daysSince(m.entry_date);
  if(m.status==="renovar"||d>=MADRE_RENOVAR)return "renovar";
  if(d>=MADRE_AVISO)return "proxima";
  return "ok";
};

// ══════════════════════════════════════════════════════════════════════════════
// VEGETATIVO — todo resumido a la vista: clima, madres, esquejeras y tandas de VG
// ══════════════════════════════════════════════════════════════════════════════
function VegetativoPage({genetics,user,targets,onTargetsChanged,setPage}){
  const [madres,setMadres]=useState([]);
  const [cloners,setCloners]=useState([]);
  const [clSlots,setClSlots]=useState([]);
  const [vgB,setVgB]=useState([]);
  const [vgL,setVgL]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showTargets,setShowTargets]=useState(false);
  const [climate,setClimate]=useState(null);      // última lectura
  const [clSeries,setClSeries]=useState([]);      // serie del rango elegido (gráficos)
  const [clRange,setClRange]=useState("24h");
  const [showClimate,setShowClimate]=useState(false);
  const [showCharts,setShowCharts]=useState(false);
  const [clTick,setClTick]=useState(0);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      db.query("veg_stock","type=eq.madre").catch(()=>[]),
      db.get("cloners").catch(()=>[]),
      db.get("cloner_slots").catch(()=>[]),
      db.query("vg_batches","status=eq.vg&order=start_date.asc").catch(()=>[]),
      db.query("vg_lines","select=batch_id,genetic_name,initial_count,current_count").catch(()=>[]),
    ]).then(([m,c,cs,vb,vl])=>{setMadres(m);setCloners(c);setClSlots(cs);setVgB(vb);setVgL(vl);}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{
    const loadC=()=>db.query("climate_logs","room_id=eq.Vegetativo&order=recorded_at.desc&limit=1").then(r=>setClimate(r[0]||null)).catch(()=>{});
    loadC();const id=setInterval(loadC,120000);return ()=>clearInterval(id);
  },[clTick]);
  useEffect(()=>{
    if(!showCharts)return;
    const loadS=()=>{
      const hrs=clRange==="24h"?24:clRange==="7d"?24*7:24*30;
      const since=new Date(Date.now()-hrs*3600*1000).toISOString();
      db.query("climate_logs",`room_id=eq.Vegetativo&recorded_at=gte.${since}&order=recorded_at.asc`).then(setClSeries).catch(()=>setClSeries([]));
    };
    loadS();const id=setInterval(loadS,120000);return ()=>clearInterval(id);
  },[clRange,clTick,showCharts]);

  if(loading)return <Spin/>;
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const tg=getTargets(targets,"Vegetativo",null,null);
  const vivas=madres.filter(m=>madreEstado(m)!=="inactiva");
  const totalMadres=vivas.reduce((a,m)=>a+(m.count||0),0);
  const paraRenovar=vivas.filter(m=>madreEstado(m)==="renovar").length;
  const proximas=vivas.filter(m=>madreEstado(m)==="proxima").length;
  const porGen={};vivas.forEach(m=>{porGen[m.genetic_name]=(porGen[m.genetic_name]||0)+(m.count||0);});
  const genes=Object.entries(porGen).sort((a,b)=>b[1]-a[1]);
  const totalEsq=clSlots.filter(s=>s.genetic_name).length;
  const plantasVG=vgL.filter(l=>vgB.some(b=>sid(b.id)===sid(l.batch_id))).reduce((a,l)=>a+(l.current_count||0),0);
  const go=p=>setPage&&setPage(p);

  const blockHead=(icon,title,sub,num,p)=><button onClick={()=>go(p)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",color:C.text,textAlign:"left",padding:0}}>
    <span style={{width:42,height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:C.greenLight,color:C.green,flexShrink:0}}><Icon n={icon} size={22}/></span>
    <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:17,fontWeight:800}}>{title}</span><span style={{display:"block",fontSize:13,color:C.textSoft,fontWeight:600}}>{sub}</span></span>
    <span style={{fontSize:26,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{num}</span>
    <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
  </button>;
  const rowLine=(key,left,right,mix,last)=><div key={key} style={{padding:"11px 0",borderTop:`1px solid ${C.border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,minWidth:0}}>{left}</div>{right}</div>
    {mix&&mix.length>0&&<div style={{marginTop:7}}><Stripe mix={mix} genMap={genMap}/></div>}
  </div>;

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showTargets&&<TargetsModal roomId="Vegetativo" rc={null} cycle={null} user={user} onClose={()=>setShowTargets(false)} onSaved={()=>{setShowTargets(false);onTargetsChanged&&onTargetsChanged();setToast({msg:"Objetivos de clima guardados ✓",type:"success"});}}/>}
    {showClimate&&<ClimateModal roomId="Vegetativo" user={user} onClose={()=>setShowClimate(false)} onSaved={()=>{setShowClimate(false);setClTick(t=>t+1);setToast({msg:"Medición guardada ✓",type:"success"});}}/>}

    <PageTitle>Vegetativo</PageTitle>

    <Card style={{padding:"16px 16px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>Clima</div><div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Madres y esquejes</div></div>
        <div style={{display:"flex",gap:4}}>
          {user?.role==="admin"&&<button onClick={()=>setShowTargets(true)} aria-label="Editar objetivos" style={{background:"transparent",border:"none",cursor:"pointer",color:C.textSoft,padding:8}}><Icon n="sliders" size={20}/></button>}
          <button onClick={()=>setShowCharts(v=>!v)} style={{display:"flex",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",color:C.green,fontWeight:800,fontSize:14,fontFamily:"inherit",padding:"8px 0 8px 6px"}}>{showCharts?"Ocultar":"Gráficos"}<Icon n="chev" size={16} style={{transform:showCharts?"rotate(90deg)":"none"}}/></button>
        </div>
      </div>
      <ClimateMetrics climate={climate} tR={tg.temp} hR={tg.hum} vR={tg.vpd}/>
      {showCharts&&<ChartsBlock climate={clSeries} clRange={clRange} setClRange={setClRange} tg={tg} onManual={()=>setShowClimate(true)}/>}
    </Card>

    <Card style={{padding:"14px 16px"}}>
      {blockHead("tree","Madres",`${genes.length} genética${genes.length===1?"":"s"}`,totalMadres,"veg_madres")}
      {(paraRenovar>0||proximas>0)&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,padding:"9px 12px",borderRadius:12,background:C.amberLight,color:C.amber,fontSize:13.5,fontWeight:700}}>
        <Icon n="alert" size={18}/>{paraRenovar>0?`${paraRenovar} para renovar`:""}{paraRenovar>0&&proximas>0?" y ":""}{proximas>0?`${proximas} próxima${proximas===1?"":"s"}`:""}
      </div>}
      {genes.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:12}}>
        {genes.map(([g,n])=><span key={g} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,padding:"5px 10px",borderRadius:99,background:C.surfaceAlt,border:`1px solid ${C.border}`,color:C.text}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:genMap[g]||C.green}}/>{g} <b style={{fontWeight:800}}>{n}</b></span>)}
      </div>}
    </Card>

    <Card style={{padding:"14px 16px 4px"}}>
      {blockHead("scissors","Esquejeras",`${cloners.filter(cl=>clSlots.some(s=>sid(s.cloner_id)===sid(cl.id)&&s.genetic_name)).length} con esquejes`,totalEsq,"veg_esquejeras")}
      <div style={{marginTop:8}}>
        {cloners.length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"10px 0"}}>Sin esquejeras configuradas.</div>}
        {cloners.map(cl=>{
          const slots=clSlots.filter(s=>sid(s.cloner_id)===sid(cl.id));const used=slots.filter(s=>s.genetic_name);
          const mixO={};used.forEach(s=>{mixO[s.genetic_name]=(mixO[s.genetic_name]||0)+1;});
          const prog=used.length>0?batchProgress(cl,slots):null;
          return rowLine(cl.id,<>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>{cl.label}</div>
            <div style={{fontSize:12.5,fontWeight:700,color:prog?prog.color:C.textSoft}}>{prog?prog.label.replace(" · ",", "):"Vacía"}</div>
          </>,used.length>0&&<span style={{whiteSpace:"nowrap"}}><span style={{fontSize:20,fontWeight:800,color:C.text}}>{used.length}</span><span style={{fontSize:12,color:C.textSoft,fontWeight:600,marginLeft:4}}>esquejes</span></span>,Object.entries(mixO).sort((a,b)=>b[1]-a[1]));
        })}
      </div>
    </Card>

    <Card style={{padding:"14px 16px 4px"}}>
      {blockHead("pot","VG",`${vgB.length} tanda${vgB.length===1?"":"s"}`,plantasVG,"veg_vg")}
      <div style={{marginTop:8}}>
        {vgB.length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"10px 0"}}>No hay tandas en VG.</div>}
        {vgB.map(b=>{
          const ls=vgL.filter(l=>sid(l.batch_id)===sid(b.id));
          const viv=ls.reduce((a,l)=>a+(l.current_count||0),0),ent=ls.reduce((a,l)=>a+(l.initial_count||0),0);
          const p=ent>0?Math.round(viv/ent*100):0;const d=daysSince(b.start_date);
          const mixO={};ls.forEach(l=>{if(l.current_count>0)mixO[l.genetic_name]=(mixO[l.genetic_name]||0)+l.current_count;});
          return rowLine(b.id,<>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>Tanda del {fmtDM(b.start_date)}</div>
            <div style={{fontSize:12.5,fontWeight:700,color:C.textSoft}}><span style={{color:C.green}}>{d<=0?"Entró hoy":`Día ${d} de vegetativo`}</span>, {p}% vivas</div>
          </>,<span style={{whiteSpace:"nowrap"}}><span style={{fontSize:20,fontWeight:800,color:C.text}}>{viv}</span><span style={{fontSize:12,color:C.textSoft,fontWeight:600,marginLeft:4}}>pl</span></span>,Object.entries(mixO).sort((a,b)=>b[1]-a[1]));
        })}
      </div>
    </Card>
  </div>;
}

// ── MADRES: agrupadas por genética, con cantidades y días a la vista ─────────
function MadresPage({genetics,user}){
  const isAdmin=user?.role==="admin";
  const [stock,setStock]=useState([]);
  const [phenos,setPhenos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [delItem,setDelItem]=useState(null);
  const [busy,setBusy]=useState(false);
  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([
      db.query("veg_stock","type=eq.madre"),
      db.query("phenos","select=id,code,number,genetic_name,status&order=number.asc").catch(()=>[]),
    ]).then(([s,p])=>{setStock(s);setPhenos(p);}).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);
  if(loading)return <Spin/>;

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const phenoMap={};phenos.forEach(p=>{phenoMap[sid(p.id)]=p;});
  const activas=stock.filter(m=>madreEstado(m)!=="inactiva");
  const inactivas=stock.filter(m=>madreEstado(m)==="inactiva");
  const total=activas.reduce((a,m)=>a+(m.count||0),0);
  const paraRenovar=activas.filter(m=>madreEstado(m)==="renovar").length;
  const proximas=activas.filter(m=>madreEstado(m)==="proxima").length;
  const groups={};activas.forEach(m=>{(groups[m.genetic_name]=groups[m.genetic_name]||[]).push(m);});
  const order=Object.entries(groups).sort((a,b)=>b[1].reduce((x,m)=>x+(m.count||0),0)-a[1].reduce((x,m)=>x+(m.count||0),0));
  const borrar=async()=>{
    const m=delItem;if(!m)return;setBusy(true);
    try{
      await db.delete("veg_stock",m.id);
      const f=fenoTxt(m,phenoMap);
      await logA(user.name,`Eliminó madre ${m.genetic_name}${f?` ${f}`:""}`,"veg_stock");
      setStock(prev=>prev.filter(s=>s.id!==m.id));setDelItem(null);setEditItem(null);
      setToast({msg:"Madre eliminada",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };
  const stat=(n,l,color)=><div style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"11px 13px"}}>
    <div style={{fontSize:24,fontWeight:800,color:color||C.text,fontVariantNumeric:"tabular-nums"}}>{n}</div><div style={{fontSize:12.5,color:C.textSoft,fontWeight:700}}>{l}</div>
  </div>;
  const madreRow=(m,i)=>{
    const d=daysSince(m.entry_date);const st=madreEstado(m);const col=genMap[m.genetic_name]||C.green;const f=fenoTxt(m,phenoMap);
    const dCol=st==="renovar"?C.red:st==="proxima"?C.amber:C.text;
    return <button key={m.id} onClick={()=>setEditItem(m)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 0",background:"transparent",border:"none",borderTop:`1px solid ${C.border}`,cursor:"pointer",fontFamily:"inherit",color:C.text,textAlign:"left"}}>
      <span style={{width:44,height:44,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:`${col}1F`,color:col,fontSize:f&&f.length>5?10.5:12.5,fontWeight:800,textAlign:"center",lineHeight:1.05,padding:2,wordBreak:"break-all"}}>{f||<Icon n="tree" size={20}/>}</span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:15,fontWeight:700}}>{m.pot_label?`Maceta ${m.pot_label}`:"Sin maceta"}{f?` · ${f}`:""}{(m.count||0)>1?` · ${m.count} pl.`:""}</span>
        <span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>{m.pot_size?`${m.pot_size}, `:""}desde {fmtDM(m.entry_date)}</span>
      </span>
      {st==="renovar"&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.redLight,color:C.red}}>Renovar</span>}
      {st==="proxima"&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.amberLight,color:C.amber}}>Próxima</span>}
      <span style={{textAlign:"right",minWidth:40}}><span style={{display:"block",fontSize:17,fontWeight:800,color:dCol,fontVariantNumeric:"tabular-nums"}}>{d}</span><span style={{fontSize:11.5,color:C.textSoft,fontWeight:600}}>días</span></span>
    </button>;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showAdd&&<VegModal type="madre" genetics={genetics} phenos={phenos} onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();setToast({msg:"Madre guardada ✓",type:"success"});}}/>}
    {editItem&&!delItem&&<VegModal type="madre" item={editItem} genetics={genetics} phenos={phenos} onDelete={isAdmin?()=>setDelItem(editItem):null} onClose={()=>setEditItem(null)} onSaved={()=>{setEditItem(null);load();setToast({msg:"Madre guardada ✓",type:"success"});}}/>}
    {delItem&&<ConfirmModal title="¿Eliminar esta madre?" busy={busy} onClose={()=>setDelItem(null)} onConfirm={borrar}
      text={`Se borra la madre ${delItem.genetic_name}${fenoTxt(delItem,phenoMap)?` ${fenoTxt(delItem,phenoMap)}`:""}${delItem.pot_label?` (maceta ${delItem.pot_label})`:""} con sus notas. No se puede deshacer.`}/>}

    <PageTitle right={isAdmin&&<button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Agregar</button>}>Madres</PageTitle>
    <div style={{display:"flex",gap:8}}>
      {stat(total,"madres")}{stat(order.length,`genética${order.length===1?"":"s"}`)}{stat(paraRenovar,"para renovar",paraRenovar?C.red:null)}
    </div>
    <div style={{fontSize:13,color:C.textSoft,fontWeight:600,padding:"0 2px"}}>{proximas>0?`${proximas} más llega${proximas===1?"":"n"} a los ${MADRE_RENOVAR} días en las próximas dos semanas. `:""}Se marcan para renovar a los {MADRE_RENOVAR} días.</div>

    {order.map(([g,list])=>{
      const n=list.reduce((a,m)=>a+(m.count||0),0);const r=list.filter(m=>madreEstado(m)==="renovar").length;
      list.sort((a,b)=>String(a.entry_date||"").localeCompare(String(b.entry_date||"")));
      return <Card key={g} style={{padding:"4px 14px 2px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0 8px"}}>
          <span style={{width:12,height:12,borderRadius:"50%",background:genMap[g]||C.green}}/>
          <span style={{flex:1,fontSize:16,fontWeight:800,color:C.text}}>{g}</span>
          {r>0&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.redLight,color:C.red}}>{r} renovar</span>}
          <span style={{fontSize:22,fontWeight:800,color:C.text}}>{n}</span>
        </div>
        {list.map(madreRow)}
      </Card>;
    })}
    {order.length===0&&<Card style={{textAlign:"center",padding:"26px 18px"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="tree" size={30}/></div>
      <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>Sin madres cargadas</div>
      <div style={{fontSize:13,color:C.textSoft}}>{isAdmin?"Tocá “Agregar” para cargar la primera.":"Un administrador tiene que cargarlas."}</div>
    </Card>}
    {inactivas.length>0&&<Fold icon="tree" title="Inactivas" count={inactivas.length}>{inactivas.map(madreRow)}</Fold>}
  </div>;
}

// ── ESQUEJERAS ───────────────────────────────────────────────────────────────
// Alta de esquejera: nombre y medida en filas × columnas (las columnas son letras A, B, C...).
function NuevaEsquejeraSheet({cloners,user,onClose,onSaved}){
  const [name,setName]=useState(`Esquejera ${cloners.length+1}`);
  const [rows,setRows]=useState(6);
  const [cols,setCols]=useState(8);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const r=Math.max(1,Math.min(20,+rows||1)), c=Math.max(1,Math.min(10,+cols||1));
  const save=async()=>{
    const nm=name.trim();
    if(!nm){setErr("Poné un nombre.");return;}
    if(cloners.some(x=>String(x.label||"").toLowerCase()===nm.toLowerCase())){setErr("Ya hay una esquejera con ese nombre.");return;}
    setSaving(true);setErr(null);
    try{
      await db.insert("cloners",{label:nm,capacity:r*c,cols:c});
      await logA(user.name,`Agregó esquejera: ${nm} (${r}×${c})`,"esquejera");
      onSaved(`${nm} agregada: ${r*c} lugares ✓`);
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title="Nueva esquejera" sub="Las columnas van con letras y las filas con números, como en la bandeja." onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:10}}>{err}</div>}
    <FI label="Nombre" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Esquejera 4"/>
    <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
      <div style={{flex:1}}><NumField label="Filas" value={rows} onCommit={v=>setRows(v===""?1:+v)} min={1} max={20}/></div>
      <div style={{fontSize:20,fontWeight:800,color:C.textSoft,paddingBottom:22}}>×</div>
      <div style={{flex:1}}><NumField label="Columnas" value={cols} onCommit={v=>setCols(v===""?1:+v)} min={1} max={10}/></div>
    </div>
    <div style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 10px",marginBottom:14,display:"flex",flexDirection:"column",alignItems:"center",gap:8,overflowX:"auto"}}>
      <ClonerGrid capacity={r*c} cols={c} colorAt={()=>null} cell={16}/>
      <div style={{fontSize:13,fontWeight:800,color:C.text}}>{r} × {c} = {r*c} lugares</div>
    </div>
    <div style={{display:"flex",gap:10}}>
      <Btn onClick={save} disabled={saving} style={{flex:1,minHeight:48}}>{saving?"Guardando...":"Agregar"}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={saving} style={{flex:1,minHeight:48}}>Cancelar</Btn>
    </div>
  </Sheet>;
}
function EsquejerasPage({genetics,user}){
  const [cloners,setCloners]=useState([]);
  const [clSlots,setClSlots]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showEsp,setShowEsp]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const isAdmin=user?.role==="admin";
  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([db.get("cloners"),db.get("cloner_slots")])
      .then(([c,cs])=>{setCloners(c);setClSlots(cs);}).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);
  if(loading)return <Spin/>;
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const usados=clSlots.filter(s=>s.genetic_name).length;
  const espC=showEsp!==null?cloners.find(c=>sid(c.id)===sid(showEsp)):null;

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {espC&&<EsquejeraModal cloner={espC} slots={clSlots.filter(s=>sid(s.cloner_id)===sid(espC.id))} genetics={genetics} user={user} onClose={()=>setShowEsp(null)} onSaved={(msg)=>{setShowEsp(null);load();setToast({msg:typeof msg==="string"?msg:"Esquejera guardada ✓",type:"success"});}}/>}

    {showNew&&<NuevaEsquejeraSheet cloners={cloners} user={user} onClose={()=>setShowNew(false)} onSaved={m=>{setShowNew(false);load();setToast({msg:m,type:"success"});}}/>}
    <PageTitle sub={`${usados} esqueje${usados===1?"":"s"} en ${cloners.length} bandeja${cloners.length===1?"":"s"}. Al cosechar, lo que prendió pasa a VG.`}
      right={isAdmin&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Agregar</button>}>Esquejeras</PageTitle>

    {cloners.map(cl=>{
      const slots=clSlots.filter(s=>sid(s.cloner_id)===sid(cl.id));
      const used=slots.filter(s=>s.genetic_name);
      const gC={};used.forEach(s=>{gC[s.genetic_name]=(gC[s.genetic_name]||0)+1;});
      const mix=Object.entries(gC).sort((a,b)=>b[1]-a[1]);
      const prog=used.length>0?batchProgress(cl,slots):null;
      return <Card key={cl.id} onClick={()=>setShowEsp(cl.id)} style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{width:42,height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:C.greenLight,color:C.green,flexShrink:0}}><Icon n="scissors" size={22}/></span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>{cl.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:prog?prog.color:C.textSoft}}>{prog?prog.label.replace(" · ",", "):"Vacía, tocá para cargar"}</div>
          </div>
          <span style={{textAlign:"right"}}><span style={{display:"block",fontSize:22,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{used.length}</span><span style={{fontSize:12,color:C.textSoft,fontWeight:600}}>de {cl.capacity}</span></span>
          <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
        </div>
        {mix.length>0&&<>
          <div style={{marginTop:12}}><Stripe mix={mix} genMap={genMap}/></div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}>
            {mix.map(([g,n])=><span key={g} style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,fontWeight:700,color:C.textMid}}><span style={{width:8,height:8,borderRadius:"50%",background:genMap[g]||C.green}}/>{g} <b style={{color:C.text}}>{n}</b></span>)}
          </div>
        </>}
      </Card>;
    })}
    {cloners.length===0&&<Card style={{textAlign:"center",color:C.textSoft,fontSize:14,padding:"20px 0"}}>{isAdmin?"Sin esquejeras. Tocá “Agregar” para cargar la primera.":"Sin esquejeras cargadas."}</Card>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAREAS — un solo lugar: vencidas, hoy, mañana, esta semana y más adelante
// ══════════════════════════════════════════════════════════════════════════════
function TareasPageV2({user,rooms}){
  const [tasks,setTasks]=useState([]);
  const [done,setDone]=useState([]);
  const [loading,setLoading]=useState(true);
  const [who,setWho]=useState("todas");
  const [place,setPlace]=useState("Todos");
  const [sel,setSel]=useState(null);
  const [editT,setEditT]=useState(null);
  const [delT,setDelT]=useState(null);
  const [info,setInfo]=useState(null);
  const [showQuick,setShowQuick]=useState(false);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);

  const load=useCallback(async()=>{
    try{
      const [p,d]=await Promise.all([
        db.query("tasks","status=eq.pendiente&order=due_date.asc,priority.desc,created_at.asc"),
        db.query("tasks","status=eq.completada&order=completed_at.desc&limit=40"),
      ]);
      setTasks(p);setDone(d);
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  if(loading)return <Spin/>;

  const places=["Todos",...rooms,"Vegetativo","General"];
  const inPlace=t=>place==="Todos"?true:place==="General"?!(rooms.includes(t.room_id)||t.room_id==="Vegetativo"):t.room_id===place;
  const mine=t=>who==="mias"?t.assignee===user.name:true;
  const list=tasks.filter(t=>mine(t)&&inPlace(t));
  const hechas=done.filter(t=>mine(t)&&inPlace(t));
  const groupOf=t=>{const d=daysTo(t.due_date);if(d<0)return "Vencidas";if(d===0)return "Hoy";if(d===1)return "Mañana";if(d<=7)return "Esta semana";return "Más adelante";};
  const ORDER=["Vencidas","Hoy","Mañana","Esta semana","Más adelante"];
  const groups={};list.forEach(t=>{(groups[groupOf(t)]=groups[groupOf(t)]||[]).push(t);});
  const whenTxt=d=>{const n=daysTo(d);if(n===0)return "hoy";if(n===1)return "mañana";if(n===-1)return "ayer";return fmtDM(d);};
  const tone=r=>r==="S1"?C.amber:r==="S2"?C.blue:r==="Vegetativo"?C.green:C.textSoft;
  const roomShort=r=>r==="Vegetativo"?"Vege":(r||"General");

  const completar=async t=>{
    setTasks(prev=>prev.filter(x=>x.id!==t.id));
    const doneT={...t,status:"completada",completed_at:new Date().toISOString()};
    setDone(prev=>[doneT,...prev]);setSel(null);
    try{
      await db.update("tasks",t.id,{status:"completada",completed_at:doneT.completed_at});
      let next=await pestTaskDone(t,user.name);
      if(next)setTasks(prev=>[...prev,next].sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))));
      if(!next&&t.recurrent&&t.recurrent_days){
        const ins=await db.insert("tasks",{title:t.title,room_id:t.room_id,rooms:t.rooms||t.room_id,type:t.type,assignee:t.assignee,due_date:addDays(t.due_date,t.recurrent_days),status:"pendiente",priority:t.priority,recurrent:true,recurrent_days:t.recurrent_days,instructions:t.instructions||null,created_by:"sistema"});
        next=ins?.[0]||null;if(next)setTasks(prev=>[...prev,next].sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))));
      }
      await logA(user.name,`Completó: ${t.title}`,"task");
      setToast({msg:next?`${t.title}: hecha. La próxima queda para el ${fmtDM(next.due_date)}`:`${t.title}: hecha`,type:"success",undo:async()=>{
        try{
          await db.update("tasks",t.id,{status:"pendiente",completed_at:null});
          if(next)await db.delete("tasks",next.id);
        }catch{}
        load();
      }});
    }catch(e){setToast({msg:errMsg(e),type:"error"});load();}
  };
  const reabrir=async t=>{
    try{await db.update("tasks",t.id,{status:"pendiente",completed_at:null});await logA(user.name,`Reabrió: ${t.title}`,"task");load();setToast({msg:`${t.title}: reabierta`,type:"success"});}
    catch(e){setToast({msg:errMsg(e),type:"error"});}
  };
  const posponer=async(t,dias)=>{
    const nd=addDays(todayISO,dias);setSel(null);
    try{await db.update("tasks",t.id,{due_date:nd});setTasks(prev=>prev.map(x=>x.id===t.id?{...x,due_date:nd}:x));setToast({msg:`Pasada a ${whenTxt(nd)}`,type:"success"});}
    catch(e){setToast({msg:errMsg(e),type:"error"});}
  };
  const borrar=async()=>{
    const t=delT;if(!t)return;setBusy(true);
    try{await db.delete("tasks",t.id);await logA(user.name,`Borró tarea: ${t.title}`,"task");setTasks(prev=>prev.filter(x=>x.id!==t.id));setDone(prev=>prev.filter(x=>x.id!==t.id));setDelT(null);setToast({msg:"Tarea borrada",type:"success"});}
    catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };

  const row=(t,i,g)=>{
    const late=g==="Vencidas";
    const meta=[g==="Hoy"?null:<span key="w" style={{color:late?C.red:C.textSoft}}>{late?`Vencida ${fmtDM(t.due_date)}`:whenTxt(t.due_date)}</span>,t.assignee&&<span key="a">{t.assignee}</span>,t.priority==="alta"&&<span key="p" style={{color:C.amber}}>alta</span>,t.recurrent&&t.recurrent_days&&<span key="r">cada {t.recurrent_days===1?"día":t.recurrent_days===7?"semana":`${t.recurrent_days} días`}</span>].filter(Boolean);
    return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",minHeight:62,borderTop:i?`1px solid ${C.border}`:"none"}}>
      <button onClick={()=>completar(t)} aria-label="Marcar hecha" style={{width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",flexShrink:0,background:"transparent",boxShadow:`inset 0 0 0 2px ${C.borderStrong}`,color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="check" size={18} sw={2.4}/></button>
      <button onClick={()=>setSel(t)} style={{flex:1,minWidth:0,background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0,color:C.text}}>
        <span style={{display:"block",fontSize:15,fontWeight:700}}>{t.title}</span>
        {meta.length>0&&<span style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:1}}>{meta}</span>}
      </button>
      <span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,color:tone(t.room_id),background:`${tone(t.room_id)}1F`,flexShrink:0}}>{roomShort(t.room_id)}</span>
    </div>;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:0,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {info&&<TaskDetailModal task={info} onClose={()=>setInfo(null)}/>}
    {showQuick&&<QuickTaskSheet user={user} rooms={rooms} onClose={()=>setShowQuick(false)} onCreated={t=>{setShowQuick(false);load();setToast({msg:`Tarea creada para ${t.assignee===user.name?"vos":t.assignee}, ${whenTxt(t.due_date)}`,type:"success"});}}/>}
    {editT&&<QuickTaskSheet user={user} rooms={rooms} task={editT} onClose={()=>setEditT(null)} onCreated={()=>{setEditT(null);load();setToast({msg:"Tarea guardada",type:"success"});}}/>}
    {delT&&<ConfirmModal title={`¿Borrar "${delT.title}"?`} text="No se puede deshacer." busy={busy} onClose={()=>setDelT(null)} onConfirm={borrar}/>}
    {sel&&<Sheet title={sel.title} sub={`${roomShort(sel.room_id)}, ${whenTxt(sel.due_date)}${sel.assignee?`, para ${sel.assignee}`:""}`} onClose={()=>setSel(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6}}>
        <Btn full onClick={()=>completar(sel)} style={{minHeight:50}}>Marcar hecha</Btn>
        <div style={{display:"flex",gap:8}}>
          <Btn v="secondary" onClick={()=>posponer(sel,1)} style={{flex:1,minHeight:48}}>Pasar a mañana</Btn>
          <Btn v="secondary" onClick={()=>posponer(sel,3)} style={{flex:1,minHeight:48}}>En 3 días</Btn>
        </div>
        {sel.instructions&&<Btn v="secondary" full onClick={()=>{setInfo(sel);setSel(null);}} style={{minHeight:48}}>Ver instrucciones</Btn>}
        <Btn v="secondary" full onClick={()=>{setEditT(sel);setSel(null);}} style={{minHeight:48}}>Editar</Btn>
        <Btn v="danger" full onClick={()=>{setDelT(sel);setSel(null);}} style={{minHeight:48}}>Borrar</Btn>
      </div>
    </Sheet>}

    <PageTitle right={<button onClick={()=>setShowQuick(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Nueva</button>}>Tareas</PageTitle>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"12px 2px 0"}}>
      <span style={{fontSize:13.5,color:C.textSoft,fontWeight:600}}>{list.length} pendiente{list.length===1?"":"s"}</span>
      <div style={{display:"inline-flex",background:C.surfaceAlt,borderRadius:99,padding:3,border:`1px solid ${C.border}`}}>
        {[["todas","Todas"],["mias","Mías"]].map(([k,l])=>{const on=who===k;return <button key={k} onClick={()=>setWho(k)} style={{padding:"6px 13px",borderRadius:99,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",background:on?C.surface:"transparent",color:on?C.text:C.textSoft,boxShadow:on?C.shadow:"none"}}>{l}</button>;})}
      </div>
    </div>
    <div style={{display:"flex",gap:7,overflowX:"auto",margin:"12px 0 0",paddingBottom:2,scrollbarWidth:"none"}} className="gm-rail">
      {places.map(p=>{const on=place===p;return <button key={p} onClick={()=>setPlace(p)} style={{flexShrink:0,padding:"8px 13px",borderRadius:99,fontSize:13.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:on?"none":`1px solid ${C.border}`,background:on?C.text:C.surface,color:on?C.bg:C.textMid}}>{p==="Vegetativo"?"Vege":p}</button>;})}
    </div>

    {ORDER.filter(g=>groups[g]).map(g=><div key={g}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"22px 2px 10px"}}>
        <div style={{fontSize:18,fontWeight:800,color:g==="Vencidas"?C.red:C.text}}>{g}</div>
        <span style={{fontSize:13.5,color:C.textSoft,fontWeight:700}}>{groups[g].length}</span>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>{groups[g].map((t,i)=>row(t,i,g))}</Card>
    </div>)}
    {list.length===0&&<Card style={{padding:"26px 18px",textAlign:"center",marginTop:18}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="ok" size={30}/></div>
      <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 2px"}}>Nada pendiente acá</div>
      <div style={{fontSize:13,color:C.textSoft}}>{place!=="Todos"||who!=="todas"?"Probá con otro filtro.":"Creá una con “Nueva”."}</div>
    </Card>}

    {hechas.length>0&&<div style={{marginTop:22}}>
      <Fold icon="check" title="Hechas recientes" count={hechas.length}>
        {hechas.map((t,i)=><div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
          <span style={{color:C.green}}><Icon n="check" size={18} sw={2.4}/></span>
          <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:14.5,fontWeight:700,color:C.textMid}}>{t.title}</span><span style={{fontSize:12,color:C.textSoft,fontWeight:600}}>{roomShort(t.room_id)}{t.completed_at?`, ${fmtDM(String(t.completed_at).slice(0,10))}`:""}</span></span>
          <button onClick={()=>reabrir(t)} style={{fontSize:13,fontWeight:800,color:C.green,background:C.greenLight,border:"none",borderRadius:10,padding:"7px 11px",cursor:"pointer",fontFamily:"inherit"}}>Reabrir</button>
        </div>)}
      </Fold>
    </div>}
  </div>;
}

// ── VG: TANDAS POST-ESQUEJE ──────────────────────────────────────────────────
// Todo se mueve en bloque. Una TANDA (`vg_batches`) tiene fecha y adentro LÍNEAS
// (`vg_lines`) por genética + origen (semilla / esqueje) + feno. Cada línea guarda
// cuántas entraron y cuántas siguen vivas. Las muertes quedan en `vg_losses`
// (con −1 o por reconteo). Al final la tanda pasa entera a S1 o S2.
const VG_ORIG=[{k:"semilla",l:"Origen semilla"},{k:"esqueje",l:"Origen esqueje"}];
const vgKey=l=>`${l.origin}|${l.genetic_name}|${sid(l.pheno_id)||""}|${l.pheno_label||""}`;
const vgColor=p=>p>=80?C.green:p>=60?C.amber:C.red;
const vgOrigTxt=(ls,sep)=>{
  const s=ls.filter(l=>l.origin==="semilla").reduce((a,l)=>a+(l.current_count||0),0);
  const e=ls.filter(l=>l.origin!=="semilla").reduce((a,l)=>a+(l.current_count||0),0);
  const p=[];if(s)p.push(`${s} de semilla`);if(e)p.push(`${e} de esqueje`);return p.join(sep);
};

// Suma líneas a la tanda abierta de esa fecha; si no hay, la crea.
// La usa la cosecha de esquejeras: lo que prendió entra a VG como tanda del día.
const addLinesToVG=async(items,{date=todayISO,source="esquejera",author="sistema"}={})=>{
  const valid=(items||[]).filter(l=>l&&l.count>0);
  if(!valid.length)return null;
  let batch=(await db.query("vg_batches",`status=eq.vg&start_date=eq.${date}&order=created_at.asc&limit=1`))[0];
  if(!batch)batch=(await db.insert("vg_batches",{start_date:date,status:"vg",source,created_by:author}))[0];
  const bid=sid(batch.id);
  const existentes=await db.query("vg_lines",`batch_id=eq.${bid}`);
  for(const l of valid){
    const row={genetic_name:l.genetic_name,origin:l.origin||"esqueje",pheno_id:sid(l.pheno_id),pheno_label:l.pheno_label||null};
    const ex=existentes.find(e=>vgKey(e)===vgKey(row));
    if(ex)await db.update("vg_lines",ex.id,{initial_count:(ex.initial_count||0)+l.count,current_count:(ex.current_count||0)+l.count});
    else await db.insert("vg_lines",{batch_id:bid,...row,initial_count:l.count,current_count:l.count});
  }
  return batch;
};

// Palitos de truco, como en el cuaderno: izquierda, arriba, derecha, abajo y la diagonal cierra el 5.
const TALLY_STROKES=["M3 3.4 L3.4 19","M3 3 L19 3.4","M19 3 L18.6 19","M3.4 19 L19 18.6","M3.6 18.4 L18.4 3.6"];
function TallyMarks({n,ink,animate}){
  if(!(n>0))return <span style={{fontSize:12.5,color:C.textSoft,fontStyle:"italic"}}>tocá para contar</span>;
  const groups=[];for(let i=0;i<Math.floor(n/5);i++)groups.push(5);if(n%5)groups.push(n%5);
  return <span style={{display:"flex",flexWrap:"wrap",gap:"5px 7px",alignItems:"center"}}>
    {groups.map((k,gi)=><svg key={gi} viewBox="0 0 22 22" width={26} height={26} style={{overflow:"visible",flexShrink:0}} aria-hidden="true">
      {TALLY_STROKES.slice(0,k).map((d,si)=><path key={si} d={d} className={animate&&gi===groups.length-1&&si===k-1?"gm-draw":undefined}
        style={{stroke:ink,strokeWidth:2.4,strokeLinecap:"round",fill:"none"}}/>)}
    </svg>)}
  </span>;
}

// Contador a pantalla completa. Sirve para una tanda nueva y para recontar una existente.
function VGCounter({mode,batch,batchLines=[],genetics,madres=[],phenoMap={},onClose,onSave}){
  const [date,setDate]=useState(todayISO);
  const [rows,setRows]=useState(()=>mode==="recuento"
    ?batchLines.map(l=>({key:sid(l.id),lineId:sid(l.id),genetic_name:l.genetic_name,origin:l.origin,pheno_id:sid(l.pheno_id),pheno_label:l.pheno_label||null,n:0,antes:l.current_count||0}))
    :[]);
  const [dirty,setDirty]=useState(false);
  const [last,setLast]=useState({key:null,tick:0});
  const [picker,setPicker]=useState(null);     // origen para el que se está agregando una genética
  const [pickGen,setPickGen]=useState(null);   // genética elegida, esperando que se elija el feno
  const [search,setSearch]=useState("");
  const [showDiff,setShowDiff]=useState(false);
  const [showDiscard,setShowDiscard]=useState(false);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  // Mientras está abierto, la página de atrás no scrollea.
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=prev;};},[]);

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const ink=C.onAccent==="#FFFFFF"?"#2B3494":"#A9B3FF";   // tinta tipo birome, se lee en los dos temas
  const total=rows.reduce((a,r)=>a+r.n,0);
  const totalO=o=>rows.filter(r=>r.origin===o).reduce((a,r)=>a+r.n,0);
  const scrollTo=key=>setTimeout(()=>{const el=document.getElementById(`vgrow-${key}`);if(el)el.scrollIntoView({block:"center",behavior:"smooth"});},60);

  const plus=key=>{
    setRows(prev=>prev.map(r=>r.key===key?{...r,n:r.n+1}:r));
    setDirty(true);setLast(p=>({key,tick:p.tick+1}));
    try{navigator.vibrate&&navigator.vibrate(12);}catch{}
  };
  const minus=key=>{
    setRows(prev=>prev.map(r=>r.key===key&&r.n>0?{...r,n:r.n-1}:r));
    setDirty(true);setLast(p=>({key:null,tick:p.tick}));
  };
  // Fenos disponibles para esquejes de una genética: los de sus madres.
  const fenoOpts=g=>{
    const seen=new Set();const out=[];
    madres.filter(m=>m.genetic_name===g&&(m.pheno_id||m.pheno_label)).forEach(m=>{
      const pid=sid(m.pheno_id);const k=pid||`l:${m.pheno_label}`;
      if(seen.has(k))return;seen.add(k);
      out.push({pheno_id:pid,pheno_label:pid?null:m.pheno_label,code:pid?(phenoMap[pid]?.code||"Feno"):m.pheno_label});
    });
    return out.sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  };
  const addRow=(g,origin,feno)=>{
    const nr={genetic_name:g,origin,pheno_id:feno?.pheno_id||null,pheno_label:feno?.pheno_label||null};
    setPicker(null);setPickGen(null);setSearch("");
    const ya=rows.find(r=>vgKey(r)===vgKey(nr));
    if(ya){scrollTo(ya.key);return;}
    const key=`n${Date.now()}${Math.random().toString(36).slice(2,6)}`;
    setRows(prev=>[...prev,{key,...nr,n:0,antes:mode==="recuento"?null:undefined}]);
    setDirty(true);scrollTo(key);
  };
  const pickGenetic=g=>{
    if(picker==="esqueje"&&fenoOpts(g).length>0)setPickGen(g);
    else addRow(g,picker,null);
  };
  const cerrar=()=>{if(dirty)setShowDiscard(true);else onClose();};
  const guardar=async()=>{
    if(mode==="nueva"&&total===0){setErr("Contá al menos una planta antes de guardar.");return;}
    setSaving(true);setErr(null);
    try{await onSave({date,rows});}
    catch(e){setErr(errMsg(e));setSaving(false);setShowDiff(false);}
  };

  // Diferencias del reconteo, para mostrarlas antes de registrar nada.
  const cambios=rows.map(r=>{const antes=r.antes==null?0:r.antes;return {r,antes,diff:r.n-antes};});
  const bajan=cambios.filter(c=>c.diff<0&&c.r.lineId);
  const suben=cambios.filter(c=>c.diff>0);
  const ceros=cambios.filter(c=>c.r.n===0&&c.antes>0);
  const iguales=cambios.filter(c=>c.diff===0&&c.antes>0).length;
  const perdidas=bajan.reduce((a,c)=>a-c.diff,0);
  const nombre=r=>`${r.genetic_name}${fenoTxt(r,phenoMap)?` ${fenoTxt(r,phenoMap)}`:""}`;
  const itemRow=(c,txt,color)=><div key={c.r.key} style={{display:"flex",alignItems:"baseline",gap:8,padding:"8px 0",borderTop:`1px solid ${C.border}`,fontSize:13.5}}>
    <span style={{flex:1,minWidth:0,color:C.text}}><b>{nombre(c.r)}</b> <span style={{color:C.textSoft}}>({c.r.origin})</span></span>
    <span style={{fontFamily:MONO,fontWeight:700,color,whiteSpace:"nowrap"}}>{txt}</span>
  </div>;

  return <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,display:"flex",flexDirection:"column"}}>
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={cerrar} aria-label="Cerrar" style={{width:42,height:42,borderRadius:11,border:`1px solid ${C.border}`,background:C.bg,fontSize:18,color:C.textMid,cursor:"pointer",flexShrink:0}}>✕</button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:17,fontWeight:900,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mode==="nueva"?"Nueva tanda":`Recontar tanda del ${fmtDM(batch?.start_date)}`}</div>
        <div style={{fontSize:12.5,color:C.textSoft}}>Tocá la fila para sumar 1</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:MONO,fontSize:30,fontWeight:700,color:C.text,lineHeight:1}}>{total}</div>
        <div style={{fontSize:11.5,color:C.textSoft}}>total</div>
      </div>
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"14px 14px 24px",WebkitOverflowScrolling:"touch"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        {err&&!showDiff&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:13,marginBottom:12}}>{err}</div>}
        {mode==="nueva"&&<FI label="Fecha de la tanda" type="date" value={date} onChange={e=>{setDate(e.target.value);setDirty(true);}}/>}
        {mode==="recuento"&&<div style={{fontSize:12.5,color:C.textSoft,margin:"0 2px 12px",lineHeight:1.5}}>Cada fila arranca en 0. Al terminar te muestro las diferencias antes de registrar nada.</div>}
        {VG_ORIG.map(o=>{const rs=rows.filter(r=>r.origin===o.k);return <div key={o.k}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:16,fontWeight:900,color:C.text,margin:"6px 2px 10px"}}>
            <span>{o.l}</span><span style={{fontFamily:MONO}}>{totalO(o.k)}</span>
          </div>
          {rs.length===0&&<div style={{fontSize:13,color:C.textSoft,margin:"0 2px 10px"}}>Agregá las genéticas de {o.k} que vas a contar.</div>}
          {rs.map(r=>{
            const col=genMap[r.genetic_name]||C.green;const on=last.key===r.key;
            return <div key={r.key} id={`vgrow-${r.key}`} style={{position:"relative",display:"flex",alignItems:"stretch",backgroundColor:C.surface,
              backgroundImage:`linear-gradient(${ink}17 1px,transparent 1px),linear-gradient(90deg,${ink}17 1px,transparent 1px)`,backgroundSize:"13px 13px",
              border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10,overflow:"hidden",userSelect:"none",WebkitUserSelect:"none"}}>
              <span style={{position:"absolute",left:0,top:0,bottom:0,width:7,background:col}}/>
              <button onClick={()=>plus(r.key)} aria-label={`Sumar 1 a ${r.genetic_name}`}
                style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:7,padding:"12px 12px 12px 20px",textAlign:"left",minHeight:88,background:"transparent",border:"none",cursor:"pointer",touchAction:"manipulation",color:C.text,
                  animation:on?`${last.tick%2?"gmFlashA":"gmFlashB"} .28s ease-out`:"none"}}>
                <span style={{display:"flex",alignItems:"baseline",gap:8,width:"100%"}}>
                  <span style={{flex:1,minWidth:0,fontSize:15.5,fontWeight:800}}>{r.genetic_name}<FenoChip txt={fenoTxt(r,phenoMap)}/></span>
                  <span style={{fontFamily:MONO,fontSize:28,fontWeight:700,lineHeight:1}}>{r.n}</span>
                </span>
                <TallyMarks n={r.n} ink={ink} animate={on}/>
                {mode==="recuento"&&<span style={{fontSize:12,color:C.textSoft}}>{r.antes==null?"Línea nueva":`Antes había ${r.antes}`}</span>}
              </button>
              <button onClick={()=>minus(r.key)} aria-label={`Restar 1 a ${r.genetic_name}`}
                style={{width:62,flexShrink:0,borderLeft:`1px solid ${C.border}`,borderTop:"none",borderRight:"none",borderBottom:"none",fontSize:30,fontWeight:600,color:C.textMid,background:C.surface,cursor:"pointer",touchAction:"manipulation"}}>−</button>
            </div>;
          })}
          <button onClick={()=>{setPicker(o.k);setSearch("");setPickGen(null);}} style={{width:"100%",minHeight:50,border:`2px dashed ${C.borderStrong}`,borderRadius:14,color:C.green,fontWeight:800,fontSize:14.5,background:"transparent",cursor:"pointer",marginBottom:22}}>+ Agregar genética</button>
        </div>;})}
      </div>
    </div>

    <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,padding:"12px 14px calc(12px + env(safe-area-inset-bottom))"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <Btn full onClick={mode==="nueva"?guardar:()=>{setErr(null);setShowDiff(true);}} disabled={saving} style={{minHeight:50,fontSize:15.5}}>
          {saving?"Guardando...":mode==="nueva"?`Guardar tanda (${total})`:`Revisar reconteo (${total})`}
        </Btn>
      </div>
    </div>

    {picker&&<Modal z={400} title={pickGen?`${pickGen}: ¿de qué feno?`:`Agregar a ${picker==="semilla"?"origen semilla":"origen esqueje"}`} onClose={()=>{setPicker(null);setPickGen(null);}}>
      {!pickGen?<>
        <FI value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar genética"/>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:"50vh",overflowY:"auto"}}>
          {genetics.filter(g=>(g.name||"").toLowerCase().includes(search.trim().toLowerCase())).map(g=><button key={g.id||g.name} onClick={()=>pickGenetic(g.name)}
            style={{display:"flex",alignItems:"center",gap:11,minHeight:50,padding:"0 12px",borderRadius:11,border:`1px solid ${C.border}`,background:C.bg,fontWeight:700,fontSize:15,color:C.text,textAlign:"left",cursor:"pointer",flexShrink:0}}>
            <span style={{width:16,height:16,borderRadius:"50%",background:g.color||C.green,flexShrink:0}}/>{g.name}
          </button>)}
        </div>
      </>:<>
        <div style={{fontSize:13.5,color:C.textMid,marginBottom:12,lineHeight:1.5}}>Hay madres de esta genética con feno. Elegí de cuál salieron los esquejes.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button onClick={()=>addRow(pickGen,picker,null)} style={{minHeight:46,padding:"0 16px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.bg,color:C.textMid,fontWeight:800,fontSize:14,cursor:"pointer"}}>Sin feno</button>
          {fenoOpts(pickGen).map(f=><button key={f.pheno_id||`l:${f.pheno_label}`} onClick={()=>addRow(pickGen,picker,f)} style={{minHeight:46,padding:"0 16px",borderRadius:12,border:`1.5px solid ${C.purple}55`,background:C.purpleLight,color:C.purple,fontWeight:900,fontSize:14.5,cursor:"pointer"}}>{f.code}</button>)}
        </div>
      </>}
    </Modal>}

    {showDiff&&<Modal z={400} title="Revisá el reconteo" onClose={()=>{if(!saving)setShowDiff(false);}}>
      {ceros.length>0&&<div style={{background:C.amberLight,color:C.amber,borderRadius:10,padding:"10px 12px",fontSize:13,fontWeight:600,marginBottom:12,lineHeight:1.5}}>
        Quedaron en 0: {ceros.map(c=>nombre(c.r)).join(", ")}. Si te salteaste alguna fila, volvé y contala.
      </div>}
      {bajan.length>0?<>
        <div style={{fontSize:14.5,fontWeight:800,color:C.text,margin:"2px 0 6px"}}>Se registran {perdidas} pérdida{perdidas===1?"":"s"}</div>
        <div style={{marginBottom:12}}>{bajan.map(c=>itemRow(c,`${c.antes} → ${c.r.n} (−${-c.diff})`,C.red))}</div>
      </>:<div style={{fontSize:14,color:C.textMid,marginBottom:12}}>No hay pérdidas nuevas.</div>}
      {suben.length>0&&<>
        <div style={{fontSize:14,fontWeight:800,color:C.text,margin:"2px 0 6px"}}>Hay más que antes: se corrige la cantidad</div>
        <div style={{marginBottom:12}}>{suben.map(c=>itemRow(c,c.r.antes==null?`nueva: ${c.r.n}`:`${c.antes} → ${c.r.n} (+${c.diff})`,C.amber))}</div>
      </>}
      {iguales>0&&<div style={{fontSize:12.5,color:C.textSoft,marginBottom:12}}>{iguales} línea{iguales===1?"":"s"} sin cambios.</div>}
      {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:13,marginBottom:12}}>{err}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Btn full onClick={guardar} disabled={saving}>{saving?"Guardando...":"Registrar reconteo"}</Btn>
        <Btn full v="secondary" onClick={()=>setShowDiff(false)} disabled={saving}>Volver a contar</Btn>
      </div>
    </Modal>}

    {showDiscard&&<ConfirmModal z={400} title="¿Salir sin guardar?" text="Se pierde lo que contaste en esta pantalla." confirmLabel="Salir sin guardar" onConfirm={onClose} onClose={()=>setShowDiscard(false)}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// VG → SALA: una tanda que pasa a una sala queda "por ubicar" en el ciclo de esa
// sala. El stock (genética + feno) ya está en la sala y se acomoda mesa por mesa.
// Por ubicar = lo que llegó por tandas − lo que ya está dibujado en las mesas.
// ══════════════════════════════════════════════════════════════════════════════
const poolKey=(g,pid,lab)=>`${g||""}|${pid?sid(pid):""}|${pid?"":(lab||"")}`;
const buildPool=(lines=[],cells=[])=>{
  const acc={};
  lines.forEach(l=>{
    const n=l.current_count||0;if(n<=0||!l.genetic_name)return;
    const k=poolKey(l.genetic_name,l.pheno_id,l.pheno_label);
    acc[k]=acc[k]||{key:k,genetic_name:l.genetic_name,pheno_id:l.pheno_id?sid(l.pheno_id):null,pheno_label:l.pheno_id?null:(l.pheno_label||null),arrived:0,placed:0};
    acc[k].arrived+=n;
  });
  cells.forEach(c=>{if(!c.genetic_name)return;const k=poolKey(c.genetic_name,c.pheno_id,c.pheno_label);if(acc[k])acc[k].placed++;});
  return Object.values(acc).map(p=>({...p,left:Math.max(0,p.arrived-p.placed)})).sort((a,b)=>b.left-a.left||a.genetic_name.localeCompare(b.genetic_name));
};
// Estado de una sala para recibir una tanda: sin ciclo (se abre en vege), en vege (se suma) o en flora (no recibe).
const salaRecibe=(cyc)=>!cyc?{ok:true,txt:"Sin ciclo: se abre en vegetativo"}
  :cyc.phase==="vegetativo"?{ok:true,txt:`En vegetativo desde ${fmtDM(cyc.veg_start||cyc.created_at)}: se suma`}
  :{ok:false,txt:`En ${cyc.phase}: no recibe tandas`};
async function enviarTandaASala({batch,lines,room,date,rc,user}){
  const cs=await db.query("cycles",`room_id=eq.${room}&active=eq.true&order=created_at.desc`);
  let c=cs[0]||null;
  if(c&&c.phase!=="vegetativo")throw new Error(`${rc.display_name} está en ${c.phase}. Solo recibe tandas en vegetativo o sin ciclo.`);
  const vd=+rc.veg_days||6, fd=+rc.flower_days||65;
  if(!c){
    const ins=await db.insert("cycles",{room_id:room,phase:"vegetativo",veg_start:date,veg_end:addDays(date,vd),flower_start:addDays(date,vd),estimated_harvest:addDays(date,vd+fd),irrigation_type:rc.irrigation_type||(room==="S1"?"automático":"manual"),active:true});
    c=ins[0];
    await logA(user,`Abrió ciclo en vegetativo en ${room} al pasar la tanda del ${fmtDM(batch.start_date)}`,"cycle");
  }
  const cg=await db.query("cycle_genetics",`cycle_id=eq.${c.id}`);
  const have=new Set(cg.map(x=>x.genetic_name));
  const nuevas=[...new Set(lines.filter(l=>(l.current_count||0)>0).map(l=>l.genetic_name))].filter(g=>g&&!have.has(g));
  if(nuevas.length)await db.insert("cycle_genetics",nuevas.map(g=>({cycle_id:c.id,genetic_name:g,plant_count:0})));
  await db.update("vg_batches",batch.id,{status:"sala",dest_room:room,moved_date:date,cycle_id:sid(c.id)});
  const n=lines.reduce((a,l)=>a+(l.current_count||0),0);
  await logA(user,`Pasó la tanda de VG del ${fmtDM(batch.start_date)} a ${room} (${n} plantas por ubicar)`,"vg");
  return c;
}
// Lo que sobró sin lugar se descuenta de la tanda como pérdida de trasplante.
async function descartarSobrantes({cycleId,pool,user}){
  const bs=await db.query("vg_batches",`cycle_id=eq.${sid(cycleId)}`);
  const bids=bs.map(b=>sid(b.id));
  const ls=bids.length?await db.query("vg_lines",`batch_id=in.(${bids.join(",")})&order=created_at.asc`):[];
  let total=0;const losses=[];
  for(const p of pool){
    let rest=p.left;if(rest<=0)continue;
    for(const l of ls.filter(x=>poolKey(x.genetic_name,x.pheno_id,x.pheno_label)===p.key)){
      if(rest<=0)break;
      const cur=l.current_count||0;const q=Math.min(cur,rest);if(q<=0)continue;
      await db.update("vg_lines",l.id,{current_count:cur-q});l.current_count=cur-q;
      losses.push({batch_id:sid(l.batch_id),line_id:sid(l.id),genetic_name:l.genetic_name,origin:l.origin,qty:q,method:"trasplante",loss_date:todayISO,author:user});
      rest-=q;total+=q;
    }
  }
  if(losses.length)await db.insert("vg_losses",losses);
  if(total)await logA(user,`Dio por perdidas ${total} plantas sin lugar al trasplante`,"vg");
  return total;
}

function VGPage({genetics,user,roomConfig=[]}){
  const isAdmin=user?.role==="admin";
  const [batches,setBatches]=useState([]);
  const [lines,setLines]=useState([]);
  const [losses,setLosses]=useState([]);
  const [madres,setMadres]=useState([]);
  const [phenos,setPhenos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadErr,setLoadErr]=useState(null);
  const [selId,setSelId]=useState(null);
  const [counter,setCounter]=useState(null);   // {mode:"nueva"} | {mode:"recuento",batch}
  const [showSala,setShowSala]=useState(false);
  const [sala,setSala]=useState("S1");
  const [salaDate,setSalaDate]=useState(todayISO);
  const [salaCycles,setSalaCycles]=useState({});   // ciclo activo de cada sala, para saber si recibe
  const [showVgMenu,setShowVgMenu]=useState(false);
  const [showDel,setShowDel]=useState(false);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);

  const load=useCallback(async(quiet)=>{
    if(!quiet)setLoading(true);
    try{
      const [b,l,x]=await Promise.all([
        db.query("vg_batches","order=start_date.desc,created_at.desc"),
        db.query("vg_lines","order=created_at.asc"),
        db.query("vg_losses","order=created_at.desc"),
      ]);
      setBatches(b);setLines(l);setLosses(x);setLoadErr(null);
      const [m,p]=await Promise.all([
        db.query("veg_stock","type=eq.madre").catch(()=>[]),
        db.query("phenos","select=id,code,number,genetic_name").catch(()=>[]),
      ]);
      setMadres(m);setPhenos(p);
    }catch(e){setLoadErr(errMsg(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  if(loading)return <Spin/>;
  if(loadErr)return <Card style={{marginTop:12}}>
    <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>No pude leer las tandas de VG</div>
    <div style={{fontSize:13.5,color:C.textMid,lineHeight:1.5,marginBottom:10}}>Casi seguro falta correr el SQL de esta actualización en Supabase.</div>
    <div style={{fontSize:12,color:C.red,fontFamily:MONO,wordBreak:"break-word"}}>{loadErr}</div>
  </Card>;

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const phenoMap={};phenos.forEach(p=>{phenoMap[sid(p.id)]=p;});
  const linesOf=bid=>lines.filter(l=>sid(l.batch_id)===sid(bid));
  const sumK=(ls,k)=>ls.reduce((a,l)=>a+(l[k]||0),0);
  const pctOf=ls=>{const i=sumK(ls,"initial_count");return i>0?Math.round(sumK(ls,"current_count")/i*100):0;};
  const abiertas=batches.filter(b=>b.status!=="sala");
  const cerradas=batches.filter(b=>b.status==="sala").sort((a,b)=>String(b.moved_date||"").localeCompare(String(a.moved_date||"")));
  const plantas=abiertas.reduce((a,b)=>a+sumK(linesOf(b.id),"current_count"),0);
  const sel=selId?batches.find(b=>sid(b.id)===selId):null;
  const autor=user?.name||"—";

  // ── acciones ──
  const crearTanda=async({date,rows})=>{
    const b=(await db.insert("vg_batches",{start_date:date||todayISO,status:"vg",source:"manual",created_by:autor}))[0];
    const ls=rows.filter(r=>r.n>0).map(r=>({batch_id:sid(b.id),genetic_name:r.genetic_name,origin:r.origin,pheno_id:r.pheno_id||null,pheno_label:r.pheno_label||null,initial_count:r.n,current_count:r.n}));
    try{if(ls.length)await db.insert("vg_lines",ls);}
    catch(e){try{await db.delete("vg_batches",b.id);}catch{}throw e;}   // sin líneas no queda una tanda vacía
    const n=ls.reduce((a,l)=>a+l.initial_count,0);
    await logA(autor,`Creó la tanda de VG del ${fmtDM(b.start_date)} (${n} plantas)`,"vg");
    setCounter(null);setSelId(sid(b.id));await load(true);
    setToast({msg:`Tanda del ${fmtDM(b.start_date)} guardada: ${n} plantas`,type:"success"});
  };
  const registrarReconteo=async({rows})=>{
    const b=counter.batch;const bid=sid(b.id);
    const perd=[];let nPerd=0;
    for(const r of rows){
      if(r.lineId){
        const l=lines.find(x=>sid(x.id)===r.lineId);if(!l)continue;
        const diff=r.n-(l.current_count||0);
        if(diff!==0)await db.update("vg_lines",l.id,{current_count:r.n,initial_count:Math.max(l.initial_count||0,r.n)});
        if(diff<0){nPerd+=-diff;perd.push({batch_id:bid,line_id:sid(l.id),genetic_name:l.genetic_name,origin:l.origin,qty:-diff,method:"reconteo",loss_date:todayISO,author:autor});}
      }else if(r.n>0){
        await db.insert("vg_lines",{batch_id:bid,genetic_name:r.genetic_name,origin:r.origin,pheno_id:r.pheno_id||null,pheno_label:r.pheno_label||null,initial_count:r.n,current_count:r.n});
      }
    }
    if(perd.length)await db.insert("vg_losses",perd);
    await logA(autor,`Recontó la tanda de VG del ${fmtDM(b.start_date)}: ${nPerd} pérdidas`,"vg");
    setCounter(null);await load(true);
    setToast({msg:nPerd?`Reconteo registrado: ${nPerd} pérdida${nPerd===1?"":"s"}`:"Reconteo registrado, sin pérdidas",type:"success"});
  };
  const murio=async(line)=>{
    const cur=line.current_count||0;if(cur<=0)return;
    const n=cur-1;const lid=sid(line.id);
    setLines(prev=>prev.map(l=>sid(l.id)===lid?{...l,current_count:n}:l));
    try{
      await db.update("vg_lines",line.id,{current_count:n});
      const ins=await db.insert("vg_losses",{batch_id:sid(line.batch_id),line_id:lid,genetic_name:line.genetic_name,origin:line.origin,qty:1,method:"murio",loss_date:todayISO,author:autor});
      const reg=ins?.[0];
      if(reg)setLosses(prev=>[reg,...prev]);
      setToast({msg:`${line.genetic_name}: −1 registrado`,type:"success",undo:async()=>{
        setLines(prev=>prev.map(l=>sid(l.id)===lid?{...l,current_count:n+1}:l));
        if(reg)setLosses(prev=>prev.filter(x=>sid(x.id)!==sid(reg.id)));
        try{await db.update("vg_lines",line.id,{current_count:n+1});if(reg)await db.delete("vg_losses",reg.id);}catch{load(true);}
      }});
    }catch(e){setToast({msg:errMsg(e),type:"error"});load(true);}
  };
  const abrirPase=async()=>{
    setSalaDate(todayISO);setShowSala(true);
    try{
      const cs=await db.query("cycles","active=eq.true&order=created_at.desc");
      const m={};cs.forEach(c=>{if(!m[c.room_id])m[c.room_id]=c;});setSalaCycles(m);
      setSala(["S1","S2"].find(r=>salaRecibe(m[r]).ok)||"S1");
    }catch{setSalaCycles({});setSala("S1");}
  };
  // Pasa la tanda a la sala: abre o usa el ciclo en vege y deja el stock "por ubicar".
  const pasarSala=async(room,date)=>{
    if(!sel)return;setBusy(true);
    try{
      const rc=getRC(roomConfig,room);
      await enviarTandaASala({batch:sel,lines:linesOf(sel.id),room,date:date||todayISO,rc,user:autor});
      setShowSala(false);setSelId(null);await load(true);
      setToast({msg:`Tanda del ${fmtDM(sel.start_date)} en ${rc.display_name}: queda por ubicar en las mesas ✓`,type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };
  const devolverVG=async()=>{
    if(!sel)return;setBusy(true);
    try{
      await db.update("vg_batches",sel.id,{status:"vg",dest_room:null,moved_date:null,cycle_id:null});
      await logA(autor,`Devolvió a VG la tanda del ${fmtDM(sel.start_date)}`,"vg");
      await load(true);
      setToast({msg:`Tanda del ${fmtDM(sel.start_date)} de vuelta en VG`,type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };
  const eliminar=async()=>{
    if(!sel)return;setBusy(true);
    try{
      const bid=sid(sel.id);
      await db.deleteWhere("vg_losses","batch_id",bid);
      await db.deleteWhere("vg_lines","batch_id",bid);
      await db.delete("vg_batches",sel.id);
      await logA(autor,`Eliminó la tanda de VG del ${fmtDM(sel.start_date)}`,"vg");
      setShowDel(false);setSelId(null);await load(true);
      setToast({msg:`Tanda del ${fmtDM(sel.start_date)} eliminada`,type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };

  const overlay=<>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {counter&&<VGCounter mode={counter.mode} batch={counter.batch} batchLines={counter.batch?linesOf(counter.batch.id):[]}
      genetics={genetics} madres={madres} phenoMap={phenoMap} onClose={()=>setCounter(null)}
      onSave={counter.mode==="nueva"?crearTanda:registrarReconteo}/>}
  </>;

  // ── detalle de una tanda ──
  if(sel){
    const ls=linesOf(sel.id);const cerrada=sel.status==="sala";
    const vivas=sumK(ls,"current_count"),entraron=sumK(ls,"initial_count"),p=pctOf(ls),muertas=entraron-vivas;
    const d=daysSince(sel.start_date);
    const perdidasB=losses.filter(x=>sid(x.batch_id)===sid(sel.id));
    const origTxt=vgOrigTxt(ls," y ");
    const destName=getRC(roomConfig,sel.dest_room||"S1").display_name;
    return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
      {overlay}
      {showSala&&<Sheet title="Pasar a sala" sub={`Entran ${vivas} planta${vivas===1?"":"s"}${origTxt?`: ${origTxt}`:""}`} onClose={()=>{if(!busy)setShowSala(false);}}>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          {["S1","S2"].map(r=>{const st=salaRecibe(salaCycles[r]);const on=sala===r&&st.ok;
            return <button key={r} disabled={!st.ok} onClick={()=>setSala(r)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,cursor:st.ok?"pointer":"default",fontFamily:"inherit",textAlign:"left",background:on?C.greenLight:C.surfaceAlt,border:`2px solid ${on?C.green:C.border}`,opacity:st.ok?1:0.55,color:C.text}}>
              <span style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:on?C.green:C.surface,color:on?C.onAccent:C.textMid}}><Icon n="salas" size={20}/></span>
              <span style={{flex:1,minWidth:0}}>
                <span style={{display:"block",fontSize:16,fontWeight:800}}>{getRC(roomConfig,r).display_name}</span>
                <span style={{display:"block",fontSize:12.5,color:st.ok?C.textSoft:C.red,fontWeight:700}}>{st.txt}</span>
              </span>
              {on&&<span style={{color:C.green}}><Icon n="check" size={20} sw={2.4}/></span>}
            </button>;})}
        </div>
        <FI label="Fecha del trasplante" type="date" value={salaDate} onChange={e=>setSalaDate(e.target.value)}/>
        <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,lineHeight:1.45,marginBottom:12}}>Las plantas quedan “por ubicar” en la sala, con su genética y su feno. Después las acomodás mesa por mesa.</div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={()=>pasarSala(sala,salaDate)} disabled={busy||!salaRecibe(salaCycles[sala]).ok} style={{flex:1,minHeight:48}}>{busy?"Pasando...":`Pasar a ${getRC(roomConfig,sala).display_name}`}</Btn>
          <Btn v="secondary" onClick={()=>setShowSala(false)} disabled={busy} style={{flex:1,minHeight:48}}>Cancelar</Btn>
        </div>
      </Sheet>}
      {showVgMenu&&<Sheet title={`Tanda del ${fmtDM(sel.start_date)}`} onClose={()=>setShowVgMenu(false)}>
        {cerrada&&<SheetRow icon="swap" label="Devolver a VG" onClick={()=>{setShowVgMenu(false);devolverVG();}}/>}
        <SheetRow i={cerrada?1:0} icon="trash" label="Eliminar tanda" danger onClick={()=>{setShowVgMenu(false);setShowDel(true);}}/>
      </Sheet>}
      {showDel&&<ConfirmModal title={`¿Eliminar la tanda del ${fmtDM(sel.start_date)}?`} busy={busy} onClose={()=>setShowDel(false)} onConfirm={eliminar} confirmLabel="Eliminar tanda"
        text={`Se borran las ${vivas} planta${vivas===1?"":"s"} de la tanda y ${perdidasB.length} registro${perdidasB.length===1?"":"s"} de pérdidas. No se puede deshacer.`}/>}

      <button onClick={()=>setSelId(null)} style={{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:2,background:"transparent",border:"none",color:C.green,fontWeight:800,fontSize:14.5,cursor:"pointer",padding:"2px 0",fontFamily:"inherit"}}><Icon n="back" size={20}/>Todas las tandas</button>
      <PageTitle sub={`${cerrada?`Estuvo ${Math.max(0,daysSince(sel.start_date)-daysSince(sel.moved_date))} días en VG`:(d<=0?"Entró hoy":`${d} día${d===1?"":"s"} en VG`)} · ${vivas} vivas de ${entraron}`}
        right={isAdmin&&<button onClick={()=>setShowVgMenu(true)} aria-label="Más acciones de la tanda" style={{width:42,height:42,borderRadius:12,border:`1px solid ${C.border}`,cursor:"pointer",background:C.surface,color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="mas" size={22}/></button>}>Tanda del {fmtDM(sel.start_date)}</PageTitle>

      <Card style={{padding:"16px 16px 14px"}}>
        {cerrada&&<div style={{display:"flex",alignItems:"center",gap:8,background:C.greenLight,color:C.green,borderRadius:12,padding:"10px 12px",fontWeight:800,fontSize:13.5,marginBottom:12}}><Icon n="salas" size={18}/>Pasó a {destName} el {fmtDM(sel.moved_date)}</div>}
        {cerrada&&!sel.cycle_id&&isAdmin&&<div style={{background:C.amberLight,borderRadius:12,padding:"12px 13px",marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:800,color:C.amber,marginBottom:4}}>Esta tanda no quedó cargada en la sala</div>
          <div style={{fontSize:13,color:C.textMid,lineHeight:1.45,marginBottom:10}}>Se pasó antes de que existiera “Por ubicar”. Si todavía la tenés que acomodar, mandala ahora y queda lista para ubicar en las mesas.</div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>pasarSala(sel.dest_room||"S1",sel.moved_date||todayISO)} disabled={busy} style={{flex:1,minHeight:46}}>{busy?"...":`Ubicar en ${destName}`}</Btn>
            <Btn v="secondary" onClick={devolverVG} disabled={busy} style={{flex:1,minHeight:46}}>Devolver a VG</Btn>
          </div>
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:cerrada?0:14}}>
          <span style={{fontSize:34,fontWeight:800,lineHeight:1,color:vgColor(p),fontVariantNumeric:"tabular-nums"}}>{p}%</span>
          <div style={{flex:1}}>
            <Bar value={p} max={100} color={vgColor(p)} h={9}/>
            <div style={{fontSize:13,color:C.textSoft,fontWeight:600,marginTop:5}}>{muertas>0?`${muertas} planta${muertas===1?"":"s"} perdida${muertas===1?"":"s"}`:"Todavía no se murió ninguna"}</div>
          </div>
        </div>
        {!cerrada&&<div style={{display:"flex",gap:10}}>
          <Btn v="secondary" onClick={()=>{setToast(null);setCounter({mode:"recuento",batch:sel});}} style={{flex:1,minHeight:48}}>Recontar</Btn>
          {isAdmin&&<Btn onClick={abrirPase} style={{flex:1,minHeight:48}}>Pasar a sala</Btn>}
        </div>}
      </Card>

      {VG_ORIG.map(o=>{
        const lo=ls.filter(l=>(o.k==="semilla")===(l.origin==="semilla"));
        if(!lo.length)return null;
        return <Card key={o.k} style={{padding:"12px 16px 4px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"2px 0 6px"}}>
            <span style={{fontSize:15.5,fontWeight:800,color:C.text}}>{o.l}</span><span style={{fontSize:20,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{sumK(lo,"current_count")}</span>
          </div>
          {lo.map(l=>{
            const cur=l.current_count||0,ini=l.initial_count||0,perd=ini-cur;const col=genMap[l.genetic_name]||C.green;
            return <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:`1px solid ${C.border}`}}>
              <span style={{width:10,alignSelf:"stretch",minHeight:38,borderRadius:4,background:col,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15.5,fontWeight:800,color:C.text}}>{l.genetic_name}<FenoChip txt={fenoTxt(l,phenoMap)}/></div>
                <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600}}>Entraron {ini}{perd>0?` (−${perd})`:""}</div>
              </div>
              <div style={{fontSize:24,fontWeight:800,color:C.text,minWidth:36,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}</div>
              {!cerrada&&<button onClick={()=>murio(l)} disabled={cur<=0}
                style={{minHeight:44,padding:"0 12px",borderRadius:12,border:"none",color:C.red,fontWeight:800,fontSize:13.5,background:C.redLight,whiteSpace:"nowrap",cursor:cur>0?"pointer":"default",opacity:cur>0?1:0.35,flexShrink:0,fontFamily:"inherit"}}>−1 murió</button>}
            </div>;
          })}
        </Card>;
      })}
      {ls.length===0&&<Card style={{textAlign:"center",color:C.textSoft,fontSize:13.5,padding:"18px 0"}}>Esta tanda no tiene plantas cargadas.</Card>}

      <Fold icon="history" title="Registro de pérdidas" count={perdidasB.length}>
        {perdidasB.length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"4px 0"}}>Sin pérdidas registradas.</div>}
        {perdidasB.map((x,idx)=><div key={x.id} style={{display:"flex",gap:10,alignItems:"baseline",fontSize:13.5,padding:"8px 0",borderTop:idx?`1px solid ${C.border}`:"none"}}>
          <span style={{color:C.textSoft,fontWeight:700,minWidth:42}}>{fmtDM(x.loss_date)}</span>
          <span style={{flex:1,minWidth:0,color:C.text}}><b>{x.genetic_name}</b> −{x.qty} <span style={{color:C.textSoft}}>· {x.author||"—"}</span></span>
          <span style={{fontSize:12,color:C.textSoft,fontWeight:700,whiteSpace:"nowrap"}}>{x.method==="reconteo"?"reconteo":x.method==="trasplante"?"trasplante":"murió"}</span>
        </div>)}
      </Fold>
    </div>;
  }

  // ── lista de tandas ──
  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {overlay}
    <PageTitle sub={`${plantas} planta${plantas===1?"":"s"} en ${abiertas.length} tanda${abiertas.length===1?"":"s"}`}
      right={isAdmin&&<button onClick={()=>{setToast(null);setCounter({mode:"nueva"});}} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Nueva tanda</button>}>VG</PageTitle>

    {abiertas.length===0&&<Card style={{textAlign:"center",padding:"26px 18px"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="pot" size={30}/></div>
      <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>No hay tandas en VG</div>
      <div style={{fontSize:13,color:C.textSoft,lineHeight:1.5}}>Entran solas cuando cosechás una esquejera{isAdmin?", o creá una con “Nueva tanda”.":"."}</div>
    </Card>}

    {abiertas.map(b=>{
      const ls=linesOf(b.id);const vivas=sumK(ls,"current_count");const p=pctOf(ls);const m=sumK(ls,"initial_count")-vivas;const d=daysSince(b.start_date);
      return <Card key={b.id} onClick={()=>setSelId(sid(b.id))} style={{padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:C.text}}>Tanda del {fmtDM(b.start_date)}</div>
            <div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>{d<=0?"Entró hoy":`${d} día${d===1?"":"s"} en VG`}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:28,fontWeight:800,color:C.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{vivas}</div>
            <div style={{fontSize:12,color:C.textSoft,fontWeight:600}}>plantas</div>
          </div>
        </div>
        <div style={{margin:"12px 0 8px"}}><Stripe mix={ls.filter(l=>(l.current_count||0)>0).map(l=>[l.id,l.current_count])} genMap={Object.fromEntries(ls.map(l=>[l.id,genMap[l.genetic_name]||C.green]))} h={10}/></div>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:13,color:C.textSoft,fontWeight:600}}>
          <span>{vgOrigTxt(ls,", ")||"Sin plantas"}</span>
          <span style={{color:vgColor(p),fontWeight:800,whiteSpace:"nowrap"}}>{p}% vivas{m>0?` (−${m})`:""}</span>
        </div>
      </Card>;
    })}

    {cerradas.length>0&&<Fold icon="salas" title="Ya pasaron a sala" count={cerradas.length}>
      {cerradas.map((b,i)=>{const ls=linesOf(b.id);return <button key={b.id} onClick={()=>setSelId(sid(b.id))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,width:"100%",padding:"10px 0",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:C.text}}>
        <span><span style={{display:"block",fontSize:14.5,fontWeight:800}}>Tanda del {fmtDM(b.start_date)}</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>Pasó a {getRC(roomConfig,b.dest_room||"S1").display_name} el {fmtDM(b.moved_date)}</span></span>
        <span style={{textAlign:"right"}}><span style={{display:"block",fontSize:17,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{sumK(ls,"current_count")}</span><span style={{display:"block",fontSize:12,color:C.textSoft,fontWeight:600}}>{pctOf(ls)}% vivas</span></span>
      </button>;})}
    </Fold>}
  </div>;
}

// Alta / edición de una madre. El color NO se elige acá: sale de la página Genéticas.
function VegModal({type="madre",genetics,item,phenos=[],onClose,onSaved,onDelete}){
  const [gn,setGn]=useState(item?.genetic_name||genetics[0]?.name||"");
  const [cnt,setCnt]=useState(item?.count?.toString()||"1");
  const [pot,setPot]=useState(item?.pot_label||"");
  const [potSize,setPotSize]=useState(item?.pot_size||"");
  const [status,setStatus]=useState(item?.status||(type==="madre"?"activa":"post-esqueje"));
  const [date,setDate]=useState(item?.entry_date||todayISO);
  const [notes,setNotes]=useState(item?.notes||"");
  // Feno: se elige de una búsqueda cargada, o se escribe a mano si es una selección vieja (ej: "F2").
  const [fenoSel,setFenoSel]=useState(item?.pheno_id?sid(item.pheno_id):(item?.pheno_label?"__otro__":""));
  const [fenoLabel,setFenoLabel]=useState(item?.pheno_label||"");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const fenosGen=phenos.filter(p=>p.genetic_name===gn).sort((a,b)=>(a.number||0)-(b.number||0));
  const sizes=type==="madre"?["5L","10L","15L"]:["1L","1,5L","2L","3L","4L","5L"];
  const save=async()=>{
    if(!gn){setErr("Elegí la genética.");return;}
    setSaving(true);setErr(null);
    try{
      const data={type,genetic_name:gn,count:+cnt||0,pot_label:pot,pot_size:potSize||null,status,entry_date:date,notes:notes||null,
        pheno_id:(fenoSel&&fenoSel!=="__otro__")?fenoSel:null,
        pheno_label:fenoSel==="__otro__"?(fenoLabel.trim()||null):null,
        updated_at:new Date().toISOString()};
      if(item)await db.update("veg_stock",item.id,data);else await db.insert("veg_stock",data);
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const fenoOpts=[["","Sin feno"],...fenosGen.map(p=>[sid(p.id),p.code]),["__otro__","Otro"]];
  return <Sheet title={type==="madre"?(item?"Editar madre":"Nueva madre"):(item?"Editar post-esqueje":"Nuevo post-esqueje")} sub={item?`${item.genetic_name}${item.pot_label?` · maceta ${item.pot_label}`:""}`:null} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{display:"flex",alignItems:"flex-end",gap:10,marginTop:4}}>
      <div style={{flex:1}}><FS label="Genética" value={gn} onChange={e=>{setGn(e.target.value);if(fenoSel!=="__otro__")setFenoSel("");}} options={genetics.map(g=>({value:g.name,label:g.name}))}/></div>
      <div title="Color de la genética" style={{width:44,height:44,borderRadius:12,background:genMap[gn]||C.green,marginBottom:12,flexShrink:0}}/>
    </div>
    {type==="madre"&&<>
      <FLabel style={{marginTop:0}}>Feno</FLabel>
      <div style={{maxHeight:150,overflowY:"auto"}}><Pills options={fenoOpts} value={fenoSel} onChange={setFenoSel} col={C.purple}/></div>
      {fenosGen.length===0&&fenoSel!=="__otro__"&&<div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:7,lineHeight:1.45}}>Esta genética no tiene búsqueda cargada. Si es una selección vieja, usá “Otro” y anotala (ej: F2).</div>}
      {fenoSel==="__otro__"&&<div style={{marginTop:10}}><FI value={fenoLabel} onChange={e=>setFenoLabel(e.target.value)} placeholder="Ej: F2"/></div>}
    </>}
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <div style={{width:120}}><NumField label="Cantidad" value={cnt} onCommit={setCnt} min={0} max={9999}/></div>
      <div style={{flex:1}}><FI label="Maceta / ubicación" value={pot} onChange={e=>setPot(e.target.value)} placeholder="Ej: M-01"/></div>
    </div>
    <FLabel style={{marginTop:0}}>Tamaño de maceta</FLabel>
    <Pills options={sizes} value={potSize} onChange={v=>setPotSize(potSize===v?"":v)}/>
    <FLabel>{type==="madre"?"Estado":"Etapa"}</FLabel>
    <Pills options={type==="madre"?[["activa","Activa"],["renovar","Para renovar"],["inactiva","Inactiva"]]:[["post-esqueje","Post-esqueje"],["vegetativo","Vegetativo"],["lista","Lista"]]} value={status} onChange={setStatus}/>
    <div style={{marginTop:12}}><FI label="Fecha de ingreso" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
    <FT label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Podas, plagas, riego..." rows={2}/>
    <SheetActions onSave={save} onCancel={onClose} saving={saving}/>
    {item&&onDelete&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`}}><SheetRow icon="trash" label={type==="madre"?"Eliminar madre":"Eliminar"} danger onClick={onDelete}/></div>}
  </Sheet>;
}

// Cosechar la bandeja: nunca prende el 100%, así que primero se marca qué murió.
// Los que sobreviven entran a VG como tanda del día (si ya hay una de hoy, se suman ahí);
// la tanda se archiva en `cloner_batches` para comparar prendimiento por genética.
function CosecharTandaModal({cloner,cells,slotPhenos,phenoMap,phenoMode,genMap,progress,user,onClose,onDone}){
  const [muertos,setMuertos]=useState(()=>new Set());   // índices de slot marcados como perdidos
  const [porGen,setPorGen]=useState({});                // sin modo feno: cuántos murieron de cada genética
  const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState(null);

  const ocupados=cells.map((g,i)=>({g,i})).filter(x=>x.g);
  const gCount={};ocupados.forEach(x=>{gCount[x.g]=(gCount[x.g]||0)+1;});
  const muertosPorGen={};
  if(phenoMode){ocupados.forEach(x=>{if(muertos.has(x.i))muertosPorGen[x.g]=(muertosPorGen[x.g]||0)+1;});}
  else{Object.entries(porGen).forEach(([g,n])=>{if(n>0)muertosPorGen[g]=Math.min(n,gCount[g]||0);});}
  const totalMuertos=Object.values(muertosPorGen).reduce((a,b)=>a+b,0);
  const totalVivos=ocupados.length-totalMuertos;
  const pct=ocupados.length>0?Math.round(totalVivos/ocupados.length*100):0;

  const toggle=i=>setMuertos(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;});

  const confirmar=async()=>{
    setBusy(true);setErr(null);
    try{
      // 1) Lo que prendió pasa a VG. Va primero: si falla, no se toca la bandeja y no se pierde nada.
      const items=[];
      if(phenoMode){
        const m={};
        ocupados.forEach(x=>{
          if(muertos.has(x.i))return;
          const pid=slotPhenos[x.i]||null;const k=`${x.g}|${pid||""}`;
          if(!m[k])m[k]={genetic_name:x.g,origin:"esqueje",pheno_id:pid,count:0};
          m[k].count++;
        });
        items.push(...Object.values(m));
      }else{
        Object.keys(gCount).forEach(g=>{const n=gCount[g]-(muertosPorGen[g]||0);if(n>0)items.push({genetic_name:g,origin:"esqueje",pheno_id:null,count:n});});
      }
      await addLinesToVG(items,{date:todayISO,source:"esquejera",author:user?.name||"sistema"});

      // 2) Archivo de la tanda: una fila por genética, con plantados / vivos / muertos.
      const filas=Object.keys(gCount).map(g=>({
        cloner_id:sid(cloner.id), cloner_label:cloner.label, genetic_name:g,
        start_date:progress?.start||null, harvest_date:todayISO,
        planted:gCount[g], survived:gCount[g]-(muertosPorGen[g]||0), died:muertosPorGen[g]||0,
        outcome:"cosechada", notes:notes||null, created_by:user?.name||"sistema",
      }));
      if(filas.length>0){try{await db.insert("cloner_batches",filas);}catch{/* el archivo no bloquea la cosecha */}}

      // El feno NO cambia de estado acá: un feno es la planta madre de semilla y
      // vive en su mesa. Que se muera un clon no mata al feno, solo se pierde ese esqueje.
      // 3) Se libera la bandeja.
      await db.deleteWhere("cloner_slots","cloner_id",cloner.id);
      try{await db.update("cloners",cloner.id,{start_date:null});}catch{}
      await logA(user?.name||"sistema",`Cosechó ${cloner.label}: ${totalVivos} vivos pasaron a VG / ${totalMuertos} perdidos`,"esquejera");
      onDone(totalVivos);
    }catch(e){setErr(errMsg(e));setBusy(false);}
  };

  return <Sheet title={`Cosechar ${cloner.label}`} sub="Lo que prendió pasa a VG en la tanda de hoy" onClose={onClose} z={270}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:12}}>{err}</div>}
    <div style={{fontSize:13.5,color:C.textMid,marginBottom:14,lineHeight:1.55}}>
      Marcá los esquejes que <strong>no</strong> prendieron. El resto pasa a VG en la tanda de hoy.
    </div>

    {phenoMode
      ? <>
          <div style={{fontSize:12,color:C.textSoft,marginBottom:8}}>Tocá los que se murieron:</div>
          <div style={{overflowX:"auto",marginBottom:14}}>
            <ClonerGrid capacity={cells.length} cols={cloner.cols||CLONER_COLS}
              colorAt={i=>cells[i]?(muertos.has(i)?C.borderStrong:(genMap[cells[i]]||C.green)):null}
              onPaint={i=>cells[i]&&toggle(i)}
              labelAt={i=>{const p=slotPhenos[i]?phenoMap[slotPhenos[i]]:null;return p?p.number:(cells[i]?slotCoord(i,cloner.cols||CLONER_COLS):null);}}/>
          </div>
        </>
      : <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {Object.entries(gCount).map(([g,n])=><div key={g} style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:12,height:12,borderRadius:"50%",background:genMap[g]||C.green,flexShrink:0}}/>
            <span style={{flex:1,fontSize:13.5,fontWeight:700,color:C.text}}>{g}<span style={{color:C.textSoft,fontWeight:600}}> · {n} cargados</span></span>
            <div style={{width:104}}><NumField value={porGen[g]??0} onCommit={v=>setPorGen(p=>({...p,[g]:Math.max(0,Math.min(n,+v||0))}))} min={0} max={n} compact/></div>
          </div>)}
          <div style={{fontSize:11.5,color:C.textSoft,fontStyle:"italic"}}>Cantidad que se murió de cada genética.</div>
        </div>}

    <div style={{display:"flex",gap:10,marginBottom:14}}>
      {[{l:"Pasan a VG",v:totalVivos,c:C.green},{l:"Perdidos",v:totalMuertos,c:C.red},{l:"Prendimiento",v:`${pct}%`,c:pct>=80?C.green:pct>=60?C.amber:C.red}].map(k=>
        <div key={k.l} style={{flex:1,background:C.bg,borderRadius:11,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:22,fontWeight:900,color:k.c,fontFamily:H,lineHeight:1.1}}>{k.v}</div>
          <div style={{fontSize:10.5,color:C.textSoft,marginTop:3}}>{k.l}</div>
        </div>)}
    </div>

    <FT label="Notas de la tanda (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Qué pasó, condiciones, observaciones..." rows={2}/>
    <div style={{display:"flex",gap:10,marginTop:8}}>
      <Btn onClick={confirmar} disabled={busy} style={{flex:1,minHeight:48}}>{busy?"Guardando...":`Cosechar (${totalVivos} a VG)`}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={busy} style={{flex:1}}>Cancelar</Btn>
    </div>
  </Sheet>;
}

// Eliminar la tanda entera: la bandeja falló y no pasa nada a tierra.
function EliminarTandaModal({cloner,cells,slotPhenos,phenoMode,progress,user,onClose,onDone}){
  const [confirmTxt,setConfirmTxt]=useState("");
  const [motivo,setMotivo]=useState("");
  const [busy,setBusy]=useState(false);
  const ocupados=cells.map((g,i)=>({g,i})).filter(x=>x.g);
  const gCount={};ocupados.forEach(x=>{gCount[x.g]=(gCount[x.g]||0)+1;});
  const ok=confirmTxt.trim().toLowerCase()==="borrar";
  const run=async()=>{
    setBusy(true);
    try{
      const filas=Object.keys(gCount).map(g=>({
        cloner_id:sid(cloner.id), cloner_label:cloner.label, genetic_name:g,
        start_date:progress?.start||null, harvest_date:todayISO,
        planted:gCount[g], survived:0, died:gCount[g],
        outcome:"fallida", notes:motivo||null, created_by:user?.name||"sistema",
      }));
      if(filas.length>0){try{await db.insert("cloner_batches",filas);}catch{}}
      await db.deleteWhere("cloner_slots","cloner_id",cloner.id);
      try{await db.update("cloners",cloner.id,{start_date:null});}catch{}
      await logA(user?.name||"sistema",`Eliminó la tanda de ${cloner.label} (${ocupados.length} esquejes)`,"esquejera");
      onDone();
    }finally{setBusy(false);}
  };
  return <Sheet title="Eliminar tanda" sub={cloner.label} onClose={onClose} z={270}>
    <div style={{background:C.redLight,color:C.red,borderRadius:11,padding:"11px 13px",fontSize:13,marginBottom:14,lineHeight:1.5}}>
      Se borran los {ocupados.length} esquejes de la bandeja y <strong>nada pasa a tierra</strong>. Usalo cuando la tanda falló entera.
    </div>
    <FI label="Motivo (opcional)" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej: hongo, se secó el propagador"/>
    <FI label='Escribí "borrar" para confirmar' value={confirmTxt} onChange={e=>setConfirmTxt(e.target.value)} placeholder="borrar"/>
    <div style={{display:"flex",gap:10,marginTop:8}}>
      <Btn onClick={run} disabled={!ok||busy} style={{flex:1,background:ok?C.red:undefined,borderColor:ok?C.red:undefined}}>{busy?"Borrando...":"Eliminar tanda"}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={busy} style={{flex:1}}>Cancelar</Btn>
    </div>
  </Sheet>;
}

function EsquejeraModal({cloner,slots,genetics,user,onClose,onSaved}){
  const isAdmin=user?.role==="admin";
  const [cells,setCells]=useState(()=>{const arr=Array(cloner.capacity).fill(null);slots.forEach(s=>{if(s.slot_index<arr.length)arr[s.slot_index]=s.genetic_name;});return arr;});
  const [slotPhenos,setSlotPhenos]=useState(()=>{const arr=Array(cloner.capacity).fill(null);slots.forEach(s=>{if(s.slot_index<arr.length)arr[s.slot_index]=sid(s.pheno_id);});return arr;});
  // Guardamos la fecha de corte que ya tenía cada celda, para no pisar esquejes viejos al guardar.
  const [prevDates]=useState(()=>{const m={};slots.forEach(s=>{if(s.cut_date)m[s.slot_index]=s.cut_date;});return m;});
  const [brush,setBrush]=useState(genetics[0]?.name||null);
  const [saving,setSaving]=useState(false);
  const [phenoMode,setPhenoMode]=useState(!!cloner.pheno_mode);
  const [phenoMap,setPhenoMap]=useState({});
  const [hunts,setHunts]=useState([]);            // búsquedas disponibles
  const [huntId,setHuntId]=useState(null);        // la que se está usando de pincel
  const [huntPhenos,setHuntPhenos]=useState([]);
  const [brushPheno,setBrushPheno]=useState(null);
  const [showCosechar,setShowCosechar]=useState(false);
  const [showEliminar,setShowEliminar]=useState(false);
  // Fecha de inicio de la tanda y días hasta el corte: viven en la bandeja, no en cada esqueje.
  const [startDate,setStartDate]=useState(()=>batchStart(cloner,slots)||todayISO);
  const [readyDays,setReadyDays]=useState(()=>batchReadyDays(cloner));
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const used=cells.filter(Boolean).length;
  const gC={};cells.forEach(c=>{if(c)gC[c]=(gC[c]||0)+1;});
  // Celdas nuevas = las que ahora tienen esqueje pero antes estaban vacías: a esas les toca la fecha de hoy.
  const nuevas=cells.filter((g,i)=>g&&!prevDates[i]).length;
  const sinEtiqueta=phenoMode?cells.filter((g,i)=>g&&!slotPhenos[i]).length:0;
  const hunt=hunts.find(h=>sid(h.id)===huntId)||null;

  // Trae todas las búsquedas y sus fenos: la bandeja no crea fenos, solo les asigna esquejes.
  useEffect(()=>{
    (async()=>{
      try{
        const hs=await db.query("pheno_hunts","order=created_at.desc");
        setHunts(hs);
        const ps=await db.query("phenos","order=number.asc");
        const m={};ps.forEach(p=>{m[sid(p.id)]=p;});setPhenoMap(m);
        // Si la bandeja ya tenía esquejes asignados, arranca en esa búsqueda.
        const usados=slots.map(x=>sid(x.pheno_id)).filter(Boolean);
        const actual=usados.length?sid(ps.find(p=>sid(p.id)===usados[0])?.hunt_id):null;
        const h=actual||(hs[0]?sid(hs[0].id):null);
        setHuntId(h);
        const mios=ps.filter(p=>sid(p.hunt_id)===h);
        setHuntPhenos(mios);
        setBrushPheno(mios[0]?sid(mios[0].id):null);
      }catch{ setHunts([]); }
    })();
  },[cloner.id,slots]);

  const cambiarHunt=(hid)=>{
    setHuntId(hid);
    const mios=Object.values(phenoMap).filter(p=>sid(p.hunt_id)===hid).sort((a,b)=>a.number-b.number);
    setHuntPhenos(mios);
    setBrushPheno(mios[0]?sid(mios[0].id):null);
  };

  const paint=i=>{
    if(phenoMode&&hunt&&brushPheno){
      // El pincel es un feno: DS-1 puede ocupar A1 y A2, son dos clones del mismo.
      const ya=slotPhenos[i]===brushPheno;
      const p=phenoMap[brushPheno];
      setCells(prev=>{const n=[...prev];n[i]=ya?null:(p?.genetic_name||hunt.genetic_name);return n;});
      setSlotPhenos(prev=>{const n=[...prev];n[i]=ya?null:brushPheno;return n;});
      return;
    }
    const borrando=cells[i]===brush;
    setCells(prev=>{const n=[...prev];n[i]=borrando?null:brush;return n;});
    setSlotPhenos(prev=>{const n=[...prev];n[i]=null;return n;});
  };
  const togglePheno=async()=>{
    const next=!phenoMode;
    setPhenoMode(next);
    try{await db.update("cloners",cloner.id,{pheno_mode:next});}catch{}
  };
  const save=async()=>{
    setSaving(true);
    try{
      // Los fenos ya existen: la bandeja solo guarda qué feno hay en cada slot.
      const ids=[...slotPhenos];
      // La fecha de inicio y los días de la tanda son de la bandeja entera.
      try{await db.update("cloners",cloner.id,{start_date:startDate||null,ready_days:readyDays||CLONER_READY_DAYS});}catch{}
      await db.deleteWhere("cloner_slots","cloner_id",cloner.id);
      // Cada esqueje guarda igual su fecha para no perder el histórico de bandejas viejas.
      const newSlots=cells.map((g,i)=>({cloner_id:cloner.id,slot_index:i,genetic_name:g,pheno_id:ids[i]||null,cut_date:g?(prevDates[i]||startDate):null,status:g?"activo":"vacío",updated_at:new Date().toISOString()})).filter(s=>s.genetic_name);
      if(newSlots.length>0)await db.insert("cloner_slots",newSlots);
      onSaved();
    }finally{setSaving(false);}
  };
  const prog=batchProgress({...cloner,start_date:startDate,ready_days:readyDays},slots);
  return <Sheet title={cloner.label} sub={`${clonerRows(cloner.capacity,cloner.cols||CLONER_COLS)} × ${cloner.cols||CLONER_COLS} · ${used} de ${cloner.capacity} lugares`} onClose={onClose}>
    {showCosechar&&<CosecharTandaModal cloner={cloner} cells={cells} slotPhenos={slotPhenos} phenoMap={phenoMap} phenoMode={phenoMode} genMap={genMap} progress={prog} user={user} onClose={()=>setShowCosechar(false)} onDone={(n)=>{setShowCosechar(false);onSaved(`Cosechada: ${n} esqueje${n===1?"":"s"} pasaron a VG ✓`);}}/>}
    {showEliminar&&<EliminarTandaModal cloner={cloner} cells={cells} slotPhenos={slotPhenos} phenoMode={phenoMode} progress={prog} user={user} onClose={()=>setShowEliminar(false)} onDone={()=>{setShowEliminar(false);onSaved();}}/>}
    <div style={{margin:"2px 0 12px"}}><Bar value={used} max={cloner.capacity} h={8}/></div>

    {/* Búsqueda de fenos: numera cada esqueje para poder seguirlo hasta la cata */}
    {isAdmin&&<button onClick={togglePheno} style={{display:"flex",alignItems:"center",gap:12,width:"100%",marginBottom:12,padding:"10px 12px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",background:phenoMode?C.purpleLight:C.surfaceAlt,border:`1px solid ${phenoMode?C.purple+"55":C.border}`}}>
      <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:phenoMode?C.purple:C.surface,color:phenoMode?"#fff":C.textMid}}><Icon n="flask" size={18}/></span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:14,fontWeight:800,color:phenoMode?C.purple:C.text}}>Búsqueda de fenos</span>
        <span style={{display:"block",fontSize:12,color:C.textSoft,fontWeight:600}}>{phenoMode?"Cada esqueje queda con su feno":"Apagada: la bandeja funciona como siempre"}</span>
      </span>
      <span style={{width:38,height:22,borderRadius:99,background:phenoMode?C.purple:C.borderStrong,position:"relative",flexShrink:0}}>
        <span style={{position:"absolute",top:3,left:phenoMode?19:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}/>
      </span>
    </button>}
    {phenoMode&&hunts.length===0&&<div style={{background:C.amberLight,color:C.amber,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:12,lineHeight:1.5}}>
      Todavía no hay ninguna búsqueda creada. Arrancala desde la mesa donde están las semillas y después volvé acá a asignar los esquejes.
    </div>}
    {phenoMode&&hunts.length>0&&<div style={{marginBottom:12}}>
      <FS label="Búsqueda" value={huntId||""} onChange={e=>cambiarHunt(e.target.value)}
        options={hunts.map(h=>({value:sid(h.id),label:`${h.genetic_name} · ${h.prefix}-1 a ${h.prefix}-${h.total}`}))}/>
      <div style={{fontSize:12,color:C.textSoft,marginBottom:7}}>Elegí un feno y tocá los slots donde pusiste sus esquejes. Un mismo feno puede ir en varios.</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",maxHeight:150,overflowY:"auto"}}>
        {huntPhenos.map(p=>{
          const pid=sid(p.id);
          const n=slotPhenos.filter(x=>x===pid).length;
          const on=brushPheno===pid;
          return <button key={pid} onClick={()=>setBrushPheno(pid)} title={p.code}
            style={{minWidth:38,padding:"6px 8px",borderRadius:9,fontSize:12.5,fontWeight:800,cursor:"pointer",
              background:on?C.purple:(n>0?C.purpleLight:C.bg),color:on?"#fff":(n>0?C.purple:C.textSoft),
              border:`1.5px solid ${on?C.purple:(n>0?C.purple+"55":C.border)}`}}>{p.number}{n>0?<sup style={{fontSize:8.5}}>×{n}</sup>:null}</button>;
        })}
      </div>
      {brushPheno&&phenoMap[brushPheno]&&<div style={{fontSize:12,color:C.purple,fontWeight:700,marginTop:8}}>Pincel: {phenoMap[brushPheno].code}</div>}
    </div>}

    {/* Contador de la tanda: desde el corte hasta que están listos para tierra */}
    {prog&&used>0&&<div style={{background:C.bg,border:`1px solid ${prog.color}44`,borderRadius:12,padding:"11px 13px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13.5,fontWeight:800,color:prog.color}}>{prog.label}</span>
        <span style={{fontSize:11.5,color:C.textSoft}}>desde {fmtDate(prog.start)}</span>
      </div>
      <Bar value={Math.min(prog.day,prog.total)} max={prog.total} color={prog.color} h={7}/>
    </div>}

    <div style={{display:"flex",gap:10,marginBottom:4}}>
      <div style={{flex:1}}><FI label="Inicio de la tanda" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
      <div style={{width:112}}><NumField label="Días al corte" value={readyDays} onCommit={v=>setReadyDays(Math.max(1,+v||CLONER_READY_DAYS))} min={1} max={60}/></div>
    </div>
    <div style={{fontSize:11.5,color:C.textSoft,marginTop:-6,marginBottom:12,fontStyle:"italic",lineHeight:1.45}}>La fecha vale para toda la bandeja. Si dejás los días vacíos toma {CLONER_READY_DAYS} como referencia.</div>

    {used>0&&<div style={{display:"flex",gap:9,marginBottom:14}}>
      <Btn onClick={()=>setShowCosechar(true)} style={{flex:1,minHeight:46}}>Cosechar tanda</Btn>
      <Btn onClick={()=>setShowEliminar(true)} v="secondary" style={{flex:1,minHeight:46,color:C.red,borderColor:`${C.red}55`}}>Eliminar tanda</Btn>
    </div>}
    {!(phenoMode&&hunt)&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {genetics.map(g=>{const col=genMap[g.name]||C.green;const on=brush===g.name;return <button key={g.name} onClick={()=>setBrush(g.name)} style={{padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",background:on?col:`${col}1F`,color:on?inkFill(col):inkOn(col),border:`1.5px solid ${col}`}}>{g.name}</button>;})}
      <button onClick={()=>setBrush(null)} style={{padding:"8px 12px",borderRadius:99,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",background:brush===null?C.red:C.redLight,color:brush===null?"#fff":C.red,border:`1.5px solid ${C.red}`}}>Borrar</button>
    </div>}
    <div style={{overflowX:"auto",marginBottom:14}}>
      <ClonerGrid capacity={cells.length} cols={cloner.cols||CLONER_COLS} colorAt={(i)=>cells[i]?(genMap[cells[i]]||C.green):null} onPaint={paint}
        labelAt={phenoMode?(i=>{const p=slotPhenos[i]?phenoMap[slotPhenos[i]]:null;return p?p.number:null;}):null}
        ringAt={phenoMode?(i=>slotPhenos[i]&&slotPhenos[i]===brushPheno):null}/>
    </div>
    {phenoMode&&<div style={{fontSize:10.5,color:C.textSoft,marginTop:-8,marginBottom:12,fontStyle:"italic",lineHeight:1.45}}>El número de cada slot es el feno que le corresponde, igual que en el cuaderno.</div>}
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {Object.entries(gC).map(([g,n])=><span key={g} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,color:C.textMid}}><span style={{width:9,height:9,borderRadius:"50%",background:genMap[g]||C.green}}/>{g} <b style={{color:C.text}}>{n}</b></span>)}
    </div>
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label="Guardar esquejera"/>
  </Sheet>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FENOS / CATA — Parte 2 de búsqueda de fenos.
// Acá se cierra el círculo: la flor cosechada vuelve al esqueje que la originó.
// ══════════════════════════════════════════════════════════════════════════════
function PhenoBadge({status}){
  const m=PHENO_ST[status]||PHENO_ST.activo;
  return <Badge label={m.label} color={m.color} bg={m.bg}/>;
}
// Estrellas de 1 a 10, táctiles. Se usan para el puntaje de cata.
function ScorePicker({value,onChange}){
  return <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
    {Array.from({length:10},(_,k)=>k+1).map(n=><button key={n} onClick={()=>onChange(value===n?null:n)}
      style={{width:30,height:34,borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:800,fontFamily:"inherit",
        background:value>=n?C.amber:C.bg,color:value>=n?C.onAccent:C.textSoft,
        border:`1px solid ${value>=n?C.amber:C.border}`}}>{n}</button>)}
  </div>;
}

// Ficha del feno en hoja inferior: el recorrido a la vista, cata y seguimiento plegados.
function PhenoSheet({pheno,user,onClose,onSaved}){
  const [p,setP]=useState(pheno);
  const [notes,setNotes]=useState([]);
  const [newNote,setNewNote]=useState("");
  const [noteDate,setNoteDate]=useState(todayISO);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const [ubicac,setUbicac]=useState({celdas:[],slots:[],madres:[]});
  const isAdmin=user?.role==="admin";

  useEffect(()=>{
    db.query("pheno_notes",`pheno_id=eq.${sid(pheno.id)}&order=note_date.desc`).then(setNotes).catch(()=>setNotes([]));
  },[pheno.id]);
  // Dónde está este feno hoy: puede estar en varias celdas y en varias bandejas a la vez.
  useEffect(()=>{
    (async()=>{
      try{
        const [cs,ss,ms]=await Promise.all([
          db.query("pot_cells",`pheno_id=eq.${sid(pheno.id)}`),
          db.query("cloner_slots",`pheno_id=eq.${sid(pheno.id)}`),
          db.query("veg_stock",`type=eq.madre&pheno_id=eq.${sid(pheno.id)}`).catch(()=>[]),
        ]);
        setUbicac({celdas:cs||[],slots:ss||[],madres:ms||[]});
      }catch{/* si falla, el recorrido queda con lo que se sepa */}
    })();
  },[pheno.id]);

  const setF=(k,v)=>setP(prev=>({...prev,[k]:v}));
  const guardar=async()=>{
    setSaving(true);setErr(null);
    try{
      await db.update("phenos",p.id,{
        grams:p.grams===""||p.grams===null?null:Number(p.grams),
        score:p.score||null, flavors:p.flavors||null, aroma:p.aroma||null,
        structure:p.structure||null, notes:p.notes||null, status:p.status,
        updated_at:new Date().toISOString(),
      });
      onSaved();
    }catch(e){setErr(errMsg(e));}finally{setSaving(false);}
  };
  const addNote=async()=>{
    if(!newNote.trim())return;
    try{
      const ins=await db.insert("pheno_notes",{pheno_id:sid(p.id),note_date:noteDate,author:user?.name||"—",content:newNote.trim()});
      setNotes(prev=>[...(ins||[]),...prev]);setNewNote("");
    }catch(e){setErr(errMsg(e));}
  };
  const delNote=async(id)=>{try{await db.delete("pheno_notes",id);setNotes(prev=>prev.filter(n=>n.id!==id));}catch{/* queda en pantalla hasta recargar */}};

  const linea=[
    {ic:"seed",l:"Semilla",extra:p.seed_pot_label?`${p.seed_room_id||""} · Mesa ${p.seed_pot_label}`:"Origen sin registrar"},
    ubicac.madres.length>0&&{ic:"tree",l:ubicac.madres.length>1?`Madre (${ubicac.madres.length})`:"Madre",
      extra:ubicac.madres.map(m=>m.pot_label?`Maceta ${m.pot_label}`:null).filter(Boolean).join(", ")||null},
    ubicac.slots.length>0&&{ic:"scissors",l:`${ubicac.slots.length} esqueje${ubicac.slots.length>1?"s":""} en bandeja`},
    ubicac.celdas.length>0&&{ic:"pot",l:`${ubicac.celdas.length} planta${ubicac.celdas.length>1?"s":""} en mesa`},
  ].filter(Boolean);

  return <Sheet title={p.code} sub={p.genetic_name} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:12}}>{err}</div>}
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <PhenoBadge status={p.status}/>
      {p.score?<span style={{fontSize:13,fontWeight:800,color:C.amber}}>★ {p.score}/10</span>:null}
      {p.grams?<span style={{fontSize:13,fontWeight:800,color:C.text}}>{p.grams} g</span>:null}
    </div>

    <div style={{background:C.bg,borderRadius:14,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
      <div style={{fontSize:12.5,fontWeight:800,color:C.textSoft,marginBottom:10}}>Recorrido</div>
      {linea.map((e,k)=><div key={k} style={{display:"flex",gap:11,marginBottom:k<linea.length-1?10:0,alignItems:"center"}}>
        <span style={{width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:C.surfaceAlt,color:C.textMid}}><Icon n={e.ic} size={18}/></span>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:"block",fontSize:13.5,fontWeight:700,color:C.text}}>{e.l}</span>
          {e.extra&&<span style={{display:"block",fontSize:12,color:C.textSoft,fontWeight:600}}>{e.extra}</span>}
        </span>
      </div>)}
      {linea.length===0&&<div style={{fontSize:12.5,color:C.textSoft}}>Sin movimientos registrados.</div>}
    </div>

    {isAdmin?<div style={{marginBottom:10}}>
      <Fold icon="flask" title="Cata" defaultOpen={!p.score&&!p.grams}>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><NumField label="Gramos" value={p.grams??""} onCommit={v=>setF("grams",v)} min={0} max={9999} placeholder="Ej: 62"/></div>
          <div style={{flex:1}}><FS label="Estado" value={p.status||"activo"} onChange={e=>setF("status",e.target.value)} options={["activo","candidato","seleccionado","descartado","muerto"].map(k=>({value:k,label:PHENO_ST[k]?.label||k}))}/></div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12.5,color:C.textMid,marginBottom:7,fontWeight:600}}>Puntaje</div>
          <ScorePicker value={p.score||0} onChange={v=>setF("score",v)}/>
        </div>
        <FI label="Sabores" value={p.flavors||""} onChange={e=>setF("flavors",e.target.value)} placeholder="Ej: cítrico, pino, dulce"/>
        <FI label="Aroma" value={p.aroma||""} onChange={e=>setF("aroma",e.target.value)} placeholder="Ej: combustible, floral"/>
        <FI label="Estructura" value={p.structure||""} onChange={e=>setF("structure",e.target.value)} placeholder="Ej: cogollo compacto, poco leaf"/>
        <FT label="Conclusión" value={p.notes||""} onChange={e=>setF("notes",e.target.value)} placeholder="Por qué la elegís o la descartás" rows={2}/>
        <Btn onClick={guardar} disabled={saving} full>{saving?"Guardando...":"Guardar cata"}</Btn>
      </Fold>
    </div>:<div style={{background:C.bg,borderRadius:14,padding:"12px 14px",marginBottom:10,fontSize:12.5,color:C.textSoft,lineHeight:1.5}}>
      Solo los administradores pueden cargar datos de cata.
    </div>}

    <Fold icon="notebook" title="Seguimiento" count={notes.length} defaultOpen={notes.length>0}>
      {isAdmin&&<>
        <div style={{display:"flex",gap:9}}>
          <div style={{width:140}}><FI type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)}/></div>
          <div style={{flex:1}}><FI value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Qué observaste hoy"/></div>
        </div>
        <Btn onClick={addNote} v="secondary" disabled={!newNote.trim()} full style={{marginBottom:12,fontSize:13}}>+ Agregar observación</Btn>
      </>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {notes.length===0&&<div style={{fontSize:12.5,color:C.textSoft}}>Todavía no hay observaciones.</div>}
        {notes.map(n=><div key={n.id} style={{background:C.bg,borderRadius:10,padding:"9px 12px",border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:3}}>
            <span style={{fontSize:11,fontWeight:800,color:C.textSoft}}>{fmtDate(n.note_date)} · {n.author||"—"}</span>
            {isAdmin&&<button onClick={()=>delNote(n.id)} aria-label="Borrar observación" style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",display:"flex",padding:0}}><Icon n="x" size={14}/></button>}
          </div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.45}}>{n.content}</div>
        </div>)}
      </div>
    </Fold>
  </Sheet>;
}

// ── FENOS: agrupados por búsqueda (cada tanda de semillas es un grupo) ────────
function FenosPage({user,genetics}){
  const [phenos,setPhenos]=useState([]);
  const [hunts,setHunts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [estado,setEstado]=useState("__activos__");
  const [gen,setGen]=useState("__todas__");
  const [orden,setOrden]=useState("score");
  const [showFiltro,setShowFiltro]=useState(false);
  const [sel,setSel]=useState(null);
  const [toast,setToast]=useState(null);

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([
      db.query("phenos","order=number.asc"),
      db.query("pheno_hunts","order=created_at.desc").catch(()=>[]),
    ]).then(([p,h])=>{setPhenos(p||[]);setHunts(h||[]);})
      .catch(()=>setPhenos([])).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);
  if(loading)return <Spin/>;

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const conFenos=[...new Set(phenos.map(p=>p.genetic_name).filter(Boolean))].sort();

  const ordenar=arr=>[...arr].sort((a,b)=>
    orden==="score" ? (b.score||0)-(a.score||0) || (b.grams||0)-(a.grams||0)
    : orden==="grams" ? (b.grams||0)-(a.grams||0)
    : (a.number||0)-(b.number||0));
  const pasa=p=>{
    if(gen!=="__todas__"&&p.genetic_name!==gen)return false;
    if(estado==="__activos__")return p.status!=="descartado"&&p.status!=="muerto";
    if(estado==="__todos__")return true;
    return p.status===estado;
  };
  const visibles=phenos.filter(pasa);

  // Un grupo por búsqueda; los fenos viejos sin búsqueda quedan juntos al final.
  const grupos=hunts.map(h=>({
    key:sid(h.id),
    titulo:h.genetic_name,
    rango:`${h.prefix}-1 a ${h.prefix}-${h.total}`,
    sub:`${h.total} semilla${h.total===1?"":"s"}${h.start_date?` · desde ${fmtDM(h.start_date)}`:""}${h.pot_label?` · ${h.room_id||""} mesa ${h.pot_label}`:""}`,
    color:genMap[h.genetic_name]||C.green,
    list:ordenar(visibles.filter(p=>sid(p.hunt_id)===sid(h.id))),
  })).filter(g=>g.list.length>0);
  const idsHunt=new Set(hunts.map(h=>sid(h.id)));
  const sueltos=ordenar(visibles.filter(p=>!p.hunt_id||!idsHunt.has(sid(p.hunt_id))));
  if(sueltos.length>0)grupos.push({key:"__sueltos__",titulo:"Sin búsqueda",rango:null,sub:"Fenos cargados antes de agrupar por tanda",color:C.textSoft,list:sueltos});

  // Resumen de lo que se está viendo: sirve para comparar fenos entre sí.
  const conScore=visibles.filter(p=>p.score);
  const conGr=visibles.filter(p=>p.grams);
  const avgScore=conScore.length?(conScore.reduce((a,p)=>a+(p.score||0),0)/conScore.length).toFixed(1):null;
  const avgGrams=conGr.length?Math.round(conGr.reduce((a,p)=>a+(Number(p.grams)||0),0)/conGr.length):null;
  const maxG=Math.max(1,...visibles.map(p=>Number(p.grams)||0));

  const chips=[{v:"__activos__",l:"Activos"},{v:"candidato",l:"Candidatos"},{v:"seleccionado",l:"Seleccionados"},{v:"__todos__",l:"Todos"}];
  const stat=(n,l)=><div style={{flex:1,background:C.bg,borderRadius:12,padding:"9px 6px",textAlign:"center",border:`1px solid ${C.border}`}}>
    <div style={{fontSize:19,fontWeight:800,color:C.text,fontFamily:H,lineHeight:1.15,fontVariantNumeric:"tabular-nums"}}>{n}</div>
    <div style={{fontSize:11,color:C.textSoft,fontWeight:600,marginTop:2}}>{l}</div>
  </div>;

  const fenoRow=(p,i)=>{
    const col=genMap[p.genetic_name]||C.green;
    return <button key={p.id} onClick={()=>setSel(p)} style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"10px 0",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",color:C.text,textAlign:"left"}}>
      <span style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:`${col}1F`,color:col,fontSize:15,fontWeight:800,fontFamily:H}}>{p.number??"—"}</span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:15,fontWeight:800}}>{p.code}</span>
        <span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {p.grams?`${p.grams} g`:"Sin pesar"}{p.flavors?` · ${p.flavors}`:""}
        </span>
        {p.grams?<span style={{display:"block",marginTop:6}}><Bar value={Number(p.grams)||0} max={maxG} color={col} h={5}/></span>:null}
      </span>
      {p.score?<span style={{fontSize:13,fontWeight:800,color:C.amber,whiteSpace:"nowrap"}}>★ {p.score}</span>:null}
      <PhenoBadge status={p.status}/>
    </button>;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {sel&&<PhenoSheet pheno={sel} user={user} onClose={()=>setSel(null)} onSaved={()=>{setSel(null);load();setToast({msg:"Cata guardada ✓",type:"success"});}}/>}
    {showFiltro&&<Sheet title="Filtrar" onClose={()=>setShowFiltro(false)}>
      <FS label="Genética" value={gen} onChange={e=>setGen(e.target.value)} options={[{value:"__todas__",label:"Todas las genéticas"},...conFenos.map(g=>({value:g,label:g}))]}/>
      <FS label="Ordenar por" value={orden} onChange={e=>setOrden(e.target.value)} options={[{value:"score",label:"Puntaje"},{value:"grams",label:"Gramos"},{value:"code",label:"Número"}]}/>
      <Btn onClick={()=>setShowFiltro(false)} full>Ver resultados</Btn>
    </Sheet>}

    <PageTitle sub="Cada semilla es un feno. Agrupados por búsqueda.">Fenos</PageTitle>

    {phenos.length===0
      ? <Card style={{textAlign:"center",padding:"28px 20px"}}>
          <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="flask" size={30}/></div>
          <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"8px 0 6px"}}>Todavía no hay fenos cargados</div>
          <div style={{fontSize:13,color:C.textSoft,lineHeight:1.55}}>Entrá a la mesa donde están las semillas, activá “Búsqueda de fenos” y cargá cuántas semillas hay. Los fenos se crean numerados de una.</div>
        </Card>
      : <>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <div className="gm-rail" style={{display:"flex",gap:7,overflowX:"auto",flex:1,scrollbarWidth:"none"}}>
            {chips.map(c=>{const on=estado===c.v;return <button key={c.v} onClick={()=>setEstado(c.v)} style={{padding:"8px 14px",borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:800,whiteSpace:"nowrap",background:on?C.green:C.surface,color:on?C.onAccent:C.textMid,border:`1px solid ${on?C.green:C.border}`}}>{c.l}</button>;})}
          </div>
          <button onClick={()=>setShowFiltro(true)} aria-label="Filtrar" style={{width:40,height:38,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:gen!=="__todas__"?C.greenLight:C.surface,color:gen!=="__todas__"?C.green:C.textMid,border:`1px solid ${gen!=="__todas__"?C.green:C.border}`}}><Icon n="filter" size={19}/></button>
        </div>
        {gen!=="__todas__"&&<div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,padding:"0 2px"}}>Filtrado por {gen} · orden por {orden==="score"?"puntaje":orden==="grams"?"gramos":"número"}</div>}

        <div style={{display:"flex",gap:8}}>
          {stat(visibles.length,"fenos")}{stat(avgScore||"—","puntaje prom.")}{stat(avgGrams?`${avgGrams} g`:"—","gramos prom.")}
        </div>

        {grupos.length===0&&<Card style={{textAlign:"center",color:C.textSoft,fontSize:13.5,padding:"20px 0"}}>Ningún feno con ese filtro.</Card>}
        {grupos.map(gr=><Fold key={`${gr.key}-${estado}-${gen}`} icon="dna" title={gr.titulo} count={gr.list.length} defaultOpen={grupos.length===1||gen!=="__todas__"}
          right={gr.rango&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:`${gr.color}1F`,color:gr.color,whiteSpace:"nowrap"}}>{gr.rango}</span>}>
          <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,paddingBottom:4}}>{gr.sub}</div>
          {gr.list.map(fenoRow)}
        </Fold>)}
      </>}
  </div>;
}

// ── GENÉTICAS ────────────────────────────────────────────────────────────────
// Una sola hoja por genética: ficha arriba, edición abajo y borrado al final.
function GenSheet({g,genetics,setGenetics,user,onClose,onToast,onDelete}){
  const isNew=!g?.id;
  const [name,setName]=useState(g?.name||"");
  const [color,setColor]=useState(g?.color||nextGenColor(genetics));
  const [flowerDays,setFlowerDays]=useState(String(g?.flower_days??65));
  const [height,setHeight]=useState(g?.height||"media");
  const [prefix,setPrefix]=useState(g?.pheno_prefix||"");
  const [notes,setNotes]=useState(g?.notes||"");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);

  const save=async()=>{
    const nm=name.trim();
    if(!nm){setErr("El nombre no puede quedar vacío.");return;}
    const dup=genetics.find(x=>sid(x.id)!==sid(g?.id)&&x.name.toLowerCase()===nm.toLowerCase());
    if(dup){setErr("Ya existe otra genética con ese nombre.");return;}
    setSaving(true);setErr(null);
    const datos={name:nm,color,flower_days:+flowerDays||null,height,notes:notes||null,pheno_prefix:prefix.trim().toUpperCase()||null};
    try{
      if(isNew){
        const ins=await db.insert("genetics",datos);
        await logA(user.name,`Agregó genética: ${nm}`,"genetics");
        setGenetics(prev=>[...prev,ins[0]]);
        onToast&&onToast("Genética agregada ✓");
      }else{
        const renamed=nm!==g.name;
        await db.update("genetics",g.id,datos);
        // Renombrar en cascada: todo lo que referencia la genética por su nombre.
        if(renamed){
          for(const tbl of ["cycle_genetics","pot_cells","cloner_slots","veg_stock","phenos","pheno_hunts"]){
            try{await db.updateWhere(tbl,"genetic_name",g.name,{genetic_name:nm});}catch{/* tabla vieja o sin filas */}
          }
        }
        await logA(user.name,`Editó genética: ${g.name}${renamed?` → ${nm}`:""}`,"genetics");
        setGenetics(prev=>prev.map(x=>sid(x.id)===sid(g.id)?{...x,...datos}:x));
        onToast&&onToast(renamed?"Genética actualizada y referencias renombradas ✓":"Genética actualizada ✓");
      }
      onClose();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };

  return <Sheet title={isNew?"Nueva genética":g.name} sub={isNew?"El color se usa en mesas, VG, madres y esquejeras":`${g.flower_days?`~${g.flower_days} días de flora`:"Sin días de flora"}${g.height?` · altura ${g.height}`:""}`} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:12}}>{err}</div>}
    <FI label="Nombre" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Gorilla Glue #4"/>
    {!isNew&&name.trim()&&name.trim()!==g.name&&<div style={{background:C.amberLight,color:C.amber,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12,lineHeight:1.45}}>Al cambiar el nombre se actualizan también ciclos, mesas, esquejeras, VG y fenos que usan “{g.name}”.</div>}
    <div style={{display:"flex",gap:10}}>
      <div style={{flex:1}}><NumField label="Días de floración" value={flowerDays} onCommit={setFlowerDays} min={1} max={200}/></div>
      <div style={{flex:1}}><FS label="Altura" value={height} onChange={e=>setHeight(e.target.value)} options={[{value:"baja",label:"Baja"},{value:"media",label:"Media"},{value:"alta",label:"Alta"}]}/></div>
    </div>
    <FI label="Prefijo de fenos (opcional)" value={prefix} onChange={e=>setPrefix(e.target.value.slice(0,5).toUpperCase())} placeholder="Ej: DS"/>
    <div style={{fontSize:12,color:C.textSoft,marginTop:-6,marginBottom:12,lineHeight:1.45}}>Se sugiere solo al abrir una búsqueda de fenos con esta genética. Igual lo podés cambiar ahí.</div>
    <FT label="Notas de cultivo" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Características, comportamiento..." rows={3}/>
    <div style={{marginBottom:14}}>
      <label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:8}}>Color</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {GP.map(col=><div key={col} onClick={()=>setColor(col)} style={{width:36,height:36,borderRadius:10,background:col,cursor:"pointer",border:`3px solid ${color===col?C.surface:"transparent"}`,boxShadow:color===col?`0 0 0 3px ${col}`:C.shadow,transition:"all 0.1s"}}/>)}
        <label style={{width:36,height:36,borderRadius:10,cursor:"pointer",border:`2px dashed ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",background:GP.includes(color)?C.bg:color,color:C.textSoft}}>
          {GP.includes(color)&&<Icon n="plus" size={16}/>}
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/>
        </label>
      </div>
    </div>
    <div style={{display:"flex",gap:10}}>
      <Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":isNew?"Agregar":"Guardar cambios"}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={saving} style={{flex:1}}>Cancelar</Btn>
    </div>
    {!isNew&&onDelete&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`}}>
      <SheetRow icon="trash" label="Eliminar genética" danger onClick={onDelete}/>
    </div>}
  </Sheet>;
}

function GeneticasPage({genetics,setGenetics,user}){
  const isAdmin=user?.role==="admin";
  const [sel,setSel]=useState(null);      // genética abierta; {} = nueva
  const [delG,setDelG]=useState(null);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);
  const lista=[...genetics].sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  const del=async()=>{
    const g=delG;if(!g)return;setBusy(true);
    try{
      await db.delete("genetics",g.id);
      await logA(user.name,`Eliminó genética: ${g.name}`,"genetics");
      setGenetics(prev=>prev.filter(x=>sid(x.id)!==sid(g.id)));
      setDelG(null);setSel(null);setToast({msg:"Genética eliminada",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };
  const row=(g,i)=><button key={g.id} onClick={()=>setSel(g)} style={{display:"flex",alignItems:"center",gap:13,width:"100%",padding:"12px 14px",minHeight:62,background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",color:C.text,textAlign:"left"}}>
    <span style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:g.color||C.green,color:"#fff",fontSize:17,fontWeight:800,fontFamily:H}}>{(g.name||"?")[0]}</span>
    <span style={{flex:1,minWidth:0}}>
      <span style={{display:"block",fontSize:15.5,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
      <span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>{g.flower_days?`~${g.flower_days} días`:"Sin días de flora"}{g.height?` · ${g.height}`:""}</span>
    </span>
    {g.pheno_prefix&&<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.purpleLight,color:C.purple}}>{g.pheno_prefix}</span>}
    <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
  </button>;

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {sel&&!delG&&<GenSheet g={sel} genetics={genetics} setGenetics={setGenetics} user={user}
      onClose={()=>setSel(null)} onToast={m=>setToast({msg:m,type:"success"})}
      onDelete={isAdmin&&sel.id?()=>setDelG(sel):null}/>}
    {delG&&<ConfirmModal title={`¿Eliminar ${delG.name}?`} busy={busy} onClose={()=>setDelG(null)} onConfirm={del}
      text="La genética desaparece de la lista. Las plantas que ya la tienen cargada conservan el nombre pero pierden el color. No se puede deshacer."/>}

    <PageTitle sub={`${genetics.length} genética${genetics.length===1?"":"s"} · el color se usa en mesas, VG, madres y esquejeras`}
      right={isAdmin&&<button onClick={()=>setSel({})} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Agregar</button>}>Genéticas</PageTitle>

    {lista.length===0
      ? <Card style={{textAlign:"center",padding:"26px 18px"}}>
          <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="dna" size={30}/></div>
          <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>Sin genéticas cargadas</div>
          <div style={{fontSize:13,color:C.textSoft}}>{isAdmin?"Tocá “Agregar” para cargar la primera.":"Un administrador tiene que cargarlas."}</div>
        </Card>
      : <Card style={{padding:0,overflow:"hidden"}}>{lista.map(row)}</Card>}
  </div>;
}

// ESTADÍSTICAS
// Carga de una cosecha ANTERIOR (histórica), que nunca pasó por la app.
// Se parte de la fecha de pesaje y se derivan las otras dos:
//   cosecha = pesaje − días de secado · inicio de floración = cosecha − días de flora
function CosechaAnteriorModal({rooms,roomConfig,genetics,user,onClose,onSaved}){
  const [roomId,setRoomId]=useState((rooms&&rooms[0])||"S1");
  const [pesaje,setPesaje]=useState(todayISO);
  const [diasSecado,setDiasSecado]=useState(10);
  const [diasFlora,setDiasFlora]=useState(60);
  const [rows,setRows]=useState([{pot_label:"",genetic_name:"",plant_count:"",grams:""}]);
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);

  const cosecha=addDays(pesaje,-(+diasSecado||0));
  const inicio=addDays(cosecha,-(+diasFlora||0));
  const mesas=(ROOM_POTS[roomId]||[]).map(p=>p.label);

  const setRow=(i,k,v)=>setRows(p=>p.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const addRow=()=>setRows(p=>[...p,{pot_label:"",genetic_name:"",plant_count:"",grams:""}]);
  const delRow=i=>setRows(p=>p.length>1?p.filter((_,idx)=>idx!==i):p);

  const validas=rows.filter(r=>r.pot_label&&r.genetic_name&&+r.grams>0);
  const total=validas.reduce((a,r)=>a+(+r.grams||0),0);
  const plantas=validas.reduce((a,r)=>a+(+r.plant_count||0),0);
  // Duplicados: la misma mesa + genética cargada dos veces rompe el índice único.
  const dup=(()=>{
    const seen=new Set();
    for(const r of validas){const k=`${r.pot_label}||${r.genetic_name}`;if(seen.has(k))return k.replace("||"," · ");seen.add(k);}
    return null;
  })();

  const save=async()=>{
    if(validas.length===0){setErr("Cargá al menos una fila con mesa, genética y gramos.");return;}
    if(dup){setErr(`Hay dos filas para ${dup}. Sumalas en una sola.`);return;}
    setSaving(true);setErr(null);
    let nuevoId=null;
    try{
      const name=getRC(roomConfig,roomId).display_name;
      const resumen=[
        `═══ COSECHA ANTERIOR — ${name} ═══`,
        `Cargada a mano el ${fmtDate(todayISO)} por ${user.name}`,
        `Inicio floración: ${fmtDate(inicio)} · Cosecha: ${fmtDate(cosecha)} · Pesaje: ${fmtDate(pesaje)}`,
        `Días de floración: ${diasFlora} · Secado: ${diasSecado} días`,
        "",
        "── Rendimiento por mesa ──",
        ...validas.map(r=>`• Mesa ${r.pot_label} · ${r.genetic_name}: ${r.plant_count?`${r.plant_count} plantas · `:""}${Math.round(+r.grams)} g`),
        `Total: ${Math.round(total)} g${plantas>0?` · ${plantas} plantas`:""}`,
        ...(notes.trim()?["","── Notas ──",notes.trim()]:[]),
      ].join("\n");

      const ins=await db.insert("cycles",{
        room_id:roomId,phase:"cosecha",flower_start:inicio,estimated_harvest:cosecha,real_harvest:cosecha,
        active:false,closed_at:new Date(pesaje+"T12:00:00").toISOString(),harvest_status:"completo",
        yield_grams:Math.round(total),summary:resumen,
        irrigation_type:getRC(roomConfig,roomId).irrigation_type||"manual",
      });
      const c=ins[0];
      if(!c||!c.id)throw new Error("No se pudo crear el ciclo.");
      nuevoId=c.id;

      await db.insert("harvest_yields",validas.map(r=>({
        cycle_id:c.id,room_id:roomId,pot_label:r.pot_label,genetic_name:r.genetic_name,
        plant_count:+r.plant_count||0,grams:Math.round(+r.grams),recorded_by:user.name,
      })));

      // Totales por genética, para que las estadísticas por genética lo tomen.
      const porGen={};
      validas.forEach(r=>{
        const g=porGen[r.genetic_name]=porGen[r.genetic_name]||{grams:0,plants:0};
        g.grams+=+r.grams||0;g.plants+=+r.plant_count||0;
      });
      await db.insert("cycle_genetics",Object.entries(porGen).map(([genetic_name,d])=>({
        cycle_id:c.id,genetic_name,plant_count:d.plants,yield_grams:Math.round(d.grams),
      })));

      await logA(user.name,`Cargó cosecha anterior de ${roomId} (${Math.round(total)}g, ${fmtDate(cosecha)})`,"cycle");
      onSaved();
    }catch(e){
      // Si algo falló después de crear el ciclo, lo borramos para no dejar basura a medias.
      if(nuevoId){try{await db.delete("cycles",nuevoId);}catch(_){}}
      setErr(errMsg(e));setSaving(false);
    }
  };

  const selStyle={width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 10px",fontSize:13,color:C.text};

  return <Modal title="➕ Cargar cosecha anterior" onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{fontSize:12,color:C.textSoft,marginBottom:14,lineHeight:1.5}}>Para cosechas viejas que nunca se cargaron. Poné la fecha en que la pesaste y el resto se calcula solo.</div>

    <SL>Sala y fechas</SL>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11.5,color:C.textSoft,marginBottom:5}}>Sala</div>
      <select value={roomId} onChange={e=>setRoomId(e.target.value)} style={selStyle}>
        {(rooms||["S1","S2"]).map(r=><option key={r} value={r}>{getRC(roomConfig,r).display_name}</option>)}
      </select>
    </div>
    <FI label="Fecha de pesaje" type="date" value={pesaje} onChange={e=>setPesaje(e.target.value)}/>
    <div style={{display:"flex",gap:10,marginBottom:10}}>
      <div style={{flex:1}}><NumField label="Días de secado" value={diasSecado} onCommit={v=>setDiasSecado(v===""?0:v)} min={0} max={60}/></div>
      <div style={{flex:1}}><NumField label="Días de floración" value={diasFlora} onCommit={v=>setDiasFlora(v===""?0:v)} min={1} max={200}/></div>
    </div>
    <div style={{background:C.bg,borderRadius:10,padding:"10px 13px",marginBottom:16,fontSize:12,color:C.textMid,lineHeight:1.7}}>
      Inicio de floración: <b style={{color:C.text}}>{fmtDate(inicio)}</b><br/>
      Cosecha: <b style={{color:C.text}}>{fmtDate(cosecha)}</b><br/>
      Pesaje: <b style={{color:C.text}}>{fmtDate(pesaje)}</b>
    </div>

    <SL>Rendimiento por mesa</SL>
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
      {rows.map((r,i)=><div key={i} style={{background:C.bg,borderRadius:12,padding:"11px 13px"}}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <select value={r.pot_label} onChange={e=>setRow(i,"pot_label",e.target.value)} style={{...selStyle,flex:1}}>
            <option value="">Mesa…</option>
            {mesas.map(m=><option key={m} value={m}>Mesa {m}</option>)}
          </select>
          <select value={r.genetic_name} onChange={e=>setRow(i,"genetic_name",e.target.value)} style={{...selStyle,flex:2}}>
            <option value="">Genética…</option>
            {(genetics||[]).map(g=><option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1}}><NumField value={r.plant_count} onCommit={v=>setRow(i,"plant_count",v)} min={0} max={9999} placeholder="pl." compact/></div>
          <div style={{flex:1}}><NumField value={r.grams} onCommit={v=>setRow(i,"grams",v)} min={0} max={999999} placeholder="g" compact/></div>
          <div style={{flex:1,fontSize:11.5,color:C.textSoft,textAlign:"center"}}>
            {+r.grams>0&&+r.plant_count>0?`${Math.round(+r.grams/+r.plant_count)} g/pl`:"—"}
          </div>
          {rows.length>1&&<button onClick={()=>delRow(i)} style={{background:"transparent",border:"none",color:C.red,fontSize:17,cursor:"pointer",padding:"0 4px"}}>×</button>}
        </div>
      </div>)}
    </div>
    <Btn onClick={addRow} v="secondary" full style={{marginBottom:14,fontSize:13}}>+ Agregar mesa</Btn>
    <div style={{fontSize:11.5,color:C.textSoft,marginTop:-8,marginBottom:14,fontStyle:"italic",lineHeight:1.5}}>Si la misma genética estuvo en dos mesas, cargá una fila por mesa. Las plantas son opcionales, pero sin ellas no se puede calcular g/planta.</div>

    {validas.length>0&&<div style={{background:C.greenLight,borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:11,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total</div>
        <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{validas.length} mesa{validas.length!==1?"s":""}{plantas>0?` · ${plantas} plantas`:""}</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:26,fontWeight:900,color:C.green,fontFamily:H,lineHeight:1}}>{Math.round(total)} g</div>
        {plantas>0&&<div style={{fontSize:11.5,color:C.textSoft}}>{Math.round(total/plantas)} g/planta</div>}
      </div>
    </div>}

    <FT label="Notas (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Lo que recuerdes del ciclo..." rows={2}/>
    <Btn onClick={save} disabled={saving||validas.length===0} full style={{marginTop:12}}>{saving?"Guardando...":"Guardar cosecha"}</Btn>
  </Modal>;
}
// HISTORIAL — ciclos cerrados, rendimiento por mesa y carga de post-cosecha
// ══════════════════════════════════════════════════════════════════════════════
// HISTORIAL — ciclos cerrados: arriba lo que falta pesar, después el detalle
// ══════════════════════════════════════════════════════════════════════════════
function HistorialPage({roomConfig,user,genetics,rooms}){
  const [cycles,setCycles]=useState([]);
  const [yields,setYields]=useState({});      // cycle_id → filas de harvest_yields
  const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState(null);          // ciclo abierto en la hoja
  const [harvestFor,setHarvestFor]=useState(null);
  const [showAnterior,setShowAnterior]=useState(false);
  const [toast,setToast]=useState(null);
  const [err,setErr]=useState(null);
  const isAdmin=user.role==="admin";

  const load=useCallback(()=>{
    setLoading(true);setErr(null);
    db.query("cycles","active=eq.false&order=closed_at.desc&limit=60")
      .then(async cs=>{
        setCycles(cs);
        try{
          const hy=await db.query("harvest_yields","order=pot_label.asc,genetic_name.asc");
          const by={};hy.forEach(r=>{(by[r.cycle_id]=by[r.cycle_id]||[]).push(r);});
          setYields(by);
        }catch{setYields({});}
      })
      .catch(e=>setErr(errMsg(e)))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);

  const printPDF=(c,rows)=>{
    const w=window.open("","_blank");
    if(!w){setToast({msg:"El navegador bloqueó la ventana. Habilitá los pop-ups.",type:"error"});return;}
    const esc=s=>String(s??"").replace(/[<>&]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[ch]));
    const name=getRC(roomConfig,c.room_id).display_name;
    const total=rows.reduce((a,r)=>a+(+r.grams||0),0);
    const plants=rows.reduce((a,r)=>a+(r.plant_count||0),0);
    const dias=c.flower_start&&c.real_harvest?Math.round((new Date(c.real_harvest)-new Date(c.flower_start))/86400000):"—";
    const trs=rows.map(r=>`<tr><td>${esc(r.pot_label)}</td><td>${esc(r.genetic_name)}</td><td>${r.plant_count||0}</td><td>${+r.grams>0?Math.round(+r.grams):"—"}</td><td>${+r.grams>0&&r.plant_count>0?Math.round(+r.grams/r.plant_count):"—"}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — ${esc(c.real_harvest||"")}</title>
      <style>body{font-family:system-ui,sans-serif;padding:28px;color:#17201C}h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;color:#6F7B75;margin:0 0 20px;font-weight:600}
      table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #ddd}th{background:#F3F5F2}
      .tot{display:flex;gap:26px;margin:16px 0 22px}.tot div b{display:block;font-size:22px}.tot div span{font-size:12px;color:#6F7B75}
      pre{background:#F3F5F2;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap}</style></head><body>
      <h1>${esc(name)} — cosecha ${esc(c.real_harvest||"")}</h1><h2>${dias} días de floración</h2>
      <div class="tot"><div><b>${total>0?Math.round(total):"—"} g</b><span>total</span></div><div><b>${plants||"—"}</b><span>plantas</span></div><div><b>${plants>0&&total>0?Math.round(total/plants):"—"}</b><span>g/planta</span></div></div>
      <table><thead><tr><th>Mesa</th><th>Genética</th><th>Plantas</th><th>Gramos</th><th>g/pl</th></tr></thead><tbody>${trs||'<tr><td colspan="5">Sin detalle por mesa</td></tr>'}</tbody></table>
      ${c.summary?`<h2 style="margin:22px 0 8px">Informe</h2><pre>${esc(c.summary)}</pre>`:""}
      </body></html>`);
    w.document.close();w.focus();w.print();
  };

  if(loading)return <Spin/>;
  const secando=cycles.filter(c=>c.harvest_status==="secando");
  const cerrados=cycles.filter(c=>c.harvest_status!=="secando");
  const gramosDe=c=>{const rows=yields[c.id]||[];return rows.reduce((a,r)=>a+(+r.grams||0),0)||(c.yield_grams||0);};
  const plantasDe=c=>(yields[c.id]||[]).reduce((a,r)=>a+(r.plant_count||0),0);
  const totalG=cerrados.reduce((a,c)=>a+gramosDe(c),0);
  const conG=cerrados.filter(c=>gramosDe(c)>0);
  const gppProm=(()=>{const p=conG.reduce((a,c)=>a+plantasDe(c),0);const g=conG.reduce((a,c)=>a+gramosDe(c),0);return p>0?Math.round(g/p):null;})();

  const row=(c,i)=>{
    const esSec=c.harvest_status==="secando";const g=gramosDe(c);const pl=plantasDe(c);
    const name=getRC(roomConfig,c.room_id).display_name;
    const dias=c.flower_start&&c.real_harvest?Math.round((new Date(c.real_harvest)-new Date(c.flower_start))/86400000):null;
    return <button key={c.id} onClick={()=>setSel(c)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"13px 14px",minHeight:66,background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:C.text}}>
      <span style={{width:42,height:42,borderRadius:13,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:esSec?C.amberLight:C.greenLight,color:esSec?C.amber:C.green}}><Icon n={esSec?"clock":"harvest"} size={22}/></span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:15.5,fontWeight:800}}>{name}</span>
        <span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>{c.real_harvest?fmtDM(c.real_harvest):"—"}{dias?` · ${dias} días de flora`:""}</span>
      </span>
      {esSec
        ?<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.amberLight,color:C.amber}}>Falta pesar</span>
        :<span style={{textAlign:"right"}}><span style={{display:"block",fontSize:19,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{g>0?Math.round(g):"—"}<span style={{fontSize:12,color:C.textSoft,fontWeight:600}}> g</span></span>{pl>0&&g>0&&<span style={{fontSize:11.5,color:C.textSoft,fontWeight:600}}>{Math.round(g/pl)} g/pl</span>}</span>}
      <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
    </button>;
  };

  const detalle=()=>{
    const c=sel;const rows=yields[c.id]||[];const g=gramosDe(c);const pl=plantasDe(c);
    const name=getRC(roomConfig,c.room_id).display_name;
    const dias=c.flower_start&&c.real_harvest?Math.round((new Date(c.real_harvest)-new Date(c.flower_start))/86400000):null;
    const byPot={};rows.forEach(r=>{(byPot[r.pot_label]=byPot[r.pot_label]||[]).push(r);});
    const esSec=c.harvest_status==="secando";
    const st=(v,l)=><div style={{flex:1,background:C.surfaceAlt,borderRadius:14,padding:"10px 12px"}}><div style={{fontSize:20,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{v}</div><div style={{fontSize:12,color:C.textSoft,fontWeight:700}}>{l}</div></div>;
    return <Sheet title={`${name} — ${c.real_harvest?fmtDM(c.real_harvest):"sin fecha"}`} sub={dias?`${dias} días de floración`:null} onClose={()=>setSel(null)}>
      <div style={{display:"flex",gap:8,marginTop:12}}>{st(g>0?`${Math.round(g)} g`:"—","total")}{st(pl||"—","plantas")}{st(pl>0&&g>0?Math.round(g/pl):"—","g/planta")}</div>
      {esSec&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,padding:"10px 12px",borderRadius:12,background:C.amberLight,color:C.amber,fontSize:13.5,fontWeight:700}}><Icon n="alert" size={18}/>Falta cargar los gramos del secado</div>}
      {rows.length>0&&<>
        <div style={{fontSize:14,fontWeight:800,color:C.textMid,margin:"18px 0 6px"}}>Rendimiento por mesa</div>
        {Object.entries(byPot).map(([pot,rs])=>{
          const sub=rs.reduce((a,r)=>a+(+r.grams||0),0);
          return <div key={pot} style={{padding:"10px 0",borderTop:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:15,fontWeight:800,color:C.text}}>Mesa {pot}</span>
              <span style={{fontSize:14,fontWeight:800,color:sub>0?C.green:C.textSoft}}>{sub>0?`${Math.round(sub)} g`:"sin pesar"}</span>
            </div>
            {rs.map(r=><div key={r.id||r.genetic_name} style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:3}}>
              <span>{r.genetic_name} · {r.plant_count||0} pl.</span>
              <span>{+r.grams>0?`${Math.round(+r.grams)} g${r.plant_count>0?` · ${Math.round(+r.grams/r.plant_count)} g/pl`:""}`:"—"}</span>
            </div>)}
          </div>;
        })}
      </>}
      {rows.length===0&&<div style={{fontSize:13,color:C.textSoft,marginTop:14,lineHeight:1.5}}>Este ciclo no tiene detalle por mesa. Podés cargarlo con “{esSec?"Cargar":"Editar"} cosecha”.</div>}
      {c.summary&&<Fold icon="notebook" title="Informe del ciclo"><pre style={{background:C.surfaceAlt,borderRadius:12,padding:12,fontSize:11.5,color:C.textMid,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:240,overflowY:"auto",lineHeight:1.55,margin:0}}>{c.summary}</pre></Fold>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
        {isAdmin&&<Btn full onClick={()=>{setHarvestFor(c);setSel(null);}} style={{minHeight:50}}>{esSec?"Cargar cosecha":"Editar cosecha"}</Btn>}
        <Btn v="secondary" full onClick={()=>printPDF(c,rows)} style={{minHeight:48}}>Imprimir o guardar PDF</Btn>
      </div>
    </Sheet>;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {harvestFor&&<HarvestModal cycle={harvestFor} rc={getRC(roomConfig,harvestFor.room_id)} user={user} onClose={()=>setHarvestFor(null)} onSaved={()=>{setHarvestFor(null);load();setToast({msg:"Cosecha guardada ✓",type:"success"});}}/>}
    {showAnterior&&<CosechaAnteriorModal rooms={rooms} roomConfig={roomConfig} genetics={genetics} user={user} onClose={()=>setShowAnterior(false)} onSaved={()=>{setShowAnterior(false);load();setToast({msg:"Cosecha anterior cargada ✓",type:"success"});}}/>}
    {sel&&detalle()}

    <PageTitle right={isAdmin&&<button onClick={()=>setShowAnterior(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Cosecha anterior</button>}>Historial</PageTitle>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:12,padding:"10px 14px",fontSize:13}}>{err}</div>}

    {cerrados.length>0&&<div style={{display:"flex",gap:8}}>
      {[[cerrados.length,`ciclo${cerrados.length===1?"":"s"}`],[totalG>0?`${(totalG/1000).toFixed(1).replace(".",",")} kg`:"—","cosechado"],[gppProm||"—","g/planta"]].map(([v,l])=>
        <div key={l} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"11px 13px"}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{v}</div><div style={{fontSize:12.5,color:C.textSoft,fontWeight:700}}>{l}</div>
        </div>)}
    </div>}

    {secando.length>0&&<div>
      <div style={{fontSize:18,fontWeight:800,color:C.amber,margin:"12px 2px 10px"}}>Falta pesar</div>
      <Card style={{padding:0,overflow:"hidden"}}>{secando.map(row)}</Card>
    </div>}

    {cerrados.length>0&&<div>
      <div style={{fontSize:18,fontWeight:800,color:C.text,margin:"12px 2px 10px"}}>Ciclos cerrados</div>
      <Card style={{padding:0,overflow:"hidden"}}>{cerrados.map(row)}</Card>
    </div>}

    {cycles.length===0&&<Card style={{padding:"26px 18px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="history" size={30}/></div>
      <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>Sin ciclos cerrados</div>
      <div style={{fontSize:13,color:C.textSoft,lineHeight:1.5}}>Cuando cierres uno aparece acá con su detalle y su PDF.</div>
    </Card>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS — rendimiento arriba, clima y trabajo del equipo plegados
// ══════════════════════════════════════════════════════════════════════════════
function EstadisticasPage({rooms,roomConfig,targets}){
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [clRange,setClRange]=useState("24h");
  const [clSeries,setClSeries]=useState([]);
  useEffect(()=>{
    Promise.all([
      db.query("tasks","order=created_at.desc&limit=300"),
      db.query("watering_logs","order=logged_at.desc&limit=100"),
      db.query("nutrition_logs","order=logged_at.desc&limit=100"),
      db.query("cycles","active=eq.false&order=closed_at.desc&limit=40"),
      db.query("cycle_genetics","order=id.desc&limit=400"),
      db.query("climate_logs",`recorded_at=gte.${new Date(Date.now()-24*3600*1000).toISOString()}&order=recorded_at.desc`),
      db.query("cycles","active=eq.true"),
      db.query("harvest_yields","order=pot_label.asc").catch(()=>[]),
    ]).then(([tasks,wl,nl,closed,cgAll,climate,active,hy])=>{
      const climByRoom={};(climate||[]).forEach(c=>{if(!climByRoom[c.room_id])climByRoom[c.room_id]=c;});
      const activeByRoom={};(active||[]).forEach(c=>{if(!activeByRoom[c.room_id])activeByRoom[c.room_id]=c;});
      const byUser={};
      tasks.forEach(t=>{if(!t.assignee)return;if(!byUser[t.assignee])byUser[t.assignee]={total:0,done:0};byUser[t.assignee].total++;if(t.status==="completada")byUser[t.assignee].done++;});
      const wByRoom={};(rooms||["S1","S2"]).forEach(r=>{wByRoom[r]=0;});
      wl.forEach(w=>{if(wByRoom[w.room_id]!==undefined)wByRoom[w.room_id]++;});
      // Los gramos salen de harvest_yields si están; si no, de cycle_genetics o del total del ciclo.
      const hyByCycle={};(hy||[]).forEach(r=>{(hyByCycle[r.cycle_id]=hyByCycle[r.cycle_id]||[]).push(r);});
      const cgByCycle={};(cgAll||[]).forEach(g=>{(cgByCycle[g.cycle_id]=cgByCycle[g.cycle_id]||[]).push(g);});
      const cycleStats=(closed||[]).map(c=>{
        const hr=hyByCycle[c.id]||[];const gs=cgByCycle[c.id]||[];
        const plants=hr.reduce((a,r)=>a+(r.plant_count||0),0)||gs.reduce((a,g)=>a+(g.plant_count||0),0);
        const grams=hr.reduce((a,r)=>a+(+r.grams||0),0)||c.yield_grams||gs.reduce((a,g)=>a+(g.yield_grams||0),0);
        const realDays=c.flower_start&&c.real_harvest?Math.round((new Date(c.real_harvest)-new Date(c.flower_start))/86400000):null;
        const estDays=c.flower_start&&c.estimated_harvest?Math.round((new Date(c.estimated_harvest)-new Date(c.flower_start))/86400000):null;
        const area=getRC(roomConfig,c.room_id).area_m2;
        return {id:c.id,room:c.room_id,closed_at:c.closed_at,harvest:c.real_harvest,grams,plants,gpp:plants>0&&grams>0?Math.round(grams/plants):null,gm2:area&&grams?Math.round(grams/area):null,realDays,estDays};
      });
      const byGen={};
      (hy||[]).forEach(r=>{if(!r.genetic_name)return;if(!byGen[r.genetic_name])byGen[r.genetic_name]={grams:0,plants:0};byGen[r.genetic_name].grams+=+r.grams||0;byGen[r.genetic_name].plants+=r.plant_count||0;});
      (cgAll||[]).forEach(g=>{if(!g.genetic_name||hyByCycle[g.cycle_id])return;if(!byGen[g.genetic_name])byGen[g.genetic_name]={grams:0,plants:0};byGen[g.genetic_name].grams+=g.yield_grams||0;byGen[g.genetic_name].plants+=g.plant_count||0;});
      const genStats=Object.entries(byGen).map(([name,d])=>({name,...d,gpp:d.plants>0&&d.grams>0?Math.round(d.grams/d.plants):null})).filter(g=>g.grams>0).sort((a,b)=>b.grams-a.grams);
      const soil=(rooms||["S1","S2"]).map(r=>{
        const rcR=getRC(roomConfig,r);
        const lr=rcR.last_reset_at?new Date(rcR.last_reset_at):null;
        const rcClosed=(closed||[]).filter(c=>c.room_id===r&&c.closed_at).sort((a,b)=>new Date(b.closed_at)-new Date(a.closed_at));
        const lastClosed=rcClosed[0]||null;
        return {room:r,name:rcR.display_name,lastReset:rcR.last_reset_at||null,closedCount:rcClosed.length,resetPending:!!lastClosed&&(!lr||lr<new Date(lastClosed.closed_at))};
      });
      setStats({byUser,wByRoom,total:tasks.length,done:tasks.filter(t=>t.status==="completada").length,wCount:wl.length,nCount:nl.length,cycleStats,genStats,soil,climByRoom,activeByRoom});
    }).finally(()=>setLoading(false));
  },[rooms,roomConfig]);
  useEffect(()=>{
    const id=setInterval(()=>{
      db.query("climate_logs",`recorded_at=gte.${new Date(Date.now()-3600*1000).toISOString()}&order=recorded_at.desc`).then(cl=>{
        const cb={};(cl||[]).forEach(c=>{if(!cb[c.room_id])cb[c.room_id]=c;});
        setStats(prev=>prev?{...prev,climByRoom:cb}:prev);
      }).catch(()=>{});
    },120000);
    return ()=>clearInterval(id);
  },[]);
  useEffect(()=>{
    const loadS=()=>{
      const hrs=clRange==="24h"?24:clRange==="7d"?24*7:24*30;
      const since=new Date(Date.now()-hrs*3600*1000).toISOString();
      db.query("climate_logs",`recorded_at=gte.${since}&order=recorded_at.asc`).then(setClSeries).catch(()=>setClSeries([]));
    };
    loadS();const id=setInterval(loadS,120000);return ()=>clearInterval(id);
  },[clRange]);
  if(loading)return <Spin/>;
  if(!stats)return null;

  const CL_ROOMS=[...(rooms||["S1","S2"]),"Vegetativo"];
  const CL_COLORS=[C.amber,C.blue,C.green,C.purple,C.red];
  const clFor=field=>CL_ROOMS.map((r,i)=>({
    name:getRC(roomConfig,r).display_name,
    color:CL_COLORS[i%CL_COLORS.length],
    points:clSeries.filter(c=>c.room_id===r&&c[field]!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c[field]})),
  })).filter(s=>s.points.length>0);

  const conG=stats.cycleStats.filter(c=>c.grams>0);
  const totalG=conG.reduce((a,c)=>a+c.grams,0);
  const plantasT=conG.reduce((a,c)=>a+c.plants,0);
  const mejor=stats.genStats.find(g=>g.gpp)||null;
  const stat=(v,l,color)=><div style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"11px 13px",minWidth:0}}>
    <div style={{fontSize:21,fontWeight:800,color:color||C.text,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{v}</div><div style={{fontSize:12.5,color:C.textSoft,fontWeight:700}}>{l}</div>
  </div>;

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    <PageTitle>Estadísticas</PageTitle>

    <div style={{display:"flex",gap:8}}>
      {stat(totalG>0?`${(totalG/1000).toFixed(1).replace(".",",")} kg`:"—","cosechado")}
      {stat(plantasT>0&&totalG>0?Math.round(totalG/plantasT):"—","g/planta")}
      {stat(conG.length,`ciclo${conG.length===1?"":"s"} con peso`)}
    </div>

    {stats.genStats.length>0&&<Card style={{padding:"16px 16px 14px"}}>
      <div style={{fontSize:16,fontWeight:800,color:C.text}}>Rendimiento por genética</div>
      <div style={{fontSize:13,color:C.textSoft,fontWeight:600,marginBottom:12}}>{mejor?`La más rendidora es ${mejor.name}, con ${mejor.gpp} g por planta.`:"Sobre los ciclos ya cerrados."}</div>
      {(()=>{const max=Math.max(...stats.genStats.map(g=>g.grams),1);return stats.genStats.map((g,i)=>
        <div key={g.name} style={{marginTop:i?12:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,gap:8}}>
            <span style={{fontSize:14.5,fontWeight:700,color:C.text,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
            <span style={{fontSize:13.5,color:C.textMid,fontWeight:800,whiteSpace:"nowrap"}}>{Math.round(g.grams)} g{g.gpp?` · ${g.gpp} g/pl`:""}</span>
          </div>
          <Bar value={g.grams} max={max} color={C.green} h={8}/>
        </div>);})()}
    </Card>}

    {stats.cycleStats.length>0&&<Card style={{padding:"16px 16px 6px"}}>
      <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>Ciclos cerrados</div>
      {stats.cycleStats.map((c,i)=>{
        const name=getRC(roomConfig,c.room).display_name;const dif=c.realDays!=null&&c.estDays!=null?c.realDays-c.estDays:null;
        return <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
          <span style={{width:10,alignSelf:"stretch",minHeight:34,borderRadius:4,background:c.room==="S1"?C.amber:C.blue,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>{name}{c.harvest?` · ${fmtDM(c.harvest)}`:""}</div>
            <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600}}>{c.grams>0?`${c.plants||"—"} plantas${c.gpp?` · ${c.gpp} g/pl`:""}${c.gm2?` · ${c.gm2} g/m²`:""}`:"Falta cargar la cosecha"}{c.realDays!=null?` · ${c.realDays} días`:""}</div>
          </div>
          <span style={{textAlign:"right"}}>
            <span style={{display:"block",fontSize:18,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums"}}>{c.grams>0?Math.round(c.grams):"—"}<span style={{fontSize:11.5,color:C.textSoft,fontWeight:600}}> g</span></span>
            {dif!=null&&<span style={{fontSize:11.5,fontWeight:800,color:dif===0?C.green:C.amber}}>{dif===0?"en fecha":dif>0?`+${dif} días`:`${dif} días`}</span>}
          </span>
        </div>;})}
    </Card>}

    <Fold icon="chart" title="Clima comparado">
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        {[["24h","24 h"],["7d","7 días"],["30d","30 días"]].map(([k,l])=><button key={k} onClick={()=>setClRange(k)} style={{flex:1,fontSize:13,fontWeight:800,padding:"8px 0",borderRadius:10,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${clRange===k?C.green:C.border}`,background:clRange===k?C.greenLight:"transparent",color:clRange===k?C.green:C.textSoft}}>{l}</button>)}
      </div>
      {clSeries.length===0?<div style={{textAlign:"center",color:C.textSoft,fontSize:13,padding:"16px 0"}}>Sin datos en este rango</div>:<>
        {[["temperature","Temperatura (°C)","°C"],["humidity","Humedad (%)","%"],["vpd","VPD (kPa)"," kPa"]].map(([f,l,u])=><div key={f}>
          <div style={{fontSize:12.5,fontWeight:800,color:C.textMid,margin:"14px 0 4px"}}>{l}</div>
          <LineChart series={clFor(f)} unit={u}/>
        </div>)}
      </>}
    </Fold>

    {stats.climByRoom&&<Fold icon="thermo" title="Clima ahora">
      {CL_ROOMS.map((r,i)=>{
        const cl=stats.climByRoom[r];const rc=getRC(roomConfig,r);const tg=getTargets(targets,r,stats.activeByRoom?.[r]||null,rc);
        return <div key={r} style={{padding:"12px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
          <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:2}}>{rc.display_name}</div>
          {cl?<div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            {[["thermo",cl.temperature,tg.temp,CLIM_TOL.temp,"°C",1],["drop",cl.humidity,tg.hum,CLIM_TOL.hum,"%",0],["leaf",cl.vpd,tg.vpd,CLIM_TOL.vpd," kPa",2]].filter(x=>x[1]!=null).map(([n,v,rr,tol,u,d])=>{
              const lv=climLevel(v,rr,tol);
              return <span key={n} style={{display:"flex",alignItems:"center",gap:5,fontSize:15,fontWeight:800,color:levelColor(lv?.k),fontVariantNumeric:"tabular-nums"}}><Icon n={n} size={16} sw={2}/>{fmtNum(v,d)}{u}</span>;})}
          </div>:<div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>Sin lectura de sensor</div>}
        </div>;})}
    </Fold>}

    {stats.soil&&stats.soil.length>0&&<Fold icon="vege" title="Balance del suelo">
      {stats.soil.map((s,i)=><div key={s.room} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>{s.name}</div>
          <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600}}>Último reset: {s.lastReset?fmtDM(String(s.lastReset).slice(0,10)):"nunca"} · {s.closedCount} ciclo{s.closedCount===1?"":"s"} cerrado{s.closedCount===1?"":"s"}</div>
        </div>
        <span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:s.resetPending?C.amberLight:C.greenLight,color:s.resetPending?C.amber:C.green}}>{s.resetPending?"Reset pendiente":"Al día"}</span>
      </div>)}
      <div style={{fontSize:12.5,color:C.textSoft,marginTop:10,lineHeight:1.5}}>Conviene recargar el suelo (Reset Express) entre ciclos. Si una cosecha quedó sin reset, aparece pendiente. El cronograma se genera al cerrar el ciclo o desde la Guía.</div>
    </Fold>}

    <Fold icon="tareas" title="Trabajo del equipo">
      <div style={{display:"flex",gap:8,margin:"4px 0 12px"}}>
        {stat(`${stats.total>0?Math.round(stats.done/stats.total*100):0}%`,"tareas hechas")}{stat(stats.wCount,"riegos")}{stat(stats.nCount,"nutriciones")}
      </div>
      {Object.entries(stats.byUser).sort((a,b)=>b[1].total-a[1].total).map(([u,d],i)=>{
        const max=Math.max(...Object.values(stats.byUser).map(x=>x.total),1);
        return <div key={u} style={{marginTop:i?12:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:14.5,fontWeight:700,color:C.text}}>{u}</span>
            <span style={{fontSize:13.5,color:C.textMid,fontWeight:800}}>{d.done} de {d.total}</span>
          </div>
          <Bar value={d.total} max={max} color={C.blue} h={8}/>
        </div>;})}
      {Object.keys(stats.byUser).length===0&&<div style={{fontSize:13,color:C.textSoft,padding:"6px 0"}}>Sin tareas asignadas todavía.</div>}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        {Object.entries(stats.wByRoom).map(([room,count])=><div key={room} style={{flex:1,background:C.surfaceAlt,borderRadius:14,padding:"10px 12px"}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{count}</div><div style={{fontSize:12,color:C.textSoft,fontWeight:700}}>riegos en {room}</div>
        </div>)}
      </div>
    </Fold>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENDA — un mes de un vistazo: hitos de los ciclos y tareas
// ══════════════════════════════════════════════════════════════════════════════
function CalendarioPage({user,roomConfig}){
  const [ref,setRef]=useState(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()};});
  const [tasks,setTasks]=useState([]);
  const [milestones,setMilestones]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selDay,setSelDay]=useState(todayISO);

  const monthStart=new Date(ref.y,ref.m,1);
  const monthEnd=new Date(ref.y,ref.m+1,0);
  const mm=String(ref.m+1).padStart(2,"0");
  const startISO=`${ref.y}-${mm}-01`;
  const endISO=`${ref.y}-${mm}-${String(monthEnd.getDate()).padStart(2,"0")}`;

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([
      db.query("tasks",`due_date=gte.${startISO}&due_date=lte.${endISO}&order=due_date.asc`),
      db.query("cycle_milestones",`due_date=gte.${startISO}&due_date=lte.${endISO}`).catch(()=>[]),
    ]).then(([t,m])=>{setTasks(t);setMilestones(m);}).catch(()=>{setTasks([]);setMilestones([]);}).finally(()=>setLoading(false));
  },[startISO,endISO]);
  useEffect(()=>{load();},[load]);

  const HITOS={start:{l:"Inicio de floración",c:C.amber,ic:"vege"},cosecha:{l:"Cosecha",c:C.red,ic:"harvest"},lavado:{l:"Lavado",c:C.blue,ic:"water"},poda:{l:"Poda",c:C.purple,ic:"scissors"}};
  const milesOf=ds=>milestones.filter(m=>m.due_date===ds&&HITOS[m.type]);
  const tasksOf=ds=>tasks.filter(t=>t.due_date===ds);
  const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const monthName=`${MESES[ref.m]} ${ref.y}`;
  const firstWeekday=(monthStart.getDay()+6)%7;   // la semana arranca el lunes
  const cells=[];
  for(let i=0;i<firstWeekday;i++)cells.push(null);
  for(let d=1;d<=monthEnd.getDate();d++)cells.push(`${ref.y}-${mm}-${String(d).padStart(2,"0")}`);
  const prevMonth=()=>setRef(r=>r.m===0?{y:r.y-1,m:11}:{y:r.y,m:r.m-1});
  const nextMonth=()=>setRef(r=>r.m===11?{y:r.y+1,m:0}:{y:r.y,m:r.m+1});
  const dayTasks=tasksOf(selDay);
  const dayMiles=milesOf(selDay);
  const hitosMes=milestones.filter(m=>HITOS[m.type]).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  const tone=r=>r==="S1"?C.amber:r==="S2"?C.blue:r==="Vegetativo"?C.green:C.textSoft;
  const roomShort=r=>r==="Vegetativo"?"Vege":(r||"General");
  const DIAS_L=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
  const selLabel=selDay===todayISO?"Hoy":`${DIAS_L[(new Date(selDay+"T12:00:00").getDay()+6)%7]} ${fmtDM(selDay)}`;

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    <PageTitle>Agenda</PageTitle>
    <Card style={{padding:"12px 12px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <button onClick={prevMonth} aria-label="Mes anterior" style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceAlt,cursor:"pointer",color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="back" size={20}/></button>
        <span style={{fontSize:17,fontWeight:800,color:C.text}}>{monthName.charAt(0).toUpperCase()+monthName.slice(1)}</span>
        <button onClick={nextMonth} aria-label="Mes siguiente" style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceAlt,cursor:"pointer",color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="chev" size={20}/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11.5,fontWeight:800,color:C.textSoft}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {cells.map((ds,i)=>{
          if(!ds)return <div key={i}/>;
          const dt=tasksOf(ds);const ms=milesOf(ds);const hito=ms[0]?HITOS[ms[0].type]:null;
          const isToday=ds===todayISO;const isSel=ds===selDay;
          const pend=dt.some(t=>t.status==="pendiente");
          const dotColor=dt.length===0?null:pend?(ds<todayISO?C.red:C.amber):C.green;
          return <button key={i} onClick={()=>setSelDay(ds)} aria-label={`${+ds.slice(-2)}, ${dt.length} tareas`} style={{aspectRatio:"1",borderRadius:12,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,position:"relative",
            border:isSel?`2px solid ${C.green}`:`1px solid ${hito?hito.c+"55":C.border}`,background:isSel?C.greenLight:hito?hito.c+"14":isToday?C.surfaceAlt:"transparent"}}>
            <span style={{fontSize:14.5,fontWeight:isToday||isSel||hito?800:600,color:hito?hito.c:isToday?C.green:C.text,fontVariantNumeric:"tabular-nums"}}>{+ds.slice(-2)}</span>
            <span style={{display:"flex",gap:2,height:5,alignItems:"center"}}>
              {hito&&<span style={{width:5,height:5,borderRadius:"50%",background:hito.c}}/>}
              {dotColor&&<span style={{width:5,height:5,borderRadius:"50%",background:dotColor}}/>}
            </span>
          </button>;
        })}
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14,fontSize:12,color:C.textSoft,fontWeight:600}}>
        {[[C.purple,"hito del ciclo"],[C.amber,"tareas pendientes"],[C.green,"todo hecho"],[C.red,"vencidas"]].map(([c,l])=><span key={l} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{l}</span>)}
      </div>
    </Card>

    <div style={{fontSize:18,fontWeight:800,color:C.text,margin:"10px 2px 0"}}>{selLabel}</div>
    {dayMiles.length>0&&<Card style={{padding:0,overflow:"hidden"}}>
      {dayMiles.map((m,i)=>{const h=HITOS[m.type];return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderTop:i?`1px solid ${C.border}`:"none"}}>
        <span style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:h.c+"1F",color:h.c,flexShrink:0}}><Icon n={h.ic} size={20}/></span>
        <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:15,fontWeight:800,color:C.text}}>{m.label||h.l}</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>Hito del ciclo{m.room_id?` · ${roomShort(m.room_id)}`:""}</span></span>
      </div>;})}
    </Card>}
    {loading?<Spin/>:<Card style={{padding:0,overflow:"hidden"}}>
      {dayTasks.length===0&&<div style={{padding:"20px 16px",textAlign:"center",color:C.textSoft,fontSize:14}}>Sin tareas este día.</div>}
      {dayTasks.map((t,i)=>{
        const hecha=t.status==="completada";
        return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",minHeight:60,borderTop:i?`1px solid ${C.border}`:"none"}}>
          <span style={{width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:hecha?C.green:"transparent",boxShadow:hecha?"none":`inset 0 0 0 2px ${C.borderStrong}`,color:C.onAccent}}>{hecha&&<Icon n="check" size={16} sw={2.6}/>}</span>
          <span style={{flex:1,minWidth:0}}>
            <span style={{display:"block",fontSize:15,fontWeight:700,color:hecha?C.textSoft:C.text,textDecoration:hecha?"line-through":"none"}}>{t.title}</span>
            {t.assignee&&<span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600}}>{t.assignee}</span>}
          </span>
          <span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,color:tone(t.room_id),background:`${tone(t.room_id)}1F`,flexShrink:0}}>{roomShort(t.room_id)}</span>
        </div>;})}
    </Card>}
    {dayTasks.length>0&&<div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,padding:"0 2px"}}>Para marcarlas o editarlas, entrá a Tareas.</div>}

    {hitosMes.length>0&&<Fold icon="calendar" title="Hitos del mes" count={hitosMes.length}>
      {hitosMes.map((m,i)=>{const h=HITOS[m.type];return <button key={i} onClick={()=>setSelDay(m.due_date)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 0",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
        <span style={{color:h.c}}><Icon n={h.ic} size={20}/></span>
        <span style={{flex:1,minWidth:0,fontSize:14.5,fontWeight:700,color:C.text}}>{m.label||h.l}{m.room_id?<span style={{color:C.textSoft,fontWeight:600}}> · {roomShort(m.room_id)}</span>:null}</span>
        <span style={{fontSize:14,fontWeight:800,color:C.textMid}}>{fmtDM(m.due_date)}</span>
      </button>;})}
    </Fold>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// BITÁCORA — notas del día, agrupadas por fecha
// ══════════════════════════════════════════════════════════════════════════════
function BitacoraPage({user}){
  const [entries,setEntries]=useState([]);
  const [loading,setLoading]=useState(true);
  const [draft,setDraft]=useState("");
  const [entryDate,setEntryDate]=useState(todayISO);
  const [saving,setSaving]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [sel,setSel]=useState(null);
  const [delE,setDelE]=useState(null);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);
  const [err,setErr]=useState(null);

  const load=useCallback(()=>{
    setLoading(true);
    db.query("bitacora","order=entry_date.desc,created_at.desc").then(r=>{setEntries(r);setErr(null);}).catch(e=>{setEntries([]);setErr(errMsg(e));}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);

  const save=async()=>{
    if(!draft.trim()||saving)return;
    setSaving(true);
    try{
      await db.insert("bitacora",{entry_date:entryDate,author:user.name,content:draft.trim(),processed:false});
      await logA(user.name,"Anotó en la bitácora","bitacora");
      setDraft("");setShowNew(false);setEntryDate(todayISO);load();setToast({msg:"Nota guardada ✓",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const borrar=async()=>{
    const e=delE;if(!e)return;setBusy(true);
    try{await db.delete("bitacora",e.id);setEntries(prev=>prev.filter(x=>x.id!==e.id));setDelE(null);setSel(null);setToast({msg:"Nota borrada",type:"success"});}
    catch(ex){setToast({msg:errMsg(ex),type:"error"});}finally{setBusy(false);}
  };

  // Las notas se agrupan por día para que el scroll sea el de un cuaderno.
  const byDate={};entries.forEach(e=>{(byDate[e.entry_date]=byDate[e.entry_date]||[]).push(e);});
  const dates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  const DIAS_L=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
  const dLabel=d=>{
    if(d===todayISO)return "Hoy";
    if(d===addDays(todayISO,-1))return "Ayer";
    const dt=new Date(d+"T12:00:00");
    return `${DIAS_L[(dt.getDay()+6)%7]} ${fmtDM(d)}`;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {delE&&<ConfirmModal title="¿Borrar esta nota?" text="No se puede deshacer." busy={busy} onClose={()=>setDelE(null)} onConfirm={borrar}/>}
    {sel&&!delE&&<Sheet title={dLabel(sel.entry_date)} sub={`${sel.author||"—"}${sel.entry_date!==todayISO?` · ${fmtDM(sel.entry_date)}`:""}`} onClose={()=>setSel(null)}>
      <div style={{fontSize:15,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap",marginTop:8}}>{sel.content}</div>
      <Btn v="danger" full onClick={()=>setDelE(sel)} style={{marginTop:18,minHeight:48}}>Borrar nota</Btn>
    </Sheet>}
    {showNew&&<Sheet title="Nueva nota" sub="Lo que hiciste y lo que viste hoy." onClose={()=>setShowNew(false)}>
      <div style={{marginTop:12}}><FI label="Fecha" type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)}/></div>
      <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={6} autoFocus placeholder="Ej: Regué S1 y S2. Vi cochinillas en la mesa D. Las número 20, 13 y 10 quedan en observación por posible polen."
        style={{width:"100%",minHeight:140,resize:"vertical",border:"none",borderRadius:16,background:C.surfaceAlt,boxShadow:`inset 0 0 0 1.5px ${C.borderStrong}`,padding:"14px 16px",fontSize:16,fontWeight:500,lineHeight:1.5,color:C.text,fontFamily:"inherit",outline:"none"}}/>
      <Btn full onClick={save} disabled={saving||!draft.trim()} style={{marginTop:14,minHeight:52}}>{saving?"Guardando...":"Guardar nota"}</Btn>
    </Sheet>}

    <PageTitle right={<button onClick={()=>{setEntryDate(todayISO);setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Nota</button>}
      sub="El cuaderno del cultivo: lo que hiciste y lo que viste, día por día.">Bitácora</PageTitle>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:12,padding:"10px 14px",fontSize:13}}>{err}</div>}

    {loading?<Spin/>:dates.length===0?<Card style={{padding:"26px 18px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="notebook" size={30}/></div>
      <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>Todavía no hay notas</div>
      <div style={{fontSize:13,color:C.textSoft,lineHeight:1.5}}>Tocá “Nota” y escribí la primera.</div>
    </Card>:dates.map(d=><div key={d}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"14px 2px 8px"}}>
        <div style={{fontSize:16,fontWeight:800,color:d===todayISO?C.green:C.text}}>{dLabel(d)}</div>
        <span style={{fontSize:13,color:C.textSoft,fontWeight:700}}>{byDate[d].length} nota{byDate[d].length===1?"":"s"}</span>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        {byDate[d].map((e,i)=><button key={e.id} onClick={()=>setSel(e)} style={{display:"block",width:"100%",padding:"13px 15px",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span style={{width:24,height:24,borderRadius:"50%",background:C.greenLight,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{(e.author||"?")[0]}</span>
            <span style={{fontSize:12.5,fontWeight:700,color:C.textSoft}}>{e.author||"—"}</span>
          </div>
          <div style={{fontSize:14.5,color:C.text,lineHeight:1.55,whiteSpace:"pre-wrap",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{e.content}</div>
        </button>)}
      </Card>
    </div>)}
  </div>;
}

// PLAGAS
// ══════════════════════════════════════════════════════════════════════════════
// PLAGAS — registro por problema. Arriba lo que toca aplicar; lo resuelto, plegado.
// Cada registro abierto con frecuencia crea su tarea de fumigación en Tareas.
// ══════════════════════════════════════════════════════════════════════════════
const PEST_OPTS=["Trips","Araña roja","Oídio","Bichos bolita"];
const PEST_PRODUCTS=["Neem","Mamboretá","Bt"];
const PEST_FREQ=[{d:0,l:"Una vez"},{d:1,l:"Diaria"},{d:2,l:"Cada 2 días"},{d:3,l:"Cada 3 días"},{d:7,l:"Semanal"}];
const PEST_ROOMS=[["S1","Sala 1"],["S2","Sala 2"],["Vegetativo","Vege"]];
const pestRoomName=r=>(PEST_ROOMS.find(x=>x[0]===r)||[r,r||"—"])[1];
const pestNext=r=>(+r.frequency_days>0)?addDays(r.last_applied||r.detected_at||todayISO,+r.frequency_days):null;
const pestFreqTxt=d=>{const f=PEST_FREQ.find(x=>x.d===+d);return f?f.l:`Cada ${d} días`;};
// Crea la tarea de la próxima aplicación y la deja enlazada al registro.
const crearTareaPlaga=async(r,userName)=>{
  const due=pestNext(r);if(!due)return null;
  const ins=await db.insert("tasks",{title:`Fumigar ${pestRoomName(r.room_id)}: ${r.pest_type}${r.product?` (${r.product})`:""}`,room_id:r.room_id,rooms:r.room_id,type:"fumigacion",assignee:userName,due_date:due,priority:"normal",status:"pendiente",source:"plagas",instructions:r.notes||null,auto_generated:true,created_by:`plagas (${userName})`});
  const t=ins?.[0];
  if(t){try{await db.update("pest_logs",r.id,{task_id:sid(t.id)});}catch{/* el enlace es opcional */}}
  return t||null;
};
// Completar en Tareas la fumigación de un registro abierto = "Apliqué hoy": se programa la próxima.
const pestTaskDone=async(task,userName)=>{
  if(!task||task.source!=="plagas")return null;
  try{
    const rs=await db.query("pest_logs",`task_id=eq.${sid(task.id)}&status=eq.abierta`);
    const r=rs[0];if(!r)return null;
    await db.update("pest_logs",r.id,{last_applied:todayISO,task_id:null});
    return await crearTareaPlaga({...r,last_applied:todayISO},userName);
  }catch{return null;}
};
// Saca la tarea pendiente enlazada (si todavía no se hizo).
const quitarTareaPlaga=async(r)=>{
  if(!r.task_id)return;
  try{const ts=await db.query("tasks",`id=eq.${r.task_id}`);if(ts[0]&&ts[0].status!=="completada")await db.delete("tasks",r.task_id);}catch{/* ya no existe */}
};

function PestNewSheet({user,onClose,onSaved}){
  const [room,setRoom]=useState("S1");
  const [pest,setPest]=useState("");
  const [otraPlaga,setOtraPlaga]=useState(false);
  const [prod,setProd]=useState("");
  const [otroProd,setOtroProd]=useState(false);
  const [date,setDate]=useState(todayISO);
  const [freq,setFreq]=useState(2);
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(!pest.trim()){setErr("Elegí o escribí la plaga.");return;}
    setSaving(true);setErr(null);
    try{
      const data={room_id:room,pest_type:pest.trim(),product:prod.trim()||null,detected_at:date||todayISO,last_applied:date||todayISO,frequency_days:+freq||0,notes:notes.trim()||null,status:"abierta",created_by:user.name};
      const ins=await db.insert("pest_logs",data);
      const r=ins[0];
      const t=await crearTareaPlaga(r,user.name);
      await logA(user.name,`Registró plaga: ${data.pest_type} en ${room}`,"pest");
      onSaved(t?`Registrado. Tarea de fumigación para el ${fmtDM(t.due_date)} ✓`:"Registrado ✓");
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const pill=(on,l,fn,key,col=C.green)=><button key={key||l} onClick={fn} style={{padding:"9px 14px",borderRadius:99,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",background:on?col:C.surface,color:on?C.onAccent:C.textMid,border:`1.5px solid ${on?col:C.border}`}}>{l}</button>;
  const lbl=t=><div style={{fontSize:13,fontWeight:800,color:C.textSoft,margin:"12px 0 7px"}}>{t}</div>;
  return <Sheet title="Registrar plaga" onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"9px 12px",fontSize:12.5,marginBottom:6}}>{err}</div>}
    {lbl("Dónde")}
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PEST_ROOMS.map(([k,l])=>pill(room===k,l,()=>setRoom(k),k))}</div>
    {lbl("Qué apareció")}
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {PEST_OPTS.map(p=>pill(!otraPlaga&&pest===p,p,()=>{setOtraPlaga(false);setPest(p);},p,C.red))}
      {pill(otraPlaga,"Otra",()=>{setOtraPlaga(true);setPest("");},"__otra__",C.red)}
    </div>
    {otraPlaga&&<div style={{marginTop:10}}><FI value={pest} onChange={e=>setPest(e.target.value)} placeholder="Ej: pulgón, mosca blanca"/></div>}
    {lbl("Producto")}
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {PEST_PRODUCTS.map(p=>pill(!otroProd&&prod===p,p,()=>{setOtroProd(false);setProd(prod===p?"":p);},p))}
      {pill(otroProd,"Otro",()=>{setOtroProd(true);setProd("");},"__otro__")}
    </div>
    {otroProd&&<div style={{marginTop:10}}><FI value={prod} onChange={e=>setProd(e.target.value)} placeholder="Ej: jabón potásico"/></div>}
    {lbl("Cada cuánto se aplica")}
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PEST_FREQ.map(f=>pill(+freq===f.d,f.l,()=>setFreq(f.d),"f"+f.d))}</div>
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <div style={{flex:1}}><FI label="Fecha" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div style={{width:130}}><NumField label="Otra (días)" value={freq} onCommit={v=>setFreq(v===""?0:+v)} min={0} max={60}/></div>
    </div>
    <FT label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Severidad, dónde lo viste..." rows={2}/>
    <div style={{fontSize:12.5,color:C.textSoft,fontWeight:600,marginBottom:12,lineHeight:1.45}}>{+freq>0?`Se crea la tarea de fumigación para el ${fmtDM(addDays(date||todayISO,+freq))} en Tareas.`:"Una sola aplicación: no se crea tarea."}</div>
    <div style={{display:"flex",gap:10}}>
      <Btn onClick={save} disabled={saving} style={{flex:1,minHeight:48}}>{saving?"Guardando...":"Registrar"}</Btn>
      <Btn onClick={onClose} v="secondary" disabled={saving} style={{flex:1,minHeight:48}}>Cancelar</Btn>
    </div>
  </Sheet>;
}

function PlagasPage({user,rooms}){
  const isAdmin=user?.role==="admin";
  const [recs,setRecs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadErr,setLoadErr]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [sel,setSel]=useState(null);
  const [delR,setDelR]=useState(null);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);
  const load=useCallback(async()=>{
    try{setRecs(await db.query("pest_logs","order=detected_at.desc,created_at.desc"));setLoadErr(null);}
    catch(e){setLoadErr(errMsg(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  if(loading)return <Spin/>;
  if(loadErr)return <Card style={{marginTop:12}}>
    <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>No pude leer los registros de plagas</div>
    <div style={{fontSize:13.5,color:C.textMid,lineHeight:1.5,marginBottom:10}}>Casi seguro falta correr el SQL de esta actualización en Supabase.</div>
    <div style={{fontSize:12,color:C.red,fontFamily:MONO,wordBreak:"break-word"}}>{loadErr}</div>
  </Card>;

  const abiertas=recs.filter(r=>r.status!=="resuelta").map(r=>({...r,next:pestNext(r)}))
    .sort((a,b)=>(a.next?0:1)-(b.next?0:1)||String(a.next||"").localeCompare(String(b.next||"")));
  const resueltas=recs.filter(r=>r.status==="resuelta");
  const urgentes=abiertas.filter(r=>r.next&&-daysSince(r.next)<=0).length;

  const act=async(fn,msg)=>{setBusy(true);try{await fn();setSel(null);await load();setToast({msg,type:"success"});}catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}};
  const aplicado=r=>act(async()=>{
    if(r.task_id){try{await db.update("tasks",r.task_id,{status:"completada",completed_at:new Date().toISOString()});}catch{/* sin tarea */}}
    const upd={...r,last_applied:todayISO};
    await db.update("pest_logs",r.id,{last_applied:todayISO,task_id:null});
    await crearTareaPlaga(upd,user.name);
    await logA(user.name,`Aplicó ${r.product||"tratamiento"} contra ${r.pest_type} en ${r.room_id}`,"pest");
  },`Aplicación registrada. Próxima: ${fmtDM(addDays(todayISO,+r.frequency_days))} ✓`);
  const resolver=r=>act(async()=>{
    await quitarTareaPlaga(r);
    await db.update("pest_logs",r.id,{status:"resuelta",resolved_at:new Date().toISOString(),task_id:null});
    await logA(user.name,`Cerró plaga: ${r.pest_type} en ${r.room_id}`,"pest");
  },"Marcada como resuelta ✓");
  const borrar=async()=>{
    const r=delR;if(!r)return;
    setBusy(true);
    try{await quitarTareaPlaga(r);await db.delete("pest_logs",r.id);await logA(user.name,`Eliminó registro de plaga: ${r.pest_type}`,"pest");setDelR(null);setSel(null);await load();setToast({msg:"Registro eliminado",type:"success"});}
    catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setBusy(false);}
  };

  const estado=r=>{
    if(!r.next)return {t:"Seguimiento",c:C.textSoft,bg:C.surfaceAlt};
    const d=-daysSince(r.next);
    return d<0?{t:"Vencida",c:C.red,bg:C.redLight}:d===0?{t:"Hoy",c:C.amber,bg:C.amberLight}:{t:`En ${d} día${d===1?"":"s"}`,c:C.textMid,bg:C.surfaceAlt};
  };
  const row=(r,i,cerrada)=>{const e=cerrada?{t:"Resuelta",c:C.green,bg:C.greenLight}:estado(r);
    return <button key={r.id} onClick={()=>setSel(r)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 14px",minHeight:62,background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",fontFamily:"inherit",color:C.text,textAlign:"left"}}>
      <span style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:e.bg,color:e.c}}><Icon n="bug" size={20}/></span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:15.5,fontWeight:800}}>{r.pest_type}</span>
        <span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pestRoomName(r.room_id)} · {r.product||"sin producto"} · {cerrada?`desde ${fmtDM(r.detected_at)}`:pestFreqTxt(r.frequency_days)}</span>
      </span>
      <span style={{fontSize:12,fontWeight:800,padding:"4px 10px",borderRadius:99,background:e.bg,color:e.c,whiteSpace:"nowrap"}}>{e.t}</span>
    </button>;};

  const selNext=sel?pestNext(sel):null;
  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showNew&&<PestNewSheet user={user} onClose={()=>setShowNew(false)} onSaved={m=>{setShowNew(false);load();setToast({msg:m,type:"success"});}}/>}
    {sel&&!delR&&<Sheet title={sel.pest_type} sub={`${pestRoomName(sel.room_id)} · desde ${fmtDM(sel.detected_at)}${sel.created_by?` · ${sel.created_by}`:""}`} onClose={()=>setSel(null)}>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[["Producto",sel.product||"—"],["Frecuencia",pestFreqTxt(sel.frequency_days)],[sel.status==="resuelta"?"Resuelta":"Próxima",sel.status==="resuelta"?fmtDM(sel.resolved_at):(selNext?fmtDM(selNext):"—")]].map(([l,v])=>
          <div key={l} style={{flex:1,background:C.surfaceAlt,borderRadius:12,padding:"9px 10px",minWidth:0}}>
            <div style={{fontSize:11.5,color:C.textSoft,fontWeight:700}}>{l}</div>
            <div style={{fontSize:14.5,fontWeight:800,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
          </div>)}
      </div>
      {sel.last_applied&&sel.status!=="resuelta"&&<div style={{fontSize:13,color:C.textSoft,fontWeight:600,marginBottom:10}}>Última aplicación: {fmtDM(sel.last_applied)}</div>}
      {sel.notes&&<div style={{fontSize:14,color:C.text,lineHeight:1.5,background:C.surfaceAlt,borderRadius:12,padding:"10px 12px",marginBottom:12}}>{sel.notes}</div>}
      {sel.status!=="resuelta"&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:6}}>
        {+sel.frequency_days>0&&<Btn onClick={()=>aplicado(sel)} disabled={busy} full style={{minHeight:48}}>{busy?"Guardando...":"Apliqué hoy"}</Btn>}
        <Btn onClick={()=>resolver(sel)} v="secondary" disabled={busy} full style={{minHeight:48}}>Marcar resuelta</Btn>
      </div>}
      {isAdmin&&<div style={{borderTop:`1px solid ${C.border}`,marginTop:8}}><SheetRow icon="trash" label="Eliminar registro" danger onClick={()=>setDelR(sel)}/></div>}
    </Sheet>}
    {delR&&<ConfirmModal title="¿Eliminar este registro?" busy={busy} onClose={()=>setDelR(null)} onConfirm={borrar}
      text={`Se borra ${delR.pest_type} en ${pestRoomName(delR.room_id)} y su tarea de fumigación pendiente. No se puede deshacer.`}/>}

    <PageTitle sub={abiertas.length?`${abiertas.length} abierta${abiertas.length===1?"":"s"}${urgentes?` · ${urgentes} para hoy o vencida${urgentes===1?"":"s"}`:""}`:"Sin plagas abiertas"}
      right={<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:C.onAccent,border:"none",borderRadius:14,padding:"10px 14px",fontWeight:800,fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={18}/>Registrar</button>}>Plagas</PageTitle>

    {abiertas.length>0
      ? <Card style={{padding:0,overflow:"hidden"}}>{abiertas.map((r,i)=>row(r,i,false))}</Card>
      : <Card style={{textAlign:"center",padding:"26px 18px"}}>
          <div style={{display:"flex",justifyContent:"center",color:C.green}}><Icon n="leaf" size={30}/></div>
          <div style={{fontSize:15,fontWeight:800,color:C.text,margin:"6px 0 4px"}}>Todo limpio</div>
          <div style={{fontSize:13,color:C.textSoft}}>Cuando aparezca algo, tocá “Registrar”.</div>
        </Card>}
    {resueltas.length>0&&<Fold icon="history" title="Resueltas" count={resueltas.length}>
      <div style={{margin:"0 -14px"}}>{resueltas.map((r,i)=>row(r,i,true))}</div>
    </Fold>}
  </div>;
}
function BotChat({user,currentPage,compact=false}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:`¡Hola ${user.name}! Soy el asistente de GrowManager. Puedo registrar riegos, nutrición y clima, completar tareas, anotar madres y crear tareas o compras. Para crear/editar genéticas o cambiar de fase te voy a pedir confirmación. Probá: "regué 15 min en S1" o "¿qué tareas hay hoy?".`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [pending,setPending]=useState(null); // {tool,args} a confirmar
  const scrollRef=useRef(null);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,loading]);

  const callBot=async(payload)=>{
    const r=await fetch(`${SUPA_URL}/functions/v1/grow-bot`,{
      method:"POST",
      headers:{apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({user_name:user.name,currentPage,...payload}),
    });
    return r.json();
  };

  const send=async()=>{
    const text=input.trim();
    if(!text||loading)return;
    setInput("");setPending(null);
    const newMsgs=[...msgs,{role:"user",content:text}];
    setMsgs(newMsgs);
    setLoading(true);
    try{
      const history=newMsgs.filter(m=>m.role==="user"||m.role==="assistant").map(m=>({role:m.role,content:m.content}));
      const data=await callBot({message:text,history:history.slice(0,-1)});
      if(data.error)setMsgs(m=>[...m,{role:"assistant",content:`⚠ ${data.error}`,err:true}]);
      else{
        setMsgs(m=>[...m,{role:"assistant",content:data.reply||"Listo.",pending:data.pendingAction||null}]);
        if(data.pendingAction)setPending(data.pendingAction);
      }
    }catch(e){
      setMsgs(m=>[...m,{role:"assistant",content:"⚠ No me pude conectar. Revisá que la función esté desplegada.",err:true}]);
    }finally{setLoading(false);}
  };

  const confirm=async()=>{
    if(!pending||loading)return;
    const act=pending;setPending(null);setLoading(true);
    try{
      const data=await callBot({confirmAction:act});
      setMsgs(m=>[...m,{role:"assistant",content:data.error?`⚠ ${data.error}`:(data.reply||"Listo ✓"),err:!!data.error}]);
    }catch(e){
      setMsgs(m=>[...m,{role:"assistant",content:"⚠ No se pudo confirmar la acción.",err:true}]);
    }finally{setLoading(false);}
  };
  const cancel=()=>{setPending(null);setMsgs(m=>[...m,{role:"assistant",content:"Acción cancelada."}]);};

  const quick=["¿Qué tareas hay hoy?","¿Cómo viene S1?","Regué 15 min en S1"];

  return <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,padding:"4px 2px 10px"}}>
      {msgs.map((m,i)=><div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"88%"}}>
        <div style={{background:m.role==="user"?C.green:m.err?C.redLight:C.surface,color:m.role==="user"?"#fff":m.err?C.red:C.text,border:m.role==="user"?"none":`1px solid ${C.border}`,borderRadius:16,padding:"11px 15px",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap",boxShadow:C.shadow}}>{m.content}</div>
        {m.pending&&pending===m.pending&&<div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={confirm} disabled={loading} style={{background:C.green,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Confirmar</button>
          <button onClick={cancel} disabled={loading} style={{background:C.bg,color:C.textMid,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancelar</button>
        </div>}
      </div>)}
      {loading&&<div style={{alignSelf:"flex-start",background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"11px 15px",fontSize:14,color:C.textSoft}}>pensando…</div>}
    </div>
    {msgs.length<=1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {quick.map(q=><button key={q} onClick={()=>setInput(q)} style={{background:C.greenLight,color:C.green,border:"none",borderRadius:999,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{q}</button>)}
    </div>}
    <div style={{display:"flex",gap:8,paddingBottom:compact?0:8}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="Escribí tu mensaje..." style={{flex:1,padding:"13px 16px",borderRadius:14,border:`1.5px solid ${C.border}`,fontSize:15,color:C.text,background:C.surface,outline:"none"}}/>
      <button onClick={send} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?C.borderStrong:C.green,color:"#fff",border:"none",borderRadius:14,padding:"0 20px",fontSize:18,cursor:loading||!input.trim()?"default":"pointer",fontWeight:800}}>↑</button>
    </div>
  </div>;
}

function BotPage({user}){
  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 132px)"}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8,paddingBottom:8}}>Asistente 🤖</div>
    <BotChat user={user} currentPage="bot"/>
  </div>;
}

// Botón flotante + panel lateral del bot, disponible en todas las páginas/roles.
function FloatingBot({user,currentPage,wide}){
  const [open,setOpen]=useState(false);
  return <>
    {!open&&<button onClick={()=>setOpen(true)} title="Asistente" style={{position:"fixed",right:wide?24:16,bottom:wide?24:84,zIndex:150,width:58,height:58,borderRadius:"50%",background:C.green,color:"#fff",border:"none",boxShadow:C.shadowUp,fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🤖</button>}
    {open&&<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:wide?"stretch":"flex-end",justifyContent:wide?"flex-end":"center"}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <div style={{background:C.bg,width:"100%",maxWidth:wide?420:480,height:wide?"100vh":"82vh",borderRadius:wide?0:"20px 20px 0 0",display:"flex",flexDirection:"column",boxShadow:C.shadowUp,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:17,fontWeight:900,color:C.text}}><span>🤖</span> Asistente</div>
          <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",fontSize:26,cursor:"pointer",color:C.textSoft,lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,minHeight:0}}><BotChat user={user} currentPage={currentPage} compact/></div>
      </div>
    </div>}
  </>;
}

// ============ GUÍA LIVING SOIL ============
// Contenido curado por etapa del ciclo. "tengo" = insumos que ya usa Lucas;
// "proponer" = complementos orgánicos sugeridos (cultivo en suelo vivo).
// stageKey() deriva la etapa real desde el ciclo de la sala.
function stageKey(cycle,rc){
  if(!cycle)return null;
  if(cycle.phase==="cosechando")return "cosecha";
  if(cycle.phase==="vegetativo")return "veg";
  if(cycle.phase==="floración"){
    const dia=cycle.flower_start?daysFrom(cycle.flower_start):0;
    const flush=(rc?.flush_days??20);
    const toHarvest=cycle.estimated_harvest?daysTo(cycle.estimated_harvest):999;
    if(toHarvest<=flush)return "lavado";
    if(dia<=21)return "flora_temprana";
    if(dia<=45)return "flora_media";
    return "flora_tardia";
  }
  return null;
}

// ── OBJETIVOS DE CLIMA POR ETAPA ────────────────────────────────────────────
// Temp y humedad son EDITABLES desde la app (se guardan en la tabla climate_targets,
// por sala + etapa). El VPD es fijo por etapa (derivado, no se edita).
// Etapas climáticas: la sala Vegetativo usa "vege" (madres/esquejes). Las salas de
// floración usan veg / flora_temprana / flora_media / flora_tardia. Lavado y cosecha
// reusan el perfil de flora tardía (mismo clima: fresco y seco).
const CLIMA_FLOWER_STAGES=["veg","flora_temprana","flora_media","flora_tardia"];
const CLIMA_STAGE_LABEL={
  vege:"Vegetativo (madres/esquejes)",
  veg:"Vegetativo",
  flora_temprana:"Flora temprana",
  flora_media:"Flora media",
  flora_tardia:"Flora tardía / lavado",
};
// VPD fijo por etapa (kPa). No editable.
const VPD_BY_STAGE={
  vege:{min:0.6,max:0.9},
  veg:{min:0.8,max:1.0},
  flora_temprana:{min:1.0,max:1.2},
  flora_media:{min:1.2,max:1.4},
  flora_tardia:{min:1.4,max:1.6},
};
// Valores por defecto de temp/humedad (semilla; se pueden editar en la app).
// Coinciden con lo sembrado por el SQL. Sirven de respaldo si falta la fila en DB.
const TARGET_DEFAULTS={
  vege:{temp_min:22,temp_max:26,hum_min:65,hum_max:75},
  veg:{temp_min:22,temp_max:26,hum_min:60,hum_max:70},
  flora_temprana:{temp_min:24,temp_max:26,hum_min:55,hum_max:65},
  flora_media:{temp_min:22,temp_max:25,hum_min:50,hum_max:55},
  flora_tardia:{temp_min:20,temp_max:24,hum_min:40,hum_max:50},
};
// Traduce la etapa real (stageKey) a la etapa climática. Lavado/cosecha → flora tardía.
function climaStageFor(roomId,cycle,rc){
  if(roomId==="Vegetativo")return "vege";
  const sk=stageKey(cycle,rc);
  if(sk==="lavado"||sk==="cosecha")return "flora_tardia";
  if(sk==="veg"||sk==="flora_temprana"||sk==="flora_media"||sk==="flora_tardia")return sk;
  return "veg"; // sin ciclo o desconocido → objetivo neutro de vegetativo
}
// Resuelve los rangos objetivo de una sala según el momento del cultivo.
// Temp/hum salen de climate_targets (editables); si falta la fila, usa TARGET_DEFAULTS.
// Devuelve {stage,label,temp:{min,max},hum:{min,max},vpd:{min,max}}.
function getTargets(targetsArr,roomId,cycle,rc){
  const cs=climaStageFor(roomId,cycle,rc);
  const row=(targetsArr||[]).find(t=>t.room_id===roomId&&t.stage===cs);
  const def=TARGET_DEFAULTS[cs]||TARGET_DEFAULTS.veg;
  const num=(a,b)=>a==null?b:+a;
  return {
    stage:cs,
    label:CLIMA_STAGE_LABEL[cs]||cs,
    temp:{min:num(row?.temp_min,def.temp_min),max:num(row?.temp_max,def.temp_max)},
    hum:{min:num(row?.hum_min,def.hum_min),max:num(row?.hum_max,def.hum_max)},
    vpd:VPD_BY_STAGE[cs]||VPD_BY_STAGE.veg,
  };
}

const GUIDE={
  reset:{
    title:"Reset Express — recargar el suelo entre ciclos",
    tip:"Tenés ~5 días entre cosecha y trasplante: hay que recargar el suelo vivo sin removerlo. Acá se define si el próximo ciclo rinde o se cae.",
    intro:"En tu sistema de alta rotación (cosechás y volvés a florar en ~12-13 días, casi sin vegetativo) el suelo no descansa: cada cosecha se lleva nutrientes que nunca llegás a reponer. Esa es la causa más probable de la caída de rendimiento. El Reset Express recarga la cama de 800 L en 5 días sin removerla, manteniendo viva la biología. Es la etapa más importante de tu método.",
    blocks:[
      {icon:"🧹",title:"Día 0-1 · Limpiar y dejar la raíz vieja in situ",why:"En no-till las raíces viejas son alimento para hongos y lombrices y forman canales de aireación. Removerlas destruye la estructura microbiana que tardaste meses en construir.",how:"Sacá restos de cogollo y hojas caídas. Cortá los tallos a ras pero NO arranques el cepellón: dejalo descomponer en el lugar. No revuelvas el sustrato."},
      {icon:"♻️",title:"Día 1 · Materia orgánica: humus + compost en superficie",why:"Repone la base de nutrientes y comida microbiana que la cosecha exportó. En superficie (top-dress) alimenta la capa más biológicamente activa sin alterar la estructura.",how:"Esparcí humus de lombriz y compost maduro sobre la cama (sin enterrar). Si tenés bokashi, sumá una capa fina: aporta microorganismos y libera rápido."},
      {icon:"🌿",title:"Día 1 · Nitrógeno suave + micorrizas en zona de raíz",why:"La harina de alfalfa da N de liberación lenta sin quemar; las micorrizas se reinstalan mejor con contacto directo donde irá la próxima raíz.",how:"Top-dress de harina de alfalfa y, en los puntos donde trasplantás, una pizca de micorrizas. Acompañá con tu bioestimulante radicular (aminoácidos + P)."},
      {icon:"🪨",title:"Día 2 · Minerales: Ca/S (yeso) + P/micros (harina de roca)",why:"La cosecha continua agota calcio, azufre y fósforo. El yeso aporta Ca y S sin mover el pH; la harina de roca repone P y micronutrientes de liberación lenta.",how:"Espolvoreá yeso agrícola y harina de roca/basáltica y mezclá MUY superficialmente con la mano. Si el pH viene bajo, sumá harina de ostra en vez de subir todo de golpe."},
      {icon:"🫖",title:"Día 3 · Té de compost aireado (ACT) para despertar la biología",why:"Un ACT multiplica bacterias y hongos benéficos y los reparte por el sustrato. Reactiva la red trófica que va a poner disponibles las enmiendas que acabás de tirar.",how:"Té aireado 24-36 h con humus + un chorrito de melaza como alimento microbiano. Regá la cama con el té diluido. No exageres la melaza."},
      {icon:"🌾",title:"Día 4 · Mulch + humedad (y lombrices, opcional)",why:"El mulch mantiene húmeda y protegida la capa microbiana y modera temperatura. Introducir lombrices (E. foetida) acelera el procesado de la materia orgánica nueva.",how:"Cubrí con 1-2 cm de paja o alfalfa, regá para activar todo y mantené humedad pareja. Si vas a sumar lombrices, este es el momento."},
      {icon:"🌱",title:"Día 5 · Trasplante de los esquejes",why:"A esta altura el suelo ya está recargado y biológicamente activo: la raíz nueva entra a un medio listo para sostener todo el ciclo.",how:"Trasplantá manteniendo el mulch. De acá arrancan los ~6 días de vegetativo corto antes del flip a flora."},
    ],
    doses:[
      {item:"Humus de lombriz",cama:"15-25 L",m2:"8-12 L/m²",efecto:"Base biológica + N suave"},
      {item:"Compost maduro / bokashi",cama:"30-60 L",m2:"15-30 L/m²",efecto:"Materia orgánica + microbiología"},
      {item:"Harina de alfalfa",cama:"200-400 g",m2:"100-200 g/m²",efecto:"Nitrógeno de liberación lenta"},
      {item:"Yeso agrícola (Ca+S)",cama:"500 g-1 kg",m2:"250-500 g/m²",efecto:"Calcio y azufre sin tocar pH"},
      {item:"Harina de roca / basáltica",cama:"1-2 kg",m2:"0,5-1 kg/m²",efecto:"P + micronutrientes lentos"},
      {item:"Harina de ostra (si pH bajo)",cama:"500 g-1 kg",m2:"250-500 g/m²",efecto:"Calcio + corrige acidez"},
      {item:"Micorrizas",cama:"2-4 g",m2:"1-2 g/m²",efecto:"En zona de raíz al trasplante"},
      {item:"Melaza (en el ACT)",cama:"5-10 ml/L agua",m2:"—",efecto:"Alimento microbiano"},
      {item:"Mulch (paja/alfalfa)",cama:"capa 1-2 cm",m2:"capa 1-2 cm",efecto:"Protege la capa biológica"},
    ],
    products:{
      tengo:["Humus de lombriz","Compost","Harina de alfalfa","Yeso agrícola","Harina de roca","Melaza","Micorrizas","Bioestimulante radicular"],
      proponer:["Bokashi (fermento de arranque rápido)","ACT — té de compost aireado regular","Harina de ostra (Ca + pH)","Lombrices E. foetida en la cama","Trichoderma + Bacillus en zona radicular"],
    },
    tasks:[
      {title:"Día 1 — Top-dress humus + compost",type:"nutricion",priority:"alta"},
      {title:"Día 1 — Alfalfa + micorrizas + radicular",type:"nutricion",priority:"normal"},
      {title:"Día 2 — Minerales: yeso + harina de roca",type:"nutricion",priority:"alta"},
      {title:"Día 3 — Aplicar ACT (té de compost)",type:"riego",priority:"normal"},
      {title:"Día 4 — Reponer mulch + regar",type:"limpieza",priority:"normal"},
      {title:"Día 5 — Trasplante de esquejes",type:"revision",priority:"alta"},
    ],
  },
  veg:{
    title:"Vegetativo corto (≈6 días) — arranque antes del flip",
    tip:"Son pocos días: el objetivo es que la raíz prenda fuerte en el suelo ya recargado y llegar firme al flip. Sin empujar con sales.",
    intro:"En tu método el vegetativo es corto (~6 días post-trasplante) porque florás casi de una. No buscamos volumen vegetativo: buscamos que la raíz colonice rápido el suelo vivo que recargaste en el Reset Express y entre a flora sin estrés. Riego parejo, biología activa y nada de forzar.",
    blocks:[
      {icon:"🍄",title:"Que la raíz colonice el suelo recargado",why:"En 6 días la prioridad es raíz: cuanto más rápido se conecta con las micorrizas y la biología, mejor sostiene el stretch que viene enseguida.",how:"Mantené el bioestimulante radicular en 1-2 riegos y la humedad pareja. El suelo ya tiene la comida cargada del reset; no hace falta agregar sales."},
      {icon:"💧",title:"Riego en pulsos, nunca encharcado",why:"El suelo vivo necesita oxígeno: si se satura colapsa la microbiología aeróbica y aparece olor feo / raíz parda. Agua RO pH ~7 como venís usando.",how:"~10 L por cama cada 48 h aprox., buscando humedad constante moderada. Con riego automático, pulsos cortos y frecuentes mejor que uno largo."},
      {icon:"🫖",title:"Melaza suave para sostener la biología",why:"Un poco de melaza alimenta a los microbios que recién despertaste en el reset y mantiene la red trófica activa durante el arranque.",how:"2-3 riegos con melaza muy diluida (5-10 ml/L). No te excedas: de más alimenta también a lo que no querés."},
      {icon:"🎯",title:"Preparar el flip",why:"Definir bien el día de flip ordena todo el ciclo: poda, lavado y cosecha se calculan desde ahí.",how:"Al día ~6 pasá a flora y registrá el inicio de floración en la sala. A partir de ahí corren los hitos (poda día 15 y 21, lavado, cosecha)."},
    ],
    doses:[
      {item:"Bioestimulante radicular",cama:"según etiqueta",m2:"—",efecto:"Arranque de raíz (1-2 riegos)"},
      {item:"Melaza",cama:"5-10 ml/L agua",m2:"—",efecto:"Alimento microbiano suave"},
      {item:"Agua RO",cama:"≈10 L / 48 h",m2:"—",efecto:"pH ~7, EC ~0, humedad pareja"},
    ],
    products:{
      tengo:["Bioestimulante radicular","Melaza","Micorrizas","Mulch del reset"],
      proponer:["Té de compost suave si bajó la actividad","Trichoderma para zona radicular"],
    },
    tasks:[
      {title:"Riego con radicular (arranque de raíz)",type:"riego",priority:"normal"},
      {title:"Revisar humedad del sustrato (sin encharcar)",type:"revision",priority:"normal"},
      {title:"Pasar a floración + registrar inicio (día ~6)",type:"revision",priority:"alta"},
    ],
  },
  flora_temprana:{
    title:"Floración temprana (día 0–21) — el stretch",
    tip:"Es el estirón: sostené la raíz, defoliá con criterio para abrir luz y aire, y arrancá el calendario de suelo.",
    intro:"En las primeras 3 semanas la planta duplica o triplica su altura y define los sitios de cogollo. El suelo debe estar listo para esa demanda: acá pegan tus hitos de Zoil y la primera poda. Trabajamos estructura y prevención.",
    blocks:[
      {icon:"✂️",title:"Poda/defoliado de apertura (día 15 y 21)",why:"Quitar hojas grandes que tapan sitios bajos mejora la entrada de luz y el aire, reduce humedad en el dosel (menos hongos) y redirige energía a los cogollos que sí reciben luz.",how:"Defoliá las hojas grandes que dan sombra a brotes con potencial y limpiá el tercio inferior (lo que no llega a luz buena = larf). Sin pelar la planta: dejá hojas sanas, que son las fábricas de azúcar."},
      {icon:"🌱",title:"Hitos de suelo: Zoil día 0 y +15",why:"El cambio a flora dispara una demanda nueva. En living soil reforzamos vía suelo y bioestimulantes en vez de sales de golpe, para no romper el equilibrio microbiano.",how:"Seguí tu pauta de Zoil Monkey (día 0 y +15). Acompañá con bioestimulante radicular para sostener raíz durante el stretch."},
      {icon:"🛡️",title:"IPM preventivo (mientras se pueda mojar)",why:"La ventana para foliar es ahora: en floración avanzada no conviene mojar cogollos. Prevenir es mucho más barato que curar un brote de plaga u hongo.",how:"Foliar preventivo con luces apagadas. Tu línea Mamboretá para monitoreo/control; podés sumar Bacillus thuringiensis (Bt) si ves orugas y silicio (cola de caballo/ortiga) para fortalecer pared celular."},
      {icon:"🍄",title:"Mantené el suelo vivo, no lo dejes secar",why:"Una caída fuerte de humedad mata hongos benéficos y micorrizas justo cuando más raíz se necesita. La consistencia es clave.",how:"Riego parejo, mulch en su lugar, y si bajó la actividad microbiana, un té de compost suave la reactiva."},
    ],
    products:{
      tengo:["Zoil Monkey","Bioestimulante radicular","Bioestimulante foliar (aminoácidos)","Mamboretá (IPM)","Melaza"],
      proponer:["Bacillus thuringiensis (Bt) ante orugas","Silicio: cola de caballo / ortiga","Kelp/algas para transición a flora","Beauveria bassiana preventivo"],
    },
    tasks:[
      {title:"Defoliado de apertura (abrir luz y aire)",type:"poda",priority:"alta"},
      {title:"Aplicación Zoil + radicular",type:"nutricion",priority:"normal"},
      {title:"Foliar preventivo IPM (luces apagadas)",type:"fumigacion",priority:"normal"},
    ],
  },
  flora_media:{
    title:"Floración media (día 22–45) — engorde",
    tip:"Empiezan a cargar los cogollos: nutrición de suelo estable, buen aire en el dosel y monitoreo fino de plagas.",
    intro:"La planta deja de estirar y vuelca la energía a engordar flores. El suelo vivo brilla acá: si la biología está activa, libera nutrientes de forma sostenida sin picos. Nuestro trabajo es estabilidad, aire y vigilancia.",
    blocks:[
      {icon:"🌸",title:"Apoyo a la carga (P-K orgánico vía suelo)",why:"El engorde demanda fósforo y potasio, pero en living soil no los tiramos como sal: los hacemos disponibles con biología y enmiendas (harina de rocas, guano, kelp).",how:"Mantené el top-dress activo y, si tenés, sumá una fuente orgánica de K (cenizas tamizadas con cuidado, o kelp). Tu preparado de rocas aporta minerales de liberación lenta."},
      {icon:"💨",title:"Aire en el dosel = menos botrytis",why:"Los cogollos engordando crean microclimas húmedos donde prospera el moho gris (botrytis). El movimiento de aire y un defoliado puntual bajan ese riesgo.",how:"Asegurá circulación con ventiladores, sacá hojas que generan bolsones de humedad pegados a cogollos y vigilá la humedad relativa (apuntá a la baja respecto de veg)."},
      {icon:"🔬",title:"Monitoreo de plagas más fino",why:"Araña roja y trips explotan en calor y dosel denso. Detectarlos temprano permite control biológico; tarde, ya comprometen cogollos.",how:"Revisá envés de hojas y puntos de crecimiento 2 veces por semana. Si aparece algo, preferí controles biológicos (ácaros depredadores, Beauveria) antes que mojar flores."},
      {icon:"🫖",title:"Tés de suelo para sostener la biología",why:"En media flora la demanda es alta y la biología se cansa; un té de compost la repone y mejora disponibilidad de nutrientes sin sales.",how:"Té aireado con humus + pizca de melaza cada 10-14 días al sustrato. No exageres la melaza (alimenta también a lo que no querés)."},
    ],
    doses:[
      {item:"Sales de potasio (K)",cama:"50-100 g",m2:"25-50 g/m²",efecto:"Engorde de cogollo"},
      {item:"Sales de magnesio (Mg)",cama:"30-60 g",m2:"15-30 g/m²",efecto:"Verde sano, fotosíntesis"},
      {item:"Ácidos fúlvicos",cama:"según etiqueta",m2:"—",efecto:"Mejor absorción de minerales"},
      {item:"Té de compost (ACT)",cama:"1-2 L conc.",m2:"—",efecto:"Sostiene biología en demanda alta"},
    ],
    products:{
      tengo:["Preparado harina de rocas + alfalfa + consorcio","Bioestimulante radicular","Melaza","Micorrizas","Mamboretá"],
      proponer:["Kelp/algas para floración","Fuente orgánica de potasio","Ácaros depredadores (Phytoseiulus) si hay araña","Bacillus subtilis antifúngico"],
    },
    tasks:[
      {title:"Top-dress de engorde + revisar mulch",type:"nutricion",priority:"normal"},
      {title:"Defoliado puntual para aire en cogollos",type:"poda",priority:"normal"},
      {title:"Monitoreo de plagas (envés y dosel)",type:"revision",priority:"normal"},
    ],
  },
  flora_tardia:{
    title:"Floración tardía — maduración",
    tip:"Madurando: bajá intervenciones, cuidá humedad para evitar botrytis y preparate para el lavado.",
    intro:"La planta termina de madurar tricomas y resina. Acá menos es más: cortamos foliares, cuidamos el ambiente y dejamos que el suelo vivo haga su cierre. Empezá a planificar el lavado según tus días configurados.",
    blocks:[
      {icon:"🔍",title:"Leé tricomas, no el calendario",why:"El punto de cosecha lo definen los tricomas (lechosos vs ámbar), no solo los días. Cosechar por reloj puede dar un efecto distinto al buscado.",how:"Con lupa/microscopio, apuntá a mayoría lechosos con algo de ámbar según el efecto que quieras. Esto define cuándo arranca el lavado."},
      {icon:"💧",title:"Control de humedad estricto",why:"Cogollos densos + humedad alta = botrytis, que arruina cosecha en días. Es la etapa más sensible.",how:"Bajá humedad relativa, mantené aire y revisá los cogollos más gordos por dentro buscando moho. Sacá cualquier foco de inmediato."},
      {icon:"🚿",title:"Planificá el inicio del lavado",why:"En living soil el lavado es más suave que en sales: la idea es dejar de aportar y que la planta consuma reservas, limpiando el perfil para mejor sabor y combustión.",how:"Según tus días de lavado configurados, marcá la fecha. A partir de ahí, solo agua (o té muy suave) y dejá que el suelo se vacíe."},
      {icon:"🛑",title:"Cortá foliares y productos fuertes",why:"Mojar cogollos maduros invita hongos y deja residuos. La planta ya casi no absorbe foliar útil.",how:"Suspendé foliares. Si hay plaga, recurrí a controles que no mojen la flor (biológicos, trampas)."},
    ],
    products:{
      tengo:["Solo agua / té muy suave","Melaza (mínima, opcional)"],
      proponer:["Lupa 60x / microscopio de bolsillo para tricomas","Higrómetro por sala para control fino"],
    },
    tasks:[
      {title:"Revisar tricomas con lupa",type:"revision",priority:"alta"},
      {title:"Chequear humedad y focos de botrytis",type:"revision",priority:"alta"},
      {title:"Definir fecha de inicio de lavado",type:"lavado",priority:"normal"},
    ],
  },
  lavado:{
    title:"Lavado — limpieza del perfil",
    tip:"Solo agua: que la planta consuma reservas. Cuidá el ambiente y preparate para cosecha.",
    intro:"En suelo vivo el lavado es dejar de aportar y permitir que la biología y la planta terminen de procesar lo que queda. Mejora sabor y combustión. Es la antesala de la cosecha.",
    blocks:[
      {icon:"🚿",title:"Solo agua (o té muy diluido)",why:"Suspender aportes hace que la planta movilice reservas internas; las hojas viran y se vacía el perfil, lo que se nota en sabor y ceniza.",how:"Regá solo con agua durante tus días de lavado configurados. El suelo vivo no necesita flush agresivo: alcanza con dejar de alimentar."},
      {icon:"🍂",title:"Es normal que amarilleen hojas",why:"La planta canibaliza nitrógeno de las hojas viejas: el amarilleo de fin de ciclo es señal de buen lavado, no de carencia a corregir.",how:"No corrijas con nutrientes. Dejá que el proceso siga su curso."},
      {icon:"💧",title:"Ambiente seco y aireado hasta el final",why:"Cogollos en su punto + humedad = última oportunidad para botrytis. No bajes la guardia.",how:"Mantené humedad baja y aire. Revisión diaria de los cogollos más densos."},
      {icon:"🗓️",title:"Logística de cosecha",why:"Cosechar y secar bien define tanto como cultivar. Llegar preparado evita apuros que arruinan calidad.",how:"Tené listo el espacio de secado (oscuro, ~18-20°C, 55-60% HR, aire suave), tijeras y plan de manicurado. Cargá el rendimiento por genética al cerrar el ciclo."},
    ],
    products:{
      tengo:["Agua","Espacio de secado"],
      proponer:["Higrómetro/termómetro para el secadero","Mallas/colgadores para secado"],
    },
    tasks:[
      {title:"Riego solo con agua (lavado)",type:"riego",priority:"normal"},
      {title:"Preparar espacio de secado",type:"limpieza",priority:"normal"},
      {title:"Revisión diaria de botrytis",type:"revision",priority:"alta"},
    ],
  },
  cosecha:{
    title:"Cosecha — cortar, secar, curar",
    tip:"Cosechá en el punto de tricomas, secá lento y curado paciente. Cargá el rendimiento por genética.",
    intro:"El último 30% de la calidad se juega en secado y curado. Apurar esta etapa tira por la borda meses de trabajo. Y es el momento de registrar datos para mejorar el próximo ciclo.",
    blocks:[
      {icon:"✂️",title:"Cortar por genética",why:"Cada genética madura y rinde distinto; cosechar y pesar por separado te da el dato clave para decidir qué plantar y dónde.",how:"Cosechá y manicurá genética por genética. Pesá cada una: ese número va al cierre de ciclo y alimenta tus estadísticas (g/planta por genética y sala)."},
      {icon:"🌑",title:"Secado lento y oscuro",why:"Un secado rápido encierra clorofila y sabor a pasto; lento preserva terpenos y da combustión suave.",how:"Colgá en oscuridad, ~18-20°C y 55-60% HR, con aire suave (no directo a los cogollos). Apuntá a 7-14 días: el tallo debe quebrar, no doblarse."},
      {icon:"🫙",title:"Curado en frascos",why:"El curado termina de degradar azúcares y clorofila residual; es lo que separa flor buena de flor excelente.",how:"Frascos al 60-62% HR, abrí (burping) a diario la primera semana y luego espaciá. Mínimo 2-3 semanas; mejora notablemente a partir del mes."},
      {icon:"♻️",title:"Al cortar arranca el Reset Express",why:"En tu sistema de alta rotación no descansás el suelo: la misma cama vuelve a florar en pocos días. Si no la recargás ahora, el próximo ciclo arranca con el suelo agotado y el rendimiento cae. Por eso la cosecha y el reset son la misma maniobra.",how:"No descartes el sustrato ni arranques las raíces: dejalas in situ. Apenas cortás, pasá a la etapa Reset Express de esta guía (humus + compost, alfalfa, yeso, harina de roca, ACT y mulch) para tener la cama lista en ~5 días."},
    ],
    products:{
      tengo:["Humus / compost para recargar","Harina de alfalfa + yeso + harina de roca","Mulch","Melaza para ACT"],
      proponer:["Frascos + higrómetros para curado","Bokashi para acelerar el reset","Lombrices E. foetida en la cama"],
    },
    tasks:[
      {title:"Pesar cosecha por genética y cargar al cierre",type:"cosecha",priority:"alta"},
      {title:"Acondicionar secadero (18-20°C, 55-60% HR)",type:"limpieza",priority:"alta"},
      {title:"Arrancar Reset Express del suelo (no-till)",type:"nutricion",priority:"alta"},
    ],
  },
};

const STAGE_SHORT={reset:"Reset Express",veg:"Vegetativo",flora_temprana:"Flora temprana",flora_media:"Flora media",flora_tardia:"Flora tardía",lavado:"Lavado",cosecha:"Cosecha"};
const STAGE_ALL=["reset","veg","flora_temprana","flora_media","flora_tardia","lavado","cosecha"];
// Diagnóstico rápido (síntoma → causa probable → acción), adaptado a tu sistema de alta rotación.
const GUIDE_DIAG=[
  {sintoma:"Rendimiento que baja ciclo a ciclo",causa:"Suelo agotado por rotación rápida sin reset",accion:"Hacer el Reset Express completo entre ciclos (enmiendas + ACT)"},
  {sintoma:"Bichos bolita / cochinillas de humedad",causa:"Exceso de humedad y materia en descomposición en superficie",accion:"Bajar humedad, airear, mulch más seco, trampas; revisar riego"},
  {sintoma:"Hojas nuevas con puntas/bordes quemados",causa:"Falta de calcio (Ca), típico tras varias cosechas",accion:"Top-dress de yeso (Ca+S) u harina de ostra; sostener humedad pareja"},
  {sintoma:"Amarilleo entre nervaduras en hojas medias",causa:"Falta de magnesio (Mg)",accion:"Sumar sal de Mg suave; revisar pH del riego (~7)"},
  {sintoma:"Hojas verde muy oscuro, puntas dobladas (garra)",causa:"Exceso de nitrógeno",accion:"Suspender N, regar solo agua unos riegos, no top-dressear alfalfa"},
  {sintoma:"Moho gris en cogollos (botrytis)",causa:"Humedad alta + poco aire en dosel denso",accion:"Bajar HR, más circulación, defoliado puntual, sacar focos ya"},
  {sintoma:"Olor feo / suelo encharcado",causa:"Riego excesivo, microbiología anaeróbica",accion:"Espaciar riegos, mejorar drenaje/aireación, aplicar ACT"},
  {sintoma:"Crecimiento lento tras el trasplante",causa:"Raíz sin colonizar / biología baja",accion:"Reforzar micorrizas + radicular, ACT suave, humedad pareja"},
];

// Íconos de línea para los bloques de la guía (los datos de GUIDE traen emojis).
const GUIDE_ICON={"♻️":"recycle","✂️":"scissors","🌑":"moon","🌱":"vege","🌸":"flower","🌾":"harvest","🌿":"leaf","🍂":"leaf","🍄":"mushroom","🎯":"target","💧":"drop","💨":"wind","🔍":"search","🔬":"bug","🗓️":"calendar","🚿":"water","🛑":"stop","🛡️":"shield","🧹":"broom","🪨":"rock","🫖":"flask","🫙":"jar"};
const TASK_ICON={riego:"water",nutricion:"flask",fumigacion:"spray",poda:"scissors",limpieza:"broom",revision:"search",cosecha:"harvest",lavado:"water"};

// GUÍA PAGE — la etapa se detecta sola por sala; lo que hay que hacer, a la vista; lo demás, plegado.
function GuiaPage({user,roomConfig,rooms}){
  const [cycles,setCycles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selRoom,setSelRoom]=useState(rooms[0]||"S1");
  const [manualStage,setManualStage]=useState(null);
  const [toast,setToast]=useState(null);
  const [adding,setAdding]=useState(null);
  const [genResetSaving,setGenResetSaving]=useState(false);
  useEffect(()=>{db.query("cycles","active=eq.true").then(setCycles).catch(()=>setCycles([])).finally(()=>setLoading(false));},[]);
  if(loading)return <Spin/>;

  const cyc=cycles.find(c=>c.room_id===selRoom);
  const rc=getRC(roomConfig,selRoom);
  const autoStage=stageKey(cyc,rc);
  const stage=manualStage||autoStage||"reset";
  const g=GUIDE[stage];
  const dia=cyc&&cyc.flower_start&&cyc.phase==="floración"?daysSince(cyc.flower_start):null;
  const isAuto=!manualStage||manualStage===autoStage;

  const addTask=async(st)=>{
    setAdding(st.title);
    try{
      const payload={title:st.title,room_id:selRoom,rooms:selRoom,type:st.type,assignee:user.name,due_date:todayISO,priority:st.priority||"normal",status:"pendiente",source:"guia",instructions:`Sugerencia de la Guía · etapa: ${STAGE_SHORT[stage]}`,created_by:`guía (${user.name})`};
      await db.insert("tasks",payload);
      await logA(user.name,`Agregó tarea de guía: ${st.title} (${selRoom})`,"task");
      setToast({msg:"Agregada a Tareas de hoy ✓",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setAdding(null);}
  };
  const genReset=async()=>{
    setGenResetSaving(true);
    try{
      const n=await generateResetTasks(selRoom,todayISO,user.name,`guía (${user.name})`);
      await db.updateWhere("room_config","room_id",selRoom,{last_reset_at:new Date().toISOString()});
      setToast({msg:n>0?`Cronograma generado: ${n} tareas (día 1 a 5) ✓`:"El cronograma ya estaba creado",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setGenResetSaving(false);}
  };
  const tag=(t,col)=><div style={{fontSize:12,fontWeight:800,color:col,margin:"10px 0 3px"}}>{t}</div>;
  const pillS=(on)=>({padding:"8px 13px",borderRadius:99,fontSize:13.5,fontWeight:800,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",background:on?C.teal:C.surface,color:on?C.onAccent:C.textMid,border:`1px solid ${on?C.teal:C.border}`});

  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <PageTitle sub="Suelo vivo de alta rotación. La etapa se detecta sola por sala.">Guía</PageTitle>

    {/* Sala */}
    <div role="tablist" style={{display:"flex",background:C.surfaceAlt,borderRadius:16,padding:4,border:`1px solid ${C.border}`}}>
      {rooms.map(r=>{const on=r===selRoom;return <button key={r} role="tab" aria-selected={on} onClick={()=>{setSelRoom(r);setManualStage(null);}} style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",background:on?C.surface:"transparent",color:on?C.text:C.textSoft,boxShadow:on?C.shadow:"none"}}>
        <span style={{display:"block",fontSize:15,fontWeight:800}}>{getRC(roomConfig,r).display_name}</span>
        <span style={{display:"block",fontSize:12,fontWeight:700,opacity:0.8}}>{(()=>{const sk=stageKey(cycles.find(x=>x.room_id===r),getRC(roomConfig,r));return sk?STAGE_SHORT[sk]:"Sin ciclo";})()}</span>
      </button>;})}
    </div>

    {/* Etapa */}
    <Card style={{padding:"16px 16px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <span style={{fontSize:12.5,fontWeight:800,padding:"4px 11px",borderRadius:99,background:C.tealLight,color:C.teal}}>{isAuto?"Etapa actual":"Viendo otra etapa"}{isAuto&&dia!=null?` · día ${dia} de flora`:""}</span>
        {!isAuto&&autoStage&&<button onClick={()=>setManualStage(null)} style={{fontSize:13,fontWeight:800,color:C.teal,background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"4px 0"}}>Volver a la actual</button>}
      </div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,margin:"10px 0 6px",lineHeight:1.25}}>{g.title}</div>
      <div style={{fontSize:14.5,color:C.textMid,lineHeight:1.55}}>{g.tip}</div>
      <div className="gm-rail" style={{display:"flex",gap:6,overflowX:"auto",marginTop:12,scrollbarWidth:"none",paddingBottom:2}}>
        {STAGE_ALL.map(sk=><button key={sk} onClick={()=>setManualStage(sk)} style={pillS(stage===sk)}>{STAGE_SHORT[sk]}</button>)}
      </div>
    </Card>

    {/* Qué hacer: tareas sugeridas a la vista */}
    <Card style={{padding:"14px 14px 8px"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,padding:"0 2px 6px"}}>
        <div style={{fontSize:16,fontWeight:800,color:C.text}}>Qué hacer en {rc.display_name}</div>
        <span style={{fontSize:12.5,color:C.textSoft,fontWeight:600}}>Se suman a hoy</span>
      </div>
      {stage==="reset"&&<Btn onClick={genReset} disabled={genResetSaving} full style={{margin:"4px 0 8px",background:C.teal,minHeight:46}}>{genResetSaving?"Generando...":"Generar cronograma del Reset (día 1 a 5)"}</Btn>}
      {g.tasks.map((st,i)=>{const tm=TM[st.type]||TM.revision;return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 2px",borderTop:`1px solid ${C.border}`}}>
        <span style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:C.tealLight,color:C.teal}}><Icon n={TASK_ICON[st.type]||"tareas"} size={19}/></span>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:"block",fontSize:14.5,fontWeight:700,color:C.text}}>{st.title}</span>
          <span style={{display:"block",fontSize:12.5,color:st.priority==="alta"?C.amber:C.textSoft,fontWeight:700}}>{tm.label}{st.priority==="alta"?" · prioridad alta":""}</span>
        </span>
        <button onClick={()=>addTask(st)} disabled={adding===st.title} aria-label={`Agregar ${st.title}`} style={{width:40,height:40,borderRadius:12,border:"none",cursor:"pointer",background:C.teal,color:C.onAccent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:adding===st.title?0.5:1}}><Icon n="plus" size={20}/></button>
      </div>;})}
    </Card>

    {/* Cómo y por qué: cada bloque plegado */}
    <div style={{fontSize:14,fontWeight:800,color:C.textSoft,margin:"8px 4px 0"}}>Cómo y por qué</div>
    {g.blocks.map((b,i)=><Fold key={`${stage}-${i}`} icon={GUIDE_ICON[b.icon]||"leaf"} title={b.title}>
      {tag("Por qué",C.teal)}
      <div style={{fontSize:14.5,color:C.textMid,lineHeight:1.6}}>{b.why}</div>
      {tag("Cómo",C.green)}
      <div style={{fontSize:14.5,color:C.text,lineHeight:1.6}}>{b.how}</div>
    </Fold>)}

    <div style={{height:2}}/>
    <Fold key={`intro-${stage}`} icon="book" title="Sobre esta etapa">
      <div style={{fontSize:14.5,color:C.textMid,lineHeight:1.6}}>{g.intro}</div>
    </Fold>
    {g.doses&&<Fold key={`dosis-${stage}`} icon="flask" title="Dosis orientativas" count={g.doses.length}>
      {g.doses.map((d,i)=><div key={i} style={{padding:"9px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:14,fontWeight:800,color:C.text}}>{d.item}</span>
          <span style={{fontSize:14,fontWeight:800,color:C.text,textAlign:"right",whiteSpace:"nowrap"}}>{d.cama}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12.5,color:C.textSoft,fontWeight:600,marginTop:2}}>
          <span>{d.efecto}</span><span style={{whiteSpace:"nowrap"}}>{d.m2!=="—"?d.m2:""}</span>
        </div>
      </div>)}
      <div style={{fontSize:12,color:C.textSoft,marginTop:8,lineHeight:1.5}}>Por cama de ~800 L (2 × 1 × 0,4 m){rc.area_m2?` · ${rc.display_name}: ${rc.area_m2} m²${rc.volume_l?`, ${rc.volume_l} L`:""}`:""}. Ajustá según cómo responde el suelo.</div>
    </Fold>}
    <Fold key={`ins-${stage}`} icon="leaf" title="Insumos">
      <div style={{fontSize:12.5,fontWeight:800,color:C.green,margin:"2px 0 8px"}}>Lo que ya usás</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}>
        {g.products.tengo.map((p,i)=><span key={i} style={{background:C.greenLight,color:C.green,borderRadius:99,padding:"5px 12px",fontSize:13,fontWeight:700}}>{p}</span>)}
      </div>
      <div style={{fontSize:12.5,fontWeight:800,color:C.purple,marginBottom:8}}>Para sumar o evaluar</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {g.products.proponer.map((p,i)=><span key={i} style={{background:C.purpleLight,color:C.purple,borderRadius:99,padding:"5px 12px",fontSize:13,fontWeight:700}}>{p}</span>)}
      </div>
    </Fold>
    <Fold icon="search" title="Diagnóstico rápido" count={GUIDE_DIAG.length}>
      {GUIDE_DIAG.map((d,i)=><div key={i} style={{padding:"10px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
        <div style={{fontSize:14.5,fontWeight:800,color:C.text,marginBottom:3}}>{d.sintoma}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.5}}><b style={{color:C.amber}}>Causa:</b> {d.causa}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.5}}><b style={{color:C.green}}>Qué hacer:</b> {d.accion}</div>
      </div>)}
    </Fold>

    <div style={{fontSize:12,color:C.textSoft,textAlign:"center",lineHeight:1.5,padding:"4px 8px"}}>Guía orientativa. No reemplaza tu criterio ni la observación de las plantas.</div>
  </div>;
}


// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — salas, esquejeras y usuarios. Cada fila abre su hoja.
// ══════════════════════════════════════════════════════════════════════════════
function SalaCfgSheet({roomId,rc,exists,user,onClose,onSaved,onTargets}){
  const [name,setName]=useState(rc.display_name||roomId);
  const [irr,setIrr]=useState(rc.irrigation_type||"manual");
  const [fd,setFd]=useState(rc.flower_days??65);
  const [fl,setFl]=useState(rc.flush_days??20);
  const [vd,setVd]=useState(rc.veg_days??6);
  const [area,setArea]=useState(rc.area_m2??"");
  const [vol,setVol]=useState(rc.volume_l??"");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const num=v=>v===""||v==null?null:+v;
  const save=async()=>{
    if(!name.trim()){setErr("Poné un nombre.");return;}
    setSaving(true);setErr(null);
    const data={display_name:name.trim(),irrigation_type:irr,flower_days:num(fd)||65,flush_days:num(fl)??20,veg_days:num(vd)??6,area_m2:num(area),volume_l:num(vol)};
    try{
      if(exists)await db.updateWhere("room_config","room_id",roomId,data);
      else await db.insert("room_config",{room_id:roomId,...data});
      await logA(user.name,`Configuró la sala ${roomId}`,"config");
      onSaved(`${data.display_name} guardada ✓`);
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title={rc.display_name||roomId} sub="Estos datos arman el recorrido del ciclo y las fechas" onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{marginTop:4}}><FI label="Nombre" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Sala 1"/></div>
    <FLabel style={{marginTop:0}}>Riego</FLabel>
    <Pills options={[["automático","Automático"],["manual","Manual"]]} value={irr} onChange={setIrr}/>
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <div style={{flex:1}}><NumField label="Días de flora" value={fd} onCommit={setFd} min={30} max={120}/></div>
      <div style={{flex:1}}><NumField label="Días de lavado" value={fl} onCommit={setFl} min={0} max={40}/></div>
    </div>
    <div style={{display:"flex",gap:10}}>
      <div style={{flex:1}}><NumField label="Días de vege" value={vd} onCommit={setVd} min={0} max={90}/></div>
      <div style={{flex:1}}><NumField label="Superficie (m²)" value={area} onCommit={setArea} min={0} max={500} placeholder="Ej: 8"/></div>
    </div>
    <div style={{width:"50%",paddingRight:5}}><NumField label="Sustrato (litros)" value={vol} onCommit={setVol} min={0} max={50000} placeholder="Ej: 4800"/></div>
    <SheetActions onSave={save} onCancel={onClose} saving={saving}/>
    <div style={{marginTop:10,borderTop:`1px solid ${C.border}`}}><SheetRow icon="thermo" label="Objetivos de clima" onClick={onTargets}/></div>
  </Sheet>;
}

function EsqCfgSheet({cloner,cloners,used,user,onClose,onSaved}){
  const cols0=cloner.cols||CLONER_COLS;
  const [name,setName]=useState(cloner.label||"");
  const [rows,setRows]=useState(clonerRows(cloner.capacity,cols0));
  const [cols,setCols]=useState(cols0);
  const [confirmDel,setConfirmDel]=useState(false);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const vacia=used===0;
  const r=Math.max(1,Math.min(20,+rows||1)), c=Math.max(1,Math.min(10,+cols||1));
  const save=async()=>{
    const nm=name.trim();
    if(!nm){setErr("Poné un nombre.");return;}
    if(cloners.some(x=>sid(x.id)!==sid(cloner.id)&&String(x.label||"").toLowerCase()===nm.toLowerCase())){setErr("Ya hay otra esquejera con ese nombre.");return;}
    setSaving(true);setErr(null);
    try{
      const data={label:nm};
      if(vacia){data.capacity=r*c;data.cols=c;}
      await db.update("cloners",cloner.id,data);
      await logA(user.name,`Editó esquejera: ${cloner.label}${nm!==cloner.label?` → ${nm}`:""}`,"esquejera");
      onSaved(`${nm} guardada ✓`);
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const borrar=async()=>{
    if(!confirmDel){setConfirmDel(true);return;}
    setSaving(true);
    try{await db.delete("cloners",cloner.id);await logA(user.name,`Eliminó esquejera: ${cloner.label}`,"esquejera");onSaved(`${cloner.label} eliminada`);}
    catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title={cloner.label} sub={vacia?"Vacía":`${used} esqueje${used===1?"":"s"} cargados`} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{marginTop:4}}><FI label="Nombre" value={name} onChange={e=>setName(e.target.value)}/></div>
    {vacia?<>
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <div style={{flex:1}}><NumField label="Filas" value={rows} onCommit={v=>setRows(v===""?1:+v)} min={1} max={20}/></div>
        <div style={{fontSize:20,fontWeight:800,color:C.textSoft,paddingBottom:22}}>×</div>
        <div style={{flex:1}}><NumField label="Columnas" value={cols} onCommit={v=>setCols(v===""?1:+v)} min={1} max={10}/></div>
      </div>
      <div style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,overflowX:"auto"}}>
        <ClonerGrid capacity={r*c} cols={c} colorAt={()=>null} cell={16}/>
        <div style={{fontSize:13,fontWeight:800,color:C.text}}>{r} × {c} = {r*c} lugares</div>
      </div>
    </>:<div style={{fontSize:13,color:C.textSoft,fontWeight:600,lineHeight:1.45}}>Medida {clonerRows(cloner.capacity,cols0)} × {cols0}. Para cambiarla o borrarla, primero cosechá o vaciá la bandeja.</div>}
    <SheetActions onSave={save} onCancel={onClose} saving={saving}/>
    {vacia&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`}}><SheetRow icon="trash" label={confirmDel?"Tocá de nuevo para eliminar":"Eliminar esquejera"} danger onClick={borrar}/></div>}
  </Sheet>;
}

function UserCfgSheet({u,users,me,onClose,onSaved}){
  const isNew=!u?.id;
  const [name,setName]=useState(u?.name||"");
  const [initial,setInitial]=useState(u?.initial||"");
  const [area,setArea]=useState(u?.area||"");
  const [role,setRole]=useState(u?.role||"usuario");
  const [confirmDel,setConfirmDel]=useState(false);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const soyYo=!isNew&&sid(u.id)===sid(me.id);
  const save=async()=>{
    const nm=name.trim();
    if(!nm){setErr("Poné un nombre.");return;}
    if(users.some(x=>sid(x.id)!==sid(u?.id)&&String(x.name||"").toLowerCase()===nm.toLowerCase())){setErr("Ya hay otro usuario con ese nombre.");return;}
    setSaving(true);setErr(null);
    const data={name:nm,initial:(initial.trim()||nm[0]).toUpperCase().slice(0,2),area:area.trim()||null,role:soyYo?u.role:role};
    try{
      if(isNew){await db.insert("users",data);await logA(me.name,`Agregó usuario: ${nm}`,"config");onSaved(`${nm} agregado ✓`);return;}
      await db.update("users",u.id,data);
      // Si cambia el nombre (ej: el rotativo), las tareas pendientes a su nombre pasan al nombre nuevo.
      let n=0;
      if(nm!==u.name){
        const pend=await db.query("tasks",`assignee=eq.${encodeURIComponent(u.name)}&status=eq.pendiente`).catch(()=>[]);
        for(const t of pend){try{await db.update("tasks",t.id,{assignee:nm});n++;}catch{/* sigue con las demás */}}
      }
      await logA(me.name,`Editó usuario: ${u.name}${nm!==u.name?` → ${nm}`:""}`,"config");
      onSaved(n?`${nm} guardado. ${n} tarea${n===1?"":"s"} pendiente${n===1?"":"s"} pasaron a su nombre ✓`:`${nm} guardado ✓`);
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  const borrar=async()=>{
    if(!confirmDel){setConfirmDel(true);return;}
    setSaving(true);
    try{await db.delete("users",u.id);await logA(me.name,`Eliminó usuario: ${u.name}`,"config");onSaved(`${u.name} eliminado`);}
    catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Sheet title={isNew?"Nuevo usuario":u.name} sub={isNew?null:(u.role==="admin"?"Administrador":"Usuario")} onClose={onClose}>
    <ErrBox err={err}/>
    <div style={{display:"flex",gap:10,marginTop:4}}>
      <div style={{flex:1}}><FI label="Nombre" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Juan"/></div>
      <div style={{width:92}}><FI label="Inicial" value={initial} onChange={e=>setInitial(e.target.value.slice(0,2))} placeholder={(name.trim()[0]||"J").toUpperCase()}/></div>
    </div>
    <FI label="Área o tarea (opcional)" value={area} onChange={e=>setArea(e.target.value)} placeholder="Ej: Riego y limpieza"/>
    <FLabel style={{marginTop:0}}>Rol</FLabel>
    {soyYo?<div style={{fontSize:13,color:C.textSoft,fontWeight:600}}>No podés cambiar tu propio rol.</div>
      :<Pills options={[["usuario","Usuario"],["admin","Administrador"]]} value={role} onChange={setRole}/>}
    <SheetActions onSave={save} onCancel={onClose} saving={saving} label={isNew?"Agregar":"Guardar"}/>
    {!isNew&&!soyYo&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`}}><SheetRow icon="trash" label={confirmDel?"Tocá de nuevo para eliminar":"Eliminar usuario"} danger onClick={borrar}/></div>}
  </Sheet>;
}

function ConfigPage({user,roomConfig,onChanged,onTargetsChanged}){
  const isAdmin=user?.role==="admin";
  const [cloners,setCloners]=useState([]);
  const [slots,setSlots]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [salaSel,setSalaSel]=useState(null);
  const [targetsRoom,setTargetsRoom]=useState(null);
  const [esqSel,setEsqSel]=useState(null);
  const [newEsq,setNewEsq]=useState(false);
  const [userSel,setUserSel]=useState(null);
  const load=useCallback(async()=>{
    try{
      const [c,s,u]=await Promise.all([db.get("cloners").catch(()=>[]),db.query("cloner_slots","select=cloner_id").catch(()=>[]),db.get("users").catch(()=>[])]);
      setCloners([...c].sort((a,b)=>String(a.label||"").localeCompare(String(b.label||""),"es",{numeric:true})));setSlots(s);
      setUsers([...u].sort((a,b)=>(a.role==="admin"?0:1)-(b.role==="admin"?0:1)||String(a.name).localeCompare(String(b.name))));
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  if(!isAdmin)return <PageStub title="Configuración" sub="Solo administradores" icon="sliders" texto="La configuración la manejan Lucas y Alex."/>;
  if(loading)return <Spin/>;
  const done=m=>{setSalaSel(null);setEsqSel(null);setNewEsq(false);setUserSel(null);load();onChanged&&onChanged();setToast({msg:m,type:"success"});};
  const usedOf=cl=>slots.filter(s=>sid(s.cloner_id)===sid(cl.id)).length;
  const gTitle=(t,right)=><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"14px 4px 8px"}}><div style={{fontSize:14,fontWeight:800,color:C.textSoft}}>{t}</div>{right}</div>;
  const addBtn=(onClick,l)=><button onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,background:C.greenLight,color:C.green,border:"none",borderRadius:12,padding:"7px 12px",fontWeight:800,fontSize:13.5,cursor:"pointer",fontFamily:"inherit"}}><Icon n="plus" size={16}/>{l}</button>;
  const row=(key,icon,col,title,sub,onClick,i,right)=><button key={key} onClick={onClick} style={{display:"flex",alignItems:"center",gap:13,padding:"12px 14px",minHeight:62,width:"100%",background:"transparent",border:"none",borderTop:i?`1px solid ${C.border}`:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit",color:C.text}}>
    <span style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:col,background:`${col}1F`,fontWeight:800,fontSize:16}}>{icon}</span>
    <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:15.5,fontWeight:700}}>{title}</span><span style={{display:"block",fontSize:12.5,color:C.textSoft,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub}</span></span>
    {right}
    <span style={{color:C.textSoft}}><Icon n="chev" size={18}/></span>
  </button>;
  const salaRC=salaSel?getRC(roomConfig,salaSel):null;
  const tgRC=targetsRoom?getRC(roomConfig,targetsRoom):null;

  return <div style={{display:"flex",flexDirection:"column",paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {salaSel&&<SalaCfgSheet roomId={salaSel} rc={salaRC} exists={(roomConfig||[]).some(r=>r.room_id===salaSel)} user={user} onClose={()=>setSalaSel(null)} onSaved={done} onTargets={()=>{const r=salaSel;setSalaSel(null);setTargetsRoom(r);}}/>}
    {targetsRoom&&<TargetsModal roomId={targetsRoom} rc={tgRC} cycle={null} user={user} onClose={()=>setTargetsRoom(null)} onSaved={()=>{setTargetsRoom(null);onTargetsChanged&&onTargetsChanged();setToast({msg:"Objetivos de clima guardados ✓",type:"success"});}}/>}
    {esqSel&&<EsqCfgSheet cloner={esqSel} cloners={cloners} used={usedOf(esqSel)} user={user} onClose={()=>setEsqSel(null)} onSaved={done}/>}
    {newEsq&&<NuevaEsquejeraSheet cloners={cloners} user={user} onClose={()=>setNewEsq(false)} onSaved={done}/>}
    {userSel&&<UserCfgSheet u={userSel} users={users} me={user} onClose={()=>setUserSel(null)} onSaved={done}/>}

    <PageTitle sub="Salas, esquejeras y usuarios">Configuración</PageTitle>

    {gTitle("Salas")}
    <Card style={{padding:0,overflow:"hidden"}}>
      {["S1","S2"].map((r,i)=>{const rc=getRC(roomConfig,r);
        return row(r,<Icon n="salas" size={20}/>,C.amber,rc.display_name,`${rc.flower_days} días de flora · riego ${rc.irrigation_type}${rc.area_m2?` · ${rc.area_m2} m²`:""}`,()=>setSalaSel(r),i);})}
      {row("veg-clima",<Icon n="thermo" size={20}/>,C.green,"Clima de Vege","Objetivos de temperatura y humedad",()=>setTargetsRoom("Vegetativo"),1)}
    </Card>

    {gTitle("Esquejeras",addBtn(()=>setNewEsq(true),"Agregar"))}
    <Card style={{padding:0,overflow:"hidden"}}>
      {cloners.length===0&&<div style={{padding:"16px 14px",fontSize:13.5,color:C.textSoft}}>Sin esquejeras. Tocá “Agregar”.</div>}
      {cloners.map((cl,i)=>{const n=usedOf(cl);const cols=cl.cols||CLONER_COLS;
        return row(cl.id,<Icon n="scissors" size={20}/>,C.green,cl.label,`${clonerRows(cl.capacity,cols)} × ${cols} · ${n?`${n} esqueje${n===1?"":"s"}`:"vacía"}`,()=>setEsqSel(cl),i);})}
    </Card>

    {gTitle("Usuarios",addBtn(()=>setUserSel({}),"Agregar"))}
    <Card style={{padding:0,overflow:"hidden"}}>
      {users.map((u,i)=>row(u.id,u.initial||u.name?.[0]||"?",u.role==="admin"?C.green:C.blue,u.name,`${u.role==="admin"?"Administrador":"Usuario"}${u.area?` · ${u.area}`:""}`,()=>setUserSel(u),i,
        sid(u.id)===sid(user.id)?<span style={{fontSize:11.5,fontWeight:800,padding:"3px 9px",borderRadius:99,background:C.greenLight,color:C.green}}>Vos</span>:null))}
    </Card>
  </div>;
}

// ── PANTALLAS EN RECONSTRUCCIÓN ──────────────────────────────────────────────
// Compras salió del menú: queda como aviso por si alguien entra desde un enlace viejo.
function PageStub({title,sub,icon,texto}){
  return <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:32}}>
    <PageTitle sub={sub}>{title}</PageTitle>
    <Card style={{textAlign:"center",padding:"26px 18px"}}>
      <div style={{display:"flex",justifyContent:"center",color:C.textSoft}}><Icon n={icon} size={30}/></div>
      <div style={{fontSize:14,color:C.textMid,lineHeight:1.55,marginTop:10}}>{texto}</div>
    </Card>
  </div>;
}
function ComprasPage(){
  return <PageStub title="Compras" sub="Fuera de uso" icon="cart"
    texto="La lista de compras quedó sin uso y salió del menú. Si la querés de vuelta, se rehace en el formato nuevo."/>;
}

// APP
export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPageState]=useState("dashboard");
  // Cada cambio de pantalla queda en el historial del navegador: así el gesto o botón
  // "atrás" del celu vuelve a la pantalla anterior en vez de salir de la app.
  const navFromPop=useRef(false);
  const navDepth=useRef(0);
  const setPage=useCallback(p=>setPageState(p),[]);
  const [genetics,setGenetics]=useState([]);
  const [roomConfig,setRoomConfig]=useState([]);
  const [targets,setTargets]=useState([]);
  const [textScale,setTextScaleState]=useState(1);
  const [theme,setThemeState]=useState(()=>{try{return localStorage.getItem("gm_theme")==="light"?"light":"dark";}catch{return "dark";}});
  applyTheme(theme);   // idempotente: deja `C` con la paleta vigente antes de renderizar el árbol
  const loadConfig=useCallback(()=>{db.get("room_config").then(setRoomConfig).catch(()=>setRoomConfig([]));},[]);
  const loadTargets=useCallback(()=>{db.query("climate_targets","select=*").then(setTargets).catch(()=>setTargets([]));},[]);
  const wide=useIsWide(820);
  useEffect(()=>{
    const onPop=e=>{const p=e.state&&e.state.gm;if(!p)return;navFromPop.current=true;navDepth.current=Math.max(0,navDepth.current-1);setPageState(p);};
    window.addEventListener("popstate",onPop);
    return ()=>window.removeEventListener("popstate",onPop);
  },[]);
  useEffect(()=>{
    if(!user)return;
    try{
      if(navFromPop.current){navFromPop.current=false;return;}
      const cur=window.history.state&&window.history.state.gm;
      if(!cur){window.history.replaceState({gm:page},"");return;}
      if(cur!==page){window.history.pushState({gm:page},"");navDepth.current++;}
    }catch{/* navegador sin historial: se sigue usando la flecha */}
  },[page,user]);
  const goBack=useCallback(fallback=>{if(navDepth.current>0)window.history.back();else setPageState(fallback);},[]);
  // Preferencia de tamaño de texto (por dispositivo)
  useEffect(()=>{try{const v=parseFloat(localStorage.getItem("gm_textscale"));if(v>=1&&v<=1.3)setTextScaleState(v);}catch{}},[]);
  const setTextScale=(v)=>{setTextScaleState(v);try{localStorage.setItem("gm_textscale",String(v));}catch{}};
  const setTheme=(t)=>{applyTheme(t);try{localStorage.setItem("gm_theme",t);}catch{}setThemeState(t);};
  useEffect(()=>{if(user){db.get("genetics").then(ensureGenColors).then(setGenetics).catch(()=>{});loadConfig();loadTargets();logA(user.name,"Inició sesión","auth");}},[user,loadConfig,loadTargets]);
  if(!user)return <LoginScreen onLogin={u=>{setUser(u);setPage(u.role==="admin"?"dashboard":"mi_turno");}}/>;
  const rooms=["S1","S2"];
  const isAdmin=user.role==="admin";
  const logout=()=>{setUser(null);setPage("dashboard");};
  const render=()=>{
    switch(page){
      case "mi_turno":     return <MiTurno user={user} setPage={setPage} roomConfig={roomConfig} rooms={rooms} targets={targets}/>;
      case "vegetativo":   return <VegetativoPage genetics={genetics} user={user} targets={targets} onTargetsChanged={loadTargets} setPage={setPage}/>;
      case "veg_madres":   return <MadresPage genetics={genetics} user={user}/>;
      case "veg_esquejeras":return <EsquejerasPage genetics={genetics} user={user}/>;
      case "veg_vg":       return <VGPage genetics={genetics} user={user} roomConfig={roomConfig}/>;
      case "tareas":       return isAdmin?<TareasPageV2 user={user} rooms={rooms}/>:<TareasPage user={user} rooms={rooms}/>;
      case "geneticas":    return <GeneticasPage genetics={genetics} setGenetics={setGenetics} user={user}/>;
      case "fenos":        return <FenosPage user={user} genetics={genetics}/>;
      case "estadisticas": return <EstadisticasPage rooms={rooms} roomConfig={roomConfig} targets={targets}/>;
      case "historial": return <HistorialPage roomConfig={roomConfig} user={user} genetics={genetics} rooms={rooms}/>;
      case "plagas":       return <PlagasPage user={user} rooms={rooms}/>;
      case "calendario":   return <CalendarioPage user={user} roomConfig={roomConfig}/>;
      case "compras":      return <ComprasPage user={user}/>;
      case "guia":         return <GuiaPage user={user} roomConfig={roomConfig} rooms={rooms}/>;
      case "bot":          return <BotPage user={user}/>;
      case "bitacora":     return <BitacoraPage user={user}/>;
      case "configuracion":return <ConfigPage user={user} roomConfig={roomConfig} onChanged={loadConfig} onTargetsChanged={loadTargets}/>;
      case "__more__":     return isAdmin?<MorePageAdmin user={user} setPage={setPage} textScale={textScale} setTextScale={setTextScale} theme={theme} setTheme={setTheme} onLogout={logout}/>:<MorePage user={user} setPage={setPage} textScale={textScale} setTextScale={setTextScale} theme={theme} setTheme={setTheme}/>;
      case "salas":        return <SalasTab rooms={rooms} setPage={setPage} user={user} genetics={genetics} roomConfig={roomConfig} targets={targets} onTargetsChanged={loadTargets}/>;
      default:
        if(page.startsWith("sala_")&&isAdmin)return <SalasTab roomId={page.slice(5)} rooms={rooms} setPage={setPage} user={user} genetics={genetics} roomConfig={roomConfig} targets={targets} onTargetsChanged={loadTargets}/>;
        if(page.startsWith("sala_")){const rid=page.slice(5);return <SalaPage roomId={rid} setPage={setPage} user={user} genetics={genetics} rc={getRC(roomConfig,rid)} targets={targets} onTargetsChanged={loadTargets}/>;}
        return user.role==="admin"?<Dashboard setPage={setPage} user={user} roomConfig={roomConfig} rooms={rooms} wide={wide} targets={targets}/>:<MiTurno user={user} setPage={setPage} roomConfig={roomConfig} rooms={rooms} targets={targets}/>;
    }
  };
  const globalCSS=`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{-webkit-font-smoothing:antialiased;}.gm-rail::-webkit-scrollbar{display:none}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:3px;}input,select,button,textarea{font-family:inherit;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.page{animation:fadeUp 0.2s ease;}@keyframes gmDraw{to{stroke-dashoffset:0}}.gm-draw{stroke-dasharray:24;stroke-dashoffset:24;animation:gmDraw .2s ease-out forwards}@keyframes gmFlashA{from{background:${C.greenLight}}to{background:transparent}}@keyframes gmFlashB{from{background:${C.greenLight}}to{background:transparent}}@media (prefers-reduced-motion:reduce){.gm-draw{animation:none;stroke-dashoffset:0}}`;
  // zoom escala toda la app de forma proporcional (los anchos son fluidos, no genera scroll horizontal)
  const zoomStyle=textScale!==1?{zoom:textScale}:{};

  if(wide){
    return <div key={theme} style={{minHeight:"100vh",background:C.bg,fontFamily:H,color:C.text,display:"flex",...zoomStyle}}>
      <style>{globalCSS}</style>
      {isAdmin?<AdminNav page={page} setPage={setPage} wide/>:<NavBar user={user} page={page} setPage={setPage} wide/>}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {isAdmin?<AdminTopBar page={page} onBack={goBack}/>:<TopBar user={user} page={page} setPage={setPage} onLogout={logout} wide/>}
        <div className="page" style={{padding:isAdmin?"18px 32px 32px":"6px 28px 28px",maxWidth:1080,width:"100%",margin:"0 auto"}}>{render()}</div>
      </div>
      {!isAdmin&&page!=="bot"&&<FloatingBot user={user} currentPage={page} wide/>}
    </div>;
  }
  return <div key={theme} style={{minHeight:"100vh",background:C.bg,fontFamily:H,color:C.text,maxWidth:480,margin:"0 auto",...zoomStyle}}>
    <style>{globalCSS}</style>
    {isAdmin?<AdminTopBar page={page} onBack={goBack}/>:<TopBar user={user} page={page} setPage={setPage} onLogout={logout}/>}
    <div className="page" style={{padding:isAdmin?"14px 16px 104px":"16px 16px 88px"}}>{render()}</div>
    {!isAdmin&&page!=="bot"&&<FloatingBot user={user} currentPage={page} wide={false}/>}
    {isAdmin?<AdminNav page={page} setPage={setPage}/>:<NavBar user={user} page={page} setPage={setPage}/>}
  </div>;
}
