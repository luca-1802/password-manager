import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:5000",
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          dnd: ["@dnd-kit/core"],
          ui: ["framer-motion", "lucide-react"],
        },
      },
    },
  },
});