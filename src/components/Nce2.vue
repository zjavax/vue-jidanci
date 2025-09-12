<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";
// @ts-ignore
import { debounce } from "lodash";

// import Dicts from "./../dicts/suffix_word.json";
// import Dicts from "./../dicts/Top50Prepositions.json";
// import Dicts from "./../dicts/Top250AdverbWords.json";
// import Dicts from "./../dicts/Top500AdjectiveWords.json";
// import Dicts from "./../dicts/top2000words.json";
// import Dicts from "./../dicts/NCE_1.json";
// import Dicts from "../dicts/NCE_2.json";

import type { TableColumnCtx, TableInstance } from "element-plus";

// ================

// var baseUrl = "http://117.50.196.55:8080/";
// var api = "http://117.50.196.55:8080/danci/";
const baseUrl = "http://" + import.meta.env.VITE_SERVER_IP + ":8080/";
var api = baseUrl + "danci/";

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
      difficulty: 0, // 1完全通过  0也差不多
      know: 0,
      sortAscOrDesc: 2,
      randomKey: Math.random(),
      hoverRowIndex: -1,
      isColumnVisible: true, // 列显示或者隐藏
      isKnowColumnVisible: true,
      isDifficultyColumnVisible: true,
      isDifficultySelectColumnVisible: true,
      searchWords: "",
      sort: "no",
      total: 0,
      currentPage: 1,
      pageSize: 100,
      currentAudio: new Audio(),
      totalData: [],
      currentRowIndex: -1,
    };
  },
  computed: {},
  mounted() {
    if (localStorage.getItem("difficulty") !== null) {
      this.difficulty = Number(localStorage.getItem("difficulty"));
    }
    if (
      localStorage.getItem("currentPage") !== null &&
      localStorage.getItem("currentPage") !== ""
    ) {
      this.currentPage = Number(localStorage.getItem("currentPage"));
    }

    this.getData(this.difficulty, "asc");

    this.toggleColumn("全部隐藏");
  },
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

    handleMouseEnter(_: any, index: number): void {
      this.hoverRowIndex = index;
    },
    handleMouseLeave(): void {
      this.hoverRowIndex = -1;
    },
    toggleColumn(columnName: string) {
      if (columnName == "中文") {
        this.isColumnVisible = !this.isColumnVisible;
        // this.refreshTable();  // 防止列变宽
        this.randomKey = Math.random(); // 防止列变宽
      }
      if (columnName == "熟悉度加减") {
        this.isKnowColumnVisible = !this.isKnowColumnVisible;
        this.randomKey = Math.random(); // 防止列变宽
      }
      if (columnName == "困难度加减") {
        this.isDifficultyColumnVisible = !this.isDifficultyColumnVisible;
        this.randomKey = Math.random(); // 防止列变宽
      }
      if (columnName == "困难度选择") {
        this.isDifficultySelectColumnVisible =
          !this.isDifficultySelectColumnVisible;
        this.randomKey = Math.random(); // 防止列变宽
      }
      if (columnName == "全部隐藏") {
        this.isDifficultyColumnVisible = false;
        this.isDifficultySelectColumnVisible = false;

        this.randomKey = Math.random(); // 防止列变宽
      }
    },

    // 一定是这种使用方式才有效，不要使用箭头函数，不然内部获取不到 this
    searchData: debounce(function (this: any, query: string) {
      if (query != "") {
        axios
          .get(baseUrl + "searchWords?searchWords=" + query)
          .then((res) => {
            //请求成功的回调函数
            // this.danciList = res.data;
            this.totalData = res.data;
            this.handleCurrentChange(this.currentPage);
          })
          .catch((err) => {
            //请求失败的回调函数
            console.log(err);
          });
      } else {
        this.getData(this.difficulty, this.sort);
      }
    }, 200),

    // searchData: debounce(function (this: any, search: string) {
    //   this.danciList = this.danciList.filter(
    //     (data: any) =>
    //       !search || data.danci.toLowerCase().includes(search.toLowerCase())
    //   );
    // }, 200),

    handleCurrentChange(page: number) {
      localStorage.setItem("currentPage", String(page));
      this.currentPage = page;
      this.total = this.totalData.length;
      this.danciList = this.totalData.slice(
        (page - 1) * this.pageSize,
        page * this.pageSize
      );
      // this.randomKey = Math.random();
    },

    getData(difficulty: number, sort: String) {
      this.searchWords = "";
      this.difficulty = difficulty;
      localStorage.setItem("difficulty", String(difficulty));
      //2.使用axios 进行get请求
      axios
        .get(baseUrl + "getDanci?difficulty=" + difficulty + "&sort=" + sort)
        .then((res) => {
          //请求成功的回调函数
          // this.totalData = res.data;
          // this.danciList = res.data.slice(0, 100);
          // this.total = res.data.length;
          // this.randomKey = Math.random();

          // this.totalData = res.data.sort((a: any, b: any) =>
          //   a.name.localeCompare(b.name)
          // );
          this.totalData = res.data;
          this.handleCurrentChange(this.currentPage);
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    getData2(difficulty: number, sort: String) {
      var username = "张三";
      this.difficulty = difficulty;
      //2.使用axios 进行get请求
      axios
        .get(
          baseUrl +
            "getDanci?difficulty=" +
            5 +
            "&categoryId=" +
            1 +
            "&username=" +
            username
        )
        .then((res) => {
          //请求成功的回调函数
          this.totalData = res.data;
          this.danciList = res.data.slice(0, 100);
          this.total = res.data.length;
          this.randomKey = Math.random();
        })
        .catch((err) => {
          //请求失败的回调函数
          console.log(err);
        });
    },

    putDifficulty(row: Danci, difficulty: number, index: number) {
      var api = baseUrl + "danci/";

      row.difficulty = difficulty;

      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {});

      this.deleteTableRow(index);
    },

    putKnow(row: Danci, know: number, index: number) {
      row.know = know;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });

      this.playAudio(row.name);

      this.deleteTableRow(index);
    },

    handleRowClick(row: any) {
      this.currentRowIndex = this.danciList.findIndex(
        (item) => item.name === row.name
      );
      (this.$refs.tableRef as any).setCurrentRow(row);
      // 行点击事件，调用 playAudio
      this.playAudio(row.name);
    },

    playAudio(text: string) {
      const audio = new Audio(
        `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
          text
        )}&type=2`
      );

      audio.play();
    },

    handleKeydown(event: any) {
      if (!this.$refs.tableRef) return;
      const totalRows = this.danciList.length;
      if (event.key === "ArrowDown") {
        if (this.currentRowIndex < totalRows - 1) {
          this.currentRowIndex += 1;
          const nextRow = this.danciList[this.currentRowIndex];
          (this.$refs.tableRef as any).setCurrentRow(nextRow);
          this.playAudio(nextRow.name);
        }
      } else if (event.key === "ArrowUp") {
        if (this.currentRowIndex > 0) {
          this.currentRowIndex -= 1;
          const prevRow = this.danciList[this.currentRowIndex];
          (this.$refs.tableRef as any).setCurrentRow(prevRow);
          this.playAudio(prevRow.name);
        }
      }
    },

    sortByKnow() {
      this.totalData = this.processData(this.totalData);

      this.handleCurrentChange(this.currentPage);
    },

    processData(data: any) {
      var sortedWords;
      if (this.sortAscOrDesc / 2 == 1) {
        sortedWords = data.sort((a: any, b: any) => a.know - b.know);
        this.sortAscOrDesc++;
      } else {
        sortedWords = data.sort((a: any, b: any) => b.know - a.know);
        this.sortAscOrDesc--;
      }

      return sortedWords;
    },

    deleteTableRow(index: number) {
      // this.danciList = this.danciList.filter((item) => {
      //   return item?.id != row.id;
      // });

      if (index != -1) {
        this.danciList.splice(index, 1);
        // this.danciList.splice(index, this.danciList.length - index);
      }
    },

    deleteRow(row: Danci, index: number) {
      var api = baseUrl + "danci/deleteById/" + row.id;

      //2.使用axios 进行get请求
      axios.delete(api).then(function (response) {});

      this.danciList = this.danciList.filter((item) => {
        return item?.id != row.id;
      });

      this.danciList.splice(index, this.danciList.length - index);
    },

    // // 减一  认识
    // minusKnow(row: Danci, index: number) {
    //   row.know = row.know + 5;
    //   //2.使用axios 进行get请求
    //   axios.put(api, row).then(function (response) {
    //     console.log();
    //   });

    //   // this.deleteTableRow(index);
    //   this.danciList.splice(index, this.danciList.length - index);
    // },

    // // 不认识  +1
    // addKnow(row: Danci, index: number) {
    //   // var api = baseUrl+"danci/" + row.id;

    //   row.know--;
    //   //2.使用axios 进行get请求
    //   axios.put(api, row).then(function (response) {});

    //   this.danciList.splice(index, this.danciList.length - index);
    //   this.tableData.push(row);
    //   // this.refreshTable2();
    // },

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
      this.getData(10, "desc");
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
    <el-form-item style="margin-top: 40px">
      <el-button @click="getData(-1, sort)">幼稚-1</el-button>
      <el-button type="danger" @click="getData(-2, sort)">-2</el-button>
    </el-form-item>
    <el-form-item>
      <el-button @click="getData(0, sort)">简单0</el-button>
      <el-button type="warning" @click="getData(1, sort)">1</el-button>
      <el-button type="danger" @click="getData(2, sort)">2</el-button>
      <el-button type="danger" @click="getData(3, sort)">3</el-button>
      <el-button type="danger" @click="getData(4, sort)">4</el-button>
    </el-form-item>
    <el-form-item>
      <el-button @click="getData(51, sort)">复杂51</el-button>
      <el-button type="danger" @click="getData(52, sort)">52</el-button>
    </el-form-item>
    <el-form-item>
      <el-button @click="getData(71, sort)">重要71</el-button>
      <el-button type="danger" @click="getData(72, sort)">72</el-button>
    </el-form-item>

    <el-form-item>
      总数：{{ totalData.length }} 困难度：{{ difficulty }}
    </el-form-item>

    <el-form-item>
      <el-button @click="getData(difficulty, 'asc')">刷新</el-button>
      <el-button @click="getData(difficulty, 'asc')">单词字典序</el-button>
      <el-button @click="getData(difficulty, '1')">COCA单词频率倒序</el-button>
      <el-button @click="sortByKnow()">熟悉度排序</el-button>
      &nbsp;&nbsp;&nbsp;
      <el-input-number
        v-model="difficulty"
        @change="getData(difficulty, sort)"
      />
    </el-form-item>

    <el-form-item>
      <el-button @click="toggleColumn('中文')">
        {{ isColumnVisible ? "中文隐藏" : "中文显示" }}
      </el-button>
      <el-button @click="toggleColumn('熟悉度加减')">
        {{ isKnowColumnVisible ? "熟悉度加减隐藏" : "熟悉度加减显示" }}
      </el-button>
      <el-button @click="toggleColumn('困难度加减')">
        {{ isDifficultyColumnVisible ? "困难度加减隐藏" : "困难度加减显示" }}
      </el-button>
      <el-button @click="toggleColumn('困难度选择')">
        {{
          isDifficultySelectColumnVisible ? "困难度选择隐藏" : "困难度选择显示"
        }}
      </el-button>
      <el-button @click="toggleColumn('全部隐藏')"> 全部隐藏 </el-button>
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
        @row-click="handleRowClick"
        ref="tableRef"
        highlight-current-row
        tabindex="0"
        @keydown="handleKeydown"
      >
        <el-table-column prop="name" label="单词" width="200px">
          <template #header>
            <el-input
              v-model="searchWords"
              size="default"
              placeholder="搜索单词"
              @input="searchData(searchWords)"
            />
          </template>
          <template v-slot="scope">
            <el-tooltip :content="scope.row.trans" placement="top-start">
              <span @mouseenter="playAudio(scope.row.name)"
                >&nbsp;&nbsp; {{ scope.row.name }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- autosize -->
        <el-table-column label="中文" v-if="isColumnVisible">
          <template #default="scope">
            <el-input
              :rows="4"
              type="textarea"
              placeholder="Please input"
              v-model="scope.row.trans"
              @blur="putDifficulty(scope.row, scope.row.difficulty, -1)"
            ></el-input>
          </template>
        </el-table-column>

        <el-table-column label="熟悉度加减" v-if="isKnowColumnVisible">
          <template #default="scope">
            <el-button
              style="width: 80px; height: 70px"
              type="info"
              size="large"
              @click="
                putKnow(
                  scope.row,
                  (scope.row.know = scope.row.know - 1),
                  scope.$index
                )
              "
            >
              -----<br />
              -----<br />
              -----<br />
            </el-button>

            &nbsp;
            {{ scope.row.know }}

            <el-button
              style="width: 80px; height: 70px"
              type="info"
              size="large"
              @click="
                putKnow(
                  scope.row,
                  (scope.row.know = scope.row.know + 1),
                  scope.$index
                )
              "
            >
              +++++<br />
              +++++<br />
              +++++<br />
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="困难度加减" v-if="isDifficultyColumnVisible">
          <template #default="scope">
            <el-button
              style="width: 80px; height: 70px"
              type="danger"
              size="large"
              @click="putDifficulty(scope.row, difficulty - 1, scope.$index)"
            >
              -----<br />
              -----<br />
              -----<br />
            </el-button>

            &nbsp;
            {{ scope.row.difficulty }}

            <el-button
              style="width: 80px; height: 70px"
              type="danger"
              size="large"
              @click="putDifficulty(scope.row, difficulty + 1, scope.$index)"
            >
              +++++<br />
              +++++<br />
              +++++<br />
            </el-button>
          </template>
        </el-table-column>

        <el-table-column
          label="困难度选择"
          min-width="150px"
          v-if="isDifficultySelectColumnVisible"
        >
          <template #default="scope">
            <el-button
              circle
              type="danger"
              size="large"
              v-if="scope.row.difficulty != -1"
              @click="putDifficulty(scope.row, -1, scope.$index)"
            >
              -1
            </el-button>

            <el-button
              v-if="scope.row.difficulty != 0"
              size="large"
              @click="putDifficulty(scope.row, 0, scope.$index)"
            >
              0
            </el-button>

            <el-button
              v-if="scope.row.difficulty != 1"
              type="primary"
              size="large"
              @click="putDifficulty(scope.row, 1, scope.$index)"
            >
              1
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 2"
              size="large"
              @click="putDifficulty(scope.row, 2, scope.$index)"
            >
              2
            </el-button>
            <!-- <el-button
              type="danger"
              v-if="scope.row.difficulty != 3"
              size="large"
              @click="putDifficulty(scope.row, 3, scope.$index)"
            >
              3
            </el-button> -->
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 4"
              size="large"
              @click="putDifficulty(scope.row, 4, scope.$index)"
            >
              4
            </el-button>

            <el-button
              type="danger"
              v-if="scope.row.difficulty != 51"
              size="large"
              @click="putDifficulty(scope.row, 51, scope.$index)"
            >
              51
            </el-button>
            <!-- <el-button
              type="danger"
              v-if="scope.row.difficulty != 52"
              size="large"
              @click="putDifficulty(scope.row, 52, scope.$index)"
            >
              52
            </el-button> -->

            <!-- <el-button
              type="danger"
              v-if="scope.row.difficulty != 71"
              size="large"
              @click="putDifficulty(scope.row, 71, scope.$index)"
            >
              71
            </el-button> -->
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 72"
              size="large"
              @click="putDifficulty(scope.row, 72, scope.$index)"
            >
              72
            </el-button>
          </template>
        </el-table-column>
        <!-- <el-table-column label="复杂">
          <template #default="scope">

          </template>
        </el-table-column> -->
        <!-- <el-table-column label="重要">
          <template #default="scope">
            
          </template>
        </el-table-column> -->

        <!-- <el-table-column label="操作" v-if="isColumnVisible">
          <template #default="scope">
            <el-button
              type="danger"
              size="large"
              @click="deleteRow(scope.row, scope.$index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column> -->
      </el-table>
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
    <el-form-item>
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
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
  know: number;
  difficulty: number;
  notes: string;
}

// ============
</script>

<style scoped>
.table1 {
  width: 1500px;
}

.scroll-to-bottom {
  position: fixed;
  top: 150px;
}
</style>
