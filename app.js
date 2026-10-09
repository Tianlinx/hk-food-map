// 香港美食地图 · 小程序入口
//
// 上线前准备（在微信开发者工具里）：
//   1) 把项目里的 AppID 换成你自己的微信小程序 AppID（project.config.json）
//   2) 顶部菜单「云开发」→ 开通，记下「环境 ID」
//   3) 把下面 CLOUD_ENV 换成你的环境 ID
//   4) 右键 cloudfunctions/login → 上传并部署（云端安装依赖）
//   5) 云开发控制台 → 数据库 → 新建集合 restaurants
//      → 权限设为「所有用户可读，仅创建者可读写」
const CLOUD_ENV = 'cloud1-d8gs9wuggcf7e20e4' // ← 替换为你的云开发环境 ID

// ============ 主题定义 ============
// 每套主题对应一组 CSS 变量（见 app.wxss 的 .theme-xxxx），
// 这里仅用于「设置页预览色块」与「导航栏配色」。
const THEMES = [
  { key: 'blackgold', label: '黑金', bg: '#141210', brand: '#c9a96a', desc: '暖炭黑 + 香槟金' },
  { key: 'mint',      label: '薄荷', bg: '#f3f7f4', brand: '#2f9e7e', desc: '清透绿 + 米白' },
  { key: 'warm',      label: '暖阳', bg: '#fbf6ef', brand: '#e08a3c', desc: '暖沙橙 + 奶白' },
  { key: 'indigo',    label: '靛蓝', bg: '#0f1420', brand: '#6b8cff', desc: '深空蓝 + 雾蓝' },
]
const THEME_STORAGE = 'foodmap_theme'

App({
  globalData: {
    openid: null,
    nickName: '',
    avatarUrl: '',
    isAdmin: false,
    cloudEnv: CLOUD_ENV,
    loginError: null,
    theme: 'blackgold',
    themeClass: 'theme-blackgold',
    THEMES,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请使用 2.2.3 以上的基础库')
      return
    }
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
    // 读取本地保存的主题
    const saved = wx.getStorageSync(THEME_STORAGE) || 'blackgold'
    this.globalData.theme = saved
    this.globalData.themeClass = 'theme-' + saved
    this.ensureLogin()
  },

  // 微信一键登录：调用 login 云函数，openid 由微信云端自动注入，无需任何密钥
  ensureLogin(cb) {
    return new Promise(resolve => {
      if (this.globalData.openid) { this.refreshAdmin(cb, resolve); return }
      wx.cloud.callFunction({ name: 'login' })
        .then(res => {
          this.globalData.openid = res.result && res.result.openid
          // openid 已写进云函数 ADMIN_OPENIDS 即为超级管理员；无需在客户端暴露
          console.log('[openid]', this.globalData.openid)
          this.refreshAdmin(cb, resolve)
        })
        .catch(err => { console.error('登录失败', err); this.globalData.loginError = err; resolve() })
    })
  },

  // 拉取管理员身份（写入 globalData.isAdmin），供各页判定超级管理员
  refreshAdmin(cb, resolve) {
    if (!this.globalData.openid) { cb && cb(); resolve && resolve(); return }
    wx.cloud.callFunction({ name: 'login', data: { action: 'getAdmin' } })
      .then(res => {
        this.globalData.isAdmin = !!(res.result && res.result.isAdmin)
        cb && cb()
        resolve && resolve()
      })
      .catch(() => { cb && cb(); resolve && resolve() })
  },

  // ===== 主题相关 =====
  getThemeClass() { return this.globalData.themeClass },

  // 应用主题：写入全局 + 本地存储，并同步到当前页与底部 tabBar
  applyTheme(name, page) {
    if (!THEMES.some(t => t.key === name)) name = 'blackgold'
    this.globalData.theme = name
    this.globalData.themeClass = 'theme-' + name
    try { wx.setStorageSync(THEME_STORAGE, name) } catch (e) {}
    if (page) this.syncTheme(page)
  },

  // 把主题套用到某个页面：设置根节点 class + 导航栏/窗口配色，并同步底部 tabBar
  syncTheme(page) {
    if (!page) return
    page.setData({ themeClass: this.globalData.themeClass })
    const nav = this.navFor(this.globalData.theme)
    wx.setNavigationBarColor({
      frontColor: nav.front,
      backgroundColor: nav.bg,
      animation: { duration: 200, timingFunc: 'ease' },
    })
    wx.setBackgroundColor({ backgroundColor: nav.bg })
    // 同步自定义 tabBar 的主题
    if (typeof page.getTabBar === 'function') {
      const tab = page.getTabBar()
      if (tab) tab.setData({ themeClass: this.globalData.themeClass })
    }
  },

  navFor(name) {
    switch (name) {
      case 'mint':  return { front: '#000000', bg: '#f3f7f4' }
      case 'warm':  return { front: '#000000', bg: '#fbf6ef' }
      case 'indigo':return { front: '#ffffff', bg: '#0f1420' }
      default:      return { front: '#ffffff', bg: '#141210' } // blackgold
    }
  },
})
