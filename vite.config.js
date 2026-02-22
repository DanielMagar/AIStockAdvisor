import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        stocks: 'stocks.html',
        chat: 'chat.html'
      }
    }
  }
})
