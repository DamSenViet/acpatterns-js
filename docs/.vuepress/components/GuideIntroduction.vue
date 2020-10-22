<template>
  <div class="container">
    <div class="background"></div>
    <div class="foreground">
      <canvas class="drawer" ref="drawerCanvas" width="640" height="640">
      </canvas>
      <canvas class="modeler" ref="modelerCanvas" width="640" height="640">
      </canvas>
    </div>
  </div>
</template>


<script>
import {
  Acnl,
  Drawer,
  Modeler,
  tools,
  ImageProjector,
} from "./../../../build/esm";
import imageSrc from "./../../../tests/system/image-projects/complex.jpg";

export default {
  data: function () {
    return {
      acnl: null,
      drawer: null,
      modeler: null,
      ImageProjector: null,
    };
  },
  async mounted() {
    const acnl = new Acnl();
    acnl.palette[acnl.palette.length - 1] = Acnl.getClosestColor("black");

    const pen = new tools.Pen({ size: 1 });
    pen.paletteIndex = acnl.palette.length - 1;

    const drawerCanvas = this.$refs["drawerCanvas"];
    const drawer = new Drawer({
      pattern: acnl,
      canvas: drawerCanvas,
    });
    drawer.grid = true;
    drawer.indicator = true;
    drawer.source = acnl.sections.texture;
    drawer.tool = pen;

    const modelerCanvas = this.$refs["modelerCanvas"];
    const modeler = new Modeler({
      pattern: acnl,
      canvas: modelerCanvas,
    });
    await modeler.setup();
    modeler.pixelFilter = true;

    const imageProjector = new ImageProjector();
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.addEventListener("load", () => {
        resolve();
      });
      image.crossOrigin = "Anonymous";
      image.src = imageSrc;
    });
    await imageProjector.project(
      image,
      0,
      0,
      image.width,
      image.height,
      acnl,
      0,
      acnl.palette.length,
      acnl.sections.texture,
      0,
      0,
      acnl.sections.texture.width,
      acnl.sections.texture.height,
      1,
      ImageProjector.ImageSmoothingQualities.None,
      ImageProjector.ColorMatchingMethods.RGB
    );

    this.acnl = acnl;
    this.drawer = drawer;
    this.modeler = modeler;
    this.imageProjector = imageProjector;
  },
  async beforeDestroy() {
    if (this.drawer != null) this.drawer.dispose();
    if (this.modeler != null) await this.modeler.dispose();
  },
};
</script>

<style lang="scss" scoped>
@import "./../styles/colors";
@import "./../styles/backgrounds";
@import "./../styles/screens.scss";

.container {
  position: relative;
  top: 0;
  left: 0;
  padding: 24px;
  border-radius: 24px;

  & > .background,
  & > .foreground {
    position: relative;
    top: 0;
    left: 0;
  }

  & > .background {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    border-radius: 6px;
    @include polkadots($olive-haze, $donkey-brown);
    @include moving-polkadots(5s);
  }

  & > .foreground {
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-items: center;
    justify-content: center;
  }

  .drawer,
  .modeler {
    width: 128px;
    height: 128px;
    @include screen-small-narrow {
      width: 160px;
      height: 160px;
    }
    @include screen-small-normal {
      width: 192px;
      height: 192px;
    }
    @include screen-medium-narrow {
      width: 256px;
      height: 256px;
    }
  }

  .modeler {
    outline: none;

    &:hover {
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    }
  }
}
</style>