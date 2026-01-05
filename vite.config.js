import { defineConfig } from "vite";

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

export default defineConfig(({ mode }) => {
  const isUserscript = mode === "userscript";

  return {
    build: isUserscript
      ? {
          // IMPORTANT: output into /public so the Vite dev server can serve it
          outDir: "public/build",
          emptyOutDir: true,

          // Single-file IIFE bundle (no chunks)
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

          // Optional but useful while debugging
          sourcemap: true,
          minify: false,
        }
      : {},
  };
});
