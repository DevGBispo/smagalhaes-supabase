import {parseEcoporto,SOURCE_URL,key} from './ecoporto.js';
import {PORTALS} from './lookup.js';
import PROGRAMACAO from './programacao.json' with {type:'json'};
import HTML from './index.html';
const SOURCE={BTP:PORTALS.BTP,ECOPORTO:SOURCE_URL,'SANTOS BRASIL':PORTALS['Santos Brasil'],'DP WORLD':'https://www.dpworld.com/pt-br/ports-terminals/brazil'};
const selected=new Map(); // transient per Worker isolate only, never persistent
let cached=null;
let running=null;
const NOW=()=>new Date().toISOString();
function output(body,status=200,type='application/json; charset=utf-8'){
 return new Response(type.startsWith('text/html')?body:JSON.stringify(body),{status,headers:{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY'}});
}
function groupRows(){const map=new Map();for(const r of PROGRAMACAO.rows){const id=key(r.ship)+'|'+r.terminal;let v=map.get(id);if(!v){v={id,ship:r.ship,terminal:r.terminal,deadlines:[],reservations:[],q20:0,q40:0};map.set(id,v)}v.reservations.push(r);v.q20+=r.qty20;v.q40+=r.qty40;if(r.deadline&&!v.deadlines.includes(r.deadline))v.deadlines.push(r.deadline);}return [...map.values()].sort((a,b)=>(a.deadlines[0]||'99').localeCompare(b.deadlines[0]||'99')||a.ship.localeCompare(b.ship,'pt-BR'));}
const GROUPS=groupRows();
function externalFor(v){if(v.terminal!=='ECOPORTO')return {kind:'nao_integrado',rows:[],status:'nao_integrado'};if(v.ship==='TBN')return{kind:'sem_navio_definido',rows:[],status:'indefinido'};if(!cached?.last_success)return{kind:'aguardando',rows:[],status:cached?.status||'aguardando',error:cached?.error||null};const rows=cached.rows.filter(r=>key(r.ship)===key(v.ship));return {kind:rows.length===0?'nao_encontrado':rows.length>1?'multiplas_viagens':'encontrado',rows,status:cached.status,error:cached.error||null};}
async function refresh(){if(running)return running;
 running=(async()=>{
 const attempted=NOW();
 try{
  const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),12000);
  let response;try{response=await fetch(SOURCE_URL,{headers:{Accept:'text/html'},redirect:'follow',signal:ctl.signal});}finally{clearTimeout(timeout);}
  if(!response.ok)throw Error('Ecoporto HTTP '+response.status);
  const ctype=response.headers.get('content-type')||'';
  if(!ctype.toLowerCase().includes('text/html'))throw Error('Resposta não HTML: '+ctype);
  const html=await response.text();const result=parseEcoporto(html);
  const valid=new Set(GROUPS.filter(v=>v.terminal==='ECOPORTO').map(v=>key(v.ship)));
  const matches=result.rows.filter(v=>valid.has(key(v.ship)));
  cached={last_attempt:attempted,last_success:NOW(),status:'ok',error:null,rows:matches,invalidRows:result.invalidRows,allRows:result.rows.length};
  return {ok:true,read_at_source:result.rows.length,found_in_report:matches.length,persisted:false};
 }catch(e){cached={...(cached||{rows:[],last_success:null}),last_attempt:attempted,status:'erro',error:String(e.message||e).slice(0,220)};return {ok:false,error:cached.error,persisted:false};}
 })();try{return await running;}finally{running=null;}}
export default {
 async fetch(req){const url=new URL(req.url),route=url.pathname,method=req.method;
  if(method==='GET'&&(route==='/'||route==='/index.html'))return output(HTML,200,'text/html; charset=utf-8');
  if(method==='GET'&&(route==='/api/health'||route==='/health'))return output({ok:true,backend:true,platform:'cloudflare-worker',source_ecoporto:SOURCE_URL,storage:'transient'});
  if(method==='GET'&&route==='/api/programacao')return output({origin:PROGRAMACAO.origin,issued_at:PROGRAMACAO.issued_at,row_count:PROGRAMACAO.rows.length,navios:GROUPS.length});
  if(method==='GET'&&route==='/api/navios'){const needle=key(url.searchParams.get('q')||'');const term=url.searchParams.get('terminal')||'';const vessels=GROUPS.filter(v=>(!needle||key(v.ship).includes(needle))&&(!term||v.terminal===term)).map(v=>({id:v.id,ship:v.ship,terminal:v.terminal,deadlines:v.deadlines,reservas:v.reservations.length,q20:v.q20,q40:v.q40,live_status:externalFor(v).kind}));return output({items:vessels,total:vessels.length,source:PROGRAMACAO.origin});}
  if(method==='GET'&&route==='/api/navio'){const ship=url.searchParams.get('ship')||'',terminal=url.searchParams.get('terminal')||'';const v=GROUPS.find(v=>key(v.ship)===key(ship)&&v.terminal===terminal);if(!v)return output({error:'Navio não está na programação diária carregada'},404);const external=externalFor(v);return output({ship:v.ship,terminal:v.terminal,booking_rows:v.reservations,totals:{reservas:v.reservations.length,qty20:v.q20,qty40:v.q40},deadlines_programacao:v.deadlines,external:{...external,source:SOURCE[v.terminal]||null,last_attempt:v.terminal==='ECOPORTO'?(cached?.last_attempt||null):null,last_success:v.terminal==='ECOPORTO'?(cached?.last_success||null):null},changes:[]});}
  if(method==='POST'&&route==='/api/consultar'){
   if(Number(req.headers.get('content-length')||0)>2000)return output({error:'Requisição muito grande'},413);
   let body;try{body=await req.json();}catch{return output({error:'JSON inválido'},400);}
   const ship=String(body?.ship||''),terminal=String(body?.terminal||'');if(ship.length>100||terminal.length>60)return output({error:'Parâmetros inválidos'},400);
   const v=GROUPS.find(v=>key(v.ship)===key(ship)&&v.terminal===terminal);if(!v)return output({error:'Navio não consta da programação diária'},404);
   if(v.terminal!=='ECOPORTO')return output({ok:false,reason:'terminal_nao_integrado',message:'Consulta automática não integrada para este terminal.',source:SOURCE[v.terminal]||null});
   if(v.ship==='TBN')return output({ok:false,reason:'navio_indefinido'});
   if(cached?.last_success&&cached?.status==='ok'&&(Date.now()-Date.parse(cached.last_success))<5*60*1000)return output({ok:true,cached:true,read_at_source:cached.allRows,found_in_report:cached.rows.length,persisted:false});
   return output({...await refresh(),terminal:v.terminal,ship:v.ship});
  }
  return output({error:'Rota inexistente ou operação não permitida'},404);
 },
 async scheduled(_event,_env,_ctx){ // no persistent monitor until D1 storage is configured
  // Avoid scheduled network activity that cannot be persisted reliably.
 }
};