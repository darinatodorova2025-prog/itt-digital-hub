import test from 'node:test';
import assert from 'node:assert/strict';
import {slots,cropSegments,print,full,presets,duplexAxis,backPoint,qrReady} from '../src/geometry.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<=0.01,`${a} != ${b}`);
test('8-up default: exact landscape and touching 71x96 bleed footprints',()=>{
 assert.deepEqual(full,{width:71,height:96});assert.deepEqual(print.trim,{width:65,height:90});assert.equal(print.bleed,3);
 assert.deepEqual(print.paper,{width:297,height:210});assert.equal(slots().length,8);
 assert.deepEqual(slots().map(s=>[s.x,s.y]),[[6.5,9],[77.5,9],[148.5,9],[219.5,9],[6.5,105],[77.5,105],[148.5,105],[219.5,105]]);
 assert.equal(print.duplex,'short-edge');assert.equal(duplexAxis(print),'x');
 assert.deepEqual(slots('back').map(s=>s.x),[219.5,148.5,77.5,6.5,219.5,148.5,77.5,6.5]);
 assert.ok(slots('back').every(s=>s.rotation===0));
});
for(const [name,base] of Object.entries(presets)) for(const duplex of ['long-edge','short-edge'])
 test(`${name} ${duplex}: physical sheet flip pairs all identities and asymmetric orientation`,()=>{
  const c={...base,duplex,backOffset:{x:1.3,y:-0.7}},f=slots('front',c),b=slots('back',c);
  // Independent hinge decision: short edge is vertical on landscape, horizontal on portrait.
  const vertical=(duplex==='short-edge')===(c.paper.width>c.paper.height);
  for(let i=0;i<f.length;i++) {
   const a=f[i],z=b[i]; assert.equal(a.id,z.id);
   near(vertical?c.paper.width-z.x+c.backOffset.x-z.width:z.x-c.backOffset.x,a.x);
   near(vertical?z.y-c.backOffset.y:c.paper.height-z.y+c.backOffset.y-z.height,a.y);
   assert.equal(z.rotation,vertical?0:180);
   // Asymmetric top-left fiducial at (8,10) within front. Corresponding back is at
   // (width-8,10) upright, or (width-8,10) in the rotated artwork frame.
   const mapped=backPoint([a.x+8,a.y+10],c);
   near(mapped[0],vertical?z.x+z.width-8:z.x+8);
   near(mapped[1],vertical?z.y+10:z.y+z.height-10);
  }
 });
for(const [name,c] of Object.entries(presets)) test(`${name}: crop guides clear every bleed and cover every trim coordinate`,()=>{
 for(const side of ['front','back']) {
  const s=slots(side,c),lines=s.flatMap(b=>cropSegments(b,c));
  assert.ok(lines.length>0);
  for(const [x1,y1,x2,y2] of lines) {
   assert.ok(Math.min(x1,x2)>=0&&Math.max(x1,x2)<=c.paper.width&&Math.min(y1,y2)>=0&&Math.max(y1,y2)<=c.paper.height);
   for(const b of s) assert.ok(Math.max(x1,x2)<=b.x||Math.min(x1,x2)>=b.x+b.width||Math.max(y1,y2)<=b.y||Math.min(y1,y2)>=b.y+b.height);
  }
  for(const b of s) {
   for(const x of [b.x+3,b.x+68])assert.ok(lines.some(l=>l[0]===x&&l[2]===x));
   for(const y of [b.y+3,b.y+93])assert.ok(lines.some(l=>l[1]===y&&l[3]===y));
  }
 }
});
test('8-up footprints do not overlap, and external marks retain >=5mm printer clearance',()=>{
 const s=slots();for(let i=0;i<s.length;i++)for(const b of s.slice(i+1)){const a=s[i];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
 for(const l of s.flatMap(a=>cropSegments(a)))for(const [x,y] of [[l[0],l[1]],[l[2],l[3]]])assert.ok(x>=5&&x<=292&&y>=5&&y<=205);
});
test('QR production approval rejects missing or changed destinations',()=>{
 assert.equal(qrReady({url:'',confirmedUrl:'',evidence:''}),false);
 assert.equal(qrReady({url:'https://example.org/new',confirmedUrl:'https://example.org/old',evidence:'verified'}),false);
 assert.equal(qrReady({url:'https://example.org',confirmedUrl:'https://example.org',evidence:'verified'}),true);
});
for(const [name,base] of Object.entries(presets))test(`${name}: printer offsets move only back placements and guides`,()=>{
 const c={...base,backOffset:{x:1,y:-0.5}},original=slots('back',base),adjusted=slots('back',c);
 assert.deepEqual(slots('front',c),slots('front',base));
 for(let i=0;i<adjusted.length;i++){near(adjusted[i].x,original[i].x+1);near(adjusted[i].y,original[i].y-0.5);}
 const lines=adjusted.flatMap(s=>cropSegments(s,c));
 for(const s of adjusted)for(const x of [s.x+3,s.x+68])assert.ok(lines.some(l=>Math.abs(l[0]-x)<.01&&Math.abs(l[2]-x)<.01));
 for(const s of adjusted)for(const y of [s.y+3,s.y+93])assert.ok(lines.some(l=>Math.abs(l[1]-y)<.01&&Math.abs(l[3]-y)<.01));
});
