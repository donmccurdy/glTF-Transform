import { Link } from '../graph';
import { Accessor } from './accessor';
import { Primitive } from './primitive';
import { Property } from './property';

/** @hidden */
export class AttributeLink extends Link<Property, Accessor> {
	public semantic = '';
	public copy (other: this): this {
		this.semantic = other.semantic;
		return this;
	}
}

/** @hidden */
export class IndexLink extends Link<Primitive, Accessor> {
	public copy (_other: this): this { return this; }
}
