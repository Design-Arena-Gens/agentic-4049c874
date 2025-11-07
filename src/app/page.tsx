"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CLEAN_SLATE_ADJUSTMENTS,
  DEFAULT_ADJUSTMENTS,
  RestorationAdjustments,
  enhanceImageData,
} from "@/lib/image-processing";

type AdjustmentKey = keyof RestorationAdjustments;

const PRESETS: {
  id: string;
  name: string;
  description: string;
  adjustments: RestorationAdjustments;
}[] = [
  {
    id: "auto",
    name: "Restauração inteligente",
    description:
      "Um equilíbrio geral para recuperar detalhes, cores e contraste em fotos antigas.",
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  },
  {
    id: "cores",
    name: "Reavivar cores",
    description:
      "Traz mais saturação e calor, ideal para fotografias desbotadas com tons frios.",
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      saturation: 24,
      vibrance: 26,
      warmth: 12,
      shadowLift: 8,
      highlightRecovery: 6,
    },
  },
  {
    id: "detalhes",
    name: "Resgate de detalhes",
    description:
      "Aumenta claridade e contraste local para destacar rostos e texturas.",
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      clarity: 26,
      contrast: 18,
      denoise: 10,
      shadowLift: 10,
    },
  },
  {
    id: "suave",
    name: "Limpeza suave",
    description:
      "Remove ruído de digitais e grãos sem perder a aparência clássica da foto.",
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      exposure: 4,
      contrast: 6,
      clarity: 6,
      denoise: 32,
      warmth: 2,
      vibrance: 12,
    },
  },
];

const SLIDERS: {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
  step?: number;
  helper?: string;
}[] = [
  {
    key: "exposure",
    label: "Exposição",
    min: -40,
    max: 40,
    helper: "Clareia ou escurece suavemente a imagem.",
  },
  {
    key: "contrast",
    label: "Contraste",
    min: -40,
    max: 60,
    helper: "Define o alcance entre luzes e sombras.",
  },
  {
    key: "saturation",
    label: "Saturação",
    min: -40,
    max: 60,
    helper: "Reforça ou reduz a intensidade das cores.",
  },
  {
    key: "vibrance",
    label: "Vitalidade",
    min: -30,
    max: 60,
    helper: "Realça cores apagadas sem saturar tons de pele.",
  },
  {
    key: "warmth",
    label: "Temperatura",
    min: -30,
    max: 40,
    helper: "Ajusta tons para mais quentes ou frios.",
  },
  {
    key: "sepiaReduction",
    label: "Remoção de sépia",
    min: 0,
    max: 80,
    helper: "Reduz o tom amarelado típico de fotos antigas.",
  },
  {
    key: "shadowLift",
    label: "Realce de sombras",
    min: 0,
    max: 40,
    helper: "Recupera detalhes nas áreas escuras.",
  },
  {
    key: "highlightRecovery",
    label: "Recuperação de luzes",
    min: 0,
    max: 40,
    helper: "Recupera detalhes nas áreas muito claras.",
  },
  {
    key: "clarity",
    label: "Clareza",
    min: 0,
    max: 60,
    helper: "Aumenta a nitidez e microcontraste.",
  },
  {
    key: "denoise",
    label: "Redução de ruído",
    min: 0,
    max: 60,
    helper: "Suaviza grãos e manchas da imagem.",
  },
];

const AdjustmentSlider = ({
  label,
  helper,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-white/5 backdrop-blur">
    <div className="flex items-center justify-between text-sm font-medium text-slate-100">
      <span>{label}</span>
      <span className="text-xs text-slate-200/70">
        {value > 0 ? "+" : ""}
        {value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      className="mt-3 w-full accent-amber-400"
    />
    {helper ? (
      <p className="mt-2 text-xs text-slate-200/70">{helper}</p>
    ) : null}
  </div>
);

export default function Home() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [restoredUrl, setRestoredUrl] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<RestorationAdjustments>({
    ...CLEAN_SLATE_ADJUSTMENTS,
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [comparisonSplit, setComparisonSplit] = useState(50);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  const hasImage = Boolean(originalUrl);

  const adjustmentsUsage = useMemo(() => {
    const total = SLIDERS.reduce((acc, slider) => {
      const maxRange = Math.max(Math.abs(slider.min), Math.abs(slider.max));
      const currentValue = Math.abs(adjustments[slider.key]);
      return acc + currentValue / maxRange;
    }, 0);

    return Math.round((total / SLIDERS.length) * 100);
  }, [adjustments]);

  useEffect(() => {
    if (!hasImage) {
      setRestoredUrl(null);
    }
  }, [hasImage]);

  const processImage = useCallback(
    async (customAdjustments?: RestorationAdjustments) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) {
        return;
      }

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      context.drawImage(image, 0, 0);
      const sourceData = context.getImageData(0, 0, canvas.width, canvas.height);

      setProcessing(true);

      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const enhanced = enhanceImageData(
        sourceData,
        customAdjustments ?? adjustments,
      );
      context.putImageData(enhanced, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setRestoredUrl(dataUrl);
      setProcessing(false);
    },
    [adjustments],
  );

  useEffect(() => {
    if (!originalUrl) return;
    processImage().catch(() => setProcessing(false));
  }, [adjustments, originalUrl, processImage]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Por favor, selecione um arquivo de imagem válido.");
        return;
      }

      setError(null);
      setFileName(file.name);
      setActivePreset("auto");
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });

      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result !== "string") return;

        const image = new window.Image();
        image.onload = () => {
          imageRef.current = image;
          setOriginalUrl(result);
          setRestoredUrl(null);
        };
        image.src = result;
      };

      reader.onerror = () => {
        setError("Não foi possível carregar a imagem. Tente novamente.");
      };

      reader.readAsDataURL(file);
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
        handleFile(file);
        event.currentTarget.value = "";
      }
    },
    [handleFile],
  );

  const presetButtons = useMemo(
    () =>
      PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => {
            setActivePreset(preset.id);
            setAdjustments({ ...preset.adjustments });
            processImage(preset.adjustments).catch(() => setProcessing(false));
          }}
          className={`flex flex-col rounded-2xl border p-4 text-left transition hover:border-amber-400/70 hover:bg-amber-400/10 ${
            activePreset === preset.id
              ? "border-amber-300 bg-amber-300/10 text-amber-50"
              : "border-white/10 bg-white/5 text-slate-100"
          }`}
        >
          <span className="text-sm font-semibold">{preset.name}</span>
          <span className="mt-2 text-xs text-white/70">{preset.description}</span>
        </button>
      )),
    [activePreset, processImage],
  );

  const handleDownload = useCallback(() => {
    if (!restoredUrl || !downloadLinkRef.current) return;
    const link = downloadLinkRef.current;
    link.href = restoredUrl;
    link.download = fileName ? `${fileName}-restaurada.jpg` : "foto-restaurada.jpg";
    link.click();
  }, [fileName, restoredUrl]);

  const resetAdjustments = useCallback(() => {
    setActivePreset(null);
    setAdjustments({ ...CLEAN_SLATE_ADJUSTMENTS });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-12 text-slate-100 sm:px-10 lg:py-16">
      <section className="flex flex-col gap-6">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-wide text-amber-200/90 shadow-sm shadow-white/20">
          Laboratório de restauração digital
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-tight text-white md:text-5xl">
          Restaure suas fotos antigas com poucos cliques
        </h1>
        <p className="max-w-2xl text-pretty text-base text-slate-200/80 md:text-lg">
          Envie uma fotografia antiga, aplique nossos ajustes inteligentes e
          visualize o antes e depois instantaneamente. Otimizamos cores,
          nitidez e removemos o tom amarelado para devolver vida às lembranças.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div
            className={`flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed transition ${
              dragging
                ? "border-amber-300 bg-amber-400/10"
                : "border-white/10 bg-white/5"
            } ${hasImage ? "p-4" : "p-8"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {!hasImage ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/10 text-2xl">
                  📷
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-white">
                    Arraste uma foto antiga para restaurar
                  </p>
                  <p className="text-sm text-slate-200/70">
                    Aceitamos JPG, PNG e WebP até 15 MB.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-200/10 px-6 py-2 text-sm font-semibold text-amber-100 shadow-sm shadow-amber-200/20 transition hover:scale-[1.02] hover:bg-amber-200/20">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                  <span>Selecionar arquivo</span>
                </label>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-black/50 backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-amber-200/80">
                        Comparação
                      </p>
                      <h2 className="text-lg font-semibold text-white">
                        Ajuste para ver o antes e depois
                      </h2>
                      {fileName ? (
                        <p className="text-xs text-slate-300/70">
                          {fileName}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 transition hover:border-white/30 hover:bg-white/20"
                        onClick={() => {
                          resetAdjustments();
                          processImage(CLEAN_SLATE_ADJUSTMENTS).catch(() =>
                            setProcessing(false),
                          );
                        }}
                      >
                        Resetar ajustes
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm shadow-amber-200/40 transition hover:shadow-lg hover:shadow-amber-200/30"
                        onClick={() => {
                          const autoPreset = PRESETS[0];
                          setActivePreset(autoPreset.id);
                          setAdjustments({ ...autoPreset.adjustments });
                          processImage(autoPreset.adjustments).catch(() =>
                            setProcessing(false),
                          );
                        }}
                      >
                        Restauração automática
                      </button>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-4">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                      <div className="relative aspect-[4/3] w-full">
                        {originalUrl ? (
                          <>
                            <NextImage
                              src={originalUrl}
                              alt="Foto original"
                              fill
                              unoptimized
                              sizes="(max-width: 1024px) 100vw, 65vw"
                              className="object-contain opacity-80"
                              style={{
                                clipPath: `inset(0 ${100 - comparisonSplit}% 0 0)`,
                              }}
                              priority
                            />
                            {restoredUrl ? (
                              <NextImage
                                src={restoredUrl}
                                alt="Foto restaurada"
                                fill
                                unoptimized
                                sizes="(max-width: 1024px) 100vw, 65vw"
                                className="object-contain"
                              />
                            ) : null}
                            <div
                              className="pointer-events-none absolute inset-y-0"
                              style={{ left: `${comparisonSplit}%` }}
                            >
                              <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-amber-200/80" />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparisonSplit}
                      onChange={(event) =>
                        setComparisonSplit(Number(event.currentTarget.value))
                      }
                      className="w-full accent-amber-400"
                    />
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-300/70">
                      <span>Antes</span>
                      <span>Depois</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => processImage().catch(() => setProcessing(false))}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/30 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? "Processando..." : "Reprocessar ajustes"}
                  </button>
                  <button
                    type="button"
                    disabled={!restoredUrl}
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Baixar imagem restaurada
                  </button>
                  <a ref={downloadLinkRef} className="hidden" />
                </div>
              </div>
            )}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-white/5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/80">
              Modos sugeridos
            </p>
            <div className="mt-4 grid gap-3">{presetButtons}</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-white/5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/80">
                  Painel de ajustes finos
                </p>
                <p className="mt-1 text-sm text-slate-200/70">
                  Personalize cada parâmetro para chegar ao resultado perfeito.
                </p>
              </div>
              {hasImage ? (
                <span className="rounded-full bg-amber-200/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-100">
                  {adjustmentsUsage}% ativo
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4">
              {SLIDERS.map((slider) => (
                <AdjustmentSlider
                  key={slider.key}
                  label={slider.label}
                  helper={slider.helper}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={adjustments[slider.key]}
                  onChange={(value) => {
                    setActivePreset(null);
                    setAdjustments((prev) => ({
                      ...prev,
                      [slider.key]: value,
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        </aside>
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
