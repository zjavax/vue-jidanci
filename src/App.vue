<template>
  <el-config-provider namespace="ep">
    <BaseHeader />
    <div style="display: flex">
      <!-- <BaseSide /> -->
      <div class="app-main">
        <!-- <img alt="Vue logo" class="element-plus-logo" src="./assets/logo.png" /> -->
        <!-- <HelloWorld /> -->
        <!-- <Table /> -->
        <!-- <TableTest /> -->
        <router-view></router-view>
      </div>
    </div>
  </el-config-provider>
</template>

<style>
#app {
  text-align: center;
  color: var(--ep-text-color-primary);
}

/*
 * 这个 div 是上面 display:flex 容器里的 flex 项。
 * 不写 min-width:0 时，flex 项的自动最小尺寸 = min-content，
 * 会被子元素里任何 white-space:nowrap 的长文本顶到几百 px，
 * 窄屏下导致整页横向溢出（EventList 实测被钉在 839px，溢出 449px）。
 * 加上它之后 flex 项能正常收缩，子元素自带的
 * overflow:hidden + text-overflow:ellipsis 才会真正生效（否则是死代码）。
 * 宽屏下容器本来就不小于 min-content，行为不变。
 */
.app-main {
  min-width: 0;
}

.element-plus-logo {
  width: 50%;
}
</style>
