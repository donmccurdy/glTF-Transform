import { ExtensionProperty, IProperty, Nullable, vec2 } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants';
interface ITransform extends IProperty {
    offset: vec2;
    rotation: number;
    scale: vec2;
    texCoord: number | null;
}
/**
 * # Transform
 *
 * Defines UV transform for a {@link TextureInfo}. See {@link TextureTransform}.
 */
export declare class Transform extends ExtensionProperty<ITransform> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_TEXTURE_TRANSFORM;
    propertyType: 'Transform';
    parentTypes: [PropertyType.TEXTURE_INFO];
    protected init(): void;
    protected getDefaults(): Nullable<ITransform>;
    getOffset(): vec2;
    setOffset(offset: vec2): this;
    getRotation(): number;
    setRotation(rotation: number): this;
    getScale(): vec2;
    setScale(scale: vec2): this;
    getTexCoord(): number | null;
    setTexCoord(texCoord: number | null): this;
}
export {};
