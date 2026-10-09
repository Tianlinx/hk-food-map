# 生成微信小程序 tabBar 图标（81x81 透明 PNG，线性风格）
# 用法：python gen_icons.py  ->  输出到 assets/tabbar/
import math, os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "tabbar")
os.makedirs(OUT, exist_ok=True)

NORMAL = (138, 138, 138, 255)    # 灰 #8a8a8a
ACTIVE = (230, 67, 64, 255)      # 品牌红 #e64340（与 tabBar selectedColor 一致）
SIZE = 81
TRANSPARENT = (0, 0, 0, 0)


def new_canvas():
    return Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)


def save(img, name):
    img.save(os.path.join(OUT, name), "PNG")
    print("wrote", name)


def icon_map(color):
    img = new_canvas(); d = ImageDraw.Draw(img)
    # 定位针：圆头 + 三角
    d.ellipse((26, 14, 54, 42), fill=color)          # 头 (中心40,28 r14)
    d.polygon([(28, 38), (52, 38), (40, 67)], fill=color)  # 针尖
    return img


def icon_search(color):
    img = new_canvas(); d = ImageDraw.Draw(img)
    d.ellipse((16, 16, 46, 46), fill=color)          # 放大镜外圈
    d.ellipse((23, 23, 39, 39), fill=TRANSPARENT)    # 透明中心（挖空）
    d.line([(40, 40), (61, 61)], fill=color, width=7)  # 手柄
    return img


def icon_mine(color):
    img = new_canvas(); d = ImageDraw.Draw(img)
    d.ellipse((29, 14, 51, 36), fill=color)          # 头 (中心40,25 r11)
    d.pieslice((16, 40, 64, 92), 180, 360, fill=color)  # 肩膀圆顶
    return img


def icon_favorite(color):
    img = new_canvas(); d = ImageDraw.Draw(img)
    cx, cy, R, r = 40, 42, 23, 9.5
    pts = []
    for i in range(5):
        a = math.radians(-90 + i * 72)
        pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
        a2 = math.radians(-90 + i * 72 + 36)
        pts.append((cx + r * math.cos(a2), cy + r * math.sin(a2)))
    d.polygon(pts, fill=color)
    return img


icons = {
    "map": icon_map,
    "search": icon_search,
    "mine": icon_mine,
    "favorite": icon_favorite,
}

for name, fn in icons.items():
    save(fn(NORMAL), f"{name}.png")
    save(fn(ACTIVE), f"{name}_active.png")

print("done ->", OUT)
