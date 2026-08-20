import RequestCarVinFields from './RequestCarVinFields';
import RequestContactFields from './RequestContactFields';
import RequestPartsCityFields from './RequestPartsCityFields';
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
};

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
}: RequestFormFieldsProps) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
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

      <RequestContactFields
        form={form}
        setForm={setForm}
        errors={errors}
        nameAutoFilled={nameAutoFilled}
        messenger={messenger}
        setMessenger={setMessenger}
        knownContact={knownContact}
      />

      <RequestPartsCityFields
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
      />
    </form>
  );
};

export default RequestFormFields;
