import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		env: { LOG_PATH: 'test-results/e2e-server.log' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
