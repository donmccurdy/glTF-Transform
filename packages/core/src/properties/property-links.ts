import { Link } from '../graph';
import { Accessor } from './accessor';
import { Primitive } from './primitive';
import { PrimitiveTarget } from './primitive-target';

/** @hidden */
export class AttributeLink extends Link<Primitive|PrimitiveTarget, Accessor> {
	public semantic = '';
	public copy (other: this): this {
		this.semantic = other.semantic;
		return this;
	}
}

/** @hidden */
export class IndexLink extends Link<Primitive, Accessor> {
	public copy (other: this): this { return this; }
}
