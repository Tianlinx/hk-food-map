const app = getApp()

function maskOpenid(id) {
  if (!id) return ''
  if (id.length <= 10) return id
  return id.slice(0, 6) + ' **** ' + id.slice(-4)
}

Page({
  data: {
    loggedIn: false,
    openid: '',
    openidDisplay: '',
    openidMasked: true,
    isAdmin: false,
    nickName: '',
    avatarUrl: '',
    version: '0.0.8', // 版本号：每次改动代码最后一位 +1（0.0.8 → 0.0.9）
    themeClass: '',
    themes: [],
    currentTheme: 'blackgold',
    _lastTap: 0,
  },

  onShow() {
    const g = app.globalData
    const t = g.theme || 'blackgold'
    this.setData({
      loggedIn: !!g.openid,
      openid: g.openid || '',
      isAdmin: !!g.isAdmin,
      nickName: g.nickName || '',
      avatarUrl: g.avatarUrl || '',
      themeClass: g.themeClass,
      themes: (g.THEMES || []).map(x => ({ ...x })),
      currentTheme: t,
      openidDisplay: this.data.openidMasked ? maskOpenid(g.openid || '') : (g.openid || ''),
    })
  },

  // openid 默认遮罩，双击整行才显示明文（防截图被劫用）
  revealOpenid() {
    const now = Date.now()
    if (now - this.data._lastTap < 320) {
      this.setData({ openidMasked: false, openidDisplay: this.data.openid })
    }
    this.data._lastTap = now
  },

  copyOpenid() {
    if (!this.data.openid) return
    wx.setClipboardData({
      data: this.data.openid,
      success: () => wx.showToast({ title: 'openid 已复制', icon: 'success' }),
    })
  },

  chooseTheme(e) {
    const key = e.currentTarget.dataset.key
    app.applyTheme(key, this)
    this.setData({ currentTheme: key, themeClass: app.getThemeClass() })
    wx.showToast({ title: '已切换主题', icon: 'success' })
  },

  clearCache() {
    wx.showModal({
      title: '清除本地缓存',
      content: '只清除本机临时数据（如搜索记录），不会影响云端任何探店数据。',
      success: r => {
        if (!r.confirm) return
        try { wx.clearStorageSync() } catch (e) {}
        wx.showToast({ title: '已清除', icon: 'success' })
      },
    })
  },
})
