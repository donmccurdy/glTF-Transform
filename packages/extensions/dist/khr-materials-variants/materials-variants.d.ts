import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Mapping } from './mapping';
import { MappingList } from './mapping-list';
import { Variant } from './variant';
/**
 * # MaterialsVariants
 *
 * [`KHR_materials_variants`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants/)
 * defines alternate {@link Material} states for any {@link Primitive} in the scene.
 *
 * ![Illustration](/media/extensions/khr-materials-variants.png)
 *
 * > _**Figure:** A sneaker, in three material variants. Source: Khronos Group._
 *
 * Uses include product configurators, night/day states, healthy/damaged states, etc. The
 * `MaterialsVariants` class provides three {@link ExtensionProperty} types: `Variant`, `Mapping`,
 * and `MappingList`. When attached to {@link Primitive} properties, these offer flexible ways of
 * defining the variants available to an application. Triggering a variant is out of scope of this
 * extension, but could be handled in the application with a UI dropdown, particular game states,
 * and so on.
 *
 * Mesh geometry cannot be changed by this extension, although another extension
 * (tentative: `KHR_mesh_variants`) is under consideration by the Khronos Group, for that purpose.
 *
 * Properties:
 * - {@link Variant}
 * - {@link Mapping}
 * - {@link MappingList}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsVariants } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const variantExtension = document.createExtension(MaterialsVariants);
 *
 * // Create some Variant states.
 * const healthyVariant = variantExtension.createVariant('Healthy');
 * const damagedVariant = variantExtension.createVariant('Damaged');
 *
 * // Create mappings from a Variant state to a Material.
 * const healthyMapping = variantExtension.createMapping()
 * 	.addVariant(healthyVariant)
 * 	.setMaterial(healthyMat);
 * const damagedMapping = variantExtension.createMapping()
 * 	.addVariant(damagedVariant)
 * 	.setMaterial(damagedMat);
 *
 * // Attach the mappings to a Primitive.
 * primitive.setExtension(
 * 	'KHR_materials_variants',
 * 	variantExtension.createMappingList()
 * 		.addMapping(healthyMapping)
 * 		.addMapping(damagedMapping)
 * );
 * ```
 *
 * A few notes about this extension:
 *
 * 1. Viewers that don't recognized this extension will show the default material for each primitive
 * 	 instead, so assign that material accordingly. This material can be — but doesn't have to be —
 * 	 associated with one of the available variants.
 * 2. Mappings can list multiple Variants. In that case, the first Mapping containing an active
 * 	 Variant will be chosen by the viewer.
 * 3. Variant names are how these states are identified, so choose informative names.
 * 4. When writing the file to an unpacked `.gltf`, instead of an embedded `.glb`, viewers will have
 * 	 the option of downloading only textures associated with the default state, and lazy-loading
 * 	 any textures for inactive Variants only when they are needed.
 */
export declare class MaterialsVariants extends Extension {
    readonly extensionName = "KHR_materials_variants";
    static readonly EXTENSION_NAME = "KHR_materials_variants";
    /** Creates a new MappingList property. */
    createMappingList(): MappingList;
    /** Creates a new Variant property. */
    createVariant(name?: string): Variant;
    /** Creates a new Mapping property. */
    createMapping(): Mapping;
    /** Lists all Variants on the current Document. */
    listVariants(): Variant[];
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
