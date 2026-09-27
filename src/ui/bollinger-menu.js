export function attachBollingerMenu({ anchor, onChange, getConfig }) {
  if (!anchor) return { open: () => {}, close: () => {}, destroy: () => {} };

  const menu = document.createElement('div');
  menu.className = 'bollinger-config-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="bollinger-config-head">
      <div>
        <div class="bollinger-config-title">Configurar Bandas</div>
        <div class="bollinger-config-subtitle">Volatilidade ao redor da média</div>
      </div>
      <button type="button" class="bollinger-config-close" aria-label="Fechar configuração das bandas" title="Fechar">×</button>
    </div>
    <div class="bollinger-config-section">
      <div class="bollinger-config-section-title">CÁLCULO</div>
      <label class="bollinger-config-field"><span>Período</span><input data-bollinger-period type="number" min="2" max="200" step="1" inputmode="numeric"></label>
      <label class="bollinger-config-field"><span>Desvio</span><input data-bollinger-multiplier type="number" min="0.1" max="10" step="0.1" inputmode="decimal"></label>
      <label class="bollinger-config-field"><span>Fonte</span><select data-bollinger-source><option value="close">Close</option><option value="open">Open</option><option value="high">High</option><option value="low">Low</option><option value="hl2">HL2</option><option value="hlc3">HLC3</option><option value="ohlc4">OHLC4</option></select></label>
    </div>
    <div class="bollinger-config-section">
      <div class="bollinger-config-section-title">LINHAS</div>
      <label class="bollinger-config-field"><span>Mostrar média</span><input data-bollinger-middle type="checkbox"></label>
      <label class="bollinger-config-field"><span>Superior</span><input data-bollinger-upper-color type="color"></label>
      <label class="bollinger-config-field"><span>Média</span><input data-bollinger-middle-color type="color"></label>
      <label class="bollinger-config-field"><span>Inferior</span><input data-bollinger-lower-color type="color"></label>
    </div>
    <div class="bollinger-config-section">
      <div class="bollinger-config-section-title">FAIXA</div>
      <label class="bollinger-config-field"><span>Preenchimento</span><input data-bollinger-fill type="checkbox"></label>
      <label class="bollinger-config-field"><span>Cor</span><input data-bollinger-fill-color type="color"></label>
    </div>
    <div class="bollinger-config-hint">Toque fora para fechar</div>
  `;

  document.body.appendChild(menu);

  const fields = {
    period: menu.querySelector('[data-bollinger-period]'),
    multiplier: menu.querySelector('[data-bollinger-multiplier]'),
    source: menu.querySelector('[data-bollinger-source]'),
    showMiddle: menu.querySelector('[data-bollinger-middle]'),
    upperColor: menu.querySelector('[data-bollinger-upper-color]'),
    middleColor: menu.querySelector('[data-bollinger-middle-color]'),
    lowerColor: menu.querySelector('[data-bollinger-lower-color]'),
    showFill: menu.querySelector('[data-bollinger-fill]'),
    fillColor: menu.querySelector('[data-bollinger-fill-color]')
  };

  const normalize = cfg => ({
    period: Math.max(2, Math.min(200, Math.floor(Number(cfg?.period) || 20))),
    multiplier: Math.max(0.1, Math.min(10, Number(cfg?.multiplier) || 2)),
    source: ['open','high','low','close','hl2','hlc3','ohlc4'].includes(cfg?.source) ? cfg.source : 'close',
    showMiddle: cfg?.showMiddle !== false,
    upperColor: cfg?.upperColor || '#60a5fa',
    middleColor: cfg?.middleColor || '#f59e0b',
    lowerColor: cfg?.lowerColor || '#60a5fa',
    showFill: cfg?.showFill !== false,
    fillColor: cfg?.fillColor || '#60a5fa'
  });

  const sync = cfg => {
    const c = normalize(cfg);
    fields.period.value = c.period;
    fields.multiplier.value = c.multiplier;
    fields.source.value = c.source;
    fields.showMiddle.checked = c.showMiddle;
    fields.upperColor.value = c.upperColor;
    fields.middleColor.value = c.middleColor;
    fields.lowerColor.value = c.lowerColor;
    fields.showFill.checked = c.showFill;
    fields.fillColor.value = c.fillColor;
  };

  const emit = () => onChange?.(normalize({
    period: fields.period.value,
    multiplier: fields.multiplier.value,
    source: fields.source.value,
    showMiddle: fields.showMiddle.checked,
    upperColor: fields.upperColor.value,
    middleColor: fields.middleColor.value,
    lowerColor: fields.lowerColor.value,
    showFill: fields.showFill.checked,
    fillColor: fields.fillColor.value
  }));

  const position = () => {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(290, innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, innerWidth - width - 8));
    menu.style.width = width + 'px';
    menu.style.left = left + 'px';
    menu.style.top = Math.min(rect.bottom + 8, innerHeight - menu.offsetHeight - 8) + 'px';
  };

  const open = cfg => {
    sync(cfg || getConfig?.() || {});
    menu.hidden = false;
    requestAnimationFrame(position);
  };
  const close = () => { menu.hidden = true; };

  const onDocumentPointerDown = event => {
    if (menu.hidden || event.target === anchor || menu.contains(event.target)) return;
    close();
  };
  const onKeyDown = event => {
    if (event.key === 'Escape' && !menu.hidden) close();
  };

  menu.addEventListener('change', emit);
  menu.addEventListener('input', emit);
  menu.querySelector('.bollinger-config-close').addEventListener('click', close);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);

  return {
    open,
    close,
    destroy: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      menu.remove();
    }
  };
}
