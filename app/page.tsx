"use client";

import ImageAnalyzer from "./components/ImageAnalyzer";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>هل يمكن قراءة الصور وتحليلها؟</h1>
        <p className={styles.heroSubtitle}>
          نعم — هذه الأداة التفاعلية تمكّنك من تحليل الصور مباشرة في المتصفح،
          واستخراج رؤى عن الألوان، الإضاءة، التباين، ومستوى التفاصيل دون الحاجة
          إلى رفع الملفات إلى أي خادم.
        </p>
      </header>

      <ImageAnalyzer />
    </main>
  );
}
