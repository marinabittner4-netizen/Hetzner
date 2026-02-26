import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { ArrowLeft } from 'lucide-react';

export const Step2Delivery = () => {
  const { state, dispatch } = useOrder();
  const customer = state.customer;
  const [showAltAddress, setShowAltAddress] = useState(false);
  const [errors, setErrors] = useState({});

  const updateCustomer = (field, value) => {
    dispatch({ type: 'SET_CUSTOMER', payload: { [field]: value } });
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Format date input as DD.MM.YYYY
  const handleDateInput = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    let formatted = '';
    if (value.length > 0) formatted = value.slice(0, 2);
    if (value.length > 2) formatted += '.' + value.slice(2, 4);
    if (value.length > 4) formatted += '.' + value.slice(4, 8);
    
    updateCustomer('geburtsdatum', formatted);
  };

  const validateDate = (dateStr) => {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return false;
    const [dd, mm, yyyy] = dateStr.split('.').map(Number);
    if (yyyy < 1900 || yyyy > 2100) return false;
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    return dt.getUTCFullYear() === yyyy && dt.getUTCMonth() + 1 === mm && dt.getUTCDate() === dd;
  };

  const validate = () => {
    const newErrors = {};
    const required = ['anrede', 'vorname', 'nachname', 'strasse', 'hausnr', 'plz', 'stadt', 'geburtsdatum'];
    
    required.forEach(field => {
      if (!customer[field]?.trim()) {
        newErrors[field] = 'Pflichtfeld';
      }
    });

    if (customer.geburtsdatum && !validateDate(customer.geburtsdatum)) {
      newErrors.geburtsdatum = 'Ungültiges Datum (TT.MM.JJJJ)';
    }

    if (customer.plz && !/^\d{5}$/.test(customer.plz)) {
      newErrors.plz = 'PLZ muss 5 Ziffern haben';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      dispatch({ type: 'SET_STEP', payload: 2 });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 0 });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Schritt 2: Lieferinformationen</h2>
      <p className="text-sm text-gray-500 mb-6">
        Angaben zur berechtigten Person (Versicherte/r)
      </p>

      <div className="space-y-6">
        {/* Pflegegrad (readonly from Step 1) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <Label className="text-sm text-gray-500">Pflegegrad</Label>
          <p className="font-semibold text-gray-900">Pflegegrad {state.pflegegrad}</p>
        </div>

        {/* Name Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="anrede">Anrede <span className="text-red-500">*</span></Label>
            <Select value={customer.anrede} onValueChange={(v) => updateCustomer('anrede', v)}>
              <SelectTrigger id="anrede" className={`h-12 ${errors.anrede ? 'border-red-500' : ''}`} data-testid="anrede-select">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Frau">Frau</SelectItem>
                <SelectItem value="Herr">Herr</SelectItem>
                <SelectItem value="Divers">Divers</SelectItem>
              </SelectContent>
            </Select>
            {errors.anrede && <p className="text-xs text-red-500 mt-1">{errors.anrede}</p>}
          </div>

          <div>
            <Label htmlFor="titel">Titel</Label>
            <Input
              id="titel"
              value={customer.titel}
              onChange={(e) => updateCustomer('titel', e.target.value)}
              placeholder="z.B. Dr."
              className="h-12"
              data-testid="titel-input"
            />
          </div>

          <div>
            <Label htmlFor="vorname">Vorname <span className="text-red-500">*</span></Label>
            <Input
              id="vorname"
              value={customer.vorname}
              onChange={(e) => updateCustomer('vorname', e.target.value)}
              placeholder="Vorname"
              className={`h-12 ${errors.vorname ? 'border-red-500' : ''}`}
              data-testid="vorname-input"
            />
            {errors.vorname && <p className="text-xs text-red-500 mt-1">{errors.vorname}</p>}
          </div>

          <div>
            <Label htmlFor="nachname">Nachname <span className="text-red-500">*</span></Label>
            <Input
              id="nachname"
              value={customer.nachname}
              onChange={(e) => updateCustomer('nachname', e.target.value)}
              placeholder="Nachname"
              className={`h-12 ${errors.nachname ? 'border-red-500' : ''}`}
              data-testid="nachname-input"
            />
            {errors.nachname && <p className="text-xs text-red-500 mt-1">{errors.nachname}</p>}
          </div>
        </div>

        {/* Address Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="strasse">Straße <span className="text-red-500">*</span></Label>
            <Input
              id="strasse"
              value={customer.strasse}
              onChange={(e) => updateCustomer('strasse', e.target.value)}
              placeholder="Straße"
              className={`h-12 ${errors.strasse ? 'border-red-500' : ''}`}
              data-testid="strasse-input"
            />
            {errors.strasse && <p className="text-xs text-red-500 mt-1">{errors.strasse}</p>}
          </div>

          <div>
            <Label htmlFor="hausnr">Hausnr. <span className="text-red-500">*</span></Label>
            <Input
              id="hausnr"
              value={customer.hausnr}
              onChange={(e) => updateCustomer('hausnr', e.target.value)}
              placeholder="Nr."
              className={`h-12 ${errors.hausnr ? 'border-red-500' : ''}`}
              data-testid="hausnr-input"
            />
            {errors.hausnr && <p className="text-xs text-red-500 mt-1">{errors.hausnr}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="adresszusatz">Adresszusatz</Label>
          <Input
            id="adresszusatz"
            value={customer.adresszusatz}
            onChange={(e) => updateCustomer('adresszusatz', e.target.value)}
            placeholder="z.B. Etage, Apartment"
            className="h-12"
            data-testid="adresszusatz-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="plz">PLZ <span className="text-red-500">*</span></Label>
            <Input
              id="plz"
              value={customer.plz}
              onChange={(e) => updateCustomer('plz', e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="12345"
              inputMode="numeric"
              className={`h-12 ${errors.plz ? 'border-red-500' : ''}`}
              data-testid="plz-input"
            />
            {errors.plz && <p className="text-xs text-red-500 mt-1">{errors.plz}</p>}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="stadt">Stadt <span className="text-red-500">*</span></Label>
            <Input
              id="stadt"
              value={customer.stadt}
              onChange={(e) => updateCustomer('stadt', e.target.value)}
              placeholder="Stadt"
              className={`h-12 ${errors.stadt ? 'border-red-500' : ''}`}
              data-testid="stadt-input"
            />
            {errors.stadt && <p className="text-xs text-red-500 mt-1">{errors.stadt}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="geburtsdatum">Geburtsdatum <span className="text-red-500">*</span></Label>
          <Input
            id="geburtsdatum"
            value={customer.geburtsdatum}
            onChange={handleDateInput}
            placeholder="TT.MM.JJJJ"
            inputMode="numeric"
            maxLength={10}
            className={`h-12 ${errors.geburtsdatum ? 'border-red-500' : ''}`}
            data-testid="geburtsdatum-input"
          />
          {errors.geburtsdatum && <p className="text-xs text-red-500 mt-1">{errors.geburtsdatum}</p>}
        </div>

        {/* Alternative Address */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Checkbox
            id="altAddress"
            checked={showAltAddress}
            onCheckedChange={(checked) => setShowAltAddress(checked)}
            data-testid="alt-address-checkbox"
          />
          <Label htmlFor="altAddress" className="cursor-pointer">
            Abweichende Lieferadresse
          </Label>
        </div>

        {showAltAddress && (
          <div>
            <Label htmlFor="abweichendeAdresse">Abweichende Lieferadresse</Label>
            <Textarea
              id="abweichendeAdresse"
              value={customer.abweichendeAdresse}
              onChange={(e) => updateCustomer('abweichendeAdresse', e.target.value)}
              placeholder="Name, Straße, PLZ, Ort"
              className="min-h-[100px]"
              data-testid="alt-address-textarea"
            />
          </div>
        )}

        {/* Delivery Note */}
        <div>
          <Label htmlFor="hinweis">Hinweis (optional)</Label>
          <Textarea
            id="hinweis"
            value={customer.hinweis}
            onChange={(e) => updateCustomer('hinweis', e.target.value)}
            placeholder="z.B. Klingel/Etage, Abstellort, Lieferhinweis"
            className="min-h-[80px]"
            data-testid="hinweis-textarea"
          />
        </div>

        <p className="text-xs text-gray-500">
          Felder mit <span className="text-red-500">*</span> sind Pflichtfelder.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t mt-6">
        <Button variant="outline" onClick={handleBack} className="h-12" data-testid="back-step-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={handleNext} className="h-12 px-8" data-testid="next-step-2">
          Weiter zu Versicherungsdaten
        </Button>
      </div>
    </div>
  );
};
