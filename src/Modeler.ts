import Acnl from "./formats/Acnl";
import PixelsSource from "./PixelsSource";
import PatternType from "./PatternType";
import Modelable, {
  isInstanceofModelable
} from "./Modelable";
import {
  color,
  paletteIndex,
} from "./utils";
import { IllegalStateError } from "./errors";
import {
  Engine,
  Scene,
  SceneLoader,
  DynamicTexture,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Color4,
  Mesh,
  Vector3,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  AssetContainer,
} from "babylonjs";
import "babylonjs-loaders";
import assets from "./assets";
import xbrz from "./xbrz";


export interface ModelData {
  // url
  // the name of the material to NOT freeze
  targetMaterialId: string,
  model: string,
  useClothingStand: boolean,
  maps?: {
    normal?: {
      [key: string]: string;
    },
    mix?: {
      [key: string]: string;
    };
  }
};

/**
 * Mapping from model types to model data.
 */
const patternTypeToModelData = new Map<PatternType, ModelData>();
patternTypeToModelData.set(Acnl.types.LongSleevedDress, assets.acnl.longSleevedDress);
patternTypeToModelData.set(Acnl.types.ShortSleevedDress, assets.acnl.shortSleevedDress);
patternTypeToModelData.set(Acnl.types.NoSleevedDress, assets.acnl.noSleevedDress);
patternTypeToModelData.set(Acnl.types.LongSleevedShirt, assets.acnl.longSleevedShirt);
patternTypeToModelData.set(Acnl.types.ShortSleevedShirt, assets.acnl.shortSleevedShirt);
patternTypeToModelData.set(Acnl.types.NoSleevedShirt, assets.acnl.noSleevedShirt);
patternTypeToModelData.set(Acnl.types.HornedHat, assets.acnl.hornedHat);
patternTypeToModelData.set(Acnl.types.KnittedHat, assets.acnl.knittedHat);
patternTypeToModelData.set(Acnl.types.Standee, assets.acnl.standee);
patternTypeToModelData.set(Acnl.types.Standard, assets.acnl.standard);


/**
 * Modeler constructor options.
 */
export interface ModelerOptions {
  pattern: Modelable;
  canvas: HTMLCanvasElement;
};

/**
 * Cached Modeler measurements.
 */
export interface ModelerMeasurements {
  sourceHeight: number;
  sourceWidth: number;
  textureHeight: number;
  textureWidth: number;
};


enum ModelerStates {
  PLAYING,
  PAUSED,
  DISPOSED,
};

/**
 * Renders a Drawable Pattern on a model.
 * Reacts to changes to the pattern by default.
 */
class Modeler {

  /**
   * The possible states the Modeler can be in.
   */
  public static states = ModelerStates;

  /**
   * The canvas to render the model on.
   */
  private _canvas: HTMLCanvasElement = null;

  /**
   * The pattern to texture the model with.
   */
  private _pattern: Modelable = null;

  /**
   * Cached pixels source from the pattern.
   */
  private _source: PixelsSource = null;

  /**
   * The canvas to render the pattern onto.
   */
  private _pixelsCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of the _pixelsCanvas.
   */
  private _pixelsContext: CanvasRenderingContext2D = this._pixelsCanvas.getContext("2d", { alpha: false, });

  /**
   * The canvas to render the post-processed pixelsCanvas onto. Textures model.
   */
  private _textureCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of the _textureCanvas.
   */
  private _textureContext: CanvasRenderingContext2D = this._textureCanvas.getContext("2d", { alpha: false, });

  /**
   * Cached measurements needed to speed up rendering and calculations for _pixelsCanvas.
   */
  private _measurements: ModelerMeasurements = {
    sourceHeight: null,
    sourceWidth: null,
    textureHeight: null,
    textureWidth: null,
  };

  /**
   * The babylonjs engine.
   */
  private _engine: Engine = null;

  /**
   * The babylonjs scene.
   */
  private _scene: Scene = null;

  /**
   * The babylonjs texture object.
   */
  private _texture: DynamicTexture = null;

  /**
   * The babylonjs camera pov for the scene.
   */
  private _camera: ArcRotateCamera = null;

  /**
   * The hemispheric lighting for the scene.
   */
  private _hemisphericLight: HemisphericLight = null;

  /**
   * The directional lighting for the scene.
   */
  private _directionalLight: DirectionalLight = null;

  /**
   * Container for meshes that change depending on PatternType
   */
  private _loadedContainer: AssetContainer = null;

  /**
   * Container for clothing stand for patterns that need it.
   */
  private _clothingStandContainer: AssetContainer = null;


  /**
   * A flag to detect when the scene is setup.
   */
  private _isSetup: boolean = false;


  /**
   * To end the loading process.
   */
  private _endLoadingSignal: (value?: void) => void = null;

  /**
   * For queueing loading assets. Helps prevents resources from merging.
   */
  private _loadingSignal: Promise<void> = new Promise((resolve) => {
    this._endLoadingSignal = resolve;
  });


  /**
   * The queue to update and block the loading pipeline.
   */
  private _loadingQueue: Array<PatternType> = new Array<PatternType>();

  /**
   * Whether pixel filtering is used on the model texture.
   * If turned on, will incur a large performance cost.
   */
  private _pixelFilter = false;

  /**
   * Modeler reactive state.
   */
  private _state = ModelerStates.PLAYING;


  /**
   * Instantiates a Modeler.
   * @param options - A configuration Object with a 'canvas' and 'pattern'
   */
  public constructor(options: ModelerOptions) {
    if (options == null) {
      const message = `Expected a configuration object with required fields.`;
      throw new TypeError(message);
    }
    const { canvas, pattern } = options;
    if (
      pattern == null ||
      !(isInstanceofModelable(pattern))
    ) {
      const message = `Expected an instance of a Drawable pattern.`;
      throw new TypeError(message);
    }
    if (
      canvas == null ||
      !(canvas instanceof HTMLCanvasElement)
    ) {
      const message = `Expected an instance of an HTMLCanvasElement.`;
      throw new TypeError(message);
    }
    this._canvas = canvas;
    this._pattern = pattern;
    this._source = pattern.sections.texture;

    this._updateMeasurements();
    this._refreshPixels();
  }


  /**
   * Sets up the initial babylonjs scene and renders it.
   */
  private async _setupScene(): Promise<void> {
    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);
    this._scene.clearColor = new Color4(0, 0, 0, 0);
    this._scene.ambientColor = Color3.White();

    this._camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2.5, Math.PI / 2, 40,
      new Vector3(0, 8, 0),
      this._scene
    );
    this._camera.upperRadiusLimit = 70;
    this._camera.lowerRadiusLimit = 15;
    this._camera.upperBetaLimit = Math.PI / 2;
    this._camera.lowerBetaLimit = Math.PI / 2;
    this._camera.attachControl(this._canvas, false);

    this._scene.createDefaultEnvironment({
      groundSize: 50,
      skyboxSize: 50,
      groundColor: new Color3(1, 1, 1),
      skyboxColor: new Color3(1, 1, 1),
    });
    // keep reflections but don't render them
    this._scene.getMeshByID("BackgroundPlane").isVisible = false;
    this._scene.getMeshByID("BackgroundSkybox").isVisible = false;

    this._hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(1, 0, 3).normalize(),
      this._scene,
    );
    this._hemisphericLight.intensity = 3;

    this._directionalLight = new DirectionalLight(
      "directionalLightU",
      new Vector3(0, -1, 0).normalize(),
      this._scene,
    );
    this._directionalLight.intensity = 2;

    // assume only ACNL for now
    let modelData: ModelData = patternTypeToModelData.get(this._pattern.type);
    const container: AssetContainer = await new Promise<AssetContainer>(
      (resolve) => {
        SceneLoader.LoadAssetContainer("", modelData.model, this._scene, (container: AssetContainer) => {
          resolve(container);
        }, null, null, ".gltf");
      });
    container.addAllToScene(); // hold onto it
    this._loadedContainer = container;

    // creation reset context, don't ever dispose this
    this._texture = new DynamicTexture("texture", this._textureCanvas, this._scene, true, DynamicTexture.NEAREST_SAMPLINGMODE);
    this._textureContext.imageSmoothingEnabled = false;

    // const other = this._scene.getMeshByID("FtrMydesignEasel__mBody");
    const targetMaterial: PBRMaterial =
      <PBRMaterial>this._scene.getMaterialByID(modelData.targetMaterialId);
    targetMaterial.albedoTexture = this._texture;

    this._scene.freezeActiveMeshes();
    for (const mesh of this._loadedContainer.meshes) {
      mesh.freezeWorldMatrix();
    }
    for (const material of this._loadedContainer.materials) {
      if (material !== targetMaterial) material.freeze();
    }

    this._isSetup = true;
    this._redraw();
    this._endLoadingSignal();
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.refresh.tap(this._onRefresh);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);
    
    // this._scene.debugLayer.show();

    // setup world axis for debugging
    // this._showWorldAxis(20);

    await new Promise((resolve) => { this._scene.executeWhenReady(resolve); });
    this._engine.runRenderLoop(() => { this._scene.render(); });
  }


  /**
   * Renders the world axis in the scene.
   * @param size - the size of all axis guides
   */
  private _showWorldAxis(size: number) {
    const makeTextPlane = (text, color, size) => {
      const dynamicTexture = new DynamicTexture(
        "DynamicTexture",
        50,
        this._scene,
        true
      );
      dynamicTexture.hasAlpha = true;
      dynamicTexture.drawText(
        text,
        5,
        40,
        "bold 36px Arial",
        color,
        "transparent",
        true
      );
      var plane = Mesh.CreatePlane("TextPlane", size, this._scene, true);
      plane.material = new StandardMaterial(
        "TextPlaneMaterial",
        this._scene
      );
      plane.material.backFaceCulling = false;
      // @ts-ignore
      plane.material.specularColor = new Color3(0, 0, 0);
      // @ts-ignore
      plane.material.diffuseTexture = dynamicTexture;
      return plane;
    };
    var axisX = Mesh.CreateLines(
      "axisX",
      [
        Vector3.Zero(),
        new Vector3(size, 0, 0),
        new Vector3(size * 0.95, 0.05 * size, 0),
        new Vector3(size, 0, 0),
        new Vector3(size * 0.95, -0.05 * size, 0)
      ],
      this._scene
    );
    axisX.color = new Color3(1, 0, 0);
    const xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new Vector3(0.9 * size, -0.05 * size, 0);
    const axisY = Mesh.CreateLines(
      "axisY",
      [
        Vector3.Zero(),
        new Vector3(0, size, 0),
        new Vector3(-0.05 * size, size * 0.95, 0),
        new Vector3(0, size, 0),
        new Vector3(0.05 * size, size * 0.95, 0)
      ],
      this._scene
    );
    axisY.color = new Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = Mesh.CreateLines(
      "axisZ",
      [
        Vector3.Zero(),
        new Vector3(0, 0, size),
        new Vector3(0, -0.05 * size, size * 0.95),
        new Vector3(0, 0, size),
        new Vector3(0, 0.05 * size, size * 0.95)
      ],
      this._scene
    );
    axisZ.color = new Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new Vector3(0, 0.05 * size, 0.9 * size);
  }


  /**
   * Updates the measurements for the _pixelsCanvas to render the pattern.
   */
  private _updateMeasurements(): void {
    const sourceHeight = this._source.height;
    const sourceWidth = this._source.width;
    const textureHeight = sourceHeight * 4;
    const textureWidth = sourceWidth * 4;

    // sync canvases to correct sizes
    // image smoothing resets when sizes changed, undo reset
    this._pixelsCanvas.height = sourceHeight;
    this._pixelsCanvas.width = sourceWidth;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._textureCanvas.height = textureHeight;
    this._textureCanvas.width = textureWidth;
    this._textureContext.imageSmoothingEnabled = false;

    this._measurements = Object.freeze<ModelerMeasurements>({
      sourceHeight,
      sourceWidth,
      textureHeight,
      textureWidth,
    });
  }


  /**
   * Callback for when the _pixelCanvas source changes.
   * Updates the pixel that changed and updates the texture.
   * @param sourceY - the y coordinate of the changed pixel
   * @param sourceX - the x coordinate of the changed pixel
   * @param pixel - the pixel value, pointing to the idx of its palette
   */
  private _onPixelUpdate = (sourceX: number, sourceY: number, paletteIndex: paletteIndex): void => {
    if (paletteIndex === 15) this._pixelsContext.fillStyle = "#FFFFFF";
    else this._pixelsContext.fillStyle = this._pattern.palette[paletteIndex];
    this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
    this._redraw();
  }

  /**
   * Callback for when the palette of the pattern changes.
   * Updates pixels that have had their color mapping changed.
   * @param i - the idx of the palette that changed
   * @param color - the hex color that it changed to
   */
  private _onPaletteUpdate = (i: paletteIndex, color: color): void => {
    for (
      let sourceY: number = 0;
      sourceY < this._measurements.sourceHeight;
      ++sourceY
    ) {
      for (
        let sourceX: number = 0;
        sourceX < this._measurements.sourceWidth;
        ++sourceX
      ) {
        if (this._source.unreactive[sourceY][sourceX] !== i) continue;
        this._pixelsContext.fillStyle = color;
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
    this._redraw();
  };


  /**
   * Callback for when pattern type changes.
   * Implements mutex locking to ensure assets are properly disposed.
   * @param type - the pattern type that it's changed to.
   */
  private _onTypeUpdate = async (type: PatternType): Promise<void> => {
    if (this._loadingQueue.length <= 0) {
      // console.log(`queuing`, type);
      this._loadingQueue.push(type);
      await this._exchangeAssets(type, true); // continues consuming until array is finished.
    }
    else {
      // console.log(`queuing`, type);
      this._loadingQueue.push(type);
    }
  };


  /**
   * Updates the measurements, pixels, and the model.
   * Only one of the root call can be present at any time.
   * @param type - the type that the pattern is switching to
   * @param isRootCall - whether exchange is a root call
   */
  private async _exchangeAssets(type: PatternType, isRootCall: boolean): Promise<void> {
    // setup lock
    if (isRootCall) {
      // need to wait for release
      await this._loadingSignal;
      this._loadingSignal = new Promise((resolve, reject) => {
        this._endLoadingSignal = resolve;
      });
    }
    // console.log(`processing`, type);

    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.sections.texture;
    this._updateMeasurements();
    this._refreshPixels();
    this._source.hook.tap(this._onPixelUpdate);

    let modelData: ModelData;
    if (type == null) modelData = patternTypeToModelData.get(this._pattern.type);
    else modelData = patternTypeToModelData.get(type);

    // exchange resources
    this._scene.unfreezeActiveMeshes();
    for (const mesh of this._loadedContainer.meshes) {
      mesh.unfreezeWorldMatrix();
    }
    this._loadedContainer.dispose();
    this._loadedContainer = await new Promise<AssetContainer>(
      (resolve) => {
        SceneLoader.LoadAssetContainer(
          "", modelData.model,
          this._scene,
          (container: AssetContainer) => { resolve(container); },
          null, null, ".gltf"
        );
      });
    this._loadedContainer.addAllToScene();

    if (this._clothingStandContainer != null)
      this._clothingStandContainer.dispose();
    if (modelData.useClothingStand) {
      this._clothingStandContainer = await new Promise<AssetContainer>(
        (resolve) => {
          SceneLoader.LoadAssetContainer(
            "", assets.acnl.clothingStand.model,
            this._scene,
            (container: AssetContainer) => { resolve(container); },
            null, null, ".gltf"
          );
        });
      this._clothingStandContainer.addAllToScene();
    }

    const targetMaterial: PBRMaterial =
      <PBRMaterial>this._scene.getMaterialByID(modelData.targetMaterialId);
    targetMaterial.albedoTexture = this._texture;
    this._scene.freezeActiveMeshes();
    for (const material of this._loadedContainer.materials) {
      if (material !== targetMaterial) material.freeze();
    }
    this._redraw();
    this._loadingQueue.shift();
    if (this._loadingQueue.length > 0)
      await this._exchangeAssets(this._loadingQueue[0], false);
    // release lock
    if (isRootCall) this._endLoadingSignal();
  };


  /**
   * Callback for when the pattern's pixels needs to be updated forcefully.
   * Updates the pixels and the model.
   */
  private _onRefresh = (): void => {
    this._refreshPixels();
    this._redraw();
  };


  /**
   * Callback for when the pattern loads in new data.
   * Updates measurements, pixels, and model.
   */
  private _onLoad = async (): Promise<void> => {
    // assumes everything changed.
    await this._onTypeUpdate(null);
  };


  /**
   * Refreshes the pixelsCanvas only, does not apply changes to model.
   */
  private _refreshPixels(): void {
    this._pixelsContext.fillStyle = "#FFFFFF";
    this._pixelsContext.fillRect(0, 0, this._measurements.sourceWidth, this._measurements.sourceHeight);
    for (let sourceY: number = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        const paletteIndex = this._source.unreactive[sourceX][sourceY];
        if (paletteIndex === 15) continue;
        this._pixelsContext.fillStyle = this._pattern.palette[paletteIndex];
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
  }


  /**
   * Draws the _pixelsCanvas onto after the _textureCanvas after processing.
   */
  private async _redraw(): Promise<void> {
    if (!this._isSetup || this._state === ModelerStates.DISPOSED) return;
    if (this._pixelFilter)
      xbrz(
        this._pixelsContext,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._textureContext,
        4,
      );
    else
      this._textureContext.drawImage(
        this._pixelsCanvas,
        0, 0,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        0, 0,
        this._measurements.textureWidth,
        this._measurements.textureHeight,
      );
    this._texture.update(false);
  }


  /**
   * Gets the canvas that the model is rendered on.
   */
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }


  /**
   * Gets the pattern the Modeler is drawing.
   */
  public get pattern(): Modelable {
    return this._pattern;
  }


  /**
   * Gets whether the pixel filtering is applied on the model.
   */
  public get pixelFilter(): boolean {
    return this._pixelFilter;
  }


  /**
   * Changes whether the pixel filtering is applied on the model.
   */
  public set pixelFilter(pixelFilter: boolean) {
    if (this._state === ModelerStates.DISPOSED) {
      const message = `Modeler has been disposed. Cannot set pixelFilter.`;
      throw new IllegalStateError(message);
    }
    if (typeof pixelFilter !== "boolean") {
      const message = `Expected a boolean value`;
      throw new TypeError(message);
    }
    this._pixelFilter = pixelFilter;
    this._redraw();
  }


  /**
   * Sets up the 3d scene.
   */
  public async setup(): Promise<void> {
    if (this._isSetup) return;
    if (this._state === ModelerStates.DISPOSED) {
      const message = `Modeler has been disposed. Cannot set pixelFilter.`;
      throw new IllegalStateError(message);
    }
    await this._setupScene();
  }


  /**
   * Puts the modeler into reactive state.
   * @returns - a Promise resolving to void
   */
  public async play(): Promise<void> {
    if (this._state !== ModelerStates.PAUSED) return;
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.refresh.tap(this._onRefresh);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);

    // assume everything changed
    await this._onLoad();
    this._state = ModelerStates.PLAYING;
  }


  /**
   * Puts the modeler into the non-reactive state.
   * @returns - a Promise resolving to void
   */
  public async pause(): Promise<void> {
    if (this._state !== ModelerStates.PLAYING) return;
    this._pattern.hooks.palette.untap(this._onPaletteUpdate);
    this._pattern.hooks.type.untap(this._onTypeUpdate);
    this._pattern.hooks.refresh.untap(this._onRefresh);
    this._pattern.hooks.load.untap(this._onLoad);
    this._source.hook.untap(this._onPixelUpdate);
    this._state = ModelerStates.PAUSED;
  }


  /**
   * Puts the modeler into stopped state and cleans up all resources expended.
   * Modeler cannot be used beyond this function call.
   * @returns - a Promise resolving to void
   */
  public async dispose(): Promise<void> {
    if (this._state === ModelerStates.DISPOSED) return;
    this.pause();
    this._state = ModelerStates.DISPOSED;
    await this._loadingSignal;
    this._canvas = null;
    this._pattern = null;
    this._source = null;
    this._pixelsCanvas = null;
    this._pixelsContext = null;
    this._textureCanvas = null;
    this._textureContext = null;
    this._measurements = null;
    this._engine.stopRenderLoop();
    if (this._hemisphericLight != null)
      this._hemisphericLight.dispose();
    this._hemisphericLight = null;
    if (this._directionalLight != null)
      this._directionalLight.dispose();
    this._directionalLight = null;
    if (this._camera != null)
      this._camera.dispose();
    this._camera = null;
    if (this._texture != null)
      this._texture.dispose();
    this._texture = null;
    if (this._loadedContainer != null)
      this._loadedContainer.dispose();
    this._loadedContainer = null;
    if (this._scene != null)
      this._scene.dispose();
    this._scene = null;
    if (this._clothingStandContainer != null)
      this._clothingStandContainer.dispose();
    this._clothingStandContainer = null;
    if (this._engine != null)
      this._engine.dispose();
    this._engine = null;
  }
}

export default Modeler;