<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";

import type { TableColumnCtx, TableInstance } from "element-plus";

// ================
const tableData = ref([
  {
    id: 1,
    danci: "============================",
    chinese: "单词",
    know: 1,
    difficulty: 2,
  },
]);

const tableRef = ref<TableInstance>();
export default {
  data() {
    return {
      msg: "主页",
      danciList: [] as any[],
      difficulty: 1,
    };
  },
  mounted() {
    this.getData(1);
  },
  methods: {
    // /src/components/data.json
    getData(difficulty: number) {
      this.difficulty = difficulty;
      //2.使用axios 进行get请求
      axios
        .get("http://localhost:8080/getDanci?difficulty=" + difficulty)
        .then((res) => {
          //请求成功的回调函数
          this.danciList = res.data;
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    putDifficulty(row: Danci, difficulty: number, index: number) {
      var api = "http://localhost:8080/danci/" + row.id;

      row.difficulty = difficulty;

      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {});

      this.deleteTableRow(index);
    },

    deleteTableRow(index: number) {
      // this.danciList = this.danciList.filter((item) => {
      //   return item?.id != row.id;
      // });
      this.danciList.splice(index, 1);
    },

    deleteRow(row: Danci) {
      var api = "http://localhost:8080/danci/deleteById/" + row.id;

      //2.使用axios 进行get请求
      axios.delete(api).then(function (response) {});

      this.danciList = this.danciList.filter((item) => {
        return item?.id != row.id;
      });
    },

    // 减一  认识
    minusKnow(row: Danci, index: number) {
      var api = "http://localhost:8080/danci/" + row.id;

      if (row.difficulty == 2) {
        row.difficulty = 1;
      }

      row.know--;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });

      this.deleteTableRow(index);
    },

    // 不认识  +1
    addKnow(row: Danci, index: number) {
      tableData.value.push(row);

      var api = "http://localhost:8080/danci/" + row.id;

      // if (row.difficulty == 0) {
      row.difficulty = 1;
      // }

      row.know++;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {});

      this.deleteTableRow(index);
    },
  },
};
</script>




<template>
  <el-form :model="form" label-width="120px">
    <el-form-item style="margin-top: 40px">
      <el-button type="warning" @click="getData(1)">可背诵</el-button>
      <el-button @click="getData(0)">简单</el-button>
      <el-button type="danger" @click="getData(2)">太难不背</el-button>

      <el-button @click="getData(-10000)">幼稚</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词" v-if="difficulty == 0">
      <el-input v-model="form.alldanci" type="textarea" />
    </el-form-item>

    <el-form-item v-if="difficulty == 0">
      <el-button type="primary" @click="onSubmit">Create</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词组" v-if="difficulty == 2">
      <el-input v-model="form.alldancigroup" type="textarea" />
    </el-form-item>

    <el-form-item v-if="difficulty == 2">
      <el-button type="primary" @click="onSubmit2">添加词组，分行</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item> 总数：{{ danciList.length }} </el-form-item>
    <el-form-item>
      <el-button @click="clearFilter">reset all filters</el-button>
    </el-form-item>

    <el-form-item>
      <el-table ref="tableRef" :data="danciList" style="width: 100%">
        <el-table-column sortable prop="danci" label="单词" width="220" />

        <el-table-column fixed="right" label="操作" width="400">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="addKnow(scope.row, scope.$index)"
            >
              {{
                scope.row.difficulty != 0 && scope.row.difficulty != -10000
                  ? "+1不认识"
                  : "可背诵"
              }}
            </el-button>
            <el-button
              v-if="scope.row.difficulty != -10000"
              type="danger"
              size="small"
              @click="minusKnow(scope.row, scope.$index)"
            >
              {{ scope.row.difficulty != 2 ? "-1认识" : "可背诵" }}
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 0 && scope.row.difficulty != -10000"
              size="small"
              @click="putDifficulty(scope.row, 0, scope.$index)"
            >
              简单
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 2 && scope.row.difficulty != -10000"
              size="small"
              @click="putDifficulty(scope.row, 2, scope.$index)"
            >
              太难
            </el-button>
            <el-button
              v-if="scope.row.difficulty != -10000"
              size="small"
              @click="putDifficulty(scope.row, -10000, scope.$index)"
            >
              幼稚
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="150">
          <template #default="scope">
            <el-button size="small" @click="deleteRow(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <el-table-column
          fixed="right"
          prop="chinese"
          sortable
          label="中文"
          width="320"
        />
        <el-table-column
          fixed="right"
          prop="know"
          label="熟练度"
          width="220"
          sortable
          :filters="[
            { text: '0', value: '0' },
            { text: '1', value: '1' },
            { text: '2', value: '2' },
            { text: '3', value: '3' },
            { text: '4', value: '4' },
            { text: '5', value: '5' },
            { text: '6', value: '6' },
            { text: '7', value: '7' },
          ]"
          :filter-method="filterKnow"
          filter-placement="bottom-end"
        />
      </el-table>
    </el-form-item>

    <el-form-item style="margin-top: 150px">
      <el-button type="warning" @click="getData(1)">可背诵</el-button>
      <el-button @click="getData(0)">简单</el-button>
      <el-button type="danger" @click="getData(2)">太难不背</el-button>

      <el-button @click="getData(-10000)">幼稚</el-button>
    </el-form-item>

    <el-form-item>
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="danci" label="单词" />
        <el-table-column fixed="right" label="Operations">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click.prevent="deleteRowCache(scope.$index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-form-item>
  </el-form>
</template>






<script lang="ts" setup>
// import tableData from "./data.json";

// do not use same name with ref
const form = reactive({
  alldanci: "",
  alldancigroup: "",
});

var baseUrl = "http://localhost:8080/";

const onCancel = () => {
  form.alldanci = "";
  form.alldancigroup = "";
};
const onSubmit = () => {
  axios
    .post(baseUrl + "alldanci", form)
    .then((res) => {
      //请求成功的回调函数
      console.log(res.data);
    })
    .catch((err) => {
      //请求失败的回调函数
      console.log(err);
    });

  form.alldanci = "";
  form.alldancigroup = "";
};

const onSubmit2 = () => {
  axios
    .post(baseUrl + "alldancigroup", form)
    .then((res) => {
      //请求成功的回调函数
      console.log(res.data);
    })
    .catch((err) => {
      //请求失败的回调函数
      console.log(err);
    });

  form.alldanci = "";
  form.alldancigroup = "";
};

const filterKnow = (value: number, row: Danci) => {
  return row.know == value;
};

// TODO: improvement typing when refactor table
const clearFilter = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  tableRef.value!.clearFilter();
};

interface Danci {
  id: number;
  danci: string;
  chinese: string;
  know: number;
  difficulty: number;
}

// ============
const deleteRowCache = (index: number) => {
  tableData.value.splice(index, 1);
};
</script>
