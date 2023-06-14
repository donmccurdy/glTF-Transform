import { Nullable, PropertyType } from '../constants.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';

interface IBuffer extends IExtensibleProperty {
	uri: string;
}

/**
 * *Buffers are low-level storage units for binary data.*
 *
 * glTF 2.0 has three concepts relevant to binary storage: accessors, buffer views, and buffers.
 * In glTF Transform, an {@link Accessor} is referenced by any property that requires numeric typed
 * array data. Meshes, Primitives, and Animations all reference Accessors. Buffers define how that
 * data is organized into transmitted file(s). A `.glb` file has only a single Buffer, and when
 * exporting to `.glb` your resources should be grouped accordingly. A `.gltf` file may reference
 * one or more `.bin` files — each `.bin` is a Buffer — and grouping Accessors under different
 * Buffers allow you to specify that structure.
 *
 * For engines that can dynamically load portions of a glTF file, splitting data into separate
 * buffers can allow you to avoid loading data until it is needed. For example, you might put
 * binary data for specific meshes into a different `.bin` buffer, or put each animation's binary
 * payload into its own `.bin`.
 *
 * Buffer Views define how Accessors are organized within a given Buffer. glTF Transform creates an
 * efficient Buffer View layout automatically at export: there is no Buffer View property exposed
 * by the glTF Transform API, simplifying data management.
 *
 * Usage:
 *
 * ```ts
 * // Create two buffers with custom filenames.
 * const buffer1 = doc.createBuffer('buffer1')
 * 	.setURI('part1.bin');
 * const buffer2 = doc.createBuffer('buffer2')
 * 	.setURI('part2.bin');
 *
 * // Assign the attributes of two meshes to different buffers. If the meshes
 * // had indices or morph target attributes, you would also want to relocate
 * // those accessors.
 * mesh1
 * 	.listPrimitives()
 * 	.forEach((primitive) => primitive.listAttributes()
 * 		.forEach((attribute) => attribute.setBuffer(buffer1)));
 * mesh2
 * 	.listPrimitives()
 * 	.forEach((primitive) => primitive.listAttributes()
 * 		.forEach((attribute) => attribute.setBuffer(buffer2)));
 *
 * // Write to disk. Each mesh's binary data will be in a separate binary file;
 * // any remaining accessors will be in a third (default) buffer.
 * await new NodeIO().write('scene.gltf', doc);
 * // → scene.gltf, part1.bin, part2.bin
 * ```
 *
 * References:
 * - [glTF → Buffers and Buffer Views](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#buffers-and-buffer-views)
 * - [glTF → Accessors](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#accessors)
 *
 * @category Properties
 */
export class Buffer extends ExtensibleProperty<IBuffer> {
	public declare propertyType: PropertyType.BUFFER;

	protected init(): void {
		this.propertyType = PropertyType.BUFFER;
	}

	protected getDefaults(): Nullable<IBuffer> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, { uri: '' });
	}

	/**
	 * Returns the URI (or filename) of this buffer (e.g. 'myBuffer.bin'). URIs are strongly
	 * encouraged to be relative paths, rather than absolute. Use of a protocol (like `file://`)
	 * is possible for custom applications, but will limit the compatibility of the asset with most
	 * tools.
	 *
	 * Buffers commonly use the extension `.bin`, though this is not required.
	 */
	public getURI(): string {
		return this.get('uri');
	}

	/**
	 * Sets the URI (or filename) of this buffer (e.g. 'myBuffer.bin'). URIs are strongly
	 * encouraged to be relative paths, rather than absolute. Use of a protocol (like `file://`)
	 * is possible for custom applications, but will limit the compatibility of the asset with most
	 * tools.
	 *
	 * Buffers commonly use the extension `.bin`, though this is not required.
	 */
	public setURI(uri: string): this {
		return this.set('uri', uri);
	}
}
