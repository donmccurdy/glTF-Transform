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
} from './types.js';

/******************************************************************************
 * Interfaces.
 */

interface IStructuralMetadata extends IProperty {
	schema: Schema;
	schemaUri: string;
	propertyTables: RefList<PropertyTable>;
	propertyTextures: RefList<PropertyTexture>;
	propertyAttributes: RefList<PropertyAttribute>;
}

interface ISchema extends IProperty {
	id: string;
	description: string;
	version: string;
	classes: RefMap<Class>;
	enums: RefMap<Enum>;
}

interface IClass extends IProperty {
	description: string;
	properties: RefMap<ClassProperty>;
}

interface IClassProperty extends IProperty {
	description: string;
	type: ClassPropertyType;
	componentType: ClassPropertyComponentType | null;
	enumType: string | null;
	array: boolean;
	count: number | null;
	normalized: boolean;
	offset: number | number[] | number[][];
	scale: number | number[] | number[][];
	max: number | number[] | number[][];
	min: number | number[] | number[][];
	required: boolean;
	noData: number | string | number[] | string[] | number[][];
	default: boolean | boolean[] | string | string[] | number | number[] | number[][];
}

interface IEnum extends IProperty {
	description: string;
	valueType: EnumValueType;
	values: RefList<EnumValue>;
}

interface IEnumValue extends IProperty {
	description: string;
	value: number;
}

interface IPropertyTable extends IProperty {
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
	offset: number | number[] | number[][];
	scale: number | number[] | number[][];
	max: number | number[] | number[][];
	min: number | number[] | number[][];
}

interface IPropertyTexture extends IProperty {
	class: string;
	properties: RefMap<PropertyTextureProperty>;
}

interface IPropertyTextureProperty extends IProperty {
	channels: number[];
	offset: number | number[] | number[][];
	scale: number | number[] | number[][];
	max: number | number[] | number[][];
	min: number | number[] | number[][];
	texture: Texture;
	textureInfo: TextureInfo;
}

interface IPropertyAttribute extends IProperty {
	class: string;
	properties: RefMap<PropertyAttributeProperty>;
}

interface IPropertyAttributeProperty extends IProperty {
	attribute: string;
	offset: number | number[] | number[][];
	scale: number | number[] | number[][];
	max: number | number[] | number[][];
	min: number | number[] | number[][];
}

// Reference: EXT_structural_metadata.schema.json
interface INodeStructuralMetadata extends IProperty {
	class: string;
	properties: Record<string, unknown>;
}

// Reference: mesh.primitive.EXT_structural_metadata.schema.json
interface IMeshPrimitiveStructuralMetadata extends IProperty {
	propertyTextures: RefList<PropertyTexture>;
	propertyAttributes: RefList<PropertyAttribute>;
}

/******************************************************************************
 * Extension Properties.
 */

/**
 * Stores top-level metadata. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			schemaUri: '',
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

	getSchemaUri(): string {
		return this.get('schemaUri');
	}
	setSchemaUri(schemaUri: string) {
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
 * Defines a chema within {@link StructuralMetadata}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			description: '',
			version: '',
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

	getDescription(): string {
		return this.get('description');
	}
	setDescription(description: string) {
		return this.set('description', description);
	}

	getVersion(): string {
		return this.get('version');
	}
	setVersion(version: string) {
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
 * Defines a metadata class within a {@link Schema}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			description: '',
			properties: new RefMap<ClassProperty>(),
		});
	}

	getDescription(): string {
		return this.get('description');
	}
	setDescription(description: string) {
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
 * Defines a metadata property within a metadata {@link Class}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			description: '',
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

	getDescription(): string {
		return this.get('description');
	}
	setDescription(description: string) {
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

	getOffset(): number | number[] | number[][] {
		return this.get('offset');
	}
	setOffset(offset: number | number[] | number[][]) {
		return this.set('offset', offset);
	}

	getScale(): number | number[] | number[][] {
		return this.get('scale');
	}
	setScale(scale: number | number[] | number[][]) {
		return this.set('scale', scale);
	}

	getMax(): number | number[] | number[][] {
		return this.get('max');
	}
	setMax(max: number | number[] | number[][]) {
		return this.set('max', max);
	}

	getMin(): number | number[] | number[][] {
		return this.get('min');
	}
	setMin(min: number | number[] | number[][]) {
		return this.set('min', min);
	}

	getRequired(): boolean {
		return this.get('required');
	}
	setRequired(required: boolean) {
		return this.set('required', required);
	}

	getNoData(): number | string | number[] | string[] | number[][] {
		return this.get('noData');
	}
	setNoData(noData: number | string | number[] | string[] | number[][]) {
		return this.set('noData', noData);
	}

	getDefault(): boolean | boolean[] | string | string[] | number | number[] | number[][] {
		return this.get('default');
	}
	setDefault(defaultValue: boolean | boolean[] | string | string[] | number | number[] | number[][]) {
		return this.set('default', defaultValue);
	}
}

/**
 * Defines an enum, as a set of {@link EnumValue EnumValues}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			description: '',
			valueType: 'UINT16',
			values: new RefList<EnumValue>(),
		});
	}

	getDescription(): string {
		return this.get('description');
	}
	setDescription(description: string) {
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
 * Defines a value of an {@link Enum}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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

	getDescription(): string {
		return this.get('description');
	}
	setDescription(description: string) {
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
 * Defines a property table within a {@link StructuralMetadata}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			properties: new RefMap<ClassProperty>(),
		});
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
 * Defines a property within a {@link PropertyTable}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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

	getOffset(): number | number[] | number[][] {
		return this.get('offset');
	}
	setOffset(offset: number | number[] | number[][]) {
		return this.set('offset', offset);
	}

	getScale(): number | number[] | number[][] {
		return this.get('scale');
	}
	setScale(scale: number | number[] | number[][]) {
		return this.set('scale', scale);
	}

	getMax(): number | number[] | number[][] {
		return this.get('max');
	}
	setMax(max: number | number[] | number[][]) {
		return this.set('max', max);
	}

	getMin(): number | number[] | number[][] {
		return this.get('min');
	}
	setMin(min: number | number[] | number[][]) {
		return this.set('min', min);
	}
}

/**
 * Defines a property {@link Texture} within a {@link StructuralMetadata}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			properties: new RefMap<PropertyTextureProperty>(),
		});
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
 * Defines a property of a {@link PropertyTexture}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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

	getOffset(): number | number[] | number[][] {
		return this.get('offset');
	}
	setOffset(offset: number | number[] | number[][]) {
		return this.set('offset', offset);
	}

	getScale(): number | number[] | number[][] {
		return this.get('scale');
	}
	setScale(scale: number | number[] | number[][]) {
		return this.set('scale', scale);
	}

	getMax(): number | number[] | number[][] {
		return this.get('max');
	}
	setMax(max: number | number[] | number[][]) {
		return this.set('max', max);
	}

	getMin(): number | number[] | number[][] {
		return this.get('min');
	}
	setMin(min: number | number[] | number[][]) {
		return this.set('min', min);
	}
}

/**
 * Defines a property attribute. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			properties: new RefMap<PropertyAttributeProperty>(),
		});
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
 * Defines a property within a {@link PropertyAttribute}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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

	getOffset(): number | number[] | number[][] {
		return this.get('offset');
	}
	setOffset(offset: number | number[] | number[][]) {
		return this.set('offset', offset);
	}

	getScale(): number | number[] | number[][] {
		return this.get('scale');
	}
	setScale(scale: number | number[] | number[][]) {
		return this.set('scale', scale);
	}

	getMax(): number | number[] | number[][] {
		return this.get('max');
	}
	setMax(max: number | number[] | number[][]) {
		return this.set('max', max);
	}

	getMin(): number | number[] | number[][] {
		return this.get('min');
	}
	setMin(min: number | number[] | number[][]) {
		return this.set('min', min);
	}
}

/**
 * Defines structural metadata associated with a {@link Node}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
 */
export class NodeStructuralMetadata extends ExtensionProperty<INodeStructuralMetadata> {
	static override EXTENSION_NAME = EXT_STRUCTURAL_METADATA;
	public declare extensionName: typeof EXT_STRUCTURAL_METADATA;
	public declare propertyType: 'NodeStructuralMetadata';
	public declare parentTypes: [PropertyType.NODE];

	protected override init(): void {
		this.extensionName = EXT_STRUCTURAL_METADATA;
		this.propertyType = 'NodeStructuralMetadata';
		this.parentTypes = [PropertyType.NODE];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), { class: '', properties: {} });
	}

	getClass(): string {
		return this.get('class');
	}
	setClass(className: string): this {
		return this.set('class', className);
	}

	getProperties(): Record<string, unknown> {
		return this.get('properties');
	}
	setProperties(properties: Record<string, unknown>): this {
		return this.set('properties', properties);
	}
}

/**
 * Defines structural metadata associated with a {@link Primitive}. See {@link EXTStructuralMetadata}.
 *
 * @experimental
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
			propertyTextures: new RefList<PropertyTexture>(),
			propertyAttributes: new RefList<PropertyAttribute>(),
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
