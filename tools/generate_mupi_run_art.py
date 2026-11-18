#!/usr/bin/env python3
"""Produce an original MuPi Run forest/river cover from MuPi's existing public orange mascot art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "examples/mupi-run"
SOURCE = ROOT / "examples/funny-mupi/assets/mupi-laugh-refined.png"
S = 1024
random.seed(17)
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n):
    return ImageFont.truetype(font_path, n)

def circle(draw, x,y,r,fill):
    draw.ellipse((x-r,y-r,x+r,y+r),fill=fill)

def draw_cover():
    im=Image.new('RGB',(S,S))
    pix=im.load()
    for y in range(S):
        t=y/S
        if t<.52:
            a=t/.52
            top=(22,76,111); bottom=(139,212,155)
        else:
            a=(t-.52)/.48
            top=(139,212,155); bottom=(45,109,111)
        c=tuple(int(top[k]*(1-a)+bottom[k]*a) for k in range(3))
        for x in range(S):pix[x,y]=c
    d=ImageDraw.Draw(im,'RGBA')
    for r,a in [(178,26),(127,49),(85,105)]:
        circle(d,820,240,r,(255,245,174,a))
    # distant mountains and trees
    d.polygon([(0,470),(140,345),(239,429),(359,331),(504,452),(625,355),(740,441),(876,340),(1024,440),(1024,690),(0,690)],fill=(60,139,127,255))
    for i in range(25):
        x=i*48-70;y=445+random.randint(-28,45)
        d.polygon([(x-30,y+150),(x,y-150),(x+33,y+150)],fill=(35+random.randint(0,23),106+random.randint(0,27),92,255))
    # forest banks
    d.polygon([(0,490),(441,445),(160,1024),(0,1024)],fill=(79,161,112,255))
    d.polygon([(1024,490),(588,445),(904,1024),(1024,1024)],fill=(81,169,114,255))
    d.polygon([(444,442),(578,442),(960,1024),(48,1024)],fill=(205,196,147,255))
    river=Image.new('RGBA',(S,S),(0,0,0,0))
    rd=ImageDraw.Draw(river,'RGBA')
    rd.polygon([(455,442),(569,442),(896,1024),(112,1024)],fill=(46,146,170,250))
    for i in range(33):
        t=i/33
        y=477+int(t*540)
        half=int(18+310*t)
        x=512+random.randint(-half,half)
        rd.arc((x-23*t,y-10*t,x+65*t,y+13*t),0,170,fill=(203,255,239,int(90+80*t)),width=max(2,int(5*t)))
    im=Image.alpha_composite(im.convert('RGBA'),river)
    d=ImageDraw.Draw(im,'RGBA')
    # banks' flowers and broad leafy vegetation
    for i in range(34):
        x=random.choice([random.randint(0,230),random.randint(790,1023)])
        y=random.randint(500,1000)
        sc=max(.4,(y-380)/500)
        col=random.choice([(42,121,77,230),(51,139,86,230),(95,187,103,220)])
        d.line([(x,y),(x+random.randint(-20,20)*sc,y-65*sc)],fill=(34,100,77,255),width=max(2,int(6*sc)))
        d.ellipse((x-26*sc,y-86*sc,x+10*sc,y-45*sc),fill=col)
        d.ellipse((x-2*sc,y-100*sc,x+35*sc,y-56*sc),fill=col)
    # rocks and small splash, visually consistent with running hazards
    for x,y,sc in [(168,890,1.0),(841,747,.8),(730,966,.6)]:
        d.ellipse((x-62*sc,y+9*sc,x+65*sc,y+30*sc),fill=(12,61,87,90))
        d.polygon([(x-51*sc,y+13*sc),(x-41*sc,y-35*sc),(x-13*sc,y-52*sc),(x+34*sc,y-37*sc),(x+52*sc,y+15*sc)],fill=(100,139,131,255))
        d.polygon([(x-41*sc,y-35*sc),(x-13*sc,y-52*sc),(x+34*sc,y-37*sc),(x-6*sc,y-24*sc)],fill=(176,205,180,255))
    # front tree framing
    for x in (-35,1020):
        d.line([(x,650),(x+(-25 if x<512 else 35),120)], fill=(69,76,61,255), width=68)
        for j in range(9):
            xx=x+(j%3-1)*55
            yy=110+(j//3)*65
            d.ellipse((xx-100,yy-70,xx+100,yy+70),fill=random.choice([(25,98,76,238),(42,119,80,235),(66,141,82,240)]))
    # soft shadow for mascot
    sh=Image.new('RGBA',(S,S),(0,0,0,0));sd=ImageDraw.Draw(sh)
    sd.ellipse((290,907,735,970),fill=(5,33,47,130))
    sh=sh.filter(ImageFilter.GaussianBlur(20))
    im=Image.alpha_composite(im,sh)
    # Existing orange MuPi has 3 pink external gills on each side, transparent PNG.
    mupi=Image.open(SOURCE).convert('RGBA')
    mupi.thumbnail((620,620),Image.Resampling.LANCZOS)
    im.alpha_composite(mupi,((S-mupi.width)//2,365))
    # banner and typography
    title_layer=Image.new('RGBA',(S,S),(0,0,0,0))
    td=ImageDraw.Draw(title_layer)
    td.rounded_rectangle((112,70,913,332),radius=65,fill=(13,39,72,234),outline=(174,246,212,245),width=10)
    td.text((512,85),'MuPi',font=font(144),anchor='mt',fill=(255,192,108),stroke_width=5,stroke_fill=(19,47,78))
    td.text((512,216),'RUN',font=font(135),anchor='mt',fill=(255,255,247),stroke_width=4,stroke_fill=(23,55,80))
    im=Image.alpha_composite(im,title_layer).convert('RGB')
    return im

if __name__ == '__main__':
    TARGET.mkdir(parents=True,exist_ok=True)
    mascot=Image.open(SOURCE).convert('RGBA')
    mascot.thumbnail((360,360),Image.Resampling.LANCZOS)
    mascot.save(TARGET/'mupi.png',optimize=True)
    cover=draw_cover()
    cover.resize((512,512),Image.Resampling.LANCZOS).save(TARGET/'cover.png',optimize=True)
    cover.resize((256,256),Image.Resampling.LANCZOS).save(TARGET/'icon.png',optimize=True)
    print('MuPi Run artwork written:',*(str((TARGET/n).stat().st_size) for n in ('mupi.png','cover.png','icon.png')))
