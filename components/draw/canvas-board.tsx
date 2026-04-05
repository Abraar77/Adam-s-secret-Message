"use client";

import { cn } from "@/lib/utils";
import {
  Arrow as KonvaArrow,
  Arc, Circle, Ellipse, Group, Layer, Line, Rect, Shape, Stage,
} from "react-konva";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArrowRight,
  Circle as CircleIcon,
  Eraser,
  Minus,
  MoreHorizontal,
  Pen,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Square,
  Trash2,
  Triangle as TriangleIcon,
} from "lucide-react";
import type { Stage as StageType } from "konva/lib/Stage";
import type { KonvaEventObject } from "konva/lib/Node";

const BACKGROUND_COLOR = "#0f172a";

const COLOR_SWATCHES = [
  "#f8fafc", "#f472b6", "#fb7185", "#f97316", "#facc15",
  "#84cc16", "#2dd4bf", "#38bdf8", "#818cf8", "#a78bfa",
  "#f59e0b", "#fbbf24", "#000000", "#94a3b8",
];

const BODY_STAMPS = [
  { id: "wig",        label: "Wig" },
  { id: "eye",        label: "Eye" },
  { id: "eyebrow",    label: "Eyebrow" },
  { id: "nose",       label: "Nose" },
  { id: "mouth",      label: "Mouth" },
  { id: "ear",        label: "Ear" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "mustache",   label: "Mustache" },
  { id: "beard",      label: "Beard" },
  { id: "arm",        label: "Arm" },
  { id: "hand",       label: "Hand" },
  { id: "leg",        label: "Leg" },
  { id: "foot",       label: "Foot" },
] as const;

const REACTION_STAMPS = [
  { id: "heart",     label: "Heart" },
  { id: "star",      label: "Star" },
  { id: "fire",      label: "Fire" },
  { id: "lightning", label: "Lightning" },
  { id: "sparkle",   label: "Sparkle" },
] as const;

const STAMP_TOOLS = [...BODY_STAMPS, ...REACTION_STAMPS];

type BodyStamp     = (typeof BODY_STAMPS)[number]["id"];
type ReactionStamp = (typeof REACTION_STAMPS)[number]["id"];
type StampTool     = BodyStamp | ReactionStamp;
type DrawTool      = "pen" | "dotted" | "spray" | "eraser";
type ShapeToolType = "circle-tool" | "rect-tool" | "triangle-tool" | "line-tool" | "arrow-tool";
type Tool          = DrawTool | ShapeToolType | StampTool;

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const DRAW_TOOLS: { id: DrawTool; label: string; Icon: LucideIcon }[] = [
  { id: "pen",    label: "Pen",   Icon: Pen },
  { id: "dotted", label: "Dots",  Icon: MoreHorizontal },
  { id: "spray",  label: "Spray", Icon: Sparkles },
  { id: "eraser", label: "Erase", Icon: Eraser },
];

const SHAPE_TOOLS: { id: ShapeToolType; label: string; Icon: LucideIcon }[] = [
  { id: "line-tool",     label: "Line",     Icon: Minus },
  { id: "arrow-tool",    label: "Arrow",    Icon: ArrowRight },
  { id: "circle-tool",   label: "Circle",   Icon: CircleIcon },
  { id: "rect-tool",     label: "Rect",     Icon: Square },
  { id: "triangle-tool", label: "Triangle", Icon: TriangleIcon },
];

// ── Element types ─────────────────────────────────────────────────────────────

interface StrokeElement {
  kind: "stroke";
  points: number[];
  color: string;
  size: number;
  opacity: number;
  dotted: boolean;
}

interface SprayElement {
  kind: "spray";
  dots: number[];
  color: string;
  size: number;
  opacity: number;
}

interface StampElement {
  kind: "stamp";
  stamp: StampTool;
  x: number; y: number;
  color: string; size: number;
}

interface CircleShapeEl {
  kind: "circle-shape";
  x: number; y: number;
  radiusX: number; radiusY: number;
  color: string; size: number; opacity: number; filled: boolean;
}

interface RectShapeEl {
  kind: "rect-shape";
  x: number; y: number;
  width: number; height: number;
  color: string; size: number; opacity: number; filled: boolean;
}

interface TriangleShapeEl {
  kind: "triangle-shape";
  pts: number[];
  color: string; size: number; opacity: number; filled: boolean;
}

interface LineShapeEl {
  kind: "line-shape";
  x1: number; y1: number; x2: number; y2: number;
  color: string; size: number; opacity: number;
}

interface ArrowShapeEl {
  kind: "arrow-shape";
  x1: number; y1: number; x2: number; y2: number;
  color: string; size: number; opacity: number;
}

type ShapeEl = CircleShapeEl | RectShapeEl | TriangleShapeEl | LineShapeEl | ArrowShapeEl;
type CanvasElement = StrokeElement | SprayElement | StampElement | ShapeEl;

export interface CanvasBoardHandle { exportImage: () => string | null; }
interface CanvasBoardProps { height?: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function isShapeTool(t: Tool): t is ShapeToolType {
  return ["circle-tool", "rect-tool", "triangle-tool", "line-tool", "arrow-tool"].includes(t);
}

function buildShape(
  tool: ShapeToolType,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string, size: number, opacity: number, filled: boolean,
): ShapeEl | null {
  const MIN = 2;
  switch (tool) {
    case "circle-tool": {
      const rX = Math.abs(end.x - start.x) / 2;
      const rY = Math.abs(end.y - start.y) / 2;
      if (rX < MIN && rY < MIN) return null;
      return { kind: "circle-shape", x: (start.x + end.x) / 2, y: (start.y + end.y) / 2,
        radiusX: Math.max(rX, MIN), radiusY: Math.max(rY, MIN), color, size, opacity, filled };
    }
    case "rect-tool": {
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < MIN && h < MIN) return null;
      return { kind: "rect-shape", x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
        width: Math.max(w, MIN), height: Math.max(h, MIN), color, size, opacity, filled };
    }
    case "triangle-tool": {
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN * 2) return null;
      const cx = (start.x + end.x) / 2;
      return { kind: "triangle-shape", pts: [cx, start.y, end.x, end.y, start.x, end.y],
        color, size, opacity, filled };
    }
    case "line-tool":
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN) return null;
      return { kind: "line-shape", x1: start.x, y1: start.y, x2: end.x, y2: end.y, color, size, opacity };
    case "arrow-tool":
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN) return null;
      return { kind: "arrow-shape", x1: start.x, y1: start.y, x2: end.x, y2: end.y, color, size, opacity };
  }
}

function generateSprayDots(cx: number, cy: number, size: number): number[] {
  const radius = size * 5;
  const count  = Math.max(5, Math.floor(size * 0.8));
  const dots: number[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    dots.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  return dots;
}

function appendSmoothPoint(stroke: StrokeElement, x: number, y: number): StrokeElement {
  const pts = stroke.points;
  if (pts.length < 2) return { ...stroke, points: pts.concat([x, y]) };
  const lastX = pts[pts.length - 2];
  const lastY = pts[pts.length - 1];
  if (Math.hypot(x - lastX, y - lastY) < 0.8) return stroke;
  const midX = (lastX + x) / 2;
  const midY = (lastY + y) / 2;
  return { ...stroke, points: pts.concat([midX, midY, x, y]) };
}

function renderElement(el: CanvasElement, key: string | number, alpha = 1): React.ReactNode {
  switch (el.kind) {
    case "stroke":
      return (
        <Line key={key} points={el.points}
          stroke={el.color} strokeWidth={el.size}
          tension={el.dotted ? 0 : 0.62} lineCap="round" lineJoin="round"
          opacity={(el.opacity / 100) * alpha}
          dash={el.dotted ? [0.01, el.size * 2.2] : undefined}
        />
      );
    case "spray":
      return (
        <Shape key={key} fill={el.color} stroke="transparent"
          opacity={(el.opacity / 100) * alpha} listening={false}
          sceneFunc={(ctx, shape) => {
            const r = Math.max(el.size * 0.4, 1);
            ctx.beginPath();
            for (let i = 0; i < el.dots.length; i += 2) {
              ctx.moveTo(el.dots[i] + r, el.dots[i + 1]);
              ctx.arc(el.dots[i], el.dots[i + 1], r, 0, Math.PI * 2, false);
            }
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
        />
      );
    case "circle-shape":
      return (
        <Ellipse key={key} x={el.x} y={el.y}
          radiusX={Math.max(el.radiusX, 1)} radiusY={Math.max(el.radiusY, 1)}
          stroke={el.color} strokeWidth={el.size}
          fill={el.filled ? el.color : undefined}
          opacity={(el.opacity / 100) * alpha}
        />
      );
    case "rect-shape":
      return (
        <Rect key={key} x={el.x} y={el.y}
          width={Math.max(el.width, 1)} height={Math.max(el.height, 1)}
          stroke={el.color} strokeWidth={el.size}
          fill={el.filled ? el.color : undefined}
          opacity={(el.opacity / 100) * alpha}
        />
      );
    case "triangle-shape":
      return (
        <Line key={key} points={el.pts} closed
          stroke={el.color} strokeWidth={el.size}
          fill={el.filled ? el.color : undefined}
          lineCap="round" lineJoin="round"
          opacity={(el.opacity / 100) * alpha}
        />
      );
    case "line-shape":
      return (
        <Line key={key} points={[el.x1, el.y1, el.x2, el.y2]}
          stroke={el.color} strokeWidth={el.size} lineCap="round"
          opacity={(el.opacity / 100) * alpha}
        />
      );
    case "arrow-shape":
      return (
        <KonvaArrow key={key} points={[el.x1, el.y1, el.x2, el.y2]}
          stroke={el.color} strokeWidth={el.size} fill={el.color}
          pointerLength={Math.max(el.size * 3, 8)} pointerWidth={Math.max(el.size * 2.5, 6)}
          lineCap="round" opacity={(el.opacity / 100) * alpha}
        />
      );
    case "stamp":
      return <StampNode key={key} element={el} />;
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(function CanvasBoard(
  { height = 440 }, ref,
) {
  const [tool,      setTool]      = useState<Tool>("pen");
  const [color,     setColor]     = useState("#38bdf8");
  const [size,      setSize]      = useState(8);
  const [opacity,   setOpacity]   = useState(100);
  const [filled,    setFilled]    = useState(false);
  const [elements,  setElements]  = useState<CanvasElement[]>([]);
  const [, setRedoStack]          = useState<CanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewEl, setPreviewEl] = useState<ShapeEl | null>(null);
  const [viewport,  setViewport]  = useState({ zoom: 1, x: 0, y: 0 });

  const vpRef         = useRef({ zoom: 1, x: 0, y: 0 });
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouches   = useRef<{ x: number; y: number }[]>([]);
  const stageRef      = useRef<StageType | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const resize = () => setWidth(containerRef.current?.offsetWidth ?? 720);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const canvasHeight = width > 0 ? (width < 420 ? 280 : width < 640 ? 320 : height) : height;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;

  const zoomAround = (newZoom: number, screenX: number, screenY: number) => {
    const vp = vpRef.current;
    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    const ratio = clamped / vp.zoom;
    const next = { zoom: clamped, x: screenX - ratio * (screenX - vp.x), y: screenY - ratio * (screenY - vp.y) };
    vpRef.current = next;
    setViewport(next);
  };

  const resetViewport = () => {
    const next = { zoom: 1, x: 0, y: 0 };
    vpRef.current = next;
    setViewport(next);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    zoomAround(vpRef.current.zoom * (e.evt.deltaY < 0 ? 1.1 : 1 / 1.1), pointer.x, pointer.y);
  };

  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length === 2) {
      lastTouches.current = [
        { x: e.evt.touches[0].clientX, y: e.evt.touches[0].clientY },
        { x: e.evt.touches[1].clientX, y: e.evt.touches[1].clientY },
      ];
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length === 2) {
      e.evt.preventDefault();
      const t0 = e.evt.touches[0];
      const t1 = e.evt.touches[1];
      const prev = lastTouches.current;
      if (prev.length === 2) {
        const oldDist = Math.hypot(prev[0].x - prev[1].x, prev[0].y - prev[1].y);
        const newDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (oldDist > 0) {
          const rect = stageRef.current?.container().getBoundingClientRect();
          zoomAround(
            vpRef.current.zoom * (newDist / oldDist),
            (t0.clientX + t1.clientX) / 2 - (rect?.left ?? 0),
            (t0.clientY + t1.clientY) / 2 - (rect?.top ?? 0),
          );
        }
      }
      lastTouches.current = [{ x: t0.clientX, y: t0.clientY }, { x: t1.clientX, y: t1.clientY }];
    } else {
      handlePointerMove();
    }
  };

  const handleTouchEnd = () => { lastTouches.current = []; endDrawing(); };

  const handlePointerDown = (_e: KonvaEventObject<PointerEvent>) => {
    if (lastTouches.current.length >= 2) return;
    const pos = stageRef.current?.getRelativePointerPosition();
    if (!pos) return;

    if (tool === "pen" || tool === "dotted" || tool === "eraser") {
      setIsDrawing(true);
      setRedoStack([]);
      setElements(prev => [...prev, {
        kind: "stroke",
        color:  tool === "eraser" ? BACKGROUND_COLOR : color,
        size:   tool === "eraser" ? size * 2.5 : size,
        opacity: tool === "eraser" ? 100 : opacity,
        dotted: tool === "dotted",
        points: [pos.x, pos.y, pos.x, pos.y],
      }]);
    } else if (tool === "spray") {
      setIsDrawing(true);
      setRedoStack([]);
      setElements(prev => [...prev, {
        kind: "spray", color, size, opacity,
        dots: generateSprayDots(pos.x, pos.y, size),
      }]);
    } else if (isShapeTool(tool)) {
      shapeStartRef.current = pos;
      setIsDrawing(true);
    } else {
      // stamp
      setRedoStack([]);
      setElements(prev => [...prev, {
        kind: "stamp", stamp: tool as StampTool, x: pos.x, y: pos.y, color, size,
      }]);
    }
  };

  const handlePointerMove = () => {
    if (!isDrawing) return;
    const pos = stageRef.current?.getRelativePointerPosition();
    if (!pos) return;

    if (tool === "pen" || tool === "dotted" || tool === "eraser") {
      setElements(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.kind !== "stroke") return prev;
        const updated = appendSmoothPoint(last, pos.x, pos.y);
        if (updated === last) return prev;
        next[next.length - 1] = updated;
        return next;
      });
    } else if (tool === "spray") {
      setElements(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.kind !== "spray") return prev;
        if (last.dots.length >= 800) return prev; // cap for performance
        next[next.length - 1] = { ...last, dots: [...last.dots, ...generateSprayDots(pos.x, pos.y, size)] };
        return next;
      });
    } else if (isShapeTool(tool) && shapeStartRef.current) {
      setPreviewEl(buildShape(tool, shapeStartRef.current, pos, color, size, opacity, filled));
    }
  };

  const endDrawing = () => {
    if (isShapeTool(tool) && shapeStartRef.current && previewEl) {
      setElements(prev => [...prev, previewEl]);
      setRedoStack([]);
      setPreviewEl(null);
    }
    shapeStartRef.current = null;
    setIsDrawing(false);
  };

  const clear = () => { setElements([]); setRedoStack([]); setIsDrawing(false); setPreviewEl(null); };

  const undo = () => {
    setElements(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      const popped = next.pop();
      if (popped) setRedoStack(cur => [...cur, popped]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      const restored = next.pop();
      if (restored) setElements(cur => [...cur, restored]);
      return next;
    });
  };

  const exportImage = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    const url = stage.toDataURL({ pixelRatio: 1.5, mimeType: "image/webp", quality: 0.92 });
    stage.scale({ x: vpRef.current.zoom, y: vpRef.current.zoom });
    stage.position({ x: vpRef.current.x, y: vpRef.current.y });
    return url.startsWith("data:image/webp") ? url : stage.toDataURL({ pixelRatio: 1.5 });
  };

  useImperativeHandle(ref, () => ({ exportImage }));

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      {/* ── Canvas column ── */}
      <div className="order-1 flex min-w-0 flex-col gap-2">

        {/* Size + Opacity sliders */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-slate-400">Size</span>
            <input type="range" min={2} max={40} value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1 accent-sky-400" />
            <span className="w-9 shrink-0 text-right text-xs text-slate-300">{size}px</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-slate-400">Opacity</span>
            <input type="range" min={10} max={100} value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="flex-1 accent-violet-400" />
            <span className="w-9 shrink-0 text-right text-xs text-slate-300">{opacity}%</span>
          </div>
        </div>

        {/* Undo / Redo / Clear + Fill toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5">
          <button type="button" onClick={undo}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
            <RotateCcw size={13} /> Undo
          </button>
          <button type="button" onClick={redo}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
            <RotateCw size={13} /> Redo
          </button>
          {isShapeTool(tool) && (
            <button type="button" onClick={() => setFilled(f => !f)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition",
                filled
                  ? "border border-sky-500/40 bg-sky-500/20 text-sky-300"
                  : "text-slate-400 hover:bg-white/10",
              )}>
              {filled ? "◼" : "◻"} Fill
            </button>
          )}
          <div className="ml-auto">
            <button type="button" onClick={clear}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-400/10 transition">
              <Trash2 size={13} /> Clear
            </button>
          </div>
        </div>

        {/* Canvas box */}
        <div ref={containerRef} className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner">
          {/* Zoom overlay */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-1 backdrop-blur-sm">
            <button type="button" aria-label="Zoom out"
              onClick={() => zoomAround(vpRef.current.zoom / 1.3, width / 2, canvasHeight / 2)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 transition">
              <Minus size={13} />
            </button>
            <span className="min-w-9 text-center text-xs text-slate-300">{Math.round(viewport.zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in"
              onClick={() => zoomAround(vpRef.current.zoom * 1.3, width / 2, canvasHeight / 2)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 transition">
              <Plus size={13} />
            </button>
            {viewport.zoom !== 1 && (
              <button type="button" onClick={resetViewport}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 transition">
                Reset
              </button>
            )}
          </div>
          {/* Shape tool hint */}
          {isShapeTool(tool) && (
            <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-slate-900/80 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm pointer-events-none">
              Click &amp; drag to draw
            </div>
          )}
          <Stage
            width={Math.max(width, 1)} height={canvasHeight}
            ref={stageRef} className="touch-none"
            scaleX={viewport.zoom} scaleY={viewport.zoom}
            x={viewport.x} y={viewport.y}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerLeave={endDrawing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Layer>
              <Rect width={Math.max(width, 1)} height={canvasHeight} fill={BACKGROUND_COLOR} />
              {elements.map((el, i) => renderElement(el, i))}
              {previewEl && renderElement(previewEl, "preview", 0.65)}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* ── Toolbox sidebar ── */}
      <div className="order-2 space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 xl:sticky xl:top-6">

        {/* Draw tools */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Draw</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
            {DRAW_TOOLS.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setTool(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm transition",
                  tool === id
                    ? id === "eraser"
                      ? "border-rose-300 bg-rose-400/20 text-white"
                      : "border-sky-300 bg-sky-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                )}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Shape tools */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Shapes</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
            {SHAPE_TOOLS.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setTool(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm transition",
                  tool === id
                    ? "border-violet-300 bg-violet-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                )}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body parts */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Body parts</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
            {BODY_STAMPS.map((s) => (
              <button key={s.id} type="button" onClick={() => setTool(s.id)}
                className={cn(
                  "rounded-2xl border px-3 py-2 text-sm transition",
                  tool === s.id
                    ? "border-amber-300 bg-amber-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reactions */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Reactions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REACTION_STAMPS.map((s) => (
              <button key={s.id} type="button" onClick={() => setTool(s.id)}
                className={cn(
                  "rounded-2xl border px-3 py-2 text-sm transition",
                  tool === s.id
                    ? "border-fuchsia-300 bg-fuchsia-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Colors</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button key={swatch} type="button" aria-label={`Color ${swatch}`}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition",
                  color === swatch ? "scale-110 border-white" : "border-white/20 hover:border-white/60",
                )}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              Custom
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-none bg-transparent" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Stamp renderer ────────────────────────────────────────────────────────────

function StampNode({ element }: { element: StampElement }) {
  const scale = element.size * 4.6;
  const strokeWidth = Math.max(2, element.size * 0.32);
  const lensFill = "rgba(15, 23, 42, 0.78)";

  switch (element.stamp) {
    case "wig":
      return (
        <Group x={element.x} y={element.y}>
          <Ellipse x={0} y={-scale * 0.08} radiusX={scale * 0.95} radiusY={scale * 0.68} fill={element.color} opacity={0.38} />
          <Arc x={0} y={scale * 0.08} innerRadius={scale * 0.62} outerRadius={scale * 0.9} angle={180} rotation={180} stroke={element.color} strokeWidth={strokeWidth} />
          {[-0.56, -0.28, 0, 0.28, 0.56].map((offset) => (
            <Line key={offset} points={[scale * offset, -scale * 0.38, scale * (offset * 0.82), scale * 0.44]} stroke={element.color} strokeWidth={strokeWidth} lineCap="round" />
          ))}
        </Group>
      );
    case "eye":
      return (
        <Group x={element.x} y={element.y}>
          <Ellipse radiusX={scale * 0.68} radiusY={scale * 0.34} stroke={element.color} strokeWidth={strokeWidth} />
          <Circle radius={scale * 0.14} fill={element.color} />
          <Circle x={scale * 0.12} y={-scale * 0.05} radius={scale * 0.05} fill="#f8fafc" />
        </Group>
      );
    case "eyebrow":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.84, scale * 0.12, -scale * 0.26, -scale * 0.18, scale * 0.2, -scale * 0.14, scale * 0.8, scale * 0.18]} stroke={element.color} strokeWidth={strokeWidth * 1.2} tension={0.45} lineCap="round" lineJoin="round" />
        </Group>
      );
    case "nose":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[0, -scale * 0.66, scale * 0.16, -scale * 0.06, -scale * 0.02, scale * 0.24, scale * 0.24, scale * 0.5]} stroke={element.color} strokeWidth={strokeWidth} tension={0.4} lineCap="round" lineJoin="round" />
          <Line points={[-scale * 0.18, scale * 0.46, 0, scale * 0.56, scale * 0.22, scale * 0.46]} stroke={element.color} strokeWidth={strokeWidth * 0.8} tension={0.4} lineCap="round" />
        </Group>
      );
    case "mouth":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.72, -scale * 0.02, -scale * 0.24, scale * 0.26, scale * 0.24, scale * 0.26, scale * 0.72, -scale * 0.02]} stroke={element.color} strokeWidth={strokeWidth} tension={0.65} lineCap="round" lineJoin="round" />
          <Line points={[-scale * 0.5, scale * 0.14, 0, scale * 0.28, scale * 0.5, scale * 0.14]} stroke={element.color} strokeWidth={strokeWidth * 0.7} tension={0.4} lineCap="round" />
        </Group>
      );
    case "ear":
      return (
        <Group x={element.x} y={element.y}>
          <Ellipse radiusX={scale * 0.38} radiusY={scale * 0.56} stroke={element.color} strokeWidth={strokeWidth} />
          <Line points={[scale * 0.02, -scale * 0.3, -scale * 0.14, -scale * 0.08, -scale * 0.05, scale * 0.14, scale * 0.1, scale * 0.28]} stroke={element.color} strokeWidth={strokeWidth * 0.75} tension={0.48} lineCap="round" lineJoin="round" />
        </Group>
      );
    case "sunglasses":
      return (
        <Group x={element.x} y={element.y}>
          <Rect x={-scale * 1.02} y={-scale * 0.42} width={scale * 0.9} height={scale * 0.62} cornerRadius={scale * 0.16} stroke={element.color} strokeWidth={strokeWidth} fill={lensFill} />
          <Rect x={scale * 0.12} y={-scale * 0.42} width={scale * 0.9} height={scale * 0.62} cornerRadius={scale * 0.16} stroke={element.color} strokeWidth={strokeWidth} fill={lensFill} />
          <Line points={[-scale * 0.12, -scale * 0.1, scale * 0.12, -scale * 0.1]} stroke={element.color} strokeWidth={strokeWidth} lineCap="round" />
          <Line points={[-scale * 1.02, -scale * 0.12, -scale * 1.36, -scale * 0.22]} stroke={element.color} strokeWidth={strokeWidth} lineCap="round" />
          <Line points={[scale * 1.02, -scale * 0.12, scale * 1.36, -scale * 0.22]} stroke={element.color} strokeWidth={strokeWidth} lineCap="round" />
        </Group>
      );
    case "mustache":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[0, 0, -scale * 0.42, scale * 0.04, -scale * 0.92, scale * 0.28]} stroke={element.color} strokeWidth={strokeWidth * 1.1} tension={0.5} lineCap="round" lineJoin="round" />
          <Line points={[0, 0, scale * 0.42, scale * 0.04, scale * 0.92, scale * 0.28]} stroke={element.color} strokeWidth={strokeWidth * 1.1} tension={0.5} lineCap="round" lineJoin="round" />
        </Group>
      );
    case "beard":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.9, -scale * 0.18, -scale * 0.72, scale * 0.52, -scale * 0.32, scale * 0.96, 0, scale * 1.16, scale * 0.32, scale * 0.96, scale * 0.72, scale * 0.52, scale * 0.9, -scale * 0.18]} stroke={element.color} strokeWidth={strokeWidth * 1.1} tension={0.45} lineCap="round" lineJoin="round" />
          <Line points={[-scale * 0.38, scale * 0.18, 0, scale * 0.46, scale * 0.38, scale * 0.18]} stroke={element.color} strokeWidth={strokeWidth * 0.75} tension={0.4} lineCap="round" />
        </Group>
      );
    case "arm":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.8, -scale * 0.3, -scale * 0.2, -scale * 0.52, scale * 0.28, -scale * 0.12, scale * 0.84, scale * 0.46]} stroke={element.color} strokeWidth={strokeWidth * 1.25} tension={0.3} lineCap="round" lineJoin="round" />
          <Circle x={scale * 0.92} y={scale * 0.54} radius={strokeWidth} fill={element.color} />
        </Group>
      );
    case "hand":
      return (
        <Group x={element.x} y={element.y}>
          <Ellipse x={0} y={scale * 0.2} radiusX={scale * 0.34} radiusY={scale * 0.42} stroke={element.color} strokeWidth={strokeWidth} />
          {[-0.26, -0.08, 0.1, 0.28].map((offset) => (
            <Line key={offset} points={[scale * offset, -scale * 0.2, scale * offset, -scale * 0.72]} stroke={element.color} strokeWidth={strokeWidth * 0.82} lineCap="round" />
          ))}
          <Line points={[-scale * 0.18, scale * 0.1, -scale * 0.56, -scale * 0.08]} stroke={element.color} strokeWidth={strokeWidth * 0.82} lineCap="round" />
        </Group>
      );
    case "leg":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.08, -scale * 0.84, -scale * 0.18, -scale * 0.14, scale * 0.1, scale * 0.62]} stroke={element.color} strokeWidth={strokeWidth * 1.28} tension={0.12} lineCap="round" lineJoin="round" />
          <Line points={[scale * 0.1, scale * 0.62, scale * 0.54, scale * 0.7]} stroke={element.color} strokeWidth={strokeWidth} lineCap="round" />
        </Group>
      );
    case "foot":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[-scale * 0.84, scale * 0.2, -scale * 0.34, -scale * 0.18, scale * 0.26, -scale * 0.08, scale * 0.82, scale * 0.2, scale * 0.46, scale * 0.46, -scale * 0.3, scale * 0.46]} stroke={element.color} strokeWidth={strokeWidth} tension={0.42} closed lineCap="round" lineJoin="round" fill={element.color} opacity={0.2} />
        </Group>
      );
    case "heart":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[0, scale * 0.72, -scale * 0.72, 0, -scale * 0.72, -scale * 0.34, -scale * 0.36, -scale * 0.62, 0, -scale * 0.34, scale * 0.36, -scale * 0.62, scale * 0.72, -scale * 0.34, scale * 0.72, 0]}
            closed tension={0.58} fill={element.color} stroke={element.color} strokeWidth={strokeWidth * 0.4} opacity={0.92} />
        </Group>
      );
    case "star": {
      const starPoints: number[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? scale * 0.88 : scale * 0.38;
        starPoints.push(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      return (
        <Group x={element.x} y={element.y}>
          <Line points={starPoints} closed tension={0} fill={element.color} stroke={element.color} strokeWidth={strokeWidth * 0.4} opacity={0.92} />
        </Group>
      );
    }
    case "fire":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[0, scale * 0.8, scale * 0.54, scale * 0.22, scale * 0.4, -scale * 0.16, scale * 0.2, scale * 0.1, scale * 0.16, -scale * 0.5, 0, -scale * 0.88, -scale * 0.16, -scale * 0.5, -scale * 0.2, scale * 0.1, -scale * 0.4, -scale * 0.16, -scale * 0.54, scale * 0.22]}
            closed tension={0.48} fill={element.color} stroke={element.color} strokeWidth={strokeWidth * 0.4} opacity={0.88} />
        </Group>
      );
    case "lightning":
      return (
        <Group x={element.x} y={element.y}>
          <Line points={[scale * 0.22, -scale * 0.88, -scale * 0.08, -scale * 0.06, scale * 0.18, -scale * 0.06, -scale * 0.22, scale * 0.88, scale * 0.08, scale * 0.06, -scale * 0.18, scale * 0.06]}
            closed tension={0} fill={element.color} stroke={element.color} strokeWidth={strokeWidth * 0.3} opacity={0.92} />
        </Group>
      );
    case "sparkle": {
      const lines = [
        { angle: 0,   len: scale * 0.9,  w: strokeWidth * 1.2 },
        { angle: 90,  len: scale * 0.9,  w: strokeWidth * 1.2 },
        { angle: 45,  len: scale * 0.56, w: strokeWidth * 0.75 },
        { angle: 135, len: scale * 0.56, w: strokeWidth * 0.75 },
      ];
      return (
        <Group x={element.x} y={element.y}>
          {lines.map(({ angle, len, w }) => {
            const rad = (angle * Math.PI) / 180;
            const cx = Math.cos(rad) * len;
            const cy = Math.sin(rad) * len;
            return <Line key={angle} points={[cx, cy, -cx, -cy]} stroke={element.color} strokeWidth={w} lineCap="round" />;
          })}
          <Circle radius={scale * 0.11} fill={element.color} />
        </Group>
      );
    }
    default:
      return null;
  }
}