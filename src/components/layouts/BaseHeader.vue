<script lang="ts" setup>
import { toggleDark } from "~/composables";
</script>

<template>
  <el-menu class="el-menu-demo" mode="horizontal" router>
    <el-menu-item index="/">Element Plus</el-menu-item>
    <el-sub-menu index="2">
      <template #title>Workspace</template>
      <el-menu-item index="/nce2">nce2</el-menu-item>
      <el-menu-item index="/table">table</el-menu-item>
      <el-menu-item index="/danci3000">danci3000</el-menu-item>
      <el-menu-item index="/adaArticle">adaArticle</el-menu-item>
      <el-menu-item index="/addText">addText</el-menu-item>
      <el-menu-item index="/playAudio">playAudio</el-menu-item>
      <el-menu-item index="/tableTest">tableTest</el-menu-item>
      <el-menu-item index="/helloWorld">helloWorld</el-menu-item>

      <el-menu-item index="/oneStoryADay">oneStoryADay</el-menu-item>
      <!-- <el-sub-menu index="2-4">
        <template #title>item four</template>
        <el-menu-item index="2-4-1">item one</el-menu-item>
        <el-menu-item index="2-4-2">item two</el-menu-item>
        <el-menu-item index="2-4-3">item three</el-menu-item>
      </el-sub-menu> -->
    </el-sub-menu>
    <!-- <el-menu-item index="3" disabled>Info</el-menu-item> -->
    <!-- <el-menu-item index="4">Orders</el-menu-item> -->
    <el-menu-item h="full" @click="toggleDark()">
      <button
        class="border-none w-full bg-transparent cursor-pointer"
        style="height: var(--ep-menu-item-height)"
      >
        <i inline-flex i="dark:ep-moon ep-sunny" />
      </button>
    </el-menu-item>
  </el-menu>
</template>
