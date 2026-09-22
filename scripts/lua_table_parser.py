#!/usr/bin/env python3
"""
Minimal recursive-descent parser for the constrained subset of Lua table
literals used in the Warframe wiki's Module:*/data pages (return { ... } or
local X = { ... }). Not a general Lua parser - just enough to turn these
specific structured-data tables into Python dict/list structures so we can
diff/join them without guessing at content.

Lua tables that have zero explicit keys become a Python list.
Lua tables with any explicit keys become a Python dict; any unkeyed
(positional) entries in a mixed table are collected under the special key
"__array__" (rare in this data, but handled rather than silently dropped).
"""
import re


class LuaParseError(Exception):
    pass


TOKEN_RE = re.compile(r'''
    (?P<ws>\s+)
  | (?P<linecomment>--\[(?P<eq>=*)\[.*?\]\3\])
  | (?P<shortcomment>--[^\n]*)
  | (?P<dstring>"(?:\\.|[^"\\])*")
  | (?P<sstring>'(?:\\.|[^'\\])*')
  | (?P<number>-?\d+\.?\d*(?:[eE][-+]?\d+)?)
  | (?P<lbrace>\{)
  | (?P<rbrace>\})
  | (?P<lbracket>\[)
  | (?P<rbracket>\])
  | (?P<comma>,)
  | (?P<eq2>=)
  | (?P<ident>[A-Za-z_][A-Za-z0-9_]*)
''', re.VERBOSE | re.DOTALL)

ESCAPES = {'n': '\n', 'r': '\r', 't': '\t', '"': '"', "'": "'", '\\': '\\'}


def unescape(s):
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == '\\' and i + 1 < len(s):
            nxt = s[i + 1]
            out.append(ESCAPES.get(nxt, nxt))
            i += 2
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def tokenize(text):
    tokens = []
    pos = 0
    while pos < len(text):
        m = TOKEN_RE.match(text, pos)
        if not m:
            raise LuaParseError(f"Unexpected char at {pos}: {text[pos:pos+40]!r}")
        kind = m.lastgroup
        val = m.group()
        pos = m.end()
        if kind in ('ws', 'linecomment', 'shortcomment'):
            continue
        if kind == 'dstring' or kind == 'sstring':
            tokens.append(('string', unescape(val[1:-1])))
        elif kind == 'number':
            tokens.append(('number', float(val) if ('.' in val or 'e' in val or 'E' in val) else int(val)))
        elif kind == 'ident':
            if val == 'true':
                tokens.append(('bool', True))
            elif val == 'false':
                tokens.append(('bool', False))
            elif val == 'nil':
                tokens.append(('nil', None))
            else:
                tokens.append(('ident', val))
        else:
            tokens.append((kind, val))
    return tokens


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else (None, None)

    def next(self):
        t = self.peek()
        self.pos += 1
        return t

    def expect(self, kind):
        t = self.next()
        if t[0] != kind:
            raise LuaParseError(f"Expected {kind}, got {t} at token {self.pos}")
        return t

    def parse_value(self):
        kind, val = self.peek()
        if kind == 'lbrace':
            return self.parse_table()
        if kind in ('string', 'number', 'bool', 'nil'):
            self.next()
            return val
        if kind == 'ident':
            # bareword used as a value (rare) - treat as string
            self.next()
            return val
        raise LuaParseError(f"Unexpected token as value: {(kind, val)} at {self.pos}")

    def parse_table(self):
        self.expect('lbrace')
        result_dict = {}
        result_list = []
        is_dict = False
        while True:
            kind, val = self.peek()
            if kind == 'rbrace':
                self.next()
                break
            if kind == 'lbracket':
                self.next()
                key = self.parse_value()
                self.expect('rbracket')
                self.expect('eq2')
                value = self.parse_value()
                result_dict[key] = value
                is_dict = True
            elif kind == 'ident':
                # lookahead for '=' to distinguish keyed entry from bareword value
                save = self.pos
                self.next()
                if self.peek()[0] == 'eq2':
                    self.next()
                    value = self.parse_value()
                    result_dict[val] = value
                    is_dict = True
                else:
                    self.pos = save
                    result_list.append(self.parse_value())
            else:
                result_list.append(self.parse_value())
            kind, val = self.peek()
            if kind == 'comma':
                self.next()
                continue
            elif kind == 'rbrace':
                self.next()
                break
            else:
                raise LuaParseError(f"Expected ',' or '}}' at token {self.pos}, got {(kind, val)}")
        if is_dict:
            if result_list:
                result_dict['__array__'] = result_list
            return result_dict
        return result_list

    def parse_top(self):
        # Skip a leading "local X = " or "return" keyword sequence to reach the table.
        kind, val = self.peek()
        if kind == 'ident' and val == 'local':
            self.next()  # local
            self.next()  # var name
            self.expect('eq2')
        elif kind == 'ident' and val == 'return':
            self.next()
        value = self.parse_value()
        return value


def parse_lua_file(path):
    """Parse a Lua source file containing `return { ... }` (optionally preceded
    by `local NAME = { ... }` assignments - only the final `return` table's
    value is what most Module:*/data pages actually expose, but callers
    should inspect structure since some files have multiple locals then a
    `return { KeyA = LocalA, ... }` wrapper)."""
    text = open(path, encoding='utf-8').read()
    tokens = tokenize(text)
    parser = Parser(tokens)
    # Find the LAST top-level "return" statement's table (handles files with
    # preceding `local X = {...}` blocks before the final return).
    # Simple approach: scan for 'return' ident tokens at depth 0.
    depth = 0
    return_positions = []
    for i, (kind, val) in enumerate(tokens):
        if kind == 'lbrace':
            depth += 1
        elif kind == 'rbrace':
            depth -= 1
        elif kind == 'ident' and val == 'return' and depth == 0:
            return_positions.append(i)
    if not return_positions:
        raise LuaParseError(f"No top-level return found in {path}")
    parser.pos = return_positions[-1] + 1
    return parser.parse_value()


if __name__ == '__main__':
    import sys, json
    result = parse_lua_file(sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False)[:3000])
