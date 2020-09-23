import { Graph } from '../graph';
import { Accessor } from './accessor';
import { Primitive } from './primitive';
import { PrimitiveTarget } from './primitive-target';
import { AttributeLink, IndexLink } from './property-links';

/** @hidden */
export class PropertyGraph extends Graph {
	public linkAttribute(name: string, a: Primitive|PrimitiveTarget, b: Accessor): AttributeLink {
		if (!b) return null;
		const link = new AttributeLink(name, a, b);
		this.registerLink(link);
		return link;
	}

	public linkIndex(name: string, a: Primitive, b: Accessor): IndexLink {
		if (!b) return null;
		const link = new IndexLink(name, a, b);
		this.registerLink(link);
		return link;
	}
}
