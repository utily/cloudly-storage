export default {
  preset: "ts-jest/presets/default-esm",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
      useESM: true,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
	transform: {
		"^.+\\.(j|t)sx?$": "ts-jest"
	},
	transformIgnorePatterns: [
		"<rootDir>/node_modules/(?!(cryptly|authly|isoly|gracely|cloudly-http|cloudly-router|cloudly-formdata)/.*)"
	],
	testPathIgnorePatterns: [
		"node_modules/",
		"dist/"
	],
	collectCoverageFrom: [
		"**/*.{ts,tsx,js,jsx}",
		"!**/node_modules/**",
		"!**/dist/**"
	],
  testEnvironment: "miniflare",
  testEnvironmentOptions: {
    // Miniflare doesn't yet support the `main` field in `wrangler.toml` so we
    // need to explicitly tell it where our built worker is. We also need to
    // explicitly mark it as an ES module.
    scriptPath: "dist/index.mjs",
    modules: true,
  }
};
