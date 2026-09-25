import { createDataClient } from '../data/client.js';
import { normalizeCandles } from '../data/normalize.js';
import { createViewport } from '../viewport/viewport.js';
import { createChart } from '../chart/render.js';
import { attachPointerInteraction } from '../interaction/pointer.js';
import { attachScaleToggle } from '../ui/scale-toggle.js';
import { attachFitToggle } from '../ui/fit-toggle.js';
import { attachChartControls } from '../ui/chart-controls.js';

const API_BASE = 'https://oraculum-data-api.4avalonuse.workers.dev';
const INITIAL_CANDLES = 120;

function dataBoundsFor(candles) {
  if (!candles.length) throw new Error('Nenhum candle disponível para o gráfico');
  return {
    x: { min: candles[0].timestamp, max: candles.at(-1).timestamp },
    y: { min: Math.min(...candles.map(c => c.low)), max: Math.max(...candles.map(c => c.high)) }
  };
}

function visibleBoundsFor(candles, visible) {
  return {
    x: { min: visible[0]?.timestamp ?? candles[0].timestamp, max: visible.at(-1)?.timestamp ?? candles.at(-1).timestamp },
    y: { min: Math.min(...visible.map(c => c.low)), max: Math.max(...visible.map(c => c.high)) }
  };
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n >= 1
      ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export async function bootstrap() {
  const status = document.querySelector('#status');
  const chartHost = document.querySelector('#chart');
  const scaleButton = document.querySelector('#scale-toggle');
  const fitButton = document.querySelector('#fit-toggle');
  const client = createDataClient(API_BASE);
  const datasets = await client.listDatasets();

  const first = datasets.find(d => d.provider === 'yahoo' && d.symbol === 'BTC-USD' && d.interval === '1d')
    || datasets.find(d => d?.provider && d?.symbol && d?.interval);

  if (!first) throw new Error('Nenhum dataset disponível');

  const state = { provider: first.provider, symbol: first.symbol, interval: first.interval, currency: first.currency ?? null, kind: first.kind ?? 'ohlcv' };
  let candles = [];
  let viewport = createViewport();
  let chart = null;
  let interaction = null;
  let cleanupScale = null;
  let cleanupFit = null;

  const load = async () => {
    chartHost.classList.add('is-loading');
    chartHost.classList.remove('is-error');
    status.textContent = 'Carregando…';

    const raw = await client.loadCandles(state);
    candles = normalizeCandles(raw);
    viewport = createViewport();
    viewport.setDataBounds(dataBoundsFor(candles));

    const visible = candles.slice(-Math.min(INITIAL_CANDLES, candles.length));
    const visibleBounds = visibleBoundsFor(candles, visible);
    viewport.fitX(visibleBounds.x);
    viewport.fitY(visibleBounds.y);

    if (interaction) interaction.detach();
    if (chart) chart.destroy();

    chart = createChart(chartHost, candles, viewport);
    interaction = attachPointerInteraction({ canvas: chart.canvas, viewport, draw: chart.draw });
    interaction.setMode('navigation');

    cleanupScale?.();
    cleanupFit?.();
    cleanupScale = attachScaleToggle({
      button: scaleButton,
      viewport,
      draw: chart.draw,
      onScaleChanged: () => {
        const current = viewport.getState();
        const shown = candles.filter(c => c.timestamp >= current.x.min && c.timestamp <= current.x.max);
        if (shown.length) viewport.fitY({ min: Math.min(...shown.map(c => c.low)), max: Math.max(...shown.map(c => c.high)) });
      }
    });
    cleanupFit = attachFitToggle({ button: fitButton, viewport, candles, draw: chart.draw });

    document.querySelector('#current-price').textContent = formatPrice(candles.at(-1)?.close);
    status.textContent = `${state.symbol} · ${candles.length} candles`;
    chartHost.classList.remove('is-loading');
    chart.draw();
  };

  const controls = attachChartControls({
    assetButton: document.querySelector('#asset-toggle'),
    assetMenu: document.querySelector('#asset-menu'),
    settingsButton: document.querySelector('#settings-toggle'),
    settingsMenu: document.querySelector('#settings-menu'),
    touchToggle: document.querySelector('#touch-toggle'),
    logButton: document.querySelector('#log-toggle'),
    logPanel: document.querySelector('#log-panel'),
    intervalRoot: document.querySelector('#intervals'),
    datasets,
    state,
    onAssetChange: async dataset => {
      state.provider = dataset.provider;
      state.symbol = dataset.symbol;
      const available = datasets.filter(d => d.provider === state.provider && d.symbol === state.symbol);
      const preferred = available.find(d => d.interval === state.interval) || available.find(d => d.interval === '1d') || available[0];
      state.interval = preferred.interval;
      state.currency = preferred.currency ?? null;
      state.kind = preferred.kind ?? 'ohlcv';
      controls.sync();
      try { await load(); } catch (error) { showError(error); }
    },
    onIntervalChange: async interval => {
      const dataset = datasets.find(d => d.provider === state.provider && d.symbol === state.symbol && d.interval === interval);
      if (!dataset) return;
      state.interval = interval;
      state.currency = dataset.currency ?? null;
      state.kind = dataset.kind ?? 'ohlcv';
      controls.sync();
      try { await load(); } catch (error) { showError(error); }
    },
    onTouchChange: enabled => {
      if (enabled) interaction?.attach();
      else interaction?.detach();
      log(`Touch do gráfico: ${enabled ? 'ON' : 'OFF'}`);
    },
    onLogChange: () => {}
  });

  function log(message) {
    const panel = document.querySelector('#log-panel');
    const time = new Date().toLocaleTimeString();
    panel.textContent = `[${time}] ${message}` + (panel.textContent ? `\n${panel.textContent}` : '');
  }

  function showError(error) {
    console.error('[Ochama]', error);
    chartHost.classList.remove('is-loading');
    chartHost.classList.add('is-error');
    status.textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
    log(`ERRO: ${error?.message || 'falha desconhecida'}`);
  }

  window.ochama = { get state() { return { ...state }; }, get viewport() { return viewport; }, get interaction() { return interaction; }, get chart() { return chart; } };

  try { await load(); } catch (error) { showError(error); }
}

bootstrap().catch(error => {
  console.error('[Ochama]', error);
  const chart = document.querySelector('#chart');
  chart?.classList.remove('is-loading');
  chart?.classList.add('is-error');
  const status = document.querySelector('#status');
  if (status) status.textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
});
