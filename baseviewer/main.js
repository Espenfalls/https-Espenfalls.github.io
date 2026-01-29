import { createRandomCreature, genotypeToPhenotype } from "./genotype.js";
import { breed } from "./breed.js";

const grid = document.getElementById("grid");
const offspringEl = document.getElementById("offspring");
const spawnBtn = document.getElementById("spawn");
const breedBtn = document.getElementById("breedBtn");

let creatures = [];
let selected = [];

function renderCreatureCard(creature) {
  const phen = genotypeToPhenotype(creature);
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = creature.id;
  card.innerHTML = `
    <div style="height:64px; display:flex; align-items:center; justify-content:center;">
      <div style="
        width:${phen.size === 'small' ? 32 : phen.size === 'medium' ? 48 : 64}px;
        height:${phen.size === 'small' ? 32 : phen.size === 'medium' ? 48 : 64}px;
        background:${phen.color};
        border-radius:12px;
        ${phen.pattern === 'striped' ? 'background-image: linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent); background-size:10px 10px;' : ''}
        ${phen.pattern === 'spotted' ? 'box-shadow: inset 0 0 0 8px rgba(255,255,255,0.12);' : ''}
      "></div>
    </div>
    <div style="font-size:12px; margin-top:4px;">
      <div>${phen.color} / ${phen.pattern} / ${phen.size}</div>
      <div style="font-size:11px; color:#666">gen ${creature.generation}</div>
    </div>
  `;
  card.addEventListener("click", () => toggleSelect(creature.id, card));
  return card;
}

function redrawGrid() {
  grid.innerHTML = "";
  for (const c of creatures) {
    grid.appendChild(renderCreatureCard(c));
  }
}

function toggleSelect(id, cardEl) {
  const idx = selected.indexOf(id);
  if (idx === -1) {
    if (selected.length >= 2) return; // only two parents
    selected.push(id);
    cardEl.style.outline = "3px solid #3b82f6";
  } else {
    selected.splice(idx,1);
    cardEl.style.outline = "none";
  }
  breedBtn.disabled = selected.length !== 2;
}

spawnBtn.addEventListener("click", () => {
  for (let i=0;i<6;i++) creatures.push(createRandomCreature());
  redrawGrid();
});

breedBtn.addEventListener("click", () => {
  const [aId, bId] = selected;
  const parentA = creatures.find(c => c.id === aId);
  const parentB = creatures.find(c => c.id === bId);
  if (!parentA || !parentB) return;
  const child = breed(parentA, parentB);
  creatures.push(child);
  const card = renderCreatureCard(child);
  offspringEl.innerHTML = "";
  offspringEl.appendChild(card);
  // clear selection
  selected = [];
  redrawGrid();
  breedBtn.disabled = true;
});

// initial spawn
spawnBtn.click();
