export function attachChartControls({
  assetButton,
  assetMenu,
  settingsButton,
  settingsMenu,
  touchToggle,
  logButton,
  logPanel,
  intervalRoot,
  datasets,
  state,
  onAssetChange,
  onIntervalChange,
  onTouchChange,
  onLogChange
}) {
  function closeMenus() {
    assetMenu.hidden = true;
    settingsMenu.hidden = true;
    assetButton.setAttribute('aria-expanded', 'false');
    settingsButton.setAttribute('aria-expanded', 'false');
  }

  function renderAssets() {
    const symbols = [...new Map(
      datasets
        .filter(d => d?.provider && d?.symbol)
        .map(d => [`${d.provider}:${d.symbol}`, d])
    ).values()];

    assetMenu.replaceChildren(...symbols.map(d => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = d.symbol;
      button.classList.toggle('active', d.symbol === state.symbol);
      button.addEventListener('click', () => {
        closeMenus();
        onAssetChange?.(d);
      });
      return button;
    }));
  }

  function syncIntervals() {
    const available = new Set(
      datasets
        .filter(d => d?.provider === state.provider && d?.symbol === state.symbol)
        .map(d => d.interval)
    );
    intervalRoot.querySelectorAll('[data-interval]').forEach(button => {
      const enabled = available.has(button.dataset.interval);
      button.disabled = !enabled;
      button.hidden = false;
      button.classList.toggle('active', button.dataset.interval === state.interval);
      button.title = enabled ? `Intervalo ${button.dataset.interval}` : 'Dados não disponíveis';
    });
  }

  assetButton.addEventListener('click', () => {
    const opening = assetMenu.hidden;
    closeMenus();
    assetMenu.hidden = !opening;
    assetButton.setAttribute('aria-expanded', String(!opening));
  });

  settingsButton.addEventListener('click', () => {
    const opening = settingsMenu.hidden;
    closeMenus();
    settingsMenu.hidden = !opening;
    settingsButton.setAttribute('aria-expanded', String(!opening));
  });

  intervalRoot.addEventListener('click', event => {
    const button = event.target.closest('[data-interval]');
    if (!button || button.disabled) return;
    onIntervalChange?.(button.dataset.interval);
  });

  touchToggle.addEventListener('change', () => onTouchChange?.(touchToggle.checked));
  logButton.addEventListener('click', () => {
    const opening = logPanel.hidden;
    logPanel.hidden = !opening;
    logButton.setAttribute('aria-expanded', String(!opening));
    onLogChange?.(!opening);
  });

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.chart-identity,.chart-tools')) closeMenus();
  });

  renderAssets();
  syncIntervals();

  return {
    sync() {
      assetButton.textContent = state.symbol;
      renderAssets();
      syncIntervals();
    },
    setTouchEnabled(enabled) {
      touchToggle.checked = enabled;
    }
  };
}
