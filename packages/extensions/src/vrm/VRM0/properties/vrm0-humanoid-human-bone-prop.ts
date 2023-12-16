import { PropertyType as VRMPropertyType } from "../../constants.js";
import { HumanoidHumanBoneProp } from "../../humanoid-human-bone-prop.js";

export default class VRM0HumanoidHumanBoneProp extends HumanoidHumanBoneProp {
  protected init(): void {
    this.propertyType = VRMPropertyType.HUMANOID_HUMAN_BONE;
  }
}
