import {defineConfig} from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	plugins: [],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				stocks: resolve(__dirname, 'stocks.html'),
				chat: resolve(__dirname, 'chat.html')
			}
		}
	}
})