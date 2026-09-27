export function createTextEditor(){
  const overlay=document.createElement('div');
  overlay.className='text-editor-overlay';
  overlay.innerHTML=`
    <div class="text-editor-panel" role="dialog" aria-modal="true">
      <div class="text-editor-title">Adicionar texto</div>
      <input class="text-editor-input" type="text" inputmode="text" enterkeyhint="done" autocapitalize="sentences" autocomplete="off" maxlength="120" placeholder="Digite sua anotação">
      <div class="text-editor-actions">
        <button type="button" data-action="cancel">Cancelar</button>
        <button type="button" data-action="ok">Adicionar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input=overlay.querySelector('.text-editor-input');
  const ok=overlay.querySelector('[data-action="ok"]');
  const cancel=overlay.querySelector('[data-action="cancel"]');
  let resolveCurrent=null;

  const close=value=>{
    overlay.classList.remove('is-open');
    if(resolveCurrent){
      const resolve=resolveCurrent;
      resolveCurrent=null;
      resolve(value);
    }
  };

  ok.addEventListener('click',()=>close(input.value.trim()||null));
  cancel.addEventListener('click',()=>close(null));
  overlay.addEventListener('pointerdown',event=>{
    if(event.target===overlay) close(null);
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      close(input.value.trim()||null);
    }
    if(event.key==='Escape'){
      event.preventDefault();
      close(null);
    }
  });

  return {
    open(initial=''){
      if(resolveCurrent) close(null);
      input.value=initial;
      overlay.classList.add('is-open');
      return new Promise(resolve=>{
        resolveCurrent=resolve;
        input.focus({preventScroll:true});
        requestAnimationFrame(()=>{
          if(document.activeElement!==input) input.focus({preventScroll:true});
          input.select();
        });
      });
    },
    destroy(){
      if(resolveCurrent) close(null);
      overlay.remove();
    }
  };
}
