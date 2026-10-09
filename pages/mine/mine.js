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

Page({
  data: {
    loggedIn: false,
    isAdmin: false,
    userInfo: { nickName: '', avatarUrl: '' },
    tab: 'mine',
    mineSpots: [],
    favSpots: [],
    subSpots: [],
    loading: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    const g = app.globalData
    this.setData({
      loggedIn: !!g.openid,
      isAdmin: !!g.isAdmin,
      userInfo: { nickName: g.nickName || '', avatarUrl: g.avatarUrl || '' },
    })
    app.syncTheme(this)
    if (g.openid) { this.loadMine(); this.loadFav(); this.loadSub() }
  },

  enrich(s) {
    const coverUrl = s.cover || (s.photo_paths && s.photo_paths[0]) || ''
    const cuisine = normalizeCuisine(s.cuisine)
    return {
      ...s,
      cuisine,
      coverUrl,
      cuisineIcon: CUISINE_ICON[cuisine] || '',
      ratingLabel: RATING_LABELS[s.rating] || '',
    }
  },

  async login() {
    wx.showLoading({ title: '登录中' })
    await app.ensureLogin()
    wx.hideLoading()
    if (!app.globalData.openid) {
      const e = app.globalData.loginError
      const raw = e && (e.errMsg || e.message) ? (e.errMsg || e.message) : ''
      const tip = raw || '请检查：①已开通云开发 ②已上传并部署 login 云函数 ③非测试号'
      wx.showModal({ title: '登录失败', content: '错误详情：\n' + tip, showCancel: false })
      return
    }
    const g = app.globalData
    this.setData({ loggedIn: true, userInfo: { nickName: g.nickName || '', avatarUrl: g.avatarUrl || '' } })
    this.loadMine()
    this.loadFav()
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }) },

  goSettings() { wx.navigateTo({ url: '/pages/settings/settings' }) },

  goReview() { wx.navigateTo({ url: '/pages/review/review' }) },

  // 普通用户：加载自己的投稿（submissions 集合仅创建者可读写，客户端可读自己的）
  loadSub() {
    wx.cloud.database().collection('submissions')
      .where({ owner_id: app.globalData.openid })
      .orderBy('created_at', 'desc')
      .get()
      .then(res => { this.setData({ subSpots: res.data }) })
      .catch(() => { this.setData({ subSpots: [] }) })
  },

  loadMine() {
    this.setData({ loading: true })
    wx.cloud.database().collection('restaurants')
      .where({ owner_id: app.globalData.openid })
      .orderBy('created_at', 'desc')
      .get()
      .then(res => {
        const spots = res.data.map(s => this.enrich(s))
        this.setData({ mineSpots: spots, loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadFav() {
    const db = wx.cloud.database()
    const _ = db.command
    db.collection('favorites').get()
      .then(fr => {
        const ids = fr.data.map(f => f.spot_id)
        if (!ids.length) { this.setData({ favSpots: [] }); return }
        const favIdMap = {}
        fr.data.forEach(f => { if (!favIdMap[f.spot_id]) favIdMap[f.spot_id] = f._id })
        db.collection('restaurants').where({ _id: _.in(ids) }).get()
          .then(res => {
            const spots = res.data.map(s => ({ ...this.enrich(s), favId: favIdMap[s._id] }))
            this.setData({ favSpots: spots })
          })
          .catch(() => this.setData({ favSpots: [] }))
      })
      .catch(() => this.setData({ favSpots: [] }))
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    app.globalData.avatarUrl = avatarUrl
    this.setData({ 'userInfo.avatarUrl': avatarUrl })
    this.saveProfile()
  },

  onNickBlur(e) {
    const nickName = (e.detail.value || '').trim()
    if (!nickName) return
    app.globalData.nickName = nickName
    this.setData({ 'userInfo.nickName': nickName })
    this.saveProfile()
  },

  saveProfile() {
    wx.cloud.callFunction({
      name: 'login',
      data: { action: 'updateProfile', nickName: app.globalData.nickName || '', avatarUrl: app.globalData.avatarUrl || '' },
    }).catch(() => {})
  },

  open(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }) },

  edit(e) { wx.navigateTo({ url: '/pages/add/add?id=' + e.currentTarget.dataset.id }) },

  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除',
      content: '确定删除这条探店记录？',
      success: r => {
        if (!r.confirm) return
        wx.showLoading({ title: '删除中' })
        wx.cloud.database().collection('restaurants').doc(id).remove()
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadMine()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      },
    })
  },

  unfav(e) {
    const favId = e.currentTarget.dataset.favid
    if (!favId) return
    wx.showLoading({ title: '取消中' })
    wx.cloud.database().collection('favorites').doc(favId).remove()
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已取消收藏', icon: 'none' })
        this.loadFav()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
  },
})
