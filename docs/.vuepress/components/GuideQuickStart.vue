<template>
  <div class="container">
    <div class="background"></div>
    <div class="foreground">
      <canvas class="drawer" ref="drawerCanvas" width="640" height="640">
      </canvas>
    </div>
  </div>
</template>


<script>
import { Acnl, Drawer, tools } from "./../../../build/esm";

export default {
  data: function () {
    return {
      acnl: new Acnl(),
      drawer: null,
    };
  },
  async mounted() {
    const drawerCanvas = this.$refs["drawerCanvas"];
    this.drawer = new Drawer({
      pattern: this.acnl,
      canvas: drawerCanvas,
    });
    this.drawer.grid = true;
    this.drawer.indicator = true;
    this.drawer.source = this.acnl.sections.texture;
    const pen = new tools.Pen({ size: 1 });
    this.drawer.tool = pen;
    pen.paletteIndex = this.acnl.palette.length - 1;
    this.acnl.palette[this.acnl.palette.length - 1] = Acnl.getClosestColor(
      "black"
    );
  },
  destroyed() {
    this.drawer.dispose();
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
    grid-template-columns: 1fr;
    justify-items: center;
    justify-content: center;
  }

  .drawer {
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
}
</style>