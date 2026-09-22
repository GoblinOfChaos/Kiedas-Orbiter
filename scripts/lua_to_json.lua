-- Minimal, dependency-free Lua->JSON serializer for converting the
-- Warframe wiki's Module:*/data tables (loaded via dofile) into JSON files
-- we can diff/join in Python. No external libraries - just this script.
-- Usage: lua lua_to_json.lua <input.lua> <output.json>

local function escape_str(s)
    s = s:gsub('\\', '\\\\')
    s = s:gsub('"', '\\"')
    s = s:gsub('\n', '\\n')
    s = s:gsub('\r', '\\r')
    s = s:gsub('\t', '\\t')
    -- strip other control chars that would break JSON
    s = s:gsub('[\1-\8\11\12\14-\31]', '')
    return s
end

local function is_array(t)
    local n = 0
    for _ in pairs(t) do n = n + 1 end
    if n == 0 then return true end
    for i = 1, n do
        if t[i] == nil then return false end
    end
    return true
end

local encode

local function encode_table(t, out)
    if is_array(t) then
        out[#out+1] = '['
        local n = #t
        for i = 1, n do
            encode(t[i], out)
            if i < n then out[#out+1] = ',' end
        end
        out[#out+1] = ']'
    else
        out[#out+1] = '{'
        local first = true
        -- Sort keys for stable, diffable output.
        local keys = {}
        for k in pairs(t) do keys[#keys+1] = k end
        table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
        for _, k in ipairs(keys) do
            if not first then out[#out+1] = ',' end
            first = false
            out[#out+1] = '"' .. escape_str(tostring(k)) .. '":'
            encode(t[k], out)
        end
        out[#out+1] = '}'
    end
end

encode = function(v, out)
    local tv = type(v)
    if tv == 'table' then
        encode_table(v, out)
    elseif tv == 'string' then
        out[#out+1] = '"' .. escape_str(v) .. '"'
    elseif tv == 'number' then
        if v ~= v then
            out[#out+1] = '"NaN"'  -- Lua NaN has no valid JSON representation; preserve as a marked string rather than corrupt the file.
        elseif v == math.huge then
            out[#out+1] = '"Infinity"'
        elseif v == -math.huge then
            out[#out+1] = '"-Infinity"'
        else
            out[#out+1] = tostring(v)
        end
    elseif tv == 'boolean' then
        out[#out+1] = tostring(v)
    elseif tv == 'nil' then
        out[#out+1] = 'null'
    else
        out[#out+1] = '"' .. escape_str(tostring(v)) .. '"'
    end
end

local infile, outfile = arg[1], arg[2]
if not infile or not outfile then
    io.stderr:write("Usage: lua lua_to_json.lua <input.lua> <output.json>\n")
    os.exit(1)
end

-- Stub out mw.* / frame globals some wiki modules reference incidentally,
-- so a data file that happens to call them at load time doesn't error out.
-- Any chain of field access or calls on this stub returns another stub,
-- so arbitrary usage (mw.site.x, mw.text.split(...)(...)) never errors -
-- it just resolves to an empty/no-op value rather than real formatting
-- output, which is fine since these are wiki-rendering helpers, not the
-- actual data content we're extracting.
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

-- require() other Module:*/data pages by fetching them (from the local
-- archive if already downloaded, live from the wiki otherwise, cached back
-- into the archive) so aggregator files that `require` their submodules
-- (Module:Cosmetics/data requiring Module:Cosmetics/data/armor, etc.)
-- resolve to the real submodule table instead of erroring out.
local require_cache = {}
local ARCHIVE_DIR = "wiki_module_archive/"

local function safe_filename(name)
    return (name:gsub('[/\\:%*%?"<>|]', '_')) .. '.lua'
end

function require(name)
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

local chunk, err = loadfile(infile)
if not chunk then
    io.stderr:write("PARSE ERROR: " .. tostring(err) .. "\n")
    os.exit(2)
end

local ok, result = pcall(chunk)
if not ok then
    io.stderr:write("RUNTIME ERROR: " .. tostring(result) .. "\n")
    os.exit(3)
end

if type(result) ~= 'table' then
    io.stderr:write("WARNING: top-level return is not a table (got " .. type(result) .. ")\n")
    os.exit(4)
end

local out = {}
encode(result, out)
local f = io.open(outfile, 'w')
f:write(table.concat(out))
f:close()
