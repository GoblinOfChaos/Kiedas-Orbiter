"""Bounded native input on the disposable container's private Xvfb only."""
import ctypes as C,ctypes.util,time
class Attributes(C.Structure):
 _fields_=[(n,C.c_int) for n in ['x','y','width','height','border_width','depth']]+[('visual',C.c_void_p),('root',C.c_ulong)]+[(n,C.c_int) for n in ['window_class','bit_gravity','win_gravity','backing_store']]+[('backing_planes',C.c_ulong),('backing_pixel',C.c_ulong),('save_under',C.c_int),('colormap',C.c_ulong),('map_installed',C.c_int),('map_state',C.c_int)]+[(n,C.c_long) for n in ['all_event_masks','your_event_mask','do_not_propagate_mask']]+[('override_redirect',C.c_int),('screen',C.c_void_p)]
class X11:
 def __init__(self,display):
  self.x=C.CDLL(ctypes.util.find_library('X11'));self.t=C.CDLL(ctypes.util.find_library('Xtst'))
  specs={'XGetWindowAttributes':([C.c_void_p,C.c_ulong,C.POINTER(Attributes)],C.c_int),'XOpenDisplay':([C.c_char_p],C.c_void_p),'XDefaultRootWindow':([C.c_void_p],C.c_ulong),'XQueryTree':([C.c_void_p,C.c_ulong,C.POINTER(C.c_ulong),C.POINTER(C.c_ulong),C.POINTER(C.POINTER(C.c_ulong)),C.POINTER(C.c_uint)],C.c_int),'XFetchName':([C.c_void_p,C.c_ulong,C.POINTER(C.c_void_p)],C.c_int),'XFree':([C.c_void_p],C.c_int),'XSetInputFocus':([C.c_void_p,C.c_ulong,C.c_int,C.c_ulong],C.c_int),'XKeysymToKeycode':([C.c_void_p,C.c_ulong],C.c_uint),'XFlush':([C.c_void_p],C.c_int),'XCloseDisplay':([C.c_void_p],C.c_int)}
  for name,(args,result) in specs.items():getattr(self.x,name).argtypes=args;getattr(self.x,name).restype=result
  self.t.XTestFakeKeyEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong];self.t.XTestFakeKeyEvent.restype=C.c_int
  self.d=self.x.XOpenDisplay(display.encode());assert self.d,'Private X display unavailable'
 def windows(self):
  root=C.c_ulong();parent=C.c_ulong();children=C.POINTER(C.c_ulong)();count=C.c_uint();out=[]
  self.x.XQueryTree(self.d,self.x.XDefaultRootWindow(self.d),C.byref(root),C.byref(parent),C.byref(children),C.byref(count))
  for i in range(count.value):
   attrs=Attributes()
   if not self.x.XGetWindowAttributes(self.d,children[i],C.byref(attrs)) or attrs.map_state!=2:continue
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

 def screenshot(self,path):
  import struct,zlib
  class Img(C.Structure):
   _fields_=[('width',C.c_int),('height',C.c_int),('xoffset',C.c_int),('format',C.c_int),('data',C.c_void_p)]+[(n,C.c_int) for n in ['byte_order','bitmap_unit','bitmap_bit_order','bitmap_pad','depth','bytes_per_line','bits_per_pixel']]+[(n,C.c_ulong) for n in ['red_mask','green_mask','blue_mask']]
  self.x.XGetImage.argtypes=[C.c_void_p,C.c_ulong,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_ulong,C.c_int];self.x.XGetImage.restype=C.POINTER(Img)
  self.x.XDestroyImage.argtypes=[C.POINTER(Img)];self.x.XDestroyImage.restype=C.c_int
  root=self.x.XDefaultRootWindow(self.d);a=Attributes();self.x.XGetWindowAttributes(self.d,root,C.byref(a))
  ptr=self.x.XGetImage(self.d,root,0,0,a.width,a.height,0xffffffff,2);im=ptr.contents
  assert (im.bits_per_pixel,im.byte_order,im.red_mask,im.green_mask,im.blue_mask)==(32,0,0xff0000,0xff00,0xff)
  raw=C.string_at(im.data,im.bytes_per_line*im.height);rows=[]
  for y in range(im.height):
   row=raw[y*im.bytes_per_line:y*im.bytes_per_line+im.width*4];rgb=bytearray(im.width*3);rgb[0::3]=row[2::4];rgb[1::3]=row[1::4];rgb[2::3]=row[0::4];rows.append(b'\0'+rgb)
  def chunk(t,v):return struct.pack('>I',len(v))+t+v+struct.pack('>I',zlib.crc32(t+v)&0xffffffff)
  path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',im.width,im.height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b''))
  self.x.XDestroyImage(ptr)

 def accept_click(self,window):
  self.x.XResizeWindow.argtypes=[C.c_void_p,C.c_ulong,C.c_uint,C.c_uint];self.x.XResizeWindow.restype=C.c_int
  self.t.XTestFakeMotionEvent.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_int,C.c_ulong];self.t.XTestFakeButtonEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong]
  self.x.XResizeWindow(self.d,window,1000,700);self.x.XFlush(self.d);time.sleep(.5)
  a=Attributes();self.x.XGetWindowAttributes(self.d,window,C.byref(a))
  # The visible GTK Open button is the lower-right button in the inspected dialog.
  point=(a.x+a.width-50,a.y+a.height-20)
  for _ in range(2):
   self.t.XTestFakeMotionEvent(self.d,-1,*point,0);self.t.XTestFakeButtonEvent(self.d,1,1,0);self.t.XTestFakeButtonEvent(self.d,1,0,0);self.x.XFlush(self.d);time.sleep(.5)
  return {'window_size':[a.width,a.height],'root_click':list(point)}
