import { mapping } from "./utils";

interface PatternType {
  name: string;
  size: number; // how many rows there are, default is 32x by 128y
  sections: {
    texture: mapping;
    [key: string]: mapping;
  };
  // 32 bit numbers only
  mask?: number[];
};

export default PatternType;