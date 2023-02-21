import type { Document, ILogger, Transform } from '@gltf-transform/core';
import { Packet, KHRXMP } from '@gltf-transform/extensions';
import inquirer, { Question, QuestionCollection } from 'inquirer';
import languageTags from 'language-tags';
import validateSPDX from 'spdx-correct';
import fs from 'fs/promises';
import path from 'path';
import { formatXMP, XMPContext } from '../util.js';

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

async function* generateQuestions(results: Record<string, unknown>): AsyncGenerator<Question> {
	let lang = (results['dc:language'] as string) || DEFAULT_LANG;

	yield {
		type: 'checkbox',
		name: '_prompts',
		message: 'Select XMP metadata:',
		loop: false,
		pageSize: 15,
		choices: [
			{ value: Prompt.CREATOR, name: 'Creator' },
			{ value: Prompt.TITLE, name: 'Title' },
			{ value: Prompt.DESCRIPTION, name: 'Description' },
			{ value: Prompt.RELATED, name: 'Related links' },
			new inquirer.Separator(),
			{ value: Prompt.CREATE_DATE, name: 'Date created' },
			new inquirer.Separator(),
			{ value: Prompt.LANGUAGE, name: 'Language' },
			new inquirer.Separator(),
			{ value: Prompt.RIGHTS, name: 'License and rights' },
			new inquirer.Separator(),
			{ value: Prompt.PREFERRED_SURFACE, name: 'Preferred surfaces (AR)' },
		],
	} as Question;

	const prompts = new Set<Prompt>(results._prompts as Prompt[]);

	// Prompt for 'dc:language' first, used as the default for Language Alternative entries.
	if (prompts.has(Prompt.LANGUAGE)) {
		yield {
			type: 'input',
			name: 'dc:language',
			message: 'Language?',
			suffix: ' (dc:language)',
			validate: (input: string) =>
				languageTags.check(input) ? true : 'Invalid language; refer to IETF RFC 3066.',
			default: DEFAULT_LANG,
		};

		lang = results['dc:language'] as string;
	}

	if (prompts.has(Prompt.CREATOR)) {
		yield {
			type: 'input',
			name: 'dc:creator',
			message: 'Creator of the model?',
			suffix: ' (dc:creator)',
			filter: (input: string) => createList([input]),
			transformer: formatXMP,
		} as Question;
	}

	if (prompts.has(Prompt.TITLE)) {
		yield {
			type: 'input',
			name: 'dc:title',
			message: 'Title of the model?',
			suffix: ' (dc:title)',
			filter: (input: string) => createLanguageAlternative(input, lang),
			transformer: formatXMP,
		} as Question;
	}

	if (prompts.has(Prompt.DESCRIPTION)) {
		yield {
			type: 'input',
			name: 'dc:description',
			message: 'Description of the model?',
			suffix: ' (dc:description)',
			filter: (input: string) => createLanguageAlternative(input, lang),
			transformer: formatXMP,
		} as Question;
	}

	if (prompts.has(Prompt.RELATED)) {
		yield {
			type: 'input',
			name: 'dc:relation',
			message: 'Related links?',
			suffix: ' Comma-separated URLs. (dc:relation)',
			filter: (input: string) => createList(input.split(/[,\n]/).map((url) => url.trim())),
			transformer: formatXMP,
		} as Question;
	}

	if (prompts.has(Prompt.RIGHTS)) {
		yield {
			type: 'list',
			name: '_rights',
			message: 'Is the model rights-managed?',
			suffix: ' (dc:rights, xmpRights:Marked, model3d:spdxLicense)',
			loop: false,
			pageSize: 15,
			choices: [
				// Common SPDX license identifiers applicable to creative works.
				{ value: '', name: 'Unspecified' },
				{ value: 'UNLICENSED', name: 'Restricted by copyright, trademark, or other marking' },
				{ value: 'CC0-1.0', name: 'Public domain (CC0-1.0)' },
				{ value: 'CC-BY-4.0', name: 'Creative Commons Attribution (CC-BY-4.0)' },
				{ value: 'CC-BY-ND-4.0', name: 'Creative Commons Attribution-NoDerivs (CC-BY-ND-4.0)' },
				{ value: 'CC-BY-SA-4.0', name: 'Creative Commons Attribution-ShareAlike (CC-BY-SA-4.0)' },
				{ value: 'CC-BY-NC-4.0', name: 'Creative Commons Attribution-NonCommercial (CC-BY-NC-4.0)' },
				{
					value: 'CC-BY-NC-ND-4.0',
					name: 'Creative Commons Attribution-NonCommercial-NoDerivs (CC-BY-NC-ND-4.0)',
				},
				{
					value: 'CC-BY-NC-SA-4.0',
					name: 'Creative Commons Attribution-NonCommercial-ShareAlike (CC-BY-NC-SA-4.0)',
				},
				{ value: 'OTHER', name: 'Other license' },
			],
		} as Question;

		if (results._rights === 'UNLICENSED') {
			results['xmpRights:Marked'] = true;

			yield {
				type: 'input',
				name: 'xmpRights:Owner',
				message: 'Who is the intellectual property (IP) owner?',
				suffix: ' (xmpRights:Owner)',
				filter: (input: string) => createList([input]),
				transformer: formatXMP,
			} as Question;

			yield {
				type: 'input',
				name: '_usage',
				message: 'Other usage instructions?',
				suffix: ' Plain text or URL. (xmpRights:UsageTerms, xmpRights:WebStatement)',
			};

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
				suffix: ' See https://spdx.dev/.',
			};

			if (results._isLicenseSPDX) {
				yield {
					type: 'input',
					name: 'model3d:spdxLicense',
					message: 'What is the SPDX license ID?',
					suffix: ' (model3d:spdxLicense)',
					validate: (input: string) =>
						validateSPDX(input) ? true : 'Invalid SPDX ID; refer to https://spdx.dev/.',
				};
			} else {
				yield {
					type: 'input',
					name: 'dc:rights',
					message: 'What is the plain text license or rights statement?',
					suffix: ' (dc:rights)',
					filter: (input: string) => createLanguageAlternative(input, lang),
					transformer: formatXMP,
				} as Question;
			}
		}
	}

	if (prompts.has(Prompt.CREATE_DATE)) {
		yield {
			type: 'input',
			name: 'xmp:CreateDate',
			message: 'Date created?',
			suffix: ' (xmp:CreateDate)',
			default: new Date().toISOString().substring(0, 10),
			validate: validateDate,
		};
	}

	if (prompts.has(Prompt.PREFERRED_SURFACE)) {
		yield {
			type: 'checkbox',
			name: 'model3d:preferredSurfaces',
			message: 'Preferred surfaces for augmented reality (AR)? Select all that apply.',
			suffix: ' (model3d:preferredSurfaces)',
			loop: false,
			pageSize: 15,
			choices: [
				{
					value: 'horizontal_up',
					short: 'horizontal_up',
					name: 'horizontal_up (rests on top of horizontal surfaces)',
				},
				{
					value: 'horizontal_down',
					short: 'horizontal_down',
					name: 'horizontal_down (suspended from horizonal surfaces)',
				},
				{
					value: 'vertical',
					short: 'vertical',
					name: 'vertical (attaches to vertical surfaces)',
				},
				{
					value: 'human_face',
					short: 'human_face',
					name: 'human_face (worn or displayed on a human face)',
				},
			],
			filter: (input: string[]) => createList(input),
			transformer: formatXMP,
		} as Question;
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
				Object.assign(results, await inquirer.prompt(question as QuestionCollection));
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
				' Try another terminal or provide a --packet JSON-LD input.'
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

function validateDate(input: string): boolean | string {
	const [date] = input.split('T');

	if (!/\d{4}-\d{2}-\d{2}/.test(date) || new Date(date).toISOString().substring(0, 10) !== date) {
		return 'Invalid ISO date string.';
	}

	return true;
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
