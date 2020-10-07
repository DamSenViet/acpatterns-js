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
  protected _preview(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this._previewCursor(targetSourceY, targetSourceX);
    this._previewFillArea(targetSourceY, targetSourceX);
  }


  /**
   * Draws the cursor preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _previewCursor(
    sourceY: number,
    sourceX: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number = sourceX;
    let topLeftSourceY: number = sourceY;

    this.previewContext.beginPath();
    // top left
    this.previewContext.moveTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // top right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + 1) * this.measurements.pixelSize, this.measurements.xStop),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // bottom right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + 1) * this.measurements.pixelSize, this.measurements.xStop),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + 1) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // bottom left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + 1) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // back to top left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    this.previewContext.stroke();
  }


  /**
   * Draws an overlay on the entire fill area.
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX  - the x coordinate of the source
   */
  protected _previewFillArea(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    const paletteIndexToReplace = this.source.unreactive[targetSourceY][targetSourceX];
    if (paletteIndexToReplace === this._paletteIndex) return;
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this.previewContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceY, sourceX] = <[number, number]>JSON.parse(sourcePoints[i]);
      this.previewContext.fillRect(
        (this.measurements.pixelXStart + sourceX) * this.measurements.pixelSize,
        (this.measurements.pixelYStart + sourceY) * this.measurements.pixelSize,
        this.measurements.pixelSize,
        this.measurements.pixelSize,
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
    const paletteIndexToReplace = this.source.unreactive[targetSourceY][targetSourceX];
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
    else if (this.source.unreactive[sourceY][sourceX] !== target) return;
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
   * @param targetSourceY - the y coordinate of the source target
   * @param targetSourceX - the x coordinate of the source target
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    const sourcePoints = [...this._lastSourcePointJSONSet.values()];
    this.previewContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceY, sourceX] = <[number, number]>JSON.parse(sourcePoints[i]);
      this.source.unreactive[sourceY][sourceX] = this._paletteIndex;
    }
    this.forceRefresh();
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

    if (this.preview) {
      this.refreshPreview();
      this._preview(targetSourceY, targetSourceX);
      requestAnimationFrame(this.redraw);
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

    if (this.preview) {
      this.refreshPreview();
      this._previewCursor(targetSourceY, targetSourceX);
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
    this.refreshPreview();
    requestAnimationFrame(this.redraw);
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Fill;