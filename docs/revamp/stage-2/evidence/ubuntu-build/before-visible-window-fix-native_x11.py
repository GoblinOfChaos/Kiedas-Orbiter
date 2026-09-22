"""Bounded native input on the disposable container's private Xvfb only."""
import ctypes as C,ctypes.util,time
class X11:
 def __init__(self,display):
  self.x=C.CDLL(ctypes.util.find_library('X11'));self.t=C.CDLL(ctypes.util.find_library('Xtst'))
  specs={'XOpenDisplay':([C.c_char_p],C.c_void_p),'XDefaultRootWindow':([C.c_void_p],C.c_ulong),'XQueryTree':([C.c_void_p,C.c_ulong,C.POINTER(C.c_ulong),C.POINTER(C.c_ulong),C.POINTER(C.POINTER(C.c_ulong)),C.POINTER(C.c_uint)],C.c_int),'XFetchName':([C.c_void_p,C.c_ulong,C.POINTER(C.c_void_p)],C.c_int),'XFree':([C.c_void_p],C.c_int),'XSetInputFocus':([C.c_void_p,C.c_ulong,C.c_int,C.c_ulong],C.c_int),'XKeysymToKeycode':([C.c_void_p,C.c_ulong],C.c_uint),'XFlush':([C.c_void_p],C.c_int),'XCloseDisplay':([C.c_void_p],C.c_int)}
  for name,(args,result) in specs.items():getattr(self.x,name).argtypes=args;getattr(self.x,name).restype=result
  self.t.XTestFakeKeyEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong];self.t.XTestFakeKeyEvent.restype=C.c_int
  self.d=self.x.XOpenDisplay(display.encode());assert self.d,'Private X display unavailable'
 def windows(self):
  root=C.c_ulong();parent=C.c_ulong();children=C.POINTER(C.c_ulong)();count=C.c_uint();out=[]
  self.x.XQueryTree(self.d,self.x.XDefaultRootWindow(self.d),C.byref(root),C.byref(parent),C.byref(children),C.byref(count))
  for i in range(count.value):
   name=C.c_void_p()
   if self.x.XFetchName(self.d,children[i],C.byref(name)) and name.value:
    out.append({'id':children[i],'title':C.string_at(name).decode(errors='replace')});self.x.XFree(name)
  if children:self.x.XFree(children)
  return out
 def wait(self,title):
  for _ in range(30):
   matches=[w for w in self.windows() if w['title']==title]
   if len(matches)==1:return matches[0]['id']
   time.sleep(.2)
  raise RuntimeError('Native window not found: '+title+'; '+str(self.windows()))
 def focus(self,window):self.x.XSetInputFocus(self.d,window,2,0);self.x.XFlush(self.d);time.sleep(.1)
 def event(self,key,down):
  code=self.x.XKeysymToKeycode(self.d,key);assert code,'Unmapped keysym';self.t.XTestFakeKeyEvent(self.d,code,int(down),0)
 def key(self,key,modifier=None):
  if modifier:self.event(modifier,True)
  self.event(key,True);self.event(key,False)
  if modifier:self.event(modifier,False)
  self.x.XFlush(self.d)
 def text(self,text):
  for c in text:self.key(ord(c),0xffe1 if c.isupper() or c in '_:+' else None)
  time.sleep(.2)
 def close(self):self.x.XCloseDisplay(self.d)
