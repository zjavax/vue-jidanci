<script lang="ts">
import { ref } from "vue";
import axios from "axios";

import { reactive } from "vue";
import { nextTick } from "vue";
import { debounce } from "lodash";

import type { TableColumnCtx, TableInstance } from "element-plus";

// ================
var api = "http://localhost:8080/danci/";

// do not use same name with ref
const form1 = reactive({
  alldanci: "",
  alldancigroup: "",
  article: "",
  difficulty: 0,
});

var baseUrl = "http://localhost:8080/";

export default {
  data() {
    return {
      msg: "主页",
      // danciList: [] as any[],
      danciList: ref([
        {
          id: 1,
          danci: "============================",
          chinese: "单词",
          know: 1,
          difficulty: 0,
        },
      ]),
      tableData: ref([
        {
          id: 1,
          danci: "==========",
          chinese: "单词",
          know: 1,
          difficulty: 0,
        },
      ]),
      difficulty: 4,
      randomKey: Math.random(),
      randomKey2: Math.random(),
      hoverRowIndex: -1,
      isAllVisible: true,
      isColumnVisible: false, // 列显示或者隐藏
      searchWords: "",
      sort: "asc",
    };
  },
  computed: {
    isVisible(): (index: number) => boolean {
      return (index: number) =>
        this.isAllVisible || this.hoverRowIndex === index;
    },
    isHoverRow(): (index: number) => boolean {
      return (index: number) => this.hoverRowIndex === index;
    },
  },
  mounted() {
    this.getData(this.difficulty, "asc");
  },
  methods: {
    handleMouseEnter(_: any, index: number): void {
      this.hoverRowIndex = index;
    },
    handleMouseLeave(): void {
      this.hoverRowIndex = -1;
    },
    toggleAllVisible(): void {
      this.isAllVisible = !this.isAllVisible;
      this.$forceUpdate();
    },
    toggleColumn() {
      this.isColumnVisible = !this.isColumnVisible;
      this.refreshTable();
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
          this.danciList = res.data;
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
      this.refreshTable2();
    },

    editData(row: any, column: any) {
      row[column.property + "isShow"] = true;
      //refreshTable是table数据改动时，刷新table的
      this.refreshTable();
    },
    editData2(row: any, column: any) {
      row[column.property + "isShow"] = true;
      this.refreshTable2();
    },

    alterData(row: any, column: any) {
      row[column.property + "isShow"] = false;
      this.refreshTable();

      this.putDifficulty(row, row.difficulty, -1);
    },
    alterData2(row: any, column: any) {
      row[column.property + "isShow"] = false;
      this.refreshTable2();

      this.putDifficulty(row, row.difficulty, -1);
    },
    refreshTable() {
      this.randomKey = Math.random();
    },
    refreshTable2() {
      this.randomKey2 = Math.random();
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
  <el-backtop :visibility-height="0" :bottom="300" :right="1450"
    >顶部</el-backtop
  >

  <!-- 回到底部按钮 -->
  <el-backtop
    class="scroll-to-bottom"
    :visibility-height="0"
    :right="1450"
    @click="handleScrollToBottom"
    >底部
  </el-backtop>

  <el-form :model="form1" label-width="120px">
    <el-form-item style="margin-top: 40px">
      <el-button @click="getData(4, 'asc')">更简4</el-button>
      <el-button @click="getData(0, 'asc')">简单0</el-button>
      <el-button type="warning" @click="getData(1, 'asc')">可背1</el-button>
      <el-button type="danger" @click="getData(2, 'asc')">太难2</el-button>
      <el-button type="danger" @click="getData(3, 'asc')">稍难3</el-button>
      <el-button @click="getData(-10000, 'asc')">幼稚</el-button>
      <el-button @click="getData(-10000 - 1, 'asc')">幼稚-1</el-button>
      <el-button @click="getData(10, 'asc')">文章</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词" v-if="difficulty == 0">
      <el-input v-model="form1.alldanci" type="textarea" />
    </el-form-item>

    <el-form-item v-if="difficulty == 0">
      <el-button type="primary" @click="onSubmit">Create</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="批量输入单词组" v-if="difficulty == 2">
      <el-input v-model="form1.alldancigroup" type="textarea" />
    </el-form-item>

    <el-form-item v-if="difficulty == 2">
      <el-button type="primary" @click="onSubmit2(difficulty)"
        >添加词组，分行</el-button
      >
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item label="输入文章" v-if="difficulty == 10">
      <el-input v-model="form1.article" type="textarea" />
    </el-form-item>

    <el-form-item v-if="difficulty == 10">
      <el-button type="primary" @click="addArticle">添加文章</el-button>
      <el-button @click="onCancel">Cancel</el-button>
    </el-form-item>

    <el-form-item>
      总数：{{ danciList.length }} 困难度：{{ difficulty }}
    </el-form-item>
    <el-form-item>
      <!-- <el-button @click="clearFilter">reset all filters</el-button> -->
      <el-button @click="getData(difficulty, 'no')">单词字典序</el-button>
      <el-button @click="getData(difficulty, 'desc')">熟悉度降序21</el-button>
      <el-button @click="getData(difficulty, 'asc')"> 熟悉度升序12</el-button>
      <el-button @click="toggleAllVisible">{{
        isAllVisible ? "文字模糊" : "文字显示"
      }}</el-button>
      <el-button @click="toggleColumn">
        {{ isColumnVisible ? "列隐藏" : "列显示" }}
      </el-button>
    </el-form-item>

    <!-- <Article /> -->

    <el-form-item>
      <el-table
        border
        resizable
        :data="danciList"
        style="width: 100%"
        :key="randomKey"
      >
        <el-table-column prop="danci" label="单词" width="200">
          <template #header>
            <el-input
              v-model="searchWords"
              size="default"
              placeholder="搜索单词"
              @input="searchData(searchWords)"
            />
          </template>
        </el-table-column>

        <el-table-column
          label="中文"
          prop="chinese"
          v-if="isColumnVisible"
          width="250"
        >
          <template #default="scope">
            <el-input
              type="textarea"
              v-if="scope.row[scope.column.property + 'isShow']"
              :ref="scope.column.property"
              v-model="scope.row.chinese"
              @blur="alterData(scope.row, scope.column)"
            ></el-input>

            <span
              @click="editData(scope.row, scope.column)"
              v-else
              :class="{
                'blur-text': !isVisible(scope.$index),
                'hover-text': isHoverRow(scope.$index),
              }"
              @mouseenter="handleMouseEnter(scope.row, scope.$index)"
              @mouseleave="handleMouseLeave"
              >{{
                scope.row.chinese == null ? "？？？" : scope.row.chinese
              }}</span
            >
          </template>
        </el-table-column>

        <el-table-column fixed="right" label="操作">
          <template #default="scope">
            {{ scope.row.know }}
            <el-button
              type="danger"
              size="small"
              @click="addKnow(scope.row, scope.$index)"
            >
              不认识
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="minusKnow(scope.row, scope.$index)"
            >
              认识-1
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 0"
              size="small"
              @click="putDifficulty(scope.row, 0, scope.$index)"
            >
              简单
            </el-button>
            <el-button
              type="primary"
              v-if="scope.row.difficulty != 4"
              size="small"
              @click="putDifficulty(scope.row, 4, scope.$index)"
            >
              更简
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 1"
              type="primary"
              size="small"
              @click="putDifficulty(scope.row, 1, scope.$index)"
            >
              可背
            </el-button>
            <el-button
              v-if="scope.row.difficulty != 2"
              size="small"
              @click="putDifficulty(scope.row, 2, scope.$index)"
            >
              太难
            </el-button>
            <el-button
              type="danger"
              v-if="scope.row.difficulty != 3"
              size="small"
              @click="putDifficulty(scope.row, 3, scope.$index)"
            >
              稍难
            </el-button>
            <el-button
              v-if="scope.row.difficulty != -10000"
              size="small"
              @click="putDifficulty(scope.row, -10000, scope.$index)"
            >
              幼稚
            </el-button>
            <el-button
              v-if="scope.row.difficulty != -10000 - 1"
              size="small"
              @click="putDifficulty(scope.row, -10000 - 1, scope.$index)"
            >
              幼稚-1
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          fixed="right"
          label="操作"
          width="150"
          v-if="isColumnVisible"
        >
          <template #default="scope">
            <el-button type="danger" size="small" @click="deleteRow(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <el-table-column
          prop="know"
          label="熟悉度"
          width="220"
          v-if="isColumnVisible"
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

    <el-form-item style="margin-top: 150px">
      <el-button type="warning" @click="getData(1, 'asc')">可背诵</el-button>
      <el-button @click="getData(4, 'asc')">更简单4</el-button>
      <el-button @click="getData(0, 'asc')">简单</el-button>
      <el-button type="danger" @click="getData(2, 'asc')">太难不背</el-button>
      <el-button type="danger" @click="getData(3, 'asc')">稍难</el-button>

      <el-button @click="getData(-10000, 'asc')">幼稚</el-button>
    </el-form-item>

    <el-form-item style="margin-top: 50px">
      <el-tag>不认识</el-tag>
      <el-table :data="tableData" style="width: 100%" :key="randomKey2">
        <el-table-column label="单词" width="200">
          <template v-slot="{ row }">
            <el-tooltip :content="row.chinese" placement="left">
              <span>{{ row.danci }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="中文" prop="chinese" width="250">
          <template #default="scope">
            <el-input
              type="textarea"
              v-if="scope.row[scope.column.property + 'isShow']"
              :ref="scope.column.property"
              v-model="scope.row.chinese"
              @blur="alterData2(scope.row, scope.column)"
            ></el-input>

            <span @click="editData2(scope.row, scope.column)" v-else>
              {{
                scope.row.chinese == null ? "可单击输入中文" : scope.row.chinese
              }}</span
            >
          </template>
        </el-table-column>

        <el-table-column fixed="right" label="操作">
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

const filterKnow = (value: number, row: Danci) => {
  return row.know == value;
};

// TODO: improvement typing when refactor table
// const clearFilter = () => {
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-expect-error
//   tableRef.value!.clearFilter();
// };

interface Danci {
  id: number;
  danci: string;
  chinese: string;
  know: number;
  difficulty: number;
}

// ============
</script>

<style scoped>
.blur-text {
  filter: blur(4px);
}

.hover-text {
  filter: none;
  color: #000000;
}

.scroll-to-bottom {
  position: fixed;
  top: 150px;
}
</style>
