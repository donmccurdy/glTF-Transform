/**
 * Graph utilities.
 *
 * @category Utilities
 * @hidden
 * */
export class GraphUtils {
	// Disabled to figure out core dependencies. Should probably be in a
	// separate package.
	//
	// /** @internal */
	// static toGraph(container: Container): object {
	// 	const idMap = new Map<Property, string>();
	// 	const nodes = []; // id, label, x, y, size, color
	// 	const edges = []; // id, label, source, target

	// 	function createNode (property: Property): void {
	// 		if (idMap.get(property)) return;

	// 		const id = uuid();
	// 		idMap.set(property, id);

	// 		nodes.push({
	// 			id: id,
	// 			size: 1,
	// 			// TODO(cleanup): names get obfuscated
	// 			label: `${property.constructor.name}: ${id} ${property.getName()}`
	// 		});
	// 	}

	// 	const root = container.getRoot();
	// 	createNode(root);
	// 	root.listAccessors().forEach(createNode);
	// 	root.listBuffers().forEach(createNode);
	// 	root.listMaterials().forEach(createNode);
	// 	root.listMeshes().forEach(createNode);
	// 	root.listMeshes().forEach((mesh) => mesh.listPrimitives().forEach(createNode));
	// 	root.listNodes().forEach(createNode);
	// 	root.listScenes().forEach(createNode);
	// 	root.listTextures().forEach(createNode);

	// 	const graph = container.getGraph();
	// 	graph.getLinks().forEach((link: Link<Property, Property>) => {
	// 		const source = idMap.get(link.getLeft());
	// 		const target = idMap.get(link.getRight());
	// 		if ((link.getLeft() instanceof Root) && !(link.getRight() instanceof Scene)) {
	// 			return;
	// 		}
	// 		edges.push({id: uuid(), label: link.getName(), source, target});
	// 	})

	// 	return {nodes, edges};
	// }
}
