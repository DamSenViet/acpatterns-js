<template>
  <div class="container">
    <canvas class="drawer" ref="drawerCanvas" width="640" height="640">
    </canvas>
    <canvas class="modeler" ref="modelerCanvas" width="640" height="640">
    </canvas>
  </div>
</template>


<script lang="ts">
import Vue from "vue";
// import Acnl from "../../../src/Acnl";
// import Drawer from "../../../src/Drawer";
// import Drawable from "../../../src/Drawable";
// import Modeler from "../../../src/Modeler";
// import Pen from "../../../src/tools/Pen";

export default Vue.extend({
  data: function () {
    return {
      // acnl: new Acnl(),
      // drawer: null,
      // modeler: null,
    };
  },
  mounted() {
    // const drawerCanvas: HTMLCanvasElement = this.$refs["drawerCanvas"];
    // const modelerCanvas: HTMLCanvasElement = this.$refs["modelerCanvas"];
    // this.drawer = new Drawer({
    //   pattern: this.acnl,
    //   canvas: drawerCanvas,
    // });
    // this.drawer.grid = true;
    // this.drawer.indicator = true;
    // this.drawer.source = this.acnl.sections.texture;
    // this.drawer.tool = new Pen({ size: 1 });
    // this.modeler = new Modeler({
    //   pattern: this.acnl,
    //   canvas: modelerCanvas,
    // });
  },
  destroyed() {
    // this.drawer.dispose();
    // this.modeler.dispose();
  },
});
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: center;
  padding: 24px;
  border-radius: 24px;
}

.drawer,
.modeler {
  width: 300px;
  height: 300px;
}

.modeler {
  outline: none;
}
</style>