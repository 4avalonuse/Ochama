import { createDataClient } from '../data/client.js';
import { normalizeCandles } from '../data/normalize.js';
import { createViewport } from '../viewport/viewport.js';
import { createChart } from '../chart/render.js';
import { attachPointerInteraction } from '../interaction/pointer.js';
import { attachScaleToggle } from '../ui/scale-toggle.js';
import { attachFitToggle } from '../ui/fit-toggle.js';

const API_BASE = 'https://oraculum-data-api.4avalonuse.workers.dev';
const INITIAL_CANDLES = 120;
const DATA_OPTIONS = { provider: 'yahoo', interval: '1d', currency: 'USD' };
const ASSET_NAMES = { 'BTC-USD': 'Bitcoin / USD', 'SOL-USD': 'Solana / USD' };

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
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: value >= 100 ? 2 : 6 });
}
function formatRefresh(value) {
  if (!value) return '—';
  return new Date(Number(value)).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function updateHeader(symbol, candles, meta, loading = false) {
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  document.querySelector('#asset-symbol').textContent = symbol;
  document.querySelector('#asset-name').textContent = ASSET_NAMES[symbol] || symbol;
  document.querySelector('#asset-price').textContent = latest ? formatPrice(latest.close) : '—';
  const change = latest && previous ? latest.close - previous.close : null;
  const pct = latest && previous && previous.close ? (change / previous.close) * 100 : null;
  const changeNode = document.querySelector('#asset-change');
  changeNode.textContent = change == null ? '—' : `${change >= 0 ? '+' : ''}${formatPrice(change)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  changeNode.classList.toggle('negative', change != null && change < 0);
  document.querySelector('#data-source').textContent = meta?.sourceName || meta?.provider || '—';
  document.querySelector('#data-refresh').textContent = formatRefresh(meta?.updatedAt);
  const icon = document.querySelector('#asset-icon');
  icon.className = `asset-icon ${symbol === 'SOL-USD' ? 'sol' : 'btc'}`;
  icon.querySelector('span').textContent = symbol === 'SOL-USD' ? '' : '₿';
  document.querySelector('#status').textContent = loading ? `Carregando ${symbol}…` : `${symbol} carregado`;
}

export async function bootstrap() {
  const status = document.querySelector('#status');
  const chartHost = document.querySelector('#chart');
  const scaleButton = document.querySelector('#scale-toggle');
  const fitButton = document.querySelector('#fit-toggle');
  const refreshButton = document.querySelector('#refresh-data');
  const assetSelect = document.querySelector('#asset-select');
  const dataClient = createDataClient(API_BASE);
  let active = null;

  function optionsFor(symbol) { return { ...DATA_OPTIONS, symbol }; }

  function showInfo(symbol, candles, meta) {
    const latest = candles.at(-1);
    const server = meta?.sourceName || meta?.provider || '—';
    const refreshed = meta?.updatedAt;
    status.textContent = latest
      ? `${symbol} · ${formatPrice(latest.close)} · ${server} · ${formatRefresh(refreshed)}`
      : `${symbol} · ${server} · sem candles`;
  }

  async function loadAsset(symbol, result = null) {
    chartHost.classList.add('is-loading');
    chartHost.classList.remove('is-error');
    status.textContent = `Carregando ${symbol}…`;

    const loaded = result || await dataClient.loadCandles(optionsFor(symbol));
    const candles = normalizeCandles(loaded.candles);
    const meta = loaded.meta;

    if (active) {
      active.scaleCleanup?.();
      active.fitCleanup?.();
      active.interaction.detach();
      active.chart.destroy();
    }

    const viewport = createViewport();
    viewport.setDataBounds(dataBoundsFor(candles));

    const visible = candles.slice(-Math.min(INITIAL_CANDLES, candles.length));
    const visibleBounds = visibleBoundsFor(candles, visible);
    viewport.fitX(visibleBounds.x);
    viewport.fitY(visibleBounds.y);

    const chart = createChart(chartHost, candles, viewport);
    const interaction = attachPointerInteraction({ canvas: chart.canvas, viewport, draw: chart.draw });
    interaction.setMode('navigation');

    const fitVisiblePrice = () => {
      const state = viewport.getState();
      const shown = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
      if (shown.length) viewport.fitY({
        min: Math.min(...shown.map(c => c.low)),
        max: Math.max(...shown.map(c => c.high))
      });
    };

    const scaleCleanup = attachScaleToggle({
      button: scaleButton, viewport, draw: chart.draw, onScaleChanged: fitVisiblePrice
    });
    const fitCleanup = attachFitToggle({
      button: fitButton, viewport, candles, draw: chart.draw
    });

    active = { viewport, interaction, chart, scaleCleanup, fitCleanup, candles, symbol, meta };
    window.ochama = active;

    chartHost.classList.remove('is-loading', 'is-error');
    showInfo(symbol, candles, meta);
  }

  assetSelect?.addEventListener('change', () => {
    loadAsset(assetSelect.value).catch(error => {
      console.error('[Ochama]', error);
      chartHost.classList.remove('is-loading');
      chartHost.classList.add('is-error');
      status.textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
    });
  });

  refreshButton?.addEventListener('click', async () => {
    const symbol = assetSelect?.value || 'BTC-USD';
    refreshButton.disabled = true;
    status.textContent = `Atualizando ${symbol}…`;
    try {
      const result = await dataClient.refresh(optionsFor(symbol));
      await loadAsset(symbol, result);
    } catch (error) {
      console.error('[Ochama refresh]', error);
      status.textContent = `Refresh: ${error?.message || 'falha'}`;
      chartHost.classList.add('is-error');
    } finally {
      refreshButton.disabled = false;
    }
  });

  await loadAsset(assetSelect?.value || 'BTC-USD');
}

bootstrap().catch(error => {
  console.error('[Ochama]', error);
  document.querySelector('#chart').classList.remove('is-loading');
  document.querySelector('#chart').classList.add('is-error');
  document.querySelector('#status').textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
});