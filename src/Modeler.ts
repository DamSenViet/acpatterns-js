import Acnl from "./Acnl";
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
  Texture,
  Mesh,
  Vector3,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  ShadowGenerator,
  AssetContainer,
} from "babylonjs";
import "babylonjs-loaders";


export interface ModelData {
  // url
  // the name of the material to NOT freeze
  targetMaterialId: string,
  model: string,
  useClothingStand?: boolean,
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


  public constructor({
    canvas,
    pattern,
    pixelsCanvas,
    textureCanvas,
  }: ModelerOptions) {
    if (pattern == null) throw new Error();
    if (
      canvas == null ||
      !(canvas instanceof HTMLCanvasElement)
    ) throw new TypeError();
    this._canvas = canvas;
    this._pattern = pattern;
    this._source = pattern.sections.texture;

    this._pixelsCanvas = pixelsCanvas;
    this._pixelsContext = this._pixelsCanvas.getContext("2d");
    this._pixelsCanvas.height = this._pattern.sections.texture.length;
    this._pixelsCanvas.width = this._pattern.sections.texture[0].length;
    this._pixelsContext.imageSmoothingEnabled = false;

    this._textureCanvas = textureCanvas;
    this._textureCanvas.height = this._pattern.sections.texture.length * 4;
    this._textureCanvas.width = this._pattern.sections.texture[0].length * 4;
    this._textureContext = this._textureCanvas.getContext("2d");
    this._textureContext.imageSmoothingEnabled = false;

    this._refreshPixels();
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
      new Vector3(0, 10, 0),
      this._scene
    );
    this._camera.upperRadiusLimit = 70;
    this._camera.lowerRadiusLimit = 15;
    this._camera.upperBetaLimit = Math.PI / 2;
    this._camera.lowerBetaLimit = Math.PI / 2;
    this._camera.attachControl(this._canvas, true);

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

    // let modelData: ModelData;
    // if (this._pattern instanceof Acnl) {
    //   modelData = acnlTypeToModel.get(this._pattern.type);
    // }

    // const {
    //   loadedMeshes,
    //   loadedMaterials,
    //   loadedTextures,
    // } = await new Promise(resolve => {
    //   SceneLoader.LoadAssetContainer("", modelData.model, this._scene, (assets: AssetContainer) => {

    //   });
    // });

    const importedMeshes: Array<Mesh> = await new Promise(resolve => {
      SceneLoader.ImportMesh("", "", assets.acnl.standard.model, this._scene, (meshes: Array<Mesh>) => {
        resolve(meshes);
      }, null, null, ".gltf");
    });

    // creation reset context
    this._texture = new DynamicTexture("texture", this._textureCanvas, this._scene, true, DynamicTexture.NEAREST_SAMPLINGMODE);
    this._textureContext.imageSmoothingEnabled = false;
    this._redraw();

    // const other = this._scene.getMeshByID("FtrMydesignEasel__mBody");
    const mesh = this._scene.getMeshByID("FtrMydesignEasel__mReFabric");
    (<PBRMaterial>mesh.material).albedoTexture = this._texture;
    this._texture.update(false);
    this._scene.freeActiveMeshes();
    console.log(this._scene.materials);

    // freeze meshes for lower cpu usage
    // for (const mesh of importedMeshes) {
    //   mesh.dispose();
    // }

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
    this._textureCanvas.height = textureHeight;
    this._textureCanvas.width = textureWidth;

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
    this._texture.update(false);
  }

  private _onPaletteUpdate = (): void => {

  };

  private _onLoad = ((): void => {
    this._refreshPixels();
    this._redraw();
    this._texture.update(false);
  });

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
    // this._textureContext.drawImage(
    //   this._pixelsCanvas,
    //   0, 0,
    //   this._source[0].length * 4,
    //   this._source.length * 4,
    // );
    xbrz(
      this._pixelsContext,
      this._source[0].length,
      this._source.length,
      this._textureContext,
      this._source[0].length * 4,
      this._source.length * 4,
    );
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public set canvas(canvas: HTMLCanvasElement) {
  }

}

export default Modeler;