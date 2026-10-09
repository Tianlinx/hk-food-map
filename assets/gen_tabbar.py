# 生成黑金主题 tabBar 图标：地图(定位pin) + 我的(人像)，灰=未选中 金=选中
from PIL import Image, ImageDraw

GOLD = (212, 175, 55, 255)
GREY = (138, 138, 138, 255)


def icon_pin(color, S=96):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = S * 0.26
    cx, cy = S / 2, S * 0.36
    tip = (cx, S * 0.92)
    left = (cx - r * 0.75, cy + r * 0.55)
    right = (cx + r * 0.75, cy + r * 0.55)
    d.polygon([left, right, tip], fill=color)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    hr = r * 0.45
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(20, 20, 20, 255))
    return img


def icon_person(color, S=96):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 头
    hr = S * 0.17
    d.ellipse([S/2 - hr, S * 0.12, S/2 + hr, S * 0.12 + hr * 2], fill=color)
    # 肩身（上半椭圆）
    d.pieslice([S * 0.16, S * 0.52, S * 0.84, S * 1.25], 180, 360, fill=color)
    return img


def icon_map(color, S=96):
    # 折叠地图：三折面板 + 定位点
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = 6
    # 三块折面
    d.polygon([(8, 24), (35, 14), (35, 82), (8, 92)], outline=color, width=w)
    d.polygon([(35, 14), (62, 24), (62, 92), (35, 82)], outline=color, width=w)
    d.polygon([(62, 24), (89, 14), (89, 82), (62, 92)], outline=color, width=w)
    # 中间定位点
    r = 7
    d.ellipse([48.5 - r, 47 - r, 48.5 + r, 47 + r], fill=color)
    return img


for name, fn in [('map', icon_map), ('mine', icon_person)]:
    fn(GREY).save(f'D:/FoodMapHK/assets/tabbar/{name}.png')
    fn(GOLD).save(f'D:/FoodMapHK/assets/tabbar/{name}_active.png')

print('tabbar icons regenerated')
