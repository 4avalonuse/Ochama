export const MOVING_AVERAGE_TYPES=Object.freeze([
  {value:'sma',label:'SMA'},
  {value:'ema',label:'EMA'}
]);

export const MOVING_AVERAGE_SOURCES=Object.freeze([
  {value:'close',label:'Close'},
  {value:'open',label:'Open'},
  {value:'high',label:'High'},
  {value:'low',label:'Low'},
  {value:'hl2',label:'HL2'},
  {value:'hlc3',label:'HLC3'},
  {value:'ohlc4',label:'OHLC4'}
]);

function sourceValue(candle,source){
  switch(source){
    case 'open': return candle.open;
    case 'high': return candle.high;
    case 'low': return candle.low;
    case 'hl2': return (candle.high+candle.low)/2;
    case 'hlc3': return (candle.high+candle.low+candle.close)/3;
    case 'ohlc4': return (candle.open+candle.high+candle.low+candle.close)/4;
    case 'close':
    default: return candle.close;
  }
}

function validPeriod(period){
  const value=Math.trunc(Number(period));
  return Number.isFinite(value)&&value>=1?value:null;
}

export function normalizeMovingAverage(config={}){
  const type=config.type==='ema'?'ema':'sma';
  const source=MOVING_AVERAGE_SOURCES.some(item=>item.value===config.source)?config.source:'close';
  const period=validPeriod(config.period)??20;
  return {
    id:config.id||crypto.randomUUID(),
    type,
    source,
    period,
    color:typeof config.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(config.color)?config.color:'#f59e0b',
    visible:config.visible!==false,
    label:typeof config.label==='string'&&config.label.trim()?config.label.trim():`${type.toUpperCase()} ${period}`
  };
}

export function calculateMovingAverage(candles,config){
  const settings=normalizeMovingAverage(config);
  const period=settings.period;
  const values=candles.map(candle=>sourceValue(candle,settings.source));
  const result=new Array(values.length).fill(null);

  if(values.length<period) return {settings,values:result};

  if(settings.type==='sma'){
    let sum=0;
    for(let i=0;i<values.length;i+=1){
      sum+=values[i];
      if(i>=period) sum-=values[i-period];
      if(i>=period-1) result[i]=sum/period;
    }
    return {settings,values:result};
  }

  let sum=0;
  for(let i=0;i<period;i+=1) sum+=values[i];
  let ema=sum/period;
  result[period-1]=ema;
  const multiplier=2/(period+1);
  for(let i=period;i<values.length;i+=1){
    ema=(values[i]-ema)*multiplier+ema;
    result[i]=ema;
  }
  return {settings,values:result};
}
