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
export default {
  data: function () {
    return {
      acnl: null,
      drawer: null,
    };
  },
  async mounted() {
    const {
      formats,
      Drawer,
      tools,
    } = await import("./../../../build/esm");

    const acnl = new formats.Acnl();
    acnl.palette[acnl.palette.length - 1] = acnl.nearestInColorSpace("black");

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

    this.acnl = acnl;
    this.drawer = drawer;
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