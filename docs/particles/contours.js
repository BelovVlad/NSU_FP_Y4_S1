/* Shared distance fields give neighbouring organic territories matching shores.
   All contours are presentation geometry; source records and node packing stay unchanged. */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PARTICLE_CONTOURS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function () {
  'use strict';
  function cloud(c,phase=0,padding=0) {
    return Array.from({length:48},(_,i)=>{
      const a=i*Math.PI/24,w=1+.035*Math.sin(3*a+phase)+.022*Math.cos(5*a-phase);
      return {x:c.cx+Math.cos(a)*(c.rx+padding)*w,y:c.cy+Math.sin(a)*(c.ry+padding)*w};
    });
  }
  function hull(points) {
    const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),lo=[],hi=[];
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    for(const p of sorted){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
    for(const p of sorted.reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
    let pointsOut=[...lo.slice(0,-1),...hi.slice(0,-1)];
    for(let pass=0;pass<2;pass++)pointsOut=round(pointsOut);
    return pointsOut;
  }
  function round(points) {
    return points.flatMap((a,i)=>{
      const b=points[(i+1)%points.length];
      return [{x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75}];
    });
  }
  function bounds(poly) {
    return {minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minY:Math.min(...poly.map(p=>p.y)),maxY:Math.max(...poly.map(p=>p.y))};
  }
  function simplify(points,tolerance=.65) {
    const closed=[...points,points[0]];
    function part(a,b){
      const start=closed[a],end=closed[b],dx=end.x-start.x,dy=end.y-start.y;
      let max=tolerance*tolerance,index=-1;
      for(let i=a+1;i<b;i++){
        const p=closed[i],t=Math.max(0,Math.min(1,((p.x-start.x)*dx+(p.y-start.y)*dy)/(dx*dx+dy*dy||1)));
        const d=(p.x-start.x-dx*t)**2+(p.y-start.y-dy*t)**2;
        if(d>max){max=d;index=i;}
      }
      return index<0?[start]:[...part(a,index),...part(index,b)];
    }
    return part(0,closed.length-1);
  }
  // Exact signed distance to the sampled shore, together with its outward normal.
  function distance(poly,x,y) {
    let inside=false,best=Infinity,vx=0,vy=0;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y;
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
      const px=x-a.x-dx*t,py=y-a.y-dy*t,d=px*px+py*py;
      if(d<best){best=d;vx=px;vy=py;}
    }
    const length=Math.sqrt(best),sign=inside?-1:1;
    return {d:length*sign,gx:sign*vx/(length||1),gy:sign*vy/(length||1)};
  }
  function field(owner,neighbours,x,y,gap) {
    const a=distance(owner.core,x,y);
    let value=owner.reach-a.d;
    if(owner.parent)value=Math.min(value,-distance(owner.parent,x,y).d-owner.parentGap);
    for(const other of neighbours){
      const b=distance(other.core,x,y);
      // The SAME bisector is used by both shores. Normalisation makes the inset
      // a world-space distance rather than a horizontal/vertical separation.
      const gradient=Math.hypot(b.gx-a.gx,b.gy-a.gy);
      if(gradient>.05){
        const separator=(b.d-a.d)/gradient-gap/2;
        const blend=Math.max(40-Math.abs(value-separator),0)/40;
        value=Math.min(value,separator)-blend*blend*10;
      }
      else if(b.d<a.d)value=Math.min(value,-gap/2);
    }
    return value;
  }
  function trace(owner,neighbours,gap,levels,step) {
    const box=owner.box,pad=owner.reach+step*2;
    const parent=owner.parent?bounds(owner.parent):null;
    const minX=Math.max(box.minX-pad,parent?parent.minX-step*2:-Infinity),minY=Math.max(box.minY-pad,parent?parent.minY-step*2:-Infinity);
    const maxX=Math.min(box.maxX+pad,parent?parent.maxX+step*2:Infinity),maxY=Math.min(box.maxY+pad,parent?parent.maxY+step*2:Infinity);
    const x0=Math.floor(minX/step)*step,y0=Math.floor(minY/step)*step;
    const cols=Math.ceil((maxX-x0)/step),rows=Math.ceil((maxY-y0)/step);
    const values=Array.from({length:rows+1},(_,j)=>Array.from({length:cols+1},(_,i)=>field(owner,neighbours,x0+i*step,y0+j*step,gap)));
    return levels.map(level=>{
      const segments=[];
      function triangle(vertices){
        const crossings=[];
        for(let k=0;k<3;k++){
          const a=vertices[k],b=vertices[(k+1)%3];
          if((a.v>=level)===(b.v>=level))continue;
          const t=(level-a.v)/(b.v-a.v);
          crossings.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
        }
        if(crossings.length===2)segments.push(crossings);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const p=(di,dj)=>({x:x0+(i+di)*step,y:y0+(j+dj)*step,v:values[j+dj][i+di]});
        const a=p(0,0),b=p(1,0),c=p(1,1),d=p(0,1);
        triangle([a,b,c]);triangle([a,c,d]);
      }
      const key=p=>Math.round(p.x*10000)+':'+Math.round(p.y*10000),adjacent=new Map();
      segments.forEach((s,index)=>s.forEach(p=>{const k=key(p);if(!adjacent.has(k))adjacent.set(k,[]);adjacent.get(k).push(index);}));
      const used=new Set(),loops=[];
      segments.forEach((segment,index)=>{
        if(used.has(index))return;
        let current=segment[1];const points=[segment[0]],start=key(segment[0]);used.add(index);
        for(let guard=0;guard<=segments.length;guard++){
          if(key(current)===start){loops.push(round(points));break;}
          points.push(current);
          const next=adjacent.get(key(current))?.find(n=>!used.has(n));if(next===undefined)break;
          used.add(next);const s=segments[next];current=key(s[0])===key(current)?s[1]:s[0];
        }
      });
      return loops.sort((a,b)=>b.length-a.length);
    });
  }
  function territories(seeds,{gap=28,step=10,levels=[0,14,28]}={}) {
    const owners=seeds.map(s=>({...s,box:bounds(s.core)}));
    return new Map(owners.map(owner=>{
      const pad=owner.reach*2+gap+step*4;
      const neighbours=owners.filter(b=>b!==owner&&(owner.domain===undefined||b.domain===owner.domain)&&b.box.minX<owner.box.maxX+pad&&b.box.maxX>owner.box.minX-pad&&b.box.minY<owner.box.maxY+pad&&b.box.maxY>owner.box.minY-pad);
      const outer=trace(owner,neighbours,gap,[0],step)[0].map(poly=>simplify(poly));
      // Inner rings are actual Euclidean offsets of the finished outer shore.
      // Reusing the competing fields here would bend each ring differently.
      const inner=levels.slice(1).map(()=>[]);
      outer.forEach(core=>{
        const layers=trace({core,box:bounds(core),reach:0},[],0,levels.slice(1),Math.min(8,Math.max(4,step*.28)));
        layers.forEach((loops,i)=>inner[i].push(...loops.map(poly=>simplify(poly,.35))));
      });
      return [owner.id,{core:owner.core,neighbours:neighbours.map(b=>b.id),layers:[outer,...inner]}];
    }));
  }
  function create(diagram) {
    const step=Math.min(28,10*Math.sqrt(Math.max(99,diagram.positions.size)/99));
    const regions=territories(diagram.regions.map(r=>({id:r.id,core:simplify(hull(r.children.flatMap((c,i)=>cloud(c,i*.81,75)))),reach:140})),{gap:34,step:step*1.4,levels:[0,18,36]});
    const clusters=territories(diagram.clusters.map((c,i)=>({id:c.id,domain:c.root,core:cloud(c,i*.81),reach:300,parent:regions.get(c.root).layers[0][0],parentGap:60})),{gap:28,step});
    return {clusters,regions};
  }
  return {create,territories,cloud,distance,field};
});
