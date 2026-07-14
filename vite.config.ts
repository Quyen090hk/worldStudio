import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
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
