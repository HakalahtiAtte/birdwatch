// One-time script: converts the eBird/Clements checklist CSV into a Supabase-importable format.
// Input:  eBird-Clements_v2025-integrated-checklist-October-2025.csv (download from https://www.birds.cornell.edu/clementschecklist/download/)
// Output: species-import.csv  (import via Supabase dashboard → Table editor → species → Import data)
const fs = require('fs')
const path = require('path')

const INPUT = path.join(__dirname, '..', 'eBird-Clements_v2025-integrated-checklist-October-2025.csv')
const OUTPUT = path.join(__dirname, '..', 'species-import.csv')

const raw = fs.readFileSync(INPUT, 'utf8')
const lines = raw.split('\n')

// Find the header row (first row with "species_code" in it)
const headerIndex = lines.findIndex(l => l.includes('species_code'))
const headers = parseCSVLine(lines[headerIndex])

const col = name => headers.indexOf(name)

const rows = []

for (let i = headerIndex + 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  const fields = parseCSVLine(line)
  const category = fields[col('category')]

  if (category !== 'species') continue

  const commonName = fields[col('English name')] || ''
  const latinName = fields[col('scientific name')] || ''
  const speciesCode = fields[col('species_code')] || ''
  const order = fields[col('order')] || ''
  const familyRaw = fields[col('family')] || ''

  // Extract readable family name from "Struthionidae (Ostriches)" → "Ostriches"
  const familyMatch = familyRaw.match(/\(([^)]+)\)/)
  const family = familyMatch ? familyMatch[1] : familyRaw

  if (!commonName || !latinName) continue

  rows.push([commonName, latinName, family, order, speciesCode])
}

const outputLines = [
  'common_name,latin_name,family,order,ebird_species_code',
  ...rows.map(r => r.map(escapeCSV).join(','))
]

fs.writeFileSync(OUTPUT, outputLines.join('\n'), 'utf8')
console.log(`Done. ${rows.length} species written to species-import.csv`)

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}
