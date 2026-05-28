import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL="https://ngvrqywloulzdacwxfav.supabase.co";
const SB_KEY="sb_publishable_t1MbfKSq-azS6W93oA4GxA_iO18yk7B";
const sbLoad=async(table)=>{try{const r=await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=id.asc`,{headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}});const rows=await r.json();return rows&&rows.length>0?rows[0].data:null;}catch{return null;}};
const sbSave=async(table,data)=>{try{const r=await fetch(`${SB_URL}/rest/v1/${table}?select=id&limit=1`,{headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}});const rows=await r.json();const method=rows&&rows.length>0?"PATCH":"POST";const url=rows&&rows.length>0?`${SB_URL}/rest/v1/${table}?id=eq.${rows[0].id}`:`${SB_URL}/rest/v1/${table}`;await fetch(url,{method,headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({data})});}catch(e){console.error(e);}};

// ── THEME ─────────────────────────────────────────────────────────────────────
const TH={
  dark:{bg:"#0a0a0a",surface:"#111",surface2:"#1c1c1c",border:"#2a2a2a",text:"#f0f0f0",sub:"#888",muted:"#555",accent:"#ffffff",accentBg:"#ffffff15",card:"#111",input:"#1c1c1c",inputBorder:"#333"},
  light:{bg:"#f4f4f4",surface:"#fff",surface2:"#f0f0f0",border:"#e0e0e0",text:"#111",sub:"#555",muted:"#aaa",accent:"#111",accentBg:"#11111112",card:"#fff",input:"#fff",inputBorder:"#ccc"},
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const STATUS_LIST=["Orçamento","Pedido Confirmado","Elaboração de Arte","Aprovação de Arte","Em Produção","Produção Concluída","Aguardando Retirada/Entrega","Pedido Concluído","Cancelado"];
const ACTIVE_STATUSES=["Pedido Confirmado","Elaboração de Arte","Aprovação de Arte","Em Produção","Produção Concluída","Aguardando Retirada/Entrega"];
const SC={"Orçamento":"#6366f1","Pedido Confirmado":"#3b82f6","Elaboração de Arte":"#f59e0b","Aprovação de Arte":"#a855f7","Em Produção":"#0ea5e9","Produção Concluída":"#8b5cf6","Aguardando Retirada/Entrega":"#f97316","Pedido Concluído":"#10b981","Cancelado":"#ef4444"};
const STATUS_PGTO=["Pendente","Parcial","Pago"];
const PC={"Pendente":"#ef4444","Parcial":"#f59e0b","Pago":"#10b981"};
const ROLES={admin:"Administrador",comercial:"Comercial/Vendedor",financeiro:"Financeiro",producao:"Produção"};
const MODULOS=[
  {id:"dashboard",label:"Dashboard"},{id:"pedidos",label:"Pedidos"},{id:"clientes",label:"Clientes"},
  {id:"colaboradores",label:"Colaboradores"},{id:"produtos",label:"Produtos"},{id:"financeiro",label:"Financeiro"},
  {id:"caixa",label:"Caixa Diário"},{id:"relatorios",label:"Relatórios"},{id:"configuracoes",label:"Configurações"},
];
const PERM_EXCLUIR=["pedidos","clientes","colaboradores","produtos","financeiro","caixa"];
const PERM_ROLES={
  admin:{dashboard:true,pedidos:true,clientes:true,colaboradores:true,produtos:true,financeiro:true,caixa:true,relatorios:true,configuracoes:true,excluir:{pedidos:true,clientes:true,colaboradores:true,produtos:true,financeiro:true,caixa:true}},
  comercial:{dashboard:true,pedidos:true,clientes:true,colaboradores:false,produtos:true,financeiro:false,caixa:true,relatorios:false,configuracoes:false,excluir:{pedidos:false,clientes:false,colaboradores:false,produtos:false,financeiro:false,caixa:false}},
  financeiro:{dashboard:true,pedidos:true,clientes:true,colaboradores:false,produtos:false,financeiro:true,caixa:true,relatorios:true,configuracoes:false,excluir:{pedidos:false,clientes:false,colaboradores:false,produtos:false,financeiro:true,caixa:false}},
  producao:{dashboard:true,pedidos:true,clientes:false,colaboradores:false,produtos:false,financeiro:false,caixa:false,relatorios:false,configuracoes:false,excluir:{pedidos:false,clientes:false,colaboradores:false,produtos:false,financeiro:false,caixa:false}},
};

// ── DEFAULTS ──────────────────────────────────────────────────────────────────
const DEF_EMP={nome:"Criative",logo:""};
const DEF_USERS=[
  {id:1,name:"Admin Criative",email:"admin@criative.com",password:"admin123",role:"admin",ativo:true,permissoes:PERM_ROLES.admin},
  {id:2,name:"Carlos Vendas",email:"carlos@criative.com",password:"123456",role:"comercial",ativo:true,permissoes:PERM_ROLES.comercial},
  {id:3,name:"Ana Financeiro",email:"ana@criative.com",password:"123456",role:"financeiro",ativo:true,permissoes:PERM_ROLES.financeiro},
  {id:4,name:"João Produção",email:"joao@criative.com",password:"123456",role:"producao",ativo:true,permissoes:PERM_ROLES.producao},
];
const DEF_PROD=[
  {id:1,descricao:"Banner 2x1m",unidade:"un",custo:45,venda:90,categoria:"Impressão",margem:50},
  {id:2,descricao:"Cartão de Visita 1000un",unidade:"pct",custo:60,venda:180,categoria:"Impressão",margem:67},
  {id:3,descricao:"Folder A4",unidade:"un",custo:0.5,venda:1.2,categoria:"Impressão",margem:58},
];
const mkItens=()=>[{id:Date.now(),produtoId:"",descricao:"",qtd:1,unitario:0,custo:0,total:0}];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmtM=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
const fmtD=d=>d?new Date(d+"T00:00:00").toLocaleDateString("pt-BR"):"-";
const todayStr=()=>new Date().toISOString().split("T")[0];
const nowTime=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const inRange=(ds,f,t)=>{if(!ds)return false;const d=new Date(ds+"T00:00:00");if(f&&d<new Date(f+"T00:00:00"))return false;if(t&&d>new Date(t+"T00:00:00"))return false;return true;};
const monthLabel=d=>{const dt=new Date(d+"T00:00:00");return dt.toLocaleString("pt-BR",{month:"short",year:"2-digit"});};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const PATHS={
  dashboard:"M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z",
  clients:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm4 10v-2a3 3 0 0 0-3-3h-1",
  orders:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 9l2 2 4-4",
  finance:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18h-2v1.93C7.06 19.44 4.56 16.94 4.07 14H6v-2H4.07C4.56 9.06 7.06 6.56 10 6.07V8h2V6.07c2.94.49 5.44 2.99 5.93 5.93H16v2h1.93c-.49 2.94-2.99 5.44-5.93 5.93z",
  colabs:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  caixa:"M3 6h18M3 12h18M3 18h18",
  produtos:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  relatorios:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  usuarios:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6-3v6m3-3h-6",
  logout:"M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  plus:"M12 4v16m-8-8h16",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  x:"M18 6L6 18M6 6l12 12",
  chart:"M18 20V10M12 20V4M6 20v-6",
  alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  sun:"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  moon:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  kanban:"M4 4h5v16H4zM10 4h5v9h-5zM16 4h4v13h-4z",
  list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  transfer:"M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4",
  print:"M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  cash:"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  minus:"M5 12h14",
  settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  check:"M20 6L9 17l-5-5",
  crown:"M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z",
  cloud:"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
  sync:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
};
const Ico=({n,s=18,c})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]||""}/></svg>;

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
const Inp=({label,t,...p})=><div style={{marginBottom:10}}>{label&&<label style={{display:"block",color:t.sub,fontSize:12,marginBottom:3,fontWeight:500}}>{label}</label>}<input {...p} style={{width:"100%",background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"7px 10px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box",...p.style}}/></div>;
const Txt=({label,t,...p})=><div style={{marginBottom:10}}>{label&&<label style={{display:"block",color:t.sub,fontSize:12,marginBottom:3,fontWeight:500}}>{label}</label>}<textarea {...p} style={{width:"100%",background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"7px 10px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical",minHeight:60,...p.style}}/></div>;
const Sel=({label,children,t,...p})=><div style={{marginBottom:10}}>{label&&<label style={{display:"block",color:t.sub,fontSize:12,marginBottom:3,fontWeight:500}}>{label}</label>}<select {...p} style={{width:"100%",background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"7px 10px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"}}>{children}</select></div>;
const Btn=({children,variant="primary",t,...p})=>{const vs={primary:{background:t?.accent||"#111",color:t?.bg||"#fff"},danger:{background:"#ef4444",color:"#fff"},ghost:{background:t?.surface2||"#eee",color:t?.sub||"#555",border:`1px solid ${t?.border||"#ccc"}`},success:{background:"#10b981",color:"#fff"},outline:{background:"transparent",color:t?.accent||"#111",border:`1px solid ${t?.accent||"#111"}`},warning:{background:"#f59e0b",color:"#fff"}};return <button {...p} style={{...vs[variant],border:"none",borderRadius:7,padding:"7px 13px",cursor:"pointer",fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5,...p.style}}>{children}</button>;};
const Modal=({title,onClose,children,t,wide,xl})=><div style={{position:"fixed",inset:0,background:"#000b",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}><div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:24,width:xl?"min(1000px,97%)":wide?"min(700px,95%)":"min(540px,93%)",maxHeight:"93vh",overflowY:"auto",boxShadow:"0 20px 60px #0009"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,color:t.text,fontSize:16}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",color:t.sub,cursor:"pointer"}}><Ico n="x"/></button></div>{children}</div></div>;
const Badge=({status})=><span style={{background:SC[status]+"22",color:SC[status],padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${SC[status]}44`,whiteSpace:"nowrap"}}>{status}</span>;
const PgtoBadge=({s})=><span style={{background:PC[s]+"22",color:PC[s],padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${PC[s]}44`,whiteSpace:"nowrap"}}>{s||"Pendente"}</span>;
const Card=({title,value,sub,color="#888",icon,t})=><div style={{background:t.card,borderRadius:11,padding:16,border:`1px solid ${color}33`,flex:1,minWidth:130}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><p style={{color:t.sub,fontSize:11,margin:"0 0 3px",fontWeight:500}}>{title}</p><p style={{color,fontSize:19,fontWeight:700,margin:0}}>{value}</p>{sub&&<p style={{color:t.muted,fontSize:10,margin:"3px 0 0"}}>{sub}</p>}</div><div style={{background:color+"22",padding:8,borderRadius:8,color}}>{icon}</div></div></div>;

// ── CHARTS ────────────────────────────────────────────────────────────────────
const BarChart=({data,t,height=160})=>{if(!data||!data.length)return null;const maxVal=Math.max(...data.map(d=>Math.max(d.fat||0,d.desp||0,1)));return <svg viewBox={`0 0 ${data.length*60} ${height+40}`} style={{width:"100%",height:height+40}}>{data.map((d,i)=>{const x=i*60+4;const fatH=((d.fat||0)/maxVal)*(height-10);const despH=((d.desp||0)/maxVal)*(height-10);const margY=height-((d.marg||0)/100)*(height-10);return <g key={i}><rect x={x} y={height-fatH} width={22} height={fatH} fill="#10b98188" rx="3"/><rect x={x+24} y={height-despH} width={22} height={despH} fill="#ef444488" rx="3"/><text x={x+28} y={height+14} textAnchor="middle" fill={t.sub} fontSize="9">{d.label}</text>{i>0&&<line x1={(i-1)*60+28} y1={height-((data[i-1].marg||0)/100)*(height-10)} x2={i*60+28} y2={margY} stroke="#f59e0b" strokeWidth="2"/>}<circle cx={x+28} cy={margY} r="3" fill="#f59e0b"/></g>;})}<line x1="0" y1={height} x2={data.length*60} y2={height} stroke={t.border} strokeWidth="1"/><text x="4" y="10" fill="#10b981" fontSize="9">■ Faturamento</text><text x="70" y="10" fill="#ef4444" fontSize="9">■ Despesas</text><text x="140" y="10" fill="#f59e0b" fontSize="9">● Margem%</text></svg>;};
const LineChart=({data,t,height=120})=>{if(!data||!data.length)return null;const maxVal=Math.max(...data.map(d=>d.val||0),1);const pts=data.map((d,i)=>({x:i*(100/(data.length-1||1)),y:100-((d.val||0)/maxVal)*90,d}));return <svg viewBox="0 0 100 120" preserveAspectRatio="none" style={{width:"100%",height}}>{pts.length>1&&<polyline points={pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#6366f1" strokeWidth="2"/>}{pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="2.5" fill="#6366f1"/><text x={p.x} y="115" textAnchor="middle" fill={t.sub} fontSize="5">{p.d.label}</text></g>)}</svg>;};

// ── PRINT OS ──────────────────────────────────────────────────────────────────
const printOS=(pedido,cliente,vendedor,empresa)=>{const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OS #${pedido.id}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:28px;color:#111;font-size:13px;}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:18px;}.empresa-nome{font-size:22px;font-weight:900;}.os-num{font-size:24px;font-weight:900;text-align:right;}.section{display:flex;gap:14px;margin-bottom:14px;}.box{flex:1;border:1px solid #ddd;border-radius:8px;padding:11px;}.lbl{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}.val{font-size:13px;font-weight:600;}table{width:100%;border-collapse:collapse;margin:14px 0;}thead tr{background:#111;color:#fff;}th{padding:8px 10px;text-align:left;font-size:12px;}td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px;}.tr{background:#f5f5f5;font-weight:700;}.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid #111;margin-right:5px;}.footer{margin-top:28px;display:flex;gap:28px;border-top:1px solid #ddd;padding-top:14px;}.assin{flex:1;border-top:2px solid #888;padding-top:8px;font-size:11px;color:#555;text-align:center;}.obs{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:11px;margin-bottom:14px;}@media print{body{padding:10px;}}</style></head><body><div class="header"><div>${empresa.logo?`<img src="${empresa.logo}" style="max-height:55px;max-width:180px;object-fit:contain;margin-bottom:5px;display:block;" alt="logo"/>`:""}<div class="empresa-nome">${empresa.nome}</div><div style="font-size:12px;color:#555;margin-top:2px;">Ordem de Serviço</div></div><div><div class="os-num">OS #${pedido.id}</div><div style="text-align:right;font-size:11px;color:#777;margin-top:3px;">Emitida: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div><div style="text-align:right;margin-top:6px;"><span class="badge">${pedido.status}</span><span class="badge">${pedido.statusPgto||"Pendente"}</span></div></div></div><div class="section"><div class="box"><div class="lbl">Cliente</div><div class="val">${cliente?.nome||"-"}</div><div style="font-size:12px;color:#555;margin-top:3px;">${cliente?.telefone||""} ${cliente?.email?`· ${cliente.email}`:""}</div></div><div class="box"><div class="lbl">Vendedor</div><div class="val">${vendedor?.nome||"-"}</div><div style="font-size:12px;color:#555;margin-top:3px;">Pedido: ${fmtD(pedido.criado)} · Prazo: ${fmtD(pedido.prazo)}</div></div></div><table><thead><tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${(pedido.itens||[]).map(it=>`<tr><td>${it.descricao||"-"}</td><td>${it.qtd}</td><td>${fmtM(it.unitario)}</td><td>${fmtM(it.total)}</td></tr>`).join("")}<tr class="tr"><td colspan="3" style="text-align:right;padding:9px 10px;">TOTAL DO PEDIDO</td><td>${fmtM(pedido.totalPedido)}</td></tr>${pedido.valorPago>0?`<tr><td colspan="3" style="text-align:right;padding:7px 10px;color:#10b981;">Valor Pago</td><td style="color:#10b981;font-weight:700;">${fmtM(pedido.valorPago)}</td></tr><tr><td colspan="3" style="text-align:right;padding:7px 10px;color:#ef4444;">Saldo Restante</td><td style="color:#ef4444;font-weight:700;">${fmtM(pedido.totalPedido-pedido.valorPago)}</td></tr>`:""}</tbody></table>${pedido.infoCompl?`<div class="obs"><div class="lbl">Observações</div><div style="margin-top:4px;">${pedido.infoCompl}</div></div>`:""}<div class="footer"><div class="assin">Aprovação do Cliente</div><div class="assin">Responsável Produção</div><div class="assin">Conferência / Entrega</div></div><script>window.onload=()=>{window.print();}<\/script></body></html>`;const w=window.open("","_blank","width=850,height=1000");if(w){w.document.write(doc);w.document.close();}};

// ── NOTIF BELL ────────────────────────────────────────────────────────────────
const NotifBell=({notifs,t,onClear,onMarkRead})=>{
  const [open,setOpen]=useState(false);
  const unread=notifs.filter(n=>!n.lida).length;
  return <div style={{position:"relative"}}>
    <button onClick={()=>{setOpen(o=>!o);if(!open)onMarkRead();}} style={{background:"none",border:`1px solid ${t.border}`,borderRadius:7,padding:"5px 8px",color:t.sub,cursor:"pointer",display:"flex",alignItems:"center",position:"relative"}}>
      <Ico n="bell" s={15}/>{unread>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#ef4444",color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
    </button>
    {open&&<div style={{position:"absolute",right:0,top:34,background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,width:280,boxShadow:"0 8px 30px #0005",zIndex:600}}>
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:t.text,fontWeight:600,fontSize:13}}>Notificações</span>{notifs.length>0&&<button onClick={onClear} style={{background:"none",border:"none",color:t.muted,fontSize:11,cursor:"pointer"}}>Limpar</button>}</div>
      <div style={{maxHeight:250,overflowY:"auto"}}>{notifs.length===0?<div style={{padding:14,color:t.muted,fontSize:12,textAlign:"center"}}>Sem notificações</div>:notifs.map(n=><div key={n.id} style={{padding:"8px 12px",borderBottom:`1px solid ${t.border}`}}><div style={{color:t.text,fontSize:12}}>{n.msg}</div><div style={{color:t.muted,fontSize:10,marginTop:1}}>{n.hora}</div></div>)}</div>
    </div>}
  </div>;
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const Login=({onLogin,t,users,empresa})=>{
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");
  const handle=()=>{const u=users.find(u=>u.email===email&&u.password===pass&&u.ativo!==false);if(u)onLogin(u);else setErr("E-mail, senha inválidos ou usuário inativo.");};
  return <div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:18,padding:40,width:380,boxShadow:"0 20px 60px #0005"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        {empresa.logo?<img src={empresa.logo} style={{maxHeight:80,maxWidth:220,objectFit:"contain",display:"block",margin:"0 auto 8px"}} alt="logo"/>:<div style={{color:t.text,fontWeight:900,fontSize:26,letterSpacing:-1}}>{empresa.nome}</div>}
        <p style={{color:t.sub,margin:"6px 0 0",fontSize:12}}>Sistema de Gestão</p>
      </div>
      <Inp label="E-mail" t={t} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      <Inp label="Senha" t={t} type="password" placeholder="••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
      {err&&<p style={{color:"#ef4444",fontSize:12,margin:"0 0 10px"}}>{err}</p>}
      <Btn t={t} style={{width:"100%",justifyContent:"center"}} onClick={handle}>Entrar</Btn>
    </div>
  </div>;
};

// ── USUÁRIOS ──────────────────────────────────────────────────────────────────
const Usuarios=({users,setUsers,t,currentUser})=>{
  const [modal,setModal]=useState(null);
  const [showPass,setShowPass]=useState(false);
  const emptyForm={name:"",email:"",password:"",role:"comercial",ativo:true,permissoes:{...PERM_ROLES.comercial}};
  const [form,setForm]=useState(emptyForm);
  const roleColors={admin:"#6366f1",comercial:"#3b82f6",financeiro:"#10b981",producao:"#f59e0b"};
  const applyRole=role=>setForm(f=>({...f,role,permissoes:{...PERM_ROLES[role]}}));
  const togglePerm=mod=>{if(form.role==="admin")return;setForm(f=>({...f,permissoes:{...f.permissoes,[mod]:!f.permissoes[mod]}}));};
  const toggleExcluir=mod=>{if(form.role==="admin")return;setForm(f=>({...f,permissoes:{...f.permissoes,excluir:{...(f.permissoes?.excluir||{}), [mod]:!(f.permissoes?.excluir?.[mod])}}}));};
  const save=()=>{
    if(!form.name||!form.email||!form.password)return alert("Preencha nome, e-mail e senha.");
    const perms=form.role==="admin"?PERM_ROLES.admin:form.permissoes;
    const data={...form,permissoes:perms};
    if(form.id){setUsers(us=>us.map(u=>u.id===form.id?data:u));}
    else{if(users.find(u=>u.email===form.email))return alert("E-mail já cadastrado.");setUsers(us=>[...us,{...data,id:Date.now()}]);}
    setModal(null);
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{color:t.text,margin:0}}>Usuários do Sistema</h2>
      <Btn t={t} onClick={()=>{setForm(emptyForm);setShowPass(false);setModal("form");}}><Ico n="plus" s={13}/> Novo Usuário</Btn>
    </div>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:t.surface2}}>{["Nome","E-mail","Perfil","Módulos com Acesso","Status",""].map(h=><th key={h} style={{padding:"9px 12px",color:t.sub,fontWeight:600,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{users.map(u=>{
          const perms=Object.entries(u.permissoes||{}).filter(([,v])=>v).map(([k])=>MODULOS.find(m=>m.id===k)?.label).filter(Boolean);
          return <tr key={u.id} style={{borderTop:`1px solid ${t.border}`,opacity:u.ativo===false?0.5:1}}>
            <td style={{padding:"9px 12px",color:t.text,fontWeight:600}}>{u.name}</td>
            <td style={{padding:"9px 12px",color:t.sub}}>{u.email}</td>
            <td style={{padding:"9px 12px"}}><span style={{background:roleColors[u.role]+"22",color:roleColors[u.role],padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:600}}>{ROLES[u.role]}</span></td>
            <td style={{padding:"9px 12px",maxWidth:260}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{perms.map(p=><span key={p} style={{background:t.surface2,color:t.sub,padding:"1px 7px",borderRadius:8,fontSize:10,border:`1px solid ${t.border}`}}>{p}</span>)}</div></td>
            <td style={{padding:"9px 12px"}}><span style={{color:u.ativo===false?"#ef4444":"#10b981",fontWeight:600,fontSize:12}}>{u.ativo===false?"Inativo":"Ativo"}</span></td>
            <td style={{padding:"9px 12px"}}><div style={{display:"flex",gap:5}}>
              <Btn t={t} variant="ghost" style={{padding:"3px 7px"}} onClick={()=>{setForm({...u,permissoes:{...PERM_ROLES[u.role],...u.permissoes}});setShowPass(false);setModal("form");}}><Ico n="edit" s={13}/></Btn>
              {u.id!==currentUser.id&&<Btn t={t} variant="danger" style={{padding:"3px 7px"}} onClick={()=>{if(window.confirm("Excluir este usuário?"))setUsers(us=>us.filter(x=>x.id!==u.id));}}><Ico n="trash" s={13}/></Btn>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {modal==="form"&&<Modal t={t} title={form.id?"Editar Usuário":"Novo Usuário"} onClose={()=>setModal(null)} wide>
      <div style={{display:"flex",gap:10}}><Inp label="Nome completo *" t={t} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/><Inp label="E-mail *" t={t} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <Inp label="Senha *" t={t} type={showPass?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={{flex:1}}/>
        <button onClick={()=>setShowPass(s=>!s)} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:7,padding:"7px 12px",color:t.sub,cursor:"pointer",fontSize:12,marginBottom:10}}>{showPass?"Ocultar":"Mostrar"}</button>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Sel label="Perfil base" t={t} value={form.role} onChange={e=>applyRole(e.target.value)}>
          {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </Sel>
        <Sel label="Status" t={t} value={String(form.ativo!==false)} onChange={e=>setForm(f=>({...f,ativo:e.target.value==="true"}))}>
          <option value="true">Ativo</option><option value="false">Inativo</option>
        </Sel>
      </div>
      <div style={{marginTop:4,marginBottom:14}}>
        <div style={{color:t.sub,fontSize:12,fontWeight:600,marginBottom:10}}>Permissões de Acesso {form.role==="admin"&&<span style={{color:"#6366f1",fontSize:11,fontWeight:400}}>(Admin tem acesso total)</span>}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {MODULOS.map(m=>{const ativo=form.role==="admin"?true:(form.permissoes?.[m.id]||false);return <button key={m.id} onClick={()=>togglePerm(m.id)} disabled={form.role==="admin"} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,border:`2px solid ${ativo?"#6366f1":t.border}`,background:ativo?"#6366f118":t.surface2,cursor:form.role==="admin"?"default":"pointer",textAlign:"left"}}>
            <div style={{width:16,height:16,borderRadius:4,background:ativo?"#6366f1":t.surface,border:`2px solid ${ativo?"#6366f1":t.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ativo&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}</div>
            <div style={{color:ativo?"#6366f1":t.text,fontWeight:600,fontSize:12}}>{m.label}</div>
          </button>;})}
        </div>
        <div style={{color:t.sub,fontSize:12,fontWeight:600,marginBottom:8}}>Permissões de Exclusão {form.role==="admin"&&<span style={{color:"#ef4444",fontSize:11,fontWeight:400}}>(Admin pode excluir tudo)</span>}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {PERM_EXCLUIR.map(mod=>{
            const ativo=form.role==="admin"?true:(form.permissoes?.excluir?.[mod]||false);
            const label=MODULOS.find(m=>m.id===mod)?.label||mod;
            return <button key={mod} onClick={()=>toggleExcluir(mod)} disabled={form.role==="admin"} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,border:`2px solid ${ativo?"#ef4444":t.border}`,background:ativo?"#ef444418":t.surface2,cursor:form.role==="admin"?"default":"pointer",textAlign:"left"}}>
              <div style={{width:16,height:16,borderRadius:4,background:ativo?"#ef4444":t.surface,border:`2px solid ${ativo?"#ef4444":t.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ativo&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}</div>
              <div style={{color:ativo?"#ef4444":t.text,fontWeight:600,fontSize:12}}>Excluir {label}</div>
            </button>;
          })}
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div>
    </Modal>}
  </div>;
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const Dashboard=({user,pedidos,clientes,fin,colabs,t,caixa})=>{
  const now=new Date();
  const [from,setFrom]=useState(new Date(now.getFullYear(),now.getMonth()-5,1).toISOString().split("T")[0]);
  const [to,setTo]=useState(todayStr());
  const [vP,setVP]=useState(true);const [vF,setVF]=useState(true);const [vG,setVG]=useState(true);
  const myColab=colabs.find(c=>c.email===user.email);
  const myPed=user.role==="comercial"?pedidos.filter(p=>p.vendedorId===myColab?.id):pedidos;
  const pPeriod=myPed.filter(p=>inRange(p.criado,from,to));
  const atrasados=myPed.filter(p=>p.prazo&&new Date(p.prazo)<now&&!["Pedido Concluído","Cancelado"].includes(p.status));
  const aniv=clientes.filter(c=>{if(!c.aniversario)return false;const d=new Date(c.aniversario+"T00:00:00");return d.getDate()===now.getDate()&&d.getMonth()===now.getMonth();});
  const finPeriod=fin.filter(f=>inRange(f.vencimento,from,to));
  const receber=fin.filter(f=>f.tipo==="receber"&&!f.pago).reduce((s,f)=>s+f.valor,0);
  const pagar=fin.filter(f=>f.tipo==="pagar"&&!f.pago).reduce((s,f)=>s+f.valor,0);
  const faturado=finPeriod.filter(f=>f.tipo==="receber"&&f.pago).reduce((s,f)=>s+f.valor,0);
  const custoV=finPeriod.filter(f=>f.tipo==="receber"&&f.pago).reduce((s,f)=>s+(f.custo||0),0);
  const despesas=finPeriod.filter(f=>f.tipo==="pagar"&&f.pago).reduce((s,f)=>s+f.valor,0);
  const lucro=faturado-custoV;const margem=faturado>0?(lucro/faturado*100).toFixed(1):0;
  const monthlyData=useMemo(()=>{const months={};const addM=ds=>{if(!ds)return null;const d=new Date(ds+"T00:00:00");const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;if(!months[k])months[k]={label:monthLabel(ds),fat:0,custo:0,desp:0,pedidos:0};return k;};fin.filter(f=>f.tipo==="receber"&&f.pago&&inRange(f.vencimento,from,to)).forEach(f=>{const k=addM(f.vencimento);if(k){months[k].fat+=f.valor;months[k].custo+=(f.custo||0);}});fin.filter(f=>f.tipo==="pagar"&&f.pago&&inRange(f.vencimento,from,to)).forEach(f=>{const k=addM(f.vencimento);if(k)months[k].desp+=f.valor;});myPed.filter(p=>inRange(p.criado,from,to)).forEach(p=>{const k=addM(p.criado);if(k)months[k].pedidos+=1;});return Object.entries(months).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>({...v,marg:v.fat>0?((v.fat-v.custo)/v.fat*100):0}));},[fin,myPed,from,to]);
  const pedMonthly=monthlyData.map(d=>({label:d.label,val:d.pedidos}));
  const topClientes=useMemo(()=>{const map={};myPed.filter(p=>inRange(p.criado,from,to)).forEach(p=>{if(!map[p.clienteId])map[p.clienteId]={total:0,qtd:0};map[p.clienteId].total+=p.totalPedido;map[p.clienteId].qtd+=1;});return Object.entries(map).map(([id,v])=>({...v,cliente:clientes.find(c=>c.id===Number(id))})).sort((a,b)=>b.total-a.total).slice(0,5);},[myPed,clientes,from,to]);
  const qP=p=>{const d=new Date();if(p==="mes"){setFrom(new Date(d.getFullYear(),d.getMonth(),1).toISOString().split("T")[0]);setTo(todayStr());}else if(p==="trim"){setFrom(new Date(d.getFullYear(),d.getMonth()-2,1).toISOString().split("T")[0]);setTo(todayStr());}else{setFrom(new Date(d.getFullYear()-1,d.getMonth()+1,1).toISOString().split("T")[0]);setTo(todayStr());}};
  const maxTop=topClientes[0]?.total||1;
  const showFin=user.role==="admin"||user.role==="financeiro"||(user.permissoes?.financeiro);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
      <h2 style={{color:t.text,margin:0}}>Dashboard</h2>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        {["mes","trim","ano"].map(p=><button key={p} onClick={()=>qP(p)} style={{background:t.surface2,border:`1px solid ${t.border}`,color:t.sub,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>{p==="mes"?"Este Mês":p==="trim"?"Trimestre":"12 Meses"}</button>)}
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"4px 7px",color:t.text,fontSize:11}}/>
        <span style={{color:t.muted}}>–</span>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"4px 7px",color:t.text,fontSize:11}}/>
      </div>
    </div>
    {atrasados.length>0&&<div style={{background:"#ef444420",border:"1px solid #ef444455",borderRadius:8,padding:"7px 12px",marginBottom:10,color:"#ef4444",fontSize:12,display:"flex",alignItems:"center",gap:7}}><Ico n="alert" s={14}/><b>{atrasados.length} pedido(s) com prazo vencido!</b></div>}
    {aniv.length>0&&<div style={{background:"#f59e0b20",border:"1px solid #f59e0b44",borderRadius:8,padding:"7px 12px",marginBottom:10,color:"#f59e0b",fontSize:12}}>🎂 <b>Aniversariante(s) hoje:</b> {aniv.map(c=>c.nome).join(", ")}</div>}
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <button onClick={()=>setVP(v=>!v)} style={{background:vP?t.accent:t.surface2,color:vP?t.bg:t.sub,border:`1px solid ${t.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>{vP?"▼":"▶"} Pedidos</button>
      {showFin&&<button onClick={()=>setVF(v=>!v)} style={{background:vF?t.accent:t.surface2,color:vF?t.bg:t.sub,border:`1px solid ${t.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>{vF?"▼":"▶"} Financeiro</button>}
      {showFin&&<button onClick={()=>setVG(v=>!v)} style={{background:vG?t.accent:t.surface2,color:vG?t.bg:t.sub,border:`1px solid ${t.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>{vG?"▼":"▶"} Gráficos</button>}
    </div>
    {vP&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><Card t={t} title="Pedidos no Período" value={pPeriod.length} color="#6366f1" icon={<Ico n="orders" s={16}/>}/><Card t={t} title="Em Produção" value={myPed.filter(p=>p.status==="Em Produção").length} color="#3b82f6" icon={<Ico n="orders" s={16}/>}/><Card t={t} title="Aguardando Entrega" value={myPed.filter(p=>p.status==="Aguardando Retirada/Entrega").length} color="#f97316" icon={<Ico n="orders" s={16}/>}/><Card t={t} title="Concluídos" value={myPed.filter(p=>p.status==="Pedido Concluído").length} color="#10b981" icon={<Ico n="check" s={16}/>}/></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{STATUS_LIST.map(s=>{const c=myPed.filter(p=>p.status===s).length;return c>0?<div key={s} style={{background:SC[s]+"18",border:`1px solid ${SC[s]}44`,borderRadius:8,padding:"6px 12px",textAlign:"center"}}><div style={{color:SC[s],fontWeight:700,fontSize:15}}>{c}</div><div style={{color:t.sub,fontSize:10}}>{s}</div></div>:null;})}</div></>}
    {vF&&showFin&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><Card t={t} title="Faturado" value={fmtM(faturado)} color="#10b981" icon={<Ico n="chart" s={16}/>}/><Card t={t} title="Custo das Vendas" value={fmtM(custoV)} color="#f59e0b" icon={<Ico n="minus" s={16}/>}/><Card t={t} title="Lucro Bruto" value={fmtM(lucro)} sub={`Margem ${margem}%`} color="#8b5cf6" icon={<Ico n="chart" s={16}/>}/><Card t={t} title="Despesas Pagas" value={fmtM(despesas)} color="#ef4444" icon={<Ico n="minus" s={16}/>}/><Card t={t} title="A Receber" value={fmtM(receber)} color="#6366f1" icon={<Ico n="finance" s={16}/>}/><Card t={t} title="A Pagar" value={fmtM(pagar)} color="#ef4444" icon={<Ico n="finance" s={16}/>}/></div></>}
    {vG&&showFin&&monthlyData.length>0&&<div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
      <div style={{flex:2,minWidth:280,background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}><div style={{color:t.text,fontWeight:600,fontSize:13,marginBottom:10}}>Faturamento × Despesas × Margem</div><BarChart data={monthlyData} t={t} height={140}/></div>
      <div style={{flex:1,minWidth:200,background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}><div style={{color:t.text,fontWeight:600,fontSize:13,marginBottom:10}}>Pedidos por Período</div><LineChart data={pedMonthly} t={t} height={130}/></div>
    </div>}
    {topClientes.length>0&&<div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{color:t.text,fontWeight:600,fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Ico n="crown" s={14} c="#f59e0b"/> Ranking — Top Clientes</div>
      {topClientes.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:i===0?"#f59e0b":i===1?"#888":i===2?"#cd7f32":t.surface2,color:i<3?"#fff":t.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</div>
        {c.cliente?.logo&&<img src={c.cliente.logo} style={{width:22,height:22,borderRadius:4,objectFit:"cover"}} alt=""/>}
        <div style={{flex:1,minWidth:0}}><div style={{color:t.text,fontWeight:600,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.cliente?.nome||"—"}</div><div style={{background:t.surface2,borderRadius:4,height:6,marginTop:3,overflow:"hidden"}}><div style={{width:`${(c.total/maxTop)*100}%`,height:"100%",background:i===0?"#f59e0b":"#6366f1",borderRadius:4}}/></div></div>
        <div style={{textAlign:"right",flexShrink:0}}><div style={{color:"#10b981",fontWeight:700,fontSize:12}}>{fmtM(c.total)}</div><div style={{color:t.muted,fontSize:10}}>{c.qtd} pedido(s)</div></div>
      </div>)}
    </div>}
    <h3 style={{color:t.sub,fontSize:11,margin:"0 0 8px",textTransform:"uppercase"}}>Últimos Pedidos</h3>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:t.surface2}}>{["#","Cliente","Total","Pgto","Prazo","Status"].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{[...myPed].sort((a,b)=>b.id-a.id).slice(0,8).map(p=>{const cl=clientes.find(c=>c.id===p.clienteId);const at=p.prazo&&new Date(p.prazo)<now&&!["Pedido Concluído","Cancelado"].includes(p.status);return <tr key={p.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"7px 11px",color:t.muted}}>#{p.id}</td><td style={{padding:"7px 11px",color:t.text,display:"flex",alignItems:"center",gap:5}}>{cl?.logo&&<img src={cl.logo} style={{width:18,height:18,borderRadius:3,objectFit:"cover"}} alt=""/>}{cl?.nome||"-"}</td><td style={{padding:"7px 11px",color:"#10b981",fontWeight:600}}>{fmtM(p.totalPedido)}</td><td style={{padding:"7px 11px"}}><PgtoBadge s={p.statusPgto}/></td><td style={{padding:"7px 11px",color:at?"#ef4444":t.sub}}>{fmtD(p.prazo)}</td><td style={{padding:"7px 11px"}}><Badge status={p.status}/></td></tr>;})}
        </tbody>
      </table>
    </div>
  </div>;
};

// ── CLIENTES ──────────────────────────────────────────────────────────────────
const Clientes=({clientes,setClientes,canEdit,canDel,t})=>{
  const [modal,setModal]=useState(null);const [search,setSearch]=useState("");
  const empty={nome:"",contato:"",email:"",telefone:"",cidade:"",cpfCnpj:"",aniversario:"",logo:""};
  const [form,setForm]=useState(empty);const fileRef=useRef();
  const filtered=clientes.filter(c=>c.nome.toLowerCase().includes(search.toLowerCase())||(c.email||"").toLowerCase().includes(search.toLowerCase()));
  const handleLogo=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(f=>({...f,logo:ev.target.result}));r.readAsDataURL(f);};
  const save=()=>{if(!form.nome)return;if(form.id)setClientes(cs=>cs.map(c=>c.id===form.id?form:c));else setClientes(cs=>[...cs,{...form,id:Date.now()}]);setModal(null);};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{color:t.text,margin:0}}>Clientes</h2>{canEdit&&<Btn t={t} onClick={()=>{setForm(empty);setModal("form");}}><Ico n="plus" s={13}/> Novo</Btn>}</div>
    <Inp t={t} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:10}}/>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:t.surface2}}>{["Logo","Nome","Contato","Telefone","Aniversário","Cidade","CPF/CNPJ",""].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(c=><tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}>
          <td style={{padding:"7px 11px"}}>{c.logo?<img src={c.logo} style={{width:28,height:28,borderRadius:5,objectFit:"cover"}} alt=""/>:<div style={{width:28,height:28,borderRadius:5,background:t.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🏢</div>}</td>
          <td style={{padding:"7px 11px",color:t.text,fontWeight:600}}>{c.nome}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.contato}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.telefone}</td>
          <td style={{padding:"7px 11px",color:t.sub}}>{c.aniversario?fmtD(c.aniversario):"-"}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.cidade}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.cpfCnpj}</td>
          <td style={{padding:"7px 11px"}}>{canEdit&&<div style={{display:"flex",gap:5}}><Btn t={t} variant="ghost" style={{padding:"3px 7px"}} onClick={()=>{setForm(c);setModal("form");}}><Ico n="edit" s={12}/></Btn>{canDel&&<Btn t={t} variant="danger" style={{padding:"3px 7px"}} onClick={()=>setClientes(cs=>cs.filter(x=>x.id!==c.id))}><Ico n="trash" s={12}/></Btn>}</div>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {modal==="form"&&<Modal t={t} title={form.id?"Editar Cliente":"Novo Cliente"} onClose={()=>setModal(null)}>
      <div style={{textAlign:"center",marginBottom:12}}><div style={{width:68,height:58,borderRadius:8,background:t.surface2,border:`2px dashed ${t.border}`,margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer"}} onClick={()=>fileRef.current.click()}>{form.logo?<img src={form.logo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="logo"/>:<Ico n="upload" s={20} c={t.muted}/>}</div><input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo}/><button onClick={()=>fileRef.current.click()} style={{background:"none",border:"none",color:t.sub,fontSize:11,cursor:"pointer"}}>Logo do cliente</button></div>
      <Inp label="Nome *" t={t} value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/><Inp label="Contato" t={t} value={form.contato} onChange={e=>setForm(f=>({...f,contato:e.target.value}))}/><Inp label="E-mail" t={t} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
      <div style={{display:"flex",gap:10}}><Inp label="Telefone" t={t} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/><Inp label="Aniversário" t={t} type="date" value={form.aniversario} onChange={e=>setForm(f=>({...f,aniversario:e.target.value}))}/></div>
      <div style={{display:"flex",gap:10}}><Inp label="Cidade" t={t} value={form.cidade} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))}/><Inp label="CPF/CNPJ" t={t} value={form.cpfCnpj} onChange={e=>setForm(f=>({...f,cpfCnpj:e.target.value}))}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div>
    </Modal>}
  </div>;
};

// ── COLABORADORES ─────────────────────────────────────────────────────────────
const Colaboradores=({colabs,setColabs,canDel,t})=>{
  const [modal,setModal]=useState(null);const empty={nome:"",cargo:"",email:"",telefone:"",comissao:0,ativo:true};const [form,setForm]=useState(empty);
  const save=()=>{if(!form.nome)return;if(form.id)setColabs(cs=>cs.map(c=>c.id===form.id?{...form,comissao:Number(form.comissao)}:c));else setColabs(cs=>[...cs,{...form,id:Date.now(),comissao:Number(form.comissao)}]);setModal(null);};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{color:t.text,margin:0}}>Colaboradores</h2><Btn t={t} onClick={()=>{setForm(empty);setModal("form");}}><Ico n="plus" s={13}/> Novo</Btn></div>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:t.surface2}}>{["Nome","Cargo","E-mail","Telefone","Comissão","Status",""].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{colabs.map(c=><tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"7px 11px",color:t.text,fontWeight:600}}>{c.nome}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.cargo}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.email}</td><td style={{padding:"7px 11px",color:t.sub}}>{c.telefone}</td><td style={{padding:"7px 11px",color:"#10b981"}}>{c.comissao}%</td><td style={{padding:"7px 11px"}}><span style={{color:c.ativo?"#10b981":"#ef4444",fontWeight:600}}>{c.ativo?"Ativo":"Inativo"}</span></td>          <td style={{padding:"7px 11px"}}><div style={{display:"flex",gap:5}}><Btn t={t} variant="ghost" style={{padding:"3px 7px"}} onClick={()=>{setForm(c);setModal("form");}}><Ico n="edit" s={12}/></Btn>{canDel&&<Btn t={t} variant="danger" style={{padding:"3px 7px"}} onClick={()=>setColabs(cs=>cs.filter(x=>x.id!==c.id))}><Ico n="trash" s={12}/></Btn>}</div></td></tr>)}</tbody>
      </table>
    </div>
    {modal==="form"&&<Modal t={t} title={form.id?"Editar":"Novo Colaborador"} onClose={()=>setModal(null)}>
      <Inp label="Nome *" t={t} value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/><Inp label="Cargo" t={t} value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))}/><Inp label="E-mail" t={t} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/><Inp label="Telefone" t={t} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/><Inp label="Comissão (%)" t={t} type="number" value={form.comissao} onChange={e=>setForm(f=>({...f,comissao:e.target.value}))}/>
      <Sel label="Status" t={t} value={String(form.ativo)} onChange={e=>setForm(f=>({...f,ativo:e.target.value==="true"}))}><option value="true">Ativo</option><option value="false">Inativo</option></Sel>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div>
    </Modal>}
  </div>;
};

// ── PRODUTOS ──────────────────────────────────────────────────────────────────
const Produtos=({produtos,setProdutos,canDel,t})=>{
  const [modal,setModal]=useState(null);const [search,setSearch]=useState("");const [catF,setCatF]=useState("Todas");
  const empty={descricao:"",unidade:"un",custo:0,venda:0,categoria:"Impressão",margem:0};const [form,setForm]=useState(empty);
  const cats=[...new Set(produtos.map(p=>p.categoria))];
  const filtered=produtos.filter(p=>(catF==="Todas"||p.categoria===catF)&&p.descricao.toLowerCase().includes(search.toLowerCase()));
  const calcM=(c,v)=>v>0?((v-c)/v*100).toFixed(1):0;
  const save=()=>{if(!form.descricao)return;const m=calcM(Number(form.custo),Number(form.venda));const d={...form,custo:Number(form.custo),venda:Number(form.venda),margem:Number(m)};if(form.id)setProdutos(ps=>ps.map(p=>p.id===form.id?d:p));else setProdutos(ps=>[...ps,{...d,id:Date.now()}]);setModal(null);};
  const mA=calcM(Number(form.custo),Number(form.venda));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{color:t.text,margin:0}}>Produtos / Serviços</h2><Btn t={t} onClick={()=>{setForm(empty);setModal("form");}}><Ico n="plus" s={13}/> Novo</Btn></div>
    <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}><Inp t={t} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{margin:0,flex:1,minWidth:150}}/>{["Todas",...cats].map(c=><button key={c} onClick={()=>setCatF(c)} style={{background:catF===c?t.accent:t.surface2,color:catF===c?t.bg:t.sub,border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>{c}</button>)}</div>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:t.surface2}}>{["Descrição","Unidade","Categoria","Custo","Venda","Margem",""].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(p=>{const cm=p.margem>=50?"#10b981":p.margem>=30?"#f59e0b":"#ef4444";return <tr key={p.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"7px 11px",color:t.text,fontWeight:600}}>{p.descricao}</td><td style={{padding:"7px 11px",color:t.sub}}>{p.unidade}</td><td style={{padding:"7px 11px"}}><span style={{background:t.surface2,color:t.sub,padding:"2px 7px",borderRadius:10,fontSize:11}}>{p.categoria}</span></td><td style={{padding:"7px 11px",color:"#ef4444",fontWeight:600}}>{fmtM(p.custo)}</td><td style={{padding:"7px 11px",color:"#10b981",fontWeight:700}}>{fmtM(p.venda)}</td><td style={{padding:"7px 11px"}}><span style={{color:cm,fontWeight:700}}>{p.margem}%</span></td>          <td style={{padding:"7px 11px"}}><div style={{display:"flex",gap:5}}><Btn t={t} variant="ghost" style={{padding:"3px 7px"}} onClick={()=>{setForm(p);setModal("form");}}><Ico n="edit" s={12}/></Btn>{canDel&&<Btn t={t} variant="danger" style={{padding:"3px 7px"}} onClick={()=>setProdutos(ps=>ps.filter(x=>x.id!==p.id))}><Ico n="trash" s={12}/></Btn>}</div></td></tr>;})}
        </tbody>
      </table>
    </div>
    {modal==="form"&&<Modal t={t} title={form.id?"Editar":"Novo Produto"} onClose={()=>setModal(null)}>
      <Inp label="Descrição *" t={t} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
      <div style={{display:"flex",gap:10}}><Inp label="Unidade" t={t} value={form.unidade} onChange={e=>setForm(f=>({...f,unidade:e.target.value}))}/><Inp label="Categoria" t={t} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}/></div>
      <div style={{display:"flex",gap:10}}><Inp label="Custo (R$)" t={t} type="number" value={form.custo} onChange={e=>setForm(f=>({...f,custo:e.target.value}))}/><Inp label="Preço Venda (R$)" t={t} type="number" value={form.venda} onChange={e=>setForm(f=>({...f,venda:e.target.value}))}/></div>
      <div style={{background:t.surface2,borderRadius:8,padding:11,marginBottom:11,display:"flex",gap:20,alignItems:"center"}}><div><div style={{color:t.muted,fontSize:11}}>Margem</div><div style={{color:mA>=50?"#10b981":mA>=30?"#f59e0b":"#ef4444",fontWeight:700,fontSize:20}}>{mA}%</div></div><div><div style={{color:t.muted,fontSize:11}}>Lucro/un</div><div style={{color:"#10b981",fontWeight:600,fontSize:15}}>{fmtM(Number(form.venda)-Number(form.custo))}</div></div></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div>
    </Modal>}
  </div>;
};

// ── PEDIDOS ───────────────────────────────────────────────────────────────────
const Pedidos=({user,pedidos,setPedidos,clientes,colabs,produtos,canEdit,canStatus,canDel,t,setFin,setCaixa,addNotif,empresa})=>{
  const [view,setView]=useState("lista");const [filterSt,setFilterSt]=useState("Todos");const [modal,setModal]=useState(null);const [selected,setSelected]=useState(null);const fileRef=useRef();
  const emptyForm=()=>({clienteId:"",vendedorId:"",status:"Orçamento",statusPgto:"Pendente",valorPago:0,prazo:"",criado:todayStr(),itens:mkItens(),arquivo:"",infoCompl:"",notificadoProducao:false});
  const [form,setForm]=useState(emptyForm());
  const myColab=colabs.find(c=>c.email===user.email);
  const myPed=user.role==="comercial"?pedidos.filter(p=>p.vendedorId===myColab?.id):pedidos;
  const filtered=filterSt==="Todos"?myPed:myPed.filter(p=>p.status===filterSt);
  const addItem=()=>setForm(f=>({...f,itens:[...f.itens,{id:Date.now(),produtoId:"",descricao:"",qtd:1,unitario:0,custo:0,total:0}]}));
  const updItem=(id,field,val)=>setForm(f=>({...f,itens:f.itens.map(it=>{if(it.id!==id)return it;let u={...it,[field]:val};if(field==="produtoId"){const p=produtos.find(p=>p.id===Number(val));if(p){u.descricao=p.descricao;u.unitario=p.venda;u.custo=p.custo;}}if(field==="qtd"||field==="unitario")u.total=Number(u.qtd)*Number(u.unitario);return u;})}));
  const remItem=id=>setForm(f=>({...f,itens:f.itens.filter(it=>it.id!==id)}));
  const totPed=form.itens.reduce((s,it)=>s+Number(it.total),0);
  const totCusto=form.itens.reduce((s,it)=>s+Number(it.custo)*Number(it.qtd),0);
  const handleArq=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(f=>({...f,arquivo:ev.target.result}));r.readAsDataURL(f);};
  const autoFin=(pedido,prevStatus)=>{const isActive=ACTIVE_STATUSES.includes(pedido.status);const wasOrc=prevStatus==="Orçamento"||!prevStatus;if(isActive&&wasOrc&&pedido.statusPgto!=="Pago"){const cl=clientes.find(c=>c.id===pedido.clienteId);setFin(fs=>{const exists=fs.find(f=>f.pedidoId===pedido.id&&f.tipo==="receber");if(exists)return fs;return[...fs,{id:Date.now(),tipo:"receber",descricao:`Pedido #${pedido.id} — ${cl?.nome||""}`,valor:pedido.totalPedido,custo:pedido.totalCusto||0,vencimento:pedido.prazo||todayStr(),pago:false,pedidoId:pedido.id}];});}};
  const save=()=>{if(!form.clienteId)return;const data={...form,clienteId:Number(form.clienteId),vendedorId:Number(form.vendedorId),totalPedido:totPed,totalCusto:totCusto};const prevStatus=form.id?pedidos.find(p=>p.id===form.id)?.status:"Orçamento";if(data.status==="Em Produção"&&prevStatus!=="Em Produção"&&!data.notificadoProducao){const cl=clientes.find(c=>c.id===data.clienteId);addNotif(`🔔 Pedido #${data.id||"novo"} em Produção — ${cl?.nome} — ${fmtM(totPed)}`);data.notificadoProducao=true;}if(form.id){setPedidos(ps=>ps.map(p=>p.id===form.id?data:p));autoFin(data,prevStatus);}else{const newP={...data,id:Date.now()};setPedidos(ps=>[...ps,newP]);autoFin(newP,"Orçamento");}setModal(null);};
  const handlePgto=p=>{setSelected(p);setModal("pgto");};
  const confirmPgto=({valor,forma,destino})=>{
    const p=selected;
    const novoVP=(p.valorPago||0)+valor;
    const novoSt=novoVP>=p.totalPedido?"Pago":novoVP>0?"Parcial":"Pendente";
    const cl=clientes.find(c=>c.id===p.clienteId);
    const desc=`Pedido #${p.id} — ${cl?.nome||""} (${forma})`;
    // Histórico de pagamentos
    const novoPgto={id:Date.now(),valor,forma,data:todayStr(),hora:nowTime(),destino};
    const historicoPgtos=[...(p.historicoPgtos||[]),novoPgto];
    if(destino==="caixa"){
      setCaixa(cs=>{const hoje=todayStr();const idx=cs.findIndex(c=>c.data===hoje&&!c.fechado);const m={id:Date.now(),descricao:desc,valor,formaPgto:forma,hora:nowTime(),tipo:"entrada",pedidoId:p.id};if(idx>=0){const up=[...cs];const cx={...up[idx]};cx.movimentos=[...(cx.movimentos||[]),m];cx.totalEntradas=(cx.totalEntradas||0)+valor;cx.totalVendas=(cx.totalVendas||0)+valor;up[idx]=cx;return up;}return[...cs,{id:Date.now()+1,data:hoje,saldoAbertura:0,movimentos:[m],totalEntradas:valor,totalSaidas:0,totalVendas:valor,fechado:false}];});
    } else {
      // Vai para financeiro como PENDENTE — não pago automaticamente
      setFin(fs=>{
        const idx=fs.findIndex(f=>f.pedidoId===p.id&&f.tipo==="receber");
        if(idx>=0){
          const up=[...fs];
          up[idx]={...up[idx],valor:up[idx].valor, pago: novoSt==="Pago"};
          return up;
        }
        return[...fs,{id:Date.now(),tipo:"receber",descricao:desc,valor:p.totalPedido,custo:p.totalCusto||0,vencimento:p.prazo||todayStr(),pago:novoSt==="Pago",pedidoId:p.id}];
      });
    }
    setPedidos(ps=>ps.map(x=>x.id===p.id?{...x,valorPago:novoVP,statusPgto:novoSt,historicoPgtos}:x));
    setModal(null);
  };
  const changeStatus=(p,ns)=>{const up={...p,status:ns};if(ns==="Em Produção"&&!p.notificadoProducao){const cl=clientes.find(c=>c.id===p.clienteId);addNotif(`🔔 Pedido #${p.id} em Produção — ${cl?.nome}`);up.notificadoProducao=true;}autoFin(up,p.status);setPedidos(ps=>ps.map(x=>x.id===p.id?up:x));setSelected(up);};
  const ModalPgto=({pedido,onConfirm,onClose})=>{const saldo=pedido.totalPedido-(pedido.valorPago||0);const [valor,setValor]=useState(saldo);const [forma,setForma]=useState("Dinheiro");const [destino,setDestino]=useState("caixa");return <Modal t={t} title="Registrar Pagamento" onClose={onClose}><div style={{background:t.surface2,borderRadius:9,padding:12,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:t.sub,fontSize:12}}>Total</span><span style={{color:t.text,fontWeight:600}}>{fmtM(pedido.totalPedido)}</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:t.sub,fontSize:12}}>Já pago</span><span style={{color:"#10b981",fontWeight:600}}>{fmtM(pedido.valorPago||0)}</span></div><div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${t.border}`,paddingTop:5}}><span style={{color:t.sub,fontSize:12}}>Saldo</span><span style={{color:"#ef4444",fontWeight:700,fontSize:15}}>{fmtM(saldo)}</span></div></div><Inp label="Valor Recebido (R$)" t={t} type="number" value={valor} onChange={e=>setValor(e.target.value)}/><Sel label="Forma de Pagamento" t={t} value={forma} onChange={e=>setForma(e.target.value)}>{["Dinheiro","Pix","Débito","Crédito","Transferência","Cheque"].map(f=><option key={f}>{f}</option>)}</Sel><div style={{marginBottom:12}}><div style={{color:t.sub,fontSize:12,marginBottom:7}}>Onde lançar?</div><div style={{display:"flex",gap:7}}><button onClick={()=>setDestino("caixa")} style={{flex:1,padding:"9px 6px",borderRadius:8,border:`2px solid ${destino==="caixa"?"#10b981":t.border}`,background:destino==="caixa"?"#10b98118":t.surface2,color:destino==="caixa"?"#10b981":t.sub,cursor:"pointer",fontSize:12,fontWeight:600}}>🏧 Caixa Diário</button><button onClick={()=>setDestino("financeiro")} style={{flex:1,padding:"9px 6px",borderRadius:8,border:`2px solid ${destino==="financeiro"?"#6366f1":t.border}`,background:destino==="financeiro"?"#6366f118":t.surface2,color:destino==="financeiro"?"#6366f1":t.sub,cursor:"pointer",fontSize:12,fontWeight:600}}>📊 Financeiro</button></div></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={onClose}>Cancelar</Btn><Btn t={t} variant="success" onClick={()=>onConfirm({valor:Number(valor),forma,destino})}>Confirmar</Btn></div></Modal>;};
  const KanbanView=()=><div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:8}}>{STATUS_LIST.map(st=><div key={st} style={{minWidth:175,background:t.surface2,borderRadius:11,padding:"8px 7px",border:`1px solid ${SC[st]}44`}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}><span style={{width:8,height:8,borderRadius:"50%",background:SC[st],display:"inline-block"}}/><span style={{color:t.text,fontWeight:600,fontSize:11}}>{st}</span><span style={{color:t.muted,fontSize:10,marginLeft:"auto"}}>{myPed.filter(p=>p.status===st).length}</span></div>{myPed.filter(p=>p.status===st).map(p=>{const cl=clientes.find(c=>c.id===p.clienteId);const at=p.prazo&&new Date(p.prazo)<new Date()&&!["Pedido Concluído","Cancelado"].includes(p.status);return <div key={p.id} style={{background:t.surface,borderRadius:8,padding:8,marginBottom:6,border:`1px solid ${at?"#ef4444":t.border}`,cursor:"pointer"}} onClick={()=>{setSelected(p);setModal("view");}}><div style={{color:t.text,fontWeight:600,fontSize:11,marginBottom:3}}>{cl?.nome||"-"}</div><div style={{color:t.sub,fontSize:10}}>#{p.id} · {fmtD(p.prazo)}</div><div style={{color:"#10b981",fontWeight:700,fontSize:12,marginTop:2}}>{fmtM(p.totalPedido)}</div><PgtoBadge s={p.statusPgto||"Pendente"}/>{at&&<div style={{color:"#ef4444",fontSize:10,marginTop:2}}>⚠ Atrasado</div>}</div>;})}</div>)}</div>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:7}}><h2 style={{color:t.text,margin:0}}>Pedidos</h2><div style={{display:"flex",gap:6}}><Btn t={t} variant={view==="lista"?"primary":"ghost"} onClick={()=>setView("lista")}><Ico n="list" s={13}/> Lista</Btn><Btn t={t} variant={view==="kanban"?"primary":"ghost"} onClick={()=>setView("kanban")}><Ico n="kanban" s={13}/> Kanban</Btn>{canEdit&&<Btn t={t} onClick={()=>{setForm(emptyForm());setModal("form");}}><Ico n="plus" s={13}/> Novo</Btn>}</div></div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{["Todos",...STATUS_LIST].map(s=><button key={s} onClick={()=>setFilterSt(s)} style={{background:filterSt===s?SC[s]||t.accent:t.surface2,color:filterSt===s?"#fff":t.sub,border:"none",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>{s}</button>)}</div>
    {view==="kanban"?<KanbanView/>:<div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["#","Data","Cliente","Total","Pago","Saldo","Pgto","Prazo","Status",""].map(h=><th key={h} style={{padding:"7px 10px",color:t.sub,fontWeight:600,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{filtered.map(p=>{const cl=clientes.find(c=>c.id===p.clienteId);const at=p.prazo&&new Date(p.prazo)<new Date()&&!["Pedido Concluído","Cancelado"].includes(p.status);const saldo=p.totalPedido-(p.valorPago||0);return <tr key={p.id} style={{borderTop:`1px solid ${t.border}`,background:at?"#ef44440a":"transparent"}}><td style={{padding:"6px 10px",color:t.muted}}>#{p.id}</td><td style={{padding:"6px 10px",color:t.sub,whiteSpace:"nowrap"}}>{fmtD(p.criado)}</td><td style={{padding:"6px 10px",color:t.text}}><div style={{display:"flex",alignItems:"center",gap:4}}>{cl?.logo&&<img src={cl.logo} style={{width:16,height:16,borderRadius:3,objectFit:"cover"}} alt=""/>}{cl?.nome||"-"}</div></td><td style={{padding:"6px 10px",color:"#10b981",fontWeight:700}}>{fmtM(p.totalPedido)}</td><td style={{padding:"6px 10px",color:"#10b981"}}>{fmtM(p.valorPago||0)}</td><td style={{padding:"6px 10px",color:saldo>0?"#ef4444":t.muted}}>{saldo>0?fmtM(saldo):"—"}</td><td style={{padding:"6px 10px"}}><PgtoBadge s={p.statusPgto||"Pendente"}/></td><td style={{padding:"6px 10px",color:at?"#ef4444":t.sub,whiteSpace:"nowrap"}}>{fmtD(p.prazo)}</td><td style={{padding:"6px 10px"}}><Badge status={p.status}/></td>                <td style={{padding:"6px 10px"}}><div style={{display:"flex",gap:3}}><Btn t={t} variant="ghost" style={{padding:"3px 6px"}} onClick={()=>{setSelected(p);setModal("view");}}><Ico n="eye" s={12}/></Btn>{(canEdit||canStatus)&&<Btn t={t} variant="ghost" style={{padding:"3px 6px"}} onClick={()=>{setForm({...p});setModal("form");}}><Ico n="edit" s={12}/></Btn>}{canEdit&&<Btn t={t} variant="warning" style={{padding:"3px 6px"}} onClick={()=>handlePgto(p)}><Ico n="cash" s={12}/></Btn>}{canDel&&<Btn t={t} variant="danger" style={{padding:"3px 6px"}} onClick={()=>setPedidos(ps=>ps.filter(x=>x.id!==p.id))}><Ico n="trash" s={12}/></Btn>}</div></td></tr>;})}
    </tbody></table></div>}
    {modal==="form"&&<Modal t={t} title={form.id?"Editar Pedido":"Novo Pedido"} onClose={()=>setModal(null)} xl><div style={{display:"flex",gap:10}}><Sel label="Cliente *" t={t} value={form.clienteId} onChange={e=>setForm(f=>({...f,clienteId:e.target.value}))}><option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</Sel>{canEdit&&<Sel label="Vendedor" t={t} value={form.vendedorId} onChange={e=>setForm(f=>({...f,vendedorId:e.target.value}))}><option value="">Selecione...</option>{colabs.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</Sel>}</div><div style={{display:"flex",gap:10}}><Inp label="Data do Pedido" t={t} type="date" value={form.criado} onChange={e=>setForm(f=>({...f,criado:e.target.value}))}/><Inp label="Prazo de Entrega" t={t} type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>{canEdit&&<Sel label="Status" t={t} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{STATUS_LIST.map(s=><option key={s}>{s}</option>)}</Sel>}</div>
    <div style={{margin:"8px 0 4px",color:t.sub,fontSize:11,fontWeight:600,textTransform:"uppercase"}}>Itens</div>
    <div style={{background:t.surface2,borderRadius:9,padding:9,marginBottom:9}}><div style={{display:"grid",gridTemplateColumns:"155px 1fr 60px 80px 80px 80px 24px",gap:5,marginBottom:4}}>{["Produto","Descrição","Qtd","Unit.","Custo","Total",""].map(h=><div key={h} style={{color:t.muted,fontSize:10,fontWeight:600}}>{h}</div>)}</div>{form.itens.map(it=><div key={it.id} style={{display:"grid",gridTemplateColumns:"155px 1fr 60px 80px 80px 80px 24px",gap:5,marginBottom:4,alignItems:"center"}}><select value={it.produtoId||""} onChange={e=>updItem(it.id,"produtoId",e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"5px 6px",color:t.text,fontSize:12,outline:"none"}}><option value="">— Selecionar —</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.descricao}</option>)}</select><input value={it.descricao} onChange={e=>updItem(it.id,"descricao",e.target.value)} placeholder="Descrição..." style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"5px 7px",color:t.text,fontSize:12,outline:"none"}}/><input type="number" value={it.qtd} onChange={e=>updItem(it.id,"qtd",e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"5px 5px",color:t.text,fontSize:12,outline:"none"}}/><input type="number" value={it.unitario} onChange={e=>updItem(it.id,"unitario",e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"5px 5px",color:t.text,fontSize:12,outline:"none"}}/><input type="number" value={it.custo} onChange={e=>updItem(it.id,"custo",e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"5px 5px",color:"#ef4444",fontSize:12,outline:"none"}}/><input type="number" value={it.total} readOnly style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 5px",color:"#10b981",fontSize:12,fontWeight:600,outline:"none"}}/><button onClick={()=>remItem(it.id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16}}>×</button></div>)}<button onClick={addItem} style={{background:"none",border:`1px dashed ${t.border}`,borderRadius:6,color:t.sub,padding:"4px 10px",cursor:"pointer",fontSize:12,width:"100%",marginTop:3}}>+ Item</button></div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:18,marginBottom:10}}><div style={{textAlign:"right"}}><div style={{color:t.muted,fontSize:10}}>Custo</div><div style={{color:"#ef4444",fontWeight:700}}>{fmtM(totCusto)}</div></div><div style={{textAlign:"right"}}><div style={{color:t.muted,fontSize:10}}>Total</div><div style={{color:"#10b981",fontWeight:700,fontSize:17}}>{fmtM(totPed)}</div></div><div style={{textAlign:"right"}}><div style={{color:t.muted,fontSize:10}}>Margem</div><div style={{color:"#6366f1",fontWeight:700}}>{totPed>0?((totPed-totCusto)/totPed*100).toFixed(1)+"%":"—"}</div></div></div>
    <Txt label="Observações / Info. Complementares" t={t} value={form.infoCompl||""} onChange={e=>setForm(f=>({...f,infoCompl:e.target.value}))}/>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center"}}><Btn t={t} variant="ghost" style={{fontSize:12}} onClick={()=>fileRef.current.click()}><Ico n="upload" s={13}/> Anexar Arte</Btn>{form.arquivo&&<span style={{color:"#10b981",fontSize:12}}>✓ Arquivo anexado</span>}<input ref={fileRef} type="file" style={{display:"none"}} onChange={handleArq}/></div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div></Modal>}
    {modal==="view"&&selected&&(()=>{const p=pedidos.find(x=>x.id===selected.id)||selected;const cl=clientes.find(c=>c.id===p.clienteId);const vend=colabs.find(c=>c.id===p.vendedorId);return <Modal t={t} title={`Pedido #${p.id}`} onClose={()=>setModal(null)} wide><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><div style={{flex:1}}><div style={{color:t.muted,fontSize:10}}>Cliente</div><div style={{color:t.text,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>{cl?.logo&&<img src={cl.logo} style={{width:20,height:20,borderRadius:3,objectFit:"cover"}} alt=""/>}{cl?.nome}</div></div><div><div style={{color:t.muted,fontSize:10}}>Data / Prazo</div><div style={{color:t.text,fontSize:12}}>{fmtD(p.criado)} → {fmtD(p.prazo)}</div></div><Badge status={p.status}/><PgtoBadge s={p.statusPgto||"Pendente"}/></div><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:10}}><thead><tr style={{background:t.surface2}}>{["Descrição","Qtd","Unit.","Total"].map(h=><th key={h} style={{padding:"6px 9px",color:t.sub,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{(p.itens||[]).map(it=><tr key={it.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 9px",color:t.text}}>{it.descricao}</td><td style={{padding:"6px 9px",color:t.sub}}>{it.qtd}</td><td style={{padding:"6px 9px",color:t.sub}}>{fmtM(it.unitario)}</td><td style={{padding:"6px 9px",color:"#10b981",fontWeight:600}}>{fmtM(it.total)}</td></tr>)}</tbody></table><div style={{background:t.surface2,borderRadius:8,padding:10,marginBottom:10}}>{[["Total",fmtM(p.totalPedido),"#10b981"],["Pago",fmtM(p.valorPago||0),"#10b981"],["Saldo",fmtM(p.totalPedido-(p.valorPago||0)),"#ef4444"]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:t.sub,fontSize:12}}>{l}</span><span style={{color:c,fontWeight:700}}>{v}</span></div>)}</div>        {p.infoCompl&&<div style={{background:t.surface2,borderRadius:8,padding:9,marginBottom:10}}><div style={{color:t.muted,fontSize:10,marginBottom:2}}>OBS.</div><div style={{color:t.text,fontSize:12}}>{p.infoCompl}</div></div>}
        {/* HISTÓRICO DE PAGAMENTOS */}
        {(p.historicoPgtos||[]).length>0&&<div style={{marginBottom:12}}>
          <div style={{color:t.sub,fontSize:12,fontWeight:600,marginBottom:8}}>📋 Histórico de Pagamentos</div>
          <div style={{background:t.surface2,borderRadius:9,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:t.border}}>{["Data","Hora","Valor","Forma","Destino"].map(h=><th key={h} style={{padding:"6px 10px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead>
              <tbody>{(p.historicoPgtos||[]).map((pg,i)=><tr key={pg.id} style={{borderTop:`1px solid ${t.border}`}}>
                <td style={{padding:"6px 10px",color:t.text}}>{fmtD(pg.data)}</td>
                <td style={{padding:"6px 10px",color:t.muted}}>{pg.hora}</td>
                <td style={{padding:"6px 10px",color:"#10b981",fontWeight:700}}>{fmtM(pg.valor)}</td>
                <td style={{padding:"6px 10px",color:t.sub}}>{pg.forma}</td>
                <td style={{padding:"6px 10px"}}><span style={{background:pg.destino==="caixa"?"#10b98122":"#6366f122",color:pg.destino==="caixa"?"#10b981":"#6366f1",padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600}}>{pg.destino==="caixa"?"🏧 Caixa":"📊 Financeiro"}</span></td>
              </tr>)}</tbody>
              <tfoot><tr style={{borderTop:`2px solid ${t.border}`,background:t.surface2}}><td colSpan={2} style={{padding:"7px 10px",color:t.text,fontWeight:700}}>Total Pago</td><td style={{padding:"7px 10px",color:"#10b981",fontWeight:700}}>{fmtM(p.valorPago||0)}</td><td colSpan={2} style={{padding:"7px 10px",color:t.muted,fontSize:11}}>Saldo: {fmtM(p.totalPedido-(p.valorPago||0))}</td></tr></tfoot>
            </table>
          </div>
        </div>}{(canEdit||canStatus)&&<div style={{marginBottom:10}}><div style={{color:t.sub,fontSize:11,marginBottom:4}}>Alterar Status:</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{STATUS_LIST.map(s=><button key={s} onClick={()=>changeStatus(p,s)} style={{background:p.status===s?SC[s]:t.surface2,color:p.status===s?"#fff":t.sub,border:`1px solid ${SC[s]}66`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:600}}>{s}</button>)}</div></div>}<div style={{display:"flex",gap:7,justifyContent:"flex-end",flexWrap:"wrap"}}>{p.arquivo&&<a href={p.arquivo} download style={{color:"#6366f1",fontSize:12,display:"flex",alignItems:"center",gap:3,textDecoration:"none"}}>📎 Arte</a>}{canEdit&&<Btn t={t} variant="success" onClick={()=>{setModal(null);setTimeout(()=>handlePgto(p),50);}}><Ico n="cash" s={13}/> Pagamento</Btn>}<Btn t={t} variant="outline" onClick={()=>printOS(p,cl,vend,empresa)}><Ico n="print" s={13}/> Imprimir OS</Btn><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Fechar</Btn></div></Modal>;})()}
    {modal==="pgto"&&selected&&<ModalPgto pedido={selected} onConfirm={confirmPgto} onClose={()=>setModal(null)}/>}
  </div>;
};

// ── FINANCEIRO ────────────────────────────────────────────────────────────────
const Financeiro=({fin,setFin,pedidos,clientes,colabs,canDel,t})=>{
  const [filter,setFilter]=useState("todos");const [from,setFrom]=useState("");const [to,setTo]=useState("");const [modal,setModal]=useState(null);
  const empty={tipo:"receber",descricao:"",valor:0,custo:0,vencimento:"",pago:false};const [form,setForm]=useState(empty);
  const base=filter==="todos"?fin:fin.filter(f=>f.tipo===filter);
  const filtered=base.filter(f=>(!from&&!to)||inRange(f.vencimento,from,to));
  const totRec=fin.filter(f=>f.tipo==="receber"&&!f.pago).reduce((s,f)=>s+f.valor,0);
  const totPag=fin.filter(f=>f.tipo==="pagar"&&!f.pago).reduce((s,f)=>s+f.valor,0);
  const recebido=fin.filter(f=>f.tipo==="receber"&&f.pago).reduce((s,f)=>s+f.valor,0);
  const custo=fin.filter(f=>f.tipo==="receber"&&f.pago).reduce((s,f)=>s+(f.custo||0),0);
  const lucro=recebido-custo;const marg=recebido>0?(lucro/recebido*100).toFixed(1):0;
  const desp=fin.filter(f=>f.tipo==="pagar"&&f.pago).reduce((s,f)=>s+f.valor,0);
  const save=()=>{const d={...form,valor:Number(form.valor),custo:Number(form.custo||0)};if(form.id)setFin(fs=>fs.map(f=>f.id===form.id?d:f));else setFin(fs=>[...fs,{...d,id:Date.now()}]);setModal(null);};
  const comissoes=colabs.filter(c=>c.comissao>0).map(c=>{const tv=pedidos.filter(p=>p.vendedorId===c.id&&p.status==="Pedido Concluído").reduce((s,p)=>s+p.totalPedido,0);return{...c,totalVendas:tv,valCom:tv*c.comissao/100};});
  return <div>
    <h2 style={{color:t.text,margin:"0 0 12px"}}>Controle Financeiro</h2>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><Card t={t} title="A Receber" value={fmtM(totRec)} color="#6366f1" icon={<Ico n="finance" s={16}/>}/><Card t={t} title="A Pagar" value={fmtM(totPag)} color="#ef4444" icon={<Ico n="finance" s={16}/>}/><Card t={t} title="Total Recebido" value={fmtM(recebido)} color="#10b981" icon={<Ico n="chart" s={16}/>}/><Card t={t} title="Custo das Vendas" value={fmtM(custo)} color="#f59e0b" icon={<Ico n="minus" s={16}/>}/><Card t={t} title="Lucro Bruto" value={fmtM(lucro)} sub={`Margem ${marg}%`} color="#8b5cf6" icon={<Ico n="chart" s={16}/>}/><Card t={t} title="Resultado Líquido" value={fmtM(lucro-desp)} sub="Após despesas" color={lucro-desp>=0?"#10b981":"#ef4444"} icon={<Ico n="cash" s={16}/>}/></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>{[["todos","Todos"],["receber","A Receber"],["pagar","A Pagar"]].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} style={{background:filter===v?t.accent:t.surface2,color:filter===v?t.bg:t.sub,border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>{l}</button>)}<input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"5px 8px",color:t.text,fontSize:12}}/><span style={{color:t.muted}}>–</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"5px 8px",color:t.text,fontSize:12}}/>{(from||to)&&<button onClick={()=>{setFrom("");setTo("");}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11}}>✕</button>}</div><Btn t={t} onClick={()=>{setForm(empty);setModal("form");}}><Ico n="plus" s={13}/> Novo Lançamento</Btn></div>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto",marginBottom:18}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:t.surface2}}>{["Tipo","Descrição","Valor","Custo","Margem","Vencimento","Situação",""].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{filtered.map(f=>{const m=f.custo&&f.valor?((f.valor-f.custo)/f.valor*100).toFixed(1):null;return <tr key={f.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"7px 11px"}}><span style={{color:f.tipo==="receber"?"#10b981":"#ef4444",fontWeight:600}}>{f.tipo==="receber"?"▲ Receber":"▼ Pagar"}</span></td><td style={{padding:"7px 11px",color:t.text}}>{f.descricao}</td><td style={{padding:"7px 11px",color:f.tipo==="receber"?"#10b981":"#ef4444",fontWeight:600}}>{fmtM(f.valor)}</td><td style={{padding:"7px 11px",color:"#f59e0b"}}>{f.custo>0?fmtM(f.custo):"—"}</td><td style={{padding:"7px 11px",color:"#8b5cf6",fontWeight:600}}>{m?m+"%":"—"}</td><td style={{padding:"7px 11px",color:t.sub}}>{fmtD(f.vencimento)}</td><td style={{padding:"7px 11px"}}><button onClick={()=>setFin(fs=>fs.map(x=>x.id===f.id?{...x,pago:!x.pago}:x))} style={{background:f.pago?"#10b98122":"#f59e0b22",color:f.pago?"#10b981":"#f59e0b",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:12,fontWeight:600}}>{f.pago?"✓ Pago":"Pendente"}</button></td>          <td style={{padding:"7px 11px"}}><div style={{display:"flex",gap:4}}><Btn t={t} variant="ghost" style={{padding:"3px 7px"}} onClick={()=>{setForm(f);setModal("form");}}><Ico n="edit" s={12}/></Btn>{canDel&&<Btn t={t} variant="danger" style={{padding:"3px 7px"}} onClick={()=>setFin(fs=>fs.filter(x=>x.id!==f.id))}><Ico n="trash" s={12}/></Btn>}</div></td></tr>;})}
    {filtered.length===0&&<tr><td colSpan={8} style={{padding:14,color:t.muted,textAlign:"center"}}>Nenhum lançamento.</td></tr>}</tbody></table></div>
    {comissoes.length>0&&<><h3 style={{color:t.sub,fontSize:12,margin:"0 0 8px",textTransform:"uppercase"}}>Comissões</h3><div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:t.surface2}}>{["Vendedor","Total Vendas","%","Comissão"].map(h=><th key={h} style={{padding:"8px 11px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{comissoes.map(c=><tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"7px 11px",color:t.text,fontWeight:600}}>{c.nome}</td><td style={{padding:"7px 11px",color:t.sub}}>{fmtM(c.totalVendas)}</td><td style={{padding:"7px 11px",color:"#6366f1"}}>{c.comissao}%</td><td style={{padding:"7px 11px",color:"#10b981",fontWeight:600}}>{fmtM(c.valCom)}</td></tr>)}</tbody></table></div></>}
    {modal==="form"&&<Modal t={t} title={form.id?"Editar":"Novo Lançamento"} onClose={()=>setModal(null)}><Sel label="Tipo" t={t} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value="receber">A Receber</option><option value="pagar">A Pagar</option></Sel><Inp label="Descrição *" t={t} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/><div style={{display:"flex",gap:10}}><Inp label="Valor (R$)" t={t} type="number" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/><Inp label="Custo (R$)" t={t} type="number" value={form.custo||0} onChange={e=>setForm(f=>({...f,custo:e.target.value}))}/></div><Inp label="Vencimento" t={t} type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/><Sel label="Situação" t={t} value={String(form.pago)} onChange={e=>setForm(f=>({...f,pago:e.target.value==="true"}))}><option value="false">Pendente</option><option value="true">Pago</option></Sel><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={save}>Salvar</Btn></div></Modal>}
  </div>;
};

// ── CAIXA DIÁRIO ──────────────────────────────────────────────────────────────
const CaixaDiario=({caixa,setCaixa,fin,setFin,t,user})=>{
  const hoje=todayStr();const isAdmin=user.role==="admin";
  const [modal,setModal]=useState(null);const [confirmClose,setConfirmClose]=useState(false);
  const [movForm,setMovForm]=useState({descricao:"",valor:0,formaPgto:"Dinheiro",tipo:"entrada"});const [saldoAb,setSaldoAb]=useState(0);
  const cx=caixa.find(c=>c.data===hoje&&!c.fechado);
  const historico=[...caixa].filter(c=>c.fechado).sort((a,b)=>b.data.localeCompare(a.data));
  const abrirCaixa=()=>{if(!cx)setCaixa(cs=>[...cs,{id:Date.now(),data:hoje,saldoAbertura:Number(saldoAb),movimentos:[],totalEntradas:0,totalSaidas:0,totalVendas:0,fechado:false}]);setModal(null);};
  const addMov=()=>{if(!movForm.descricao||!movForm.valor)return;setCaixa(cs=>cs.map(c=>{if(c.data!==hoje||c.fechado)return c;const m={...movForm,id:Date.now(),valor:Number(movForm.valor),hora:nowTime()};const ms=[...(c.movimentos||[]),m];const ent=ms.filter(x=>x.tipo==="entrada").reduce((s,x)=>s+x.valor,0);const sai=ms.filter(x=>x.tipo==="saida").reduce((s,x)=>s+x.valor,0);return{...c,movimentos:ms,totalEntradas:ent,totalSaidas:sai,totalVendas:ent};}));setMovForm({descricao:"",valor:0,formaPgto:"Dinheiro",tipo:"entrada"});setModal(null);};
  const remMov=(cxId,mId)=>{if(!isAdmin)return;setCaixa(cs=>cs.map(c=>{if(c.id!==cxId)return c;const ms=c.movimentos.filter(m=>m.id!==mId);const ent=ms.filter(x=>x.tipo==="entrada").reduce((s,x)=>s+x.valor,0);const sai=ms.filter(x=>x.tipo==="saida").reduce((s,x)=>s+x.valor,0);return{...c,movimentos:ms,totalEntradas:ent,totalSaidas:sai,totalVendas:ent};}));};
  const saldoAtual=cx?(cx.saldoAbertura||0)+cx.totalEntradas-cx.totalSaidas:0;
  const fecharCaixa=()=>{if(!cx)return;const sF=saldoAtual;const sT=cx.totalEntradas-cx.totalSaidas;setCaixa(cs=>cs.map(c=>c.id===cx.id?{...c,fechado:true,fechadoEm:new Date().toLocaleString("pt-BR"),saldoFinal:sF,saldoTransferencia:sT,saldoProximoDia:sF,totalTransferencia:sT}:c));if(sT>0)setFin(fs=>[...fs,{id:Date.now(),tipo:"receber",descricao:`Fechamento de Caixa — ${fmtD(hoje)}`,valor:sT,custo:0,vencimento:hoje,pago:true}]);setConfirmClose(false);};
  return <div>
    <h2 style={{color:t.text,margin:"0 0 12px"}}>Caixa Diário — Balcão</h2>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:7}}><div><div style={{color:t.sub,fontSize:12}}>{fmtD(hoje)}</div><div style={{color:cx?"#10b981":"#ef4444",fontWeight:700,fontSize:14,marginTop:2}}>{cx?"🟢 Aberto":"🔴 Fechado"}</div></div>{cx?<div style={{display:"flex",gap:6}}><Btn t={t} onClick={()=>setModal("mov")}><Ico n="plus" s={13}/> Lançamento</Btn><Btn t={t} variant="danger" onClick={()=>setConfirmClose(true)}><Ico n="transfer" s={13}/> Fechar</Btn></div>:<Btn t={t} variant="success" onClick={()=>setModal("abrir")}><Ico n="plus" s={13}/> Abrir Caixa</Btn>}</div>
      {cx&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><Card t={t} title="Saldo Abertura" value={fmtM(cx.saldoAbertura||0)} color="#6366f1" icon={<Ico n="cash" s={14}/>}/><Card t={t} title="Entradas" value={fmtM(cx.totalEntradas||0)} color="#10b981" icon={<Ico n="chart" s={14}/>}/><Card t={t} title="Saídas" value={fmtM(cx.totalSaidas||0)} color="#ef4444" icon={<Ico n="minus" s={14}/>}/><Card t={t} title="Saldo Atual" value={fmtM(saldoAtual)} color="#f59e0b" icon={<Ico n="cash" s={14}/>}/></div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Hora","Descrição","Forma Pgto","Tipo","Valor",""].map(h=><th key={h} style={{padding:"7px 9px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{!(cx.movimentos||[]).length&&<tr><td colSpan={6} style={{padding:12,color:t.muted,textAlign:"center"}}>Sem lançamentos.</td></tr>}{(cx.movimentos||[]).map(m=><tr key={m.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 9px",color:t.muted}}>{m.hora}</td><td style={{padding:"6px 9px",color:t.text}}>{m.descricao}{m.pedidoId&&<span style={{color:"#6366f1",fontSize:10,marginLeft:4}}>(Ped.#{m.pedidoId})</span>}</td><td style={{padding:"6px 9px",color:t.sub}}>{m.formaPgto}</td><td style={{padding:"6px 9px"}}><span style={{color:m.tipo==="entrada"?"#10b981":"#ef4444",fontWeight:600}}>{m.tipo==="entrada"?"▲ Entrada":"▼ Saída"}</span></td><td style={{padding:"6px 9px",color:m.tipo==="entrada"?"#10b981":"#ef4444",fontWeight:700}}>{fmtM(m.valor)}</td><td style={{padding:"6px 9px"}}>{isAdmin&&<Btn t={t} variant="danger" style={{padding:"2px 6px"}} onClick={()=>remMov(cx.id,m.id)}><Ico n="trash" s={11}/></Btn>}</td></tr>)}</tbody></table></>}
    </div>
    {historico.length>0&&<><h3 style={{color:t.sub,fontSize:11,margin:"0 0 7px",textTransform:"uppercase"}}>Histórico</h3><div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Data","Abert.","Entradas","Saídas","Saldo Final","→ Financeiro","Próx. Dia","Fechado em"].map(h=><th key={h} style={{padding:"7px 10px",color:t.sub,fontWeight:600,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{historico.map(c=><tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 10px",color:t.text,fontWeight:600}}>{fmtD(c.data)}</td><td style={{padding:"6px 10px",color:"#6366f1"}}>{fmtM(c.saldoAbertura||0)}</td><td style={{padding:"6px 10px",color:"#10b981"}}>{fmtM(c.totalEntradas||0)}</td><td style={{padding:"6px 10px",color:"#ef4444"}}>{fmtM(c.totalSaidas||0)}</td><td style={{padding:"6px 10px",color:"#f59e0b",fontWeight:600}}>{fmtM(c.saldoFinal||0)}</td><td style={{padding:"6px 10px",color:"#10b981",fontWeight:600}}>{fmtM(c.saldoTransferencia||0)}</td><td style={{padding:"6px 10px",color:"#6366f1",fontWeight:600}}>{fmtM(c.saldoProximoDia||0)}</td><td style={{padding:"6px 10px",color:t.muted,fontSize:11}}>{c.fechadoEm}</td></tr>)}</tbody></table></div></>}
    {modal==="abrir"&&<Modal t={t} title="Abrir Caixa" onClose={()=>setModal(null)}><Inp label="Saldo de Abertura (R$)" t={t} type="number" value={saldoAb} onChange={e=>setSaldoAb(e.target.value)}/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} variant="success" onClick={abrirCaixa}>Abrir</Btn></div></Modal>}
    {modal==="mov"&&<Modal t={t} title="Novo Lançamento" onClose={()=>setModal(null)}><Sel label="Tipo" t={t} value={movForm.tipo} onChange={e=>setMovForm(v=>({...v,tipo:e.target.value}))}><option value="entrada">▲ Entrada</option><option value="saida">▼ Saída / Retirada</option></Sel><Inp label="Descrição *" t={t} value={movForm.descricao} onChange={e=>setMovForm(v=>({...v,descricao:e.target.value}))} placeholder="Ex: Venda balcão..."/><Inp label="Valor (R$) *" t={t} type="number" value={movForm.valor} onChange={e=>setMovForm(v=>({...v,valor:e.target.value}))}/><Sel label="Forma Pgto" t={t} value={movForm.formaPgto} onChange={e=>setMovForm(v=>({...v,formaPgto:e.target.value}))}>{["Dinheiro","Pix","Débito","Crédito","Transferência"].map(f=><option key={f}>{f}</option>)}</Sel><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn t={t} onClick={addMov}>Registrar</Btn></div></Modal>}
    {confirmClose&&<Modal t={t} title="Fechar Caixa" onClose={()=>setConfirmClose(false)}><div style={{background:t.surface2,borderRadius:9,padding:12,marginBottom:12}}>{[["Saldo Abertura",fmtM(cx?.saldoAbertura||0),"#6366f1"],["Entradas",fmtM(cx?.totalEntradas||0),"#10b981"],["Saídas","- "+fmtM(cx?.totalSaidas||0),"#ef4444"]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:t.sub}}>{l}</span><span style={{color:c,fontWeight:600}}>{v}</span></div>)}<div style={{borderTop:`1px solid ${t.border}`,paddingTop:9,marginTop:3}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:t.text,fontWeight:600}}>Saldo Final</span><span style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>{fmtM(saldoAtual)}</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:t.sub,fontSize:12}}>→ Transferência Financeiro</span><span style={{color:"#10b981",fontWeight:600}}>{fmtM((cx?.totalEntradas||0)-(cx?.totalSaidas||0))}</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:t.sub,fontSize:12}}>→ Saldo Próximo Dia</span><span style={{color:"#6366f1",fontWeight:600}}>{fmtM(saldoAtual)}</span></div></div></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn t={t} variant="ghost" onClick={()=>setConfirmClose(false)}>Cancelar</Btn><Btn t={t} variant="danger" onClick={fecharCaixa}><Ico n="transfer" s={13}/> Confirmar</Btn></div></Modal>}
  </div>;
};

// ── RELATÓRIOS ────────────────────────────────────────────────────────────────
const Relatorios=({pedidos,clientes,fin,colabs,caixa,t,empresa})=>{
  const [tipo,setTipo]=useState("pedidos");const [from,setFrom]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split("T")[0]);const [to,setTo]=useState(todayStr());const [statusFilter,setStatusFilter]=useState("Todos");const [pgtoFilter,setPgtoFilter]=useState("Todos");const [clienteFilter,setClienteFilter]=useState("Todos");const [caixaDate,setCaixaDate]=useState(todayStr());
  const tipos=[{id:"pedidos",label:"Pedidos"},{id:"financeiro",label:"Financeiro"},{id:"caixa_det",label:"Caixa Detalhado"},{id:"clientes",label:"Clientes"},{id:"comissoes",label:"Comissões"}];
  const pedRel=useMemo(()=>{let r=pedidos.filter(p=>inRange(p.criado,from,to));if(statusFilter!=="Todos")r=r.filter(p=>p.status===statusFilter);if(pgtoFilter!=="Todos")r=r.filter(p=>p.statusPgto===pgtoFilter);if(clienteFilter!=="Todos")r=r.filter(p=>p.clienteId===Number(clienteFilter));return r;},[pedidos,from,to,statusFilter,pgtoFilter,clienteFilter]);
  const finRel=useMemo(()=>fin.filter(f=>inRange(f.vencimento,from,to)),[fin,from,to]);
  const finRec=finRel.filter(f=>f.tipo==="receber");const finPag=finRel.filter(f=>f.tipo==="pagar");
  const totRec=finRec.reduce((s,f)=>s+f.valor,0);const totPag=finPag.reduce((s,f)=>s+f.valor,0);
  const totCusto=finRec.filter(f=>f.pago).reduce((s,f)=>s+(f.custo||0),0);const lucro=finRec.filter(f=>f.pago).reduce((s,f)=>s+f.valor,0)-totCusto;
  const cxDia=caixa.find(c=>c.data===caixaDate);
  const cliRel=useMemo(()=>{const map={};pedidos.filter(p=>inRange(p.criado,from,to)).forEach(p=>{if(!map[p.clienteId])map[p.clienteId]={total:0,qtd:0,pago:0};map[p.clienteId].total+=p.totalPedido;map[p.clienteId].qtd+=1;map[p.clienteId].pago+=(p.valorPago||0);});return Object.entries(map).map(([id,v])=>({...v,cliente:clientes.find(c=>c.id===Number(id))})).sort((a,b)=>b.total-a.total);},[pedidos,clientes,from,to]);
  const comRel=useMemo(()=>colabs.filter(c=>c.comissao>0).map(c=>{const ps=pedidos.filter(p=>p.vendedorId===c.id&&p.status==="Pedido Concluído"&&inRange(p.criado,from,to));const tv=ps.reduce((s,p)=>s+p.totalPedido,0);return{...c,totalVendas:tv,valCom:tv*c.comissao/100,qtd:ps.length};}),[colabs,pedidos,from,to]);
  const doPrint=()=>{const content=document.getElementById("rel-content");if(!content)return;const w=window.open("","_blank","width=900,height=800");w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:12px;}table{width:100%;border-collapse:collapse;margin:12px 0;}th{background:#111;color:#fff;padding:7px 9px;text-align:left;}td{padding:7px 9px;border-bottom:1px solid #eee;}h3{margin:14px 0 6px;}</style></head><body>${content.innerHTML}<script>window.print()<\/script></body></html>`);w.document.close();};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{color:t.text,margin:0}}>Relatórios</h2><Btn t={t} variant="outline" onClick={doPrint}><Ico n="print" s={13}/> Imprimir</Btn></div>
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{tipos.map(tp=><button key={tp.id} onClick={()=>setTipo(tp.id)} style={{background:tipo===tp.id?t.accent:t.surface2,color:tipo===tp.id?t.bg:t.sub,border:"none",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{tp.label}</button>)}</div>
      {tipo==="caixa_det"?<div><label style={{display:"block",color:t.sub,fontSize:11,marginBottom:3}}>Data do Caixa</label><input type="date" value={caixaDate} onChange={e=>setCaixaDate(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"6px 9px",color:t.text,fontSize:12}}/></div>:<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div><label style={{display:"block",color:t.sub,fontSize:11,marginBottom:3}}>De</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"6px 9px",color:t.text,fontSize:12}}/></div>
        <div><label style={{display:"block",color:t.sub,fontSize:11,marginBottom:3}}>Até</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:7,padding:"6px 9px",color:t.text,fontSize:12}}/></div>
        {tipo==="pedidos"&&<><Sel label="Status" t={t} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{margin:0,minWidth:160}}><option>Todos</option>{STATUS_LIST.map(s=><option key={s}>{s}</option>)}</Sel><Sel label="Pagamento" t={t} value={pgtoFilter} onChange={e=>setPgtoFilter(e.target.value)} style={{margin:0,minWidth:130}}><option>Todos</option>{STATUS_PGTO.map(s=><option key={s}>{s}</option>)}</Sel><Sel label="Cliente" t={t} value={clienteFilter} onChange={e=>setClienteFilter(e.target.value)} style={{margin:0,minWidth:160}}><option value="Todos">Todos</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</Sel></>}
      </div>}
    </div>
    <div id="rel-content" style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,borderBottom:`2px solid ${t.border}`,paddingBottom:12}}><div>{empresa.logo&&<img src={empresa.logo} style={{maxHeight:40,maxWidth:140,objectFit:"contain",marginBottom:4,display:"block"}} alt="logo"/>}<div style={{color:t.text,fontWeight:700,fontSize:16}}>{empresa.nome}</div><div style={{color:t.sub,fontSize:12}}>Relatório: {tipos.find(tp=>tp.id===tipo)?.label}</div></div><div style={{textAlign:"right",color:t.sub,fontSize:11}}>{tipo!=="caixa_det"?`Período: ${fmtD(from)} – ${fmtD(to)}`:`Data: ${fmtD(caixaDate)}`}<br/>Emitido: {fmtD(todayStr())}</div></div>
      {tipo==="pedidos"&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>{[["Pedidos",pedRel.length,"#6366f1"],["Valor Total",fmtM(pedRel.reduce((s,p)=>s+p.totalPedido,0)),"#10b981"],["Total Pago",fmtM(pedRel.reduce((s,p)=>s+(p.valorPago||0),0)),"#10b981"],["A Receber",fmtM(pedRel.reduce((s,p)=>s+(p.totalPedido-(p.valorPago||0)),0)),"#ef4444"]].map(([l,v,c])=><div key={l} style={{background:t.surface2,borderRadius:9,padding:"10px 14px",flex:1,minWidth:120}}><div style={{color:t.sub,fontSize:11}}>{l}</div><div style={{color:c,fontWeight:700,fontSize:16,marginTop:2}}>{v}</div></div>)}</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["#","Data","Cliente","Total","Pago","Saldo","Pgto","Status"].map(h=><th key={h} style={{padding:"7px 10px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{pedRel.map(p=>{const cl=clientes.find(c=>c.id===p.clienteId);const saldo=p.totalPedido-(p.valorPago||0);return <tr key={p.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 10px",color:t.muted}}>#{p.id}</td><td style={{padding:"6px 10px",color:t.sub}}>{fmtD(p.criado)}</td><td style={{padding:"6px 10px",color:t.text,fontWeight:600}}>{cl?.nome||"-"}</td><td style={{padding:"6px 10px",color:"#10b981",fontWeight:700}}>{fmtM(p.totalPedido)}</td><td style={{padding:"6px 10px",color:"#10b981"}}>{fmtM(p.valorPago||0)}</td><td style={{padding:"6px 10px",color:saldo>0?"#ef4444":t.muted}}>{saldo>0?fmtM(saldo):"—"}</td><td style={{padding:"6px 10px"}}><PgtoBadge s={p.statusPgto}/></td><td style={{padding:"6px 10px"}}><Badge status={p.status}/></td></tr>;})}
      {pedRel.length===0&&<tr><td colSpan={8} style={{padding:16,color:t.muted,textAlign:"center"}}>Nenhum pedido.</td></tr>}</tbody></table></>}
      {tipo==="financeiro"&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>{[["A Receber",fmtM(totRec),"#10b981"],["A Pagar",fmtM(totPag),"#ef4444"],["Custo Vendas",fmtM(totCusto),"#f59e0b"],["Lucro Bruto",fmtM(lucro),"#8b5cf6"]].map(([l,v,c])=><div key={l} style={{background:t.surface2,borderRadius:9,padding:"10px 14px",flex:1,minWidth:120}}><div style={{color:t.sub,fontSize:11}}>{l}</div><div style={{color:c,fontWeight:700,fontSize:15,marginTop:2}}>{v}</div></div>)}</div>
      {[["▲ Receber",finRec],["▼ Pagar",finPag]].map(([label,rows])=><div key={label} style={{marginBottom:16}}><h3 style={{color:t.text,fontSize:13,margin:"0 0 8px"}}>{label}</h3><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Descrição","Valor","Custo","Margem","Vencimento","Situação"].map(h=><th key={h} style={{padding:"7px 9px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{rows.map(f=>{const m=f.custo&&f.valor?((f.valor-f.custo)/f.valor*100).toFixed(1):null;return <tr key={f.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 9px",color:t.text}}>{f.descricao}</td><td style={{padding:"6px 9px",color:label.includes("Receber")?"#10b981":"#ef4444",fontWeight:600}}>{fmtM(f.valor)}</td><td style={{padding:"6px 9px",color:"#f59e0b"}}>{f.custo>0?fmtM(f.custo):"—"}</td><td style={{padding:"6px 9px",color:"#8b5cf6"}}>{m?m+"%":"—"}</td><td style={{padding:"6px 9px",color:t.sub}}>{fmtD(f.vencimento)}</td><td style={{padding:"6px 9px"}}><span style={{color:f.pago?"#10b981":"#f59e0b",fontWeight:600}}>{f.pago?"✓ Pago":"Pendente"}</span></td></tr>;})}
      {rows.length===0&&<tr><td colSpan={6} style={{padding:12,color:t.muted,textAlign:"center"}}>Sem registros.</td></tr>}</tbody></table></div>)}</>}
      {tipo==="caixa_det"&&(!cxDia?<div style={{color:t.muted,padding:20,textAlign:"center"}}>Nenhum caixa encontrado para {fmtD(caixaDate)}.</div>:<><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>{[["Saldo Abertura",fmtM(cxDia.saldoAbertura||0),"#6366f1"],["Entradas",fmtM(cxDia.totalEntradas||0),"#10b981"],["Saídas",fmtM(cxDia.totalSaidas||0),"#ef4444"],["Saldo Final",fmtM(cxDia.saldoFinal!==undefined?cxDia.saldoFinal:(cxDia.saldoAbertura||0)+(cxDia.totalEntradas||0)-(cxDia.totalSaidas||0)),"#f59e0b"]].map(([l,v,c])=><div key={l} style={{background:t.surface2,borderRadius:9,padding:"10px 14px",flex:1,minWidth:110}}><div style={{color:t.sub,fontSize:11}}>{l}</div><div style={{color:c,fontWeight:700,fontSize:15,marginTop:2}}>{v}</div></div>)}</div>
      {cxDia.fechado&&<div style={{background:"#10b98118",border:"1px solid #10b98144",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#10b981"}}>✓ Fechado em {cxDia.fechadoEm} · Transferido: {fmtM(cxDia.saldoTransferencia||0)}</div>}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Hora","Descrição","Forma Pgto","Tipo","Valor"].map(h=><th key={h} style={{padding:"7px 9px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{(cxDia.movimentos||[]).length===0&&<tr><td colSpan={5} style={{padding:12,color:t.muted,textAlign:"center"}}>Sem movimentos.</td></tr>}{(cxDia.movimentos||[]).map(m=><tr key={m.id} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 9px",color:t.muted}}>{m.hora}</td><td style={{padding:"6px 9px",color:t.text}}>{m.descricao}</td><td style={{padding:"6px 9px",color:t.sub}}>{m.formaPgto}</td><td style={{padding:"6px 9px"}}><span style={{color:m.tipo==="entrada"?"#10b981":"#ef4444",fontWeight:600}}>{m.tipo==="entrada"?"▲":"▼"} {m.tipo}</span></td><td style={{padding:"6px 9px",color:m.tipo==="entrada"?"#10b981":"#ef4444",fontWeight:700}}>{fmtM(m.valor)}</td></tr>)}</tbody></table></>)}
      {tipo==="clientes"&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Pos.","Cliente","Pedidos","Total","Pago","A Receber"].map(h=><th key={h} style={{padding:"7px 10px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{cliRel.map((c,i)=><tr key={i} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 10px",color:i<3?"#f59e0b":t.muted,fontWeight:i<3?700:400}}>#{i+1}</td><td style={{padding:"6px 10px",color:t.text,fontWeight:600}}>{c.cliente?.nome||"—"}</td><td style={{padding:"6px 10px",color:t.sub}}>{c.qtd}</td><td style={{padding:"6px 10px",color:"#10b981",fontWeight:700}}>{fmtM(c.total)}</td><td style={{padding:"6px 10px",color:"#10b981"}}>{fmtM(c.pago)}</td><td style={{padding:"6px 10px",color:c.total-c.pago>0?"#ef4444":t.muted}}>{c.total-c.pago>0?fmtM(c.total-c.pago):"—"}</td></tr>)}{cliRel.length===0&&<tr><td colSpan={6} style={{padding:16,color:t.muted,textAlign:"center"}}>Nenhum dado.</td></tr>}</tbody></table>}
      {tipo==="comissoes"&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:t.surface2}}>{["Vendedor","Pedidos","Total Vendido","% Comissão","Valor Comissão"].map(h=><th key={h} style={{padding:"7px 10px",color:t.sub,fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{comRel.map((c,i)=><tr key={i} style={{borderTop:`1px solid ${t.border}`}}><td style={{padding:"6px 10px",color:t.text,fontWeight:600}}>{c.nome}</td><td style={{padding:"6px 10px",color:t.sub}}>{c.qtd}</td><td style={{padding:"6px 10px",color:"#10b981",fontWeight:700}}>{fmtM(c.totalVendas)}</td><td style={{padding:"6px 10px",color:"#6366f1"}}>{c.comissao}%</td><td style={{padding:"6px 10px",color:"#f59e0b",fontWeight:700}}>{fmtM(c.valCom)}</td></tr>)}{comRel.length===0&&<tr><td colSpan={5} style={{padding:16,color:t.muted,textAlign:"center"}}>Nenhum dado.</td></tr>}<tr style={{borderTop:`2px solid ${t.border}`,background:t.surface2}}><td colSpan={4} style={{padding:"7px 10px",color:t.text,fontWeight:700}}>TOTAL</td><td style={{padding:"7px 10px",color:"#f59e0b",fontWeight:700}}>{fmtM(comRel.reduce((s,c)=>s+c.valCom,0))}</td></tr></tbody></table>}
    </div>
  </div>;
};

// ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────────
const Configuracoes=({empresa,setEmpresa,t,clientes,colabs,produtos,pedidos,fin,caixa,setClientes,setColabs,setProdutos,setPedidos,setFin,setCaixa,syncStatus})=>{
  const [form,setForm]=useState({...empresa});const fileRef=useRef();const impRef=useRef();const [impMsg,setImpMsg]=useState("");
  const handleLogo=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(f=>({...f,logo:ev.target.result}));r.readAsDataURL(f);};
  const save=()=>{setEmpresa(form);alert("Configurações salvas!");};
  const exportar=()=>{const dados={empresa,clientes,colabs,produtos,pedidos,fin,caixa,exportadoEm:new Date().toLocaleString("pt-BR")};const blob=new Blob([JSON.stringify(dados,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`criative-backup-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);};
  const importar=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.clientes)setClientes(d.clientes);if(d.colabs)setColabs(d.colabs);if(d.produtos)setProdutos(d.produtos);if(d.pedidos)setPedidos(d.pedidos);if(d.fin)setFin(d.fin);if(d.caixa)setCaixa(d.caixa);if(d.empresa)setEmpresa(d.empresa);setImpMsg(`✅ Backup restaurado! Exportado em: ${d.exportadoEm||"—"}`);}catch{setImpMsg("❌ Arquivo inválido.");}};r.readAsText(f);e.target.value="";};
  return <div>
    <h2 style={{color:t.text,margin:"0 0 16px"}}>Configurações</h2>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:22,flex:1,minWidth:280}}>
        <h3 style={{color:t.text,margin:"0 0 14px",fontSize:14}}>Identidade Visual</h3>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{width:160,height:80,borderRadius:10,background:t.surface2,border:`2px dashed ${t.border}`,margin:"0 auto 9px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer"}} onClick={()=>fileRef.current.click()}>{form.logo?<img src={form.logo} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="logo"/>:<div style={{textAlign:"center"}}><Ico n="upload" s={20} c={t.muted}/><div style={{color:t.muted,fontSize:11,marginTop:3}}>Clique para enviar</div></div>}</div><input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo}/><div style={{display:"flex",gap:7,justifyContent:"center"}}><Btn t={t} variant="ghost" style={{fontSize:12}} onClick={()=>fileRef.current.click()}><Ico n="upload" s={12}/> Alterar Logo</Btn>{form.logo&&<Btn t={t} variant="danger" style={{fontSize:12}} onClick={()=>setForm(f=>({...f,logo:""}))}>Remover</Btn>}</div></div>
        <Inp label="Nome da Empresa" t={t} value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <Btn t={t} onClick={save} style={{width:"100%",justifyContent:"center",marginTop:6}}><Ico n="check" s={13}/> Salvar</Btn>
      </div>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:22,flex:1,minWidth:280}}>
        <h3 style={{color:t.text,margin:"0 0 6px",fontSize:14}}>☁️ Supabase</h3>
        <div style={{background:syncStatus==="ok"?"#10b98118":syncStatus==="erro"?"#ef444418":"#f59e0b18",border:`1px solid ${syncStatus==="ok"?"#10b98144":syncStatus==="erro"?"#ef444444":"#f59e0b44"}`,borderRadius:9,padding:"10px 14px",marginBottom:14,fontSize:12,color:syncStatus==="ok"?"#10b981":syncStatus==="erro"?"#ef4444":"#f59e0b",fontWeight:600}}>
          {syncStatus==="ok"?"✅ Conectado — dados salvos na nuvem":syncStatus==="erro"?"❌ Erro de conexão":"🔄 Conectando..."}
        </div>
        <h3 style={{color:t.text,margin:"0 0 6px",fontSize:14}}>Backup</h3>
        <div style={{background:t.surface2,borderRadius:9,padding:12,marginBottom:12}}><div style={{color:t.text,fontWeight:600,fontSize:13,marginBottom:6}}>📊 Resumo atual</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>{[["Clientes",clientes.length],["Colaboradores",colabs.length],["Produtos",produtos.length],["Pedidos",pedidos.length],["Lançamentos Fin.",fin.length],["Registros Caixa",caixa.length]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:t.sub}}>{l}</span><span style={{color:t.text,fontWeight:600}}>{v}</span></div>)}</div></div>
        <div style={{display:"flex",gap:8,marginBottom:12}}><Btn t={t} variant="success" style={{flex:1,justifyContent:"center"}} onClick={exportar}><Ico n="upload" s={13}/> Exportar</Btn><Btn t={t} variant="ghost" style={{flex:1,justifyContent:"center"}} onClick={()=>impRef.current.click()}><Ico n="upload" s={13}/> Restaurar</Btn><input ref={impRef} type="file" accept=".json" style={{display:"none"}} onChange={importar}/></div>
        {impMsg&&<div style={{background:impMsg.startsWith("✅")?"#10b98118":"#ef444418",border:`1px solid ${impMsg.startsWith("✅")?"#10b98144":"#ef444444"}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:impMsg.startsWith("✅")?"#10b981":"#ef4444"}}>{impMsg}</div>}
      </div>
    </div>
  </div>;
};

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const [dark,setDark]=useState(()=>{try{const v=localStorage.getItem("cv5_dark");return v?JSON.parse(v):false;}catch{return false;}});
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [syncStatus,setSyncStatus]=useState("carregando");
  const [loaded,setLoaded]=useState(false);
  const [empresa,setEmpresaState]=useState(DEF_EMP);
  const [clientes,setClientesState]=useState([]);
  const [colabs,setColabsState]=useState([]);
  const [produtos,setProdutosState]=useState(DEF_PROD);
  const [pedidos,setPedidosState]=useState([]);
  const [fin,setFinState]=useState([]);
  const [caixa,setCaixaState]=useState([]);
  const [notifs,setNotifsState]=useState([]);
  const [users,setUsers]=useState(()=>{try{const v=localStorage.getItem("cv5_users");return v?JSON.parse(v):DEF_USERS;}catch{return DEF_USERS;}});

  useEffect(()=>{try{localStorage.setItem("cv5_dark",JSON.stringify(dark));}catch{}},[dark]);
  useEffect(()=>{try{localStorage.setItem("cv5_users",JSON.stringify(users));}catch{}},[users]);

  useEffect(()=>{
    const loadAll=async()=>{
      try{
        const [emp,cli,col,prod,ped,f,cx]=await Promise.all([sbLoad("empresa"),sbLoad("clientes"),sbLoad("colaboradores"),sbLoad("produtos"),sbLoad("pedidos"),sbLoad("financeiro"),sbLoad("caixa")]);
        if(emp)setEmpresaState(emp);
        if(cli)setClientesState(cli);
        if(col)setColabsState(col);
        if(prod)setProdutosState(prod);
        if(ped)setPedidosState(ped);
        if(f)setFinState(f);
        if(cx)setCaixaState(cx);
        setSyncStatus("ok");
      }catch(e){console.error(e);setSyncStatus("erro");}
      setLoaded(true);
    };
    loadAll();
  },[]);

  useEffect(()=>{if(loaded)sbSave("empresa",empresa).catch(()=>setSyncStatus("erro"));},[empresa,loaded]);
  useEffect(()=>{if(loaded)sbSave("clientes",clientes).catch(()=>setSyncStatus("erro"));},[clientes,loaded]);
  useEffect(()=>{if(loaded)sbSave("colaboradores",colabs).catch(()=>setSyncStatus("erro"));},[colabs,loaded]);
  useEffect(()=>{if(loaded)sbSave("produtos",produtos).catch(()=>setSyncStatus("erro"));},[produtos,loaded]);
  useEffect(()=>{if(loaded)sbSave("pedidos",pedidos).catch(()=>setSyncStatus("erro"));},[pedidos,loaded]);
  useEffect(()=>{if(loaded)sbSave("financeiro",fin).catch(()=>setSyncStatus("erro"));},[fin,loaded]);
  useEffect(()=>{if(loaded)sbSave("caixa",caixa).catch(()=>setSyncStatus("erro"));},[caixa,loaded]);

  const addNotif=useCallback(msg=>setNotifsState(ns=>[{id:Date.now(),msg,hora:new Date().toLocaleString("pt-BR"),lida:false},...ns].slice(0,40)),[]);
  const clearNotifs=useCallback(()=>setNotifsState([]),[]);
  const markRead=useCallback(()=>setNotifsState(ns=>ns.map(n=>({...n,lida:true}))),[]);

  const t=dark?TH.dark:TH.light;

  if(!loaded)return <div style={{minHeight:"100vh",background:TH.light.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{color:"#111",fontSize:22,fontWeight:900}}>Criative</div>
    <div style={{color:"#888",fontSize:14,display:"flex",alignItems:"center",gap:8}}><Ico n="cloud" s={18} c="#6366f1"/> Carregando dados do Supabase...</div>
    <div style={{width:200,height:3,background:"#e0e0e0",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:"#6366f1",animation:"load 1.5s ease-in-out infinite",width:"60%"}}/></div>
    <style>{`@keyframes load{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
  </div>;

  if(!user)return <Login onLogin={u=>{const saved=users.find(x=>x.id===u.id);setUser(saved||u);setPage("dashboard");}} t={t} users={users} empresa={empresa}/>;

  const role=user.role;
  const perm=role==="admin"?PERM_ROLES.admin:(user.permissoes||PERM_ROLES[role]||{});
  const canEdit=role==="admin"||role==="comercial";
  const canStatus=role==="producao";
  const canDel=(modulo)=>role==="admin"||(perm?.excluir?.[modulo]===true);
  const unread=notifs.filter(n=>!n.lida).length;

  const nav=[
    {id:"dashboard",label:"Dashboard",icon:"dashboard",show:!!perm.dashboard},
    {id:"pedidos",label:"Pedidos",icon:"orders",show:!!perm.pedidos},
    {id:"clientes",label:"Clientes",icon:"clients",show:!!perm.clientes},
    {id:"colaboradores",label:"Colaboradores",icon:"colabs",show:!!perm.colaboradores},
    {id:"produtos",label:"Produtos",icon:"produtos",show:!!perm.produtos},
    {id:"financeiro",label:"Financeiro",icon:"finance",show:!!perm.financeiro},
    {id:"caixa",label:"Caixa Diário",icon:"caixa",show:!!perm.caixa},
    {id:"relatorios",label:"Relatórios",icon:"relatorios",show:!!perm.relatorios},
    {id:"usuarios",label:"Usuários",icon:"usuarios",show:role==="admin"},
    {id:"configuracoes",label:"Configurações",icon:"settings",show:!!perm.configuracoes},
  ].filter(n=>n.show);

  return <div style={{display:"flex",minHeight:"100vh",background:t.bg,fontFamily:"system-ui,-apple-system,sans-serif",color:t.text}}>
    <div style={{width:196,background:t.surface,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"14px 13px 10px",borderBottom:`1px solid ${t.border}`,textAlign:"center"}}>
        {empresa.logo?<img src={empresa.logo} style={{maxWidth:160,maxHeight:56,objectFit:"contain",display:"block",margin:"0 auto 4px"}} alt="logo"/>:<div style={{color:t.text,fontWeight:900,fontSize:17,letterSpacing:-1}}>{empresa.nome}</div>}
        <div style={{color:t.sub,fontSize:10,marginTop:3}}>{ROLES[role]}</div>
        <div style={{marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:syncStatus==="ok"?"#10b981":syncStatus==="erro"?"#ef4444":"#f59e0b"}}/><span style={{color:syncStatus==="ok"?"#10b981":syncStatus==="erro"?"#ef4444":"#f59e0b",fontSize:9}}>{syncStatus==="ok"?"Nuvem OK":syncStatus==="erro"?"Offline":"Sync..."}</span></div>
      </div>
      <nav style={{flex:1,padding:"5px 0"}}>
        {nav.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"8px 13px",background:page===n.id?t.accentBg:"none",border:"none",borderLeft:page===n.id?`3px solid ${t.accent}`:"3px solid transparent",color:page===n.id?t.text:t.sub,cursor:"pointer",fontSize:12,fontWeight:page===n.id?700:400,textAlign:"left"}}>
          <Ico n={n.icon} s={13}/>{n.label}
          {n.id==="pedidos"&&unread>0&&role==="producao"&&<span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:13,height:13,fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",marginLeft:"auto"}}>{unread}</span>}
        </button>)}
      </nav>
      <div style={{padding:11,borderTop:`1px solid ${t.border}`}}>
        <button onClick={()=>setDark(d=>!d)} style={{display:"flex",alignItems:"center",gap:5,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:7,padding:"5px 8px",color:t.sub,cursor:"pointer",fontSize:11,marginBottom:7,width:"100%"}}><Ico n={dark?"sun":"moon"} s={12}/>{dark?"Modo Claro":"Modo Escuro"}</button>
        <div style={{color:t.text,fontSize:11,fontWeight:600}}>{user.name}</div>
        <div style={{color:t.muted,fontSize:10,marginBottom:5}}>{user.email}</div>
        <button onClick={()=>setUser(null)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11}}><Ico n="logout" s={11}/> Sair</button>
      </div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      <div style={{background:t.surface,borderBottom:`1px solid ${t.border}`,padding:"7px 18px",display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginRight:"auto",color:syncStatus==="ok"?"#10b981":syncStatus==="erro"?"#ef4444":"#f59e0b",fontSize:11}}>
          <Ico n={syncStatus==="ok"?"cloud":"sync"} s={13}/>{syncStatus==="ok"?"Dados salvos na nuvem":syncStatus==="erro"?"Erro de conexão":"Sincronizando..."}
        </div>
        <NotifBell notifs={notifs} t={t} onClear={clearNotifs} onMarkRead={markRead}/>
      </div>
      <div style={{flex:1,padding:18,overflowY:"auto"}}>
        {page==="dashboard"&&<Dashboard user={user} pedidos={pedidos} clientes={clientes} fin={fin} colabs={colabs} t={t} caixa={caixa}/>}
        {page==="clientes"&&perm.clientes&&<Clientes clientes={clientes} setClientes={setClientesState} canEdit={canEdit} canDel={canDel("clientes")} t={t}/>}
        {page==="colaboradores"&&perm.colaboradores&&<Colaboradores colabs={colabs} setColabs={setColabsState} canDel={canDel("colaboradores")} t={t}/>}
        {page==="produtos"&&perm.produtos&&<Produtos produtos={produtos} setProdutos={setProdutosState} canDel={canDel("produtos")} t={t}/>}
        {page==="pedidos"&&perm.pedidos&&<Pedidos user={user} pedidos={pedidos} setPedidos={setPedidosState} clientes={clientes} colabs={colabs} produtos={produtos} canEdit={canEdit} canStatus={canStatus} canDel={canDel("pedidos")} t={t} setFin={setFinState} setCaixa={setCaixaState} addNotif={addNotif} empresa={empresa}/>}
        {page==="financeiro"&&perm.financeiro&&<Financeiro fin={fin} setFin={setFinState} pedidos={pedidos} clientes={clientes} colabs={colabs} canDel={canDel("financeiro")} t={t}/>}
        {page==="caixa"&&perm.caixa&&<CaixaDiario caixa={caixa} setCaixa={setCaixaState} fin={fin} setFin={setFinState} t={t} user={user}/>}
        {page==="relatorios"&&perm.relatorios&&<Relatorios pedidos={pedidos} clientes={clientes} fin={fin} colabs={colabs} caixa={caixa} t={t} empresa={empresa}/>}
        {page==="usuarios"&&role==="admin"&&<Usuarios users={users} setUsers={setUsers} t={t} currentUser={user}/>}
        {page==="configuracoes"&&perm.configuracoes&&<Configuracoes empresa={empresa} setEmpresa={setEmpresaState} t={t} clientes={clientes} colabs={colabs} produtos={produtos} pedidos={pedidos} fin={fin} caixa={caixa} setClientes={setClientesState} setColabs={setColabsState} setProdutos={setProdutosState} setPedidos={setPedidosState} setFin={setFinState} setCaixa={setCaixaState} syncStatus={syncStatus}/>}
      </div>
    </div>
  </div>;
}