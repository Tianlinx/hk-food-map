const app = getApp()

Component({
  data: {
    selected: 0,
    themeClass: '',
    list: [
      { pagePath: "/pages/index/index", text: "地图" },
      { pagePath: "/pages/mine/mine", text: "我的" },
    ],
  },
  lifetimes: {
    attached() {
      this.setData({ themeClass: app.getThemeClass() })
    },
  },
  pageLifetimes: {
    show() {
      this.setData({ themeClass: app.getThemeClass() })
    },
  },
  methods: {
    switchTab(e) {
      wx.switchTab({ url: e.currentTarget.dataset.path })
    },
    goAdd() {
      wx.navigateTo({ url: '/pages/add/add' })
    },
  },
})
