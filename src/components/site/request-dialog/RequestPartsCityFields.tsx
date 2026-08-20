import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import CityInput from '@/components/shared/CityInput';
import PhotoAttach from '@/components/site/PhotoAttach';
import { setStoredCity } from '@/lib/garage-city';
import { sanitizePartsInput } from '@/lib/text';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type RequestPartsCityFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  partsPhotos: File[];
  partsPhotoPreviews: string[];
  addPartsPhotos: (files: File[]) => void;
  removePartsPhoto: (index: number) => void;
};

const RequestPartsCityFields = ({
  form,
  setForm,
  errors,
  partsPhotos,
  partsPhotoPreviews,
  addPartsPhotos,
  removePartsPhoto,
}: RequestPartsCityFieldsProps) => {
  const [partsExpanded, setPartsExpanded] = useState(false);

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Интересующие запчасти
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPartsExpanded(true)}
              title="Открыть на весь экран"
              className="flex items-center justify-center w-7 h-7 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="Maximize2" size={14} />
            </button>
            <PhotoAttach
              photos={partsPhotos}
              photoPreviews={partsPhotoPreviews}
              onAdd={addPartsPhotos}
              onRemove={removePartsPhoto}
              compact
            />
          </div>
        </div>
        <Textarea
          value={form.parts}
          readOnly
          onClick={() => setPartsExpanded(true)}
          onFocus={(e) => {
            e.currentTarget.blur();
            setPartsExpanded(true);
          }}
          placeholder="Например: передние тормозные колодки, масляный фильтр"
          className="mt-1.5 bg-background min-h-[84px] cursor-pointer resize-none"
        />
        <p className="text-muted-foreground text-xs mt-1 text-right">
          {form.parts.length}/1000
        </p>
        {errors.parts && (
          <p className="text-primary text-xs mt-1">{errors.parts}</p>
        )}
      </div>

      <Dialog open={partsExpanded} onOpenChange={setPartsExpanded}>
        <DialogContent className="bg-card border-border sm:max-w-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-xl">
              Интересующие запчасти
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Опишите подробно — марку, модель, год, что именно нужно.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={form.parts}
            onChange={(e) =>
              setForm((f) => ({ ...f, parts: sanitizePartsInput(e.target.value) }))
            }
            maxLength={1000}
            placeholder="Например: передние тормозные колодки, масляный фильтр"
            className="bg-background min-h-[45vh] resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {form.parts.length}/1000
            </p>
            <Button
              type="button"
              onClick={() => setPartsExpanded(false)}
              className="font-head uppercase tracking-wide"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
          Город
        </label>
        <div className="mt-1.5 w-[220px]">
          <CityInput
            value={form.city}
            onChange={(v) => {
              setForm((f) => ({ ...f, city: v }));
              setStoredCity(v);
            }}
            placeholder="Выбрать город"
            className={`h-11 px-4 rounded-sm border text-sm bg-background ${
              errors.city ? 'border-primary text-primary' : 'border-steel text-foreground'
            }`}
          />
        </div>
        {errors.city && (
          <p className="text-primary text-xs mt-1">{errors.city}</p>
        )}
      </div>
    </>
  );
};

export default RequestPartsCityFields;
