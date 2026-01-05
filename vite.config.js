import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

// Userscript header injected at top of the final bundle:
const USERSCRIPT_BANNER = `// ==UserScript==
// @name         Cambly - Break Notes (Dev Bundle)
// @namespace    https://cambly.com/
// @version      0.0.0-dev
// @description  Dev build served from Vite
// @match        https://www.cambly.com/en/tutor/schedule?calendar=schedule&lang=en
// @match        https://www.cambly.com/en/tutor/schedule*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==`;

function copyToPublicBuild() {
  return {
    name: "copy-userscript-to-public-build",
    writeBundle(_, bundle) {
      const outFile = Object.keys(bundle).find((k) =>
        k.endsWith("cambly-break-notes.user.js")
      );
      if (!outFile) return;

      const srcPath = path.resolve("dist-userscript", outFile);
      const destDir = path.resolve("public", "build");
      const destPath = path.join(destDir, "cambly-break-notes.user.js");

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);

      console.log(`[userscript] Copied -> public/build/cambly-break-notes.user.js`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const isUserscript = mode === "userscript";

  return {
    build: isUserscript
      ? {
          // Build output goes here (NOT inside public)
          outDir: "dist-userscript",
          emptyOutDir: true,

          // Single-file IIFE bundle
          lib: {
            entry: "src/main.user.js",
            name: "CamblyBreakNotes",
            formats: ["iife"],
            fileName: () => "cambly-break-notes.user.js",
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
              banner: USERSCRIPT_BANNER,
            },
          },

          // Debug-friendly
          sourcemap: true,
          minify: false,
        }
      : {},
    plugins: isUserscript ? [copyToPublicBuild()] : [],
  };
});
