import {
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
import {
	Class,
	ClassProperty,
	ElementStructuralMetadata,
	Enum,
	EnumValue,
	MeshPrimitiveStructuralMetadata,
	PropertyAttribute,
	PropertyAttributeProperty,
	PropertyTable,
	PropertyTableProperty,
	PropertyTexture,
	PropertyTextureProperty,
	Schema,
	StructuralMetadata,
} from './metadata.js';

const NAME = 'EXT_structural_metadata';

//============================================================================
// Interfaces for the JSON structure
// (See `EXTMeshFeatures` for details about the concepts)

/**
 * The type of a metadata class property
 *
 * @internal
 */
export type ClassPropertyType =
	| 'SCALAR'
	| 'VEC2'
	| 'VEC3'
	| 'VEC4'
	| 'MAT2'
	| 'MAT3'
	| 'MAT4'
	| 'STRING'
	| 'BOOLEAN'
	| 'ENUM';

/**
 * The component type of a metadata class property
 *
 * @internal
 */
export type ClassPropertyComponentType =
	| 'INT8'
	| 'UINT8'
	| 'INT16'
	| 'UINT16'
	| 'INT32'
	| 'UINT32'
	| 'INT64'
	| 'UINT64'
	| 'FLOAT32'
	| 'FLOAT64';

/**
 * The value type of a metadata enum
 *
 * @internal
 */
export type EnumValueType = 'INT8' | 'UINT8' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'INT64' | 'UINT64';

/**
 * The type of the string- or array offsets for a property table property
 *
 * @internal
 */
export type PropertyTablePropertyOffsetType = 'UINT8' | 'UINT16' | 'UINT32' | 'UINT64';

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

type NumericValue = number | number[] | number[][];
type NoDataValue = number | string | number[] | string[] | number[][];
type AnyValue = number | string | boolean | number[] | string[] | boolean[] | number[][];

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

// This corresponds to the EXT_structural_metadata.schema.json
// schema, which is structural metadata that can be applied
// to all glTF elements, and is only constrained to 'nodes' in
// the specification text for now
interface ElementStructuralMetadataDef {
	propertyTable?: number;
	index?: number;
}

// This corresponds to the mesh.primitive.EXT_structural_metadata.schema.json
// schema
interface MeshPrimitiveStructuralMetadataDef {
	propertyTextures?: number[];
	propertyAttributes?: number[];
}

//============================================================================

/**
 * [`EXT_structural_metadata`](https://github.com/CesiumGS/glTF/tree/proposal-EXT_structural_metadata/extensions/2.0/Vendor/EXT_structural_metadata/)
 * defines a means of storing structured metadata within a glTF 2.0 asset.
 *
 * @internal
 */
export class EXTStructuralMetadata extends Extension {
	// Implementation note:
	//
	// This class is large, and largely undocumented. But its implementation
	// is mostly purely mechanical, and the overall structure is:
	// - There are 'create' methods for all model classes. This includes
	//   some 'create...From' methods that directly translate JSON into
	//   the model classes (for things that do not require the reader context)
	// - There are `read` methods that receive (the reader context and)
	//   the 'model' instance and the '...Def' instance (i.e. the plain
	//   JSON object). These 'read' methods fill the 'model' instance
	//   with the data from the '...Def' instance, resolving references
	//   (i.e. indices) accordingly, and call the 'read' methods for
	//   any sub-elements.
	// - There are `create...Def` methods that receive (the writer
	//   context and) the 'model' instance, and create the '..Def'
	//   instance, calling other 'create...Def' methods to fill in
	//   the sub-elements

	public override readonly extensionName = NAME;
	public static override EXTENSION_NAME = NAME;

	public override readonly prewriteTypes = [PropertyType.BUFFER];

	// Must read EXT_structural_metadata before EXT_mesh_features.
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
		return new ElementStructuralMetadata(this.document.getGraph());
	}

	createMeshPrimitiveStructuralMetadata() {
		return new MeshPrimitiveStructuralMetadata(this.document.getGraph());
	}

	createSchemaFrom(schemaDef: SchemaDef): Schema {
		const schema = this.createSchema();
		this.readSchema(schema, schemaDef);
		return schema;
	}

	createClassFrom(classDef: ClassDef): Class {
		const classObject = this.createClass();
		this.readClass(classObject, classDef);
		return classObject;
	}

	createClassPropertyFrom(classPropertyDef: ClassPropertyDef): ClassProperty {
		const classProperty = this.createClassProperty();
		this.readClassProperty(classProperty, classPropertyDef);
		return classProperty;
	}

	createEnumFrom(enumDef: EnumDef): Enum {
		const enumObject = this.createEnum();
		this.readEnum(enumObject, enumDef);
		return enumObject;
	}

	createEnumValueFrom(enumValueDef: EnumValueDef): EnumValue {
		const enumValue = this.createEnumValue();
		this.readEnumValue(enumValue, enumValueDef);
		return enumValue;
	}

	public override read(_context: ReaderContext): this {
		return this;
	}

	public override preread(context: ReaderContext): this {
		const structuralMetadata = this.createTopLevelStructuralMetadata(context);
		if (!structuralMetadata) {
			return this;
		}

		const jsonDoc = context.jsonDoc;
		const gltfDef = jsonDoc.json;

		const meshDefs = gltfDef.meshes || [];
		meshDefs.forEach((meshDef, meshIndex) => {
			const mesh = context.meshes[meshIndex];
			const primitives = mesh.listPrimitives();
			const primDefs = meshDef.primitives || [];
			primDefs.forEach((primDef, primIndex) => {
				const prim = primitives[primIndex];
				this.readPrimitive(structuralMetadata, prim, primDef);
			});
		});

		const nodeDefs = gltfDef.nodes || [];
		nodeDefs.forEach((nodeDef, nodeIndex) => {
			const node = context.nodes[nodeIndex];
			this.readNode(structuralMetadata, node, nodeDef);
		});
		return this;
	}

	private createTopLevelStructuralMetadata(context: ReaderContext): StructuralMetadata | undefined {
		const jsonDoc = context.jsonDoc;
		const gltfDef = jsonDoc.json;
		if (!gltfDef.extensions || !gltfDef.extensions[NAME]) {
			return undefined;
		}

		// Obtain the top-level structural metadata information,
		// and use it to fill the "model class" instance
		const structuralMetadataDef = gltfDef.extensions[NAME] as StructuralMetadataDef;
		const structuralMetadata = this.createStructuralMetadata();

		this.readStructuralMetadata(context, structuralMetadata, structuralMetadataDef);

		const root = this.document.getRoot();
		root.setExtension(NAME, structuralMetadata);
		return structuralMetadata;
	}

	private readStructuralMetadata(
		context: ReaderContext,
		structuralMetadata: StructuralMetadata,
		structuralMetadataDef: StructuralMetadataDef,
	) {
		if (structuralMetadataDef.schema !== undefined) {
			const schemaDef = structuralMetadataDef.schema;
			const schema = this.createSchemaFrom(schemaDef);
			structuralMetadata.setSchema(schema);
		} else if (structuralMetadataDef.schemaUri !== undefined) {
			const schemaUri = structuralMetadataDef.schemaUri;
			structuralMetadata.setSchemaUri(schemaUri);
		}

		const propertyTextureDefs = structuralMetadataDef.propertyTextures || [];
		for (const propertyTextureDef of propertyTextureDefs) {
			const propertyTexture = this.createPropertyTexture();
			this.readPropertyTexture(context, propertyTexture, propertyTextureDef);
			structuralMetadata.addPropertyTexture(propertyTexture);
		}

		const propertyTableDefs = structuralMetadataDef.propertyTables || [];
		for (const propertyTableDef of propertyTableDefs) {
			const propertyTable = this.createPropertyTable();
			this.readPropertyTable(context, propertyTable, propertyTableDef);
			structuralMetadata.addPropertyTable(propertyTable);
		}

		const propertyAttributeDefs = structuralMetadataDef.propertyAttributes || [];
		for (const propertyAttributeDef of propertyAttributeDefs) {
			const propertyAttribute = this.createPropertyAttribute();
			this.readPropertyAttribute(propertyAttribute, propertyAttributeDef);
			structuralMetadata.addPropertyAttribute(propertyAttribute);
		}
	}

	private readSchema(schema: Schema, schemaDef: SchemaDef) {
		if (schemaDef.id !== undefined) {
			schema.setId(schemaDef.id);
		} else {
			throw new Error(`${NAME}: The schema.id is required`);
		}
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
			const classObject = this.createClassFrom(classDef);
			schema.setClass(classKey, classObject);
		}
		const enums = schemaDef.enums || {};
		for (const enumKey of Object.keys(enums)) {
			const enumDef = enums[enumKey];
			const enumObject = this.createEnumFrom(enumDef);
			schema.setEnum(enumKey, enumObject);
		}
	}

	private readClass(classObject: Class, classDef: ClassDef) {
		if (classDef.name !== undefined) {
			classObject.setObjectName(classDef.name);
		}
		if (classDef.description !== undefined) {
			classObject.setDescription(classDef.description);
		}
		const properties = classDef.properties || {};
		for (const classPropertyKey of Object.keys(properties)) {
			const classPropertyDef = properties[classPropertyKey];
			const classProperty = this.createClassPropertyFrom(classPropertyDef);
			classObject.setProperty(classPropertyKey, classProperty);
		}
	}

	private readClassProperty(classProperty: ClassProperty, classPropertyDef: ClassPropertyDef) {
		// I'd REALLY like to boil these down to
		// setIfDefined(classProperty, classPropertyDef, "type");
		// or even
		// for (p in def) set(m, def, p);
		// or even
		// assignAll(model, def);
		// But ...
		// - this does not seem to be possible without the "evil eval"
		// - this would break down for 'name' and 'setObjectName'...
		// - the error handling for required properties becomes tricky...

		if (classPropertyDef.name !== undefined) {
			classProperty.setObjectName(classPropertyDef.name);
		}
		if (classPropertyDef.description !== undefined) {
			classProperty.setDescription(classPropertyDef.description);
		}

		if (classPropertyDef.type !== undefined) {
			classProperty.setType(classPropertyDef.type);
		} else {
			throw new Error(`${NAME}: The classProperty.type is required`);
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
	}

	private readEnum(enumObject: Enum, enumDef: EnumDef) {
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
			const enumValue = this.createEnumValueFrom(valueDef);
			enumObject.addEnumValue(enumValue);
		}
	}

	private readEnumValue(enumValue: EnumValue, enumValueDef: EnumValueDef) {
		if (enumValueDef.name !== undefined) {
			enumValue.setObjectName(enumValueDef.name);
		}
		if (enumValueDef.description !== undefined) {
			enumValue.setDescription(enumValueDef.description);
		}
		if (enumValueDef.value !== undefined) {
			enumValue.setValue(enumValueDef.value);
		}
	}

	private readPropertyTexture(
		context: ReaderContext,
		propertyTexture: PropertyTexture,
		propertyTextureDef: PropertyTextureDef,
	) {
		propertyTexture.setClass(propertyTextureDef.class);
		if (propertyTextureDef.name !== undefined) {
			propertyTexture.setName(propertyTextureDef.name);
		}
		const properties = propertyTextureDef.properties || {};
		for (const propertyKey of Object.keys(properties)) {
			const propertyTexturePropertyDef = properties[propertyKey];
			const propertyTextureProperty = this.createPropertyTextureProperty();
			this.readPropertyTextureProperty(context, propertyTextureProperty, propertyTexturePropertyDef);
			propertyTexture.setProperty(propertyKey, propertyTextureProperty);
		}
	}

	private readPropertyTextureProperty(
		context: ReaderContext,
		propertyTextureProperty: PropertyTextureProperty,
		propertyTexturePropertyDef: PropertyTexturePropertyDef,
	) {
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
	}

	private readPropertyTable(
		context: ReaderContext,
		propertyTable: PropertyTable,
		propertyTableDef: PropertyTableDef,
	) {
		propertyTable.setClass(propertyTableDef.class);
		if (propertyTableDef.name !== undefined) {
			propertyTable.setName(propertyTableDef.name);
		}
		propertyTable.setCount(propertyTableDef.count);
		const properties = propertyTableDef.properties || {};
		for (const propertyKey of Object.keys(properties)) {
			const propertyTablePropertyDef = properties[propertyKey];
			const propertyTableProperty = this.createPropertyTableProperty();
			this.readPropertyTableProperty(context, propertyTableProperty, propertyTablePropertyDef);
			propertyTable.setProperty(propertyKey, propertyTableProperty);
		}
	}

	private readPropertyTableProperty(
		context: ReaderContext,
		propertyTableProperty: PropertyTableProperty,
		propertyTablePropertyDef: PropertyTablePropertyDef,
	) {
		const valuesData = EXTStructuralMetadata.obtainBufferViewData(context, propertyTablePropertyDef.values);
		propertyTableProperty.setValues(valuesData);

		if (propertyTablePropertyDef.arrayOffsets !== undefined) {
			const arrayOffsetsData = EXTStructuralMetadata.obtainBufferViewData(
				context,
				propertyTablePropertyDef.arrayOffsets,
			);
			propertyTableProperty.setArrayOffsets(arrayOffsetsData);
		}

		if (propertyTablePropertyDef.stringOffsets !== undefined) {
			const stringOffsetsData = EXTStructuralMetadata.obtainBufferViewData(
				context,
				propertyTablePropertyDef.stringOffsets,
			);
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
	}

	private readPropertyAttribute(propertyAttribute: PropertyAttribute, propertyAttributeDef: PropertyAttributeDef) {
		propertyAttribute.setClass(propertyAttributeDef.class);
		if (propertyAttributeDef.name !== undefined) {
			propertyAttribute.setName(propertyAttributeDef.name);
		}
		const properties = propertyAttributeDef.properties || {};
		for (const propertyKey of Object.keys(properties)) {
			const propertyAttributePropertyDef = properties[propertyKey];
			const propertyAttributeProperty = this.createPropertyAttributeProperty();
			this.readPropertyAttributeProperty(propertyAttributeProperty, propertyAttributePropertyDef);
			propertyAttribute.setProperty(propertyKey, propertyAttributeProperty);
		}
	}

	private readPropertyAttributeProperty(
		propertyAttributeProperty: PropertyAttributeProperty,
		propertyAttributePropertyDef: PropertyAttributePropertyDef,
	) {
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
	}

	private readPrimitive(structuralMetadata: StructuralMetadata, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		if (!primDef.extensions || !primDef.extensions[NAME]) {
			return;
		}
		const meshPrimitiveStructuralMetadata = this.createMeshPrimitiveStructuralMetadata();

		const extensionObject = primDef.extensions[NAME];
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
		prim.setExtension(NAME, meshPrimitiveStructuralMetadata);
	}

	private readNode(structuralMetadata: StructuralMetadata, node: Node, nodeDef: GLTF.INode) {
		if (!nodeDef.extensions || !nodeDef.extensions[NAME]) {
			return;
		}
		const elementStructuralMetadata = this.createElementStructuralMetadata();

		const extensionObject = nodeDef.extensions[NAME];
		const elementStructuralMetadataDef = extensionObject as ElementStructuralMetadataDef;

		const propertyTables = structuralMetadata.listPropertyTables();
		const propertyTableIndex = elementStructuralMetadataDef.propertyTable;
		const index = elementStructuralMetadataDef.index;
		if (propertyTableIndex === undefined) {
			throw new Error(`${NAME}: No property table index in structural metadata`);
		}
		if (index === undefined) {
			throw new Error(`${NAME}: No index in structural metadata`);
		}
		const propertyTable = propertyTables[propertyTableIndex];
		elementStructuralMetadata.setPropertyTable(propertyTable);
		elementStructuralMetadata.setIndex(index);
		node.setExtension(NAME, elementStructuralMetadata);
	}

	/**
	 * Obtains the data of the buffer view with the given index,
	 * based on the current reader context.
	 *
	 * This will internally resolve the buffer of the specified
	 * buffer view, and return the slice of the buffer data
	 * that corresponds to the buffer view.
	 *
	 * @param context - The reader context
	 * @param bufferViewIndex - The buffer view index
	 * @returns The buffer view data
	 */
	private static obtainBufferViewData(context: ReaderContext, bufferViewIndex: number): Uint8Array {
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

	public override write(context: WriterContext): this {
		const root = this.document.getRoot();
		const structuralMetadata = root.getExtension<StructuralMetadata>(NAME);
		if (!structuralMetadata) {
			return this;
		}

		const jsonDoc = context.jsonDoc;
		const gltfDef = jsonDoc.json;

		const structuralMetadataDef = this.createStructuralMetadataDef(context, structuralMetadata);
		gltfDef.extensions = gltfDef.extensions || {};
		gltfDef.extensions[NAME] = structuralMetadataDef;

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
					this.writePrimitive(structuralMetadata, prim, primDef);
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
				this.writeNode(structuralMetadata, node, nodeDef);
			}
		}
		return this;
	}

	private writePrimitive(structuralMetadata: StructuralMetadata, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		const meshPrimitiveStructuralMetadata = prim.getExtension<MeshPrimitiveStructuralMetadata>(NAME);
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
					throw new Error(`${NAME}: Invalid property texture in mesh primitive`);
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
					throw new Error(`${NAME}: Invalid property attribute in mesh primitive`);
				}
			}
		}

		const meshPrimitiveStructuralMetadataDef: MeshPrimitiveStructuralMetadataDef = {
			propertyTextures: propertyTextureDefs,
			propertyAttributes: propertyAttributeDefs,
		};
		primDef.extensions = primDef.extensions || {};
		primDef.extensions[NAME] = meshPrimitiveStructuralMetadataDef;
	}

	private writeNode(structuralMetadata: StructuralMetadata, node: Node, nodeDef: GLTF.INode) {
		const elementStructuralMetadata = node.getExtension<ElementStructuralMetadata>(NAME);
		if (!elementStructuralMetadata) {
			return;
		}

		const globalPropertyTables = structuralMetadata.listPropertyTables();

		const propertyTable = elementStructuralMetadata.getPropertyTable();
		if (propertyTable) {
			const propertyTableIndex = globalPropertyTables.indexOf(propertyTable);
			if (propertyTableIndex >= 0) {
				const elementStructuralMetadataDef: ElementStructuralMetadataDef = {
					propertyTable: propertyTableIndex,
					index: elementStructuralMetadata.getIndex() ?? undefined,
				};
				nodeDef.extensions = nodeDef.extensions || {};
				nodeDef.extensions[NAME] = elementStructuralMetadataDef;
			} else {
				throw new Error(`${NAME}: Invalid property table in node`);
			}
		}
	}

	private createStructuralMetadataDef(
		context: WriterContext,
		structuralMetadata: StructuralMetadata,
	): StructuralMetadataDef {
		const structuralMetadataDef: StructuralMetadataDef = {};

		const schema = structuralMetadata.getSchema();
		if (schema) {
			const schemaDef = this.createSchemaDef(schema);
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
				const propertyTableDef = this.createPropertyTableDef(context, propertyTable);
				propertyTableDefs.push(propertyTableDef);
			}
			structuralMetadataDef.propertyTables = propertyTableDefs;
		}

		const propertyTextures = structuralMetadata.listPropertyTextures();
		if (propertyTextures.length > 0) {
			const propertyTextureDefs: PropertyTextureDef[] = [];
			for (const propertyTexture of propertyTextures) {
				const propertyTextureDef = this.createPropertyTextureDef(context, propertyTexture);
				propertyTextureDefs.push(propertyTextureDef);
			}
			structuralMetadataDef.propertyTextures = propertyTextureDefs;
		}

		const propertyAttributes = structuralMetadata.listPropertyAttributes();
		if (propertyAttributes.length > 0) {
			const propertyAttributeDefs: PropertyAttributeDef[] = [];
			for (const propertyAttribute of propertyAttributes) {
				const propertyAttributeDef = this.createPropertyAttributeDef(propertyAttribute);
				propertyAttributeDefs.push(propertyAttributeDef);
			}
			structuralMetadataDef.propertyAttributes = propertyAttributeDefs;
		}

		return structuralMetadataDef;
	}

	private createSchemaDef(schema: Schema): SchemaDef {
		let classes: { [key: string]: ClassDef } | undefined;
		let enums: { [key: string]: EnumDef } | undefined;

		const classKeys = schema.listClassKeys();
		if (classKeys.length > 0) {
			classes = {};
			for (const classKey of classKeys) {
				const classObject = schema.getClass(classKey);
				if (classObject) {
					const classDef = this.createClassDef(classObject);
					classes[classKey] = classDef;
				}
			}
		}

		const enumKeys = schema.listEnumKeys();
		if (enumKeys.length > 0) {
			enums = {};
			for (const enumKey of enumKeys) {
				const enumObject = schema.getEnum(enumKey);
				if (enumObject) {
					const enumDef = this.createEnumDef(enumObject);
					enums[enumKey] = enumDef;
				}
			}
		}

		const schemaDef: SchemaDef = {
			id: schema.getId(),
			name: schema.getObjectName() ?? undefined,
			description: schema.getDescription() ?? undefined,
			version: schema.getVersion() ?? undefined,
			classes: classes,
			enums: enums,
		};

		return schemaDef;
	}

	private createClassDef(classObject: Class): ClassDef {
		let properties: { [key: string]: ClassPropertyDef } | undefined;

		const propertyKeys = classObject.listPropertyKeys();
		if (propertyKeys.length > 0) {
			properties = {};
			for (const propertyKey of propertyKeys) {
				const propertyObject = classObject.getProperty(propertyKey);
				if (propertyObject) {
					const propertyDef = this.createClassPropertyDef(propertyObject);
					properties[propertyKey] = propertyDef;
				}
			}
		}

		const classDef: ClassDef = {
			name: classObject.getObjectName() ?? undefined,
			description: classObject.getDescription() ?? undefined,
			properties: properties,
		};
		return classDef;
	}

	private createClassPropertyDef(classProperty: ClassProperty): ClassPropertyDef {
		const classPropertyDef: ClassPropertyDef = {
			name: classProperty.getObjectName() ?? undefined,
			description: classProperty.getDescription() ?? undefined,
			type: classProperty.getType(),
			componentType: classProperty.getComponentType() ?? undefined,
			enumType: classProperty.getEnumType() ?? undefined,
			count: classProperty.getCount() ?? undefined,
			offset: classProperty.getOffset() ?? undefined,
			scale: classProperty.getScale() ?? undefined,
			max: classProperty.getMax() ?? undefined,
			min: classProperty.getMin() ?? undefined,
			noData: classProperty.getNoData() ?? undefined,
			default: classProperty.getDefault() ?? undefined,
		};

		if (classProperty.getArray() !== false) {
			classPropertyDef.array = classProperty.getArray();
		}

		if (classProperty.getNormalized() !== false) {
			classPropertyDef.normalized = classProperty.getNormalized();
		}

		if (classProperty.getRequired() !== false) {
			classPropertyDef.required = classProperty.getRequired();
		}

		return classPropertyDef;
	}

	private createEnumDef(enumObject: Enum): EnumDef {
		const valueDefs: EnumValueDef[] = [];

		const values = enumObject.listValues();
		for (const value of values) {
			const valueDef = this.createEnumValueDef(value);
			valueDefs.push(valueDef);
		}

		const enumDef: EnumDef = {
			name: enumObject.getObjectName() ?? undefined,
			description: enumObject.getDescription() ?? undefined,
			valueType: enumObject.getValueType(),
			values: valueDefs,
		};
		return enumDef;
	}

	private createEnumValueDef(enumValue: EnumValue): EnumValueDef {
		const enumValueDef: EnumValueDef = {
			name: enumValue.getObjectName(),
			description: enumValue.getDescription() ?? undefined,
			value: enumValue.getValue(),
		};
		return enumValueDef;
	}

	private createPropertyTableDef(context: WriterContext, propertyTable: PropertyTable): PropertyTableDef {
		let propertyDefs: { [key: string]: PropertyTablePropertyDef } | undefined;
		const propertyKeys = propertyTable.listPropertyKeys();
		if (propertyKeys.length > 0) {
			propertyDefs = {};
			for (const propertyKey of propertyKeys) {
				const propertyTableProperty = propertyTable.getProperty(propertyKey);
				if (propertyTableProperty) {
					const propertyTablePropertyDef = this.createPropertyTablePropertyDef(
						context,
						propertyKey,
						propertyTableProperty,
					);
					propertyDefs[propertyKey] = propertyTablePropertyDef;
				}
			}
		}

		const propertyTableDef: PropertyTableDef = {
			name: propertyTable.getObjectName() ?? undefined,
			class: propertyTable.getClass(),
			count: propertyTable.getCount(),
			properties: propertyDefs,
		};
		return propertyTableDef;
	}

	private createPropertyTablePropertyDef(
		context: WriterContext,
		propertyName: string,
		propertyTableProperty: PropertyTableProperty,
	) {
		const valuesData = propertyTableProperty.getValues();
		const values = context.otherBufferViewsIndexMap.get(valuesData);
		if (values === undefined) {
			throw new Error(`${NAME}: No values for property table property ${propertyName}`);
		}

		let arrayOffsets: number | undefined;
		const arrayOffsetsData = propertyTableProperty.getArrayOffsets();
		if (arrayOffsetsData) {
			arrayOffsets = context.otherBufferViewsIndexMap.get(arrayOffsetsData);
			if (arrayOffsets === undefined) {
				throw new Error(`${NAME}: No arrayOffsets for property table property ${propertyName}`);
			}
		}

		let stringOffsets: number | undefined;
		const stringOffsetsData = propertyTableProperty.getStringOffsets();
		if (stringOffsetsData) {
			stringOffsets = context.otherBufferViewsIndexMap.get(stringOffsetsData);
			if (stringOffsets === undefined) {
				throw new Error(`${NAME}: No stringOffsets for property table property ${propertyName}`);
			}
		}

		const propertyTablePropertyDef: PropertyTablePropertyDef = {
			values: values,
			arrayOffsets: arrayOffsets,
			stringOffsets: stringOffsets,
			arrayOffsetType: propertyTableProperty.getArrayOffsetType(),
			stringOffsetType: propertyTableProperty.getStringOffsetType(),
			offset: propertyTableProperty.getOffset() ?? undefined,
			scale: propertyTableProperty.getScale() ?? undefined,
			max: propertyTableProperty.getMax() ?? undefined,
			min: propertyTableProperty.getMin() ?? undefined,
		};
		return propertyTablePropertyDef;
	}

	private createPropertyTextureDef(context: WriterContext, propertyTexture: PropertyTexture): PropertyTextureDef {
		let propertyDefs: { [key: string]: PropertyTexturePropertyDef } | undefined;
		const propertyKeys = propertyTexture.listPropertyKeys();
		if (propertyKeys.length > 0) {
			propertyDefs = {};
			for (const propertyKey of propertyKeys) {
				const propertyTextureProperty = propertyTexture.getProperty(propertyKey);
				if (propertyTextureProperty) {
					const propertyTexturePropertyDef = this.createPropertyTexturePropertyDef(
						context,
						propertyKey,
						propertyTextureProperty,
					);
					propertyDefs[propertyKey] = propertyTexturePropertyDef;
				}
			}
		}

		const propertyTextureDef: PropertyTextureDef = {
			name: propertyTexture.getObjectName() ?? undefined,
			class: propertyTexture.getClass(),
			properties: propertyDefs,
		};
		return propertyTextureDef;
	}

	private createPropertyTexturePropertyDef(
		context: WriterContext,
		propertyName: string,
		propertyTextureProperty: PropertyTextureProperty,
	) {
		const texture = propertyTextureProperty.getTexture();
		const textureInfo = propertyTextureProperty.getTextureInfo();
		if (!texture) {
			throw new Error(`${NAME}: No texture for property texture property ${propertyName}`);
		}
		if (!textureInfo) {
			throw new Error(`${NAME}: No textureInfo for property texture property ${propertyName}`);
		}
		const basicTextureDef = context.createTextureInfoDef(texture, textureInfo);
		const channels = propertyTextureProperty.getChannels();
		const propertyTexturePropertyDef: PropertyTexturePropertyDef = {
			channels: MathUtils.eq(channels, [0]) ? undefined : channels,
			index: basicTextureDef.index,
			texCoord: basicTextureDef.texCoord,
			offset: propertyTextureProperty.getOffset() ?? undefined,
			scale: propertyTextureProperty.getScale() ?? undefined,
			max: propertyTextureProperty.getMax() ?? undefined,
			min: propertyTextureProperty.getMin() ?? undefined,
		};
		return propertyTexturePropertyDef;
	}

	private createPropertyAttributeDef(propertyAttribute: PropertyAttribute): PropertyAttributeDef {
		let propertyDefs: { [key: string]: PropertyAttributePropertyDef } | undefined;
		const propertyKeys = propertyAttribute.listPropertyKeys();
		if (propertyKeys.length > 0) {
			propertyDefs = {};
			for (const propertyKey of propertyKeys) {
				const propertyAttributeProperty = propertyAttribute.getProperty(propertyKey);
				if (propertyAttributeProperty) {
					const propertyAttributePropertyDef =
						this.createPropertyAttributePropertyDef(propertyAttributeProperty);
					propertyDefs[propertyKey] = propertyAttributePropertyDef;
				}
			}
		}

		const propertyAttributeDef: PropertyAttributeDef = {
			name: propertyAttribute.getObjectName() ?? undefined,
			class: propertyAttribute.getClass(),
			properties: propertyDefs,
		};
		return propertyAttributeDef;
	}

	private createPropertyAttributePropertyDef(propertyAttributeProperty: PropertyAttributeProperty) {
		const propertyAttributePropertyDef: PropertyAttributePropertyDef = {
			attribute: propertyAttributeProperty.getAttribute(),
			offset: propertyAttributeProperty.getOffset() ?? undefined,
			scale: propertyAttributeProperty.getScale() ?? undefined,
			max: propertyAttributeProperty.getMax() ?? undefined,
			min: propertyAttributeProperty.getMin() ?? undefined,
		};
		return propertyAttributePropertyDef;
	}

	/**
	 * Perform the operations that are required before writing
	 * a glTF document when it contains this extension.
	 *
	 * This extension defines `prewriteTypes = [PropertyType.BUFFER];`
	 * to prepare the buffer data that contains the buffer view data
	 * that otherwise is not referenced (because property tables are
	 * directly referring to buffer views, and not via accessors)
	 */
	public override prewrite(context: WriterContext, propertyType: PropertyType): this {
		if (propertyType === PropertyType.BUFFER) {
			this._prewriteBuffers(context);
		}
		return this;
	}

	/**
	 * Prepares writing a document that contains this extension.
	 *
	 * This will collect all buffer views that are referred to by the
	 * property tables, and store them as "otherBufferViews" of
	 * the writer context (for the main buffer), to make sure
	 * that they are part of the buffer when it is eventually
	 * written in Writer.ts.
	 *
	 * @param context - The writer context
	 * @returns The deep void of space
	 */
	private _prewriteBuffers(context: WriterContext): void {
		const root = this.document.getRoot();
		const structuralMetadata = root.getExtension<StructuralMetadata>(NAME);
		if (!structuralMetadata) {
			return;
		}

		const jsonDoc = context.jsonDoc;
		const gltfDef = jsonDoc.json;
		let bufferViewDefs = gltfDef.bufferViews;
		if (!bufferViewDefs) {
			bufferViewDefs = [];
			gltfDef.bufferViews = bufferViewDefs;
		}

		const propertyTables = structuralMetadata.listPropertyTables();
		for (const propertyTable of propertyTables) {
			const propertyValues = propertyTable.listPropertyValues();
			for (const propertyValue of propertyValues) {
				const otherBufferViews = this.obtainOtherBufferViews(context);
				const values = propertyValue.getValues();
				otherBufferViews.push(values);

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

	/**
	 * Obtain the "otherBufferViews" for the main buffer from the given
	 * context, creating them if they did not exist yet.
	 *
	 * @param context - The writer context
	 * @returns The other buffer views
	 */
	private obtainOtherBufferViews(context: WriterContext): Uint8Array[] {
		const root = this.document.getRoot();
		const buffer = root.listBuffers()[0];
		let otherBufferViews: Uint8Array[] | undefined = context.otherBufferViews.get(buffer);
		if (!otherBufferViews) {
			otherBufferViews = [];
			context.otherBufferViews.set(buffer, otherBufferViews);
		}
		return otherBufferViews;
	}
}
