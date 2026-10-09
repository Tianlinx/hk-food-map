// 导航唤起页：用 web-view 加载托管在外的 nav.html，
// 由 H5 通过 URL scheme 去唤醒手机上的原生地图 App（高德/百度/苹果/Google）。
// ↓↓↓ 请把下面这个地址换成你实际托管的 nav.html 的 https 链接，
//     并在微信公众平台「开发管理 → 业务域名」里把它加进白名单（开发阶段可勾选“不校验合法域名”）。
const NAV_HTML_URL = 'https://YOUR_HOST/nav.html'

Page({
  data: { src: '' },
  onLoad(options) {
    const q = `lat=${options.lat}&lng=${options.lng}&name=${encodeURIComponent(options.name || '')}&address=${encodeURIComponent(options.address || '')}&app=${options.app || 'amap'}`
    this.setData({ src: `${NAV_HTML_URL}?${q}` })
  },
})
