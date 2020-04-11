import { GraphChild, Link } from "../graph/index";

import { Buffer } from "./buffer";
import { Element } from "./element";

export class BufferView extends Element {
    @GraphChild private buffer: Link<BufferView, Buffer> = null;
    public getBuffer(): Buffer { return this.buffer.getRight(); }
    public setBuffer(buffer: Buffer): BufferView {
        this.buffer = this.graph.link(this, buffer) as Link<BufferView, Buffer>;
        return this;
    }
}
