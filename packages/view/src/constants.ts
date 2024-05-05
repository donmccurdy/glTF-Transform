import {
	BufferGeometry,
	DirectionalLight,
	Line,
	LineLoop,
	LineSegments,
	Material,
	Mesh,
	PointLight,
	Points,
	SkinnedMesh,
	SpotLight,
} from 'three';

export type Subscription = () => void;

export type MeshLike =
	| Mesh<BufferGeometry, Material>
	| SkinnedMesh<BufferGeometry, Material>
	| Points<BufferGeometry, Material>
	| Line<BufferGeometry, Material>
	| LineSegments<BufferGeometry, Material>
	| LineLoop<BufferGeometry, Material>;

export type LightLike = PointLight | SpotLight | DirectionalLight;

export interface THREEObject {
	name: string;
	type: string;
}
