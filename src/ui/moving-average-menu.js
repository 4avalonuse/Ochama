import { MOVING_AVERAGE_SOURCES, MOVING_AVERAGE_TYPES, normalizeMovingAverage } from '../indicators/moving-average.js';

function optionMarkup(items){
  return items.map(item=>`<option value="${item.value}">${item.label}</option>`).join('');
}

const DEFAULTS=[
  {type:'sma',period:13,source:'close',color:'#f59e0b'},
  {type:'ema',period:55,source:'close',color:'#a78bfa'},
  // 377/2 = 188.5; período de MA é inteiro, então usamos 189 (arredondamento).
  {type:'sma',period:189,source:'close',color:'#22d3ee'}
];

export function attachMovingAverageMenu({button,onChange}){
  if(!button) return ()=>{};

  const menu=document.createElement('div');
  menu.className='moving-average-menu';
  menu.hidden=true;
  menu.innerHTML=`
    <div class="moving-average-title">Médias móveis</div>
    <div class="moving-average-form">
      <label>Tipo<select data-ma-type>${optionMarkup(MOVING_AVERAGE_TYPES)}</select></label>
      <label>Período<input data-ma-period type="number" min="1" max="5000" step="1" value="21" inputmode="numeric"></label>
      <label>Fonte<select data-ma-source>${optionMarkup(MOVING_AVERAGE_SOURCES)}</select></label>
      <button type="button" data-ma-add>ADICIONAR</button>
    </div>
    <div class="moving-average-list" data-ma-list></div>
  `;

  button.parentElement?.appendChild(menu);

  const typeInput=menu.querySelector('[data-ma-type]');
  const periodInput=menu.querySelector('[data-ma-period]');
  const sourceInput=menu.querySelector('[data-ma-source]');
  const addButton=menu.querySelector('[data-ma-add]');
  const list=menu.querySelector('[data-ma-list]');
  let items=DEFAULTS.map(item=>normalizeMovingAverage(item));
  let longPressTimer=null;
  let suppressClick=false;

  function emit(){ onChange?.(items.map(item=>({...item}))); }

  function renderList(){
    list.replaceChildren();
    for(const item of items){
      const row=document.createElement('div');
      row.className='moving-average-item';
      row.dataset.maId=item.id;
      row.innerHTML=`
        <select data-ma-item-type aria-label="Tipo ${item.label}">${optionMarkup(MOVING_AVERAGE_TYPES)}</select>
        <input data-ma-item-period type="number" min="1" max="5000" value="${item.period}" aria-label="Período ${item.label}">
        <select data-ma-item-source aria-label="Fonte ${item.label}">${optionMarkup(MOVING_AVERAGE_SOURCES)}</select>
        <input class="moving-average-color" data-ma-item-color type="color" value="${item.color}" aria-label="Cor ${item.label}">
        <button type="button" class="moving-average-visibility" data-ma-toggle aria-label="${item.visible?'Ocultar':'Mostrar'} ${item.label}" title="${item.visible?'Ocultar':'Mostrar'}">${item.visible?'◉':'○'}</button>
        <button type="button" class="moving-average-remove" aria-label="Remover ${item.label}" data-ma-remove>×</button>
      `;
      row.querySelector('[data-ma-item-type]').value=item.type;
      row.querySelector('[data-ma-item-source]').value=item.source;
      row.querySelector('[data-ma-item-period]').value=String(item.period);
      list.appendChild(row);
    }
  }

  function update(id,patch){
    items=items.map(item=>item.id===id?normalizeMovingAverage({...item,...patch,id:item.id}):item);
    renderList();
    emit();
  }

  function add(){
    const period=Math.max(1,Math.min(5000,Math.trunc(Number(periodInput.value)||21)));
    const item=normalizeMovingAverage({type:typeInput.value,period,source:sourceInput.value,color:'#4ade80'});
    items.push(item);
    renderList();
    emit();
  }

  function remove(id){
    items=items.filter(item=>item.id!==id);
    renderList();
    emit();
  }

  function setOpen(open){
    menu.hidden=!open;
    button.setAttribute('aria-expanded',String(open));
  }

  function toggleVisibility(){
    const anyVisible=items.some(item=>item.visible);
    items=items.map(item=>({...item,visible:!anyVisible}));
    renderList();
    emit();
    button.setAttribute('aria-label',anyVisible?'Mostrar médias':'Ocultar médias');
    button.title=anyVisible?'Mostrar médias':'Ocultar médias';
  }

  function onButtonClick(event){
    event.stopPropagation();
    if(suppressClick){
      suppressClick=false;
      return;
    }
    toggleVisibility();
  }

  function onButtonPointerDown(event){
    if(event.pointerType==='mouse' && event.button!==0) return;
    longPressTimer=window.setTimeout(()=>{
      longPressTimer=null;
      suppressClick=true;
      setOpen(true);
    },550);
  }

  function onButtonPointerUp(){
    if(longPressTimer){
      window.clearTimeout(longPressTimer);
      longPressTimer=null;
    }
  }

  function onDocumentPointerDown(event){
    if(menu.hidden) return;
    if(event.target===button||menu.contains(event.target)) return;
    setOpen(false);
  }

  button.addEventListener('click',onButtonClick);
  button.addEventListener('pointerdown',onButtonPointerDown);
  button.addEventListener('pointerup',onButtonPointerUp);
  button.addEventListener('pointercancel',onButtonPointerUp);
  addButton.addEventListener('click',add);
  list.addEventListener('change',event=>{
    const row=event.target.closest('[data-ma-id]');
    if(!row) return;
    const id=row.dataset.maId;
    if(event.target.matches('[data-ma-item-type]')) update(id,{type:event.target.value});
    if(event.target.matches('[data-ma-item-period]')) update(id,{period:event.target.value});
    if(event.target.matches('[data-ma-item-source]')) update(id,{source:event.target.value});
    if(event.target.matches('[data-ma-item-color]')) update(id,{color:event.target.value});
  });
  list.addEventListener('click',event=>{
    const row=event.target.closest('[data-ma-id]');
    if(!row) return;
    if(event.target.matches('[data-ma-remove]')) remove(row.dataset.maId);
    if(event.target.matches('[data-ma-toggle]')){
      const item=items.find(item=>item.id===row.dataset.maId);
      if(item) update(item.id,{visible:!item.visible});
    }
  });
  document.addEventListener('pointerdown',onDocumentPointerDown);

  renderList();
  emit();
  button.setAttribute('aria-label','Ocultar médias');
  button.title='Ocultar médias';

  return ()=>{
    button.removeEventListener('click',onButtonClick);
    button.removeEventListener('pointerdown',onButtonPointerDown);
    button.removeEventListener('pointerup',onButtonPointerUp);
    button.removeEventListener('pointercancel',onButtonPointerUp);
    if(longPressTimer) window.clearTimeout(longPressTimer);
    addButton.removeEventListener('click',add);
    document.removeEventListener('pointerdown',onDocumentPointerDown);
    menu.remove();
  };
}
