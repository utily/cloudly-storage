import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		typecheck: { tsconfig: "./tsconfig.json" },
		coverage: {
			reporter: ["text", "json", "html"],
			enabled: true,
			all: true,
			cleanOnRerun: true,
			thresholds: { statements: 25, branches: 65, functions: 30, lines: 25 },
		},
		globals: true,
		include: ["**/*.spec.[tj]s"],
		testTimeout: 20000,
		isolate: false,
		server: { deps: { inline: true } },
	},
})
