/**
 * Directory entrypoint for local/git plugin loading.
 *
 * OpenCode resolves a configured plugin directory through an `index.ts` file.
 * The package entry used by npm installs stays `dist/index.js` (see package.json).
 */
export { default } from './src/index'
