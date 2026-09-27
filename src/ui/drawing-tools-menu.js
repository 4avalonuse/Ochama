export function attachDrawingToolsMenu({ button, onSelect, onStudyLongPress }) {
  if (!button) return () => {};

  const menu = document.createElement('div');
  menu.className = 'drawing-tools-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="drawing-tools-title">Ferramentas</div>
    <div class="drawing-tools-section">ESTUDOS</div>
    <button type="button" data-study="rsi">
      <span class="drawing-tools-icon">RSI</span>
      <span><strong>RSI 14</strong><small>Força relativa · painel inferior</small></span>
    </button>
    <button type="button" data-study="volume">
      <span class="drawing-tools-icon">VOL</span>
      <span><strong>Volume</strong><small>Fluxo negociado · painel inferior</small></span>
    </button>
    <button type="button" data-study="macd">
      <span class="drawing-tools-icon">MACD</span>
      <span><strong>MACD</strong><small>Tendência e momentum · painel inferior</small></span>
    </button>
    <button type="button" data-study="bollinger">
      <span class="drawing-tools-icon">BB</span>
      <span><strong>Bollinger</strong><small>Volatilidade · sobre o preço</small></span>
    </button>
    <button type="button" data-study="atr">
      <span class="drawing-tools-icon">ATR</span>
      <span><strong>ATR 14</strong><small>Volatilidade · painel inferior</small></span>
    </button>
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

  let studyLongPressTimer = null;
  let studyLongPressed = false;

  const clearStudyLongPress = () => {
    if (studyLongPressTimer) {
      clearTimeout(studyLongPressTimer);
      studyLongPressTimer = null;
    }
  };

  const onStudyPointerDown = event => {
    const study = event.target.closest('[data-study]');
    if (!study) return;
    studyLongPressed = false;
    clearStudyLongPress();
    studyLongPressTimer = setTimeout(() => {
      studyLongPressed = true;
      setOpen(false);
      onStudyLongPress?.({ type: 'study', value: study.dataset.study });
    }, 550);
  };

  const onStudyPointerUp = () => {
    clearStudyLongPress();
  };

  const onClick = event => {
    event.preventDefault();
    event.stopPropagation();
    const item = event.target.closest('[data-drawing-tool]');
    const study = event.target.closest('[data-study]');
    if (item || study) {
      clearStudyLongPress();
      if (studyLongPressed) {
        studyLongPressed = false;
        return;
      }
      setOpen(false);
      onSelect?.(item ? item.dataset.drawingTool : { type: 'study', value: study.dataset.study });
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
  menu.addEventListener('pointerdown', onStudyPointerDown);
  menu.addEventListener('pointerup', onStudyPointerUp);
  menu.addEventListener('pointercancel', onStudyPointerUp);
  menu.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);

  return () => {
    button.removeEventListener('click', onButtonClick);
    clearStudyLongPress();
    menu.removeEventListener('pointerdown', onStudyPointerDown);
    menu.removeEventListener('pointerup', onStudyPointerUp);
    menu.removeEventListener('pointercancel', onStudyPointerUp);
    menu.removeEventListener('click', onClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    menu.remove();
  };
}
