import { Document, Transform, vec3, quat } from '@gltf-transform/core';

const NAME = 'rotate';

export interface RotateOptions {
	euler?: vec3;
}

const DEFAULT_OPTIONS: RotateOptions = {euler: [0, 0, 0]};

/**
 * Options:
 * - **euler**: Euler angles to create a rotation applied to the model.
 */
export function rotate (options: RotateOptions = DEFAULT_OPTIONS): Transform {

	return (doc: Document): void => {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const isAnimated = root.listAnimations().length > 0 || root.listSkins().length > 0;

		doc.getRoot().listScenes().forEach((scene, index) => {
			logger.debug(`${NAME}: Scene ${index + 1} / ${root.listScenes().length}.`);

            let rot: quat = quat.create();
            quat.fromEuler(rot, options.euler[0], options.euler[1], options.euler[2]);

			logger.debug(`${NAME}: Rotation "${rot.join(', ')}".`);

			if (isAnimated) {
				logger.debug(`${NAME}: Model contains animation or skin. Adding a wrapper node.`);
				const offsetNode = doc.createNode('Rotation').setRotation(rot);
				scene.listChildren().forEach((child) => offsetNode.addChild(child));
				scene.addChild(offsetNode);
			} else {
				logger.debug(`${NAME}: Skipping wrapper, offsetting all root nodes.`);
				scene.listChildren().forEach((child) => {
                    const r = child.getRotation();
                    const newR: quat = quat.create();
                    quat.multiply(newR, rot, r);
					child.setRotation(newR);
				});
			}
		});

		logger.debug(`${NAME}: Complete.`);
	};

}
