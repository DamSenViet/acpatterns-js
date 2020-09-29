import model from "./model";
import mBodyNormal from "./mBodyNormal";
import mReFrabicMix from "./mReFabricMix";

export default {
  targetMaterialId: "mReFabric",
  model,
  useClothingStand: false,
  maps: {
    normal: {
      "mBody": mBodyNormal,
    },
    mix: {
      "mReFrabric": mReFrabicMix,
    },
  }
};