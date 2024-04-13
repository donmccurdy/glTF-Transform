// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import sveltelint from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	// @ts-ignore
	...sveltelint.configs['flat/recommended'],
	prettier,
	{
		rules: {
			'@typescript-eslint/no-non-null-assertion': ['off'],
			'@typescript-eslint/no-this-alias': ['off'],
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-use-before-define': 'off',
			'@typescript-eslint/no-var-requires': ['off'],
			'array-bracket-spacing': ['warn'],
			'comma-spacing': ['warn'],
			'max-len': ['warn', { code: 120, tabWidth: 4, ignoreUrls: true, ignorePattern: '^import|^export' }],
			'no-irregular-whitespace': ['warn'],
			'space-infix-ops': ['warn'],
			eqeqeq: ['warn', 'smart'],
			semi: ['error'],
		},
	},
	{
		files: ['test/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
);
