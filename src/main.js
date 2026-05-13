import { createApp } from "vue";
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import router from './router';
import App from "./App.vue";
import pluginManager from './plugins/pluginManager';
import examplePlugin from './plugins/examplePlugin';

// 导入 Element Plus 样式
import 'element-plus/dist/index.css'
// Element Plus 暗色样式（选择器为 html.dark，需要 utils/appearance.js 同步给 <html> 加 .dark class）
import 'element-plus/theme-chalk/dark/css-vars.css'
// 导入全局通用样式
import './styles/common.css'
// 导入全站视觉升级样式
import './styles/design-refresh.css'
// 导入工具箱工具页统一布局样式
import './styles/toolbox-unified.css'
// 主题精修层（暖奶油+暖橙，对齐官网风格）
import './styles/theme-refresh.css'
// 编辑式分割线布局覆盖层（去卡片化，对齐 website/index.html） — 必须最后加载
import './styles/editorial-flat.css'

import 'md-editor-v3/lib/style.css'

// 导入提醒服务
import { initReminderService } from './utils/reminderService'

// 全局错误处理已移至 App.vue，避免重复 override 导致链式调用问题

const app = createApp(App);

// 配置 Pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);

// 初始化插件系统
pluginManager.registerPlugin(examplePlugin)
// 可以在这里加载更多插件
// pluginManager.loadPlugin('example-plugin')

// 将插件管理器暴露到全局，方便调试
if (import.meta.env.DEV) {
  window.pluginManager = pluginManager
}

app.mount("#app");

// 初始化提醒服务
initReminderService().catch(error => {
});
