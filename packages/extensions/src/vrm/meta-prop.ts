import {
  ExtensionProperty,
  IProperty,
  Nullable,
  PropertyType,
  Texture,
  TextureChannel,
  TextureInfo,
} from "@gltf-transform/core";
import { VRM0 } from "./VRM0/constants.ts";
import { VRMC_VRM } from "./VRM1/constants.ts";

const { R, G, B } = TextureChannel;

export type AvatarPermission =
  | "onlyAuthor"
  | "onlySeparatelyLicensedPerson"
  | "everyone";

export type CommercialUsage =
  | "personalNonProfit"
  | "personalProfit"
  | "corporation";

export type CreditNotation = "required" | "unnecessary";

export type Modification =
  | "prohibited"
  | "allowModification"
  | "allowModificationRedistribution";

/**
 * @see https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/meta.md
 */
interface IMetaProp extends IProperty {
  name: string;
  version: string;
  authors: string[];
  copyrightInformation: string;
  contactInformation: string;
  references: string[];
  thirdPartyLicenses: string;
  thumbnailImageTexture: Texture;
  thumbnailImageTextureInfo: TextureInfo;
  licenseUrl: string;
  avatarPermission: AvatarPermission;
  allowExcessivelyViolentUsage: boolean;
  allowExcessivelySexualUsage: boolean;
  commercialUsage: CommercialUsage;
  allowPoliticalOrReligiousUsage: boolean;
  allowAntisocialOrHateUsage: boolean;
  creditNotation: CreditNotation;
  allowRedistribution: boolean;
  modification: Modification;
  otherLicenseUrl: string;
}

const VRM0NAME = VRM0;
const VRM1NAME = VRMC_VRM;

export class MetaProp extends ExtensionProperty<IMetaProp> {
  public declare extensionName: typeof VRM0NAME | typeof VRM1NAME;
  public declare propertyType: "VRMC_vrm";
  public declare parentTypes: [PropertyType.ROOT];

  protected init(): void {
    this.extensionName = VRM1NAME;
    this.propertyType = "VRMC_vrm";
    this.parentTypes = [PropertyType.ROOT];
  }

  protected getDefaults(): Nullable<IMetaProp> {
    return Object.assign(super.getDefaults() as IProperty, {
      name: "",
      version: "",
      authors: [],
      copyrightInformation: "",
      contactInformation: "",
      references: [],
      thirdPartyLicenses: "",
      thumbnailImageTexture: null,
      thumbnailImageTextureInfo: new TextureInfo(
        this.graph,
        "thumbnailImageTextureInfo"
      ),
      licenseUrl: "",
      avatarPermission: "onlyAuthor" as AvatarPermission,
      allowExcessivelyViolentUsage: false,
      allowExcessivelySexualUsage: false,
      commercialUsage: "personalNonProfit" as CommercialUsage,
      allowPoliticalOrReligiousUsage: false,
      allowAntisocialOrHateUsage: false,
      creditNotation: "required" as CreditNotation,
      allowRedistribution: false,
      modification: "prohibited" as Modification,
      otherLicenseUrl: "",
    });
  }

  public getName(): string {
    return this.get("name");
  }
  public setName(name: string): this {
    return this.set("name", name);
  }

  public getVersion(): string {
    return this.get("version");
  }
  public setVersion(version: string): this {
    return this.set("version", version);
  }

  public getAuthors(): string[] {
    return this.get("authors");
  }
  public setAuthors(authors: string[]): this {
    return this.set("authors", authors);
  }

  public getCopyrightInformation(): string {
    return this.get("copyrightInformation");
  }
  public setCopyrightInformation(copyrightInformation: string): this {
    return this.set("copyrightInformation", copyrightInformation);
  }

  public getContactInformation(): string {
    return this.get("contactInformation");
  }
  public setContactInformation(contactInformation: string): this {
    return this.set("contactInformation", contactInformation);
  }

  public getReferences(): string[] {
    return this.get("references");
  }
  public setReferences(references: string[]): this {
    return this.set("references", references);
  }

  public getThirdPartyLicenses(): string {
    return this.get("thirdPartyLicenses");
  }
  public setThirdPartyLicenses(thirdPartyLicenses: string): this {
    return this.set("thirdPartyLicenses", thirdPartyLicenses);
  }

  public getThumbnailImageTexture(): Texture | null {
    return this.getRef("thumbnailImageTexture");
  }
  public setThumbnailImageTexture(texture: Texture | null): this {
    return this.setRef("thumbnailImageTexture", texture, {
      channels: R | G | B,
    });
  }
  public getThumbnailImageTextureInfo(): TextureInfo | null {
    return this.getRef("thumbnailImageTexture")
      ? this.getRef("thumbnailImageTextureInfo")
      : null;
  }

  public getLicenseUrl(): string {
    return this.get("licenseUrl");
  }
  public setLicenseUrl(licenseUrl: string): this {
    return this.set("licenseUrl", licenseUrl);
  }

  public getAvatarPermission(): AvatarPermission {
    return this.get("avatarPermission");
  }
  public setAvatarPermission(avatarPermission: AvatarPermission): this {
    return this.set("avatarPermission", avatarPermission);
  }

  public getAllowExcessivelyViolentUsage(): boolean {
    return this.get("allowExcessivelyViolentUsage");
  }
  public setAllowExcessivelyViolentUsage(
    allowExcessivelyViolentUsage: boolean
  ): this {
    return this.set(
      "allowExcessivelyViolentUsage",
      allowExcessivelyViolentUsage
    );
  }

  public getAllowExcessivelySexualUsage(): boolean {
    return this.get("allowExcessivelySexualUsage");
  }
  public setAllowExcessivelySexualUsage(
    allowExcessivelySexualUsage: boolean
  ): this {
    return this.set("allowExcessivelySexualUsage", allowExcessivelySexualUsage);
  }

  public getCommercialUsage(): CommercialUsage {
    return this.get("commercialUsage");
  }
  public setCommercialUsage(commercialUsage: CommercialUsage): this {
    return this.set("commercialUsage", commercialUsage);
  }

  public getAllowPoliticalOrReligiousUsage(): boolean {
    return this.get("allowPoliticalOrReligiousUsage");
  }
  public setAllowPoliticalOrReligiousUsage(
    allowPoliticalOrReligiousUsage: boolean
  ): this {
    return this.set(
      "allowPoliticalOrReligiousUsage",
      allowPoliticalOrReligiousUsage
    );
  }

  public getAllowAntisocialOrHateUsage(): boolean {
    return this.get("allowAntisocialOrHateUsage");
  }
  public setAllowAntisocialOrHateUsage(
    allowAntisocialOrHateUsage: boolean
  ): this {
    return this.set("allowAntisocialOrHateUsage", allowAntisocialOrHateUsage);
  }

  public getCreditNotation(): CreditNotation {
    return this.get("creditNotation");
  }
  public setCreditNotation(creditNotation: CreditNotation): this {
    return this.set("creditNotation", creditNotation);
  }

  public getAllowRedistribution(): boolean {
    return this.get("allowRedistribution");
  }
  public setAllowRedistribution(allowRedistribution: boolean): this {
    return this.set("allowRedistribution", allowRedistribution);
  }

  public getModification(): Modification {
    return this.get("modification");
  }
  public setModification(modification: Modification): this {
    return this.set("modification", modification);
  }

  public getOtherLicenseUrl(): string {
    return this.get("otherLicenseUrl");
  }
  public setOtherLicenseUrl(otherLicenseUrl: string): this {
    return this.set("otherLicenseUrl", otherLicenseUrl);
  }
}
