<template>
  <el-button type="primary" @click="addDataToDB">添加数据到数据库</el-button>
  <el-button type="primary" @click="clearDataToDB">清除数据库</el-button>
  <el-table :data="tableData" border style="width: 100%">
    <el-table-column prop="id" label="ID"></el-table-column>
    <el-table-column prop="danci" label="单词"></el-table-column>
  </el-table>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { ElTable, ElTableColumn } from "element-plus";

interface Danci {
  id: number;
  danci: string;
}

const DB_NAME = "TestDB";
const STORE_NAME = "danciList";

let db: IDBDatabase;

export default defineComponent({
  components: {
    ElTable,
    ElTableColumn,
  },
  setup() {
    const tableData = ref<Danci[]>([]);

    onMounted(() => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = (event) => {
        console.log("打开数据库出错！", (event.target as any).error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("id", "id", { unique: true });
      };

      request.onsuccess = (event) => {
        db = request.result;
        console.log("成功打开数据库！");
        getDataFromDB();
      };
    });

    function clearDataToDB() {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();

      transaction.oncomplete = () => {
        console.log("清除数据库！");
        getDataFromDB();
      };
    }
    function addDataToDB() {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      for (let i = 0; i < 5; i++) {
        store.put({
          id: i,
          danci: `单词${i}`,
        });
      }

      transaction.oncomplete = () => {
        console.log("成功添加5条数据到数据库！");
        getDataFromDB();
      };

      transaction.onerror = (event) => {
        console.log("添加数据到数据库出错！", (event.target as any).error);
      };
    }

    function getDataFromDB() {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        tableData.value = (event.target as any).result;
      };

      request.onerror = (event) => {
        console.log("从数据库获取数据出错！", (event.target as any).error);
      };
    }

    return {
      tableData,
      addDataToDB,
      clearDataToDB,
    };
  },
});
</script>
