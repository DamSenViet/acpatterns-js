import PixelsSource from "../PixelsSource";
import { DrawerMeasurements } from "../Drawer";

class Tool {
  public preview(
    source: PixelsSource,
    sourceY: number,
    sourceX: number,
    previewContext: CanvasRenderingContext2D,
    measurements: DrawerMeasurements,
  ): void {}

  public draw(
    source: PixelsSource,
    sourceY: number,
    sourceX: number,
    previewContext: CanvasRenderingContext2D,
    measurements: DrawerMeasurements,
    refresh: () => void,
  ): void {}
}

export default Tool;