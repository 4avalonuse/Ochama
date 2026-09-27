import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

function finite(value){ return Number.isFinite(value); }

function calculateAtr(candles, period=14){
  const safePeriod=Math.max(2,Math.min(200,Math.floor(Number(period)||14)));
  const result=new Array(candles.length).fill(null);
  if(candles.length<=safePeriod)return result;

  const trueRanges=new Array(candles.length).fill(null);
  for(let i=0;i<candles.length;i+=1){
    const candle=candles[i];
    const previous=candles[i-1];
    if(!previous) trueRanges[i]=candle.high-candle.low;
    else trueRanges[i]=Math.max(
      candle.high-candle.low,
      Math.abs(candle.high-previous.close),
      Math.abs(candle.low-previous.close)
    );
  }

  let atr=trueRanges.slice(1,safePeriod+1).reduce((sum,value)=>sum+(finite(value)?value:0),0)/safePeriod;
  result[safePeriod]=atr;

  for(let i=safePeriod+1;i<candles.length;i+=1){
    const tr=trueRanges[i];
    if(!finite(tr))continue;
    atr=((atr*(safePeriod-1))+tr)/safePeriod;
    result[i]=atr;
  }
  return result;
}

function render(ctx,{candles,plot,config={}}){
  if(!candles?.length||!plot)return;
  const period=Math.max(2,Math.min(200,Math.floor(Number(config.period)||14)));
  const lineColor=/^#[0-9a-fA-F]{6}$/.test(config.color||'')?config.color:'#dbe4ee';
  const values=calculateAtr(candles,period);
  const visible=candles.map((candle,index)=>({candle,value:values[index]})).filter(item=>
    item.candle.timestamp>=plot.xMin&&item.candle.timestamp<=plot.xMax&&finite(item.value)
  );
  if(!visible.length)return;

  const max=Math.max(...visible.map(item=>item.value),0);
  if(!(max>0))return;
  const xSpan=plot.xMax-plot.xMin||1;
  const valueToY=value=>plot.top+(1-value/max)*plot.height;

  ctx.save();
  ctx.strokeStyle='#384555';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(plot.left,plot.top);
  ctx.lineTo(plot.left+plot.width,plot.top);
  ctx.stroke();

  ctx.strokeStyle=lineColor;
  ctx.lineWidth=1.5;
  ctx.beginPath();
  visible.forEach(({candle,value},index)=>{
    const x=plot.left+((candle.timestamp-plot.xMin)/xSpan)*plot.width;
    const y=valueToY(value);
    if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();

  const latest=visible.at(-1)?.value;
  ctx.fillStyle='#8b95a3';
  ctx.font='10px system-ui,sans-serif';
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.fillText(`ATR ${period} · ${latest?.toLocaleString('en-US',{maximumFractionDigits:2})||'—'}`,plot.left+6,plot.top+6);

  ctx.restore();
}

registerStudy({id:'atr',name:'ATR',placement:STUDY_PLACEMENTS.PANE,render});
