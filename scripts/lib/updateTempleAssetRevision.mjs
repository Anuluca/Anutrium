import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

export async function updateTempleAssetRevision() {
  const directory = new URL('../../public/models/', import.meta.url)
  const hash = createHash('sha256')
  for (const name of [
    'lucario-island.bin',
    'lucario-island.json',
    'lucario-studio.bin.gz',
    'lucario-studio.json',
    'temple-label.bin.gz',
    'temple-label.json',
    'temple-label-low.bin.gz',
    'temple-label-low.json',
    'temple-label-flat.bin.gz',
    'temple-label-flat.json',
    'temple-welcome.bin.gz',
    'temple-welcome.json',
  ]) {
    hash.update(await readFile(new URL(name, directory)))
  }
  await writeFile(
    new URL(
      '../../src/utils/lucarioModelRevision.generated.json',
      import.meta.url
    ),
    JSON.stringify({ revision: hash.digest('hex').slice(0, 16) })
  )
}
