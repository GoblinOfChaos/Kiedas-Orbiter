#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <string.h>

typedef int (*rename_fn)(const char *, const char *);
int rename(const char *oldpath, const char *newpath) {
    static rename_fn real_rename;
    if (!real_rename) real_rename = (rename_fn)dlsym(RTLD_NEXT, "rename");
    if (oldpath && newpath && strstr(oldpath, "atomic.json.tmp") && strstr(newpath, "atomic.json")) {
        errno = EIO;
        return -1;
    }
    return real_rename(oldpath, newpath);
}
