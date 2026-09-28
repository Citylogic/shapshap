import { describe, expect, it } from 'vitest';
import {
	PAGE_SIZE,
	availableCountLabel,
	clampPageStart,
	formatMeetingLabel,
	formatMeetingMeta,
	jumpEnd,
	respondentCountLabel,
	respondentMark,
	shiftPage,
	todayPageStart,
	truncateLink,
	visibleRangeLabel
} from './chrome';

describe('formatMeetingLabel', () => {
	it('uppercases the meeting label', () => {
		expect(formatMeetingLabel('Q4 planning sync')).toBe('Q4 PLANNING SYNC');
	});
});

describe('formatMeetingMeta', () => {
	it('leads with slot minutes then the civil range', () => {
		expect(formatMeetingMeta(30, '2026-08-20', '2026-08-28')).toBe('30 MIN · 20–28 AUG');
		expect(formatMeetingMeta(15, '2026-01-01', '2026-01-01')).toBe('15 MIN · 1 JAN');
	});
});

describe('respondentMark', () => {
	it('uses a two-letter mark from the display name', () => {
		expect(respondentMark('Ada Lovelace', 0)).toBe('AL');
		expect(respondentMark('Mary Ann Smith', 4)).toBe('MS');
		expect(respondentMark('Ada', 2)).toBe('AD');
	});

	it('falls back to G1-style for unnamed people', () => {
		expect(respondentMark(null, 0)).toBe('G1');
		expect(respondentMark('', 1)).toBe('G2');
	});
});

describe('respondentCountLabel', () => {
	it('singularises one', () => {
		expect(respondentCountLabel(0)).toBe('0 RESPONDENTS');
		expect(respondentCountLabel(1)).toBe('1 RESPONDENT');
		expect(respondentCountLabel(10)).toBe('10 RESPONDENTS');
	});
});

describe('availableCountLabel', () => {
	it('shows free of total', () => {
		expect(availableCountLabel(0, 4)).toBe('0 OF 4 ARE FREE');
		expect(availableCountLabel(1, 1)).toBe('1 OF 1 ARE FREE');
		expect(availableCountLabel(3, 4)).toBe('3 OF 4 ARE FREE');
	});
});

describe('truncateLink', () => {
	it('keeps host plus a short id prefix', () => {
		expect(truncateLink('https://shapshap.link/m/9fQ2abcdEFGH1234567890')).toBe(
			'shapshap.link/m/9fQ2...'
		);
	});

	it('leaves a non-meeting path alone', () => {
		expect(truncateLink('https://shapshap.link/why')).toBe('shapshap.link/why');
	});
});

describe('pager', () => {
	const dates = [
		'2026-08-20',
		'2026-08-21',
		'2026-08-22',
		'2026-08-23',
		'2026-08-24',
		'2026-08-25'
	];

	it('clamps inside a range longer than the viewport', () => {
		expect(clampPageStart(0, 6)).toBe(0);
		expect(clampPageStart(3, 6)).toBe(1);
		expect(clampPageStart(-2, 6)).toBe(0);
		expect(clampPageStart(0, 3)).toBe(0);
		expect(PAGE_SIZE).toBe(5);
	});

	it('steps one day and jumps to the last window', () => {
		expect(shiftPage(0, 1, 6)).toBe(1);
		expect(shiftPage(1, -1, 6)).toBe(0);
		expect(jumpEnd(6)).toBe(1);
	});

	it('opens on the window that contains today', () => {
		expect(todayPageStart(dates, '2026-08-20')).toBe(0);
		expect(todayPageStart(dates, '2026-08-25')).toBe(1);
		expect(todayPageStart(dates, '2026-01-01')).toBe(0);
	});

	it('labels the visible civil range', () => {
		expect(visibleRangeLabel(dates, 0)).toBe('20–24 Aug');
		expect(visibleRangeLabel(dates, 1)).toBe('21–25 Aug');
	});
});
