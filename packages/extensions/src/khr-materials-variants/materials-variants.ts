import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Mapping } from './mapping';
import { MappingList } from './mapping-list';
import { Variant } from './variant';

const NAME = KHR_MATERIALS_VARIANTS;

interface VariantsRootDef {
	variants: VariantDef[];
}

interface VariantDef {
	name?: string;
}

interface VariantPrimDef {
	mappings: VariantMappingDef[];
}

interface VariantMappingDef {
	material: number;
	variants: number[];
}

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
export class MaterialsVariants extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createMappingList(): MappingList {
		return new MappingList(this.doc.getGraph(), this);
	}

	public createVariant(name = ''): Variant {
		return new Variant(this.doc.getGraph(), this).setName(name);
	}

	public createMapping(): Mapping {
		return new Mapping(this.doc.getGraph(), this);
	}

	public listVariants(): Variant[] {
		return Array.from(this.properties)
			.filter((prop) => prop instanceof Variant) as Variant[];
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;

		if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME]) return this;

		// Read all top-level variant names.
		const variantsRootDef = jsonDoc.json.extensions[NAME] as VariantsRootDef;
		const variantDefs = variantsRootDef.variants || [];
		const variants = variantDefs
			.map((variantDef) => this.createVariant().setName(variantDef.name || ''));

		// For each mesh primitive, read its material/variant mappings.
		const meshDefs = jsonDoc.json.meshes || [];
		meshDefs.forEach((meshDef, meshIndex) => {
			const mesh = context.meshes[meshIndex];
			const primDefs = meshDef.primitives || [];

			primDefs.forEach((primDef, primIndex) => {
				if (!primDef.extensions || !primDef.extensions[NAME]) {
					return;
				}

				const mappingList = this.createMappingList();

				const variantPrimDef = primDef.extensions[NAME] as VariantPrimDef;
				for (const mappingDef of variantPrimDef.mappings) {
					const mapping = this.createMapping();

					if (mappingDef.material !== undefined) {
						mapping.setMaterial(context.materials[mappingDef.material]);
					}

					for (const variantIndex of mappingDef.variants || []) {
						mapping.addVariant(variants[variantIndex]);
					}

					mappingList.addMapping(mapping);
				}

				mesh.listPrimitives()[primIndex].setExtension(NAME, mappingList);
			});
		});

		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		const variants = this.listVariants();
		if (!variants.length) return this;


		// Write all top-level variant names.
		const variantDefs = [];
		const variantIndexMap = new Map<Variant, number>();
		for (const variant of variants) {
			variantIndexMap.set(variant, variantDefs.length);
			variantDefs.push(context.createPropertyDef(variant));
		}

		// For each mesh primitive, write its material/variant mappings.
		for (const mesh of this.doc.getRoot().listMeshes()) {
			const meshIndex = context.meshIndexMap.get(mesh)!;

			mesh.listPrimitives().forEach((prim, primIndex) => {
				const mappingList = prim.getExtension<MappingList>(NAME);
				if (!mappingList) return;

				const primDef = context.jsonDoc.json.meshes![meshIndex].primitives[primIndex];


				const mappingDefs = mappingList.listMappings().map((mapping) => {
					const mappingDef = context.createPropertyDef(mapping) as VariantMappingDef;

					const material = mapping.getMaterial();
					if (material) {
						mappingDef.material = context.materialIndexMap.get(material)!;
					}

					mappingDef.variants = mapping.listVariants()
						.map((variant) => variantIndexMap.get(variant)!);

					return mappingDef;
				});

				primDef.extensions = primDef.extensions || {};
				primDef.extensions[NAME] = {mappings: mappingDefs};
			});
		}

		jsonDoc.json.extensions = jsonDoc.json.extensions || {};
		jsonDoc.json.extensions[NAME] = {variants: variantDefs};

		return this;
	}
}
