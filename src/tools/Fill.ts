import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface FillOptions {
}


/**
 * A fill tool.
 */
class Fill extends Tool {
  /**
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

  /**
   * The last sourceX passed over.
   */
  protected _lastSourceX: number = null;

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
   * Creates a Fill instance.
   * @param options - a config object
   */
  public constructor(options?: FillOptions) {
    super();
    if (arguments.length <= 0) return;
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
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _indicate(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this._indicateCursor(targetSourceY, targetSourceX);
    this._indicateFillArea(targetSourceY, targetSourceX);
  }


  /**
   * Draws the cursor preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _indicateCursor(
    sourceY: number,
    sourceX: number,
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
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX  - the x coordinate of the source
   */
  protected _indicateFillArea(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    const paletteIndexToReplace = this._source.unreactive[targetSourceY][targetSourceX];
    if (paletteIndexToReplace === this._paletteIndex) return;
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this._indicatorContext.fillStyle = this._pattern.palette[this._paletteIndex];
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceY, sourceX] = <[number, number]>JSON.parse(sourcePoints[i]);
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
   * @param targetSourceY - the y component of the source coordinate
   * @param targetSourceX - the x component of the source coordinate
   */
  protected _computeLastSourcePointJSONSet(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this._lastSourcePointJSONSet.clear();
    const paletteIndexToReplace = this._source.unreactive[targetSourceY][targetSourceX];
    this._computeLastSourcePointJSONSetHelper(targetSourceY, targetSourceX, paletteIndexToReplace);
  }


  /**
   * Helper for _computeLastSourcePointJSONSet. Flood-fill Algorithm.
   * @param sourceY - the y component of the source coordinate
   * @param sourceX - the x component of the source coordinate
   * @param target - the paletteIndex to replace
   */
  protected _computeLastSourcePointJSONSetHelper(
    sourceY: number,
    sourceX: number,
    target: paletteIndex,
  ): void {
    if (!this.isValidSourceYX(sourceY, sourceX)) return;
    const jsonSourcePoint = JSON.stringify([sourceY, sourceX]);
    if (this._lastSourcePointJSONSet.has(jsonSourcePoint)) return;
    else if (this._source.unreactive[sourceY][sourceX] !== target) return;
    this._lastSourcePointJSONSet.add(JSON.stringify([sourceY, sourceX]));
    this._computeLastSourcePointJSONSetHelper(
      sourceY - 1,
      sourceX,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceY + 1,
      sourceX,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceY,
      sourceX - 1,
      target,
    );
    this._computeLastSourcePointJSONSetHelper(
      sourceY,
      sourceX + 1,
      target,
    );
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param targetSourceY - y coordinate in source
   * @param targetSourceX - x coordinate in source
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this._computeLastSourcePointJSONSet(targetSourceY, targetSourceX);
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this._indicatorContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceY, sourceX] = <[number, number]>JSON.parse(sourcePoints[i]);
      this._source.unreactive[sourceY][sourceX] = this._paletteIndex;
    }
    this._pattern.hooks.refresh.trigger();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelY = pixelPoint[0];
    const targetPixelX = pixelPoint[1];
    if (
      this._lastPixelY === targetPixelY &&
      this._lastPixelX === targetPixelX
    ) return;
    this._lastPixelY = targetPixelY;
    this._lastPixelX = targetPixelX;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    if (
      this._lastSourceY === targetSourceY &&
      this._lastSourceX === targetSourceX
    ) return;

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;
    this._didDrawOnLastSource = false;

    // coordinates have changed, recompute the cluster
    if (
      !this._lastSourcePointJSONSet.has(JSON.stringify([
        targetSourceY,
        targetSourceX,
      ]))
    ) this._computeLastSourcePointJSONSet(targetSourceY, targetSourceX);

    if (this._indicator) {
      this._refreshIndicator();
      this._indicate(targetSourceY, targetSourceX);
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
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceY, targetSourceX);
    }

    this._pixels(targetSourceY, targetSourceX);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._lastSourcePointJSONSet.clear();
    this._lastPixelY = null;
    this._lastPixelX = null;
    this._lastSourceY = null;
    this._lastSourceX = null;
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