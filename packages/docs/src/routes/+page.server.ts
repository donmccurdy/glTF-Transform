import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	metadata: {
		title: 'glTF Transform',
		snippet: 'glTF 2.0 SDK for JavaScript and TypeScript, on Web and Node.js.',
	},
});
