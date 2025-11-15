import micromatch from 'micromatch';

// Using 'micromatch' because 'contains: true' did not work as expected with
// minimatch. Need to ensure that '*' matches patterns like 'image/png'.
export const MICROMATCH_OPTIONS = { nocase: true, contains: true };

// See: https://github.com/micromatch/micromatch/issues/224
export function regexFromArray(values: string[]): RegExp {
	const pattern = values.map((s) => `(${s})`).join('|');
	return micromatch.makeRe(pattern, MICROMATCH_OPTIONS);
}
