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
import { createDrawingInteraction } from '../drawing/interaction/drawing-controller.js';
import '../drawing/tools/index.js';

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
    dataClient=createDataClient(API_BASE),
    stateStore=createChartStateStore(),
    drawingPersistence=createDrawingPersistence();

  let active=null;
  let activeDrawingInteraction=null;

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
    const chart=createChart(chartHost,candles,viewport,drawingManager);

    const persist=()=>{
      stateStore.save(
        {symbol,provider,interval},
        viewport.getState()
      );
    };

    const drawingInteraction=createDrawingInteraction({
      canvas:chart.canvas,
      viewport,
      drawingManager,
      draw:chart.draw,
      drawPreview:chart.setDrawingPreview,
      drawSelection:chart.setSelectedDrawingId,
      onChanged:drawingChanged,
      onComplete:()=>setToolbarMode('navigation')
    });

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
    saveActiveState();
    if(active?.drawingManager) drawingPersistence.save(active.drawingManager.getDocument());
  });

  document.querySelector('#config-button')?.addEventListener('click',()=>{
    status.textContent='Configurações: em breve'
  });

  const drawingSelectButton=document.querySelector('#drawing-select');
  const drawingLineButton=document.querySelector('#drawing-line');
  const drawingNavButton=document.querySelector('#drawing-nav');
  const drawingHorizontalButton=document.querySelector('#drawing-horizontal');
  const drawingVerticalButton=document.querySelector('#drawing-vertical');

  const setToolbarMode=(mode)=>{
    active?.interaction?.setMode(mode);
    drawingSelectButton?.classList.toggle('is-active',mode==='selection');
    drawingLineButton?.classList.toggle('is-active',mode==='drawing');
    drawingNavButton?.classList.toggle('is-active',mode==='navigation');
    drawingHorizontalButton?.classList.toggle('is-active',mode==='drawing' && activeDrawingInteraction?.getTool?.()==='horizontal');
    drawingVerticalButton?.classList.toggle('is-active',mode==='drawing' && activeDrawingInteraction?.getTool?.()==='vertical');
  };

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
