const DISTRICTS = [
  '中西区', '湾仔区', '东区', '南区', '油尖旺区', '深水埗区', '九龙城区', '黄大仙区',
  '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区',
]
const CUISINES = [
  { key: '中餐', icon: '../../assets/cuisine/zhongcan.png' },
  { key: '西餐', icon: '../../assets/cuisine/xican.png' },
  { key: '饮品甜点', icon: '../../assets/cuisine/yinpin.png' },
  { key: '好玩的', icon: '../../assets/cuisine/fun.png' },
]
// 旧数据里的「特色小吃」已更名为「好玩的」，编辑历史记录时归一到新分类
const normalizeCuisine = c => (c === '特色小吃' ? '好玩的' : c)
const RATING_LABELS = { 1: '拉完了', 2: 'NPC', 3: '人上人', 4: '顶级', 5: '夯爆了' }
const MAX_PHOTOS = 20

Page({
  data: {
    districts: DISTRICTS,
    cuisines: CUISINES,
    ratingLabels: RATING_LABELS,
    maxPhotos: MAX_PHOTOS,
    isEdit: false,
    editId: '',
    loggedIn: false,
    form: {
      name: '',
      address: '',
      lat: null,
      lng: null,
      district: '',
      cuisine: '',
      cuisine_detail: '',
      avgCost: '',
      rating: 0,
      review: '',
      recommendedDishes: '',
      cover: '',
      photos: [],
    },
    locationText: '点击选择店铺位置（必填）',
  },

  onLoad(options) {
    const app = getApp()
    const isEdit = !!options.id
    this.setData({
      isEdit,
      editId: options.id || '',
      loggedIn: !!app.globalData.openid,
    })
    wx.setNavigationBarTitle({ title: isEdit ? '编辑探店' : (app.globalData.isAdmin ? '添加探店' : '投稿') })
    if (isEdit) this.editLoad(options.id)
  },

  onShow() {
    const app = getApp()
    this.setData({ loggedIn: !!app.globalData.openid, themeClass: app.getThemeClass() })
  },

  editLoad(id) {
    wx.showLoading({ title: '加载中' })
    wx.cloud.database().collection('restaurants').doc(id).get()
      .then(res => {
        const s = res.data
        this.editOwner = s.owner_id // 记录归属，用于判定管理员是否代编他人
        this.setData({
          'form.name': s.name,
          'form.address': s.address || '',
          'form.lat': s.lat,
          'form.lng': s.lng,
          'form.district': s.district || '',
          'form.cuisine': normalizeCuisine(s.cuisine || ''),
          'form.cuisine_detail': s.cuisine_detail || '',
          'form.avgCost': s.avgCost != null ? String(s.avgCost) : '',
          'form.rating': s.rating || 0,
          'form.review': s.review || '',
          'form.recommendedDishes': s.recommendedDishes || '',
          'form.cover': s.cover || '',
          'form.photos': s.photo_paths || [],
          locationText: (s.name ? s.name + ' · ' : '') + (s.address || '已选择位置'),
        })
        wx.hideLoading()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onDistrictInput(e) {
    this.setData({ 'form.district': e.detail.value })
  },

  pickDistrict(e) {
    this.setData({ 'form.district': e.currentTarget.dataset.d })
  },

  pickCuisine(e) {
    this.setData({ 'form.cuisine': e.currentTarget.dataset.k })
  },

  setRating(e) {
    const v = Number(e.currentTarget.dataset.val)
    this.setData({ 'form.rating': this.data.form.rating === v ? 0 : v })
  },

  chooseLocation() {
    wx.chooseLocation({
      success: res => {
        this.setData({
          'form.lat': res.latitude,
          'form.lng': res.longitude,
          'form.address': res.address,
          'form.name': this.data.form.name || res.name,
          locationText: res.name ? `${res.name} · ${res.address}` : res.address,
        })
      },
      fail: () => wx.showToast({ title: '请先授权位置权限', icon: 'none' }),
    })
  },

  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => this.uploadOne(res.tempFiles[0].tempFilePath, 'cover'),
    })
  },

  choosePhotos() {
    const remain = MAX_PHOTOS - this.data.form.photos.length
    if (remain <= 0) return wx.showToast({ title: `最多${MAX_PHOTOS}张照片`, icon: 'none' })
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => this.uploadPhotos(res.tempFiles.map(f => f.tempFilePath)),
    })
  },

  uploadOne(path, field) {
    wx.showLoading({ title: '上传中' })
    const ext = (path.match(/\.(\w+)$/) || ['', 'jpg'])[1]
    const cloudPath = `restaurants/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`
    wx.cloud.uploadFile({ cloudPath, filePath: path })
      .then(r => this.setData({ [`form.${field}`]: r.fileID }))
      .catch(() => wx.showToast({ title: '封面上传失败', icon: 'none' }))
      .then(() => wx.hideLoading())
  },

  uploadPhotos(tempFiles) {
    if (!tempFiles.length) return
    wx.showLoading({ title: '上传中' })
    const photos = this.data.form.photos.slice()
    let done = 0
    const total = tempFiles.length
    tempFiles.forEach(p => {
      const ext = (p.match(/\.(\w+)$/) || ['', 'jpg'])[1]
      const cloudPath = `restaurants/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`
      wx.cloud.uploadFile({ cloudPath, filePath: p })
        .then(r => photos.push(r.fileID))
        .catch(() => {})
        .then(() => {
          done += 1
          if (done === total) {
            this.setData({ 'form.photos': photos })
            wx.hideLoading()
          }
        })
    })
  },

  deleteCover() {
    this.setData({ 'form.cover': '' })
  },

  deletePhoto(e) {
    const idx = e.currentTarget.dataset.idx
    const photos = this.data.form.photos.slice()
    photos.splice(idx, 1)
    this.setData({ 'form.photos': photos })
  },

  doLogin() {
    const app = getApp()
    wx.showLoading({ title: '登录中' })
    app.ensureLogin().then(() => {
      wx.hideLoading()
      const ok = !!app.globalData.openid
      this.setData({ loggedIn: ok })
      wx.showToast({ title: ok ? '已登录' : '登录失败，请重试', icon: ok ? 'success' : 'none' })
    })
  },

  async submit() {
    const f = this.data.form
    if (!f.name) return wx.showToast({ title: '请填写店名', icon: 'none' })
    if (!f.lat || !f.lng) return wx.showToast({ title: '请选择位置', icon: 'none' })

    const app = getApp()
    wx.showLoading({ title: '处理中' })
    try {
      await app.ensureLogin()
      if (!app.globalData.openid) {
        wx.hideLoading()
        wx.showModal({ title: '未登录', content: '投稿需先微信登录，请点击顶部「微信登录」按钮后再试。', showCancel: false })
        return
      }

      const db = wx.cloud.database()
      const data = {
        name: f.name,
        address: f.address,
        lat: f.lat,
        lng: f.lng,
        district: f.district,
        cuisine: f.cuisine,
        cuisine_detail: f.cuisine_detail,
        avgCost: f.avgCost ? Number(f.avgCost) : null,
        rating: f.rating,
        review: f.review,
        recommendedDishes: f.recommendedDishes,
        cover: f.cover,
        photo_paths: f.photos,
      }

      if (this.data.isEdit) {
        const isOwner = this.editOwner === app.globalData.openid
        const isAdmin = app.globalData.isAdmin
        if (isOwner) {
          await db.collection('restaurants').doc(this.data.editId).update({ data })
        } else if (isAdmin) {
          // 管理员代编他人记录：走云函数（云函数以管理员身份绕过记录级权限）
          const r = await wx.cloud.callFunction({ name: 'login', data: { action: 'updateSpot', id: this.data.editId, data } })
          if (!(r.result && r.result.ok)) throw new Error((r.result && r.result.msg) || '修改失败')
        } else {
          wx.hideLoading()
          wx.showModal({ title: '无权限', content: '你不是该记录的发布者，无法编辑。', showCancel: false })
          return
        }
      } else if (app.globalData.isAdmin) {
        // 管理员：直接发布到展示库（restaurants）
        data.owner_id = app.globalData.openid
        data.owner_name = app.globalData.nickName || '微信用户'
        data.status = 'published'
        data.created_at = db.serverDate()
        await db.collection('restaurants').add({ data })
      } else {
        // 普通用户：仅投稿，写入 submissions，不直接公开（合规：个人号禁止 UGC 公开）
        const sub = {
          ...data,
          owner_id: app.globalData.openid,
          owner_name: app.globalData.nickName || '微信用户',
          status: 'pending',
          created_at: db.serverDate(),
        }
        await db.collection('submissions').add({ data: sub })
        wx.hideLoading()
        wx.showToast({ title: '投稿已提交', icon: 'success' })
        setTimeout(() => wx.showModal({
          title: '投稿成功',
          content: '感谢投稿！审核通过后会在「地图」与列表中展示。可在「我的 → 我的投稿」查看状态。',
          showCancel: false,
          success: () => wx.navigateBack(),
        }), 500)
        return
      }

      wx.hideLoading()
      wx.showToast({ title: this.data.isEdit ? '已保存' : '已发布', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (err) {
      wx.hideLoading()
      const msg = (err && (err.errMsg || err.message)) || '未知错误'
      console.error('保存失败详情：', err)
      wx.showModal({ title: this.data.isEdit ? '保存失败' : '发布失败', content: '错误信息：' + msg, showCancel: false })
    }
  },
})
