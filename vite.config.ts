import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// Cada build tiene su propio id; la app lo compara con /version.json
// para saber si quedó abierta una versión vieja
const VERSION = Date.now().toString()

function archivoVersion(): Plugin {
  return {
    name: "archivo-version",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: VERSION }),
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    archivoVersion(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
