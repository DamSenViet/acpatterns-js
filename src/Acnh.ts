import Enum from "./Enum";
import Hook from "./Hook";
import {
  byte,
  color,
  pixel,
} from "./utils";

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
// Tip, Band, Brim
// Brimmed cap
// FrontCrown, BackCrown, Brim

type Designer = {
  id?: number;
  name?: string;
  isFemale?: boolean;
};

type Island = {
  id?: number;
  name?: string;
};

class ACNH {
  private _title: string = "Empty";
  private _island: Island = {
    id: 0,
    name: "Unknown"
  };
  private _islandApi: Island = null;

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
  private _paletteApi: color[][] = null;

  private _pixels: pixel[][] = new Array(15).fill(15).map(() => {
    return new Array(32).fill(15);
  });


  public constructor() {


  }
}

export default ACNH;