from PIL import Image, ImageDraw
import os

SIZE = 200
OUT = r'D:\FoodMapHK\assets\cuisine'
os.makedirs(OUT, exist_ok=True)

def canvas(bg):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([12, 12, SIZE-12, SIZE-12], fill=bg)
    return img, d

def save(img, name):
    img.save(os.path.join(OUT, name), 'PNG')
    print('saved', name)

# 中餐：碗 + 筷
img, d = canvas((230, 67, 64, 255))
d.pieslice([52, 92, 148, 188], 0, 180, fill=(255, 255, 255, 255))   # 碗口
d.rectangle([52, 140, 148, 152], fill=(255, 255, 255, 255))        # 碗底
d.line([150, 58, 178, 120], fill=(255, 255, 255, 255), width=7)    # 筷
d.line([160, 54, 184, 116], fill=(255, 255, 255, 255), width=7)
save(img, 'zhongcan.png')

# 西餐：刀叉
img, d = canvas((59, 130, 246, 255))
d.rectangle([74, 58, 84, 150], fill=(255, 255, 255, 255))          # 叉柄
d.rectangle([66, 48, 92, 74], fill=(255, 255, 255, 255))           # 叉头
d.line([74, 48, 74, 74], fill=(59, 130, 246, 255), width=4)
d.line([84, 48, 84, 74], fill=(59, 130, 246, 255), width=4)
d.rectangle([116, 58, 126, 150], fill=(255, 255, 255, 255))       # 刀柄
d.polygon([(116, 48), (126, 48), (122, 78), (116, 78)], fill=(255, 255, 255, 255))  # 刀头
save(img, 'xican.png')

# 饮品甜点：杯 + 吸管
img, d = canvas((236, 72, 153, 255))
d.polygon([(70, 72), (130, 72), (121, 150), (79, 150)], fill=(255, 255, 255, 255))  # 杯
d.line([130, 82, 154, 50], fill=(255, 255, 255, 255), width=7)   # 吸管
d.rectangle([64, 66, 136, 78], fill=(255, 255, 255, 255))        # 杯沿
save(img, 'yinpin.png')

# 好玩的：棒棒糖（紫底 + 白色糖体 + 同色螺旋）
import math
FUN_BG = (168, 85, 247, 255)
img, d = canvas(FUN_BG)
d.rectangle([94, 122, 106, 172], fill=(255, 255, 255, 255))       # 棍
d.ellipse([58, 42, 142, 126], fill=(255, 255, 255, 255))          # 糖体
cx, cy = 100, 84
tmax = math.pi * 2 * 2.5
prev = None
for i in range(481):                                              # 螺旋
    t = tmax * i / 480
    rr = 3 + (34 - 3) * (t / tmax)
    x = cx + rr * math.cos(t)
    y = cy + rr * math.sin(t)
    if prev:
        d.line([prev[0], prev[1], x, y], fill=FUN_BG, width=8)
    prev = (x, y)
save(img, 'fun.png')

print('done')
