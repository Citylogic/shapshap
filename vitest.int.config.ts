import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.int.test.ts'],
		environment: 'node',
		fileParallelism: false,
		// Node 24: native Temporal is behind this flag (TECH-STACK §11.3).
		execArgv: ['--harmony-temporal']
	}
});
