#define _GNU_SOURCE
#include <dlfcn.h>
#include <pwd.h>
#include <string.h>
#include <unistd.h>
#include <stdlib.h>
static void note(const char *s) { write(2,s,strlen(s)); }
char *getenv(const char *name) {
 if (!strcmp(name,"XDG_DATA_HOME")) { note("[directory-fault] XDG_DATA_HOME unavailable\n"); return NULL; }
 if (!strcmp(name,"HOME")) { note("[directory-fault] HOME unavailable\n"); return NULL; }
 char *(*real_getenv)(const char *)=dlsym(RTLD_NEXT,"getenv");
 return real_getenv(name);
}
int getpwuid_r(uid_t uid,struct passwd *pwd,char *buf,size_t len,struct passwd **result) {
 (void)uid;(void)pwd;(void)buf;(void)len;
 note("[directory-fault] getpwuid_r no entry\n");*result=NULL;return 0;
}
