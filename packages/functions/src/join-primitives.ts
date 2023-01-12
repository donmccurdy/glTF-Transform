import type { Accessor, Document, Material, Primitive } from '@gltf-transform/core';

/**
 * Given a list of mesh {@link Primitive Primitives}, returns a new list of Primitives
 * in which all compatible Primitives have been joined. Compatibility is determined
 * based on {@link Material Materials}, vertex attributes, and morph targets. Resulting
 * Primitives use default accessor types (e.g. float32), and are not quantized.
 *
 * Example:
 *
 * ```javascript
 * import { joinPrimitives } from '@gltf-transform/functions';
 *
 * // Output will contain multiple primitives if not all inputs are compatible.
 * const [prim] = joinPrimitives(document, mesh.listPrimitives());
 *
 * for (const prim of mesh.listPrimitives()) {
 *  prim.dispose();
 * }
 *
 * mesh.addPrimitive(prim);
 * ```
 */
export function joinPrimitives(document: Document, prims: Primitive[]): Primitive[] {
	const result = [];

	// TODO(🚩): Do I actually want this method identifying the groups? Or should that be
	// configurable and passed in, bailing out if they're incompatible? Do we need to be
	// able to return information about which primitive went where?

	// Allocate groups.
	const groups = new Map<Material | null, Map<string, Primitive[]>>();
	for (const prim of prims) {
		const material = prim.getMaterial();
		if (!groups.has(material)) groups.set(material, new Map());
	}

	// Assign primitives to join-able groups.
	for (const prim of prims) {
		const primKey = _primKey(prim);
		const materialGroup = groups.get(prim.getMaterial())!;

		let group = materialGroup.get(primKey);
		if (!group) {
			group = [];
			materialGroup.set(primKey, group);
		}

		group.push(prim);
	}

	// Execute join.
	for (const [_, materialGroup] of groups) {
		for (const [_, groupPrims] of materialGroup) {
			result.push(_joinPrimitives(document, groupPrims));
		}
	}

	return result;
}

function _joinPrimitives(document: Document, primitives: Primitive[]): Primitive {
	const primTpl = primitives[0];
	const result = document.createPrimitive().setMode(primTpl.getMode()).setMaterial(primTpl.getMaterial());
	const count = primTpl.listAttributes()[0].getCount();

	// TODO(🚩): Suppose one or more input primitives already share a vertex stream,
	// and differ only in their indices. Don't just make N copies of the vertex stream.
	// Suppose they share _part_ of a vertex stream, but also have unique attributes?
	// Now we have a harder problem.

	for (const semantic of primTpl.listSemantics()) {
		const attributeTpl = primTpl.getAttribute(semantic)!;
		const attribute = _fillAttribute(
			_createAttribute(document, semantic, count, attributeTpl),
			primitives.map((prim) => prim.getAttribute(semantic)!)
		);
		result.setAttribute(semantic, attribute);
	}

	// TODO(🚩): Set indices.

	return result;
}

// TODO(🚩): Method should be indices-aware.
function _createAttribute(document: Document, semantic: string, count: number, tpl: Accessor): Accessor {
	const array = semantic.startsWith('JOINTS_')
		? new Uint16Array(count * tpl.getElementSize())
		: new Float32Array(count * tpl.getElementSize());
	return document.createAccessor().setArray(array).setType(tpl.getType()).setBuffer(tpl.getBuffer());
}

function _fillAttribute(target: Accessor, sources: Accessor[]): Accessor {
	const el: number[] = [];
	let index = 0;
	for (const source of sources) {
		for (let i = 0, il = source.getCount(); i < il; i++) {
			target.setElement(index++, source.getElement(i, el));
		}
	}
	return target;
}

function _primKey(prim: Primitive): string {
	const mode = prim.getMode();

	const attributes = prim
		.listSemantics()
		.sort()
		.map((semantic) => {
			const attribute = prim.getAttribute(semantic)!;
			const elementSize = attribute.getElementSize();
			return `semantic:${elementSize}`;
		})
		.join('+');

	const targets = prim.listTargets().map((target) => {
		const targetAttributes = target
			.listSemantics()
			.sort()
			.map((semantic) => {
				const attribute = prim.getAttribute(semantic)!;
				const elementSize = attribute.getElementSize();
				return `semantic:${elementSize}`;
			});
		return targetAttributes.join('+');
	});

	return `${mode}|${attributes}|${targets}`;
}
