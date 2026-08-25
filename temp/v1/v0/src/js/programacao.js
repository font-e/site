import { updateNavPhysics } from './nav.js';

export function loadProgramacao() {
  return fetch('programacao.json')
    .then(response => { 
      if (!response.ok) throw new Error('CORS/File Error'); 
      return response.json(); 
    })
    .then(data => renderProgramacao(data))
    .catch(err => { 
      console.warn('Erro carregando programacao.json:', err); 
    });
}

function renderProgramacao(data) {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = '';
  let currentRow = 1;
  
  // Mapeamento dinâmico do top sticky para a subseção 'PROGRAMAÇÃO'
  const progSubHeaderTop = `calc(var(--logo-bottom-offset) + 1 * var(--h-menu) + 0 * var(--menu-gap))`;

  data.forEach((group, groupIdx) => {
    const totalEvents = group.events.length;

    const subHeader = document.createElement('div');
    subHeader.className = 'sub-header';
    subHeader.style.gridRow = `${currentRow} / span ${totalEvents}`;
    subHeader.innerHTML = `<div class="sub-header-inner" style="top: ${progSubHeaderTop};">${group.subsection}</div>`;
    container.appendChild(subHeader);

    group.events.forEach((event, eventIdx) => {
      const eventRow = currentRow + eventIdx;
      const eventId = `prog-${groupIdx}-${eventIdx}`;

      const textBox = document.createElement('div');
      textBox.className = 'text-box';
      textBox.style.gridRow = `${eventRow}`;
      textBox.dataset.event = eventId;
      textBox.innerHTML = `
        <div class="text-meta"><span>${event.category}</span><span>${event.date}</span></div>
        <h3 class="text-title">${event.title}</h3>
        <p class="text-desc">${event.desc}</p>
        <div class="expand-wrapper"><div class="expand-content"><p class="text-desc">${event.content}</p></div></div>
        <button class="btn-plus" aria-label="Expandir">+</button>
      `;

      const imgCol = document.createElement('div');
      imgCol.className = 'img-col';
      imgCol.style.gridRow = `${eventRow}`;
      imgCol.dataset.event = eventId;
      imgCol.innerHTML = `<img src="${event.url}" alt="${event.title}">`;

      container.appendChild(textBox);
      container.appendChild(imgCol);
    });
    currentRow += totalEvents;
  });
  
  attachInteractions();
  updateNavPhysics();
}

function attachInteractions() {
  document.querySelectorAll('[data-event]').forEach(el => {
    el.onmouseenter = function() {
      const id = this.dataset.event;
      document.querySelectorAll(`[data-event="${id}"]`).forEach(item => item.classList.add('row-hover'));
    };
    el.onmouseleave = function() {
      const id = this.dataset.event;
      document.querySelectorAll(`[data-event="${id}"]`).forEach(item => item.classList.remove('row-hover'));
    };
  });

  document.querySelectorAll('.btn-plus').forEach(button => {
    button.onclick = function(e) {
      e.stopPropagation();
      const card = this.closest('.text-box');
      if (!card) return;
      const id = card.dataset.event;
      const expandWrappers = card.querySelectorAll('.expand-wrapper');
      const relatedElements = id ? document.querySelectorAll(`[data-event="${id}"]`) : [card];
      const isOpening = !expandWrappers[0].classList.contains('open');

      expandWrappers.forEach(w => isOpening ? w.classList.add('open') : w.classList.remove('open'));
      this.textContent = isOpening ? '−' : '+';
      relatedElements.forEach(el => isOpening ? el.classList.add('active-bg') : el.classList.remove('active-bg'));
      
      setTimeout(() => {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        updateNavPhysics();
      }, 350);
    };
  });
}
