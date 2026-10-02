import test from 'node:test';
import assert from 'node:assert/strict';
import {clean,canonicalTerminal,normalizeRow,changesBetween,normalizeObservation} from '../src/core.js';
test('terminal normalization',()=>{
 assert.equal(canonicalTerminal('BTP'),'BTP');
 assert.equal(canonicalTerminal('Ecoporto Santos'),'ECOPORTO');
 assert.equal(canonicalTerminal('Tecon Santos'),'SANTOS_BRASIL');
});
test('accents and duplicates',()=>{
 const x=normalizeRow({terminal:'BTP',ship:'MSC Damla',reservation:'R1',client:'Garoto',qty40:4});
 const y=normalizeRow({terminal:'BTP',ship:'MSC DAMLA',reservation:'R2',client:'Nestlé',qty40:1});
 assert.equal(x.vesselId,y.vesselId);
 assert.equal(x.qty40,4);
 assert.equal(clean('São  Paulo'),'SAO PAULO');
});
test('first observation is baseline; null never erases valid data',()=>{
 const previous={deadline:'2026-10-03T12:00:00-03:00',gate_open:null};
 const current={deadline:'2026-10-03T13:00:00-03:00',gate_open:null};
 assert.deepEqual(changesBetween(previous,current,false),[]);
 assert.deepEqual(changesBetween(previous,current,true),[{field:'deadline',before:previous.deadline,after:current.deadline}]);
 assert.deepEqual(changesBetween(previous,{deadline:null},true),[]);
});
test('reject malformed records and observation mapping',()=>{
 assert.throws(()=>normalizeRow({terminal:'BTP',ship:'X',reservation:'R',client:'A',qty40:-1}));
 assert.throws(()=>canonicalTerminal('unknown'));
 const expected=normalizeRow({terminal:'BTP',ship:'MSC DAMLA',reservation:'R',client:'A'});
 assert.equal(normalizeObservation({terminal:'Ecoporto',ship:'MSC DAMLA'},expected),null);
 assert.deepEqual(normalizeObservation({terminal:'BTP',ship:'MSC DAMLA',deadline:'2026-10-03T12:00:00-03:00'},expected),{eta:null,etb:null,gate_open:null,deadline:'2026-10-03T12:00:00-03:00'});
});
