
export const GEMINI_MODEL_TEXT_MULTIMODAL = "gemini-2.5-flash";

export const OCR_PROMPT_TEMPLATE = (language: string = "id") => {
  if (language === "id") {
    return `Anda adalah asisten OCR yang sangat akurat untuk petugas polisi di Indonesia. Tugas Anda adalah menganalisis gambar dokumen dan mengekstrak informasi relevan.
Identifikasi jenis dokumen: KTP, SIM, STNK, atau Kartu Keluarga (KK).

Format Output JSON yang diharapkan (KEMBALIKAN HANYA JSON YANG VALID):
{
  "documentType": "KTP" | "SIM" | "KK" | "STNK" | "LAINNYA" | null,
  "namaLengkap": "Nama Lengkap Sesuai Dokumen",
  "nomorIdentitas": "Nomor Identitas (NIK/SIM)",
  "alamat": "Kp. [Nama Kampung/Jalan], RT [RT] RW [RW], Ds./Kel. [Nama Desa/Kelurahan], Kec. [Nama Kecamatan], [Kabupaten/Kota] [Nama Kabupaten/Kota]",
  "tempatLahir": "Tempat Lahir Sesuai Dokumen",
  "tanggalLahir": "DD-MM-YYYY",
  "jenisKelamin": "Laki-laki" | "Perempuan" | null,
  "pekerjaan": "Pekerjaan Sesuai Dokumen",
  "agama": "Agama Sesuai Dokumen (khususnya dari KTP)",
  "nomorPolisi": "Nomor Polisi (jika ada)",
  "familyMembers": [
    {
      "namaLengkap": "Nama Anggota Keluarga",
      "nomorIdentitas": "NIK Anggota Keluarga",
      "alamat": "Kp. [Nama Kampung/Jalan Anggota], RT [RT] RW [RW], Ds./Kel. [Desa/Kelurahan Anggota], Kec. [Kecamatan Anggota], [Kabupaten/Kota] [Nama Kabupaten/Kota Anggota]",
      "tempatLahir": "Tempat Lahir Anggota Keluarga",
      "tanggalLahir": "DD-MM-YYYY",
      "jenisKelamin": "Laki-laki" | "Perempuan" | null,
      "pekerjaan": "Pekerjaan Anggota Keluarga",
      "hubunganKeluarga": "Hubungan Keluarga (mis: Istri, Anak)"
    }
  ] | null,
  "alamatKartuKeluarga": "Kp. [Nama Kampung/Jalan KK], RT [RT] RW [RW], Ds./Kel. [Desa/Kelurahan KK], Kec. [Kecamatan KK], [Kabupaten/Kota] [Nama Kabupaten/Kota KK]",
  "jenisKendaraanStnk": "Jenis Kendaraan STNK",
  "namaPemilikStnk": "Nama Pemilik STNK (jika berbeda)",
  "alamatStnk": "Kp. [Nama Kampung/Jalan STNK], RT [RT] RW [RW], Ds./Kel. [Desa/Kelurahan STNK], Kec. [Kecamatan STNK], [Kabupaten/Kota] [Nama Kabupaten/Kota STNK]"
}

Instruksi Detail:
1.  **Identifikasi Tipe Dokumen**: Isi \`documentType\` dengan 'KTP', 'SIM', 'KK', 'STNK', atau 'LAINNYA'. Jika tidak teridentifikasi, isi 'LAINNYA' atau null.
2.  **Format Alamat (SANGAT PENTING)**: Untuk SEMUA field yang berkaitan dengan alamat (\`alamat\`, \`familyMembers.alamat\`, \`alamatKartuKeluarga\`, \`alamatStnk\`):
    a.  Ekstrak komponen-komponen berikut dari dokumen:
        *   Nama Kampung atau Nama Jalan (beserta nomor rumah jika menyatu, misal 'Kp. Sindangsari' atau 'Jl. Merdeka No. 10').
        *   Nomor RT (jika ada, format 'RT xxx', misal 'RT 001').
        *   Nomor RW (jika ada, format 'RW xxx', misal 'RW 003').
        *   Nama Desa atau Kelurahan.
        *   Nama Kecamatan.
        *   Nama Kabupaten atau Kota, dan secara internal tentukan apakah ini 'Kabupaten' atau 'Kota'.
    b.  Susun string alamat dengan format dan urutan WAJIB sebagai berikut:
        '[Nama Kampung/Jalan], [RT xxx] [RW xxx], [Ds./Kel.] [Nama Desa/Kelurahan], Kec. [Nama Kecamatan], [Kabupaten/Kota] [Nama Kabupaten/Kota]'
    c.  Penentuan 'Ds.' atau 'Kel.':
        *   Jika wilayah adalah 'Kabupaten', gunakan 'Ds. [Nama Desa]'. Contoh: 'Ds. Sindangjaya'.
        *   Jika wilayah adalah 'Kota', gunakan 'Kel. [Nama Kelurahan]'. Contoh: 'Kel. Cihideung'.
    d.  Jika salah satu komponen (misalnya RT/RW, atau Kampung/Jalan) tidak ditemukan di dokumen, hilangkan bagian tersebut DARI STRING AKHIR, namun tetap pertahankan urutan dan tanda baca komponen lainnya sedapat mungkin.
        *   Contoh format jika lengkap (Kabupaten): 'Kp. Sindangsari, RT 001 RW 003, Ds. Sindangjaya, Kec. Cikalong, Kabupaten Tasikmalaya'.
        *   Contoh format jika lengkap (Kota): 'Jl. Pahlawan No. 5, RT 002 RW 001, Kel. Sukajaya, Kec. Bungursari, Kota Tasikmalaya'.
        *   Contoh jika RT/RW tidak ada: 'Kp. Cipatujah, Ds. Cipatujah, Kec. Cipatujah, Kabupaten Tasikmalaya'.
        *   Contoh jika Kp/Jalan tidak ada: 'RT 001 RW 001, Ds. Sindangrasa, Kec. Ciamis, Kabupaten Ciamis'. (Jika Kp/Jalan tidak ada, RT/RW bisa jadi komponen pertama).
        *   Contoh jika hanya Desa/Kel, Kec, Kab/Kota: 'Ds. Bojongsari, Kec. Padaherang, Kabupaten Pangandaran'.
    e.  JANGAN sertakan nama Provinsi dalam field alamat ini.
3.  **KTP**: Ekstrak Nama, NIK (ke \`nomorIdentitas\`), Tempat Lahir, Tgl Lahir, Jenis Kelamin, Agama, Pekerjaan. Field \`alamat\` harus diformat sesuai Instruksi #2. \`familyMembers\` harus null. Gunakan casing yang wajar.
4.  **SIM**: Ekstrak Nama, No. SIM (ke \`nomorIdentitas\`), Tempat Lahir, Tgl Lahir, Jenis Kelamin. Field \`alamat\` harus diformat sesuai Instruksi #2. Jika ada info No. Polisi terkait SIM, masukkan ke \`nomorPolisi\`. \`familyMembers\` harus null. Gunakan casing yang wajar.
5.  **Kartu Keluarga (KK)**:
    *   Isi \`namaLengkap\`, \`nomorIdentitas\`, \`tempatLahir\`, \`tanggalLahir\`, \`jenisKelamin\`, \`pekerjaan\` dengan data Kepala Keluarga. Gunakan casing yang wajar.
    *   Isi \`alamatKartuKeluarga\` dengan alamat utama di KK, diformat sesuai Instruksi #2.
    *   Field \`alamat\` utama (untuk kepala keluarga) juga harus diisi dengan nilai dari \`alamatKartuKeluarga\` yang sudah diformat.
    *   Ekstrak data SETIAP ANGGOTA KELUARGA ke dalam array \`familyMembers\`. Untuk setiap anggota, pastikan ada \`namaLengkap\`, \`nomorIdentitas\` (NIK), \`tempatLahir\`, \`tanggalLahir\`, \`jenisKelamin\`, \`pekerjaan\`, \`hubunganKeluarga\`. Alamat anggota keluarga (\`familyMembers.alamat\`) juga harus diformat sesuai Instruksi #2. Gunakan casing yang wajar.
6.  **STNK**:
    *   Isi \`namaLengkap\` (nama pemilik), \`nomorIdentitas\` (NIK pemilik jika ada di STNK), \`tempatLahir\` (jika ada), \`tanggalLahir\` (jika ada), \`jenisKelamin\` (jika ada), \`nomorPolisi\`, \`jenisKendaraanStnk\`. Gunakan casing yang wajar.
    *   Isi \`alamatStnk\` untuk alamat pemilik di STNK, diformat sesuai Instruksi #2.
    *   Field \`alamat\` utama (untuk pemilik) juga harus diisi dengan nilai dari \`alamatStnk\` yang sudah diformat.
    *   Jika nama pemilik di STNK adalah nama perusahaan atau berbeda dari individu, \`namaPemilikStnk\` bisa diisi.
    *   \`familyMembers\` harus null.
7.  **Data Umum**:
    *   Untuk \`tanggalLahir\`, pastikan format \`DD-MM-YYYY\`.
    *   Untuk \`jenisKelamin\`, gunakan "Laki-laki" atau "Perempuan". Jika tidak jelas, gunakan null.
    *   Untuk \`agama\`, ekstrak dari dokumen (biasanya KTP). Jika tidak ditemukan, gunakan null atau string kosong "".
    *   Jika suatu field tidak ditemukan atau tidak relevan untuk tipe dokumen (selain alamat yang punya format khusus), gunakan \`null\` atau string kosong "".
    *   Pastikan semua nilai string menggunakan casing yang wajar (hindari semua huruf kapital kecuali memang seharusnya seperti itu, misal singkatan).
    *   Fokus pada akurasi.

KEMBALIKAN HASILNYA DALAM FORMAT JSON YANG VALID SAJA, TANPA TEKS PENJELASAN TAMBAHAN.
`;
  }
  // Fallback or other languages can be added here
  return `You are a highly accurate OCR assistant. Analyze the document image. Identify document type: KTP (ID Card), SIM (Driver's License), KK (Family Card), STNK (Vehicle Reg. Cert.), or OTHER. Extract information into the JSON structure.
  For ALL address fields ('alamat', 'familyMembers.alamat', 'alamatKartuKeluarga', 'alamatStnk'), follow these steps:
  1. Extract: Village/Street Name (e.g., 'Kp. Sindangsari' or 'Jl. Merdeka No. 10'), RT number (e.g., 'RT 001'), RW number (e.g., 'RW 003'), Sub-district/Village name (Desa/Kelurahan), District name (Kecamatan), Regency/City name (Kabupaten/Kota), and determine if it's a 'Kabupaten' or 'Kota'.
  2. Format as: '[Village/Street Name], [RT xxx] [RW xxx], [Ds./Kel.] [Sub-district/Village Name], Kec. [District Name], [Regency/City Type] [Regency/City Name]'.
  3. For '[Ds./Kel.]': Use 'Ds. [Desa Name]' if it's a 'Kabupaten'; use 'Kel. [Kelurahan Name]' if it's a 'Kota'.
  4. Omit missing parts but maintain order and punctuation. Example (Regency): 'Kp. Sindangsari, RT 001 RW 003, Ds. Sindangjaya, Kec. Cikalong, Kabupaten Tasikmalaya'. Example (City): 'Jl. Pahlawan No. 5, RT 002 RW 001, Kel. Sukajaya, Kec. Bungursari, Kota Tasikmalaya'.
  5. Do NOT include province.
  Use natural casing, and null or empty strings for missing/irrelevant fields (except address). Pay attention to 'familyMembers' for KK (null if not KK). Also extract 'agama' (religion) from KTP. Return ONLY VALID JSON.`;
};

export const OCR_PROMPT_SAKSI_TEMPLATE = (language: string = "id") => {
  if (language === "id") {
    return `Anda adalah asisten OCR yang sangat akurat untuk petugas polisi di Indonesia. Ekstrak informasi berikut dari gambar dokumen identitas SAKSI ini (biasanya KTP atau SIM):
1. Nama Lengkap
2. Nomor Identitas (NIK dari KTP, atau Nomor SIM jika ada)
3. Alamat (Format WAJIB, lihat instruksi detail di bawah)
4. Tempat Lahir
5. Tanggal Lahir (pastikan format DD-MM-YYYY)
6. Jenis Kelamin ("Laki-laki" atau "Perempuan")
7. Pekerjaan

Instruksi Format Alamat (Poin #3, SANGAT PENTING):
    a.  Ekstrak komponen-komponen berikut dari dokumen:
        *   Nama Kampung atau Nama Jalan (beserta nomor rumah jika menyatu, misal 'Kp. Sindangsari' atau 'Jl. Merdeka No. 10').
        *   Nomor RT (jika ada, format 'RT xxx', misal 'RT 001').
        *   Nomor RW (jika ada, format 'RW xxx', misal 'RW 003').
        *   Nama Desa atau Kelurahan.
        *   Nama Kecamatan.
        *   Nama Kabupaten atau Kota, dan secara internal tentukan apakah ini sebuah 'Kabupaten' atau 'Kota'.
    b.  Susun string alamat dengan format dan urutan WAJIB sebagai berikut:
        '[Nama Kampung/Jalan], [RT xxx] [RW xxx], [Ds./Kel.] [Nama Desa/Kelurahan], Kec. [Nama Kecamatan], [Kabupaten/Kota] [Nama Kabupaten/Kota]'
    c.  Penentuan 'Ds.' atau 'Kel.':
        *   Jika wilayah adalah 'Kabupaten', gunakan 'Ds. [Nama Desa]'. Contoh: 'Ds. Sindangjaya'.
        *   Jika wilayah adalah 'Kota', gunakan 'Kel. [Nama Kelurahan]'. Contoh: 'Kel. Cihideung'.
    d.  Jika salah satu komponen (misalnya RT/RW, atau Kampung/Jalan) tidak ditemukan di dokumen, hilangkan bagian tersebut DARI STRING AKHIR, namun tetap pertahankan urutan dan tanda baca komponen lainnya sedapat mungkin.
        *   Contoh format jika lengkap (Kabupaten): 'Kp. Sindangsari, RT 001 RW 003, Ds. Sindangjaya, Kec. Cikalong, Kabupaten Tasikmalaya'.
        *   Contoh format jika lengkap (Kota): 'Jl. Pahlawan No. 5, RT 002 RW 001, Kel. Sukajaya, Kec. Bungursari, Kota Tasikmalaya'.
    e.  JANGAN sertakan nama Provinsi dalam field alamat ini.

Gunakan casing yang wajar (tidak semua huruf kapital) untuk semua hasil ekstraksi.
Jika salah satu informasi tidak ditemukan (selain alamat yang punya format khusus), gunakan string kosong "" atau null sebagai nilainya.
KEMBALIKAN HASILNYA DALAM FORMAT JSON YANG VALID SAJA, TANPA TEKS PENJELASAN TAMBAHAN.
Contoh JSON yang diharapkan:
{
  "namaLengkap": "Nama Saksi Lengkap",
  "nomorIdentitas": "3278000000000000",
  "alamat": "Kp. Saksi Indah, RT 005 RW 001, Ds. Saksi Jaya, Kec. Saksi Makmur, Kabupaten Saksi Sejahtera",
  "tempatLahir": "Tasikmalaya",
  "tanggalLahir": "DD-MM-YYYY",
  "jenisKelamin": "Laki-laki",
  "pekerjaan": "Pekerjaan Saksi"
}
Pastikan semua nilai string (kecuali jenisKelamin bisa null). Jika ada informasi yang tidak ada (selain alamat), kembalikan string kosong atau null untuk field tersebut. Untuk alamat, jika komponen tidak ada, sesuaikan formatnya.`;
  }
  return `You are a highly accurate OCR assistant for witness ID (usually KTP or SIM). Extract: Full Name, ID Number, Address, Birth Place, Date of Birth (DD-MM-YYYY), Gender ("Laki-laki" or "Perempuan"), Occupation.
  For Address, follow these steps:
  1. Extract: Village/Street Name (e.g., 'Kp. Sindangsari' or 'Jl. Merdeka No. 10'), RT number (e.g., 'RT 001'), RW number (e.g., 'RW 003'), Sub-district/Village name (Desa/Kelurahan), District name (Kecamatan), Regency/City name (Kabupaten/Kota), and determine if it's a 'Kabupaten' or 'Kota'.
  2. Format as: '[Village/Street Name], [RT xxx] [RW xxx], [Ds./Kel.] [Sub-district/Village Name], Kec. [District Name], [Regency/City Type] [Regency/City Name]'.
  3. For '[Ds./Kel.]': Use 'Ds. [Desa Name]' if it's a 'Kabupaten'; use 'Kel. [Kelurahan Name]' if it's a 'Kota'.
  4. Omit missing parts but maintain order. Do NOT include province.
  Use natural casing. Return as a JSON object with keys: "namaLengkap", "nomorIdentitas", "alamat", "tempatLahir", "tanggalLahir", "jenisKelamin", "pekerjaan". Use empty strings or null for missing values (except address).`;
};

export const MANUAL_INPUT_OPTION = "LAINNYA (ISI MANUAL)";

export const VEHICLE_DATA: Record<string, Record<string, string[]>> = {
  MOBIL: {
    Toyota: ["Avanza", "Kijang Innova", "Innova Zenix", "Rush", "Fortuner", "Calya", "Agya", "Yaris", "Raize", "Alphard", "Vellfire", "Land Cruiser", "Vios", "Corolla Altis", "Camry", "Hilux"],
    Daihatsu: ["Xenia", "Terios", "Sigra", "Ayla", "Sirion", "Gran Max PU", "Gran Max MB", "Rocky", "Luxio", "Taft"],
    Honda: ["Brio Satya", "Brio RS", "HR-V", "CR-V", "Mobilio", "BR-V", "Civic", "City Hatchback RS", "City Sedan", "Accord", "WR-V"],
    Mitsubishi: ["Xpander", "Xpander Cross", "Pajero Sport", "L300 Pick-up", "Triton", "Outlander Sport", "Eclipse Cross", "Xforce"],
    Suzuki: ["Ertiga", "XL7", "Carry Pick-up", "Ignis", "Baleno", "S-Presso", "Jimny", "Grand Vitara", "APV"],
    Nissan: ["Livina", "Magnite", "Kicks e-Power", "Serena", "Terra", "Navara", "X-Trail"],
    Hyundai: ["Creta", "Stargazer", "Stargazer X", "Palisade", "Santa Fe", "Ioniq 5", "Ioniq 6", "Staria", "Kona Electric"],
    Wuling: ["Almaz", "Almaz RS", "Almaz Hybrid", "Confero", "Confero S", "Cortez", "Cortez CT", "Air EV", "Alvez", "Formo Max", "Binguo EV", "Cloud EV"],
    Kia: ["Sonet", "Seltos", "Carnival", "Carens", "EV6", "EV9", "Picanto", "Rio"],
    Mazda: ["CX-5", "CX-3", "CX-30", "CX-60", "CX-8", "CX-9", "Mazda2 Sedan", "Mazda2 Hatchback", "Mazda3 Sedan", "Mazda3 Hatchback", "Mazda6"],
    BMW: ["Seri 3 (320i, 330i)", "Seri 5 (520i, 530i)", "Seri 7", "X1", "X3", "X5", "X7", "iX", "i4"],
    "Mercedes-Benz": ["C-Class (C200, C300)", "E-Class (E200, E300)", "S-Class", "GLA", "GLB", "GLC", "GLE", "A-Class", "EQA", "EQB", "EQE", "EQS"],
    DFSK: ["Glory 560", "Glory i-Auto", "Super Cab", "Gelora E", "Gelora Minibus"],
    Chery: ["Omoda 5", "Tiggo 7 Pro", "Tiggo 8 Pro"],
    Isuzu: ["Panther", "MU-X", "D-Max", "Traga"],
    Subaru: ["Forester", "XV", "Outback", "WRX", "BRZ"],
    MG: ["ZS", "HS", "MG4 EV", "MG5 GT"],
    // "LAINNYA" brand can be added if needed for "Other Car Brand"
  },
  MOTOR: {
    Honda: ["Beat", "Beat Street", "Beat Deluxe", "Vario 125", "Vario 150", "Vario 160", "Scoopy", "PCX 160", "ADV 160", "Supra X 125", "Revo X", "Revo Fit", "CB150R Streetfire", "CBR150R", "CBR250RR", "CRF150L", "CRF250 Rally", "Genio", "Sonic 150R", "Forza 250", "Stylo 160", "Monkey", "Super Cub C125", "CT125"],
    Yamaha: ["NMAX", "NMAX Connected", "Aerox 155", "Aerox Connected", "Lexi", "Lexi LX 155", "Mio M3", "Fino", "FreeGo", "X-Ride", "Vixion", "Vixion R", "R15", "R15M", "R25", "MT-15", "MT-25", "Jupiter MX King", "Jupiter Z1", "WR155R", "XSR 155", "Fazzio Hybrid", "Grand Filano Hybrid", "Tenere 700", "XMAX Connected", "TMAX DX"],
    Suzuki: ["Address FI", "Address Playful", "NEX II", "NEX Crossover", "GSX-R150", "GSX-S150", "Satria F150 FI", "GSX Bandit 150", "Skydrive", "Smash FI", "Burgman Street 125EX", "V-Strom 250SX"],
    Kawasaki: ["Ninja 250", "Ninja 250 FI", "Ninja ZX-25R", "Ninja ZX-4RR", "Ninja ZX-6R", "Ninja ZX-10R", "KLX150", "KLX150BF", "KLX150SE", "KLX230", "KLX250", "W175", "W175 SE", "W175 TR", "W175 Cafe", "D-Tracker", "Versys-X 250", "Versys 650", "Z250", "Z900RS", "Eliminator"],
    Vespa: ["Primavera", "Primavera S", "Sprint", "Sprint S", "GTS Super 150", "GTS Super Sport 150", "GTS Super Tech 300", "LX 125 i-Get", "S 125 i-Get", "Elettrica", "Sei Giorni"],
    TVS: ["Ntorq 125", "Apache RTR 160", "Apache RTR 200", "XL100", "Callisto", "Radeon", "Ronin"],
    KTM: ["Duke 200", "Duke 250", "Duke 390", "RC 200", "RC 250", "RC 390", "Adventure 250", "Adventure 390"],
    Benelli: ["Patagonian Eagle 250", "Motobi 200 Evo", "TRK 251", "Leoncino 250", "Leoncino 500", "TNT 135", "Imperiale 400"],
    Piaggio: ["MP3 300", "Medley S 150"],
    Husqvarna: ["Svartpilen 250", "Svartpilen 401", "Vitpilen 250", "Vitpilen 401"],
    // Fix for constants.ts line 119: Quote "Royal Enfield"
    "Royal Enfield": ["Classic 350", "Meteor 350", "Himalayan", "Interceptor 650", "Continental GT 650", "Hunter 350"],
    // "LAINNYA" brand can be added
  },
  LAINNYA_KENDARAAN: { // This category for other types of vehicles
    "Truk": ["Bak Terbuka", "Box", "Tangki", "Engkel", "Double Engkel", "Tronton", "Wing Box", "Dump Truck"],
    "Bus": ["Besar (Big Bus)", "Sedang (Medium Bus)", "Kecil (Microbus/Elf)", "Pariwisata", "TransJakarta", "Angkutan Kota (Angkot)"],
    "Sepeda": ["Gunung (MTB)", "Lipat (Folding Bike)", "Listrik (E-Bike)", "Balap (Road Bike)", "Onthel", "BMX"],
    "Alat Berat": ["Excavator", "Bulldozer", "Forklift", "Crane Mobil", "Wheel Loader", "Grader"],
    "Kendaraan Roda Tiga": ["Bajaj Qute", "Viar Karya", "Kaisar Triseda", "Tossa", "Angkutan Roda Tiga Lain"],
    "Kendaraan Khusus": ["Ambulans", "Pemadam Kebakaran", "Mobil Derek", "Mobil Jenazah", "Food Truck"],
    "Kendaraan Lain-lain": ["Gerobak Motor (Germor)", "Odong-odong", "Kereta Kelinci", "Sepeda Motor Roda Tiga (untuk difabel)", "Skuter Listrik", "Otoped Listrik"]
  }
};