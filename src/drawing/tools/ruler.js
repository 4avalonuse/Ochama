import { registerDrawingTool } from '../core/drawing-registry.js';
import { distancePointToSegment } from '../render/geometry.js';

export function rulerTool(){return{type:'ruler',defaults:{},create(start,end,scaleType='linear',color='#f59e0b'){return{id:crypto.randomUUID(),type:'ruler',scaleType,color,start:{...start},end:{...end}};}}}
function metrics(d){const dt=d.end.timestamp-d.start.timestamp;const dp=d.end.price-d.start.price;const pct=d.start.price?dp/d.start.price*100:NaN;return{dt,dp,pct};}
function fmt(v){return Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:2}):'—'}
function signed(v){if(!Number.isFinite(v))return'—';return(v>0?'+':'')+fmt(v)}
function timeText(ms){const days=Math.abs(ms)/86400000;if(days>=1)return fmt(days)+' d';return fmt(Math.abs(ms)/3600000)+' h';}
function roundRect(ctx,x,y,w,h,r){if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return}ctx.rect(x,y,w,h)}
export function rulerRenderer(ctx,d,transform,o={}){
  const a=transform.marketToScreen(d.start),b=transform.marketToScreen(d.end);if(!a||!b)return;
  const m=metrics(d), color=d.color||'#f59e0b';
  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=o.selected?2.4:1.7;
  ctx.setLineDash(o.selected?[6,4]:[]);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);

  for(const p of[a,b]){
    ctx.beginPath();ctx.arc(p.x,p.y,o.selected?6:4.5,0,Math.PI*2);
    ctx.fillStyle='#0b1118';ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  }

  const label=`Δ ${signed(m.dp)}  ·  ${signed(m.pct)}%  ·  ${timeText(m.dt)}`;
  ctx.font='700 10px system-ui,sans-serif';
  const w=ctx.measureText(label).width+18,h=24;
  const vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy)||1;
  const nx=-vy/len,ny=vx/len;
  let x=(a.x+b.x)/2+nx*14-w/2,y=(a.y+b.y)/2+ny*14-h/2;
  x=Math.max(transform.plotLeft+4,Math.min(x,transform.plotRight-w-4));
  y=Math.max(transform.plotTop+4,Math.min(y,transform.plotBottom-h-4));

  ctx.beginPath();roundRect(ctx,x,y,w,h,7);
  ctx.fillStyle='rgba(11,17,25,.96)';ctx.fill();
  ctx.strokeStyle=color;ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.stroke();
  ctx.globalAlpha=1;ctx.fillStyle='#eef3f8';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,x+w/2,y+h/2);
  ctx.restore();
}
export function rulerHitTestPart(p,d,t){for(const k of['start','end']){const q=t.marketToScreen(d[k]);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<=12)return k;}return null}
export function rulerHitTest(p,d,t,tol=9){const a=t.marketToScreen(d.start),b=t.marketToScreen(d.end);return a&&b&&distancePointToSegment(p,a,b)<=tol}
export function rulerMove(d,delta,t,part='body'){if(part==='start'||part==='end'){const q=t.marketToScreen(d[part]);if(!q)return null;const n=t.screenToMarket({x:q.x+delta.dx,y:q.y+delta.dy});return n?{...d,[part]:n}:null}const a=t.marketToScreen(d.start),b=t.marketToScreen(d.end);if(!a||!b)return null;const na=t.screenToMarket({x:a.x+delta.dx,y:a.y+delta.dy}),nb=t.screenToMarket({x:b.x+delta.dx,y:b.y+delta.dy});return na&&nb?{...d,start:na,end:nb}:null}
registerDrawingTool({type:'ruler',name:'Régua',pointCount:2,tool:rulerTool,renderer:rulerRenderer,hitTest:rulerHitTest,hitTestPart:rulerHitTestPart,move:rulerMove,defaults:{}});
