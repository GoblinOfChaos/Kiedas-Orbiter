#ifdef _WIN32
#define _WINSOCK_DEPRECATED_NO_WARNINGS
#include <winsock2.h>
#include <ws2tcpip.h>
#include <cstring>

// Soup networking files are compiled with <ws2tcpip.h> which declares
// inet_ntop via __declspec(dllimport), so the object files reference
// __imp_inet_ntop. MinGW-w64 15.x should export this from ws2_32 but on
// some CI runners the import library is incomplete. Provide a local
// implementation as fallback.

static const char* inet_ntop_impl(INT Family, const VOID* pAddr,
                                  PSTR pStringBuf, size_t StringBufSize)
{
    if (Family == AF_INET)
    {
        sockaddr_in sa;
        std::memset(&sa, 0, sizeof(sa));
        sa.sin_family = AF_INET;
        std::memcpy(&sa.sin_addr, pAddr, sizeof(IN_ADDR));
        DWORD len = static_cast<DWORD>(StringBufSize);
        if (WSAAddressToStringA(reinterpret_cast<LPSOCKADDR>(&sa), sizeof(sa),
                                nullptr, pStringBuf, &len) == 0)
            return pStringBuf;
    }
    else if (Family == AF_INET6)
    {
        sockaddr_in6 sa6;
        std::memset(&sa6, 0, sizeof(sa6));
        sa6.sin6_family = AF_INET6;
        std::memcpy(&sa6.sin6_addr, pAddr, sizeof(IN6_ADDR));
        DWORD len = static_cast<DWORD>(StringBufSize);
        if (WSAAddressToStringA(reinterpret_cast<LPSOCKADDR>(&sa6), sizeof(sa6),
                                nullptr, pStringBuf, &len) == 0)
            return pStringBuf;
    }
    return nullptr;
}

// The dllimport declaration in <ws2tcpip.h> makes the compiler emit
// references to __imp_inet_ntop. Provide that indirection so linking
// succeeds even if the import library lacks it.
extern "C" const char* WINAPI inet_ntop(INT Family, const VOID* pAddr,
                                        PSTR pStringBuf, size_t StringBufSize)
{
    return inet_ntop_impl(Family, pAddr, pStringBuf, StringBufSize);
}

extern "C" const char* (WINAPI* const __imp_inet_ntop)(INT, const VOID*, PSTR, size_t) = inet_ntop;
#endif
