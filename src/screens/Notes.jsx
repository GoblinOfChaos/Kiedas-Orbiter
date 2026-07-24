/**
 * Notes.jsx
 *
 * A simplified Markdown note-taking tool for in-game goals and reminders.
 *
 * DATA STORAGE
 * ─────────────────────────────────────────
 * - Notes are stored as physical `.md` files in `src-tauri/data/user/notes/`.
 * - File I/O (list, read, write, delete) is handled by the Rust backend
 *   via Tauri IPC commands.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Full MDX editor support with bold, italic, lists, and tables.
 * - Real-time auto-saving (or manual save depending on config).
 * - Click-to-rename filenames.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, Plus, X } from 'lucide-react'
import { PageLayout, Card, Button } from '../components/UI'
import { invoke } from '@tauri-apps/api/core'
import { MDXEditor } from '@mdxeditor/editor'
import {
  headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin,
  markdownShortcutPlugin, linkPlugin, linkDialogPlugin, tablePlugin,
  codeBlockPlugin, codeMirrorPlugin, diffSourcePlugin,
  toolbarPlugin, BoldItalicUnderlineToggles, BlockTypeSelect,
  CreateLink, InsertTable, InsertThematicBreak, ListsToggle,
  UndoRedo, CodeToggle, DiffSourceToggleWrapper, Separator
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Inline editable title - click to rename
function EditableTitle({ filename, onRename }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(filename.replace('.md', ''))
  const inputRef = useRef(null)

  useEffect(() => {
    setVal(filename.replace('.md', ''))
  }, [filename])

  const commit = () => {
    setEditing(false)
    const trimmed = val.trim()
    if (trimmed && trimmed !== filename.replace('.md', '')) {
      onRename(filename, trimmed)
    } else {
      setVal(filename.replace('.md', ''))
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setVal(filename.replace('.md', '')) }
        }}
        className="text-lg font-semibold bg-transparent border-b border-kronos-accent/50 outline-none text-kronos-text w-48 pb-0.5"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 text-lg font-semibold hover:text-kronos-accent transition-colors group"
      title="Click to rename"
    >
      <FileText size={18} />
      {val}
    </button>
  )
}

export default function Notes() {
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [renamingTab, setRenamingTab] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [fileToDelete, setFileToDelete] = useState(null)
  const latestContentRef = useRef('')
  const isDirtyRef = useRef(false)
  const activeFileRef = useRef(null)

  const loadFiles = async () => {
    try {
      const list = await invoke('list_notes')
      setFiles(list)
      if (list.length > 0 && !activeFileRef.current) selectFile(list[0])
    } catch (err) { console.error('list_notes failed:', err) }
  }

  useEffect(() => { loadFiles() }, [])

  const saveIfDirty = useCallback(async (filename, currentContent) => {
    if (!filename || !isDirtyRef.current) return
    try {
      await invoke('save_note', { filename, content: currentContent })
      isDirtyRef.current = false
      return true
    } catch (err) {
      console.error('save_note failed:', err)
      return false
    }
  }, [])

  // Save note when switching to another tab or unmounting
  useEffect(() => {
    return () => {
      if (activeFileRef.current) {
        saveIfDirty(activeFileRef.current, latestContentRef.current).catch(() => { })
      }
    }
  }, [saveIfDirty])

  const selectFile = useCallback(async (filename) => {
    if (activeFileRef.current && activeFileRef.current !== filename) {
      await saveIfDirty(activeFileRef.current, latestContentRef.current)
    }
    if (!filename) {
      setActiveFile(null); setContent('')
      latestContentRef.current = ''; isDirtyRef.current = false; activeFileRef.current = null
      return
    }
    try {
      const text = await invoke('read_note', { filename })
      latestContentRef.current = text
      isDirtyRef.current = false
      activeFileRef.current = filename
      setContent(text)
      setActiveFile(filename)
    } catch (err) { console.error('read_note failed:', err) }
  }, [saveIfDirty])

  useEffect(() => {
    if (!activeFile) return
    const iv = setInterval(async () => {
      if (!activeFileRef.current || !isDirtyRef.current) return

      setSaving(true)
      const saved = await saveIfDirty(activeFileRef.current, latestContentRef.current)
      if (saved) {
        setTimeout(() => setSaving(false), 2000)
      } else {
        setSaving(false)
      }
    }, 15_000)
    return () => clearInterval(iv)
  }, [activeFile, saveIfDirty])

  const newFile = async () => {
    let name = 'New Note.md', n = 2
    while (files.includes(name)) name = `New Note ${n++}.md`
    try {
      await invoke('save_note', { filename: name, content: '# New Note\n' })
      const list = await invoke('list_notes')
      setFiles(list); selectFile(name)
    } catch { }
  }

  const handleRename = useCallback(async (oldName, newName) => {
    if (!newName.trim() || newName === oldName.replace('.md', '')) return
    const finalName = newName.endsWith('.md') ? newName : `${newName}.md`
    if (files.includes(finalName)) { alert('A note with that name already exists'); return }
    try {
      const src = activeFile === oldName ? latestContentRef.current : await invoke('read_note', { filename: oldName })
      await invoke('save_note', { filename: finalName, content: src })
      await invoke('delete_note', { filename: oldName })
      const list = await invoke('list_notes')
      setFiles(list)
      if (activeFile === oldName) {
        activeFileRef.current = finalName
        setActiveFile(finalName)
        isDirtyRef.current = false
      }
    } catch (err) { console.error('rename failed:', err) }
  }, [files, activeFile])

  const handleTabRename = useCallback((oldName, rawNewName) => {
    handleRename(oldName, rawNewName)
    setRenamingTab(null)
  }, [handleRename])

  const confirmDelete = async () => {
    if (!fileToDelete) return
    try {
      const wasActive = fileToDelete === activeFileRef.current
      if (wasActive) {
        setActiveFile(null)
        setContent('')
        latestContentRef.current = ''
        activeFileRef.current = null
      }

      await invoke('delete_note', { filename: fileToDelete })
      const list = await invoke('list_notes')
      setFiles(list)

      if (wasActive) {
        if (list.length > 0) selectFile(list[0])
        else { setActiveFile(null); setContent(''); latestContentRef.current = ''; activeFileRef.current = null }
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
    finally { setFileToDelete(null) }
  }

  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
        css: 'CSS', html: 'HTML', json: 'JSON', bash: 'Bash',
        py: 'Python', rs: 'Rust', '': 'Plain text'
      }
    }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <CodeToggle />
          <Separator />
          <ListsToggle />
          <Separator />
          <InsertThematicBreak />
          <CreateLink />
          <InsertTable />
        </DiffSourceToggleWrapper>
      )
    }),
  ]

  return (
    <PageLayout title="Notes">
      <style>{`
        .dark-editor.kronos-editor {
          --accentBase: var(--color-accent);
          --accentBgSubtle: color-mix(in srgb, var(--color-accent) 10%, transparent);
          --accentBg: color-mix(in srgb, var(--color-accent) 15%, transparent);
          --accentBgHover: color-mix(in srgb, var(--color-accent) 25%, transparent);
          --accentBgActive: color-mix(in srgb, var(--color-accent) 30%, transparent);
          --accentLine: color-mix(in srgb, var(--color-accent) 40%, transparent);
          --accentBorder: color-mix(in srgb, var(--color-accent) 50%, transparent);
          --accentBorderHover: var(--color-accent);
          --accentSolid: var(--color-accent);
          --accentSolidHover: var(--color-accent);
          --accentText: var(--color-accent);
          --accentTextContrast: #ffffff;
          --baseBase: var(--color-bg);
          --baseBgSubtle: var(--color-panel);
          --baseBg: var(--color-panel);
          --baseBgHover: color-mix(in srgb, var(--color-panel) 80%, white 20%);
          --baseBgActive: color-mix(in srgb, var(--color-panel) 70%, white 30%);
          --baseLine: rgba(255,255,255,0.06);
          --baseBorder: rgba(255,255,255,0.08);
          --baseBorderHover: rgba(255,255,255,0.15);
          --baseSolid: rgba(255,255,255,0.15);
          --baseSolidHover: rgba(255,255,255,0.20);
          --baseText: var(--color-text);
          --baseTextContrast: #ffffff;
          --basePageBg: var(--color-bg);
          color: var(--color-text);
          background: var(--color-bg);
        }

        .kronos-editor .mdxeditor-toolbar {
          background: var(--color-panel) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          flex-wrap: wrap !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          outline: none !important;
        }
        .kronos-editor .mdxeditor-toolbar:focus {
          outline: none !important;
        }

        .kronos-editor .mdxeditor-select-content {
          background: var(--color-panel) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          color: var(--color-text) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        }
        .kronos-editor .mdxeditor-select-content [role='option']:hover,
        .kronos-editor .mdxeditor-select-content [role='option'][data-highlighted] {
          background: color-mix(in srgb, var(--color-accent) 20%, transparent) !important;
          color: var(--color-text) !important;
          outline: none !important;
        }
        .kronos-editor .mdxeditor-select-content [role='option'][data-state='checked'] {
          color: var(--color-accent) !important;
        }

        .kronos-editor .mdxeditor-root-contenteditable {
          color: var(--color-text) !important;
          background: var(--color-bg) !important;
          overflow-y: auto !important;
          max-height: calc(100vh - 280px) !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable::-webkit-scrollbar {
          width: 12px;
          height: 4px;
        }
        .kronos-editor .mdxeditor-root-contenteditable::-webkit-scrollbar-track {
          background: transparent;
        }
        .kronos-editor .mdxeditor-root-contenteditable::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .kronos-editor .mdxeditor-root-contenteditable::-webkit-scrollbar-thumb:hover {
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
        }
        .kronos-editor .mdxeditor-root-contenteditable p,
        .kronos-editor .mdxeditor-root-contenteditable li,
        .kronos-editor .mdxeditor-root-contenteditable span {
          color: var(--color-text) !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable p { margin-bottom: 1em; line-height: 1.6; }
        .kronos-editor .mdxeditor-root-contenteditable ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em; }
        .kronos-editor .mdxeditor-root-contenteditable ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em; }
        .kronos-editor .mdxeditor-root-contenteditable li { margin-bottom: 0.25em; }

        .kronos-editor .mdxeditor-root-contenteditable h1,
        .kronos-editor .mdxeditor-root-contenteditable h2,
        .kronos-editor .mdxeditor-root-contenteditable h3,
        .kronos-editor .mdxeditor-root-contenteditable h4 {
          color: var(--color-text) !important;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }
        .kronos-editor .mdxeditor-root-contenteditable h1 { font-size: 2.25em; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; margin-top: 0; }
        .kronos-editor .mdxeditor-root-contenteditable h2 { font-size: 1.75em; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        .kronos-editor .mdxeditor-root-contenteditable h3 { font-size: 1.25em; font-weight: 600; }
        .kronos-editor .mdxeditor-root-contenteditable h4 { font-size: 1em; font-weight: 600; }

        .kronos-editor .mdxeditor-root-contenteditable blockquote {
          border-left: 4px solid var(--color-accent) !important;
          padding-left: 1em;
          margin: 1em 0;
          color: var(--color-text-dim) !important;
          font-style: italic;
        }
        .kronos-editor .mdxeditor-root-contenteditable code {
          color: var(--color-accent) !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable a {
          color: var(--color-accent) !important;
        }

        .kronos-editor .mdxeditor-diff-source-wrapper {
          overflow-y: auto !important;
          max-height: calc(100vh - 280px) !important;
        }
        .kronos-editor .mdxeditor-diff-source-wrapper::-webkit-scrollbar {
          width: 12px;
          height: 4px;
        }
        .kronos-editor .mdxeditor-diff-source-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .kronos-editor .mdxeditor-diff-source-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .kronos-editor .mdxeditor-diff-source-wrapper::-webkit-scrollbar-thumb:hover {
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
        }

        .kronos-editor .cm-editor {
          background: var(--color-bg) !important;
          color: var(--color-text) !important;
        }
        .kronos-editor .cm-scroller {
          font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace !important;
          font-size: 13px !important;
          overflow-y: auto !important;
        }
        .kronos-editor .cm-gutters {
          background: var(--color-panel) !important;
          border-right: 1px solid rgba(255,255,255,0.06) !important;
          color: var(--color-text-dim) !important;
        }
        .kronos-editor .cm-activeLineGutter,
        .kronos-editor .cm-activeLine {
          background: color-mix(in srgb, var(--color-accent) 6%, transparent) !important;
        }
        .kronos-editor .cm-selectionBackground,
        .kronos-editor .cm-focused .cm-selectionBackground {
          background: color-mix(in srgb, var(--color-accent) 25%, transparent) !important;
        }
        .kronos-editor .cm-cursor {
          border-left-color: var(--color-accent) !important;
        }

        .kronos-editor .mdxeditor-diff-editor ins { background: rgba(34,197,94,0.15) !important; }
        .kronos-editor .mdxeditor-diff-editor del { background: rgba(239,68,68,0.15) !important; }
      `}</style>

      {fileToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 text-center border-red-500/20 shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Delete Note?</h2>
            <p className="text-kronos-dim mb-6">Delete <span className="text-kronos-text font-bold">{fileToDelete}</span>?</p>
            <div className="flex gap-4 justify-center">
              <Button variant="secondary" onClick={() => setFileToDelete(null)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-red-500/50">Delete</Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 h-full flex flex-col">
        {/* Tab strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-3" style={{ scrollbarWidth: 'thin' }}>
          {files.map(f => {
            const isActive = f === activeFile
            if (renamingTab === f) {
              return (
                <div key={f} className="flex items-center gap-1 bg-kronos-panel rounded px-2 py-1 shrink-0">
                  <input autoFocus value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTabRename(f, renameVal)
                      if (e.key === 'Escape') setRenamingTab(null)
                    }}
                    onBlur={() => setRenamingTab(null)}
                    className="bg-transparent text-sm text-kronos-text outline-none w-24"
                  />
                </div>
              )
            }
            return (
              <div key={f}
                onClick={() => selectFile(f)}
                onDoubleClick={() => { setRenamingTab(f); setRenameVal(f.replace('.md', '')) }}
                className={`group/tab flex items-center gap-1 px-3 py-1.5 rounded cursor-pointer shrink-0 text-sm transition-colors select-none
                  ${isActive
                    ? 'bg-kronos-accent/15 text-kronos-accent font-medium'
                    : 'bg-kronos-panel/40 text-kronos-dim hover:bg-kronos-panel/70 hover:text-kronos-text'}`}
              >
                <span className="truncate max-w-[120px]">{f.replace('.md', '')}</span>
                <button onClick={e => { e.stopPropagation(); setFileToDelete(f) }}
                  className="opacity-0 group-hover/tab:opacity-100 transition-opacity p-0.5 text-kronos-dim hover:text-red-400 ml-0.5 rounded">
                  <X size={12} />
                </button>
              </div>
            )
          })}
          <button onClick={newFile}
            className="shrink-0 p-1.5 rounded hover:bg-kronos-panel/40 text-kronos-dim hover:text-kronos-accent transition-colors"
            title="New note"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Title row + Editor */}
        {activeFile ? (
          <>
            <div className="flex items-center gap-2 shrink-0 pb-3">
              <EditableTitle filename={activeFile} onRename={handleRename} />
              <div className={`ml-auto text-xs transition-opacity duration-500 ${saving ? 'opacity-100 text-kronos-accent' : 'opacity-0'}`}>Saved</div>
            </div>

            <MDXEditor
              key={activeFile}
              markdown={content}
              onChange={val => {
                latestContentRef.current = val;
                isDirtyRef.current = true;
              }}
              autoFocus={{ defaultSelection: 'end', preventScroll: true }}
              plugins={plugins}
              className="dark-theme dark-editor kronos-editor"
              contentEditableClassName="prose-kronos-content custom-scrollbar"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-kronos-dim">
            Select or create a note
          </div>
        )}
      </Card>
    </PageLayout>
  )
}