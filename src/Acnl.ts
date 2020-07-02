import Enum from "./Enum";
import Hook from "./Hook";
import HookableArray from "./HookableArray";
import {
  mapping,
  PatternType,
  Drawable,
} from "./interfaces";
import {
  color,
  pixel,
  byte,
  Uint16ToBytes,
  bytesToUint16,
  stringToBytes,
  bytesToString,
  binaryStringToBytes,
  bytesToBinaryString,
  propertyConfig,
} from "./utils";

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

const defaultMapping: mapping = (() => {
  const width = 32;
  const height = 128;
  const mapping = new Array(height).fill(null).map(i => new Array(width).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      mapping[y][x] = [y, x];
    }
  }
  return mapping;
})();

// now from desired x/y to default coordinates
const clothingTextureMapping: mapping = (() => {
  const width = 64;
  const height = 64;
  const mapping = new Array(height).fill(null).map(i => new Array(width).fill(null));
  for (let y: number = 0; y < height; ++y) {
    for (let x: number = 0; x < width; ++x) {
      if (x < 32 && y < 32) mapping[y][x] = [y - 0 + 32, x]; // front
      else if (x < 64 && y < 32) mapping[y][x] = [y - 0, x - 32]; // back
      else if (x < 32 && y < 48) mapping[y][x] = [y - 32 + (16 * 7), x]; // back skirt
      else if (x < 32 && y < 64) mapping[y][x] = [y - 48 + (16 * 4), x]; // left arm
      else if (x < 64 && y < 48) mapping[y][x] = [y - 32 + (16 * 6), x - 32]; // front skirt
      else if (x < 64 && y < 64) mapping[y][x] = [y - 48 + (16 * 5), x - 32];
    }
  }
  return mapping;
})();

class AcnlTypes extends Enum {
  public static LongSleevedDress: PatternType = Object.freeze({
    name: "Long Sleeved Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static ShortSleevedDress: PatternType = Object.freeze({
    name: "Short Sleeved Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static NoSleevedDress: PatternType = Object.freeze({
    name: "Sleeveless Dress",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static LongSleevedShirt: PatternType = Object.freeze({
    name: "Long Sleeved Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static ShortSleevedShirt: PatternType = Object.freeze({
    name: "Short Sleeved Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static NoSleevedShirt: PatternType = Object.freeze({
    name: "Sleeveless Shirt",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static HornedHat: PatternType = Object.freeze({
    name: "Horned Hat",
    size: 32,
    sections: {
      texture: clothingTextureMapping
    }
  });
  // no one uses this
  public static KnittedHat: PatternType = Object.freeze({
    name: "Knitted Hat",
    size: 32,
    sections: {
      texture: clothingTextureMapping
    }
  });
  public static Standee: PatternType = Object.freeze({
    name: "Standee",
    size: 128,
    sections: {
      texture: clothingTextureMapping
    }
  });
  // basic hat, short sleeved shirt, short sleeved dress, umbrella
  // is pro === is not standard
  public static Standard: PatternType = Object.freeze({
    name: "Standard",
    size: 32,
    sections: {
      texture: clothingTextureMapping
    }
  });
}

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

// janked types with optional because
// typescript getters & setters won't allow for different types
// https://github.com/microsoft/TypeScript/issues/2521
type Designer = {
  id?: number;
  name?: string;
  isFemale?: boolean;
};

type Town = {
  id?: number;
  name?: string;
};

// avoid having to set up
type Palette = [
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
];


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

class Acnl implements Drawable {
  public static types = AcnlTypes;
  // 2 way mapping for conversions between numbers and strings
  public static colorToByte = colorToByte;
  public static byteToColor = byteToColor;
  // standard pattern with defaults
  private _title: string = "Empty";
  public _designer: Designer = {
    id: 0,
    name: "Unknown",
    isFemale: false
  };
  public _designerApi: Designer = null;
  private _town: Town = {
    id: 0,
    name: "Unknown"
  };
  private _townApi: Town = null;

  private _type: PatternType = Acnl.types.Standard;

  // lookup table for rendering colors
  // palette size is 15, 16th is always transparent but not included
  private _palette: Palette = [
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
  private _paletteApi: Palette = null;

  // type size determines what to truncate down when converting to binary.
  // 32 cols x 128 rows, accessed as pixels[row][col] or pixels[y][x];
  private _pixels: pixel[][] = new Array(128).fill(15).map(() => {
    return new Array(32).fill(15);
  }); // start with entire transparent
  private _pixelsApi: HookableArray<Array<pixel>> = null;

  // stuff no one should touch
  private _language: number = 0;
  private _country: number = 0;
  private _region: number = 0;
  private _color: number = 0;
  private _looks: number = 0;

  public constructor() {
    // proxies and apis here
    // setup on all apis
    this._designerApi = this._createDesignerApi();
    this._townApi = this._createTownApi();
    this._paletteApi = this._createPaletteApi();
    this._pixelsApi = this._createPixelsApi();
  };

  private _createTownApi(): Town {
    const { _town } = this;
    const api = new Proxy(_town, {
      get: (target, property, receiver) => {
        return Reflect.get(target, property, receiver);
      },
      set: (target, property, value, receiver) => {
        // pass mutations to setter for validation
        const mutations = new Object;
        mutations[property] = value;
        this.town = mutations;
        return true;
      },
    });
    return <Town>api;
  }

  private _createDesignerApi(): Designer {
    const { _designer } = this;
    // divert all sets back to setter
    const api = new Proxy(_designer, {
      get: (target, property, receiver) => {
        return Reflect.get(target, property, receiver);
      },
      set: (target, property, value, receiver) => {
        // pass mutations to setter for validation
        const mutations = new Object();
        mutations[property] = value;
        this.designer = mutations;
        return true;
      },
    });
    return <Designer>api;
  }


  private _createPaletteApi(): Palette {
    const { _palette } = this;
    const api = new Array(_palette.length);
    for (let i = 0; i < _palette.length; ++i) {
      Object.defineProperty(api, i, {
        ...propertyConfig,
        get: () => _palette[i],
        set: (color: color) => {
          const mutations = _palette.slice();
          mutations[i] = color;
          this.palette = <Palette>mutations;
        }
      })
    }
    return <Palette>api;
  }

  private _createPixelsApi(): HookableArray<Array<pixel>> {
    const { _pixels } = this;
    // simulate fixed array size
    // need this api to "subscribe" to change type event, when pixels change lengths, make it look like a true array
    const api = new HookableArray<Array<pixel>>(_pixels.length);
    const { hook } = api;
    for (let y = 0; y < _pixels.length; ++y) {
      const rowApi = new Array(_pixels[y].length);
      for (let x = 0; x < _pixels[y].length; ++x) {
        Object.defineProperty(rowApi, x, {
          ...propertyConfig,
          get: (): pixel => _pixels[y][x],
          set: (pixel: pixel) => {
            if (pixel < 0 && pixel > 15)
              throw new RangeError();
            // assignment hook
            // @ts-ignore no more spread
            hook.trigger(y, x);
            _pixels[y][x] = pixel;
          }
        });
      }
      Object.defineProperty(api, y, {
        ...propertyConfig,
        get: () => rowApi,
        set: (row) => {
          for (let x = 0; x < rowApi.length; ++x) {
            rowApi[x] = row[x];
          }
        }
      });
    }
    return <HookableArray<Array<pixel>>>api;
  }

  // PUBLIC INTERFACE
  public get title(): string {
    return this._title;
  }


  public set title(title) {
    if (typeof title !== "string") return;
    if (title.length > 20) return;
    this._title = title;
  }


  public set town(town: Town) {
    const { _town } = this;
    // no undefined values (null still possible)
    let {
      id = this._town.id,
      name = this._town.name,
    } = town;
    // truncate/transform/ensure valid values
    if (typeof id === "number") {
      if (id < 65536) _town.id = id;
    }
    if (typeof name === "string") {
      if (name.length <= 8) _town.name = name;
    }
  }


  public get town(): Town {
    return this._townApi;
  }


  public get designer(): Designer {
    return this._designerApi;
  }

  public set designer(designer: Designer) {
    // no undefined values (null still possible)
    const { _designer } = this;
    let {
      id = _designer.id,
      name = _designer.name,
      isFemale = _designer.isFemale,
    } = designer;
    // truncate/transform/ensure valid values
    if (typeof id === "number") {
      if (id < 65536) _designer.id = id;
    }
    if (typeof name === "string") {
      if (name.length <= 8) _designer.name = name;
    }
    if (typeof isFemale === "boolean") {
      _designer.isFemale = isFemale;
    }
  }


  public set type(type: PatternType) {
    // must match from enum, no excuses
    for (let acnlType of AcnlTypes) {
      if (type === acnlType) {
        this._type = type;
        return;
      }
    }
  }

  public get type(): PatternType {
    return this._type;
  }

  set palette(palette: Palette) {
    // palette arg can be binary colors or css colors
    const { _palette } = this;
    if (typeof palette !== "object" || !(palette instanceof Array)) return;
    for (let color of palette)
      if (!Acnl.colorToByte.has(color))
        throw new TypeError();
    for (let i = 0; i < _palette.length; ++i) {
      let color: color = palette[i];
      if (Acnl.colorToByte.has(color)) continue;
      _palette[i] = color;
    }
  }

  get palette(): Palette {
    return this._paletteApi;
  }

  public set pixels(pixels: HookableArray<Array<pixel>>) {
  }

  public get pixels(): HookableArray<Array<pixel>> {
    return this._pixelsApi;
  }

  public get language(): number {
    return this._language;
  }

  public set language(language: number) {
    if (language < 128) {
      this._language = language;
    }
  }

  // COMPUTED properties
  public get sections(): { [key: string]: HookableArray<Array<pixel>> } {
    const { pixels } = this;
    const mapping = this.type.sections.texture;
    const api = new HookableArray<Array<pixel>>();
    const { hook } = api;
    for(let y: number =  0; y < mapping.length; ++y) {
      const rowApi = new Array(mapping[y].length);
      for (let x: number = 0; x < mapping[y].length; ++x) {
        const targetY = mapping[y][x][0];
        const targetX = mapping[y][x][1];
        // wrapping existing setter
        const { get, set } = Object.getOwnPropertyDescriptor(pixels[targetY], targetX);
        Object.defineProperty(pixels[targetY], targetX, {
          ...propertyConfig,
          get: get,
          set: (pixel) => {
            // run the existing function, but now with hook call after
            set(pixel);
            console.log(`modifying default at (${y}, ${x}) targeting (${targetY}, ${targetX})`);
            hook.trigger(y, x);
          }
        });
        // trigger setter at target
        Object.defineProperty(rowApi, x, {
          ...propertyConfig,
          get: (): pixel => pixels[targetY][targetX],
          set: (pixel: pixel) => { pixels[targetY][targetX] = pixel; },
        });
        // now wrap default to trigger the hook
      }
      Object.defineProperty(api, y, {
        ...propertyConfig,
        get: () => rowApi,
        set: (row) => {
          for (let x = 0; x < rowApi.length; ++x) {
            rowApi[x] = row[x];
          }
        }
      });
    }
    return {
      texture: api,
    };
  }


  private get country(): number {
    return this._country;
  }

  private set country(country: number) {
    if (country < 128) {
      this._country = country;
    }
  }

  private get region(): number {
    return this._region;
  }

  private set region(region: number) {
    if (region < 128) {
      this._region = region;
    }
  }

  private get color(): number {
    return this._color;
  }

  private set color(color: number) {
    if (color < 15) {
      this._color = color;
    }
  }

  private get looks(): number {
    return this._looks;
  }

  private set looks(looks: number) {
    if (looks < 128) {
      this._looks = looks;
    }
  }

  // loads binary data into itself
  public fromBinaryString(binaryString: string): Acnl {
    // decode everything
    const bytes = binaryStringToBytes(binaryString);
    if (bytes.length < 620) throw new RangeError();
    if (bytes.length > 620 && bytes.length < 2156) throw new RangeError();
    // do a size check
    this._title = bytesToString(bytes.splice(0, 42));
    this._designer.id = bytesToUint16(<[byte, byte]>bytes.splice(0, 2));
    this._designer.name = bytesToString(bytes.splice(0, 18));
    this._designer.isFemale = Boolean(bytes.splice(0, 1)[0]);
    bytes.splice(0, 1); // zero padding
    this._town.id = bytesToUint16(<[byte, byte]>bytes.splice(0, 2));
    this._town.name = bytesToString(bytes.splice(0, 18));
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
    const pixelsFlattened: pixel[] = bytes
      .splice(0, bytes.length)
      .reduce((accum, byte) => {
        // each byte contains 2 pixels
        accum.push((byte >> 4) & 0xf);
        accum.push(byte & 0xf);
        return accum;
      }, []);
    for (let y = 0; y < this._type.size; ++y) {
      for (let x = 0; x < this._pixels[y].length; ++x) {
        this._pixels[y][x] = pixelsFlattened[x + y * 32];
      }
    }
    return this;
  }

  public static fromBinaryString(binaryString: string): Acnl {
    const acnl = new Acnl();
    return acnl.fromBinaryString(binaryString);
  }

  public toBinaryString(): any {
    // encode everything into hex numbers
    const {
      _title,
      _designer,
      _town,
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
    bytes.push(...Uint16ToBytes(_designer.id));
    bytes.push(...stringToBytes(_designer.name));
    bytes.push(...new Array((8 - _designer.name.length) * 2).fill(0)); // padding
    bytes.push(0, 0); // eos
    bytes.push(Number(_designer.isFemale));
    bytes.push(0); // zero padding
    bytes.push(...Uint16ToBytes(_town.id));
    bytes.push(...stringToBytes(_town.name));
    bytes.push(...new Array((8 - _town.name.length) * 2).fill(0)); // padding
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
    bytes.push(...new Array(_type.size * 32 / 2).fill(null)
      .map((_, i) => {
        const x = (i * 2) % 32;
        const y = Math.floor((i * 2) / 32);
        return ((_pixels[y][x] << 4) + (_pixels[y][x + 1] & 0xf));
      }));
    return bytesToBinaryString(bytes);
  }

  public static toBinaryString(acnl: Acnl): any {
    return acnl.toBinaryString();
  }
}

export default Acnl;