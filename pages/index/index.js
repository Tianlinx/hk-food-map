const app = getApp()
const HK_CENTER = { lat: 22.3193, lng: 114.1694 }

const DISTRICTS = [
  '中西区', '湾仔区', '东区', '南区', '油尖旺区', '深水埗区', '九龙城区', '黄大仙区',
  '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区',
]
const CUISINES = ['中餐', '西餐', '饮品甜点', '好玩的']
const RATING_LABELS = { 1: '拉完了', 2: 'NPC', 3: '人上人', 4: '顶级', 5: '夯爆了' }
// 旧数据里的「特色小吃」已更名为「好玩的」，读取时归一，保证筛选和图标都能命中历史记录
const normalizeCuisine = c => (c === '特色小吃' ? '好玩的' : c)
const CUISINE_ICON = {
  '中餐': '../../assets/cuisine/zhongcan.png',
  '西餐': '../../assets/cuisine/xican.png',
  '饮品甜点': '../../assets/cuisine/yinpin.png',
  '好玩的': '../../assets/cuisine/fun.png',
}
// 地图标记：四种分类四种颜色（红/蓝/绿/紫），未选分类用金色
const MARKER_ICON = {
  '中餐': '../../assets/markers/marker_zhongcan.png',
  '西餐': '../../assets/markers/marker_xican.png',
  '饮品甜点': '../../assets/markers/marker_yinpin.png',
  '好玩的': '../../assets/markers/marker_fun.png',
}
const MARKER_DEFAULT = '../../assets/markers/marker_default.png'
const LEGEND = [
  { name: '中餐', color: '#E64340', icon: '../../assets/markers/marker_zhongcan.png' },
  { name: '西餐', color: '#3B82F6', icon: '../../assets/markers/marker_xican.png' },
  { name: '饮品甜点', color: '#22C55E', icon: '../../assets/markers/marker_yinpin.png' },
  { name: '好玩的', color: '#A855F7', icon: '../../assets/markers/marker_fun.png' },
]

// ===== 底部抽屉尺寸（px）=====
const _win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
const rpx2px = rpx => Math.round((rpx * _win.windowWidth) / 750)
const SHEET_H = Math.round(_win.windowHeight * 0.7) // 抽屉总高
const SHEET_HEAD_H = rpx2px(104) // 把手 + 标题栏高度（对应 .sheet-header 的 104rpx）
const SHEET_LIST_H = SHEET_H - SHEET_HEAD_H // 列表可视高度：scroll-view 必须有确定 px 高度才能滚动
const SHEET_PEEK = SHEET_H - SHEET_HEAD_H // 收起态：只露出拖拽把手
const SHEET_HALF = Math.round(SHEET_PEEK * 0.45) // 半展态
const SHEET_FULL = 0 // 完全展开（translateY 为 0）
const SNAP_POINTS = [SHEET_FULL, SHEET_HALF, SHEET_PEEK]
const HINT_OF = y => (y <= SHEET_FULL + 4 ? '下滑收起' : y >= SHEET_PEEK - 4 ? '上滑展开' : '上下拖动')

Page({
  data: {
    center: HK_CENTER,
    scale: 11,
    markers: [],
    spots: [],
    displaySpots: [],
    kw: '',
    fullscreen: false,
    showFilter: false,
    districts: DISTRICTS,
    cuisines: CUISINES,
    // 下拉选项首项固定为「不限」，方便把条件改回全选
    districtOptions: ['不限', ...DISTRICTS],
    cuisineOptions: ['不限', ...CUISINES],
    legend: LEGEND,
    filters: { district: '', cuisine: '', minRating: 0 },
    filterText: '全部',
    // 底部抽屉
    sheetH: SHEET_H,
    sheetListH: SHEET_LIST_H,
    sheetY: SHEET_HALF,
    sheetHint: HINT_OF(SHEET_HALF),
    dragging: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    app.syncTheme(this)
    this.loadSpots()
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

  loadSpots() {
    wx.showLoading({ title: '加载中' })
    const db = wx.cloud.database()
    db.collection('restaurants')
      .orderBy('created_at', 'desc')
      .get()
      .then(res => {
        const spots = res.data.map(s => this.enrich(s))
        this.setData({ spots }, () => this.filterDisplay())
        wx.hideLoading()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  filterDisplay() {
    let arr = this.data.spots
    const f = this.data.filters
    const kw = this.data.kw.trim()
    if (f.district) arr = arr.filter(s => s.district === f.district)
    if (f.cuisine) arr = arr.filter(s => s.cuisine === f.cuisine)
    if (f.minRating) arr = arr.filter(s => (s.rating || 0) >= f.minRating)
    if (kw) {
      const reg = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      arr = arr.filter(s =>
        reg.test(s.name) ||
        reg.test(s.cuisine || '') ||
        reg.test(s.cuisine_detail || '') ||
        reg.test(s.address || '') ||
        reg.test(s.district || '') ||
        reg.test(s.recommendedDishes || '') ||
        reg.test(s.review || '')
      )
    }
    const markers = arr.map((s, i) => ({
      id: i,
      latitude: s.lat,
      longitude: s.lng,
      title: s.name,
      iconPath: MARKER_ICON[s.cuisine] || MARKER_DEFAULT,
      width: 26,
      height: 33,
    }))
    this.setData({ displaySpots: arr, markers })
  },

  onSearchInput(e) {
    this.setData({ kw: e.detail.value }, () => this.filterDisplay())
  },

  clearKw() {
    this.setData({ kw: '' }, () => this.filterDisplay())
  },

  goSearchPage() {
    wx.navigateTo({ url: '/pages/search/search?kw=' + encodeURIComponent(this.data.kw) })
  },

  onMarkerTap(e) {
    const spot = this.data.displaySpots[e.detail.markerId]
    if (spot) this.openDetail(spot._id)
  },

  openDetail(id) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onTapCard(e) {
    this.openDetail(e.currentTarget.dataset.id)
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  onPickDistrict(e) {
    const v = this.data.districtOptions[e.detail.value]
    this.setData({ 'filters.district': v === '不限' ? '' : v })
  },
  onPickCuisine(e) {
    const v = this.data.cuisineOptions[e.detail.value]
    this.setData({ 'filters.cuisine': v === '不限' ? '' : v })
  },
  onPickRating(e) {
    const v = Number(e.currentTarget.dataset.val)
    // 点同一颗星第二次 = 取消评分筛选（回到全评分）
    this.setData({ 'filters.minRating': this.data.filters.minRating === v ? 0 : v })
  },
  clearRating() {
    this.setData({ 'filters.minRating': 0 })
  },

  // 重置：清空条件并立刻生效（不用再点确定）
  resetFilter() {
    this.setData(
      { filters: { district: '', cuisine: '', minRating: 0 }, filterText: '全部' },
      () => {
        this.filterDisplay()
        this.autoRevealSheet()
      }
    )
  },

  applyFilter() {
    const f = this.data.filters
    const parts = []
    if (f.district) parts.push(f.district)
    if (f.cuisine) parts.push(f.cuisine)
    if (f.minRating) parts.push(`${f.minRating}星+`)
    this.setData({ showFilter: false, filterText: parts.length ? parts.join(' · ') : '全部' })
    this.filterDisplay()
    this.autoRevealSheet()
  },

  toggleFullscreen() {
    const fs = !this.data.fullscreen
    // 进入全屏：列表抽屉向下滑出消失；退出：滑回原位
    this.setData({ fullscreen: fs }, () => {
      if (fs) wx.showToast({ title: '左上角「退出」可还原', icon: 'none', duration: 1400 })
    })
  },

  /* ===== 底部抽屉：上下拖拽 + 三档吸附 ===== */
  onSheetStart(e) {
    const t = e.touches[0]
    this._dragStartY = t.clientY
    this._dragStartTop = this.data.sheetY
    this._sheetMoved = 0
    this.setData({ dragging: true })
  },

  onSheetMove(e) {
    if (this._dragStartY == null) return
    const t = e.touches[0]
    const dy = t.clientY - this._dragStartY
    if (Math.abs(dy) > this._sheetMoved) this._sheetMoved = Math.abs(dy)
    let y = this._dragStartTop + dy
    if (y < SHEET_FULL) y = SHEET_FULL
    if (y > SHEET_PEEK) y = SHEET_PEEK
    this.setData({ sheetY: Math.round(y), sheetHint: HINT_OF(y) })
  },

  onSheetEnd() {
    if (this._dragStartY == null) return
    this._dragStartY = null
    // 就近吸附到 收起 / 半展 / 全展
    const y = this.data.sheetY
    let best = SNAP_POINTS[0]
    SNAP_POINTS.forEach(p => { if (Math.abs(p - y) < Math.abs(best - y)) best = p })
    this.setData({ dragging: false, sheetY: best, sheetHint: HINT_OF(best) })
  },

  // 点标题栏：在 收起 <-> 半展 之间切换（刚拖动过则不触发）
  toggleSheet() {
    if (this._sheetMoved > 6) return
    const collapsed = this.data.sheetY >= SHEET_PEEK - 4
    const y = collapsed ? SHEET_HALF : SHEET_PEEK
    this.setData({ sheetY: y, sheetHint: HINT_OF(y) })
  },

  // 收起状态下有新的筛选结果时，自动抬到半展，方便看到列表
  autoRevealSheet() {
    if (this.data.sheetY >= SHEET_PEEK - 4) {
      this.setData({ sheetY: SHEET_HALF, sheetHint: HINT_OF(SHEET_HALF) })
    }
  },

  goMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: res => this.setData({ center: { lat: res.latitude, lng: res.longitude }, scale: 14 }),
      fail: () => wx.showToast({ title: '请先授权位置', icon: 'none' }),
    })
  },

  noop() {},
})
