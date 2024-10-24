import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		exclude: ["test-worker", "node_modules", "dist"], // due to having a test in test-worker
		server: {
			deps: {
				// this is due to the package.json files in utily are set up incorrectly to export both esm and cjs, see: https://github.com/sheremet-va/dual-packaging
				inline: [
					"cryptly",
					"authly",
					"flagly",
					"isoly",
					"gracely",
					"cloudly-http",
					"cloudly-rest",
					"cloudly-router",
					"cloudly-storage",
					"isly",
				],
			},
		},
	},
})
