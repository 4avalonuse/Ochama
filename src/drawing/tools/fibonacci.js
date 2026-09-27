import { registerDrawingTool } from '../core/drawing-registry.js';
import { fromScaleValue, normalizeScaleType, toScaleValue } from '../../viewport/scale.js';
import { distancePointToSegment } from '../render/geometry.js';

export const FIBONACCI_RETRACEMENT_LEVELS=Object.freeze([
  {value:0,label:'0%'},{value:.236,label:'23.6%'},{value:.382,label:'38.2%'},{value:.5,label:'50%'},{value:.618,label:'61.8%'},{value:.786,label:'78.6%'},{value:1,label:'100%'}
]);
export const FIBONACCI_EXTENSION_LEVELS=Object.freeze([
  {value:0,label:'0%'},{value:.618,label:'61.8%'},{value:1,label:'100%'},{value:1.272,label:'127.2%'},{value:1.414,label:'141.4%'},{value:1.618,label:'161.8%'},{value:2,label:'200%'},{value:2.618,label:'261.8%'},{value:4.236,label:'423.6%'}
]);
export const FIBONACCI_LEVELS=FIBONACCI_RETRACEMENT_LEVELS;
export const FIBONACCI_MODES=Object.freeze({RETRACEMENT:'retracement',EXTENSION:'extension'});
function levelsForMode(mode){return mode===FIBONACCI_MODES.EXTENSION?FIBONACCI_EXTENSION_LEVELS:FIBONACCI_RETRACEMENT_LEVELS}
export function fibonacciTool(){return{type:'fibonacci',defaults:{mode:FIBONACCI_MODES.RETRACEMENT,levels:FIBONACCI_RETRACEMENT_LEVELS.map(level=>level.value)},create(start,end,scaleType='linear',color='#60a5fa',options={}){
  const mode=options?.mode===FIBONACCI_MODES.EXTENSION?FIBONACCI_MODES.EXTENSION:FIBONACCI_MODES.RETRACEMENT,levels=levelsForMode(mode);
  return{id:crypto.randomUUID(),type:'fibonacci',scaleType:normalizeScaleType(scaleType),color,mode,start:{...start},end:{...end},levels:levels.map(level=>level.value)};
}}
}
function levelsFor(drawing){const catalog=levelsForMode(drawing?.mode),allowed=new Set(Array.isArray(drawing?.levels)?drawing.levels.map(Number).filter(Number.isFinite):catalog.map(level=>level.value));return catalog.filter(level=>allowed.has(level.value))}
function levelPrice(drawing,level){const scaleType=normalizeScaleType(drawing.scaleType),start=toScaleValue(drawing.start.price,scaleType),end=toScaleValue(drawing.end.price,scaleType);if(!Number.isFinite(start)||!Number.isFinite(end))return NaN;return fromScaleValue(start+(end-start)*level,scaleType)}
function screenSegments(drawing,transform){const start=transform.marketToScreen(drawing.start),end=transform.marketToScreen(drawing.end);if(!start||!end)return[];const leftX=Math.min(start.x,end.x),rightX=Math.max(start.x,end.x),extendRight=Math.max(rightX,transform.plotRight-2);return levelsFor(drawing).map(level=>{const price=levelPrice(drawing,level.value);if(!Number.isFinite(price))return null;const left=transform.marketToScreen({timestamp:drawing.start.timestamp,price}),baseRight=transform.marketToScreen({timestamp:drawing.end.timestamp,price});if(!left||!baseRight)return null;const y=left.y;return{...level,price,left:{x:leftX,y},right:{x:extendRight,y}}}).filter(Boolean)}
function roundRect(ctx,x,y,w,h,r){if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return}ctx.rect(x,y,w,h)}
export function fibonacciRenderer(ctx,drawing,transform,options={}){
  const start=transform.marketToScreen(drawing.start),end=transform.marketToScreen(drawing.end),segments=screenSegments(drawing,transform);if(!start||!end||!segments.length)return;
  const color=drawing.color||'#60a5fa';
  ctx.save();
  const zero=segments.find(s=>s.value===0),one=segments.find(s=>s.value===1);
  if(zero&&one){const top=Math.min(zero.left.y,one.left.y),bottom=Math.max(zero.left.y,one.left.y);ctx.fillStyle=color;ctx.globalAlpha=options.selected?.045:.025;ctx.fillRect(transform.plotLeft,top,transform.plotRight-transform.plotLeft,bottom-top);}
  ctx.lineWidth=options.selected?2:1.1;ctx.font='700 9px system-ui,sans-serif';ctx.textBaseline='middle';
  for(const segment of segments){
    ctx.strokeStyle=color;ctx.setLineDash(segment.value===.5?[5,4]:[]);ctx.globalAlpha=options.selected?.88:.62;
    ctx.beginPath();ctx.moveTo(segment.left.x,segment.left.y);ctx.lineTo(segment.right.x,segment.right.y);ctx.stroke();ctx.setLineDash([]);
    const label=segment.label,w=ctx.measureText(label).width+10,h=18;
    const x=Math.max(transform.plotLeft+4,Math.min(segment.right.x-w-4,transform.plotRight-w-4)),y=segment.left.y-h/2;
    ctx.globalAlpha=options.selected?1:.88;ctx.fillStyle='rgba(11,17,25,.9)';ctx.beginPath();roundRect(ctx,x,y,w,h,5);ctx.fill();
    ctx.strokeStyle=color;ctx.globalAlpha=options.selected?.55:.28;ctx.lineWidth=1;ctx.stroke();
    ctx.globalAlpha=options.selected?1:.88;ctx.fillStyle='#dbe4ee';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2);
  }
  ctx.setLineDash([]);ctx.globalAlpha=options.selected?.95:.8;ctx.strokeStyle=color;ctx.lineWidth=options.selected?1.8:1;
  ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  if(options.selected){
    for(const point of[start,end]){ctx.beginPath();ctx.arc(point.x,point.y,6.5,0,Math.PI*2);ctx.fillStyle='#0b1118';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
  }
  ctx.restore();
}
export function fibonacciHitTestPart(point,drawing,transform){const start=transform.marketToScreen(drawing.start),end=transform.marketToScreen(drawing.end);if(!start||!end)return null;if(Math.hypot(point.x-start.x,point.y-start.y)<=12)return'start';if(Math.hypot(point.x-end.x,point.y-end.y)<=12)return'end';return null}
export function fibonacciHitTest(point,drawing,transform,tolerance=9){for(const segment of screenSegments(drawing,transform))if(distancePointToSegment(point,segment.left,segment.right)<=tolerance)return true;const start=transform.marketToScreen(drawing.start),end=transform.marketToScreen(drawing.end);return start&&end?distancePointToSegment(point,start,end)<=tolerance:false}
export function fibonacciMove(drawing,delta,transform,part='body'){
  if(part==='start'||part==='end'){const target=transform.marketToScreen(drawing[part]);if(!target)return null;const next=transform.screenToMarket({x:target.x+delta.dx,y:target.y+delta.dy});return next?{...drawing,[part]:next}:null}
  const start=transform.marketToScreen(drawing.start),end=transform.marketToScreen(drawing.end);if(!start||!end)return null;
  const nextStart=transform.screenToMarket({x:start.x+delta.dx,y:start.y+delta.dy}),nextEnd=transform.screenToMarket({x:end.x+delta.dx,y:end.y+delta.dy});if(!nextStart||!nextEnd)return null;
  return{...drawing,start:nextStart,end:nextEnd};
}
registerDrawingTool({type:'fibonacci',name:'Fibonacci',tool:fibonacciTool,renderer:fibonacciRenderer,hitTest:fibonacciHitTest,hitTestPart:fibonacciHitTestPart,move:fibonacciMove,defaults:{}});
