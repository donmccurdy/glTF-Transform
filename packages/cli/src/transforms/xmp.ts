import type { Document, ILogger, Transform } from '@gltf-transform/core';
import { Packet, KHRXMP } from '@gltf-transform/extensions';
import prompts, { PromptObject } from 'prompts';
import languageTags from 'language-tags';
import validateSPDX from 'spdx-correct';
import fs from 'fs/promises';
import path from 'path';
import { XMPContext } from '../util.js';

const DEFAULT_LANG = 'en-US';

export interface XMPOptions {
	packet?: string;
	reset?: boolean;
}

export const XMP_DEFAULTS = {
	packet: '',
	reset: false,
};

enum Prompt {
	CREATOR,
	DESCRIPTION,
	LANGUAGE,
	TITLE,
	RELATED,
	PREFERRED_SURFACE,
	CREATE_DATE,
	RIGHTS,
}

async function* generateQuestions(results: Record<string, unknown>): AsyncGenerator<PromptObject> {
	let lang = (results['dc:language'] as string) || DEFAULT_LANG;

	yield {
		type: 'multiselect',
		name: '_prompts',
		message: 'Select XMP metadata:',
		choices: [
			{ value: Prompt.CREATOR, title: 'Creator' },
			{ value: Prompt.TITLE, title: 'Title' },
			{ value: Prompt.DESCRIPTION, title: 'Description' },
			{ value: Prompt.RELATED, title: 'Related links' },
			{ value: Prompt.CREATE_DATE, title: 'Date created' },
			{ value: Prompt.LANGUAGE, title: 'Language' },
			{ value: Prompt.RIGHTS, title: 'License and rights' },
			{ value: Prompt.PREFERRED_SURFACE, title: 'Preferred surfaces (AR)' },
		],
	} as PromptObject;

	const prompts = new Set<Prompt>(results._prompts as Prompt[]);

	// Prompt for 'dc:language' first, used as the default for Language Alternative entries.
	if (prompts.has(Prompt.LANGUAGE)) {
		yield {
			type: 'text',
			name: 'dc:language',
			message: 'Language?',
			hint: ' (dc:language)',
			initial: DEFAULT_LANG,
			validate: (input: string) =>
				languageTags.check(input) ? true : 'Invalid language; refer to IETF RFC 3066.',
		};

		lang = results['dc:language'] as string;
	}

	if (prompts.has(Prompt.CREATOR)) {
		yield {
			type: 'text',
			name: 'dc:creator',
			message: 'Creator of the model?',
			hint: ' (dc:creator)',
			format: (input: string) => createList([input]),
		} as PromptObject;
	}

	if (prompts.has(Prompt.TITLE)) {
		yield {
			type: 'text',
			name: 'dc:title',
			message: 'Title of the model?',
			hint: ' (dc:title)',
			format: (input: string) => createLanguageAlternative(input, lang),
		} as PromptObject;
	}

	if (prompts.has(Prompt.DESCRIPTION)) {
		yield {
			type: 'text',
			name: 'dc:description',
			message: 'Description of the model?',
			hint: ' (dc:description)',
			format: (input: string) => createLanguageAlternative(input, lang),
		} as PromptObject;
	}

	if (prompts.has(Prompt.RELATED)) {
		yield {
			type: 'list',
			name: 'dc:relation',
			message: 'Related links?',
			hint: ' Comma-separated URLs. (dc:relation)',
			format: (input: string[]) => createList(input),
		} as PromptObject;
	}

	if (prompts.has(Prompt.RIGHTS)) {
		yield {
			type: 'select',
			name: '_rights',
			message: 'Is the model rights-managed?',
			hint: ' (dc:rights, xmpRights:Marked, model3d:spdxLicense)',
			choices: [
				// Common SPDX license identifiers applicable to creative works.
				{ value: '', title: 'Unspecified' },
				{ value: 'UNLICENSED', title: 'Restricted by copyright, trademark, or other marking' },
				{ value: 'CC0-1.0', title: 'Public domain (CC0-1.0)' },
				{ value: 'CC-BY-4.0', title: 'Creative Commons Attribution (CC-BY-4.0)' },
				{ value: 'CC-BY-ND-4.0', title: 'Creative Commons Attribution-NoDerivs (CC-BY-ND-4.0)' },
				{ value: 'CC-BY-SA-4.0', title: 'Creative Commons Attribution-ShareAlike (CC-BY-SA-4.0)' },
				{ value: 'CC-BY-NC-4.0', title: 'Creative Commons Attribution-NonCommercial (CC-BY-NC-4.0)' },
				{
					value: 'CC-BY-NC-ND-4.0',
					title: 'Creative Commons Attribution-NonCommercial-NoDerivs (CC-BY-NC-ND-4.0)',
				},
				{
					value: 'CC-BY-NC-SA-4.0',
					title: 'Creative Commons Attribution-NonCommercial-ShareAlike (CC-BY-NC-SA-4.0)',
				},
				{ value: 'OTHER', title: 'Other license' },
			],
		} as PromptObject;

		if (results._rights === 'UNLICENSED') {
			results['xmpRights:Marked'] = true;

			yield {
				type: 'text',
				name: 'xmpRights:Owner',
				message: 'Who is the intellectual property (IP) owner?',
				hint: ' (xmpRights:Owner)',
				format: (input: string) => createList([input]),
			} as PromptObject;

			yield {
				type: 'text',
				name: '_usage',
				message: 'Other usage instructions?',
				hint: ' Plain text or URL. (xmpRights:UsageTerms, xmpRights:WebStatement)',
			} as PromptObject;

			const usage = results._usage as string;
			if (/^https?:\/\//.test(usage)) {
				results['xmpRights:WebStatement'] = usage;
			} else if (usage) {
				results['xmpRights:UsageTerms'] = createLanguageAlternative(usage, lang);
			}
		}

		if (results._rights === 'OTHER') {
			yield {
				type: 'confirm',
				name: '_isLicenseSPDX',
				message: 'Does the license have an SPDX ID?',
				hint: ' See https://spdx.dev/.',
			} as PromptObject;

			if (results._isLicenseSPDX) {
				yield {
					type: 'text',
					name: 'model3d:spdxLicense',
					message: 'What is the SPDX license ID?',
					hint: ' (model3d:spdxLicense)',
					validate: (input: string) =>
						validateSPDX(input) ? true : 'Invalid SPDX ID; refer to https://spdx.dev/.',
				} as PromptObject;
			} else {
				yield {
					type: 'text',
					name: 'dc:rights',
					message: 'What is the plain text license or rights statement?',
					hint: ' (dc:rights)',
					format: (input: string) => createLanguageAlternative(input, lang),
				} as PromptObject;
			}
		}
	}

	if (prompts.has(Prompt.CREATE_DATE)) {
		yield {
			type: 'date',
			name: 'xmp:CreateDate',
			message: 'Date created?',
			hint: ' (xmp:CreateDate)',
			mask: 'YYYY-MM-DD',
			format: (d) => d.toISOString().substring(0, 10)
		} as PromptObject;
	}

	if (prompts.has(Prompt.PREFERRED_SURFACE)) {
		yield {
			type: 'multiselect',
			name: 'model3d:preferredSurfaces',
			message: 'Preferred surfaces for augmented reality (AR)? Select all that apply.',
			hint: ' (model3d:preferredSurfaces)',
			choices: [
				{
					value: 'horizontal_up',
					title: 'horizontal_up (rests on top of horizontal surfaces)',
				},
				{
					value: 'horizontal_down',
					title: 'horizontal_down (suspended from horizonal surfaces)',
				},
				{
					value: 'vertical',
					title: 'vertical (attaches to vertical surfaces)',
				},
				{
					value: 'human_face',
					title: 'human_face (worn or displayed on a human face)',
				},
			],
			format: (input: string[]) => createList(input),
		} as PromptObject;
	}
}

export const xmp = (_options: XMPOptions = XMP_DEFAULTS): Transform => {
	const options = { ...XMP_DEFAULTS, ..._options } as Required<XMPOptions>;

	return async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const root = document.getRoot();
		const xmpExtension = document.createExtension(KHRXMP);

		if (options.reset) {
			xmpExtension.dispose();
			logger.info('[xmp]: Reset XMP metadata.');
			logger.debug('[xmp]: Complete.');
			return;
		}

		if (options.packet) {
			const packetPath = path.resolve(options.packet);
			logger.info(`[xmp]: Loading "${packetPath}"...`);
			const packetJSON = await fs.readFile(packetPath, 'utf-8');
			const packetDef = validatePacket(JSON.parse(packetJSON));
			const packet = xmpExtension.createPacket().fromJSONLD(packetDef);
			root.setExtension('KHR_xmp_json_ld', packet);
			logger.debug('[xmp]: Complete.');
			return;
		}

		const packet = root.getExtension<Packet>('KHR_xmp_json_ld') || xmpExtension.createPacket();
		const results = packet.toJSONLD();

		try {
			for await (const question of generateQuestions(results)) {
				Object.assign(results, await prompts(question));
			}
		} catch (e) {
			checkTTY(e, logger);
			throw e;
		}

		// Context.
		packet.setContext({
			...packet.getContext(),
			...createContext(results),
			xmp: XMPContext.xmp, // required for xmp:MetadataDate below.
		});

		// Properties.
		let numProperties = 0;
		for (const name in results) {
			// NOTICE: Calling 'continue' in this context hits a Babel bug.
			if (!name.startsWith('_') && !name.startsWith('@') && results[name]) {
				packet.setProperty(name, results[name] as string);
				numProperties++;
			}
		}

		if (numProperties === 0) {
			throw new Error('xmp: No properties added.');
		}

		// xmp:MetadataDate should be the same as, or more recent than, xmp:ModifyDate.
		packet.setProperty('xmp:MetadataDate', new Date().toISOString().substring(0, 10));

		root.setExtension('KHR_xmp_json_ld', packet);

		logger.debug(`[xmp]: Packet contents: ${JSON.stringify(packet.toJSONLD(), null, 2)}`);
		logger.debug('[xmp]: Complete.');
	};
};

/** Validates a JSON-LD XMP packet for basic expectations. */
function validatePacket(packetDef: Record<string, unknown>): Record<string, unknown> {
	// Check context.
	const context = packetDef['@context'] as Record<string, unknown>;
	if (!context) {
		throw new Error('Missing @context in packet.');
	}

	// Check properties.
	for (const name in packetDef) {
		if (name.startsWith('@')) continue;

		const prefix = name.split(':')[0];
		if (!prefix) {
			throw new Error(`Invalid property, "${name}"`);
		}
		if (!(prefix in context)) {
			throw new Error(`Missing context definition, "${prefix}"`);
		}
	}

	return packetDef;
}

/**
 * The 'inquirer' library supports most terminal clients, but won't run in non-interactive
 * environments. Check errors and try to provide a useful warning to the user.
 * See: https://github.com/SBoudrias/Inquirer.js#Support.
 */
function checkTTY(error: unknown, logger: ILogger) {
	if ((error as { isTtyError?: boolean }).isTtyError) {
		logger.warn(
			'Unable to run "inquirer" session in this terminal environment.' +
				' Try another terminal or provide a --packet JSON-LD input.',
		);
	}
}

/** Creates a Language Alternative entry with a single language. */
function createLanguageAlternative(value: string, language: string): Record<string, unknown> | null {
	if (!value) return null;
	return {
		'@type': 'rdf:Alt',
		'rdf:_1': {
			'@language': language,
			'@value': value,
		},
	};
}

/** Creates a List entry. */
function createList(list: string[]): Record<string, unknown> | null {
	list = list.filter((value) => !!value);
	if (!list.length) return null;
	return { '@list': list };
}

function createContext(_object: unknown, acc: Record<string, string> = {}): Record<string, string> {
	if (Object.prototype.toString.call(_object) !== '[object Object]') return acc;

	const object = _object as Record<string, unknown>;
	for (const key in object) {
		const value = object[key];
		const [prefix, suffix] = key.split(':');
		if (prefix && suffix && prefix in XMPContext) {
			acc[prefix] = XMPContext[prefix];
			createContext(value, acc);
		}
	}

	return acc;
}
