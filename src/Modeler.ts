import Acnl from "./Acnl";
import Hook from "./Hook";
import HookableArray from "./HookableArray";
import assets from "./assets";
import xbrz from "./xbrz";
import {
  color,
  pixel,
  PatternType,
  Drawable
} from "./utils";
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
  PointLight,
  ShadowGenerator,
  AssetContainer,
  AbstractMesh,
  BaseTexture,
  Material,
} from "babylonjs";
import "babylonjs-loaders";


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

const acnlTypeToModel = new Map<PatternType, ModelData>();
acnlTypeToModel.set(Acnl.types.LongSleevedDress, assets.acnl.longSleevedDress);
acnlTypeToModel.set(Acnl.types.ShortSleevedDress, assets.acnl.shortSleevedDress);
acnlTypeToModel.set(Acnl.types.NoSleevedDress, assets.acnl.noSleevedDress);
acnlTypeToModel.set(Acnl.types.LongSleevedShirt, assets.acnl.longSleevedShirt);
acnlTypeToModel.set(Acnl.types.ShortSleevedShirt, assets.acnl.shortSleevedShirt);
acnlTypeToModel.set(Acnl.types.NoSleevedShirt, assets.acnl.noSleevedShirt);
acnlTypeToModel.set(Acnl.types.HornedHat, assets.acnl.hornedHat);
acnlTypeToModel.set(Acnl.types.KnittedHat, assets.acnl.knittedHat);
acnlTypeToModel.set(Acnl.types.Standee, assets.acnl.standee);
acnlTypeToModel.set(Acnl.types.Standard, assets.acnl.standard);

export interface ModelerOptions {
  pattern: Drawable;
  canvas: HTMLCanvasElement;
  textureCanvas: HTMLCanvasElement;
  pixelsCanvas: HTMLCanvasElement;
};

export interface ModelerMeasurements {
  sourceHeight: number;
  sourceWidth: number;
  textureHeight: number;
  textureWidth: number;
};

class Modeler {
  // for actual rendering, for babylon
  private _canvas: HTMLCanvasElement = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>, [number, number, pixel]> = null;
  // just pixels with transparent pixels set to white
  private _pixelsCanvas: HTMLCanvasElement = null;
  private _pixelsContext: CanvasRenderingContext2D = null;
  // always use textures context to apply texture to models
  private _textureCanvas: HTMLCanvasElement = null;
  private _textureContext: CanvasRenderingContext2D = null;
  private _measurements: ModelerMeasurements = {
    sourceHeight: null,
    sourceWidth: null,
    textureHeight: null,
    textureWidth: null,
  };


  // babylon stuff
  private _scene: Scene = null;
  private _engine: Engine = null;
  private _texture: DynamicTexture = null;
  private _camera: ArcRotateCamera = null;
  private _hemisphericLight: HemisphericLight = null;
  private _directionalLight: DirectionalLight = null;
  // variable meshes that change w/ type.
  private _loadedContainer: AssetContainer = null;
  private _clothingStandContainer: AssetContainer = null;


  public constructor({
    canvas,
    pattern,
    pixelsCanvas,
    textureCanvas,
  }: ModelerOptions) {
    if (pattern == null) throw new Error();
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError();
    this._canvas = canvas;
    this._pattern = pattern;
    this._source = pattern.sections.texture;

    this._pixelsCanvas = pixelsCanvas;
    this._pixelsContext = this._pixelsCanvas.getContext("2d");
    this._textureCanvas = textureCanvas;
    this._textureContext = this._textureCanvas.getContext("2d");
    this._textureContext.imageSmoothingEnabled = false;

    this._updateMeasurements();
    this._refreshPixels();
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);

    this._setupScene();
  }

  private async _setupScene(): Promise<void> {
    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);
    this._scene.clearColor = new Color4(0, 0, 0, 0);
    this._scene.ambientColor = Color3.White();

    this._camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2, Math.PI / 2, 40,
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
    let modelData: ModelData = acnlTypeToModel.get(this._pattern.type);
    const container: AssetContainer = await new Promise<AssetContainer>(resolve => {
      SceneLoader.LoadAssetContainer("", modelData.model, this._scene, (container: AssetContainer) => {
        resolve(container);
      }, null, null, ".gltf");
    });
    container.addAllToScene(); // hold onto it
    this._loadedContainer = container;

    // creation reset context, don't ever dispose this
    this._texture = new DynamicTexture("texture", this._textureCanvas, this._scene, true, DynamicTexture.NEAREST_SAMPLINGMODE);
    this._textureContext.imageSmoothingEnabled = false;
    this._redraw();

    // const other = this._scene.getMeshByID("FtrMydesignEasel__mBody");
    const material: PBRMaterial =
      <PBRMaterial>this._scene.getMaterialByID(modelData.targetMaterialId);
    material.albedoTexture = this._texture;
    this._texture.update(false);
    this._scene.freezeActiveMeshes();
    // this._scene.debugLayer.show();

    // setup world axis for debugging
    // this._showWorldAxis(20);

    await new Promise(resolve => { this._scene.executeWhenReady(resolve); });
    this._engine.runRenderLoop(() => { this._scene.render(); });
  }

  // for debugging
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

  private _updateMeasurements(): void {
    const sourceHeight = this._source.length;
    const sourceWidth = this._source[0].length;
    const textureHeight = sourceHeight * 4;
    const textureWidth = sourceWidth * 4;

    // sync canvases to correct sizes
    this._pixelsCanvas.height = sourceHeight;
    this._pixelsCanvas.width = sourceWidth;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._textureCanvas.height = textureHeight;
    this._textureCanvas.width = textureWidth;
    // image smoothing resets when sizes changed
    this._textureContext.imageSmoothingEnabled = false;

    this._measurements = Object.freeze<ModelerMeasurements>({
      sourceHeight,
      sourceWidth,
      textureHeight,
      textureWidth,
    });
  }

  private _onPixelUpdate = (sourceY: number, sourceX: number, pixel: pixel): void => {
    this._pixelsContext.clearRect(sourceX, sourceY, 1, 1);
    if (pixel === 15) this._pixelsContext.fillStyle = "#FFFFFF";
    else this._pixelsContext.fillStyle = this._pattern.palette[pixel];
    this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
    this._redraw();
  }

  private _onPaletteUpdate = (i: pixel, color: color): void => {
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
        if (this._source[sourceY][sourceX] !== i) continue;
        this._pixelsContext.fillStyle = color;
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
    this._redraw();
  };

  private _onTypeUpdate = async (type: PatternType): Promise<void> => {
    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.sections.texture;
    this._updateMeasurements();
    this._refreshPixels();
    this._source.hook.tap(this._onPixelUpdate);

    // assume only ACNL compatibility for now
    let modelData = acnlTypeToModel.get(this._pattern.type);

    // exchange resources
    this._scene.unfreezeActiveMeshes();
    this._loadedContainer.dispose();
    this._loadedContainer = await new Promise<AssetContainer>(
      resolve => {
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
        resolve => {
          SceneLoader.LoadAssetContainer(
            "", assets.acnl.clothingStand.model,
            this._scene,
            (container: AssetContainer) => { resolve(container); },
            null, null, ".gltf"
          );
        });
        this._clothingStandContainer.addAllToScene();
    }

    const material: PBRMaterial =
      <PBRMaterial>this._scene.getMaterialByID(modelData.targetMaterialId);
    material.albedoTexture = this._texture;
    this._scene.freezeActiveMeshes();
    this._redraw();
  };

  // assume everything has changed
  private _onLoad = (): void => {
    this._onTypeUpdate(null);
  };

  private _refreshPixels(): void {
    this._pixelsContext.clearRect(0, 0, this._source[0].length, this._source.length);
    for (let sourceY: number = 0; sourceY < this._source.length; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._source[sourceY].length; ++sourceX) {
        if (this._source[sourceY][sourceX] === 15) this._pixelsContext.fillStyle = "#FFFFFF";
        else this._pixelsContext.fillStyle = this._pattern.palette[this._source[sourceY][sourceX]];
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
  }

  private _redraw(): void {
    xbrz(
      this._pixelsContext,
      this._source[0].length,
      this._source.length,
      this._textureContext,
      this._source[0].length * 4,
      this._source.length * 4,
    );
    // this._textureContext.drawImage(
    //   this._pixelsCanvas,
    //   0, 0,
    //   this._measurements.textureWidth,
    //   this._measurements.textureHeight,
    // );
    this._texture.update(false);
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public set canvas(canvas: HTMLCanvasElement) {
  }


  public play(): void {

  }

  public pause(): void {

  }

  public stop(): void {

  }
}

export default Modeler;