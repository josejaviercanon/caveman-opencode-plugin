import { setMode, getMode } from '../state'
import { loadConfig, CAVEMAN_MODES, isCavemanMode } from '../config'

/** `/caveman normal` and `/caveman stop` are documented aliases for `off`. */
const MODE_ALIASES: Record<string, string> = { normal: 'off', stop: 'off' }

export function handleMode(sessionId: string, args: string[]): { message: string } {
  const cfg = loadConfig().config
  if (!cfg.features.caveman) {
    return { message: 'caveman feature disabled.' }
  }

  const requested = args[0]?.toLowerCase()
  const mode = requested ? MODE_ALIASES[requested] ?? requested : undefined

  if (!mode) {
    const current = getMode(sessionId)
    return { message: `Mode: ${current}. Use /caveman-mode ${CAVEMAN_MODES.join('|')} (alias: normal)` }
  }

  if (!isCavemanMode(mode)) {
    return { message: `Bad mode. Valid: ${CAVEMAN_MODES.join(', ')} (alias: normal -> off)` }
  }

  setMode(sessionId, mode)

  if (mode === 'off') {
    return { message: 'Caveman mode off.' }
  }

  return { message: `Caveman mode ${mode}.` }
}