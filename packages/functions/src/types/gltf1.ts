/**
 * Module for glTF 1.0 Interface
 */
export declare namespace GLTF1 {
	type AccessorComponentType = 5120 | 5121 | 5122 | 5123 | 5126;

	type ShaderType = 35632 | 35633; // fragment | vertex

	type ParameterType = 5120
		| 5121
		| 5122
		| 5123
		| 5124
		| 5125
		| 5126
		| 35664
		| 35665
		| 35666
		| 35667
		| 35668
		| 35669
		| 35670
		| 35671
		| 35672
		| 35673
		| 35674
		| 35675
		| 35676
		| 35678;

		type TextureWrapMode = 33071 | 33648 | 10497;

	type TextureMagFilter = 9728 | 9729;

	type TextureMinFilter = 9728 | 9729 | 9984 | 9985 | 9986 | 9987;

	type TextureFormat = 6406 | 6407 | 6408 | 6409 | 6410;

	type CullingType = 1028 | 1029 | 1032; // front | back | front and back

	type BlendingFunction = 0
		| 1
		| 768
		| 769
		| 774
		| 775
		| 770
		| 771
		| 772
		| 773
		| 32769
		| 32770
		| 32771
		| 32772
		| 776;

	 interface IGLTFProperty {
		extensions?: { [key: string]: any };
		extras?: object;
	}

	 interface IGLTFChildRootProperty extends IGLTFProperty {
		name?: string;
	}

	 interface IGLTFAccessor extends IGLTFChildRootProperty {
		bufferView: string;
		byteOffset: number;
		byteStride: number;
		count: number;
		type: string;
		componentType: AccessorComponentType;

		max?: number[];
		min?: number[];
		name?: string;
	}

	 interface IGLTFBufferView extends IGLTFChildRootProperty {
		buffer: string;
		byteOffset: number;
		byteLength: number;
		byteStride: number;

		target?: number;
	}

	 interface IGLTFBuffer extends IGLTFChildRootProperty {
		uri: string;

		byteLength?: number;
		type?: string;
	}

	 interface IGLTFShader extends IGLTFChildRootProperty {
		uri: string;
		type: ShaderType;
	}

	 interface IGLTFProgram extends IGLTFChildRootProperty {
		attributes: string[];
		fragmentShader: string;
		vertexShader: string;
	}

	 interface IGLTFTechniqueParameter {
		type: number;

		count?: number;
		semantic?: string;
		node?: string;
		value?: number | boolean | string | Array<any>;
		source?: string;
	}

	 interface IGLTFTechniqueCommonProfile {
		lightingModel: string;
		texcoordBindings: object;

		parameters?: Array<any>;
	}

	 interface IGLTFTechniqueStatesFunctions {
		blendColor?: number[];
		blendEquationSeparate?: number[];
		blendFuncSeparate?: number[];
		colorMask: boolean[];
		cullFace: number[];
	}

	 interface IGLTFTechniqueStates {
		enable: number[];
		functions: IGLTFTechniqueStatesFunctions;
	}

	 interface IGLTFTechnique extends IGLTFChildRootProperty {
		parameters: { [key: string]: IGLTFTechniqueParameter };
		program: string;

		attributes: { [key: string]: string };
		uniforms: { [key: string]: string };
		states: IGLTFTechniqueStates;
	}

	 interface IGLTFMaterial extends IGLTFChildRootProperty {
		technique?: string;
		values: string[];
	}

	 interface IGLTFMeshPrimitive extends IGLTFProperty {
		attributes: { [key: string]: string };
		indices: string;
		material: string;

		mode?: number;
	}

	 interface IGLTFMesh extends IGLTFChildRootProperty {
		primitives: IGLTFMeshPrimitive[];
	}

	 interface IGLTFImage extends IGLTFChildRootProperty {
		uri: string;
	}

	 interface IGLTFSampler extends IGLTFChildRootProperty {
		magFilter?: number;
		minFilter?: number;
		wrapS?: number;
		wrapT?: number;
	}

	 interface IGLTFTexture extends IGLTFChildRootProperty {
		sampler: string;
		source: string;

		format?: TextureFormat;
		internalFormat?: TextureFormat;
		target?: number;
		type?: number;
	}

	 interface IGLTFAmbienLight {
		color?: number[];
	}

	 interface IGLTFDirectionalLight {
		color?: number[];
	}

	 interface IGLTFPointLight {
		color?: number[];
		constantAttenuation?: number;
		linearAttenuation?: number;
		quadraticAttenuation?: number;
	}

	 interface IGLTFSpotLight {
		color?: number[];
		constantAttenuation?: number;
		fallOfAngle?: number;
		fallOffExponent?: number;
		linearAttenuation?: number;
		quadraticAttenuation?: number;
	}

	 interface IGLTFLight extends IGLTFChildRootProperty {
		type: string;
	}

	 interface IGLTFCameraOrthographic {
		xmag: number;
		ymag: number;
		zfar: number;
		znear: number;
	}

	 interface IGLTFCameraPerspective {
		aspectRatio: number;
		yfov: number;
		zfar: number;
		znear: number;
	}

	 interface IGLTFCamera extends IGLTFChildRootProperty {
		type: string;
	}

	 interface IGLTFAnimationChannelTarget {
		id: string;
		path: string;
	}

	 interface IGLTFAnimationChannel {
		sampler: string;
		target: IGLTFAnimationChannelTarget;
	}

	 interface IGLTFAnimationSampler {
		input: string;
		output: string;

		interpolation?: string;
	}

	 interface IGLTFAnimation extends IGLTFChildRootProperty {
		channels?: IGLTFAnimationChannel[];
		parameters?: { [key: string]: string };
		samplers?: { [key: string]: IGLTFAnimationSampler };
	}

	 interface IGLTFNodeInstanceSkin {
		skeletons: string[];
		skin: string;
		meshes: string[];
	}

	 interface IGLTFSkins extends IGLTFChildRootProperty {
		bindShapeMatrix: number[];
		inverseBindMatrices: string;
		jointNames: string[];
	}

	 interface IGLTFNode extends IGLTFChildRootProperty {
		camera?: string;
		children: string[];
		skin?: string;
		jointName?: string;
		light?: string;
		matrix: number[];
		mesh?: string;
		meshes?: string[];
		rotation?: number[];
		scale?: number[];
		translation?: number[];
	}

	interface IGLTFScene extends IGLTFChildRootProperty {
		nodes: string[];
	}


	interface IGLTFProfile extends IGLTFProperty {
		api?: string;
		version?: string;
	}

	 interface IGLTFAsset extends IGLTFProperty {
		 version: string;
		 copyright?: string;
		 generator?: string;
		 premultipliedAlpha?: boolean;
		 profile?: IGLTFProfile;
	}

	export interface IGLTF {
		asset?: IGLTFAsset;

		extensionsUsed?: string[];
		extensionsRequired?: string[]; // v1.1

		scene?: string;
		scenes?: { [key: string]: IGLTFScene }; // v1.1

		extensions?: { [key: string]: any };
		accessors?: { [key: string]: IGLTFAccessor };
		buffers?: { [key: string]: IGLTFBuffer };
		bufferViews?: { [key: string]: IGLTFBufferView };
		meshes?: { [key: string]: IGLTFMesh };
		lights?: { [key: string]: IGLTFLight };
		cameras?: { [key: string]: IGLTFCamera };
		nodes?: { [key: string]: IGLTFNode };
		images?: { [key: string]: IGLTFImage };
		textures?: { [key: string]: IGLTFTexture };
		shaders?: { [key: string]: IGLTFShader };
		programs?: { [key: string]: IGLTFProgram };
		samplers?: { [key: string]: IGLTFSampler };
		techniques?: { [key: string]: IGLTFTechnique };
		materials?: { [key: string]: IGLTFMaterial };
		animations?: { [key: string]: IGLTFAnimation };
		skins?: { [key: string]: IGLTFSkins };
	}
}
