import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

type ImageLightboxProps = {
  urls: string[];
  className?: string;
  imgClassName?: string;
  alt?: string;
};

/**
 * Миниатюры фото, которые открываются полноэкранным просмотрщиком поверх страницы
 * (вместо перехода по ссылке в новую вкладку — на части мобильных браузеров
 * открытая в новой вкладке картинка не вписывается в экран и отображается обрезанной
 * или огромным исходным размером). object-contain гарантирует, что снимок целиком
 * помещается на экран независимо от его пропорций и разрешения камеры телефона.
 */
const ImageLightbox = ({ urls, className, imgClassName, alt = "Фото" }: ImageLightboxProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex]);

  return (
    <>
      <div className={className}>
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="shrink-0"
          >
            <img src={url} alt={`${alt} ${i + 1}`} className={imgClassName} />
          </button>
        ))}
      </div>
      {openIndex !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Закрыть"
              className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((i) => (i === null ? i : (i - 1 + urls.length) % urls.length));
                  }}
                  aria-label="Предыдущее фото"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Icon name="ChevronLeft" size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((i) => (i === null ? i : (i + 1) % urls.length));
                  }}
                  aria-label="Следующее фото"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Icon name="ChevronRight" size={22} />
                </button>
              </>
            )}
            <img
              src={urls[openIndex]}
              alt={`${alt} ${openIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            />
          </div>,
          document.body,
        )}
    </>
  );
};

export default ImageLightbox;
