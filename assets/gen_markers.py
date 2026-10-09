# 生成 4 种菜系配色的地图标记 pin（纯 Pillow 绘制，无外部依赖）
from PIL import Image, ImageDraw

import math

# 分类 -> 颜色（与全局图例保持一致）
COLORS = {
    'zhongcan': (230, 67, 64, 255),   # 中餐 红
    'xican':    (59, 130, 246, 255),   # 西餐 蓝
    'yinpin':   (34, 197, 94, 255),    # 饮品甜点 绿
    'fun':      (168, 85, 247, 255),   # 好玩的 紫（棒棒糖）
    'default':  (212, 175, 55, 255),   # 未选分类 金
}
# 需要额外图案的标记（其余只靠颜色区分）
SYMBOLS = {'fun': 'lollipop'}


def draw_lollipop(d, cx, cy, r, color):
    """棒棒糖：白色糖体 + 同色螺旋 + 白色棍"""
    cr = r * 0.52
    ccy = cy - r * 0.14
    d.ellipse([cx - cr * 0.17, ccy, cx + cr * 0.17, ccy + cr * 1.85],
              fill=(255, 255, 255, 255))                      # 棍
    d.ellipse([cx - cr, ccy - cr, cx + cr, ccy + cr],
              fill=(255, 255, 255, 255))                      # 糖体
    tmax = math.pi * 2 * 1.6
    prev = None
    for i in range(161):                                      # 螺旋
        t = tmax * i / 160
        rr = 1 + (cr * 0.78 - 1) * (t / tmax)
        x = cx + rr * math.cos(t)
        y = ccy + rr * math.sin(t)
        if prev:
            d.line([prev[0], prev[1], x, y], fill=color, width=2)
        prev = (x, y)


def make_pin(path, color, S=72, symbol=None):
    W, H = S, int(S * 1.28)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = S * 0.34
    cx = W / 2
    cy = r + 6
    # 指针三角（先画，圆覆盖其上）
    tip = (cx, H - 3)
    left = (cx - r * 0.72, cy + r * 0.5)
    right = (cx + r * 0.72, cy + r * 0.5)
    d.polygon([left, right, tip], fill=color)
    # 主体圆
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color,
              outline=(255, 255, 255, 255), width=4)
    if symbol == 'lollipop':
        draw_lollipop(d, cx, cy, r, color)
    else:
        # 内部高光小圆，增强质感
        hr = r * 0.42
        d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr],
                  fill=(255, 255, 255, 60))
    img.save(path)


for key, color in COLORS.items():
    make_pin(f'D:/FoodMapHK/assets/markers/marker_{key}.png', color,
             symbol=SYMBOLS.get(key))
    print('generated', key)
