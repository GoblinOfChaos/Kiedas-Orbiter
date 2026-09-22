#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
int rename(const char *old, const char *next) {
  static int (*real_rename)(const char *,const char *);
  if (!real_rename) real_rename=dlsym(RTLD_NEXT,"rename");
  if (strstr(old,"/staged/notes/b.md")) {
    const char msg[]="PREVIEW_TEST_FAULT: staged notes/b.md rename rejected with EIO\n";
    write(2,msg,sizeof(msg)-1); errno=EIO; return -1;
  }
  return real_rename(old,next);
}
