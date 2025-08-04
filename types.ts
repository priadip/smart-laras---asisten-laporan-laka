

export interface InvolvedVehicle {
  id: string;
  type: 'Kendaraan';
  jenisKendaraan: string;
  nomorPolisi: string;
  kerusakan: string;
}

export interface InvolvedPedestrian {
  id: string;
  type: 'Pejalan Kaki';
}

export type InvolvedEntity = InvolvedVehicle | InvolvedPedestrian;

export interface ExtractedPartyInfo {
  id: string; // Unique ID for list management
  peran: 'Pengemudi' | 'Penumpang' | 'Pejalan Kaki' | 'Lainnya';
  namaLengkap: string;
  nomorIdentitas: string; // NIK KTP atau No SIM
  alamat: string;
  tempatLahir?: string;
  tanggalLahir: string; // DD-MM-YYYY (used to calculate age)
  jenisKelamin?: 'Laki-laki' | 'Perempuan' | null;
  pekerjaan: string; 
  involvedEntityId: string | null; // NEW: Links to an entity in involvedEntities
  fotoIdentitas?: string; // base64 string of the uploaded ID photo (optional to display)
  tingkatLuka?: 'LR' | 'LB' | 'MD' | 'MATERI' | null;
  didugaTersangka?: boolean;
}

export interface SaksiInfo {
  id: string;
  namaLengkap: string;
  nomorIdentitas?: string; // Optional, from OCR
  alamat: string;
  tempatLahir?: string;
  tanggalLahir?: string; // DD-MM-YYYY (used to calculate age) for OCR
  jenisKelamin?: 'Laki-laki' | 'Perempuan' | null;
  umurString: string; // e.g., "30 Th" (can be manually entered or calculated if DOB from OCR)
  pekerjaan: string;
  keteranganSaksi: string; // What the witness saw or their statement
  fotoIdentitasSaksi?: string; // base64 string of the uploaded ID photo (optional to display)
}

export interface PelaporInfo {
  namaLengkap: string;
  nomorIdentitas: string; // NIK from KTP
  alamat: string;
  tempatLahir?: string;
  tanggalLahir: string; // DD-MM-YYYY
  jenisKelamin?: 'Laki-laki' | 'Perempuan' | null;
  pekerjaan: string;
  agama?: string;
  suku?: string;
  fotoIdentitasKtp?: string; // base64 string for preview in modal
}

export interface AccidentReportData {
  id: string; // Unique ID for this report in the archive
  lastModified: number; // Timestamp of last modification

  // Header - Static, will be pre-filled
  kepada: string;
  dari: string;
  perihal: string;

  // Pelapor Info - New
  pelaporInfo?: PelaporInfo;

  // Incident Time and Place
  waktuKejadian: string;
  alamatTkp: string; // Detailed address of the incident

  // Consequences
  narasiAkibatKecelakaan: string; // Narrative of consequences
  korbanMeninggalDunia: number;
  korbanLukaBerat: number;
  korbanLukaRingan: number;
  kerugianMateriilAngka: number; // Changed from kerugianMateriilString
  kerugianMateriilTerbilang: string; // New field for "Rp. xxx,- (xxx Rupiah)" format

  // Pre-Incident Conditions
  uraianPraKejadianManusia: string; // Driver/pedestrian actions before incident
  uraianPraKejadianKendaraan: string; // Vehicle conditions before incident
  uraianPraKejadianJalanLingkungan: string; // Road and environmental conditions

  // Main Chronology
  kronologiKejadianUtama: string; // Detailed chronological account of the incident
  
  // Classification from suggestions (optional)
  jenisKecelakaan?: string;
  penyebabUtama?: string;

  // NEW: Entities involved
  involvedEntities: InvolvedEntity[];

  // Involved Parties
  pihakTerlibat: ExtractedPartyInfo[];

  // Witnesses
  saksiSaksi: SaksiInfo[]; // Array of witness data, to be populated via modal and OCR

  // Evidence
  barangBuktiText: string; // Temporary: using textarea for evidence input

  // Actions Taken
  tindakanDilakukanText: string; // Temporary: using textarea for actions taken

  // Report Number
  nomorLaporanPolisi: string;

  // Officer Notes (optional)
  catatanTambahanPetugas?: string;
}

// --- New Gemini OCR Types ---

export interface GeminiExtractedKkMember {
  namaLengkap: string | null;
  nomorIdentitas: string | null; // NIK
  alamat?: string | null; 
  tempatLahir?: string | null;
  tanggalLahir: string | null; // DD-MM-YYYY
  jenisKelamin?: 'Laki-laki' | 'Perempuan' | null;
  pekerjaan: string | null;
  hubunganKeluarga: string | null;
}

export interface GeminiOcrResult {
  documentType: 'KTP' | 'SIM' | 'KK' | 'STNK' | 'LAINNYA' | null;
  namaLengkap: string | null; // Changed from string to string | null for consistency
  nomorIdentitas: string | null; // NIK from KTP/KK, No SIM from SIM
  alamat: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null; // DD-MM-YYYY
  jenisKelamin: 'Laki-laki' | 'Perempuan' | null;
  pekerjaan: string | null;
  agama?: string | null;
  nomorPolisi?: string | null; // From SIM (if includes vehicle info) or STNK

  familyMembers?: GeminiExtractedKkMember[] | null; 
  alamatKartuKeluarga?: string | null;

  jenisKendaraanStnk?: string | null;
  namaPemilikStnk?: string | null; 
  alamatStnk?: string | null; 
}

// Structure expected from Gemini API for Saksi (kept similar fields for consistency if possible)
export interface GeminiExtractedSaksiData {
  namaLengkap: string | null;
  nomorIdentitas: string | null;
  alamat: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null; // DD-MM-YYYY
  jenisKelamin: 'Laki-laki' | 'Perempuan' | null;
  pekerjaan: string | null;
}


export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Add other types of chunks if necessary, e.g., retrievedPassage
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

// For Toast Notifications
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// types.ts
// ... (tambahkan di bagian bawah file)

export interface ReportSuggestion {
    similarity: number;
    original_text: string;
    suggested_jenis_kecelakaan: string;
    suggested_penyebab_utama: string;
    // Tambahkan properti lain yang mungkin dikirim oleh backend
}