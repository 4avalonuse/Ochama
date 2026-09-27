import { registerDrawingTool } from '../core/drawing-registry.js';
import { toScaleValue, fromScaleValue, normalizeScaleType } from '../../viewport/scale.js';

const SEGMENTS=120;

export function channelTool(){
  return { type:'channel', pointCount:3, defaults:{},
    create(start,end,scaleType='linear',color='#60a5fa',options={}){
      const third=options.thirdPoint||end;
      const type=normalizeScaleType(scaleType);
      const a=toScaleValue(start.price,type), b=toScaleValue(end.price,type), t=(third.timestamp-start.timestamp)/(end.timestamp-start.timestamp||1), thirdValue=toScaleValue(third.price,type);
      const offsetScaled=Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(thirdValue)?thirdValue-(a+(b-a)*t):0;
      return {id:crypto.randomUUID(),type:'channel',scaleType:type,color,
        start:{...start},end:{...end},third:{...third},offsetScaled,
        extendLeft:Boolean(options.extendLeft),extendRight:Boolean(options.extendRight)};
    }
  };
}

function lineAt(d,t){
  const a=toScaleValue(d.start.price,d.scaleType), b=toScaleValue(d.end.price,d.scaleType);
  const base=a+(b-a)*t;
  const ts=d.start.timestamp+(d.end.timestamp-d.start.timestamp)*t;
  return {timestamp:ts,scaled:base+d.offsetScaled};
}
function build(d,transform){
  const a=toScaleValue(d.start.price,d.scaleType), b=toScaleValue(d.end.price,d.scaleType);
  const span=d.end.timestamp-d.start.timestamp;
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(span)||span===0)return null;
  const t=(d.third.timestamp-d.start.timestamp)/span;
  const base=a+(b-a)*t;
  const third=toScaleValue(d.third.price,d.scaleType);
  if(!Number.isFinite(third))return null;
  const offset=Number.isFinite(d.offsetScaled)?d.offsetScaled:third-base;
  const lines=[0,offset];
  const points=lines.map(lineOffset=>{
    const out=[];
    const left=d.extendLeft?-1:0;
    const right=d.extendRight?2:1;
    for(let i=0;i<=SEGMENTS;i++){
      const u=left+(right-left)*(i/SEGMENTS);
      const ts=d.start.timestamp+span*u;
      const scaled=a+(b-a)*u+lineOffset;
      const price=fromScaleValue(scaled,d.scaleType);
      const p=transform.marketToScreen({timestamp:ts,price});
      if(p)out.push(p);
    }
    return out;
  });
  return points;
}
export function channelRenderer(ctx,d,transform,o={}){
  const lines=build(d,transform); if(!lines?.[0]?.length||!lines?.[1]?.length)return;
  ctx.save(); ctx.strokeStyle=d.color||'#60a5fa'; ctx.lineWidth=o.selected?2.5:1.7;
  for(const pts of lines){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  if(o.selected){
    const handles=[d.start,d.end,d.third].map(point=>transform.marketToScreen(point)).filter(Boolean);
    ctx.fillStyle=d.color||'#60a5fa';
    for(const p of handles){ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
function pointLineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
export function channelHitTest(p,d,transform,tol=9){const lines=build(d,transform);if(!lines)return false;for(const pts of lines)for(let i=1;i<pts.length;i++)if(pointLineDistance(p,pts[i-1],pts[i])<=tol)return true;return false;}
export function channelHitTestPart(p,d,transform){for(const k of ['start','end','third']){const q=transform.marketToScreen(d[k]);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<=12)return k;}return null;}
export function channelMove(d,delta,transform,part='body'){
  if(part==='start'||part==='end'||part==='third'){
    const q=transform.marketToScreen(d[part]);if(!q)return null;
    const n=transform.screenToMarket({x:q.x+delta.dx,y:q.y+delta.dy});if(!n)return null;
    if(part!=='third') return {...d,[part]:n};
    const a=toScaleValue(d.start.price,d.scaleType),b=toScaleValue(d.end.price,d.scaleType);
    const span=d.end.timestamp-d.start.timestamp||1;
    const t=(n.timestamp-d.start.timestamp)/span;
    const v=toScaleValue(n.price,d.scaleType);
    return Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(v)?{...d,third:n,offsetScaled:v-(a+(b-a)*t)}:{...d,third:n};
  }
  const pts=['start','end','third'].map(k=>transform.marketToScreen(d[k]));if(pts.some(x=>!x))return null;
  const next=pts.map(p=>transform.screenToMarket({x:p.x+delta.dx,y:p.y+delta.dy}));if(next.some(x=>!x))return null;
  return {...d,start:next[0],end:next[1],third:next[2]};
}
registerDrawingTool({type:'channel',name:'Canal',tool:channelTool,renderer:channelRenderer,hitTest:channelHitTest,hitTestPart:channelHitTestPart,move:channelMove,defaults:{}});
