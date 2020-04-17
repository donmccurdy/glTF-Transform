import { Logger, LoggerVerbosity } from './logger';

/**
 * Core utilities.
 *
 * @hidden
 * @category Utilities
 * */
export class CoreUtils {
	/** @internal */
	static createLogger(name: string, verbosity: LoggerVerbosity): Logger {
		return new Logger(name, verbosity);
	}

	// Disabled to figure out core dependencies. Should probably be in a
	// separate package.
	//
	// /** @internal */
	// static toGraph(container: Container): object {
	// 	const idMap = new Map<Element, string>();
	// 	const nodes = []; // id, label, x, y, size, color
	// 	const edges = []; // id, label, source, target

	// 	function createNode (element: Element): void {
	// 		if (idMap.get(element)) return;

	// 		const id = uuid();
	// 		idMap.set(element, id);

	// 		nodes.push({
	// 			id: id,
	// 			size: 1,
	// 			// TODO(cleanup): names get obfuscated
	// 			label: `${element.constructor.name}: ${id} ${element.getName()}`
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
	// 	graph.getLinks().forEach((link: Link<Element, Element>) => {
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
