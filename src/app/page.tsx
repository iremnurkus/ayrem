"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
} from "react";

type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type EditorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SidebarPanel = "explorer" | "search" | "source" | "extensions" | "settings";
type ColorTheme = "earthy" | "midnight" | "ember";
type ProjectTab = "overview" | "preview" | "stack";

type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  run: () => void;
};

type ProjectInfo = {
  name: string;
  detail: string;
  file: string;
  tags: string[];
};

type WorkspaceFile = {
  id: string;
  name: string;
  file: string;
  kind: "tsx" | "md";
  project?: ProjectInfo;
};

const panelDetails: Record<SidebarPanel, { title: string; icon: string }> = {
  explorer: { title: "EXPLORER", icon: "▤" },
  search: { title: "SEARCH", icon: "⌕" },
  source: { title: "SOURCE CONTROL", icon: "⑂" },
  extensions: { title: "EXTENSIONS", icon: "▦" },
  settings: { title: "SETTINGS", icon: "⚙" },
};

function ResizeHandles({
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>, edge: ResizeEdge) => void;
  onResizeMove: (event: ReactPointerEvent<HTMLDivElement>, edge: ResizeEdge) => void;
  onResizeEnd: PointerEventHandler<HTMLDivElement>;
}) {
  const edges: ResizeEdge[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

  return (
    <>
      {edges.map((edge) => (
        <div
          aria-hidden="true"
          className={`resize-handle resize-handle--${edge}`}
          key={edge}
          onPointerDown={(event) => onResizeStart(event, edge)}
          onPointerMove={(event) => onResizeMove(event, edge)}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
        />
      ))}
    </>
  );
}

function CommandPalette({
  commands,
  onClose,
}: {
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = commands.filter((command) =>
    `${command.label} ${command.detail}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );

  const selectCommand = (command: PaletteCommand | undefined) => {
    if (!command) {
      return;
    }
    onClose();
    command.run();
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Komut paleti"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="palette-input-wrap">
          <span aria-hidden="true">⌕</span>
          <span className="visually-hidden">Komut veya dosya ara</span>
          <input
            autoFocus
            aria-label="Komut veya dosya ara"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onClose();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                selectCommand(results[activeIndex]);
              }
            }}
            placeholder="Dosya, proje veya komut ara..."
          />
          <kbd>ESC</kbd>
        </label>
        <div className="palette-section-label">{query ? "EŞLEŞEN KOMUTLAR" : "HIZLI ERİŞİM"}</div>
        <div className="palette-results" role="listbox" aria-label="Komutlar">
          {results.map((command, index) => (
            <button
              aria-selected={activeIndex === index}
              className={`palette-command${activeIndex === index ? " palette-command--active" : ""}`}
              key={command.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectCommand(command)}
              role="option"
              type="button"
            >
              <span className="palette-command-icon">{command.icon}</span>
              <span><strong>{command.label}</strong><small>{command.detail}</small></span>
              {index === 0 && !query && <kbd>↵</kbd>}
            </button>
          ))}
          {results.length === 0 && <p className="palette-empty">Bu aramayla eşleşen komut bulunamadı.</p>}
        </div>
        <div className="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> gezin</span>
          <span><kbd>↵</kbd> seç</span>
          <span><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>P</kbd> komutlar</span>
        </div>
      </section>
    </div>
  );
}

function ProjectPreview({ project }: { project: ProjectInfo }) {
  return (
    <div className={`preview-window preview-window--${project.file.replace(".tsx", "")}`}>
      <div className="preview-window-bar"><span /><span /><span /><small>{project.name.toLocaleLowerCase("tr")} — preview</small></div>
      <div className="preview-canvas">
        {project.name === "Saat" && (
          <div className="preview-clock">
            <span>BUGÜNÜN RİTMİ</span><strong>10<span>:</span>24</strong><small>kendine ait bir zaman</small><i>▶</i>
          </div>
        )}
        {project.name === "Günlük" && (
          <div className="preview-diary">
            <div className="preview-diary-top"><span>GÜNLÜK</span><span>✳</span></div>
            <small>BUGÜN · KENDİNE DÖN</small>
            <strong>Bugün nasıl<br />hissediyorsun?</strong>
            <div className="preview-mood-row"><i>☼</i><i>☁</i><i>✳</i><i>☾</i></div>
          </div>
        )}
        {project.name === "GaziÇark" && (
          <div className="preview-wheel">
            <span>BUGÜN NE ÇALIŞSAK?</span><div className="preview-wheel-disc"><i>✦</i><i>⌘</i><i>✳</i><i>↗</i><b>çevir</b></div><small>birlikte daha kolay</small>
          </div>
        )}
        {project.name === "Mola" && (
          <div className="preview-breathe">
            <small>ŞİMDİ KÜÇÜK BİR ARA</small><div className="preview-breathe-orb"><span>nefes al</span></div><span>yavaşla · hisset · devam et</span>
          </div>
        )}
        {project.name === "Rota" && (
          <div className="preview-map">
            <div className="preview-map-label">BUGÜNÜN ROTASI <span>↗</span></div>
            <div className="preview-map-path"><i /><i /><i /><i /><b>✦</b></div>
            <div className="preview-map-bottom"><span>biraz kaybol</span><strong>yeni bir yer bul →</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

const projects: ProjectInfo[] = [
  {
    name: "Saat",
    detail: "Zamanı kendine göre yaşa",
    file: "saat.tsx",
    tags: ["Teknoloji bilgisi bekleniyor"],
  },
  {
    name: "Günlük",
    detail: "Kendine ait küçük bir alan",
    file: "gunluk.tsx",
    tags: ["Next.js", ".NET", "React Native"],
  },
  {
    name: "GaziÇark",
    detail: "StudyBudy",
    file: "gazicark.tsx",
    tags: ["Teknoloji bilgisi bekleniyor"],
  },
  {
    name: "Mola",
    detail: "Bir nefeslik iyi hisset",
    file: "mola.tsx",
    tags: ["Teknoloji bilgisi bekleniyor"],
  },
  {
    name: "Rota",
    detail: "Kaybol, güzel şeyler bul",
    file: "rota.tsx",
    tags: ["Teknoloji bilgisi bekleniyor"],
  },
];

const workspaceFiles: WorkspaceFile[] = [
  { id: "index.tsx", name: "Portfolio", file: "index.tsx", kind: "tsx" },
  { id: "about.md", name: "Hakkımda", file: "about.md", kind: "md" },
  ...projects.map((project) => ({
    id: project.file,
    name: project.name,
    file: project.file,
    kind: "tsx" as const,
    project,
  })),
];

const introLines = [
  <><span className="code-comment">{"// İrem Nur Kuş · portfolio"}</span></>,
  <><span className="code-purple">const</span> <span className="code-blue">developer</span> = {"{"}</>,
  <>  name: <span className="code-green">&quot;İrem Nur Kuş&quot;</span>,</>,
  <>  focus: [<span className="code-green">&quot;web&quot;</span>, <span className="code-green">&quot;mobile&quot;</span>],</>,
  <>  approach: <span className="code-green">&quot;thoughtful by design&quot;</span>,</>,
  <>{`};`}</>,
  <><span className="code-purple">const</span> <span className="code-blue">projects</span> = <span className="code-orange">await</span> loadProjects();</>,
  <><span className="code-purple">export default</span> <span className="code-orange">function</span> <span className="code-yellow">Portfolio</span>() {"{"}</>,
  <>  <span className="code-purple">return</span> &lt;<span className="code-blue">CreativeWork</span> /&gt;;</>,
  <>{`}`}</>,
];

function OpeningSequence({
  isClosing,
  onSkip,
  frameStyle,
  isResized,
  resizeHandles,
}: {
  isClosing: boolean;
  onSkip: () => void;
  frameStyle?: CSSProperties;
  isResized: boolean;
  resizeHandles: React.ReactNode;
}) {
  return (
    <div
      className={`opening-sequence${isClosing ? " opening-sequence--closing" : ""}${isResized ? " opening-sequence--user-sized" : ""}`}
      role="status"
      aria-label="Portföy hazırlanıyor"
      style={frameStyle}
    >
      <div className="opening-window-bar">
        <div className="titlebar-brand">
          <span className="app-mark" aria-hidden="true">&lt;/&gt;</span>
          <span>irem-nur-kus</span>
        </div>
        <div className="opening-window-title">portfolio — workspace</div>
        <div className="opening-titlebar-actions">
          <button className="skip-intro" type="button" onClick={onSkip}>
            Animasyonu geç <span aria-hidden="true">↗</span>
          </button>
          <div className="window-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <div className="opening-editor">
        <aside className="opening-activity" aria-hidden="true">
          <span className="activity-glyph activity-glyph--active">▤</span>
          <span className="activity-glyph">⌕</span>
          <span className="activity-glyph">⌘</span>
          <span className="activity-glyph">◌</span>
        </aside>
        <aside className="opening-explorer" aria-hidden="true">
          <div className="opening-explorer-heading">EXPLORER</div>
          <div className="opening-explorer-root">⌄ &nbsp; IREM-PORTFOLIO</div>
          <div className="opening-explorer-row">⌄ &nbsp; ▰ &nbsp; about</div>
          <div className="opening-explorer-row opening-explorer-row--nested">M &nbsp; about.md</div>
          <div className="opening-explorer-row">⌄ &nbsp; ▰ &nbsp; projects</div>
          <div className="opening-explorer-row opening-explorer-row--nested">TS &nbsp; index.tsx</div>
        </aside>
        <div className="opening-workbench">
          <div className="opening-file">
            <span className="file-mark">TS</span>
            <span>index.tsx</span>
            <span className="tab-close" aria-hidden="true">×</span>
          </div>
          <div className="opening-breadcrumbs">
            <span>projects</span><span>›</span><span className="file-mark">TS</span><span>index.tsx</span><span>›</span><span>Portfolio</span>
          </div>
          <div className="opening-code">
            <div className="code-lines" aria-hidden="true">
              {introLines.map((line, index) => (
                <div className="code-line" key={index}>
                  <span className="line-number">{String(index + 1).padStart(2, "0")}</span>
                  <span
                    className="line-typing"
                    style={{ animationDelay: `${index * 0.39}s` }}
                  >
                    {line}
                  </span>
                </div>
              ))}
              <span className="code-caret" aria-hidden="true" />
            </div>
            <div className="opening-description">
              <span className="code-comment">{"// MERHABA, BEN İREM"}</span>
              <span>Fikirleri <span className="code-green">koda,</span> kodu <span className="code-orange">ürüne.</span></span>
            </div>
          </div>
        </div>
      </div>
      <div className="opening-status">
        <div className="statusbar-left"><span className="status-remote">◉</span><span>portfolio</span><span>⑂ main</span></div>
        <div className="statusbar-right"><span><i /> Building something thoughtful</span><span>UTF-8</span><span>TSX</span></div>
      </div>
      {resizeHandles}
    </div>
  );
}

export default function Home() {
  const [openingPhase, setOpeningPhase] = useState<"intro" | "transition" | "done">("intro");
  const [editorRect, setEditorRect] = useState<EditorRect | null>(null);
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel | null>("explorer");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aboutFolderOpen, setAboutFolderOpen] = useState(true);
  const [projectsFolderOpen, setProjectsFolderOpen] = useState(true);
  const [workspaceFolderOpen, setWorkspaceFolderOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [activeFile, setActiveFile] = useState("index.tsx");
  const [openFiles, setOpenFiles] = useState(["index.tsx"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [extensionQuery, setExtensionQuery] = useState("");
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [committedFiles, setCommittedFiles] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [commitInput, setCommitInput] = useState("");
  const [editorFontSize, setEditorFontSize] = useState(13);
  const [lineNumbersVisible, setLineNumbersVisible] = useState(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("earthy");
  const [projectTab, setProjectTab] = useState<ProjectTab>("overview");
  const [statusMessage, setStatusMessage] = useState("Fikirden ürüne, özenle.");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resizeStart = useRef<{
    edge: ResizeEdge;
    pointerX: number;
    pointerY: number;
    rect: EditorRect;
  } | null>(null);

  const handleResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    edge: ResizeEdge,
  ) => {
    const frame = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!frame) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = {
      edge,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rect: { x: frame.left, y: frame.top, width: frame.width, height: frame.height },
    };
  };

  const handleResizeMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    edge: ResizeEdge,
  ) => {
    const start = resizeStart.current;
    if (!start || start.edge !== edge) {
      return;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const minWidth = Math.min(560, viewportWidth - 32);
    const minHeight = Math.min(380, window.innerHeight - 32);
    const deltaX = event.clientX - start.pointerX;
    const deltaY = event.clientY - start.pointerY;
    const right = start.rect.x + start.rect.width;
    const bottom = start.rect.y + start.rect.height;
    let { x, y, width, height } = start.rect;

    if (edge.includes("e")) {
      width = Math.max(
        minWidth,
        Math.min(start.rect.width + deltaX, viewportWidth - start.rect.x - 16),
      );
    }
    if (edge.includes("w")) {
      x = Math.max(16, Math.min(start.rect.x + deltaX, right - minWidth, viewportWidth - 16));
      width = right - x;
    }
    if (edge.includes("s")) {
      height = Math.max(
        minHeight,
        Math.min(start.rect.height + deltaY, window.innerHeight - start.rect.y - 16),
      );
    }
    if (edge.includes("n")) {
      y = Math.max(16, Math.min(start.rect.y + deltaY, bottom - minHeight));
      height = bottom - y;
    }

    setEditorRect({ x, y, width, height });
  };

  const handleResizeEnd: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeStart.current = null;
  };

  const frameStyle: CSSProperties | undefined = editorRect
    ? {
        "--editor-left": `${editorRect.x}px`,
        "--editor-top": `${editorRect.y}px`,
        "--editor-width": `${editorRect.width}px`,
        "--editor-height": `${editorRect.height}px`,
      } as CSSProperties
    : undefined;

  const resizeHandles = (
    <ResizeHandles
      onResizeStart={handleResizeStart}
      onResizeMove={handleResizeMove}
      onResizeEnd={handleResizeEnd}
    />
  );

  const openFile = (fileId: string) => {
    setActiveFile(fileId);
    setOpenFiles((current) => current.includes(fileId) ? current : [...current, fileId]);
    setSidebarPanel(window.innerWidth <= 650 ? null : "explorer");
    setProjectTab("overview");
    const file = workspaceFiles.find((item) => item.id === fileId);
    setStatusMessage(file ? `${file.file} açıldı` : "Dosya açıldı");
  };

  const togglePanel = (panel: SidebarPanel) => {
    setSidebarPanel((current) => current === panel ? null : panel);
    if (panel === "search") {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
    setStatusMessage(panelDetails[panel].title.toLocaleLowerCase("tr") + " paneli");
  };

  const closeFile = (fileId: string) => {
    const remaining = openFiles.filter((file) => file !== fileId);
    if (activeFile === fileId) {
      setActiveFile(remaining.at(-1) ?? "index.tsx");
    }
    setOpenFiles(remaining.length > 0 ? remaining : ["index.tsx"]);
  };

  const filteredFiles = workspaceFiles.filter((file) =>
    `${file.name} ${file.file}`.toLocaleLowerCase("tr").includes(searchQuery.toLocaleLowerCase("tr")),
  );
  const extensions = [
    { name: "TypeScript", detail: "Dil desteği · yerleşik", icon: "TS", terms: "typescript dil desteği" },
    { name: "Color Themes", detail: "Zeytin, gece ve kiremit paletleri", icon: "◐", terms: "color themes zeytin gece kiremit renk" },
  ].filter((extension) => `${extension.name} ${extension.terms}`.toLocaleLowerCase("tr").includes(extensionQuery.toLocaleLowerCase("tr")));
  const activeWorkspaceFile = workspaceFiles.find((file) => file.id === activeFile) ?? workspaceFiles[0];
  const changedFiles = workspaceFiles.filter((file) => file.id !== "about.md" && !committedFiles.includes(file.id));
  const cycleTheme = () => {
    const themes: ColorTheme[] = ["earthy", "midnight", "ember"];
    const nextTheme = themes[(themes.indexOf(colorTheme) + 1) % themes.length];
    setColorTheme(nextTheme);
    setStatusMessage(`${nextTheme === "earthy" ? "Zeytin" : nextTheme === "midnight" ? "Gece" : "Kiremit"} teması etkin`);
  };

  const executePaletteFile = (fileId: string) => {
    setCommandPaletteOpen(false);
    openFile(fileId);
  };

  const commands: PaletteCommand[] = [
    ...workspaceFiles.map((file) => ({
      id: `open-${file.id}`,
      label: `${file.name} dosyasını aç`,
      detail: file.file,
      icon: file.kind === "md" ? "M" : "TS",
      run: () => executePaletteFile(file.id),
    })),
    {
      id: "show-projects",
      label: "Projeleri göster",
      detail: "Portföy ana sayfasına git",
      icon: "▦",
      run: () => {
        openFile("index.tsx");
        window.setTimeout(() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }), 0);
      },
    },
    {
      id: "toggle-explorer",
      label: "Dosya gezginini aç / kapat",
      detail: "Ctrl+B",
      icon: "▤",
      run: () => setSidebarPanel((panel) => panel === "explorer" ? null : "explorer"),
    },
    {
      id: "open-search",
      label: "Dosyalarda ara",
      detail: "Ctrl+P",
      icon: "⌕",
      run: () => {
        setSidebarPanel("search");
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      },
    },
    {
      id: "open-settings",
      label: "Editör ayarlarını aç",
      detail: "Yazı boyutu, tema ve görünüm",
      icon: "⚙",
      run: () => setSidebarPanel("settings"),
    },
    {
      id: "change-theme",
      label: "Tema değiştir",
      detail: "Zeytin, gece, kiremit",
      icon: "◐",
      run: cycleTheme,
    },
  ];

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (motionPreference.matches) {
      return;
    }

    const timeout = window.setTimeout(() => setOpeningPhase("transition"), 5600);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (openingPhase !== "transition") {
      return;
    }

    const timeout = window.setTimeout(() => setOpeningPhase("done"), 950);
    return () => window.clearTimeout(timeout);
  }, [openingPhase]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setSidebarPanel("search");
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarPanel((panel) => panel === "explorer" ? null : "explorer");
      } else if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const isOpening = openingPhase !== "done";

  return (
    <>
      {isOpening && (
        <OpeningSequence
          isClosing={openingPhase === "transition"}
          onSkip={() => setOpeningPhase("transition")}
          frameStyle={frameStyle}
          isResized={editorRect !== null}
          resizeHandles={resizeHandles}
        />
      )}
      <main
        className={`ide-shell${openingPhase === "intro" ? " ide-shell--loading" : ""}${openingPhase === "transition" ? " ide-shell--revealing" : ""}${editorRect ? " ide-shell--user-sized" : ""}`}
        data-theme={colorTheme}
        id="top"
        style={frameStyle}
      >
        <header className="titlebar">
          <div className="titlebar-brand">
            <span className="app-mark" aria-hidden="true">&lt;/&gt;</span>
            <span>irem-nur-kus</span>
          </div>
          <button className="titlebar-center" type="button" onClick={() => setCommandPaletteOpen(true)} aria-label="Komut paletini aç">
            <span className="titlebar-search-icon" aria-hidden="true">⌕</span>
            <span>portfolio — komut veya dosya ara</span>
            <span className="titlebar-shortcut">Ctrl Shift P</span>
          </button>
          <div className="window-lights" aria-label="Pencere denetimleri">
            <span />
            <span />
            <span />
          </div>
        </header>

        <div className="ide-body">
          <aside className="activity-bar" aria-label="Çalışma alanı araçları">
            <button
              className={`activity-glyph${sidebarPanel === "explorer" ? " activity-glyph--active" : ""}`}
              type="button"
              aria-label="Dosya gezgini"
              aria-pressed={sidebarPanel === "explorer"}
              onClick={() => togglePanel("explorer")}
            >▤</button>
            <button
              className={`activity-glyph${sidebarPanel === "search" ? " activity-glyph--active" : ""}`}
              type="button"
              aria-label="Dosyalarda ara"
              aria-pressed={sidebarPanel === "search"}
              onClick={() => togglePanel("search")}
            >⌕</button>
            <button
              className={`activity-glyph${sidebarPanel === "source" ? " activity-glyph--active" : ""}`}
              type="button"
              aria-label="Kaynak kontrolü"
              aria-pressed={sidebarPanel === "source"}
              onClick={() => togglePanel("source")}
            >⑂</button>
            <button
              className={`activity-glyph${sidebarPanel === "extensions" ? " activity-glyph--active" : ""}`}
              type="button"
              aria-label="Uzantılar"
              aria-pressed={sidebarPanel === "extensions"}
              onClick={() => togglePanel("extensions")}
            >▦</button>
            <button
              className={`activity-glyph activity-glyph--bottom${sidebarPanel === "settings" ? " activity-glyph--active" : ""}`}
              type="button"
              aria-label="Ayarlar"
              aria-pressed={sidebarPanel === "settings"}
              onClick={() => togglePanel("settings")}
            >⚙</button>
            <button
              className="activity-avatar"
              type="button"
              aria-label="Hakkımda dosyasını aç"
              onClick={() => openFile("about.md")}
            >İK</button>
          </aside>

          {sidebarPanel && (
            <aside className={`explorer explorer--${sidebarPanel}`} aria-label={`${panelDetails[sidebarPanel].title} paneli`}>
              <div className="explorer-heading">
                {panelDetails[sidebarPanel].title}
                <button className="panel-action" type="button" aria-label="Paneli kapat" onClick={() => setSidebarPanel(null)}>×</button>
              </div>

              {sidebarPanel === "explorer" && (
                <>
                  <button className="tree-root tree-toggle" type="button" onClick={() => setWorkspaceFolderOpen((open) => !open)}>
                    <span>{workspaceFolderOpen ? "⌄" : "›"}</span> IREM-PORTFOLIO
                  </button>
                  {workspaceFolderOpen && (
                    <nav className="file-tree" aria-label="Dosya gezgini">
                      <button className="tree-folder-row" type="button" onClick={() => setAboutFolderOpen((open) => !open)}>
                        <span className="tree-chevron">{aboutFolderOpen ? "⌄" : "›"}</span><span className="tree-folder">▰</span> about
                      </button>
                      {aboutFolderOpen && (
                        <button className={`tree-file tree-file--nested${activeFile === "about.md" ? " tree-file--selected" : ""}`} type="button" onClick={() => openFile("about.md")}>
                          <span className="file-mark file-mark--md">M</span> about.md
                        </button>
                      )}
                      <button className="tree-folder-row" type="button" onClick={() => setProjectsFolderOpen((open) => !open)}>
                        <span className="tree-chevron">{projectsFolderOpen ? "⌄" : "›"}</span><span className="tree-folder">▰</span> projects
                      </button>
                      {projectsFolderOpen && projects.map((project) => (
                        <button className={`tree-file tree-file--nested${activeFile === project.file ? " tree-file--selected" : ""}`} type="button" onClick={() => openFile(project.file)} key={project.name}>
                          <span className="file-mark">TS</span>{project.file}
                        </button>
                      ))}
                      <button className={`tree-file${activeFile === "index.tsx" ? " tree-file--selected" : ""}`} type="button" onClick={() => openFile("index.tsx")}>
                        <span className="file-mark">TS</span> index.tsx
                      </button>
                    </nav>
                  )}
                  <div className="explorer-bottom">
                    <span>OUTLINE</span>
                    <button className="panel-action" type="button" aria-label="Outline bölümünü aç/kapat" aria-expanded={outlineOpen} onClick={() => setOutlineOpen((open) => !open)}>{outlineOpen ? "⌄" : "›"}</button>
                  </div>
                  {outlineOpen && (
                    <nav className="outline-list" aria-label="Belge başlıkları">
                      <a href="#about">▸ Fikirleri koda, kodu ürüne</a>
                      <a href="#projects">▸ Projeler()</a>
                      {projects.map((project, index) => <a href={`#project-${index}`} key={project.name}>　{project.name}</a>)}
                    </nav>
                  )}
                </>
              )}

              {sidebarPanel === "search" && (
                <div className="sidebar-panel-content">
                  <label className="search-field">
                    <span className="visually-hidden">Dosya ara</span>
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Dosya ara..."
                    />
                    <span aria-hidden="true">⌕</span>
                  </label>
                  <div className="panel-subheading">{searchQuery ? "SONUÇLAR" : "AÇIK DOSYALAR"}</div>
                  {(searchQuery ? filteredFiles : workspaceFiles.filter((file) => openFiles.includes(file.id))).map((file) => (
                    <button className="search-result" type="button" key={file.id} onClick={() => openFile(file.id)}>
                      <span className={`file-mark${file.kind === "md" ? " file-mark--md" : ""}`}>{file.kind === "md" ? "M" : "TS"}</span>
                      <span><strong>{file.file}</strong><small>{file.project?.name ?? "irem-portfolio"}</small></span>
                    </button>
                  ))}
                  {searchQuery && filteredFiles.length === 0 && <p className="empty-panel">Eşleşen dosya bulunamadı.</p>}
                  {!searchQuery && <p className="panel-hint">Hızlı aç: <kbd>Ctrl</kbd> + <kbd>P</kbd></p>}
                </div>
              )}

              {sidebarPanel === "source" && (
                <div className="sidebar-panel-content">
                  <div className="panel-subheading source-heading">CHANGES <span>{changedFiles.length}</span></div>
                  <p className="source-branch"><span>⑂</span> main</p>
                  {changedFiles.map((file) => {
                    const isStaged = stagedFiles.includes(file.id);
                    return (
                      <button className={`source-file${isStaged ? " source-file--staged" : ""}`} type="button" key={file.id} onClick={() => setStagedFiles((current) => isStaged ? current.filter((id) => id !== file.id) : [...current, file.id])}>
                        <span className={`file-mark${file.kind === "md" ? " file-mark--md" : ""}`}>{file.kind === "md" ? "M" : "TS"}</span>
                        <span>{file.file}</span><b>{isStaged ? "✓" : "M"}</b>
                      </button>
                    );
                  })}
                  <label className="commit-field">
                    <span className="visually-hidden">Commit mesajı</span>
                    <input value={commitInput} onChange={(event) => setCommitInput(event.target.value)} placeholder="Commit mesajı" />
                  </label>
                  <button
                    className="primary-panel-button"
                    type="button"
                    disabled={stagedFiles.length === 0 || !commitInput.trim()}
                    onClick={() => {
                      setCommitMessage(commitInput.trim());
                      setCommitInput("");
                      setCommittedFiles((current) => [...current, ...stagedFiles]);
                      setStagedFiles([]);
                    }}
                  >
                    {stagedFiles.length > 0 ? `✓ ${stagedFiles.length} dosyayı commit et` : "Commit için dosya seç"}
                  </button>
                  {commitMessage && <p className="commit-success">✓ Son commit: {commitMessage}</p>}
                  <p className="panel-hint">Dosyaları seçerek stage alanına ekle veya çıkar.</p>
                </div>
              )}

              {sidebarPanel === "extensions" && (
                <div className="sidebar-panel-content">
                  <label className="search-field">
                    <span className="visually-hidden">Uzantı ara</span>
                    <input placeholder="Uzantılarda ara..." value={extensionQuery} onChange={(event) => setExtensionQuery(event.target.value)} />
                    <span aria-hidden="true">⌕</span>
                  </label>
                  {extensions.map((extension) => (
                    <button className="extension-card" key={extension.name} onClick={extension.name === "Color Themes" ? cycleTheme : undefined} type="button">
                      <span className={`extension-icon${extension.icon === "TS" ? " extension-icon--ts" : " extension-icon--theme"}`}>{extension.icon}</span>
                      <span><strong>{extension.name}</strong><small>{extension.detail}</small></span>
                      <span className="extension-installed">{extension.name === "TypeScript" ? "Yerleşik" : "Değiştir"}</span>
                    </button>
                  ))}
                  {extensions.length === 0 && <p className="empty-panel">Uzantı bulunamadı.</p>}
                  <p className="panel-hint">Bu portföyde etkin olan editör özellikleri.</p>
                </div>
              )}

              {sidebarPanel === "settings" && (
                <div className="sidebar-panel-content settings-content">
                  <div className="panel-subheading">APPEARANCE</div>
                  <label className="setting-row">
                    <span>Renk teması</span>
                    <select value={colorTheme} onChange={(event) => {
                      const theme = event.target.value as ColorTheme;
                      setColorTheme(theme);
                      setStatusMessage(`${theme === "earthy" ? "Zeytin" : theme === "midnight" ? "Gece" : "Kiremit"} teması etkin`);
                    }}>
                      <option value="earthy">Zeytin · varsayılan</option>
                      <option value="midnight">Gece mavisi</option>
                      <option value="ember">Sıcak kiremit</option>
                    </select>
                  </label>
                  <div className="panel-subheading">TEXT EDITOR</div>
                  <label className="setting-row">
                    <span>Yazı boyutu</span>
                    <select value={editorFontSize} onChange={(event) => setEditorFontSize(Number(event.target.value))}>
                      {[12, 13, 14, 15, 16].map((size) => <option value={size} key={size}>{size}px</option>)}
                    </select>
                  </label>
                  <label className="setting-row">
                    <span>Satır numaraları</span>
                    <input type="checkbox" checked={lineNumbersVisible} onChange={(event) => setLineNumbersVisible(event.target.checked)} />
                  </label>
                  <p className="panel-hint">Görünüm ayarları anında uygulanır.</p>
                </div>
              )}
            </aside>
          )}

          <section className="workbench" aria-label="Portföy çalışma alanı">
            <div className="tabbar">
              {openFiles.map((fileId) => {
                const file = workspaceFiles.find((item) => item.id === fileId) ?? workspaceFiles[0];
                return (
                  <div className={`editor-tab${activeFile === file.id ? " editor-tab--active" : ""}`} key={file.id}>
                    <button className="editor-tab-select" type="button" onClick={() => {
                      setActiveFile(file.id);
                      setProjectTab("overview");
                    }}>
                      <span className={`file-mark${file.kind === "md" ? " file-mark--md" : ""}`}>{file.kind === "md" ? "M" : "TS"}</span>
                      {file.file}
                    </button>
                    <button className="tab-close" type="button" aria-label={`${file.file} sekmesini kapat`} onClick={() => closeFile(file.id)}>×</button>
                  </div>
                );
              })}
              <button className="tab-actions" type="button" aria-label="Dosya arama" onClick={() => togglePanel("search")}>···</button>
            </div>
            <div className="breadcrumbs">
              <span>{activeWorkspaceFile.project ? "projects" : "irem-portfolio"}</span><span>›</span>
              <span className={`file-mark${activeWorkspaceFile.kind === "md" ? " file-mark--md" : ""}`}>{activeWorkspaceFile.kind === "md" ? "M" : "TS"}</span>
              <span>{activeWorkspaceFile.file}</span><span>›</span><span>{activeWorkspaceFile.name}</span>
            </div>

            <div
              className="editor-content"
              data-line-numbers={lineNumbersVisible}
              style={{ "--editor-font-size": `${editorFontSize}px` } as CSSProperties}
            >
              {activeWorkspaceFile.id === "index.tsx" && (
                <>
              <section className="intro-panel" id="about">
                <div className="intro-meta">
                  <span className="code-comment">{"// MERHABA, BEN İREM"}</span>
                  <span className="availability"><i /> yeni fikirlere açık</span>
                </div>
                <h1>
                  Fikirleri <span className="code-green">koda,</span>
                  <br />
                  kodu <span className="code-orange">ürüne.</span>
                </h1>
                <p className="intro-description">
                  Web ve mobil dünyasında işe yarayan, özenle düşünülmüş dijital
                  deneyimler geliştiriyorum.
                </p>
                <div className="intro-techline">
                  <span className="code-purple">const</span>&nbsp; interests =&nbsp;[
                  <span className="code-green">&quot;curiosity&quot;</span>,&nbsp;
                  <span className="code-green">&quot;craft&quot;</span>,&nbsp;
                  <span className="code-green">&quot;good ideas&quot;</span> ];
                </div>
              </section>

              <section className="projects-panel" id="projects" aria-labelledby="projects-heading">
                <div className="section-titlebar">
                  <div>
                    <span className="section-kicker">{"// SELECTED WORK"}</span>
                    <h2 id="projects-heading">Projeler<span className="code-orange">()</span></h2>
                  </div>
                  <span className="project-count">[{String(projects.length).padStart(2, "0")}]</span>
                </div>

                <div className="project-grid">
                  {projects.map((project, index) => (
                    <article className="project-card" id={`project-${index}`} key={project.name}>
                      <div className="project-card-head">
                        <span className="project-index"><span className="project-line-number">0{index + 1}</span> <span className="project-index-separator">—</span> COMPONENT</span>
                        <button className="project-open" type="button" aria-label={`${project.name} dosyasını aç`} onClick={() => openFile(project.file)}>↗</button>
                      </div>
                      <div className="project-file"><span className="file-mark">TS</span>{project.file}</div>
                      <h3>{project.name}<span className="code-orange">.</span></h3>
                      <p>{project.detail}</p>
                      <div className="project-tags" aria-label={`${project.name} teknolojileri`}>
                        {project.tags.map((tag) => (
                          <span className={tag === "Teknoloji bilgisi bekleniyor" ? "project-tag project-tag--pending" : "project-tag"} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button className="project-open-file" type="button" onClick={() => openFile(project.file)}>Dosyayı aç <span aria-hidden="true">→</span></button>
                    </article>
                  ))}
                </div>
              </section>
                </>
              )}

              {activeWorkspaceFile.id === "about.md" && (
                <article className="document-view">
                  <div className="document-fileline"><span className="file-mark file-mark--md">M</span> about.md</div>
                  <span className="code-comment">{"# Hakkımda"}</span>
                  <h1>Merhaba, ben İrem.</h1>
                  <p>Web ve mobil dünyasında fikirleri kullanılabilir, özenle düşünülmüş dijital deneyimlere dönüştürüyorum. Merak, iyi bir ürünün nereden başlayacağını; detaylara gösterilen özen ise nasıl hissettireceğini belirliyor.</p>
                  <h2>Yaklaşımım</h2>
                  <p>Önce ihtiyacı anlamaya, sonra sade ve işe yarayan bir çözüm kurmaya odaklanıyorum. Tasarım ve mühendisliği ayrı dünyalar olarak değil, aynı deneyimin parçaları olarak görüyorum.</p>
                  <h2>İlgi alanlarım</h2>
                  <div className="document-tags">
                    <span>Web geliştirme</span><span>Mobil deneyimler</span><span>Ürün düşüncesi</span>
                  </div>
                  <h2>Bağlantılar</h2>
                  <nav className="profile-links" aria-label="Sosyal medya profilleri">
                    <a href="https://github.com/iremnurkus" target="_blank" rel="noopener noreferrer">
                      <span className="profile-link-icon" aria-hidden="true">⌘</span>
                      <span><strong>GitHub</strong><small>github.com/iremnurkus</small></span>
                      <span className="profile-link-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="https://www.linkedin.com/in/irem-nur-kus/" target="_blank" rel="noopener noreferrer">
                      <span className="profile-link-icon" aria-hidden="true">in</span>
                      <span><strong>LinkedIn</strong><small>linkedin.com/in/irem-nur-kus</small></span>
                      <span className="profile-link-arrow" aria-hidden="true">↗</span>
                    </a>
                  </nav>
                  <h2>Bu çalışma alanı</h2>
                  <p>Soldaki dosya gezgininden projelere göz atabilir, <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>P</kbd> ile komut paletini açabilir ve görünümü kendi tercihine göre düzenleyebilirsin.</p>
                  <p className="document-comment">{"// Yeni fikirlere ve güzel iş birliklerine açığım."}</p>
                </article>
              )}

              {activeWorkspaceFile.project && (
                <article className="document-view project-document">
                  <div className="document-fileline"><span className="file-mark">TS</span> {activeWorkspaceFile.project.file}</div>
                  <div className="project-story-tabs" role="tablist" aria-label={`${activeWorkspaceFile.project.name} proje detayları`}>
                    {([
                      ["overview", "Genel bakış"],
                      ["preview", "Görsel konsept"],
                      ["stack", "Teknolojiler"],
                    ] as const).map(([tab, label]) => (
                      <button
                        aria-selected={projectTab === tab}
                        className={projectTab === tab ? "project-story-tab project-story-tab--active" : "project-story-tab"}
                        key={tab}
                        onClick={() => setProjectTab(tab)}
                        role="tab"
                        type="button"
                      >{label}</button>
                    ))}
                  </div>
                  {projectTab === "overview" && (
                    <div className="project-story-panel" role="tabpanel">
                      <span className="code-comment">{"// SELECTED PROJECT"}</span>
                      <h1>{activeWorkspaceFile.project.name}<span className="code-orange">.</span></h1>
                      <p>{activeWorkspaceFile.project.detail}</p>
                      <div className="project-story-note">
                        <span className="story-note-mark">✳</span>
                        <span><strong>Proje notu</strong><small>Bu çalışma, küçük bir fikri yalın ve keyifli bir dijital deneyime dönüştürme arayışının parçası.</small></span>
                      </div>
                      <p className="document-comment">{"// Proje hakkında doğrulanmış ek bilgi ve bağlantı bulunmuyor."}</p>
                    </div>
                  )}
                  {projectTab === "preview" && (
                    <div className="project-story-panel" role="tabpanel">
                      <div className="preview-disclaimer"><span>✦</span> Görsel konsept · gerçek ürün ekran görüntüsü değildir</div>
                      <ProjectPreview project={activeWorkspaceFile.project} />
                    </div>
                  )}
                  {projectTab === "stack" && (
                    <div className="project-story-panel" role="tabpanel">
                      <h2>Teknolojiler</h2>
                      <div className="project-tags">
                        {activeWorkspaceFile.project.tags.map((tag) => (
                          <span className={tag === "Teknoloji bilgisi bekleniyor" ? "project-tag project-tag--pending" : "project-tag"} key={tag}>{tag}</span>
                        ))}
                      </div>
                      <p className="document-comment">{"// Bilgisi doğrulanmayan teknoloji isimleri eklenmedi."}</p>
                    </div>
                  )}
                </article>
              )}

              <footer className="editor-footer">
                <span><span className="status-branch">⑂</span> main</span>
                <span>Fikirden ürüne, özenle.</span>
                <a href="#top">Ln 01, Col 01 ↑</a>
              </footer>
            </div>
          </section>
        </div>

        <footer className="statusbar">
          <div className="statusbar-left"><span className="status-remote">◉</span><span>portfolio</span><span>⑂ main</span></div>
          <div className="statusbar-right">
            <button className="status-feedback" onClick={() => setCommandPaletteOpen(true)} type="button" title="Komut paletini aç">{statusMessage}</button>
            <button className="status-theme" onClick={cycleTheme} type="button" title="Temayı değiştir">{colorTheme === "earthy" ? "◉ Zeytin" : colorTheme === "midnight" ? "◉ Gece" : "◉ Kiremit"}</button>
            <span>UTF-8</span><span>TSX</span>
          </div>
        </footer>
        {resizeHandles}
        {commandPaletteOpen && <CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} />}
      </main>
    </>
  );
}
