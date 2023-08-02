<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";
// import Dicts from "./../dicts/NCE_2.json";

// ================
var baseUrl = "http://localhost:8080/";
var api = "http://localhost:8080/danci/";

// do not use same name with ref
const form1 = reactive({
  alldanci: "",
  alldancigroup: "",
  article: "",
  difficulty: 0,
});

export default {
  data() {
    return {
      msg: "主页",
      // danciList: [] as any[],
      danciList: ref([
        {
          id: 1,
          name: "============================",
          trans: "单词",
          know: 1,
          difficulty: 0,
        },
      ]),
      tableData: ref([
        {
          id: 1,
          name: "==========",
          trans: "单词",
          know: 1,
          difficulty: 0,
        },
      ]),
      difficulty: ref(10), // 1完全通过  0也差不多
      randomKey: Math.random(),
      hoverRowIndex: -1,
      isColumnVisible: true, // 列显示或者隐藏
      searchWords: "",
      sort: "no",
      total: 0,
      currentPage: 1,
      pageSize: 100,
      totalData: [],
    };
  },
  computed: {},
  mounted() {},
  methods: {
    // addALL() {
    //   axios
    //     .post(baseUrl + "addAll", Dicts)
    //     .then((res) => {
    //       //请求成功的回调函数
    //       console.log(res.data);
    //     })
    //     .catch((err) => {
    //       //请求失败的回调函数
    //       console.log(err);
    //     });
    // },

    addArticle() {
      axios
        .post(baseUrl + "addArticle", form1)
        .then((res) => {
          //请求成功的回调函数
          console.log(res.data);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });

      form1.alldanci = "";
      form1.alldancigroup = "";
      form1.article = "";
    },

    onCancel() {
      form1.alldanci = "";
      form1.alldancigroup = "";
    },

    onSubmit() {
      axios
        .post(baseUrl + "alldanci", form1)
        .then((res) => {
          //请求成功的回调函数
          console.log(res.data);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });

      form1.alldanci = "";
      form1.alldancigroup = "";
    },

    onSubmit2(difficulty: number) {
      form1.difficulty = difficulty;
      axios
        .post(baseUrl + "alldancigroup", form1)
        .then((res) => {
          //请求成功的回调函数
          console.log(res.data);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });

      form1.alldanci = "";
      form1.alldancigroup = "";
    },
  },
};
</script>

<template>
  <el-form :model="form1" label-width="120px" style="margin-top: 40px">
    <el-form-item label="输入文章">
      <el-input
        v-model="form1.article"
        type="textarea"
        placeholder="输入文章，单词使用 斯坦福工具 对单词进行 词性还原"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="addArticle">添加文章</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词">
      <el-input v-model="form1.alldanci" type="textarea" />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="onSubmit">Create</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词组">
      <el-input v-model="form1.alldancigroup" type="textarea" />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组，分行</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词和中文">
      <el-input
        v-model="form1.alldancigroup"
        type="textarea"
        placeholder="格式：单词 或者 单词::中文，支持多行"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>
  </el-form>
</template>


<script lang="ts" setup>
interface Danci {
  id: number;
  name: string;
  trans: string;
  know: number;
  difficulty: number;
  notes: string;
}

// ============
</script>

