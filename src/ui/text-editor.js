export function createTextEditor(){
  const dialog=document.createElement('dialog');
  dialog.className='text-editor-dialog';
  dialog.innerHTML=`
    <form method="dialog" class="text-editor-form">
      <div class="text-editor-title">Adicionar texto</div>
      <input class="text-editor-input" type="text" maxlength="120" autocomplete="off" placeholder="Digite sua anotação">
      <div class="text-editor-actions">
        <button type="button" data-action="cancel">Cancelar</button>
        <button type="submit" data-action="ok">Adicionar</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  const input=dialog.querySelector('.text-editor-input');
  const ok=dialog.querySelector('[data-action="ok"]');
  const cancel=dialog.querySelector('[data-action="cancel"]');

  return {
    open(initial=''){
      return new Promise(resolve=>{
        let done=false;
        const finish=value=>{
          if(done)return;
          done=true;
          dialog.close();
          resolve(value);
        };
        input.value=initial;
        const submit=event=>{event.preventDefault();finish(input.value.trim()||null)};
        const cancelIt=()=>finish(null);
        dialog.addEventListener('submit',submit,{once:true});
        dialog.addEventListener('cancel',event=>{event.preventDefault();cancelIt()},{once:true});
        cancel.addEventListener('click',cancelIt,{once:true});
        dialog.addEventListener('close',()=>finish(null),{once:true});
        if(typeof dialog.showModal==='function')dialog.showModal();
        else dialog.setAttribute('open','');
        requestAnimationFrame(()=>input.focus());
      });
    },
    destroy(){dialog.remove();}
  };
}
