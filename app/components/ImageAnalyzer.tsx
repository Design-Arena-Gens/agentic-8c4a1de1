"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import styles from "../page.module.css";
import {
  analyzeImage,
  type ImageAnalysis,
  type PaletteColor
} from "../../lib/imageAnalysis";

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "error"; message: string }
  | { status: "ready"; fileName: string; data: ImageAnalysis };

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const formatPaletteLine = (palette: PaletteColor[]) =>
  palette.length > 0
    ? palette
        .map((color) => `${color.hex} (${color.percentage}٪)`)
        .join(" • ")
    : "لم يتم تحديد ألوان سائدة بشكل كافٍ.";

const describeDimensions = (width: number, height: number, ratio: string) => {
  const pixels = width * height;
  const megapixels = (pixels / 1_000_000).toFixed(2);
  return `${width} × ${height} بكسل • ${ratio} • ${megapixels} ميجابكسل`;
};

export default function ImageAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewSize = useMemo(() => {
    if (analysis.status === "ready") {
      const maxDimension = 420;
      const { width, height } = analysis.data;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
      };
    }
    return { width: 320, height: 240 };
  }, [analysis]);

  const reset = useCallback(() => {
    setAnalysis({ status: "idle" });
    setPreviewSrc(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error("يجب اختيار صورة بصيغة PNG أو JPG أو WebP أو GIF.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت.");
    }
  };

  const runAnalysis = useCallback(async (file: File) => {
    try {
      validateFile(file);
      setAnalysis({ status: "loading", fileName: file.name });

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة."));
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("الملف غير صالح."));
          }
        };
        reader.readAsDataURL(file);
      });

      setPreviewSrc(dataUrl);
      const data = await analyzeImage(dataUrl);
      setAnalysis({ status: "ready", fileName: file.name, data });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء تحليل الصورة.";
      setAnalysis({ status: "error", message });
    }
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      await runAnalysis(files[0]);
    },
    [runAnalysis]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const { files } = event.dataTransfer;
      await handleFiles(files);
    },
    [handleFiles]
  );

  const onInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await handleFiles(event.target.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const insights = useMemo(() => {
    if (analysis.status !== "ready") return [];
    return analysis.data.insights;
  }, [analysis]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>محلل الصور الذكي</h2>
          <p className={styles.heroSubtitle}>
            اسحب صورة أو اخترها لتحصل على رؤى لحظية حول الألوان والإضاءة
            والتباين.
          </p>
        </div>
        <div className={styles.panelActions}>
          <button
            className={clsx(styles.actionButton, styles.actionPrimary)}
            onClick={() => fileInputRef.current?.click()}
          >
            تحميل صورة
          </button>
          <button
            className={clsx(styles.actionButton, styles.actionSecondary)}
            onClick={reset}
            disabled={analysis.status === "idle"}
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      <div
        className={styles.uploadZone}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <label
          htmlFor="image-input"
          className={clsx(
            styles.dropArea,
            isDragging && styles.dropAreaActive
          )}
        >
          <div className={styles.dropIcon}>📷</div>
          <div className={styles.dropTitle}>أفلت الصورة هنا أو اخترها يدويًا</div>
          <div className={styles.dropHint}>
            يدعم صيغ: PNG, JPG, WebP, GIF — حتى 8 ميجابايت لكل ملف.
          </div>
          <input
            ref={fileInputRef}
            id="image-input"
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            hidden
            onChange={onInputChange}
          />
        </label>

        <div className={styles.preview}>
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={analysis.status === "ready" ? analysis.fileName : "معاينة"}
              width={previewSize.width}
              height={previewSize.height}
              className={styles.previewImage}
              priority
              unoptimized
            />
          ) : (
            <span className={styles.dropHint}>
              سيتم عرض معاينة الصورة هنا بعد التحميل.
            </span>
          )}
        </div>
      </div>

      <div>
        {analysis.status === "idle" && (
          <p className={styles.dropHint}>
            شكِّل فكرة سريعة عن جودة صورك من دون الحاجة إلى رفعها للخادم —
            تتم كل المعالجة محليًا داخل المتصفح.
          </p>
        )}
        {analysis.status === "loading" && (
          <p className={styles.dropHint}>
            جارٍ تحليل الصورة <strong>{analysis.fileName}</strong>...
          </p>
        )}
        {analysis.status === "error" && (
          <p className={styles.dropHint}>
            {analysis.message}
            <br />
            جرّب صورة أخرى أو قلل من حجمها.
          </p>
        )}
      </div>

      {analysis.status === "ready" && (
        <div className={styles.results}>
          <div className={styles.resultCard}>
            <div className={styles.resultTitle}>الأبعاد والتفاصيل</div>
            <div className={styles.resultValue}>
              {describeDimensions(
                analysis.data.width,
                analysis.data.height,
                analysis.data.aspectRatio
              )}
            </div>
            <div className={styles.resultValue}>
              مستوى التفاصيل (Entropy): {analysis.data.entropy}
            </div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTitle}>اللون المتوسط</div>
            <div className={styles.palettePreview}>
              <div
                className={styles.paletteSwatch}
                style={{ background: analysis.data.averageColor.hex }}
              />
            </div>
            <div className={styles.resultValue}>
              {analysis.data.averageColor.hex.toUpperCase()}
              {" • "}
              R{analysis.data.averageColor.r} G{analysis.data.averageColor.g} B
              {analysis.data.averageColor.b}
            </div>
            <div className={styles.resultValue}>
              السطوع: {analysis.data.brightness}٪ • التباين:{" "}
              {analysis.data.contrast}٪
            </div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTitle}>التدرج اللوني السائد</div>
            {analysis.data.palette.length > 0 ? (
              <>
                <div className={styles.palettePreview}>
                  {analysis.data.palette.map((entry) => (
                    <div
                      key={entry.hex}
                      className={styles.paletteSwatch}
                      style={{ background: entry.hex }}
                      title={`${entry.hex} — ${entry.percentage}٪`}
                    />
                  ))}
                </div>
                <div className={styles.resultValue}>
                  {formatPaletteLine(analysis.data.palette)}
                </div>
              </>
            ) : (
              <div className={styles.resultValue}>
                لم يتمكن النظام من استخراج لوحة ألوان واضحة للصورة.
              </div>
            )}
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTitle}>رؤى فورية</div>
            <div className={styles.resultValue}>
              {insights.map((insight) => `• ${insight}`).join("\n")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
