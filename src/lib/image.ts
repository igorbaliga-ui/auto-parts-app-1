/**
 * Значение атрибута accept для <input type="file"> с фото.
 * "image/*" в чистом виде на Chrome на Android 14/15 заставляет систему
 * открывать новый Photo Picker, у которого нет вкладки «Камера» — можно выбрать
 * фото только из галереи (известный баг Chrome, issuetracker.google.com/issues/317289301).
 * Добавление нестандартного MIME-токена android/allowCamera — задокументированный
 * обходной путь: Chrome в этом случае возвращает системный выбор «Камера или Галерея».
 * iOS Safari и десктопные браузеры такой accept просто игнорируют как есть.
 */
export const PHOTO_ACCEPT = 'image/*,android/allowCamera';

/**
 * Сжимает изображение перед отправкой на сервер (фото с телефона могут весить
 * несколько мегабайт и не проходят из-за ограничения на размер запроса).
 * Уменьшает сторону до maxDimension и конвертирует в JPEG с заданным качеством.
 */
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

export const compressImageToBase64 = (
  file: File,
  maxDimension = 1600,
  quality = 0.75,
): Promise<string> =>
  new Promise((resolve, reject) => {
    readFileAsDataUrl(file)
      .then((dataUrl) => {
        const img = new Image();
        img.onerror = () => reject(new Error('image load failed'));
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('canvas not supported'));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('compress failed'));
          }
        };
        img.src = dataUrl;
      })
      .catch(reject);
  });

/**
 * Безопасная обёртка: если сжатие не удалось (например, формат HEIC с iPhone,
 * который браузер не может декодировать через <img>/canvas), пробует отправить
 * исходный файл как есть. Если и это не удалось — возвращает null, чтобы
 * заявка всё равно отправилась без фото, а не заблокировалась ошибкой.
 */
export const preparePhotoForUpload = async (file: File): Promise<string | null> => {
  try {
    return await compressImageToBase64(file);
  } catch (err) {
    console.error('compressImageToBase64 failed, trying raw file', err);
    try {
      return await readFileAsDataUrl(file);
    } catch (rawErr) {
      console.error('readFileAsDataUrl failed too, skipping photo', rawErr);
      return null;
    }
  }
};