import { Nullable, PropertyType, ExtensionProperty, IProperty } from '@gltf-transform/core';
import { KHR_XMP_JSON_LD } from '../constants';

type Term = string;
type TermDefinition = string | Record<string, string>;

type Value = string | number | boolean;

const PARENT_TYPES = [
	PropertyType.ROOT,
	PropertyType.SCENE,
	PropertyType.NODE,
	PropertyType.MESH,
	PropertyType.MATERIAL,
	PropertyType.TEXTURE,
	PropertyType.ANIMATION,
];

const DEFAULT_CONTEXT: Record<Term, TermDefinition> = {
	dc: 'http://purl.org/dc/elements/1.1/',
	model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	xmp: 'http://ns.adobe.com/xap/1.0/',
	xmpRights: 'http://ns.adobe.com/xap/1.0/rights/',
};

interface IPacket extends IProperty {
	// https://json-ld.org/spec/latest/json-ld/#the-context
	context: Record<Term, TermDefinition>;
	properties: Record<string, Value | Record<string, unknown>>;
}

export class Packet extends ExtensionProperty<IPacket> {
	public declare propertyType: 'Packet';
	public declare parentTypes: typeof PARENT_TYPES;
	public declare extensionName: typeof KHR_XMP_JSON_LD;
	public static EXTENSION_NAME = KHR_XMP_JSON_LD;

	protected init(): void {
		this.extensionName = KHR_XMP_JSON_LD;
		this.propertyType = 'Packet';
		this.parentTypes = PARENT_TYPES;
	}

	protected getDefaults(): Nullable<IPacket> {
		return Object.assign(super.getDefaults(), { context: DEFAULT_CONTEXT, properties: {} });
	}

	/**********************************************************************************************
	 * Context.
	 */

	public listContextTerms(): Term[] {
		return Object.keys(this.get('context'));
	}

	public getContext(term: Term): TermDefinition | null {
		return this.get('context')[term] || null;
	}

	public setContext(term: Term, definition: TermDefinition | null): this {
		const context = { ...this.get('context') };
		if (definition) {
			context[term] = definition;
		} else {
			delete context[term];
		}
		return this.set('context', context);
	}

	/**********************************************************************************************
	 * Properties.
	 */

	public listProperties(): string[] {
		return Object.keys(this.get('properties'));
	}

	public getProperty(name: string): Value | Record<string, unknown> {
		return this.get('properties')[name];
	}

	public setProperty(name: string, value: Value | Record<string, unknown>): this {
		this._assertContext(name);

		const properties = { ...this.get('properties') };
		if (value) {
			properties[name] = value;
		} else {
			delete properties[name];
		}
		return this.set('properties', properties);
	}

	/**********************************************************************************************
	 * Serialize / Deserialize.
	 */

	public toJSONLD(): Record<string, unknown> {
		const availableContext = this.get('context');
		const context = {} as Record<Term, TermDefinition>;
		const properties = copyJSON(this.get('properties'));

		// Include only required context terms.
		for (const name of listPrefixes(properties)) {
			const prefix = name.split(':')[0];
			context[prefix] = availableContext[prefix];
		}
		return { '@context': context, ...properties };
	}

	public fromJSONLD(jsonld: Record<string, unknown>): this {
		jsonld = copyJSON(jsonld);

		// Context.
		const context = jsonld['@context'] as Record<Term, TermDefinition>;
		if (context) this.set('context', { ...DEFAULT_CONTEXT, ...context });
		delete jsonld['@context'];

		// Properties.
		return this.set('properties', jsonld as Record<string, string | Record<string, unknown>>);
	}

	/**********************************************************************************************
	 * Validation.
	 */

	private _assertContext(name: string) {
		const prefix = name.split(':')[0];
		if (!(prefix in this.get('context'))) {
			throw new Error(`${KHR_XMP_JSON_LD}: Missing context for term, "${name}".`);
		}
	}
}

function copyJSON<T>(object: T): T {
	return JSON.parse(JSON.stringify(object));
}

function listPrefixes(_object: unknown, acc: Set<string> = new Set()): Set<string> {
	if (Object.prototype.toString.call(_object) !== '[object Object]') return acc;

	const object = _object as Record<string, unknown>;
	for (const key in object) {
		const value = object[key];
		const [prefix, suffix] = key.split(':');
		if (prefix && suffix) {
			acc.add(prefix);
			listPrefixes(value, acc);
		}
	}

	return acc;
}
