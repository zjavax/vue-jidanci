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

const onSubmit = () => {
  cancel();
  localStorage.setItem("zifu", form.zifu);
  localStorage.setItem("article", form.article);

  const text = (form.article || "").trim();

  // form.zifu = "?!,.,A:,B:,C:,D:"

  const rawDelimiters = form.zifu
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const escaped = rawDelimiters
    .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length); // 重要：长的放前面

  const regex = new RegExp(escaped.join("|"), "g");

  form.paragraphs = text
    .split(regex)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const linesContainer = document.getElementById("lines-container");
  form.paragraphs.forEach((lineText, index) => {
    if (lineText === "" || lineText === "\n\n") {
      return;
    }
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

let currentUtterance: SpeechSynthesisUtterance | null = null;

// 全局加载一次声音列表（建议在页面初始化时调用）
function initSpeechSynthesis() {
  if (window.speechSynthesis.onvoiceschanged === null) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log(
        "Edge/浏览器声音列表加载完成，共",
        window.speechSynthesis.getVoices().length,
        "个声音"
      );
    };
  }
}

function playAudio(text: string) {
  if (currentUtterance) {
    window.speechSynthesis.cancel();
  }

  if (!text || !text.trim()) return;

  const utterance = new SpeechSynthesisUtterance(text.trim());

  utterance.lang = "en-US";
  utterance.rate = 0.75; // 你设的慢速，适合学习
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // 关键修复：延迟获取 voices + 使用 onvoiceschanged 确保加载
  const getPreferredVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(
      (voice) =>
        voice.name.includes("Guy") ||
        voice.name.includes("Jenny") ||
        voice.name.includes("Aria") ||
        voice.name.includes("Emma") ||
        (voice.lang === "en-US" &&
          voice.name.toLowerCase().includes("microsoft"))
    );
  };

  // 先尝试立即获取（有时候已经加载好）
  let preferredVoice = getPreferredVoice();

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  } else {
    // 如果还没加载，监听一次 voiceschanged
    const voiceChangeHandler = () => {
      preferredVoice = getPreferredVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.onvoiceschanged = null; // 只监听一次
    };
    window.speechSynthesis.onvoiceschanged = voiceChangeHandler;
  }

  // 播放
  window.speechSynthesis.speak(utterance);
  currentUtterance = utterance;

  utterance.onend = () => {
    currentUtterance = null;
    console.log("播放结束");
  };

  utterance.onerror = (event) => {
    console.error("TTS 播放出错（Edge 常见）:", event);
    currentUtterance = null;

    // 出错时尝试不指定 voice 再播一次（兼容方案）
    if (event.error === "voice-unavailable" || event.error === "network") {
      console.log("尝试不指定声音重新播放...");
      const fallbackUtterance = new SpeechSynthesisUtterance(text.trim());
      fallbackUtterance.lang = "en-US";
      fallbackUtterance.rate = 0.7;
      window.speechSynthesis.speak(fallbackUtterance);
    }
  };
}

// ==================== 初始化 ====================
// 在你的组件加载时（useEffect / window.onload 等）调用一次
initSpeechSynthesis();

// 页面脚本最后加上这句
setTimeout(() => {
  onSubmit();
}, 100);
</script>
