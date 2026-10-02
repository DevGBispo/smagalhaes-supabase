import {key} from './ecoporto.js';
export const PORTALS={
 'Ecoporto':'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
 'BTP':'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
 'Santos Brasil':'https://www.santosbrasil.com.br/v2021/lista-de-atracacao'
};
export function validateSearch(input){
 const terminal=String(input.terminal||'').trim();
 const ship=String(input.ship||'').trim().replace(/\s+/g,' ').toUpperCase();
 const voyage=String(input.voyage||'').trim().toUpperCase();
 if(!Object.hasOwn(PORTALS,terminal))throw new Error('Selecione um terminal válido');
 if(ship.length<2||ship.length>90||!/^[\p{L}\p{N}\s.'\-/]+$/u.test(ship))throw new Error('Informe o nome do navio (2 a 90 caracteres)');
 if(voyage.length>50||!/^[\w.\-/]*$/.test(voyage))throw new Error('Viagem inválida');
 return {terminal,ship,voyage};
}
export function matchShip(rows,ship,voyage=''){
 const target=key(ship),trip=key(voyage);
 const exact=rows.filter(r=>key(r.ship)===target&&(!trip||key(r.voyage)===trip));
 const suggestions=exact.length?[]:rows.filter(r=>key(r.ship).includes(target)||target.includes(key(r.ship))).slice(0,8).map(r=>({ship:r.ship,voyage:r.voyage}));
 return {matches:exact,suggestions};
}