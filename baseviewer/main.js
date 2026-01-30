import { schema, createParentFromPhenotype, createRandomParent, genotypeToPhenotype } from "./genotype.js";
import { breed } from "./breed.js";

/*
  Layering/main UI glue.
  - Expects assets in ./assets/
  - Layer order (bottom->top): base, skin, eyes, horns, hooves, mut1, mut2, mut3
*/

// ----- asset map (adjust filenames to your assets) -----
const assetMap = {
  base: {
    tan: "base_tan.png",
    brown: "base_brown.png",
    black: "base_black.png",
    white: "base_white.png",
    gold: "base_gold.png"
  },
  skin: {
    plain: "skin_plain.png",
    freckled: "skin_freckled.png",
    scarred: "skin_scarred.png",
    pale: "skin_pale.png",
    dark: "skin_dark.png"
  },
  eyes: {
    brown: "eyes_brown.png",
    blue: "eyes_blue.png",
    green: "eyes_green.png",
    amber: "eyes_amber.png",
    heterochromia: "eyes_hetero.png"
  },
  horns: {
    none: "horns_none.png",
    small: "horns_small.png",
    curled: "horns_curled.png",
    long: "horns_long.png"
  },
  hooves: {
    black: "hooves_black.png",
    brown: "hooves_brown.png",
    white: "hooves_white.png",
    cloven: "hooves_cloven.png"
  },
  mut1: {
    none: "mut1_none.png",
    glow: "mut1_glow.png",
    stripe: "mut1_stripe.png"
  },
  mut2: {
    none: "mut2_none.png",
    patterned: "mut2_patterned.png",
    speckled: "mut2_speckled.png"
  },
  mut3: {
    none: "mut3_none.png",
    "extra-eye": "mut3_extraeye.png",
    "fused-mark": "mut3_fusedmark.png"
  }
};

const layerOrder = ["base", "skin", "eyes", "horns", "hooves", "mut1", "mut2", "mut3"];

// ----- DOM refs -----
const parentA_traits = document.getElementById("parentA-traits");
const parentB_traits = document.getElementById("parentB-traits");
const createA = document.getElementById("createA");
const createB = document.getElementById("createB");
const randomA = document.getElementById("randomA");
const randomB = document.getElementById("randomB");
const parentA_card = document.getElementById("parentA-card");
const parentB_card = document.getElementById("parentB-card");
const breedBtn = document.getElementById("breedBtn");
const offspringEl = document.getElementById("offspring");
const offspringCount = document.getElementById("offspringCount");

let parentA = null;
let parentB = null;

// ----- UI: build trait selectors based on schema -----
function makeTraitSelectors(container, side) {
  container.innerHTML = "";
  for (const locus of Object.keys(schema)) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = locus;
    const select = document.createElement("select");
    select.name = `${side}-${locus}`;
    for (const opt of schema[locus]) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    }
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    container.appendChild(wrapper);
  }
}

makeTraitSelectors(parentA_traits, "A");
makeTraitSelectors(parentB_traits, "B");

function readTraitsFrom(container, side) {
  const phenotype = {};
  for (const locus of Object.keys(schema)) {
    const sel = container.querySelector(`select[name="${side}-${locus}"]`);
    phenotype[locus] = sel ? sel.value : schema[locus][0];
  }
  return phenotype;
}

// ----- Asset preloading helper -----
function preloadAssetsForPhenotype(phenotype) {
  const files = layerOrder
    .map(locus => assetMap[locus]?.[phenotype[locus]])
    .filter(Boolean)
    .map(f => `./assets/${f}`);
  return Promise.all(files.map(p => new Promise(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = p;
  })));
}

// ----- Rendering using stacked <img> layers -----
function renderCreatureAsLayers(creature, containerEl) {
  // Use stored phenotype if present (stable visual), otherwise compute
  const phenotype = creature.phenotype ?? genotypeToPhenotype(creature);
  containerEl.innerHTML = "";
  const avatar = document.createElement("div");
  avatar.className = "avatar";

  for (const locus of layerOrder) {
    const value = phenotype[locus];
    const fname = assetMap[locus] && assetMap[locus][value];
    const img = document.createElement("img");
    img.className = "layer";
    img.alt = "";
    if (fname) img.src = `./assets/${fname}`;
    avatar.appendChild(img);
  }

  containerEl.appendChild(avatar);
}

// ----- Small card renderer fallback (if assets absent) -----
function renderCardTextFallback(creature, containerEl) {
  if (!creature) {
    containerEl.innerHTML = "<div class='muted small'>No parent created</div>";
    return;
  }
  const phen = creature.phenotype ?? genotypeToPhenotype(creature);
  containerEl.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div style="font-weight:600; margin-bottom:6px">gen ${creature.generation}</div>
    <div class="small">
      ${Object.keys(phen).map(k => `<div><strong>${k}:</strong> ${phen[k]}</div>`).join("")}
    </div>
  `;
  containerEl.appendChild(card);
}

// choose renderer depending on whether assets folder seems present
async function tryRenderCreature(creature, containerEl) {
  // choose asset-based render if any asset exists for the phenotype
  const phenotype = creature.phenotype ?? genotypeToPhenotype(creature);
  const anyAsset = layerOrder.some(locus => !!assetMap[locus]?.[phenotype[locus]]);
  if (!anyAsset) {
    renderCardTextFallback(creature, containerEl);
    return;
  }
  // preload then render
  await preloadAssetsForPhenotype(phenotype);
  renderCreatureAsLayers(creature, containerEl);
}

// ----- Parent create / random handlers -----
createA.addEventListener("click", async () => {
  const phenotype = readTraitsFrom(parentA_traits, "A");
  parentA = createParentFromPhenotype(phenotype);
  // compute and store child-consistent phenotype for parent (parent is homozygous so deterministic)
  parentA.phenotype = genotypeToPhenotype(parentA);
  await tryRenderCreature(parentA, parentA_card);
  updateBreedButtonState();
});

createB.addEventListener("click", async () => {
  const phenotype = readTraitsFrom(parentB_traits, "B");
  parentB = createParentFromPhenotype(phenotype);
  parentB.phenotype = genotypeToPhenotype(parentB);
  await tryRenderCreature(parentB, parentB_card);
  updateBreedButtonState();
});

randomA.addEventListener("click", async () => {
  parentA = createRandomParent();
  parentA.phenotype = genotypeToPhenotype(parentA);
  await tryRenderCreature(parentA, parentA_card);
  updateBreedButtonState();
});
randomB.addEventListener("click", async () => {
  parentB = createRandomParent();
  parentB.phenotype = genotypeToPhenotype(parentB);
  await tryRenderCreature(parentB, parentB_card);
  updateBreedButtonState();
});

function updateBreedButtonState() {
  breedBtn.disabled = !(parentA && parentB);
}

// ----- Breeding action -----
breedBtn.addEventListener("click", async () => {
  if (!parentA || !parentB) return;
  const n = Math.max(1, parseInt(offspringCount.value, 10) || 1);
  const kids = [];
  for (let i = 0; i < n; i++) {
    const child = breed(parentA, parentB);
    // compute and store phenotype once so visual is stable
    child.phenotype = genotypeToPhenotype(child);
    kids.push(child);
  }
  // Preload assets for all offspring in parallel, then render
  await Promise.all(kids.map(k => preloadAssetsForPhenotype(k.phenotype)));
  renderOffspring(kids);
});

// ----- Render offspring list -----
function renderOffspring(creatures) {
  offspringEl.innerHTML = "";
  for (const c of creatures) {
    const wrapper = document.createElement("div");
    wrapper.style.margin = "6px";
    // try asset render; fallback will render text
    tryRenderCreature(c, wrapper);
    offspringEl.appendChild(wrapper);
  }
}

// ----- initial demo parents -----
(async function initDemo() {
  parentA = createRandomParent();
  parentA.phenotype = genotypeToPhenotype(parentA);
  parentB = createRandomParent();
  parentB.phenotype = genotypeToPhenotype(parentB);
  // preload parents assets and render
  await Promise.all([
    preloadAssetsForPhenotype(parentA.phenotype).catch(()=>{}),
    preloadAssetsForPhenotype(parentB.phenotype).catch(()=>{})
  ]);
  tryRenderCreature(parentA, parentA_card);
  tryRenderCreature(parentB, parentB_card);
  updateBreedButtonState();
})();
