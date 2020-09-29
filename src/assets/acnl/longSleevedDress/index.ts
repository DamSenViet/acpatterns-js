import model from "./model";
import mTopsNormal from "./mTopsNormal";

export default {
  targetMaterialId: "mTops.006",
  model,
  // maps for ANY material, with kind of map specified
  // a type of map is specified via materialId: url
  useClothingStand: true,
  maps: {
    normal: {
      "mTops.006": mTopsNormal,
    }
  }
};