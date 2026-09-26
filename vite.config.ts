import { defineConfig, type Plugin } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

/** SvelteKit hashes chunks as `[hash].js`; name the lazy Safari polyfill so size-limit can ignore it. */
function nameTemporalPolyfillChunk(): Plugin {
	return {
		name: 'name-temporal-polyfill-chunk',
		apply: 'build',
		enforce: 'post',
		config(config) {
			const ssr = String(config.build?.outDir ?? '').endsWith('server');
			return {
				build: {
					rolldownOptions: {
						output: {
							chunkFileNames(chunk) {
								if (
									!ssr &&
									chunk.moduleIds.some((id) =>
										/[/\\]node_modules[/\\]temporal-(polyfill|spec|utils)[/\\]/.test(id)
									)
								) {
									return '_app/immutable/chunks/temporal-polyfill.[hash].js';
								}
								return ssr ? 'chunks/[name].js' : '_app/immutable/chunks/[hash].js';
							}
						}
					}
				}
			};
		}
	};
}

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Hash-mode CSP: Kit hashes its own hydration scripts. Do not add
			// https://*.ingest.sentry.io until TECH-STACK §11.2 is resolved.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['none'],
					'script-src': ['self'],
					'style-src': ['self'],
					'img-src': ['self', 'data:'],
					'connect-src': ['self'],
					'font-src': ['self'],
					'base-uri': ['none'],
					'form-action': ['none'],
					'frame-ancestors': ['none'],
					'object-src': ['none']
				}
			}
		}),
		nameTemporalPolyfillChunk()
	],
	test: {
		expect: { requireAssertions: true },
		// Node 24: native Temporal is behind this flag (TECH-STACK §11.3).
		execArgv: ['--harmony-temporal'],
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					execArgv: ['--harmony-temporal'],
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.int.test.ts']
				}
			}
		]
	}
});
