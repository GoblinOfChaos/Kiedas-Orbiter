#define _GNU_SOURCE
#include <dlfcn.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
int rename(const char *old,const char *next) {
 static int (*real_rename)(const char *,const char *);
 if(!real_rename)real_rename=dlsym(RTLD_NEXT,"rename");
 if(strstr(old,"/staged/notes/b.md")) {
  const char msg[]="PREVIEW_TEST_CRASH: SIGKILL before staged notes/b.md rename\n";
  write(2,msg,sizeof(msg)-1);kill(getpid(),SIGKILL);_exit(137);
 }
 return real_rename(old,next);
}
