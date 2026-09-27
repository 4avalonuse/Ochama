export function attachFibonacciMenu({ button, onActivate, onModeChange }) {
  if (!button) return () => {};

  const menu = document.createElement('div');
  menu.className = 'fibonacci-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="fibonacci-title">Modo Fibonacci</div>
    <div class="fibonacci-subtitle">Escolha o cálculo e desenhe</div>
    <div class="fibonacci-modes">
      <button type="button" data-fib-mode="retracement" class="is-active"><strong>RETRAÇÃO</strong><small>Correção do movimento</small></button>
      <button type="button" data-fib-mode="extension"><strong>EXTENSÃO</strong><small>Projeção além de 100%</small></button>
    </div>
    <div class="fibonacci-help">
      <span><b>1</b> toque no início</span>
      <span><b>2</b> arraste até o fim</span>
    </div>
  `;

  // O menu fica fora da toolbar para não ser cortado pelo overflow horizontal
  // usado no celular.
  document.body.appendChild(menu);

  let mode = 'retracement';
  let longPressTimer = null;
  let suppressNextClick = false;

  const positionMenu = () => {
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const menuWidth = Math.min(248, window.innerWidth - margin * 2);
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
  };

  const setOpen = open => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(positionMenu);
  };

  const setMode = next => {
    mode = next === 'extension' ? 'extension' : 'retracement';
    menu.querySelectorAll('[data-fib-mode]').forEach(item => {
      item.classList.toggle('is-active', item.dataset.fibMode === mode);
    });
    onModeChange?.(mode);
  };

  const activate = () => {
    setOpen(false);
    onActivate?.();
  };

  const toggleMenu = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(menu.hidden);
  };

  const onClick = event => {
    event.preventDefault();
    event.stopPropagation();

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    // Toque curto = Fibonacci imediatamente.
    activate();
  };

  const onPointerDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    longPressTimer = window.setTimeout(() => {
      longPressTimer = null;
      suppressNextClick = true;
      setOpen(true);
    }, 550);
  };

  const cancelLongPress = () => {
    if (!longPressTimer) return;
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  const onContextMenu = event => {
    event.preventDefault();
    event.stopPropagation();
    cancelLongPress();
    suppressNextClick = true;
    setOpen(true);
  };

  const onMenuClick = event => {
    const modeButton = event.target.closest('[data-fib-mode]');
    if (!modeButton) return;
    event.preventDefault();
    event.stopPropagation();
    setMode(modeButton.dataset.fibMode);
    activate();
  };

  const onDocumentPointerDown = event => {
    if (menu.hidden) return;
    if (event.target === button || menu.contains(event.target)) return;
    setOpen(false);
  };

  const onResize = () => {
    if (!menu.hidden) positionMenu();
  };

  button.addEventListener('click', onClick);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', cancelLongPress);
  button.addEventListener('pointercancel', cancelLongPress);
  button.addEventListener('pointerleave', cancelLongPress);
  button.addEventListener('contextmenu', onContextMenu);
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);

  setMode(mode);

  return () => {
    cancelLongPress();
    button.removeEventListener('click', onClick);
    button.removeEventListener('pointerdown', onPointerDown);
    button.removeEventListener('pointerup', cancelLongPress);
    button.removeEventListener('pointercancel', cancelLongPress);
    button.removeEventListener('pointerleave', cancelLongPress);
    button.removeEventListener('contextmenu', onContextMenu);
    menu.removeEventListener('click', onMenuClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    menu.remove();
  };
}
