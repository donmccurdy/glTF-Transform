import { Texture, TextureInfo } from "./texture";

import { Accessor } from "./accessor";
import { Link } from "../graph/index";
import { Material } from "./material";
import { Primitive } from "./mesh";

export class TextureLink extends Link<Material, Texture> {
    public textureInfo = new TextureInfo();
}

export class AttributeLink extends Link<Primitive, Accessor> {
    public semantic = '';
}
