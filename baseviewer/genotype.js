// Ordered schema and helpers for Velvedeer
// Loci order (top-to-bottom for genetics; rendering order provided separately):
// Base, Skin, Eyes, Horns, Hooves, Mutation 1, Mutation 2, Mutation 3

export const schema = {
  base: ["tan", "brown", "black", "white", "gold"],
  skin: ["plain", "freckled", "scarred", "pale", "dark"],
  eyes: ["brown", "blue", "green", "amber", "heterochromia"],
  horns: ["none", "small", "curled", "long"],
  hooves: ["black", "brown", "white", "cloven"],
  mut1: ["none", "glow", "stripe"],
  mut2: ["none", "patterned", "speckled"],
  mut3: ["none", "extra-eye", "fused-mark"]
};

// Utility: random choice
export function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Create a parent from a chosen phenotype (homozygous genotype)
export function createParentFromPhenotype(phenotype) {
  const genes = {};
  for (const locus of Object.keys(schema)) {
    const val = phenotype[locus] ?? randChoice(schema[locus]);
    genes[locus] = [val, val]; // homozygous so parent shows chosen trait
  }
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2,8),
    genes,
    generation: 0,
    parents: []
  };
}

// Create a fully random parent (homozygous phenotype)
export function createRandomParent() {
  const phenotype = {};
  for (const locus of Object.keys(schema)) phenotype[locus] = randChoice(schema[locus]);
  return createParentFromPhenotype(phenotype);
}

// Convert genotype -> phenotype for display. For heterozygous loci, choose an allele at random
export function genotypeToPhenotype(creature) {
  const phenotype = {};
  for (const locus of Object.keys(creature.genes)) {
    const [a, b] = creature.genes[locus];
    phenotype[locus] = (a === b) ? a : (Math.random() < 0.5 ? a : b);
  }
  return phenotype;
}
