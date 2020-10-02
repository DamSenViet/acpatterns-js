import PixelsSource from "../PixelsSource";
import Drawer, { DrawerMeasurements } from "../Drawer";


/**
 * Base class for drawing Tools used by Drawer.
 */
class Tool {

  /**
   * Callback for after modifying an unreactive part of a PixelsSource.
   */
  private _drawer: Drawer = null;

  /**
   * Creates a Tool instance.
   */
  public constructor() { };

  protected get canvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._canvas;
  }

  protected get measurements(): Readonly<DrawerMeasurements> {
    // @ts-ignore
    return this._drawer._measurements;
  }

  protected get source(): PixelsSource {
    // @ts-ignore
    return this._drawer._source;
  }

  protected get previewContext(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._previewContext;
  }

  protected get refreshPreview(): () => void {
    // @ts-ignore
    return this._drawer._refreshPreview;
  }

  protected get forceRefresh(): () => void {
    // @ts-ignore
    return this._drawer._forceRefresh;
  }

  protected get preview(): boolean {
    // @ts-ignore
    return this._drawer._preview;
  }

  protected get redraw(): () => void {
    // @ts-ignore
    return this._drawer._redraw;
  };

  /**
   * Calculates pixel coordinates from pixel grid on canvas.
   * @param mouseEvent - the mouse event to calculate from
   * @returns - an array containg [sourceY, sourceX]
   */
  public mouseEventToSourceYX(mouseEvent: MouseEvent): [number, number] {
    const bdr = this.canvas.getBoundingClientRect();

    // need to convert pixelSize to POST-CSS value
    const pixelY = Math.floor(
      (mouseEvent.clientY - bdr.top) /
      (bdr.height / this.measurements.pixelGridSize) // POST-CSS pixelSize
    );
    const pixelX = Math.floor(
      (mouseEvent.clientX - bdr.left) /
      (bdr.width / this.measurements.pixelGridSize) // POST-CSS pixelSize
    );

    if (
      pixelY < this.measurements.pixelYStart ||
      pixelY > this.measurements.pixelYStop - 1
    ) return null;

    if (
      pixelX < this.measurements.pixelXStart ||
      pixelX > this.measurements.pixelXStop - 1
    ) return null;

    const sourceY = pixelY - this.measurements.pixelYStart;
    const sourceX = pixelX - this.measurements.pixelXStart;
    return [sourceY, sourceX];
  }


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void { }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void { }
}

export default Tool;