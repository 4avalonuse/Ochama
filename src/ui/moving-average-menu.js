import { MOVING_AVERAGE_SOURCES, MOVING_AVERAGE_TYPES, normalizeMovingAverage } from '../indicators/moving-average.js';

function optionMarkup(items){
  return items.map(item=>`<option value="${item.value}">${item.label}</option>`).join('');
}

export function attachMovingAverageMenu({button,onChange}){
  if(!button) return ()=>{};

  const menu=document.createElement('div');
  menu.className='moving-average-menu';
  menu.hidden=true;
  menu.innerHTML=`
    <div class="moving-average-title">Médias móveis</div>
    <div class="moving-average-form">
      <label>Tipo<select data-ma-type>${optionMarkup(MOVING_AVERAGE_TYPES)}</select></label>
      <label>Período<input data-ma-period type="number" min="1" max="5000" step="1" value="20" inputmode="numeric"></label>
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
  let items=[];

  function emit(){
    onChange?.(items.map(item=>({...item})));
  }

  function renderList(){
    list.replaceChildren();
    if(!items.length){
      const empty=document.createElement('div');
      empty.className='moving-average-empty';
      empty.textContent='Nenhuma média adicionada';
      list.appendChild(empty);
      return;
    }

    for(const item of items){
      const row=document.createElement('div');
      row.className='moving-average-item';
      row.innerHTML=`
        <span>${item.label}</span>
        <button type="button" aria-label="Remover ${item.label}" data-ma-remove="${item.id}">×</button>
      `;
      list.appendChild(row);
    }
  }

  function add(){
    const period=Math.max(1,Math.min(5000,Math.trunc(Number(periodInput.value)||20)));
    periodInput.value=String(period);
    const item=normalizeMovingAverage({
      type:typeInput.value,
      period,
      source:sourceInput.value
    });
    items.push(item);
    renderList();
    emit();
  }

  function remove(id){
    items=items.filter(item=>item.id!==id);
    renderList();
    emit();
  }

  function toggle(event){
    event.stopPropagation();
    menu.hidden=!menu.hidden;
  }

  function onDocumentPointerDown(event){
    if(menu.hidden) return;
    if(event.target===button||menu.contains(event.target)) return;
    menu.hidden=true;
  }

  button.addEventListener('click',toggle);
  addButton.addEventListener('click',add);
  list.addEventListener('click',event=>{
    const id=event.target.closest('[data-ma-remove]')?.dataset.maRemove;
    if(id) remove(id);
  });
  document.addEventListener('pointerdown',onDocumentPointerDown);

  renderList();

  return ()=>{
    button.removeEventListener('click',toggle);
    addButton.removeEventListener('click',add);
    document.removeEventListener('pointerdown',onDocumentPointerDown);
    menu.remove();
  };
}
