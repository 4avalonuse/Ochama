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
      <span>1. Escolha o tipo.</span>
      <span>2. Toque no início do movimento.</span>
      <span>3. Arraste até o fim.</span>
      <small>Retração mostra níveis dentro do movimento. Extensão projeta níveis acima de 100% para possíveis alvos.</small>
    </div>
  `;

  button.parentElement?.appendChild(menu);
  let mode = 'retracement';

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

  const toggle = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(menu.hidden);
  };

  const onDocumentPointerDown = event => {
    if (menu.hidden) return;
    if (event.target === button || menu.contains(event.target)) return;
    setOpen(false);
  };

  const onMenuClick = event => {
    const modeButton = event.target.closest('[data-fib-mode]');
    if (!modeButton) return;
    event.preventDefault();
    event.stopPropagation();
    setMode(modeButton.dataset.fibMode);
    setOpen(false);
    onActivate?.();
  };

  button.addEventListener('click', toggle);
  button.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    toggle(event);
  });
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('pointerdown', onDocumentPointerDown);

  setMode(mode);

  return () => {
    button.removeEventListener('click', toggle);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    menu.remove();
  };
}
