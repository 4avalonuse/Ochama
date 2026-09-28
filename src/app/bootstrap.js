import { createDataClient } from '../data/client.js';
import { normalizeCandles } from '../data/normalize.js';
import { createViewport } from '../viewport/viewport.js';
import { createChart } from '../chart/render.js';
import { attachPointerInteraction } from '../interaction/pointer.js';
import { attachScaleToggle } from '../ui/scale-toggle.js';
import { attachFitToggle } from '../ui/fit-toggle.js';
import { createChartStateStore } from '../storage/chart-state.js';
import { createDrawingManager } from '../drawing/core/drawing-manager.js';
import { createDrawingPersistence } from '../drawing/storage/drawing-persistence.js';
import { createDrawingInteraction } from '../drawing/interaction/drawing-controller.js?v=20260927-30';
import '../drawing/tools/index.js';
import { attachMovingAverageMenu } from '../ui/moving-average-menu.js';
import { attachFibonacciMenu } from '../ui/fibonacci-menu.js?v=20260927-29';
import { attachRsiMenu } from '../ui/rsi-menu.js?v=20260927-27';
import { attachVolumeMenu } from '../ui/volume-menu.js?v=20260927-32';
import { attachMacdMenu } from '../ui/macd-menu.js?v=20260927-33';
import { attachBollingerMenu } from '../ui/bollinger-menu.js?v=20260927-34';
import { attachAtrMenu } from '../ui/atr-menu.js';
import { attachDrawingToolsMenu } from '../ui/drawing-tools-menu.js';
import { createTextEditor } from '../ui/text-editor.js';
import { createStudyInfo } from '../ui/study-info.js';

const STUDIES={
  atr:{
    label:'ATR',
    attach:attachAtrMenu,
    activatedMessage:'ATR 14 ativado',
    configMessage:'Configuração do ATR',
    infoTitle:'ATR',
    infoText:'Mede a volatilidade do ativo pela amplitude real dos candles. Valores maiores indicam movimentos recentes mais amplos; valores menores indicam menor volatilidade.',
    defaultConfig:{study:'atr',period:14,color:'#dbe4ee',visible:true}
  },
  rsi:{
    label:'RSI',
    attach:attachRsiMenu,
    activatedMessage:'RSI 14 ativado',
    configMessage:'Configuração do RSI',
    infoTitle:'RSI',
    infoText:'Mede a força e a velocidade dos movimentos de preço. Valores altos indicam maior pressão compradora recente; valores baixos, maior pressão vendedora.',
    defaultConfig:{study:'rsi',period:14,levelLow:30,levelMid:50,levelHigh:70,color:'#dbe4ee',visible:true}
  },
  volume:{
    label:'Volume',
    attach:attachVolumeMenu,
    activatedMessage:'Volume ativado',
    configMessage:'Configuração do volume',
    infoTitle:'Volume',
    infoText:'Mostra a quantidade negociada em cada candle. Ajuda a observar a intensidade e a confirmação dos movimentos de preço.',
    defaultConfig:{study:'volume',showAverage:true,averagePeriod:20,averageType:'sma',upColor:'#4ade80',downColor:'#f87171',averageColor:'#f59e0b',visible:true}
  },
  macd:{
    label:'MACD',
    attach:attachMacdMenu,
    activatedMessage:'MACD 12/26/9 ativado',
    configMessage:'Configuração do MACD',
    infoTitle:'MACD',
    infoText:'Compara médias móveis para mostrar mudanças de tendência e momentum. A linha MACD, a linha de sinal e o histograma ajudam a visualizar aceleração ou desaceleração.',
    defaultConfig:{study:'macd',fastPeriod:12,slowPeriod:26,signalPeriod:9,source:'close',macdColor:'#dbe4ee',signalColor:'#f59e0b',upColor:'#4ade80',downColor:'#f87171',visible:true}
  },
  bollinger:{
    label:'Bollinger',
    attach:attachBollingerMenu,
    activatedMessage:'Bollinger 20 · 2 ativado',
    configMessage:'Configuração das Bandas de Bollinger',
    infoTitle:'Bandas de Bollinger',
    infoText:'Cria uma média móvel central e bandas acima e abaixo dela com base na volatilidade. A distância entre as bandas aumenta ou diminui conforme a volatilidade muda.',
    defaultConfig:{study:'bollinger',period:20,multiplier:2,source:'close',showMiddle:true,upperColor:'#60a5fa',middleColor:'#f59e0b',lowerColor:'#60a5fa',showFill:true,fillColor:'#60a5fa',visible:true}
  }
};

const API_BASE='https://oraculum-data-api.4avalonuse.workers.dev';
const INITIAL_CANDLES=120;
const DATA_OPTIONS={currency:'USD'};

function dataBoundsFor(c){
  if(!c.length)throw new Error('Nenhum candle disponível para o gráfico');
  return{x:{min:c[0].timestamp,max:c.at(-1).timestamp},y:{min:Math.min(...c.map(x=>x.low)),max:Math.max(...c.map(x=>x.high))}}
}

function visibleBoundsFor(c,v){
  return{x:{min:v[0]?.timestamp??c[0].timestamp,max:v.at(-1)?.timestamp??c.at(-1).timestamp},y:{min:Math.min(...v.map(c=>c.low)),max:Math.max(...v.map(c=>c.high))}}
}

function formatPrice(v){
  return Number(v).toLocaleString('en-US',{maximumFractionDigits:v>=100?2:6})
}

function updateHeader(symbol,candles){
  const latest=candles.at(-1);
  document.querySelector('#asset-price').textContent=latest?formatPrice(latest.close):'—';
}

export async function bootstrap(){
  const status=document.querySelector('#status'),
    chartHost=document.querySelector('#chart'),
    scaleButton=document.querySelector('#scale-toggle'),
    fitButton=document.querySelector('#fit-toggle'),
    refreshButton=document.querySelector('#refresh-data'),
    assetSelect=document.querySelector('#asset-select'),
    providerSelect=document.querySelector('#provider-select'),
    intervalSelect=document.querySelector('#interval-select'),
    chartTypeButton=document.querySelector('#chart-type-toggle'),
    movingAverageButton=document.querySelector('#moving-average-button'),
    dataClient=createDataClient(API_BASE),
    stateStore=createChartStateStore(),
    drawingPersistence=createDrawingPersistence();

  let active=null;
  let activeDrawingInteraction=null;
  let movingAverageConfigs=[];
  let studyConfigs=[];
  let fibonacciMenuCleanup=()=>{};
  let drawingToolsMenuCleanup=()=>{};
  const studyMenuCleanups={};
  const textEditor=createTextEditor();
  const studyInfo=createStudyInfo();

  const PROVIDER_SYMBOLS={
    yahoo:{'BTC-USD':'BTC-USD','SOL-USD':'SOL-USD'},
    'binance-us':{'BTC-USD':'BTCUSD'}
  };

  function optionsFor(symbol,provider,interval){
    const providerSymbol=PROVIDER_SYMBOLS[provider]?.[symbol];
    if(!providerSymbol)throw new Error(`Servidor ${provider} não disponível para ${symbol}`);
    return{...DATA_OPTIONS,symbol:providerSymbol,provider,interval}
  }

  function syncProviders(){
    const symbol=assetSelect.value;
    [...providerSelect.options].forEach(o=>o.hidden=symbol!=='BTC-USD'&&o.value!=='yahoo');
    if(symbol!=='BTC-USD')providerSelect.value='yahoo';
  }

  function saveActiveState(){
    if(!active?.viewport)return;
    stateStore.save(
      {symbol:active.symbol,provider:active.provider,interval:active.interval},
      active.viewport.getState()
    );
  }

  async function loadAsset(symbol,provider,interval='1d',result=null){
    chartHost.classList.add('is-loading');
    chartHost.classList.remove('is-error');
    status.textContent='Carregando '+symbol+' · '+provider+'…';

    const loaded=result||await dataClient.loadOrPopulate(optionsFor(symbol,provider,interval)),
      candles=normalizeCandles(loaded.candles),
      meta=loaded.meta;

    saveActiveState();
    if(active?.drawingManager) drawingPersistence.save(active.drawingManager.getDocument());

    const savedDrawings=drawingPersistence.load({symbol,provider,interval});

    if(active){
      active.scaleCleanup?.();
      active.fitCleanup?.();
      active.interaction.detach();
      active.chart.destroy();
      activeDrawingInteraction=null;
    }

    const viewport=createViewport();
    viewport.setDataBounds(dataBoundsFor(candles));

    const visible=candles.slice(-Math.min(INITIAL_CANDLES,candles.length)),
      vb=visibleBoundsFor(candles,visible);

    viewport.fitX(vb.x);
    viewport.fitY(vb.y);

    const savedState=stateStore.load({
      symbol,
      provider,
      interval
    });

    if(savedState)viewport.setState(savedState);

    const drawingManager=createDrawingManager({symbol,provider,interval,drawings:savedDrawings.drawings});
    const chart=createChart(chartHost,candles,viewport,drawingManager,{
      onPaneChange:next=>{
        studyConfigs=Array.isArray(next)?next.map(item=>({...item})):[];
      },
      onPaneClose:studyId=>{
        studyConfigs=studyConfigs.filter(item=>item.study!==studyId);
        status.textContent='Painel de estudos fechado';
      }
    });
    chart.setChartType(chartTypeButton?.getAttribute('aria-pressed') === 'true' ? 'line' : 'candle');
    chart.setMovingAverages(movingAverageConfigs);
    chart.setStudies(studyConfigs);

    const persist=()=>{
      stateStore.save(
        {symbol,provider,interval},
        viewport.getState()
      );
    };

    let drawingInteraction;
    try{
      drawingInteraction=createDrawingInteraction({
        canvas:chart.canvas,
        viewport,
        drawingManager,
        draw:chart.draw,
        drawPreview:chart.setDrawingPreview,
        drawSelection:chart.setSelectedDrawingId,
        getPlot:chart.getDrawingPlot,
        onChanged:drawingChanged,
        onComplete:()=>setToolbarMode('navigation')
      });
    }catch(error){
      console.error('[Ochama drawing interaction]',error);
      status.textContent='Erro na interação de desenho: '+(error?.message||'falha desconhecida');
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      throw error;
    }
    drawingInteraction.setTextEditor(textEditor.open);

    activeDrawingInteraction=drawingInteraction;

    const interaction=attachPointerInteraction({
      canvas:chart.canvas,
      viewport,
      draw:chart.draw,
      handlers:drawingInteraction.handlers,
      onViewportChanged:persist
    });

    interaction.setMode('navigation');

    const fitVisiblePrice=()=>{
      const state=viewport.getState(),
        shown=candles.filter(c=>c.timestamp>=state.x.min&&c.timestamp<=state.x.max);
      if(shown.length)viewport.fitY({
        min:Math.min(...shown.map(c=>c.low)),
        max:Math.max(...shown.map(c=>c.high))
      });
    };

    const scaleCleanup=attachScaleToggle({
      button:scaleButton,
      viewport,
      draw:chart.draw,
      onScaleChanged:()=>{
        fitVisiblePrice();
        persist();
      }
    });

    const fitCleanup=attachFitToggle({
      button:fitButton,
      viewport,
      candles,
      draw:chart.draw,
      onViewportChanged:persist
    });

    active={
      viewport,
      interaction,
      chart,
      scaleCleanup,
      fitCleanup,
      candles,
      symbol,
      provider,
      interval,
      meta,
      drawingManager
    };

    stateStore.saveSelection({
      symbol,
      provider,
      interval
    });

    window.ochama=active;
    refreshDrawingActions();
    chartHost.classList.remove('is-loading','is-error');
    updateHeader(symbol,candles);
  }

  const movingAverageCleanup=attachMovingAverageMenu({
    button:movingAverageButton,
    onChange:(configs)=>{
      movingAverageConfigs=configs;
      active?.chart?.setMovingAverages(configs);
      movingAverageButton?.setAttribute('aria-expanded','true');
    }
  });

  chartTypeButton?.addEventListener('click',()=>{
    const isLine=chartTypeButton.getAttribute('aria-pressed')==='true';
    const next=isLine?'candle':'line';
    chartTypeButton.setAttribute('aria-pressed',String(next==='line'));
    chartTypeButton.textContent=next==='line'?'LINE':'CANDLE';
    active?.chart?.setChartType(next);
  });

  assetSelect?.addEventListener('change',()=>{
    syncProviders();
    loadAsset(assetSelect.value,providerSelect.value,intervalSelect.value).catch(error=>{
      console.error('[Ochama]',error);
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      status.textContent='Erro: '+(error?.message||'falha desconhecida')
    })
  });

  providerSelect?.addEventListener('change',()=>{
    loadAsset(assetSelect.value,providerSelect.value,intervalSelect.value).catch(error=>{
      console.error('[Ochama provider]',error);
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      status.textContent='Erro: '+(error?.message||'falha desconhecida')
    })
  });

  intervalSelect?.addEventListener('change',()=>{
    loadAsset(assetSelect.value,providerSelect.value,intervalSelect.value).catch(error=>{
      console.error('[Ochama interval]',error);
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      status.textContent='Erro: '+(error?.message||'falha desconhecida')
    })
  });

  refreshButton?.addEventListener('click',async()=>{
    const symbol=assetSelect?.value||'BTC-USD',
      provider=providerSelect?.value||'yahoo',
      interval=intervalSelect?.value||'1d';

    refreshButton.disabled=true;
    status.textContent='Atualizando '+symbol+' · '+provider+'…';

    try{
      const result=await dataClient.refresh(optionsFor(symbol,provider,interval));
      await loadAsset(symbol,provider,interval,result);
    }catch(error){
      console.error('[Ochama refresh]',error);
      status.textContent='Refresh: '+(error?.message||'falha');
      chartHost.classList.add('is-error');
    }finally{
      refreshButton.disabled=false;
    }
  });

  window.addEventListener('pagehide',()=>{
    movingAverageCleanup?.();
    fibonacciMenuCleanup?.();
    drawingToolsMenuCleanup?.();
    studyInfo.destroy();
    Object.values(studyMenuCleanups).forEach(cleanup=>cleanup?.destroy?.());
    textEditor.destroy();
    saveActiveState();
    if(active?.drawingManager) drawingPersistence.save(active.drawingManager.getDocument());
  });

  const drawingSelectButton=document.querySelector('#drawing-select');
  const drawingLineButton=document.querySelector('#drawing-line');
  const drawingNavButton=document.querySelector('#drawing-nav');
  const drawingHorizontalButton=document.querySelector('#drawing-horizontal');
  const drawingVerticalButton=document.querySelector('#drawing-vertical');
  const drawingFibonacciButton=document.querySelector('#drawing-fibonacci');
  const drawingMoreButton=document.querySelector('#drawing-more');

  const setToolbarMode=(mode)=>{
    active?.interaction?.setMode(mode);
    drawingSelectButton?.classList.toggle('is-active',mode==='selection');
    drawingLineButton?.classList.toggle('is-active',mode==='drawing');
    drawingNavButton?.classList.toggle('is-active',mode==='navigation');
    drawingHorizontalButton?.classList.toggle('is-active',mode==='drawing' && activeDrawingInteraction?.getTool?.()==='horizontal');
    drawingVerticalButton?.classList.toggle('is-active',mode==='drawing' && activeDrawingInteraction?.getTool?.()==='vertical');
    drawingFibonacciButton?.classList.toggle('is-active',mode==='drawing' && activeDrawingInteraction?.getTool?.()==='fibonacci');
    document.querySelector('#drawing-more')?.classList.toggle(
      'is-active',
      mode==='drawing' && ['rectangle','reference','channel','ruler','text'].includes(activeDrawingInteraction?.getTool?.())
    );
  };

  fibonacciMenuCleanup=attachFibonacciMenu({
    button:drawingFibonacciButton,
    onModeChange:(mode)=>activeDrawingInteraction?.setFibonacciMode?.(mode),
    onActivate:()=>{
      activeDrawingInteraction?.setTool('fibonacci');
      setToolbarMode('drawing');
    }
  });

  function ensureStudy(id){
    const definition=STUDIES[id];
    if(!definition) return null;
    let config=studyConfigs.find(item=>item.study===id);
    if(!config){
      config={...definition.defaultConfig};
      studyConfigs=[...studyConfigs,config];
      active?.chart?.setStudies(studyConfigs);
    }
    return config;
  }

  function toggleStudy(id){
    const definition=STUDIES[id];
    if(!definition) return;
    const existing=studyConfigs.find(item=>item.study===id);
    if(!existing){
      ensureStudy(id);
      status.textContent=definition.activatedMessage;
      return;
    }
    const visible=existing.visible!==false;
    studyConfigs=studyConfigs.map(item=>item.study===id?{...item,visible:!visible}:item);
    active?.chart?.setStudies(studyConfigs);
    status.textContent=`${definition.label} ${visible?'ocultado':'mostrado'}`;
  }

  Object.entries(STUDIES).forEach(([id,{attach}])=>{
    studyMenuCleanups[id]=attach({
      anchor:drawingMoreButton,
      getConfig:()=>studyConfigs.find(item=>item.study===id)||null,
      onChange:next=>{
        studyConfigs=studyConfigs.map(item=>item.study===id?{...item,...next}:item);
        active?.chart?.setStudies(studyConfigs);
      }
    });
  });

  drawingToolsMenuCleanup=attachDrawingToolsMenu({
    button:drawingMoreButton,
    onStudyInfo:(selection)=>{
      const definition=STUDIES[selection?.value];
      if(!definition) return;
      studyInfo.open({title:definition.infoTitle||definition.label,text:definition.infoText||'Informação não disponível.'});
    },
    onStudyLongPress:(selection)=>{
      const id=selection?.value;
      if(!STUDIES[id]) return;
      ensureStudy(id);
      studyMenuCleanups[id]?.open?.(studyConfigs.find(item=>item.study===id));
      status.textContent=STUDIES[id].configMessage;
    },
    onSelect:(selection)=>{
      if(selection?.type==='study'){
        if(STUDIES[selection.value]) toggleStudy(selection.value);
        return;
      }
      const tool=selection;
      if(!['rectangle','reference','channel','ruler','text'].includes(tool)) return;
      activeDrawingInteraction?.setTool(tool);
      setToolbarMode('drawing');
    }
  });

  const drawingUndoButton=document.querySelector('#drawing-undo');
  const drawingRedoButton=document.querySelector('#drawing-redo');
  const drawingDeleteButton=document.querySelector('#drawing-delete');
  const drawingColorInput=document.querySelector('#drawing-color');

  const refreshDrawingActions=()=>{
    const manager=active?.drawingManager;
    if(!manager) return;
    if(drawingUndoButton) drawingUndoButton.disabled=!manager.canUndo();
    if(drawingRedoButton) drawingRedoButton.disabled=!manager.canRedo();
    if(drawingDeleteButton) drawingDeleteButton.disabled=!manager.getDrawings().length;
  };

  const drawingChanged=()=>{
    if(active?.drawingManager) drawingPersistence.save(active.drawingManager.getDocument());
    active?.chart?.draw();
    refreshDrawingActions();
  };

  drawingSelectButton?.addEventListener('click',()=>{
    activeDrawingInteraction?.setTool('line');
    setToolbarMode('selection');
  });
  drawingLineButton?.addEventListener('click',()=>{
    activeDrawingInteraction?.setTool('line');
    setToolbarMode('drawing');
  });
  drawingNavButton?.addEventListener('click',()=>setToolbarMode('navigation'));
  drawingHorizontalButton?.addEventListener('click',()=>{
    activeDrawingInteraction?.setTool('horizontal');
    setToolbarMode('drawing');
  });
  drawingVerticalButton?.addEventListener('click',()=>{
    activeDrawingInteraction?.setTool('vertical');
    setToolbarMode('drawing');
  });
  drawingMoreButton?.addEventListener('contextmenu',event=>event.preventDefault());
  drawingUndoButton?.addEventListener('click',()=>{
    if(active?.drawingManager?.undo()){
      active.chart.draw();
      drawingPersistence.save(active.drawingManager.getDocument());
      refreshDrawingActions();
    }
  });
  drawingRedoButton?.addEventListener('click',()=>{
    if(active?.drawingManager?.redo()){
      active.chart.draw();
      drawingPersistence.save(active.drawingManager.getDocument());
      refreshDrawingActions();
    }
  });
  let deleteHoldTimer = null;
  let deleteHoldTriggered = false;

  const confirmClearAllDrawings=()=>{
    if(!active?.drawingManager?.getDrawings?.().length) return false;
    if(!window.confirm('Apagar todos os desenhos?')) return false;
    return activeDrawingInteraction?.clearAll?.() || false;
  };

  drawingDeleteButton?.addEventListener('click',()=>{
    if(deleteHoldTriggered){
      deleteHoldTriggered=false;
      return;
    }
    if(!activeDrawingInteraction?.getSelectedId?.()) return;
    activeDrawingInteraction.deleteSelected();
  });

  const startDeleteHold=()=>{
    if(deleteHoldTimer) return;
    deleteHoldTriggered=false;
    deleteHoldTimer=window.setTimeout(()=>{
      deleteHoldTimer=null;
      deleteHoldTriggered=true;
      confirmClearAllDrawings();
    },700);
  };

  const cancelDeleteHold=()=>{
    if(deleteHoldTimer){
      window.clearTimeout(deleteHoldTimer);
      deleteHoldTimer=null;
    }
  };

  drawingDeleteButton?.addEventListener('pointerdown',startDeleteHold);
  drawingDeleteButton?.addEventListener('pointerup',cancelDeleteHold);
  drawingDeleteButton?.addEventListener('pointercancel',cancelDeleteHold);
  drawingDeleteButton?.addEventListener('pointerleave',cancelDeleteHold);

  let deleteKeyTimer = null;
  let deleteKeyTriggered = false;

  window.addEventListener('keydown',(event)=>{
    if(event.key!=='Delete' || event.repeat) return;
    if(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
    deleteKeyTriggered=false;
    deleteKeyTimer=window.setTimeout(()=>{
      deleteKeyTimer=null;
      deleteKeyTriggered=true;
      confirmClearAllDrawings();
    },700);
  });

  window.addEventListener('keyup',(event)=>{
    if(event.key!=='Delete') return;
    if(deleteKeyTimer){
      window.clearTimeout(deleteKeyTimer);
      deleteKeyTimer=null;
    }
    if(!deleteKeyTriggered){
      if(activeDrawingInteraction?.getSelectedId?.()) activeDrawingInteraction.deleteSelected();
    }
    deleteKeyTriggered=false;
  });

  drawingColorInput?.addEventListener('input',()=>activeDrawingInteraction?.setColor(drawingColorInput.value));
  setToolbarMode('navigation');

  const savedSelection=stateStore.loadSelection();

  if(savedSelection?.symbol && PROVIDER_SYMBOLS[savedSelection.provider]?.[savedSelection.symbol]){
    assetSelect.value=savedSelection.symbol;
    providerSelect.value=savedSelection.provider;
  }
  if(savedSelection?.interval && [...intervalSelect.options].some(o=>o.value===savedSelection.interval)){
    intervalSelect.value=savedSelection.interval;
  }

  syncProviders();
  await loadAsset(assetSelect?.value||'BTC-USD',providerSelect?.value||'yahoo',intervalSelect?.value||'1d');
}

bootstrap().catch(error=>{
  console.error('[Ochama]',error);
  document.querySelector('#chart').classList.remove('is-loading');
  document.querySelector('#chart').classList.add('is-error');
  document.querySelector('#status').textContent='Erro: '+(error?.message||'falha desconhecida')
});
