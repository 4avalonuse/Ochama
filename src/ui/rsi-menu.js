export function attachRsiMenu({anchor,onChange,getConfig}){
  if(!anchor) return {open:()=>{},close:()=>{},destroy:()=>{}};

  const menu=document.createElement('div');
  menu.className='rsi-config-menu';
  menu.hidden=true;
  menu.innerHTML=`
    <div class="rsi-config-head">
      <div>
        <div class="rsi-config-title">Configurar RSI</div>
        <div class="rsi-config-subtitle">Cálculo e níveis do indicador</div>
      </div>
      <button type="button" class="rsi-config-close" aria-label="Fechar configuração do RSI" title="Fechar">×</button>
    </div>
    <div class="rsi-config-section">
      <div class="rsi-config-section-title">CÁLCULO</div>
      <label class="rsi-config-field">
        <span>Período</span>
        <input data-rsi-period type="number" min="2" max="100" step="1" inputmode="numeric">
      </label>
    </div>
    <div class="rsi-config-section">
      <div class="rsi-config-section-title">NÍVEIS</div>
      <label class="rsi-config-field">
        <span>Sobrecomprado</span>
        <input data-rsi-high type="number" min="0" max="100" step="1" inputmode="numeric">
      </label>
      <label class="rsi-config-field">
        <span>Neutro</span>
        <input data-rsi-mid type="number" min="0" max="100" step="1" inputmode="numeric">
      </label>
      <label class="rsi-config-field">
        <span>Sobrevendido</span>
        <input data-rsi-low type="number" min="0" max="100" step="1" inputmode="numeric">
      </label>
    </div>
    <div class="rsi-config-section rsi-config-color-section">
      <div class="rsi-config-section-title">LINHA</div>
      <label class="rsi-config-field rsi-config-color-field">
        <span>Cor</span>
        <input data-rsi-color type="color">
      </label>
    </div>
    <div class="rsi-config-hint">Toque fora para fechar</div>
  `;
  document.body.appendChild(menu);

  const fields={
    period:menu.querySelector('[data-rsi-period]'),
    levelLow:menu.querySelector('[data-rsi-low]'),
    levelMid:menu.querySelector('[data-rsi-mid]'),
    levelHigh:menu.querySelector('[data-rsi-high]'),
    color:menu.querySelector('[data-rsi-color]')
  };

  const normalize=cfg=>({
    period:Math.max(2,Math.min(100,Math.floor(Number(cfg?.period)||14))),
    levelLow:Math.max(0,Math.min(100,Number.isFinite(Number(cfg?.levelLow))?Number(cfg.levelLow):30)),
    levelMid:Math.max(0,Math.min(100,Number.isFinite(Number(cfg?.levelMid))?Number(cfg.levelMid):50)),
    levelHigh:Math.max(0,Math.min(100,Number.isFinite(Number(cfg?.levelHigh))?Number(cfg.levelHigh):70)),
    color:cfg?.color||'#dbe4ee'
  });

  const sync=cfg=>{
    const c=normalize(cfg);
    fields.period.value=c.period;
    fields.levelLow.value=c.levelLow;
    fields.levelMid.value=c.levelMid;
    fields.levelHigh.value=c.levelHigh;
    fields.color.value=c.color;
  };

  const emit=()=>onChange?.(normalize({
    period:fields.period.value,
    levelLow:fields.levelLow.value,
    levelMid:fields.levelMid.value,
    levelHigh:fields.levelHigh.value,
    color:fields.color.value
  }));

  const position=()=>{
    const r=anchor.getBoundingClientRect();
    const w=Math.min(250,innerWidth-16);
    const left=Math.max(8,Math.min(r.left,innerWidth-w-8));
    menu.style.width=w+'px';
    menu.style.left=left+'px';
    menu.style.top=Math.min(r.bottom+8,innerHeight-menu.offsetHeight-8)+'px';
  };

  const open=cfg=>{
    sync(cfg||getConfig?.()||{});
    menu.hidden=false;
    requestAnimationFrame(position);
  };

  const close=()=>{
    menu.hidden=true;
  };

  const toggle=cfg=>{
    if(menu.hidden) open(cfg);
    else close();
  };

  const onDocumentPointerDown=event=>{
    if(menu.hidden||event.target===anchor||menu.contains(event.target)) return;
    close();
  };

  menu.addEventListener('change',emit);
  menu.querySelector('.rsi-config-close').addEventListener('click',close);
  const onKeyDown=event=>{
    if(event.key==='Escape' && !menu.hidden) close();
  };
  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('pointerdown',onDocumentPointerDown);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);

  return {
    open,
    close,
    toggle,
    destroy:()=>{
      document.removeEventListener('keydown',onKeyDown);
      document.removeEventListener('pointerdown',onDocumentPointerDown);
      window.removeEventListener('resize',position);
      window.removeEventListener('scroll',position,true);
      menu.remove();
    }
  };
}
