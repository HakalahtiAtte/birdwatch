/**
 * Import Finnish species names from the IOC World Bird List Multilingual Excel file.
 *
 * Usage:
 *   node scripts/import-finnish-names.mjs <path-to-excel>
 *
 * Download the file from:
 *   https://www.worldbirdnames.org/new/ioc-lists/master-list-2/
 *   → "Multilingual Version" (e.g. "Multiling IOC 14.2.xlsx")
 *
 * Required env vars (in web/.env.local or set inline):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/import-finnish-names.mjs <path-to-excel>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  console.error('Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-finnish-names.mjs <file>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('Reading Excel file:', resolve(filePath))
const workbook = XLSX.readFile(filePath)

// The IOC multilingual file has one main sheet — find it
const sheetName = workbook.SheetNames[0]
console.log('Using sheet:', sheetName)
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })

console.log(`Parsed ${rows.length} rows from Excel`)

// Build a map of scientific name → Finnish name
// IOC columns: Genus, Species, Finnish (exact column name may vary slightly)
const finnishMap = new Map()
let skipped = 0

// Find the scientific name column (varies by IOC version: "IOC_15.2", "IOC_14.1", etc.)
const sciCol = Object.keys(rows[0] || {}).find((k) => /^IOC_/i.test(k)) || 'IOC_15.2'
console.log('Scientific name column:', sciCol)

for (const row of rows) {
  const scientificName = String(row[sciCol] || '').trim()
  const finnish = String(row['Finnish'] || row['finnish'] || row['Suomi'] || '').trim()

  if (!scientificName || !finnish) { skipped++; continue }

  finnishMap.set(scientificName.toLowerCase(), { scientificName, finnish })
}

console.log(`Built Finnish name map: ${finnishMap.size} entries (${skipped} rows skipped)`)

// Fetch all species from Supabase in batches
const BATCH_SIZE = 1000
let offset = 0
let allSpecies = []

while (true) {
  const { data, error } = await supabase
    .from('species')
    .select('id, latin_name')
    .range(offset, offset + BATCH_SIZE - 1)

  if (error) { console.error('Failed to fetch species:', error.message); process.exit(1) }
  if (!data.length) break

  allSpecies = allSpecies.concat(data)
  offset += BATCH_SIZE
  if (data.length < BATCH_SIZE) break
}

console.log(`Fetched ${allSpecies.length} species from Supabase`)

// Match and build update list
const updates = []
let matched = 0
let unmatched = 0

for (const species of allSpecies) {
  const key = species.latin_name?.toLowerCase()
  if (!key) continue

  const entry = finnishMap.get(key)
  if (entry) {
    updates.push({ id: species.id, finnish_name: entry.finnish })
    matched++
  } else {
    unmatched++
  }
}

console.log(`Matched: ${matched} | Unmatched: ${unmatched}`)

if (updates.length === 0) {
  console.log('No updates to apply. Check that the Excel column names are "Genus", "Species", and "Finnish".')
  process.exit(0)
}

// Update Supabase — run 50 updates concurrently to keep it fast
const CONCURRENCY = 50
let updated = 0
let failed = 0

for (let i = 0; i < updates.length; i += CONCURRENCY) {
  const batch = updates.slice(i, i + CONCURRENCY)
  const results = await Promise.all(
    batch.map(({ id, finnish_name }) =>
      supabase.from('species').update({ finnish_name }).eq('id', id)
    )
  )
  for (const { error } of results) {
    if (error) failed++
    else updated++
  }
  process.stdout.write(`\rUpdated ${updated}/${updates.length}...`)
}

if (failed > 0) console.log(`\n${failed} updates failed.`)

console.log(`\nDone. ${updated} Finnish names imported.`)
