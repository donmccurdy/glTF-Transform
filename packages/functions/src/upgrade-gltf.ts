import { Document, type JSONDocument } from '@gltf-transform/core';
import type { GLTF1 } from './types/gltf1.js';
import { assignDefaults } from './utils.js';

export interface UpgradeGLTFOptions {
	targetVersion?: '2.0' | '1.0',
	baseColorTextureNames?: string[],
	baseColorFactorNames?: string[],
}

export const DEFAULT_UPGRADE_GLTF_OPTIONS: Required<UpgradeGLTFOptions> = {
	targetVersion: '2.0',
	baseColorTextureNames: [],
	baseColorFactorNames:[],
};

export interface LegacyJSONDocument {
	json: GLTF1.IGLTF,
	resources: { [s: string]: Uint8Array<ArrayBuffer> },
}

/**
 * TODO
 */
export function upgradeGLTF(
	jsonDocument: LegacyJSONDocument,
	_options: UpgradeGLTFOptions = DEFAULT_UPGRADE_GLTF_OPTIONS
): JSONDocument | LegacyJSONDocument {
	const options = assignDefaults(DEFAULT_UPGRADE_GLTF_OPTIONS, _options);

	const { json, resources } = jsonDocument;

	const srcVersion = (json as GLTF1.IGLTF).asset?.version as string;
	const dstVersion = options.targetVersion;

	if (!['0.8', '1.0', '1.1'].includes(srcVersion)) {
		throw new Error(`Unexpected glTF version, "${srcVersion}".`);
	}

	if (srcVersion[0] === dstVersion[0]) {
		return jsonDocument;
	}

	// Upgrade from glTF 0.8 to glTF 1.0.
	if (srcVersion === '0.8') {
		throw new Error('Not implemented');
	}

	if (dstVersion === '1.0') {
		return jsonDocument;
	}

	// Upgrade from glTF 1.0 to glTF 2.0.
	throw new Error('Not implemented');
}

enum ParameterType {
	BYTE = 5120,
	UNSIGNED_BYTE = 5121,
	SHORT = 5122,
	UNSIGNED_SHORT = 5123,
	INT = 5124,
	UNSIGNED_INT = 5125,
	FLOAT = 5126,
	FLOAT_VEC2 = 35664,
	FLOAT_VEC3 = 35665,
	FLOAT_VEC4 = 35666,
	INT_VEC2 = 35667,
	INT_VEC3 = 35668,
	INT_VEC4 = 35669,
	BOOL = 35670,
	BOOL_VEC2 = 35671,
	BOOL_VEC3 = 35672,
	BOOL_VEC4 = 35673,
	FLOAT_MAT2 = 35674,
	FLOAT_MAT3 = 35675,
	FLOAT_MAT4 = 35676,
	SAMPLER_2D = 35678,
}

enum BlendingFunction {
	ZERO = 0,
	ONE = 1,
	SRC_COLOR = 768,
	ONE_MINUS_SRC_COLOR = 769,
	DST_COLOR = 774,
	ONE_MINUS_DST_COLOR = 775,
	SRC_ALPHA = 770,
	ONE_MINUS_SRC_ALPHA = 771,
	DST_ALPHA = 772,
	ONE_MINUS_DST_ALPHA = 773,
	CONSTANT_COLOR = 32769,
	ONE_MINUS_CONSTANT_COLOR = 32770,
	CONSTANT_ALPHA = 32771,
	ONE_MINUS_CONSTANT_ALPHA = 32772,
	SRC_ALPHA_SATURATE = 776,
}
