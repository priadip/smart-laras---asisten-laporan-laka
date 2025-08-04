
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExtractedPartyInfo, InvolvedEntity } from '../types';
import { LabeledInput, LabeledTextarea, LabeledSelect } from './FormControls';

interface ReportFormProps {
  partyData: Partial<ExtractedPartyInfo>;
  onDataChange: (field: keyof ExtractedPartyInfo, value: string | null | boolean) => void; 
  title?: string;
  getSuggestionsFunc?: (key: string) => string[];
  addSuggestionFunc?: (key: string, value: string) => void;
  involvedEntities: InvolvedEntity[];
  allInvolvedEntities: InvolvedEntity[]; // Add this prop to get all entities for display name calculation
}


const ReportForm: React.FC<ReportFormProps> = ({ partyData, onDataChange, title = "Data Pihak Terlibat", getSuggestionsFunc, addSuggestionFunc, involvedEntities, allInvolvedEntities }) => {
  const handleChange = (field: keyof ExtractedPartyInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // For checkbox, the value is in `checked` property
    if (e.target.type === 'checkbox') {
        onDataChange(field, (e.target as HTMLInputElement).checked);
        return;
    }
    
    const value = e.target.value;
    if ((field === 'jenisKelamin' || field === 'tingkatLuka') && value === "") {
      onDataChange(field, null);
    } else {
      onDataChange(field, value);
    }
  };

  const isVehicleRelevant = partyData.peran === 'Pengemudi' || partyData.peran === 'Penumpang';
  const isPedestrianRelevant = partyData.peran === 'Pejalan Kaki';

  const relevantEntities = useMemo(() => {
    if (isVehicleRelevant) {
      return involvedEntities.filter(e => e.type === 'Kendaraan');
    }
    if (isPedestrianRelevant) {
      return involvedEntities.filter(e => e.type === 'Pejalan Kaki');
    }
    return [];
  }, [involvedEntities, isVehicleRelevant, isPedestrianRelevant]);

  useEffect(() => {
    // If the currently selected entity is no longer relevant for the current role, deselect it.
    if (partyData.involvedEntityId) {
        const isStillRelevant = relevantEntities.some(e => e.id === partyData.involvedEntityId);
        if (!isStillRelevant) {
            onDataChange('involvedEntityId', null);
        }
    }
  }, [partyData.peran, partyData.involvedEntityId, onDataChange, relevantEntities]);
  
  const getEntityDisplayName = (entity: InvolvedEntity): string => {
    if (entity.type === 'Kendaraan') {
      return `${entity.jenisKendaraan} (${entity.nomorPolisi || 'NoPol?'})`;
    }
    if (entity.type === 'Pejalan Kaki') {
      const pedestrianIndex = allInvolvedEntities.filter(e => e.type === 'Pejalan Kaki').findIndex(e => e.id === entity.id);
      return `Pejalan Kaki ${pedestrianIndex + 1}`;
    }
    return 'Entitas Tidak Dikenal';
  };


  return (
    <div className="space-y-4 p-1">
      {title && <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>}
      
      <LabeledSelect
        label="Peran"
        id="peran"
        value={partyData.peran || ""}
        onChange={handleChange('peran')}
      >
        <option value="" disabled>Pilih Peran</option>
        <option value="Pengemudi">Pengemudi</option>
        <option value="Penumpang">Penumpang</option>
        <option value="Pejalan Kaki">Pejalan Kaki</option>
        <option value="Lainnya">Lainnya</option>
      </LabeledSelect>

      <LabeledInput
        label="Nama Lengkap"
        id="namaLengkap"
        value={partyData.namaLengkap || ""}
        onChange={handleChange('namaLengkap')}
        suggestionsKey={`pihak_namaLengkap_${partyData.id || 'new'}`}
        getSuggestionsFunc={getSuggestionsFunc}
        addSuggestionFunc={addSuggestionFunc}
      />
      <LabeledInput
        label="Nomor Identitas (NIK/SIM)"
        id="nomorIdentitas"
        value={partyData.nomorIdentitas || ""}
        onChange={handleChange('nomorIdentitas')}
        suggestionsKey={`pihak_nomorIdentitas_${partyData.id || 'new'}`}
        getSuggestionsFunc={getSuggestionsFunc}
        addSuggestionFunc={addSuggestionFunc}
      />
      <LabeledInput
        label="Alamat"
        id="alamat"
        value={partyData.alamat || ""}
        onChange={handleChange('alamat')}
        suggestionsKey={`pihak_alamat_${partyData.id || 'new'}`}
        getSuggestionsFunc={getSuggestionsFunc}
        addSuggestionFunc={addSuggestionFunc}
      />
      <LabeledInput
        label="Tempat Lahir"
        id="tempatLahir"
        value={partyData.tempatLahir || ""}
        onChange={handleChange('tempatLahir')}
        suggestionsKey={`pihak_tempatLahir_${partyData.id || 'new'}`}
        getSuggestionsFunc={getSuggestionsFunc}
        addSuggestionFunc={addSuggestionFunc}
      />
       <LabeledInput
        label="Tanggal Lahir (DD-MM-YYYY)"
        id="tanggalLahir"
        value={partyData.tanggalLahir || ""}
        onChange={handleChange('tanggalLahir')}
        placeholder="DD-MM-YYYY"
      />
      <LabeledSelect
        label="Jenis Kelamin"
        id="jenisKelamin"
        value={partyData.jenisKelamin || ""}
        onChange={handleChange('jenisKelamin')}
      >
        <option value="" disabled>Pilih Jenis Kelamin</option>
        <option value="Laki-laki">Laki-laki</option>
        <option value="Perempuan">Perempuan</option>
      </LabeledSelect>
       <LabeledInput
        label="Pekerjaan"
        id="pekerjaan"
        value={partyData.pekerjaan || ""}
        onChange={handleChange('pekerjaan')}
        suggestionsKey={`pihak_pekerjaan_${partyData.id || 'new'}`}
        getSuggestionsFunc={getSuggestionsFunc}
        addSuggestionFunc={addSuggestionFunc}
      />

      <div className="my-3 p-3 border border-slate-200 rounded-md bg-slate-50">
        <h4 className="text-sm font-semibold text-slate-600 mb-2">Status & Kondisi Pihak</h4>
        <div className="space-y-4">
          <LabeledSelect
            label="Tingkat Luka"
            id="tingkatLuka"
            value={partyData.tingkatLuka || ""}
            onChange={handleChange('tingkatLuka')}
          >
            <option value="">-- Pilih Kondisi --</option>
            <option value="LR">LR - Luka Ringan</option>
            <option value="LB">LB - Luka Berat</option>
            <option value="MD">MD - Meninggal Dunia</option>
            <option value="MATERI">MATERI - Kerugian Materiil</option>
          </LabeledSelect>

          <div className="flex items-center space-x-3 pt-2">
            <input
                type="checkbox"
                id="didugaTersangka"
                name="didugaTersangka"
                checked={!!partyData.didugaTersangka}
                onChange={handleChange('didugaTersangka')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="didugaTersangka" className="text-sm font-medium text-slate-700 select-none">
                Tandai sebagai diduga tersangka
            </label>
          </div>
        </div>
      </div>

      {(isVehicleRelevant || isPedestrianRelevant) && (
        <div className="my-3 p-3 border border-slate-200 rounded-md bg-slate-50">
            <LabeledSelect
              label={isVehicleRelevant ? "Kaitkan dengan Kendaraan" : "Kaitkan dengan Pejalan Kaki"}
              id="involvedEntityId"
              value={partyData.involvedEntityId || ""}
              onChange={handleChange('involvedEntityId')}
              disabled={relevantEntities.length === 0}
            >
              <option value="">-- Pilih {isVehicleRelevant ? "Kendaraan" : "Pejalan Kaki"} --</option>
              {relevantEntities.map(entity => (
                <option key={entity.id} value={entity.id}>
                    {getEntityDisplayName(entity)}
                </option>
              ))}
            </LabeledSelect>
            {relevantEntities.length === 0 && (
                <p className="text-xs text-yellow-700 mt-1">
                    Tidak ada {isVehicleRelevant ? "kendaraan" : "pejalan kaki"} yang relevan. Silakan tambahkan terlebih dahulu di bagian "Kendaraan / Pejalan Kaki yang Terlibat".
                </p>
            )}
        </div>
      )}
    </div>
  );
};

export default ReportForm;