/* Continuous routes on the ribs of the complete, tessellated particle atlas. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PARTICLE_ROUTES=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function offsetPath(points,offset){
    if(!offset||points.length<3)return points;
    return points.map((p,i)=>{
      if(i===0||i===points.length-1)return p;
      const a=points[i-1],b=points[i+1],before=distance(a,p),after=distance(p,b);
      const nx=-(p.y-a.y)/(before||1)-(b.y-p.y)/(after||1),ny=(p.x-a.x)/(before||1)+(b.x-p.x)/(after||1),length=Math.hypot(nx,ny);
      if(!length)return p;
      const ux=nx/length,uy=ny/length,normalX=-(b.y-p.y)/(after||1),normalY=(b.x-p.x)/(after||1);
      const shift=Math.min(Math.abs(offset)*2,Math.abs(offset)/Math.max(.5,Math.abs(ux*normalX+uy*normalY)))*Math.sign(offset);
      return {x:p.x+ux*shift,y:p.y+uy*shift};
    });
  }
  function vertices(p){
    return Array.from({length:6},(_,i)=>{const angle=(i*60-90)*Math.PI/180;return {x:p.x+Math.cos(angle)*p.r,y:p.y+Math.sin(angle)*p.r};});
  }
  function crossesBox(a,b,box){
    // Boundary contact is allowed; entering a header or another subgroup is not.
    const epsilon=.001;
    const minX=box.x+epsilon,maxX=box.x+box.width-epsilon,minY=box.y+epsilon,maxY=box.y+box.height-epsilon;
    let lo=0,hi=1;
    for(const [origin,delta,min,max] of [[a.x,b.x-a.x,minX,maxX],[a.y,b.y-a.y,minY,maxY]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;}
      else{const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
      if(lo>hi)return false;
    }
    return hi>0&&lo<1;
  }
  class Heap{
    constructor(){this.items=[];}
    push(item){const a=this.items;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=item.cost)break;a[i]=a[p];i=p;}a[i]=item;}
    pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
  }
  function create(diagram){
    const {positions,clusters,regions}=diagram;
    const nodes=[],keys=new Map(),ports=new Map(),ribs=[];
    function node(p){
      const key=p.x.toFixed(4)+','+p.y.toFixed(4);
      if(keys.has(key))return keys.get(key);
      const id=nodes.length;keys.set(key,id);nodes.push({...p,links:new Map()});return id;
    }
    function connect(a,b){
      if(a===b)return;
      const weight=distance(nodes[a],nodes[b]);
      nodes[a].links.set(b,weight);nodes[b].links.set(a,weight);
    }
    positions.forEach(p=>{
      const corners=vertices(p),particlePorts=[];
      corners.forEach((a,i)=>{
        const b=corners[(i+1)%6],chain=[node(a)];
        for(const fraction of [.3,.7])chain.push(node({x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction}));
        chain.push(node(b));particlePorts.push(chain[1]);
        for(let j=1;j<chain.length;j++)connect(chain[j-1],chain[j]);
        ribs.push([a,b]);
      });
      ports.set(p.id,particlePorts);
    });
    const headers=regions.map(r=>r.header);
    function shortest(starts,ends){
      const goals=new Set(ends),cost=new Float64Array(nodes.length).fill(Infinity),previous=new Int32Array(nodes.length).fill(-1),queue=new Heap();
      starts.forEach(id=>{cost[id]=0;queue.push({id,cost:0});});
      let end=-1;
      while(queue.items.length){
        const item=queue.pop();if(item.cost>cost[item.id])continue;
        if(goals.has(item.id)){end=item.id;break;}
        nodes[item.id].links.forEach((weight,next)=>{
          const candidate=item.cost+weight;
          if(candidate<cost[next]-.00001){cost[next]=candidate;previous[next]=item.id;queue.push({id:next,cost:candidate});}
        });
      }
      if(end<0)throw new Error('No unobstructed hexagon route');
      const path=[];
      for(let id=end;id>=0;id=previous[id])path.push({x:nodes[id].x,y:nodes[id].y});
      path.reverse();
      return path;
    }
    function annotation(from,to){
      if(!positions.has(from)||!positions.has(to))return [];
      const corner=id=>{const p=vertices(positions.get(id))[0];return keys.get(p.x.toFixed(4)+','+p.y.toFixed(4));};
      return shortest([corner(from)],[corner(to)]);
    }
    function route(from,to){
      if(!ports.has(from)||!ports.has(to))return [];
      const path=shortest(ports.get(from),ports.get(to));
      const inset=(point,p)=>{const factor=2.5/distance(point,p);return {x:point.x+(p.x-point.x)*factor,y:point.y+(p.y-point.y)*factor};};
      // Short terminal stems make the source and destination unambiguous, even for adjacent cells.
      return [inset(path[0],positions.get(from)),...path,inset(path.at(-1),positions.get(to))];
    }
    return {route,annotation,ribs,headers,nodeCount:nodes.length};
  }
  return {create,vertices,crossesBox,offsetPath};
});
