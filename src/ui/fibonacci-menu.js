export function attachFibonacciMenu({ button, onActivate, onModeChange }) {
  if (!button) return () => {};

  const menu = document.createElement('div');
  menu.className = 'fibonacci-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="fibonacci-title">Fibonacci</div>
    <div class="fibonacci-modes">
      <button type="button" data-fib-mode="retracement" class="is-active">RETRAÇÃO</button>
      <button type="button" data-fib-mode="extension">EXTENSÃO</button>
    </div>
    <div class="fibonacci-help">
      <strong>Como usar</strong>
      <span>1. Escolha retração ou extensão.</span>
      <span>2. Toque no início do movimento.</span>
      <span>3. Arraste até o fim do movimento.</span>
      <small>Retração ajuda a localizar possíveis suportes e resistências. Extensão projeta níveis além de 100% para possíveis alvos.</small>
    </div>
  `;

  button.parentElement?.appendChild(menu);
  let mode = 'retracement';
  let longPressTimer = null;
  let longPress = false;

  const setOpen = open => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  const setMode = next => {
    mode = next === 'extension' ? 'extension' : 'retracement';
    menu.querySelectorAll('[data-fib-mode]').forEach(item => {
      item.classList.toggle('is-active', item.dataset.fibMode === mode);
    });
    onModeChange?.(mode);
  };

  const activate = event => {
    event?.preventDefault?.();
    setOpen(false);
    onActivate?.();
  };

  const startLongPress = event => {
    if (event.pointerType === 'mouse') return;
    longPress = false;
    window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      longPress = true;
      setOpen(true);
    }, 520);
  };

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  const finishPointer = event => {
    cancelLongPress();
    if (longPress) {
      event.preventDefault();
      longPress = false;
      return;
    }
    activate(event);
  };

  const onMouseClick = event => {
    if (event.detail > 0) activate(event);
  };

  const onDocumentPointerDown = event => {
    if (menu.hidden) return;
    if (event.target === button || menu.contains(event.target)) return;
    setOpen(false);
  };

  button.addEventListener('pointerdown', startLongPress);
  button.addEventListener('pointerup', finishPointer);
  button.addEventListener('pointercancel', cancelLongPress);
  button.addEventListener('pointerleave', cancelLongPress);
  button.addEventListener('click', onMouseClick);

  menu.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-fib-mode]');
    if (!modeButton) return;
    setMode(modeButton.dataset.fibMode);
    setOpen(false);
    onActivate?.();
  });

  button.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate(event);
  });

  document.addEventListener('pointerdown', onDocumentPointerDown);
  setMode(mode);

  return () => {
    cancelLongPress();
    button.removeEventListener('pointerdown', startLongPress);
    button.removeEventListener('pointerup', finishPointer);
    button.removeEventListener('pointercancel', cancelLongPress);
    button.removeEventListener('pointerleave', cancelLongPress);
    button.removeEventListener('click', onMouseClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    menu.remove();
  };
}
