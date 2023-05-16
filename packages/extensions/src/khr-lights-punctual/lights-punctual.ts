import { Extension, MathUtils, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL } from '../constants.js';
import { Light } from './light.js';

const NAME = KHR_LIGHTS_PUNCTUAL;

interface LightsPunctualRootDef {
	lights?: LightDef[];
}

interface LightsPunctualNodeDef {
	light: number;
}

interface LightDef {
	name?: string;
	color?: vec3;
	intensity?: number;
	range?: number;
	type: 'spot' | 'point' | 'directional';
	spot?: {
		innerConeAngle?: number;
		outerConeAngle?: number;
	};
}

/**
 * [`KHR_lights_punctual`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_lights_punctual/) defines three "punctual" light types: directional, point and
 * spot.
 *
 * Punctual lights are parameterized, infinitely small points that emit light in
 * well-defined directions and intensities. Lights are referenced by nodes and inherit the transform
 * of that node.
 *
 * Properties:
 * - {@link Light}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRLightsPunctual, Light, LightType } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const lightsExtension = document.createExtension(KHRLightsPunctual);
 *
 * // Create a Light property.
 * const light = lightsExtension.createLight()
 *	.setType(LightType.POINT)
 *	.setIntensity(2.0)
 *	.setColor([1.0, 0.0, 0.0]);
 *
 * // Attach the property to a Material.
 * node.setExtension('KHR_lights_punctual', light);
 * ```
 */
export class KHRLightsPunctual extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new punctual Light property for use on a {@link Node}. */
	public createLight(name = ''): Light {
		return new Light(this.document.getGraph(), name);
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;

		if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME]) return this;

		const rootDef = jsonDoc.json.extensions[NAME] as LightsPunctualRootDef;
		const lightDefs = rootDef.lights || ([] as LightDef[]);
		const lights = lightDefs.map((lightDef) => {
			const light = this.createLight()
				.setName(lightDef.name || '')
				.setType(lightDef.type);

			if (lightDef.color !== undefined) light.setColor(lightDef.color);
			if (lightDef.intensity !== undefined) light.setIntensity(lightDef.intensity);
			if (lightDef.range !== undefined) light.setRange(lightDef.range);

			if (lightDef.spot?.innerConeAngle !== undefined) {
				light.setInnerConeAngle(lightDef.spot.innerConeAngle);
			}
			if (lightDef.spot?.outerConeAngle !== undefined) {
				light.setOuterConeAngle(lightDef.spot.outerConeAngle);
			}

			return light;
		});

		jsonDoc.json.nodes!.forEach((nodeDef, nodeIndex) => {
			if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;
			const lightNodeDef = nodeDef.extensions[NAME] as LightsPunctualNodeDef;
			context.nodes[nodeIndex].setExtension(NAME, lights[lightNodeDef.light]);
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		if (this.properties.size === 0) return this;

		const lightDefs = [];
		const lightIndexMap = new Map<Light, number>();

		for (const property of this.properties) {
			const light = property as Light;
			const lightDef = { type: light.getType() } as LightDef;

			if (!MathUtils.eq(light.getColor(), [1, 1, 1])) lightDef.color = light.getColor();
			if (light.getIntensity() !== 1) lightDef.intensity = light.getIntensity();
			if (light.getRange() != null) lightDef.range = light.getRange()!;

			if (light.getName()) lightDef.name = light.getName();

			if (light.getType() === Light.Type.SPOT) {
				lightDef.spot = {
					innerConeAngle: light.getInnerConeAngle(),
					outerConeAngle: light.getOuterConeAngle(),
				};
			}

			lightDefs.push(lightDef);
			lightIndexMap.set(light, lightDefs.length - 1);
		}

		this.document
			.getRoot()
			.listNodes()
			.forEach((node) => {
				const light = node.getExtension<Light>(NAME);
				if (light) {
					const nodeIndex = context.nodeIndexMap.get(node)!;
					const nodeDef = jsonDoc.json.nodes![nodeIndex];
					nodeDef.extensions = nodeDef.extensions || {};
					nodeDef.extensions[NAME] = { light: lightIndexMap.get(light) };
				}
			});

		jsonDoc.json.extensions = jsonDoc.json.extensions || {};
		jsonDoc.json.extensions[NAME] = { lights: lightDefs };

		return this;
	}
}
