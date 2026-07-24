import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "tiptap-core",
              test: /node_modules[\\/]@tiptap[\\/](?:core|pm|starter-kit|extension-(?:blockquote|bold|bullet-list|code|code-block|document|dropcursor|gapcursor|hard-break|heading|horizontal-rule|italic|link|list|list-item|ordered-list|paragraph|strike|table|text|trailing-node|underline))[\\/]/,
              priority: 3,
            },
            {
              name: "cytoscape",
              test: /node_modules[\\/]cytoscape[\\/]/,
              priority: 2,
            },
            {
              name: "graph-layout",
              test: /node_modules[\\/](?:cytoscape-fcose|cose-base|layout-base)[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
});
