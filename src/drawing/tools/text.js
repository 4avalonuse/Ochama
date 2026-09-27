import { registerDrawingTool } from '../core/drawing-registry.js';
export function textTool(){return{type:'text',singlePoint:true,defaults:{},create(point,_u=null,scaleType='linear',color='#f8fafc',options={}){return{id:crypto.randomUUID(),type:'text',scaleType,color,point:{...point},text:options.text||'Texto'}}}}
export function textRenderer(ctx,d,t,o={}){const p=t.marketToScreen(d.point);if(!p)return;ctx.save();ctx.font='700 13px sans-serif';const w=ctx.measureText(d.text||'Texto').width+14;ctx.fillStyle=d.color||'#f8fafc';ctx.globalAlpha=.94;ctx.fillRect(p.x,p.y-22,w,22);ctx.globalAlpha=1;ctx.fillStyle='#0b1118';ctx.textBaseline='middle';ctx.fillText(d.text||'Texto',p.x+7,p.y-11);if(o.selected){ctx.strokeStyle='#fff';ctx.strokeRect(p.x,p.y-22,w,22)}ctx.restore();}
export function textHitTestPart(p,d,t){const q=t.marketToScreen(d.point);return q&&Math.hypot(p.x-q.x,p.y-(q.y-11))<=16?'point':null}
export function textHitTest(p,d,t,tol=10){return !!textHitTestPart(p,d,t)}
export function textMove(d,delta,t){const q=t.marketToScreen(d.point);if(!q)return null;const n=t.screenToMarket({x:q.x+delta.dx,y:q.y+delta.dy});return n?{...d,point:n}:null}
registerDrawingTool({type:'text',name:'Texto',tool:textTool,renderer:textRenderer,hitTest:textHitTest,hitTestPart:textHitTestPart,move:textMove,defaults:{}});
