
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { UserGroupIcon, DocumentTextIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, BuildingLibraryIcon, ShieldCheckIcon, InboxStackIcon, ChatBubbleLeftEllipsisIcon, MapPinIcon, ClockIcon, ListBulletIcon, CameraIcon, ArrowPathIcon, DocumentArrowDownIcon, WifiIcon, NoSymbolIcon, BanknotesIcon, PlusIcon, IdentificationIcon, UsersIcon, TruckIcon, PrinterIcon, ArchiveBoxIcon, ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import ImageUploader from './components/ImageUploader';
import ReportForm from './components/ReportForm';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal';
import Toast from './components/Toast';
import PrintableReport from './components/PrintableReport'; // Import the new component
import { LabeledInput, LabeledTextarea, LabeledSelect } from './components/FormControls'; 
import { extractInfoFromDocument, extractSaksiInfoFromDocument } from './services/geminiService';
import type { AccidentReportData, ExtractedPartyInfo, SaksiInfo, GeminiExtractedSaksiData, GeminiOcrResult, ToastMessage, PelaporInfo, InvolvedEntity, InvolvedVehicle, InvolvedPedestrian, ReportSuggestion } from './types';
import { VEHICLE_DATA, MANUAL_INPUT_OPTION } from './constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import saveAs from 'file-saver';


const ARCHIVE_STORAGE_KEY = "accidentReportsArchive_v2.1"; // New key for multiple reports
const SUGGESTIONS_STORAGE_KEY = "accidentReportFieldSuggestions_v1";
const MAX_SUGGESTIONS_PER_FIELD = 10;
const JALAN_LINGKUNGAN_MANUALLY_EDITED_FLAG = "jalanLingkunganManuallyEdited_v1_flag_"; // Append report ID


const APP_HEADER_LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2Ij48cGF0aCBmaWxsPSIjM2I4MmY2IiBkPSJNMTIsMUwzLDV2NmMwLDUuNTUsMy44NCwxMC43NCw5LDEyYzUuMTYtMS4yNiw5LTYuNDUsOS0xMlY1TDEyLDF6IiAvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Im0xMiA3LjI3IDUuMjUgOS4wOUg2Ljc1TDEyIDcuMjdNMTIgNCBMNC4yNSAxOGgxNS41TDEyIDR6IiAvPjxnIGZpbGw9IiMzYjgyZjYiIHRyYW5zZm9ybT0ic2NhbGUoMC4zNSkgdHJhbnNsYXRlKDE3LjUsIDIzKSI+PHBhdGggZD0ibTIwLDhsLTItMS41di0yLjVjMC0wLjU1LTAuNDUtMS0xLTFoLTIuNWwtMS41LTJsLTEuNSwyaC0yLjVjLTAuNTUsMC0xLDAuNDUtMSwxdjIuNWwtMiwxLjVsMiwxLjV2Mi41YzAsMC41NSwwLjQ1LDEsMSwxaDIuNWwxLjUsMmwxLjUtMmgyLjVjMC41NSwwLDEtMC40NSwxLTF2LTIuNWwyLTEuNW0tNS4xMiw0Ljg4bC0xLjg4LTEuODhsLTEuODgsMS44OGwtMS4xMi0xLjEybDEuODgtMS44OGwtMS44OC0xLjg4bDEuMTItMS4xMmwxLjg4LDEuODhsMS44OC0xLjg4bDEuMTIsMS4xMmwtMS44OCwxLjg4bDEuODgsMS44OGwtMS4xMiwxLjEyeiIgLz48L2c+PC9zdmc+";

const SPKT_OFFICERS = [
  { nama: "EDI SUHENDAR", pangkat: "AIPDA", nrp: "80071313", regu: "KA SPKT I" },
  { nama: "AGUS RAMDONI, S.H.", pangkat: "AIPTU", nrp: "79080333", regu: "KA SPKT II" },
  { nama: "DIAN ROSDIANA", pangkat: "AIPTU", nrp: "70100159", regu: "KA SPKT III" },
];

const REPORTING_OFFICERS = [
  { nama: "WISNU ANTONI", pangkat: "BRIPKA", nrp: "86031618" },
  { nama: "LINGGA PRIADI PUTRA", pangkat: "BRIGPOL", nrp: "96060789" },
];

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const toRomanNumeral = (num: number): string => {
  if (num < 1 || num > 12) return String(num); 
  const roman: { [key: number]: string } = { 
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' 
  };
  return roman[num] || String(num);
};

const calculateAge = (birthDateString?: string): string => {
  if (!birthDateString) return "(Usia Tdk Diketahui)";
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return "(Format Tgl Lahir Salah)";
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    return "(Tgl Lahir Invalid)";
  }

  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return "(Tgl Lahir Invalid)";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} Th` : "(Usia Invalid)";
};

const getVehiclePrefixAndCategory = (jenisKendaraan?: string): { prefix: string; category: string } => {
  if (!jenisKendaraan || typeof jenisKendaraan !== 'string') return { prefix: "Kend. ", category: "Lainnya" };
  const lowerJenis = jenisKendaraan.toLowerCase();

  for (const categoryKey of Object.keys(VEHICLE_DATA)) {
    const currentCategoryData = VEHICLE_DATA[categoryKey as keyof typeof VEHICLE_DATA];
    for (const brandOrSubCategoryKey of Object.keys(currentCategoryData)) {
      const modelsOrTypesArray = currentCategoryData[brandOrSubCategoryKey]; 

      if (categoryKey === "MOBIL" || categoryKey === "MOTOR") {
        if (Array.isArray(modelsOrTypesArray)) {
          for (const modelKey of modelsOrTypesArray) {
            const fullVehicleName = `${brandOrSubCategoryKey} ${modelKey}`;
            if (lowerJenis.includes(fullVehicleName.toLowerCase())) {
              if (categoryKey === "MOBIL") return { prefix: "Mobil Penumpang ", category: "Mobil" };
              if (categoryKey === "MOTOR") return { prefix: "Spd. Motor ", category: "Motor" };
            }
          }
        }
      } else if (categoryKey === "LAINNYA_KENDARAAN") {
        if (Array.isArray(modelsOrTypesArray)) {
          for (const specificType of modelsOrTypesArray) {
            if (lowerJenis.includes(specificType.toLowerCase()) || lowerJenis.includes(brandOrSubCategoryKey.toLowerCase())) {
              if (brandOrSubCategoryKey.toLowerCase().includes("truk")) return { prefix: "Mobil Barang ", category: "Truk" };
              if (brandOrSubCategoryKey.toLowerCase().includes("bus")) return { prefix: "Bus ", category: "Bus" };
              return { prefix: `${brandOrSubCategoryKey.replace(/_/g, ' ')} `, category: brandOrSubCategoryKey };
            }
          }
        }
        if (lowerJenis.includes(brandOrSubCategoryKey.toLowerCase())) {
            if (brandOrSubCategoryKey.toLowerCase().includes("truk")) return { prefix: "Mobil Barang ", category: "Truk" };
            if (brandOrSubCategoryKey.toLowerCase().includes("bus")) return { prefix: "Bus ", category: "Bus" };
            return { prefix: `${brandOrSubCategoryKey.replace(/_/g, ' ')} `, category: brandOrSubCategoryKey };
        }
      }
    }
  }
  if (lowerJenis.includes("motor") || lowerJenis.includes("spd motor") || lowerJenis.includes("sepeda motor")) return { prefix: "Spd. Motor ", category: "Motor" };
  if (lowerJenis.includes("mobil penumpang") || lowerJenis.includes("minibus") || lowerJenis.includes("sedan") || lowerJenis.includes("suv") || lowerJenis.includes("mpv")) return { prefix: "Mobil Penumpang ", category: "Mobil" };
  if (lowerJenis.includes("mobil barang") || lowerJenis.includes("truk") || lowerJenis.includes("truck") || lowerJenis.includes("pick up") || lowerJenis.includes("pickup")) return { prefix: "Mobil Barang ", category: "Truk" };
  if (lowerJenis.includes("bus")) return { prefix: "Bus ", category: "Bus" };
  if (lowerJenis.includes("sepeda")) return { prefix: "Sepeda ", category: "Sepeda" };
  
  return { prefix: "Kend. ", category: "Lainnya" };
};

const angkaKeTerbilangRupiah = (num: number): string => {
  const number = Math.floor(Math.abs(num)); 
  if (number === 0) return "Rp. 0,- (Nol Rupiah)";
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const terbilangRecursive = (n: number): string => {
    if (n < 12) return satuan[n];
    if (n < 20) return satuan[n - 10] + " belas";
    if (n < 100) return satuan[Math.floor(n / 10)] + " puluh" + (n % 10 > 0 ? " " + satuan[n % 10] : "");
    if (n < 200) return "seratus" + (n % 100 > 0 ? " " + terbilangRecursive(n % 100) : "");
    if (n < 1000) return satuan[Math.floor(n / 100)] + " ratus" + (n % 100 > 0 ? " " + terbilangRecursive(n % 100) : "");
    if (n < 2000) return "seribu" + (n % 1000 > 0 ? " " + terbilangRecursive(n % 1000) : "");
    if (n < 1000000) return terbilangRecursive(Math.floor(n / 1000)) + " ribu" + (n % 1000 > 0 ? " " + terbilangRecursive(n % 1000) : "");
    if (n < 1000000000) return terbilangRecursive(Math.floor(n / 1000000)) + " juta" + (n % 1000000 > 0 ? " " + terbilangRecursive(n % 1000000) : "");
    if (n < 1000000000000) return terbilangRecursive(Math.floor(n / 1000000000)) + " miliar" + (n % 1000000000 > 0 ? " " + terbilangRecursive(n % 1000000000) : "");
    return terbilangRecursive(Math.floor(n / 1000000000000)) + " triliun" + (n % 1000000000000 > 0 ? " " + terbilangRecursive(n % 1000000000000) : "");
  };
  let terbilangStr = terbilangRecursive(number);
  terbilangStr = terbilangStr.charAt(0).toUpperCase() + terbilangStr.slice(1);
  const formattedNumber = number.toLocaleString('id-ID');
  return `Rp. ${formattedNumber},- (${terbilangStr} Rupiah)`;
};

const getSuggestionsFromStorage = (fieldKey: string): string[] => {
  try {
    const allSuggestions = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (allSuggestions) {
      const parsed = JSON.parse(allSuggestions);
      return parsed[fieldKey] || [];
    }
  } catch (error) { console.error("Error getting suggestions:", error); }
  return [];
};

const addSuggestionToStorage = (fieldKey: string, value: string) => {
  if (!value || value.trim() === "") return;
  const trimmedValue = value.trim();
  try {
    let allSuggestionsData: { [key: string]: string[] } = {};
    const existingData = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (existingData) allSuggestionsData = JSON.parse(existingData);
    let fieldSuggestions = allSuggestionsData[fieldKey] || [];
    fieldSuggestions = fieldSuggestions.filter(s => s.toLowerCase() !== trimmedValue.toLowerCase());
    fieldSuggestions.unshift(trimmedValue);
    fieldSuggestions = fieldSuggestions.slice(0, MAX_SUGGESTIONS_PER_FIELD);
    allSuggestionsData[fieldKey] = fieldSuggestions;
    localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(allSuggestionsData));
  } catch (error) { console.error("Error adding suggestion:", error); }
};

const formatDateTime = (timestamp: number | string) => {
    if (!timestamp) return 'Belum pernah';
    return new Date(timestamp).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};


const createInitialPelaporInfo = (): PelaporInfo => ({
  namaLengkap: '',
  nomorIdentitas: '',
  alamat: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: null,
  pekerjaan: '',
  agama: '',
  suku: '',
  fotoIdentitasKtp: '',
});


const createInitialReportData = (): AccidentReportData => {
  const currentDate = new Date();
  const currentMonthRoman = toRomanNumeral(currentDate.getMonth() + 1);
  const currentYear = currentDate.getFullYear();
  return {
    id: generateId(),
    lastModified: Date.now(),
    kepada: 'Yth. Dirlantas Polda Jabar.',
    dari: 'Kasat Lantas Polres Tasikmalaya',
    perihal: 'Kecelakaan Lalu Lintas di Wilayah Hukum Polres Tasikmalaya.',
    pelaporInfo: createInitialPelaporInfo(),
    waktuKejadian: '',
    alamatTkp: '',
    narasiAkibatKecelakaan: 'Akibat dari kejadian kecelakaan lalu lintas tersebut,',
    korbanMeninggalDunia: 0,
    korbanLukaBerat: 0,
    korbanLukaRingan: 0,
    kerugianMateriilAngka: 0,
    kerugianMateriilTerbilang: 'Rp. 0,- (Nol Rupiah)',
    uraianPraKejadianManusia: '',
    uraianPraKejadianKendaraan: 'Kendaraan yang terlibat kecelakaan masih standar pabrik bukan modifikasi.',
    uraianPraKejadianJalanLingkungan: '',
    kronologiKejadianUtama: '',
    jenisKecelakaan: '',
    penyebabUtama: '',
    involvedEntities: [],
    pihakTerlibat: [],
    saksiSaksi: [], 
    barangBuktiText: '', 
    tindakanDilakukanText: '1. Menerima Laporan\n2. Mendatangi TKP dan olah TKP\n3. Mencatat saksi-saksi\n4. Mengecek Korban\n5. Mengamankan BB\n6. Membuat LP',
    nomorLaporanPolisi: `LP/B/    /${currentMonthRoman}/${currentYear}/SPKT/POLRES TASIKMALAYA/POLDA JABAR`,
  };
};


const App: React.FC = () => {
  const [view, setView] = useState<'archive' | 'editor'>('archive');
  const [reports, setReports] = useState<AccidentReportData[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const [currentEditingParty, setCurrentEditingParty] = useState<Partial<ExtractedPartyInfo> | null>(null);
  const [editingPartyIndex, setEditingPartyIndex] = useState<number | null>(null);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResultForParty, setOcrResultForParty] = useState<GeminiOcrResult | null>(null);

  const [currentEditingSaksi, setCurrentEditingSaksi] = useState<Partial<SaksiInfo> | null>(null);
  const [editingSaksiIndex, setEditingSaksiIndex] = useState<number | null>(null);
  const [isSaksiModalOpen, setIsSaksiModalOpen] = useState(false);
  const [isLoadingSaksiOcr, setIsLoadingSaksiOcr] = useState(false);
  const [ocrSaksiError, setOcrSaksiError] = useState<string | null>(null);
  
  const [currentEditingPelapor, setCurrentEditingPelapor] = useState<PelaporInfo>(createInitialPelaporInfo());
  const [isPelaporModalOpen, setIsPelaporModalOpen] = useState(false);
  const [isLoadingPelaporOcr, setIsLoadingPelaporOcr] = useState(false);
  const [ocrErrorPelapor, setOcrErrorPelapor] = useState<string | null>(null);
  const [ocrResultForPelapor, setOcrResultForPelapor] = useState<GeminiOcrResult | null>(null);

  const [suggestions, setSuggestions] = useState<ReportSuggestion[]>([]); // Ganti 'any[]' dengan tipe data yang sesuai jika Anda sudah menentukannya
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [currentEditingEntity, setCurrentEditingEntity] = useState<Partial<InvolvedEntity> | null>(null);
  const [editingEntityIndex, setEditingEntityIndex] = useState<number | null>(null);

  const [generatedReportText, setGeneratedReportText] = useState<string>('');
  const [showReportText, setShowReportText] = useState<boolean>(false);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const [isJalanLingkunganAutoGenerated, setIsJalanLingkunganAutoGenerated] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isPrintLpModalOpen, setIsPrintLpModalOpen] = useState(false);
  const [selectedSpktOfficerName, setSelectedSpktOfficerName] = useState(SPKT_OFFICERS[0].nama);
  const [selectedReportingOfficerName, setSelectedReportingOfficerName] = useState(REPORTING_OFFICERS[0].nama);

  const activeReport = useMemo(() => reports.find(r => r.id === activeReportId), [reports, activeReportId]);

  const selectedSpktOfficerDetails = useMemo(() => {
    return SPKT_OFFICERS.find(officer => officer.nama === selectedSpktOfficerName);
  }, [selectedSpktOfficerName]);

  const selectedReportingOfficerDetails = useMemo(() => {
    return REPORTING_OFFICERS.find(officer => officer.nama === selectedReportingOfficerName);
  }, [selectedReportingOfficerName]);


  const showToast = useCallback((message: string, type: ToastMessage['type']) => {
    const id = generateId();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  useEffect(() => {
    const offlineIndicatorElement = document.getElementById('offline-indicator');
    const handleOnline = () => { setIsOffline(false); if (offlineIndicatorElement) offlineIndicatorElement.style.display = 'none'; };
    const handleOffline = () => { setIsOffline(true); if (offlineIndicatorElement) offlineIndicatorElement.style.display = 'block'; showToast("Anda sedang offline. Beberapa fitur mungkin terbatas.", "warning");};
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) handleOnline(); else handleOffline();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [showToast]);

  // Load reports from storage on mount
  useEffect(() => {
    try {
        const savedReportsString = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        if (savedReportsString) {
            const savedReports = JSON.parse(savedReportsString);
            setReports(savedReports);
        }
    } catch (error) {
        console.error("Failed to load reports from storage:", error);
        showToast("Gagal memuat arsip laporan.", "error");
    }
  }, [showToast]);

  // Save reports to storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
      console.error("Failed to save reports to storage:", error);
      showToast("Gagal menyimpan perubahan ke arsip.", "error");
    }
  }, [reports, showToast]);

  // Helper to update the currently active report
  const updateActiveReport = useCallback((updater: (draft: AccidentReportData) => Partial<AccidentReportData> | AccidentReportData) => {
      setReports(prevReports =>
          prevReports.map(report => {
              if (report.id === activeReportId) {
                  const updatedPart = updater(report);
                  return { ...report, ...updatedPart, lastModified: Date.now() };
              }
              return report;
          })
      );
  }, [activeReportId]);

  useEffect(() => {
    if (!activeReport) return;
    const newTerbilang = angkaKeTerbilangRupiah(activeReport.kerugianMateriilAngka);
    if (newTerbilang !== activeReport.kerugianMateriilTerbilang) {
      updateActiveReport(() => ({ kerugianMateriilTerbilang: newTerbilang }));
    }
  }, [activeReport?.kerugianMateriilAngka, updateActiveReport]);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      showToast("Kunci API Gemini tidak ditemukan. Fitur Scan Otomatis tidak akan berfungsi.", "error");
    }
  }, [showToast]);
  
  const ocrDisabled = useMemo(() => apiKeyMissing || isOffline, [apiKeyMissing, isOffline]);
  const ocrDisabledMessage = useMemo(() => {
    if (apiKeyMissing && isOffline) return "Fitur Scan Otomatis tidak tersedia: Kunci API hilang & Anda sedang offline.";
    if (apiKeyMissing) return "Fitur Scan Otomatis tidak tersedia: Kunci API hilang.";
    if (isOffline) return "Fitur Scan Otomatis tidak tersedia: Anda sedang offline.";
    return "";
  }, [apiKeyMissing, isOffline]);

  useEffect(() => {
    if (!activeReport) return;
    const { waktuKejadian, alamatTkp, uraianPraKejadianManusia, narasiAkibatKecelakaan } = activeReport;
    let constructedKronologi = ""; let waktuFormatted = "";
    if (waktuKejadian) {
        try {
            const date = new Date(waktuKejadian);
            const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
            const month = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const year = new Intl.DateTimeFormat('id-ID', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
            const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(date);
            waktuFormatted = `Pada Hari ${dayName} Tanggal ${day} ${month} ${year} sekitar pukul ${time} WIB`;
        } catch (e) { waktuFormatted = `Pada waktu ${waktuKejadian || '(belum diisi)'}`; }
    }
    let part1 = "";
    if (waktuFormatted || alamatTkp) {
        const lokasiText = alamatTkp ? `di ${alamatTkp}` : '(lokasi TKP belum diisi)';
        part1 = `${waktuFormatted ? waktuFormatted : 'Pada waktu yang tidak ditentukan'}, ${lokasiText},`;
    }
    let part2 = uraianPraKejadianManusia ? `${uraianPraKejadianManusia}.` : (part1 ? `(uraian manusia belum diisi).` : "");
    let part3 = (narasiAkibatKecelakaan && narasiAkibatKecelakaan.trim()) ? narasiAkibatKecelakaan.trim() : "";
    constructedKronologi = [part1, part2, part3].filter(Boolean).join(' ').trim();
    const initialNarasiDefault = createInitialReportData().narasiAkibatKecelakaan;
    const hasMeaningfulSourceData = waktuKejadian || alamatTkp || uraianPraKejadianManusia || (narasiAkibatKecelakaan && narasiAkibatKecelakaan !== initialNarasiDefault);
    if (hasMeaningfulSourceData || constructedKronologi !== "") {
        if (constructedKronologi !== activeReport.kronologiKejadianUtama) {
            updateActiveReport(() => ({ kronologiKejadianUtama: constructedKronologi }));
        }
    } else {
        if (activeReport.kronologiKejadianUtama !== "") {
            updateActiveReport(() => ({ kronologiKejadianUtama: "" }));
        }
    }
  }, [activeReport?.waktuKejadian, activeReport?.alamatTkp, activeReport?.uraianPraKejadianManusia, activeReport?.narasiAkibatKecelakaan, updateActiveReport]);

  useEffect(() => {
    if (!activeReport || !activeReport.waktuKejadian) return;
    try {
        const date = new Date(activeReport.waktuKejadian);
        if (isNaN(date.getTime())) return;
        const newMonth = date.getMonth() + 1; const newYear = date.getFullYear();
        const newMonthRoman = toRomanNumeral(newMonth);
        const lpParts = activeReport.nomorLaporanPolisi.split('/');
        const currentSerial = lpParts[2]?.trim(); 
        if (lpParts.length >= 5 && (lpParts[3] !== newMonthRoman || lpParts[4] !== String(newYear))) {
            const newLpNumber = `LP/B/${currentSerial || '   '}/${newMonthRoman}/${newYear}/${lpParts.slice(5).join('/')}`;
            if (activeReport.nomorLaporanPolisi !== newLpNumber) {
              updateActiveReport(() => ({ nomorLaporanPolisi: newLpNumber }));
            }
        }
      } catch (e) { console.warn("Could not parse 'Waktu Kejadian' for LP number:", e); }
  }, [activeReport?.waktuKejadian, updateActiveReport]);

  useEffect(() => {
    if (!activeReport || !isJalanLingkunganAutoGenerated || !activeReport.id) return; 
    if (!activeReport.waktuKejadian) {
      updateActiveReport(() => ({ uraianPraKejadianJalanLingkungan: "" })); return;
    }
    try {
      const date = new Date(activeReport.waktuKejadian);
      if (isNaN(date.getTime())) {
        updateActiveReport(() => ({ uraianPraKejadianJalanLingkungan: "Format waktu kejadian tidak valid." })); return;
      }
      const hour = date.getHours(); let kondisiCuaca = ""; let kondisiWaktuHari = "";
      const baseDescription = "keadaan jalan lurus, arus lalu-lintas sedang dan di sekitar TKP terdapat Pemukiman Penduduk.";
      if (hour >= 6 && hour < 11) { kondisiCuaca = "terang"; kondisiWaktuHari = "pagi hari"; } 
      else if (hour >= 11 && hour < 15) { kondisiCuaca = "terang"; kondisiWaktuHari = "siang hari"; } 
      else if (hour >= 15 && hour < 18) { kondisiCuaca = "terang"; kondisiWaktuHari = "sore hari"; } 
      else { kondisiCuaca = "gelap"; kondisiWaktuHari = "malam hari"; }
      const dynamicText = `Cuaca ${kondisiCuaca}, ${kondisiWaktuHari}, ${baseDescription}`;
      if (dynamicText !== activeReport.uraianPraKejadianJalanLingkungan) {
        updateActiveReport(() => ({ uraianPraKejadianJalanLingkungan: dynamicText }));
      }
    } catch (e) {
      console.warn("Error processing waktu for JalanLingkungan:", e);
      updateActiveReport(() => ({ uraianPraKejadianJalanLingkungan: "Gagal memproses waktu." }));
    }
  }, [activeReport?.waktuKejadian, isJalanLingkunganAutoGenerated, activeReport?.id, updateActiveReport]);

  useEffect(() => {
    if (!activeReport) return;
    const counts = { md: 0, lb: 0, lr: 0 };

    activeReport.pihakTerlibat.forEach(pihak => {
      switch (pihak.tingkatLuka) {
        case 'MD': counts.md++; break;
        case 'LB': counts.lb++; break;
        case 'LR': counts.lr++; break;
        default: break;
      }
    });

    if (
      counts.md !== activeReport.korbanMeninggalDunia ||
      counts.lb !== activeReport.korbanLukaBerat ||
      counts.lr !== activeReport.korbanLukaRingan
    ) {
      updateActiveReport(() => ({
        korbanMeninggalDunia: counts.md,
        korbanLukaBerat: counts.lb,
        korbanLukaRingan: counts.lr,
      }));
    }
  }, [activeReport?.pihakTerlibat, updateActiveReport]);
  
  // useEffect untuk memanggil API saran dengan debouncing
  useEffect(() => {
    const praKejadianText = activeReport?.uraianPraKejadianManusia || '';

    if (praKejadianText.length < 10 || isOffline) {
      setSuggestions([]);
      return;
    }

    setIsFetchingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('https://namapengguna.pythonanywhere.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ praKejadianText: praKejadianText }),
        });

        if (!response.ok) {
          let errorMessage = `Gagal mendapatkan saran: ${response.statusText}`;
          try {
            const errorData = await response.json();
            const potentialMessage = errorData.error || errorData.message;
            if (typeof potentialMessage === 'string') {
                errorMessage = potentialMessage;
            }
          } catch (e) { /* Not a JSON response */ }
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        setSuggestions(result.suggestions || []);
        
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Do not show toast for this as it's a background suggestion feature
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 500); // Debounce selama 500ms

    return () => clearTimeout(timer); // Membersihkan timer sebelumnya
  }, [activeReport?.uraianPraKejadianManusia, isOffline]); // Perhatikan: ini harus memantau uraianPraKejadianManusia dari activeReport!
  
  // Handlers for switching views and managing reports
    const handleCreateReport = () => {
        const newReport = createInitialReportData();
        setReports(prev => [newReport, ...prev]);
        setActiveReportId(newReport.id);
        setView('editor');
        showToast("Laporan baru telah dibuat.", "success");
    };

    const handleSelectReport = (id: string) => {
        const jalanLingkunganFlag = localStorage.getItem(`${JALAN_LINGKUNGAN_MANUALLY_EDITED_FLAG}${id}`);
        setIsJalanLingkunganAutoGenerated(jalanLingkunganFlag !== 'true');
        setActiveReportId(id);
        setView('editor');
    };

    const handleDeleteReport = (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini secara permanen?")) {
            setReports(prev => prev.filter(r => r.id !== id));
            showToast("Laporan telah dihapus.", "info");
        }
    };

    const handleGoBackToArchive = () => {
        const flagKey = `${JALAN_LINGKUNGAN_MANUALLY_EDITED_FLAG}${activeReportId}`;
        localStorage.setItem(flagKey, String(!isJalanLingkunganAutoGenerated));
        
        setActiveReportId(null);
        setView('archive');
        setShowReportText(false);
        setGeneratedReportText('');
    };

   const handleSuggestionClick = useCallback((suggestion: ReportSuggestion) => {
    if (!activeReportId) return;

    updateActiveReport(() => ({
        jenisKecelakaan: suggestion.suggested_jenis_kecelakaan,
        penyebabUtama: suggestion.suggested_penyebab_utama,
    }));

    setSuggestions([]);
}, [activeReportId, updateActiveReport]);

  const handleOpenPelaporModal = () => {
    if (!activeReport) return;
    setCurrentEditingPelapor(activeReport.pelaporInfo || createInitialPelaporInfo());
    setOcrErrorPelapor(null);
    setOcrResultForPelapor(null);
    setIsPelaporModalOpen(true);
  };

  const handlePelaporDataChange = useCallback((field: keyof PelaporInfo, value: string | null) => {
    setCurrentEditingPelapor(prev => ({ ...prev, [field]: value === null && field === 'jenisKelamin' ? null : (value || '') }));
  }, []);
  
  const handleImageSelectedForPelapor = useCallback((file: File) => {
    if (ocrDisabled) {
        setOcrErrorPelapor(ocrDisabledMessage + " Mohon isi data secara manual.");
        showToast(ocrDisabledMessage + " Input manual.", "warning");
        return;
    }
    setOcrErrorPelapor(null); setOcrResultForPelapor(null);
    processImageWithOcrForPelapor(file);
  }, [ocrDisabled, ocrDisabledMessage, showToast]); 

  const processImageWithOcrForPelapor = useCallback(async (file: File) => {
    if (!file || ocrDisabled) return;
    setIsLoadingPelaporOcr(true); setOcrErrorPelapor(null); setOcrResultForPelapor(null);
    try {
      const ocrScanResult: GeminiOcrResult | null = await extractInfoFromDocument(file);
      if (ocrScanResult) {
        setOcrResultForPelapor(ocrScanResult);
        if (ocrScanResult.documentType === 'KTP' || !ocrScanResult.documentType) { 
            setCurrentEditingPelapor(prev => ({
                ...prev,
                namaLengkap: ocrScanResult.namaLengkap || prev.namaLengkap,
                nomorIdentitas: ocrScanResult.nomorIdentitas || prev.nomorIdentitas,
                alamat: ocrScanResult.alamat || prev.alamat,
                tempatLahir: ocrScanResult.tempatLahir || prev.tempatLahir,
                tanggalLahir: ocrScanResult.tanggalLahir || prev.tanggalLahir,
                jenisKelamin: ocrScanResult.jenisKelamin || prev.jenisKelamin,
                pekerjaan: ocrScanResult.pekerjaan || prev.pekerjaan,
                agama: ocrScanResult.agama || prev.agama,
                fotoIdentitasKtp: URL.createObjectURL(file),
            }));
            showToast("Data KTP Pelapor berhasil dibaca!", "success");
        } else {
            setCurrentEditingPelapor(prev => ({
                ...prev, 
                namaLengkap: ocrScanResult.namaLengkap || prev.namaLengkap,
                nomorIdentitas: ocrScanResult.nomorIdentitas || prev.nomorIdentitas, 
                alamat: ocrScanResult.alamat || prev.alamat,
                tempatLahir: ocrScanResult.tempatLahir || prev.tempatLahir,
                tanggalLahir: ocrScanResult.tanggalLahir || prev.tanggalLahir,
                jenisKelamin: ocrScanResult.jenisKelamin || prev.jenisKelamin,
                pekerjaan: ocrScanResult.pekerjaan || prev.pekerjaan,
                agama: ocrScanResult.agama || prev.agama,
                fotoIdentitasKtp: URL.createObjectURL(file),
            }));
            showToast(`Dokumen Pelapor terbaca sebagai ${ocrScanResult.documentType}. Pastikan data sesuai.`, "warning");
        }
      } else {
        setOcrErrorPelapor("Tidak ada data pelapor yang berhasil diekstrak. Mohon coba lagi atau isi manual.");
        showToast("OCR tidak menemukan data pelapor.", "warning");
      }
    } catch (error) {
      console.error("Pelapor OCR Error:", error);
      let errorMessage = "Gagal memproses gambar KTP Pelapor. ";
      if (error instanceof Error) {
        if (error.message.includes("Offline") || error.message.includes("NetworkError")) errorMessage += "Anda sedang offline.";
        else if (error.message.includes("API client is not initialized")) { errorMessage += "Kunci API tidak terinisialisasi."; setApiKeyMissing(true); }
        else errorMessage += `Detail: ${error.message.substring(0,100)}`;
      } else errorMessage += "Terjadi kesalahan tidak dikenal.";
      setOcrErrorPelapor(errorMessage); showToast(errorMessage, "error");
    } finally { setIsLoadingPelaporOcr(false); }
  }, [ocrDisabled, showToast]);

  const handleSavePelapor = () => {
    if (!currentEditingPelapor.namaLengkap || !currentEditingPelapor.nomorIdentitas) {
      setOcrErrorPelapor("Nama lengkap dan NIK Pelapor wajib diisi.");
      showToast("Nama dan NIK pelapor wajib diisi.", "error");
      return;
    }
    updateActiveReport(() => ({ pelaporInfo: { ...currentEditingPelapor } }));
    setIsPelaporModalOpen(false);
    showToast("Data Pelapor berhasil disimpan.", "success");
  };


  const handleImageSelectedForParty = useCallback((file: File) => {
    if (ocrDisabled) {
        setOcrError(ocrDisabledMessage + " Mohon isi data secara manual.");
        showToast(ocrDisabledMessage + " Input manual.", "warning");
        return;
    }
    setOcrError(null); setOcrResultForParty(null); 
    if (currentEditingParty) processImageWithOcrForParty(file);
  }, [currentEditingParty, ocrDisabled, ocrDisabledMessage, showToast]); 

  const processImageWithOcrForParty = useCallback(async (file: File) => {
    if (!file || ocrDisabled) return;
    setIsLoadingOcr(true); setOcrError(null); setOcrResultForParty(null); 
    try {
      const ocrScanResult: GeminiOcrResult | null = await extractInfoFromDocument(file);
      if (ocrScanResult) {
        setOcrResultForParty(ocrScanResult); 
        
        if (ocrScanResult.documentType === 'STNK') {
           showToast("STNK terdeteksi. Silakan tambahkan kendaraan ini di bagian 'Kendaraan Terlibat', lalu kaitkan dengan pihak ini.", "info");
        }

        setCurrentEditingParty(prev => {
          const basePartyData: Partial<ExtractedPartyInfo> = { 
            ...prev, fotoIdentitas: URL.createObjectURL(file),
            tempatLahir: ocrScanResult.tempatLahir || prev?.tempatLahir || '',
            jenisKelamin: ocrScanResult.jenisKelamin || prev?.jenisKelamin || null,
          };

          if (ocrScanResult.documentType === 'KK') {
            return { ...basePartyData, namaLengkap: ocrScanResult.namaLengkap || '', nomorIdentitas: ocrScanResult.nomorIdentitas || '',
              alamat: ocrScanResult.alamatKartuKeluarga || ocrScanResult.alamat || '', tanggalLahir: ocrScanResult.tanggalLahir || '',
              pekerjaan: ocrScanResult.pekerjaan || '',
            };
          } else { // KTP, SIM, or other
            return { ...basePartyData, namaLengkap: ocrScanResult.namaLengkap || '', nomorIdentitas: ocrScanResult.nomorIdentitas || '',
              alamat: ocrScanResult.alamat || '', tanggalLahir: ocrScanResult.tanggalLahir || '',
              pekerjaan: ocrScanResult.pekerjaan || '',
            };
          }
        });
        showToast("Data berhasil dibaca dari gambar!", "success");
      } else {
        setOcrError("Tidak ada data pihak yang berhasil diekstrak. Mohon coba lagi atau isi manual.");
        showToast("OCR tidak menemukan data pihak.", "warning");
      }
    } catch (error) {
      console.error("Party OCR Error:", error);
      let errorMessage = "Gagal memproses gambar pihak. ";
      if (error instanceof Error) {
        if (error.message.includes("Offline") || error.message.includes("NetworkError")) errorMessage += "Anda sedang offline.";
        else if (error.message.includes("API client is not initialized")) { errorMessage += "Kunci API tidak terinisialisasi."; setApiKeyMissing(true); }
        else errorMessage += `Detail: ${error.message.substring(0,100)}`;
      } else errorMessage += "Terjadi kesalahan tidak dikenal.";
      setOcrError(errorMessage); showToast(errorMessage, "error");
    } finally { setIsLoadingOcr(false); }
  }, [ocrDisabled, showToast]); 

  const handleKkMemberSelect = (memberIndex: number) => {
    if (ocrResultForParty && ocrResultForParty.documentType === 'KK' && ocrResultForParty.familyMembers) {
        const selectedMember = ocrResultForParty.familyMembers[memberIndex];
        if (selectedMember) {
            setCurrentEditingParty(prev => ({
                ...prev, namaLengkap: selectedMember.namaLengkap || '', nomorIdentitas: selectedMember.nomorIdentitas || '',
                alamat: selectedMember.alamat || ocrResultForParty.alamatKartuKeluarga || ocrResultForParty.alamat || '',
                tempatLahir: selectedMember.tempatLahir || '', tanggalLahir: selectedMember.tanggalLahir || '',
                jenisKelamin: selectedMember.jenisKelamin || null, pekerjaan: selectedMember.pekerjaan || '',
            }));
        }
    }
  };

  const handleOpenAddPartyModal = () => {
    setCurrentEditingParty({ id: generateId(), peran: 'Pengemudi', namaLengkap: '', nomorIdentitas: '', alamat: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: null, pekerjaan: '', involvedEntityId: null, tingkatLuka: 'MATERI', didugaTersangka: false }); 
    setEditingPartyIndex(null); setOcrError(null); setOcrResultForParty(null); setIsPartyModalOpen(true);
  };

  const handleOpenEditPartyModal = (party: ExtractedPartyInfo, index: number) => {
    setCurrentEditingParty({ ...party }); setEditingPartyIndex(index);
    setOcrError(null); setOcrResultForParty(null); setIsPartyModalOpen(true);
  };
  
  const handlePartyDataChange = useCallback((field: keyof ExtractedPartyInfo, value: string | null | boolean) => {
    setCurrentEditingParty(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleSaveParty = () => {
    if (!currentEditingParty || !currentEditingParty.namaLengkap) { setOcrError("Nama lengkap pihak terlibat wajib diisi."); showToast("Nama pihak wajib diisi.", "error"); return; }
    if (!currentEditingParty.peran) { setOcrError("Peran pihak terlibat wajib dipilih."); showToast("Peran pihak wajib dipilih.", "error"); return; }
    const partyToSave = { ...currentEditingParty, id: currentEditingParty.id || generateId() } as ExtractedPartyInfo;
    
    updateActiveReport(draft => {
        const newPihakTerlibat = [...draft.pihakTerlibat];
        if (editingPartyIndex !== null) {
            newPihakTerlibat[editingPartyIndex] = partyToSave;
        } else {
            newPihakTerlibat.push(partyToSave);
        }
        return { pihakTerlibat: newPihakTerlibat };
    });

    setIsPartyModalOpen(false); setCurrentEditingParty(null); setEditingPartyIndex(null); setOcrResultForParty(null);
    showToast("Data pihak berhasil disimpan.", "success");
  };

  const handleDeleteParty = (index: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pihak ini?")) {
      updateActiveReport(draft => ({
          pihakTerlibat: draft.pihakTerlibat.filter((_, i) => i !== index)
      }));
      showToast("Data pihak berhasil dihapus.", "info");
    }
  };

  const handleImageSelectedForSaksi = useCallback((file: File) => {
    if (ocrDisabled) {
        setOcrSaksiError(ocrDisabledMessage + " Mohon isi data secara manual.");
        showToast(ocrDisabledMessage + " Input manual.", "warning"); return;
    }
    setOcrSaksiError(null); if (currentEditingSaksi) processImageWithOcrForSaksi(file);
  }, [currentEditingSaksi, ocrDisabled, ocrDisabledMessage, showToast]); // Added processImageWithOcrForSaksi dependency

  const processImageWithOcrForSaksi = useCallback(async (file: File) => {
    if (!file || !currentEditingSaksi || ocrDisabled) return;
    setIsLoadingSaksiOcr(true); setOcrSaksiError(null);
    try {
      const extractedData: GeminiExtractedSaksiData | null = await extractSaksiInfoFromDocument(file);
      if (extractedData) {
        setCurrentEditingSaksi(prev => ({
          ...prev, namaLengkap: extractedData.namaLengkap || prev?.namaLengkap || '',
          nomorIdentitas: extractedData.nomorIdentitas || prev?.nomorIdentitas || '',
          alamat: extractedData.alamat || prev?.alamat || '', tempatLahir: extractedData.tempatLahir || prev?.tempatLahir || '',
          tanggalLahir: extractedData.tanggalLahir || prev?.tanggalLahir || '', jenisKelamin: extractedData.jenisKelamin || prev?.jenisKelamin || null,
          pekerjaan: extractedData.pekerjaan || prev?.pekerjaan || '',
          umurString: extractedData.tanggalLahir ? calculateAge(extractedData.tanggalLahir) : (prev?.umurString || ''),
          fotoIdentitasSaksi: URL.createObjectURL(file) 
        }));
        showToast("Data saksi berhasil dibaca dari gambar!", "success");
      } else {
        setOcrSaksiError("Tidak ada data saksi yang berhasil diekstrak. Mohon coba lagi atau isi manual.");
        showToast("OCR tidak menemukan data saksi.", "warning");
      }
    } catch (error) {
      console.error("Saksi OCR Error:", error);
      let errorMessage = "Gagal memproses gambar saksi. ";
      if (error instanceof Error) {
        if (error.message.includes("Offline") || error.message.includes("NetworkError")) errorMessage += "Anda sedang offline.";
        else if (error.message.includes("API client is not initialized")) { errorMessage += "Kunci API tidak terinisialisasi."; setApiKeyMissing(true); }
        else errorMessage += `Detail: ${error.message.substring(0,100)}`;
      } else errorMessage += "Terjadi kesalahan tidak dikenal.";
      setOcrSaksiError(errorMessage); showToast(errorMessage, "error");
    } finally { setIsLoadingSaksiOcr(false); }
  }, [currentEditingSaksi, ocrDisabled, showToast]);

  const handleOpenAddSaksiModal = () => {
    setCurrentEditingSaksi({ id: generateId(), namaLengkap: '', alamat: '', pekerjaan: '', umurString: '', keteranganSaksi: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: null });
    setEditingSaksiIndex(null); setOcrSaksiError(null); setIsSaksiModalOpen(true);
  };

  const handleOpenEditSaksiModal = (saksi: SaksiInfo, index: number) => {
    setCurrentEditingSaksi({ ...saksi }); setEditingSaksiIndex(index);
    setOcrSaksiError(null); setIsSaksiModalOpen(true);
  };

  const handleSaksiDataChange = useCallback((field: keyof SaksiInfo, value: string | null) => {
    setCurrentEditingSaksi(prev => {
      if (!prev) return null;
      const updatedSaksi = { ...prev, [field]: value };
      if (field === 'tanggalLahir' && typeof value === 'string') updatedSaksi.umurString = calculateAge(value);
      return updatedSaksi;
    });
  }, []);
  
  const handleSaveSaksi = () => {
    if (!currentEditingSaksi || !currentEditingSaksi.namaLengkap) { setOcrSaksiError("Nama lengkap saksi wajib diisi."); showToast("Nama saksi wajib diisi.", "error"); return; }
    if (!currentEditingSaksi.umurString && !currentEditingSaksi.tanggalLahir) { setOcrSaksiError("Umur atau Tanggal Lahir saksi wajib diisi."); showToast("Umur/Tgl Lahir saksi wajib diisi.", "error"); return; }
    if (!currentEditingSaksi.keteranganSaksi) { setOcrSaksiError("Keterangan saksi wajib diisi."); showToast("Keterangan saksi wajib diisi.", "error"); return; }
    const saksiToSave = { ...currentEditingSaksi, id: currentEditingSaksi.id || generateId() } as SaksiInfo;
    if (!saksiToSave.umurString && saksiToSave.tanggalLahir) saksiToSave.umurString = calculateAge(saksiToSave.tanggalLahir);
    
    updateActiveReport(draft => {
        const newSaksiSaksi = [...draft.saksiSaksi];
        if (editingSaksiIndex !== null) {
            newSaksiSaksi[editingSaksiIndex] = saksiToSave;
        } else {
            newSaksiSaksi.push(saksiToSave);
        }
        return { saksiSaksi: newSaksiSaksi };
    });

    setIsSaksiModalOpen(false); setCurrentEditingSaksi(null); setEditingSaksiIndex(null);
    showToast("Data saksi berhasil disimpan.", "success");
  };

  const handleDeleteSaksi = (index: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus saksi ini?")) {
      updateActiveReport(draft => ({
          saksiSaksi: draft.saksiSaksi.filter((_, i) => i !== index)
      }));
      showToast("Data saksi berhasil dihapus.", "info");
    }
  };

  const handleGeneralReportDataChange = useCallback((field: keyof AccidentReportData, value: string | number) => {
    if (field === 'uraianPraKejadianJalanLingkungan') setIsJalanLingkunganAutoGenerated(false); 
    const finalValue = (field === 'kerugianMateriilAngka' && typeof value === 'string' ? (parseInt(value, 10) || 0) : value);
    updateActiveReport(() => ({ [field]: finalValue }));
  }, [updateActiveReport]);

  const generateReport = () => {
    if (!activeReport) return;
    // 1. Header
    let text = `Assalamu'alaikum wr. wb.\n\n`;
    text += `Kepada :\n${activeReport.kepada}\n\n`;
    text += `Dari :\n${activeReport.dari}\n\n`;
    text += `Perihal :\n${activeReport.perihal}\n\n`;

    // 2. Waktu Kejadian
    text += `Waktu Kejadian:\n`;
    let waktuFormatted = '(Belum diisi)';
    if (activeReport.waktuKejadian) {
        try {
            const date = new Date(activeReport.waktuKejadian);
            const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
            const month = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const year = new Intl.DateTimeFormat('id-ID', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
            const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(date);
            waktuFormatted = `Pada Hari ${dayName} Tanggal ${day} ${month} ${year} sekitar pukul ${time} WIB`;
        } catch (e) { waktuFormatted = activeReport.waktuKejadian; }
    }
    text += `${waktuFormatted}\n\n`;

    // 3. TKP
    text += `TKP :\n${activeReport.alamatTkp || '(Belum diisi)'}\n\n`;

    // 4. Kendaraan Yang Terlibat
    text += `Kendaraan Yang Terlibat:\n`;
    const vehiclesInvolved = activeReport.involvedEntities.filter(e => e.type === 'Kendaraan') as InvolvedVehicle[];
    const pedestriansInvolved = activeReport.involvedEntities.filter(e => e.type === 'Pejalan Kaki');
    if (vehiclesInvolved.length > 0) {
        vehiclesInvolved.forEach(v => {
            const { prefix: vehiclePrefix } = getVehiclePrefixAndCategory(v.jenisKendaraan);
            text += `- Kendaraan ${vehiclePrefix}${v.jenisKendaraan} TNKB ${v.nomorPolisi || '(NoPol?)'}.\n`;
        });
    }
    if (pedestriansInvolved.length > 0) {
        text += `- Pejalan Kaki.\n`;
    }
    if (vehiclesInvolved.length === 0 && pedestriansInvolved.length === 0) {
        text += `(Tidak ada data kendaraan atau pejalan kaki yang terlibat)\n`;
    }
    text += `\n`;

    // 5. Akibat Kecelakaan
    text += `Akibat Kecelakaan:\n`;
    const initialNarasiDefault = createInitialReportData().narasiAkibatKecelakaan;
    let narasiTextToDisplay = activeReport.narasiAkibatKecelakaan.trim();
    if (narasiTextToDisplay === "" || narasiTextToDisplay.startsWith(initialNarasiDefault)) {
        text += `${narasiTextToDisplay || '(Mohon lengkapi atau sesuaikan narasi akibat kecelakaan ini).'}\n`;
    } else {
        text += `${narasiTextToDisplay}\n`;
    }
    text += `Kerugian Materiil : ${activeReport.kerugianMateriilTerbilang || 'Rp. 0,- (Nol Rupiah)'}\n`;
    text += `Korban Meninggal Dunia (MD) : ${activeReport.korbanMeninggalDunia} Orang\n`;
    text += `Korban Luka Berat (LB) : ${activeReport.korbanLukaBerat} Orang\n`;
    text += `Korban Luka Ringan (LR) : ${activeReport.korbanLukaRingan} Orang\n\n`;

    // 6. I. Pra Kejadian
    text += `I. Pra Kejadian\n`;
    text += `a. Manusia\n${activeReport.uraianPraKejadianManusia || '(Belum diisi)'}\n\n`;
    text += `b. Kendaraan\n${activeReport.uraianPraKejadianKendaraan || '(Belum diisi)'}\n\n`;
    text += `c. Jalan & Lingkungan\n${activeReport.uraianPraKejadianJalanLingkungan || '(Belum diisi atau menunggu waktu kejadian diisi)'}\n\n`;
    
    // 7. II. Kronologis Kejadian
    text += `II. Kronologis Kejadian\n`;
    text += `${activeReport.kronologiKejadianUtama || '(Belum diisi)'}\n\n`;
    
    // 8. III. Pasca Kejadian (Data Pihak Terlibat)
    text += `III. Pasca Kejadian (Data Pihak Terlibat)\n`;
    if (activeReport.pihakTerlibat.length === 0) {
        text += `(Tidak ada data pihak terlibat)\n`;
    } else {
        activeReport.pihakTerlibat.forEach((pihak) => {
            const linkedEntity = activeReport.involvedEntities.find(e => e.id === pihak.involvedEntityId);
            let peranText = pihak.peran || '(Peran?)';
            if (peranText === 'Pengemudi') peranText = 'Pengendara';
            let peranDisplay = peranText;
            
            if (linkedEntity && linkedEntity.type === 'Kendaraan') {
                 const { prefix: vp } = getVehiclePrefixAndCategory(linkedEntity.jenisKendaraan);
                 const baseVehicleText = `Kend. ${vp}${linkedEntity.jenisKendaraan} TNKB ${linkedEntity.nomorPolisi || '(NoPol?)'}`;
                 peranDisplay = `${peranText} ${baseVehicleText}`;
            } else if (pihak.peran === 'Pejalan Kaki') {
                peranDisplay = 'Pejalan Kaki';
            }

            const umurP = pihak.tanggalLahir ? calculateAge(pihak.tanggalLahir) : '(Usia Tdk Diketahui)';
            
            text += `- ${peranDisplay} : Sdr/i. ${pihak.namaLengkap || '(Nama Belum Diisi)'}, ${umurP}, ${pihak.pekerjaan || '(Pekerjaan Belum Diisi)'}, Alamat ${pihak.alamat || '(Alamat Belum Diisi)'}.\n`;
        });
    }
    text += `\n`;

    // 9. IV. Saksi – saksi
    text += `IV. Saksi – saksi :\n`;
    if (activeReport.saksiSaksi.length === 0) {
        text += `(Tidak ada data saksi)\n`;
    } else {
      activeReport.saksiSaksi.forEach((saksi, index) => {
        const umurS = saksi.tanggalLahir ? calculateAge(saksi.tanggalLahir) : (saksi.umurString || '(Usia Tdk Diketahui)');
        text += `${index + 1}. Sdr/i. ${saksi.namaLengkap || '(Nama Belum Diisi)'}, ${umurS}, ${saksi.pekerjaan || '(Pekerjaan Belum Diisi)'}, Alamat ${saksi.alamat || '(Alamat Belum Diisi)'}.\n`;
      });
    }
    text += `\n`;
    
    // 10. V. Barang Bukti
    text += `V. Barang Bukti :\n`;
    const bbList: string[] = [];
    vehiclesInvolved.forEach(v => {
        const { prefix: vehiclePrefixBB } = getVehiclePrefixAndCategory(v.jenisKendaraan);
        bbList.push(`- 1 Unit Kendaraan ${vehiclePrefixBB}${v.jenisKendaraan}${v.nomorPolisi ? ` TNKB ${v.nomorPolisi}` : ''}.`);
    });
    if (activeReport.barangBuktiText) {
        activeReport.barangBuktiText.split('\n').filter(l => l.trim() !== '').forEach(item => bbList.push(item.startsWith('- ') ? item : `- ${item}`));
    }
    text += bbList.length > 0 ? bbList.join('\n') + `\n` : `(Tidak ada data barang bukti)\n`;
    text += `\n`;

    // 11. VI. Tindakan yang dilakukan
    text += `VI. Tindakan yang dilakukan:\n`;
    text += `${activeReport.tindakanDilakukanText ? activeReport.tindakanDilakukanText.split('\n').map((s,i) => `${i+1}. ${s.replace(/^\d+\.\s*/, '').replace(/^- /, '')}`).join('\n') : '(Belum diisi)'}\n\n`;

    // 12. Footer
    const reportDate = new Date();
    const formattedReportDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(reportDate);
    text += `Nomor LP: ${activeReport.nomorLaporanPolisi || '(Belum diisi)'}, Tanggal ${formattedReportDate}\n`;
    text += `Demikian dilaporkan.\n\n`;
    text += `Hormat kami,\nKasat Lantas Polres Tasikmalaya\n\n`;
    text += `AKP H. AJAT SUDRAJAT\n\n`;
    text += `Tembusan:\n`;
    text += `1. Wadir Lantas Polda Jabar.\n`;
    text += `2. Kabag Binopsnal Ditlantas Polda Jabar.\n`;
    text += `3. Kasubdit Gakkum Ditlantas Polda Jabar.\n`;

    setGeneratedReportText(text);
    setShowReportText(true);
    showToast("Teks laporan singkat berhasil dibuat.", "success");
  };

  const copyReportToClipboard = () => {
    navigator.clipboard.writeText(generatedReportText)
      .then(() => showToast("Teks laporan berhasil disalin!", "success"))
      .catch(err => { console.error("Copy failed:", err); showToast("Gagal menyalin teks: " + err, "error"); });
  };

  const extractSerialFromLP = (lpString: string): string => {
    const parts = lpString.split('/');
    return (parts.length > 2 && parts[0] === 'LP' && parts[1] === 'B') ? (parts[2].trim().replace(/\s+/g, '_') || 'N_A') : 'N_A';
  };

  const formatDateForFilename = (dateTimeString: string): string => {
    if (!dateTimeString) return 'UNKNOWN_DATE';
    try {
      const date = new Date(dateTimeString);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) { return 'INVALID_DATE'; }
  };
  
  const generatePdfReport = () => {
    if (!activeReport) return;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight(); const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15; const lineHeight = 6; const usableWidth = pageWidth - 2 * margin;
    let yPos = { y: margin };
    
    const addWrappedText = (text: string, x: number, currentY: {y:number}, maxWidth: number, lineH: number, options: any = {}) => {
        const lines = doc.splitTextToSize(text || "(Belum diisi)", maxWidth);
        if (currentY.y + (lines.length * lineH) > pageHeight - margin - 5) { doc.addPage(); currentY.y = margin; }
        doc.text(lines, x, currentY.y, { align: options.align, fontStyle: options.fontStyle } as any);
        currentY.y += lines.length * lineH;
    };
    
    const addSpace = (currentY: {y:number}, space: number) => {
        currentY.y += space; if (currentY.y > pageHeight - margin - 5) { doc.addPage(); currentY.y = margin; }
    };

    const addSectionTitle = (title: string, currentY: { y: number }) => {
        if (currentY.y + lineHeight * 2 > pageHeight - margin - 10) { doc.addPage(); currentY.y = margin; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        addWrappedText(title, margin, currentY, usableWidth, lineHeight + 1);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        addSpace(currentY, lineHeight / 2);
    };

    const addKeyValueLine = (key: string, value: string | undefined, currentY: { y: number }, indent: number = margin + 5) => {
        const fullText = `${key.padEnd(18, ' ')}: ${value || '(Belum diisi)'}`;
        addWrappedText(fullText, margin, currentY, usableWidth, lineHeight);
    };

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    addWrappedText("LAPORAN KECELAKAAN LALU LINTAS", pageWidth / 2, yPos, usableWidth, lineHeight, { align: 'center' });
    doc.setFontSize(11); addWrappedText("Polres Tasikmalaya - Polda Jabar", pageWidth / 2, yPos, usableWidth, lineHeight, { align: 'center' });
    addSpace(yPos, lineHeight / 2); doc.setLineWidth(0.5); doc.line(margin, yPos.y, pageWidth - margin, yPos.y); addSpace(yPos, lineHeight);
    
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    addWrappedText(`Nomor Laporan Polisi: ${activeReport.nomorLaporanPolisi || '(Belum diisi)'}`, margin, yPos, usableWidth, lineHeight);
    addSpace(yPos, lineHeight / 2); doc.line(margin, yPos.y, pageWidth - margin, yPos.y); addSpace(yPos, lineHeight * 1.5);
    
    doc.setFontSize(9); doc.setFont("helvetica", "normal");

    if (activeReport.pelaporInfo && activeReport.pelaporInfo.namaLengkap) {
        addSectionTitle("DATA PELAPOR:", yPos);
        addKeyValueLine("Nama Lengkap", activeReport.pelaporInfo.namaLengkap, yPos);
        addKeyValueLine("NIK", activeReport.pelaporInfo.nomorIdentitas, yPos);
        const ttlPelapor = `${activeReport.pelaporInfo.tempatLahir || '(Tempat?)'} / ${activeReport.pelaporInfo.tanggalLahir || '(Tgl Lahir?)'} (${calculateAge(activeReport.pelaporInfo.tanggalLahir)})`;
        addKeyValueLine("Tempat/Tgl. Lahir", ttlPelapor, yPos);
        addKeyValueLine("Jenis Kelamin", activeReport.pelaporInfo.jenisKelamin, yPos);
        addKeyValueLine("Pekerjaan", activeReport.pelaporInfo.pekerjaan, yPos);
        addKeyValueLine("Alamat", activeReport.pelaporInfo.alamat, yPos);
        addSpace(yPos, lineHeight * 1.5);
    }

    doc.setFont("helvetica", "bold"); addWrappedText("WAKTU KEJADIAN:", margin, yPos, usableWidth, lineHeight);
    doc.setFont("helvetica", "normal");
    let waktuFormattedPdf = '(Belum diisi)';
    if (activeReport.waktuKejadian) {
        try {
            const date = new Date(activeReport.waktuKejadian);
            const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
            const month = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' }).format(date);
            const year = new Intl.DateTimeFormat('id-ID', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
            const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(date);
            waktuFormattedPdf = `Pada Hari ${dayName} Tanggal ${day} ${month} ${year} sekitar pukul ${time} WIB`;
        } catch (e) { waktuFormattedPdf = activeReport.waktuKejadian; }
    }
    addWrappedText(waktuFormattedPdf, margin, yPos, usableWidth, lineHeight); addSpace(yPos, lineHeight * 1.5);
    
    doc.setFont("helvetica", "bold"); addWrappedText("TEMPAT KEJADIAN PERKARA (TKP):", margin, yPos, usableWidth, lineHeight);
    doc.setFont("helvetica", "normal"); addWrappedText(`Alamat: ${activeReport.alamatTkp || '(Belum diisi)'}`, margin, yPos, usableWidth, lineHeight); addSpace(yPos, lineHeight * 1.5);
    
    if (yPos.y + 40 > pageHeight - margin) { doc.addPage(); yPos.y = margin; }
    addSectionTitle("PIHAK TERLIBAT:", yPos);
    
    const pihakTableBody = activeReport.pihakTerlibat.map((pihak, index) => {
        let peranDisplay = pihak.peran || 'N/A';
        const linkedEntity = activeReport.involvedEntities.find(e => e.id === pihak.involvedEntityId);
        if (linkedEntity?.type === 'Kendaraan') {
             const { prefix } = getVehiclePrefixAndCategory(linkedEntity.jenisKendaraan);
             peranDisplay = `${pihak.peran} ${prefix}${linkedEntity.jenisKendaraan}${linkedEntity.nomorPolisi ? ` (${linkedEntity.nomorPolisi})` : ''}`;
        } else if (linkedEntity?.type === 'Pejalan Kaki') {
            peranDisplay = `Pejalan Kaki`;
        }
        
        const ttlPihak = `${pihak.tempatLahir || 'N/A'} / ${pihak.tanggalLahir || 'N/A'}`;
        const kondisi = `${pihak.tingkatLuka || 'N/A'}${pihak.didugaTersangka ? ' (Tersangka)' : ''}`;

        return [ index + 1, pihak.namaLengkap || 'N/A', pihak.nomorIdentitas || 'N/A', ttlPihak, calculateAge(pihak.tanggalLahir), pihak.jenisKelamin || 'N/A', pihak.pekerjaan || 'N/A', pihak.alamat || 'N/A', peranDisplay, kondisi ];
    });

    if (pihakTableBody.length > 0) {
        autoTable(doc, { startY: yPos.y, 
            head: [['No', 'Nama Lengkap', 'No. Identitas', 'Tempat/Tgl. Lahir', 'Usia', 'Gender', 'Pekerjaan', 'Alamat', 'Peran & Keterkaitan', 'Kondisi']], 
            body: pihakTableBody, theme: 'grid',
            headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 7.5, cellPadding: 1.5 },
            bodyStyles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
            columnStyles: { 
                0: { cellWidth: 7 }, 
                1: { cellWidth: 22 }, 
                2: { cellWidth: 25 }, 
                3: { cellWidth: 22 }, 
                4: { cellWidth: 8 },  
                5: { cellWidth: 13 }, 
                6: { cellWidth: 18 }, 
                7: { cellWidth: 'auto' }, 
                8: { cellWidth: 25 },
                9: { cellWidth: 15 }
            },
            didDrawPage: (data) => { yPos.y = data.cursor?.y || margin; } 
        }); yPos.y = (doc as any).lastAutoTable.finalY + lineHeight;
    } else { addWrappedText("(Tidak ada data pihak terlibat)", margin, yPos, usableWidth, lineHeight); addSpace(yPos, lineHeight); }
    
    if (yPos.y > pageHeight - margin - 5) { doc.addPage(); yPos.y = margin; } addSpace(yPos, lineHeight * 0.5);
    if (yPos.y + 40 > pageHeight - margin) { doc.addPage(); yPos.y = margin; }
    addSectionTitle("SAKSI-SAKSI:", yPos);
    
    const saksiTableBody = activeReport.saksiSaksi.map((saksi, index) => {
      const ttlSaksi = `${saksi.tempatLahir || 'N/A'} / ${saksi.tanggalLahir || 'N/A'}`;
      return [ 
        index + 1, 
        saksi.namaLengkap || 'N/A', 
        saksi.nomorIdentitas || 'N/A', 
        ttlSaksi,
        saksi.tanggalLahir ? calculateAge(saksi.tanggalLahir) : (saksi.umurString || 'N/A'), 
        saksi.jenisKelamin || 'N/A', 
        saksi.pekerjaan || 'N/A', 
        saksi.alamat || 'N/A', 
        saksi.keteranganSaksi || 'N/A' 
      ];
    });

    if (saksiTableBody.length > 0) {
        autoTable(doc, { startY: yPos.y, 
            head: [['No', 'Nama Lengkap', 'No. Identitas', 'Tempat/Tgl. Lahir', 'Usia', 'Gender', 'Pekerjaan', 'Alamat', 'Keterangan']], 
            body: saksiTableBody, theme: 'grid',
            headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 8, cellPadding: 1.5 },
            bodyStyles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
            columnStyles: { 
                0: { cellWidth: 7 }, 
                1: { cellWidth: 25 }, 
                2: { cellWidth: 30 }, 
                3: { cellWidth: 25 }, 
                4: { cellWidth: 8 },  
                5: { cellWidth: 15 }, 
                6: { cellWidth: 18 }, 
                7: { cellWidth: 30 }, 
                8: { cellWidth: 'auto' } 
            },
            didDrawPage: (data) => { yPos.y = data.cursor?.y || margin; }
        }); yPos.y = (doc as any).lastAutoTable.finalY + lineHeight;
    } else { addWrappedText("(Tidak ada data saksi)", margin, yPos, usableWidth, lineHeight); addSpace(yPos, lineHeight); }
    
    if (yPos.y > pageHeight - margin - 5) { doc.addPage(); yPos.y = margin; } addSpace(yPos, lineHeight * 0.5);
    if (yPos.y + 20 > pageHeight - margin) { doc.addPage(); yPos.y = margin; }
    addSectionTitle("KRONOLOGIS KEJADIAN:", yPos);
    addWrappedText(activeReport.kronologiKejadianUtama || '(Belum diisi)', margin, yPos, usableWidth, lineHeight); addSpace(yPos, lineHeight);
    
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, pageHeight - margin + 8, {align: 'right'}); }
    
    const lpSerial = extractSerialFromLP(activeReport.nomorLaporanPolisi);
    const eventDate = formatDateForFilename(activeReport.waktuKejadian);
    doc.save(`LP_DataInti_${lpSerial}_${eventDate}.pdf`);
    showToast("Laporan PDF (Data Inti) berhasil dibuat.", "success");
  };

  const handleSaveReferenceData = () => {
    if (!activeReport) {
      showToast("Tidak ada laporan aktif untuk disimpan.", "warning");
      return;
    }
    try {
      const reportJson = JSON.stringify(activeReport, null, 2);
      const blob = new Blob([reportJson], { type: "application/json;charset=utf-8" });
      const lpSerial = extractSerialFromLP(activeReport.nomorLaporanPolisi);
      const eventDate = formatDateForFilename(activeReport.waktuKejadian);
      const filename = `REF_DATA_${lpSerial}_${eventDate}.json`;
      saveAs(blob, filename);
      showToast("Data referensi telah dibuat dan siap diunduh.", "success");
    } catch (error) {
      console.error("Failed to save reference data:", error);
      showToast("Gagal membuat file data referensi.", "error");
    }
  };
  
  // --- Entity Management ---
  const handleOpenAddEntityModal = (type: 'Kendaraan' | 'Pejalan Kaki') => {
    if (type === 'Kendaraan') {
      setCurrentEditingEntity({ id: generateId(), type: 'Kendaraan', jenisKendaraan: '', nomorPolisi: '', kerusakan: '' });
    } else {
      setCurrentEditingEntity({ id: generateId(), type: 'Pejalan Kaki' });
    }
    setEditingEntityIndex(null);
    setIsEntityModalOpen(true);
  };
  
  const handleOpenEditEntityModal = (entity: InvolvedEntity, index: number) => {
    setCurrentEditingEntity({ ...entity });
    setEditingEntityIndex(index);
    setIsEntityModalOpen(true);
  };

  const handleEntityDataChange = useCallback((field: keyof InvolvedVehicle, value: string) => {
     setCurrentEditingEntity(prev => (prev?.type === 'Kendaraan' ? { ...prev, [field]: value } : prev));
  }, []);

  const handleSaveEntity = () => {
    if (!currentEditingEntity) return;

    if (currentEditingEntity.type === 'Kendaraan' && (!currentEditingEntity.jenisKendaraan || !currentEditingEntity.nomorPolisi)) {
        showToast("Jenis kendaraan dan nomor polisi wajib diisi.", "error");
        return;
    }
    
    updateActiveReport(draft => {
        const newEntities = [...draft.involvedEntities];
        if (editingEntityIndex !== null) {
            newEntities[editingEntityIndex] = currentEditingEntity as InvolvedEntity;
        } else {
            newEntities.push(currentEditingEntity as InvolvedEntity);
        }
        return { involvedEntities: newEntities };
    });

    setIsEntityModalOpen(false);
    setCurrentEditingEntity(null);
    setEditingEntityIndex(null);
    showToast(`Data ${currentEditingEntity.type} berhasil disimpan.`, "success");
  };

  const handleDeleteEntity = (index: number) => {
      if (!activeReport) return;
      if (window.confirm("Yakin ingin menghapus entitas ini? Semua pihak yang terkait dengannya akan kehilangan keterkaitannya.")) {
          const entityIdToDelete = activeReport.involvedEntities[index].id;
          updateActiveReport(draft => {
              const updatedEntities = draft.involvedEntities.filter((_, i) => i !== index);
              const updatedPihak = draft.pihakTerlibat.map(p => 
                  p.involvedEntityId === entityIdToDelete ? { ...p, involvedEntityId: null } : p
              );
              return { involvedEntities: updatedEntities, pihakTerlibat: updatedPihak };
          });
          showToast("Entitas berhasil dihapus.", "info");
      }
  };
  
  const getEntityDisplayName = (entity: InvolvedEntity): string => {
    if (!activeReport) return '';
    if (entity.type === 'Kendaraan') {
      return `${entity.jenisKendaraan || '(Jenis?)'} - ${entity.nomorPolisi || '(NoPol?)'}`;
    }
    if (entity.type === 'Pejalan Kaki') {
      const pedestrianIndex = activeReport.involvedEntities.filter(e => e.type === 'Pejalan Kaki').findIndex(e => e.id === entity.id);
      return `Pejalan Kaki ${pedestrianIndex + 1}`;
    }
    return 'Entitas Tidak Dikenal';
  };

  const handleOpenPrintLpModal = () => {
    setSelectedSpktOfficerName(SPKT_OFFICERS[0].nama); // Reset to default on open
    setSelectedReportingOfficerName(REPORTING_OFFICERS[0].nama); // Reset new dropdown
    setIsPrintLpModalOpen(true);
  };

  const proceedToPrint = async () => {
    if (!activeReport) return;
    if (!selectedSpktOfficerName || !selectedReportingOfficerName) {
        showToast("Silakan pilih petugas pembuat dan penerima laporan.", "error");
        return;
    }
    showToast("Membuat Laporan Polisi (LP)...", "info");
    try {
        const reportingOfficerDetails = REPORTING_OFFICERS.find(o => o.nama === selectedReportingOfficerName);
        const spktOfficerDetails = SPKT_OFFICERS.find(o => o.nama === selectedSpktOfficerName);

        if (!reportingOfficerDetails || !spktOfficerDetails) {
            showToast("Detail petugas tidak ditemukan. Mohon periksa kembali.", "error");
            return;
        }

        const dataToSend = {
            ...activeReport,
            // Petugas Pembuat Laporan
            namaPetugas: reportingOfficerDetails.nama,
            pangkatPetugas: reportingOfficerDetails.pangkat,
            nrpPetugas: reportingOfficerDetails.nrp,
            
            // Petugas Penerima Laporan SPKT
            namaPetugasSpkt: spktOfficerDetails.nama,
            pangkatPetugasSpkt: spktOfficerDetails.pangkat,
            nrpPetugasSpkt: spktOfficerDetails.nrp,
            reguPetugasSpkt: spktOfficerDetails.regu,
        };

        // Lanjutkan dengan fetch API ke backend
        const response = await fetch('https://namapengguna.pythonanywhere.com/get_embedding_suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LAPORAN_POLISI_${(activeReport.nomorLaporanPolisi || '001').replace(/\//g, '_')}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("Laporan Polisi (LP) berhasil dibuat dan diunduh!", "success");
            setIsPrintLpModalOpen(false); // Tutup modal setelah berhasil
        } else {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                console.error('Error from backend:', errorData);
                // Handle various error shapes. errorData.error could be an object.
                const potentialMessage = errorData.error || errorData.message;
                if (typeof potentialMessage === 'string') {
                    errorMessage = potentialMessage;
                } else if (potentialMessage) {
                    errorMessage = JSON.stringify(potentialMessage);
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
            } catch (e) {
                // Response was not JSON. The statusText is probably the best we have.
                console.warn("Backend error response was not valid JSON.");
            }
            showToast(`Gagal membuat LP: ${errorMessage}`, "error");
        }
    } catch (error: any) {
        console.error('Error generating LP:', error);
        showToast(`Terjadi kesalahan: ${error.message}`, "error");
    }
};

 const renderArchiveView = () => {
    const sortedReports = [...reports].sort((a, b) => b.lastModified - a.lastModified);

    return (
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                        <ArchiveBoxIcon className="w-6 h-6 mr-3 text-blue-600" />
                        Arsip Laporan Kecelakaan
                    </h2>
                    <div className="flex items-center gap-3 self-start sm:self-center">
                        <button type="button" onClick={handleCreateReport} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium flex items-center shadow-sm hover:shadow-md">
                            <PlusCircleIcon className="w-6 h-6 mr-2" />
                            Buat Laporan Baru
                        </button>
                    </div>
                </div>
            </section>

            {sortedReports.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-lg shadow-lg">
                    <InboxStackIcon className="w-16 h-16 mx-auto text-slate-400" />
                    <h3 className="mt-4 text-xl font-medium text-slate-800">Arsip Laporan Kosong</h3>
                    <p className="mt-2 text-slate-500">Belum ada laporan yang disimpan. Klik tombol di atas untuk membuat laporan pertama Anda.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedReports.map(report => (
                        <div key={report.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-blue-300 p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        {report.nomorLaporanPolisi.includes('   ') ? 'Laporan Baru (Belum ada No. LP)' : report.nomorLaporanPolisi}
                                    </h3>
                                    <p className="text-sm text-slate-600 mt-1">
                                        <MapPinIcon className="w-4 h-4 inline-block mr-1.5 align-text-bottom text-slate-500"/>
                                        <span className="font-semibold">TKP:</span> {report.alamatTkp || 'Belum diisi'}
                                    </p>
                                     <p className="text-sm text-slate-600">
                                        <ClockIcon className="w-4 h-4 inline-block mr-1.5 align-text-bottom text-slate-500"/>
                                        <span className="font-semibold">Waktu:</span> {report.waktuKejadian ? formatDateTime(report.waktuKejadian) : 'Belum diisi'}
                                    </p>
                                     <p className="text-xs text-slate-400 mt-2">
                                        <PencilSquareIcon className="w-3 h-3 inline-block mr-1.5 align-text-bottom"/>
                                        Terakhir diubah: {formatDateTime(report.lastModified)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 flex items-center self-start sm:self-center space-x-2">
                                    <button type="button" onClick={() => handleSelectReport(report.id)} className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors" title="Edit Laporan">
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                    <button type="button" onClick={() => handleDeleteReport(report.id)} className="p-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors" title="Hapus Laporan">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
 };

 const renderEditorView = () => {
    if (!activeReport) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <LoadingSpinner text="Memuat data laporan..." size="lg" />
            </div>
        );
    }
    const reportData = activeReport;

    return (
        <main className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-600" />
                Formulir Laporan Kejadian
              </h2>
              <button type="button" onClick={handleGoBackToArchive} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium flex items-center">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali ke Arsip
              </button>
            </div>
          </section>
          
          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <BuildingLibraryIcon className="w-6 h-6 mr-2 text-blue-600" />
              Informasi Kepala Surat Laporan
            </h2>
            <div className="space-y-1 text-sm text-slate-700">
              <p><span className="font-semibold w-20 inline-block">Kepada Yth.</span>: {reportData.kepada}</p>
              <p><span className="font-semibold w-20 inline-block">Dari</span>: {reportData.dari}</p>
              <p><span className="font-semibold w-20 inline-block">Perihal</span>: {reportData.perihal}</p>
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <IdentificationIcon className="w-6 h-6 mr-2 text-blue-600" />
                Data Pelapor (Sumber Informasi)
              </h2>
              <button 
                type="button"
                onClick={handleOpenPelaporModal} 
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center self-start sm:self-center">
                <PencilSquareIcon className="w-5 h-5 mr-2" /> {reportData.pelaporInfo?.namaLengkap ? "Edit Data Pelapor" : "Input Data Pelapor"}
              </button>
            </div>
            {reportData.pelaporInfo && reportData.pelaporInfo.namaLengkap ? (
              <div className="text-sm text-slate-700 space-y-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p><span className="font-semibold">Nama:</span> {reportData.pelaporInfo.namaLengkap}</p>
                <p><span className="font-semibold">NIK:</span> {reportData.pelaporInfo.nomorIdentitas}</p>
                <p><span className="font-semibold">Alamat:</span> {reportData.pelaporInfo.alamat}</p>
                <p><span className="font-semibold">Pekerjaan:</span> {reportData.pelaporInfo.pekerjaan}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-3">Data Pelapor belum diisi.</p>
            )}
          </section>
          
          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <MapPinIcon className="w-6 h-6 mr-2 text-blue-600" />
              Waktu dan Tempat Kejadian (TKP)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                  label="Waktu Kejadian (Tanggal & Jam)" id="waktuKejadian" type="datetime-local"
                  value={reportData.waktuKejadian} onChange={(e) => handleGeneralReportDataChange('waktuKejadian', e.target.value)}
                  icon={<ClockIcon />}
              />
              <LabeledInput
                  label="Nomor Laporan Polisi (LP)" id="nomorLaporanPolisi" value={reportData.nomorLaporanPolisi}
                  onChange={(e) => handleGeneralReportDataChange('nomorLaporanPolisi', e.target.value)}
                  icon={<DocumentTextIcon />} suggestionsKey="nomorLaporanPolisi_suggestions"
                  getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
            </div>
            <div className="mt-4">
              <LabeledInput
                    label="Alamat TKP" id="alamatTkp" value={reportData.alamatTkp}
                    onChange={(e) => handleGeneralReportDataChange('alamatTkp', e.target.value)}
                    placeholder="Jl. Raya..., Kp..., Ds..., Kec..., Kab/Kota..." icon={<MapPinIcon />}
                    suggestionsKey="alamatTkp_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
                />
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                      <TruckIcon className="w-6 h-6 mr-2 text-blue-600" />
                      Kendaraan / Pejalan Kaki yang Terlibat
                  </h2>
                  <div className="flex gap-2 self-start sm:self-center">
                      <button type="button" onClick={() => handleOpenAddEntityModal('Kendaraan')} className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium flex items-center">
                          <PlusIcon className="w-5 h-5 mr-1" /> Kendaraan
                      </button>
                      <button type="button" onClick={() => handleOpenAddEntityModal('Pejalan Kaki')} className="px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium flex items-center">
                          <PlusIcon className="w-5 h-5 mr-1" /> Pejalan Kaki
                      </button>
                  </div>
              </div>
              {reportData.involvedEntities.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Belum ada kendaraan atau pejalan kaki yang ditambahkan.</p>
              ) : (
                  <ul className="space-y-3">
                      {reportData.involvedEntities.map((entity, index) => (
                          <li key={entity.id} className="p-3 sm:p-4 border border-slate-200 rounded-md bg-slate-50 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
                              <div className="flex-grow flex items-center">
                                  {entity.type === 'Kendaraan' ? <TruckIcon className="w-6 h-6 mr-3 text-cyan-700 flex-shrink-0"/> : <UsersIcon className="w-6 h-6 mr-3 text-orange-600 flex-shrink-0"/>}
                                  <div>
                                      <p className={`font-medium ${entity.type === 'Kendaraan' ? 'text-cyan-800' : 'text-orange-700'}`}>{getEntityDisplayName(entity)}</p>
                                      {entity.type === 'Kendaraan' && <p className="text-xs text-slate-500">Kerusakan: {entity.kerusakan || '(Belum diisi)'}</p>}
                                  </div>
                              </div>
                              <div className="space-x-2 flex-shrink-0 self-end sm:self-center">
                                  <button type="button" onClick={() => handleOpenEditEntityModal(entity, index)} className="p-2 text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-md" title={`Edit ${entity.type}`}> <PencilSquareIcon className="w-5 h-5" /> </button>
                                  <button type="button" onClick={() => handleDeleteEntity(index)} className="p-2 text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded-md" title={`Hapus ${entity.type}`}> <TrashIcon className="w-5 h-5" /> </button>
                              </div>
                          </li>
                      ))}
                  </ul>
              )}
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <UserGroupIcon className="w-6 h-6 mr-2 text-blue-600" />
                I. Pihak Terlibat
              </h2>
              <button type="button" onClick={handleOpenAddPartyModal} className="px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center self-start sm:self-center">
                <PlusCircleIcon className="w-5 h-5 mr-2" /> Tambah Pihak
              </button>
            </div>
            {reportData.pihakTerlibat.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Belum ada pihak yang ditambahkan.</p>
            ) : (
              <ul className="space-y-3">
                {reportData.pihakTerlibat.map((pihak, index) => {
                  const linkedEntity = reportData.involvedEntities.find(e => e.id === pihak.involvedEntityId);
                  let entityText = '(Tidak terkait)';
                  if (linkedEntity) {
                      entityText = getEntityDisplayName(linkedEntity);
                  }

                  return (
                  <li key={pihak.id} className="p-3 sm:p-4 border border-slate-200 rounded-md bg-slate-50 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
                    <div className="flex-grow">
                      <p className="font-medium text-slate-700">{pihak.namaLengkap || "Nama Belum Diisi"} ({pihak.peran || "Peran?"})</p>
                      <p className="text-sm text-slate-500">
                        Terkait dengan: <span className="font-semibold">{entityText}</span>
                      </p>
                      <div className="flex items-center flex-wrap gap-x-3 text-xs text-slate-500 mt-1">
                          <span>ID: {pihak.nomorIdentitas || "ID?"}</span>
                          <span>Usia: {calculateAge(pihak.tanggalLahir)}</span>
                          <span>Pekerjaan: {pihak.pekerjaan || "Pekerjaan?"}</span>
                      </div>
                      <div className="flex items-center gap-x-2 mt-1.5">
                        {pihak.tingkatLuka && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              pihak.tingkatLuka === 'MD' ? 'bg-black text-white' :
                              pihak.tingkatLuka === 'LB' ? 'bg-red-200 text-red-800' :
                              pihak.tingkatLuka === 'LR' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-gray-200 text-gray-800'
                          }`}>
                            {pihak.tingkatLuka}
                          </span>
                        )}
                        {pihak.didugaTersangka && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                            Tersangka
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-x-2 flex-shrink-0 self-end sm:self-center">
                      <button type="button" onClick={() => handleOpenEditPartyModal(pihak, index)} className="p-2 text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-md" title="Edit Pihak"> <PencilSquareIcon className="w-5 h-5" /> </button>
                      <button type="button" onClick={() => handleDeleteParty(index)} className="p-2 text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded-md" title="Hapus Pihak"> <TrashIcon className="w-5 h-5" /> </button>
                    </div>
                  </li>
                )})}
              </ul>
            )}
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <UserGroupIcon className="w-6 h-6 mr-2 text-blue-600" /> II. Saksi-Saksi
              </h2>
              <button type="button" onClick={handleOpenAddSaksiModal} className="px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center self-start sm:self-center">
                <PlusCircleIcon className="w-5 h-5 mr-2" /> Tambah Saksi
              </button>
            </div>
            {reportData.saksiSaksi.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Belum ada saksi yang ditambahkan.</p>
            ) : (
              <ul className="space-y-3">
                {reportData.saksiSaksi.map((saksi, index) => (
                  <li key={saksi.id} className="p-3 sm:p-4 border border-slate-200 rounded-md bg-slate-50 flex justify-between items-start flex-col gap-2">
                    <div>
                      <p className="font-medium text-slate-700">{saksi.namaLengkap || "Nama Belum Diisi"}</p>
                      <p className="text-sm text-slate-500"> Usia: {saksi.tanggalLahir ? calculateAge(saksi.tanggalLahir) : saksi.umurString}, Gender: {saksi.jenisKelamin || '?'}, Pekerjaan: {saksi.pekerjaan || "Pekerjaan?"}, Alamat: {saksi.alamat || "Alamat?"} </p>
                      <p className="text-sm text-slate-600 mt-1"><span className="font-semibold">Keterangan:</span> {saksi.keteranganSaksi || "Tidak ada keterangan"}</p>
                    </div>
                    <div className="space-x-2 flex-shrink-0 self-end">
                      <button type="button" onClick={() => handleOpenEditSaksiModal(saksi, index)} className="p-2 text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-md" title="Edit Saksi"> <PencilSquareIcon className="w-5 h-5" /> </button>
                      <button type="button" onClick={() => handleDeleteSaksi(index)} className="p-2 text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded-md" title="Hapus Saksi"> <TrashIcon className="w-5 h-5" /> </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mr-2 text-blue-600" />
              III. Pra Kejadian
            </h2>
            <div className="space-y-4">
              <LabeledTextarea
                label="a. Manusia" id="uraianPraKejadianManusia" value={reportData.uraianPraKejadianManusia}
                onChange={(e) => handleGeneralReportDataChange('uraianPraKejadianManusia', e.target.value)}
                rows={3} placeholder="Kondisi dan tindakan pengemudi/pejalan kaki sebelum kejadian..."
                suggestionsKey="uraianPraKejadianManusia_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
              <div>

               {activeReport && (
            <div>
              {isFetchingSuggestions && (
                <div className="text-muted mt-2">Mencari saran...</div>
              )}
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p><strong>Saran Klasifikasi Otomatis:</strong></p>
                  <div className="list-group">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="list-group-item list-group-item-action flex-column align-items-start"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">
                            Jenis: {suggestion.suggested_jenis_kecelakaan} | 
                            Penyebab: {suggestion.suggested_penyebab_utama}
                          </h6>
                          <small className="text-muted">Kemiripan: {(suggestion.similarity * 100).toFixed(0)}%</small>
                        </div>
                        <p className="mb-1 text-muted">Berdasarkan laporan: "{suggestion.original_text.substring(0, 50)}..."</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

                <label className="flex items-center text-sm font-medium text-slate-700 mb-1">b. Kendaraan</label>
                <p className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-50 text-slate-700 text-sm min-h-[40px] flex items-center">
                  {reportData.uraianPraKejadianKendaraan}
                </p>
              </div>
              <LabeledTextarea
                label="c. Jalan & Lingkungan (Otomatis terisi berdasarkan Waktu Kejadian, dapat diedit)"
                id="uraianPraKejadianJalanLingkungan" value={reportData.uraianPraKejadianJalanLingkungan}
                onChange={(e) => handleGeneralReportDataChange('uraianPraKejadianJalanLingkungan', e.target.value)}
                rows={2} placeholder={reportData.waktuKejadian ? "Deskripsi kondisi jalan dan lingkungan..." : "Isi Waktu Kejadian untuk deskripsi otomatis"}
                suggestionsKey="uraianPraKejadianJalanLingkungan_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
            </div>
          </section>
          
          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <ShieldCheckIcon className="w-6 h-6 mr-2 text-blue-600" />
              Klasifikasi Kejadian
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Jenis Kecelakaan (Disarankan)"
                id="jenisKecelakaan"
                value={reportData.jenisKecelakaan || ""}
                onChange={(e) => handleGeneralReportDataChange('jenisKecelakaan', e.target.value)}
                suggestionsKey="jenisKecelakaan_suggestions"
                getSuggestionsFunc={getSuggestionsFromStorage}
                addSuggestionFunc={addSuggestionToStorage}
              />
              <LabeledInput
                label="Penyebab Utama (Disarankan)"
                id="penyebabUtama"
                value={reportData.penyebabUtama || ""}
                onChange={(e) => handleGeneralReportDataChange('penyebabUtama', e.target.value)}
                suggestionsKey="penyebabUtama_suggestions"
                getSuggestionsFunc={getSuggestionsFromStorage}
                addSuggestionFunc={addSuggestionToStorage}
              />
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-500" />
              Akibat Kecelakaan
            </h2>
            <LabeledTextarea
              label="Narasi Akibat Kecelakaan" id="narasiAkibatKecelakaan" value={reportData.narasiAkibatKecelakaan}
              onChange={(e) => handleGeneralReportDataChange('narasiAkibatKecelakaan', e.target.value)}
              rows={3} placeholder="Lanjutkan kalimat ini..."
              suggestionsKey="narasiAkibatKecelakaan_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="md:col-span-2 lg:col-span-2">
                  <LabeledInput
                  label="Jumlah Kerugian Materiil (Angka)" id="kerugianMateriilAngka" type="number" min="0"
                  value={String(reportData.kerugianMateriilAngka)}
                  onChange={(e) => handleGeneralReportDataChange('kerugianMateriilAngka', parseInt(e.target.value, 10) || 0)}
                  placeholder="Contoh: 500000" icon={<BanknotesIcon />}
                  />
                  <div className="mt-2">
                      <p className="text-xs font-medium text-slate-600 mb-1">Terbilang (Otomatis):</p>
                      <p className="text-sm text-slate-700 p-3 border border-slate-200 rounded-md bg-slate-50 min-h-[40px] flex items-center">
                          {reportData.kerugianMateriilTerbilang || 'Rp. 0,- (Nol Rupiah)'}
                      </p>
                  </div>
              </div>
              <LabeledInput label="Korban Meninggal Dunia (MD)" id="korbanMD" type="number" min="0" value={String(reportData.korbanMeninggalDunia)} onChange={() => {}} readOnly inputClassName="text-center" />
              <LabeledInput label="Korban Luka Berat (LB)" id="korbanLB" type="number" min="0" value={String(reportData.korbanLukaBerat)} onChange={() => {}} readOnly inputClassName="text-center" />
              <LabeledInput label="Korban Luka Ringan (LR)" id="korbanLR" type="number" min="0" value={String(reportData.korbanLukaRingan)} onChange={() => {}} readOnly inputClassName="text-center" />
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <LabeledTextarea
                  label="IV. Kronologi Kejadian Utama (Otomatis terisi, dapat diedit)" id="kronologiKejadianUtama"
                  value={reportData.kronologiKejadianUtama} onChange={(e) => handleGeneralReportDataChange('kronologiKejadianUtama', e.target.value)}
                  rows={5} placeholder="Kronologi akan terisi otomatis berdasarkan Waktu, TKP, Pra Kejadian Manusia, dan Akibat Kecelakaan..."
                  icon={<ListBulletIcon />} suggestionsKey="kronologiKejadianUtama_suggestions"
                  getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <InboxStackIcon className="w-6 h-6 mr-2 text-blue-600" /> Informasi Tambahan Lainnya
            </h2>
            <div className="space-y-4">
              <LabeledTextarea
                label="V. Barang Bukti (Kendaraan terlibat akan ditambahkan otomatis)" id="barangBuktiText"
                value={reportData.barangBuktiText} onChange={(e) => handleGeneralReportDataChange('barangBuktiText', e.target.value)}
                rows={3} placeholder="Masukkan daftar barang bukti tambahan (mis: SIM, STNK), satu per baris." icon={<ShieldCheckIcon />}
                suggestionsKey="barangBuktiText_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
              <LabeledTextarea
                label="VI. Tindakan yang Dilakukan" id="tindakanDilakukanText" value={reportData.tindakanDilakukanText}
                onChange={(e) => handleGeneralReportDataChange('tindakanDilakukanText', e.target.value)}
                rows={4} placeholder="Masukkan daftar tindakan yang telah dilakukan, satu per baris." icon={<ClipboardDocumentIcon />}
                suggestionsKey="tindakanDilakukanText_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
              />
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <ClipboardDocumentIcon className="w-6 h-6 mr-2 text-blue-600" /> Buat & Ekspor Laporan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button type="button" onClick={generateReport} className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold text-base flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" /> Buat Teks Laporan Singkat
              </button>
              <button type="button" onClick={generatePdfReport} className="px-3 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold text-base flex items-center justify-center">
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Buat PDF (Data Inti)
              </button>
              <button type="button" onClick={handleOpenPrintLpModal} className="px-3 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold text-base flex items-center justify-center">
                <PrinterIcon className="w-5 h-5 mr-2" /> Cetak Laporan Polisi (LP)
              </button>
              <button type="button" onClick={handleSaveReferenceData} className="px-3 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors font-semibold text-base flex items-center justify-center">
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Simpan Data Referensi
              </button>
            </div>
            {showReportText && (
              <div className="mt-6 p-3 sm:p-4 border border-slate-300 rounded-md bg-slate-50">
                <h3 className="text-md font-semibold text-slate-700 mb-2">Teks Laporan Singkat (Siap Salin):</h3>
                <pre className="whitespace-pre-wrap break-all text-sm text-slate-800 p-3 bg-white border border-slate-200 rounded-md max-h-[500px] overflow-y-auto">{generatedReportText}</pre>
                <button type="button" onClick={copyReportToClipboard} className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium flex items-center">
                  <ClipboardDocumentIcon className="w-5 h-5 mr-2" /> Salin Teks Laporan Singkat
                </button>
              </div>
            )}
          </section>
        </main>
    );
 }


  return (
    <>
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <img src={APP_HEADER_LOGO_BASE64} alt="Logo Aplikasi Laporan Kecelakaan" className="h-20 w-20 sm:h-24 sm:w-24" />
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-700">Asisten Laporan Kecelakaan Lalu Lintas</h1>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">Polres Tasikmalaya - Polda Jabar</p>
            <p className="text-slate-500 text-xs sm:text-sm">
                {view === 'archive' ? 'Arsip Laporan Kejadian Anda' : 'Lengkapi data kejadian untuk membuat laporan resmi.'}
            </p>
          </div>
        </header>

        {ReactDOM.createPortal(
          toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          )),
          document.getElementById('toast-container')!
        )}
        
        {ocrDisabled && (
          <div className={`mb-6 p-3 sm:p-4 border rounded-md flex items-start text-sm ${apiKeyMissing ? 'bg-red-100 border-red-400 text-red-700' : 'bg-yellow-100 border-yellow-400 text-yellow-700'}`}>
            {apiKeyMissing ? <ExclamationTriangleIcon className="h-5 w-5 mr-2 sm:mr-3 flex-shrink-0 text-red-500" /> : <NoSymbolIcon className="h-5 w-5 mr-2 sm:mr-3 flex-shrink-0 text-yellow-500" /> }
            <div>
              <h3 className="font-semibold text-base">
                {apiKeyMissing && "Kunci API Hilang!"}
                {isOffline && !apiKeyMissing && "Mode Offline Aktif"}
                {isOffline && apiKeyMissing && "Kunci API Hilang & Mode Offline"}
              </h3>
              <p>{ocrDisabledMessage} Anda tetap bisa mengisi data secara manual.</p>
            </div>
          </div>
        )}

        {view === 'archive' ? renderArchiveView() : renderEditorView()}


        <Modal 
          isOpen={isPelaporModalOpen} 
          onClose={() => { setIsPelaporModalOpen(false); setOcrResultForPelapor(null); }} 
          title="Input/Edit Data Pelapor (Sumber Informasi)"
        >
          <div className="space-y-4">
            <ImageUploader 
              onImageSelect={handleImageSelectedForPelapor} 
              label="Unggah Foto KTP Pelapor"
              disabled={ocrDisabled} 
              disabledMessage={ocrDisabledMessage + " Input data manual di bawah."}
            />
            {isLoadingPelaporOcr && !ocrDisabled && <LoadingSpinner text="Memproses KTP Pelapor..." />}
            {ocrErrorPelapor && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{ocrErrorPelapor}</p>}
            
            {ocrResultForPelapor && ocrResultForPelapor.documentType && ocrResultForPelapor.documentType !== 'KTP' && (
              <p className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md">
                Gambar terdeteksi sebagai {ocrResultForPelapor.documentType}. Pastikan data yang diisi adalah data KTP Pelapor.
              </p>
            )}

            <div className="space-y-3 mt-4 pt-4 border-t">
              <LabeledInput 
                  label="Nama Lengkap Pelapor" id="pelaporNama" 
                  value={currentEditingPelapor.namaLengkap} 
                  onChange={e => handlePelaporDataChange('namaLengkap', e.target.value)} 
                  suggestionsKey="pelapor_namaLengkap" 
                  getSuggestionsFunc={getSuggestionsFromStorage} 
                  addSuggestionFunc={addSuggestionToStorage} />
              <LabeledInput 
                  label="Nomor Identitas (NIK) Pelapor" id="pelaporNik" 
                  value={currentEditingPelapor.nomorIdentitas} 
                  onChange={e => handlePelaporDataChange('nomorIdentitas', e.target.value)} 
                  suggestionsKey="pelapor_nik" 
                  getSuggestionsFunc={getSuggestionsFromStorage} 
                  addSuggestionFunc={addSuggestionToStorage} />
              <LabeledInput 
                  label="Alamat Pelapor" id="pelaporAlamat" 
                  value={currentEditingPelapor.alamat} 
                  onChange={e => handlePelaporDataChange('alamat', e.target.value)} 
                  suggestionsKey="pelapor_alamat" 
                  getSuggestionsFunc={getSuggestionsFromStorage} 
                  addSuggestionFunc={addSuggestionToStorage} />
              <LabeledInput 
                  label="Tempat Lahir Pelapor" id="pelaporTempatLahir" 
                  value={currentEditingPelapor.tempatLahir || ""} 
                  onChange={e => handlePelaporDataChange('tempatLahir', e.target.value)} 
                  suggestionsKey="pelapor_tempatLahir" 
                  getSuggestionsFunc={getSuggestionsFromStorage} 
                  addSuggestionFunc={addSuggestionToStorage} />
              <LabeledInput 
                  label="Tanggal Lahir Pelapor (DD-MM-YYYY)" id="pelaporTglLahir" 
                  value={currentEditingPelapor.tanggalLahir} 
                  onChange={e => handlePelaporDataChange('tanggalLahir', e.target.value)} 
                  placeholder="DD-MM-YYYY" />
              <LabeledSelect 
                  label="Jenis Kelamin Pelapor" id="pelaporJenisKelamin" 
                  value={currentEditingPelapor.jenisKelamin || ""} 
                  onChange={e => handlePelaporDataChange('jenisKelamin', e.target.value as PelaporInfo['jenisKelamin'])}
              >
                  <option value="" disabled>Pilih Jenis Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
              </LabeledSelect>
              <LabeledSelect
                  label="Agama" id="pelaporAgama"
                  value={currentEditingPelapor.agama || ""}
                  onChange={e => handlePelaporDataChange('agama', e.target.value)}
              >
                  <option value="" disabled>Pilih Agama</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Khonghucu">Khonghucu</option>
                  <option value="Lainnya">Lainnya</option>
              </LabeledSelect>
              <LabeledInput
                  label="Suku" id="pelaporSuku"
                  value={currentEditingPelapor.suku || ''}
                  onChange={e => handlePelaporDataChange('suku', e.target.value)}
                  suggestionsKey="pelapor_suku"
                  getSuggestionsFunc={getSuggestionsFromStorage}
                  addSuggestionFunc={addSuggestionToStorage}
              />
              <LabeledInput 
                  label="Pekerjaan Pelapor" id="pelaporPekerjaan" 
                  value={currentEditingPelapor.pekerjaan} 
                  onChange={e => handlePelaporDataChange('pekerjaan', e.target.value)} 
                  suggestionsKey="pelapor_pekerjaan" 
                  getSuggestionsFunc={getSuggestionsFromStorage} 
                  addSuggestionFunc={addSuggestionToStorage} />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
            <button type="button" onClick={() => { setIsPelaporModalOpen(false); setOcrResultForPelapor(null);}}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"> Batal </button>
            <button type="button" onClick={handleSavePelapor} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"> Simpan Data Pelapor </button>
          </div>
        </Modal>


        <Modal 
          isOpen={isPartyModalOpen} 
          onClose={() => { setIsPartyModalOpen(false); setOcrResultForParty(null); setCurrentEditingParty(null); }} 
          title={editingPartyIndex !== null ? "Edit Data Pihak Terlibat" : "Tambah Pihak Terlibat"}
        >
          <div className="space-y-4">
            <ImageUploader 
              onImageSelect={handleImageSelectedForParty} label="Unggah Foto Identitas Pihak (KTP/SIM/KK/STNK)"
              disabled={ocrDisabled} disabledMessage={ocrDisabledMessage + " Input data manual di bawah."}
            />
            {isLoadingOcr && !ocrDisabled && <LoadingSpinner text="Memproses gambar pihak..." />}
            {ocrError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{ocrError}</p>}
            {ocrResultForParty && ocrResultForParty.documentType === 'KK' && ocrResultForParty.familyMembers && ocrResultForParty.familyMembers.length > 0 && !ocrDisabled && (
              <div className="my-4 p-3 border border-slate-200 rounded-md bg-slate-50 shadow">
                  <label htmlFor="kk-member-select" className="block text-sm font-medium text-slate-700 mb-1">Pilih Anggota Keluarga dari Kartu Keluarga:</label>
                  <select id="kk-member-select" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      onChange={(e) => handleKkMemberSelect(parseInt(e.target.value))} defaultValue="-1" >
                      <option value="-1" disabled>-- Pilih Anggota --</option>
                      {ocrResultForParty.familyMembers.map((member, index) => (
                          <option key={member.nomorIdentitas || index} value={index}>
                              {member.namaLengkap} (NIK: {member.nomorIdentitas || 'N/A'}, Hub: {member.hubunganKeluarga || 'N/A'})
                          </option>
                      ))}
                  </select>
              </div>
            )}
            {currentEditingParty && activeReport && (
              <ReportForm 
                partyData={currentEditingParty} 
                onDataChange={handlePartyDataChange} 
                title="Formulir Data Pihak"
                getSuggestionsFunc={getSuggestionsFromStorage} 
                addSuggestionFunc={addSuggestionToStorage}
                involvedEntities={activeReport.involvedEntities}
                allInvolvedEntities={activeReport.involvedEntities}
              />
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
            <button type="button" onClick={() => { setIsPartyModalOpen(false); setOcrResultForParty(null);setCurrentEditingParty(null);}}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"> Batal </button>
            <button type="button" onClick={handleSaveParty} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"> Simpan Pihak </button>
          </div>
        </Modal>

        <Modal 
              isOpen={isEntityModalOpen} 
              onClose={() => setIsEntityModalOpen(false)} 
              title={editingEntityIndex !== null ? `Edit Data ${currentEditingEntity?.type}` : `Tambah ${currentEditingEntity?.type}`}
          >
              <EntityForm 
                  entityData={currentEditingEntity} 
                  onDataChange={handleEntityDataChange}
                  getSuggestionsFunc={getSuggestionsFromStorage}
                  addSuggestionFunc={addSuggestionToStorage}
              />
              <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                  <button type="button" onClick={() => setIsEntityModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"> Batal </button>
                  <button type="button" onClick={handleSaveEntity} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"> Simpan </button>
              </div>
          </Modal>


        <Modal isOpen={isSaksiModalOpen} onClose={() => setIsSaksiModalOpen(false)} title={editingSaksiIndex !== null ? "Edit Data Saksi" : "Tambah Data Saksi"}>
          <div className="space-y-4">
              <ImageUploader onImageSelect={handleImageSelectedForSaksi} label="Unggah Foto Identitas Saksi (KTP/SIM)"
                  disabled={ocrDisabled} disabledMessage={ocrDisabledMessage + " Input data manual di bawah."} />
              {isLoadingSaksiOcr && !ocrDisabled && <LoadingSpinner text="Memproses gambar saksi..." />}
              {ocrSaksiError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{ocrSaksiError}</p>}
              {currentEditingSaksi && (
                <div className="space-y-3 mt-4 pt-4 border-t">
                  <LabeledInput label="Nama Lengkap Saksi" id="saksiNama" value={currentEditingSaksi.namaLengkap || ''} onChange={e => handleSaksiDataChange('namaLengkap', e.target.value)} suggestionsKey="saksiNama_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledInput label="Nomor Identitas Saksi (NIK/SIM)" id="saksiNik" value={currentEditingSaksi.nomorIdentitas || ''} onChange={e => handleSaksiDataChange('nomorIdentitas', e.target.value)} suggestionsKey="saksiNik_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledInput label="Alamat Saksi" id="saksiAlamat" value={currentEditingSaksi.alamat || ''} onChange={e => handleSaksiDataChange('alamat', e.target.value)} suggestionsKey="saksiAlamat_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledInput label="Tempat Lahir Saksi" id="saksiTempatLahir" value={currentEditingSaksi.tempatLahir || ""} onChange={e => handleSaksiDataChange('tempatLahir', e.target.value)} suggestionsKey={`saksi_tempatLahir_${currentEditingSaksi.id || 'new'}`} getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledInput label="Tanggal Lahir Saksi (DD-MM-YYYY)" id="saksiTglLahir" value={currentEditingSaksi.tanggalLahir || ''} onChange={e => handleSaksiDataChange('tanggalLahir', e.target.value)} placeholder="DD-MM-YYYY" />
                  <LabeledSelect label="Jenis Kelamin Saksi" id="saksiJenisKelamin" value={currentEditingSaksi.jenisKelamin || ""} onChange={e => handleSaksiDataChange('jenisKelamin', e.target.value as SaksiInfo['jenisKelamin'])} >
                      <option value="" disabled>Pilih Jenis Kelamin</option> <option value="Laki-laki">Laki-laki</option> <option value="Perempuan">Perempuan</option>
                  </LabeledSelect>
                  <LabeledInput label="Pekerjaan Saksi" id="saksiPekerjaan" value={currentEditingSaksi.pekerjaan || ''} onChange={e => handleSaksiDataChange('pekerjaan', e.target.value)} suggestionsKey="saksiPekerjaan_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledInput label="Umur Saksi (Contoh: 30 Th)" id="saksiUmur" value={currentEditingSaksi.umurString || ''} onChange={e => handleSaksiDataChange('umurString', e.target.value)} placeholder={currentEditingSaksi.tanggalLahir ? 'Otomatis/Manual' : 'Wajib diisi jika Tgl Lahir kosong'} suggestionsKey="saksiUmur_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                  <LabeledTextarea label="Keterangan Saksi" id="saksiKeterangan" value={currentEditingSaksi.keteranganSaksi || ''} onChange={e => handleSaksiDataChange('keteranganSaksi', e.target.value)} rows={3} placeholder="Apa yang dilihat/diketahui saksi..." suggestionsKey="saksiKeterangan_suggestions" getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage} />
                </div>
              )}
          </div>
          <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
            <button type="button" onClick={() => setIsSaksiModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"> Batal </button>
            <button type="button" onClick={handleSaveSaksi} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"> Simpan Saksi </button>
          </div>
        </Modal>

        <Modal
          isOpen={isPrintLpModalOpen}
          onClose={() => setIsPrintLpModalOpen(false)}
          title="Pilih Petugas untuk Cetak LP"
        >
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3 border-b pb-2">Petugas Pembuat Laporan</h3>
                <div className="space-y-4">
                    <LabeledSelect
                        label="Nama Petugas"
                        id="reportingOfficer"
                        value={selectedReportingOfficerName}
                        onChange={(e) => setSelectedReportingOfficerName(e.target.value)}
                    >
                        {REPORTING_OFFICERS.map(officer => (
                            <option key={officer.nrp} value={officer.nama}>
                                {officer.nama}
                            </option>
                        ))}
                    </LabeledSelect>
                    <LabeledInput
                        label="Pangkat"
                        id="reportingPangkat"
                        value={selectedReportingOfficerDetails?.pangkat || ''}
                        readOnly
                        onChange={() => {}}
                    />
                    <LabeledInput
                        label="NRP"
                        id="reportingNrp"
                        value={selectedReportingOfficerDetails?.nrp || ''}
                        readOnly
                        onChange={() => {}}
                    />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3 border-b pb-2">Petugas Penerima Laporan SPKT</h3>
                <div className="space-y-4">
                  <LabeledSelect
                    label="Nama Petugas"
                    id="spktOfficer"
                    value={selectedSpktOfficerName}
                    onChange={(e) => setSelectedSpktOfficerName(e.target.value)}
                  >
                    {SPKT_OFFICERS.map(officer => (
                      <option key={officer.nrp} value={officer.nama}>
                        {officer.nama}
                      </option>
                    ))}
                  </LabeledSelect>
                  <LabeledInput
                      label="KSPK REGU"
                      id="spktRegu"
                      value={selectedSpktOfficerDetails?.regu || ''}
                      readOnly
                      onChange={() => {}}
                  />
                  <LabeledInput
                    label="Pangkat"
                    id="spktPangkat"
                    value={selectedSpktOfficerDetails?.pangkat || ''}
                    readOnly
                    onChange={() => {}}
                  />
                  <LabeledInput
                    label="NRP"
                    id="spktNrp"
                    value={selectedSpktOfficerDetails?.nrp || ''}
                    readOnly
                    onChange={() => {}}
                  />
                </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
            <button 
              type="button"
              onClick={() => setIsPrintLpModalOpen(false)} 
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button 
              type="button" 
              onClick={proceedToPrint} 
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Lanjutkan Mencetak
            </button>
          </div>
        </Modal>


        <footer className="text-center mt-12 py-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Asisten Laporan Kecelakaan Lalu Lintas - Polres Tasikmalaya.</p>
          <p>Dibuat untuk efisiensi petugas di lapangan. Semua data disimpan di perangkat Anda.</p>
        </footer>
      </div>
      {activeReport && view === 'editor' && ReactDOM.createPortal(
        <PrintableReport reportData={activeReport} />,
        document.getElementById('print-root')!
      )}
    </>
  );
};

// Internal component for the Entity Editing Modal form
interface EntityFormProps {
    entityData: Partial<InvolvedEntity> | null;
    onDataChange: (field: keyof InvolvedVehicle, value: string) => void;
    getSuggestionsFunc: (key: string) => string[];
    addSuggestionFunc: (key: string, value: string) => void;
}

const EntityForm: React.FC<EntityFormProps> = ({ entityData, onDataChange, getSuggestionsFunc, addSuggestionFunc }) => {
    
    if (!entityData) return null;
    if (entityData.type === 'Pejalan Kaki') {
        return <p className="text-center text-slate-600 p-4">Anda menambahkan entitas Pejalan Kaki. Tidak ada data tambahan yang diperlukan. Klik simpan untuk melanjutkan.</p>;
    }
    
    const [isDropdownMode, setIsDropdownMode] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');

    const vehicleData = entityData as Partial<InvolvedVehicle>;

    const handleDataChange = (field: keyof InvolvedVehicle) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onDataChange(field, e.target.value);
    };

    useEffect(() => {
        if (vehicleData.jenisKendaraan) {
            let isDropdown = false;
            let catToSet = ''; let brandToSet = ''; let modelToSet = '';
            const currentFullJenis = vehicleData.jenisKendaraan;
            
            Object.keys(VEHICLE_DATA).forEach(categoryKey => {
                const brandsInCategory = VEHICLE_DATA[categoryKey as keyof typeof VEHICLE_DATA];
                Object.keys(brandsInCategory).forEach(brandKey => {
                    const modelsArray = brandsInCategory[brandKey];
                    if (Array.isArray(modelsArray) && modelsArray.some(modelKey => `${brandKey} ${modelKey}` === currentFullJenis)) {
                        const matchingModel = modelsArray.find(modelKey => `${brandKey} ${modelKey}` === currentFullJenis);
                        if (matchingModel) {
                          catToSet = categoryKey; brandToSet = brandKey; modelToSet = matchingModel;
                          isDropdown = true;
                        }
                    }
                });
            });

            setIsDropdownMode(isDropdown);
            if (isDropdown) {
                setSelectedCategory(catToSet); setSelectedBrand(brandToSet); setSelectedModel(modelToSet);
            }
        }
    }, [vehicleData.jenisKendaraan]);


    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value;
        setSelectedCategory(newCategory); setSelectedBrand(''); setSelectedModel('');
        onDataChange('jenisKendaraan', '');
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBrand = e.target.value;
        setSelectedBrand(newBrand); setSelectedModel('');
        onDataChange('jenisKendaraan', '');
    };
    
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModelValue = e.target.value;
        setSelectedModel(newModelValue);
        if (newModelValue === MANUAL_INPUT_OPTION) {
            setIsDropdownMode(false);
        } else if (selectedBrand && newModelValue) {
            onDataChange('jenisKendaraan', `${selectedBrand} ${newModelValue}`);
        }
    };
    
    const toggleVehicleInputMode = () => {
        const newMode = !isDropdownMode;
        setIsDropdownMode(newMode);
        if (newMode) { // newMode is true, meaning we are switching to dropdown
            if (selectedCategory && selectedBrand && selectedModel && selectedModel !== MANUAL_INPUT_OPTION) {
                onDataChange('jenisKendaraan', `${selectedBrand} ${selectedModel}`);
            } else {
                onDataChange('jenisKendaraan', '');
                setSelectedCategory(''); setSelectedBrand(''); setSelectedModel('');
            }
        }
    };

    const getBrandOptions = useCallback(() => {
        if (!selectedCategory || !VEHICLE_DATA[selectedCategory as keyof typeof VEHICLE_DATA]) return [];
        return Object.keys(VEHICLE_DATA[selectedCategory as keyof typeof VEHICLE_DATA]);
    }, [selectedCategory]);

    const getModelOptions = useCallback(() => {
        if (!selectedCategory || !selectedBrand || !VEHICLE_DATA[selectedCategory as keyof typeof VEHICLE_DATA]) return [MANUAL_INPUT_OPTION];
        const models = (VEHICLE_DATA[selectedCategory as keyof typeof VEHICLE_DATA] as any)[selectedBrand];
        return Array.isArray(models) ? [...models, MANUAL_INPUT_OPTION] : [MANUAL_INPUT_OPTION];
    }, [selectedCategory, selectedBrand]);
    
    const isJenisKendaraanReadOnly = isDropdownMode && selectedModel !== '' && selectedModel !== MANUAL_INPUT_OPTION;

    return (
        <div className="space-y-4">
            <div className="my-3 p-3 border border-slate-200 rounded-md space-y-3 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-slate-700">Input Jenis Kendaraan:</p>
                    <button type="button" onClick={toggleVehicleInputMode} className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                        {isDropdownMode ? 'Isi Manual' : 'Pilih dari Daftar'}
                    </button>
                </div>

                {isDropdownMode && (
                    <>
                        <LabeledSelect label="Kategori Kendaraan" id="vehicleCategory" value={selectedCategory} onChange={handleCategoryChange}>
                            <option value="">-- Pilih Kategori --</option>
                            {Object.keys(VEHICLE_DATA).map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                        </LabeledSelect>
                        <LabeledSelect label="Merk Kendaraan" id="vehicleBrand" value={selectedBrand} onChange={handleBrandChange} disabled={!selectedCategory}>
                            <option value="">-- Pilih Merk --</option>
                            {getBrandOptions().map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </LabeledSelect>
                        <LabeledSelect label="Model/Jenis Spesifik" id="vehicleModel" value={selectedModel} onChange={handleModelChange} disabled={!selectedCategory || !selectedBrand}>
                            <option value="">-- Pilih Model/Jenis --</option>
                            {getModelOptions().map(model => <option key={model} value={model}>{model}</option>)}
                        </LabeledSelect>
                    </>
                )}

                <LabeledInput
                    label="Jenis Kendaraan (Hasil)" id="jenisKendaraan" value={vehicleData.jenisKendaraan || ""}
                    onChange={handleDataChange('jenisKendaraan')}
                    readOnly={isJenisKendaraanReadOnly}
                    suggestionsKey={!isDropdownMode ? `entity_jenisKendaraan_${entityData.id || 'new'}` : undefined}
                    getSuggestionsFunc={getSuggestionsFunc} addSuggestionFunc={addSuggestionFunc}
                />
            </div>
            
            <LabeledInput
                label="Nomor Polisi Kendaraan" id="nomorPolisi" value={vehicleData.nomorPolisi || ""}
                onChange={handleDataChange('nomorPolisi')} suggestionsKey={`entity_nomorPolisi_${entityData.id || 'new'}`}
                getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
            />
            <LabeledTextarea
                label="Kerusakan Kendaraan" id="kerusakan" value={vehicleData.kerusakan || ""}
                onChange={e => onDataChange('kerusakan', e.target.value)} rows={3} placeholder="Deskripsikan kerusakan kendaraan..."
                suggestionsKey={`entity_kerusakan_${entityData.id || 'new'}`} getSuggestionsFunc={getSuggestionsFromStorage} addSuggestionFunc={addSuggestionToStorage}
            />
        </div>
    );
};


export default App;
