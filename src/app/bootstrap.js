import { createDataClient } from '../data/client.js';
import { normalizeCandles } from '../data/normalize.js';
import { createViewport } from '../viewport/viewport.js';
import { createChart } from '../chart/render.js';
import { attachPointerInteraction } from '../interaction/pointer.js';
import { attachScaleToggle } from '../ui/scale-toggle.js';
import { attachFitToggle } from '../ui/fit-toggle.js';

const API_BASE = 'https://oraculum-data-api.4avalonuse.workers.dev';
const INITIAL_CANDLES = 120;

function dataBoundsFor(candles) {
  if (!candles.length) throw new Error('Nenhum candle disponível para o gráfico');

  return {
    x: { min: candles[0].timestamp, max: candles.at(-1).timestamp },
    y: {
      min: Math.min(...candles.map(c => c.low)),
      max: Math.max(...candles.map(c => c.high))
    }
  };
}

function visibleBoundsFor(candles, visible) {
  return {
    x: {
      min: visible[0]?.timestamp ?? candles[0].timestamp,
      max: visible.at(-1)?.timestamp ?? candles.at(-1).timestamp
    },
    y: {
      min: Math.min(...visible.map(c => c.low)),
      max: Math.max(...visible.map(c => c.high))
    }
  };
}

export async function bootstrap() {
  const status = document.querySelector('#status');
  const chartHost = document.querySelector('#chart');
  const scaleButton = document.querySelector('#scale-toggle');
  const fitButton = document.querySelector('#fit-toggle');
  const assetSelect = document.querySelector('#asset-select');
  const dataClient = createDataClient(API_BASE);

  let active = null;

  async function loadAsset(symbol) {
    chartHost.classList.add('is-loading');
    chartHost.classList.remove('is-error');
    status.textContent = `Carregando ${symbol}…`;

    if (active) {
      active.scaleCleanup?.();
      active.fitCleanup?.();
      active.interaction.detach();
      active.chart.destroy();
    }

    const viewport = createViewport();
    const raw = await dataClient.loadCandles({
      provider: 'yahoo',
      symbol,
      interval: '1d'
    });
    const candles = normalizeCandles(raw);
    const dataBounds = dataBoundsFor(candles);
    viewport.setDataBounds(dataBounds);

    const visible = candles.slice(-Math.min(INITIAL_CANDLES, candles.length));
    const visibleBounds = visibleBoundsFor(candles, visible);
    viewport.fitX(visibleBounds.x);
    viewport.fitY(visibleBounds.y);

    const chart = createChart(chartHost, candles, viewport);
    const interaction = attachPointerInteraction({
      canvas: chart.canvas,
      viewport,
      draw: chart.draw
    });
    interaction.setMode('navigation');

    const fitVisiblePrice = () => {
      const state = viewport.getState();
      const shown = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
      if (!shown.length) return;

      viewport.fitY({
        min: Math.min(...shown.map(c => c.low)),
        max: Math.max(...shown.map(c => c.high))
      });
    };

    const scaleCleanup = attachScaleToggle({
      button: scaleButton,
      viewport,
      draw: chart.draw,
      onScaleChanged: fitVisiblePrice
    });
    const fitCleanup = attachFitToggle({
      button: fitButton,
      viewport,
      candles,
      draw: chart.draw
    });

    active = { viewport, interaction, chart, scaleCleanup, fitCleanup, candles, symbol };
    window.ochama = active;

    chartHost.classList.remove('is-loading', 'is-error');
    status.textContent = `${symbol} · ${candles.length} candles`;
  }

  assetSelect?.addEventListener('change', () => {
    loadAsset(assetSelect.value).catch(error => {
      console.error('[Ochama]', error);
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      status.textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
    });
  });

  await loadAsset(assetSelect?.value || 'BTC-USD');
}

bootstrap().catch(error => {
  console.error('[Ochama]', error);
  document.querySelector('#chart').classList.remove('is-loading');
  document.querySelector('#chart').classList.add('is-error');
  document.querySelector('#status').textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
});
