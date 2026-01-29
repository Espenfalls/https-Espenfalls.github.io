import { schema, randChoice } from "./genotype.js";

const MUTATION_RATE = 0.03; // 3%

function mutateAllele(locus, allele) {
  if (Math.random() < MUTATION_RATE) {
    const pool = schema[locus].filter(a => a !== allele);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return allele;
}

export function breed(parentA, parentB) {
  const childGenes = {};
  for (const locus of Object.keys(parentA.genes)) {
    const alleleFromA = randChoice(parentA.genes[locus]);
    const alleleFromB = randChoice(parentB.genes[locus]);
    childGenes[locus] = [
      mutateAllele(locus, alleleFromA),
      mutateAllele(locus, alleleFromB)
    ];
  }
  return {
    id: crypto.randomUUID(),
    genes: childGenes,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parents: [parentA.id, parentB.id]
  };
}
