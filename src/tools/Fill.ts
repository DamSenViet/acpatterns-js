import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface FillOptions {
}


/**
 * A fill tool.
 */
class Fill extends Tool {
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
   * Flag to determine whether to highlight fill area.
   */
  protected _fillArea: boolean = true;

  /**
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Creates a Bucket instance.
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
    const jsonSourcePointSet = new Set<string>();
    this._previewFillAreaHelper(targetSourceY, targetSourceX, paletteIndexToReplace, jsonSourcePointSet);
    const sourcePoints = [...jsonSourcePointSet.values()].map(v => <[number, number]>JSON.parse(v));
    this.previewContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    for (let i = 0; i < sourcePoints.length; ++i) {
      const [sourceY, sourceX] = sourcePoints[i];
      this.previewContext.fillRect(
        (this.measurements.pixelXStart + sourceX) * this.measurements.pixelSize,
        (this.measurements.pixelYStart + sourceY) * this.measurements.pixelSize,
        this.measurements.pixelSize,
        this.measurements.pixelSize,
      );
    }
  }


  /**
   * Recursive helper for _previewFillArea. Flood-fill Algorithm.
   * @param sourceY - the y component of the source coordinate
   * @param sourceX - the x component of the source coordinate
   * @param target - the paletteIndex to replace
   * @param jsonSourcePointSet - the set of json strings contains source coordinates
   */
  protected _previewFillAreaHelper(
    sourceY: number,
    sourceX: number,
    target: paletteIndex,
    jsonSourcePointSet: Set<string>,
  ): void {
    if (!this.isValidSourceYX(sourceY, sourceX)) return;
    const jsonSourcePoint = JSON.stringify([sourceY, sourceX]);
    if (jsonSourcePointSet.has(jsonSourcePoint)) return;
    else if (this.source.unreactive[sourceY][sourceX] !== target) return;
    jsonSourcePointSet.add(JSON.stringify([sourceY, sourceX]));
    this._previewFillAreaHelper(sourceY - 1, sourceX, target, jsonSourcePointSet);
    this._previewFillAreaHelper(sourceY + 1, sourceX, target, jsonSourcePointSet);
    this._previewFillAreaHelper(sourceY, sourceX - 1, target, jsonSourcePointSet);
    this._previewFillAreaHelper(sourceY, sourceX + 1, target, jsonSourcePointSet);
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
    const paletteIndexToReplace = this.source.unreactive[targetSourceY][targetSourceX];
    this._pixelsHelper(targetSourceY, targetSourceX, paletteIndexToReplace);
    this.forceRefresh();
  }


  /**
   * Recursive helper for _pixels. Flood-fill Algorithm.
   * @param sourceY - the y component of the source coordinate
   * @param sourceX - the x component of the source coordinate
   * @param target - the paletteIndex to replace
   * @param replacement - the paletteIndex to replace it with
   */
  protected _pixelsHelper(
    sourceY: number,
    sourceX: number,
    target: paletteIndex,
    replacement: paletteIndex = this._paletteIndex,
  ): void {
    if (!this.isValidSourceYX(sourceY, sourceX)) return;
    if (target === replacement) return;
    else if (this.source.unreactive[sourceY][sourceX] !== target) return;
    else this.source.unreactive[sourceY][sourceX] = replacement;
    this._pixelsHelper(sourceY - 1, sourceX, target);
    this._pixelsHelper(sourceY + 1, sourceX, target);
    this._pixelsHelper(sourceY, sourceX - 1, target);
    this._pixelsHelper(sourceY, sourceX + 1, target);
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const targetSourceY = yx[0];
    const targetSourceX = yx[1];

    if (
      this._lastSourceY === targetSourceY &&
      this._lastSourceX === targetSourceX
    ) return;

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;
    this._didDrawOnLastSource = false;

    if (this.preview) {
      this.refreshPreview();
      if (this._fillArea) this._previewFillArea(targetSourceY, targetSourceX);
      this._previewCursor(targetSourceY, targetSourceX);
      requestAnimationFrame(this.redraw);
    }
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const targetSourceY = yx[0];
    const targetSourceX = yx[1];

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
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
  }
}

export default Fill;