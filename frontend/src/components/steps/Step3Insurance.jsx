import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOrder } from '../../context/OrderContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import { ArrowLeft, Pen, Trash2, Check } from 'lucide-react';

// Signature Pad Component
const SignaturePad = ({ isOpen, onClose, onSave, title }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (hasSignature) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 relative">
            <canvas
              ref={canvasRef}
              className="w-full h-64 cursor-crosshair rounded-xl touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              data-testid="signature-canvas"
            />
          </div>
          <p className="text-xs text-gray-500">
            Mit dem Finger oder Maus unterschreiben. „Übernehmen" speichert die Unterschrift.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearCanvas} data-testid="signature-clear">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
            <Button onClick={saveSignature} disabled={!hasSignature} data-testid="signature-save">
              <Check className="w-4 h-4 mr-2" />
              Übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const Step3Insurance = () => {
  const { state, dispatch } = useOrder();
  const insurance = state.insurance;
  const [errors, setErrors] = useState({});
  const [signatureModal, setSignatureModal] = useState({ open: false, type: null });

  const updateInsurance = (field, value) => {
    dispatch({ type: 'SET_INSURANCE', payload: { [field]: value } });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!insurance.krankenkasse?.trim()) {
      newErrors.krankenkasse = 'Pflichtfeld';
    }
    if (!insurance.versichertennummer?.trim()) {
      newErrors.versichertennummer = 'Pflichtfeld';
    }
    if (insurance.beihilfe && !insurance.beihilfeProzent) {
      newErrors.beihilfeProzent = 'Bitte Prozentsatz wählen';
    }
    if (!insurance.consent1) {
      newErrors.consent1 = 'Bitte bestätigen';
    }
    if (!insurance.consent2) {
      newErrors.consent2 = 'Bitte bestätigen';
    }
    if (!insurance.signatureInsured) {
      newErrors.signatureInsured = 'Unterschrift erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      dispatch({ type: 'SET_STEP', payload: 3 });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 1 });
  };

  const handleSaveSignature = (dataUrl) => {
    if (signatureModal.type === 'insured') {
      updateInsurance('signatureInsured', dataUrl);
    } else {
      updateInsurance('signatureCare', dataUrl);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Schritt 3: Versicherungsdaten</h2>
      <p className="text-sm text-gray-500 mb-6">
        Angaben zur Krankenversicherung und Einverständniserklärungen
      </p>

      <div className="space-y-6">
        {/* Insurance Type */}
        <div>
          <Label className="mb-2 block">Versicherungsart <span className="text-red-500">*</span></Label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updateInsurance('versicherungsart', 'gesetzlich')}
              className={cn(
                'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                insurance.versicherungsart === 'gesetzlich'
                  ? 'border-primary bg-red-50 text-primary'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              data-testid="insurance-public"
            >
              Gesetzlich versichert
            </button>
            <button
              onClick={() => updateInsurance('versicherungsart', 'privat')}
              className={cn(
                'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                insurance.versicherungsart === 'privat'
                  ? 'border-primary bg-red-50 text-primary'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              data-testid="insurance-private"
            >
              Privat versichert
            </button>
            <button
              onClick={() => updateInsurance('beihilfe', !insurance.beihilfe)}
              className={cn(
                'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                insurance.beihilfe
                  ? 'border-primary bg-red-50 text-primary'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              data-testid="insurance-beihilfe"
            >
              Beihilfeberechtigt
            </button>
          </div>
        </div>

        {/* Beihilfe Percentage */}
        {insurance.beihilfe && (
          <div>
            <Label className="mb-2 block">Beihilfe-Prozentsatz <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {['50', '70', '80'].map(pct => (
                <button
                  key={pct}
                  onClick={() => updateInsurance('beihilfeProzent', pct)}
                  className={cn(
                    'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                    insurance.beihilfeProzent === pct
                      ? 'border-primary bg-red-50 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  data-testid={`beihilfe-${pct}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            {errors.beihilfeProzent && <p className="text-xs text-red-500 mt-1">{errors.beihilfeProzent}</p>}
          </div>
        )}

        {/* Insurance Provider */}
        <div>
          <Label htmlFor="krankenkasse">
            Name der Krankenkasse / Versicherung <span className="text-red-500">*</span>
          </Label>
          <Input
            id="krankenkasse"
            value={insurance.krankenkasse}
            onChange={(e) => updateInsurance('krankenkasse', e.target.value)}
            placeholder="z.B. Techniker Krankenkasse / Allianz"
            className={`h-12 ${errors.krankenkasse ? 'border-red-500' : ''}`}
            data-testid="krankenkasse-input"
          />
          <p className="text-xs text-gray-500 mt-1">Bitte exakt so eintragen, wie es auf der Karte steht.</p>
          {errors.krankenkasse && <p className="text-xs text-red-500 mt-1">{errors.krankenkasse}</p>}
        </div>

        {/* Insurance Number */}
        <div>
          <Label htmlFor="versichertennummer">Versichertennummer <span className="text-red-500">*</span></Label>
          <Input
            id="versichertennummer"
            value={insurance.versichertennummer}
            onChange={(e) => updateInsurance('versichertennummer', e.target.value)}
            placeholder="Versichertennummer"
            className={`h-12 ${errors.versichertennummer ? 'border-red-500' : ''}`}
            data-testid="versichertennummer-input"
          />
          <p className="text-xs text-gray-500 mt-1">Findest du auf deiner Gesundheitskarte.</p>
          {errors.versichertennummer && <p className="text-xs text-red-500 mt-1">{errors.versichertennummer}</p>}
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefon">Telefonnummer</Label>
            <Input
              id="telefon"
              type="tel"
              value={insurance.telefon}
              onChange={(e) => updateInsurance('telefon', e.target.value)}
              placeholder="Telefonnummer"
              className="h-12"
              data-testid="telefon-input"
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={insurance.email}
              onChange={(e) => updateInsurance('email', e.target.value)}
              placeholder="E-Mail"
              className="h-12"
              data-testid="email-input"
            />
          </div>
        </div>

        {/* Already receiving benefits */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Checkbox
            id="beziehBereits"
            checked={insurance.beziehBereits}
            onCheckedChange={(checked) => updateInsurance('beziehBereits', checked)}
            data-testid="bezieht-bereits-checkbox"
          />
          <Label htmlFor="beziehBereits" className="cursor-pointer">
            Beziehen Sie bereits Pflegehilfsmittel?
          </Label>
        </div>

        {insurance.beziehBereits && (
          <div>
            <Label htmlFor="bemerkung">Bemerkung</Label>
            <Textarea
              id="bemerkung"
              value={insurance.bemerkung}
              onChange={(e) => updateInsurance('bemerkung', e.target.value)}
              placeholder="z.B. bereits anderer Anbieter / seit wann / Hinweise"
              className="min-h-[80px]"
              data-testid="bemerkung-textarea"
            />
          </div>
        )}

        {/* Consents */}
        <div className="space-y-4">
          <div className={cn('p-4 rounded-lg border', errors.consent1 ? 'border-red-300 bg-red-50' : 'bg-gray-50')}>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent1"
                checked={insurance.consent1}
                onCheckedChange={(checked) => updateInsurance('consent1', checked)}
                className="mt-1"
                data-testid="consent1-checkbox"
              />
              <Label htmlFor="consent1" className="cursor-pointer text-sm leading-relaxed">
                Ich beantrage die Kostenübernahme für zum Verbrauch bestimmte Pflegehilfsmittel bis max. 
                zum monatlichen Höchstbetrag nach §40 SGB XI. Sofern ich bereits Pflegehilfsmittel von einem 
                anderen Dienstleister erhalte, trage ich die Kosten für den doppelten Bezug selbst. Mit meiner 
                Unterschrift bestätige ich, dass die gewünschten Produkte ausschließlich für die häusliche Pflege 
                durch private Pflegepersonen verwendet werden dürfen.
              </Label>
            </div>
            {errors.consent1 && <p className="text-xs text-red-500 mt-2">{errors.consent1}</p>}
          </div>

          <div className={cn('p-4 rounded-lg border', errors.consent2 ? 'border-red-300 bg-red-50' : 'bg-gray-50')}>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent2"
                checked={insurance.consent2}
                onCheckedChange={(checked) => updateInsurance('consent2', checked)}
                className="mt-1"
                data-testid="consent2-checkbox"
              />
              <Label htmlFor="consent2" className="cursor-pointer text-sm leading-relaxed">
                Ich beantrage die Kostenübernahme für folgenden Leistungserbringer: <strong>Marina Pflegebox</strong>. 
                Ich bestätige, dass die gewünschten Produkte ausschließlich für die ambulante private Pflege 
                (nicht durch Pflegedienste) verwendet werden und meine Daten für Abrechnungszwecke an das 
                zuständige Abrechnungszentrum weitergeleitet werden dürfen.
              </Label>
            </div>
            {errors.consent2 && <p className="text-xs text-red-500 mt-2">{errors.consent2}</p>}
          </div>
        </div>

        {/* Signature Section */}
        <div className="space-y-4">
          <div>
            <Button
              variant="outline"
              onClick={() => setSignatureModal({ open: true, type: 'insured' })}
              className={cn('w-full h-14 justify-start', errors.signatureInsured && 'border-red-500')}
              data-testid="signature-insured-btn"
            >
              <Pen className="w-5 h-5 mr-3" />
              <span className="font-semibold">Unterschrift Versicherte/r</span>
              <span className="text-red-500 ml-1">*</span>
            </Button>
            {insurance.signatureInsured ? (
              <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                <img src={insurance.signatureInsured} alt="Unterschrift" className="h-16 object-contain" />
                <p className="text-xs text-green-600 mt-1">✓ Unterschrift erfasst</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Noch keine Unterschrift erfasst.</p>
            )}
            {errors.signatureInsured && <p className="text-xs text-red-500 mt-1">{errors.signatureInsured}</p>}
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => setSignatureModal({ open: true, type: 'care' })}
              className="w-full h-14 justify-start"
              data-testid="signature-care-btn"
            >
              <Pen className="w-5 h-5 mr-3" />
              <span className="font-semibold">Unterschrift Betreuungsperson (optional)</span>
            </Button>
            {insurance.signatureCare ? (
              <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                <img src={insurance.signatureCare} alt="Unterschrift Betreuung" className="h-16 object-contain" />
                <p className="text-xs text-green-600 mt-1">✓ Unterschrift erfasst</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Noch keine Unterschrift erfasst.</p>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignaturePad
        isOpen={signatureModal.open}
        onClose={() => setSignatureModal({ open: false, type: null })}
        onSave={handleSaveSignature}
        title={signatureModal.type === 'insured' ? 'Unterschrift Versicherte/r' : 'Unterschrift Betreuungsperson'}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t mt-6">
        <Button variant="outline" onClick={handleBack} className="h-12" data-testid="back-step-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={handleNext} className="h-12 px-8" data-testid="next-step-3">
          Weiter zur Übersicht
        </Button>
      </div>
    </div>
  );
};
