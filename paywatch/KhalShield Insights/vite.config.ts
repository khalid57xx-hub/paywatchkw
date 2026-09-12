// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const tr46Shim = fileURLToPath(new URL("./src/lib/tr46-shim.cjs", import.meta.url));

// The MongoDB driver is CommonJS, so the bundler emits `__require("node:x")`
// calls for Node builtins. Those runtime requires throw
// `No such module "node:process"` in the deployed worker, which only resolves
// Node builtins that are imported statically as ESM. This plugin rewrites the
// leftover `__require("node:x")` calls in emitted chunks into static ESM
// imports of the same builtins.
function nodeBuiltinRequireToEsm() {
  return {
    name: "node-builtin-require-to-esm",
    enforce: "post" as const,
    apply: "build" as const,
    renderChunk(code: string) {
      const matches = new Set<string>();
      const re = /__require\(\s*"(node:[a-z_/]+)"\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code)) !== null) matches.add(m[1]!);
      if (matches.size === 0) return null;

      const imports: string[] = [];
      let out = code;
      for (const spec of matches) {
        const ident = `__nodeBuiltin_${spec.replace(/[^a-z]/g, "_")}`;
        imports.push(
          `import * as ${ident}_ns from ${JSON.stringify(spec)};\nconst ${ident} = ${ident}_ns.default ?? ${ident}_ns;`,
        );
        out = out.replace(
          new RegExp(`__require\\(\\s*"${spec.replace("/", "\\/")}"\\s*\\)`, "g"),
          ident,
        );
      }
      return { code: `${imports.join("\n")}\n${out}`, map: null };
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [nodeBuiltinRequireToEsm()],
    resolve: {
      alias: [
        // whatwg-url (via the MongoDB connection-string parser) pulls in tr46,
        // which requires "punycode/" — unresolvable in the worker bundle.
        { find: /^tr46$/, replacement: tr46Shim },
      ],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
