import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** PRD §14 words that never appear in UI strings / templates. */
const BANNED = [
	/\bsimply\b/i,
	/\bjust\b/i,
	/\beasily\b/i,
	/\bseamlessly\b/i,
	/\beffortlessly\b/i,
	/get started/i,
	/\bwelcome\b/i,
	/your availability/i,
	/\bevent\b/i,
	/\bpoll\b/i,
	/\binvite\b/i,
	/\borganiser\b/i,
	/\bdashboard\b/i,
	/powered by/i,
	/we're sorry/i,
	/\boops\b/i,
	/\bprivate\b/i,
	/\bsecure\b/i,
	/\bencrypted\b/i,
	/zero-knowledge/i,
	/\banonymous\b/i
];

function walk(dir: string, acc: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, acc);
		else if (name.endsWith('.svelte') || name === 'copy.ts') acc.push(path);
	}
	return acc;
}

describe('banned words (PRD §14)', () => {
	it('do not appear in user-visible copy files', () => {
		const files = [...walk('src/routes'), ...walk('src/lib'), 'static/og.svg'];
		const hits: string[] = [];
		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			for (const re of BANNED) {
				if (re.test(text)) hits.push(`${file} matches ${re}`);
			}
		}
		expect(hits).toEqual([]);
	});

	it('does not ship the /dev/grid preview route', () => {
		expect(existsSync('src/routes/dev')).toBe(false);
	});
});
