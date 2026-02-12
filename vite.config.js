import {defineConfig} from 'vite'
import { resolve } from 'path'

export default defineConfig({
	plugins: [],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				stocks: resolve(__dirname, 'stocks.html')
			}
		}
	}
})