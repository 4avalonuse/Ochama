export function attachDrawingToolsMenu({ button, onSelect }) {
  if (!button) return () => {};

  const menu = document.createElement('div');
  menu.className = 'drawing-tools-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="drawing-tools-title">Ferramentas</div>
    <div class="drawing-tools-section">DESENHAR</div>
    <button type="button" data-drawing-tool="rectangle">
      <span class="drawing-tools-icon">□</span>
      <span><strong>Retângulo</strong><small>Marcar uma zona no gráfico</small></span>
    </button>
    <button type="button" data-drawing-tool="reference">
      <span class="drawing-tools-icon">⌖</span>
      <span><strong>Referência</strong><small>Fixar um ponto para comparação</small></span>
    </button>
    <button type="button" data-drawing-tool="channel">
      <span class="drawing-tools-icon">∥</span>
      <span><strong>Canal</strong><small>Duas linhas paralelas</small></span>
    </button>
    <button type="button" data-drawing-tool="ruler">
      <span class="drawing-tools-icon">↗</span>
      <span><strong>Régua</strong><small>Preço, variação e tempo</small></span>
    </button>
    <button type="button" data-drawing-tool="text">
      <span class="drawing-tools-icon">T</span>
      <span><strong>Texto</strong><small>Anotar diretamente no gráfico</small></span>
    </button>
    <div class="drawing-tools-section">ESTUDOS</div>
    <button type="button" data-study="rsi">
      <span class="drawing-tools-icon">R</span>
      <span><strong>RSI</strong><small>Força relativa · período 14</small></span>
    </button>
  `;

  document.body.appendChild(menu);

  const setOpen = open => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(positionMenu);
  };

  function positionMenu() {
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const menuWidth = Math.min(270, window.innerWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - menuWidth - margin)
    );
    menu.style.width = `${menuWidth}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.min(
      rect.bottom + margin,
      window.innerHeight - menu.offsetHeight - margin
    )}px`;
  }

  const onClick = event => {
    event.preventDefault();
    event.stopPropagation();
    const item = event.target.closest('[data-drawing-tool]');
    if (item) {
      setOpen(false);
      onSelect?.({ type: 'drawing', value: item.dataset.drawingTool });
      return;
    }
    const study = event.target.closest('[data-study]');
    if (study) {
      setOpen(false);
      onSelect?.({ type: 'study', value: study.dataset.study });
      return;
    }
    setOpen(!menu.hidden);
  };

  const onButtonClick = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(menu.hidden);
  };

  const onDocumentPointerDown = event => {
    if (menu.hidden) return;
    if (event.target === button || menu.contains(event.target)) return;
    setOpen(false);
  };

  const onResize = () => {
    if (!menu.hidden) positionMenu();
  };

  button.addEventListener('click', onButtonClick);
  menu.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);

  return () => {
    button.removeEventListener('click', onButtonClick);
    menu.removeEventListener('click', onClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    menu.remove();
  };
}
