// 微信一键登录 + 静默注册 + 资料更新 + 超级管理员 云函数
// 微信云端会自动把调用者的 OPENID 注入到上下文中，无需 AppSecret，也不需要做 code2session 交换。
// 首次调用时把用户写入 users 集合（没有该集合也不影响返回 openid，发布仍可用）。
// action:
//   'getAdmin'      返回当前用户是否为管理员
//   'addAdmin'      现有管理员追加其他 openid 为管理员（data.target，写入 config 集合）
//   'deleteSpot'    删除 restaurants 记录（管理员删任意，本人删自己的）
//   'updateSpot'    更新 restaurants 记录（管理员改任意，本人改自己的；自动剥离 _id/_openid/owner_id）
//   'getSpot'       管理员拉取任意记录详情
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ==================== 超级管理员配置 ====================
// 写死名单优先级最高：写进这个数组的 openid 永远是超级管理员。
// 获取自己的 openid：编译运行小程序后，开发者工具底部 Console 会打印「[openid] xxx」，
// 复制粘贴到下面一行里（保留引号），然后重新上传部署本云函数即可。
// 留空时启用「全新环境首次登录自举」：config 文档不存在时，第一个登录的微信用户自动成为
// 超级管理员并写入 config.admins，之后即锁定（他人无法再认领）。换 appid / 新建云环境后
// 旧写死 openid 会失效，自举可避免反复改代码。
const ADMIN_OPENIDS = [
  // '把你的 openid 粘贴到这里',  // 可选：写死后优先级最高，且不会触发自举
]
// ========================================================

const ADMIN_DOC_ID = 'admin' // config 集合里固定 docId（备用补充通道）
const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const config = db.collection('config')
const restaurants = db.collection('restaurants')
const submissions = db.collection('submissions')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event && event.action

  // 静默注册：首次登录写入 users 集合；失败忽略，保证登录/发布永远可用
  try {
    const exist = await users.where({ _openid: openid }).count()
    if (exist.total === 0) {
      await users.add({ data: { openid, createdAt: db.serverDate() } })
    }
  } catch (e) {
    console.log('用户注册记录写入失败（已忽略，不影响登录）:', e)
  }

  // 资料更新
  if (action === 'updateProfile') {
    try {
      const update = {}
      if (event.nickName) update.nickName = event.nickName
      if (event.avatarUrl) update.avatarUrl = event.avatarUrl
      if (Object.keys(update).length) {
        await users.where({ _openid: openid }).update({ data: update })
      }
    } catch (e) {
      console.log('资料更新失败（已忽略）:', e)
    }
  }

  // 读取 config 中的 admins 数组（备用补充通道，需已是管理员才能写入）
  const getConfigAdmins = async () => {
    try {
      const doc = await config.doc(ADMIN_DOC_ID).get()
      return (doc.data && doc.data.admins) || []
    } catch (e) {
      return []
    }
  }

  // 判定管理员：硬编码名单优先，config 集合兜底
  const isAdminUser = async () => {
    if (ADMIN_OPENIDS.includes(openid)) return true
    const admins = await getConfigAdmins()
    return admins.includes(openid)
  }

  // 查询当前用户是否为管理员
  if (action === 'getAdmin') {
    return { openid, isAdmin: await isAdminUser() }
  }

  // 现有管理员追加其他管理员（写入 config 集合）
  if (action === 'addAdmin') {
    if (!(await isAdminUser())) return { ok: false, msg: '无权限' }
    const target = event.target
    if (!target) return { ok: true }
    const admins = await getConfigAdmins()
    if (!admins.includes(target)) {
      const next = admins.concat([target])
      try {
        await config.doc(ADMIN_DOC_ID).set({ data: { admins: next } })
      } catch (e) {
        try { await config.add({ data: { _id: ADMIN_DOC_ID, admins: next } }) } catch (e2) {}
      }
    }
    return { ok: true }
  }

  // 删除记录：管理员删任意，本人删自己的
  if (action === 'deleteSpot') {
    const id = event.id
    if (!id) return { ok: false, msg: '缺少 id' }
    if (await isAdminUser()) {
      await restaurants.doc(id).remove()
      return { ok: true }
    }
    try {
      const rec = await restaurants.doc(id).get()
      if (rec.data && rec.data.owner_id === openid) {
        await restaurants.doc(id).remove()
        return { ok: true }
      }
    } catch (e) {}
    return { ok: false, msg: '无权限删除' }
  }

  // 更新记录：管理员改任意，本人改自己的；剥离不可改字段
  if (action === 'updateSpot') {
    const id = event.id
    const raw = event.data || {}
    if (!id) return { ok: false, msg: '缺少 id' }
    const clean = { ...raw }
    delete clean._id
    delete clean._openid
    delete clean.owner_id
    if (!(await isAdminUser())) {
      try {
        const rec = await restaurants.doc(id).get()
        if (!(rec.data && rec.data.owner_id === openid)) return { ok: false, msg: '无权限修改' }
      } catch (e) {
        return { ok: false, msg: '无权限修改' }
      }
    }
    await restaurants.doc(id).update({ data: clean })
    return { ok: true }
  }

  // 管理员拉取任意记录详情
  if (action === 'getSpot') {
    if (!(await isAdminUser())) return { ok: false, msg: '无权限' }
    const rec = await restaurants.doc(event.id).get()
    return { ok: true, data: rec.data }
  }

  // ============ 投稿审核（个人号合规：用户投稿不直接公开，管理员审核后发布） ============
  // 管理员拉取全部投稿
  if (action === 'getSubmissions') {
    if (!(await isAdminUser())) return { ok: false, msg: '无权限' }
    const list = await submissions.orderBy('created_at', 'desc').limit(100).get()
    return { ok: true, list: list.data }
  }

  // 管理员通过投稿：复制到 restaurants（归属平台/管理员），删除投稿
  if (action === 'approveSubmission') {
    if (!(await isAdminUser())) return { ok: false, msg: '无权限' }
    const id = event.id
    if (!id) return { ok: false, msg: '缺少 id' }
    const sub = await submissions.doc(id).get()
    if (!sub.data) return { ok: false, msg: '投稿不存在' }
    const s = sub.data
    await restaurants.add({
      data: {
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        district: s.district,
        cuisine: s.cuisine,
        cuisine_detail: s.cuisine_detail,
        avgCost: s.avgCost,
        rating: s.rating,
        review: s.review,
        recommendedDishes: s.recommendedDishes,
        cover: s.cover,
        photo_paths: s.photo_paths || [],
        owner_id: openid, // 展示内容归属平台（管理员），规避个人号 UGC 红线
        submitted_by: s.owner_id || '',
        submitted_name: s.owner_name || '',
        status: 'published',
        created_at: db.serverDate(),
      },
    })
    await submissions.doc(id).remove()
    return { ok: true }
  }

  // 管理员拒绝投稿：删除
  if (action === 'rejectSubmission') {
    if (!(await isAdminUser())) return { ok: false, msg: '无权限' }
    if (!event.id) return { ok: false, msg: '缺少 id' }
    await submissions.doc(event.id).remove()
    return { ok: true }
  }

  // ============ 管理员自举（全新环境一键锁定） ============
  // 换 appid / 新建云环境后，旧写死 openid 失效。这里做「首次登录自举」：
  // config 文档尚不存在（=全新环境）时，第一个登录的微信用户自动成为超级管理员并写入
  // config.admins；之后 config 已存在即锁定，他人无法再认领。
  // 若 ADMIN_OPENIDS 已写死名单，则仅名单内用户可为管理员（陌生人不会触发自举）。
  if (!action) {
    try {
      const c = await config.doc(ADMIN_DOC_ID).get()
      const admins = (c.data && c.data.admins) || []
      if (admins.length === 0 && !ADMIN_OPENIDS.includes(openid)) {
        await config.doc(ADMIN_DOC_ID).set({ data: { admins: [openid] } })
      }
    } catch (e) {
      // config 不存在 = 全新环境，第一个用户即管理员
      try {
        await config.add({ data: { _id: ADMIN_DOC_ID, admins: [openid] } })
      } catch (e2) { /* 并发时可能已由他人先写，忽略 */ }
    }
  }

  return {
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
