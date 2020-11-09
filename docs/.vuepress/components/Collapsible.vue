<template>
  <div
    :class="{
      collapsible: true,
      expanded: expanded,
    }"
  >
    <div class="tab" @click="$emit('change', !expanded)">
      <span class="label">
        <slot name="label"></slot>
      </span>
      <BxChevronDown class="toggle-icon" v-if="!expanded" />
      <BxChevronUp class="toggle-icon" v-else />
    </div>
    <div class="content">
      <slot v-if="expanded"></slot>
    </div>
  </div>
</template>

<script>
import BxChevronUp from "./../assets/icons/bx-chevron-up";
import BxChevronDown from "./../assets/icons/bx-chevron-down";

export default {
  components: {
    BxChevronUp,
    BxChevronDown,
  },
  props: {
    expanded: {
      type: Boolean,
      required: true,
    },
  },
  data: function () {
    return {};
  },
};
</script>

<style lang="scss" scoped>
@import "./../styles/colors";

.collapsible {
  .tab {
    padding-top: 5px;
    padding-bottom: 5px;
    padding-left: 5px;
    padding-right: 5px;
    
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    justify-items: auto;
    align-content: center;
    align-items: center;
    
    border-radius: 4px;
    transition: background-color 0.2s ease-in-out;
    &:hover {
      cursor: pointer;
      background-color: $white-smoke;
    }
  }
  &.expanded {
    .tab {
      margin-bottom: 5px;
    }
  }

  .label {
    font-size: 1rem;
    font-weight: 500;
  }

  .toggle-icon {
    fill: $font-color;
    // height: 15px;
  }
  
  .content {
    margin-left: 10px;
    margin-right: 10px;
  }
}
</style>