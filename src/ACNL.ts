//ACNL data layout.
//
//QR codes are blocks of 540 bytes (normal) or 620 bytes (pro) each, providing this data in sequence:
//
//0x 00 - 0x 29 ( 42) = Pattern Title (21 chars)
// DESIGNER
//0x 2A - 0x 2B (  2) = User ID
//0x 2C - 0x 3D ( 18) = User Name (9 chars)
//0x 3E         (  1) = Gender
//0x 3F         (  1) = Zero padding(?)
// TOWN
//0x 40 - 0x 41 (  2) = Town ID
//0x 42 - 0x 53 ( 18) = Town Name (9 chars)
//0x 54         (  1) = Language
//0x 55         (  1) = Zero padding(?)
//0x 56         (  1) = Country
//0x 57         (  1) = Region
//0x 58 - 0x 66 ( 15) = Color code indexes
//0x 67         (  1) = "color" (probably a lookup for most prevalent color?)
//0x 68         (  1) = "looks" (probably a lookup for "quality"? Seems to always be 0x0A or 0x00)
//0x 69         (  1) = Pattern type (see below)
//0x 6A - 0x 6B (  2) = Zero padding(?)
//0x 6C - 0x26B (512) = Pattern Data 1 (mandatory)
//0x26C - 0x46B (512) = Pattern Data 2 (optional)
//0x46C - 0x66B (512) = Pattern Data 3 (optional)
//0x66C - 0x86B (512) = Pattern Data 4 (optional)
//0x86C - 0x86F (  4) = Zero padding
//
// Pattern types:
// 0x00 = Fullsleeve dress (pro)
// 0x01 = Halfsleeve dress (pro)
// 0x02 = Sleeveless dress (pro)
// 0x03 = Fullsleeve shirt (pro)
// 0x04 = Halfsleeve shirt (pro)
// 0x05 = Sleeveless shirt (pro)
// 0x06 = Hat with horns
// 0x07 = Hat
// 0x08 = Standee (pro)
// 0x09 = Plain pattern (easel)
// 0x0A = unknown (non-pro)
// 0x0B = unknown (non-pro)

// janked types with optional because
// typescript getters & setters won't allow for different types
// https://github.com/microsoft/TypeScript/issues/2521
type Designer = {
  id?: number;
  name?: string;
  isMale?: boolean;
};

type Town = {
  id?: number;
  name?: string;
};

type Palette = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const propertyConfig =  {
  enumerable: true,
  configurable: false
};

class ACNL {
  protected _title: string = "Empty";
  protected _designer: Designer = {
    id: 0,
    name: "Unknown",
    isMale: false
  };
  protected _town: Town = {
    id: 0,
    name: "Unknown"
  };
  protected _langage;
  protected _country;
  protected _region;
  protected _patternType: number = 9;
  protected _palette: Palette = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  protected _pixels = new Uint16Array();
  public constructor() {
  }

  // PUBLIC API
  public get title (): string {
    return this._title;
  }

  public set title(title) {
    if (title == null) return;
    if (typeof title !== "string") return;
    this._title = title.slice(0, 21);
  }


  public set town(town: {
    id?: number,
    name?: string,
  }) {
    // no undefined values (null still possible)
    let {
      id = this._designer.id,
      name = this._designer.name,
    } = town;
    let valid = {};
    // truncate/transform/ensure valid values
    if (typeof id === "number") {
      valid = { ...valid, id };
    }
    if (typeof name === "string") {
      name = name.slice(0, 9);
      valid = { ...valid, name };
    }
    // update
    this._designer = {
      ...this._designer,
      ...valid
     };
  }

  public get town(): Town {
    const api = {};
    Object.defineProperties(api, {
      id: {
        ...propertyConfig,
        get: (): number => this._town.id,
        set: (id: number) => this.town = { id, },
      },
      name: {
        ...propertyConfig,
        get: (): string => this._town.name,
        set: (name: string) => this.town = { name, },
      },
    });
    return <Town> api;
  }

  public set designer(designer: Designer) {
    // no undefined values (null still possible)
    let {
      id = this._designer.id,
      name = this._designer.name,
      isMale = this._designer.isMale,
    } = designer;
    let valid = {};
    // truncate/transform/ensure valid values
    if (typeof id === "number") {
      valid = { ...valid, id };
    }
    if (typeof name === "string") {
      name = name.slice(0, 9);
      valid = { ...valid, name };
    }
    if (typeof isMale === "boolean") {
      valid = { ...valid, isMale };
    }
    // update
    this._designer = {
      ...this._designer,
      ...valid
     };
  }

  public get designer(): Designer {
    const api = {};
    Object.defineProperties(api, {
      id: {
        ...propertyConfig,
        get: (): number => this._designer.id,
        set: (id: number) => this.designer = { id },
      },
      name: {
        ...propertyConfig,
        get: (): string => this._designer.name,
        set: (name: string) => this.designer = { name },
      },
      isMale: {
        ...propertyConfig,
        get: (): boolean => this._designer.isMale,
        set: (isMale: boolean) => this.designer = { isMale },
      },
    });
    return <Designer> api;
  }


  set palette(palette) {
    this._palette = palette;
  }

  get palette() {
    return this._palette;
  }


  fromBinary() {
    // decode everything
  }

  toBinary() {
    // encode everything
  }
}

let acnl = new ACNL();
const id = 1;
acnl.designer = { id };

export default ACNL;