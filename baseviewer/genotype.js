// Simple genotype/phenotype helper for demo
export const schema = {
  color: ["red", "blue", "green", "gold"],
  pattern: ["plain", "striped", "spotted"],
  size: ["small", "medium", "large"]
};

export function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createRandomCreature() {
  const genes = {};
  for (const locus of Object.keys(schema)) {
    genes[locus] = [randChoice(schema[locus]), randChoice(schema[locus])];
  }
  return {
    id: crypto.randomUUID(),
    genes,
    generation: 0,
    parents: []
  };
}

export function genotypeToPhenotype(creature) {
  const phenotype = {};
  for (const locus of Object.keys(creature.genes)) {
    const [a,b] = creature.genes[locus];
    // simple dominance: if both same -> that, otherwise pick first allele
    phenotype[locus] = a === b ? a : a;
  }
  return phenotype;
}
