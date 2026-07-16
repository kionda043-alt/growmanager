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
const C = {
  bg:"#0E130D", surface:"#161D14", surfaceAlt:"#1D261A",
  border:"rgba(150,180,140,0.12)", borderStrong:"rgba(150,180,140,0.24)",
  text:"#E9F0E6", textMid:"#B7C4B0", textSoft:"#93A48C",
  green:"#6FCB86", greenLight:"rgba(111,203,134,0.14)",
  amber:"#E7B24A", amberLight:"rgba(231,178,74,0.14)",
  red:"#EA6A4E", redLight:"rgba(234,106,78,0.14)",
  blue:"#57B7CE", blueLight:"rgba(87,183,206,0.14)",
  purple:"#A38BEF", purpleLight:"rgba(163,139,239,0.14)",
  teal:"#57C9B0", tealLight:"rgba(87,201,176,0.14)",
  shadow:"0 1px 2px rgba(0,0,0,0.30),0 1px 3px rgba(0,0,0,0.35)",
  shadowUp:"0 10px 30px rgba(0,0,0,0.45)",
};
// Fuente de títulos: sans moderna y sobria (antes era Georgia serif).
const H = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif";
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
const CLONER_COLS = 8;
const ROW_LETTERS = ["a","b","c","d","e","f","g","h","i","j"];
const clonerRows = (cap) => Math.max(1, Math.ceil((cap||0)/CLONER_COLS));
const slotCoord = (i) => `${ROW_LETTERS[Math.floor(i/CLONER_COLS)]||"?"}${(i%CLONER_COLS)+1}`;

// Cronograma del Reset Express (offset de días desde el inicio). Coincide con GUIDE.reset.tasks.
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
function Card({children,style={},onClick}){ const[h,sH]=useState(false); return <div onClick={onClick} onMouseEnter={()=>onClick&&sH(true)} onMouseLeave={()=>sH(false)} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,boxShadow:h&&onClick?C.shadowUp:C.shadow,padding:18,cursor:onClick?"pointer":"default",transform:h&&onClick?"translateY(-2px)":"none",transition:"all 0.15s",...style}}>{children}</div>; }
function Badge({label,color,bg}){return <span style={{background:bg,color,borderRadius:20,padding:"3px 11px",fontSize:12.5,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;}
function PBadge({phase}){const m=PM[phase]||PM["floración"];return <Badge label={m.label} color={m.color} bg={m.bg}/>;}
function Bar({value,max,color=C.green,h=7}){const p=max>0?Math.min(100,Math.round(value/max*100)):0;return<div style={{background:C.border,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:`${p}%`,background:color,height:"100%",borderRadius:99,transition:"width 0.5s"}}/></div>;}
// Grilla de esquejera con forma FIJA: 8 columnas (1-8) × N filas (a, b, c...).
// Idéntica en la vista general y en el detalle. colorAt(i) da el color del slot i; onPaint(i) la hace interactiva.
function ClonerGrid({capacity,colorAt,onPaint=null,cell=null}){
  const rows=clonerRows(capacity);
  const interactive=!!onPaint;
  const cellSize=cell||(interactive?34:14);
  const lab=interactive?11:8;
  return <div style={{display:"inline-grid",gridTemplateColumns:`${interactive?16:10}px repeat(${CLONER_COLS},${cellSize}px)`,gap:interactive?5:3,alignItems:"center",justifyItems:"center"}}>
    <span/>
    {Array.from({length:CLONER_COLS},(_,c)=><span key={"h"+c} style={{fontSize:lab,fontWeight:700,color:C.textSoft}}>{c+1}</span>)}
    {Array.from({length:rows},(_,r)=>[
      <span key={"r"+r} style={{fontSize:lab,fontWeight:700,color:C.textSoft}}>{ROW_LETTERS[r]||"?"}</span>,
      ...Array.from({length:CLONER_COLS},(_,c)=>{const i=r*CLONER_COLS+c;const used=i<capacity;const col=used?colorAt(i):null;
        return <div key={i} onClick={()=>used&&onPaint&&onPaint(i)} title={used?slotCoord(i)+(col?"":" · vacío"):""}
          style={{width:cellSize,height:cellSize,borderRadius:interactive?6:3,background:used?(col||C.border):"transparent",
            border:used?`1px solid ${col?"transparent":C.borderStrong}`:"none",cursor:interactive&&used?"pointer":"default",
            opacity:used?1:0.25,transition:"background 0.08s"}}/>;
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
function SL({children,style={}}){return <div style={{fontSize:12,fontWeight:800,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,...style}}>{children}</div>;}
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

function Modal({title,children,onClose}){
  const wide=useIsWide(760);
  return <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:wide?"center":"flex-end",justifyContent:"center",padding:wide?20:0}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
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
    {!isHome&&page!=="__more__"&&<button onClick={()=>setPage(homeP)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:24,color:C.textMid,padding:"4px 2px",lineHeight:1}}>←</button>}
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
    ?[{id:"calendario",l:"Agenda",i:"📅"},{id:"bitacora",l:"Bitácora",i:"📓"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"geneticas",l:"Genéticas",i:"🧬"},{id:"estadisticas",l:"Estadísticas",i:"📊"},{id:"plagas",l:"Plagas",i:"🔬"},{id:"bot",l:"Asistente",i:"🤖"},{id:"configuracion",l:"Configuración",i:"⚙"}]
    :[{id:"calendario",l:"Agenda",i:"📅"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"bot",l:"Asistente",i:"🤖"}];

  // ----- SIDEBAR (PC) -----
  if(wide){
    const Sec=({title})=> <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",margin:"18px 8px 8px"}}>{title}</div>;
    const Item=(n)=>{const on=page===n.id;return <button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",padding:"11px 14px",borderRadius:12,cursor:"pointer",fontSize:15,fontWeight:on?800:600,background:on?C.green:"transparent",color:on?"#fff":C.textMid,border:"none",marginBottom:2,transition:"all 0.12s"}}><span style={{fontSize:18,width:22,textAlign:"center"}}>{n.i}</span>{n.l}</button>;};
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
  const moreActive=secondary.some(s=>s.id===page);
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
function MorePage({user,setPage,textScale,setTextScale}){
  const isAdmin=user.role==="admin";
  const items=isAdmin
    ?[{id:"calendario",l:"Agenda",i:"📅"},{id:"bitacora",l:"Bitácora",i:"📓"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"geneticas",l:"Genéticas",i:"🧬"},{id:"estadisticas",l:"Estadísticas",i:"📊"},{id:"plagas",l:"Plagas",i:"🔬"},{id:"bot",l:"Asistente",i:"🤖"},{id:"configuracion",l:"Configuración",i:"⚙"}]
    :[{id:"calendario",l:"Agenda",i:"📅"},{id:"vegetativo",l:"Vegetativo",i:"🌱"},{id:"compras",l:"Compras",i:"🛒"},{id:"bot",l:"Asistente",i:"🤖"}];
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Más</div>
    <TextScaleControl textScale={textScale} setTextScale={setTextScale}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {items.map(n=><Card key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"18px 18px"}}>
        <span style={{fontSize:26}}>{n.i}</span><span style={{fontSize:15.5,fontWeight:700,color:C.text}}>{n.l}</span>
      </Card>)}
    </div>
  </div>;
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

// DASHBOARD
function Gauge({value,sMin,sMax,bMin,bMax,color,out}){
  const clamp=x=>Math.max(0,Math.min(100,x));
  const pos=v=>clamp((v-sMin)/(sMax-sMin)*100);
  const l=pos(bMin),r=pos(bMax);
  return <div style={{height:7,background:C.surfaceAlt,borderRadius:6,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,bottom:0,left:`${l}%`,width:`${Math.max(0,r-l)}%`,background:color,opacity:0.5,borderRadius:6}}/>
    <div style={{position:"absolute",top:"50%",left:`${pos(value)}%`,width:11,height:11,borderRadius:"50%",transform:"translate(-50%,-50%)",background:out?C.red:color,border:`2px solid ${C.bg}`,boxShadow:out?`0 0 8px ${C.red}`:"none"}}/>
  </div>;
}
function Metric({icon,val,color,g,out}){
  return <div style={{display:"grid",gridTemplateColumns:"20px 68px 1fr",alignItems:"center",gap:9}}>
    <span style={{fontSize:14,textAlign:"center"}}>{icon}</span>
    <span style={{fontFamily:MONO,fontWeight:700,fontSize:13.5,color:out?C.red:color}}>{val}</span>
    <Gauge {...g} color={color} out={out}/>
  </div>;
}
function ClimateMetrics({climate,tR,hR,vR}){
  if(!climate||(climate.temperature==null&&climate.humidity==null))return <div style={{padding:"12px 20px 0",fontSize:12.5,color:C.textSoft,fontStyle:"italic"}}>Sin lectura de sensor</div>;
  const t=climate.temperature,h=climate.humidity,v=climate.vpd;
  const vB={min:vR?.min??0.8,max:vR?.max??1.4};
  const outT=t!=null&&(t<tR.min||t>tR.max),outH=h!=null&&(h<hR.min||h>hR.max);
  return <div style={{display:"flex",flexDirection:"column",gap:11,padding:"14px 20px 0"}}>
    {t!=null&&<Metric icon="🌡" val={`${t}°C`} color={C.amber} out={outT} g={{value:t,sMin:14,sMax:34,bMin:tR.min,bMax:tR.max}}/>}
    {h!=null&&<Metric icon="💧" val={`${h}%`} color={C.blue} out={outH} g={{value:h,sMin:0,sMax:100,bMin:hR.min,bMax:hR.max}}/>}
    {v!=null&&<Metric icon="🍃" val={v} color={C.purple} out={false} g={{value:v,sMin:0,sMax:2,bMin:vB.min,bMax:vB.max}}/>}
  </div>;
}

function Dashboard({setPage,user,roomConfig,rooms,wide,targets}){
  const [cycles,setCycles]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [vegStock,setVegStock]=useState([]);
  const [climate,setClimate]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      db.query("cycles","active=eq.true"),
      db.query("tasks",`due_date=eq.${todayISO}&order=priority.desc`),
      db.get("veg_stock"),
      db.query("climate_logs",`recorded_at=gte.${addDays(todayISO,-1)}&order=recorded_at.desc`),
    ]).then(([c,t,v,cl])=>{setCycles(c);setTasks(t);setVegStock(v);setClimate(cl);}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{
    const id=setInterval(()=>{
      db.query("climate_logs",`recorded_at=gte.${addDays(todayISO,-1)}&order=recorded_at.desc`).then(setClimate).catch(()=>{});
    },120000); // refresca el clima de las tarjetas solo cada 2 min
    return ()=>clearInterval(id);
  },[]);
  if(loading)return <Spin/>;

  const lastClimate=rid=>climate.find(c=>c.room_id===rid)||null;
  const pending=tasks.filter(t=>t.status==="pendiente");
  const myPending=pending.filter(t=>t.assignee===user.name).length;
  const renewM=vegStock.filter(v=>v.type==="madre"&&v.status==="renovar").length;

  const toggleTask=async t=>{
    const ns=t.status==="completada"?"pendiente":"completada";
    setTasks(ts=>ts.map(x=>x.id===t.id?{...x,status:ns}:x));
    try{await db.update("tasks",t.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});}catch(e){}
  };

  const alerts=[];
  rooms.forEach(rid=>{
    const rc=getRC(roomConfig,rid),cl=lastClimate(rid);
    const cyc=cycles.find(c=>c.room_id===rid);
    const tg=getTargets(targets,rid,cyc,rc);
    const tR=tg.temp,hR=tg.hum;
    if(cl){
      if(cl.temperature!=null&&(cl.temperature<tR.min||cl.temperature>tR.max))alerts.push({k:"red",ic:"🌡",t:`${rc.display_name}: temp ${cl.temperature}°C`,s:`Fuera del rango de ${tg.label} (${tR.min}–${tR.max}°C)`});
      if(cl.humidity!=null&&(cl.humidity<hR.min||cl.humidity>hR.max))alerts.push({k:"red",ic:"💧",t:`${rc.display_name}: humedad ${cl.humidity}%`,s:`Fuera del rango de ${tg.label} (${hR.min}–${hR.max}%)`});
    }
  });
  cycles.forEach(c=>{const dL=daysTo(c.estimated_harvest);if(dL>=0&&dL<=7)alerts.push({k:"amber",ic:"🌾",t:`Cosecha próxima · ${getRC(roomConfig,c.room_id).display_name}`,s:`Estimada en ${dL} día${dL===1?"":"s"}`});});
  if(renewM>0)alerts.push({k:"amber",ic:"🌳",t:`${renewM} madre${renewM>1?"s":""} para renovar`,s:"Revisá el stock en Vegetativo"});

  const madres=vegStock.filter(v=>v.type==="madre"&&v.status==="activa").reduce((a,v)=>a+(v.count||0),0);
  const postEsq=vegStock.filter(v=>v.type==="post_esqueje").reduce((a,v)=>a+(v.count||0),0);
  const vegeClim=lastClimate("Vegetativo");

  const accesos=[
    {ic:"📓",l:"Bitácora",p:"bitacora"},{ic:"📖",l:"Guía",p:"guia"},
    {ic:"🛒",l:"Compras",p:"compras"},{ic:"🧬",l:"Genéticas",p:"geneticas"},
    {ic:"🔬",l:"Plagas",p:"plagas"},{ic:"📅",l:"Agenda",p:"calendario"},
    {ic:"📊",l:"Estadísticas",p:"estadisticas"},{ic:"🌱",l:"Vegetativo",p:"vegetativo"},
    {ic:"🤖",l:"Bot IA",p:"bot"},{ic:"⚙️",l:"Config",p:"configuracion"},
  ];
  const eyebrow=txt=><div style={{fontSize:11.5,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em",margin:"22px 2px 12px",display:"flex",alignItems:"center",gap:10}}>{txt}<div style={{flex:1,height:1,background:C.border}}/></div>;

  return <div style={{paddingBottom:28}}>
    <div style={{padding:"14px 0 2px"}}>
      <div style={{fontSize:13.5,color:C.textSoft,textTransform:"capitalize"}}>{fmtFull(TODAY)}</div>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,marginTop:4}}>Buenas, <span style={{color:C.green}}>{user.name}</span> 🌿</div>
      <div style={{fontSize:14,color:C.textSoft,marginTop:4}}>{myPending>0?`Tenés ${myPending} tarea${myPending>1?"s":""} pendiente${myPending>1?"s":""} hoy`:"Estás al día 👌"}</div>
    </div>

    {eyebrow("Espacios")}
    <div style={{display:"grid",gridTemplateColumns:wide?"repeat(3,1fr)":"1fr",gap:14}}>
      {rooms.map(rid=><RoomCard key={rid} roomId={rid} rc={getRC(roomConfig,rid)} cycle={cycles.find(c=>c.room_id===rid)} climate={lastClimate(rid)} targets={targets} onClick={()=>setPage(`sala_${rid}`)}/>)}
      <VegeCard madres={madres} postEsq={postEsq} climate={vegeClim} targets={targets} onClick={()=>setPage("vegetativo")}/>
    </div>

    {eyebrow("Accesos")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {accesos.map(a=><div key={a.p} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer"}}>
        <div style={{width:34,height:34,borderRadius:10,background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{a.ic}</div>
        <span style={{fontSize:13.5,fontWeight:700,color:C.text}}>{a.l}</span>
      </div>)}
    </div>

    {eyebrow("Hoy")}
    {tasks.length===0
      ? <Card style={{padding:"18px",textAlign:"center",color:C.textSoft,fontSize:14}}>No hay tareas para hoy 🌱</Card>
      : <Card style={{padding:0,overflow:"hidden"}}>
          {tasks.map((t,i)=>{const tm=TM[t.type]||TM.revision;const dn=t.status==="completada";const gm=groupMeta(t.room_id);return <div key={t.id} onClick={()=>toggleTask(t)} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 16px",borderBottom:i<tasks.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:7,flexShrink:0,border:`2px solid ${dn?C.green:C.borderStrong}`,background:dn?C.green:"transparent",color:dn?C.bg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>✓</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14.5,fontWeight:600,color:dn?C.textSoft:C.text,textDecoration:dn?"line-through":"none"}}>{tm.icon} {t.title}</div>
              <div style={{fontSize:12,color:C.textSoft,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                {t.room_id&&<span style={{color:gm.color,fontWeight:700}}>{t.room_id}</span>}
                {t.priority==="alta"&&<span style={{color:C.red,fontWeight:700}}>● Alta</span>}
                {t.assignee&&<span>{t.assignee}</span>}
              </div>
            </div>
          </div>;})}
        </Card>}

    {alerts.length>0&&<>
      {eyebrow("Alertas")}
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {alerts.slice(0,5).map((a,i)=>{const col=a.k==="red"?C.red:C.amber;const bg=a.k==="red"?C.redLight:C.amberLight;return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 15px",borderRadius:14,background:bg,border:`1px solid ${col}44`}}>
          <div style={{width:34,height:34,borderRadius:10,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{a.ic}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:col}}>{a.t}</div><div style={{fontSize:12,color:C.textMid,marginTop:1}}>{a.s}</div></div>
        </div>;})}
      </div>
    </>}
  </div>;
}

function VegeCard({madres,postEsq,climate,onClick,targets}){
  const tg=getTargets(targets,"Vegetativo",null,null);const tR=tg.temp,hR=tg.hum,vR=tg.vpd;
  return <Card onClick={onClick} style={{padding:0,overflow:"hidden",position:"relative"}}>
    <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,background:C.green}}/>
    <div style={{padding:"18px 20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>VEGE</div><div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:H}}>Vegetativo</div></div>
        <Badge label="Madres" color={C.green} bg={C.greenLight}/>
      </div>
      <div style={{display:"flex",gap:18,margin:"12px 0 2px"}}>
        <div><span style={{fontFamily:MONO,fontWeight:700,fontSize:30,color:C.green}}>{madres}</span><span style={{fontSize:12.5,color:C.textSoft,marginLeft:6}}>madres</span></div>
        <div><span style={{fontFamily:MONO,fontWeight:700,fontSize:30,color:C.text}}>{postEsq}</span><span style={{fontSize:12.5,color:C.textSoft,marginLeft:6}}>post-esq.</span></div>
      </div>
    </div>
    <div style={{paddingBottom:18}}><ClimateMetrics climate={climate} tR={tR} hR={hR} vR={vR}/></div>
  </Card>;
}

function RoomCard({roomId,rc,cycle,climate,onClick,targets}){
  const name=rc?.display_name||(roomId==="S1"?"Sala 1":roomId==="S2"?"Sala 2":roomId);
  const fdays=rc?.flower_days||65;
  const tg=getTargets(targets,roomId,cycle,rc);const tR=tg.temp,hR=tg.hum,vR=tg.vpd;
  const phase=cycle?.phase||"floración";
  const accent=phase==="floración"?C.amber:C.green;
  const header=<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
    <div><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>{roomId}</div><div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:H}}>{name}</div></div>
    {cycle?<PBadge phase={cycle.phase}/>:<Badge label="Sin ciclo" color={C.textSoft} bg={C.surfaceAlt}/>}
  </div>;
  if(!cycle)return <Card onClick={onClick} style={{padding:0,overflow:"hidden",position:"relative"}}>
    <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,background:accent}}/>
    <div style={{padding:"18px 20px 16px"}}>{header}<div style={{fontSize:14,color:C.textSoft,marginTop:12}}>Sin ciclo activo</div></div>
    <div style={{paddingBottom:18}}><ClimateMetrics climate={climate} tR={tR} hR={hR} vR={vR}/></div>
  </Card>;
  const dayIn=daysFrom(cycle.flower_start);
  const dLeft=daysTo(cycle.estimated_harvest);
  const pct=Math.min(100,Math.round(dayIn/fdays*100));
  return <Card onClick={onClick} style={{padding:0,overflow:"hidden",position:"relative"}}>
    <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,background:accent}}/>
    <div style={{padding:"18px 20px 14px"}}>
      {header}
      <div style={{display:"flex",alignItems:"flex-end",gap:7,marginTop:12}}><span style={{fontFamily:MONO,fontWeight:700,fontSize:40,color:C.text,lineHeight:0.9}}>{dayIn}</span><span style={{fontSize:13,color:C.textSoft,paddingBottom:5}}>día de {phase}</span></div>
      <div style={{fontSize:12.5,color:C.textSoft,marginTop:8}}>Cosecha en <b style={{color:dLeft<=7?C.red:dLeft<=20?C.amber:C.text}}>{dLeft} días</b> · {fmtDate(cycle.estimated_harvest)}</div>
      <div style={{marginTop:12}}><Bar value={pct} max={100} color={accent} h={7}/></div>
    </div>
    <div style={{paddingBottom:18}}><ClimateMetrics climate={climate} tR={tR} hR={hR} vR={vR}/></div>
  </Card>;
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
      }else{setCg([]);setMsRows([]);setPotCounts({});}
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

  if(!cycle)return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={null} rc={rc} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Ciclo iniciado ✓",type:"success"});}}/>}
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:48,marginBottom:16}}>🌱</div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>{roomName}</div>
      <div style={{fontSize:14,color:C.textSoft,marginBottom:24}}>Sin ciclo activo</div>
      {user.role==="admin"&&<Btn onClick={()=>setShowPh(true)} full>Iniciar ciclo</Btn>}
    </div>
  </div>;

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
    <div style={{background:cycle.phase==="floración"?"linear-gradient(135deg,#241D12,#1C1710)":"linear-gradient(135deg,#16211A,#121B14)",borderRadius:20,padding:"22px 20px 18px",border:`1px solid ${C.border}`}}>
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
      {selPot&&<PotEditor roomId={roomId} potLabel={selPot} cycle={cycle} genetics={genetics} cycleGenetics={cg} onClose={()=>setSelPot(null)} onSaved={()=>{setSelPot(null);load();setToast({msg:"Macetón guardado ✓",type:"success"});}}/>}
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

// POT EDITOR
function PotEditor({roomId,potLabel,cycle,genetics,cycleGenetics,onClose,onSaved}){
  const pot=ROOM_POTS[roomId]?.find(p=>p.label===potLabel);
  const [gridW,setGridW]=useState(pot?.circular?3:4);
  const [gridH,setGridH]=useState(pot?.circular?4:6);
  const [cells,setCells]=useState(()=>Array((pot?.circular?3:4)*(pot?.circular?4:6)).fill(null));
  const [brush,setBrush]=useState(cycleGenetics[0]?.genetic_name||null);
  const [potId,setPotId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toastLocal,setToastLocal]=useState(null);
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});

  useEffect(()=>{
    db.query("pots",`room_id=eq.${roomId}&pot_label=eq.${potLabel}`).then(async pots=>{
      let p=pots[0];
      if(!p){
        // Auto-crear la fila del macetón si no existe
        try{const ins=await db.insert("pots",{room_id:roomId,pot_label:potLabel,circular:!!pot?.circular,grid_w:gridW,grid_h:gridH});p=ins[0];}catch(e){setToastLocal(errMsg(e));return;}
      }
      setPotId(p.id);
      const w=p.grid_w||gridW, h=p.grid_h||gridH;
      setGridW(w); setGridH(h);
      db.query("pot_cells",`pot_id=eq.${p.id}&cycle_id=eq.${cycle.id}&order=cell_index.asc`).then(existingCells=>{
        const arr=Array(w*h).fill(null);
        existingCells.forEach(c=>{if(c.cell_index<arr.length)arr[c.cell_index]=c.genetic_name;});
        setCells(arr);
      }).catch(()=>{});
    }).catch(e=>setToastLocal(errMsg(e)));
  },[roomId,potLabel,cycle.id]);

  const updateGrid=(w,h)=>{setGridW(w);setGridH(h);setCells(Array(w*h).fill(null));};
  const paint=i=>setCells(prev=>{const n=[...prev];n[i]=n[i]===brush?null:brush;return n;});

  const save=async()=>{
    if(!potId){setToastLocal("Cargando macetón, esperá un segundo y reintentá");return;}
    setSaving(true);
    try{
      await db.update("pots",potId,{grid_w:gridW,grid_h:gridH});
      await db.deleteWhere("pot_cells","pot_id",potId);
      const newCells=cells.map((g,i)=>({pot_id:potId,cycle_id:cycle.id,cell_index:i,genetic_name:g,updated_at:new Date().toISOString()})).filter(c=>c.genetic_name);
      if(newCells.length>0)await db.insert("pot_cells",newCells);
      onSaved();
    }catch(e){setToastLocal(errMsg(e));setSaving(false);}
  };

  const summary=cycleGenetics.map(g=>({...g,count:cells.filter(c=>c===g.genetic_name).length})).filter(g=>g.count>0);
  const total=cells.filter(Boolean).length;

  return <div style={{marginTop:16,background:C.surfaceAlt,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
    {toastLocal&&<Toast msg={toastLocal} type="error" onClose={()=>setToastLocal(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontSize:15,fontWeight:800,color:C.text}}>Macetón {potLabel} {pot?.circular?"— circular":"— 2×1m"}</div>
      <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:C.textSoft}}>×</button>
    </div>
    <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:12,color:C.textSoft}}>Distribución:</span>
      {[{l:"Ancho",v:gridW,set:v=>updateGrid(v===""?1:v,gridH),max:pot?.circular?4:8},{l:"Largo",v:gridH,set:v=>updateGrid(gridW,v===""?1:v),max:pot?.circular?4:10}].map(f=><label key={f.l} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.textMid}}>
        {f.l}<NumField value={f.v} onCommit={f.set} min={1} max={f.max} compact/>
      </label>)}
      <span style={{fontSize:12,color:C.textMid,fontWeight:700}}>{total}/{gridW*gridH} plantas</span>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {cycleGenetics.map(g=><button key={g.genetic_name} onClick={()=>setBrush(g.genetic_name)} style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",background:brush===g.genetic_name?genMap[g.genetic_name]||C.green:`${genMap[g.genetic_name]||C.green}22`,color:brush===g.genetic_name?"#fff":genMap[g.genetic_name]||C.green,border:`2px solid ${genMap[g.genetic_name]||C.green}`}}>{g.genetic_name}</button>)}
      <button onClick={()=>setBrush(null)} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",background:brush===null?C.red:C.bg,color:brush===null?"#fff":C.textSoft,border:`2px solid ${brush===null?C.red:C.borderStrong}`}}>Borrar</button>
      <button onClick={()=>setCells(Array(gridW*gridH).fill(brush))} style={{padding:"7px 10px",borderRadius:20,fontSize:12,cursor:"pointer",background:C.bg,color:C.textMid,border:`1px solid ${C.border}`}}>Llenar</button>
      <button onClick={()=>setCells(Array(gridW*gridH).fill(null))} style={{padding:"7px 10px",borderRadius:20,fontSize:12,cursor:"pointer",background:C.bg,color:C.textMid,border:`1px solid ${C.border}`}}>Limpiar</button>
    </div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      <div style={{flex:1}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${gridW},32px)`,gap:4}}>
          {cells.map((cell,i)=><div key={i} onClick={()=>paint(i)} style={{width:32,height:32,borderRadius:7,cursor:"pointer",background:cell?genMap[cell]||C.green:C.border,border:`1px solid ${cell?"transparent":C.borderStrong}`,transition:"background 0.08s",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {cell&&<div style={{width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.4)"}}/>}
          </div>)}
        </div>
      </div>
      <div style={{minWidth:130}}>
        <div style={{fontSize:10,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Resumen</div>
        {summary.length===0&&<div style={{fontSize:11.5,color:C.textSoft,fontStyle:"italic",marginBottom:10,lineHeight:1.5}}>Todavía no hay genéticas en esta maceta. Elegí una arriba y tocá las celdas para cargarla.</div>}
        {summary.map(g=><div key={g.genetic_name} style={{marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><div style={{width:10,height:10,borderRadius:"50%",background:genMap[g.genetic_name]||C.green,flexShrink:0}}/><span style={{fontSize:12,color:C.text,fontWeight:600}}>{g.genetic_name}</span></div>
          <div style={{fontSize:28,fontWeight:900,color:C.text,fontFamily:H,lineHeight:1}}>{g.count}</div>
          <div style={{fontSize:10,color:C.textSoft}}>plantas</div>
        </div>)}
        <Divider/>
        <div style={{fontSize:11,color:C.textSoft}}>Total</div>
        <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:H}}>{total}</div>
        <Btn onClick={save} disabled={saving} full style={{marginTop:12,padding:12}}>{saving?"Guardando...":"Guardar"}</Btn>
      </div>
    </div>
  </div>;
}

// MODALS
function WaterModal({roomId,user,onClose,onSaved}){
  const [method,setMethod]=useState("manual");
  const [duration,setDuration]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const save=async()=>{setSaving(true);try{await db.insert("watering_logs",{room_id:roomId,method,duration_minutes:duration?+duration:null,notes,logged_by:user.name,logged_at:new Date().toISOString()});onSaved();}finally{setSaving(false);}};
  return <Modal title={`💧 Riego — ${roomId}`} onClose={onClose}>
    <FS label="Método" value={method} onChange={e=>setMethod(e.target.value)} options={["automático","manual"]}/>
    <NumField label="Duración (min)" value={duration} onCommit={setDuration} min={0} max={600} placeholder="Ej: 15"/>
    <FI label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional"/>
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function NutriModal({roomId,cycleId,user,onClose,onSaved}){
  const [products,setProducts]=useState("");
  const [dose,setDose]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const save=async()=>{if(!products.trim())return;setSaving(true);try{await db.insert("nutrition_logs",{room_id:roomId,cycle_id:cycleId,products,dose,notes,logged_by:user.name,logged_at:new Date().toISOString()});onSaved();}finally{setSaving(false);}};
  return <Modal title={`🌱 Nutrición — ${roomId}`} onClose={onClose}>
    <FI label="Productos *" value={products} onChange={e=>setProducts(e.target.value)} placeholder="Ej: Humus + Biotrissol"/>
    <FI label="Dosis" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ej: 5ml/L"/>
    <FI label="Notas" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional"/>
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving||!products.trim()} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function PhaseModal({roomId,cycle,rc,user,onClose,onSaved}){
  const fdays=rc?.flower_days||65;
  const vdays=rc?.veg_days||30;
  const [phase,setPhase]=useState(cycle?.phase||"vegetativo");
  const [flowerStart,setFlowerStart]=useState(cycle?.flower_start||todayISO);
  const [estimatedHarvest,setEstimatedHarvest]=useState(cycle?.estimated_harvest||addDays(todayISO,fdays));
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
  return <Modal title={`Fase — ${rc?.display_name||roomId}`} onClose={onClose}>
    {err&&<div style={{background:"#FDECEC",color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
      {["vegetativo","floración","cosechando"].map(p=>{const m=PM[p];return <button key={p} onClick={()=>setPhase(p)} style={{padding:"14px 16px",borderRadius:12,border:`2px solid ${phase===p?m.color:C.border}`,background:phase===p?m.bg:C.surface,cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:m.color}}/><span style={{fontSize:15,fontWeight:700,color:C.text}}>{m.label}</span>{phase===p&&<span style={{marginLeft:"auto"}}>✓</span>}
      </button>;})}
    </div>
    {phase==="vegetativo"&&<>
      <FI label="Inicio etapa vegetativa" type="date" value={vegStart} onChange={e=>setVegStart(e.target.value)}/>
      <FI label="Hasta (fin estimado de vegetativo)" type="date" value={vegEnd} onChange={e=>setVegEnd(e.target.value)}/>
    </>}
    {phase==="floración"&&<>
      <FI label="Inicio floración" type="date" value={flowerStart} onChange={e=>{setFlowerStart(e.target.value);setEstimatedHarvest(addDays(e.target.value,fdays));}}/>
      <FI label="Cosecha estimada" type="date" value={estimatedHarvest} onChange={e=>setEstimatedHarvest(e.target.value)}/>
      <div style={{background:C.greenLight,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.textMid,marginBottom:12}}>⚡ Se generan tareas de poda y Zoil automáticamente · {fdays} días de floración</div>
    </>}
    <div style={{display:"flex",gap:10}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Confirmar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
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
  return <Modal title={`Objetivos de clima — ${roomName}`} onClose={onClose}>
    <div style={{fontSize:12.5,color:C.textMid,marginBottom:14,lineHeight:1.5}}>Definí el rango ideal de <b>temperatura</b> y <b>humedad</b> para cada etapa. La app usa el objetivo de la etapa en la que está la sala. El <b>VPD</b> es fijo por etapa.</div>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    {loading||!vals?<Spin/>:<>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {stages.map(s=>{const d=vals[s];const vpd=VPD_BY_STAGE[s];const isActive=s===activeStage;return <div key={s} style={{background:C.bg,borderRadius:14,padding:"12px 14px",border:`1.5px solid ${isActive?C.green:C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:13.5,fontWeight:800,color:C.text}}>{CLIMA_STAGE_LABEL[s]}</span>
            {isActive&&<Badge label="Etapa actual" color={C.green} bg={C.greenLight}/>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"58px 1fr 1fr",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:12.5,color:C.textMid}}>🌡 Temp</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>min</span><NumField compact value={d.temp_min} onCommit={n=>setField(s,"temp_min",n)} min={5} max={40}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>max</span><NumField compact value={d.temp_max} onCommit={n=>setField(s,"temp_max",n)} min={5} max={40}/><span style={{fontSize:12,color:C.textSoft}}>°C</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"58px 1fr 1fr",alignItems:"center",gap:8}}>
            <span style={{fontSize:12.5,color:C.textMid}}>💧 Hum</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>min</span><NumField compact value={d.hum_min} onCommit={n=>setField(s,"hum_min",n)} min={0} max={100}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.textSoft}}>max</span><NumField compact value={d.hum_max} onCommit={n=>setField(s,"hum_max",n)} min={0} max={100}/><span style={{fontSize:12,color:C.textSoft}}>%</span></div>
          </div>
          <div style={{fontSize:11.5,color:C.purple,marginTop:9,fontFamily:MONO}}>🍃 VPD {vpd.min}–{vpd.max} kPa <span style={{color:C.textSoft,fontFamily:H}}>· fijo</span></div>
        </div>;})}
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar objetivos"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </>}
  </Modal>;
}
function AddGenModal({cycleId,genetics,existing,counts,onClose,onSaved}){
  const [rows,setRows]=useState(existing);
  const [sel,setSel]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const avail=genetics.filter(g=>!rows.map(e=>e.genetic_name).includes(g.name));
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});

  const add=async()=>{
    if(!sel)return;
    setSaving(true);setErr(null);
    try{
      const ins=await db.insert("cycle_genetics",{cycle_id:cycleId,genetic_name:sel,plant_count:0});
      setRows(prev=>[...prev,ins[0]]);setSel("");
    }catch(e){setErr(errMsg(e));}
    finally{setSaving(false);}
  };
  const remove=async(row)=>{
    if(!window.confirm(`¿Quitar ${row.genetic_name} del ciclo? No borra el dibujo de las mesas.`))return;
    try{await db.delete("cycle_genetics",row.id);setRows(prev=>prev.filter(r=>r.id!==row.id));}
    catch(e){setErr(errMsg(e));}
  };

  return <Modal title="Genéticas del ciclo" onClose={()=>{onSaved();}}>
    {err&&<div style={{background:C.redLight||"#FDECEC",color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{fontSize:12,color:C.textSoft,marginBottom:14,lineHeight:1.5}}>Elegí las genéticas que hay en la sala. Las cantidades se calculan solas según lo que dibujes en las mesas.</div>

    {rows.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
      {rows.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:genMap[r.genetic_name]||C.green,flexShrink:0}}/>
        <span style={{flex:1,fontSize:14,fontWeight:700,color:C.text}}>{r.genetic_name}</span>
        <span style={{fontSize:12,color:C.textSoft}}>{counts?.[r.genetic_name]||0} pl.</span>
        <button onClick={()=>remove(r)} style={{background:"transparent",border:"none",color:C.red,fontSize:12,cursor:"pointer",fontWeight:600}}>Quitar</button>
      </div>)}
    </div>}

    {avail.length>0?<div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
      <div style={{flex:1}}><FS label="Agregar genética" value={sel} onChange={e=>setSel(e.target.value)} options={[{value:"",label:"Elegir..."},...avail.map(g=>({value:g.name,label:g.name}))]}/></div>
      <Btn onClick={add} disabled={saving||!sel} style={{marginBottom:12}}>{saving?"...":"+ Agregar"}</Btn>
    </div>:<div style={{fontSize:12,color:C.textSoft,fontStyle:"italic",textAlign:"center",padding:"8px 0"}}>Todas las genéticas ya están en el ciclo</div>}

    <Btn onClick={()=>onSaved()} full style={{marginTop:8}}>Listo</Btn>
  </Modal>;
}
function CloseCycleModal({cycle,roomId,rc,cg,potCounts,wLog,nLog,user,onClose,onSaved}){
  const [gYields,setGYields]=useState({}); // gramos por genética
  const [yieldManual,setYieldManual]=useState(""); // total manual (override)
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const name=rc?.display_name||roomId;
  const dur=cycle.flower_start?daysFrom(cycle.flower_start):"?";
  const totalPlants=Object.values(potCounts||{}).reduce((a,b)=>a+b,0);
  const sumG=Object.values(gYields).reduce((a,b)=>a+(+b||0),0);
  const totalYield=yieldManual!==""?+yieldManual:sumG; // si no hay total manual, usa la suma por genética
  const setG=(gn,v)=>setGYields(p=>({...p,[gn]:v}));
  // Filas de rendimiento por genética (plantas, gramos, g/planta)
  const genRows=cg.map(g=>{
    const plants=potCounts?.[g.genetic_name]||0;
    const grams=+gYields[g.genetic_name]||0;
    return {name:g.genetic_name,plants,grams,gpp:plants>0&&grams>0?Math.round(grams/plants):null};
  });
  const buildSummary=()=>{
    const lines=[];
    lines.push(`═══ INFORME DE CICLO — ${name} ═══`);
    lines.push(`Cerrado: ${fmtDate(todayISO)} · por ${user.name}`);
    lines.push(`Inicio floración: ${cycle.flower_start?fmtDate(cycle.flower_start):"—"}`);
    lines.push(`Cosecha estimada: ${cycle.estimated_harvest?fmtDate(cycle.estimated_harvest):"—"}`);
    lines.push(`Días en floración: ${dur}`);
    lines.push("");
    lines.push("── Rendimiento por genética ──");
    if(genRows.length===0)lines.push("(sin genéticas registradas)");
    genRows.forEach(r=>lines.push(`• ${r.name}: ${r.plants} plantas · ${r.grams||"—"} g${r.gpp?` · ${r.gpp} g/planta`:""}`));
    lines.push(`Total plantas: ${totalPlants}`);
    lines.push(`Total cosechado: ${totalYield||"—"} g`);
    if(totalPlants>0&&totalYield)lines.push(`Promedio: ${Math.round(totalYield/totalPlants)} g/planta`);
    lines.push("");
    lines.push(`── Registros del ciclo ──`);
    lines.push(`Riegos registrados: ${wLog?.length||0}`);
    lines.push(`Nutrición/foliar: ${nLog?.length||0}`);
    if(notes){lines.push("");lines.push("── Notas ──");lines.push(notes);}
    return lines.join("\n");
  };
  // PDF nativo vía ventana de impresión (sin dependencias). "Guardar como PDF".
  const printPDF=()=>{
    const w=window.open("","_blank");
    if(!w){setErr("Permití las ventanas emergentes para generar el PDF.");return;}
    const esc=s=>String(s??"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
    const rows=genRows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.plants}</td><td>${r.grams||"—"}</td><td>${r.gpp?r.gpp+" g":"—"}</td></tr>`).join("")||`<tr><td colspan="4">Sin genéticas registradas</td></tr>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ciclo ${esc(name)} — ${todayISO}</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#16191B;margin:40px;}h1{font-size:22px;margin:0 0 4px;}.sub{color:#717A76;font-size:13px;margin-bottom:24px;}
    .grid{display:flex;gap:24px;flex-wrap:wrap;margin:18px 0;}.kpi{border:1px solid #E6E8E6;border-radius:10px;padding:12px 18px;}.kpi .v{font-size:26px;font-weight:800;color:#2D7A4B;}.kpi .l{font-size:11px;color:#717A76;text-transform:uppercase;letter-spacing:.08em;}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#454B49;border-bottom:1px solid #E6E8E6;padding-bottom:6px;margin:24px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #EEE;}th{color:#717A76;font-size:11px;text-transform:uppercase;}
    .notes{white-space:pre-wrap;font-size:13px;color:#454B49;}@media print{body{margin:18px;}}</style></head><body>
    <h1>Informe de ciclo — ${esc(name)}</h1>
    <div class="sub">Cerrado el ${fmtDate(todayISO)} por ${esc(user.name)}</div>
    <div class="grid">
      <div class="kpi"><div class="l">Días en flora</div><div class="v">${dur}</div></div>
      <div class="kpi"><div class="l">Plantas</div><div class="v">${totalPlants}</div></div>
      <div class="kpi"><div class="l">Total cosechado</div><div class="v">${totalYield||"—"} g</div></div>
      <div class="kpi"><div class="l">g / planta</div><div class="v">${totalPlants>0&&totalYield?Math.round(totalYield/totalPlants):"—"}</div></div>
    </div>
    <h2>Fechas</h2>
    <div class="notes">Inicio floración: ${cycle.flower_start?fmtDate(cycle.flower_start):"—"}\nCosecha estimada: ${cycle.estimated_harvest?fmtDate(cycle.estimated_harvest):"—"}\nRiegos: ${wLog?.length||0} · Nutrición/foliar: ${nLog?.length||0}</div>
    <h2>Rendimiento por genética</h2>
    <table><thead><tr><th>Genética</th><th>Plantas</th><th>Gramos</th><th>g/planta</th></tr></thead><tbody>${rows}</tbody></table>
    ${notes?`<h2>Notas</h2><div class="notes">${esc(notes)}</div>`:""}
    </body></html>`);
    w.document.close();w.focus();
    setTimeout(()=>{try{w.print();}catch{}},350);
  };
  const close=async()=>{
    setSaving(true);setErr(null);
    try{
      const summary=buildSummary();
      await db.update("cycles",cycle.id,{active:false,closed_at:new Date().toISOString(),summary,real_harvest:todayISO,yield_grams:totalYield?totalYield:null});
      // Rendimiento por genética → cycle_genetics.yield_grams (requiere la columna)
      for(const g of cg){
        const val=+gYields[g.genetic_name]||0;
        if(val>0&&g.id)await db.update("cycle_genetics",g.id,{yield_grams:val});
      }
      await logA(user.name,`Cerró ciclo de ${roomId} (${totalYield||0}g)`,"cycle");
      // Automatización: genera el cronograma del Reset Express para la cama (día 1 a 5).
      try{
        const n=await generateResetTasks(roomId,todayISO,user.name,`cierre (${user.name})`);
        await db.updateWhere("room_config","room_id",roomId,{last_reset_at:new Date().toISOString()});
        if(n>0)await logA(user.name,`Generó ${n} tareas de Reset Express en ${roomId}`,"task");
      }catch{}
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Modal title={`Cerrar ciclo — ${name}`} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{background:C.amberLight,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.textMid,marginBottom:14}}>⚠ Esto archiva el ciclo actual y deja la sala lista para uno nuevo.</div>
    <SL>Rendimiento por genética (gramos)</SL>
    {cg.length===0&&<div style={{fontSize:13,color:C.textSoft,marginBottom:12}}>Sin genéticas registradas en este ciclo.</div>}
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      {cg.map(g=>{const plants=potCounts?.[g.genetic_name]||0;const grams=+gYields[g.genetic_name]||0;return <div key={g.genetic_name} style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{g.genetic_name}</div><div style={{fontSize:11.5,color:C.textSoft}}>{plants} planta{plants!==1?"s":""}{grams>0&&plants>0?` · ${Math.round(grams/plants)} g/planta`:""}</div></div>
        <NumField value={gYields[g.genetic_name]??""} onCommit={v=>setG(g.genetic_name,v===""?"":v)} min={0} max={999999} placeholder="g" compact/>
      </div>;})}
    </div>
    <NumField label={`Total cosechado (gramos)${sumG>0?` · suma genéticas: ${sumG}`:""}`} value={yieldManual} onCommit={setYieldManual} min={0} max={999999} placeholder={sumG>0?String(sumG):"Ej: 1200"}/>
    <div style={{fontSize:12,color:C.textSoft,marginTop:-6,marginBottom:10}}>Si lo dejás vacío, se usa la suma por genética ({sumG} g).</div>
    <FT label="Notas finales (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones del ciclo..." rows={2}/>
    <SL>Vista previa</SL>
    <pre style={{background:C.bg,borderRadius:10,padding:14,fontSize:11,color:C.textMid,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:160,overflowY:"auto",lineHeight:1.5}}>{buildSummary()}</pre>
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <Btn onClick={printPDF} v="secondary" style={{flex:1,fontSize:13}}>🖨 Imprimir / PDF</Btn>
      <Btn onClick={close} disabled={saving} style={{flex:1,fontSize:13}}>{saving?"Cerrando...":"Cerrar y archivar"}</Btn>
    </div>
  </Modal>;
}
function ClimateModal({roomId,user,onClose,onSaved}){
  const [temp,setTemp]=useState("");
  const [hum,setHum]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(temp===""&&hum===""){setErr("Cargá al menos temperatura o humedad");return;}
    setSaving(true);setErr(null);
    try{
      await db.insert("climate_logs",{room_id:roomId,temperature:temp===""?null:+temp,humidity:hum===""?null:+hum,source:"manual",recorded_by:user.name,recorded_at:new Date().toISOString()});
      await logA(user.name,`Midió clima en ${roomId}`,"clima");
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Modal title={`🌡 Medición — ${roomId}`} onClose={onClose}>
    {err&&<div style={{background:"#FDECEC",color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <NumField label="Temperatura (°C)" value={temp} onCommit={setTemp} min={-10} max={60} placeholder="Ej: 24"/>
    <NumField label="Humedad (%)" value={hum} onCommit={setHum} min={0} max={100} placeholder="Ej: 55"/>
    <div style={{display:"flex",gap:10,marginTop:4}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Registrar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function FoliarModal({roomId,cycleId,user,onClose,onSaved}){
  const [products,setProducts]=useState("");
  const [dose,setDose]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    if(!products.trim()){setErr("Indicá al menos un producto");return;}
    setSaving(true);setErr(null);
    try{
      await db.insert("nutrition_logs",{room_id:roomId,cycle_id:cycleId,products:products.trim(),dose:dose||null,notes:notes||null,application_type:"foliar",logged_by:user.name});
      await logA(user.name,`Aplicación foliar en ${roomId}`,"foliar");
      onSaved();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Modal title={`🍃 Aplicación foliar — ${roomId}`} onClose={onClose}>
    {err&&<div style={{background:"#FDECEC",color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <div style={{background:C.greenLight,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.textMid,marginBottom:14}}>💡 Recordá apagar las luces antes de aplicar foliar.</div>
    <FI label="Productos *" value={products} onChange={e=>setProducts(e.target.value)} placeholder="Ej: aceite de neem, jabón potásico"/>
    <FI label="Dosis (opcional)" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ej: 5ml/L"/>
    <FT label="Notas (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
    <div style={{display:"flex",gap:10,marginTop:4}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Registrar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
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
function VegetativoPage({genetics,user,targets,onTargetsChanged}){
  const [stock,setStock]=useState([]);
  const [cloners,setCloners]=useState([]);
  const [clSlots,setClSlots]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showAddM,setShowAddM]=useState(false);
  const [showAddP,setShowAddP]=useState(false);
  const [showEsp,setShowEsp]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [showTargets,setShowTargets]=useState(false);
  const [climate,setClimate]=useState(null);      // última lectura (tarjeta de arriba)
  const [clSeries,setClSeries]=useState([]);      // serie del rango elegido (gráficos)
  const [clRange,setClRange]=useState("24h");
  const [showClimate,setShowClimate]=useState(false);
  const [clTick,setClTick]=useState(0);   // fuerza recarga del clima al cargar una medición manual

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([db.get("veg_stock"),db.get("cloners"),db.get("cloner_slots")])
      .then(([s,c,cs])=>{setStock(s);setCloners(c);setClSlots(cs);}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const loadC=()=>db.query("climate_logs","room_id=eq.Vegetativo&order=recorded_at.desc&limit=1").then(r=>setClimate(r[0]||null)).catch(()=>{});
    loadC();const id=setInterval(loadC,120000);return ()=>clearInterval(id);
  },[clTick]);
  useEffect(()=>{
    const loadS=()=>{
      const hrs=clRange==="24h"?24:clRange==="7d"?24*7:24*30;
      const since=new Date(Date.now()-hrs*3600*1000).toISOString();
      db.query("climate_logs",`room_id=eq.Vegetativo&recorded_at=gte.${since}&order=recorded_at.asc`).then(setClSeries).catch(()=>setClSeries([]));
    };
    loadS();const id=setInterval(loadS,120000);return ()=>clearInterval(id);
  },[clRange,clTick]);

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const mothers=stock.filter(s=>s.type==="madre");
  const postClone=stock.filter(s=>s.type==="post_esqueje");
  const delItem=async id=>{await db.delete("veg_stock",id);setStock(prev=>prev.filter(s=>s.id!==id));setToast({msg:"Eliminado",type:"success"});};
  const addBtn=onClick=><button onClick={e=>{e.stopPropagation();onClick();}} style={{fontSize:11,color:C.green,background:C.greenLight,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700}}>+ Agregar</button>;

  if(loading)return <Spin/>;
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {showAddM&&<VegModal type="madre" genetics={genetics} onClose={()=>setShowAddM(false)} onSaved={()=>{setShowAddM(false);load();setToast({msg:"Guardado ✓",type:"success"});}}/>}
    {showAddP&&<VegModal type="post_esqueje" genetics={genetics} onClose={()=>setShowAddP(false)} onSaved={()=>{setShowAddP(false);load();setToast({msg:"Guardado ✓",type:"success"});}}/>}
    {showEsp!==null&&<EsquejeraModal cloner={cloners.find(c=>c.id===showEsp)} slots={clSlots.filter(s=>s.cloner_id===showEsp)} genetics={genetics} onClose={()=>setShowEsp(null)} onSaved={()=>{setShowEsp(null);load();setToast({msg:"Esquejera guardada ✓",type:"success"});}}/>}
    {editItem&&<VegModal type={editItem.type} item={editItem} genetics={genetics} onClose={()=>setEditItem(null)} onSaved={()=>{setEditItem(null);load();setToast({msg:"Guardado ✓",type:"success"});}}/>}
    {showTargets&&<TargetsModal roomId="Vegetativo" rc={null} cycle={null} user={user} onClose={()=>setShowTargets(false)} onSaved={()=>{setShowTargets(false);onTargetsChanged&&onTargetsChanged();setToast({msg:"Objetivos de clima guardados ✓",type:"success"});}}/>}
    {showClimate&&<ClimateModal roomId="Vegetativo" user={user} onClose={()=>setShowClimate(false)} onSaved={()=>{setShowClimate(false);setClTick(t=>t+1);setToast({msg:"Medición guardada ✓",type:"success"});}}/>}

    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Vegetativo</div>

    {/* Clima en vivo */}
    {(()=>{const tg=getTargets(targets,"Vegetativo",null,null);return <Card style={{padding:"14px 18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 2px"}}>
        <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em"}}>Objetivo · madres/esquejes</div>
        {user?.role==="admin"&&<button onClick={()=>setShowTargets(true)} style={{fontSize:11,color:C.textMid,background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 9px",cursor:"pointer"}}>✎ Editar</button>}
      </div>
      <ClimateMetrics climate={climate} tR={tg.temp} hR={tg.hum} vR={tg.vpd}/>
    </Card>;})()}

    {/* Contadores */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {[{l:"Madres",v:mothers.filter(m=>m.status==="activa").reduce((a,m)=>a+m.count,0),w:mothers.filter(m=>m.status==="renovar").length,i:"🌳"},
        {l:"Esquejes",v:clSlots.filter(s=>s.genetic_name).length,sub:`/${cloners.reduce((a,c)=>a+c.capacity,0)}`,i:"🌿"},
        {l:"Post-esq.",v:postClone.reduce((a,p)=>a+p.count,0),i:"🪴"}
      ].map(s=><Card key={s.l} style={{padding:"14px",textAlign:"center"}}>
        <div style={{fontSize:22}}>{s.i}</div>
        <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,margin:"6px 0 2px"}}>{s.v}{s.sub&&<span style={{fontSize:12,color:C.textSoft,fontWeight:400}}>{s.sub}</span>}</div>
        <div style={{fontSize:11,color:C.textSoft}}>{s.l}</div>
        {s.w>0&&<div style={{fontSize:11,color:C.amber,fontWeight:700,marginTop:4}}>⚠ {s.w} renovar</div>}
      </Card>)}
    </div>

    {/* Madres */}
    <Accordion title="Madres" icon="🌳" right={user.role==="admin"?addBtn(()=>setShowAddM(true)):null}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {mothers.map(m=>{const days=daysFrom(m.entry_date);const renovar=m.status==="renovar";const col=m.color||genMap[m.genetic_name]||C.green;
          return <Card key={m.id} onClick={()=>setEditItem(m)} style={{padding:"14px 16px",background:C.bg}}><div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${col}22`,border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌳</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:C.text}}>{m.genetic_name}</div><div style={{fontSize:12.5,color:C.textSoft}}>Maceta {m.pot_label}{m.pot_size?` (${m.pot_size})`:""} · {fmtDate(m.entry_date)} · {m.count} pl.</div>{m.notes&&<div style={{fontSize:12.5,color:C.textMid,marginTop:4,fontStyle:"italic"}}>📝 {m.notes.length>70?m.notes.slice(0,70)+"…":m.notes}</div>}</div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{fontSize:22,fontWeight:900,color:days>180?C.amber:C.text,fontFamily:H,lineHeight:1}}>{days}d</div>
              <Badge label={m.status} color={renovar?C.amber:C.green} bg={renovar?C.amberLight:C.greenLight}/>
              {user.role==="admin"&&<button onClick={e=>{e.stopPropagation();delItem(m.id);}} style={{fontSize:12,color:C.red,background:"transparent",border:"none",cursor:"pointer",padding:0}}>Eliminar</button>}
            </div>
          </div><div style={{fontSize:11.5,color:C.textSoft,marginTop:8,fontStyle:"italic"}}>Tocá para editar o anotar ✎</div></Card>;})}
        {mothers.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"14px 0"}}>Sin madres registradas</div>}
      </div>
    </Accordion>

    {/* Esquejeras */}
    <Accordion title="Esquejeras" icon="🌿">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {cloners.map(cl=>{
          const slots=clSlots.filter(s=>s.cloner_id===cl.id);
          const used=slots.filter(s=>s.genetic_name).length;
          const gC={};slots.forEach(s=>{if(s.genetic_name)gC[s.genetic_name]=(gC[s.genetic_name]||0)+1;});
          return <Card key={cl.id} style={{padding:"14px 16px",background:C.bg}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>{cl.label}</div><div style={{fontSize:12,color:C.textSoft}}>{used}/{cl.capacity}</div></div>
              <Btn onClick={()=>setShowEsp(cl.id)} v="secondary" style={{padding:"8px 14px",fontSize:12}}>Configurar</Btn>
            </div>
            <Bar value={used} max={cl.capacity} h={8}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
              {Object.entries(gC).map(([g,n])=><span key={g} style={{background:`${genMap[g]||C.green}22`,color:genMap[g]||C.green,border:`1px solid ${genMap[g]||C.green}44`,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{g}: {n}</span>)}
              {used===0&&<span style={{color:C.textSoft,fontSize:12,fontStyle:"italic"}}>Vacía — tocá Configurar</span>}
            </div>
            {used>0&&<div style={{marginTop:12,overflowX:"auto"}}>
              <ClonerGrid capacity={cl.capacity} colorAt={(i)=>{const s=slots.find(sl=>sl.slot_index===i);return s?.genetic_name?(genMap[s.genetic_name]||C.green):null;}}/>
            </div>}
          </Card>;
        })}
        {cloners.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"14px 0"}}>Sin esquejeras configuradas</div>}
      </div>
    </Accordion>

    {/* Post-esquejes */}
    <Accordion title="Post-esquejes" icon="🪴" right={user.role==="admin"?addBtn(()=>setShowAddP(true)):null}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {postClone.map(p=>{const col=p.color||genMap[p.genetic_name]||C.green;
          return <Card key={p.id} onClick={()=>setEditItem(p)} style={{padding:"14px 16px",background:C.bg}}><div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${col}22`,border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🪴</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:C.text}}>{p.genetic_name}</div><div style={{fontSize:12.5,color:C.textSoft}}>Maceta {p.pot_label}{p.pot_size?` (${p.pot_size})`:""} · {p.status}</div>{p.notes&&<div style={{fontSize:12.5,color:C.textMid,marginTop:4,fontStyle:"italic"}}>📝 {p.notes.length>70?p.notes.slice(0,70)+"…":p.notes}</div>}</div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:H,lineHeight:1}}>{p.count}</div>
              <div style={{fontSize:11.5,color:C.textSoft}}>plantas</div>
              {user.role==="admin"&&<button onClick={e=>{e.stopPropagation();delItem(p.id);}} style={{fontSize:12,color:C.red,background:"transparent",border:"none",cursor:"pointer",padding:0}}>Eliminar</button>}
            </div>
          </div><div style={{fontSize:11.5,color:C.textSoft,marginTop:8,fontStyle:"italic"}}>Tocá para editar o anotar ✎</div></Card>;})}
        {postClone.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"14px 0"}}>Sin stock post-esqueje</div>}
      </div>
    </Accordion>

    {/* Métricas */}
    <Accordion title="Métricas" icon="📊">
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["24h","24 h"],["7d","7 días"],["30d","30 días"]].map(([k,l])=><button key={k} onClick={()=>setClRange(k)} style={{flex:1,fontSize:12.5,fontWeight:700,padding:"8px 0",borderRadius:9,cursor:"pointer",border:`1px solid ${clRange===k?C.green:C.border}`,background:clRange===k?C.greenLight:"transparent",color:clRange===k?C.green:C.textSoft}}>{l}</button>)}
        <button onClick={()=>setShowClimate(true)} style={{fontSize:12.5,fontWeight:700,padding:"8px 12px",borderRadius:9,cursor:"pointer",border:`1px solid ${C.border}`,background:"transparent",color:C.textMid}}>+ Med.</button>
      </div>
      {(()=>{
        const tg=getTargets(targets,"Vegetativo",null,null);
        const tR=tg.temp,hR=tg.hum,vR=tg.vpd;
        const tPts=clSeries.filter(c=>c.temperature!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.temperature}));
        const hPts=clSeries.filter(c=>c.humidity!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.humidity}));
        const vPts=clSeries.filter(c=>c.vpd!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c.vpd}));
        if(clSeries.length===0)return <div style={{textAlign:"center",color:C.textSoft,fontSize:13,fontStyle:"italic",padding:"16px 0"}}>Sin datos en este rango todavía</div>;
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
  </div>;
}

function VegModal({type,genetics,item,onClose,onSaved}){
  const [gn,setGn]=useState(item?.genetic_name||genetics[0]?.name||"");
  const [cnt,setCnt]=useState(item?.count?.toString()||"1");
  const [pot,setPot]=useState(item?.pot_label||"");
  const [potSize,setPotSize]=useState(item?.pot_size||"");
  const [status,setStatus]=useState(item?.status||(type==="madre"?"activa":"post-esqueje"));
  const [date,setDate]=useState(item?.entry_date||todayISO);
  const [notes,setNotes]=useState(item?.notes||"");
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const [color,setColor]=useState(item?.color||"");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{setSaving(true);setErr(null);try{const data={type,genetic_name:gn,count:+cnt,pot_label:pot,pot_size:potSize||null,status,entry_date:date,notes:notes||null,color:color||null,updated_at:new Date().toISOString()};if(item)await db.update("veg_stock",item.id,data);else await db.insert("veg_stock",data);onSaved();}catch(e){setErr(errMsg(e));setSaving(false);}};
  const effectiveColor=color||genMap[gn]||C.green;
  return <Modal title={`${type==="madre"?"🌳 Madre":"🪴 Post-esqueje"} — ${item?"Editar":"Agregar"}`} onClose={onClose}>
    {err&&<div style={{background:"#FDECEC",color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <FS label="Genética" value={gn} onChange={e=>setGn(e.target.value)} options={genetics.map(g=>({value:g.name,label:g.name}))}/>
    <NumField label="Cantidad" value={cnt} onCommit={setCnt} min={0} max={9999}/>
    <FI label="Maceta / Ubicación" value={pot} onChange={e=>setPot(e.target.value)} placeholder="Ej: M-01"/>
    <div style={{marginBottom:12}}>
      <label style={{fontSize:13.5,color:C.textMid,fontWeight:600,display:"block",marginBottom:6}}>Tamaño de maceta (opcional)</label>
      <div style={{display:"flex",gap:8}}>
        {["5L","10L","15L"].map(sz=><button key={sz} onClick={()=>setPotSize(potSize===sz?"":sz)} style={{flex:1,padding:"10px 6px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,background:potSize===sz?C.green:C.surface,color:potSize===sz?"#fff":C.textMid,border:`1.5px solid ${potSize===sz?C.green:C.border}`}}>{sz}</button>)}
      </div>
    </div>
    <div style={{marginBottom:12}}>
      <label style={{fontSize:13.5,color:C.textMid,fontWeight:600,display:"block",marginBottom:8}}>Color (opcional · "Otro" para uno libre)</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setColor("")} title="Usar el color de la genética" style={{minWidth:64,height:36,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700,padding:"0 10px",background:!color?C.green:C.surface,color:!color?"#fff":C.textMid,border:`1.5px solid ${!color?C.green:C.border}`}}>Auto</button>
        {GP.slice(0,8).map(c=><div key={c} onClick={()=>setColor(c)} style={{width:36,height:36,borderRadius:10,background:c,cursor:"pointer",border:`3px solid ${color===c?"#fff":"transparent"}`,boxShadow:color===c?`0 0 0 3px ${c}`:C.shadow}}/>)}
        <label style={{width:36,height:36,borderRadius:10,cursor:"pointer",border:`2px dashed ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",overflow:"hidden",background:(color&&!GP.slice(0,8).includes(color))?color:C.bg}}>
          {!(color&&!GP.slice(0,8).includes(color))&&<span style={{color:C.textSoft}}>🎨</span>}
          <input type="color" value={effectiveColor} onChange={e=>setColor(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/>
        </label>
        <span style={{fontSize:12,color:C.textSoft}}>Otro</span>
      </div>
    </div>
    <FI label="Fecha de ingreso" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
    {type==="madre"?<FS label="Estado" value={status} onChange={e=>setStatus(e.target.value)} options={["activa","renovar","inactiva"]}/>
      :<FS label="Etapa" value={status} onChange={e=>setStatus(e.target.value)} options={["post-esqueje","vegetativo","lista"]}/>}
    <FT label="Notas / anotaciones (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones, podas, plagas, riego, etc." rows={3}/>
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}

function EsquejeraModal({cloner,slots,genetics,onClose,onSaved}){
  const [cells,setCells]=useState(()=>{const arr=Array(cloner.capacity).fill(null);slots.forEach(s=>{if(s.slot_index<arr.length)arr[s.slot_index]=s.genetic_name;});return arr;});
  const [brush,setBrush]=useState(genetics[0]?.name||null);
  const [cutDate,setCutDate]=useState(todayISO);
  const [saving,setSaving]=useState(false);
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const used=cells.filter(Boolean).length;
  const gC={};cells.forEach(c=>{if(c)gC[c]=(gC[c]||0)+1;});
  const paint=i=>setCells(prev=>{const n=[...prev];n[i]=n[i]===brush?null:brush;return n;});
  const save=async()=>{
    setSaving(true);
    try{
      await db.deleteWhere("cloner_slots","cloner_id",cloner.id);
      const newSlots=cells.map((g,i)=>({cloner_id:cloner.id,slot_index:i,genetic_name:g,cut_date:g?cutDate:null,status:g?"activo":"vacío",updated_at:new Date().toISOString()})).filter(s=>s.genetic_name);
      if(newSlots.length>0)await db.insert("cloner_slots",newSlots);
      onSaved();
    }finally{setSaving(false);}
  };
  return <Modal title={`🌿 ${cloner.label}`} onClose={onClose}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <span style={{fontSize:13,color:C.textSoft}}>{used}/{cloner.capacity} esquejes</span>
      <div style={{width:120}}><Bar value={used} max={cloner.capacity} h={8}/></div>
    </div>
    <FI label="Fecha de corte" type="date" value={cutDate} onChange={e=>setCutDate(e.target.value)}/>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {genetics.map(g=><button key={g.name} onClick={()=>setBrush(g.name)} style={{padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",background:brush===g.name?genMap[g.name]||C.green:`${genMap[g.name]||C.green}22`,color:brush===g.name?"#fff":genMap[g.name]||C.green,border:`2px solid ${genMap[g.name]||C.green}`}}>{g.name}</button>)}
      <button onClick={()=>setBrush(null)} style={{padding:"6px 12px",borderRadius:20,fontSize:11,cursor:"pointer",background:brush===null?C.red:C.bg,color:brush===null?"#fff":C.textSoft,border:`2px solid ${brush===null?C.red:C.borderStrong}`}}>Borrar</button>
    </div>
    <div style={{overflowX:"auto",marginBottom:14}}>
      <ClonerGrid capacity={cells.length} colorAt={(i)=>cells[i]?(genMap[cells[i]]||C.green):null} onPaint={paint}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {Object.entries(gC).map(([g,n])=><span key={g} style={{background:`${genMap[g]||C.green}22`,color:genMap[g]||C.green,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{g}: {n}</span>)}
    </div>
    <div style={{display:"flex",gap:10}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar esquejera"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}

// GENÉTICAS PAGE
function GenEditModal({g,genetics,setGenetics,user,onClose,onToast}){
  const [name,setName]=useState(g.name||"");
  const [color,setColor]=useState(g.color||GP[0]);
  const [flowerDays,setFlowerDays]=useState(g.flower_days?.toString()||"65");
  const [height,setHeight]=useState(g.height||"media");
  const [notes,setNotes]=useState(g.notes||"");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const save=async()=>{
    const nm=name.trim();
    if(!nm){setErr("El nombre no puede quedar vacío.");return;}
    const dup=genetics.find(x=>x.id!==g.id&&x.name.toLowerCase()===nm.toLowerCase());
    if(dup){setErr("Ya existe otra genética con ese nombre.");return;}
    setSaving(true);setErr(null);
    try{
      const renamed=nm!==g.name;
      await db.update("genetics",g.id,{name:nm,color,flower_days:+flowerDays||null,height,notes:notes||null});
      // Renombrar en cascada: todo lo que referencia la genética por su nombre.
      if(renamed){
        for(const tbl of ["cycle_genetics","pot_cells","cloner_slots","veg_stock"]){
          try{await db.updateWhere(tbl,"genetic_name",g.name,{genetic_name:nm});}catch{}
        }
      }
      await logA(user.name,`Editó genética: ${g.name}${renamed?` → ${nm}`:""}`,"genetics");
      setGenetics(prev=>prev.map(x=>x.id===g.id?{...x,name:nm,color,flower_days:+flowerDays||null,height,notes:notes||null}:x));
      onToast&&onToast(renamed?"Genética actualizada y referencias renombradas ✓":"Genética actualizada ✓");
      onClose();
    }catch(e){setErr(errMsg(e));setSaving(false);}
  };
  return <Modal title={`✎ Editar — ${g.name}`} onClose={onClose}>
    {err&&<div style={{background:C.redLight,color:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{err}</div>}
    <FI label="Nombre" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la genética"/>
    {name.trim()&&name.trim()!==g.name&&<div style={{background:C.amberLight,color:C.amber,borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>Al cambiar el nombre se actualizan también ciclos, mesas, esquejeras y stock que usan "{g.name}".</div>}
    <NumField label="Días de floración" value={flowerDays} onCommit={setFlowerDays} min={1} max={200}/>
    <FS label="Altura de planta" value={height} onChange={e=>setHeight(e.target.value)} options={[{value:"baja",label:"Baja"},{value:"media",label:"Media"},{value:"alta",label:"Alta"}]}/>
    <FT label="Notas de cultivo" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Características, comportamiento..." rows={3}/>
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:8}}>Color</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {GP.map(col=><div key={col} onClick={()=>setColor(col)} style={{width:36,height:36,borderRadius:10,background:col,cursor:"pointer",border:`3px solid ${color===col?"#fff":"transparent"}`,boxShadow:color===col?`0 0 0 3px ${col}`:C.shadow,transition:"all 0.1s"}}/>)}
        <label style={{width:36,height:36,borderRadius:10,cursor:"pointer",border:`2px dashed ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",overflow:"hidden",background:GP.includes(color)?C.bg:color}}>
          {GP.includes(color)&&<span style={{color:C.textSoft}}>🎨</span>}
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/>
        </label>
      </div>
    </div>
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar cambios"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function GeneticasPage({genetics,setGenetics,user}){
  const [showForm,setShowForm]=useState(false);
  const [showLib,setShowLib]=useState(null);
  const [editG,setEditG]=useState(null);
  const [newG,setNewG]=useState({name:"",color:GP[0],notes:"",flower_days:"65",height:"media"});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const add=async()=>{if(!newG.name.trim())return;setSaving(true);try{const ins=await db.insert("genetics",{name:newG.name.trim(),color:newG.color,notes:newG.notes,flower_days:+newG.flower_days||65,height:newG.height});await logA(user.name,`Agregó genética: ${newG.name}`,"genetics");setGenetics(prev=>[...prev,ins[0]]);setNewG({name:"",color:GP[(genetics.length+1)%GP.length],notes:"",flower_days:"65",height:"media"});setShowForm(false);setToast({msg:"Agregada ✓",type:"success"});}catch(e){setToast({msg:errMsg(e),type:"error"});}finally{setSaving(false);}};
  const del=async(id,name)=>{await db.delete("genetics",id);await logA(user.name,`Eliminó genética: ${name}`,"genetics");setGenetics(prev=>prev.filter(g=>g.id!==id));setToast({msg:"Eliminada",type:"success"});};
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    {editG&&<GenEditModal g={editG} genetics={genetics} setGenetics={setGenetics} user={user} onClose={()=>setEditG(null)} onToast={(m)=>setToast({msg:m,type:"success"})}/>}
    {showLib&&<Modal title={`📖 ${showLib.name}`} onClose={()=>setShowLib(null)}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:56,height:56,borderRadius:14,background:showLib.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#fff",fontWeight:900}}>{showLib.name[0]}</div><div><div style={{fontSize:20,fontWeight:900,color:C.text}}>{showLib.name}</div>{showLib.flower_days&&<div style={{fontSize:13,color:C.textSoft}}>~{showLib.flower_days} días de floración{showLib.height?` · altura ${showLib.height}`:""}</div>}</div></div>
      <Divider/>
      {showLib.notes?<><SL>Notas de cultivo</SL><div style={{fontSize:14,color:C.text,lineHeight:1.6,background:C.bg,borderRadius:12,padding:16}}>{showLib.notes}</div></>:<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic",textAlign:"center",padding:"20px 0"}}>Sin notas — editá esta genética para agregar</div>}
    </Modal>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>Genéticas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Agregar</Btn>
    </div>
    {showForm&&<Card>
      <SL>Nueva genética</SL>
      <FI label="Nombre *" value={newG.name} onChange={e=>setNewG(p=>({...p,name:e.target.value}))} placeholder="Ej: Gorilla Glue #4"/>
      <NumField label="Días de floración" value={newG.flower_days} onCommit={v=>setNewG(p=>({...p,flower_days:v}))} min={1} max={200}/>
      <FS label="Altura de planta" value={newG.height} onChange={e=>setNewG(p=>({...p,height:e.target.value}))} options={[{value:"baja",label:"Baja"},{value:"media",label:"Media"},{value:"alta",label:"Alta"}]}/>
      <FI label="Notas de cultivo" value={newG.notes} onChange={e=>setNewG(p=>({...p,notes:e.target.value}))} placeholder="Características, comportamiento..."/>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:8}}>Color</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {GP.map(col=><div key={col} onClick={()=>setNewG(p=>({...p,color:col}))} style={{width:36,height:36,borderRadius:10,background:col,cursor:"pointer",border:`3px solid ${newG.color===col?"#fff":"transparent"}`,boxShadow:newG.color===col?`0 0 0 3px ${col}`:C.shadow,transition:"all 0.1s"}}/>)}
          <label style={{width:36,height:36,borderRadius:10,cursor:"pointer",border:`2px dashed ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",overflow:"hidden",background:GP.includes(newG.color)?C.bg:newG.color}}>
            {GP.includes(newG.color)&&<span style={{color:C.textSoft}}>🎨</span>}
            <input type="color" value={newG.color} onChange={e=>setNewG(p=>({...p,color:e.target.value}))} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/>
          </label>
          <span style={{fontSize:11,color:C.textSoft}}>{GP.includes(newG.color)?"o elegí cualquier color":newG.color}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}><Btn onClick={add} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {genetics.map(g=><Card key={g.id} style={{padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:14,background:g.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,color:"#fff",fontWeight:900}}>{g.name[0]}</div>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:C.text}}>{g.name}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><div style={{width:12,height:12,borderRadius:"50%",background:g.color}}/>{g.flower_days&&<span style={{fontSize:12,color:C.textSoft}}>~{g.flower_days}d</span>}</div>{g.notes&&<div style={{fontSize:12,color:C.textSoft,marginTop:4,fontStyle:"italic"}}>{g.notes.substring(0,60)}{g.notes.length>60?"...":""}</div>}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <Btn onClick={()=>setShowLib(g)} v="secondary" style={{padding:"8px 12px",fontSize:14}}>📖</Btn>
          {user.role==="admin"&&<Btn onClick={()=>setEditG(g)} v="secondary" style={{padding:"8px 12px",fontSize:14}}>✎ Editar</Btn>}
          {user.role==="admin"&&<Btn onClick={()=>del(g.id,g.name)} v="danger" style={{padding:"8px 14px",fontSize:12}}>Eliminar</Btn>}
        </div>
      </div></Card>)}
    </div>
  </div>;
}

// ESTADÍSTICAS
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
    ]).then(([tasks,wl,nl,closed,cgAll,climate,active])=>{
      const climByRoom={};(climate||[]).forEach(c=>{if(!climByRoom[c.room_id])climByRoom[c.room_id]=c;});
      const activeByRoom={};(active||[]).forEach(c=>{if(!activeByRoom[c.room_id])activeByRoom[c.room_id]=c;});
      const byUser={};
      tasks.forEach(t=>{if(!byUser[t.assignee])byUser[t.assignee]={total:0,done:0};byUser[t.assignee].total++;if(t.status==="completada")byUser[t.assignee].done++;});
      const byType={};
      tasks.forEach(t=>{byType[t.type]=(byType[t.type]||0)+1;});
      const wByRoom={};(rooms||["S1","S2"]).forEach(r=>{wByRoom[r]=0;});
      wl.forEach(w=>{if(wByRoom[w.room_id]!==undefined)wByRoom[w.room_id]++;});
      // Rendimiento por ciclo cerrado: g, plantas, g/planta, días real vs estimado
      const cgByCycle={};(cgAll||[]).forEach(g=>{(cgByCycle[g.cycle_id]=cgByCycle[g.cycle_id]||[]).push(g);});
      const cycleStats=(closed||[]).map(c=>{
        const gs=cgByCycle[c.id]||[];
        const plants=gs.reduce((a,g)=>a+(g.plant_count||0),0);
        const grams=c.yield_grams||gs.reduce((a,g)=>a+(g.yield_grams||0),0);
        const realDays=c.flower_start&&c.real_harvest?Math.round((new Date(c.real_harvest)-new Date(c.flower_start))/86400000):null;
        const estDays=c.flower_start&&c.estimated_harvest?Math.round((new Date(c.estimated_harvest)-new Date(c.flower_start))/86400000):null;
        const area=getRC(roomConfig,c.room_id).area_m2;
        const gm2=area&&grams?Math.round(grams/area):null;
        return {id:c.id,room:c.room_id,closed_at:c.closed_at,grams,plants,gpp:plants>0&&grams>0?Math.round(grams/plants):null,gm2,realDays,estDays};
      });
      // Rendimiento acumulado por genética (sobre ciclos cerrados)
      const byGen={};(cgAll||[]).forEach(g=>{if(!byGen[g.genetic_name])byGen[g.genetic_name]={grams:0,plants:0};byGen[g.genetic_name].grams+=g.yield_grams||0;byGen[g.genetic_name].plants+=g.plant_count||0;});
      const genStats=Object.entries(byGen).map(([name,d])=>({name,...d,gpp:d.plants>0&&d.grams>0?Math.round(d.grams/d.plants):null})).filter(g=>g.grams>0).sort((a,b)=>b.grams-a.grams);
      // Balance del suelo: ciclos cerrados desde el último Reset Express por sala.
      const soil=(rooms||["S1","S2"]).map(r=>{
        const rcR=getRC(roomConfig,r);
        const lr=rcR.last_reset_at?new Date(rcR.last_reset_at):null;
        const rcClosed=(closed||[]).filter(c=>c.room_id===r&&c.closed_at).sort((a,b)=>new Date(b.closed_at)-new Date(a.closed_at));
        const lastClosed=rcClosed[0]||null;
        const since=lr?rcClosed.filter(c=>new Date(c.closed_at)>lr).length:rcClosed.length;
        const resetPending=!!lastClosed&&(!lr||lr<new Date(lastClosed.closed_at));
        return {room:r,name:rcR.display_name,lastReset:rcR.last_reset_at||null,closedCount:rcClosed.length,since,resetPending};
      });
      setStats({byUser,byType,wByRoom,total:tasks.length,done:tasks.filter(t=>t.status==="completada").length,wCount:wl.length,nCount:nl.length,cycleStats,genStats,soil,climByRoom,activeByRoom});
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
  const pct=(d,t)=>t>0?Math.round(d/t*100):0;
  const maxU=Math.max(...Object.values(stats.byUser).map(u=>u.total),1);
  // Serie de clima por sala para los gráficos comparativos
  const CL_ROOMS=[...(rooms||["S1","S2"]),"Vegetativo"];
  const CL_COLORS=[C.green,C.amber,C.blue,C.purple,C.red];
  const clFor=field=>CL_ROOMS.map((r,i)=>({
    name:getRC(roomConfig,r).display_name,
    color:CL_COLORS[i%CL_COLORS.length],
    points:clSeries.filter(c=>c.room_id===r&&c[field]!=null).map(c=>({x:new Date(c.recorded_at).getTime(),y:+c[field]})),
  })).filter(s=>s.points.length>0);
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Estadísticas</div>
    {stats.climByRoom&&<Card>
      <SL>🌡 Clima en vivo</SL>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[...(rooms||["S1","S2"]),"Vegetativo"].map(r=>{const cl=stats.climByRoom[r];const rc=getRC(roomConfig,r);const tg=getTargets(targets,r,stats.activeByRoom?.[r]||null,rc);const tR=tg.temp,hR=tg.hum;return <div key={r} style={{background:C.bg,borderRadius:14,padding:"12px 12px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,textAlign:"center"}}>{rc.display_name}</div>
          {[["🌡",cl&&cl.temperature!=null?`${cl.temperature}°C`:"—",C.amber,cl&&cl.temperature!=null&&(cl.temperature<tR.min||cl.temperature>tR.max)],["💧",cl&&cl.humidity!=null?`${cl.humidity}%`:"—",C.blue,cl&&cl.humidity!=null&&(cl.humidity<hR.min||cl.humidity>hR.max)],["🍃",cl&&cl.vpd!=null?cl.vpd:"—",C.purple,false]].map((row,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}><span style={{fontSize:13}}>{row[0]}</span><span style={{fontFamily:MONO,fontWeight:700,fontSize:14,color:row[3]?C.red:row[2]}}>{row[1]}</span></div>)}
        </div>;})}
      </div>
      <div style={{fontSize:11,color:C.textSoft,marginTop:8,fontStyle:"italic"}}>Última lectura de cada sensor · se actualiza sola</div>
    </Card>}
    <Card>
      <SL>📈 Clima comparado</SL>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["24h","24 h"],["7d","7 días"],["30d","30 días"]].map(([k,l])=><button key={k} onClick={()=>setClRange(k)} style={{flex:1,fontSize:12.5,fontWeight:700,padding:"8px 0",borderRadius:9,cursor:"pointer",border:`1px solid ${clRange===k?C.green:C.border}`,background:clRange===k?C.greenLight:"transparent",color:clRange===k?C.green:C.textSoft}}>{l}</button>)}
      </div>
      {clSeries.length===0
        ?<div style={{textAlign:"center",color:C.textSoft,fontSize:13,fontStyle:"italic",padding:"16px 0"}}>Sin datos en este rango todavía</div>
        :<>
          <div style={{fontSize:11,color:C.textSoft,marginBottom:8,fontStyle:"italic"}}>Las tres salas superpuestas · tocá o arrastrá el dedo sobre el gráfico para ver hora y valores</div>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,marginBottom:4}}>🌡 Temperatura (°C)</div>
          <LineChart series={clFor("temperature")} unit="°C" height={160}/>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,margin:"14px 0 4px"}}>💧 Humedad (%)</div>
          <LineChart series={clFor("humidity")} unit="%" height={160}/>
          <div style={{fontSize:11,fontWeight:700,color:C.textSoft,margin:"14px 0 4px"}}>🍃 VPD (kPa)</div>
          <LineChart series={clFor("vpd")} unit=" kPa" height={160}/>
          <div style={{fontSize:11,color:C.textSoft,marginTop:10,fontStyle:"italic"}}>Sin franja objetivo: cada sala tiene su propio rango según la etapa. Los objetivos por sala están en Sala 1 / Sala 2 / Vegetativo.</div>
        </>}
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
      {[{l:"Riegos registrados",v:stats.wCount,i:"💧",c:C.blue},{l:"Aplicaciones nutrición",v:stats.nCount,i:"🌱",c:C.green}].map(s=><Card key={s.l} style={{padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:11,color:C.textSoft,marginBottom:4}}>{s.l}</div><div style={{fontSize:32,fontWeight:900,color:s.c,fontFamily:H}}>{s.v}</div></div>
          <span style={{fontSize:24}}>{s.i}</span>
        </div>
      </Card>)}
    </div>
    {stats.soil&&stats.soil.length>0&&<Card>
      <SL>🌱 Balance del suelo · Reset Express</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {stats.soil.map(s=><div key={s.room} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:s.resetPending?C.amberLight:C.bg,borderRadius:12,border:`1px solid ${s.resetPending?"#E8C07A":C.border}`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>{s.name}</div>
            <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>Último reset: {s.lastReset?fmtDate(s.lastReset):"nunca"} · {s.closedCount} ciclo(s) cerrado(s)</div>
          </div>
          {s.resetPending
            ?<Badge label="Reset pendiente" color={C.amber} bg={C.surface}/>
            :<Badge label="Al día ✓" color={C.green} bg={C.greenLight}/>}
        </div>)}
      </div>
      <div style={{fontSize:11.5,color:C.textSoft,marginTop:10,lineHeight:1.5}}>En tu sistema de alta rotación conviene recargar el suelo (Reset Express) entre ciclos. Si quedó una cosecha sin reset posterior, aparece como pendiente. El cronograma se genera solo al cerrar el ciclo o desde la Guía.</div>
    </Card>}
    {stats.genStats.length>0&&<Card>
      <SL>🌾 Rendimiento por genética (ciclos cerrados)</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {(()=>{const max=Math.max(...stats.genStats.map(g=>g.grams),1);return stats.genStats.map(g=>
          <div key={g.name}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>{g.name}</span><span style={{fontSize:13,color:C.textMid,fontWeight:700}}>{g.grams} g{g.gpp?` · ${g.gpp} g/pl`:""}</span></div>
            <Bar value={g.grams} max={max} color={C.green} h={7}/>
          </div>);})()}
      </div>
      <div style={{fontSize:11.5,color:C.textSoft,marginTop:10,lineHeight:1.5}}>Se nutre de los gramos por genética cargados al cerrar cada ciclo.</div>
    </Card>}
    {stats.cycleStats.length>0&&<Card>
      <SL>📦 Ciclos cerrados</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {stats.cycleStats.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:C.bg,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{width:42,height:42,borderRadius:10,background:C.greenLight,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:800,color:C.green}}>{c.room}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.grams?`${c.grams} g`:"Sin rendimiento"}{c.gm2?` · ${c.gm2} g/m²`:""}{c.gpp?` · ${c.gpp} g/planta`:""}</div>
            <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>
              {c.plants} plantas{c.closed_at?` · cerrado ${fmtDate(c.closed_at)}`:""}
              {c.realDays!=null?` · ${c.realDays}d real${c.estDays!=null?` vs ${c.estDays}d est.`:""}`:""}
            </div>
          </div>
          {c.realDays!=null&&c.estDays!=null&&<Badge label={c.realDays>c.estDays?`+${c.realDays-c.estDays}d`:c.realDays<c.estDays?`${c.realDays-c.estDays}d`:"en fecha"} color={c.realDays===c.estDays?C.green:C.amber} bg={c.realDays===c.estDays?C.greenLight:C.amberLight}/>}
        </div>)}
      </div>
    </Card>}
    <Card>
      <SL>Riegos por sala</SL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {Object.entries(stats.wByRoom).map(([room,count])=><div key={room} style={{background:C.bg,borderRadius:12,padding:14,textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{room}</div>
          <div style={{fontSize:36,fontWeight:900,color:C.blue,fontFamily:H}}>{count}</div>
          <div style={{fontSize:11,color:C.textSoft}}>riegos</div>
        </div>)}
      </div>
    </Card>
  </div>;
}

// PLAGAS
function PlagasPage({user,rooms}){
  const [records,setRecords]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [toast,setToast]=useState(null);
  const [newR,setNewR]=useState({room_id:"S1",pest_type:"",product:"",frequency_days:2,notes:"",detected_at:todayISO});
  const [saving,setSaving]=useState(false);
  useEffect(()=>{db.query("activity_log","entity_type=eq.pest&order=created_at.desc&limit=50").then(data=>{setRecords(data.map(d=>({...d,...(d.details||{})})));}).finally(()=>setLoading(false));},[]);
  const save=async()=>{
    if(!newR.pest_type.trim())return;
    setSaving(true);
    try{
      await db.insert("activity_log",{user_name:user.name,action:`Registró plaga: ${newR.pest_type} en ${newR.room_id}`,entity_type:"pest",details:newR});
      setRecords(prev=>[{user_name:user.name,action:`Registró: ${newR.pest_type}`,created_at:new Date().toISOString(),...newR},...prev]);
      setShowForm(false);
      setToast({msg:"Registro guardado ✓",type:"success"});
    }finally{setSaving(false);}
  };
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>Plagas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Registrar</Btn>
    </div>
    {showForm&&<Card>
      <SL>Nuevo registro</SL>
      <FS label="Sala" value={newR.room_id} onChange={e=>setNewR(p=>({...p,room_id:e.target.value}))} options={[...(rooms||["S1","S2"]),"Vegetativo"]}/>
      <FI label="Tipo de plaga / problema *" value={newR.pest_type} onChange={e=>setNewR(p=>({...p,pest_type:e.target.value}))} placeholder="Ej: Araña roja, Trips, Oídio"/>
      <FI label="Producto usado" value={newR.product} onChange={e=>setNewR(p=>({...p,product:e.target.value}))} placeholder="Ej: Aceite de Neem"/>
      <FI label="Fecha de detección" type="date" value={newR.detected_at} onChange={e=>setNewR(p=>({...p,detected_at:e.target.value}))}/>
      <NumField label="Próxima aplicación (días)" value={newR.frequency_days} onCommit={v=>setNewR(p=>({...p,frequency_days:v===""?0:v}))} min={0} max={365}/>
      <FI label="Notas" value={newR.notes} onChange={e=>setNewR(p=>({...p,notes:e.target.value}))} placeholder="Severidad, observaciones"/>
      <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}
    {loading?<Spin/>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {records.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>Sin registros de plagas 🌿</div>}
      {records.map((r,i)=>{
        const nextApp=r.detected_at&&r.frequency_days?addDays(r.detected_at,r.frequency_days):null;
        const dNext=nextApp?daysTo(nextApp):null;
        return <Card key={i} style={{padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div><div style={{fontSize:15,fontWeight:800,color:C.text}}>🔬 {r.pest_type}</div><div style={{fontSize:12,color:C.textSoft}}>{r.room_id} · {r.user_name} · {r.detected_at?fmtDate(r.detected_at):fmtDate(r.created_at)}</div></div>
            <Badge label={r.room_id} color={C.purple} bg={C.purpleLight}/>
          </div>
          {r.product&&<div style={{fontSize:13,color:C.textMid,marginBottom:6}}>💊 {r.product}</div>}
          {r.notes&&<div style={{fontSize:12,color:C.textSoft,fontStyle:"italic",marginBottom:8}}>{r.notes}</div>}
          {nextApp&&<div style={{background:dNext!==null&&dNext<=0?C.redLight:C.amberLight,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:dNext!==null&&dNext<=0?C.red:C.amber,fontWeight:600}}>Próx. aplicación: {fmtDate(nextApp)}</span>
            <span style={{fontSize:12,fontWeight:700,color:dNext!==null&&dNext<=0?C.red:C.amber}}>{dNext!==null&&dNext<=0?"Vencida":`en ${dNext}d`}</span>
          </div>}
        </Card>;
      })}
    </div>}
  </div>;
}

// CALENDARIO — vista mensual + historial de lo hecho
function CalendarioPage({user}){
  const [ref,setRef]=useState(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()};});
  const [tasks,setTasks]=useState([]);
  const [milestones,setMilestones]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selDay,setSelDay]=useState(todayISO);

  const monthStart=new Date(ref.y,ref.m,1);
  const monthEnd=new Date(ref.y,ref.m+1,0);
  const startISO=`${ref.y}-${String(ref.m+1).padStart(2,"0")}-01`;
  const endISO=`${ref.y}-${String(ref.m+1).padStart(2,"0")}-${String(monthEnd.getDate()).padStart(2,"0")}`;

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([
      db.query("tasks",`due_date=gte.${startISO}&due_date=lte.${endISO}&order=due_date.asc`),
      db.query("cycle_milestones",`due_date=gte.${startISO}&due_date=lte.${endISO}`),
    ]).then(([t,m])=>{setTasks(t);setMilestones(m);}).catch(()=>{setTasks([]);setMilestones([]);}).finally(()=>setLoading(false));
  },[startISO,endISO]);
  useEffect(()=>{load();},[load]);

  // Tipos de hito que se marcan de forma destacada
  const HITO_TYPES={start:{l:"Inicio floración",c:"#B8860B",icon:"🌼"},cosecha:{l:"Cosecha",c:"#B83228",icon:"✂️"},lavado:{l:"Lavado",c:"#1E5FAD",icon:"💧"},poda:{l:"Poda",c:"#6B4FA0",icon:"🌿"}};
  const milesOf=(ds)=>milestones.filter(m=>m.due_date===ds&&HITO_TYPES[m.type]);

  const monthName=monthStart.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  // construir grilla: empezar en lunes
  const firstWeekday=(monthStart.getDay()+6)%7; // 0=lunes
  const daysInMonth=monthEnd.getDate();
  const cells=[];
  for(let i=0;i<firstWeekday;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(`${ref.y}-${String(ref.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  const tasksOf=(ds)=>tasks.filter(t=>t.due_date===ds);
  const dayTasks=tasksOf(selDay);
  const prevMonth=()=>setRef(r=>r.m===0?{y:r.y-1,m:11}:{y:r.y,m:r.m-1});
  const nextMonth=()=>setRef(r=>r.m===11?{y:r.y+1,m:0}:{y:r.y,m:r.m+1});

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Agenda</div>
    <Card style={{padding:"14px 14px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={prevMonth} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,color:C.textMid}}>‹</button>
        <span style={{fontSize:16,fontWeight:800,color:C.text,textTransform:"capitalize"}}>{monthName}</span>
        <button onClick={nextMonth} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,color:C.textMid}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.textSoft,padding:"2px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((ds,i)=>{
          if(!ds)return <div key={i}/>;
          const dt=tasksOf(ds);
          const ms=milesOf(ds);
          const topHito=ms[0]?HITO_TYPES[ms[0].type]:null;
          const isToday=ds===todayISO;
          const isSel=ds===selDay;
          const allDone=dt.length>0&&dt.every(t=>t.status==="completada");
          const hasPend=dt.some(t=>t.status==="pendiente");
          const ringColor=topHito?topHito.c:isSel?C.green:isToday?C.borderStrong:"transparent";
          return <button key={i} onClick={()=>setSelDay(ds)} style={{aspectRatio:"1",borderRadius:9,border:`${topHito?2.5:1.5}px solid ${ringColor}`,background:isSel?C.greenLight:topHito?topHito.c+"18":isToday?C.bg:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:0,position:"relative"}}>
            {topHito&&<span style={{position:"absolute",top:1,right:2,fontSize:9}}>{topHito.icon}</span>}
            <span style={{fontSize:13,fontWeight:isToday||isSel||topHito?800:500,color:topHito?topHito.c:isToday?C.green:C.text}}>{+ds.slice(-2)}</span>
            {dt.length>0&&<span style={{width:5,height:5,borderRadius:"50%",background:allDone?C.green:hasPend?C.amber:C.blue}}/>}
          </button>;
        })}
      </div>
    </Card>

    <div>
      <SL>{selDay===todayISO?"Hoy":fmtDate(selDay)}</SL>
      {milesOf(selDay).length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {milesOf(selDay).map((m,idx)=>{const h=HITO_TYPES[m.type];return <div key={idx} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:h.c+"18",border:`2px solid ${h.c}`}}>
          <div style={{width:30,height:30,borderRadius:8,background:h.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{h.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:h.c}}>{m.label||h.l}</div><div style={{fontSize:11,color:C.textSoft}}>Hito del ciclo</div></div>
        </div>;})}
      </div>}
      <div style={{fontSize:12,color:C.textSoft,marginBottom:8}}>{dayTasks.length} tarea{dayTasks.length!==1?"s":""}</div>
      {loading?<Spin/>:dayTasks.length===0
        ?<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>Sin tareas este día</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {dayTasks.map(t=>{const tm=TM[t.type]||TM.revision;return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:t.status==="completada"?C.greenLight:C.surface,border:`1px solid ${C.border}`,opacity:t.status==="completada"?0.7:1,boxShadow:C.shadow}}>
            <div style={{width:30,height:30,borderRadius:8,background:tm.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{tm.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,textDecoration:t.status==="completada"?"line-through":"none"}}>{t.title}</div>
              <div style={{fontSize:11,color:C.textSoft}}>{t.room_id?`${t.room_id} · `:""}{t.assignee}{t.completed_at?` · hecho ${fmtDate(t.completed_at.split("T")[0])}`:""}</div>
            </div>
            {t.status==="completada"?<span style={{fontSize:11,color:C.green,fontWeight:700}}>✓ Hecho</span>:<span style={{fontSize:11,color:C.amber,fontWeight:700}}>Pendiente</span>}
          </div>;})}
        </div>}
    </div>

    <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",fontSize:11,color:C.textSoft,paddingTop:4}}>
      <span><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.green,marginRight:4}}/>Todo hecho</span>
      <span><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.amber,marginRight:4}}/>Pendiente</span>
      <span>🌼✂️ Hitos del ciclo</span>
    </div>
  </div>;
}

// COMPRAS / FALTANTES
function ComprasPage({user}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [showDone,setShowDone]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [newI,setNewI]=useState({name:"",category:"general",quantity:"",notes:""});
  const CATS=["general","limpieza","insumos","herramientas","fertilizantes","otros"];
  const CAT_ICON={general:"📦",limpieza:"🧽",insumos:"🌿",herramientas:"🔧",fertilizantes:"🧪",otros:"📌"};

  const load=useCallback(()=>{
    setLoading(true);
    db.query("shopping_items","order=created_at.desc").then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);

  const add=async()=>{
    if(!newI.name.trim())return;
    setSaving(true);
    try{
      const ins=await db.insert("shopping_items",{name:newI.name.trim(),category:newI.category,quantity:newI.quantity||null,notes:newI.notes||null,status:"pendiente",requested_by:user.name});
      await logA(user.name,`Pidió comprar: ${newI.name}`,"compras");
      setItems(prev=>[ins[0],...prev]);setShowForm(false);
      setNewI({name:"",category:"general",quantity:"",notes:""});
      setToast({msg:"Agregado ✓",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const toggle=async(it)=>{
    const ns=it.status==="comprado"?"pendiente":"comprado";
    await db.update("shopping_items",it.id,{status:ns,purchased_by:ns==="comprado"?user.name:null,purchased_at:ns==="comprado"?new Date().toISOString():null});
    await logA(user.name,`${ns==="comprado"?"Compró":"Reabrió"}: ${it.name}`,"compras");
    setItems(prev=>prev.map(x=>x.id===it.id?{...x,status:ns,purchased_by:ns==="comprado"?user.name:null}:x));
    const undo=async()=>{
      await db.update("shopping_items",it.id,{status:it.status,purchased_by:it.purchased_by||null,purchased_at:it.purchased_at||null});
      setItems(prev=>prev.map(x=>x.id===it.id?{...x,status:it.status,purchased_by:it.purchased_by}:x));
    };
    setToast({msg:ns==="comprado"?"Marcado comprado ✓":"Reabierto",type:"success",undo});
  };
  const del=async(it)=>{
    if(!window.confirm(`¿Eliminar "${it.name}" de la lista?`))return;
    await db.delete("shopping_items",it.id);
    setItems(prev=>prev.filter(x=>x.id!==it.id));setToast({msg:"Eliminado",type:"success"});
  };

  const pending=items.filter(i=>i.status==="pendiente");
  const bought=items.filter(i=>i.status==="comprado");

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>Compras</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Agregar</Btn>
    </div>
    <div style={{fontSize:13,color:C.textSoft}}>Anotá lo que falta comprar — cualquiera puede agregar y marcar como comprado.</div>

    {showForm&&<Card>
      <SL>¿Qué falta?</SL>
      <FI label="Producto *" value={newI.name} onChange={e=>setNewI(p=>({...p,name:e.target.value}))} placeholder="Ej: Lavandina, guantes, perlita..."/>
      <FS label="Categoría" value={newI.category} onChange={e=>setNewI(p=>({...p,category:e.target.value}))} options={CATS}/>
      <FI label="Cantidad (opcional)" value={newI.quantity} onChange={e=>setNewI(p=>({...p,quantity:e.target.value}))} placeholder="Ej: 2 litros, 1 unidad"/>
      <FT label="Notas (opcional)" value={newI.notes} onChange={e=>setNewI(p=>({...p,notes:e.target.value}))} placeholder="Marca preferida, dónde comprarlo, etc." rows={2}/>
      <div style={{display:"flex",gap:10}}><Btn onClick={add} disabled={saving||!newI.name.trim()} style={{flex:1}}>{saving?"Guardando...":"Agregar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}

    {loading?<Spin/>:<>
      <SL>Por comprar ({pending.length})</SL>
      {pending.length===0
        ?<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"16px 0"}}>Nada pendiente 👌</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pending.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:14,background:C.surface,border:`1.5px solid ${C.border}`,boxShadow:C.shadow}}>
            <button onClick={()=>toggle(it)} style={{width:28,height:28,borderRadius:9,flexShrink:0,background:"transparent",border:`2px solid ${C.borderStrong}`,cursor:"pointer"}}/>
            <div style={{width:34,height:34,borderRadius:9,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{CAT_ICON[it.category]||"📦"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{it.name}{it.quantity?<span style={{color:C.textSoft,fontWeight:500}}> · {it.quantity}</span>:""}</div>
              <div style={{fontSize:11,color:C.textSoft}}>{it.category} · pidió {it.requested_by}{it.notes?` · ${it.notes}`:""}</div>
            </div>
            <button onClick={()=>del(it)} style={{background:"transparent",border:"none",color:C.red,fontSize:11,cursor:"pointer"}}>✕</button>
          </div>)}
        </div>}

      {bought.length>0&&<>
        <button onClick={()=>setShowDone(!showDone)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0",marginTop:8}}>{showDone?"▲":"▼"} Comprados ({bought.length})</button>
        {showDone&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.65}}>
          {bought.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 15px",borderRadius:14,background:C.greenLight,border:`1px solid ${C.green}33`}}>
            <button onClick={()=>toggle(it)} style={{width:26,height:26,borderRadius:8,flexShrink:0,background:C.green,border:"none",cursor:"pointer",color:"#fff",fontSize:14}}>✓</button>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,textDecoration:"line-through"}}>{it.name}{it.quantity?` · ${it.quantity}`:""}</div>
              <div style={{fontSize:11,color:C.textSoft}}>comprado por {it.purchased_by||"?"}</div>
            </div>
            <button onClick={()=>del(it)} style={{background:"transparent",border:"none",color:C.red,fontSize:11,cursor:"pointer"}}>✕</button>
          </div>)}
        </div>}
      </>}
    </>}
  </div>;
}

// CONFIGURACIÓN (solo admins)
function ConfigPage({user,roomConfig,onChanged,textScale,setTextScale}){
  const [tab,setTab]=useState("salas");
  const [rows,setRows]=useState([]);
  const [cloners,setCloners]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [saving,setSaving]=useState(false);
  const [showAddRoom,setShowAddRoom]=useState(false);
  const [showAddCloner,setShowAddCloner]=useState(false);
  const [newRoom,setNewRoom]=useState({room_id:"",display_name:"",irrigation_type:"manual"});
  const [newCloner,setNewCloner]=useState({label:"",capacity:48});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      let rc=await db.get("room_config");
      // Garantizar que S1 y S2 existan siempre
      const have=rc.map(r=>r.room_id);
      const seed=[{room_id:"S1",display_name:"Sala 1",irrigation_type:"automático",sort_order:0},{room_id:"S2",display_name:"Sala 2",irrigation_type:"manual",sort_order:1}].filter(s=>!have.includes(s.room_id));
      if(seed.length>0){
        for(const s of seed){try{await db.insert("room_config",{...s,...RC_DEFAULTS});}catch{}}
        rc=await db.get("room_config");
      }
      // Mostrar solo S1 y S2 (sacamos salas extra como la S3 dormida)
      rc=rc.filter(r=>r.room_id==="S1"||r.room_id==="S2");
      const cl=await db.get("cloners");
      setRows(rc.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));setCloners(cl);
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  if(user.role!=="admin")return <div style={{textAlign:"center",padding:"40px 20px",color:C.textSoft}}>Solo administradores</div>;

  const setField=(id,field,val)=>setRows(prev=>prev.map(r=>r.id===id?{...r,[field]:val}:r));
  const saveRoom=async(r)=>{
    setSaving(true);
    try{
      await db.update("room_config",r.id,{
        display_name:r.display_name,
        flower_days:+r.flower_days||65,flush_days:+r.flush_days||20,
        harvest_days:+r.harvest_days||5,veg_days:+r.veg_days||0,
        area_m2:r.area_m2===""||r.area_m2==null?null:+r.area_m2,
        volume_l:r.volume_l===""||r.volume_l==null?null:+r.volume_l,
        temp_min:r.temp_min===""||r.temp_min==null?null:+r.temp_min,
        temp_max:r.temp_max===""||r.temp_max==null?null:+r.temp_max,
        hum_min:r.hum_min===""||r.hum_min==null?null:+r.hum_min,
        hum_max:r.hum_max===""||r.hum_max==null?null:+r.hum_max,
        irrigation_type:r.irrigation_type||"manual",
      });
      await logA(user.name,`Configuró sala ${r.room_id}`,"config");
      setToast({msg:"Guardado ✓",type:"success"});
      onChanged&&onChanged();
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const addRoom=async()=>{
    if(!newRoom.room_id.trim())return;
    setSaving(true);
    try{
      await db.insert("room_config",{room_id:newRoom.room_id.trim(),display_name:newRoom.display_name.trim()||newRoom.room_id.trim(),irrigation_type:newRoom.irrigation_type,sort_order:rows.length,...RC_DEFAULTS});
      await logA(user.name,`Creó sala ${newRoom.room_id}`,"config");
      setNewRoom({room_id:"",display_name:"",irrigation_type:"manual"});
      setShowAddRoom(false);setToast({msg:"Sala creada ✓",type:"success"});
      load();onChanged&&onChanged();
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const delRoom=async(r)=>{
    if(!window.confirm(`¿Eliminar la sala ${r.room_id}? Esto borra su configuración (no los ciclos ni registros).`))return;
    await db.delete("room_config",r.id);
    await logA(user.name,`Eliminó sala ${r.room_id}`,"config");
    setRows(prev=>prev.filter(x=>x.id!==r.id));setToast({msg:"Sala eliminada",type:"success"});
    onChanged&&onChanged();
  };
  const saveCloner=async(cl)=>{
    setSaving(true);
    try{await db.update("cloners",cl.id,{label:cl.label,capacity:+cl.capacity||48});setToast({msg:"Esquejera guardada ✓",type:"success"});}
    catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const setClonerField=(id,field,val)=>setCloners(prev=>prev.map(c=>c.id===id?{...c,[field]:val}:c));
  const addCloner=async()=>{
    if(!newCloner.label.trim())return;
    setSaving(true);
    try{
      await db.insert("cloners",{label:newCloner.label.trim(),capacity:+newCloner.capacity||48});
      setNewCloner({label:"",capacity:48});setShowAddCloner(false);setToast({msg:"Esquejera creada ✓",type:"success"});load();
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };
  const delCloner=async(cl)=>{
    if(!window.confirm(`¿Eliminar ${cl.label}? Se borran sus slots.`))return;
    await db.deleteWhere("cloner_slots","cloner_id",cl.id);
    await db.delete("cloners",cl.id);
    setCloners(prev=>prev.filter(c=>c.id!==cl.id));setToast({msg:"Esquejera eliminada",type:"success"});
  };

  const numField=(r,field,label)=>(
    <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:C.textSoft}}>
      {label}
      <NumField value={r[field]??""} onCommit={v=>setField(r.id,field,v)} min={0}/>
    </label>
  );

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.undo} onClose={()=>setToast(null)}/>}
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H,paddingTop:8}}>Configuración</div>
    {setTextScale&&<TextScaleControl textScale={textScale} setTextScale={setTextScale}/>}
    <div style={{display:"flex",gap:8}}>
      {[{id:"salas",l:"🏠 Salas"},{id:"clima",l:"🌡 Clima"},{id:"esquejeras",l:"🌿 Esquejeras"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"11px 6px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700,background:tab===t.id?C.green:C.surface,color:tab===t.id?"#fff":C.textMid,border:`1.5px solid ${tab===t.id?C.green:C.border}`}}>{t.l}</button>)}
    </div>

    {loading?<Spin/>:<>
      {/* SALAS Y FASES */}
      {tab==="salas"&&<>
        {rows.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"20px 0"}}>Cargando salas...</div>}
        {rows.map(r=><Card key={r.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Badge label={r.room_id} color={C.green} bg={C.greenLight}/>
              <input value={r.display_name||""} onChange={e=>setField(r.id,"display_name",e.target.value)} placeholder="Nombre" style={{fontSize:16,fontWeight:800,color:C.text,border:"none",borderBottom:`1.5px solid ${C.border}`,background:"transparent",outline:"none",padding:"2px 0",maxWidth:140}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {numField(r,"flower_days","Días floración")}
            {numField(r,"flush_days","Días lavado (antes cosecha)")}
            {numField(r,"harvest_days","Días cosechando")}
            {numField(r,"veg_days","Días vegetativo post-cosecha")}
            {numField(r,"area_m2","Área cultivada (m²)")}
            {numField(r,"volume_l","Volumen sustrato (L)")}
          </div>
          <FS label="Tipo de riego" value={r.irrigation_type||"manual"} onChange={e=>setField(r.id,"irrigation_type",e.target.value)} options={["manual","automático"]}/>
          <Btn onClick={()=>saveRoom(r)} disabled={saving} full style={{marginTop:4}}>{saving?"Guardando...":"Guardar sala"}</Btn>
        </Card>)}
      </>}

      {/* CLIMA — rangos ideales */}
      {tab==="clima"&&<>
        <div style={{fontSize:13,color:C.textSoft,lineHeight:1.5}}>Definí los rangos ideales de temperatura (°C) y humedad (%) por sala. Se usarán como referencia visual cuando cargues mediciones.</div>
        {rows.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"20px 0"}}>Configurá una sala primero en la pestaña Salas</div>}
        {rows.map(r=><Card key={r.id}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <Badge label={r.room_id} color={C.blue} bg={C.blueLight}/>
            <span style={{fontSize:16,fontWeight:800,color:C.text}}>{r.display_name||r.room_id}</span>
          </div>
          <div style={{fontSize:13,color:C.textMid,lineHeight:1.55,background:C.bg,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
            Los objetivos de temperatura y humedad ahora se definen <b>por etapa</b> (vega, flora temprana/media/tardía) y se editan desde cada sala: entrá a <b>{r.display_name||r.room_id}</b> → tarjeta de clima → <b>✎ Editar</b>. Estos rangos únicos por sala quedaron obsoletos.
          </div>
        </Card>)}
      </>}

      {/* ESPEJERAS */}
      {tab==="esquejeras"&&<>
        <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setShowAddCloner(!showAddCloner)} v="secondary" style={{fontSize:13}}>+ Agregar esquejera</Btn></div>
        {showAddCloner&&<Card>
          <SL>Nueva esquejera</SL>
          <FI label="Nombre *" value={newCloner.label} onChange={e=>setNewCloner(p=>({...p,label:e.target.value}))} placeholder="Ej: Esquejera 4"/>
          <NumField label="Capacidad" value={newCloner.capacity} onCommit={v=>setNewCloner(p=>({...p,capacity:v}))} min={1} max={200}/>
          <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={addCloner} disabled={saving||!newCloner.label.trim()} style={{flex:1}}>{saving?"...":"Crear"}</Btn><Btn onClick={()=>setShowAddCloner(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
        </Card>}
        {cloners.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"20px 0"}}>Sin esquejeras</div>}
        {cloners.map(cl=><Card key={cl.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:15,fontWeight:800,color:C.text}}>🌿</span>
            <button onClick={()=>delCloner(cl)} style={{fontSize:11,color:C.red,background:"transparent",border:"none",cursor:"pointer"}}>Eliminar</button>
          </div>
          <FI label="Nombre" value={cl.label||""} onChange={e=>setClonerField(cl.id,"label",e.target.value)}/>
          <NumField label="Capacidad (slots)" value={cl.capacity??48} onCommit={v=>setClonerField(cl.id,"capacity",v)} min={1} max={200}/>
          <Btn onClick={()=>saveCloner(cl)} disabled={saving} full style={{marginTop:4}}>{saving?"Guardando...":"Guardar esquejera"}</Btn>
        </Card>)}
      </>}
    </>}
  </div>;
}

// BOT (Groq vía Edge Function) — chat reutilizable (página + panel flotante)
// currentPage: contexto de la pantalla actual para el bot.
// Maneja el patrón de confirmación (pendingAction) para acciones de Nivel 2.
// BITÁCORA — notas libres del día que la IA traduce a tareas/avisos
function BitacoraPage({user}){
  const [entries,setEntries]=useState([]);
  const [loading,setLoading]=useState(true);
  const [draft,setDraft]=useState("");
  const [entryDate,setEntryDate]=useState(todayISO);
  const [saving,setSaving]=useState(false);
  const [proc,setProc]=useState(null);
  const [plan,setPlan]=useState(null);
  const [planEntry,setPlanEntry]=useState(null);
  const [applying,setApplying]=useState(false);
  const [toast,setToast]=useState(null);

  const load=()=>{setLoading(true);db.query("bitacora","order=created_at.desc").then(setEntries).catch(()=>setEntries([])).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const save=async()=>{
    if(!draft.trim()||saving)return;
    setSaving(true);
    try{
      await db.insert("bitacora",{entry_date:entryDate,author:user.name,content:draft.trim(),processed:false});
      await logA(user.name,"Anotó en la bitácora","bitacora");
      setDraft("");load();setToast({msg:"Nota guardada ✓",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setSaving(false);}
  };

  const process=async(entry)=>{
    setProc(entry.id);
    try{
      const r=await fetch(`${SUPA_URL}/functions/v1/grow-bot`,{
        method:"POST",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({user_name:user.name,mode:"bitacora",texto:entry.content,fecha:entry.entry_date}),
      });
      const data=await r.json();
      if(data.error){setToast({msg:data.error,type:"error"});}
      else if(data.plan){setPlan(data.plan);setPlanEntry(entry);}
    }catch(e){setToast({msg:"No me pude conectar con el asistente.",type:"error"});}
    finally{setProc(null);}
  };

  const applyPlan=async()=>{
    if(!plan||!planEntry||applying)return;
    setApplying(true);
    const now=new Date().toISOString();
    let nH=0,nN=0;
    try{
      // Tareas hechas: buscar pendiente que matchee sala+tipo y marcarla; si no hay, crearla ya hecha.
      let pend=[];
      try{pend=await db.query("tasks","status=eq.pendiente");}catch{pend=[];}
      for(const h of (plan.hechas||[])){
        const sala=h.sala||"S1";
        const idx=pend.findIndex(t=>t.room_id===sala&&(t.type===h.tipo||(h.titulo&&t.title&&t.title.toLowerCase().includes(String(h.titulo).toLowerCase().slice(0,6)))));
        if(idx>=0){await db.update("tasks",pend[idx].id,{status:"completada",completed_at:now});pend.splice(idx,1);}
        else{await db.insert("tasks",{title:h.titulo||"Tarea",room_id:sala,rooms:sala,type:h.tipo||"revision",assignee:user.name,due_date:planEntry.entry_date,priority:"normal",status:"completada",completed_at:now,source:"bitacora",created_by:`bitácora (${user.name})`});}
        nH++;
      }
      // Tareas nuevas: crear pendientes (con dedupe por título+sala+fecha).
      for(const t of (plan.nuevas||[])){
        const sala=t.sala||"S1";const due=t.fecha||planEntry.entry_date;const titulo=t.titulo||"Tarea";
        let dup=[];try{dup=await db.query("tasks",`room_id=eq.${sala}&due_date=eq.${due}&title=eq.${encodeURIComponent(titulo)}`);}catch{}
        if(dup&&dup.length)continue;
        await db.insert("tasks",{title:titulo,room_id:sala,rooms:sala,type:t.tipo||"revision",assignee:user.name,due_date:due,priority:t.prioridad==="alta"?"alta":"normal",status:"pendiente",instructions:t.instrucciones||null,source:"bitacora",created_by:`bitácora (${user.name})`});
        nN++;
      }
      const obs=(plan.observaciones||[]).filter(Boolean);
      const resumen=`${nH} hecha(s), ${nN} nueva(s)${obs.length?` · ${obs.length} obs.`:""}`;
      await db.update("bitacora",planEntry.id,{processed:true,processed_at:now,result:resumen+(obs.length?` — ${obs.join(" | ")}`:"")});
      await logA(user.name,`Procesó bitácora: ${resumen}`,"bitacora");
      setPlan(null);setPlanEntry(null);load();setToast({msg:`Aplicado: ${resumen} ✓`,type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setApplying(false);}
  };

  const TM_={riego:"💧",nutricion:"🌱",poda:"✂️",fumigacion:"🔬",limpieza:"🧹",revision:"👁",cosecha:"🌾"};
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>📓 Bitácora</div>
      <div style={{fontSize:14,color:C.textSoft,marginTop:4,lineHeight:1.5}}>Anotá libre lo que hiciste y viste hoy. Después la IA lo ordena: marca hechas las tareas y crea las nuevas.</div>
    </div>

    {/* Modal de confirmación del plan */}
    {plan&&<Modal title="🤖 Plan propuesto" onClose={()=>{setPlan(null);setPlanEntry(null);}}>
      <div style={{fontSize:13,color:C.textSoft,marginBottom:14,lineHeight:1.5}}>Revisá antes de aplicar. Se marcarán hechas las tareas que ya hiciste y se crearán las nuevas.</div>
      {(plan.hechas||[]).length>0&&<div style={{marginBottom:14}}>
        <SL style={{color:C.green}}>✓ Marcar como hechas</SL>
        {plan.hechas.map((h,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",background:C.greenLight,borderRadius:10,padding:"9px 12px",marginBottom:6}}>
          <span>{TM_[h.tipo]||"✓"}</span><span style={{flex:1,fontSize:13.5,fontWeight:600,color:C.text}}>{h.titulo}</span>
          {h.sala&&<Badge label={h.sala} color={C.green} bg={C.surface}/>}
        </div>)}
      </div>}
      {(plan.nuevas||[]).length>0&&<div style={{marginBottom:14}}>
        <SL style={{color:C.blue}}>+ Tareas nuevas</SL>
        {plan.nuevas.map((t,i)=><div key={i} style={{background:C.blueLight,borderRadius:10,padding:"9px 12px",marginBottom:6}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><span>{TM_[t.tipo]||"•"}</span><span style={{flex:1,fontSize:13.5,fontWeight:700,color:C.text}}>{t.titulo}</span>{t.sala&&<Badge label={t.sala} color={C.blue} bg={C.surface}/>}</div>
          <div style={{fontSize:11.5,color:C.textSoft,marginTop:3}}>{t.fecha||planEntry?.entry_date}{t.prioridad==="alta"?" · alta":""}{t.instrucciones?` · ${t.instrucciones}`:""}</div>
        </div>)}
      </div>}
      {(plan.observaciones||[]).length>0&&<div style={{marginBottom:14}}>
        <SL>📝 Observaciones (se guardan)</SL>
        {plan.observaciones.map((o,i)=><div key={i} style={{fontSize:13,color:C.textMid,background:C.bg,borderRadius:10,padding:"9px 12px",marginBottom:6,lineHeight:1.5}}>{o}</div>)}
      </div>}
      {!(plan.hechas||[]).length&&!(plan.nuevas||[]).length&&!(plan.observaciones||[]).length&&<div style={{fontSize:13.5,color:C.textSoft,fontStyle:"italic",marginBottom:14}}>La IA no encontró tareas ni observaciones para registrar en esta nota.</div>}
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={applyPlan} disabled={applying} full>{applying?"Aplicando...":"Confirmar y aplicar"}</Btn>
        <Btn onClick={()=>{setPlan(null);setPlanEntry(null);}} v="secondary">Cancelar</Btn>
      </div>
    </Modal>}

    {/* Editor de nota nueva */}
    <Card>
      <SL>Nueva entrada</SL>
      <FI label="Fecha" value={entryDate} onChange={e=>setEntryDate(e.target.value)} type="date"/>
      <FT label="Notas del día" value={draft} onChange={e=>setDraft(e.target.value)} rows={5} placeholder="Ej: Regué S1 y S2. Podé la sala 2. Vi cochinillas en el macetón D. Falta comprar melaza. Mañana trasplantar esquejes."/>
      <Btn onClick={save} disabled={saving||!draft.trim()} full>{saving?"Guardando...":"Guardar nota"}</Btn>
    </Card>

    {/* Historial */}
    {loading?<Spin/>:entries.length===0?<Card><div style={{fontSize:14,color:C.textSoft,textAlign:"center",padding:"12px 0"}}>Todavía no hay entradas. Escribí la primera arriba.</div></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <SL>Historial</SL>
        {entries.map(e=><Card key={e.id} style={{padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
            <div style={{fontSize:12.5,fontWeight:700,color:C.textMid}}>{fmtDate(e.entry_date)} · {e.author}</div>
            {e.processed?<Badge label="Procesada ✓" color={C.green} bg={C.greenLight}/>:<Badge label="Sin procesar" color={C.amber} bg={C.amberLight}/>}
          </div>
          <div style={{fontSize:14,color:C.text,lineHeight:1.55,whiteSpace:"pre-wrap"}}>{e.content}</div>
          {e.processed&&e.result&&<div style={{fontSize:12,color:C.textSoft,marginTop:8,fontStyle:"italic",background:C.bg,borderRadius:8,padding:"8px 10px"}}>🤖 {e.result}</div>}
          {!e.processed&&<Btn onClick={()=>process(e)} disabled={proc===e.id} v="secondary" full style={{marginTop:10,fontSize:13.5}}>{proc===e.id?"Interpretando...":"🤖 Procesar con IA"}</Btn>}
        </Card>)}
      </div>}
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

// GUÍA PAGE
function GuiaPage({user,roomConfig,rooms}){
  const [cycles,setCycles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selRoom,setSelRoom]=useState(rooms[0]||"S1");
  const [manualStage,setManualStage]=useState(null);
  const [toast,setToast]=useState(null);
  const [adding,setAdding]=useState(null);
  const [showDiag,setShowDiag]=useState(false);
  const [genResetSaving,setGenResetSaving]=useState(false);
  const [comprasSaving,setComprasSaving]=useState(false);
  useEffect(()=>{db.query("cycles","active=eq.true").then(setCycles).finally(()=>setLoading(false));},[]);
  if(loading)return <Spin/>;

  const cyc=cycles.find(c=>c.room_id===selRoom);
  const rc=getRC(roomConfig,selRoom);
  const autoStage=stageKey(cyc,rc);
  const stage=manualStage||autoStage||"reset";
  const g=GUIDE[stage];
  const dia=cyc&&cyc.flower_start?daysFrom(cyc.flower_start):null;
  const isAuto=!manualStage||manualStage===autoStage;

  const addTask=async(st)=>{
    setAdding(st.title);
    try{
      const payload={title:st.title,room_id:selRoom,rooms:selRoom,type:st.type,assignee:user.name,due_date:todayISO,priority:st.priority||"normal",status:"pendiente",source:"guia",instructions:`Sugerencia de la Guía Living Soil · etapa: ${STAGE_SHORT[stage]}`,created_by:`guía (${user.name})`};
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
      setToast({msg:n>0?`Cronograma generado: ${n} tareas (día 1-5) ✓`:"El cronograma ya estaba creado",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setGenResetSaving(false);}
  };
  const addCompras=async(names,category)=>{
    setComprasSaving(true);
    try{
      const pend=await db.query("shopping_items","status=eq.pendiente");
      const have=new Set((pend||[]).map(p=>(p.name||"").toLowerCase()));
      let n=0;
      for(const nm of names){ if(have.has(nm.toLowerCase()))continue; await db.insert("shopping_items",{name:nm,category,quantity:null,notes:`Sugerido por la Guía · ${STAGE_SHORT[stage]}`,status:"pendiente",requested_by:user.name}); n++; }
      await logA(user.name,`Agregó ${n} insumo(s) a compras desde la guía`,"compras");
      setToast({msg:n>0?`${n} ítem(s) a compras ✓`:"Ya estaban en la lista",type:"success"});
    }catch(e){setToast({msg:errMsg(e),type:"error"});}
    finally{setComprasSaving(false);}
  };

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:H}}>Guía de cultivo 📖</div>
      <div style={{fontSize:14,color:C.textSoft,marginTop:4}}>Suelo vivo de alta rotación (No-Veg). La etapa se detecta sola por sala; entre ciclos arranca en Reset Express.</div>
    </div>

    {/* Selector de sala */}
    <div style={{display:"flex",gap:8}}>
      {rooms.map(r=>{const c=cycles.find(x=>x.room_id===r);const sk=stageKey(c,getRC(roomConfig,r));const on=selRoom===r;return <button key={r} onClick={()=>{setSelRoom(r);setManualStage(null);}} style={{flex:1,padding:"12px 10px",borderRadius:12,cursor:"pointer",background:on?C.teal:C.surface,color:on?"#fff":C.textMid,border:`1.5px solid ${on?C.teal:C.border}`,textAlign:"left"}}>
        <div style={{fontSize:15,fontWeight:800}}>{getRC(roomConfig,r).display_name}</div>
        <div style={{fontSize:12.5,opacity:on?0.92:0.75,marginTop:2}}>{sk?STAGE_SHORT[sk]:"Sin ciclo · Reset Express"}</div>
      </button>;})}
    </div>

    {/* Etapa actual + navegación manual */}
    <Card style={{padding:"16px 18px",borderLeft:`5px solid ${C.teal}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:"0.08em"}}>
          {isAuto?"Etapa actual":"Viendo etapa"}{dia!=null&&autoStage===stage?` · día ${dia} de flora`:""}
        </span>
        {!isAuto&&autoStage&&<button onClick={()=>setManualStage(null)} style={{fontSize:12,fontWeight:700,color:C.teal,background:C.tealLight,border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>↺ Volver a la actual</button>}
      </div>
      <div style={{fontSize:21,fontWeight:900,color:C.text,fontFamily:H,marginBottom:6}}>{g.title}</div>
      <div style={{fontSize:14.5,color:C.textMid,lineHeight:1.6}}>{g.intro}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:14}}>
        {STAGE_ALL.map(sk=><button key={sk} onClick={()=>setManualStage(sk)} style={{padding:"6px 12px",borderRadius:20,fontSize:12.5,fontWeight:700,cursor:"pointer",background:stage===sk?C.teal:C.surface,color:stage===sk?"#fff":C.textMid,border:`1.5px solid ${stage===sk?C.teal:C.border}`}}>{STAGE_SHORT[sk]}</button>)}
      </div>
    </Card>

    {/* Bloques: qué + por qué + cómo */}
    {g.blocks.map((b,i)=><Card key={i} style={{padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:40,height:40,borderRadius:11,background:C.tealLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0}}>{b.icon}</div>
        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{b.title}</div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11.5,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Por qué</div>
        <div style={{fontSize:14.5,color:C.textMid,lineHeight:1.6}}>{b.why}</div>
      </div>
      <div>
        <div style={{fontSize:11.5,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Cómo</div>
        <div style={{fontSize:14.5,color:C.text,lineHeight:1.6}}>{b.how}</div>
      </div>
    </Card>)}

    {/* Dosis orientativas por cama de 800 L y por m² */}
    {g.doses&&<Card style={{padding:"16px 18px"}}>
      <SL>📋 Dosis orientativas (cama 800 L)</SL>
      <div style={{display:"flex",flexDirection:"column",gap:0,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:6,padding:"8px 10px",background:C.surfaceAlt,fontSize:11,fontWeight:800,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.04em"}}>
          <div>Insumo</div><div>Por cama</div><div>Por m²</div>
        </div>
        {g.doses.map((d,i)=><div key={i} style={{padding:"9px 10px",borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:6,alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{d.item}</div>
            <div style={{fontSize:13,color:C.textMid,fontWeight:600}}>{d.cama}</div>
            <div style={{fontSize:13,color:C.textMid,fontWeight:600}}>{d.m2}</div>
          </div>
          <div style={{fontSize:11.5,color:C.textSoft,marginTop:3}}>{d.efecto}</div>
        </div>)}
      </div>
      {rc.area_m2&&<div style={{fontSize:12,color:C.teal,fontWeight:700,marginTop:10}}>📐 {rc.display_name}: {rc.area_m2} m² configurados{rc.volume_l?` · ${rc.volume_l} L de sustrato`:""}</div>}
      <Btn onClick={()=>addCompras(g.doses.map(d=>d.item),"fertilizantes")} disabled={comprasSaving} v="secondary" full style={{marginTop:12,fontSize:13}}>{comprasSaving?"...":"🛒 Sumar estos insumos a compras"}</Btn>
      <div style={{fontSize:11.5,color:C.textSoft,fontStyle:"italic",marginTop:8,lineHeight:1.5}}>Valores orientativos para una cama de ~800 L (2×1×0,4 m). Ajustá según cómo responde tu suelo y la lectura de las plantas.</div>
    </Card>}

    {/* Productos: lo que tenés + propuestas */}
    <Card style={{padding:"16px 18px"}}>
      <SL>🧪 Insumos para esta etapa</SL>
      <div style={{fontSize:12.5,fontWeight:800,color:C.green,marginBottom:8}}>Lo que ya usás</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
        {g.products.tengo.map((p,i)=><span key={i} style={{background:C.greenLight,color:C.green,borderRadius:20,padding:"5px 12px",fontSize:13,fontWeight:700,border:`1px solid ${C.green}33`}}>✓ {p}</span>)}
      </div>
      <div style={{fontSize:12.5,fontWeight:800,color:C.purple,marginBottom:8}}>Para sumar / evaluar (orgánico)</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {g.products.proponer.map((p,i)=><span key={i} style={{background:C.purpleLight,color:C.purple,borderRadius:20,padding:"5px 12px",fontSize:13,fontWeight:700,border:`1px dashed ${C.purple}66`}}>+ {p}</span>)}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
        <Btn onClick={()=>addCompras(g.products.tengo,"insumos")} disabled={comprasSaving} v="secondary" style={{flex:1,fontSize:12.5}}>{comprasSaving?"...":"🛒 Reponer lo que uso"}</Btn>
        <Btn onClick={()=>addCompras(g.products.proponer,"insumos")} disabled={comprasSaving} v="secondary" style={{flex:1,fontSize:12.5}}>{comprasSaving?"...":"🛒 Sumar propuestas"}</Btn>
      </div>
      <div style={{fontSize:12,color:C.textSoft,fontStyle:"italic",marginTop:12,lineHeight:1.5}}>Las propuestas son orientativas y complementarias a tu manejo orgánico. Probá de a poco y observá cómo responde tu suelo.</div>
    </Card>

    {/* Tareas sugeridas → se agregan con estilo "Guía" */}
    <Card style={{padding:"16px 18px",border:`1.5px solid ${C.teal}33`}}>
      <SL style={{color:C.teal}}>🌱 Tareas sugeridas para {rc.display_name}</SL>
      <div style={{fontSize:13,color:C.textSoft,marginBottom:12,lineHeight:1.5}}>Tocá para agregarlas a las tareas de hoy. Aparecen marcadas en color como sugerencias de la guía.</div>
      {stage==="reset"&&<Btn onClick={genReset} disabled={genResetSaving} full style={{marginBottom:12,background:C.teal}}>{genResetSaving?"Generando...":"🗓️ Generar cronograma completo (día 1 a 5)"}</Btn>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {g.tasks.map((st,i)=>{const tm=TM[st.type]||TM.revision;return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:C.tealLight,border:`1px solid ${C.teal}33`}}>
          <div style={{width:34,height:34,borderRadius:9,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{tm.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14.5,fontWeight:700,color:C.text}}>{st.title}</div>
            <div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{tm.label}{st.priority==="alta"?" · prioridad alta":""}</div>
          </div>
          <Btn onClick={()=>addTask(st)} disabled={adding===st.title} style={{padding:"8px 14px",fontSize:13,background:C.teal}}>{adding===st.title?"...":"+ Agregar"}</Btn>
        </div>;})}
      </div>
    </Card>

    {/* Diagnóstico rápido */}
    <Card style={{padding:"16px 18px"}}>
      <button onClick={()=>setShowDiag(!showDiag)} style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:0}}>
        <SL style={{marginBottom:0}}>🔍 Diagnóstico rápido</SL>
        <span style={{fontSize:13,color:C.textSoft}}>{showDiag?"▲":"▼"}</span>
      </button>
      {showDiag&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
        {GUIDE_DIAG.map((d,i)=><div key={i} style={{background:C.bg,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:4}}>⚠ {d.sintoma}</div>
          <div style={{fontSize:12.5,color:C.textSoft,marginBottom:2}}><span style={{fontWeight:700,color:C.amber}}>Causa:</span> {d.causa}</div>
          <div style={{fontSize:12.5,color:C.textMid}}><span style={{fontWeight:700,color:C.green}}>Acción:</span> {d.accion}</div>
        </div>)}
      </div>}
    </Card>

    <div style={{fontSize:11.5,color:C.textSoft,textAlign:"center",fontStyle:"italic",lineHeight:1.5,padding:"0 8px"}}>
      Guía orientativa de cultivo orgánico en suelo vivo. No reemplaza tu criterio ni la observación directa de las plantas.
    </div>
  </div>;
}

// APP
export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [genetics,setGenetics]=useState([]);
  const [roomConfig,setRoomConfig]=useState([]);
  const [targets,setTargets]=useState([]);
  const [textScale,setTextScaleState]=useState(1);
  const loadConfig=useCallback(()=>{db.get("room_config").then(setRoomConfig).catch(()=>setRoomConfig([]));},[]);
  const loadTargets=useCallback(()=>{db.query("climate_targets","select=*").then(setTargets).catch(()=>setTargets([]));},[]);
  const wide=useIsWide(820);
  // Preferencia de tamaño de texto (por dispositivo)
  useEffect(()=>{try{const v=parseFloat(localStorage.getItem("gm_textscale"));if(v>=1&&v<=1.3)setTextScaleState(v);}catch{}},[]);
  const setTextScale=(v)=>{setTextScaleState(v);try{localStorage.setItem("gm_textscale",String(v));}catch{}};
  useEffect(()=>{if(user){db.get("genetics").then(setGenetics);loadConfig();loadTargets();logA(user.name,"Inició sesión","auth");}},[user,loadConfig,loadTargets]);
  if(!user)return <LoginScreen onLogin={u=>{setUser(u);setPage(u.role==="admin"?"dashboard":"mi_turno");}}/>;
  const rooms=["S1","S2"];
  const render=()=>{
    switch(page){
      case "mi_turno":     return <MiTurno user={user} setPage={setPage} roomConfig={roomConfig} rooms={rooms} targets={targets}/>;
      case "vegetativo":   return <VegetativoPage genetics={genetics} user={user} targets={targets} onTargetsChanged={loadTargets}/>;
      case "tareas":       return <TareasPage user={user} rooms={rooms}/>;
      case "geneticas":    return <GeneticasPage genetics={genetics} setGenetics={setGenetics} user={user}/>;
      case "estadisticas": return <EstadisticasPage rooms={rooms} roomConfig={roomConfig} targets={targets}/>;
      case "plagas":       return <PlagasPage user={user} rooms={rooms}/>;
      case "calendario":   return <CalendarioPage user={user}/>;
      case "compras":      return <ComprasPage user={user}/>;
      case "guia":         return <GuiaPage user={user} roomConfig={roomConfig} rooms={rooms}/>;
      case "bot":          return <BotPage user={user}/>;
      case "bitacora":     return <BitacoraPage user={user}/>;
      case "configuracion":return <ConfigPage user={user} roomConfig={roomConfig} onChanged={loadConfig} textScale={textScale} setTextScale={setTextScale}/>;
      case "__more__":     return <MorePage user={user} setPage={setPage} textScale={textScale} setTextScale={setTextScale}/>;
      default:
        if(page.startsWith("sala_")){const rid=page.slice(5);return <SalaPage roomId={rid} setPage={setPage} user={user} genetics={genetics} rc={getRC(roomConfig,rid)} targets={targets} onTargetsChanged={loadTargets}/>;}
        return user.role==="admin"?<Dashboard setPage={setPage} user={user} roomConfig={roomConfig} rooms={rooms} wide={wide} targets={targets}/>:<MiTurno user={user} setPage={setPage} roomConfig={roomConfig} rooms={rooms} targets={targets}/>;
    }
  };
  const globalCSS=`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:3px;}input,select,button,textarea{font-family:inherit;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.page{animation:fadeUp 0.2s ease;}`;
  // zoom escala toda la app de forma proporcional (los anchos son fluidos, no genera scroll horizontal)
  const zoomStyle=textScale!==1?{zoom:textScale}:{};

  if(wide){
    return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif",color:C.text,display:"flex",...zoomStyle}}>
      <style>{globalCSS}</style>
      <NavBar user={user} page={page} setPage={setPage} wide/>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        <TopBar user={user} page={page} setPage={setPage} onLogout={()=>{setUser(null);setPage("dashboard");}} wide/>
        <div className="page" style={{padding:"6px 28px 28px",maxWidth:1080,width:"100%",margin:"0 auto"}}>{render()}</div>
      </div>
      {page!=="bot"&&<FloatingBot user={user} currentPage={page} wide/>}
    </div>;
  }
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif",color:C.text,maxWidth:480,margin:"0 auto",...zoomStyle}}>
    <style>{globalCSS}</style>
    <TopBar user={user} page={page} setPage={setPage} onLogout={()=>{setUser(null);setPage("dashboard");}}/>
    <div className="page" style={{padding:"16px 16px 88px"}}>{render()}</div>
    {page!=="bot"&&<FloatingBot user={user} currentPage={page} wide={false}/>}
    <NavBar user={user} page={page} setPage={setPage}/>
  </div>;
}
