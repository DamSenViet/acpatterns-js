import {
  color,
  pixel,
} from "./utils";
import HookableArray from "./HookableArray";

// default to target mapping (e.g. how you would want x/y), used to produce target mapping
// x/y fed from default

// desired x/y interface to default coordinates, used to produce interface in pixels
// interfaces not default should be multiples of 32 or 64
export type mapping = Array<Array<[pixel, pixel]>>;
export interface PatternType {
  name: string;
  size: number; // how many rows there are, default is 32x by 128y
  sections: {
    texture: mapping;
    // [key: string]: mapping;
  }; // sections used to explain
  // 32 bit numbers only
  mask?: number[];
}
export interface Drawable {
  type: PatternType;
  palette: color[];
  pixels: pixel[][];
  sections: { [key: string]: HookableArray<Array<pixel>> };
};