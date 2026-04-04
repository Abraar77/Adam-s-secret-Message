"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Arc, Circle, Ellipse, Group, Layer, Line, Rect, Stage } from "react-konva";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser, Minus, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import type { Stage as StageType } from "konva/lib/Stage";
import type { KonvaEventObject } from "konva/lib/Node";

const BACKGROUND_COLOR = "#0f172a";

const COLOR_SWATCHES = [
  "#f8fafc",
  "#f472b6",
  "#fb7185",
  "#f97316",
  "#facc15",
  "#84cc16",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
  "#a78bfa",
  "#f59e0b",
  "#fbbf24",
];

const SIZE_PRESETS = [
  { label: "S", value: 4 },
  { label: "M", value: 8 },
  { label: "L", value: 16 },
] as const;

const BODY_STAMPS = [
  { id: "wig", label: "Wig" },
  { id: "eye", label: "Eye" },
  { id: "eyebrow", label: "Eyebrow" },
  { id: "nose", label: "Nose" },
  { id: "mouth", label: "Mouth" },
  { id: "ear", label: "Ear" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "mustache", label: "Mustache" },
  { id: "beard", label: "Beard" },
  { id: "arm", label: "Arm" },
  { id: "hand", label: "Hand" },
  { id: "leg", label: "Leg" },
  { id: "foot", label: "Foot" },
] as const;

const REACTION_STAMPS = [
  { id: "heart", label: "Heart" },
  { id: "star", label: "Star" },
  { id: "fire", label: "Fire" },
  { id: "lightning", label: "Lightning" },
  { id: "sparkle", label: "Sparkle" },
] as const;

const STAMP_TOOLS = [...BODY_STAMPS, ...REACTION_STAMPS];

type BodyStamp = (typeof BODY_STAMPS)[number]["id"];
type ReactionStamp = (typeof REACTION_STAMPS)[number]["id"];
type StampTool = BodyStamp | ReactionStamp;
type Tool = "pen" | "eraser" | StampTool;

interface StrokeElement {
  kind: "stroke";
  points: number[];
  color: string;
  size: number;
}

interface StampElement {
  kind: "stamp";
  stamp: StampTool;
  x: number;
  y: number;
  color: string;
  size: number;
}

type CanvasElement = StrokeElement | StampElement;

export interface CanvasBoardHandle {
  exportImage: () => string | null;
}

interface CanvasBoardProps {
  height?: number;
}

export const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(function CanvasBoard({
  height = 440,
}, ref) {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#38bdf8");
  const [size, setSize] = useState(8);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [, setRedoStack] = useState<CanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const stageRef = useRef<StageType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const resize = () => setWidth(containerRef.current?.offsetWidth ?? 720);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const canvasHeight =
    width > 0 ? (width < 420 ? 280 : width < 640 ? 320 : height) : height;

  const SCALE_BY = 1.08;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;

  const applyZoom = (newZoom: number, anchorX: number, anchorY: number) => {
    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    setStagePos((pos) => ({
      x: anchorX - (anchorX - pos.x) * (clamped / zoom),
      y: anchorY - (anchorY - pos.y) * (clamped / zoom),
    }));
    setZoom(clamped);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const newZoom = e.evt.deltaY < 0 ? zoom * SCALE_BY : zoom / SCALE_BY;
    applyZoom(newZoom, pointer.x, pointer.y);
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      e.evt.preventDefault();
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastDist.current > 0) {
        const stage = stageRef.current;
        const cx = (touches[0].clientX + touches[1].clientX) / 2;
        const cy = (touches[0].clientY + touches[1].clientY) / 2;
        const rect = stage?.container().getBoundingClientRect();
        const anchorX = cx - (rect?.left ?? 0);
        const anchorY = cy - (rect?.top ?? 0);
        applyZoom(zoom * (dist / lastDist.current), anchorX, anchorY);
      }
      lastDist.current = dist;
    } else {
      handlePointerMove();
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = 0;
    endDrawing();
  };

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (e.evt.pointerType === "touch" && (e.evt as unknown as { touches?: TouchList }).touches?.length === 2) return;
    const position = stageRef.current?.getRelativePointerPosition();
    if (!position) return;

    if (tool === "pen" || tool === "eraser") {
      setIsDrawing(true);
      setRedoStack([]);
      const newStroke: StrokeElement = {
        kind: "stroke",
        color: tool === "eraser" ? BACKGROUND_COLOR : color,
        size: tool === "eraser" ? size * 2.5 : size,
        points: [position.x, position.y, position.x, position.y],
      };
      setElements((prev) => [...prev, newStroke]);
      return;
    }

    const newStamp: StampElement = {
      kind: "stamp",
      stamp: tool,
      x: position.x,
      y: position.y,
      color,
      size,
    };
    setRedoStack([]);
    setElements((prev) => [...prev, newStamp]);
  };

  const handlePointerMove = () => {
    if (!isDrawing) return;
    const point = stageRef.current?.getRelativePointerPosition();
    if (!point) return;

    setElements((previous) => {
      const next = [...previous];
      const last = next[next.length - 1];
      if (!last || last.kind !== "stroke") return previous;
      const updatedStroke = appendSmoothPoint(last, point.x, point.y);
      if (updatedStroke === last) return previous;
      next[next.length - 1] = updatedStroke;
      return next;
    });
  };

  const endDrawing = () => setIsDrawing(false);

  const clear = () => {
    setElements([]);
    setRedoStack([]);
    setIsDrawing(false);
  };

  const undo = () => {
    setElements((previous) => {
      if (!previous.length) return previous;
      const next = [...previous];
      const popped = next.pop();
      if (popped) setRedoStack((current) => [...current, popped]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack((previous) => {
      if (!previous.length) return previous;
      const next = [...previous];
      const restored = next.pop();
      if (restored) setElements((current) => [...current, restored]);
      return next;
    });
  };

  const exportImage = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const webpDataUrl = stage.toDataURL({
      pixelRatio: 1.5,
      mimeType: "image/webp",
      quality: 0.92,
    });
    return webpDataUrl.startsWith("data:image/webp")
      ? webpDataUrl
      : stage.toDataURL({ pixelRatio: 1.5 });
  };

  useImperativeHandle(ref, () => ({ exportImage }));

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="order-1 w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner"
      >
        <Stage
          width={Math.max(width, 1)}
          height={canvasHeight}
          ref={stageRef}
          className="touch-none"
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            <Rect width={Math.max(width, 1)} height={canvasHeight} fill={BACKGROUND_COLOR} />
            {elements.map((element, index) =>
              element.kind === "stroke" ? (
                <Line
                  key={index}
                  points={element.points}
                  stroke={element.color}
                  strokeWidth={element.size}
                  tension={0.62}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : (
                <StampNode key={index} element={element} />
              )
            )}
          </Layer>
        </Stage>
      </div>

      {/* ── Toolbox ── */}
      <div className="order-2 space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 xl:sticky xl:top-6">
        {/* Drawing mode */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Mode</span>
          {(["pen", "eraser"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-label={t === "pen" ? "Pen" : "Eraser"}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                tool === t
                  ? t === "eraser"
                    ? "border-rose-300 bg-rose-400/20 text-white"
                    : "border-sky-300 bg-sky-400/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              )}
              onClick={() => setTool(t)}
            >
              {t === "eraser" ? <Eraser size={13} /> : null}
              {t === "pen" ? "Pen" : "Eraser"}
            </button>
          ))}
          {tool !== "pen" && tool !== "eraser" && (
            <span className="text-sm text-slate-400">
              {STAMP_TOOLS.find((s) => s.id === tool)?.label ?? tool}
            </span>
          )}
        </div>

        {/* Body parts */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Body parts</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
            {BODY_STAMPS.map((stampTool) => (
              <button
                key={stampTool.id}
                type="button"
                className={cn(
                  "rounded-2xl border px-3 py-2 text-sm transition",
                  tool === stampTool.id
                    ? "border-amber-300 bg-amber-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                )}
                onClick={() => setTool(stampTool.id)}
              >
                {stampTool.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reactions */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Reactions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REACTION_STAMPS.map((stampTool) => (
              <button
                key={stampTool.id}
                type="button"
                className={cn(
                  "rounded-2xl border px-3 py-2 text-sm transition",
                  tool === stampTool.id
                    ? "border-fuchsia-300 bg-fuchsia-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                )}
                onClick={() => setTool(stampTool.id)}
              >
                {stampTool.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Colors</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Use color ${swatch}`}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition",
                  color === swatch
                    ? "scale-110 border-white"
                    : "border-white/20 hover:border-white/60"
                )}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              Custom
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-none bg-transparent"
              />
            </label>
          </div>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Size</p>
          <div className="flex gap-1.5">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  size === preset.value
                    ? "border-sky-300 bg-sky-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                )}
                onClick={() => setSize(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            <input
              type="range"
              min={4}
              max={24}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="min-w-[36px] text-xs text-slate-300">{size}px</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={undo} aria-label="Undo">
            <RotateCcw size={14} />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={redo} aria-label="Redo">
            <RotateCw size={14} />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear} aria-label="Clear">
            <Trash2 size={14} />
          </Button>
        </div>

        {/* Zoom */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Zoom</p>
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" aria-label="Zoom out"
              onClick={() => applyZoom(zoom / SCALE_BY, width / 2, canvasHeight / 2)}>
              <Minus size={14} />
            </Button>
            <span className="min-w-[44px] text-center text-xs text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <Button type="button" variant="ghost" size="sm" aria-label="Zoom in"
              onClick={() => applyZoom(zoom * SCALE_BY, width / 2, canvasHeight / 2)}>
              <Plus size={14} />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-xs text-slate-400"
              onClick={() => { setZoom(1); setStagePos({ x: 0, y: 0 }); }}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function appendSmoothPoint(stroke: StrokeElement, x: number, y: number) {
  const points = stroke.points;
  if (points.length < 2) return { ...stroke, points: points.concat([x, y]) };

  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];
  const distance = Math.hypot(x - lastX, y - lastY);
  if (distance < 0.8) return stroke;

  const midX = (lastX + x) / 2;
  const midY = (lastY + y) / 2;
  return { ...stroke, points: points.concat([midX, midY, x, y]) };
}

// ── Stamp renderer ────────────────────────────────────────────────────────────

function StampNode({ element }: { element: StampElement }) {
  const scale = element.size * 4.6;
  const strokeWidth = Math.max(2, element.size * 0.32);
  const lensFill = "rgba(15, 23, 42, 0.78)";

  switch (element.stamp) {
    // ── Body parts ──────────────────────────────────────────────────────────
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

    // ── Reactions ────────────────────────────────────────────────────────────
    case "heart":
      return (
        <Group x={element.x} y={element.y}>
          <Line
            points={[
              0, scale * 0.72,
              -scale * 0.72, 0,
              -scale * 0.72, -scale * 0.34,
              -scale * 0.36, -scale * 0.62,
              0, -scale * 0.34,
              scale * 0.36, -scale * 0.62,
              scale * 0.72, -scale * 0.34,
              scale * 0.72, 0,
            ]}
            closed
            tension={0.58}
            fill={element.color}
            stroke={element.color}
            strokeWidth={strokeWidth * 0.4}
            opacity={0.92}
          />
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
          <Line
            points={[
              0, scale * 0.8,
              scale * 0.54, scale * 0.22,
              scale * 0.4, -scale * 0.16,
              scale * 0.2, scale * 0.1,
              scale * 0.16, -scale * 0.5,
              0, -scale * 0.88,
              -scale * 0.16, -scale * 0.5,
              -scale * 0.2, scale * 0.1,
              -scale * 0.4, -scale * 0.16,
              -scale * 0.54, scale * 0.22,
            ]}
            closed
            tension={0.48}
            fill={element.color}
            stroke={element.color}
            strokeWidth={strokeWidth * 0.4}
            opacity={0.88}
          />
        </Group>
      );
    case "lightning":
      return (
        <Group x={element.x} y={element.y}>
          <Line
            points={[
              scale * 0.22, -scale * 0.88,
              -scale * 0.08, -scale * 0.06,
              scale * 0.18, -scale * 0.06,
              -scale * 0.22, scale * 0.88,
              scale * 0.08, scale * 0.06,
              -scale * 0.18, scale * 0.06,
            ]}
            closed
            tension={0}
            fill={element.color}
            stroke={element.color}
            strokeWidth={strokeWidth * 0.3}
            opacity={0.92}
          />
        </Group>
      );
    case "sparkle": {
      const lines = [
        { angle: 0, len: scale * 0.9, w: strokeWidth * 1.2 },
        { angle: 90, len: scale * 0.9, w: strokeWidth * 1.2 },
        { angle: 45, len: scale * 0.56, w: strokeWidth * 0.75 },
        { angle: 135, len: scale * 0.56, w: strokeWidth * 0.75 },
      ];
      return (
        <Group x={element.x} y={element.y}>
          {lines.map(({ angle, len, w }) => {
            const rad = (angle * Math.PI) / 180;
            const cx = Math.cos(rad) * len;
            const cy = Math.sin(rad) * len;
            return (
              <Line key={angle} points={[cx, cy, -cx, -cy]} stroke={element.color} strokeWidth={w} lineCap="round" />
            );
          })}
          <Circle radius={scale * 0.11} fill={element.color} />
        </Group>
      );
    }
    default:
      return null;
  }
}
