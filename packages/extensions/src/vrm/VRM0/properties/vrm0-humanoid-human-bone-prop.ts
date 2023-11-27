import { PropertyType as VRMPropertyType } from "../../constants.ts";
import { HumanoidHumanBoneProp } from "../../humanoid-human-bone-prop.ts";

export default class VRM0HumanoidHumanBoneProp extends HumanoidHumanBoneProp {
  protected init(): void {
    this.propertyType = VRMPropertyType.HUMANOID_HUMAN_BONE;
  }
}
