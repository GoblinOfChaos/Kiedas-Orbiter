#define _CRT_SECURE_NO_WARNINGS

#include <iostream>
#include <unordered_map>
#include <cstdlib>
#include <cstring>
#include <algorithm>
#include <filesystem>
#include <vector>
#include <thread>
#include <chrono>

#ifdef _WIN32
#include <io.h>
#include <fcntl.h>
#else
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#endif

#include <aes.hpp>
#include <HttpRequest.hpp>
#include <json.hpp>
#include <Pattern.hpp>
#include <Process.hpp>
#include <ProcessHandle.hpp>
#include <string.hpp>

using namespace soup;

static const uint8_t key[16] = { 76, 69, 79, 45, 65, 76, 69, 67, 9, 69, 79, 45, 65, 76, 69, 67 };
static const uint8_t iv[16] = { 49, 50, 70, 71, 66, 51, 54, 45, 76, 69, 51, 45, 113, 61, 57, 0 };

// Helper function to sanitize filename (remove invalid characters)
[[nodiscard]] static std::string sanitizeFilename(const std::string& name)
{
	std::string sanitized = name;
	for (char& character : sanitized)
	{
		if (character == '/' || character == '\\' || character == ':' || character == '*' || character == '?' || character == '"' || character == '<' || character == '>' || character == '|')
		{
			character = '_';
		}
	}
	if (sanitized.length() > 50)
	{
		sanitized = sanitized.substr(0, 50);
	}
	return sanitized;
}

// Helper function to get accountId from command line or environment
[[nodiscard]] static std::string getAccountIdFromArgs(int argc, char* argv[])
{
	std::string accountId;
	for (int arg_index = 1; arg_index < argc; ++arg_index)
	{
		std::string arg = argv[arg_index];
		if (arg.find("--account-id=") == 0)
		{
			accountId = arg.substr(13);
			accountId.erase(std::remove_if(accountId.begin(), accountId.end(), ::isspace), accountId.end());
			return accountId;
		}
		if (arg.find("-a=") == 0)
		{
			accountId = arg.substr(3);
			accountId.erase(std::remove_if(accountId.begin(), accountId.end(), ::isspace), accountId.end());
			return accountId;
		}
	}
	const char* env_accountId = std::getenv("ACCOUNT_ID");
	if (env_accountId != nullptr)
	{
		accountId = env_accountId;
		accountId.erase(std::remove_if(accountId.begin(), accountId.end(), ::isspace), accountId.end());
	}
	return accountId;
}

// Helper function to get nonce from command line or environment
[[nodiscard]] static std::string getNonceFromArgs(int argc, char* argv[])
{
	std::string nonce;
	for (int arg_index = 1; arg_index < argc; ++arg_index)
	{
		std::string arg = argv[arg_index];
		if (arg.find("--nonce=") == 0)
		{
			nonce = arg.substr(8);
			nonce.erase(std::remove_if(nonce.begin(), nonce.end(), ::isspace), nonce.end());
			return nonce;
		}
		if (arg.find("-n=") == 0)
		{
			nonce = arg.substr(3);
			nonce.erase(std::remove_if(nonce.begin(), nonce.end(), ::isspace), nonce.end());
			return nonce;
		}
	}
	const char* env_nonce = std::getenv("NONCE");
	if (env_nonce != nullptr)
	{
		nonce = env_nonce;
		nonce.erase(std::remove_if(nonce.begin(), nonce.end(), ::isspace), nonce.end());
	}
	return nonce;
}

// Helper function to get accountId from lastData.dat files (NO EE.log)
[[nodiscard]] static std::string getAccountIdFromLastData()
{
	std::vector<std::string> datFiles;
	if (std::filesystem::exists("lastData.dat"))
	{
		datFiles.push_back("lastData.dat");
	}
	try
	{
		for (const auto& entry : std::filesystem::directory_iterator("."))
		{
			if (entry.is_regular_file())
			{
				std::string filename = entry.path().filename().string();
				if (filename.find("lastData_") == 0 && filename.find(".dat") == filename.length() - 4)
				{
					datFiles.push_back(filename);
				}
			}
		}
	}
	catch (...)
	{
	}

	for (const auto& datFile : datFiles)
	{
		std::string encrypted = string::fromFile(datFile);
		if (encrypted.empty())
		{
			continue;
		}
		std::string decrypted = encrypted;
		aes::cbcDecrypt(
			reinterpret_cast<uint8_t*>(decrypted.data()), decrypted.size(),
			key, 16,
			iv
		);
		if (!aes::pkcs7Unpad(decrypted))
		{
			continue;
		}
		auto json_result = json::decode(decrypted);
		if (json_result && json_result->isObj())
		{
			auto& json_object = json_result->asObj();
			if (auto accountIdNode = json_object.find("accountId"))
			{
				if (accountIdNode->isStr())
				{
					std::string accountId = accountIdNode->asStr().value;
					if (accountId.length() == 24)
					{
						return accountId;
					}
				}
			}
		}
	}
	return {};
}

[[nodiscard]] static std::string gruzzleAuthz(const ProcessHandle& mod, bool allMatches = false)
{
	std::cout << "Gruzzling";
	const auto pattern = Pattern("3F 61 63 63 6F 75 6E 74 49 64 3D");
	std::vector<std::string> matches;
	for (const auto& ai : mod.getAllocations())
	{
		if (auto res = mod.externalScan(ai.range, pattern))
		{
			res = res.add(11);

			char accountId[24];
			mod.externalRead(res, accountId, 24);
			res = res.add(24);

			char noncePrefix[7];
			mod.externalRead(res, noncePrefix, 7);
			if (std::memcmp(noncePrefix, "&nonce=", 7) != 0)
			{
				continue;
			}
			res = res.add(7);

			bool validAccountId = true;
			for (int index = 0; index < 24; ++index)
			{
				if (!string::isHexDigitChar(accountId[index]))
				{
					validAccountId = false;
					break;
				}
			}
			if (!validAccountId)
			{
				continue;
			}

			std::string authz = "?accountId=" + std::string(accountId, 24) + "&nonce=";
			char c;
			do
			{
				c = mod.externalRead<char>(res);
				res = res.add(1);
			} while (string::isNumberChar(c) && (authz.push_back(c), true));

			auto sessionCheckPos = res;
			std::string sessionIdCheck;
			for (int i = 0; i < 200 && sessionCheckPos < ai.range.end(); ++i)
			{
				c = mod.externalRead<char>(sessionCheckPos);
				sessionCheckPos = sessionCheckPos.add(1);
				sessionIdCheck.push_back(c);
				if (sessionIdCheck.length() >= 11 && sessionIdCheck.substr(sessionIdCheck.length() - 11) == "&sessionId=")
				{
					std::string sessionId;
					do
					{
						c = mod.externalRead<char>(sessionCheckPos);
						sessionCheckPos = sessionCheckPos.add(1);
					} while ((string::isNumberChar(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) && (sessionId.push_back(c), true));
					if (!sessionId.empty())
					{
						authz += "&sessionId=" + sessionId;
					}
					break;
				}
			}

			if (authz.length() > 19)
			{
				matches.push_back(authz);
				if (!allMatches)
				{
					std::cout << " The crumbs have been gruzzled." << std::endl;
					return authz;
				}
			}
			std::cout << ".";
		}
	}

	if (!matches.empty())
	{
		std::cout << " Found " << matches.size() << " gruzzled crumbs." << std::endl;
		return matches[0];
	}

	std::cout << " Failed to gruzzle the crumbs." << std::endl;
	return {};
}

// ─── Read Log Buffer (Memory-based EE.log watcher) ────────────────────────────
//
// Loops indefinitely, retrying internally until Warframe.x64.exe and its
// in-memory log ring-buffer are found, then polls every 150ms and writes the
// extracted log lines to stdout with a 4-byte LE length prefix.
// Never exits — the Rust side just reads the stream forever.

// Check if a buffer region looks like a real EE.log line:
// "1234567890 EE [Info]: ..." or "Sys" or "Script"
// First passes a sanity check: the line must have a leading digit.
static bool isLikelyLogLine(const char* data, size_t len)
{
	if (len < 5) return false;
	// First char must be a digit (timestamp start)
	if (data[0] < '0' || data[0] > '9') return false;
	// Must contain "EE [Info]", "Sys [Info]", or "Script [Info]" after the timestamp
	const char* log_end = data + len;
	const char* p = data;
	// Skip the initial digits (timestamp)
	while (p < log_end && *p >= '0' && *p <= '9') ++p;
	// Skip decimal part of float timestamps like "37.740"
	if (p < log_end && *p == '.')
	{
		++p;
		while (p < log_end && *p >= '0' && *p <= '9') ++p;
	}
	// Skip whitespace after timestamp
	while (p < log_end && (*p == ' ' || *p == '\t')) ++p;
	// Check for known prefixes
	if (static_cast<size_t>(log_end - p) >= 9)
	{
		if (std::strncmp(p, "EE [Info]", 9) == 0) return true;
		if (std::strncmp(p, "Sys [Info]", 10) == 0) return true;
		if (std::strncmp(p, "Script [Info]", 13) == 0) return true;
		if (std::strncmp(p, "AI [Info]", 9) == 0) return true;
		if (std::strncmp(p, "Net [Info]", 10) == 0) return true;
	}
	return false;
}

// Scan a raw memory buffer for EE.log lines and write them to the output buffer.
// Returns the number of bytes written to out.
static size_t extractLogLines(const char* input, size_t input_size, char* out, size_t out_capacity)
{
	size_t written = 0;
	size_t line_start = 0;
	for (size_t i = 0; i < input_size && written < out_capacity; ++i)
	{
		if (input[i] == '\n')
		{
			size_t line_len = i - line_start;
			// Trim trailing \r
			while (line_len > 0 && input[line_start + line_len - 1] == '\r')
				--line_len;
			if (line_len > 0 && isLikelyLogLine(input + line_start, line_len))
			{
				size_t to_copy = (std::min)(line_len + 1, out_capacity - written); // +1 for \n
				std::memcpy(out + written, input + line_start, line_len);
				written += line_len;
				if (written < out_capacity)
				{
					out[written++] = '\n';
				}
			}
			line_start = i + 1;
		}
	}
	// Also check last line if it doesn't end with \n
	if (line_start < input_size)
	{
		size_t line_len = input_size - line_start;
		if (line_len > 0 && isLikelyLogLine(input + line_start, line_len))
		{
			size_t to_copy = (std::min)(line_len, out_capacity - written);
			std::memcpy(out + written, input + line_start, to_copy);
			written += to_copy;
		}
	}
	return written;
}

// Score how many valid log lines exist in a 64KB window centered on the match position.
static size_t scoreMatchPosition(const ProcessHandle& mod, const Pointer& match_pos, size_t alloc_size)
{
	constexpr size_t SAMPLE_SIZE = 64 * 1024;
	constexpr size_t HALF = SAMPLE_SIZE / 2;

	// Centre the window on the match position, clamped to allocation bounds
	Pointer read_base = match_pos.sub((std::min)(HALF, match_pos.as<size_t>())); // don't underflow
	size_t read_size = SAMPLE_SIZE;
	// Clamp to allocation size (approximate — we don't have exact alloc end here, but close enough)
	if (read_size > alloc_size) read_size = alloc_size;

	std::vector<char> buf(read_size);
	mod.externalRead(read_base, buf.data(), read_size);

	size_t score = 0;
	size_t line_start = 0;
	for (size_t i = 0; i < read_size; ++i)
	{
		if (buf[i] == '\n')
		{
			size_t line_len = i - line_start;
			while (line_len > 0 && buf[line_start + line_len - 1] == '\r')
				--line_len;
			if (line_len > 0 && isLikelyLogLine(buf.data() + line_start, line_len))
				++score;
			line_start = i + 1;
		}
	}
	return score;
}

struct DiscoveredBuffer {
	Pointer base;
	size_t size;
};

// Heuristic: true if the address is in the main exe module range (~0x00007FF6... or 0x00007FF...)
// Heap allocations on x64 Windows are typically in the 0x00000... to 0x00007E... range.
static bool isInModuleRange(uintptr_t addr)
{
#if SOUP_WINDOWS
	constexpr uintptr_t MODULE_LOWER = 0x00007FF000000000ULL;
	constexpr uintptr_t MODULE_UPPER = 0x00007FFFFFFFFFFFULL;
	return addr >= MODULE_LOWER && addr <= MODULE_UPPER;
#else
	return false;
#endif
}

// Find the best candidate for the EE.log ring buffer by scanning all allocations.
static DiscoveredBuffer discoverLogBuffer(const ProcessHandle& mod)
{
	const Pattern patterns[] = {
		Pattern("45 45 20 5B 49 6E 66 6F 5D 3A 20"), // "EE [Info]: "
		Pattern("53 79 73 20 5B 49 6E 66 6F 5D 3A 20"), // "Sys [Info]: "
		Pattern("53 63 72 69 70 74 20 5B 49 6E 66 6F 5D 3A 20"), // "Script [Info]: "
	};

	DiscoveredBuffer best{};
	size_t best_score = 0;
	size_t best_heap_score = 0;
	DiscoveredBuffer best_heap{};

	for (const auto& ai : mod.getAllocations())
	{
		for (const auto& pattern : patterns)
		{
			if (auto res = mod.externalScan(ai.range, pattern))
			{
				uintptr_t alloc_base = reinterpret_cast<uintptr_t>(ai.range.base.as<void*>());
				uintptr_t match_addr = reinterpret_cast<uintptr_t>(res.as<void*>());
				size_t alloc_size = ai.range.size;
				size_t raw_score = scoreMatchPosition(mod, res, alloc_size);
				bool in_module = isInModuleRange(alloc_base);
				size_t adjusted_score = in_module ? (raw_score / 4) : raw_score;
				if (adjusted_score > best_score)
				{
					best_score = adjusted_score;
					constexpr size_t MAX_BUFFER = 4 * 1024 * 1024;
					uintptr_t half = MAX_BUFFER / 2;
					uintptr_t win_start = (match_addr > alloc_base + half) ? match_addr - half : alloc_base;
					win_start = (std::max)(win_start, alloc_base);
					uintptr_t win_end = (std::min)(win_start + MAX_BUFFER, alloc_base + alloc_size);
					best.base = ai.range.base.add(win_start - alloc_base);
					best.size = win_end - win_start;
				}
				if (!in_module && raw_score > best_heap_score)
				{
					best_heap_score = raw_score;
					constexpr size_t MAX_BUFFER = 4 * 1024 * 1024;
					uintptr_t half = MAX_BUFFER / 2;
					uintptr_t win_start = (match_addr > alloc_base + half) ? match_addr - half : alloc_base;
					win_start = (std::max)(win_start, alloc_base);
					uintptr_t win_end = (std::min)(win_start + MAX_BUFFER, alloc_base + alloc_size);
					best_heap.base = ai.range.base.add(win_start - alloc_base);
					best_heap.size = win_end - win_start;
				}
				break;
			}
		}
	}

	if (best_heap_score >= 5) return best_heap;
	return best;
}

// ─── Get Warframe Window Rect mode ──────────────────────────────────────────
//
// Outputs "left top width height" if Warframe window is found, or "{}" if not.
// Used by the Rust side to auto-detect which monitor Warframe is on.
static void getWindowRectMode()
{
    auto proc = Process::get("Warframe.x64.exe");
#if !SOUP_WINDOWS
    if (!proc)
    {
        proc = Process::get("Warframe.x64.ex");
    }
#endif
    if (!proc)
    {
        std::cout << "not found" << std::endl;
        return;
    }

#ifdef _WIN32
    struct EnumCtx { DWORD pid; HWND hwnd; };
    EnumCtx ctx{ proc->pid, nullptr };

    EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
        auto& ctx = *reinterpret_cast<EnumCtx*>(lParam);
        DWORD pid;
        GetWindowThreadProcessId(hwnd, &pid);
        if (pid == ctx.pid && IsWindowVisible(hwnd))
        {
            ctx.hwnd = hwnd;
            return FALSE;
        }
        return TRUE;
    }, reinterpret_cast<LPARAM>(&ctx));

    if (ctx.hwnd)
    {
        RECT r;
        GetWindowRect(ctx.hwnd, &r);
        std::cout << r.left << " " << r.top << " "
                  << (r.right - r.left) << " "
                  << (r.bottom - r.top) << std::endl;
    }
    else
    {
        std::cout << "not found" << std::endl;
    }
#else
    // Linux: use Xlib to find window by PID. Works on X11 (both native
    // apps and Wine/Proton windows). On Wayland, XWayland may provide a
    // bridge, but native Wayland windows won't be visible to Xlib —
    // returns "not found" in that case.
    int pos_x = 0, pos_y = 0;
    auto pid_str = std::to_string(proc->id);
    Display* dpy = XOpenDisplay(nullptr);
    if (!dpy)
    {
        std::cout << "not found" << std::endl;
        return;
    }

    // Use XQueryTree to walk the window tree, checking _NET_WM_PID
    ::Atom net_wm_pid = XInternAtom(dpy, "_NET_WM_PID", True);
    if (net_wm_pid == None)
    {
        XCloseDisplay(dpy);
        std::cout << "not found" << std::endl;
        return;
    }

    ::Window root = DefaultRootWindow(dpy);
    ::Window found = None;
    auto findWindow = [&](::Window win, auto& self_ref) -> void {
        if (found) return;
        ::Atom type;
        int fmt;
        unsigned long nitems, bytes_after;
        unsigned char* prop = nullptr;
        if (XGetWindowProperty(dpy, win, net_wm_pid, 0, 1, False,
                               XA_CARDINAL, &type, &fmt, &nitems,
                               &bytes_after, &prop) == Success && prop)
        {
            if (fmt == 32 && nitems > 0)
            {
                ::pid_t win_pid = *reinterpret_cast<::pid_t*>(prop);
                if (win_pid == proc->id)
                {
                    XWindowAttributes attr;
                    if (XGetWindowAttributes(dpy, win, &attr)
                        && attr.map_state == IsViewable)
                    {
                        found = win;
                    }
                }
            }
            XFree(prop);
        }

        ::Window parent, *children;
        unsigned int nchildren;
        if (XQueryTree(dpy, win, &root, &parent, &children, &nchildren))
        {
            for (unsigned int i = 0; i < nchildren && !found; ++i)
                self_ref(children[i], self_ref);
            if (children) XFree(children);
        }
    };
    findWindow(root, findWindow);

    if (found)
    {
        XWindowAttributes attr;
        XGetWindowAttributes(dpy, found, &attr);
        ::Window child_win;
        XTranslateCoordinates(dpy, found, root, 0, 0, &pos_x, &pos_y, &child_win);
        XCloseDisplay(dpy);
        std::cout << pos_x << " " << pos_y << " "
                  << attr.width << " " << attr.height << std::endl;
    }
    else
    {
        XCloseDisplay(dpy);
        std::cout << "not found" << std::endl;
    }
    return;
#endif
}

static void readLogBuffer()
{
#ifdef _WIN32
	_setmode(_fileno(stdout), _O_BINARY);
#endif

	for (;;)
	{
		auto proc = Process::get("Warframe.x64.exe");
#if !SOUP_WINDOWS
		if (!proc)
		{
			proc = Process::get("Warframe.x64.ex");
		}
#endif
		if (!proc)
		{
			fprintf(stderr, "[H] Process not found, sleeping 5s\n");
			uint32_t zero = 0;
			fwrite(&zero, 4, 1, stdout);
			fflush(stdout);
			std::this_thread::sleep_for(std::chrono::seconds(5));
			continue;
		}

		auto mod = proc->open();
		if (!mod)
		{
			std::this_thread::sleep_for(std::chrono::seconds(5));
			continue;
		}
		DiscoveredBuffer discovered{};
		try
		{
			discovered = discoverLogBuffer(*mod);
		}
		catch (const std::exception& e)
		{
			fprintf(stderr, "[H] discoverLogBuffer threw: %s\n", e.what());
			std::this_thread::sleep_for(std::chrono::seconds(5));
			continue;
		}
		catch (...)
		{
			fprintf(stderr, "[H] discoverLogBuffer threw unknown exception\n");
			std::this_thread::sleep_for(std::chrono::seconds(5));
			continue;
		}

		if (!discovered.base.as<void*>())
		{
			std::this_thread::sleep_for(std::chrono::seconds(5));
			continue;
		}

		std::vector<char> raw(discovered.size);
		std::vector<char> output(discovered.size);
		for (;;)
		{
			try
			{
				mod->externalRead(discovered.base, raw.data(), discovered.size);
			}
			catch (...)
			{
				break;
			}

			size_t out_len = extractLogLines(raw.data(), discovered.size, output.data(), output.size());

			uint32_t len32 = static_cast<uint32_t>(out_len);
			fwrite(&len32, 4, 1, stdout);
			if (out_len > 0)
			{
				fwrite(output.data(), 1, out_len, stdout);
			}
			fflush(stdout);

			std::this_thread::sleep_for(std::chrono::milliseconds(150));
		}
	}
}

// ─── Args ─────────────────────────────────────────────────────────────────────

struct Args {
	bool skip_scan = false;
	bool download = true;
	bool all_matches = false;
	bool read_log_buffer = false;
	bool get_window_rect = false;
	std::string output_file;
};

[[nodiscard]] static Args parseArgs(int argc, char* argv[])
{
	Args args;
	for (int arg_index = 1; arg_index < argc; ++arg_index)
	{
		std::string arg = argv[arg_index];
		if (arg == "--skip-scan" || arg == "-s" || arg == "--skip-process")
		{
			args.skip_scan = true;
		}
		else if (arg == "--no-download")
		{
			args.download = false;
		}
		else if (arg == "--all-matches")
		{
			args.all_matches = true;
		}
		else if (arg.find("--output=") == 0)
		{
			args.output_file = arg.substr(9);
		}
		else if (arg == "--read-log-buffer")
		{
			args.read_log_buffer = true;
		}
		else if (arg == "--get-window-rect")
		{
			args.get_window_rect = true;
		}
	}
	return args;
}

int main(int argc, char* argv[])
{
	Args args = parseArgs(argc, argv);

	// ── Memory-based log reading mode ──────────────────────────────────────
	// Spawned by the Rust side's spawn_memory_watcher().  Retries internally
	// until Warframe.x64.exe and its log ring-buffer are found, then streams
	// buffer contents to stdout every 150ms.
	if (args.read_log_buffer)
	{
		readLogBuffer();
		return 0;
	}

	if (args.get_window_rect)
	{
		getWindowRectMode();
		return 0;
	}

	// ── Normal inventory fetch mode ────────────────────────────────────────

	std::string providedNonce = getNonceFromArgs(argc, argv);
	std::string authz;

	if (!providedNonce.empty())
	{
		std::string accountId = getAccountIdFromArgs(argc, argv);
		if (accountId.empty() || accountId.length() != 24)
		{
			accountId = getAccountIdFromLastData();
		}
		if (accountId.empty() || accountId.length() != 24)
		{
			std::cout << "Error: Could not find account ID. Please:" << std::endl;
			std::cout << "  - Provide it via --account-id flag or ACCOUNT_ID environment variable" << std::endl;
			std::cout << "  - Or run the tool once without --nonce to create a lastData.dat file" << std::endl;
#if SOUP_WINDOWS
			system("pause > nul");
#endif
			return 7;
		}
		authz = "?accountId=" + accountId + "&nonce=" + providedNonce;
		std::cout << "Using provided nonce (--nonce or NONCE environment variable)." << std::endl;
		std::cout << authz << std::endl;
	}

	if (authz.empty() && !args.skip_scan)
	{
		auto proc = Process::get("Warframe.x64.exe");
#if !SOUP_WINDOWS
		if (!proc)
		{
			proc = Process::get("Warframe.x64.ex");
		}
#endif
		if (!proc)
		{
			std::cout << "Process not found." << std::endl;
#if SOUP_WINDOWS
			system("pause > nul");
#endif
			return 1;
		}
		auto mod = proc->open();
		SOUP_IF_UNLIKELY (!mod)
		{
			std::cout << "Failed to open process." << std::endl;
#if SOUP_WINDOWS
			system("pause > nul");
#endif
			return 2;
		}
		authz = gruzzleAuthz(*mod, args.all_matches);
		SOUP_IF_UNLIKELY (authz.empty())
		{
#if SOUP_WINDOWS
			system("pause > nul");
#endif
			return 3;
		}
	}

	if (authz.empty() && args.skip_scan)
	{
		std::string accountId = getAccountIdFromArgs(argc, argv);
		if (accountId.empty() || accountId.length() != 24)
		{
			accountId = getAccountIdFromLastData();
		}
		if (accountId.empty() || accountId.length() != 24)
		{
			std::cout << "Error: Could not find account ID. Please:" << std::endl;
			std::cout << "  - Provide it via --account-id flag or ACCOUNT_ID environment variable" << std::endl;
			std::cout << "  - Or ensure lastData.dat exists in the working directory" << std::endl;
#if SOUP_WINDOWS
			system("pause > nul");
#endif
			return 7;
		}
		std::cout << "Error: --skip-scan requires either --nonce flag or memory scanning." << std::endl;
#if SOUP_WINDOWS
		system("pause > nul");
#endif
		return 8;
	}

	if (!authz.empty() && providedNonce.empty())
	{
		std::cout << authz << std::endl;
	}

	if (!args.download)
	{
		return 0;
	}

	std::cout << "Downloading inventory... ";
	HttpRequest hr("mobile.warframe.com", "/api/inventory.php" + authz);
	auto res = hr.execute();
	SOUP_IF_UNLIKELY (!res)
	{
		std::cout << "Request failed." << std::endl;
#if SOUP_WINDOWS
		system("pause > nul");
#endif
		return 5;
	}
	auto inventory = std::move(res->body);
	auto jr = json::decode(inventory);
	SOUP_IF_UNLIKELY (!jr)
	{
		std::cout << "Received an invalid response." << std::endl;
#if SOUP_WINDOWS
		system("pause > nul");
#endif
		return 6;
	}

	std::string accountId;
	std::string accountName = "unknown";

	if (jr->isObj())
	{
		auto& json_object = jr->asObj();
		if (auto accountIdNode = json_object.find("accountId"))
		{
			if (accountIdNode->isStr())
			{
				accountId = accountIdNode->asStr().value;
			}
		}
		const char* nameFields[] = { "playerName", "PlayerName", "alias", "Alias", "name", "Name", "username", "Username" };
		for (const char* field_name : nameFields)
		{
			if (auto nameNode = json_object.find(field_name))
			{
				if (nameNode->isStr())
				{
					accountName = nameNode->asStr().value;
					break;
				}
			}
		}
	}

	std::string jsonFilename = args.output_file.empty() ? "inventory.json" : args.output_file;
	if (args.output_file.empty() && accountName != "unknown" && !accountName.empty())
	{
		std::string sanitizedName = sanitizeFilename(accountName);
		jsonFilename = "inventory_" + sanitizedName + ".json";
	}

	string::toFile(jsonFilename, jr->encodePretty());
	std::cout << "Saved to " << jsonFilename << std::endl;

	std::string inventoryWithAccountId = inventory;
	aes::pkcs7Pad(inventoryWithAccountId);
	aes::cbcEncrypt(
		reinterpret_cast<uint8_t*>(inventoryWithAccountId.data()), inventoryWithAccountId.size(),
		key, 16,
		iv
	);

	std::string datFilename = "lastData.dat";
	if (accountName != "unknown" && !accountName.empty())
	{
		std::string sanitizedName = sanitizeFilename(accountName);
		datFilename = "lastData_" + sanitizedName + ".dat";
	}

	string::toFile(datFilename, inventoryWithAccountId);
	std::cout << "Saved to " << datFilename << " (encrypted, contains account ID)" << std::endl;
#if SOUP_WINDOWS
	system("pause > nul");
#endif
	return 0;
}
