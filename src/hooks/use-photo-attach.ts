import { useState } from 'react';
import { preparePhotoForUpload } from '@/lib/image';

/**
 * Общее состояние прикреплённых к заявке фото (до нескольких штук) — используется во всех
 * формах заявки (Hero, VinForm, RequestDialog), чтобы не дублировать одинаковую логику.
 */
export const usePhotoAttach = () => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const addPhotos = (files: File[]) => {
    if (files.length === 0) return;
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetPhotos = () => {
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const preparePhotosForUpload = async (): Promise<string[]> => {
    const results = await Promise.all(photos.map((f) => preparePhotoForUpload(f)));
    return results.filter((r): r is string => Boolean(r));
  };

  return { photos, photoPreviews, addPhotos, removePhoto, resetPhotos, preparePhotosForUpload };
};
