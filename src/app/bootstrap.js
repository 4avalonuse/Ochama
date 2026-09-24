import { createDataClient } from '../data/client.js';
import { normalizeCandles } from '../data/normalize.js';
import { createViewport } from '../viewport/viewport.js';
import { createChart } from '../chart/render.js';
import { attachPointerInteraction } from '../interaction/pointer.js';
import { attachScaleToggle } from '../ui/scale-toggle.js';

const API_BASE = 'https://oraculum-data-api.4avalonuse.workers.dev';

export async function bootstrap() {
  const status = document.querySelector('#status');
  const chartHost = document.querySelector('#chart');
  const scaleButton = document.querySelector('#scale-toggle');

  const dataClient = createDataClient(API_BASE);
  const viewport = createViewport();

  chartHost.classList.add('is-loading');
  status.textContent = 'Carregando dados…';

  const raw = await dataClient.loadCandles({ provider: 'yahoo', symbol: 'BTC-USD', interval: '1d' });
  const candles = normalizeCandles(raw);

  viewport.setDataBounds({
    x: { min: candles[0]?.timestamp ?? 0, max: candles.at(-1)?.timestamp ?? 0 },
    y: {
      min: Math.min(...candles.map(c => c.low)),
      max: Math.max(...candles.map(c => c.high))
    }
  });

  const chart = createChart(chartHost, candles, viewport);
  attachPointerInteraction({ canvas: chart.canvas, viewport, draw: chart.draw });
  attachScaleToggle({ button: scaleButton, viewport, draw: chart.draw });

  chartHost.classList.remove('is-loading', 'is-error');
  status.textContent = `BTC-USD · ${candles.length} candles`;
}

bootstrap().catch(error => {
  console.error('[Ochama]', error);
  document.querySelector('#chart').classList.remove('is-loading');
  document.querySelector('#chart').classList.add('is-error');
  document.querySelector('#status').textContent = `Erro: ${error?.message || 'falha desconhecida'}`;
});