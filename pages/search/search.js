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
  data: { kw: '', spots: [], themeClass: '' },

  onShow() {
    app.syncTheme(this)
  },

  onLoad(options) {
    if (options.kw) {
      this.setData({ kw: decodeURIComponent(options.kw) }, () => this.search())
    }
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

  onInput(e) {
    this.setData({ kw: e.detail.value })
    this.search()
  },

  search() {
    const kw = this.data.kw.trim()
    if (!kw) { this.setData({ spots: [] }); return }
    const db = wx.cloud.database()
    const _ = db.command
    const reg = db.RegExp({ regexp: kw, options: 'i' })
    db.collection('restaurants').where(_.or([
      { name: reg },
      { cuisine: reg },
      { cuisine_detail: reg },
      { district: reg },
      { address: reg },
      { recommendedDishes: reg },
      { review: reg },
    ])).orderBy('created_at', 'desc').limit(50).get()
      .then(res => {
        const spots = res.data.map(s => this.enrich(s))
        this.setData({ spots })
      })
      .catch(() => {})
  },

  open(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },
})
