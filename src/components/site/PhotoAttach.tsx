import { useRef } from 'react';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PHOTO_ACCEPT } from '@/lib/image';

export const MAX_PHOTOS = 3;

type PhotoAttachProps = {
  photos: File[];
  photoPreviews: string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** Компактный вид — кружки миниатюр рядом с триггером (как в шапке поля VIN) */
  compact?: boolean;
};

/**
 * Прикрепление нескольких фото (до MAX_PHOTOS) с выбором «Сделать фото» / «Из галереи».
 * Переиспользуется во всех формах заявки (Hero, VinForm, RequestDialog) — единое поведение
 * и внешний вид кнопки прикрепления. Каждый экземпляр компонента получает свой независимый
 * набор photos/photoPreviews — так у разных полей формы (VIN, «Интересующие запчасти»)
 * миниатюры не смешиваются между собой.
 */
const PhotoAttach = ({ photos, photoPreviews, onAdd, onRemove, compact }: PhotoAttachProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const canAddMore = photos.length < MAX_PHOTOS;

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    onAdd(files.slice(0, room));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {photoPreviews.map((src, i) => (
        <div key={src} className="relative shrink-0">
          <img
            src={src}
            alt={`Фото ${i + 1}`}
            className={compact ? 'h-9 w-9 object-cover rounded-full border-2 border-primary' : 'h-11 w-11 object-cover rounded-sm border-2 border-primary'}
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="Удалить фото"
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
          >
            <Icon name="X" size={10} className="text-primary-foreground" />
          </button>
        </div>
      ))}
      {canAddMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Прикрепить фото"
              title="Прикрепить фото"
              className={
                compact
                  ? 'shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground cursor-pointer hover:brightness-110 transition-all shadow-sm'
                  : 'shrink-0 flex items-center justify-center w-11 sm:w-12 rounded-sm bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-sm'
              }
            >
              <Icon name="Camera" size={compact ? 16 : 18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
              <Icon name="Camera" size={15} className="mr-2" />
              Сделать фото
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => galleryInputRef.current?.click()}>
              <Icon name="Image" size={15} className="mr-2" />
              Из галереи
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <input
        ref={cameraInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        onChange={handleSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
};

export default PhotoAttach;