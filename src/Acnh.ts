import ImageProjectable from "./ImageProjectable";
import Hook from "./Hook";
import PixelsSource from "./PixelsSource";
import PatternType from "./PatternType";
import HookSystem from "./HookSystem";
import {
  color,
  paletteIndex,
  byte,
  FixedLengthArray,
  fixedLengthPropertyConfig,
  mapping,
  UintToBytes,
  bytesToUint,
  Uint16ToBytes,
  bytesToUint16,
  stringToBytes,
  bytesToString,
  binaryStringToBytes,
  bytesToBinaryString,
  propertyConfig,
} from "./utils";
import chroma from "chroma-js";

//ACNH data layout.
//Blocks of 680 or 2216 bytes each, providing this data in sequence:

//Generic header:
//  0x000: 4 bytes checksum
//  0x004: 09 -> unknown (seems to always be 09)
//  0x005: 11 bytes zero padding(?)
//  0x010: 40 bytes pattern title
//  0x038:  4 bytes island ID (0xFFFFFFFF for imported)
//  0x03C: 20 bytes island name
//  0x050:  4 bytes (02 00 00 00) unknown (zeroes for imported)
//  0x054:  4 bytes author ID (0xFFFFFFFF for imported)
//  0x058: 20 bytes author name
//  0x06C:  4 bytes (00 00 00 00) zero?
//  0x070:  2 bytes (04 EE / 01 EE) unknown (0F DD on imported)
//  0x072:  6 bytes (00 00 00 00 00 00) zero?
//  0x078: 15x3 bytes, 24-bit RGB palette colors
//
//Regular:
//  0x0A5: 512 bytes of pixel data (identical format as ACNL, nibble per pixel, little-endian)
//
//Pro:
//  0x0A5: 2048 bytes of pixel data (identical format as ACNL, nibble per pixel, little-endian)
//
//Generic footer:
//  0x*A5: 1 byte pattern type
//  0x*A7: 2 bytes zero padding (?)
//
//Pattern Types:
//  00 = normal pattern
//  01 = sample pro pattern
//  02 = tank top (non-pro)
//  03 = long sleeve dress shirt
//  04 = short sleeve tee
//  05 = tank top (pro)
//  06 = sweater
//  07 = hoodie
//  08 = coat
//  09 = short sleeve dress
//  0a = sleeveless dress
//  0b = long sleeve dress
//  0c = balloon hem dress
//  0d = round dress
//  0e = robe
//  0f = brimmed cap
//  10 = knit cap
//  11 = brimmed hat
//  12 = ACNL dress shortsleeve
//  13 = ACNL dress longsleeve
//  14 = ACNL dress sleeveless
//  15 = ACNL shirt shortsleeve
//  16 = ACNL shirt longsleeve
//  17 = ACNL shirt nosleeve
//  18 = ACNL hat
//  19 = ACNL horned hat
//
//50 regular patterns of 680 bytes each are stored in main.dat starting at offset 1930000
//50 pro patterns of 2216 bytes each are stored in main.dat starting at offset 1964000
//1 regular pattern (town flag) of 680 bytes in main.dat starting at offset 2074800
//8 pro patterns (able sisters) of 2216 bytes each are stored in main.dat starting at offset 2075480

//Colors:
//  H =         NUM * 12;
//  V = 7.843 + NUM * 5.85
//  S =         NUM * 6.68
const Sstart = 0;
const Sinc = 6.68;
const Vstart = 7.843;
const Vinc = 5.85;

// everything else is some kind of sectioned transform
// Brimmed hat
// Crown, Band, Brim
// Brimmed cap
// FrontCrown, BackCrown, Brim

/**
 * Class representing an Animal Crossing New Horizons in-game pattern.
 */
class Acnh extends ImageProjectable {
  /**
   * 4 bytes checksum at 0x000 byte address.
   * Stored at 0x000. 4 bytes.
   */
  private _checksum: number = 0;

  /**
   * Unknown value.
   * Stored at 0x004. 1 byte.
   */
  private _unknown0x004: number = 9;

  /**
   * Title, name of the pattern.
   * Stored at 0x010. 40 bytes.
   */
  private _title: string = "Empty";

  /**
   * Id of the town.
   * Stored at 0x038. 4 bytes.
   */
  private _townId: number = 0;

  /**
   * Name of the town.
   * Stored at 0x03C. 20 bytes.
   */
  private _townName: string = "";

  /**
   * Id of the villager.
   * Stored at 0x054. 4 bytes.
   */
  private _villagerId: number = 0;

  /**
   * Name of the villager.
   * Stored at 0x058. 20 bytes.
   */
  private villagerName: string = "";

  /**
   * Unknown value.
   * Stored at 0x070. 2 bytes.
   */
  private _unknown0x070: number = 0;

  /**
   * Lookup table for rendering colors.
   * Palette size is 15, 16 is always transparent but not included.
   * Stored at 0x078. 15x3 bytes, 24 bit RGB palette colors.
   */
  private _palette: color[] = [
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
   * The object through which the end user accesses the palette.
   */
  private _paletteApi: color[][] = null;

  private _type: PatternType = null;


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

  /**
   * Instantiates an Acnh.
   */
  public constructor() {
    super();
    // setup on all public apis
    this._refreshHooksApi();
  }

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


  public get type(): PatternType {
    return this._type;
  }

  public get palette(): Array<color> {
    return this._palette;
  }

  public get pixels(): PixelsSource {
    return
  }


  public get sections(): {
    texture: PixelsSource;
    [key: string]: PixelsSource;
  } {
    return this._sectionsApi;
  }

  /**
   * Gets the hooks of the Acnh.
   */
  public get hooks(): HookSystem {
    return this._hooks;
  }
}

export default ACNH;