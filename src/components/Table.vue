<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";

import type { TableColumnCtx, TableInstance } from "element-plus";

const tableRef = ref<TableInstance>();
export default {
  data() {
    return {
      msg: "主页",
      danciList: [],
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

    putDifficulty(row: Danci, difficulty: number) {
      var api = "http://localhost:8080/danci/" + row.id;
      if (row.difficulty == difficulty) {
        // 重新点击则恢复  可背诵
        row.difficulty = 1;
      } else {
        row.difficulty = difficulty;
      }

      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });
    },

    addKnow(row: Danci) {
      var api = "http://localhost:8080/danci/" + row.id;

      row.know++;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });
    },

    // 减一
    minusKnow(row: Danci) {
      var api = "http://localhost:8080/danci/" + row.id;

      row.know--;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });
    },
  },
};
</script>




<template>
  <el-form :model="form" label-width="120px">
    <el-form-item style="margin-top: 40px">
      <el-button type="warning" @click="getData(1)">可背诵</el-button>
      <el-button @click="getData(0)">幼稚</el-button>
      <el-button type="danger" @click="getData(2)"
        >太难不背</el-button
      ></el-form-item
    >

    <el-form-item
      label="批量输入单词"
      v-if="difficulty == 0 || difficulty == 2"
    >
      <el-input v-model="form.alldanci" type="textarea" />
    </el-form-item>
    <el-form-item v-if="difficulty == 0 || difficulty == 2">
      <el-button type="primary" @click="onSubmit">Create</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item> 总数：{{ danciList.length }} </el-form-item>
    <el-form-item>
      <el-button @click="clearFilter">reset all filters</el-button>
    </el-form-item>

    <el-form-item>
      <el-table
        v-if="difficulty == 1"
        ref="tableRef"
        :data="danciList"
        style="width: 100%"
      >
        <el-table-column sortable prop="danci" label="单词" width="220" />

        <el-table-column
          prop="know"
          label="熟练度"
          width="220"
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

        <!-- <el-table-column prop="know" sortable label="Know" width="220" /> -->

        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click="addKnow(scope.row)"
            >
              不认识
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="minusKnow(scope.row)"
            >
              认识
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 0)">
              幼稚
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 2)">
              太难
            </el-button>
          </template>
        </el-table-column>
      </el-table></el-form-item
    >

    <el-form-item>
      <el-table
        v-if="difficulty == 0"
        ref="table"
        :data="danciList"
        style="width: 100%"
      >
        <el-table-column prop="danci" label="Danci" width="220" />
        <el-table-column prop="know" sortable label="Know" width="220" />
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click="addKnow(scope.row)"
            >
              不认识
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="minusKnow(scope.row)"
            >
              认识
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 0)">
              幼稚
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 2)">
              太难
            </el-button>
          </template>
        </el-table-column>
      </el-table></el-form-item
    >

    <el-form-item>
      <el-table
        v-if="difficulty == 2"
        ref="table"
        :data="danciList"
        style="width: 100%"
      >
        <el-table-column prop="danci" label="Danci" width="220" />
        <el-table-column prop="know" sortable label="Know" width="220" />
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click="addKnow(scope.row)"
            >
              不认识
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="minusKnow(scope.row)"
            >
              认识
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 0)">
              幼稚
            </el-button>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="Operations" width="220">
          <template #default="scope">
            <el-button link size="small" @click="putDifficulty(scope.row, 2)">
              太难
            </el-button>
          </template>
        </el-table-column>
      </el-table></el-form-item
    >
  </el-form>
</template>






<script lang="ts" setup>
// import tableData from "./data.json";

// do not use same name with ref
const form = reactive({
  alldanci: "",
});

var baseUrl = "http://localhost:8080/";

const onCancel = () => {
  form.alldanci = "";
};
const onSubmit = () => {
  console.log("submit!");

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
  know: number;
  difficulty: number;
}
</script>
