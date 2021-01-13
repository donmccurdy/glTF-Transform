import { Document, Transform, vec3 } from '@gltf-transform/core';
import { bounds } from './bounds';

const NAME = 'center';

export interface CenterOptions {
	pivot?: 'center' | 'above' | 'below' | vec3;
}

const DEFAULT_OPTIONS: CenterOptions = {pivot: 'center'};

/**
 * Options:
 * - **pivot**: Location on the model to be considered the pivot, and recentered at the origin.
 */
export function center (options: CenterOptions = DEFAULT_OPTIONS): Transform {

	return (doc: Document): void => {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const isAnimated = root.listAnimations().length > 0 || root.listSkins().length > 0;

		doc.getRoot().listScenes().forEach((scene, index) => {
			logger.debug(`${NAME}: Scene ${index + 1} / ${root.listScenes().length}.`);

			let pivot: vec3;
			if (typeof options.pivot === 'string') {
				const bbox = bounds(scene);
				pivot = [
					(bbox.max[0] - bbox.min[0]) / 2 + bbox.min[0],
					(bbox.max[1] - bbox.min[1]) / 2 + bbox.min[1],
					(bbox.max[2] - bbox.min[2]) / 2 + bbox.min[2],
				];
				if (options.pivot === 'above') pivot[1] = bbox.max[1];
				if (options.pivot === 'below') pivot[1] = bbox.min[1];
			} else {
				pivot = options.pivot as vec3;
			}

			logger.debug(`${NAME}: Pivot "${pivot.join(', ')}".`);

			const offset: vec3 = [-1 * pivot[0], -1 * pivot[1], -1 * pivot[2]];

			if (isAnimated) {
				logger.debug(`${NAME}: Model contains animation or skin. Adding a wrapper node.`);
				const offsetNode = doc.createNode('Pivot').setTranslation(offset);
				scene.listChildren().forEach((child) => offsetNode.addChild(child));
				scene.addChild(offsetNode);
			} else {
				logger.debug(`${NAME}: Skipping wrapper, offsetting all root nodes.`);
				scene.listChildren().forEach((child) => {
					const t = child.getTranslation();
					child.setTranslation([
						t[0] + offset[0],
						t[1] + offset[1],
						t[2] + offset[2],
					]);
				});
			}
		});

		logger.debug(`${NAME}: Complete.`);
	};

}
