import { createApp } from 'vue'
import App from './App.vue'
import Axios from 'axios'
import Table from './components/Table.vue'
import TableTest from './components/TableTest.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Table },
    { path: '/tableTest', component: TableTest },
  ],
})

// import "~/styles/element/index.scss";

// import ElementPlus from "element-plus";
// import all element css, uncommented next line
// import "element-plus/dist/index.css";

// or use cdn, uncomment cdn link in `index.html`

import '~/styles/index.scss'
import 'uno.css'

// If you want to use ElMessage, import it.
import 'element-plus/theme-chalk/src/message.scss'

const app = createApp(App)
// app.use(ElementPlus);
app.use(router)
app.config.globalProperties.Axios = Axios //全局配置axios
app.mount('#app')
