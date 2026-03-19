import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Play, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  Maximize2, 
  Minimize2, 
  Settings,
  FileCode,
  FileJson,
  FileText,
  Plus,
  Download,
  FolderDown,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderPlus,
  Monitor,
  Smartphone,
  Tablet,
  Search,
  MoreVertical,
  Layers,
  Zap,
  GripVertical,
  MousePointer2,
  RefreshCw,
  Sun,
  Moon,
  Upload,
  FileUp,
  Edit3,
  SearchCode,
  Replace,
  Type,
  Layout
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

// --- Types ---
interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content?: string;
  language?: string;
  isOpen?: boolean;
}

interface Libraries {
  tailwind: boolean;
  bootstrap: boolean;
  react: boolean;
}

const SUPPORTED_EXTENSIONS = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'txt', 'md'];

const App: React.FC = () => {
  // --- State ---
  const [items, setItems] = useState<FileSystemItem[]>(() => {
    const saved = localStorage.getItem('ide_pro_v4_items');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ide_pro_v4_open_tabs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const saved = localStorage.getItem('ide_pro_v4_active_tab');
    return saved || null;
  });

  const [libraries, setLibraries] = useState<Libraries>(() => {
    const saved = localStorage.getItem('ide_pro_v4_libs');
    return saved ? JSON.parse(saved) : { tailwind: true, bootstrap: false, react: true };
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('ide_pro_v4_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [srcDoc, setSrcDoc] = useState('');
  const [isAutoRun, setIsAutoRun] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  
  // Creation/Renaming State
  const [newItemModal, setNewItemModal] = useState<{ type: 'file' | 'folder', parentId: string | null } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  // Search/Replace State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Floating Preview State
  const [previewPos, setPreviewPos] = useState(() => {
    const saved = localStorage.getItem('ide_pro_v4_preview_pos');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 500, y: 100 };
  });
  const [isFloating, setIsFloating] = useState(() => {
    const saved = localStorage.getItem('ide_pro_v4_is_floating');
    return saved ? JSON.parse(saved) : false;
  });

  const activeFile = useMemo(() => items.find(f => f.id === activeFileId && f.type === 'file'), [items, activeFileId]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragControls = useDragControls();

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('ide_pro_v4_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('ide_pro_v4_open_tabs', JSON.stringify(openFileIds));
    localStorage.setItem('ide_pro_v4_active_tab', activeFileId || '');
  }, [openFileIds, activeFileId]);

  useEffect(() => {
    localStorage.setItem('ide_pro_v4_libs', JSON.stringify(libraries));
  }, [libraries]);

  useEffect(() => {
    localStorage.setItem('ide_pro_v4_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ide_pro_v4_preview_pos', JSON.stringify(previewPos));
  }, [previewPos]);

  useEffect(() => {
    localStorage.setItem('ide_pro_v4_is_floating', JSON.stringify(isFloating));
  }, [isFloating]);

  // --- Preview Generation ---
  const generateSrcDoc = useCallback(() => {
    const files = items.filter(i => i.type === 'file');
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    const jsxFiles = files.filter(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'));

    if (!htmlFile && files.length === 0) {
      setSrcDoc('');
      return;
    }

    const combinedDoc = `
      <!DOCTYPE html>
      <html class="${theme}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${libraries.tailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
          ${libraries.bootstrap ? '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">' : ''}
          <style>
            ${theme === 'dark' ? 'body { background: #0f172a; color: #f8fafc; }' : 'body { background: #fff; color: #000; }'}
            ${cssFiles.map(f => f.content).join('\n')}
          </style>
          ${libraries.react ? `
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script>
              window.require = (module) => {
                if (module === 'react') return window.React;
                if (module === 'react-dom' || module === 'react-dom/client') return window.ReactDOM;
                return null;
              };
            </script>
          ` : ''}
        </head>
        <body>
          ${htmlFile ? (htmlFile.content?.match(/<body>([\s\S]*)<\/body>/)?.[1] || htmlFile.content) : '<div id="root"></div>'}
          
          <script>
            (function() {
              const sendMessage = (type, args) => {
                const content = args.map(a => {
                  try {
                    return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
                  } catch (e) { return '[Circular Object]'; }
                }).join(' ');
                window.parent.postMessage({ type, content }, '*');
              };
              console.log = (...args) => sendMessage('log', args);
              console.error = (...args) => sendMessage('error', args);
              console.warn = (...args) => sendMessage('warn', args);
              window.onerror = (m, s, l) => sendMessage('error', ['Error: ' + m + ' at line ' + l]);
            })();
          </script>

          ${jsFiles.map(f => `<script>${f.content}</script>`).join('\n')}
          
          ${libraries.react ? `
            <script type="text/babel" data-presets="react,stage-3">
              const { useState, useEffect, useRef, useMemo, useCallback } = React;
              ${jsxFiles.map(f => f.content).join('\n')}
            </script>
          ` : ''}
        </body>
      </html>
    `;
    setSrcDoc(combinedDoc);
  }, [items, libraries, theme]);

  useEffect(() => {
    if (isAutoRun) {
      const timeout = setTimeout(generateSrcDoc, 800);
      return () => clearTimeout(timeout);
    }
  }, [items, isAutoRun, generateSrcDoc, libraries, theme]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'log' || event.data.type === 'error' || event.data.type === 'warn') {
        setLogs(prev => [...prev.slice(-49), `[${event.data.type.toUpperCase()}] ${event.data.content}`]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // --- File Handlers ---
  const handleCreateItem = () => {
    if (!newItemName.trim() || !newItemModal) return;
    
    // Validation
    if (newItemModal.type === 'folder' && newItemName.includes('.')) {
      alert('Folder names should not contain dots.');
      return;
    }
    
    const extension = newItemName.split('.').pop() || '';
    if (newItemModal.type === 'file' && !SUPPORTED_EXTENSIONS.includes(extension.toLowerCase())) {
      alert(`Unsupported file extension. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    let language = 'plaintext';
    if (['html', 'htm'].includes(extension)) language = 'html';
    else if (['css'].includes(extension)) language = 'css';
    else if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) language = 'javascript';
    else if (['json'].includes(extension)) language = 'json';
    else if (['md'].includes(extension)) language = 'markdown';

    const newItem: FileSystemItem = {
      id: Date.now().toString(),
      name: newItemName,
      type: newItemModal.type,
      parentId: newItemModal.parentId,
      content: newItemModal.type === 'file' ? '' : undefined,
      language: newItemModal.type === 'file' ? language : undefined,
      isOpen: newItemModal.type === 'folder' ? true : undefined
    };

    setItems([...items, newItem]);
    if (newItemModal.type === 'file') {
      setActiveFileId(newItem.id);
      if (!openFileIds.includes(newItem.id)) setOpenFileIds([...openFileIds, newItem.id]);
    }
    setNewItemName('');
    setNewItemModal(null);
  };

  const handleRename = () => {
    if (!renamingItemId || !renamingName.trim()) return;
    
    setItems(items.map(i => {
      if (i.id === renamingItemId) {
        if (i.type === 'folder' && renamingName.includes('.')) {
          alert('Folder names should not contain dots.');
          return i;
        }
        return { ...i, name: renamingName };
      }
      return i;
    }));
    setRenamingItemId(null);
    setRenamingName('');
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const toDelete = [id];
    const findChildren = (parentId: string) => {
      items.filter(i => i.parentId === parentId).forEach(child => {
        toDelete.push(child.id);
        if (child.type === 'folder') findChildren(child.id);
      });
    };
    findChildren(id);

    const newItems = items.filter(i => !toDelete.includes(i.id));
    setItems(newItems);
    setOpenFileIds(openFileIds.filter(fid => !toDelete.includes(fid)));
    if (activeFileId && toDelete.includes(activeFileId)) setActiveFileId(null);
  };

  const openFile = (id: string) => {
    setActiveFileId(id);
    if (!openFileIds.includes(id)) {
      setOpenFileIds([...openFileIds, id]);
    }
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openFileIds.filter(tid => tid !== id);
    setOpenFileIds(newTabs);
    if (activeFileId === id) {
      setActiveFileId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  // --- Export/Import ---
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const addItemsToZip = (parentId: string | null, path: string) => {
      items.filter(i => i.parentId === parentId).forEach(item => {
        const currentPath = path ? `${path}/${item.name}` : item.name;
        if (item.type === 'file') {
          zip.file(currentPath, item.content || '');
        } else {
          addItemsToZip(item.id, currentPath);
        }
      });
    };
    addItemsToZip(null, '');
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'project.zip');
  };

  const handleExportSingleHTML = () => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    saveAs(blob, 'index.html');
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const zip = await JSZip.loadAsync(file);
    const newItems: FileSystemItem[] = [];
    
    // Simple flat import for now to keep it stable
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('string');
        const name = path.split('/').pop() || path;
        const extension = name.split('.').pop() || '';
        newItems.push({
          id: Math.random().toString(36).substr(2, 9),
          name,
          type: 'file',
          parentId: null,
          content,
          language: extension === 'html' ? 'html' : extension === 'css' ? 'css' : 'javascript'
        });
      }
    }
    setItems([...items, ...newItems]);
  };

  // --- Search/Replace ---
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    setItems(items.map(i => {
      if (i.type === 'file' && i.content?.includes(searchQuery)) {
        return { ...i, content: i.content.replaceAll(searchQuery, replaceQuery) };
      }
      return i;
    }));
    setIsSearchOpen(false);
  };

  // --- Layout Resizing ---
  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (!isResizingSidebar) return;
    setSidebarWidth(Math.max(150, Math.min(600, e.clientX)));
  }, [isResizingSidebar]);

  useEffect(() => {
    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleSidebarResize);
      window.addEventListener('mouseup', () => setIsResizingSidebar(false));
    }
    return () => window.removeEventListener('mousemove', handleSidebarResize);
  }, [isResizingSidebar, handleSidebarResize]);

  // --- Render Helpers ---
  const renderTree = (parentId: string | null = null, level = 0) => {
    return items
      .filter(i => i.parentId === parentId)
      .sort((a, b) => (a.type === 'folder' ? -1 : 1))
      .map(item => (
        <div key={item.id}>
          <div 
            onClick={() => item.type === 'file' ? openFile(item.id) : setItems(items.map(i => i.id === item.id ? { ...i, isOpen: !i.isOpen } : i))}
            className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeFileId === item.id ? 'bg-indigo-600/20 text-white' : 'hover:bg-white/5 text-gray-500'
            }`}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {item.type === 'folder' ? (
                item.isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <FileCode className={`w-3.5 h-3.5 ${item.name.endsWith('.html') ? 'text-orange-500' : item.name.endsWith('.css') ? 'text-blue-500' : 'text-yellow-500'}`} />
              )}
              {item.type === 'folder' && <Folder className="w-4 h-4 text-emerald-500/70" />}
              <span className="text-xs truncate font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {item.type === 'folder' && (
                <button onClick={(e) => { e.stopPropagation(); setNewItemModal({ type: 'file', parentId: item.id }); }} className="p-1 hover:text-indigo-400"><Plus className="w-3 h-3" /></button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setRenamingItemId(item.id); setRenamingName(item.name); }} className="p-1 hover:text-indigo-400"><Edit3 className="w-3 h-3" /></button>
              <button onClick={(e) => handleDeleteItem(item.id, e)} className="p-1 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          </div>
          {item.type === 'folder' && item.isOpen && renderTree(item.id, level + 1)}
        </div>
      ));
  };

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-[#0a0a0a] text-gray-300' : 'bg-gray-50 text-gray-800'} font-sans overflow-hidden transition-colors duration-300`}>
      {/* --- Header --- */}
      <header className={`h-12 border-b ${theme === 'dark' ? 'border-white/5 bg-[#111]' : 'border-gray-200 bg-white'} flex items-center justify-between px-4 shrink-0 z-[100]`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1 rounded-md shadow-lg shadow-indigo-600/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} tracking-tight`}>Live Pro IDE v4</h1>
          
          <div className="flex items-center gap-1 ml-4 bg-black/10 p-0.5 rounded-lg">
            <button 
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Moon className="w-3 h-3" />
            </button>
            <button 
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sun className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Library Toggles */}
          <div className="hidden lg:flex items-center gap-2 mr-4">
            <button 
              onClick={() => setLibraries(l => ({ ...l, tailwind: !l.tailwind }))}
              className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${libraries.tailwind ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'border-white/5 text-gray-600'}`}
            >
              Tailwind
            </button>
            <button 
              onClick={() => setLibraries(l => ({ ...l, bootstrap: !l.bootstrap }))}
              className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${libraries.bootstrap ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'border-white/5 text-gray-600'}`}
            >
              Bootstrap
            </button>
          </div>

          <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/5">
            <button 
              onClick={() => setIsAutoRun(true)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isAutoRun ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
            >
              AUTO
            </button>
            <button 
              onClick={() => setIsAutoRun(false)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isAutoRun ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
            >
              MANUAL
            </button>
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <div className="flex items-center gap-1">
            <label className="p-1.5 hover:bg-white/5 rounded-lg cursor-pointer text-gray-500 transition-all" title="Import ZIP">
              <FileUp className="w-4 h-4" />
              <input type="file" accept=".zip" onChange={handleImportZip} className="hidden" />
            </label>
            <button onClick={handleDownloadZip} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-all" title="Export ZIP"><FolderDown className="w-4 h-4" /></button>
            <button onClick={handleExportSingleHTML} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-all" title="Export Single HTML"><Download className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* --- Sidebar --- */}
        <aside 
          style={{ width: sidebarWidth }}
          className={`flex flex-col border-r ${theme === 'dark' ? 'border-white/5 bg-[#0f0f0f]' : 'border-gray-200 bg-white'} shrink-0 overflow-hidden`}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Explorer</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setNewItemModal({ type: 'file', parentId: null })} className="p-1 hover:bg-white/5 rounded text-indigo-400"><Plus className="w-4 h-4" /></button>
                <button onClick={() => setNewItemModal({ type: 'folder', parentId: null })} className="p-1 hover:bg-white/5 rounded text-emerald-400"><FolderPlus className="w-4 h-4" /></button>
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-1 hover:bg-white/5 rounded ${isSearchOpen ? 'text-indigo-400' : 'text-gray-500'}`}><SearchCode className="w-4 h-4" /></button>
              </div>
            </div>

            {isSearchOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="space-y-2 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                  <input 
                    type="text"
                    placeholder="Search project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/10 border border-white/5 rounded-md py-1.5 pl-7 pr-3 text-[10px] focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="relative">
                  <Replace className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                  <input 
                    type="text"
                    placeholder="Replace with..."
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    className="w-full bg-black/10 border border-white/5 rounded-md py-1.5 pl-7 pr-3 text-[10px] focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <button onClick={handleReplaceAll} className="w-full py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md">REPLACE ALL</button>
              </motion.div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input 
                type="text"
                placeholder="Filter files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/10 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
            <AnimatePresence>
              {newItemModal && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-2 py-2 mb-2 bg-indigo-600/5 border border-indigo-600/20 rounded-lg">
                  <input 
                    autoFocus
                    type="text"
                    placeholder={newItemModal.type === 'file' ? "filename.ext" : "folder name"}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateItem()}
                    className="w-full bg-transparent text-xs outline-none text-white placeholder:text-gray-600"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setNewItemModal(null)} className="text-[10px] hover:text-white">Cancel</button>
                    <button onClick={handleCreateItem} className="text-[10px] text-indigo-400 font-bold">Create</button>
                  </div>
                </motion.div>
              )}
              {renamingItemId && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-2 py-2 mb-2 bg-emerald-600/5 border border-emerald-600/20 rounded-lg">
                  <input 
                    autoFocus
                    type="text"
                    value={renamingName}
                    onChange={(e) => setRenamingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="w-full bg-transparent text-xs outline-none text-white"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setRenamingItemId(null)} className="text-[10px] hover:text-white">Cancel</button>
                    <button onClick={handleRename} className="text-[10px] text-emerald-400 font-bold">Rename</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {renderTree(null)}
          </div>
        </aside>

        {/* --- Sidebar Resizer --- */}
        <div onMouseDown={() => setIsResizingSidebar(true)} className={`w-1 hover:bg-indigo-500/50 cursor-col-resize transition-colors z-[110] ${isResizingSidebar ? 'bg-indigo-500' : ''}`} />

        {/* --- Main Editor --- */}
        <main className={`flex-1 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
          <div className={`h-10 border-b ${theme === 'dark' ? 'border-white/5 bg-[#111]' : 'border-gray-200 bg-gray-50'} flex items-center px-2 gap-1 overflow-x-auto no-scrollbar`}>
            {openFileIds.map(fid => {
              const file = items.find(i => i.id === fid);
              if (!file) return null;
              return (
                <div 
                  key={fid}
                  onClick={() => setActiveFileId(fid)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold cursor-pointer transition-all border-b-2 ${
                    activeFileId === fid 
                      ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500' 
                      : 'text-gray-500 border-transparent hover:bg-black/5'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  {file.name}
                  <X className="w-2.5 h-2.5 ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400" onClick={(e) => closeTab(fid, e)} />
                </div>
              );
            })}
          </div>

          <div className="flex-1 relative">
            {activeFile ? (
              <Editor
                height="100%"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language={activeFile.language}
                value={activeFile.content}
                onChange={(value) => {
                  setItems(prev => prev.map(i => i.id === activeFileId ? { ...i, content: value || '' } : i));
                }}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  wordBasedSuggestions: "allDocuments",
                  scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-4">
                <Code2 className="w-16 h-16 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-30">Open a file to edit</p>
              </div>
            )}
          </div>

          {/* --- Console --- */}
          <div className={`h-32 border-t ${theme === 'dark' ? 'border-white/5 bg-[#0a0a0a]' : 'border-gray-200 bg-white'} flex flex-col`}>
            <div className={`h-7 border-b ${theme === 'dark' ? 'border-white/5 bg-[#111]' : 'border-gray-200 bg-gray-50'} flex items-center justify-between px-4`}>
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-gray-600" />
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Console</span>
              </div>
              <button onClick={() => setLogs([])} className="text-[9px] text-gray-600 hover:text-indigo-500">CLEAR</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.includes('[ERROR]') ? 'text-red-400' : 'text-gray-500'}`}>
                  <span className="opacity-20 shrink-0">{i + 1}</span>
                  <pre className="whitespace-pre-wrap break-all">{log.replace(/^\[.*?\]\s/, '')}</pre>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* --- Preview --- */}
        <AnimatePresence>
          {isPreviewVisible && (
            <motion.section 
              drag={isFloating}
              dragControls={dragControls}
              dragMomentum={false}
              onDragEnd={(_, info) => setPreviewPos({ x: previewPos.x + info.offset.x, y: previewPos.y + info.offset.y })}
              initial={false}
              animate={isPreviewFullscreen ? {
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', x: 0, y: 0, zIndex: 1000
              } : isFloating ? {
                position: 'fixed', top: previewPos.y, left: previewPos.x, width: 450, height: 600, zIndex: 500
              } : {
                position: 'relative', width: 450, height: '100%', x: 0, y: 0, zIndex: 10
              }}
              className={`flex flex-col bg-white overflow-hidden shadow-2xl ${isFloating ? 'rounded-2xl border border-gray-200' : 'border-l border-gray-200'}`}
            >
              <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50 shrink-0 select-none">
                <div className="flex items-center gap-3">
                  {isFloating && (
                    <div onPointerDown={(e) => dragControls.start(e)} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors">
                      <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewDevice('desktop')} className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}><Monitor className="w-3 h-3" /></button>
                    <button onClick={() => setPreviewDevice('tablet')} className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}><Tablet className="w-3 h-3" /></button>
                    <button onClick={() => setPreviewDevice('mobile')} className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}><Smartphone className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setIsFloating(!isFloating)} className={`p-1.5 rounded transition-all ${isFloating ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600'}`}><MousePointer2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-all">{isPreviewFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => setIsPreviewVisible(false)} className="p-1.5 text-gray-400 hover:text-red-500 transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100 flex justify-center items-start overflow-auto p-4">
                <div className={`bg-white shadow-xl transition-all duration-300 ${previewDevice === 'desktop' ? 'w-full h-full' : previewDevice === 'tablet' ? 'w-[768px] h-[1024px] max-h-full' : 'w-[375px] h-[667px] max-h-full'}`}>
                  <iframe ref={iframeRef} srcDoc={srcDoc} title="Preview" className="w-full h-full border-none" sandbox="allow-scripts allow-modals allow-forms allow-popups" />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {!isPreviewVisible && (
          <button onClick={() => setIsPreviewVisible(true)} className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-[1000]"><Monitor className="w-6 h-6" /></button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
        ${theme === 'dark' ? '.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }' : ''}
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default App;
