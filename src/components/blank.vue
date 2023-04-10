<template>
  <div id="app_container"></div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
const router = useRouter();
const route = useRoute();
const { name, flockId } = route.query;
// 进入当前页面后立即跳转至需要跳转的页面
router.replace({
  name: name,
  query: {
    flockId: flockId,
  },
});
</script>

<style scoped></style>

