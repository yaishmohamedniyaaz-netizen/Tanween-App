# -*- coding: utf-8 -*-
import io, math
from mark import mark, counter_inner, view_box
VB=[float(v) for v in view_box().split()]
M=lambda h,f='#1a1a1c',st='': mark(h=h,fill=f,style=st)
def LK(h=30,fs=29,f='#1a1a1c',gap=13):
    return ('<div style="display:flex;align-items:center;gap:%dpx">%s<span style="font-size:%dpx;'
            'font-weight:600;letter-spacing:-.032em;color:%s;line-height:1">Tanween</span></div>'
            )%(gap,M(h,f),fs,f)
def AR(sz=30,f='#1c1b16'):
    return '<span style="font-family:HafsUthmanic,serif;direction:rtl;font-size:%dpx;color:%s">تَنْوِين</span>'%(sz,f)
def tile(px,rad,bg='#1a1a1c',fg='#f2f1ee'):
    return ('<div style="width:%dpx;height:%dpx;border-radius:%gpx;background:%s;display:flex;'
            'align-items:center;justify-content:center;flex-shrink:0">%s</div>')%(px,px,rad,bg,M(int(px*0.40),fg))
def cap(t,mt=9): return '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9a9aa0;margin-top:%dpx">%s</div>'%(mt,t)
def sq(w,c,h=30): return '<div style="width:%dpx;height:%dpx;border-radius:4px;background:%s"></div>'%(w,h,c)
J,K,F,A='#d8453d','#c0892a','#5566e6','#377b60'
TALLY=lambda h=30:'<div style="display:flex;gap:5px;align-items:center">%s%s%s%s</div>'%(
    sq(104,J,h),sq(52,K,h),sq(52,F,h),sq(26,A,h))
