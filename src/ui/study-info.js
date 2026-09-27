export function createStudyInfo(){
  const overlay=document.createElement('div');
  overlay.className='study-info-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <div class="study-info-card" role="dialog" aria-modal="true" aria-labelledby="study-info-title">
      <div class="study-info-head">
        <div>
          <div class="study-info-title" id="study-info-title"></div>
          <div class="study-info-subtitle">Sobre este indicador</div>
        </div>
        <button type="button" class="study-info-close" aria-label="Fechar informação">×</button>
      </div>
      <div class="study-info-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const title=overlay.querySelector('.study-info-title');
  const body=overlay.querySelector('.study-info-body');
  const closeButton=overlay.querySelector('.study-info-close');

  const close=()=>{ overlay.hidden=true; };
  const open=({title:infoTitle,text})=>{
    title.textContent=infoTitle||'Indicador';
    body.textContent=text||'Informação não disponível.';
    overlay.hidden=false;
    requestAnimationFrame(()=>closeButton.focus({preventScroll:true}));
  };
  const onOverlayPointerDown=event=>{ if(event.target===overlay) close(); };
  const onKeyDown=event=>{ if(event.key==='Escape'&&!overlay.hidden) close(); };

  closeButton.addEventListener('click',close);
  overlay.addEventListener('pointerdown',onOverlayPointerDown);
  document.addEventListener('keydown',onKeyDown);

  return {
    open,
    close,
    destroy:()=>{
      closeButton.removeEventListener('click',close);
      overlay.removeEventListener('pointerdown',onOverlayPointerDown);
      document.removeEventListener('keydown',onKeyDown);
      overlay.remove();
    }
  };
}
