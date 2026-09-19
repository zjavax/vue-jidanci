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
 *
 * flex: 1 1 auto —— 之前只写了 min-width:0、没有 flex-grow，
 * 于是宽度 = **内容宽度**而非容器宽度，而 flex 容器默认 justify-content:flex-start
 * → 整页贴左。实测（视口 1485、覆盖 15 个路由）有 8 个中招：
 *   PoolStake 980 / EventList 825 / EventList_sports 840 / tableTest 1000 /
 *   adaArticle 1420 / UserPositions 1424 / addText 474 / helloWorld 394
 * （撑满 1485 的那几个只是内容本来就宽，不是布局对了。）
 * 更隐蔽的后果：子元素写 `margin: 0 auto` 想居中会**永远无效** ——
 * 子宽 == 父宽、没有剩余空间可分，auto 边距恒等于 0。
 * 加上 flex-grow 后 15 个路由全部撑满容器，横向溢出实测均为 0px。
 */
.app-main {
  min-width: 0;
  flex: 1 1 auto;
}

.element-plus-logo {
  width: 50%;
}
</style>
