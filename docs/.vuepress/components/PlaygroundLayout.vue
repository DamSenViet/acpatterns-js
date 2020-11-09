<template>
  <ParentLayout class="parent"> </ParentLayout>
</template>


<script>
import ParentLayout from "@parent-theme/layouts/Layout.vue";
import Playground from "./Playground.vue";

export default {
  components: {
    ParentLayout,
    Playground,
  },
  data: function () {
    return {};
  },
};
</script>

<style lang="scss" scoped>
.parent::v-deep .theme-default-content {
  max-width: unset;
  padding: 0px;
  margin: 0px;
  
  &:not(.custom) {
    padding: 0px;
    margin: 0px;
  }
}

.parent::v-deep .page-edit {
  display: none;
}

.parent::v-deep .page {
  padding-bottom: 0px;
  position: relative;
}

</style>