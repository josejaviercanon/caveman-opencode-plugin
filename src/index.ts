import type { Plugin, Hooks } from '@opencode-ai/plugin'
import type { Part } from '@opencode-ai/sdk'
import type { V2Plugin, V2PluginContext } from './v2/types'
import { loadConfig } from './config'
import { getState, resolveInjection } from './state'
import { getCavemanSystemInstruction } from './skills/caveman'
import { CAVEMAN_COMMANDS, dispatchCommand } from './commands/dispatch'

let configLogged = false

function logConfigOnce(projectDir?: string): void {
  if (configLogged) return
  configLogged = true
  const { config, report } = loadConfig(projectDir ? { projectDir } : undefined)
  console.log(`[caveman] config: project=${report.project} (${report.projectPath}), global=${report.global} (${report.globalPath}), defaultMode=${config.defaultMode}`)
  for (const warning of report.warnings) {
    console.log(`[caveman] warning: ${warning}`)
  }
}

// ---------------------------------------------------------------------------
// V1 implementation — used by OpenCode 1.x (>= 1.18.29, which supports the
// object entrypoint).
// ---------------------------------------------------------------------------
const cavemanV1: Plugin = async () => {
  logConfigOnce()

  const hooks: Hooks = {
    config: async (opencodeConfig) => {
      opencodeConfig.command ??= {}
      for (const command of CAVEMAN_COMMANDS) {
        opencodeConfig.command[command.name] = { template: '', description: command.description }
      }
    },

    'experimental.chat.system.transform': async (input, output) => {
      const { config: cfg } = loadConfig()

      const sessionID = input.sessionID
      if (!sessionID) return

      const decision = resolveInjection(getState(sessionID), cfg.defaultMode)
      if (!cfg.enabled || !cfg.features.caveman) return
      if (!decision.inject) return

      output.system.push(getCavemanSystemInstruction(decision.mode))
    },

    'command.execute.before': async (input, output) => {
      const cmd = (output as any).command ?? input.command
      const args = String((output as any).args ?? input.arguments ?? '').trim()
      const text = dispatchCommand(cmd, args, input.sessionID)
      if (text === null) return
      output.parts = [{ type: 'text', text } as Part]
    },
  }

  return hooks
}

// ---------------------------------------------------------------------------
// V2 implementation — used by OpenCode 2.x. V1 plugin hooks do not run in V2,
// so this half uses the V2 domain APIs:
//   - `ctx.session.hook("context", ...)` replaces `experimental.chat.system.transform`
//   - `ctx.command.transform(...)` replaces the `config` + `command.execute.before` pair
// ---------------------------------------------------------------------------
const cavemanV2: V2Plugin = {
  id: 'caveman',

  async setup(ctx: V2PluginContext) {
    const projectDir = ctx.location?.directory
    logConfigOnce(projectDir)

    await ctx.session.hook('context', (event) => {
      const { config: cfg } = loadConfig(projectDir ? { projectDir } : undefined)
      if (!cfg.enabled || !cfg.features.caveman) return

      const sessionID = event.sessionID
      if (!sessionID) return

      const decision = resolveInjection(getState(sessionID), cfg.defaultMode)
      if (!decision.inject) return

      event.system.push({ type: 'text', text: getCavemanSystemInstruction(decision.mode) })
    })

    await ctx.command.transform((editor) => {
      for (const command of CAVEMAN_COMMANDS) {
        editor.add({
          name: command.name,
          description: command.description,
          execute: async ({ sessionID, prompt, delivery }) => {
            const args = String(prompt?.text ?? '').trim()
            const text = dispatchCommand(command.name, args, sessionID) ?? ''
            await ctx.session.prompt({ ...prompt, sessionID, text, delivery })
          },
        })
      }
    })
  },
}

// ---------------------------------------------------------------------------
// Dual-generation default export.
//   V1 calls `server()`; V2 reads `id` + `setup()` and ignores `server()`.
// ---------------------------------------------------------------------------
export default {
  ...cavemanV2,
  server: cavemanV1,
}
