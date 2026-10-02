// Parser conservador: HTML oficial com 17 colunas; não assume que dados ausentes são zero.
export const SOURCE_URL = 'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/';
export const FIELDS = ['status','deadline','gate_cntr','gate_previsto','atracacao_prevista','atracacao_real'];
function decode(s){return s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function text(s){return decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();}
export function key(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
export function dateText(s){const v=String(s||'').trim();return /^\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(v)?v:null;}
export function parseEcoporto(html){
 if(typeof html!=='string'||html.length<80||html.length>4_000_000) throw new Error('HTML do Line Up ausente ou tamanho inesperado');
 const trs=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)];
 const result=[];let tableRows=0,invalidRows=0;
 for(const [,body] of trs){
  const cells=[...body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td\s*>/gi)].map(m=>text(m[1]));
  if(!cells.length)continue;
  tableRows++;
  if(cells.length!==17){invalidRows++;continue;}
  const ship=cells[2],voyage=cells[3];
  if(!ship||!voyage){invalidRows++;continue;}
  result.push({terminal:'Ecoporto',rap:cells[0]||null,status:cells[1]||null,ship,voyage,berth:cells[4]||null,carrier:cells[5]||null,service:cells[6]||null,deadline:dateText(cells[7]),gate_cntr:dateText(cells[8]),gate_cs:dateText(cells[9]),tra:dateText(cells[10]),atracacao_prevista:dateText(cells[11]),gate_previsto:dateText(cells[12]),atracacao_real:dateText(cells[13]),saida_prevista:dateText(cells[14]),saida_real:dateText(cells[15])});
 }
 if(result.length===0)throw new Error(`HTML sem linhas completas do Line Up (linhas=${tableRows}, inválidas=${invalidRows}). Estrutura pode ter mudado.`);
 return {rows:result,tableRows,invalidRows};
}
export async function fetchEcoporto(fetcher=fetch){
 const controller=new AbortController();const tid=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetcher(SOURCE_URL,{headers:{'Accept':'text/html','User-Agent':'SmagalhaesMonitorValidation/1.0 (+public-lineup; local-test)'},redirect:'follow',signal:controller.signal});
  if(!r.ok)throw new Error(`Ecoporto HTTP ${r.status}`);
  const ct=r.headers.get('content-type')||'';
  if(!ct.includes('text/html'))throw new Error('Ecoporto respondeu formato inesperado: '+ct);
  const data=await r.text();
  return parseEcoporto(data);
 }finally{clearTimeout(tid);}
}