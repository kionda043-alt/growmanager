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
};

const logA = async (u,a,e=null,d=null) => { try { await db.insert("activity_log",{user_name:u,action:a,entity_type:e,details:d}); } catch{} };
const addDays = (ds,n) => { const d=new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };

const C = {
  bg:"#F2F4F0", surface:"#FFFFFF", surfaceAlt:"#F8FAF7",
  border:"#E2E8DE", borderStrong:"#C4D0BE",
  text:"#18251A", textMid:"#445A3E", textSoft:"#7A9272",
  green:"#2A6E35", greenLight:"#E4F0E6",
  amber:"#B87318", amberLight:"#FDF0E0",
  red:"#B83228", redLight:"#FCECEA",
  blue:"#1E5FAD", blueLight:"#EBF3FF",
  purple:"#6B4FA0", purpleLight:"#F0EBF9",
  shadow:"0 1px 4px rgba(0,0,0,0.07),0 2px 12px rgba(0,0,0,0.04)",
  shadowUp:"0 4px 20px rgba(0,0,0,0.10)",
};
const GP = ["#2A6E35","#1E5FAD","#B87318","#6B4FA0","#B83228","#0E7A6E","#8B4513","#1A6B8A","#6B6B10","#8B2252","#2E6B8B","#5A7A2A","#8B4A00","#3A3A8B","#7A2A5A"];
const TM = {
  riego:     {icon:"💧",label:"Riego",     color:"#1E5FAD",bg:"#EBF3FF"},
  nutricion: {icon:"🌱",label:"Nutrición", color:"#2A6E35",bg:"#E4F0E6"},
  fumigacion:{icon:"🔬",label:"Fumigación",color:"#6B4FA0",bg:"#F0EBF9"},
  poda:      {icon:"✂️",label:"Poda",      color:"#B87318",bg:"#FDF0E0"},
  limpieza:  {icon:"🧹",label:"Limpieza",  color:"#555",   bg:"#F3F4F6"},
  revision:  {icon:"👁", label:"Revisión",  color:"#0891B2",bg:"#ECFEFF"},
  cosecha:   {icon:"🌾",label:"Cosecha",   color:"#854D0E",bg:"#FEF9C3"},
  lavado:    {icon:"🚿",label:"Lavado",    color:"#0E7490",bg:"#ECFEFF"},
};
const PM = {
  "vegetativo":{label:"Vegetativo",color:"#2A6E35",bg:"#E4F0E6"},
  "floración": {label:"Floración", color:"#B87318",bg:"#FDF0E0"},
  "cosechando":{label:"Cosechando",color:"#B83228",bg:"#FCECEA"},
};
const ROOM_POTS = {
  S1:[{label:"F"},{label:"C"},{label:"E"},{label:"B"},{label:"D"},{label:"A"}],
  S2:[{label:"B"},{label:"A"},{label:"C",wide:true},{label:"D"},{label:"K",circular:true}],
};
const TODAY = new Date();
const todayISO = TODAY.toISOString().split("T")[0];
const daysFrom = d => Math.floor((TODAY-new Date(d))/86400000);
const daysTo   = d => Math.floor((new Date(d)-TODAY)/86400000);
const fmtDate  = d => new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short"});
const fmtFull  = d => new Date(d).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
const fmtTime  = d => new Date(d).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});

// BASE UI
function Card({children,style={},onClick}){ const[h,sH]=useState(false); return <div onClick={onClick} onMouseEnter={()=>onClick&&sH(true)} onMouseLeave={()=>sH(false)} style={{background:C.surface,borderRadius:18,border:`1.5px solid ${C.border}`,boxShadow:h?C.shadowUp:C.shadow,padding:18,cursor:onClick?"pointer":"default",transform:h&&onClick?"translateY(-2px)":"none",transition:"all 0.15s",...style}}>{children}</div>; }
function Badge({label,color,bg}){return <span style={{background:bg,color,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;}
function PBadge({phase}){const m=PM[phase]||PM["floración"];return <Badge label={m.label} color={m.color} bg={m.bg}/>;}
function Bar({value,max,color=C.green,h=7}){const p=max>0?Math.min(100,Math.round(value/max*100)):0;return<div style={{background:C.border,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:`${p}%`,background:color,height:"100%",borderRadius:99,transition:"width 0.5s"}}/></div>;}
function SL({children,style={}}){return <div style={{fontSize:10,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12,...style}}>{children}</div>;}
function Spin(){return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.green}`,animation:"spin 0.8s linear infinite"}}/></div>;}
function Divider(){return <div style={{height:1,background:C.border,margin:"14px 0"}}/>;}

function Toast({msg,type="success",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
  const col=type==="success"?{bg:C.greenLight,c:C.green}:type==="error"?{bg:C.redLight,c:C.red}:{bg:C.amberLight,c:C.amber};
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:col.bg,color:col.c,border:`1.5px solid ${col.c}44`,borderRadius:14,padding:"12px 20px",fontSize:14,fontWeight:700,boxShadow:C.shadowUp,whiteSpace:"nowrap",maxWidth:"92vw",textAlign:"center"}}>{type==="success"?"✓":type==="error"?"✕":"⚠"} {msg}</div>;
}

function Modal({title,children,onClose}){
  return <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",padding:24}}>
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
    {label&&<label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
      style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15,color:C.text,background:C.surface,outline:"none"}}/>
  </div>;
}
function FS({label,value,onChange,options}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:5}}>{label}</label>}
    <select value={value} onChange={onChange} style={{width:"100%",padding:"11px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,color:C.text,background:C.surface,outline:"none"}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>;
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

function TaskRow({t,onToggle}){
  const tm=TM[t.type]||TM.revision;
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:14,background:t.status==="completada"?C.greenLight:C.surface,border:`1.5px solid ${t.priority==="alta"&&t.status!=="completada"?"#E8C07A":C.border}`,opacity:t.status==="completada"?0.68:1,boxShadow:C.shadow}}>
    <button onClick={()=>onToggle(t)} style={{width:28,height:28,borderRadius:9,flexShrink:0,background:t.status==="completada"?C.green:"transparent",border:`2px solid ${t.status==="completada"?C.green:C.borderStrong}`,cursor:"pointer",color:"#fff",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.status==="completada"?"✓":""}</button>
    <div style={{width:34,height:34,borderRadius:9,background:tm.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{tm.icon}</div>
    <div style={{flex:1}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,textDecoration:t.status==="completada"?"line-through":"none"}}>{t.title}</div>
      <div style={{fontSize:11,color:C.textSoft,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
        {t.room_id&&<span style={{background:C.greenLight,color:C.green,borderRadius:6,padding:"1px 6px",fontWeight:700}}>{t.room_id}</span>}
        <span>{t.assignee}</span>
        {t.due_date!==todayISO&&<span>{fmtDate(t.due_date)}</span>}
        {t.recurrent&&<span style={{color:C.green,fontWeight:600}}>↻{t.recurrent_days}d</span>}
        {t.auto_generated&&<span style={{color:C.blue,fontWeight:600}}>⚡</span>}
      </div>
    </div>
    {t.priority==="alta"&&t.status!=="completada"&&<Badge label="Alta" color={C.amber} bg={C.amberLight}/>}
  </div>;
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
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>GrowManager</div>
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
function TopBar({user,page,setPage,onLogout}){
  const isHome=["dashboard","mi_turno"].includes(page);
  const homeP=user.role==="admin"?"dashboard":"mi_turno";
  return <header style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 18px",height:60,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 0 #E2E8DE"}}>
    {!isHome&&<button onClick={()=>setPage(homeP)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:22,color:C.textMid,padding:"4px 2px",lineHeight:1}}>←</button>}
    <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
      <div style={{width:32,height:32,borderRadius:9,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🌿</div>
      <span style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>GrowManager</span>
    </div>
    <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:12,padding:"6px 12px",border:`1px solid ${C.border}`,cursor:"pointer"}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:900}}>{user.initial}</div>
      <span style={{fontSize:13,fontWeight:700,color:C.text}}>{user.name}</span>
    </button>
  </header>;
}

function NavBar({user,page,setPage}){
  const adminNav=[{id:"dashboard",l:"Inicio",i:"⌂"},{id:"tareas",l:"Tareas",i:"✓"},{id:"vegetativo",l:"Vege",i:"🌱"},{id:"estadisticas",l:"Stats",i:"📊"},{id:"plagas",l:"Plagas",i:"🔬"}];
  const stdNav=[{id:"mi_turno",l:"Mi turno",i:"🌿"},{id:"tareas",l:"Tareas",i:"✓"},{id:"vegetativo",l:"Vegetativo",i:"🌱"}];
  const nav=user.role==="admin"?adminNav:stdNav;
  return <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",gap:6,overflowX:"auto"}}>
    {nav.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,background:page===n.id?C.green:C.bg,color:page===n.id?"#fff":C.textMid,border:`1px solid ${page===n.id?C.green:C.border}`,whiteSpace:"nowrap",flexShrink:0}}>{n.i} {n.l}</button>)}
  </div>;
}

// MI TURNO
function MiTurno({user}){
  const [tasks,setTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  useEffect(()=>{db.query("tasks",`due_date=eq.${todayISO}&assignee=eq.${encodeURIComponent(user.name)}&order=priority.desc,created_at.asc`).then(setTasks).finally(()=>setLoading(false));},[user.name]);
  const toggle=async task=>{
    const ns=task.status==="completada"?"pendiente":"completada";
    await db.update("tasks",task.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
    if(ns==="completada"&&task.recurrent&&task.recurrent_days){
      await db.insert("tasks",{title:task.title,room_id:task.room_id,type:task.type,assignee:task.assignee,due_date:addDays(task.due_date,task.recurrent_days),status:"pendiente",priority:task.priority,recurrent:true,recurrent_days:task.recurrent_days,created_by:"sistema"});
    }
    await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${task.title}`,"task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:ns}:t));
    setToast({msg:ns==="completada"?"Completada ✓":"Reabierta",type:"success"});
  };
  if(loading)return <Spin/>;
  const pending=tasks.filter(t=>t.status==="pendiente");
  const done=tasks.filter(t=>t.status==="completada");
  const [showDone,setShowDone]=useState(false);
  const byRoom={S1:[],S2:[],General:[]};
  pending.forEach(t=>{if(t.room_id==="S1")byRoom.S1.push(t);else if(t.room_id==="S2")byRoom.S2.push(t);else byRoom.General.push(t);});
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{padding:"20px 0 4px"}}>
      <div style={{fontSize:13,color:C.textSoft,textTransform:"capitalize"}}>{fmtFull(TODAY)}</div>
      <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",marginTop:4}}>Hola, <span style={{color:C.green}}>{user.name}</span> 🌿</div>
      <div style={{fontSize:14,color:C.textSoft,marginTop:4}}>{pending.length>0?`Tenés ${pending.length} tarea${pending.length>1?"s":""} para hoy`:"¡Todo al día! 👌"}</div>
    </div>
    <Card style={{padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><SL style={{marginBottom:0}}>Tu progreso</SL><span style={{fontSize:13,fontWeight:700,color:C.green}}>{done.length}/{tasks.length}</span></div>
      <Bar value={done.length} max={tasks.length||1} h={12}/>
      <div style={{fontSize:12,color:C.textSoft,marginTop:8}}>{tasks.length>0?Math.round(done.length/tasks.length*100):0}% completado</div>
    </Card>
    {Object.entries(byRoom).map(([room,tList])=>tList.length===0?null:
      <div key={room}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:room==="S1"?C.amber:room==="S2"?C.blue:C.textSoft}}>{room==="S1"?"🌿 Sala 1":room==="S2"?"🏠 Sala 2":"📋 General"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{tList.map(t=><TaskRow key={t.id} t={t} onToggle={toggle}/>)}</div>
      </div>
    )}
    {pending.length===0&&done.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textSoft}}><div style={{fontSize:40,marginBottom:12}}>✓</div><div style={{fontSize:16,fontWeight:700}}>Sin tareas asignadas hoy</div></div>}
    {done.length>0&&<>
      <button onClick={()=>setShowDone(!showDone)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDone?"▲":"▼"} Completadas ({done.length})</button>
      {showDone&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6}}>{done.map(t=><TaskRow key={t.id} t={t} onToggle={toggle}/>)}</div>}
    </>}
  </div>;
}

// DASHBOARD
function Dashboard({setPage,user}){
  const [cycles,setCycles]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [vegStock,setVegStock]=useState([]);
  const [weekTasks,setWeekTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      db.query("cycles","active=eq.true"),
      db.query("tasks",`due_date=eq.${todayISO}`),
      db.get("veg_stock"),
      db.query("tasks",`due_date=gte.${todayISO}&due_date=lte.${addDays(todayISO,6)}&order=due_date.asc`),
    ]).then(([c,t,v,w])=>{setCycles(c);setTasks(t);setVegStock(v);setWeekTasks(w);}).finally(()=>setLoading(false));
  },[]);
  if(loading)return <Spin/>;
  const done=tasks.filter(t=>t.status==="completada").length;
  const pending=tasks.filter(t=>t.status==="pendiente");
  const highPri=pending.filter(t=>t.priority==="alta");
  const myPending=pending.filter(t=>t.assignee===user.name).length;
  const mothers=vegStock.filter(v=>v.type==="madre"&&v.status==="activa").reduce((a,v)=>a+v.count,0);
  const renewM=vegStock.filter(v=>v.type==="madre"&&v.status==="renovar").length;
  const postC=vegStock.filter(v=>v.type==="post_esqueje").reduce((a,v)=>a+v.count,0);
  const next7=Array.from({length:7},(_,i)=>addDays(todayISO,i));
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:24}}>
    <div style={{padding:"20px 0 4px"}}>
      <div style={{fontSize:13,color:C.textSoft,textTransform:"capitalize"}}>{fmtFull(TODAY)}</div>
      <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",marginTop:4}}>Buenas, <span style={{color:C.green}}>{user.name}</span> 🌿</div>
      <div style={{fontSize:13,color:C.textSoft,marginTop:4}}>{myPending>0?`Tenés ${myPending} tarea${myPending>1?"s":""} pendientes hoy`:"Estás al día 👌"}</div>
    </div>
    <Card style={{padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><SL style={{marginBottom:0}}>Progreso del día</SL><span style={{fontSize:13,fontWeight:700,color:C.green}}>{done}/{tasks.length}</span></div>
      <Bar value={done} max={tasks.length||1} h={10}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
        <span style={{fontSize:12,color:C.textSoft}}>{tasks.length>0?Math.round(done/tasks.length*100):0}% completado</span>
        {highPri.length>0&&<span style={{fontSize:12,color:C.red,fontWeight:700}}>● {highPri.length} urgente{highPri.length>1?"s":""}</span>}
      </div>
    </Card>
    {(highPri.length>0||renewM>0)&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      <SL>Alertas</SL>
      {highPri.slice(0,2).map(t=>{const tm=TM[t.type]||TM.revision;return <div key={t.id} style={{background:C.amberLight,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.amber}33`}}><span style={{fontSize:20}}>{tm.icon}</span><div style={{flex:1}}><div style={{fontSize:13,color:C.amber,fontWeight:700}}>{t.title}</div><div style={{fontSize:11,color:C.amber}}>{t.room_id&&`${t.room_id} · `}{t.assignee}</div></div></div>;})}
      {renewM>0&&<div style={{background:C.amberLight,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.amber}33`}}><span style={{fontSize:20}}>🌳</span><span style={{fontSize:13,color:C.amber,fontWeight:700}}>{renewM} madre{renewM>1?"s":""} para renovar</span></div>}
    </div>}
    <SL>Salas de cultivo</SL>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {["S1","S2"].map(rid=><RoomCard key={rid} roomId={rid} cycle={cycles.find(c=>c.room_id===rid)} onClick={()=>setPage(`sala_${rid}`)}/>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card onClick={()=>setPage("vegetativo")} style={{padding:0,overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#E4F0E6,#CDE6D0)",padding:"16px 16px 12px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:24}}>🌱</div><div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",marginTop:6}}>Vegetativo</div></div>
        <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.textSoft}}>Madres</span><span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Georgia',serif"}}>{mothers}</span></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.textSoft}}>Post-esq.</span><span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Georgia',serif"}}>{postC}</span></div>
        </div>
      </Card>
      <Card onClick={()=>setPage("tareas")} style={{padding:0,overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#EBF3FF,#D4E6FF)",padding:"16px 16px 12px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:24}}>✓</div><div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",marginTop:6}}>Tareas</div></div>
        <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.textSoft}}>Pendientes</span><span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Georgia',serif"}}>{pending.length}</span></div>
          <Bar value={done} max={tasks.length||1} h={6}/>
        </div>
      </Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card onClick={()=>setPage("geneticas")} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px"}}><span style={{fontSize:22}}>🧬</span><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>Genéticas</div><div style={{fontSize:11,color:C.textSoft}}>→</div></div></Card>
      <Card onClick={()=>setPage("estadisticas")} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px"}}><span style={{fontSize:22}}>📊</span><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>Estadísticas</div><div style={{fontSize:11,color:C.textSoft}}>→</div></div></Card>
    </div>
    <Card style={{padding:"16px 18px"}}>
      <SL>Próximos 7 días</SL>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {next7.map(ds=>{
          const dt=weekTasks.filter(t=>t.due_date===ds);
          const isToday=ds===todayISO;
          const d=new Date(ds);
          return <div key={ds} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",borderRadius:10,background:isToday?C.greenLight:"transparent",border:`1px solid ${isToday?C.borderStrong:"transparent"}`}}>
            <div style={{width:38,textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:10,color:C.textSoft,textTransform:"capitalize"}}>{d.toLocaleDateString("es-AR",{weekday:"short"})}</div>
              <div style={{fontSize:17,fontWeight:700,color:isToday?C.green:C.text,fontFamily:"'Georgia',serif"}}>{d.getDate()}</div>
            </div>
            <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:4}}>
              {dt.length===0?<span style={{fontSize:11,color:C.textSoft,fontStyle:"italic"}}>Sin tareas</span>
                :dt.slice(0,3).map(t=>{const m=TM[t.type]||TM.revision;return <span key={t.id} style={{fontSize:11,color:m.color,background:m.bg,borderRadius:8,padding:"2px 8px",fontWeight:500}}>{m.icon} {t.title}</span>;})}
              {dt.length>3&&<span style={{fontSize:11,color:C.textSoft}}>+{dt.length-3}</span>}
            </div>
          </div>;
        })}
      </div>
    </Card>
  </div>;
}

function RoomCard({roomId,cycle,onClick}){
  if(!cycle)return <Card onClick={onClick}><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>{roomId}</div><div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",margin:"4px 0"}}>{roomId==="S1"?"Sala 1":"Sala 2"}</div><div style={{fontSize:13,color:C.textSoft}}>Sin ciclo activo</div></Card>;
  const dayIn=daysFrom(cycle.flower_start);
  const dLeft=daysTo(cycle.estimated_harvest);
  const pct=Math.min(100,Math.round(dayIn/65*100));
  const pm=PM[cycle.phase]||PM["floración"];
  return <Card onClick={onClick} style={{padding:0,overflow:"hidden"}}>
    <div style={{background:cycle.phase==="floración"?"linear-gradient(135deg,#FDF5E8,#FAE8C8)":"linear-gradient(135deg,#E4F0E6,#CDE6D0)",padding:"18px 20px 14px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>{roomId}</div><div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>{roomId==="S1"?"Sala 1":"Sala 2"}</div></div>
        <PBadge phase={cycle.phase}/>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:6,marginTop:10}}><span style={{fontSize:48,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{dayIn}</span><span style={{fontSize:14,color:C.textSoft,paddingBottom:9}}>días</span></div>
    </div>
    <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
      <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,color:C.textSoft}}>Progreso</span><span style={{fontSize:12,fontWeight:700,color:C.textMid}}>{pct}%</span></div><Bar value={pct} max={100} color={pm.color} h={8}/></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:11,color:C.textSoft}}>Cosecha en</div><div style={{display:"flex",alignItems:"flex-end",gap:4,marginTop:2}}><span style={{fontSize:26,fontWeight:900,fontFamily:"'Georgia',serif",color:dLeft<=7?C.red:dLeft<=20?C.amber:C.green}}>{dLeft}</span><span style={{fontSize:12,color:C.textSoft,paddingBottom:4}}>días</span></div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:11,color:C.textSoft}}>Est.</div><div style={{fontSize:13,fontWeight:700,color:C.textMid}}>{fmtDate(cycle.estimated_harvest)}</div></div>
      </div>
    </div>
  </Card>;
}

// SALA PAGE
function SalaPage({roomId,setPage,user,genetics}){
  const [cycle,setCycle]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [cg,setCg]=useState([]);
  const [wLog,setWLog]=useState([]);
  const [nLog,setNLog]=useState([]);
  const [mDone,setMDone]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selPot,setSelPot]=useState(null);
  const [toast,setToast]=useState(null);
  const [showW,setShowW]=useState(false);
  const [showN,setShowN]=useState(false);
  const [showPh,setShowPh]=useState(false);
  const [showAG,setShowAG]=useState(false);
  const [showTimer,setShowTimer]=useState(false);

  const getMilestones=c=>{
    if(!c||!c.flower_start)return[];
    const di=daysFrom(c.flower_start);
    return [
      {label:"Inicio floración",   date:c.flower_start,                   done:true,     type:"start"    },
      {label:"Zoil Monkey 1",      date:c.flower_start,                   done:di>=1,    type:"nutricion"},
      {label:"Poda 1 — día 15",    date:addDays(c.flower_start,15),       done:di>15,    type:"poda"     },
      {label:"Zoil Monkey 2",      date:addDays(c.flower_start,15),       done:di>15,    type:"nutricion"},
      {label:"Poda 2 — día 21",    date:addDays(c.flower_start,21),       done:di>21,    type:"poda"     },
      {label:"Inicio lavado",      date:addDays(c.estimated_harvest,-20), done:false,    type:"lavado"   },
      {label:"Cosecha estimada",   date:c.estimated_harvest,              done:false,    type:"cosecha"  },
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
      if(c){
        const cgData=await db.query("cycle_genetics",`cycle_id=eq.${c.id}`);
        setCg(cgData);
        setMDone(getMilestones(c).map(m=>m.done));
      }
    }finally{setLoading(false);}
  },[roomId]);

  useEffect(()=>{load();},[load]);

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
  const pct=cycle?Math.min(100,Math.round(dayIn/65*100)):0;
  const pendingT=tasks.filter(t=>t.status==="pendiente");
  const doneT=tasks.filter(t=>t.status==="completada");
  const [showDoneT,setShowDoneT]=useState(false);
  const byRoom={S1:[],S2:[],General:[]};
  pendingT.forEach(t=>{if(t.room_id==="S1")byRoom.S1.push(t);else if(t.room_id==="S2")byRoom.S2.push(t);else byRoom.General.push(t);});

  if(!cycle)return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={null} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Ciclo iniciado ✓",type:"success"});}}/>}
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:48,marginBottom:16}}>🌱</div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>{roomId==="S1"?"Sala 1":"Sala 2"}</div>
      <div style={{fontSize:14,color:C.textSoft,marginBottom:24}}>Sin ciclo activo</div>
      {user.role==="admin"&&<Btn onClick={()=>setShowPh(true)} full>Iniciar ciclo</Btn>}
    </div>
  </div>;

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showW&&<WaterModal roomId={roomId} user={user} onClose={()=>setShowW(false)} onSaved={()=>{setShowW(false);load();setToast({msg:"Riego registrado ✓",type:"success"});}}/>}
    {showN&&<NutriModal roomId={roomId} cycleId={cycle.id} user={user} onClose={()=>setShowN(false)} onSaved={()=>{setShowN(false);load();setToast({msg:"Nutrición registrada ✓",type:"success"});}}/>}
    {showPh&&<PhaseModal roomId={roomId} cycle={cycle} user={user} onClose={()=>setShowPh(false)} onSaved={()=>{setShowPh(false);load();setToast({msg:"Fase actualizada ✓",type:"success"});}}/>}
    {showAG&&<AddGenModal cycleId={cycle.id} genetics={genetics} existing={cg} onClose={()=>setShowAG(false)} onSaved={()=>{setShowAG(false);load();setToast({msg:"Genética agregada ✓",type:"success"});}}/>}
    {showTimer&&<TimerModal onClose={()=>setShowTimer(false)}/>}

    {/* Hero */}
    <div style={{background:cycle.phase==="floración"?"linear-gradient(135deg,#FDF5E8,#FAE8C8)":"linear-gradient(135deg,#E4F0E6,#CDE6D0)",borderRadius:20,padding:"22px 20px 18px",border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div><div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.12em"}}>{roomId}</div><div style={{fontSize:28,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>{roomId==="S1"?"Sala 1":"Sala 2"}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <PBadge phase={cycle.phase}/>
          {user.role==="admin"&&<button onClick={()=>setShowPh(true)} style={{fontSize:11,color:C.textMid,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Cambiar fase</button>}
        </div>
      </div>
      <div style={{display:"flex",gap:24,marginBottom:14}}>
        <div><div style={{fontSize:11,color:C.textSoft}}>Día de ciclo</div><div style={{display:"flex",alignItems:"flex-end",gap:4}}><span style={{fontSize:44,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{dayIn}</span><span style={{fontSize:13,color:C.textSoft,paddingBottom:7}}>días</span></div></div>
        <div><div style={{fontSize:11,color:C.textSoft}}>Cosecha en</div><div style={{display:"flex",alignItems:"flex-end",gap:4}}><span style={{fontSize:44,fontWeight:900,fontFamily:"'Georgia',serif",lineHeight:1,color:daysTo(cycle.estimated_harvest)<=20?C.amber:C.green}}>{daysTo(cycle.estimated_harvest)}</span><span style={{fontSize:13,color:C.textSoft,paddingBottom:7}}>días</span></div></div>
      </div>
      <Bar value={pct} max={100} color={pm.color} h={9}/>
      <div style={{fontSize:12,color:C.textSoft,marginTop:8}}>💧 {cycle.irrigation_type} · {fmtDate(cycle.flower_start)} → {fmtDate(cycle.estimated_harvest)}</div>
    </div>

    {/* Actions */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Btn onClick={()=>setShowW(true)} style={{borderRadius:14,padding:12,fontSize:13}}>💧 Riego</Btn>
      <Btn onClick={()=>setShowN(true)} v="secondary" style={{borderRadius:14,padding:12,fontSize:13}}>🌱 Nutrición</Btn>
      <Btn onClick={()=>setShowTimer(true)} v="secondary" style={{borderRadius:14,padding:12,fontSize:13}}>⏱ Timer</Btn>
    </div>

    {/* Genéticas */}
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <SL style={{marginBottom:0}}>Genéticas en ciclo</SL>
        {user.role==="admin"&&<Btn onClick={()=>setShowAG(true)} v="secondary" style={{padding:"6px 12px",fontSize:12}}>+ Agregar</Btn>}
      </div>
      {cg.length===0?<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic"}}>Sin genéticas — tocá + Agregar</div>
        :<div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(cg.length,3)},1fr)`,gap:10}}>
          {cg.map(g=><div key={g.id} style={{background:C.bg,borderRadius:12,padding:14,border:`1px solid ${C.border}`,textAlign:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,justifyContent:"center"}}><div style={{width:10,height:10,borderRadius:"50%",background:genMap[g.genetic_name]||C.green}}/><span style={{fontSize:11,fontWeight:700,color:C.text}}>{g.genetic_name}</span></div>
            <div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>{g.plant_count}</div>
            <div style={{fontSize:11,color:C.textSoft}}>plantas</div>
          </div>)}
        </div>}
    </Card>

    {/* Fechas clave */}
    <Card>
      <SL>Fechas clave del ciclo</SL>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {milestones.map((m,i)=>{
          const done=mDone[i]||false;
          const tm=TM[m.type]||{icon:"📅"};
          const dL=daysTo(m.date);
          const isToday=m.date===todayISO;
          return <div key={i} onClick={()=>setMDone(prev=>{const n=[...prev];n[i]=!n[i];return n;})}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:done?C.greenLight:isToday?C.amberLight:C.bg,border:`1px solid ${done?C.green+"44":isToday?"#E8C07A":C.border}`,cursor:"pointer",opacity:done?0.65:1,transition:"all 0.1s"}}>
            <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:done?C.green:"transparent",border:`2px solid ${done?C.green:C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>{done?"✓":""}</div>
            <span style={{fontSize:17}}>{tm.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,textDecoration:done?"line-through":"none"}}>{m.label}</div>
              <div style={{fontSize:11,color:C.textSoft}}>{fmtDate(m.date)}{isToday?" — hoy":dL>0?` — en ${dL}d`:" — pasado"}</div>
            </div>
          </div>;
        })}
      </div>
    </Card>

    {/* Mapa */}
    <Card>
      <SL>Mapa de macetones</SL>
      <PotMap roomId={roomId} genetics={genetics} cycleGenetics={cg} selectedPot={selPot} onSelect={setSelPot}/>
      {selPot&&<PotEditor roomId={roomId} potLabel={selPot} cycle={cycle} genetics={genetics} cycleGenetics={cg} onClose={()=>setSelPot(null)} onSaved={()=>{setSelPot(null);load();setToast({msg:"Macetón guardado ✓",type:"success"});}}/>}
    </Card>

    {/* Historial */}
    {wLog.length>0&&<Card>
      <SL>Últimos riegos</SL>
      {wLog.map((w,i)=><div key={w.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<wLog.length-1?`1px solid ${C.border}`:"none"}}>
        <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>💧 {w.method}{w.duration_minutes?` · ${w.duration_minutes}min`:""}</div><div style={{fontSize:11,color:C.textSoft}}>{w.logged_by} · {fmtDate(w.logged_at)} {fmtTime(w.logged_at)}</div></div>
        {w.notes&&<div style={{fontSize:11,color:C.textSoft,maxWidth:100,textAlign:"right"}}>{w.notes}</div>}
      </div>)}
    </Card>}
    {nLog.length>0&&<Card>
      <SL>Últimas aplicaciones</SL>
      {nLog.map((n,i)=><div key={n.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<nLog.length-1?`1px solid ${C.border}`:"none"}}>
        <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>🌱 {n.products}</div><div style={{fontSize:11,color:C.textSoft}}>{n.logged_by} · {fmtDate(n.logged_at)}{n.dose?` · ${n.dose}`:""}</div></div>
      </div>)}
    </Card>}

    {/* Tareas agrupadas */}
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <SL style={{marginBottom:0}}>Tareas de hoy</SL>
        <Btn onClick={()=>setPage("tareas")} v="secondary" style={{padding:"6px 12px",fontSize:12}}>Ver todas</Btn>
      </div>
      {tasks.length===0?<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic",textAlign:"center",padding:"16px 0"}}>Sin tareas para hoy ✓</div>:<>
        {Object.entries(byRoom).map(([r,tl])=>tl.length===0?null:<div key={r} style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:r==="S1"?C.amber:r==="S2"?C.blue:C.textSoft}}>{r==="S1"?"🌿 Sala 1":r==="S2"?"🏠 Sala 2":"📋 General"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{tl.map(t=><TaskRow key={t.id} t={t} onToggle={toggleTask}/>)}</div>
        </div>)}
        {doneT.length>0&&<>
          <button onClick={()=>setShowDoneT(!showDoneT)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDoneT?"▲":"▼"} Completadas ({doneT.length})</button>
          {showDoneT&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6,marginTop:8}}>{doneT.map(t=><TaskRow key={t.id} t={t} onToggle={toggleTask}/>)}</div>}
        </>}
      </>}
    </Card>
  </div>;
}

// POT MAP
function PotMap({roomId,genetics,cycleGenetics,selectedPot,onSelect}){
  const genMap={};genetics.forEach((g,i)=>{genMap[g.name]=g.color||GP[i%GP.length];});
  const cgColors=cycleGenetics.map((cg,i)=>genMap[cg.genetic_name]||GP[i]);
  const pots=ROOM_POTS[roomId]||[];
  const PC=({pot,idx,fullWidth})=>{
    const sel=selectedPot===pot.label;
    const col=cgColors.length>0?cgColors[idx%Math.max(cgColors.length,1)]:C.borderStrong;
    if(pot.circular)return <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={()=>onSelect(sel?null:pot.label)} style={{width:76,height:76,borderRadius:"50%",background:sel?C.green:`${col}22`,border:`2px solid ${sel?C.green:`${col}66`}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.15s",boxShadow:sel?`0 0 0 4px ${C.greenLight}`:C.shadow}}>
        <span style={{fontSize:18,fontWeight:900,color:sel?"#fff":C.text,fontFamily:"'Georgia',serif"}}>{pot.label}</span>
        <span style={{fontSize:9,color:sel?"#fff":C.textSoft}}>circular</span>
      </div>
    </div>;
    return <div onClick={()=>onSelect(sel?null:pot.label)} style={{background:sel?C.green:`${col}22`,border:`2px solid ${sel?C.green:`${col}66`}`,borderRadius:12,padding:"12px 16px",cursor:"pointer",transition:"all 0.15s",minHeight:64,display:"flex",flexDirection:"column",justifyContent:"space-between",boxShadow:sel?`0 0 0 4px ${C.greenLight}`:C.shadow,gridColumn:fullWidth?"1 / -1":"auto"}}>
      <span style={{fontSize:22,fontWeight:900,color:sel?"#fff":C.text,fontFamily:"'Georgia',serif"}}>{pot.label}</span>
      <span style={{fontSize:10,color:sel?"#ffffffcc":C.textSoft}}>{pot.circular?"~1m²":"2×1m"}</span>
    </div>;
  };
  if(roomId==="S1")return <div style={{background:C.bg,borderRadius:14,padding:10,border:`1px solid ${C.border}`}}>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>{[[0,1],[2,3],[4,5]].map((pair,ri)=><div key={ri} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{pair.map(idx=><PC key={pots[idx].label} pot={pots[idx]} idx={idx}/>)}</div>)}</div>
  </div>;
  return <div style={{background:C.bg,borderRadius:14,padding:10,border:`1px solid ${C.border}`}}>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><PC pot={pots[0]} idx={0}/><PC pot={pots[1]} idx={1}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}><PC pot={pots[2]} idx={2} fullWidth/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"center"}}><PC pot={pots[3]} idx={3}/><PC pot={pots[4]} idx={4}/></div>
    </div>
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
  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});

  useEffect(()=>{
    db.query("pots",`room_id=eq.${roomId}&pot_label=eq.${potLabel}`).then(pots=>{
      if(pots[0]){
        setPotId(pots[0].id);
        const w=pots[0].grid_w||gridW, h=pots[0].grid_h||gridH;
        setGridW(w); setGridH(h);
        db.query("pot_cells",`pot_id=eq.${pots[0].id}&cycle_id=eq.${cycle.id}&order=cell_index.asc`).then(existingCells=>{
          const arr=Array(w*h).fill(null);
          existingCells.forEach(c=>{if(c.cell_index<arr.length)arr[c.cell_index]=c.genetic_name;});
          setCells(arr);
        }).catch(()=>{});
      }
    }).catch(()=>{});
  },[roomId,potLabel,cycle.id]);

  const updateGrid=(w,h)=>{setGridW(w);setGridH(h);setCells(Array(w*h).fill(null));};
  const paint=i=>setCells(prev=>{const n=[...prev];n[i]=n[i]===brush?null:brush;return n;});

  const save=async()=>{
    if(!potId){setToastLocal("Sin ID de macetón — verificá Supabase");return;}
    setSaving(true);
    try{
      await db.update("pots",potId,{grid_w:gridW,grid_h:gridH});
      await db.deleteWhere("pot_cells","pot_id",potId);
      const newCells=cells.map((g,i)=>({pot_id:potId,cycle_id:cycle.id,cell_index:i,genetic_name:g,updated_at:new Date().toISOString()})).filter(c=>c.genetic_name);
      if(newCells.length>0)await db.insert("pot_cells",newCells);
      onSaved();
    }finally{setSaving(false);}
  };

  const [toastLocal,setToastLocal]=useState(null);
  const summary=cycleGenetics.map(g=>({...g,count:cells.filter(c=>c===g.genetic_name).length}));
  const total=cells.filter(Boolean).length;

  return <div style={{marginTop:16,background:C.surfaceAlt,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
    {toastLocal&&<Toast msg={toastLocal} type="error" onClose={()=>setToastLocal(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontSize:15,fontWeight:800,color:C.text}}>Macetón {potLabel} {pot?.circular?"— circular":"— 2×1m"}</div>
      <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:C.textSoft}}>×</button>
    </div>
    <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:12,color:C.textSoft}}>Distribución:</span>
      {[{l:"Ancho",v:gridW,set:v=>updateGrid(v,gridH),max:pot?.circular?4:8},{l:"Largo",v:gridH,set:v=>updateGrid(gridW,v),max:pot?.circular?4:10}].map(f=><label key={f.l} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.textMid}}>
        {f.l}<input type="number" min={1} max={f.max} value={f.v} onChange={e=>f.set(Math.max(1,Math.min(f.max,+e.target.value)))} style={{width:48,padding:"6px 8px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,textAlign:"center",color:C.text,background:C.surface}}/>
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
        {summary.map(g=><div key={g.genetic_name} style={{marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><div style={{width:10,height:10,borderRadius:"50%",background:genMap[g.genetic_name]||C.green,flexShrink:0}}/><span style={{fontSize:12,color:C.text,fontWeight:600}}>{g.genetic_name}</span></div>
          <div style={{fontSize:28,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{g.count}</div>
          <div style={{fontSize:10,color:C.textSoft}}>plantas</div>
        </div>)}
        <Divider/>
        <div style={{fontSize:11,color:C.textSoft}}>Total</div>
        <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>{total}</div>
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
    <FI label="Duración (min)" type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Ej: 15"/>
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
function PhaseModal({roomId,cycle,user,onClose,onSaved}){
  const [phase,setPhase]=useState(cycle?.phase||"vegetativo");
  const [flowerStart,setFlowerStart]=useState(todayISO);
  const [estimatedHarvest,setEstimatedHarvest]=useState(addDays(todayISO,65));
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    setSaving(true);
    try{
      if(cycle){await db.update("cycles",cycle.id,{phase,flower_start:phase==="floración"?flowerStart:cycle.flower_start,estimated_harvest:phase==="floración"?estimatedHarvest:cycle.estimated_harvest});}
      else{await db.insert("cycles",{room_id:roomId,phase,flower_start:flowerStart,estimated_harvest:estimatedHarvest,irrigation_type:roomId==="S1"?"automático":"manual",active:true});}
      if(phase==="floración"){
        const hitos=[{l:"Zoil Monkey 1",t:"nutricion",o:0},{l:"Poda 1 — día 15",t:"poda",o:15},{l:"Zoil Monkey 2",t:"nutricion",o:15},{l:"Poda 2 — día 21",t:"poda",o:21}];
        for(const h of hitos)await db.insert("tasks",{title:`${h.l} ${roomId}`,room_id:roomId,type:h.t,assignee:"Lucas",due_date:addDays(flowerStart,h.o),status:"pendiente",priority:h.t==="poda"?"alta":"normal",auto_generated:true,created_by:"sistema"});
      }
      await logA(user.name,`Fase ${roomId} → ${phase}`,"cycle");
      onSaved();
    }finally{setSaving(false);}
  };
  return <Modal title={`Fase — ${roomId}`} onClose={onClose}>
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
      {["vegetativo","floración","cosechando"].map(p=>{const m=PM[p];return <button key={p} onClick={()=>setPhase(p)} style={{padding:"14px 16px",borderRadius:12,border:`2px solid ${phase===p?m.color:C.border}`,background:phase===p?m.bg:C.surface,cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:m.color}}/><span style={{fontSize:15,fontWeight:700,color:C.text}}>{m.label}</span>{phase===p&&<span style={{marginLeft:"auto"}}>✓</span>}
      </button>;})}
    </div>
    {phase==="floración"&&<>
      <FI label="Inicio floración" type="date" value={flowerStart} onChange={e=>{setFlowerStart(e.target.value);setEstimatedHarvest(addDays(e.target.value,65));}}/>
      <FI label="Cosecha estimada" type="date" value={estimatedHarvest} onChange={e=>setEstimatedHarvest(e.target.value)}/>
      <div style={{background:C.greenLight,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.textMid,marginBottom:12}}>⚡ Se generan tareas de poda y Zoil automáticamente</div>
    </>}
    <div style={{display:"flex",gap:10}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Confirmar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function AddGenModal({cycleId,genetics,existing,onClose,onSaved}){
  const avail=genetics.filter(g=>!existing.map(e=>e.genetic_name).includes(g.name));
  const [sel,setSel]=useState(avail[0]?.name||"");
  const [count,setCount]=useState("12");
  const [saving,setSaving]=useState(false);
  if(avail.length===0)return <Modal title="Agregar genética" onClose={onClose}><div style={{textAlign:"center",padding:"20px 0",color:C.textSoft}}>Todas las genéticas ya están en el ciclo</div></Modal>;
  const save=async()=>{setSaving(true);try{await db.insert("cycle_genetics",{cycle_id:cycleId,genetic_name:sel,plant_count:+count});onSaved();}finally{setSaving(false);}};
  return <Modal title="Agregar genética al ciclo" onClose={onClose}>
    <FS label="Genética" value={sel} onChange={e=>setSel(e.target.value)} options={avail.map(g=>({value:g.name,label:g.name}))}/>
    <FI label="Cantidad de plantas" type="number" value={count} onChange={e=>setCount(e.target.value)}/>
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving||!sel} style={{flex:1}}>{saving?"Guardando...":"Agregar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}
function TimerModal({onClose}){
  const [secs,setSecs]=useState(0);
  const [running,setRunning]=useState(false);
  const [preset,setPreset]=useState(15);
  const [countdown,setCountdown]=useState(false);
  const iv=useRef(null);
  useEffect(()=>{
    if(running){iv.current=setInterval(()=>setSecs(s=>{if(countdown&&s<=1){setRunning(false);clearInterval(iv.current);return 0;}return countdown?s-1:s+1;}),1000);}
    else clearInterval(iv.current);
    return()=>clearInterval(iv.current);
  },[running,countdown]);
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const pct=countdown&&preset*60>0?Math.round((1-secs/(preset*60))*100):0;
  return <Modal title="⏱ Timer de riego" onClose={onClose}>
    <div style={{textAlign:"center",margin:"20px 0"}}>
      <div style={{fontSize:60,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{fmt(secs)}</div>
      {countdown&&<div style={{marginTop:12}}><Bar value={pct} max={100} color={C.blue} h={10}/><div style={{fontSize:12,color:C.textSoft,marginTop:6}}>{pct}% completado</div></div>}
    </div>
    {!running&&secs===0&&<>
      <FI label="Minutos para countdown" type="number" value={preset} onChange={e=>setPreset(+e.target.value)} min="1" max="120"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <Btn onClick={()=>{setSecs(preset*60);setCountdown(true);setRunning(true);}} style={{fontSize:13}}>▶ Cuenta {preset}min</Btn>
        <Btn onClick={()=>{setSecs(0);setCountdown(false);setRunning(true);}} v="secondary" style={{fontSize:13}}>▶ Cronómetro</Btn>
      </div>
    </>}
    {(running||secs>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Btn onClick={()=>setRunning(!running)} style={{fontSize:14}}>{running?"⏸ Pausar":"▶ Continuar"}</Btn>
      <Btn onClick={()=>{setRunning(false);setSecs(0);}} v="secondary" style={{fontSize:14}}>↺ Reiniciar</Btn>
    </div>}
  </Modal>;
}

// TAREAS PAGE
function TareasPage({user}){
  const [tasks,setTasks]=useState([]);
  const [view,setView]=useState("hoy");
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [showRec,setShowRec]=useState(false);
  const [showDone,setShowDone]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [newT,setNewT]=useState({title:"",room_id:"S1",type:"riego",assignee:user.name,due_date:todayISO,priority:"normal",recurrent:false,recurrent_days:1,trigger_type:"fecha_fija"});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const data=view==="hoy"
        ?await db.query("tasks",`due_date=eq.${todayISO}&order=priority.desc,created_at.asc`)
        :await db.query("tasks",`due_date=gte.${todayISO}&due_date=lte.${addDays(todayISO,6)}&order=due_date.asc,priority.desc`);
      setTasks(data);
    }finally{setLoading(false);}
  },[view]);
  useEffect(()=>{load();},[load]);

  const toggle=async task=>{
    const ns=task.status==="completada"?"pendiente":"completada";
    await db.update("tasks",task.id,{status:ns,completed_at:ns==="completada"?new Date().toISOString():null});
    if(ns==="completada"&&task.recurrent&&task.recurrent_days){
      await db.insert("tasks",{title:task.title,room_id:task.room_id,type:task.type,assignee:task.assignee,due_date:addDays(task.due_date,task.recurrent_days),status:"pendiente",priority:task.priority,recurrent:true,recurrent_days:task.recurrent_days,created_by:"sistema"});
    }
    await logA(user.name,`${ns==="completada"?"Completó":"Reabrió"}: ${task.title}`,"task");
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:ns}:t));
    setToast({msg:ns==="completada"?"Completada ✓":"Reabierta",type:"success"});
  };
  const addTask=async()=>{
    if(!newT.title.trim())return;
    setSaving(true);
    try{const ins=await db.insert("tasks",{...newT,status:"pendiente",created_by:user.name});setTasks(prev=>[...prev,ins[0]]);setShowForm(false);setToast({msg:"Tarea creada ✓",type:"success"});}
    catch{setToast({msg:"Error al guardar",type:"error"});}
    finally{setSaving(false);}
  };

  const pending=tasks.filter(t=>t.status==="pendiente");
  const done=tasks.filter(t=>t.status==="completada");
  const byRoom={S1:[],S2:[],General:[]};
  pending.forEach(t=>{if(t.room_id==="S1")byRoom.S1.push(t);else if(t.room_id==="S2")byRoom.S2.push(t);else byRoom.General.push(t);});
  const recTasks=tasks.filter(t=>t.recurrent);

  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>Tareas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Nueva</Btn>
    </div>
    {showForm&&<Card>
      <SL>Nueva tarea</SL>
      <FI label="Título *" value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))} placeholder="Ej: Fumigación S1"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FS label="Sala" value={newT.room_id} onChange={e=>setNewT(p=>({...p,room_id:e.target.value}))} options={["S1","S2"]}/>
        <FS label="Tipo" value={newT.type} onChange={e=>setNewT(p=>({...p,type:e.target.value}))} options={Object.keys(TM)}/>
        <FS label="Responsable" value={newT.assignee} onChange={e=>setNewT(p=>({...p,assignee:e.target.value}))} options={["Lucas","Alex","Gustavo","Alexis"]}/>
        <FS label="Prioridad" value={newT.priority} onChange={e=>setNewT(p=>({...p,priority:e.target.value}))} options={["normal","alta"]}/>
      </div>
      <FI label="Fecha" type="date" value={newT.due_date} onChange={e=>setNewT(p=>({...p,due_date:e.target.value}))}/>
      <label style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:C.textMid,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={newT.recurrent} onChange={e=>setNewT(p=>({...p,recurrent:e.target.checked}))} style={{width:18,height:18}}/>Tarea recurrente
      </label>
      {newT.recurrent&&<div style={{background:C.greenLight,borderRadius:12,padding:14,marginBottom:12}}>
        <FS label="Disparador" value={newT.trigger_type} onChange={e=>setNewT(p=>({...p,trigger_type:e.target.value}))} options={[{value:"fecha_fija",label:"Fecha fija"},{value:"inicio_floracion",label:"Desde inicio floración"}]}/>
        <FI label="Repetir cada (días)" type="number" value={newT.recurrent_days} onChange={e=>setNewT(p=>({...p,recurrent_days:+e.target.value}))} placeholder="Ej: 2"/>
      </div>}
      <div style={{display:"flex",gap:10}}><Btn onClick={addTask} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}

    <div style={{display:"flex",gap:8}}>
      {[{id:"hoy",label:"Hoy"},{id:"semana",label:"Esta semana"}].map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{flex:1,padding:12,borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700,background:view===v.id?C.green:C.surface,color:view===v.id?"#fff":C.textMid,border:`1.5px solid ${view===v.id?C.green:C.border}`}}>{v.label}</button>)}
    </div>

    {loading?<Spin/>:view==="hoy"?<>
      {Object.entries(byRoom).map(([room,tList])=>tList.length===0?null:
        <div key={room} style={{marginBottom:4}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,color:room==="S1"?C.amber:room==="S2"?C.blue:C.textSoft,display:"flex",alignItems:"center",gap:6}}>
            {room==="S1"?"🌿 Sala 1":room==="S2"?"🏠 Sala 2":"📋 General"} <span style={{fontSize:10,color:C.textSoft,fontWeight:400}}>({tList.length})</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>{tList.map(t=><TaskRow key={t.id} t={t} onToggle={toggle}/>)}</div>
        </div>
      )}
      {pending.length===0&&done.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>Sin tareas para hoy ✓</div>}
      {done.length>0&&<>
        <button onClick={()=>setShowDone(!showDone)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.textSoft,display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>{showDone?"▲":"▼"} Completadas ({done.length})</button>
        {showDone&&<div style={{display:"flex",flexDirection:"column",gap:8,opacity:0.6}}>{done.map(t=><TaskRow key={t.id} t={t} onToggle={toggle}/>)}</div>}
      </>}
    </>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {tasks.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"24px 0"}}>Sin tareas esta semana</div>}
      {tasks.map(t=><TaskRow key={t.id} t={t} onToggle={toggle}/>)}
    </div>}

    {recTasks.length>0&&<Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowRec(!showRec)}>
        <SL style={{marginBottom:0}}>Recurrentes activas ({recTasks.length})</SL>
        <span style={{fontSize:14,color:C.textSoft}}>{showRec?"▲":"▼"}</span>
      </div>
      {showRec&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:14}}>
        {recTasks.map(t=>{const tm=TM[t.type]||TM.revision;return <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`}}>
          <span>{tm.icon}</span>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.title}</div><div style={{fontSize:11,color:C.textSoft}}>{t.room_id&&`${t.room_id} · `}↻{t.recurrent_days}d · {t.assignee} · {fmtDate(t.due_date)}</div></div>
          <Badge label={t.assignee[0]} color={C.green} bg={C.greenLight}/>
        </div>;})}
      </div>}
    </Card>}
  </div>;
}

// VEGETATIVO PAGE
function VegetativoPage({genetics,user}){
  const [stock,setStock]=useState([]);
  const [cloners,setCloners]=useState([]);
  const [clSlots,setClSlots]=useState([]);
  const [tab,setTab]=useState("madres");
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [showAddM,setShowAddM]=useState(false);
  const [showAddP,setShowAddP]=useState(false);
  const [showEsp,setShowEsp]=useState(null);

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([db.get("veg_stock"),db.get("cloners"),db.get("cloner_slots")])
      .then(([s,c,cs])=>{setStock(s);setCloners(c);setClSlots(cs);}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);

  const genMap={};genetics.forEach(g=>{genMap[g.name]=g.color;});
  const mothers=stock.filter(s=>s.type==="madre");
  const postClone=stock.filter(s=>s.type==="post_esqueje");
  const delItem=async id=>{await db.delete("veg_stock",id);setStock(prev=>prev.filter(s=>s.id!==id));setToast({msg:"Eliminado",type:"success"});};

  if(loading)return <Spin/>;
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showAddM&&<VegModal type="madre" genetics={genetics} onClose={()=>setShowAddM(false)} onSaved={()=>{setShowAddM(false);load();setToast({msg:"Guardado ✓",type:"success"});}}/>}
    {showAddP&&<VegModal type="post_esqueje" genetics={genetics} onClose={()=>setShowAddP(false)} onSaved={()=>{setShowAddP(false);load();setToast({msg:"Guardado ✓",type:"success"});}}/>}
    {showEsp!==null&&<EspejeraModal cloner={cloners.find(c=>c.id===showEsp)} slots={clSlots.filter(s=>s.cloner_id===showEsp)} genetics={genetics} onClose={()=>setShowEsp(null)} onSaved={()=>{setShowEsp(null);load();setToast({msg:"Espejera guardada ✓",type:"success"});}}/>}

    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",paddingTop:8}}>Vegetativo</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {[{l:"Madres",v:mothers.filter(m=>m.status==="activa").reduce((a,m)=>a+m.count,0),w:mothers.filter(m=>m.status==="renovar").length,i:"🌳"},
        {l:"Esquejes",v:clSlots.filter(s=>s.genetic_name).length,sub:`/${cloners.reduce((a,c)=>a+c.capacity,0)}`,i:"🌿"},
        {l:"Post-esq.",v:postClone.reduce((a,p)=>a+p.count,0),i:"🪴"}
      ].map(s=><Card key={s.l} style={{padding:"14px",textAlign:"center"}}>
        <div style={{fontSize:22}}>{s.i}</div>
        <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",margin:"6px 0 2px"}}>{s.v}{s.sub&&<span style={{fontSize:12,color:C.textSoft,fontWeight:400}}>{s.sub}</span>}</div>
        <div style={{fontSize:11,color:C.textSoft}}>{s.l}</div>
        {s.w>0&&<div style={{fontSize:11,color:C.amber,fontWeight:700,marginTop:4}}>⚠ {s.w} renovar</div>}
      </Card>)}
    </div>
    <div style={{display:"flex",gap:8}}>
      {[{id:"madres",l:"🌳 Madres"},{id:"espejeras",l:"🌿 Espejeras"},{id:"post",l:"🪴 Post-esq."}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"11px 6px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700,background:tab===t.id?C.green:C.surface,color:tab===t.id?"#fff":C.textMid,border:`1.5px solid ${tab===t.id?C.green:C.border}`}}>{t.l}</button>)}
    </div>

    {tab==="madres"&&<>
      {user.role==="admin"&&<div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setShowAddM(true)} v="secondary" style={{fontSize:13}}>+ Agregar madre</Btn></div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {mothers.map(m=>{const days=daysFrom(m.entry_date);const renovar=m.status==="renovar";const col=genMap[m.genetic_name]||C.green;
          return <Card key={m.id} style={{padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${col}22`,border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌳</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:C.text}}>{m.genetic_name}</div><div style={{fontSize:12,color:C.textSoft}}>Maceta {m.pot_label} · {fmtDate(m.entry_date)} · {m.count} pl.</div></div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{fontSize:22,fontWeight:900,color:days>180?C.amber:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{days}d</div>
              <Badge label={m.status} color={renovar?C.amber:C.green} bg={renovar?C.amberLight:C.greenLight}/>
              {user.role==="admin"&&<button onClick={()=>delItem(m.id)} style={{fontSize:11,color:C.red,background:"transparent",border:"none",cursor:"pointer",padding:0}}>Eliminar</button>}
            </div>
          </div></Card>;})}
        {mothers.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"20px 0"}}>Sin madres registradas</div>}
      </div>
    </>}

    {tab==="espejeras"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {cloners.map(cl=>{
        const slots=clSlots.filter(s=>s.cloner_id===cl.id);
        const used=slots.filter(s=>s.genetic_name).length;
        const gC={};slots.forEach(s=>{if(s.genetic_name)gC[s.genetic_name]=(gC[s.genetic_name]||0)+1;});
        return <Card key={cl.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>{cl.label}</div><div style={{fontSize:12,color:C.textSoft}}>{used}/{cl.capacity}</div></div>
            <Btn onClick={()=>setShowEsp(cl.id)} v="secondary" style={{padding:"8px 14px",fontSize:12}}>Configurar</Btn>
          </div>
          <Bar value={used} max={cl.capacity} h={8}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
            {Object.entries(gC).map(([g,n])=><span key={g} style={{background:`${genMap[g]||C.green}22`,color:genMap[g]||C.green,border:`1px solid ${genMap[g]||C.green}44`,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{g}: {n}</span>)}
            {used===0&&<span style={{color:C.textSoft,fontSize:12,fontStyle:"italic"}}>Vacía — tocá Configurar</span>}
          </div>
          {used>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:3,marginTop:12}}>
            {Array.from({length:cl.capacity},(_,i)=>{const s=slots.find(sl=>sl.slot_index===i);return <div key={i} style={{aspectRatio:"1",borderRadius:3,background:s?.genetic_name?genMap[s.genetic_name]||C.green:C.border}} title={s?.genetic_name||"vacío"}/>;})}
          </div>}
        </Card>;
      })}
    </div>}

    {tab==="post"&&<>
      {user.role==="admin"&&<div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setShowAddP(true)} v="secondary" style={{fontSize:13}}>+ Agregar stock</Btn></div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {postClone.map(p=>{const col=genMap[p.genetic_name]||C.green;
          return <Card key={p.id} style={{padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${col}22`,border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🪴</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:C.text}}>{p.genetic_name}</div><div style={{fontSize:12,color:C.textSoft}}>Maceta {p.pot_label} · {p.status}</div></div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",lineHeight:1}}>{p.count}</div>
              <div style={{fontSize:11,color:C.textSoft}}>plantas</div>
              {user.role==="admin"&&<button onClick={()=>delItem(p.id)} style={{fontSize:11,color:C.red,background:"transparent",border:"none",cursor:"pointer",padding:0}}>Eliminar</button>}
            </div>
          </div></Card>;})}
        {postClone.length===0&&<div style={{textAlign:"center",color:C.textSoft,fontSize:14,fontStyle:"italic",padding:"20px 0"}}>Sin stock post-esqueje</div>}
      </div>
    </>}
  </div>;
}

function VegModal({type,genetics,item,onClose,onSaved}){
  const [gn,setGn]=useState(item?.genetic_name||genetics[0]?.name||"");
  const [cnt,setCnt]=useState(item?.count?.toString()||"1");
  const [pot,setPot]=useState(item?.pot_label||"");
  const [status,setStatus]=useState(item?.status||(type==="madre"?"activa":"post-esqueje"));
  const [date,setDate]=useState(item?.entry_date||todayISO);
  const [saving,setSaving]=useState(false);
  const save=async()=>{setSaving(true);try{const data={type,genetic_name:gn,count:+cnt,pot_label:pot,status,entry_date:date,updated_at:new Date().toISOString()};if(item)await db.update("veg_stock",item.id,data);else await db.insert("veg_stock",data);onSaved();}finally{setSaving(false);}};
  return <Modal title={`${type==="madre"?"🌳 Madre":"🪴 Post-esqueje"} — ${item?"Editar":"Agregar"}`} onClose={onClose}>
    <FS label="Genética" value={gn} onChange={e=>setGn(e.target.value)} options={genetics.map(g=>({value:g.name,label:g.name}))}/>
    <FI label="Cantidad" type="number" value={cnt} onChange={e=>setCnt(e.target.value)}/>
    <FI label="Maceta / Ubicación" value={pot} onChange={e=>setPot(e.target.value)} placeholder="Ej: M-01"/>
    <FI label="Fecha de ingreso" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
    {type==="madre"?<FS label="Estado" value={status} onChange={e=>setStatus(e.target.value)} options={["activa","renovar","inactiva"]}/>
      :<FS label="Etapa" value={status} onChange={e=>setStatus(e.target.value)} options={["post-esqueje","vegetativo","lista"]}/>}
    <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}

function EspejeraModal({cloner,slots,genetics,onClose,onSaved}){
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4,marginBottom:14}}>
      {cells.map((c,i)=><div key={i} onClick={()=>paint(i)} style={{aspectRatio:"1",borderRadius:5,cursor:"pointer",background:c?genMap[c]||C.green:C.border,border:`1px solid ${c?"transparent":C.borderStrong}`,transition:"background 0.08s"}}/>)}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {Object.entries(gC).map(([g,n])=><span key={g} style={{background:`${genMap[g]||C.green}22`,color:genMap[g]||C.green,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{g}: {n}</span>)}
    </div>
    <div style={{display:"flex",gap:10}}><Btn onClick={save} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar espejera"}</Btn><Btn onClick={onClose} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
  </Modal>;
}

// GENÉTICAS PAGE
function GeneticasPage({genetics,setGenetics,user}){
  const [showForm,setShowForm]=useState(false);
  const [showLib,setShowLib]=useState(null);
  const [newG,setNewG]=useState({name:"",color:GP[0],notes:"",flower_days:"65"});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const add=async()=>{if(!newG.name.trim())return;setSaving(true);try{const ins=await db.insert("genetics",{name:newG.name.trim(),color:newG.color,notes:newG.notes,flower_days:+newG.flower_days||65});await logA(user.name,`Agregó genética: ${newG.name}`,"genetics");setGenetics(prev=>[...prev,ins[0]]);setNewG({name:"",color:GP[(genetics.length+1)%GP.length],notes:"",flower_days:"65"});setShowForm(false);setToast({msg:"Agregada ✓",type:"success"});}catch{setToast({msg:"Error",type:"error"});}finally{setSaving(false);}};
  const del=async(id,name)=>{await db.delete("genetics",id);await logA(user.name,`Eliminó genética: ${name}`,"genetics");setGenetics(prev=>prev.filter(g=>g.id!==id));setToast({msg:"Eliminada",type:"success"});};
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showLib&&<Modal title={`📖 ${showLib.name}`} onClose={()=>setShowLib(null)}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:56,height:56,borderRadius:14,background:showLib.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#fff",fontWeight:900}}>{showLib.name[0]}</div><div><div style={{fontSize:20,fontWeight:900,color:C.text}}>{showLib.name}</div>{showLib.flower_days&&<div style={{fontSize:13,color:C.textSoft}}>~{showLib.flower_days} días de floración</div>}</div></div>
      <Divider/>
      {showLib.notes?<><SL>Notas de cultivo</SL><div style={{fontSize:14,color:C.text,lineHeight:1.6,background:C.bg,borderRadius:12,padding:16}}>{showLib.notes}</div></>:<div style={{fontSize:13,color:C.textSoft,fontStyle:"italic",textAlign:"center",padding:"20px 0"}}>Sin notas — editá esta genética para agregar</div>}
    </Modal>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>Genéticas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Agregar</Btn>
    </div>
    {showForm&&<Card>
      <SL>Nueva genética</SL>
      <FI label="Nombre *" value={newG.name} onChange={e=>setNewG(p=>({...p,name:e.target.value}))} placeholder="Ej: Gorilla Glue #4"/>
      <FI label="Días de floración" type="number" value={newG.flower_days} onChange={e=>setNewG(p=>({...p,flower_days:e.target.value}))}/>
      <FI label="Notas de cultivo" value={newG.notes} onChange={e=>setNewG(p=>({...p,notes:e.target.value}))} placeholder="Características, comportamiento..."/>
      <div style={{marginBottom:12}}><label style={{fontSize:12,color:C.textSoft,display:"block",marginBottom:8}}>Color</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{GP.map(col=><div key={col} onClick={()=>setNewG(p=>({...p,color:col}))} style={{width:36,height:36,borderRadius:10,background:col,cursor:"pointer",border:`3px solid ${newG.color===col?"#fff":"transparent"}`,boxShadow:newG.color===col?`0 0 0 3px ${col}`:C.shadow,transition:"all 0.1s"}}/>)}</div></div>
      <div style={{display:"flex",gap:10}}><Btn onClick={add} disabled={saving} style={{flex:1}}>{saving?"Guardando...":"Guardar"}</Btn><Btn onClick={()=>setShowForm(false)} v="secondary" style={{flex:1}}>Cancelar</Btn></div>
    </Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {genetics.map(g=><Card key={g.id} style={{padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:14,background:g.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,color:"#fff",fontWeight:900}}>{g.name[0]}</div>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:C.text}}>{g.name}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><div style={{width:12,height:12,borderRadius:"50%",background:g.color}}/>{g.flower_days&&<span style={{fontSize:12,color:C.textSoft}}>~{g.flower_days}d</span>}</div>{g.notes&&<div style={{fontSize:12,color:C.textSoft,marginTop:4,fontStyle:"italic"}}>{g.notes.substring(0,60)}{g.notes.length>60?"...":""}</div>}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <Btn onClick={()=>setShowLib(g)} v="secondary" style={{padding:"8px 12px",fontSize:14}}>📖</Btn>
          {user.role==="admin"&&<Btn onClick={()=>del(g.id,g.name)} v="danger" style={{padding:"8px 14px",fontSize:12}}>Eliminar</Btn>}
        </div>
      </div></Card>)}
    </div>
  </div>;
}

// ESTADÍSTICAS
function EstadisticasPage(){
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      db.query("tasks","order=created_at.desc&limit=300"),
      db.query("watering_logs","order=logged_at.desc&limit=100"),
      db.query("nutrition_logs","order=logged_at.desc&limit=100"),
    ]).then(([tasks,wl,nl])=>{
      const byUser={};
      tasks.forEach(t=>{if(!byUser[t.assignee])byUser[t.assignee]={total:0,done:0};byUser[t.assignee].total++;if(t.status==="completada")byUser[t.assignee].done++;});
      const byType={};
      tasks.forEach(t=>{byType[t.type]=(byType[t.type]||0)+1;});
      const wByRoom={S1:0,S2:0};
      wl.forEach(w=>{if(wByRoom[w.room_id]!==undefined)wByRoom[w.room_id]++;});
      setStats({byUser,byType,wByRoom,total:tasks.length,done:tasks.filter(t=>t.status==="completada").length,wCount:wl.length,nCount:nl.length});
    }).finally(()=>setLoading(false));
  },[]);
  if(loading)return <Spin/>;
  if(!stats)return null;
  const pct=(d,t)=>t>0?Math.round(d/t*100):0;
  const maxU=Math.max(...Object.values(stats.byUser).map(u=>u.total),1);
  return <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:32}}>
    <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif",paddingTop:8}}>Estadísticas</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
      {[{l:"Tareas totales",v:stats.total,i:"✓",c:C.green},{l:"Completadas",v:`${pct(stats.done,stats.total)}%`,i:"🎯",c:C.green},{l:"Riegos registrados",v:stats.wCount,i:"💧",c:C.blue},{l:"Aplicaciones nutrición",v:stats.nCount,i:"🌱",c:C.green}].map(s=><Card key={s.l} style={{padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:11,color:C.textSoft,marginBottom:4}}>{s.l}</div><div style={{fontSize:32,fontWeight:900,color:s.c,fontFamily:"'Georgia',serif"}}>{s.v}</div></div>
          <span style={{fontSize:24}}>{s.i}</span>
        </div>
      </Card>)}
    </div>
    <Card>
      <SL>Tareas por usuario</SL>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {Object.entries(stats.byUser).sort((a,b)=>b[1].total-a[1].total).map(([name,data])=><div key={name}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>{name}</span><span style={{fontSize:13,color:C.textSoft}}>{data.done}/{data.total} · {pct(data.done,data.total)}%</span></div>
          <div style={{position:"relative",height:10,background:C.border,borderRadius:99,overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:`${pct(data.total,maxU)}%`,height:"100%",background:C.greenLight,borderRadius:99}}/>
            <div style={{position:"absolute",top:0,left:0,width:`${pct(data.done,maxU)}%`,height:"100%",background:C.green,borderRadius:99}}/>
          </div>
        </div>)}
      </div>
    </Card>
    <Card>
      <SL>Tareas por tipo</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).map(([type,count])=>{
          const tm=TM[type]||TM.revision;
          const max=Math.max(...Object.values(stats.byType),1);
          return <div key={type} style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:16,width:24}}>{tm.icon}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:C.text}}>{tm.label}</span><span style={{fontSize:13,fontWeight:700,color:C.textMid}}>{count}</span></div>
              <Bar value={count} max={max} color={tm.color} h={6}/>
            </div>
          </div>;
        })}
      </div>
    </Card>
    <Card>
      <SL>Riegos por sala</SL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {Object.entries(stats.wByRoom).map(([room,count])=><div key={room} style={{background:C.bg,borderRadius:12,padding:14,textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textSoft,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{room}</div>
          <div style={{fontSize:36,fontWeight:900,color:C.blue,fontFamily:"'Georgia',serif"}}>{count}</div>
          <div style={{fontSize:11,color:C.textSoft}}>riegos</div>
        </div>)}
      </div>
    </Card>
  </div>;
}

// PLAGAS
function PlagasPage({user}){
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
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
      <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>Plagas</div>
      <Btn onClick={()=>setShowForm(!showForm)}>+ Registrar</Btn>
    </div>
    {showForm&&<Card>
      <SL>Nuevo registro</SL>
      <FS label="Sala" value={newR.room_id} onChange={e=>setNewR(p=>({...p,room_id:e.target.value}))} options={["S1","S2","Vegetativo"]}/>
      <FI label="Tipo de plaga / problema *" value={newR.pest_type} onChange={e=>setNewR(p=>({...p,pest_type:e.target.value}))} placeholder="Ej: Araña roja, Trips, Oídio"/>
      <FI label="Producto usado" value={newR.product} onChange={e=>setNewR(p=>({...p,product:e.target.value}))} placeholder="Ej: Aceite de Neem"/>
      <FI label="Fecha de detección" type="date" value={newR.detected_at} onChange={e=>setNewR(p=>({...p,detected_at:e.target.value}))}/>
      <FI label="Próxima aplicación (días)" type="number" value={newR.frequency_days} onChange={e=>setNewR(p=>({...p,frequency_days:+e.target.value}))}/>
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

// APP
export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [genetics,setGenetics]=useState([]);
  useEffect(()=>{if(user){db.get("genetics").then(setGenetics);logA(user.name,"Inició sesión","auth");}},[user]);
  if(!user)return <LoginScreen onLogin={u=>{setUser(u);setPage(u.role==="admin"?"dashboard":"mi_turno");}}/>;
  const render=()=>{
    switch(page){
      case "mi_turno":     return <MiTurno user={user}/>;
      case "sala_S1":      return <SalaPage roomId="S1" setPage={setPage} user={user} genetics={genetics}/>;
      case "sala_S2":      return <SalaPage roomId="S2" setPage={setPage} user={user} genetics={genetics}/>;
      case "vegetativo":   return <VegetativoPage genetics={genetics} user={user}/>;
      case "tareas":       return <TareasPage user={user}/>;
      case "geneticas":    return <GeneticasPage genetics={genetics} setGenetics={setGenetics} user={user}/>;
      case "estadisticas": return <EstadisticasPage/>;
      case "plagas":       return <PlagasPage user={user}/>;
      default:             return user.role==="admin"?<Dashboard setPage={setPage} user={user}/>:<MiTurno user={user}/>;
    }
  };
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI','Helvetica Neue',sans-serif",color:C.text,maxWidth:480,margin:"0 auto"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:2px;}input,select,button{font-family:inherit;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.page{animation:fadeUp 0.2s ease;}`}</style>
    <TopBar user={user} page={page} setPage={setPage} onLogout={()=>{setUser(null);setPage("dashboard");}}/>
    <NavBar user={user} page={page} setPage={setPage}/>
    <div className="page" style={{padding:"16px 16px 0"}}>{render()}</div>
  </div>;
}
