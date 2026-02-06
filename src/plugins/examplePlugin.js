/**
 * 示例插件
 * 展示如何创建一个插件
 */

const examplePlugin = {
  id: 'example-plugin',
  name: '示例插件',
  version: '1.0.0',
  description: '这是一个示例插件，展示插件的基本结构',
  author: 'System',

  // 插件配置
  config: {
    enabled: true
  },

  // 生命周期：加载时
  async onLoad() {
    // 可以在这里注册路由、添加菜单项等
    // 例如：注册一个自定义页面
    // router.addRoute({
    //   path: '/example',
    //   component: ExampleComponent
    // })
  },

  // 生命周期：卸载时
  async onUnload() {
    // 清理资源
    // 例如：移除路由
    // router.removeRoute('example')
  },

  // 插件方法
  methods: {
    hello() {
    }
  }
}

export default examplePlugin

