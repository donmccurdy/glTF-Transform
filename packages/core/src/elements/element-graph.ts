import { AttributeLink, TextureLink } from "./element-links";

import { Accessor } from "./accessor";
import { Graph } from "../graph/index";
import { Material } from "./material";
import { Primitive } from "./mesh";
import { Texture } from "./texture";

export class ElementGraph extends Graph {
    public linkTexture(a: Material, b: Texture): TextureLink {
        const link = new TextureLink(a, b);
        this.registerLink(link);
        return link;
    }

    public linkAttribute(a: Primitive, b: Accessor): AttributeLink {
        const link = new AttributeLink(a, b);
        this.registerLink(link);
        return link;
    }
}
