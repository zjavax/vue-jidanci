import { createApp } from 'vue'
import App from './App.vue'
import Axios from 'axios'
import AddText from './components/AddText.vue'
import Table from './components/Table.vue'
import Danci3000 from './components/Danci3000.vue'
import Nce2 from './components/Nce2.vue'
import AdaArticle from './components/AdaArticle.vue'
import OneStoryADay from './components/OneStoryADay.vue'
import Basic from './components/Basic.vue'
import TableTest from './components/TableTest.vue'
import HelloWorld from './components/HelloWorld.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // { path: '/', component: Table },
    { path: '/', component: Nce2 },
    // { path: '/', component: Basic },
    // { path: '/nce2', component: Nce2 },
    // { path: '/adaArticle', component: AdaArticle },
    // { path: '/tableTest', component: TableTest },
    // { path: '/table', component: Table },
    // { path: '/addText', component: AddText },
    // { path: '/danci3000', component: Danci3000 },
    // { path: '/helloWorld', component: HelloWorld },
    // { path: '/oneStoryADay', component: OneStoryADay },
  ],
})

// import "~/styles/element/index.scss";

// import ElementPlus from "element-plus";
// import all element css, uncommented next line
// import "element-plus/dist/index.css";

// or use cdn, uncomment cdn link in `index.html`

// import '~/styles/index.scss'
// import 'uno.css'

// If you want to use ElMessage, import it.
// import 'element-plus/theme-chalk/src/message.scss'

const app = createApp(App)
// app.use(ElementPlus);
app.use(router)
app.config.globalProperties.Axios = Axios //全局配置axios
app.mount('#app')
