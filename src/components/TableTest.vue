<template>
  <el-table :data="tableData">
    <el-table-column label="可编辑列">
      <template #default="{ row }">
        <el-input
          autosize
          type="textarea"
          v-model="row.editableColumn"
          @blur="onEditDone(row)"
        ></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="nonEditableColumn" label="普通列"></el-table-column>
  </el-table>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ElTable, ElTableColumn, ElInput } from "element-plus";

export default defineComponent({
  name: "EditableTable",
  data() {
    return {
      tableData: [
        {
          editableColumn: "可编辑内容1",
          nonEditableColumn: "普通内容1",
          isEditing: false,
        },
        {
          editableColumn: "可编辑内容2",
          nonEditableColumn: "普通内容2",
          isEditing: false,
        },
        {
          editableColumn: "可编辑内容3",
          nonEditableColumn: "普通内容3",
          isEditing: false,
        },
      ],
    };
  },
  methods: {
    onEdit(row: any) {
      // 设置当前行为编辑状态
      row.isEditing = true;
    },
    onEditDone(row: any) {
      // 将当前行设置为非编辑状态
      row.isEditing = false;
    },
  },
  components: {
    ElTable,
    ElTableColumn,
    ElInput,
  },
});
</script>

<style scoped>
</style>
