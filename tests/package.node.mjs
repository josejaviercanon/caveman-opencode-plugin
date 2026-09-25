// Package-level smoke tests for the built caveman plugin.
//
// Runs on plain Node.js (no bun needed) against the bundled dist/ output:
//   node --test tests/package.node.mjs

import test from "node:test";
import assert from "node:assert/strict";

import plugin from "../dist/index.js";

test("default export exposes the V2 shape (id + setup)", () => {
  assert.equal(plugin.id, "caveman");
  assert.equal(typeof plugin.setup, "function");
});

test("default export exposes the V1 shape (server function)", () => {
  assert.equal(typeof plugin.server, "function");
});

test("setup registers session context and command hooks", async () => {
  const calls = [];
  const ctx = {
    location: { directory: process.cwd() },
    session: {
      hook: async (name, handler) => {
        calls.push(name);
        assert.equal(typeof handler, "function");
      },
      prompt: async () => {},
    },
    command: {
      transform: async (configure) => {
        const added = [];
        await configure({ add: (entry) => added.push(entry) });
        calls.push(`commands:${added.length}`);
      },
    },
  };

  await plugin.setup(ctx);
  assert.ok(calls.includes("context"), "context hook must be registered");
  assert.ok(
    calls.some((call) => call.startsWith("commands:")),
    "command transform must register commands"
  );
});
