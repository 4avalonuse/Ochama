import { registerDrawingTool } from '../core/drawing-registry.js';
import { toScaleValue, fromScaleValue, normalizeScaleType } from '../../viewport/scale.js';

const SEGMENTS=120;

export function channelTool(){
  return { type:'channel', pointCount:2, defaults:{},
    create(start,end,scaleType='linear',color='#60a5fa',options={}){
      const third=options.thirdPoint||end;
      const type=normalizeScaleType(scaleType);
      const a=toScaleValue(start.price,type), b=toScaleValue(end.price,type), t=(third.timestamp-start.timestamp)/(end.timestamp-start.timestamp||1), thirdValue=toScaleValue(third.price,type);
      const offsetScaled=Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(thirdValue)?thirdValue-(a+(b-a)*t):0;
      return {id:crypto.randomUUID(),type:'channel',scaleType:type,color,start:{...start},end:{...end},third:{...third},offsetScaled,extendLeft:Boolean(options.extendLeft),extendRight:Boolean(options.extendRight)};
    }
  };
}
function lineAt(d,t){const a=toScaleValue(d.start.price,d.scaleType),b=toScaleValue(d.end.price,d.scaleType);const base=a+(b-a)*t;const ts=d.start.timestamp+(d.end.timestamp-d.start.timestamp)*t;return{timestamp:ts,scaled:base+d.offsetScaled};}
function build(d,transform){
  const a=toScaleValue(d.start.price,d.scaleType),b=toScaleValue(d.end.price,d.scaleType),span=d.end.timestamp-d.start.timestamp;
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(span)||span===0)return null;
  const t=(d.third.timestamp-d.start.timestamp)/span,base=a+(b-a)*t,third=toScaleValue(d.third.price,d.scaleType);
  if(!Number.isFinite(third))return null;
  const offset=Number.isFinite(d.offsetScaled)?d.offsetScaled:third-base;
  const lines=[0,offset],points=lines.map(lineOffset=>{
    const out=[],left=d.extendLeft?-1:0,right=d.extendRight?2:1;
    for(let i=0;i<=SEGMENTS;i++){const u=left+(right-left)*(i/SEGMENTS),ts=d.start.timestamp+span*u,scaled=a+(b-a)*u+lineOffset,price=fromScaleValue(scaled,d.scaleType),p=transform.marketToScreen({timestamp:ts,price});if(p)out.push(p)}
    return out;
  });
  return points;
}
export function channelRenderer(ctx,d,transform,o={}){
  const lines=build(d,transform);if(!lines?.[0]?.length||!lines?.[1]?.length)return;
  const color=d.color||'#60a5fa',upper=lines[0],lower=lines[1];
  ctx.save();
  ctx.beginPath();upper.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));for(let i=lower.length-1;i>=0;i--)ctx.lineTo(lower[i].x,lower[i].y);ctx.closePath();
  ctx.fillStyle=color;ctx.globalAlpha=o.selected?.10:.045;ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle=color;ctx.lineWidth=o.selected?2.3:1.6;
  for(const pts of lines){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  if(o.selected){
    const handles=[d.start,d.end,d.third].map(point=>transform.marketToScreen(point)).filter(Boolean);
    handles.forEach((p,i)=>{
      ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fillStyle='#0b1118';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#dbe4ee';ctx.font='700 8px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),p.x,p.y);
    });
  }
  ctx.restore();
}
function pointLineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
export function channelHitTest(p,d,transform,tol=10){const lines=build(d,transform);if(!lines)return false;for(const pts of lines)for(let i=1;i<pts.length;i++)if(pointLineDistance(p,pts[i-1],pts[i])<=tol)return true;return false;}
export function channelHitTestPart(p,d,transform){for(const k of['start','end','third']){const q=transform.marketToScreen(d[k]);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<=13)return k;}return null}
export function channelMove(d,delta,transform,part='body'){
  if(part==='start'||part==='end'||part==='third'){
    const q=transform.marketToScreen(d[part]);if(!q)return null;const n=transform.screenToMarket({x:q.x+delta.dx,y:q.y+delta.dy});if(!n)return null;
    if(part!=='third')return{...d,[part]:n};
    const a=toScaleValue(d.start.price,d.scaleType),b=toScaleValue(d.end.price,d.scaleType),span=d.end.timestamp-d.start.timestamp||1,t=(n.timestamp-d.start.timestamp)/span,v=toScaleValue(n.price,d.scaleType);
    return Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(v)?{...d,third:n,offsetScaled:v-(a+(b-a)*t)}:{...d,third:n};
  }
  const pts=['start','end','third'].map(k=>transform.marketToScreen(d[k]));if(pts.some(x=>!x))return null;
  const next=pts.map(p=>transform.screenToMarket({x:p.x+delta.dx,y:p.y+delta.dy}));if(next.some(x=>!x))return null;
  return{...d,start:next[0],end:next[1],third:next[2]};
}
registerDrawingTool({type:'channel',name:'Canal',tool:channelTool,renderer:channelRenderer,hitTest:channelHitTest,hitTestPart:channelHitTestPart,move:channelMove,defaults:{}});
