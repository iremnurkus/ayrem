"use client";

import Image from "next/image";
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
  url?: string;
  linkLabel?: string;
};

type WorkspaceFile = {
  id: string;
  name: string;
  file: string;
  kind: "tsx" | "md";
  project?: ProjectInfo;
};

function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = Array.from({ length: 22 }, (_, index) => ({
      angle: (index / 22) * Math.PI * 2,
      phase: index * 1.71,
      radius: 0.34 + (index % 5) * 0.13,
      size: index % 6 === 0 ? 2 : 1.15,
    }));
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let previousFrame = 0;
    let frameId = 0;
    let isVisible = true;
    const sage = getComputedStyle(canvas).getPropertyValue("--sage").trim() || "#bec99e";
    const clay = getComputedStyle(canvas).getPropertyValue("--clay").trim() || "#d89068";

    const paint = () => {
      context.clearRect(0, 0, width, height);
      const points = particles.map((particle) => {
        const drift = Math.sin(elapsed * 0.22 + particle.phase) * 0.12;
        const angle = particle.angle + elapsed * 0.035 + drift;
        return {
          x: width * 0.76 + Math.cos(angle) * width * 0.19 * particle.radius,
          y: height * 0.52 + Math.sin(angle) * height * 0.39 * particle.radius,
          size: particle.size,
        };
      });

      context.lineWidth = 0.8;
      for (let first = 0; first < points.length; first += 1) {
        for (let second = first + 1; second < points.length; second += 1) {
          const dx = points[first].x - points[second].x;
          const dy = points[first].y - points[second].y;
          const distance = Math.hypot(dx, dy);
          if (distance < 48) {
            context.globalAlpha = (1 - distance / 48) * 0.34;
            context.strokeStyle = sage;
            context.beginPath();
            context.moveTo(points[first].x, points[first].y);
            context.lineTo(points[second].x, points[second].y);
            context.stroke();
          }
        }
      }

      points.forEach((point, index) => {
        context.globalAlpha = index % 7 === 0 ? 0.8 : 0.48;
        context.fillStyle = index === 7 ? clay : sage;
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paint();
    };

    const animate = (timestamp: number) => {
      if (!isVisible || document.hidden || motionPreference.matches) {
        frameId = 0;
        previousFrame = 0;
        return;
      }

      if (previousFrame) {
        elapsed += Math.min((timestamp - previousFrame) / 1000, 0.05);
      }
      previousFrame = timestamp;
      paint();
      frameId = window.requestAnimationFrame(animate);
    };

    const syncAnimation = () => {
      if (motionPreference.matches || !isVisible || document.hidden) {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
        previousFrame = 0;
        paint();
      } else if (!frameId) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      syncAnimation();
    }, { root: canvas.closest(".editor-content"), threshold: 0.01 });
    const handleVisibilityChange = () => syncAnimation();

    resize();
    visibilityObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionPreference.addEventListener("change", syncAnimation);
    syncAnimation();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    return () => {
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionPreference.removeEventListener("change", syncAnimation);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return <canvas aria-hidden="true" className="ambient-canvas" ref={canvasRef} />;
}

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

function DiaryVisualConcept() {
  return (
    <figure className="diary-concept" aria-labelledby="diary-concept-caption">
      <div className="diary-concept-board">
        <div className="diary-concept-header">
          <div className="diary-concept-window-controls" aria-hidden="true"><i /><i /><i /></div>
          <span>günlük <i>/</i> görsel kimlik</span>
          <span className="diary-concept-header-note">TASARIM SEÇKİSİ <b aria-hidden="true">✳</b></span>
        </div>
        <div className="diary-concept-grid">
          <section className="diary-concept-brand" aria-label="Günlük marka dili">
            <div className="diary-concept-wordmark">günlük<span aria-hidden="true">✳</span></div>
            <span className="diary-concept-eyebrow">KENDİNE AİT KÜÇÜK BİR ALAN</span>
            <p>Kendine dönmek için<br />küçük bir alan.</p>
            <div className="diary-concept-paper">
              <span>BUGÜNÜN SAYFASI <i>22 EKİM · PERŞEMBE</i></span>
              <strong>Bugün nasıldı?</strong>
              <div aria-hidden="true" />
              <div aria-hidden="true" />
              <small>Bir cümle sadece sana ait kalsın.</small>
            </div>
          </section>
          <div className="diary-concept-system">
            <section className="diary-concept-palette" aria-labelledby="diary-palette-title">
              <h3 id="diary-palette-title">Renk paleti <span>01 — 05</span></h3>
              <div className="diary-concept-swatches">
                <div><i style={{ backgroundColor: "#f4f4f3" }} /><span>Kâğıt<small>#F4F4F3</small></span></div>
                <div><i style={{ backgroundColor: "#faf6ef" }} /><span>Sayfa<small>#FAF6EF</small></span></div>
                <div><i style={{ backgroundColor: "#68432f" }} /><span>Kahve<small>#68432F</small></span></div>
                <div><i style={{ backgroundColor: "#d8deea" }} /><span>Çizgi<small>#D8DEEA</small></span></div>
                <div><i style={{ backgroundColor: "#efaaa0" }} /><span>İz<small>#EFAAA0</small></span></div>
              </div>
            </section>
            <section className="diary-concept-type" aria-labelledby="diary-type-title">
              <h3 id="diary-type-title">Tipografi <span>MONOSPACE</span></h3>
              <div className="diary-concept-type-sample">
                <strong>Bugün nasıldı?</strong>
                <span>Başlık · kalın / 24</span>
              </div>
              <div className="diary-concept-type-sample diary-concept-type-sample--body">
                <span>Kendine ait bir cümle.</span>
                <span>Arayüz · normal / 14</span>
              </div>
            </section>
          </div>
        </div>
        <div className="diary-concept-footer">
          <span>TASARIM İLKESİ</span>
          <span>Kâğıt dokusu · sıcak tonlar · sade tipografi</span>
        </div>
      </div>
      <figcaption className="diary-concept-caption" id="diary-concept-caption">
        <span className="code-comment">{"// GÜNLÜK · RENK, TİPOGRAFİ VE ÜRÜN DİLİ"}</span>
        Günlük’ün arayüzünden esinlenen görsel kimlik seçkisi.
      </figcaption>
    </figure>
  );
}

function ClockVisualConcept() {
  return (
    <figure className="clock-concept" aria-labelledby="clock-concept-caption">
      <div className="clock-concept-board">
        <div className="clock-concept-header">
          <div className="diary-concept-window-controls" aria-hidden="true"><i /><i /><i /></div>
          <span>vakit <i>/</i> arayüz dili</span>
          <span className="clock-concept-header-note">SAAT &amp; KRONOMETRE <b aria-hidden="true">◷</b></span>
        </div>
        <div className="clock-concept-grid">
          <section className="clock-concept-screen" aria-label="Vakit saat ekranı konsepti">
            <div className="clock-concept-screen-top">
              <span>YEREL SAAT</span>
              <span className="clock-concept-fullscreen" aria-hidden="true">⛶</span>
            </div>
            <Image className="clock-concept-time" src="/vakit-clock-display.png" alt="Vakit uygulamasının gerçek saat göstergesi" width={569} height={138} sizes="(max-width: 650px) 90vw, 420px" unoptimized />
            <div className="clock-concept-controls" aria-hidden="true">
              <span className="clock-concept-mode clock-concept-mode--active">◷</span>
              <span className="clock-concept-mode">◴</span>
              <span className="clock-concept-mode">⏱</span>
              <span className="clock-concept-mode">◎</span>
            </div>
            <span className="clock-concept-screen-caption">SAAT · SAYAÇ · KRONOMETRE · DÜNYA SAATLERİ</span>
          </section>
          <div className="clock-concept-system">
            <section className="clock-concept-palette" aria-labelledby="clock-palette-title">
              <h3 id="clock-palette-title">Renk paleti <span>01 — 05</span></h3>
              <div className="clock-concept-swatches">
                <div><i style={{ backgroundColor: "#050505" }} /><span>Gece<small>#050505</small></span></div>
                <div><i style={{ backgroundColor: "#211f1f" }} /><span>Ekran<small>#211F1F</small></span></div>
                <div><i style={{ backgroundColor: "#92121a" }} /><span>Bordo<small>#92121A</small></span></div>
                <div><i style={{ backgroundColor: "#08a7de" }} /><span>Mavi<small>#08A7DE</small></span></div>
                <div><i style={{ backgroundColor: "#98a2b3" }} /><span>Kontur<small>#98A2B3</small></span></div>
              </div>
            </section>
            <section className="clock-concept-type" aria-labelledby="clock-type-title">
              <h3 id="clock-type-title">Tipografi <span>DISPLAY / SANS</span></h3>
              <div className="clock-concept-type-sample">
                <strong>01:26:08</strong>
                <span>Saat · kalın / eğik</span>
              </div>
              <div className="clock-concept-type-sample clock-concept-type-sample--body">
                <span>Saat · Sayaç · Kronometre</span>
                <span>Kontroller · sade / net</span>
              </div>
            </section>
          </div>
        </div>
        <div className="clock-concept-footer">
          <span>TASARIM İLKESİ</span>
          <span>Odakta zaman · net kontroller · tam ekran</span>
        </div>
      </div>
      <figcaption className="clock-concept-caption" id="clock-concept-caption">
        <span className="code-comment">{"// VAKİT · RENK, TİPOGRAFİ VE ARAYÜZ DİLİ"}</span>
        Vakit’in saat, sayaç ve kronometre arayüzünden görsel seçki.
      </figcaption>
    </figure>
  );
}

const projects: ProjectInfo[] = [
  {
    name: "Saat",
    detail: "Zamanı kendine göre yaşa",
    file: "saat.tsx",
    tags: ["Teknoloji bilgisi bekleniyor"],
    url: "https://vakit.vercel.app/",
    linkLabel: "Vakit’i ziyaret et",
  },
  {
    name: "Günlük",
    detail: "Kendine ait küçük bir alan",
    file: "gunluk.tsx",
    tags: ["Next.js", ".NET", "React Native"],
    url: "https://gunluk-gunce.vercel.app/",
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

export default function Home() {
  const [editorRect, setEditorRect] = useState<EditorRect | null>(null);
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel | null>("explorer");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aboutFolderOpen, setAboutFolderOpen] = useState(true);
  const [projectsFolderOpen, setProjectsFolderOpen] = useState(true);
  const [workspaceFolderOpen, setWorkspaceFolderOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [activeFile, setActiveFile] = useState("about.md");
  const [openFiles, setOpenFiles] = useState(["about.md"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [extensionQuery, setExtensionQuery] = useState("");
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [committedFiles, setCommittedFiles] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [commitInput, setCommitInput] = useState("");
  const [editorFontSize, setEditorFontSize] = useState(13);
  const [lineNumbersVisible, setLineNumbersVisible] = useState(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("earthy");
  const [statusMessage, setStatusMessage] = useState("Fikirden ürüne, özenle.");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
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
      setActiveFile(remaining.at(-1) ?? "about.md");
    }
    setOpenFiles(remaining.length > 0 ? remaining : ["about.md"]);
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
    if (activeFile !== "index.tsx") {
      return;
    }

    const root = editorContentRef.current;
    if (!root) {
      return;
    }

    const cards = root.querySelectorAll<HTMLElement>(".project-card");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { root, threshold: 0.12 });

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [activeFile]);

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

  return (
      <main
        className={`ide-shell${editorRect ? " ide-shell--user-sized" : ""}`}
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
              ref={editorContentRef}
              style={{ "--editor-font-size": `${editorFontSize}px` } as CSSProperties}
            >
              {activeWorkspaceFile.id === "index.tsx" && (
                <>
              <section className="intro-panel" id="about">
                <AmbientCanvas />
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
                  <div className="project-story-flow">
                    <section className="project-story-section">
                      <span className="code-comment">{"// SELECTED PROJECT"}</span>
                      <h1>{activeWorkspaceFile.project.name}<span className="code-orange">.</span></h1>
                      <p>{activeWorkspaceFile.project.detail}</p>
                      <div className="project-story-note">
                        <span className="story-note-mark">✳</span>
                        <span><strong>Proje notu</strong><small>Bu çalışma, küçük bir fikri yalın ve keyifli bir dijital deneyime dönüştürme arayışının parçası.</small></span>
                      </div>
                    </section>
                    <section className="project-story-section">
                      <div className="preview-disclaimer"><span>✦</span> {activeWorkspaceFile.project.name === "Günlük" || activeWorkspaceFile.project.name === "Saat" ? "Görsel kimlik · renk paleti ve tipografi" : "Görsel konsept · gerçek ürün ekran görüntüsü değildir"}</div>
                      {activeWorkspaceFile.project.name === "Günlük" ? (
                        <DiaryVisualConcept />
                      ) : activeWorkspaceFile.project.name === "Saat" ? (
                        <ClockVisualConcept />
                      ) : (
                        <ProjectPreview project={activeWorkspaceFile.project} />
                      )}
                    </section>
                    <section className="project-story-section project-story-stack">
                      <h2>Teknolojiler</h2>
                      <div className="project-tags">
                        {activeWorkspaceFile.project.tags.map((tag) => (
                          <span className={tag === "Teknoloji bilgisi bekleniyor" ? "project-tag project-tag--pending" : "project-tag"} key={tag}>{tag}</span>
                        ))}
                      </div>
                      {activeWorkspaceFile.project.tags.includes("Teknoloji bilgisi bekleniyor") && (
                        <p className="document-comment">{"// Bilgisi doğrulanmayan teknolojiler eklenmedi."}</p>
                      )}
                    </section>
                    {activeWorkspaceFile.project.url && (
                      <a className="project-live-link" href={activeWorkspaceFile.project.url} target="_blank" rel="noopener noreferrer">
                        {activeWorkspaceFile.project.linkLabel ?? `${activeWorkspaceFile.project.name}’ü ziyaret et`} <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
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
  );
}
