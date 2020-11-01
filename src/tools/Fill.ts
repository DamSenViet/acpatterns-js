import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface FillOptions {
  paletteIndex?: paletteIndex;
};


/**
 * A fill tool.
 */
class Fill extends Tool {
  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

  /**
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last sourceX passed over.
   */
  protected _lastSourceX: number = null;

  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

  /**
   * Flag to reduce drawing operations.
   */
  protected _didDrawOnLastSource: boolean = false;

  /**
   * Holds the last set of area of points that can be filled.
   * Stores a bunch of these (JSON.stringify([sourceY, sourceX]));
   */
  protected _lastSourcePointJSONSet: Set<string> = new Set<string>();

  /**
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Instantiates a Fill tool.
   * @param options - a config object
   */
  public constructor(options?: FillOptions) {
    super();
    if (arguments.length <= 0) return;
    const { paletteIndex } = options;
    if (paletteIndex != null) this.paletteIndex = paletteIndex;
  }


  /**
   * Gets the palette pointer of the bucket.
   */
  public get paletteIndex(): number {
    return this._paletteIndex;
  }


  /**
   * Sets the palette pointer of the bucket.
   */
  public set paletteIndex(paletteIndex: number) {
    if (typeof paletteIndex !== "number") {
      throw new TypeError();
    }
    this._paletteIndex = paletteIndex;
  };


  /**
   * Draws the preview/indicator.
   * @param targetSourceX - the x coordinate of the source
   * @param targetSourceY - the y coordinate of the source
   */
  protected _indicate(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    this._indicateCursor(targetSourceX, targetSourceY);
    this._indicateFillArea(targetSourceX, targetSourceY);
  }


  /**
   * Draws the cursor preview/indicator.
   * @param sourceX - the x coordinate of the source
   * @param sourceY - the y coordinate of the source
   */
  protected _indicateCursor(
    sourceX: number,
    sourceY: number,
  ): void {
    this._indicatorContext.strokeStyle = "#00d2c2";
    this._indicatorContext.lineWidth = Math.ceil(this._measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number = sourceX;
    let topLeftSourceY: number = sourceY;

    this._indicatorContext.beginPath();
    // top left
    this._indicatorContext.moveTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // top right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + 1) * this._measurements.pixelSize, this._measurements.xStop),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // bottom right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + 1) * this._measurements.pixelSize, this._measurements.xStop),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + 1) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // bottom left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + 1) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // back to top left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    this._indicatorContext.stroke();
  }


  /**
   * Draws an overlay on the entire fill area.
   * @param targetSourceX  - the x coordinate of the source
   * @param targetSourceY - the y coordinate of the source
   */
  protected _indicateFillArea(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    const paletteIndexToReplace = this._source.unreactive[targetSourceX][targetSourceY];
    if (paletteIndexToReplace === this._paletteIndex) return;
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this._indicatorContext.fillStyle = this._pattern.palette[this._paletteIndex];
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceX, sourceY] = <[number, number]>JSON.parse(sourcePoints[i]);
      this._indicatorContext.fillRect(
        (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
        (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
        this._measurements.pixelSize,
        this._measurements.pixelSize,
      );
    }
  }


  /**
   * Recomputes _lastSourcePointJSONSet.
   * @param targetSourceX - the x component of the source coordinate
   * @param targetSourceY - the y component of the source coordinate
   */
  protected _computeLastSourcePointJSONSet(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    this._lastSourcePointJSONSet.clear();
    const paletteIndexToReplace = this._source.unreactive[targetSourceX][targetSourceY];
    this._computeLastSourcePointJSONSetHelper(targetSourceX, targetSourceY, paletteIndexToReplace);
  }


  /**
   * Helper for _computeLastSourcePointJSONSet. Flood-fill Algorithm.
   * @param sourceX - the x component of the source coordinate
   * @param sourceY - the y component of the source coordinate
   * @param target - the paletteIndex to replace
   */
  protected _computeLastSourcePointJSONSetHelper(
    sourceX: number,
    sourceY: number,
    target: paletteIndex,
  ): void {
    if (!this.isValidSourceXY(sourceX, sourceY)) return;
    const jsonSourcePoint = JSON.stringify([sourceX, sourceY]);
    if (this._lastSourcePointJSONSet.has(jsonSourcePoint)) return;
    else if (this._source.unreactive[sourceX][sourceY] !== target) return;
    this._lastSourcePointJSONSet.add(JSON.stringify([sourceX, sourceY]));
    this._computeLastSourcePointJSONSetHelper(
      sourceX,
      sourceY - 1,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceX,
      sourceY + 1,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceX - 1,
      sourceY,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceX + 1,
      sourceY,
      target,
    );
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param targetSourceX - x coordinate in source
   * @param targetSourceY - y coordinate in source
   */
  protected _pixels(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    this._computeLastSourcePointJSONSet(targetSourceX, targetSourceY);
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this._indicatorContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceX, sourceY] = <[number, number]>JSON.parse(sourcePoints[i]);
      this._source.unreactive[sourceX][sourceY] = this._paletteIndex;
    }
    this._pattern.hooks.refresh.trigger();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelX = pixelPoint[0];
    const targetPixelY = pixelPoint[1];
    if (
      this._lastPixelX === targetPixelX &&
      this._lastPixelY === targetPixelY
    ) return;
    this._lastPixelX = targetPixelX;
    this._lastPixelY = targetPixelY;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    if (
      this._lastSourceX === targetSourceX &&
      this._lastSourceY === targetSourceY
    ) return;

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;
    this._didDrawOnLastSource = false;

    // coordinates have changed, recompute the cluster
    if (
      !this._lastSourcePointJSONSet.has(JSON.stringify([
        targetSourceX,
        targetSourceY,
      ]))
    ) this._computeLastSourcePointJSONSet(targetSourceX, targetSourceY);

    if (this._indicator) {
      this._refreshIndicator();
      this._indicate(targetSourceX, targetSourceY);
      requestAnimationFrame(this._redraw);
    }
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) return;
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceX, targetSourceY);
    }

    this._pixels(targetSourceX, targetSourceY);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._lastSourcePointJSONSet.clear();
    this._lastPixelX = null;
    this._lastPixelY = null;
    this._lastSourceX = null;
    this._lastSourceY = null;
    this._refreshIndicator();
    requestAnimationFrame(this._redraw);
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this._canvas.addEventListener("mousemove", this._onMouseMove);
    this._canvas.addEventListener("mousedown", this._onMouseDown);
    this._canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this._canvas.removeEventListener("mousemove", this._onMouseMove);
    this._canvas.removeEventListener("mousedown", this._onMouseDown);
    this._canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Fill;