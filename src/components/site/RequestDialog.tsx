import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGarageAuth } from '@/hooks/use-garage-auth';
import { RequestContext } from './request-dialog/RequestContext';
import { useRequestFormState } from './request-dialog/useRequestFormState';
import { useRequestSubmit } from './request-dialog/useRequestSubmit';
import RequestDialogShell from './request-dialog/RequestDialogShell';
import RequestFormFields from './request-dialog/RequestFormFields';
import RequestPhoneVerificationStep from './request-dialog/RequestPhoneVerificationStep';

export { useRequest } from './request-dialog/RequestContext';

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const { authed: garageAuthed, phone: garagePhone } = useGarageAuth();

  const {
    isOpen,
    setIsOpen,
    form,
    setForm,
    messenger,
    setMessenger,
    vinPhoto,
    partsPhoto,
    knownContact,
    vinHistory,
    garageCars,
    vinSource,
    setVinSource,
    promoStatus,
    autoFilledName,
    knownPhoneNoAuth,
    promoAlreadyUsed,
    open: openForm,
    resetForm,
  } = useRequestFormState({ garageAuthed, garagePhone });

  const {
    errors,
    setErrors,
    submitting,
    checkingVerification,
    verificationStep,
    verification,
    submit,
    handleVerifyCode,
    handleRequestCall,
    handleBackFromVerification,
  } = useRequestSubmit({
    form,
    messenger,
    knownContact,
    knownPhoneNoAuth,
    promoStatus,
    promoAlreadyUsed,
    garageAuthed,
    vinPhoto,
    partsPhoto,
    setIsOpen,
    resetForm,
  });

  const open = (vin?: string, photos?: File[], phone?: string, name?: string, history?: string[], city?: string) => {
    setErrors({});
    openForm(vin, photos, phone, name, history, city);
  };

  const formContent = (
    <RequestFormFields
      form={form}
      setForm={setForm}
      errors={errors}
      messenger={messenger}
      setMessenger={setMessenger}
      knownContact={knownContact}
      promoStatus={promoStatus}
      promoAlreadyUsed={promoAlreadyUsed}
      nameAutoFilled={!!autoFilledName || !!knownPhoneNoAuth}
      vinHistory={vinHistory}
      garageCars={garageCars}
      vinSource={vinSource}
      setVinSource={setVinSource}
      vinPhotos={vinPhoto.photos}
      vinPhotoPreviews={vinPhoto.photoPreviews}
      addVinPhotos={vinPhoto.addPhotos}
      removeVinPhoto={vinPhoto.removePhoto}
      partsPhotos={partsPhoto.photos}
      partsPhotoPreviews={partsPhoto.photoPreviews}
      addPartsPhotos={partsPhoto.addPhotos}
      removePartsPhoto={partsPhoto.removePhoto}
      submitting={submitting || checkingVerification}
      onSubmit={submit}
    />
  );

  const verificationContent = (
    <RequestPhoneVerificationStep
      phone={form.phone}
      callRequested={verification.callRequested}
      callLoading={verification.callLoading}
      codeInput={verification.codeInput}
      setCodeInput={verification.setCodeInput}
      error={verification.error}
      verifyLoading={verification.verifyLoading}
      cooldown={verification.callCooldown}
      requestCall={handleRequestCall}
      submitCode={handleVerifyCode}
      onBack={handleBackFromVerification}
    />
  );

  const dialogBody = verificationStep ? verificationContent : formContent;

  return (
    <RequestContext.Provider value={{ open }}>
      {children}
      <RequestDialogShell
        isMobile={isMobile}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        verificationStep={verificationStep}
      >
        {dialogBody}
      </RequestDialogShell>
    </RequestContext.Provider>
  );
};

export default RequestProvider;
