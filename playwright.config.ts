import { defineConfig, devices } from '@playwright/test';

const phone = { width: 393, height: 851 };

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		env: {
			LOG_PATH: 'test-results/e2e-server.log',
			DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://shapshap:test@localhost:5432/shapshap',
			RATE_LIMIT: 'off'
		}
	},
	testMatch: '**/*.e2e.{ts,js}',
	timeout: 60_000,
	projects: [
		{ name: 'chromium', use: { ...devices['Pixel 5'], viewport: phone } },
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'], viewport: phone }
		}
	]
});
