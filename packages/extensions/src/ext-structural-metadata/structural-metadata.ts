import {
	type Document,
	Extension,
	GLB_BUFFER,
	type GLTF,
	MathUtils,
	type Node,
	type Primitive,
	PropertyType,
	type ReaderContext,
	type WriterContext,
} from '@gltf-transform/core';
import { EXT_STRUCTURAL_METADATA } from '../constants.js';
import {
	Class,
	ClassProperty,
	Enum,
	EnumValue,
	MeshPrimitiveStructuralMetadata,
	NodeStructuralMetadata,
	PropertyAttribute,
	PropertyAttributeProperty,
	PropertyTable,
	PropertyTableProperty,
	PropertyTexture,
	PropertyTextureProperty,
	Schema,
	StructuralMetadata,
} from './metadata.js';
import type {
	ClassPropertyComponentType,
	ClassPropertyType,
	EnumValueType,
	PropertyTablePropertyOffsetType,
} from './types.js';

/******************************************************************************
 * Interfaces.
 */

type NumericValue = number | number[] | number[][];
type NoDataValue = number | string | number[] | string[] | number[][];
type AnyValue = number | string | boolean | number[] | string[] | boolean[] | number[][];

interface StructuralMetadataDef {
	schema?: SchemaDef;
	schemaUri?: string;
	propertyTables?: PropertyTableDef[];
	propertyTextures?: PropertyTextureDef[];
	propertyAttributes?: PropertyAttributeDef[];
}

interface SchemaDef {
	id: string;
	name?: string;
	description?: string;
	version?: string;
	classes?: { [key: string]: ClassDef };
	enums?: { [key: string]: EnumDef };
}

interface ClassDef {
	name?: string;
	description?: string;
	properties?: { [key: string]: ClassPropertyDef };
}

interface ClassPropertyDef {
	name?: string;
	description?: string;
	type: ClassPropertyType;
	componentType?: ClassPropertyComponentType;
	enumType?: string;
	array?: boolean;
	count?: number;
	normalized?: boolean;
	offset?: NumericValue;
	scale?: NumericValue;
	max?: NumericValue;
	min?: NumericValue;
	required?: boolean;
	noData?: NoDataValue;
	default?: AnyValue;
}

interface EnumDef {
	name?: string;
	description?: string;
	valueType?: EnumValueType;
	values: EnumValueDef[];
}

interface EnumValueDef {
	name: string;
	description?: string;
	value: number;
}

interface PropertyTableDef {
	name?: string;
	class: string;
	count: number;
	properties?: { [key: string]: PropertyTablePropertyDef };
}

interface PropertyTablePropertyDef {
	values: number;
	arrayOffsets?: number;
	stringOffsets?: number;
	arrayOffsetType?: PropertyTablePropertyOffsetType;
	stringOffsetType?: PropertyTablePropertyOffsetType;
	offset?: NumericValue;
	scale?: NumericValue;
	max?: NumericValue;
	min?: NumericValue;
}

interface PropertyTextureDef {
	name?: string;
	class: string;
	properties?: { [key: string]: PropertyTexturePropertyDef };
}

interface PropertyTexturePropertyDef extends GLTF.ITextureInfo {
	channels?: number[];
	offset?: NumericValue;
	scale?: NumericValue;
	max?: NumericValue;
	min?: NumericValue;
}

interface PropertyAttributeDef {
	name?: string;
	class: string;
	properties?: { [key: string]: PropertyAttributePropertyDef };
}

interface PropertyAttributePropertyDef {
	attribute: string;
	offset?: NumericValue;
	scale?: NumericValue;
	max?: NumericValue;
	min?: NumericValue;
}

// Reference: EXT_structural_metadata.schema.json
interface NodeStructuralMetadataDef {
	propertyTable?: number;
	index?: number;
}

// Reference: mesh.primitive.EXT_structural_metadata.schema.json
interface MeshPrimitiveStructuralMetadataDef {
	propertyTextures?: number[];
	propertyAttributes?: number[];
}

/******************************************************************************
 * Implementation.
 */

/**
 * [`EXT_structural_metadata`](https://github.com/CesiumGS/glTF/tree/proposal-EXT_structural_metadata/extensions/2.0/Vendor/EXT_structural_metadata/)
 * defines a means of storing structured metadata within a glTF 2.0 asset.
 *
 * @experimental
 */
export class EXTStructuralMetadata extends Extension {
	public override readonly extensionName = EXT_STRUCTURAL_METADATA;
	public static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;

	/**
	 * Must preparate buffer data, because property tables directly
	 * reference buffer views, not accessors.
	 *
	 * @hidden
	 */
	public override readonly prewriteTypes = [PropertyType.BUFFER];

	/**
	 * Must read EXT_structural_metadata before EXT_mesh_features.
	 *
	 * @hidden
	 */
	public override readonly prereadTypes = [PropertyType.SCENE];

	createStructuralMetadata() {
		return new StructuralMetadata(this.document.getGraph());
	}

	createSchema() {
		return new Schema(this.document.getGraph());
	}

	createClass() {
		return new Class(this.document.getGraph());
	}

	createClassProperty() {
		return new ClassProperty(this.document.getGraph());
	}

	createEnum() {
		return new Enum(this.document.getGraph());
	}

	createEnumValue() {
		return new EnumValue(this.document.getGraph());
	}

	createPropertyTable() {
		return new PropertyTable(this.document.getGraph());
	}

	createPropertyTableProperty() {
		return new PropertyTableProperty(this.document.getGraph());
	}

	createPropertyTexture() {
		return new PropertyTexture(this.document.getGraph());
	}

	createPropertyTextureProperty() {
		return new PropertyTextureProperty(this.document.getGraph());
	}

	createPropertyAttribute() {
		return new PropertyAttribute(this.document.getGraph());
	}

	createPropertyAttributeProperty() {
		return new PropertyAttributeProperty(this.document.getGraph());
	}

	createElementStructuralMetadata() {
		return new NodeStructuralMetadata(this.document.getGraph());
	}

	createMeshPrimitiveStructuralMetadata() {
		return new MeshPrimitiveStructuralMetadata(this.document.getGraph());
	}

	public override read(_context: ReaderContext): this {
		return this;
	}

	public override preread(context: ReaderContext): this {
		const root = this.document.getRoot();

		const { json } = context.jsonDoc;
		const structuralMetadataDef = json.extensions![EXT_STRUCTURAL_METADATA] as StructuralMetadataDef;
		const structuralMetadata = _readStructuralMetadata(this, context, structuralMetadataDef);
		root.setExtension(EXT_STRUCTURAL_METADATA, structuralMetadata);

		const meshDefs = json.meshes || [];
		meshDefs.forEach((meshDef, meshIndex) => {
			const mesh = context.meshes[meshIndex];
			const primitives = mesh.listPrimitives();
			const primDefs = meshDef.primitives || [];
			primDefs.forEach((primDef, primIndex) => {
				const prim = primitives[primIndex];
				this._readPrimitive(structuralMetadata, prim, primDef);
			});
		});

		const nodeDefs = json.nodes || [];
		nodeDefs.forEach((nodeDef, nodeIndex) => {
			const node = context.nodes[nodeIndex];
			this._readNode(structuralMetadata, node, nodeDef);
		});
		return this;
	}

	/** @hidden */
	private _readPrimitive(structuralMetadata: StructuralMetadata, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		if (!primDef.extensions || !primDef.extensions[EXT_STRUCTURAL_METADATA]) {
			return;
		}
		const meshPrimitiveStructuralMetadata = this.createMeshPrimitiveStructuralMetadata();

		const extensionObject = primDef.extensions[EXT_STRUCTURAL_METADATA];
		const meshPrimitiveStructuralMetadataDef = extensionObject as MeshPrimitiveStructuralMetadataDef;

		const propertyTextures = structuralMetadata.listPropertyTextures();
		const propertyTextureIndexDefs = meshPrimitiveStructuralMetadataDef.propertyTextures || [];
		for (const propertyTextureIndexDef of propertyTextureIndexDefs) {
			const propertyTexture = propertyTextures[propertyTextureIndexDef];
			meshPrimitiveStructuralMetadata.addPropertyTexture(propertyTexture);
		}

		const propertyAttributes = structuralMetadata.listPropertyAttributes();
		const propertyAttributeIndexDefs = meshPrimitiveStructuralMetadataDef.propertyAttributes || [];
		for (const propertyAttributeIndexDef of propertyAttributeIndexDefs) {
			const propertyAttribute = propertyAttributes[propertyAttributeIndexDef];
			meshPrimitiveStructuralMetadata.addPropertyAttribute(propertyAttribute);
		}
		prim.setExtension(EXT_STRUCTURAL_METADATA, meshPrimitiveStructuralMetadata);
	}

	/** @hidden */
	private _readNode(structuralMetadata: StructuralMetadata, node: Node, nodeDef: GLTF.INode) {
		if (!nodeDef.extensions || !nodeDef.extensions[EXT_STRUCTURAL_METADATA]) {
			return;
		}
		const elementStructuralMetadata = this.createElementStructuralMetadata();

		const extensionObject = nodeDef.extensions[EXT_STRUCTURAL_METADATA];
		const elementStructuralMetadataDef = extensionObject as NodeStructuralMetadataDef;

		const propertyTables = structuralMetadata.listPropertyTables();
		const propertyTableIndex = elementStructuralMetadataDef.propertyTable;
		const index = elementStructuralMetadataDef.index;
		if (propertyTableIndex === undefined) {
			throw new Error(`${EXT_STRUCTURAL_METADATA}: No property table index in structural metadata`);
		}
		if (index === undefined) {
			throw new Error(`${EXT_STRUCTURAL_METADATA}: No index in structural metadata`);
		}
		const propertyTable = propertyTables[propertyTableIndex];
		elementStructuralMetadata.setPropertyTable(propertyTable);
		elementStructuralMetadata.setIndex(index);
		node.setExtension(EXT_STRUCTURAL_METADATA, elementStructuralMetadata);
	}

	public override write(context: WriterContext): this {
		const root = this.document.getRoot();
		const structuralMetadata = root.getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA);
		if (!structuralMetadata) {
			return this;
		}

		const jsonDoc = context.jsonDoc;
		const gltfDef = jsonDoc.json;

		const structuralMetadataDef = _writeStructuralMetadataDef(context, structuralMetadata);
		gltfDef.extensions = gltfDef.extensions || {};
		gltfDef.extensions[EXT_STRUCTURAL_METADATA] = structuralMetadataDef;

		const meshes = root.listMeshes();
		const meshDefs = gltfDef.meshes;
		if (meshDefs) {
			for (const mesh of meshes) {
				const meshIndex = context.meshIndexMap.get(mesh);
				if (meshIndex === undefined) {
					continue;
				}
				const meshDef = meshDefs[meshIndex];
				mesh.listPrimitives().forEach((prim, primIndex) => {
					const primDef = meshDef.primitives[primIndex];
					this._writePrimitive(structuralMetadata, prim, primDef);
				});
			}
		}

		const nodes = root.listNodes();
		const nodeDefs = gltfDef.nodes;
		if (nodeDefs) {
			for (const node of nodes) {
				const nodeIndex = context.nodeIndexMap.get(node);
				if (nodeIndex === undefined) {
					continue;
				}
				const nodeDef = nodeDefs[nodeIndex];
				this._writeNode(structuralMetadata, node, nodeDef);
			}
		}
		return this;
	}

	/** @hidden */
	private _writePrimitive(structuralMetadata: StructuralMetadata, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		const meshPrimitiveStructuralMetadata =
			prim.getExtension<MeshPrimitiveStructuralMetadata>(EXT_STRUCTURAL_METADATA);
		if (!meshPrimitiveStructuralMetadata) {
			return;
		}
		const globalPropertyTextures = structuralMetadata.listPropertyTextures();
		const globalPropertyAttributes = structuralMetadata.listPropertyAttributes();

		let propertyTextureDefs: number[] | undefined;
		let propertyAttributeDefs: number[] | undefined;

		const propertyTextures = meshPrimitiveStructuralMetadata.listPropertyTextures();
		if (propertyTextures.length > 0) {
			propertyTextureDefs = [];
			for (const propertyTexture of propertyTextures) {
				const index = globalPropertyTextures.indexOf(propertyTexture);
				if (index >= 0) {
					propertyTextureDefs.push(index);
				} else {
					throw new Error(`${EXT_STRUCTURAL_METADATA}: Invalid property texture in mesh primitive`);
				}
			}
		}
		const propertyAttributes = meshPrimitiveStructuralMetadata.listPropertyAttributes();
		if (propertyAttributes.length > 0) {
			propertyAttributeDefs = [];
			for (const propertyAttribute of propertyAttributes) {
				const index = globalPropertyAttributes.indexOf(propertyAttribute);
				if (index >= 0) {
					propertyAttributeDefs.push(index);
				} else {
					throw new Error(`${EXT_STRUCTURAL_METADATA}: Invalid property attribute in mesh primitive`);
				}
			}
		}

		const meshPrimitiveStructuralMetadataDef: MeshPrimitiveStructuralMetadataDef = {
			propertyTextures: propertyTextureDefs,
			propertyAttributes: propertyAttributeDefs,
		};
		primDef.extensions = primDef.extensions || {};
		primDef.extensions[EXT_STRUCTURAL_METADATA] = meshPrimitiveStructuralMetadataDef;
	}

	/** @hidden */
	private _writeNode(structuralMetadata: StructuralMetadata, node: Node, nodeDef: GLTF.INode) {
		const nodeStructuralMetadata = node.getExtension<NodeStructuralMetadata>(EXT_STRUCTURAL_METADATA);
		if (!nodeStructuralMetadata) {
			return;
		}

		const globalPropertyTables = structuralMetadata.listPropertyTables();

		const propertyTable = nodeStructuralMetadata.getPropertyTable();
		if (!propertyTable) {
			return;
		}

		const nodeStructuralMetadataDef: NodeStructuralMetadataDef = {
			propertyTable: globalPropertyTables.indexOf(propertyTable),
			index: nodeStructuralMetadata.getIndex() ?? undefined,
		};

		nodeDef.extensions = nodeDef.extensions || {};
		nodeDef.extensions[EXT_STRUCTURAL_METADATA] = nodeStructuralMetadataDef;
	}

	public override prewrite(context: WriterContext, propertyType: PropertyType): this {
		if (propertyType === PropertyType.BUFFER) {
			this._prewriteBuffers(context);
		}
		return this;
	}

	/**
	 * Collects all buffer views that are referred to by the property tables, and
	 * store them as "otherBufferViews" of the writer context (for the main
	 * buffer), to make sure that they are part of the buffer when it is
	 * eventually written in Writer.ts.
	 *
	 * @hidden
	 */
	private _prewriteBuffers(context: WriterContext): void {
		const document = this.document;
		const root = document.getRoot();
		const structuralMetadata = root.getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA)!;

		// TODO(cleanup): Is this necessary? Why?
		context.jsonDoc.json.bufferViews ||= [];

		for (const propertyTable of structuralMetadata.listPropertyTables()) {
			for (const propertyValue of propertyTable.listPropertyValues()) {
				const otherBufferViews = getOrCreateOtherBufferViews(document, context);
				otherBufferViews.push(propertyValue.getValues());

				const arrayOffsets = propertyValue.getArrayOffsets();
				if (arrayOffsets) {
					otherBufferViews.push(arrayOffsets);
				}

				const stringOffsets = propertyValue.getStringOffsets();
				if (stringOffsets) {
					otherBufferViews.push(stringOffsets);
				}
			}
		}
	}
}

/******************************************************************************
 * Deserialization.
 */

function _readStructuralMetadata(
	ext: EXTStructuralMetadata,
	context: ReaderContext,
	structuralMetadataDef: StructuralMetadataDef,
) {
	const structuralMetadata = ext.createStructuralMetadata();

	if (structuralMetadataDef.schema !== undefined) {
		const schema = _readSchema(ext, structuralMetadataDef.schema);
		structuralMetadata.setSchema(schema);
	} else if (structuralMetadataDef.schemaUri !== undefined) {
		const schemaUri = structuralMetadataDef.schemaUri;
		structuralMetadata.setSchemaUri(schemaUri);
	}

	const propertyTextureDefs = structuralMetadataDef.propertyTextures || [];
	for (const propertyTextureDef of propertyTextureDefs) {
		const propertyTexture = _readPropertyTexture(ext, context, propertyTextureDef);
		structuralMetadata.addPropertyTexture(propertyTexture);
	}

	const propertyTableDefs = structuralMetadataDef.propertyTables || [];
	for (const propertyTableDef of propertyTableDefs) {
		const propertyTable = _readPropertyTable(ext, context, propertyTableDef);
		structuralMetadata.addPropertyTable(propertyTable);
	}

	const propertyAttributeDefs = structuralMetadataDef.propertyAttributes || [];
	for (const propertyAttributeDef of propertyAttributeDefs) {
		const propertyAttribute = _readPropertyAttribute(ext, propertyAttributeDef);
		structuralMetadata.addPropertyAttribute(propertyAttribute);
	}

	return structuralMetadata;
}

function _readSchema(ext: EXTStructuralMetadata, schemaDef: SchemaDef) {
	const schema = ext.createSchema().setId(schemaDef.id);

	if (schemaDef.name !== undefined) {
		schema.setObjectName(schemaDef.name);
	}

	if (schemaDef.description !== undefined) {
		schema.setDescription(schemaDef.description);
	}

	if (schemaDef.version !== undefined) {
		schema.setVersion(schemaDef.version);
	}

	const classes = schemaDef.classes || {};
	for (const classKey of Object.keys(classes)) {
		const classDef = classes[classKey];
		schema.setClass(classKey, _readClass(ext, classDef));
	}

	const enums = schemaDef.enums || {};
	for (const enumKey of Object.keys(enums)) {
		schema.setEnum(enumKey, _readEnum(ext, enums[enumKey]));
	}

	return schema;
}

function _readClass(ext: EXTStructuralMetadata, classDef: ClassDef): Class {
	const classObject = ext.createClass();

	if (classDef.name !== undefined) {
		classObject.setObjectName(classDef.name);
	}

	if (classDef.description !== undefined) {
		classObject.setDescription(classDef.description);
	}

	const properties = classDef.properties || {};
	for (const classPropertyKey of Object.keys(properties)) {
		const classProperty = _readClassProperty(ext, properties[classPropertyKey]);
		classObject.setProperty(classPropertyKey, classProperty);
	}

	return classObject;
}

function _readClassProperty(ext: EXTStructuralMetadata, classPropertyDef: ClassPropertyDef) {
	const classProperty = ext.createClassProperty().setType(classPropertyDef.type);

	if (classPropertyDef.name !== undefined) {
		classProperty.setObjectName(classPropertyDef.name);
	}
	if (classPropertyDef.description !== undefined) {
		classProperty.setDescription(classPropertyDef.description);
	}

	if (classPropertyDef.componentType !== undefined) {
		classProperty.setComponentType(classPropertyDef.componentType);
	}
	if (classPropertyDef.enumType !== undefined) {
		classProperty.setEnumType(classPropertyDef.enumType);
	}
	if (classPropertyDef.array !== undefined) {
		classProperty.setArray(classPropertyDef.array);
	}
	if (classPropertyDef.count !== undefined) {
		classProperty.setCount(classPropertyDef.count);
	}
	if (classPropertyDef.normalized !== undefined) {
		classProperty.setNormalized(classPropertyDef.normalized);
	}
	if (classPropertyDef.offset !== undefined) {
		classProperty.setOffset(classPropertyDef.offset);
	}
	if (classPropertyDef.scale !== undefined) {
		classProperty.setScale(classPropertyDef.scale);
	}
	if (classPropertyDef.max !== undefined) {
		classProperty.setMax(classPropertyDef.max);
	}
	if (classPropertyDef.min !== undefined) {
		classProperty.setMin(classPropertyDef.min);
	}
	if (classPropertyDef.required !== undefined) {
		classProperty.setRequired(classPropertyDef.required);
	}
	if (classPropertyDef.noData !== undefined) {
		classProperty.setNoData(classPropertyDef.noData);
	}
	if (classPropertyDef.default !== undefined) {
		classProperty.setDefault(classPropertyDef.default);
	}

	return classProperty;
}

function _readEnum(ext: EXTStructuralMetadata, enumDef: EnumDef) {
	const enumObject = ext.createEnum();

	if (enumDef.name !== undefined) {
		enumObject.setObjectName(enumDef.name);
	}
	if (enumDef.description !== undefined) {
		enumObject.setDescription(enumDef.description);
	}
	if (enumDef.valueType !== undefined) {
		enumObject.setValueType(enumDef.valueType);
	}

	const valueDefs = enumDef.values || {};
	for (const valueDef of valueDefs) {
		enumObject.addEnumValue(_readEnumValue(ext, valueDef));
	}

	return enumObject;
}

function _readEnumValue(ext: EXTStructuralMetadata, enumValueDef: EnumValueDef) {
	const enumValue = ext.createEnumValue();

	if (enumValueDef.name !== undefined) {
		enumValue.setObjectName(enumValueDef.name);
	}

	if (enumValueDef.description !== undefined) {
		enumValue.setDescription(enumValueDef.description);
	}

	if (enumValueDef.value !== undefined) {
		enumValue.setValue(enumValueDef.value);
	}

	return enumValue;
}

function _readPropertyTexture(
	ext: EXTStructuralMetadata,
	context: ReaderContext,
	propertyTextureDef: PropertyTextureDef,
) {
	const propertyTexture = ext.createPropertyTexture();

	propertyTexture.setClass(propertyTextureDef.class);
	if (propertyTextureDef.name !== undefined) {
		propertyTexture.setName(propertyTextureDef.name);
	}
	const properties = propertyTextureDef.properties || {};
	for (const propertyKey of Object.keys(properties)) {
		const propertyTextureProperty = _readPropertyTextureProperty(ext, context, properties[propertyKey]);
		propertyTexture.setProperty(propertyKey, propertyTextureProperty);
	}

	return propertyTexture;
}

function _readPropertyTextureProperty(
	ext: EXTStructuralMetadata,
	context: ReaderContext,
	propertyTexturePropertyDef: PropertyTexturePropertyDef,
) {
	const propertyTextureProperty = ext.createPropertyTextureProperty();

	const jsonDoc = context.jsonDoc;
	const textureDefs = jsonDoc.json.textures || [];
	if (propertyTexturePropertyDef.channels) {
		propertyTextureProperty.setChannels(propertyTexturePropertyDef.channels);
	}
	const source = textureDefs[propertyTexturePropertyDef.index].source;
	if (source !== undefined) {
		const texture = context.textures[source];
		propertyTextureProperty.setTexture(texture);
		const textureInfo = propertyTextureProperty.getTextureInfo();
		if (textureInfo) {
			context.setTextureInfo(textureInfo, propertyTexturePropertyDef);
		}
	}
	if (propertyTexturePropertyDef.offset !== undefined) {
		propertyTextureProperty.setOffset(propertyTexturePropertyDef.offset);
	}
	if (propertyTexturePropertyDef.scale !== undefined) {
		propertyTextureProperty.setScale(propertyTexturePropertyDef.scale);
	}
	if (propertyTexturePropertyDef.max !== undefined) {
		propertyTextureProperty.setMax(propertyTexturePropertyDef.max);
	}
	if (propertyTexturePropertyDef.min !== undefined) {
		propertyTextureProperty.setMin(propertyTexturePropertyDef.min);
	}

	return propertyTextureProperty;
}

function _readPropertyTable(ext: EXTStructuralMetadata, context: ReaderContext, propertyTableDef: PropertyTableDef) {
	const propertyTable = ext.createPropertyTable().setClass(propertyTableDef.class).setCount(propertyTableDef.count);

	if (propertyTableDef.name !== undefined) {
		propertyTable.setObjectName(propertyTableDef.name);
	}

	const properties = propertyTableDef.properties || {};
	for (const propertyKey of Object.keys(properties)) {
		const propertyTableProperty = _readPropertyTableProperty(ext, context, properties[propertyKey]);
		propertyTable.setProperty(propertyKey, propertyTableProperty);
	}

	return propertyTable;
}

function _readPropertyTableProperty(
	ext: EXTStructuralMetadata,
	context: ReaderContext,
	propertyTablePropertyDef: PropertyTablePropertyDef,
) {
	const propertyTableProperty = ext.createPropertyTableProperty();

	const values = getBufferViewData(context, propertyTablePropertyDef.values);
	propertyTableProperty.setValues(values);

	if (propertyTablePropertyDef.arrayOffsets !== undefined) {
		const arrayOffsetsData = getBufferViewData(context, propertyTablePropertyDef.arrayOffsets);
		propertyTableProperty.setArrayOffsets(arrayOffsetsData);
	}

	if (propertyTablePropertyDef.stringOffsets !== undefined) {
		const stringOffsetsData = getBufferViewData(context, propertyTablePropertyDef.stringOffsets);
		propertyTableProperty.setStringOffsets(stringOffsetsData);
	}

	if (propertyTablePropertyDef.arrayOffsetType !== undefined) {
		propertyTableProperty.setArrayOffsetType(propertyTablePropertyDef.arrayOffsetType);
	}
	if (propertyTablePropertyDef.stringOffsetType !== undefined) {
		propertyTableProperty.setStringOffsetType(propertyTablePropertyDef.stringOffsetType);
	}
	if (propertyTablePropertyDef.offset !== undefined) {
		propertyTableProperty.setOffset(propertyTablePropertyDef.offset);
	}
	if (propertyTablePropertyDef.scale !== undefined) {
		propertyTableProperty.setScale(propertyTablePropertyDef.scale);
	}
	if (propertyTablePropertyDef.max !== undefined) {
		propertyTableProperty.setMax(propertyTablePropertyDef.max);
	}
	if (propertyTablePropertyDef.min !== undefined) {
		propertyTableProperty.setMin(propertyTablePropertyDef.min);
	}

	return propertyTableProperty;
}

function _readPropertyAttribute(ext: EXTStructuralMetadata, propertyAttributeDef: PropertyAttributeDef) {
	const propertyAttribute = ext.createPropertyAttribute();

	propertyAttribute.setClass(propertyAttributeDef.class);
	if (propertyAttributeDef.name !== undefined) {
		propertyAttribute.setName(propertyAttributeDef.name);
	}
	const properties = propertyAttributeDef.properties || {};
	for (const propertyKey of Object.keys(properties)) {
		const propertyAttributeProperty = _readPropertyAttributeProperty(ext, properties[propertyKey]);
		propertyAttribute.setProperty(propertyKey, propertyAttributeProperty);
	}

	return propertyAttribute;
}

function _readPropertyAttributeProperty(
	ext: EXTStructuralMetadata,
	propertyAttributePropertyDef: PropertyAttributePropertyDef,
) {
	const propertyAttributeProperty = ext.createPropertyAttributeProperty();

	propertyAttributeProperty.setAttribute(propertyAttributePropertyDef.attribute);

	if (propertyAttributePropertyDef.offset !== undefined) {
		propertyAttributeProperty.setOffset(propertyAttributePropertyDef.offset);
	}
	if (propertyAttributePropertyDef.scale !== undefined) {
		propertyAttributeProperty.setScale(propertyAttributePropertyDef.scale);
	}
	if (propertyAttributePropertyDef.max !== undefined) {
		propertyAttributeProperty.setMax(propertyAttributePropertyDef.max);
	}
	if (propertyAttributePropertyDef.min !== undefined) {
		propertyAttributeProperty.setMin(propertyAttributePropertyDef.min);
	}

	return propertyAttributeProperty;
}

/******************************************************************************
 * Serialization.
 */

function _writeStructuralMetadataDef(
	context: WriterContext,
	structuralMetadata: StructuralMetadata,
): StructuralMetadataDef {
	const structuralMetadataDef: StructuralMetadataDef = {};

	const schema = structuralMetadata.getSchema();
	if (schema) {
		const schemaDef = _writeSchemaDef(schema);
		structuralMetadataDef.schema = schemaDef;
	}
	const schemaUri = structuralMetadata.getSchemaUri();
	if (schemaUri !== null) {
		structuralMetadataDef.schemaUri = schemaUri;
	}

	const propertyTables = structuralMetadata.listPropertyTables();
	if (propertyTables.length > 0) {
		const propertyTableDefs: PropertyTableDef[] = [];
		for (const propertyTable of propertyTables) {
			const propertyTableDef = _writePropertyTableDef(context, propertyTable);
			propertyTableDefs.push(propertyTableDef);
		}
		structuralMetadataDef.propertyTables = propertyTableDefs;
	}

	const propertyTextures = structuralMetadata.listPropertyTextures();
	if (propertyTextures.length > 0) {
		const propertyTextureDefs: PropertyTextureDef[] = [];
		for (const propertyTexture of propertyTextures) {
			const propertyTextureDef = _writePropertyTextureDef(context, propertyTexture);
			propertyTextureDefs.push(propertyTextureDef);
		}
		structuralMetadataDef.propertyTextures = propertyTextureDefs;
	}

	const propertyAttributes = structuralMetadata.listPropertyAttributes();
	if (propertyAttributes.length > 0) {
		const propertyAttributeDefs: PropertyAttributeDef[] = [];
		for (const propertyAttribute of propertyAttributes) {
			const propertyAttributeDef = _writePropertyAttributeDef(propertyAttribute);
			propertyAttributeDefs.push(propertyAttributeDef);
		}
		structuralMetadataDef.propertyAttributes = propertyAttributeDefs;
	}

	return structuralMetadataDef;
}

function _writeSchemaDef(schema: Schema): SchemaDef {
	const schemaDef: SchemaDef = { id: schema.getId() };

	const classKeys = schema.listClassKeys();
	if (classKeys.length > 0) {
		schemaDef.classes = {};
		for (const classKey of classKeys) {
			const classObject = schema.getClass(classKey)!;
			const classDef = _writeClassDef(classObject);
			schemaDef.classes[classKey] = classDef;
		}
	}

	const enumKeys = schema.listEnumKeys();
	if (enumKeys.length > 0) {
		schemaDef.enums = {};
		for (const enumKey of enumKeys) {
			const enumObject = schema.getEnum(enumKey)!;
			const enumDef = _writeEnumDef(enumObject);
			schemaDef.enums[enumKey] = enumDef;
		}
	}

	if (schema.getObjectName()) {
		schemaDef.name = schema.getObjectName()!;
	}

	if (schema.getDescription()) {
		schemaDef.description = schema.getDescription()!;
	}

	if (schema.getVersion()) {
		schemaDef.version = schema.getVersion()!;
	}

	return schemaDef;
}

function _writeClassDef(classObject: Class): ClassDef {
	const classDef: ClassDef = {};

	const propertyKeys = classObject.listPropertyKeys();
	if (propertyKeys.length > 0) {
		classDef.properties = {};
		for (const propertyKey of propertyKeys) {
			const propertyObject = classObject.getProperty(propertyKey)!;
			classDef.properties[propertyKey] = _writeClassPropertyDef(propertyObject);
		}
	}

	if (classObject.getObjectName()) {
		classDef.name = classObject.getObjectName()!;
	}

	if (classObject.getDescription()) {
		classDef.description = classObject.getDescription()!;
	}

	return classDef;
}

function _writeClassPropertyDef(classProperty: ClassProperty): ClassPropertyDef {
	const classPropertyDef: ClassPropertyDef = { type: classProperty.getType() };

	if (classProperty.getArray()) {
		classPropertyDef.array = classProperty.getArray();
	}

	if (classProperty.getNormalized()) {
		classPropertyDef.normalized = classProperty.getNormalized();
	}

	if (classProperty.getRequired()) {
		classPropertyDef.required = classProperty.getRequired();
	}

	if (classProperty.getObjectName() != null) {
		classPropertyDef.name = classProperty.getObjectName()!;
	}

	if (classProperty.getDescription() != null) {
		classPropertyDef.description = classProperty.getDescription()!;
	}

	if (classProperty.getComponentType() != null) {
		classPropertyDef.componentType = classProperty.getComponentType()!;
	}

	if (classProperty.getEnumType() != null) {
		classPropertyDef.enumType = classProperty.getEnumType()!;
	}

	if (classProperty.getCount() != null) {
		classPropertyDef.count = classProperty.getCount()!;
	}

	if (classProperty.getOffset() != null) {
		classPropertyDef.offset = classProperty.getOffset()!;
	}

	if (classProperty.getScale() != null) {
		classPropertyDef.scale = classProperty.getScale()!;
	}

	if (classProperty.getMax() != null) {
		classPropertyDef.max = classProperty.getMax()!;
	}

	if (classProperty.getMin() != null) {
		classPropertyDef.min = classProperty.getMin()!;
	}

	if (classProperty.getNoData() != null) {
		classPropertyDef.noData = classProperty.getNoData()!;
	}

	if (classProperty.getDefault() != null) {
		classPropertyDef.default = classProperty.getDefault()!;
	}

	return classPropertyDef;
}

function _writeEnumDef(enumObject: Enum): EnumDef {
	const enumDef: EnumDef = {
		values: enumObject.listValues().map(_writeEnumValueDef),
	};

	if (enumObject.getObjectName()) {
		enumDef.name = enumObject.getObjectName()!;
	}

	if (enumObject.getDescription()) {
		enumDef.description = enumObject.getDescription()!;
	}

	if (enumObject.getValueType() !== 'UINT16') {
		enumDef.valueType = enumObject.getValueType();
	}

	return enumDef;
}

function _writeEnumValueDef(enumValue: EnumValue): EnumValueDef {
	const enumValueDef: EnumValueDef = {
		name: enumValue.getObjectName(),
		value: enumValue.getValue(),
	};

	if (enumValue.getDescription()) {
		enumValueDef.description = enumValue.getDescription()!;
	}

	return enumValueDef;
}

function _writePropertyTableDef(context: WriterContext, propertyTable: PropertyTable): PropertyTableDef {
	const propertyTableDef: PropertyTableDef = {
		class: propertyTable.getClass(),
		count: propertyTable.getCount(),
	};

	if (propertyTable.getObjectName()) {
		propertyTableDef.name = propertyTable.getObjectName()!;
	}

	const propertyKeys = propertyTable.listPropertyKeys();
	if (propertyKeys.length > 0) {
		propertyTableDef.properties = {};
		for (const propertyKey of propertyKeys) {
			const propertyTableProperty = propertyTable.getProperty(propertyKey)!;
			const propertyTablePropertyDef = _writePropertyTablePropertyDef(context, propertyTableProperty);
			propertyTableDef.properties[propertyKey] = propertyTablePropertyDef;
		}
	}

	return propertyTableDef;
}

function _writePropertyTablePropertyDef(context: WriterContext, propertyTableProperty: PropertyTableProperty) {
	const values = propertyTableProperty.getValues();
	const valuesIndex = context.otherBufferViewsIndexMap.get(values)!;

	const propertyTablePropertyDef: PropertyTablePropertyDef = { values: valuesIndex };

	if (propertyTableProperty.getArrayOffsets()) {
		const arrayOffsets = propertyTableProperty.getArrayOffsets()!;
		const arrayOffsetsIndex = context.otherBufferViewsIndexMap.get(arrayOffsets);
		propertyTablePropertyDef.arrayOffsets = arrayOffsetsIndex;
	}

	if (propertyTableProperty.getStringOffsets()) {
		const stringOffsets = propertyTableProperty.getStringOffsets()!;
		const stringOffsetsIndex = context.otherBufferViewsIndexMap.get(stringOffsets);
		propertyTablePropertyDef.stringOffsets = stringOffsetsIndex;
	}

	if (propertyTableProperty.getArrayOffsetType() != null) {
		propertyTablePropertyDef.arrayOffsetType = propertyTableProperty.getArrayOffsetType();
	}

	if (propertyTableProperty.getStringOffsetType() != null) {
		propertyTablePropertyDef.stringOffsetType = propertyTableProperty.getStringOffsetType();
	}

	if (propertyTableProperty.getOffset() != null) {
		propertyTablePropertyDef.offset = propertyTableProperty.getOffset();
	}

	if (propertyTableProperty.getScale() != null) {
		propertyTablePropertyDef.scale = propertyTableProperty.getScale();
	}

	if (propertyTableProperty.getMax() != null) {
		propertyTablePropertyDef.max = propertyTableProperty.getMax();
	}

	if (propertyTableProperty.getMin() != null) {
		propertyTablePropertyDef.min = propertyTableProperty.getMin();
	}

	return propertyTablePropertyDef;
}

function _writePropertyAttributeDef(propertyAttribute: PropertyAttribute): PropertyAttributeDef {
	const propertyAttributeDef: PropertyAttributeDef = {
		class: propertyAttribute.getClass(),
	};

	if (propertyAttribute.getObjectName()) {
		propertyAttributeDef.name = propertyAttribute.getObjectName()!;
	}

	const propertyKeys = propertyAttribute.listPropertyKeys();
	if (propertyKeys.length > 0) {
		propertyAttributeDef.properties = {};
		for (const propertyKey of propertyKeys) {
			const propertyAttributeProperty = propertyAttribute.getProperty(propertyKey)!;
			const propertyAttributePropertyDef = _writePropertyAttributePropertyDef(propertyAttributeProperty);
			propertyAttributeDef.properties[propertyKey] = propertyAttributePropertyDef;
		}
	}

	return propertyAttributeDef;
}

function _writePropertyAttributePropertyDef(
	propertyAttributeProperty: PropertyAttributeProperty,
): PropertyAttributePropertyDef {
	const propertyAttributePropertyDef: PropertyAttributePropertyDef = {
		attribute: propertyAttributeProperty.getAttribute(),
	};

	if (propertyAttributeProperty.getOffset() != null) {
		propertyAttributePropertyDef.offset = propertyAttributeProperty.getOffset()!;
	}

	if (propertyAttributeProperty.getScale() != null) {
		propertyAttributePropertyDef.scale = propertyAttributeProperty.getScale()!;
	}

	if (propertyAttributeProperty.getMax() != null) {
		propertyAttributePropertyDef.max = propertyAttributeProperty.getMax()!;
	}

	if (propertyAttributeProperty.getMin() != null) {
		propertyAttributePropertyDef.min = propertyAttributeProperty.getMin()!;
	}

	return propertyAttributePropertyDef;
}

function _writePropertyTextureDef(context: WriterContext, propertyTexture: PropertyTexture): PropertyTextureDef {
	const propertyTextureDef: PropertyTextureDef = {
		class: propertyTexture.getClass(),
	};

	if (propertyTexture.getObjectName()) {
		propertyTextureDef.name = propertyTexture.getObjectName()!;
	}

	const propertyKeys = propertyTexture.listPropertyKeys();
	if (propertyKeys.length > 0) {
		propertyTextureDef.properties = {};
		for (const propertyKey of propertyKeys) {
			const propertyTextureProperty = propertyTexture.getProperty(propertyKey)!;
			const propertyTexturePropertyDef = _writePropertyTexturePropertyDef(context, propertyTextureProperty);
			propertyTextureDef.properties[propertyKey] = propertyTexturePropertyDef;
		}
	}

	return propertyTextureDef;
}

function _writePropertyTexturePropertyDef(
	context: WriterContext,
	propertyTextureProperty: PropertyTextureProperty,
): PropertyTexturePropertyDef {
	const texture = propertyTextureProperty.getTexture()!;
	const textureInfo = propertyTextureProperty.getTextureInfo()!;
	const channels = propertyTextureProperty.getChannels();

	const textureInfoDef: PropertyTexturePropertyDef = context.createTextureInfoDef(texture, textureInfo);

	if (!MathUtils.eq(channels, [0])) {
		textureInfoDef.channels = channels;
	}

	if (propertyTextureProperty.getOffset() != null) {
		textureInfoDef.offset = propertyTextureProperty.getOffset();
	}

	if (propertyTextureProperty.getScale() != null) {
		textureInfoDef.scale = propertyTextureProperty.getScale();
	}

	if (propertyTextureProperty.getMax() != null) {
		textureInfoDef.max = propertyTextureProperty.getMax();
	}

	if (propertyTextureProperty.getMin() != null) {
		textureInfoDef.min = propertyTextureProperty.getMin();
	}

	return textureInfoDef;
}

/******************************************************************************
 * Utilities.
 */

/**
 * Obtains the data of the buffer view with the given index, based on the current reader context.
 *
 * This will internally resolve the buffer of the specified buffer view, and return the slice of
 * the buffer data that corresponds to the buffer view.
 */
function getBufferViewData(context: ReaderContext, bufferViewIndex: number): Uint8Array {
	const jsonDoc = context.jsonDoc;
	const bufferDefs = jsonDoc.json.buffers || [];
	const bufferViewDefs = jsonDoc.json.bufferViews || [];
	const bufferViewDef = bufferViewDefs[bufferViewIndex];
	const bufferDef = bufferDefs[bufferViewDef.buffer];
	const bufferData = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
	const byteOffset = bufferViewDef.byteOffset || 0;
	const byteLength = bufferViewDef.byteLength;
	const bufferViewData = bufferData.slice(byteOffset, byteOffset + byteLength);
	return bufferViewData;
}

/**
 * Obtain the "otherBufferViews" for the main buffer from the given context,
 * creating them if they did not exist yet.
 *
 * TODO(cleanup): Unclear whether existence of these buffer views is conditional,
 * or guaranteed to be missing. Check, and clarify this function.
 */
function getOrCreateOtherBufferViews(document: Document, context: WriterContext): Uint8Array[] {
	const root = document.getRoot();
	const buffer = root.listBuffers()[0];
	let otherBufferViews: Uint8Array[] | undefined = context.otherBufferViews.get(buffer);
	if (!otherBufferViews) {
		otherBufferViews = [];
		context.otherBufferViews.set(buffer, otherBufferViews);
	}
	return otherBufferViews;
}
