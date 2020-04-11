import { GraphChild, Link } from "../graph/index";
import { Buffer } from "./buffer";
import { Element } from "./element";

// TODO(donmccurdy): Buffer Views feel... pretty pointless as an edit-stage concept.
// Accessors need to be organized by purpose, which is mental load that I don't expect
// users to want. That and interleaving could be done at export/packing stage. We do
// care what Buffer things end up in, but that doesn't require the intermediate step.
// Images point at BufferViews, do we really care about splitting them into specific
// buffers? At that point you should be exporting them alone.
//
// This does move complexity from the transform stage to the packing stage. Which could
// be a good or a bad thing.
export class BufferView extends Element {
    @GraphChild private buffer: Link<BufferView, Buffer> = null;
    public getBuffer(): Buffer { return this.buffer.getRight(); }
    public setBuffer(buffer: Buffer): BufferView {
        this.buffer = this.graph.link(this, buffer) as Link<BufferView, Buffer>;
        return this;
    }
}
