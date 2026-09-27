export function attachAtrMenu({anchor,onChange,getConfig}){
  if(!anchor)return{open:()=>{},close:()=>{},destroy:()=>{}};
  const menu=document.createElement('div');
  menu.className='rsi-config-menu';
  menu.hidden=true;
  menu.innerHTML=`
    <div class="rsi-config-head">
      <div><div class="rsi-config-title">Configurar ATR</div><div class="rsi-config-subtitle">Volatilidade do movimento</div></div>
      <button type="button" class="rsi-config-close" aria-label="Fechar configuração do ATR" title="Fechar">×</button>
    </div>
    <div class="rsi-config-section">
      <div class="rsi-config-section-title">CÁLCULO</div>
      <label class="rsi-config-field"><span>Período</span><input data-atr-period type="number" min="2" max="200" step="1" inputmode="numeric"></label>
      <label class="rsi-config-field"><span>Cor</span><input data-atr-color type="color"></label>
    </div>
    <div class="rsi-config-hint">ATR mede volatilidade; não indica direção.</div>`;
  document.body.appendChild(menu);

  const period=menu.querySelector('[data-atr-period]');
  const color=menu.querySelector('[data-atr-color]');
  const normalize=cfg=>({
    period:Math.max(2,Math.min(200,Math.floor(Number(cfg?.period)||14))),
    color:/^#[0-9a-fA-F]{6}$/.test(cfg?.color||'')?cfg.color:'#dbe4ee'
  });
  const sync=cfg=>{const c=normalize(cfg);period.value=c.period;color.value=c.color;};
  const emit=()=>onChange?.(normalize({period:period.value,color:color.value}));
  const position=()=>{
    const rect=anchor.getBoundingClientRect();
    const width=Math.min(270,innerWidth-16);
    const left=Math.max(8,Math.min(rect.left,innerWidth-width-8));
    menu.style.width=width+'px';
    menu.style.left=left+'px';
    menu.style.top=Math.min(rect.bottom+8,innerHeight-menu.offsetHeight-8)+'px';
  };
  const open=cfg=>{sync(cfg||getConfig?.()||{});menu.hidden=false;requestAnimationFrame(position);};
  const close=()=>{menu.hidden=true;};
  const onDocumentPointerDown=event=>{if(menu.hidden||event.target===anchor||menu.contains(event.target))return;close();};
  const onKeyDown=event=>{if(event.key==='Escape'&&!menu.hidden)close();};
  menu.addEventListener('change',emit);
  menu.addEventListener('input',emit);
  menu.querySelector('.rsi-config-close').addEventListener('click',close);
  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('pointerdown',onDocumentPointerDown);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  return{
    open,close,
    destroy:()=>{
      document.removeEventListener('keydown',onKeyDown);
      document.removeEventListener('pointerdown',onDocumentPointerDown);
      window.removeEventListener('resize',position);
      window.removeEventListener('scroll',position,true);
      menu.remove();
    }
  };
}
