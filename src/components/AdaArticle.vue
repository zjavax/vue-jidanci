<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";
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
      difficulty: 81, // 1完全通过  0也差不多
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
  mounted() {
    this.getData(this.difficulty, this.sort);
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
    toggleColumn() {
      this.isColumnVisible = !this.isColumnVisible;
      // this.refreshTable();  // 防止列变宽
      this.randomKey = Math.random(); // 防止列变宽
    },

    // 一定是这种使用方式才有效，不要使用箭头函数，不然内部获取不到 this
    searchData: debounce(function (this: any, query: string) {
      if (query != "") {
        axios
          .get("http://localhost:8080/searchWords?searchWords=" + query)
          .then((res) => {
            //请求成功的回调函数
            this.danciList = res.data;
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
      this.currentPage = page;
      this.danciList = this.totalData.slice(
        (page - 1) * this.pageSize,
        page * this.pageSize
      );
      this.randomKey = Math.random();
    },

    getData(difficulty: number, sort: String) {
      this.difficulty = difficulty;
      //2.使用axios 进行get请求
      axios
        .get(
          "http://localhost:8080/getDanci?difficulty=" +
            difficulty +
            "&sort=" +
            sort
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
      var api = "http://localhost:8080/danci/";

      row.difficulty = difficulty;

      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {});

      if (index != -1) {
        // this.deleteTableRow(index);
        this.danciList.splice(index, this.danciList.length - index);
      }
    },

    deleteTableRow(index: number) {
      // this.danciList = this.danciList.filter((item) => {
      //   return item?.id != row.id;
      // });
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

    // 减一  认识

    minusKnow(row: Danci, index: number) {
      row.know = row.know + 5;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {
        console.log();
      });

      // this.deleteTableRow(index);
      this.danciList.splice(index, this.danciList.length - index);
    },

    // 不认识  +1
    addKnow(row: Danci, index: number) {
      // var api = "http://localhost:8080/danci/" + row.id;

      row.know--;
      //2.使用axios 进行get请求
      axios.put(api, row).then(function (response) {});

      this.danciList.splice(index, this.danciList.length - index);
      this.tableData.push(row);
      // this.refreshTable2();
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
      <el-button type="danger" @click="getData(-2, sort)">临时-2</el-button>
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
      <el-divider content-position="left">文章</el-divider>
    </el-form-item>

    <el-form-item>
      <el-button type="danger" @click="getData(1000, sort)">1000</el-button>
    </el-form-item>
    <el-form-item>
      <el-button @click="getData(1010, sort)">1010</el-button>
      <el-button @click="getData(1011, sort)" type="danger">1011</el-button>
    </el-form-item>

    <el-form-item>
      <el-divider content-position="left">推文</el-divider>
    </el-form-item>
    <el-form-item>
      <el-button type="danger" @click="getData(500, sort)">500</el-button>
      <el-button type="" @click="getData(501, sort)">501</el-button>
    </el-form-item>
    <el-form-item>
      <el-button @click="getData(81, sort)">艾达重要81</el-button>
      <el-button type="danger" @click="getData(82, sort)">82</el-button>
      <el-button type="" @click="getData(83, sort)">83</el-button>
      <el-button type="danger" @click="getData(84, sort)">84</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="" @click="getData(91, sort)">专属名词91</el-button>
      <el-button type="" @click="getData(95, sort)">艾达95</el-button>
    </el-form-item>

    <!-- <el-form-item>
      <el-button type="danger" @click="getData(difficulty - 1, sort)"
        >复杂性-1</el-button
      >
      <el-button @click="getData(difficulty + 1, sort)">复杂性+1</el-button>
    </el-form-item> -->

    <el-form-item>
      &nbsp;&nbsp;&nbsp;总数：{{ totalData.length }} 困难度：{{ difficulty }}
    </el-form-item>

    <el-form-item>
      <el-input-number
        v-model="difficulty"
        @change="getData(difficulty, 'no')"
      />
      &nbsp;&nbsp;&nbsp;
      <el-button @click="getData(difficulty, 'no')">单词字典序</el-button>
      <el-button @click="toggleColumn">
        {{ isColumnVisible ? "列隐藏" : "列显示" }}
      </el-button>
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

      <el-link
        v-if="difficulty == 1010"
        href="https://www.essentialcardano.io/article/what-is-cardano-cardano-101"
        target="_blank"
        >what-is-cardano-cardano-101
      </el-link>

      <el-link
        v-if="difficulty == 1000"
        href="https://www.essentialcardano.io/article/your-cardano-onboarding-guide"
        target="_blank"
        >your-cardano-onboarding-guide
      </el-link>
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
              @input="searchData(searchWords)"
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

        <el-table-column label="复杂性">
          <template #default="scope">
            <el-button
              type=""
              size="small"
              @click="putDifficulty(scope.row, difficulty + 1, scope.$index)"
            >
              +1
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="putDifficulty(scope.row, difficulty - 1, scope.$index)"
            >
              -1
            </el-button>
            {{ scope.row.difficulty }}
          </template>
        </el-table-column>

        <el-table-column label="艾达">
          <template #default="scope">
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 81"
              size="small"
              @click="putDifficulty(scope.row, 81, scope.$index)"
            >
              81
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 82"
              size="small"
              @click="putDifficulty(scope.row, 82, scope.$index)"
            >
              82
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 83"
              size="small"
              @click="putDifficulty(scope.row, 83, scope.$index)"
            >
              83
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 84"
              size="small"
              @click="putDifficulty(scope.row, 84, scope.$index)"
            >
              84
            </el-button>
            <el-button
              type=""
              v-if="scope.row.difficulty != 91"
              size="small"
              @click="putDifficulty(scope.row, 91, scope.$index)"
            >
              91
            </el-button>
            <el-button
              type=""
              v-if="scope.row.difficulty != 95"
              size="small"
              @click="putDifficulty(scope.row, 95, scope.$index)"
            >
              95
            </el-button>
            <el-button
              type=""
              v-if="scope.row.difficulty != 501"
              size="small"
              @click="putDifficulty(scope.row, 501, scope.$index)"
            >
              501
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="简单">
          <template #default="scope">
            <el-button
              type="danger"
              v-if="scope.row.difficulty != -1"
              size="small"
              @click="putDifficulty(scope.row, -1, scope.$index)"
            >
              -1
            </el-button>

            <el-button
              type="danger"
              v-if="scope.row.difficulty != -2"
              size="small"
              @click="putDifficulty(scope.row, -2, scope.$index)"
            >
              -2
            </el-button>

            <el-button
              v-if="scope.row.difficulty != 0"
              size="small"
              @click="putDifficulty(scope.row, 0, scope.$index)"
            >
              0
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 51"
              size="small"
              @click="putDifficulty(scope.row, 51, scope.$index)"
            >
              51
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="重要">
          <template #default="scope">
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 71"
              size="small"
              @click="putDifficulty(scope.row, 71, scope.$index)"
            >
              71
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 72"
              size="small"
              @click="putDifficulty(scope.row, 72, scope.$index)"
            >
              72
            </el-button>
          </template>
        </el-table-column>

        <!-- <el-table-column label="操作" v-if="isColumnVisible">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
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
  width: 1300px;
}

.scroll-to-bottom {
  position: fixed;
  top: 150px;
}
</style>
