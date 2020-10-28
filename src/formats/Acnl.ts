import AcPattern from "./../AcPattern";
import Hook from "./../Hook";
import PixelsSource from "./../PixelsSource";
import PatternType from "./../PatternType";
import HookSystem from "./../HookSystem";
import {
  color,
  paletteIndex,
  byte,
  FixedLengthArray,
  fixedLengthPropertyConfig,
  mapping,
  Uint16ToBytes,
  bytesToUint16,
  stringToBytes,
  bytesToString,
  binaryStringToBytes,
  bytesToBinaryString,
  propertyConfig,
} from "./../utils";
import {
  DecodeHintType,
  ResultMetadataType,
  Result,
  QRCodeDecoderErrorCorrectionLevel,
  NotFoundException,
} from "@zxing/library/esm";
import QRCode from "@zxing/library/esm/core/qrcode/encoder/QRCode";
import ByteMatrix from "@zxing/library/esm/core/qrcode/encoder/ByteMatrix";
import {
  MyBrowserQRCodeReader,
  ImageLoadingException,
  MyEncoder,
} from "./../myZxing";
import { QRScanningError } from "./../errors";
import chroma from "chroma-js";

// ACNL binary data layout.
//
//QR codes are blocks of 540 bytes (normal) or 620 bytes (pro) each, providing this data in sequence:
//
//0x 00 - 0x 29 ( 42) = Pattern Title (20 chars, 21st is utf-end of string)
// DESIGNER
//0x 2A - 0x 2B (  2) = User ID
//0x 2C - 0x 3D ( 18) = User Name (8 chars, 9th is utf-end of string)
//0x 3E         (  1) = Gender
//0x 3F         (  1) = Zero padding(?)
// TOWN
//0x 40 - 0x 41 (  2) = Town ID
//0x 42 - 0x 53 ( 18) = Town Name (8 chars, 9th is utf-end of string)
//0x 54         (  1) = Language
//0x 55         (  1) = Zero padding(?)
//0x 56         (  1) = Country
//0x 57         (  1) = Region
//0x 58 - 0x 66 ( 15) = Color code indexes // palette
//0x 67         (  1) = "color" (probably a lookup for most prevalent color?)
//0x 68         (  1) = "looks" (probably a lookup for "quality"? Seems to always be 0x0A or 0x00)
//0x 69         (  1) = Pattern type (see below)
//0x 6A - 0x 6B (  2) = Zero padding(?)
//0x 6C - 0x26B (512) = Pattern Data 1 (mandatory)
//0x26C - 0x46B (512) = Pattern Data 2 (optional)
//0x46C - 0x66B (512) = Pattern Data 3 (optional)
//0x66C - 0x86B (512) = Pattern Data 4 (optional)
//0x86C - 0x86F (  4) = Zero padding // only if pro?
//
// Pattern types:
// 0x00 = Fullsleeve dress (pro)
// 0x01 = Halfsleeve dress (pro)
// 0x02 = Sleeveless dress (pro)
// 0x03 = Fullsleeve shirt (pro)
// 0x04 = Halfsleeve shirt (pro)
// 0x05 = Sleeveless shirt (pro)
// 0x06 = Hat with horns (pro)
// 0x07 = Knit Hat (pro)
// 0x08 = Standee (pro)
// 0x09 = Plain pattern (easel) // can be rendered as pointy hat, umbrella, shirt
// 0x0A = unknown (non-pro)
// 0x0B = unknown (non-pro)

const standardTextureMapping: mapping = (() => {
  const width = 32;
  const height = 32;
  const mapping: Array<Array<[number, number]>> =
    new Array(width).fill(null).map(i => new Array(height).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      mapping[x][y] = [x, y];
    }
  }
  return mapping;
})();

// now from desired x/y to default coordinates
const clothingTextureMapping: mapping = (() => {
  const width = 64;
  const height = 64;
  const mapping: Array<Array<[number, number]>> =
    new Array(width).fill(null).map(i => new Array(height).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      if (x < 32 && y < 32) mapping[x][y] = [x, y - 0 + 32]; // front
      else if (x < 64 && y < 32) mapping[x][y] = [x - 32, y - 0]; // back
      else if (x < 32 && y < 48) mapping[x][y] = [x, y - 32 + (16 * 7)]; // back skirt
      else if (x < 32 && y < 64) mapping[x][y] = [x, y - 48 + (16 * 4)]; // left arm
      else if (x < 64 && y < 48) mapping[x][y] = [x - 32, y - 32 + (16 * 6)]; // front skirt
      else if (x < 64 && y < 64) mapping[x][y] = [x - 32, y - 48 + (16 * 5)];
    }
  }
  return mapping;
})();

const createStandeeMapping = (isTextureMapping: boolean): mapping => {
  const width = isTextureMapping ? 64 : 52;
  const height = 64;
  const mapping: Array<Array<[number, number]>> =
    new Array(width).fill(null).map(i => new Array(height).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      if (x >= 32 && y < 64) mapping[x][y] = [x - 32, y - 0 + 64]
      else mapping[x][y] = [x, y];
    }
  }
  return mapping;
};

const standeeTextureMapping = createStandeeMapping(true);
const standeeFrontMapping = createStandeeMapping(false);


enum ClothLength {
  Short,
  Long,
};

enum ClothSide {
  Left,
  Right,
  Front,
  Back,
};

const createTopMapping = (clothLength: ClothLength, clothSide: ClothSide.Front | ClothSide.Back): mapping => {
  const width = 32;
  const height = clothLength === ClothLength.Short ? 32 : 48;
  const mapping: Array<Array<[number, number]>> =
    new Array(width).fill(null).map(i => new Array(height).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      if (y < 32) mapping[x][y] = [x, y + (16 * (clothSide === ClothSide.Front ? 0 : 2))];
      else if (y < 48) mapping[x][y] = [x, y - 32 + (16 * (clothSide === ClothSide.Front ? 6 : 7))];
    }
  }
  return mapping;
};

const createArmMapping = (clothLength: ClothLength, clothSide: ClothSide.Left | ClothSide.Right): mapping => {
  const width = clothLength === ClothLength.Short ? 16 : 32;
  const height = 16;
  const mapping: Array<Array<[number, number]>> =
    new Array(width).fill(null).map(i => new Array(height).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      mapping[x][y] = [x, y - 0 + (16 * (clothSide === ClothSide.Left ? 4 : 5))];
    }
  }
  return mapping;
};

const dressFrontMapping = createTopMapping(ClothLength.Long, ClothSide.Front);
const dressBackMapping = createTopMapping(ClothLength.Long, ClothSide.Back);
const shirtFrontMapping = createTopMapping(ClothLength.Short, ClothSide.Front);
const shirtBackMapping = createTopMapping(ClothLength.Short, ClothSide.Back);
const longLeftArmMapping = createArmMapping(ClothLength.Long, ClothSide.Left);
const shortLeftArmMapping = createArmMapping(ClothLength.Short, ClothSide.Left);
const longRightArmMappng = createArmMapping(ClothLength.Long, ClothSide.Right);
const shortRightArmMapping = createArmMapping(ClothLength.Short, ClothSide.Right);

interface AcnlTypes {
  LongSleevedDress: Readonly<PatternType>;
  ShortSleevedDress: Readonly<PatternType>;
  NoSleevedDress: Readonly<PatternType>;
  LongSleevedShirt: Readonly<PatternType>;
  ShortSleevedShirt: Readonly<PatternType>;
  NoSleevedShirt: Readonly<PatternType>;
  HornedHat: Readonly<PatternType>;
  KnittedHat: Readonly<PatternType>;
  Standee: Readonly<PatternType>;
  Standard: Readonly<PatternType>;
};
const AcnlTypes: AcnlTypes = {
  LongSleevedDress: Object.freeze({
    name: "Long Sleeved Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: dressFrontMapping,
      back: dressBackMapping,
      leftArm: longLeftArmMapping,
      rightArm: longRightArmMappng,
    }
  }),
  ShortSleevedDress: Object.freeze({
    name: "Short Sleeved Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: dressFrontMapping,
      back: dressBackMapping,
      leftArm: shortLeftArmMapping,
      rightArm: shortRightArmMapping,
    }
  }),
  NoSleevedDress: Object.freeze({
    name: "Sleeveless Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: dressFrontMapping,
      back: dressBackMapping,
    }
  }),
  LongSleevedShirt: Object.freeze({
    name: "Long Sleeved Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: shirtFrontMapping,
      back: shirtBackMapping,
      leftArm: longLeftArmMapping,
      rightArm: longRightArmMappng,
    }
  }),
  ShortSleevedShirt: Object.freeze({
    name: "Short Sleeved Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: shirtFrontMapping,
      back: shirtBackMapping,
      leftArm: shortLeftArmMapping,
      rightArm: shortRightArmMapping,
    }
  }),
  NoSleevedShirt: Object.freeze({
    name: "Sleeveless Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping,
      front: shirtFrontMapping,
      back: shirtBackMapping,
    }
  }),
  HornedHat: Object.freeze({
    name: "Horned Hat",
    size: 32,
    sections: {
      texture: standardTextureMapping,
      default: standardTextureMapping,
    }
  }),
  // no one uses this
  KnittedHat: Object.freeze({
    name: "Knitted Hat",
    size: 32,
    sections: {
      texture: standardTextureMapping,
      default: standardTextureMapping,
    }
  }),
  Standee: Object.freeze({
    name: "Standee",
    size: 128,
    sections: {
      texture: standeeTextureMapping,
      default: standeeFrontMapping,
    }
  }),
  // basic hat, short sleeved shirt, short sleeved dress, umbrella
  // is pro === is not standard
  Standard: Object.freeze({
    name: "Standard",
    size: 32,
    sections: {
      texture: standardTextureMapping,
      default: standardTextureMapping,
    }
  }),
};

const byteToType: Map<number, PatternType> = new Map(
  [...[
    AcnlTypes.LongSleevedDress,
    AcnlTypes.ShortSleevedDress,
    AcnlTypes.NoSleevedDress,
    AcnlTypes.LongSleevedShirt,
    AcnlTypes.ShortSleevedShirt,
    AcnlTypes.NoSleevedShirt,
    AcnlTypes.HornedHat,
    AcnlTypes.KnittedHat,
    AcnlTypes.Standee,
    AcnlTypes.Standard,
  ].entries()]
);

const typeToByte: Map<PatternType, number> = new Map(
  [...byteToType.entries()].map(([i, type]) => [type, i])
);

const byteToColor: Map<byte, color> = new Map(
  [...[
    //Pinks (0x00 - 0x08)
    "#FFEEFF", "#FF99AA", "#EE5599", "#FF66AA", "#FF0066", "#BB4477", "#CC0055", "#990033", "#552233",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x09-0x0E unused / unknown
    "#FFFFFF", //0x0F: Grey 1
    //Reds (0x10 - 0x18)
    "#FFBBCC", "#FF7777", "#DD3210", "#FF5544", "#FF0000", "#CC6666", "#BB4444", "#BB0000", "#882222",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x19-0x1E unused / unknown
    "#EEEEEE", //0x1F: Grey 2
    //Oranges (0x20 - 0x28)
    "#DDCDBB", "#FFCD66", "#DD6622", "#FFAA22", "#FF6600", "#BB8855", "#DD4400", "#BB4400", "#663210",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x29-0x2E unused / unknown
    "#DDDDDD", //0x2F: Grey 3
    //Pastels or something, I guess? (0x30 - 0x38)
    "#FFEEDD", "#FFDDCC", "#FFCDAA", "#FFBB88", "#FFAA88", "#DD8866", "#BB6644", "#995533", "#884422",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x39-0x3E unused / unknown
    "#CCCDCC", //0x3F: Grey 4
    //Purple (0x40 - 0x48)
    "#FFCDFF", "#EE88FF", "#CC66DD", "#BB88CC", "#CC00FF", "#996699", "#8800AA", "#550077", "#330044",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x49-0x4E unused / unknown
    "#BBBBBB", //0x4F: Grey 5
    //Pink (0x50 - 0x58)
    "#FFBBFF", "#FF99FF", "#DD22BB", "#FF55EE", "#FF00CC", "#885577", "#BB0099", "#880066", "#550044",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x59-0x5E unused / unknown
    "#AAAAAA", //0x5F: Grey 6
    //Brown (0x60 - 0x68)
    "#DDBB99", "#CCAA77", "#774433", "#AA7744", "#993200", "#773222", "#552200", "#331000", "#221000",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x69-0x6E unused / unknown
    "#999999", //0x6F: Grey 7
    //Yellow (0x70 - 0x78)
    "#FFFFCC", "#FFFF77", "#DDDD22", "#FFFF00", "#FFDD00", "#CCAA00", "#999900", "#887700", "#555500",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x79-0x7E unused / unknown
    "#888888", //0x7F: Grey 8
    //Blue (0x80 - 0x88)
    "#DDBBFF", "#BB99EE", "#6632CC", "#9955FF", "#6600FF", "#554488", "#440099", "#220066", "#221033",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x89-0x8E unused / unknown
    "#777777", //0x8F: Grey 9
    //Ehm... also blue? (0x90 - 0x98)
    "#BBBBFF", "#8899FF", "#3332AA", "#3355EE", "#0000FF", "#333288", "#0000AA", "#101066", "#000022",
    undefined, undefined, undefined, undefined, undefined, undefined,//0x99-0x9E unused / unknown
    "#666666", //0x9F: Grey 10
    //Green (0xA0 - 0xA8)
    "#99EEBB", "#66CD77", "#226610", "#44AA33", "#008833", "#557755", "#225500", "#103222", "#002210",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xA9-0xAE unused / unknown
    "#555555", //0xAF: Grey 11
    //Icky greenish yellow (0xB0 - 0xB8)
    "#DDFFBB", "#CCFF88", "#88AA55", "#AADD88", "#88FF00", "#AABB99", "#66BB00", "#559900", "#336600",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xB9-0xBE unused / unknown
    "#444444", //0xBF: Grey 12
    //Wtf? More blue? (0xC0 - 0xC8)
    "#BBDDFF", "#77CDFF", "#335599", "#6699FF", "#1077FF", "#4477AA", "#224477", "#002277", "#001044",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xC9-0xCE unused / unknown
    "#333233", //0xCF: Grey 13
    //Gonna call this cyan (0xD0 - 0xD8)
    "#AAFFFF", "#55FFFF", "#0088BB", "#55BBCC", "#00CDFF", "#4499AA", "#006688", "#004455", "#002233",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xD9-0xDE unused / unknown
    "#222222", //0xDF: Grey 14
    //More cyan, because we didn't have enough blue-like colors yet (0xE0 - 0xE8)
    "#CCFFEE", "#AAEEDD", "#33CDAA", "#55EEBB", "#00FFCC", "#77AAAA", "#00AA99", "#008877", "#004433",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xE9-0xEE unused / unknown
    "#000000", //0xEF: Grey 15
    //Also green. Fuck it, whatever. (0xF0 - 0xF8)
    "#AAFFAA", "#77FF77", "#66DD44", "#00FF00", "#22DD22", "#55BB55", "#00BB00", "#008800", "#224422",
    undefined, undefined, undefined, undefined, undefined, undefined,//0xF9-0xFE unused / unknown
    undefined, //0xFF unused (white in-game, editing freezes the game)
  ].entries()].filter(([i, color]) => color !== undefined))


const colorToByte: Map<color, byte> = new Map(
  [...byteToColor.entries()].map(([i, color]) => [color, i])
);

const colors = new Set(colorToByte.keys());


const PIXELS_WIDTH = 32;
const PIXELS_HEIGHT = 128;
const PALETTE_SIZE = 15;

/**
 * Class representing an Animal Crossing New Leaf in-game pattern.
 */
class Acnl extends AcPattern {

  /**
   * An Enum of all possible PatternTypes.
   */
  public static types = AcnlTypes;

  /**
   * A set of all colors available within the ACNL color space.
   */
  public static colors = colors;

  /**
   * A mapping of hex color strings to bytes.
   */
  public static colorToByte = colorToByte;

  /**
   * A mapping of bytes to hex color strings.
   */
  public static byteToColor = byteToColor;

  /**
   * Title, name of the pattern.
   */
  private _title: string = "";

  /**
   * Id of the villager.
   * Must match in-game villager id (ACNL) to be editable.
   */
  private _villagerId: number = 0;

  /**
   * Name of the villager.
   */
  private _villagerName: string = "";

  /**
   * Gender of the villager.
   */
  private _villagerIsFemale: boolean = false;

  /**
   * Id of the town.
   * Must match in-game town id (ACNL) to be editable.
   */
  private _townId: number = 0;

  /**
   * Name of the town.
   */
  private _townName: string = "";

  /**
   * The PatternType (e.g. Standard, Shirt, Dress)
   */
  private _type: PatternType = Acnl.types.Standard;

  /**
   * Mapping for rendering colors.
   * Palette size is 15, 16 is always transparent but not included.
   */
  private _palette: Array<color> = [
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
  ];

  /**
   * The object through which the end-user accesses the palette.
   */
  private _paletteApi: Array<color> = null;

  /**
   * The raw pixels representing the pixels of the pattern.
   * 32 cols x 128 rows, accessed as pixels[col][row] or pixels[x][y].
   * Type size determines what to truncate down when converting to binary.
   */
  private _pixels: paletteIndex[][] = new Array(32).fill(0).map(() => {
    return new Array(128).fill(0);
  });

  /**
   * The object through which the end-user accesses the pixels.
   */
  private _pixelsApi: PixelsSource = null;

  /**
   * The object through which the user can access the pattern's sections.
   */
  private _sectionsApi: {
    texture: PixelsSource;
    [key: string]: PixelsSource;
  } = null;

  /**
   * The event hooks that the pattern can emit.
   */
  private _hooks: Readonly<HookSystem> = null;

  // stuff no one should touch b/c actual mapped values are unknown
  private _language: number = 0;
  private _country: number = 0;
  private _region: number = 0;
  private _color: number = 0;
  private _looks: number = 0;


  /**
   * Instantiates an Acnl.
   */
  public constructor() {
    super();
    // setup on all public apis
    this._refreshHooksApi();
    this._refreshPaletteApi();
    this._refreshPixelsApi();
    this._refreshSectionsApi();
  };


  /**
   * Refreshes the hooks API.
   */
  private _refreshHooksApi(): void {
    this._hooks = Object.seal(
      Object.freeze({
        type: new Hook<[PatternType]>(),
        palette: new Hook<[number, color]>(),
        load: new Hook<[]>(),
        refresh: new Hook<[]>(),
      })
    );
  }


  /**
   * Refreshes the palette API.
   */
  private _refreshPaletteApi(palette?: Array<color>): void {
    let api: Array<color>;
    if (palette != null)
      api = palette;
    else
      api = new Array<color>(this._palette.length);
    Object.defineProperty(api, "length", {
      enumerable: false,
      configurable: false,
      writable: false,
    });
    for (let i = 0; i < this._palette.length; ++i) {
      Object.defineProperty(api, i, {
        ...propertyConfig,
        get: () => this._palette[i],
        set: (color: color) => {
          if (typeof color !== "string") {
            const message = `Expected a valid color in the Acnl colorspace.`;
            throw new TypeError(message);
          }
          const chromaColor = chroma(color);
          if (!Acnl.colors.has(chromaColor.hex("rgb").toUpperCase())) {
            const message = `Expected a valid color from the Acnl colorspace.`;
            throw new RangeError(message);
          }
          this._palette[i] = chromaColor.hex("rgb").toUpperCase();
          this._hooks.palette.trigger(i, chromaColor.hex("rgb"));
        }
      });
    }
    Object.preventExtensions(api);
    this._paletteApi = <Array<color>>api;
  }


  /**
   * Refreshes the pixels API and cleans up pixels hook.
   */
  private _refreshPixelsApi(): void {
    const { _pixels, _pixelsApi } = this;
    if (_pixelsApi != null) _pixelsApi.hook.clear();
    // simulate fixed array size
    // need this api to "subscribe" to change type event, when pixels change lengths, make it look like a true array
    const api: PixelsSource = new PixelsSource(PIXELS_WIDTH, PIXELS_HEIGHT);
    const validatePaletteIndex = (paletteIndex: number) => {
      if (typeof paletteIndex !== "number") {
        const message = ``;
        throw new TypeError(message);
      }
      if (paletteIndex < 0 && paletteIndex > PALETTE_SIZE) {
        const message = ``;
        throw new RangeError(message);
      }
    };
    const validateColumn = (column: FixedLengthArray<paletteIndex>) => {
      if (!(column instanceof Array)) {
        const message = ``;
        throw new TypeError(message);
      };
      if (column.length !== PIXELS_HEIGHT) {
        const message = ``;
        throw new RangeError(message);
      };
      for (let i = 0; i < column.length; ++i) {
        validatePaletteIndex(column[i]);
      };
    };
    for (let x = 0; x < PIXELS_WIDTH; ++x) {
      const columnReactiveApi = api.reactive[x];
      const columnUnreactiveApi = api.unreactive[x];
      for (let y = 0; y < PIXELS_HEIGHT; ++y) {
        Object.defineProperty(columnReactiveApi, y, {
          ...propertyConfig,
          get: (): paletteIndex => _pixels[x][y],
          set: (paletteIndex: paletteIndex) => {
            validatePaletteIndex(paletteIndex);
            // assignment hook
            _pixels[x][y] = paletteIndex;
            api.hook.trigger(x, y, paletteIndex);
          }
        });
        Object.defineProperty(columnUnreactiveApi, y, {
          ...propertyConfig,
          get: (): paletteIndex => _pixels[x][y],
          set: (paletteIndex: paletteIndex) => {
            validatePaletteIndex(paletteIndex);
            _pixels[x][y] = paletteIndex;
          }
        });
      }
      Object.defineProperty(api.reactive, x, {
        ...propertyConfig,
        get: (): FixedLengthArray<paletteIndex> => columnReactiveApi,
        set: (column: FixedLengthArray<paletteIndex>) => {
          validateColumn(column);
          for (let y = 0; y < api.height; ++y)
            columnReactiveApi[y] = column[y];
          Object.defineProperty(column, "length", {
            ...fixedLengthPropertyConfig,
          });
          Object.preventExtensions(column);
        }
      });
      Object.defineProperty(api.unreactive, x, {
        ...propertyConfig,
        get: (): FixedLengthArray<paletteIndex> => columnUnreactiveApi,
        set: (column: FixedLengthArray<paletteIndex>) => {
          validateColumn(column);
          for (let y = 0; y < api.height; ++y)
            columnUnreactiveApi[y] = column[y];
          // lock down length
          Object.defineProperty(column, "length", {
            ...fixedLengthPropertyConfig,
          });
          Object.preventExtensions(column);
        }
      });
    }
    this._pixelsApi = api;
  }


  /**
   * Refresh the sections API and cleans up sections hooks.
   */
  private _refreshSectionsApi(): void {
    const { _pixels, pixels, _type, _sectionsApi } = this;
    // cleanup to prevent memory leak
    // pixel api needs to be reloaded as well on type change (to clear all callback wrapping)
    for (const sectionName in _sectionsApi) {
      _sectionsApi[sectionName].hook.clear();
      delete _sectionsApi[sectionName];
    }
    // // setup empty hooks
    const api = <{
      texture: PixelsSource;
      [key: string]: PixelsSource;
    }>new Object();
    for (const sectionName in _type.sections) {
      const mapping = _type.sections[sectionName];
      const sectionApi: PixelsSource =
        new PixelsSource(mapping.length, mapping[0].length);
      for (let x: number = 0; x < mapping.length; ++x) {
        const columnReactiveApi = sectionApi.reactive[x];
        const columnUnreactiveApi = sectionApi.unreactive[x];
        for (let y: number = 0; y < mapping[x].length; ++y) {
          const targetX = mapping[x][y][0];
          const targetY = mapping[x][y][1];
          // wrapping existing setter at target
          const { get, set } = Object.getOwnPropertyDescriptor(pixels.reactive[targetX], targetY);
          Object.defineProperty(pixels.reactive[targetX], targetY, {
            ...propertyConfig,
            get: get,
            set: (pixel) => {
              // run the existing function, but now with hook call after it finishes
              // creates a wrapping effect
              set(pixel);
              // console.log(`modifying at (${y}, ${x}) targeting (${targetY}, ${targetX})`);
              sectionApi.hook.trigger(x, y, pixel);
            }
          });
          // trigger setter at target
          Object.defineProperty(columnReactiveApi, y, {
            ...propertyConfig,
            get: (): paletteIndex => _pixels[targetX][targetY],
            set: (paletteIndex: paletteIndex) => {
              pixels.reactive[targetX][targetY] = paletteIndex;
            },
          });
          Object.defineProperty(columnUnreactiveApi, y, {
            ...propertyConfig,
            get: (): paletteIndex => _pixels[targetX][targetY],
            set: (paletteIndex: paletteIndex) => {
              pixels.unreactive[targetX][targetY] = paletteIndex;
            }
          });
        }
        Object.defineProperty(sectionApi.reactive, x, {
          ...propertyConfig,
          get: (): FixedLengthArray<paletteIndex> => columnReactiveApi,
          set: (column: FixedLengthArray<paletteIndex>) => {
            for (let y = 0; y < columnReactiveApi.length; ++y) {
              columnReactiveApi[y] = column[y];
            }
          }
        });
        Object.defineProperty(sectionApi.unreactive, x, {
          ...propertyConfig,
          get: (): FixedLengthArray<paletteIndex> => columnUnreactiveApi,
          set: (column: FixedLengthArray<paletteIndex>) => {
            for (let y = 0; y < columnUnreactiveApi.length; ++y) {
              columnUnreactiveApi[y] = column[y];
            }
          }
        });
      }
      api[sectionName] = sectionApi;
    }
    this._sectionsApi = api;
  }


  /**
   * Gets the title of the Acnl.
   */
  public get title(): string {
    return this._title;
  }


  /**
   * Sets the title of the Acnl.
   */
  public set title(title: string) {
    if (typeof title !== "string") return;
    if (title.length > 20) return;
    this._title = title;
  }


  /**
   * Gets the town id of the Acnl.
   */
  public get townId(): number {
    return this._townId;
  }


  /**
   * Sets the town id of the Acnl.
   */
  public set townId(townId: number) {
    if (
      typeof townId !== "number" ||
      !Number.isInteger(townId)
    ) {
      const message = `Expected a valid UInt16 number.`;
      throw new TypeError(message);
    }
    if (townId < 0 || townId >= 65536) {
      const message = `Expected a valid UInt16 number.`;
      throw new RangeError(message);
    }
    this._townId = townId;
  }


  /**
   * Gets the town name of the Acnl.
   */
  public get townName(): string {
    return this._townName;
  }


  /**
   * Sets the town name of the Acnl.
   */
  public set townName(townName: string) {
    if (typeof townName !== "string") {
      const message = `Expected a string of length 8 or less.`;
      throw new TypeError(message);
    }
    if (townName.length > 8) {
      const message = `Expected a string of length 8 or less.`;
      throw new RangeError(message);
    }
    this._townName = townName;
  }


  /**
   * Gets the villager id of the Acnl.
   */
  public get villagerId(): number {
    return this._villagerId;
  }


  /**
   * Sets the villager id of the Acnl.
   */
  public set villagerId(villagerId: number) {
    if (
      typeof villagerId !== "number" ||
      !Number.isInteger(villagerId)
    ) {
      const message = `Expected a valid UInt16 number.`;
      throw new TypeError(message);
    }
    if (villagerId < 0 || villagerId >= 65536) {
      const message = `Expected a valid UInt16 number.`;
      throw new RangeError(message);
    }
    this._villagerId = villagerId;
  }


  /**
   * Gets the villager name of the Acnl.
   */
  public get villagerName(): string {
    return this._villagerName;
  }


  /**
   * Sets the villager name of the Acnl.
   */
  public set villagerName(villagerName: string) {
    if (typeof villagerName !== "string") {
      const message = `Expected a string of length 8 or less.`;
      throw new TypeError(message);
    }
    if (villagerName.length > 8) {
      const message = `Expected a string of length 8 or less.`;
      throw new RangeError(message);
    }
    this._villagerName = villagerName;
  }


  /**
   * Gets the villager gender.
   */
  public get villagerIsFemale(): boolean {
    return this._villagerIsFemale;
  }


  /**
   * Sets the villager gender.
   */
  public set villagerIsFemale(villagerIsFemale: boolean) {
    if (typeof villagerIsFemale !== "boolean") {
      const message = `Expected a boolean.`;
      throw new TypeError(message);
    }
    this._villagerIsFemale = villagerIsFemale;
  }


  /**
   * Gets the PatternType of the Acnl.
   */
  public get type(): AcnlTypes[keyof AcnlTypes] {
    return this._type;
  }


  /**
   * Sets the PatternType of the Acnl.
   */
  public set type(type: AcnlTypes[keyof AcnlTypes]) {
    const { _hooks, _type } = this;
    // must match from enum, no excuses
    if (!Object.values(AcnlTypes).includes(type)) {
      const message = `Expected a type from the Acnl format.`;
      throw new TypeError(message);
    }
    if (type !== this._type) {
      this._type = type;
      // reset and clean up apis
      this._refreshPixelsApi();
      this._refreshSectionsApi();
      _hooks.type.trigger(type);
    }
  }


  /**
   * Gets the palette of the Acnl.
   */
  public get palette(): Array<color> {
    return this._paletteApi;
  }


  /**
   * Sets the entire palette of the Acnl.
   * Assimilates passed palette into the pattern.
   */
  public set palette(palette: Array<color>) {
    // turns the passed palette into the new api object
    const { _palette, _hooks } = this;
    if (!(palette instanceof Array)) {
      const message = `Expected an array of colors from the Acnl colorspace.`;
      throw new TypeError(message);
    }
    if (palette.length !== this._palette.length) {
      const message = `Palette size must be of size ${this._palette.length} for Acnl.`;
      throw new RangeError(message); // too many
    }
    for (const color of palette) {
      if (typeof color !== "string") {
        const message = `Expected valid colors from the Acnl colorspace.`;
        throw new TypeError(message);
      }
      const chromaColor: chroma.Color = chroma(color);
      if (!Acnl.colors.has(chromaColor.hex("rgb").toUpperCase())) {
        const message = `Expected valid colors from the Acnl colorspace.`;
        throw new RangeError(message);
      }
    }
    for (let i = 0; i < _palette.length; ++i) {
      const color: color = palette[i];
      const chromaColor: chroma.Color = chroma(color);
      // block all non-unique changes
      if (_palette[i] === chromaColor.hex("rgb")) continue;
      _palette[i] = chromaColor.hex("rgb").toUpperCase();
      _hooks.palette.trigger(i, color);
    }
    // now use it to replace the palette api, allows for equality operator
    if (palette !== this._paletteApi) this._refreshPaletteApi(palette);
  }


  /**
   * Gets the sections of the Acnl.
   */
  public get sections(): {
    texture: PixelsSource;
    [key: string]: PixelsSource;
  } {
    return this._sectionsApi;
  }


  /**
   * Gets the pixels of the Acnl.
   */
  public get pixels(): PixelsSource {
    return this._pixelsApi;
  }


  /**
   * Gets the hooks of the Acnl.
   */
  public get hooks(): HookSystem {
    return this._hooks;
  }


  // /**
  //  * Gets the language byte of the Acnl.
  //  */
  // private get language(): number {
  //   return this._language;
  // }


  // /**
  //  * Sets the language byte of the Acnl.
  //  */
  // private set language(language: number) {
  //   if (language < 128) {
  //     this._language = language;
  //   }
  // }


  // /**
  //  * Gets the country byte of the Acnl.
  //  */
  // private get country(): number {
  //   return this._country;
  // }


  // /**
  //  * Sets the country byte of the Acnl.
  //  */
  // private set country(country: number) {
  //   if (country < 128) {
  //     this._country = country;
  //   }
  // }


  // /**
  //  * Gets the region byte of the Acnl.
  //  */
  // private get region(): number {
  //   return this._region;
  // }


  // /**
  //  * Sets the region byte of the Acnl.
  //  */
  // private set region(region: number) {
  //   if (region < 128) {
  //     this._region = region;
  //   }
  // }


  // /**
  //  * Gets the color byte of the Acnl.
  //  */
  // private get color(): number {
  //   return this._color;
  // }


  // /**
  //  * Sets the color byte of the Acnl.
  //  */
  // private set color(color: number) {
  //   if (color < 15) {
  //     this._color = color;
  //   }
  // }


  // /**
  //  * Gets looks byte of the Acnl.
  //  */
  // private get looks(): number {
  //   return this._looks;
  // }


  // /**
  //  * Sets looks byte of the Acnl.
  //  */
  // private set looks(looks: number) {
  //   if (looks < 128) {
  //     this._looks = looks;
  //   }
  // }


  /**
   * Returns the nearest color in the color space of the Acnl.
   * @param color - the color to match
   * @returns - the closest color in the colorspace, hex string
   */
  public static nearestColorInColorSpace(inputColor: color): color {
    if (typeof inputColor !== "string") {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    try { chroma(inputColor); }
    catch (error) {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    let outputColor: color = null;
    let outputColorDistance: number = null;
    for (const color of Acnl.colors) {
      const distance: number = chroma.distance(inputColor, color, "rgb");
      // always pick the color with the minimum distance
      if (outputColor != null && distance >= outputColorDistance) continue;
      outputColor = color;
      outputColorDistance = distance;
    }
    return outputColor;
  }


  /**
   * Creates a formatted binary string from the Acnl.
   * @returns - the binary string
   */
  public toBinaryString(): string {
    // encode everything into hex numbers
    const {
      _title,
      _villagerId,
      _villagerName,
      _villagerIsFemale,
      _townId,
      _townName,
      _language,
      _country,
      _region,
      _palette,
      _color,
      _looks,
      _type,
      _pixels,
    } = this;
    const bytes: byte[] = [];
    bytes.push(...stringToBytes(_title));
    bytes.push(...new Array((20 - _title.length) * 2).fill(0)); // padding
    bytes.push(0, 0); // eos
    bytes.push(...Uint16ToBytes(_villagerId));
    bytes.push(...stringToBytes(_villagerName));
    bytes.push(...new Array((8 - _villagerName.length) * 2).fill(0)); // padding
    bytes.push(0, 0); // eos
    bytes.push(Number(_villagerIsFemale));
    bytes.push(0); // zero padding
    bytes.push(...Uint16ToBytes(_townId));
    bytes.push(...stringToBytes(_townName));
    bytes.push(...new Array((8 - _townName.length) * 2).fill(0)); // padding
    bytes.push(0, 0); // eos
    bytes.push(_language);
    bytes.push(0); // zero padding
    bytes.push(_country);
    bytes.push(_region);
    bytes.push(..._palette.map(cssColor => <byte>Acnl.colorToByte.get(cssColor)));
    bytes.push(_color);
    bytes.push(_looks);
    bytes.push(typeToByte.get(_type));
    bytes.push(0, 0); // zero padding
    // pixel data bunched together
    bytes.push(...new Array(_type.size * PIXELS_WIDTH / 2).fill(null)
      .map((_, i) => {
        const x = (i * 2) % PIXELS_WIDTH;
        const y = Math.floor((i * 2) / PIXELS_WIDTH);
        return ((_pixels[x][y] << 4) + (_pixels[x + 1][y] & 0xf));
      }));
    return bytesToBinaryString(bytes);
  }


  /**
   * Creates a formatted binary string from an Acnl.
   * @param acnl - the acnl instance
   * @returns - the binary string
   */
  public static toBinaryString(acnl: Acnl): string {
    return acnl.toBinaryString();
  }


  /**
   * Loads data into the Acnl from a formatted binary string.
   * @param binaryString - the formatted binary string
   * @returns - this acnl
   */
  public fromBinaryString(binaryString: string): Acnl /* throws RangeError, TypeError */ {
    // decode everything
    const bytes = binaryStringToBytes(binaryString);
    if (
      bytes.length < 620 ||
      (bytes.length > 620 && bytes.length < 2156) ||
      bytes.length > 2160
    ) {
      const message = `Expected binary string with 620 or 2156 - 2160 bytes, but received ${bytes.length} bytes.`;
      throw new RangeError(message);
    }
    // do a size check
    this._title = bytesToString(bytes.splice(0, 42));
    this._villagerId = bytesToUint16(<[byte, byte]>bytes.splice(0, 2));
    this._villagerName = bytesToString(bytes.splice(0, 18));
    this._villagerIsFemale = Boolean(bytes.splice(0, 1)[0]);
    bytes.splice(0, 1); // zero padding
    this._townId = bytesToUint16(<[byte, byte]>bytes.splice(0, 2));
    this._townName = bytesToString(bytes.splice(0, 18));
    this._language = bytes.splice(0, 1)[0];
    bytes.splice(0, 1); // zero padding
    this._country = bytes.splice(0, 1)[0];
    this._region = bytes.splice(0, 1)[0];
    bytes.splice(0, 15).forEach((byte, i) => {
      this._palette[i] = Acnl.byteToColor.get(byte);
    });
    this._color = bytes.splice(0, 1)[0];
    this._looks = bytes.splice(0, 1)[0];
    this._type = byteToType.get(bytes.splice(0, 1)[0]);
    bytes.splice(0, 2); // zero padding
    // load pixels
    const pixelsFlattened: paletteIndex[] = bytes
      .splice(0, bytes.length)
      .reduce((accum, byte) => {
        // each byte contains 2 pixels
        accum.push(byte & 0xf);
        accum.push((byte >> 4) & 0xf);
        return accum;
      }, []);
    for (let y = 0; y < this._type.size; ++y) {
      for (let x = 0; x < PIXELS_WIDTH; ++x) {
        this._pixels[x][y] = pixelsFlattened[x + y * PIXELS_WIDTH];
      }
    }
    this._refreshPixelsApi();
    this._refreshSectionsApi();
    this._hooks.load.trigger();
    return this;
  }


  /**
   * Creates an Acnl from a formatted binary string.
   * @param binaryString - the formatted binary string to convert
   * @returns - the Acnl
   */
  public static fromBinaryString(binaryString: string): Acnl /* throws RangeError, TypeError */ {
    const acnl = new Acnl();
    return acnl.fromBinaryString(binaryString);
  }


  /**
   * Loads data into the Acnl from 1 whole or 4 multipart QR codes over multiple images.
   * If multiple Acnls are encoded in the images, loads the first one.
   * @param image - an image to scan for QR Codes
   * @returns - a promise resolving to the Acnl
   */
  public async fromQRCodes(images: Array<HTMLImageElement>): Promise<Acnl> /* throws TypeError, QRScanningError */ {
    const acnls = await Acnl.readQRCodes(images);
    if (acnls.length === 0) {
      const message = `No valid QR Codes could be scanned from the image.`;
      throw new QRScanningError(message);
    }
    // load data from an acnl into itself
    const acnl = acnls[0];
    return this.fromBinaryString(acnl.toBinaryString());
  }


  /**
   * Decodes 1 whole or 4 multipart QR codes to construct an Acnl from the
   * images. If there are multiple Acnls encoded in the images, loads the first
   * it can decode.
   * @param images - the images to scan for QR Codes
   * @returns - a promise resolving to the Acnl
   */
  public static async fromQRCodes(
    images: Array<HTMLImageElement>
  ): Promise<Acnl> /* throws TypeError, QRScanningError */ {
    const acnl = new Acnl();
    return await acnl.fromQRCodes(images);
  }


  /**
   * Decodes QR Codes to construct multiple Acnls from the images.
   * @param images - the images to scan for QR Codes
   * @returns - a promise resolving to the Acnls
   */
  public static async readQRCodes(images: Array<HTMLImageElement>): Promise<Array<Acnl>> /* throws TypeError, QRScanningError */ {
    interface ExtractedResult {
      bytes: Uint8Array;
      sequenceNumber: number;
      parity: number; // number to check to make sure qr parts are from same data
    };
    if (!(images instanceof Array)) {
      const message = `Expected an array of ${HTMLImageElement.name}`;
      throw new TypeError(message);
    }
    for (const image of images) {
      if (!(image instanceof HTMLImageElement)) {
        const message = `Expected an array of ${HTMLImageElement.name}`;
        throw new TypeError(message);
      }
    }
    const acnls = new Array<Acnl>();
    const parityToExtractedResults = new Map<number, Array<ExtractedResult>>();
    for (const image of images) {
      const browserQRCodeReader = new MyBrowserQRCodeReader();
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      browserQRCodeReader.hints = hints;

      let results: Array<Result>;
      try {
        results = await browserQRCodeReader.decodeFromImage(image);
        browserQRCodeReader.reset();
      }
      catch (error) {
        if (!(error instanceof NotFoundException)) {
          if (error instanceof ImageLoadingException) {
            const message = error.message;
            throw new QRScanningError(message);
          }
          else throw error;
        };
        continue;
      }
      const extractedResults: Array<ExtractedResult> = results.map((result) => {
        const resultMetadata = result.getResultMetadata();
        const bytes: Uint8Array = resultMetadata
          .get(ResultMetadataType.BYTE_SEGMENTS)[0];
        const sequenceNumber: number = <number>resultMetadata
          .get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE) >> 4;
        const parity: number = <number>resultMetadata.get(
          ResultMetadataType.STRUCTURED_APPEND_PARITY);
        return {
          bytes,
          sequenceNumber,
          parity,
        };
      });
      for (const extractedResult of extractedResults) {
        // no need to deal with parity if you can just get it directly
        if (extractedResult.bytes.length === 620) {
          try {
            const binaryString: string = bytesToBinaryString(
              <Array<byte>><unknown>extractedResult.bytes
            );
            const acnl = Acnl.fromBinaryString(binaryString);
            acnls.push(acnl);
          }
          catch (error) { }
          continue;
        }
        if (extractedResult.bytes.length !== 540) { continue; }
        let parityExtractedResults: Array<ExtractedResult>;
        if (!parityToExtractedResults.has(extractedResult.parity)) {
          parityExtractedResults = new Array<ExtractedResult>();
          parityToExtractedResults.set(extractedResult.parity, parityExtractedResults);
        }
        else
          parityExtractedResults =
            parityToExtractedResults.get(extractedResult.parity);
        parityExtractedResults.push(extractedResult);
        const uniqueSequenceNumbers =
          new Set(parityExtractedResults.map((er) => er.sequenceNumber));
        uniqueSequenceNumbers.add(extractedResult.sequenceNumber);
        if (
          !uniqueSequenceNumbers.has(0) ||
          !uniqueSequenceNumbers.has(1) ||
          !uniqueSequenceNumbers.has(2) ||
          !uniqueSequenceNumbers.has(3)
        ) continue;
        // if you have all parts, assemble the acnl
        const acnlExtractedResults: Array<ExtractedResult>
          = new Array<ExtractedResult>();
        for (let i = 0; i < 4; ++i) {
          const index = parityExtractedResults.findIndex((v) => {
            if (v.sequenceNumber === i) return true;
          });
          acnlExtractedResults.push(parityExtractedResults[index]);
        }
        const binaryString: string = acnlExtractedResults.map((er) => {
          return bytesToBinaryString(<Array<byte>><unknown>er.bytes);
        }).join("");
        const acnl = Acnl.fromBinaryString(binaryString);
        // already guaranteed byte length is correct
        acnls.push(acnl);
        // remove used results to prevent reuse
        for (const acnlExtractedResult of acnlExtractedResults) {
          const index = parityExtractedResults.indexOf(acnlExtractedResult);
          parityExtractedResults.splice(index, 1);
        }
        if (parityExtractedResults.length === 0)
          parityToExtractedResults.delete(extractedResult.parity);
      }
    }
    return acnls;
  }


  /**
   * Creates QR Code images for the Acnl.
   * @returns - a Promise resolving to the QR Code images
   */
  public async toQRCodes(): Promise<Array<HTMLImageElement>> {
    const qrCodes: Array<QRCode> = new Array<QRCode>();
    const bytes: byte[] = binaryStringToBytes(this.toBinaryString());
    if (this._type.size === 32)
      qrCodes.push(MyEncoder.encode(new Uint8Array(bytes), QRCodeDecoderErrorCorrectionLevel.M, null));
    else {
      // needs 0 padding
      bytes.push(...new Array(2160 - bytes.length).fill(0));
      const parityByte = Math.round(Math.random() * 255);
      for (let i = 0; i < 4; ++i) {
        qrCodes.push(
          MyEncoder.encode(
            new Uint8Array(bytes.slice(i * 540, (i + 1) * 540)),
            QRCodeDecoderErrorCorrectionLevel.M,
            null,
            [i, 3, parityByte]
          )
        );
      }
    }
    const qrCodeImages: Array<HTMLImageElement> = qrCodes.map((qrCode: QRCode) => {
      const byteMatrix: ByteMatrix = qrCode.getMatrix();
      const byteMatrixWidth: number = byteMatrix.getWidth();
      const byteMatrixHeight: number = byteMatrix.getHeight();
      // padding around the qr code
      const quietZone: number = 4;

      const canvas: HTMLCanvasElement = document.createElement("canvas");
      canvas.width = byteMatrixWidth + quietZone * 2;
      canvas.height = byteMatrixHeight + quietZone * 2;
      const context: CanvasRenderingContext2D = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#000000";
      for (let x: number = 0; x < byteMatrixWidth; ++x) {
        for (let y: number = 0; y < byteMatrixHeight; ++y) {
          if (byteMatrix.get(x, y) === 0) continue;
          context.fillRect(x + quietZone, y + quietZone, 1, 1);
        }
      }
      const image: HTMLImageElement = document.createElement("img");
      image.src = canvas.toDataURL("image/jpeg", 1);
      console.log(image.height, image.width);
      return image;
    });
    return qrCodeImages;
  }


  /**
   * Creates QR Code images for the Acnl.
   * @param acnl - the acnl
   * @returns - a Promise resolving to the qr code images
   */
  public static async toQRCodes(acnl: Acnl): Promise<Array<HTMLImageElement>> {
    return await acnl.toQRCodes();
  }
}

export default Acnl;