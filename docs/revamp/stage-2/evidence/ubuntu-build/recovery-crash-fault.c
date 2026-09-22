#define _GNU_SOURCE
#include <dlfcn.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>
#include <fcntl.h>
#include <stdio.h>
static void die(const char *msg) { write(2,msg,strlen(msg));kill(getpid(),SIGKILL);_exit(137); }
int rename(const char *old,const char *next) {
 static int (*real_rename)(const char *,const char *);
 if(!real_rename)real_rename=dlsym(RTLD_NEXT,"rename");
 const char *point=getenv("PREVIEW_TEST_CRASH_POINT");
 if(point && strstr(old,point))die("PREVIEW_TEST_CRASH: killed at selected staged rename\n");
 return real_rename(old,next);
}
int fsync(int fd) {
 static int (*real_fsync)(int);if(!real_fsync)real_fsync=dlsym(RTLD_NEXT,"fsync");
 const char *once=getenv("PREVIEW_TEST_RECOVERY_KILL");
 if(once) {
  char link[64],path[4096];
  // Resolve only the descriptor being synced; do not alter any app file.
  int n=snprintf(link,sizeof(link),"/proc/self/fd/%d",fd);
  if(n>0) { ssize_t len=readlink(link,path,sizeof(path)-1);if(len>0) {path[len]=0;
   if(strstr(path,"/data/user/notes/b.md") && !strstr(path,"preview-import-backup-")) {
    int marker=open(once,O_WRONLY|O_CREAT|O_EXCL,0600);if(marker>=0){close(marker);die("PREVIEW_TEST_CRASH: killed during recovery fsync once\n");}
   }
  }}
 }
 return real_fsync(fd);
}
