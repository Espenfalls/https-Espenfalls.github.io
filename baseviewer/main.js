// main.js
// Cleaned-up main script with server-provided background support.
// Replace your current baseviewer/main.js with this file and hard-refresh the page.

import { schema, createParentFromPhenotype, createRandomParent, genotypeToPhenotype } from "./genotype.js";
import { breed } from "./breed.js";

document.addEventListener("DOMContentLoaded", () => {
  // ----- asset map (adjust filenames to your assets) -----
  const assetMap = {
    base: { tan: "base_tan.png", brown: "base_brown.png", black: "base_black.png", white: "base_white.png", gold: "base_gold.png" },
    skin: { plain: "skin_plain.png", freckled: "skin_freckled.png", scarred: "skin_scarred.png", pale: "skin_pale.png", dark: "skin_dark.png" },
    eyes: { brown: "eyes_brown.png", blue: "eyes_blue.png", green: "eyes_green.png", amber: "eyes_amber.png", heterochromia: "eyes_hetero.png" },
    horns: { none: "horns_none.png", small: "horns_small.png", curled: "horns_curled.png", long: "horns_long.png" },
    hooves: { black: "hooves_black.png", brown: "hooves_brown.png", white: "hooves_white.png", cloven: "hooves_cloven.png" },
    mut1: { none: "mut1_none.png", glow: "mut1_glow.png", stripe: "mut1_stripe.png" },
    mut2: { none: "mut2_none.png", patterned: "mut2_patterned.png", speckled: "mut2_speckled.png" },
    mut3: { none: "mut3_none.png", "extra-eye": "mut3_extraeye.png", "fused-mark": "mut3_fusedmark.png" }
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
  const mainCanvas = document.getElementById("main-canvas"); // optional large preview

  // Sanity check for required elements
  const required = { parentA_traits, parentB_traits, createA, createB, randomA, randomB, parentA_card, parentB_card, breedBtn, offspringEl, offspringCount };
  const missing = Object.entries(required).filter(([k, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn("main.js: missing required DOM elements, aborting interactive initialization. Missing:", missing);
    return;
  }

  let parentA = null;
  let parentB = null;

  // Background URL comes from backend injection: window.BV_CONFIG = { background: "/path/to/bg.png" };
  // If backend does not inject, leave blank (no background).
  let currentBgUrl = (window.BV_CONFIG && typeof window.BV_CONFIG.background === "string") ? window.BV_CONFIG.background : "";

  // Public helper so backend/admin scripts can change background after load:
  window.setBVBackground = function (url) {
    currentBgUrl = url || "";
    updateAllBackgrounds();
  };

  // ----- helpers -----
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

  function readTraitsFrom(container, side) {
    const phenotype = {};
    for (const locus of Object.keys(schema)) {
      const sel = container.querySelector(`select[name="${side}-${locus}"]`);
      phenotype[locus] = sel ? sel.value : schema[locus][0];
    }
    return phenotype;
  }

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

  // ----- Background helpers -----
  function applyBackgroundToAvatarContainer(el) {
    if (!el) return;
    if (currentBgUrl) {
      el.style.backgroundImage = `url("${currentBgUrl}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    } else {
      el.style.backgroundImage = "";
    }
  }

  function updateAllBackgrounds() {
    document.querySelectorAll('.avatar, .avatar-large').forEach(el => applyBackgroundToAvatarContainer(el));
  }

  // ----- Rendering using stacked <img> layers -----
  // Small containers (parent cards / offspring wrappers) render only the avatar images (no trait list/title).
  function renderCreatureAsLayers(creature, containerEl) {
    const phenotype = creature.phenotype ?? genotypeToPhenotype(creature);
    const isMain = containerEl && containerEl.classList && containerEl.classList.contains("avatar-large");

    if (isMain) {
      // large preview area
      containerEl.innerHTML = "";
      containerEl.setAttribute("role", "img");
      containerEl.setAttribute("aria-label", `Preview: generation ${creature.generation}`);
      applyBackgroundToAvatarContainer(containerEl);
      for (const locus of layerOrder) {
        const value = phenotype[locus];
        const fname = assetMap[locus] && assetMap[locus][value];
        const img = document.createElement("img");
        img.className = "layer";
        img.alt = "";
        if (fname) img.src = `./assets/${fname}`;
        containerEl.appendChild(img);
      }
    } else {
      // small avatar only (no title/details)
      containerEl.innerHTML = "";
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.style.margin = "0 auto"; // center inside the wrapper
      applyBackgroundToAvatarContainer(avatar);

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
  }

  // Fallback when no assets found: show an empty avatar box (keeps layout consistent)
  function renderAvatarFallback(containerEl) {
    containerEl.innerHTML = "";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.margin = "0 auto";
    avatar.style.background = "#f3f4f6";
    avatar.style.border = "1px dashed #d1d5db";
    avatar.style.display = "flex";
    avatar.style.alignItems = "center";
    avatar.style.justifyContent = "center";
    avatar.style.color = "#6b7280";
    avatar.style.fontSize = "13px";
    avatar.textContent = "no preview";
    containerEl.appendChild(avatar);
  }

  async function tryRenderCreature(creature, containerEl) {
    if (!creature || !containerEl) return;
    const phenotype = creature.phenotype ?? genotypeToPhenotype(creature);
    const anyAsset = layerOrder.some(locus => !!assetMap[locus]?.[phenotype[locus]]);
    if (!anyAsset) {
      // fallback avatar only
      renderAvatarFallback(containerEl);
      applyBackgroundToAvatarContainer(containerEl.querySelector('.avatar'));
      return;
    }
    await preloadAssetsForPhenotype(phenotype).catch(()=>{});
    renderCreatureAsLayers(creature, containerEl);
  }

  // ----- UI setup -----
  makeTraitSelectors(parentA_traits, "A");
  makeTraitSelectors(parentB_traits, "B");

  // ----- Parent create / random handlers -----
  createA.addEventListener("click", async () => {
    const phenotype = readTraitsFrom(parentA_traits, "A");
    parentA = createParentFromPhenotype(phenotype);
    parentA.phenotype = genotypeToPhenotype(parentA);
    await tryRenderCreature(parentA, parentA_card);
    if (mainCanvas) await tryRenderCreature(parentA, mainCanvas);
    updateBreedButtonState();
  });

  createB.addEventListener("click", async () => {
    const phenotype = readTraitsFrom(parentB_traits, "B");
    parentB = createParentFromPhenotype(phenotype);
    parentB.phenotype = genotypeToPhenotype(parentB);
    await tryRenderCreature(parentB, parentB_card);
    if (mainCanvas) await tryRenderCreature(parentB, mainCanvas);
    updateBreedButtonState();
  });

  randomA.addEventListener("click", async () => {
    parentA = createRandomParent();
    parentA.phenotype = genotypeToPhenotype(parentA);
    await tryRenderCreature(parentA, parentA_card);
    if (mainCanvas) await tryRenderCreature(parentA, mainCanvas);
    updateBreedButtonState();
  });
  randomB.addEventListener("click", async () => {
    parentB = createRandomParent();
    parentB.phenotype = genotypeToPhenotype(parentB);
    await tryRenderCreature(parentB, parentB_card);
    if (mainCanvas) await tryRenderCreature(parentB, mainCanvas);
    updateBreedButtonState();
  });

  function updateBreedButtonState() {
    breedBtn.disabled = !(parentA && parentB);
  }

  parentA_card.addEventListener("click", () => {
    if (parentA && mainCanvas) tryRenderCreature(parentA, mainCanvas);
  });
  parentB_card.addEventListener("click", () => {
    if (parentB && mainCanvas) tryRenderCreature(parentB, mainCanvas);
  });

  // ----- Breeding action -----
  breedBtn.addEventListener("click", async () => {
    if (!parentA || !parentB) return;
    const n = Math.max(1, parseInt(offspringCount.value, 10) || 1);
    const kids = [];
    for (let i = 0; i < n; i++) {
      const child = breed(parentA, parentB);
      child.phenotype = genotypeToPhenotype(child);
      kids.push(child);
    }
    await Promise.all(kids.map(k => preloadAssetsForPhenotype(k.phenotype).catch(()=>{})));
    renderOffspring(kids);
    if (kids.length && mainCanvas) tryRenderCreature(kids[0], mainCanvas);
  });

  function renderOffspring(creatures) {
    offspringEl.innerHTML = "";
    for (const c of creatures) {
      const wrapper = document.createElement("div");
      wrapper.style.margin = "6px";
      wrapper.style.cursor = "pointer";
      // small avatar only will be rendered inside wrapper
      tryRenderCreature(c, wrapper);
      wrapper.addEventListener("click", () => {
        if (mainCanvas) tryRenderCreature(c, mainCanvas);
      });
      offspringEl.appendChild(wrapper);
    }
  }

  // ----- initial demo parents -----
  (async function initDemo() {
    parentA = createRandomParent();
    parentA.phenotype = genotypeToPhenotype(parentA);
    parentB = createRandomParent();
    parentB.phenotype = genotypeToPhenotype(parentB);

    await Promise.all([
      tryRenderCreature(parentA, parentA_card).catch(()=>{}),
      tryRenderCreature(parentB, parentB_card).catch(()=>{})
    ]);
    if (mainCanvas) tryRenderCreature(parentA, mainCanvas);

    // Apply any background provided by server (window.BV_CONFIG.background)
    updateAllBackgrounds();
    updateBreedButtonState();
  })();
});
