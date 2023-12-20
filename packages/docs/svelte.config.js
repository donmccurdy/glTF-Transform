import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import hljs from 'highlight.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			highlight: {
				highlighter: function (code, lang) {
					const language = hljs.getLanguage(lang) ? lang : 'plaintext';
					const html = hljs.highlight(code, { language }).value;
					return `<pre class="language-${lang}">{@html \`<code class="language-${lang}">${html}</code>\`}</pre>`;
				}
			}
		})
	],
	kit: { adapter: adapter() }
};

export default config;
