const app = getApp()

// 旧数据里的「特色小吃」已更名为「好玩的」，审核列表里同样归一显示
const normalizeCuisine = c => (c === '特色小吃' ? '好玩的' : c)

Page({
  data: { list: [], loading: false },

  onShow() {
    if (!app.globalData.isAdmin) {
      wx.showModal({ title: '无权限', content: '仅管理员可审核投稿', showCancel: false, success: () => wx.navigateBack() })
      return
    }
    app.syncTheme(this)
    this.load()
  },

  load() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'login', data: { action: 'getSubmissions' } })
      .then(res => {
        const list = ((res.result && res.result.list) || [])
          .map(s => Object.assign({}, s, { cuisine: normalizeCuisine(s.cuisine) }))
        this.setData({ list, loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  preview(e) {
    const urls = e.currentTarget.dataset.urls
    if (urls && urls.length) wx.previewImage({ urls })
  },

  approve(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '发布中' })
    wx.cloud.callFunction({ name: 'login', data: { action: 'approveSubmission', id } })
      .then(res => {
        wx.hideLoading()
        if (res.result && res.result.ok) {
          wx.showToast({ title: '已发布到展示库', icon: 'success' })
          this.load()
        } else {
          wx.showToast({ title: (res.result && res.result.msg) || '发布失败', icon: 'none' })
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
  },

  reject(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝投稿',
      content: '确定拒绝并删除这条投稿？',
      success: r => {
        if (!r.confirm) return
        wx.showLoading({ title: '删除中' })
        wx.cloud.callFunction({ name: 'login', data: { action: 'rejectSubmission', id } })
          .then(res => {
            wx.hideLoading()
            if (res.result && res.result.ok) {
              wx.showToast({ title: '已拒绝', icon: 'none' })
              this.load()
            } else {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'none' })
          })
      },
    })
  },
})
