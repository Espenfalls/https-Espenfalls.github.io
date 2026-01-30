// breed.js
// Weighted, customizable breeder with per-locus rarity and mutation support.
//
// Usage:
//   import { breed } from "./breed.js";
//   const child = breed(parentA, parentB); // default 50/50-like behaviour
//   const child = breed(parentA, parentB, options); // with custom options
//
// Options shape (all optional):
// {
//   alleleRarity: { [locus]: { [alleleValue]: weight (number >=0) } },
//   parentWeight: { [locus]: { A: number, B: number } }, // multiplies parent's allele weights
//   mutation: {
//     [locus]: {
//       probability: 0.01, // per-allele mutation chance
//       map: { [alleleValue]: weight } // choose mutation allele from this weighted map
//     }
//   }
// }
//
// Notes:
// - Default behaviour (no options): pick one allele uniformly from each parent's allele pair.
// - alleleRarity weights < 1 make an allele rarer; >1 make it more likely when selecting that allele.
// - parentWeight lets you bias selection toward alleles owned by a specific parent (multiply all that parent's allele weights).
// - Mutation map weights allow rarer mutations to be rarer.
// - The function returns a child object with id, genes (pair-of-alleles), generation, parents

function weightedPickFromMap(map) {
  // map: { value: weight }
  const entries = Object.entries(map).filter(([_, w]) => Number(w) > 0);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of entries) {
    if (r < weight) return value;
    r -= weight;
  }
  // fallback (shouldn't happen)
  return entries[entries.length - 1][0];
}

function weightedPickFromArray(arr, weightFn) {
  // arr: array of items; weightFn(item) => numeric weight
  const entries = arr.map(item => ({ item, w: Math.max(0, Number(weightFn(item) || 0)) }))
                     .filter(e => e.w > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    if (r < e.w) return e.item;
    r -= e.w;
  }
  return entries[entries.length - 1].item;
}

export function breed(parentA, parentB, options = {}) {
  if (!parentA || !parentB) {
    throw new Error("breed(parentA, parentB, options) - parents required");
  }
  const alleleRarity = options.alleleRarity || {}; // { locus: { allele: weight } }
  const parentWeight = options.parentWeight || {};   // { locus: { A: num, B: num } }
  const mutation = options.mutation || {};           // { locus: { probability, map } }

  const childGenes = {};

  // iterate all loci present in parentA (fall back to parentB if missing)
  const loci = new Set([...Object.keys(parentA.genes || {}), ...Object.keys(parentB.genes || {})]);

  for (const locus of loci) {
    const aPair = (parentA.genes && parentA.genes[locus]) || [];
    const bPair = (parentB.genes && parentB.genes[locus]) || [];

    // helper to compute weight for an allele value in parent's pair
    const pWeightA = (parentWeight[locus] && Number(parentWeight[locus].A)) || 1;
    const pWeightB = (parentWeight[locus] && Number(parentWeight[locus].B)) || 1;

    const rarityMap = alleleRarity[locus] || {}; // allele -> multiplier

    // pick allele from parent A's pair
    let alleleFromA = null;
    if (aPair.length === 0) {
      // if parent has no allele info, attempt to pick from parent B
      alleleFromA = bPair.length ? bPair[Math.floor(Math.random() * bPair.length)] : null;
    } else if (aPair.length === 1) {
      alleleFromA = aPair[0];
    } else {
      alleleFromA = weightedPickFromArray(aPair, (al) => (rarityMap[al] ?? 1) * pWeightA);
      if (alleleFromA === null) alleleFromA = aPair[Math.floor(Math.random() * aPair.length)];
    }

    // pick allele from parent B's pair
    let alleleFromB = null;
    if (bPair.length === 0) {
      alleleFromB = aPair.length ? aPair[Math.floor(Math.random() * aPair.length)] : null;
    } else if (bPair.length === 1) {
      alleleFromB = bPair[0];
    } else {
      alleleFromB = weightedPickFromArray(bPair, (al) => (rarityMap[al] ?? 1) * pWeightB);
      if (alleleFromB === null) alleleFromB = bPair[Math.floor(Math.random() * bPair.length)];
    }

    // Mutation checks (apply per-allele, independently)
    const mutSpec = mutation[locus];
    if (mutSpec && typeof mutSpec.probability === "number" && mutSpec.probability > 0 && mutSpec.map) {
      const prob = Math.max(0, Math.min(1, mutSpec.probability));
      // alleleFromA mutate?
      if (alleleFromA !== null && Math.random() < prob) {
        const chosen = weightedPickFromMap(mutSpec.map);
        if (chosen !== null) alleleFromA = chosen;
      }
      // alleleFromB mutate?
      if (alleleFromB !== null && Math.random() < prob) {
        const chosen = weightedPickFromMap(mutSpec.map);
        if (chosen !== null) alleleFromB = chosen;
      }
    }

    // Fallback if any allele is still null: prefer whichever exists
    if (alleleFromA == null && alleleFromB != null) alleleFromA = alleleFromB;
    if (alleleFromB == null && alleleFromA != null) alleleFromB = alleleFromA;
    if (alleleFromA == null && alleleFromB == null) alleleFromA = alleleFromB = null;

    childGenes[locus] = [alleleFromA, alleleFromB];
  }

  // Build child object
  const child = {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2,8)),
    genes: childGenes,
    generation: Math.max(parentA.generation || 0, parentB.generation || 0) + 1,
    parents: [parentA.id || null, parentB.id || null]
  };

  return child;
}
