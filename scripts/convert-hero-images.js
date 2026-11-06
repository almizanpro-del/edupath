/**
 * Convert hero PNGs to compressed WebP files.
 * WebP is ~10-20% the size of PNG at similar quality, and is not
 * blocked by .gitignore.
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const HERO_DIR = path.join(__dirname, '..', 'public', 'hero')

const conversions = [
  { input: 'slide-1-arabic.png', output: 'slide-1-arabic.webp', width: 1600 },
  { input: 'slide-2-desktop.png', output: 'slide-2-desktop.webp', width: 1600 },
  { input: 'slide-3-billboard.png', output: 'slide-3-billboard.webp', width: 1600 },
  { input: 'slide-4-medium.png', output: 'slide-4-medium.webp', width: 1600 },
  { input: 'slide-5-square.png', output: 'slide-5-square.webp', width: 1200 },
  { input: 'slide-mobile-1.png', output: 'slide-mobile-1.webp', width: 800 },
  { input: 'slide-mobile-2.png', output: 'slide-mobile-2.webp', width: 800 },
]

async function run() {
  for (const c of conversions) {
    const inputPath = path.join(HERO_DIR, c.input)
    const outputPath = path.join(HERO_DIR, c.output)

    if (!fs.existsSync(inputPath)) {
      console.log(`SKIP: ${c.input} not found`)
      continue
    }

    const inputSize = fs.statSync(inputPath).size
    await sharp(inputPath)
      .resize({ width: c.width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath)

    const outputSize = fs.statSync(outputPath).size
    const ratio = ((1 - outputSize / inputSize) * 100).toFixed(0)
    console.log(`${c.input} → ${c.output}: ${(inputSize / 1024).toFixed(0)}KB → ${(outputSize / 1024).toFixed(0)}KB (${ratio}% smaller)`)
  }

  // Delete the original PNGs to save space
  for (const c of conversions) {
    const pngPath = path.join(HERO_DIR, c.input)
    if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath)
  }
  console.log('\nDeleted original PNGs. WebP files ready.')
}

run().catch(console.error)
