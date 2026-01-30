// Simple breeding function: combine parent genes into a child
export function breed(parentA, parentB) {
  const childGenes = {};
  for (const locus of Object.keys(parentA.genes)) {
    const aAlleles = parentA.genes[locus];
    const bAlleles = parentB.genes[locus];
    const alleleFromA = aAlleles[Math.floor(Math.random() * aAlleles.length)];
    const alleleFromB = bAlleles[Math.floor(Math.random() * bAlleles.length)];
    childGenes[locus] = [alleleFromA, alleleFromB];
  }

  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2,8),
    genes: childGenes,
    generation: Math.max(parentA.generation || 0, parentB.generation || 0) + 1,
    parents: [parentA.id || null, parentB.id || null]
  };
}
