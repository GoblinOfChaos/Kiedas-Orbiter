-- Calls the wiki's own authoritative acquisition-string functions
-- (Module:Vendors._buildVendorSourceStrings, Module:Baro._buildBaroSourceStrings)
-- for a given item name, so we get the exact wikitext the article's own
-- infobox would show - not a hand-rolled reconstruction.
-- Usage: lua call_wiki_functions.lua "<Item Name>"

local function make_stub()
    local t = {}
    setmetatable(t, {
        __index = function(_, k) return make_stub() end,
        __call = function(_, ...) return make_stub() end,
        __tostring = function() return "" end,
        __concat = function(a, b) return (type(a) == 'string' and a or "") .. (type(b) == 'string' and b or "") end,
    })
    return t
end
mw = make_stub()
-- mw.loadData behaves like require() for our purposes (returns the module's table).
mw.loadData = function(name) return require(name) end

local require_cache = {}
local ARCHIVE_DIR = "wiki_module_archive/"

local function safe_filename(name)
    return (name:gsub('[/\\:%*%?"<>|]', '_')) .. '.lua'
end

local orig_require = require
function require(name)
    if type(name) ~= 'string' then return orig_require(name) end
    if require_cache[name] then return require_cache[name] end
    local path = ARCHIVE_DIR .. safe_filename(name)
    local f = io.open(path, 'r')
    if f then
        f:close()
    else
        local cmd = string.format(
            'curl -sL -A "Mozilla/5.0" --max-time 30 --get --data-urlencode "title=%s" --data-urlencode "action=raw" https://wiki.warframe.com/index.php -o "%s"',
            name, path)
        os.execute(cmd)
    end
    local chunk, err = loadfile(path)
    if not chunk then
        io.stderr:write("require() could not load '" .. name .. "': " .. tostring(err) .. "\n")
        local stub = make_stub()
        require_cache[name] = stub
        return stub
    end
    local ok, result = pcall(chunk)
    if not ok then
        io.stderr:write("require() runtime error in '" .. name .. "': " .. tostring(result) .. "\n")
        result = make_stub()
    end
    require_cache[name] = result
    return result
end

local Vendor = require('Module:Vendors')
local Baro = require('Module:Baro')

local name = arg[1]
if not name then
    io.stderr:write("Usage: lua call_wiki_functions.lua \"<Item Name>\"\n")
    os.exit(1)
end

local ok1, vendorStr = pcall(Vendor._buildVendorSourceStrings, name)
local ok2, baroStr = pcall(Baro._buildBaroSourceStrings, name)

print("=== Vendor result ===")
print(ok1 and vendorStr or ("ERROR: " .. tostring(vendorStr)))
print("=== Baro result ===")
print(ok2 and baroStr or ("ERROR: " .. tostring(baroStr)))
