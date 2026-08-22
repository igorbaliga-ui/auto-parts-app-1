import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import RequestCarVinFields from './RequestCarVinFields';
import RequestContactFields from './RequestContactFields';
import RequestPartsFields from './RequestPartsFields';
import RequestPromoSubmit from './RequestPromoSubmit';
import { GarageCar } from './RequestContext';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid';

type RequestFormFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  promoStatus?: PromoStatus;
  promoAlreadyUsed?: boolean;
  nameAutoFilled?: boolean;
  messenger: string | null;
  setMessenger: React.Dispatch<React.SetStateAction<string | null>>;
  knownContact: boolean;
  vinHistory: string[];
  garageCars: GarageCar[];
  vinSource: 'garage' | 'manual' | null;
  setVinSource: React.Dispatch<React.SetStateAction<'garage' | 'manual' | null>>;
  vinPhotos: File[];
  vinPhotoPreviews: string[];
  addVinPhotos: (files: File[]) => void;
  removeVinPhoto: (index: number) => void;
  partsPhotos: File[];
  partsPhotoPreviews: string[];
  addPartsPhotos: (files: File[]) => void;
  removePartsPhoto: (index: number) => void;
  submitting: boolean;
  onSubmit: (ev: React.FormEvent) => void;
  showSignupBonusHint?: boolean;
  signupBonusAmount?: number;
  step: number;
  stepDirection: 'forward' | 'backward';
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
};

const STEP_LABELS = ['VIN автомобиля', 'Контакты', 'Запчасти'];

const RequestFormFields = ({
  form,
  setForm,
  errors,
  promoStatus = 'idle',
  promoAlreadyUsed,
  nameAutoFilled,
  messenger,
  setMessenger,
  knownContact,
  vinHistory,
  garageCars,
  vinSource,
  setVinSource,
  vinPhotos,
  vinPhotoPreviews,
  addVinPhotos,
  removeVinPhoto,
  partsPhotos,
  partsPhotoPreviews,
  addPartsPhotos,
  removePartsPhoto,
  submitting,
  onSubmit,
  showSignupBonusHint,
  signupBonusAmount,
  step,
  stepDirection,
  totalSteps,
  onNext,
  onBack,
}: RequestFormFieldsProps) => {
  // На последнем шаге сабмит формы реально отправляет заявку, на остальных —
  // Enter/кнопка «Далее» просто валидирует текущий шаг и переключает на следующий.
  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (step < totalSteps) {
      onNext();
    } else {
      onSubmit(ev);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-head uppercase tracking-wide text-xs text-muted-foreground">
            Шаг {step} из {totalSteps} — {STEP_LABELS[step - 1]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        key={step}
        className={`flex flex-col gap-4 ${
          stepDirection === 'forward' ? 'animate-step-in-forward' : 'animate-step-in-backward'
        }`}
      >
        {step === 1 && (
          <RequestCarVinFields
            form={form}
            setForm={setForm}
            errors={errors}
            garageCars={garageCars}
            vinSource={vinSource}
            setVinSource={setVinSource}
            vinHistory={vinHistory}
            vinPhotos={vinPhotos}
            vinPhotoPreviews={vinPhotoPreviews}
            addVinPhotos={addVinPhotos}
            removeVinPhoto={removeVinPhoto}
            showSignupBonusHint={showSignupBonusHint}
            signupBonusAmount={signupBonusAmount}
            vinOptionalHint={vinPhotos.length > 0 || partsPhotos.length > 0}
          />
        )}

        {step === 2 && (
          <RequestContactFields
            form={form}
            setForm={setForm}
            errors={errors}
            nameAutoFilled={nameAutoFilled}
            messenger={messenger}
            setMessenger={setMessenger}
            knownContact={knownContact}
          />
        )}

        {step === 3 && (
          <>
            <RequestPartsFields
              form={form}
              setForm={setForm}
              errors={errors}
              partsPhotos={partsPhotos}
              partsPhotoPreviews={partsPhotoPreviews}
              addPartsPhotos={addPartsPhotos}
              removePartsPhoto={removePartsPhoto}
            />

            <RequestPromoSubmit
              form={form}
              setForm={setForm}
              errors={errors}
              promoStatus={promoStatus}
              promoAlreadyUsed={promoAlreadyUsed}
              knownContact={knownContact}
              submitting={submitting}
              onBack={onBack}
            />
          </>
        )}
      </div>

      {step < totalSteps && (
        <div className="flex items-center gap-2 mt-1">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="font-head uppercase tracking-wide h-11 gap-1.5"
            >
              <Icon name="ChevronLeft" size={16} />
              Назад
            </Button>
          )}
          <Button
            type="submit"
            className="font-head uppercase tracking-wide font-bold h-11 flex-1 gap-1.5"
          >
            Далее
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      )}
    </form>
  );
};

export default RequestFormFields;