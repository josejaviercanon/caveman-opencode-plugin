# @argabor/caveman-opencode-plugin

Caveman communication mode plugin for [opencode](https://opencode.ai). Adapts [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) into a hook-based plugin.

> Fork of [`caveman-opencode-plugin`](https://www.npmjs.com/package/caveman-opencode-plugin) by dantesCode, adding **OpenCode V2 support** (dual-generation export). Published under the `@argabor` scope.

## Installation

Fast path (published package):

```sh
opencode plugin add @argabor/caveman-opencode-plugin
```

Or add it to `opencode.json(c)` manually.

OpenCode V2:

```json
{
  "plugins": ["@argabor/caveman-opencode-plugin"]
}
```

OpenCode V1:

```json
{
  "plugin": ["@argabor/caveman-opencode-plugin"]
}
```

Local checkout or unpacked tarball — point `plugins` at the directory that holds `package.json`:

```jsonc
{
  "plugins": ["/absolute/path/to/caveman-opencode-plugin"]
}
```

The directory needs an entrypoint (`index.ts` or `index.js`, both shipped). Alternatively, drop it into the global discovery directory and leave `plugins` untouched:

```text
~/.config/opencode/plugins/caveman/   # unpacked package, or a directory with an index.ts that re-exports the build
```

Verify the plugin loaded with `opencode api plugin.list` (look for `"id":"caveman"`) or by checking the log for `loading plugin ... caveman`.

## Setup

Run the interactive setup script:

```sh
# Download and run
curl -fsSL https://raw.githubusercontent.com/argabor/caveman-opencode-plugin/main/setup.sh | bash

# Or clone and run locally
curl -O https://raw.githubusercontent.com/argabor/caveman-opencode-plugin/main/setup.sh
bash setup.sh
```

Or create `caveman.json` manually:

```sh
# Project-level config (recommended)
echo '{"enabled":true,"defaultMode":"full","features":{"caveman":true,"commit":true,"review":true}}' > caveman.json

# Or global config in ~/.config/opencode/
mkdir -p ~/.config/opencode
echo '{"enabled":true,"defaultMode":"full","features":{"caveman":true,"commit":true,"review":true}}' > ~/.config/opencode/caveman.json
```

**Default when no `caveman.json` exists: `defaultMode: "off"`.** The plugin loads but stays silent until you configure a mode or run `/caveman <mode>`.

## OpenCode V2 support

This package is dual-generation: one default export provides both implementations.

- V1 calls `server()` — requires OpenCode `>= 1.18.29` for the object entrypoint.
- V2 reads `id` + `setup()` and ignores `server()`.

The V2 half uses the V2 domain APIs:

- `ctx.session.hook("context", ...)` replaces the V1 `experimental.chat.system.transform` hook for system-prompt injection.
- `ctx.command.transform(...)` replaces the V1 `config` + `command.execute.before` pair for the `/caveman*` commands.

`caveman.json` is read from the same locations on both generations (project root, then `$XDG_CONFIG_HOME/opencode/`).

> On V1 hosts `>= 1.17.10` an embedded V2 core may also invoke `setup()` in a
> registration-only pass, which can add extra `[v2]` log lines. It does not
> change V1 behavior.

## Configuration

`caveman.json` example:

```json
{
  "enabled": true,
  "defaultMode": "full",
  "features": {
    "caveman": true,
    "commit": true,
    "review": true
  }
}
```

- `enabled` — master switch
- `defaultMode` — mode on session start (`lite`, `full`, `ultra`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`, `off`; default `off`)
- `features` — toggle individual features:
  - `caveman` — enable caveman communication mode
  - `commit` — enable `/caveman-commit` command
  - `review` — enable `/caveman-review` command

### Config file locations

Plugin looks for `caveman.json` in this order:

1. `./caveman.json` (project root)
2. `$XDG_CONFIG_HOME/opencode/caveman.json` (global, defaults to `~/.config/opencode/caveman.json`)

Both files are merged per key, so a global `defaultMode` is kept unless the project file sets its own. The project file takes precedence over global for the keys it contains.

## Commands

| Command | Description |
|---------|-------------|
| `/caveman <mode>` | Switch caveman mode. No argument: report current mode |
| `/caveman-mode <mode>` | Alias of `/caveman` |
| `/caveman-commit <diff>` | Generate conventional commit message |
| `/caveman-review <code>` | One-line code review |

`/caveman normal` and `/caveman stop` are aliases for `/caveman off`.

## Modes

| Mode | Description |
|------|-------------|
| `lite` | Light compression: no filler/hedging, keep articles and full sentences |
| `full` | Default caveman rules: drop articles, fragments OK, short synonyms |
| `ultra` | Maximum brevity: strip conjunctions, no invented abbreviations, no arrows |
| `wenyan-lite` | Lite in classical Chinese style |
| `wenyan-full` | Full classical Chinese style |
| `wenyan-ultra` | Ultra classical Chinese style |
| `off` / `normal` / `stop` | Disable caveman |

## Upstream

Behavior mirrors [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) methodology. See [UPSTREAM.md](UPSTREAM.md) for reference and intentional differences.

## Development

Requires [Bun](https://bun.sh) for the build and tests.

```sh
bun install
bun test
bun run build      # emits dist/index.js + .d.ts
```

## Distribution

```sh
npm pack           # prepack runs the build, emits argabor-caveman-opencode-plugin-<version>.tgz
```

Install the tarball on another machine:

```sh
tar -xzf argabor-caveman-opencode-plugin-*.tgz
# Option A: point plugins at the extracted package/ directory in opencode.json(c)
# Option B: copy it into the global discovery directory
mkdir -p ~/.config/opencode/plugins
cp -r package ~/.config/opencode/plugins/caveman
```

Either route works because the package ships a directory entrypoint (`index.js`).

To publish to a registry, change `name` to a scope you own (for example `@yourname/caveman-opencode-plugin`), then:

```sh
npm publish --access public
```

## Companion Plugin

For context compression, pair with [@tarquinen/opencode-dcp](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning).

## License

MIT
