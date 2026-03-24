import {
	ExtensionProperty,
	type IProperty,
	PropertyType,
	RefList,
	RefMap,
	type Texture,
	TextureInfo,
} from '@gltf-transform/core';
import { EXT_STRUCTURAL_METADATA } from '../constants.js';
import type {
	ClassPropertyComponentType,
	ClassPropertyType,
	EnumValueType,
	PropertyTablePropertyOffsetType,
} from './structural-metadata.js';

// NOTE: The structures that are defined in the EXT_structural_metadata
// often have a "name" property. This conflicts with the "name" property
// of the "IProperty". So the "name" is referred to as "objectName" here.

interface IStructuralMetadata extends IProperty {
	schema: Schema;
	schemaUri: string | null;
	propertyTables: RefList<PropertyTable>;
	propertyTextures: RefList<PropertyTexture>;
	propertyAttributes: RefList<PropertyAttribute>;
}
interface ISchema extends IProperty {
	id: string;
	objectName: string | null;
	description: string | null;
	version: string | null;
	classes: RefMap<Class>;
	enums: RefMap<Enum>;
}
interface IClass extends IProperty {
	objectName: string | null;
	description: string | null;
	properties: RefMap<ClassProperty>;
}

/* Not supported by glTF-Transform...
type NumericValue = number | number[] | number[][];
type NoDataValue = number | string | number[] | string[] | number[][];
type AnyValue =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | boolean[]
  | number[][];
*/

interface IClassProperty extends IProperty {
	objectName: string | null;
	description: string | null;
	type: ClassPropertyType;
	componentType: ClassPropertyComponentType | null;
	enumType: string | null;
	array: boolean;
	count: number | null;
	normalized: boolean;
	offset: any;
	scale: any;
	max: any;
	min: any;
	required: boolean;
	noData: any;
	default: any;
}

interface IEnum extends IProperty {
	objectName: string | null;
	description: string | null;
	valueType: EnumValueType;
	values: RefList<EnumValue>;
}

interface IEnumValue extends IProperty {
	objectName: string;
	description: string | null;
	value: number;
}

interface IPropertyTable extends IProperty {
	objectName: string | null;
	class: string;
	count: number;
	properties: RefMap<PropertyTableProperty>;
}

interface IPropertyTableProperty extends IProperty {
	values: Uint8Array;
	arrayOffsets: Uint8Array;
	stringOffsets: Uint8Array;
	arrayOffsetType: PropertyTablePropertyOffsetType;
	stringOffsetType: PropertyTablePropertyOffsetType;
	offset: any;
	scale: any;
	max: any;
	min: any;
}

interface IPropertyTexture extends IProperty {
	objectName: string | null;
	class: string;
	properties: RefMap<PropertyTextureProperty>;
}

interface IPropertyTextureProperty extends IProperty {
	channels: number[];
	offset: any;
	scale: any;
	max: any;
	min: any;
	texture: Texture;
	textureInfo: TextureInfo;
}

interface IPropertyAttribute extends IProperty {
	objectName: string | null;
	class: string;
	properties: RefMap<PropertyAttributeProperty>;
}

interface IPropertyAttributeProperty extends IProperty {
	attribute: string;
	offset: any;
	scale: any;
	max: any;
	min: any;
}

// This corresponds to the EXT_structural_metadata.schema.json
// schema, which is structural metadata that can be applied
// to all glTF elements, and is only constrainted to 'nodes' in
// the specification text for now
interface IElementStructuralMetadata extends IProperty {
	propertyTable: PropertyTable;
	index: number | null;
}

// This corresponds to the mesh.primitive.EXT_structural_metadata.schema.json
// schema
interface IMeshPrimitiveStructuralMetadata extends IProperty {
	propertyTextures: RefList<PropertyTexture>;
	propertyAttributes: RefList<PropertyAttribute>;
}

//============================================================================

//============================================================================
// The actual model classes
// (See `MeshFeatures` for details about the concepts)
//

/**
 * Main model class for `EXT_structural_metadata`
 *
 * @internal
 */
export class StructuralMetadata extends ExtensionProperty<IStructuralMetadata> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'StructuralMetadata';
	public declare parentTypes: [PropertyType.ROOT];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'StructuralMetadata';
		this.parentTypes = [PropertyType.ROOT];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			schema: null,
			schemaUri: null,
			propertyTables: new RefList<PropertyTable>(),
			propertyTextures: new RefList<PropertyTexture>(),
			propertyAttributes: new RefList<PropertyAttribute>(),
		});
	}

	getSchema(): Schema | null {
		return this.getRef('schema');
	}
	setSchema(schema: Schema | null) {
		return this.setRef('schema', schema);
	}

	getSchemaUri(): string | null {
		return this.get('schemaUri');
	}
	setSchemaUri(schemaUri: string | null) {
		return this.set('schemaUri', schemaUri);
	}

	listPropertyTables(): PropertyTable[] {
		return this.listRefs('propertyTables');
	}
	addPropertyTable(propertyTable: PropertyTable) {
		return this.addRef('propertyTables', propertyTable);
	}
	removePropertyTable(propertyTable: PropertyTable) {
		return this.removeRef('propertyTables', propertyTable);
	}

	listPropertyTextures(): PropertyTexture[] {
		return this.listRefs('propertyTextures');
	}
	addPropertyTexture(propertyTexture: PropertyTexture) {
		return this.addRef('propertyTextures', propertyTexture);
	}
	removePropertyTexture(propertyTexture: PropertyTexture) {
		return this.removeRef('propertyTextures', propertyTexture);
	}

	listPropertyAttributes(): PropertyAttribute[] {
		return this.listRefs('propertyAttributes');
	}
	addPropertyAttribute(propertyAttribute: PropertyAttribute) {
		return this.addRef('propertyAttributes', propertyAttribute);
	}
	removePropertyAttribute(propertyAttribute: PropertyAttribute) {
		return this.removeRef('propertyAttributes', propertyAttribute);
	}
}

/**
 * Implementation of a metadata schema for `EXT_structural_metadata`
 *
 * @internal
 */
export class Schema extends ExtensionProperty<ISchema> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'Schema';
	public declare parentTypes: ['StructuralMetadata'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'Schema';
		this.parentTypes = ['StructuralMetadata'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			description: null,
			version: null,
			classes: new RefMap<Class>(),
			enums: new RefMap<Enum>(),
		});
	}

	getId(): string {
		return this.get('id');
	}
	setId(name: string) {
		return this.set('id', name);
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getDescription(): string | null {
		return this.get('description');
	}
	setDescription(description: string | null) {
		return this.set('description', description);
	}

	getVersion(): string | null {
		return this.get('version');
	}
	setVersion(version: string | null) {
		return this.set('version', version);
	}

	setClass(key: string, value: Class | null): this {
		return this.setRefMap('classes', key, value);
	}
	getClass(key: string): Class | null {
		return this.getRefMap('classes', key);
	}
	listClassKeys(): string[] {
		return this.listRefMapKeys('classes');
	}
	listClassValues(): Class[] {
		return this.listRefMapValues('classes');
	}

	setEnum(key: string, value: Enum | null): this {
		return this.setRefMap('enums', key, value);
	}
	getEnum(key: string): Enum | null {
		return this.getRefMap('enums', key);
	}
	listEnumKeys(): string[] {
		return this.listRefMapKeys('enums');
	}
	listEnumValues(): Enum[] {
		return this.listRefMapValues('enums');
	}
}

/**
 * Implementation of a metadata class for `EXT_structural_metadata`
 *
 * @internal
 */
export class Class extends ExtensionProperty<IClass> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'Class';
	public declare parentTypes: ['Schema'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'Class';
		this.parentTypes = ['Schema'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			description: null,
			properties: new RefMap<ClassProperty>(),
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getDescription(): string | null {
		return this.get('description');
	}
	setDescription(description: string | null) {
		return this.set('description', description);
	}

	setProperty(key: string, value: ClassProperty | null): this {
		return this.setRefMap('properties', key, value);
	}
	getProperty(key: string): ClassProperty | null {
		return this.getRefMap('properties', key);
	}
	listPropertyKeys(): string[] {
		return this.listRefMapKeys('properties');
	}
	listPropertyValues(): ClassProperty[] {
		return this.listRefMapValues('properties');
	}
}

/**
 * Implementation of a metadata class property for `EXT_structural_metadata`
 *
 * @internal
 */
export class ClassProperty extends ExtensionProperty<IClassProperty> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'ClassProperty';
	public declare parentTypes: ['Class'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'ClassProperty';
		this.parentTypes = ['Class'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			description: null,
			componentType: null,
			enumType: null,
			array: null,
			count: null,
			normalized: null,
			offset: null,
			scale: null,
			max: null,
			min: null,
			required: null,
			noData: null,
			default: null,
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getDescription(): string | null {
		return this.get('description');
	}
	setDescription(description: string | null) {
		return this.set('description', description);
	}

	getType(): ClassPropertyType {
		return this.get('type');
	}
	setType(type: ClassPropertyType) {
		return this.set('type', type);
	}

	getComponentType(): ClassPropertyComponentType | null {
		return this.get('componentType');
	}
	setComponentType(componentType: ClassPropertyComponentType | null) {
		return this.set('componentType', componentType);
	}

	getEnumType(): string | null {
		return this.get('enumType');
	}
	setEnumType(enumType: string | null) {
		return this.set('enumType', enumType);
	}

	getArray(): boolean {
		return this.get('array');
	}
	setArray(array: boolean) {
		return this.set('array', array);
	}

	getCount(): number | null {
		return this.get('count');
	}
	setCount(count: number | null) {
		return this.set('count', count);
	}

	getNormalized(): boolean {
		return this.get('normalized');
	}
	setNormalized(normalized: boolean) {
		return this.set('normalized', normalized);
	}

	getOffset(): any {
		return this.get('offset');
	}
	setOffset(offset: any) {
		return this.set('offset', offset);
	}

	getScale(): any {
		return this.get('scale');
	}
	setScale(scale: any) {
		return this.set('scale', scale);
	}

	getMax(): any {
		return this.get('max');
	}
	setMax(max: any) {
		return this.set('max', max);
	}

	getMin(): any {
		return this.get('min');
	}
	setMin(min: any) {
		return this.set('min', min);
	}

	getRequired(): boolean {
		return this.get('required');
	}
	setRequired(required: boolean) {
		return this.set('required', required);
	}

	getNoData(): any {
		return this.get('noData');
	}
	setNoData(noData: any) {
		return this.set('noData', noData);
	}

	getDefault(): any {
		return this.get('default');
	}
	setDefault(defaultValue: any) {
		return this.set('default', defaultValue);
	}
}

/**
 * Implementation of a metadata enum for `EXT_structural_metadata`
 *
 * @internal
 */
export class Enum extends ExtensionProperty<IEnum> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'Enum';
	public declare parentTypes: ['Schema'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'Enum';
		this.parentTypes = ['Schema'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			description: null,
			valueType: 'UINT16',
			values: [],
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getDescription(): string | null {
		return this.get('description');
	}
	setDescription(description: string | null) {
		return this.set('description', description);
	}

	getValueType(): EnumValueType {
		return this.get('valueType');
	}
	setValueType(valueType: EnumValueType) {
		return this.set('valueType', valueType);
	}

	listValues(): EnumValue[] {
		return this.listRefs('values');
	}
	addEnumValue(enumValue: EnumValue) {
		return this.addRef('values', enumValue);
	}
	removeEnumValue(enumValue: EnumValue) {
		return this.removeRef('values', enumValue);
	}
}

/**
 * Implementation of a metadata enum value for `EXT_structural_metadata`
 *
 * @internal
 */
export class EnumValue extends ExtensionProperty<IEnumValue> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'EnumValue';
	public declare parentTypes: ['Enum'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'EnumValue';
		this.parentTypes = ['Enum'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			description: null,
		});
	}

	getObjectName(): string {
		return this.get('objectName');
	}
	setObjectName(name: string) {
		return this.set('objectName', name);
	}

	getDescription(): string | null {
		return this.get('description');
	}
	setDescription(description: string | null) {
		return this.set('description', description);
	}

	getValue(): number {
		return this.get('value');
	}
	setValue(value: number) {
		return this.set('value', value);
	}
}

/**
 * Implementation of a property table for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyTable extends ExtensionProperty<IPropertyTable> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyTable';
	public declare parentTypes: ['StructuralMetadata'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyTable';
		this.parentTypes = ['StructuralMetadata'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			properties: new RefMap<ClassProperty>(),
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getClass(): string {
		return this.get('class');
	}
	setClass(className: string) {
		return this.set('class', className);
	}

	getCount(): number {
		return this.get('count');
	}
	setCount(count: number) {
		return this.set('count', count);
	}

	setProperty(key: string, value: PropertyTableProperty | null): this {
		return this.setRefMap('properties', key, value);
	}
	getProperty(key: string): PropertyTableProperty | null {
		return this.getRefMap('properties', key);
	}
	listPropertyKeys(): string[] {
		return this.listRefMapKeys('properties');
	}
	listPropertyValues(): PropertyTableProperty[] {
		return this.listRefMapValues('properties');
	}
}

/**
 * Implementation of a property table property for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyTableProperty extends ExtensionProperty<IPropertyTableProperty> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyTableProperty';
	public declare parentTypes: ['PropertyTable'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyTableProperty';
		this.parentTypes = ['PropertyTable'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			arrayOffsets: null,
			stringOffsets: null,
			arrayOffsetType: null,
			stringOffsetType: null,
			offset: null,
			scale: null,
			max: null,
			min: null,
		});
	}

	getValues(): Uint8Array {
		return this.get('values');
	}
	setValues(values: Uint8Array) {
		return this.set('values', values);
	}

	getArrayOffsets(): Uint8Array | null {
		return this.get('arrayOffsets');
	}
	setArrayOffsets(arrayOffsets: Uint8Array) {
		return this.set('arrayOffsets', arrayOffsets);
	}

	getStringOffsets(): Uint8Array | null {
		return this.get('stringOffsets');
	}
	setStringOffsets(stringOffsets: Uint8Array) {
		return this.set('stringOffsets', stringOffsets);
	}

	getArrayOffsetType(): PropertyTablePropertyOffsetType {
		return this.get('arrayOffsetType');
	}
	setArrayOffsetType(arrayOffsetType: PropertyTablePropertyOffsetType) {
		return this.set('arrayOffsetType', arrayOffsetType);
	}

	getStringOffsetType(): PropertyTablePropertyOffsetType {
		return this.get('stringOffsetType');
	}
	setStringOffsetType(stringOffsetType: PropertyTablePropertyOffsetType) {
		return this.set('stringOffsetType', stringOffsetType);
	}

	getOffset(): any {
		return this.get('offset');
	}
	setOffset(offset: any) {
		return this.set('offset', offset);
	}

	getScale(): any {
		return this.get('scale');
	}
	setScale(scale: any) {
		return this.set('scale', scale);
	}

	getMax(): any {
		return this.get('max');
	}
	setMax(max: any) {
		return this.set('max', max);
	}

	getMin(): any {
		return this.get('min');
	}
	setMin(min: any) {
		return this.set('min', min);
	}
}

/**
 * Implementation of a property texture for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyTexture extends ExtensionProperty<IPropertyTexture> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyTexture';
	public declare parentTypes: ['StructuralMetadata'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyTexture';
		this.parentTypes = ['StructuralMetadata'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			properties: new RefMap<PropertyTextureProperty>(),
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getClass(): string {
		return this.get('class');
	}
	setClass(_class: string) {
		return this.set('class', _class);
	}

	setProperty(key: string, value: PropertyTextureProperty | null): this {
		return this.setRefMap('properties', key, value);
	}
	getProperty(key: string): PropertyTextureProperty | null {
		return this.getRefMap('properties', key);
	}
	listPropertyKeys(): string[] {
		return this.listRefMapKeys('properties');
	}
	listPropertyValues(): PropertyTextureProperty[] {
		return this.listRefMapValues('properties');
	}
}

/**
 * Implementation of a property texture property for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyTextureProperty extends ExtensionProperty<IPropertyTextureProperty> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyTextureProperty';
	public declare parentTypes: ['PropertyTexture'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyTextureProperty';
		this.parentTypes = ['PropertyTexture'];
	}

	protected override getDefaults() {
		const defaultTextureInfo = new TextureInfo(this.graph, 'textureInfo');
		defaultTextureInfo.setMinFilter(TextureInfo.MagFilter.NEAREST);
		defaultTextureInfo.setMagFilter(TextureInfo.MagFilter.NEAREST);
		return Object.assign(super.getDefaults(), {
			channels: [0],
			texture: null,
			textureInfo: defaultTextureInfo,
			offset: null,
			scale: null,
			max: null,
			min: null,
		});
	}

	getChannels(): number[] {
		return this.get('channels');
	}
	setChannels(channels: number[]) {
		return this.set('channels', channels);
	}

	getTexture(): Texture | null {
		return this.getRef('texture');
	}
	setTexture(texture: Texture | null) {
		return this.setRef('texture', texture);
	}

	getTextureInfo(): TextureInfo | null {
		return this.getRef('texture') ? this.getRef('textureInfo') : null;
	}

	getOffset(): any {
		return this.get('offset');
	}
	setOffset(offset: any) {
		return this.set('offset', offset);
	}

	getScale(): any {
		return this.get('scale');
	}
	setScale(scale: any) {
		return this.set('scale', scale);
	}

	getMax(): any {
		return this.get('max');
	}
	setMax(max: any) {
		return this.set('max', max);
	}

	getMin(): any {
		return this.get('min');
	}
	setMin(min: any) {
		return this.set('min', min);
	}
}

/**
 * Implementation of a property attribute for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyAttribute extends ExtensionProperty<IPropertyAttribute> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyAttribute';
	public declare parentTypes: ['StructuralMetadata'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyAttribute';
		this.parentTypes = ['StructuralMetadata'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			objectName: null,
			properties: new RefMap<PropertyAttributeProperty>(),
		});
	}

	getObjectName(): string | null {
		return this.get('objectName');
	}
	setObjectName(name: string | null) {
		return this.set('objectName', name);
	}

	getClass(): string {
		return this.get('class');
	}
	setClass(_class: string) {
		return this.set('class', _class);
	}

	setProperty(key: string, value: PropertyAttributeProperty | null): this {
		return this.setRefMap('properties', key, value);
	}
	getProperty(key: string): PropertyAttributeProperty | null {
		return this.getRefMap('properties', key);
	}
	listPropertyKeys(): string[] {
		return this.listRefMapKeys('properties');
	}
	listPropertyValues(): PropertyAttributeProperty[] {
		return this.listRefMapValues('properties');
	}
}

/**
 * Implementation of a property attribute property for `EXT_structural_metadata`
 *
 * @internal
 */
export class PropertyAttributeProperty extends ExtensionProperty<IPropertyAttributeProperty> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'PropertyAttributeProperty';
	public declare parentTypes: ['PropertyAttribute'];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'PropertyAttributeProperty';
		this.parentTypes = ['PropertyAttribute'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			offset: null,
			scale: null,
			max: null,
			min: null,
		});
	}

	getAttribute(): string {
		return this.get('attribute');
	}
	setAttribute(attribute: string) {
		return this.set('attribute', attribute);
	}

	getOffset(): any {
		return this.get('offset');
	}
	setOffset(offset: any) {
		return this.set('offset', offset);
	}

	getScale(): any {
		return this.get('scale');
	}
	setScale(scale: any) {
		return this.set('scale', scale);
	}

	getMax(): any {
		return this.get('max');
	}
	setMax(max: any) {
		return this.set('max', max);
	}

	getMin(): any {
		return this.get('min');
	}
	setMin(min: any) {
		return this.set('min', min);
	}
}

/**
 * Implementation of a metadata entity for `EXT_structural_metadata`
 *
 * @internal
 */
export class ElementStructuralMetadata extends ExtensionProperty<IElementStructuralMetadata> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'ElementStructuralMetadata';
	public declare parentTypes: [PropertyType.NODE];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'ElementStructuralMetadata';
		this.parentTypes = [PropertyType.NODE];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {});
	}

	getPropertyTable(): PropertyTable | null {
		return this.getRef('propertyTable');
	}
	setPropertyTable(propertyTable: PropertyTable | null) {
		return this.setRef('propertyTable', propertyTable);
	}

	getIndex(): number | null {
		return this.get('index');
	}
	setIndex(index: number | null) {
		return this.set('index', index);
	}
}

/**
 * Implementation of a structural metadata in a mesh primitive `EXT_structural_metadata`
 *
 * @internal
 */
export class MeshPrimitiveStructuralMetadata extends ExtensionProperty<IMeshPrimitiveStructuralMetadata> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'MeshPrimitiveStructuralMetadata';
	public declare parentTypes: [PropertyType.PRIMITIVE];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'MeshPrimitiveStructuralMetadata';
		this.parentTypes = [PropertyType.PRIMITIVE];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			propertyTextures: [],
			propertyAttributes: [],
		});
	}

	listPropertyTextures(): PropertyTexture[] {
		return this.listRefs('propertyTextures');
	}
	addPropertyTexture(propertyTexture: PropertyTexture) {
		return this.addRef('propertyTextures', propertyTexture);
	}
	removePropertyTexture(propertyTexture: PropertyTexture) {
		return this.removeRef('propertyTextures', propertyTexture);
	}

	listPropertyAttributes(): PropertyAttribute[] {
		return this.listRefs('propertyAttributes');
	}
	addPropertyAttribute(propertyAttribute: PropertyAttribute) {
		return this.addRef('propertyAttributes', propertyAttribute);
	}
	removePropertyAttribute(propertyAttribute: PropertyAttribute) {
		return this.removeRef('propertyAttributes', propertyAttribute);
	}
}
