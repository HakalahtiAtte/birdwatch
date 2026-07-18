type SpeciesNameFields = { common_name: string; finnish_name?: string | null }

export function getSpeciesName(species: SpeciesNameFields | null | undefined): string {
  if (!species) return 'Tuntematon laji'
  return species.finnish_name || species.common_name
}
