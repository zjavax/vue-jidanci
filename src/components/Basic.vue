<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";

// import Dicts from "./../dicts/suffix_word.json";
// import Dicts from "./../dicts/Top50Prepositions.json";
// import Dicts from "./../dicts/Top250AdverbWords.json";
// import Dicts from "./../dicts/Top500AdjectiveWords.json";
// import Dicts from "./../dicts/top2000words.json";
// import Dicts from "../dicts/test.json";
// import Dicts from "./../dicts2/NCE_1.json";
// import Dicts from "../dicts2/NCE_2.json";

// import Dicts from "../dicts/test2.json";
// import Dicts from "../dicts2/NCE_3.json";
// import Dicts from "../dicts2/NCE_4.json";

// import Dicts from "../dicts2/CET4_T.json";
// import Dicts from "../dicts2/CET6_T.json";
// import Dicts from "../dicts2/KaoYan_2024.json";
// import Dicts from "../dicts2/suffix_word.json";
// import Dicts from "../dicts2/word_roots1.json";
// import Dicts from "../dicts2/IELTS_3_T.json";

import Dicts from "../dicts2/SAT_3_T.json";

// ================
// 5 ogden.basic-english.org  850

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
      difficulty: 1, // 1完全通过  0也差不多
      randomKey: Math.random(),
      hoverRowIndex: -1,
      isColumnVisible: true, // 列显示或者隐藏
      searchWords: "",
      delayTimer: 0,
      sort: "no",
      total: 0,
      currentPage: 1,
      pageSize: 100,
      totalData: [] as any[],
      options: [] as any[],
      // userName: "张翔",
      userName: "游客",
      categoryId: 2,
      categoryName: "新概念2",
    };
  },
  computed: {},
  mounted() {
    if (localStorage.getItem("categoryId") !== null) {
      this.categoryId = Number(localStorage.getItem("categoryId"));
    }

    if (localStorage.getItem("categoryName") !== null) {
      this.categoryName = String(localStorage.getItem("categoryName"));
    }

    if (localStorage.getItem("difficulty") !== null) {
      this.difficulty = Number(localStorage.getItem("difficulty"));
    }

    if (localStorage.getItem("userName") !== null) {
      this.userName = String(localStorage.getItem("userName"));
    }

    this.getAllCategories();
    this.getData(this.difficulty);
  },
  methods: {
    addALL() {
      var dict3 = [];
      for (var i = 0; i < Dicts.length; i++) {
        Dicts[i].name = Dicts[i].name.toLocaleLowerCase();
        Dicts[i].trans = Dicts[i].trans[0];
        dict3.push(Dicts[i]);
      }

      console.log(dict3[0]);
      console.log(dict3[0].trans);
      console.log(dict3[1]);
      console.log(dict3[1].trans);

      axios
        .post(baseUrl + "addAll", dict3)
        .then((res) => {
          //请求成功的回调函数
          console.log(res.data);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    handleMouseEnter(_: any, index: number): void {
      this.hoverRowIndex = index;
    },
    handleMouseLeave(): void {
      this.hoverRowIndex = -1;
    },
    toggleColumn() {
      this.isColumnVisible = !this.isColumnVisible;
      // this.refreshTable();  // 防止列变宽
      this.randomKey = Math.random(); // 防止列变宽
    },

    search() {
      axios
        .get(
          "http://localhost:8080/searchWords?searchWords=" +
            this.searchWords +
            "&userName=" +
            this.userName +
            "&categoryId=" +
            this.categoryId
        )
        .then((res) => {
          //请求成功的回调函数
          this.totalData = res.data;
          this.handleCurrentChange(this.currentPage);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    searchData() {
      if (this.searchWords.trim() !== "") {
        clearTimeout(this.delayTimer);
        this.delayTimer = setTimeout(() => {
          this.search();
        }, 200) as any;
      } else {
        this.getData(this.difficulty);
      }
    },

    inputUserName() {
      localStorage.setItem("userName", this.userName);
      this.getData(this.difficulty);
    },

    handleCurrentChange(page: number) {
      this.currentPage = page;
      this.total = this.totalData.length;
      this.danciList = this.totalData.slice(
        (page - 1) * this.pageSize,
        page * this.pageSize
      );
      // this.randomKey = Math.random();
    },

    getData(difficulty: number) {
      this.difficulty = difficulty;

      localStorage.setItem("difficulty", String(difficulty));
      //2.使用axios 进行get请求
      axios
        .get(
          "http://localhost:8080/getDanci?userName=" +
            this.userName +
            "&categoryId=" +
            this.categoryId +
            "&difficulty=" +
            difficulty
        )
        .then((res) => {
          //请求成功的回调函数
          this.totalData = res.data;

          this.handleCurrentChange(this.currentPage);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    getAllCategories() {
      axios
        .get("http://localhost:8080/categories/")
        .then((res) => {
          //请求成功的回调函数
          this.options = res.data;
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    sortReversedWords() {
      this.totalData = this.processData(this.totalData);

      this.handleCurrentChange(this.currentPage);
      // this.danciList = this.totalData.slice(this.currentPage, 100);
    },

    // chatgpt
    // vue3 typescript 编写程序
    // 给你一个数组 res.data ，数组元素 是一个对象，对象有一个字段 name
    // 这个name 是英语单词
    // 我需要先把单词反转：例如 word 转为 drow
    // 然后将这个字段进行 字典排序
    // 排序结束之后 再把单词恢复原样
    // 最后输出res.data
    processData(data: any) {
      // 1. 反转单词
      const reversedWords = data.map((item: any) => {
        const reversedName = item.name.split("").reverse().join("");
        return { ...item, name: reversedName };
      });

      // 2. 对name字段进行字典排序
      const sortedWords = reversedWords.sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );

      // 3. 恢复单词原样
      const restoredWords = sortedWords.map((item: any) => {
        const originalName = item.name.split("").reverse().join("");
        return { ...item, name: originalName };
      });

      // 4. 输出res.data
      console.log(restoredWords);
      return restoredWords;
    },

    handleSelectChange(option: any) {
      this.categoryId = option.categoryId;
      localStorage.setItem("categoryId", option.categoryId);
      localStorage.setItem("categoryName", option.categoryName);

      this.getData(this.difficulty);
    },

    putDifficulty(row: Danci, difficulty: number, index: number) {
      var api = "http://localhost:8080/danci";

      row.difficulty = difficulty;

      //2.使用axios 进行get请求
      axios
        .put(api + "?userName=" + this.userName, row)
        .then(function (response) {});

      if (index != -1) {
        this.danciList.splice(index, this.danciList.length - index);
      }
    },

    deleteTableRow(index: number) {
      this.danciList.splice(index, 1);
    },

    deleteRow(row: Danci, index: number) {
      var api = "http://localhost:8080/danci/deleteById/" + row.id;

      //2.使用axios 进行get请求
      axios.delete(api).then(function (response) {});

      this.danciList = this.danciList.filter((item) => {
        return item?.id != row.id;
      });

      this.danciList.splice(index, this.danciList.length - index);
    },

    deleteRowCache(index: number) {
      this.tableData.splice(index, 1);
    },

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
      this.getData(10);
    },
  },
};
</script>

<template>
  <!-- 回到顶部按钮 -->
  <el-backtop :visibility-height="0" :bottom="300" :right="1600"
    >顶部</el-backtop
  >

  <!-- 回到底部按钮 -->
  <el-backtop
    class="scroll-to-bottom"
    :visibility-height="0"
    :right="1600"
    @click="handleScrollToBottom"
    >底部
  </el-backtop>

  <el-form :model="form1" label-width="120px">
    <el-button type="primary" @click="addALL">添加词典</el-button>

    <el-form-item style="margin-top: 40px">
      <el-button type="info" @click="getData(-1)">幼稚-1</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="getData(0)">简单0</el-button>
      <el-button type="primary" @click="getData(1)">1</el-button>
      <el-button type="primary" @click="getData(2)">2</el-button>
      <el-button type="primary" @click="getData(3)">3</el-button>
      <el-button type="primary" @click="getData(4)">4</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="warning" @click="getData(51)">重要51</el-button>
      <el-button type="warning" @click="getData(52)">52</el-button>
      <el-button type="warning" @click="getData(53)">53</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="danger" @click="getData(91)">复杂91</el-button>
      <el-button type="danger" @click="getData(92)">92</el-button>
    </el-form-item>

    <el-form-item>
      <!-- 困难度：{{ difficulty }} -->
    </el-form-item>

    <el-form-item>
      总数：{{ totalData.length }} &nbsp;&nbsp;&nbsp;

      <!-- <el-button @click="getData(difficulty, 'no')">单词字典序</el-button>
      <el-button @click="sortReversedWords()" type="danger">看后缀</el-button> -->
      <el-button @click="toggleColumn" type="">
        {{ isColumnVisible ? "列隐藏" : "列显示" }}
      </el-button>

      <!-- <el-button type="" @click="getData(difficulty - 1)"
        >困难度-1</el-button
      >
      <el-button @click="getData(difficulty + 1)">困难度+1</el-button> -->

      &nbsp;&nbsp;&nbsp;
      <el-input-number v-model="difficulty" @change="getData(difficulty)" />

      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 用户名：
      <el-input
        class="w-60 m-2"
        v-model="userName"
        placeholder="请输入用户名，游客记录不保存"
        @blur="inputUserName()"
      />

      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 词库：
      <el-select
        v-model="categoryName"
        value-key="categoryId"
        placeholder="Select"
        @change="handleSelectChange"
      >
        <el-option
          v-for="item in options"
          :key="item.categoryId"
          :label="item.categoryName"
          :value="item"
        />
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-pagination
        background
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-size="100"
        :page-sizes="[50, 100, 200]"
        :pager-count="11"
        layout="prev, pager, next"
        :total="total"
      />
    </el-form-item>
    <el-form-item>
      <el-table
        class="table1"
        border
        resizable
        :data="danciList"
        :key="randomKey"
      >
        <el-table-column prop="name" label="单词">
          <template #header>
            <el-input
              v-model="searchWords"
              size="default"
              placeholder="搜索单词"
              @input="searchData"
            />
          </template>
          <template v-slot="{ row }">
            <el-tooltip :content="row.trans" placement="left">
              <span>{{ row.name }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="中文" v-if="isColumnVisible">
          <template #default="{ row }">
            <el-input
              autosize
              type="textarea"
              placeholder="Please input"
              v-model="row.trans"
              @blur="putDifficulty(row, row.difficulty, -1)"
            ></el-input>
          </template>
        </el-table-column>

        <el-table-column label="困难度+-" width="150px">
          <template #default="scope">
            <!-- {{ scope.row.difficulty }} -->
            <el-button
              type=""
              size="small"
              @click="putDifficulty(scope.row, difficulty + 1, scope.$index)"
            >
              +1
            </el-button>
            <el-button
              type=""
              size="small"
              @click="putDifficulty(scope.row, difficulty - 1, scope.$index)"
            >
              -1
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="困难度" width="550px">
          <template #default="scope">
            <el-button
              type="info"
              v-if="scope.row.difficulty != -1"
              size="small"
              @click="putDifficulty(scope.row, -1, scope.$index)"
            >
              幼-1
            </el-button>

            <el-button
              type="primary"
              v-if="scope.row.difficulty != 0"
              size="small"
              @click="putDifficulty(scope.row, 0, scope.$index)"
            >
              简0
            </el-button>

            <el-button
              v-if="scope.row.difficulty != 1"
              type="primary"
              size="small"
              @click="putDifficulty(scope.row, 1, scope.$index)"
            >
              1
            </el-button>
            <el-button
              type="primary"
              v-if="scope.row.difficulty != 2"
              size="small"
              @click="putDifficulty(scope.row, 2, scope.$index)"
            >
              2
            </el-button>
            <el-button
              type="primary"
              v-if="scope.row.difficulty != 3"
              size="small"
              @click="putDifficulty(scope.row, 3, scope.$index)"
            >
              3
            </el-button>
            <el-button
              type="primary"
              v-if="scope.row.difficulty != 4"
              size="small"
              @click="putDifficulty(scope.row, 4, scope.$index)"
            >
              4
            </el-button>

            <el-button
              type="warning"
              v-if="scope.row.difficulty != 51"
              size="small"
              @click="putDifficulty(scope.row, 51, scope.$index)"
            >
              重51
            </el-button>
            <el-button
              type="warning"
              v-if="scope.row.difficulty != 52"
              size="small"
              @click="putDifficulty(scope.row, 52, scope.$index)"
            >
              52
            </el-button>
            <el-button
              type="warning"
              v-if="scope.row.difficulty != 53"
              size="small"
              @click="putDifficulty(scope.row, 53, scope.$index)"
            >
              53
            </el-button>

            <el-button
              type="danger"
              v-if="scope.row.difficulty != 91"
              size="small"
              @click="putDifficulty(scope.row, 91, scope.$index)"
            >
              复91
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 92"
              size="small"
              @click="putDifficulty(scope.row, 92, scope.$index)"
            >
              92
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-form-item>
  </el-form>
</template>


<script lang="ts" setup>
// 记录当前滚动位置
const scrollTop = ref(0);

// 监听窗口滚动事件，更新scrollTop变量
window.addEventListener("scroll", () => {
  scrollTop.value =
    document.documentElement.scrollTop || document.body.scrollTop;
});

// 回到底部
const handleScrollToBottom = () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
};

interface Danci {
  id: number;
  name: string;
  trans: string;
  difficulty: number;

  notes: string;
  know: number;

  userId: number; // 为了测试显示用的
}

// ============
</script>

<style scoped>
.table1 {
  width: 1300px;
  margin-bottom: 300px;
}

.scroll-to-bottom {
  position: fixed;
  top: 150px;
}
</style>
