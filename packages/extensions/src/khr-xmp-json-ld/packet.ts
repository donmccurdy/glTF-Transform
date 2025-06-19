import { ExtensionProperty, type IProperty, type Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_XMP_JSON_LD } from '../constants.js';

type Term = string;
type TermDefinition = string | Record<string, string>;

type Value = string | number | boolean;

const PARENT_TYPES: PropertyType[] = [
	PropertyType.ROOT,
	PropertyType.SCENE,
	PropertyType.NODE,
	PropertyType.MESH,
	PropertyType.MATERIAL,
	PropertyType.TEXTURE,
	PropertyType.ANIMATION,
];

interface IPacket extends IProperty {
	// https://json-ld.org/spec/latest/json-ld/#the-context
	context: Record<Term, TermDefinition>;
	properties: Record<string, Value | Record<string, unknown>>;
}

/**
 * Defines an XMP packet associated with a Document or Property. See {@link KHRXMP}.
 */
export class Packet extends ExtensionProperty<IPacket> {
	public declare propertyType: 'Packet';
	public declare parentTypes: typeof PARENT_TYPES;
	public declare extensionName: typeof KHR_XMP_JSON_LD;
	public static EXTENSION_NAME: typeof KHR_XMP_JSON_LD = KHR_XMP_JSON_LD;

	protected init(): void {
		this.extensionName = KHR_XMP_JSON_LD;
		this.propertyType = 'Packet';
		this.parentTypes = PARENT_TYPES;
	}

	protected getDefaults(): Nullable<IPacket> {
		return Object.assign(super.getDefaults(), { context: {}, properties: {} });
	}

	/**********************************************************************************************
	 * Context.
	 */

	/**
	 * Returns the XMP context definition URL for the given term.
	 * See: https://json-ld.org/spec/latest/json-ld/#the-context
	 * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
	 */
	public getContext(): Record<Term, TermDefinition> {
		return this.get('context');
	}

	/**
	 * Sets the XMP context definition URL for the given term.
	 * See: https://json-ld.org/spec/latest/json-ld/#the-context
	 *
	 * Example:
	 *
	 * ```typescript
	 * packet.setContext({
	 *   dc: 'http://purl.org/dc/elements/1.1/',
	 *   model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
	 * });
	 * ```
	 *
	 * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
	 * @param definition URI for XMP namespace.
	 */
	public setContext(context: Record<Term, TermDefinition>): this {
		return this.set('context', { ...context });
	}

	/**********************************************************************************************
	 * Properties.
	 */

	/**
	 * Lists properties defined in this packet.
	 *
	 * Example:
	 *
	 * ```typescript
	 * packet.listProperties(); // → ['dc:Language', 'dc:Creator', 'xmp:CreateDate']
	 * ```
	 */
	public listProperties(): string[] {
		return Object.keys(this.get('properties'));
	}

	/**
	 * Returns the value of a property, as a literal or JSONLD object.
	 *
	 * Example:
	 *
	 * ```typescript
	 * packet.getProperty('dc:Creator'); // → {"@list": ["Acme, Inc."]}
	 * packet.getProperty('dc:Title'); // → {"@type": "rdf:Alt", "rdf:_1": {"@language": "en-US", "@value": "Lamp"}}
	 * packet.getProperty('xmp:CreateDate'); // → "2022-01-01"
	 * ```
	 */
	public getProperty(name: string): Value | Record<string, unknown> | null {
		const properties = this.get('properties');
		return name in properties ? properties[name] : null;
	}

	/**
	 * Sets the value of a property, as a literal or JSONLD object.
	 *
	 * Example:
	 *
	 * ```typescript
	 * packet.setProperty('dc:Creator', {'@list': ['Acme, Inc.']});
	 * packet.setProperty('dc:Title', {
	 * 	'@type': 'rdf:Alt',
	 * 	'rdf:_1': {'@language': 'en-US', '@value': 'Lamp'}
	 * });
	 * packet.setProperty('model3d:preferredSurfaces', {'@list': ['vertical']});
	 * ```
	 */
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

	/**
	 * Serializes the packet context and properties to a JSONLD object.
	 */
	public toJSONLD(): Record<string, unknown> {
		const context = copyJSON(this.get('context'));
		const properties = copyJSON(this.get('properties'));
		return { '@context': context, ...properties };
	}

	/**
	 * Deserializes a JSONLD packet, then overwrites existing context and properties with
	 * the new values.
	 */
	public fromJSONLD(jsonld: Record<string, unknown>): this {
		jsonld = copyJSON(jsonld);

		// Context.
		const context = jsonld['@context'] as Record<Term, TermDefinition>;
		if (context) this.set('context', context);
		delete jsonld['@context'];

		// Properties.
		return this.set('properties', jsonld as Record<string, string | Record<string, unknown>>);
	}

	/**********************************************************************************************
	 * Validation.
	 */

	/** @hidden */
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
