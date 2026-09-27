export function attachMacdMenu({ anchor, onChange, getConfig }) {
  if (!anchor) return { open: () => {}, close: () => {}, destroy: () => {} };

  const menu = document.createElement('div');
  menu.className = 'macd-config-menu';
  menu.hidden = true;
  menu.innerHTML = '<div class="macd-config-head"><div><div class="macd-config-title">Configurar MACD</div><div class="macd-config-subtitle">Tendência, sinal e histograma</div></div><button type="button" class="macd-config-close" aria-label="Fechar configuração do MACD" title="Fechar">×</button></div>' +
    '<div class="macd-config-section"><div class="macd-config-section-title">CÁLCULO</div>' +
    '<label class="macd-config-field"><span>Rápida</span><input data-macd-fast type="number" min="2" max="200" step="1" inputmode="numeric"></label>' +
    '<label class="macd-config-field"><span>Lenta</span><input data-macd-slow type="number" min="3" max="300" step="1" inputmode="numeric"></label>' +
    '<label class="macd-config-field"><span>Sinal</span><input data-macd-signal type="number" min="2" max="100" step="1" inputmode="numeric"></label>' +
    '<label class="macd-config-field"><span>Fonte</span><select data-macd-source><option value="close">Close</option><option value="open">Open</option><option value="high">High</option><option value="low">Low</option><option value="hl2">HL2</option><option value="hlc3">HLC3</option><option value="ohlc4">OHLC4</option></select></label></div>' +
    '<div class="macd-config-section"><div class="macd-config-section-title">LINHAS</div>' +
    '<label class="macd-config-field"><span>MACD</span><input data-macd-line-color type="color"></label>' +
    '<label class="macd-config-field"><span>Sinal</span><input data-macd-signal-color type="color"></label></div>' +
    '<div class="macd-config-section"><div class="macd-config-section-title">HISTOGRAMA</div>' +
    '<label class="macd-config-field"><span>Positivo</span><input data-macd-up-color type="color"></label>' +
    '<label class="macd-config-field"><span>Negativo</span><input data-macd-down-color type="color"></label></div>' +
    '<div class="macd-config-hint">Toque fora para fechar</div>';
  document.body.appendChild(menu);

  const fields = {
    fastPeriod: menu.querySelector('[data-macd-fast]'),
    slowPeriod: menu.querySelector('[data-macd-slow]'),
    signalPeriod: menu.querySelector('[data-macd-signal]'),
    source: menu.querySelector('[data-macd-source]'),
    macdColor: menu.querySelector('[data-macd-line-color]'),
    signalColor: menu.querySelector('[data-macd-signal-color]'),
    upColor: menu.querySelector('[data-macd-up-color]'),
    downColor: menu.querySelector('[data-macd-down-color]')
  };

  const normalize = cfg => {
    const fast = Math.max(2, Math.min(200, Math.floor(Number(cfg?.fastPeriod) || 12)));
    return {
      fastPeriod: fast,
      slowPeriod: Math.max(fast + 1, Math.min(300, Math.floor(Number(cfg?.slowPeriod) || 26))),
      signalPeriod: Math.max(2, Math.min(100, Math.floor(Number(cfg?.signalPeriod) || 9))),
      source: ['open','high','low','close','hl2','hlc3','ohlc4'].includes(cfg?.source) ? cfg.source : 'close',
      macdColor: cfg?.macdColor || '#dbe4ee',
      signalColor: cfg?.signalColor || '#f59e0b',
      upColor: cfg?.upColor || '#4ade80',
      downColor: cfg?.downColor || '#f87171'
    };
  };

  const sync = cfg => {
    const c = normalize(cfg);
    fields.fastPeriod.value = c.fastPeriod;
    fields.slowPeriod.value = c.slowPeriod;
    fields.signalPeriod.value = c.signalPeriod;
    fields.source.value = c.source;
    fields.macdColor.value = c.macdColor;
    fields.signalColor.value = c.signalColor;
    fields.upColor.value = c.upColor;
    fields.downColor.value = c.downColor;
  };

  const emit = () => onChange?.(normalize({
    fastPeriod: fields.fastPeriod.value, slowPeriod: fields.slowPeriod.value,
    signalPeriod: fields.signalPeriod.value, source: fields.source.value,
    macdColor: fields.macdColor.value, signalColor: fields.signalColor.value,
    upColor: fields.upColor.value, downColor: fields.downColor.value
  }));

  const position = () => {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(285, innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, innerWidth - width - 8));
    menu.style.width = width + 'px';
    menu.style.left = left + 'px';
    menu.style.top = Math.min(rect.bottom + 8, innerHeight - menu.offsetHeight - 8) + 'px';
  };

  const open = cfg => { sync(cfg || getConfig?.() || {}); menu.hidden = false; requestAnimationFrame(position); };
  const close = () => { menu.hidden = true; };
  const onDocumentPointerDown = event => {
    if (menu.hidden || event.target === anchor || menu.contains(event.target)) return;
    close();
  };

  menu.addEventListener('change', emit);
  menu.addEventListener('input', emit);
  menu.querySelector('.macd-config-close').addEventListener('click', close);
  const onKeyDown = event => { if (event.key === 'Escape' && !menu.hidden) close(); };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);

  return {
    open, close,
    destroy: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      menu.remove();
    }
  };
}
