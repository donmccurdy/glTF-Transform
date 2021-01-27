import { Graph } from '../graph';
import { Accessor } from './accessor';
import { Primitive } from './primitive';
import { Property } from './property';
import { AttributeLink, IndexLink } from './property-links';

/** @hidden */
export class PropertyGraph extends Graph<Property> {
	public linkAttribute(name: string, a: Property, b: null): null;
	public linkAttribute(name: string, a: Property, b: Accessor): AttributeLink;
	public linkAttribute(name: string, a: Property, b: Accessor | null): AttributeLink | null;
	public linkAttribute(name: string, a: Property, b: Accessor | null): AttributeLink | null {
		if (!b) return null;
		const link = new AttributeLink(name, a, b);
		this.registerLink(link);
		return link;
	}

	public linkIndex(name: string, a: Primitive, b: null): null;
	public linkIndex(name: string, a: Primitive, b: Accessor): IndexLink;
	public linkIndex(name: string, a: Primitive, b: Accessor | null): IndexLink | null;
	public linkIndex(name: string, a: Primitive, b: Accessor | null): IndexLink | null {
		if (!b) return null;
		const link = new IndexLink(name, a, b);
		this.registerLink(link);
		return link;
	}
}
