import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** PRD/ops health check: 200 and the literal body `ok`. No version, no counts. */
export const GET: RequestHandler = () => text('ok');
