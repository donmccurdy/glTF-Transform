import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Mapping } from './mapping';
import { MappingList } from './mapping-list';
import { Variant } from './variant';

const NAME = KHR_MATERIALS_VARIANTS;

/** Documentation in {@link EXTENSIONS.md}. */
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
		const variantDefs = jsonDoc.json.extensions[NAME]['variants'] || [];
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

				for (const mappingDef of primDef.extensions[NAME]['mappings']) {
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
			const meshIndex = context.meshIndexMap.get(mesh);

			mesh.listPrimitives().forEach((prim, primIndex) => {
				if (!prim.getExtension(NAME)) return;

				const primDef = context.jsonDoc.json.meshes[meshIndex].primitives[primIndex];
				const mappingList = prim.getExtension<MappingList>(NAME);

				const mappingDefs = mappingList.listMappings().map((mapping) => {
					const mappingDef = context.createPropertyDef(mapping);

					if (mapping.getMaterial()) {
						mappingDef['material'] =
							context.materialIndexMap.get(mapping.getMaterial());
					}

					mappingDef['variants'] = mapping.listVariants()
						.map((variant) => variantIndexMap.get(variant));

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
