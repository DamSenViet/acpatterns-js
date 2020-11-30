<template>
  <div class="container">
    <div class="toolbar" v-if="drawer != null">
      <div class="tools">
        <div
          v-for="(toolOption, i) in toolOptions"
          :key="toolOption.label"
          :class="{
            tool: true,
            active: drawer.tool === toolOption.tool,
          }"
          @click="switchTools(drawer.tool, toolOption.tool)"
        >
          <component :is="toolOption.icon"></component>
        </div>
      </div>
      <div
        v-if="
          drawer != null &&
          drawer.tool != null &&
          drawer.tool.paletteIndex != null
        "
        :class="{
          'active-color': true,
          'transparent': drawer.tool.paletteIndex === pattern.palette.length,
        }"
        :style="{
          backgroundColor: patternDetails.palette[drawer.tool.paletteIndex],
        }"
      ></div>
    </div>
    <div
      :class="{
        'drawing-area': true,
        'animate-background': animateDrawingAreaBackground,
      }"
    >
      <canvas ref="drawer" class="drawer" width="640" height="640"></canvas>
    </div>
    <div class="utility-bar">
      <div class="modeler-container">
        <canvas ref="modeler" class="modeler" width="640" height="640"></canvas>
      </div>

      <Collapsible :expanded="showPalette" @change="showPalette = $event">
        <template #label>
          <span>Palette</span>
        </template>
        <div class="palette">
          <div class="palette--colors">
            <div
              v-if="
                drawer != null &&
                drawer.tool != null &&
                drawer.tool.paletteIndex != null
              "
              v-for="color, index in patternDetails.palette"
              :key="`${index} ${color}`"
              :class="{
                'palette--color': true,
                active: drawer.tool.paletteIndex === index,
              }"
              :style="{
                'background-color': color,
              }"
              @click="drawer.tool.paletteIndex = index"
              @mousemove="$event.which && (drawer.tool.paletteIndex = index)"
            ></div>
            <div
              v-else
              :key="`${index} ${color}`"
              class="palette--color"
              :style="{
                'background-color': color,
              }"
            ></div>

            <div
              v-if="
                drawer != null &&
                drawer.tool != null &&
                drawer.tool.paletteIndex != null
              "
              :class="{
                'palette--color': true,
                active: drawer.tool.paletteIndex === pattern.palette.length,
                'transparent': true,
              }"
              @click="drawer.tool.paletteIndex = pattern.palette.length"
              @mousemove="$event.which && (drawer.tool.paletteIndex = pattern.palette.length)"
            ></div>
            <div
              v-else
              class="palette--color transparent"
            ></div>
          </div>
        </div>
      </Collapsible>

      <Collapsible
        v-if="pattern != null"
        :expanded="showPatternInformation"
        @change="showPatternInformation = $event"
      >
        <template #label>
          <span class>Information</span>
        </template>
        <div class="information">
          <div class="information--rows">
            <label>Title</label>
            <input type="text" maxlength="20" v-model="pattern.title" />
            <label>Villager Id</label>
            <input
              type="number"
              v-model.number="pattern.villagerId"
              min="0"
              max="65535"
              number
            />
            <label>Villager Name</label>
            <input type="text" maxlength="8" v-model="pattern.villagerName" />
            <label>Town Id</label>
            <input
              type="number"
              v-model.number="pattern.townId"
              min="0"
              max="65535"
              number
            />
            <label>Town Name</label>
            <input type="text" maxlength="8" v-model="pattern.townName" />
            <label>Type</label>
            <select
              :value="pattern.type.name"
              @input="
                pattern.type = Object.values(pattern.constructor.types).find(
                  (type) => {
                    return $event.target.value === type.name;
                  }
                )
              "
            >
              <option
                v-for="(type, i) in Object.values(pattern.constructor.types)"
                :key="type.name"
                :value="type.name"
              >
                {{ type.name }}
              </option>
            </select>
          </div>
        </div>
      </Collapsible>

      <Collapsible
        v-if="pattern != null && drawer != null"
        :expanded="showDrawerSettings"
        @change="showDrawerSettings = $event"
      >
        <template #label>
          <span>Drawer Settings</span>
        </template>
        <div class="information">
          <div class="information--rows">
            <label>Source</label>
            <select
              :value="
                drawerSourceOptions[
                  drawerSourceOptions.findIndex((option) => {
                    return this.drawer.source === option.source;
                  })
                ].label
              "
              @input="
                drawer.source =
                  drawerSourceOptions[
                    drawerSourceOptions.findIndex((option) => {
                      return $event.target.value === option.label;
                    })
                  ].source
              "
            >
              <option
                v-for="(option, i) in drawerSourceOptions"
                :selected="i == 0"
              >
                {{ option.label }}
              </option>
            </select>
            <label>Pixel Filter</label>
            <input type="checkbox" v-model="drawer.pixelFilter" />
            <label>Tool Indicator</label>
            <input type="checkbox" v-model="drawer.indicator" />
            <label>Grid</label>
            <input type="checkbox" v-model="drawer.grid" />
          </div>
        </div>
      </Collapsible>

      <Collapsible
        v-if="pattern != null && modeler != null"
        :expanded="showModelerSettings"
        @change="showModelerSettings = $event"
      >
        <template #label>
          <span>Modeler Settings</span>
        </template>
        <div class="information">
          <div class="information--rows">
            <label>Pixel Filter</label>
            <input type="checkbox" v-model="modeler.pixelFilter" />
          </div>
        </div>
      </Collapsible>

      <Collapsible
        :expanded="showPlaygroundSettings"
        @change="showPlaygroundSettings = $event"
        class="playground-settings"
      >
        <template #label>
          <span>Playground Settings</span>
        </template>
        <div class="information">
          <div class="information--rows">
            <label>Animations</label>
            <input type="checkbox" v-model="animateDrawingAreaBackground" />
          </div>
        </div>
      </Collapsible>

      <Collapsible :expanded="showImporters" @change="showImporters = $event">
        <template #label>
          <span>Import Methods</span>
        </template>
        <div class="loaders">
          <button class="loader" @click="$refs.imageLoader.click()">
            Convert Image
          </button>
          <input
            v-show="false"
            id="image-loader"
            type="file"
            ref="imageLoader"
            accept="image/*"
            value=""
            @input="loadImage"
          />
          <button class="loader" @click="$refs.qrLoader.click()">
            Open QR Codes
          </button>
          <input
            v-show="false"
            id="qr-loader"
            type="file"
            ref="qrLoader"
            accept="image/*"
            value=""
            @input="loadQR"
            multiple
          />
          <button class="loader" @click="$refs.binaryLoader.click()">
            Open .ACNL
          </button>
          <input
            v-show="false"
            id="binary-loader"
            type="file"
            ref="binaryLoader"
            accept=".acnl"
            value=""
            @input="loadAcnl"
          />
        </div>
      </Collapsible>

      <Collapsible
        :expanded="showPresets"
        @change="showPresets = $event"
      >
      <template #label>
        <span>Pattern Presets</span>
      </template>
      <div class="presets">
        <button
          v-for="presetOption in presetOptions"
          class="preset"
          @click="loadPreset(presetOption.binaryString)"
        >
          {{ presetOption.label }}
        </button>
      </div>
      </Collapsible>

      <Collapsible :expanded="showQRCodes" @change="showQRCodes = $event">
        <template #label>
          <span class="collapsible-label">
            QR Codes
            <BxCheck v-if="qrCodesUpdated" class="qr-code-updated" />
            <BxX v-else class="qr-code-outdated" />
          </span>
        </template>
        <div class="qr-codes">
          <div
            v-for="(qrCodeDataURL, i) in qrCodeDataURLS"
            :key="qrCodeDataURL"
            class="qr-code"
          >
            <img :src="qrCodeDataURL" />
            <label>{{ i + 1 }} / {{ qrCodeDataURLS.length }}</label>
          </div>
        </div>
      </Collapsible>
    </div>
  </div>
</template>

<script>
import Vue from "vue";
import Collapsible from "./Collapsible";
import BxCheck from "./../assets/icons/bx-check";
import BxX from "./../assets/icons/bx-x";
import BxPencil from "./../assets/icons/bx-pencil";
import BxEditAlt from "./../assets/icons/bx-edit-alt";
import BxRectangle from "./../assets/icons/bx-rectangle";
import BxCircle from "./../assets/icons/bx-circle";
import BxColorFill from "./../assets/icons/bx-color-fill";
import BxMove from "./../assets/icons/bx-move";
import BxUpload from "./../assets/icons/bx-upload";
import dressDenimJacket from "./../assets/presets/dress-denim-jacket";
import standardBells from "./../assets/presets/standard-bells";
import shirtJotaro from "./../assets/presets/shirt-jotaro";
import { debounce } from "lodash";

export default {
  components: {
    Collapsible,
    BxPencil,
    BxEditAlt,
    BxRectangle,
    BxCircle,
    BxColorFill,
    BxUpload,
    BxCheck,
    BxX,
  },
  data: function () {
    return {
      toolOptions: [],
      pattern: null,
      patternDetails: {
        palette: [],
      },
      drawer: null,
      modeler: null,
      animateDrawingAreaBackground: false,
      showPatternInformation: true,
      showPalette: true,
      showDrawerSettings: true,
      showModelerSettings: true,
      showPlaygroundSettings: true,
      showImporters: true,
      showPresets: true,
      presetOptions: [
        {
          label: "Bells",
          binaryString: standardBells,
        },
        {
          label: "Denim Jacket",
          binaryString: dressDenimJacket,
        },
        {
          label: "Jotaro Shirt",
          binaryString: shirtJotaro,
        }
      ],
      showQRCodes: true,
      qrCodesUpdated: false,
      qrCodeDataURLS: [],
      debouncedToQRCodes: null,
    };
  },
  computed: {
    drawerSourceOptions() {
      if (this.pattern == null) return [];
      const options = [];
      options.push({
        label: "pattern.pixels",
        source: this.pattern.pixels,
      });
      for (const sectionName of Object.keys(this.pattern.type.sections)) {
        options.push({
          label: `pattern.sections.${sectionName}`,
          source: this.pattern.sections[sectionName],
        });
      }
      return options;
    },
  },
  async mounted() {
    // window.alert("This playground may not work in Safari")
    const { formats, Drawer, tools, Modeler, ImageProjector } = await import(
      "./../../../build/esm"
    );
    this.toolOptions = [
      {
        label: "Pen",
        icon: BxPencil,
        tool: new tools.Pen(),
      },
      {
        label: "Line",
        icon: BxEditAlt,
        tool: new tools.Line(),
      },
      {
        label: "Rectangle",
        icon: BxRectangle,
        tool: new tools.Rectangle(),
      },
      {
        label: "Circle",
        icon: BxCircle,
        tool: new tools.Circle(),
      },
      {
        label: "Fill",
        icon: BxColorFill,
        tool: new tools.Fill(),
      },
      {
        label: "Drag",
        icon: BxMove,
        tool: new tools.Drag(),
      },
    ];

    this.pattern = new formats.Acnl();
    for (const color of this.pattern.palette) {
      this.patternDetails.palette.push(color);
    }
    this.debouncedToQRCodes = debounce(async () => {
      this.qrCodeDataURLS = (await this.pattern.toQRCodes()).map(
        (qrCodes) => {
          return qrCodes.src;
        }
      );
      this.qrCodesUpdated = true;
    }, 1000);
    const drawerCanvas = this.$refs.drawer;
    const modelerCanvas = this.$refs.modeler;
    this.drawer = new Drawer({
      pattern: this.pattern,
      canvas: drawerCanvas,
    });
    this.drawer.grid = true;
    this.drawer.indicator = true;

    this.modeler = new Modeler({
      pattern: this.pattern,
      canvas: modelerCanvas,
    });

    await this.modeler.setup();
    // hooks
    this.pattern.pixels.hook.tap(() => {
      this.qrCodesUpdated = false;
      this.qrCodeDataURLS = [];
      this.debouncedToQRCodes();
    });
    this.pattern.hooks.type.tap(() => {
      this.pattern.pixels.hook.tap(() => {
        this.qrCodesUpdated = false;
        this.qrCodeDataURLS = [];
        this.debouncedToQRCodes();
      });
      this.qrCodesUpdated = false;
      this.qrCodeDataURLS = [];
      this.debouncedToQRCodes();
    });
    this.pattern.hooks.refresh.tap(() => {
      this.qrCodesUpdated = false;
      this.qrCodeDataURLS = [];
      this.debouncedToQRCodes();
    });
    this.pattern.hooks.palette.tap((i, color) => {
      this.patternDetails.palette.splice(i, 1, color);
      this.qrCodesUpdated = false;
      this.qrCodeDataURLS = [];
      this.debouncedToQRCodes();
    });
    this.pattern.hooks.load.tap(() => {
      while (this.patternDetails.palette.length > 0)
        this.patternDetails.palette.pop();
      for (const color of this.pattern.palette) {
        this.patternDetails.palette.push(color);
      }
      this.pattern.pixels.hook.tap(() => {
        this.qrCodesUpdated = false;
        this.qrCodeDataURLS = [];
        this.debouncedToQRCodes();
      });
      this.qrCodesUpdated = false;
      this.qrCodeDataURLS = [];
      this.debouncedToQRCodes();
    });
    this.debouncedToQRCodes();
  },
  async beforeDestroy() {
    if (this.drawer != null) this.drawer.dispose();
    if (this.modeler != null) await this.modeler.dispose();
    // unhook
  },
  methods: {
    async loadQR(event) {
      if (event.target.files.length === 0) return;
      const files = event.target.files;
      const dataURLs = await Promise.all(
        (() => {
          const promises = new Array();
          for (let i = 0; i < files.length; ++i) {
            const fileReader = new FileReader();
            const promise = new Promise((resolve) => {
              fileReader.addEventListener("load", () => {
                resolve(fileReader.result);
              });
              fileReader.readAsDataURL(files[0]);
            });
            promises.push(promise);
          }
          return promises;
        })()
      );
      const images = dataURLs.map((dataURL) => {
        const image = document.createElement("img");
        image.src = dataURL;
        return image;
      });
      try {
        await this.pattern.fromQRCodes(images);
      } catch (error) {
        window.alert(error.message);
      } finally {
        event.target.value = "";
      }
    },
    async loadImage(event) {
      if (event.target.files.length === 0) return;
      const { formats, Drawer, tools, Modeler, ImageProjector } = await import(
        "./../../../build/esm"
      );
      const file = event.target.files[0];
      const fileReader = new FileReader();
      const dataURL = await new Promise((resolve) => {
        fileReader.addEventListener("load", () => {
          resolve(fileReader.result);
        });
        fileReader.readAsDataURL(file);
      });
      const image = document.createElement("img");
      await new Promise((resolve, reject) => {
        image.addEventListener("load", () => {
          resolve();
        });
        image.src = dataURL;
      });
      const imageProjector = new ImageProjector(image);
      await imageProjector.project(this.pattern);
      event.target.value = "";
    },
    async loadAcnl(event) {
      if (event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileReader = new FileReader();
      const binaryString = await new Promise((resolve) => {
        fileReader.addEventListener("load", () => {
          resolve(fileReader.result);
        });
        fileReader.readAsBinaryString(file);
      });
      this.pattern.fromBinaryString(binaryString);
      event.target.value = "";
    },
    switchTools(oldTool, newTool) {
      if (
        oldTool != null &&
        oldTool.paletteIndex != null &&
        newTool != null &&
        newTool.paletteIndex != null
      ) {
        newTool.paletteIndex = oldTool.paletteIndex;
      }
      this.drawer.tool = newTool;
    },
    loadPreset(binaryString) {
      this.pattern.fromBinaryString(binaryString);
    }
  },
};
</script>


<style lang="scss" scoped>
@import "./../styles/colors";
@import "./../styles/backgrounds";

.container {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: "toolbar drawing-area utility-bar";
  grid-template-rows: calc(100vh - 4rem);
  justify-content: space-between;
  justify-items: stretch;
  // background-color: #f8f8f8;

  .toolbar,
  .drawing-area,
  .utility-bar {
    max-height: calc(100vh - 4rem);
    overflow: scroll;
  }
}

.toolbar {
  padding-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
  grid-area: toolbar;

  width: 4rem;
  border-right-width: 1px;
  border-right-style: solid;
  border-right-color: #eaecef;

  .tools {
    display: grid;
    grid-template-columns: calc(4rem);
    grid-template-rows: calc(4rem);
    row-gap: 10px;
    justify-content: center;
    justify-items: stretch;
    align-content: start;
    align-items: stretch;
  }
  .tool {
    box-sizing: border-box;
    border-radius: 5px;
    border-width: 1px;
    border-style: solid;
    border-color: $font-color;

    height: 4rem;
    width: 4rem;

    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 100%;
    justify-content: center;
    justify-items: center;
    align-content: center;
    align-items: center;

    &.active {
      border-color: $sundown;
      border-width: 2px;
      > svg {
        fill: $sundown;
      }
    }

    &:hover {
      cursor: pointer;
    }

    > svg {
      fill: $font-color;
    }
  }

  .active-color {
    margin-top: 10px;
    box-sizing: border-box;
    border-radius: 5px;
    border-width: 1px;
    border-style: solid;
    border-color: $font-color;
    height: 4rem;
    width: 4rem;
    
    &.transparent {
      @include stripes($sundown, white, 10px);
    }
  }
}

.drawing-area {
  grid-area: drawing-area;
  display: grid;
  justify-content: center;
  justify-items: center;
  align-content: center;
  height: 100%;

  @include polkadots($olive-haze, $donkey-brown);

  &.animate-background {
    @include moving-polkadots(5s);
  }
}

.drawer {
  height: 640px;
  width: 640px;
}

.utility-bar {
  grid-area: utility-bar;
  display: grid;
  align-content: flex-start;
  align-items: flex-start;
  row-gap: 10px;

  border-left-width: 1px;
  border-left-style: solid;
  border-left-color: $border;

  & > * {
    margin-left: 10px;
    margin-right: 10px;
  }

  &::before {
    content: "";
    display: block;
    position: relative;
    height: 0px;
  }
  &::after {
    content: "";
    display: block;
    position: relative;
    height: 30px;
  }
}

.modeler-container {
  display: grid;
  justify-items: center;

  .modeler {
    justify-self: center;
    height: 300px;
    width: 300px;
    outline: none;
    border-radius: 5px;
    border-width: 1px;
    border-style: solid;
    border-color: $border;

    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }
}

.palette {
  .palette--colors {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 25px;
    justify-content: space-evenly;
    justify-items: stretch;
    align-items: stretch;
    row-gap: 2px;
    column-gap: 2px;

    .palette--color {
      box-sizing: border-box;
      border-radius: 5px;
      border-width: 1px;
      border-style: solid;
      border-color: $border;
      
      &.transparent {
        @include stripes($sundown, white, 10px);
      }
      &.active {
        border-width: 3px;
        border-color: $font-color;
      }
      &:hover {
        cursor: pointer;
      }
    }
  }
}

.information {
  font-size: 0.9rem;

  .information--rows {
    display: grid;
    grid-template-columns: auto 150px;
    column-gap: 10px;
    row-gap: 5px;
    & > label {
      font-weight: 500;
    }
    & > input,
    & > select {
      justify-self: stretch;
      border-radius: 4px;
      border-width: 1px;
      border-style: solid;
      border-color: $border;
    }
    & > input[type="checkbox"] {
      justify-self: right;
    }
  }
}

.loaders {
  margin-top: 2px;
  display: grid;
  grid-template-rows: auto;
  row-gap: 2px;

  .loader {
    padding: 8px 0px;
    border-radius: 5px;
    border-width: 1px;
    border-style: solid;
    border-color: $border;
    outline: unset;
    font-family: inherit;
    color: inherit;
    background-color: white;
    font-weight: 500;
    &:hover {
      cursor: pointer;
      background-color: $white-smoke;
    }
  }
}

.qr-codes {
  justify-self: stretch;
  display: grid;
  grid-template-columns: auto;

  .qr-code {
    & > label {
      display: block;
      text-align: right;
      font-weight: 500;
      padding-right: 10px;
    }

    & > img {
      width: 100%;
      -ms-interpolation-mode: nearest-neighbor;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
    }
  }
}
.qr-code-updated {
  fill: #41b884;
}
.qr-code-outdated {
  fill: #da5961;
}

.collapsible-label {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
}

.presets {
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 10px;
  
  .preset {
    padding: 10px 0px;
    border-radius: 4px;
    border-width: 1px;
    border-style: solid;
    border-color: $border;
    outline: unset;
    background-color: white;
    
    &:hover {
      cursor: pointer;
      background-color: $white-smoke;
    }
  }
}
</style>