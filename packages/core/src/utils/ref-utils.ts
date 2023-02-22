import { GraphEdge } from 'property-graph';
import { isPlainObject } from './is-plain-object.js';

export function isRefList(value: unknown): boolean {
	return Array.isArray(value) && value[0] instanceof GraphEdge;
}

export function isRefMap(value: unknown): boolean {
	return isPlainObject(value) && Object.values(value as object)[0] instanceof GraphEdge;
}
