// Copyright (c) Microsoft. All rights reserved.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let MarkdownRenderer;

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ MarkdownRenderer } = await server.ssrLoadModule("/src/components/ui/markdown-renderer.tsx"));
});

after(async () => {
  await server?.close();
});

// Rendered markup with attributes dropped, so assertions read as structure.
function render(content) {
  return renderToStaticMarkup(createElement(MarkdownRenderer, { content }))
    .replace(/<(\w+)[^>]*>/g, "<$1>")
    .replace(/<\/?(div|p|span)>/g, "");
}

test("formats emphasis that comes before a higher-priority inline pattern", () => {
  assert.equal(
    render("Read the **setup guide** before the [install page](https://example.com/install)"),
    "Read the <strong>setup guide</strong> before the <a>install page</a>",
  );
  assert.equal(
    render("Use *streaming* with **tools** enabled"),
    "Use <em>streaming</em> with <strong>tools</strong> enabled",
  );
  assert.equal(
    render("_First_ pick a **model**, then open the [docs](https://example.com) and *run* it"),
    "<em>First</em> pick a <strong>model</strong>, then open the <a>docs</a> and <em>run</em> it",
  );
});

test("keeps single inline patterns and plain text unchanged", () => {
  assert.equal(render("A **bold** word"), "A <strong>bold</strong> word");
  assert.equal(render("**Bold** then *italic*"), "<strong>Bold</strong> then <em>italic</em>");
  assert.equal(render("See **[the docs](https://example.com)** now"), "See <strong><a>the docs</a></strong> now");
  assert.equal(render("2 * 3 is **six**"), "2 * 3 is <strong>six</strong>");
  assert.equal(render("Use `**raw**` for [bold](https://example.com)"), "Use <code>**raw**</code> for <a>bold</a>");
  assert.equal(render("No markup here"), "No markup here");
});
