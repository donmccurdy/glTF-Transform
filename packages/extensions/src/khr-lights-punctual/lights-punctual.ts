import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL } from '../constants';
import { Light, LightType } from './light';

const NAME = KHR_LIGHTS_PUNCTUAL;

/** Documentation in {@link EXTENSIONS.md}. */
export class LightsPunctual extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createLight(): Light {
		return new Light(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const nativeDoc = context.nativeDocument;

		if (!nativeDoc.json.extensions || !nativeDoc.json.extensions[NAME]) return this;

		const lightDefs = nativeDoc.json.extensions[NAME].lights || [];
		const lights = lightDefs.map((lightDef) => {
			const light = this.createLight()
				.setName(lightDef.name || '')
				.setType(lightDef.type);

			if (lightDef.color !== undefined) light.setColor(lightDef.color);
			if (lightDef.intensity !== undefined) light.setIntensity(lightDef.intensity);
			if (lightDef.range !== undefined) light.setRange(lightDef.range);

			if (lightDef.innerConeAngle !== undefined) {
				light.setInnerConeAngle(lightDef.innerConeAngle);
			}
			if (lightDef.outerConeAngle !== undefined) {
				light.setOuterConeAngle(lightDef.outerConeAngle);
			}

			return light;
		});

		nativeDoc.json.nodes.forEach((nodeDef, nodeIndex) => {
			if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;
			context.nodes[nodeIndex].setExtension(NAME, lights[nodeDef.extensions[NAME].light]);
		});

		return this;
	}

	public write(context: WriterContext): this {
		const nativeDoc = context.nativeDocument;

		if (this.properties.size === 0) return this;

		const lightDefs = [];
		const lightIndexMap = new Map<Light, number>();

		for (const property of this.properties) {
			const light = property as Light;
			const lightDef = {
				type: light.getType(),
				color: light.getColor(),
				intensity: light.getIntensity(),
				range: light.getRange(),
			};

			if (light.getName()) lightDef['name'] = light.getName();

			if (light.getType() === LightType.SPOT) {
				lightDef['innerConeAngle'] = light.getInnerConeAngle();
				lightDef['outerConeAngle'] = light.getOuterConeAngle();
			}

			lightDefs.push(lightDef);
			lightIndexMap.set(light, lightDefs.length - 1)
		}

		this.doc.getRoot()
			.listNodes()
			.forEach((node) => {
				const light = node.getExtension<Light>(NAME);
				if (light) {
					const nodeIndex = context.nodeIndexMap.get(node);
					const nodeDef = nativeDoc.json.nodes[nodeIndex];
					nodeDef.extensions = nodeDef.extensions || {};
					nodeDef.extensions[NAME] = {light: lightIndexMap.get(light)};
				}
			});

		nativeDoc.json.extensions = nativeDoc.json.extensions || {};
		nativeDoc.json.extensions[NAME] = {lights: lightDefs};

		return this;
	}
}
