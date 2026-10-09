const app = getApp()

const RATING_LABELS = { 1: '拉完了', 2: 'NPC', 3: '人上人', 4: '顶级', 5: '夯爆了' }
// 旧数据里的「特色小吃」已更名为「好玩的」，读取时归一，保证筛选和图标都能命中历史记录
const normalizeCuisine = c => (c === '特色小吃' ? '好玩的' : c)
const CUISINE_ICON = {
  '中餐': '../../assets/cuisine/zhongcan.png',
  '西餐': '../../assets/cuisine/xican.png',
  '饮品甜点': '../../assets/cuisine/yinpin.png',
  '好玩的': '../../assets/cuisine/fun.png',
}
const MARKER_ICON = {
  '中餐': '../../assets/markers/marker_zhongcan.png',
  '西餐': '../../assets/markers/marker_xican.png',
  '饮品甜点': '../../assets/markers/marker_yinpin.png',
  '好玩的': '../../assets/markers/marker_fun.png',
}
const MARKER_DEFAULT = '../../assets/markers/marker_default.png'

Page({
  data: {
    spot: null,
    marker: [],
    isMine: false,
    isAdmin: false,
    canManage: false,
    isFav: false,
  },

  onLoad(options) {
    if (options.id) this.load(options.id)
  },

  onShow() {
    app.syncTheme(this)
  },

  enrich(s) {
    const cuisine = normalizeCuisine(s.cuisine)
    return {
      ...s,
      cuisine,
      coverUrl: s.cover || (s.photo_paths && s.photo_paths[0]) || '',
      cuisineIcon: CUISINE_ICON[cuisine] || '',
      ratingLabel: RATING_LABELS[s.rating] || '',
    }
  },

  load(id) {
    wx.showLoading({ title: '加载中' })
    wx.cloud.database().collection('restaurants').doc(id).get()
      .then(res => {
        const spot = this.enrich(res.data)
        const isMine = spot.owner_id === app.globalData.openid
        const isAdmin = !!app.globalData.isAdmin
        this.setData({
          spot,
          isMine,
          isAdmin,
          canManage: isAdmin || isMine,
          marker: [{ id: 0, latitude: spot.lat, longitude: spot.lng, title: spot.name, iconPath: MARKER_ICON[spot.cuisine] || MARKER_DEFAULT, width: 26, height: 33 }],
        })
        this.checkFav(id)
        wx.hideLoading()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  checkFav(id) {
    const self = this
    const go = () => {
      wx.cloud.database().collection('favorites').where({ spot_id: id }).get()
        .then(res => self.setData({ isFav: res.data.length > 0 }))
        .catch(() => {})
    }
    if (!app.globalData.openid) app.ensureLogin(go)
    else go()
  },

  toggleFav() {
    const self = this
    const go = () => {
      const id = this.data.spot._id
      const db = wx.cloud.database()
      if (this.data.isFav) {
        db.collection('favorites').where({ spot_id: id }).get()
          .then(res => { if (res.data.length) return db.collection('favorites').doc(res.data[0]._id).remove() })
          .then(() => { self.setData({ isFav: false }); wx.showToast({ title: '已取消收藏', icon: 'none' }) })
          .catch(() => wx.showToast({ title: '操作失败', icon: 'none' }))
      } else {
        db.collection('favorites').add({ data: { spot_id: id } })
          .then(() => { self.setData({ isFav: true }); wx.showToast({ title: '已收藏', icon: 'success' }) })
          .catch(() => wx.showToast({ title: '收藏失败', icon: 'none' }))
      }
    }
    if (!app.globalData.openid) app.ensureLogin(go)
    else go()
  },

  copyName() {
    const s = this.data.spot
    if (!s) return
    const text = s.address ? `${s.name}\n${s.address}` : s.name
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '店名已复制', icon: 'success' }),
    })
  },

  editSpot() {
    wx.navigateTo({ url: '/pages/add/add?id=' + this.data.spot._id })
  },

  deleteSpot() {
    wx.showModal({
      title: '删除',
      content: '确定删除这条探店记录？',
      success: r => {
        if (!r.confirm) return
        wx.showLoading({ title: '删除中' })
        // 永远走云函数：云端以管理员身份运行，按 config/users 判定权限，绕过记录级「仅创建者可读写」限制
        wx.cloud.callFunction({ name: 'login', data: { action: 'deleteSpot', id: this.data.spot._id } })
          .then(res => {
            wx.hideLoading()
            if (res.result && res.result.ok) {
              wx.showToast({ title: '已删除', icon: 'success' })
              setTimeout(() => wx.navigateBack(), 500)
            } else {
              wx.showToast({ title: (res.result && res.result.msg) || '删除失败', icon: 'none' })
            }
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      },
    })
  },
})
