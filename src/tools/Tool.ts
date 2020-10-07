import PixelsSource from "../PixelsSource";
import Drawer, { DrawerMeasurements } from "../Drawer";
import Drawable from "../Drawable";


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


  public get drawer(): Drawer {
    return this._drawer;
  }


  public set drawer(drawer: Drawer) {
    if (drawer == null) {
      this.unmount();
      this._drawer = drawer;
    }
    else if (!(drawer instanceof Drawer)) {
      const message = `Expected an instance of Drawer.`
      throw new TypeError(message);
    }
    else {
      this._drawer = drawer;
      this.mount();
    }
  };


  protected get canvas(): HTMLCanvasElement {
    return this._drawer.canvas;
  }


  protected get pattern(): Drawable {
    return this._drawer.pattern;
  }


  protected get measurements(): Readonly<DrawerMeasurements> {
    return this._drawer.measurements;
  }


  protected get source(): PixelsSource {
    return this._drawer.source;
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
  protected mouseEventToPixelPoint(mouseEvent: MouseEvent): [number, number] {
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

    return [pixelY, pixelX];
  }


  /**
   * Computes the source point from a pixel point.
   * @returns - null when pixelPoint not in range to be converted to a source point
   */
  protected pixelPointToSourcePoint(pixelPoint: [number, number]): [number, number] {
    const pixelY = pixelPoint[0];
    const pixelX = pixelPoint[1];
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
   * Helper to determine whether or not the y, x values are valid to access.
   * @param sourceY - the y component of the source coordinate to validate
   * @param sourceX - the x component of the source coordinate to validate
   */
  protected isValidSourceYX(sourceY: number, sourceX: number): boolean {
    if (sourceY >= this.measurements.sourceHeight || sourceY < 0)
      return false;
    if (sourceX >= this.measurements.sourceWidth || sourceX < 0)
      return false;
    return true;
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