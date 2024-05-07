<style type="text/css">
#lines-container {
  font-size: 26px;
  font-size: 26px;
  width: 947px;
  height: 681px;
  margin-left: 100px;
}
</style>

<template>
  <el-form :model="form" label-width="auto" style="max-width: 1500px">
    <el-form-item label="分割文章(\d是匹配数字)">
      <el-input v-model="form.splitArticle" />
    </el-form-item>

    <el-form-item label="分割字符(英文: ?!. )">
      <el-input v-model="form.zifu" />
    </el-form-item>

    <el-form-item label="文章">
      <el-input
        v-model="form.article"
        type="textarea"
        style="width: 15000px"
        :autosize="{ minRows: 10, maxRows: 20 }"
      />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="onSubmit">转成播放段落</el-button>
      <el-button @click="cancelArticle">清空文章</el-button>
      <el-button @click="cancel">清空分割段落</el-button>
    </el-form-item>
  </el-form>

  <div id="lines-container"></div>
</template>

<script lang="ts" setup>
import { reactive } from "vue";

const form = reactive({
  splitArticle: "",
  zifu: "", // 分割字符
  article: "",
  paragraphs: [] as string[], // 存放分割后的段落数组
});

form.splitArticle = String(localStorage.getItem("splitArticle"));
form.zifu = String(localStorage.getItem("zifu"));
form.article = String(localStorage.getItem("article"));

const cancelArticle = () => {
  form.article = "";
};

const cancel = () => {
  form.paragraphs = [];

  const linesContainer = document.getElementById("lines-container");
  while (linesContainer?.firstChild) {
    linesContainer.removeChild(linesContainer.firstChild);
  }
};

window.onload = function () {
  onSubmit();
};

const onSubmit = () => {
  cancel();
  localStorage.setItem("splitArticle", form.splitArticle);
  localStorage.setItem("zifu", form.zifu);
  localStorage.setItem("article", form.article);

  // 使用正则表达式查找第一个数字的索引位置
  const regex2 = new RegExp(form.splitArticle);
  const match = form.article.match(regex2);

  // 如果找到了数字，则进行分割
  let result: any;
  if (match) {
    const index = match.index;
    // 分割字符串，并获取分割后的前半部分
    result = form.article.slice(0, index);
    console.log(result);
  } else {
    console.log("未找到数字");
  }

  // 使用正则表达式根据用户输入的分割字符对文章进行分割
  const regex = new RegExp("[" + form.zifu + "]", "g");
  form.paragraphs = result.split(regex); // split
  form.paragraphs.pop();

  const linesContainer = document.getElementById("lines-container");
  form.paragraphs.forEach((lineText, index) => {
    const lineDiv = document.createElement("div");
    const lineTextElement = document.createElement("p");
    lineText = lineText.replace(/\n/g, " ");
    lineText = lineText.replace(/” /g, " ");
    lineText = lineText.replace(/“/g, " ");
    lineText = lineText.replace(/’/g, "'");
    lineTextElement.innerText = lineText;
    const playButton = createButton(lineText);
    lineDiv.appendChild(lineTextElement);
    lineDiv.appendChild(playButton);
    linesContainer?.appendChild(lineDiv);
  });
};

let currentAudio: any;
function playAudio(text: string) {
  if (currentAudio) {
    currentAudio.pause(); // 暂停当前音频
  }

  const audio = new Audio(
    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`
  );
  audio.play();
  currentAudio = audio; // 更新当前音频
}

function createButton(text: string) {
  const button = document.createElement("button");
  button.textContent = "播放";
  button.style.fontSize = "50px"; // 设置字体大小
  button.style.padding = "8px 12px"; // 设置内边距
  button.addEventListener("click", function () {
    playAudio(text);
  });
  return button;
}
</script>
