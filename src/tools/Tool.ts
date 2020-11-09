import AcPattern from "./../AcPattern";
import PixelsSource from "./../PixelsSource";
import Drawer, { DrawerMeasurements } from "./../Drawer";

export const defaultFillStyle = "rgba(50, 250, 234, 0.6)";
export const defaultStrokeStyle = "#00d2c2";

/**
 * Base class for drawing Tools used by Drawer.
 * Simulates a nested class since TypeScript doesn't allow.
 */
class Tool {
  /**
   * The drawer that uses the tool.
   */
  private _drawer: Drawer = null;

  // access simulation of a nested class
  protected get _canvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._canvas;
  }

  protected get _context(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._context;
  }

  protected get _pattern(): AcPattern {
    // @ts-ignore
    return this._drawer._pattern;
  }

  protected get _measurements(): Readonly<DrawerMeasurements> {
    // @ts-ignore
    return this._drawer._measurements;
  }

  protected get _source(): PixelsSource {
    // @ts-ignore
    return this._drawer.source;
  }

  protected get _pixelsCanvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._pixelsCanvas;
  }

  protected get _pixelsContext(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._pixelsContext;
  }

  protected get _textureCanvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._textureCanvas;
  }

  protected get _textureContext(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._textureContext;
  }

  protected get _gridCanvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._gridCanvas;
  }

  protected get _gridContext(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._gridContext;
  }

  protected get _indicatorCanvas(): HTMLCanvasElement {
    // @ts-ignore
    return this._drawer._indicatorCanvas;
  }

  protected get _indicatorContext(): CanvasRenderingContext2D {
    // @ts-ignore
    return this._drawer._indicatorContext;
  }

  protected get _grid(): boolean {
    // @ts-ignore
    return this._drawer._grid;
  }

  protected get _indicator(): boolean {
    // @ts-ignore
    return this._drawer._indicator;
  }

  protected get _pixelFilter(): boolean {
    // @ts-ignore
    return this._drawer._pixelFilter;
  }

  protected get _refreshIndicator(): () => void {
    // @ts-ignore
    return this._drawer._refreshIndicator;
  }

  protected get _redraw(): () => void {
    // @ts-ignore
    return this._drawer._redraw;
  };

  /**
   * Instantiates a tool.
   */
  public constructor() { };

  /**
   * Gets the drawer.
   */
  public get drawer(): Drawer {
    return this._drawer;
  }

  /**
   * Sets the drawer.
   */
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


  /**
   * Calculates pixel coordinates from pixel grid on canvas.
   * @param mouseEvent - the mouse event to calculate from
   * @returns - an array containg [sourceY, sourceX]
   */
  protected mouseEventToPixelPoint(mouseEvent: MouseEvent): [number, number] {
    const bdr = this._canvas.getBoundingClientRect();

    // need to convert pixelSize to POST-CSS value
    const pixelX = Math.floor(
      (mouseEvent.clientX - bdr.left) /
      (bdr.width / this._measurements.pixelGridSize) // POST-CSS pixelSize
    );

    const pixelY = Math.floor(
      (mouseEvent.clientY - bdr.top) /
      (bdr.height / this._measurements.pixelGridSize) // POST-CSS pixelSize
    );

    return [pixelX, pixelY];
  }


  /**
   * Computes the source point from a pixel point.
   * @returns - null when pixelPoint not in range to be converted to a source point
   */
  protected pixelPointToSourcePoint(pixelPoint: [number, number]): [number, number] {
    const pixelX = pixelPoint[0];
    const pixelY = pixelPoint[1];

    if (
      pixelX < this._measurements.pixelXStart ||
      pixelX > this._measurements.pixelXStop - 1
    ) return null;

    if (
      pixelY < this._measurements.pixelYStart ||
      pixelY > this._measurements.pixelYStop - 1
    ) return null;

    const sourceX = pixelX - this._measurements.pixelXStart;
    const sourceY = pixelY - this._measurements.pixelYStart;
    return [sourceX, sourceY];
  }


  /**
   * Helper to determine whether or not the y, x values are valid to access.
   * @param sourceX - the x component of the source coordinate to validate
   * @param sourceY - the y component of the source coordinate to validate
   */
  protected isValidSourceXY(sourceX: number, sourceY: number): boolean {
    if (sourceX >= this._measurements.sourceWidth || sourceX < 0)
      return false;
    if (sourceY >= this._measurements.sourceHeight || sourceY < 0)
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