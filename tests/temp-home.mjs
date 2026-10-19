/**
 * Run a test body with `os.homedir()` pointed at a throwaway directory.
 *
 * The package host half creates the quick search box's private workspace
 * (`<home>/.dsh-ux-plus/search`) in `apply()`, exactly as it does on a real
 * host, so every test that calls `apply()` runs under this helper: the real
 * directory is exercised, and nothing lands in the developer's home.
 *
 * POSIX resolves `os.homedir()` from `$HOME` on each call, so swapping the
 * variable is enough and no module state has to be reset.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * @param {(home: string) => void | Promise<void>} body - the test body.
 * @returns {Promise<void>} resolves after the temporary home is removed.
 */
export async function withTempHome(body) {
  const previous = process.env.HOME
  const home = mkdtempSync(join(tmpdir(), 'ux-plus-home-'))
  process.env.HOME = home
  try {
    await body(home)
  } finally {
    if (previous === undefined) delete process.env.HOME
    else process.env.HOME = previous
    rmSync(home, { recursive: true, force: true })
  }
}
