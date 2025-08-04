
import React from 'react';
import type { AccidentReportData, ExtractedPartyInfo, InvolvedVehicle, SaksiInfo } from '../types';
import { VEHICLE_DATA } from '../constants';

interface PrintableReportProps {
  reportData: AccidentReportData;
}

// Helper functions (copied from App.tsx to make component self-contained for printing)
const calculateAge = (birthDateString?: string): string => {
  if (!birthDateString) return "";
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return "";
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) return "";
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? `${age} Tahun` : "";
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

const formatDateToIndonesian = (dateString: string): string => {
    if (!dateString) return "(Belum diisi)";
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Asia/Jakarta'
        }).format(date) + " WIB";
    } catch {
        return dateString;
    }
};

const formatDateOnlyIndonesian = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
  }).format(date);
}

const POLRI_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAajSURBVHgB7Z1/aBVVFMd/585lXRdKQRJqBUpQWpBoRfsstM2h8I9WCsUWIIsIq3ywbEeLBFtE2SIrslsEFdqCklgqgkWVWpBoUNFSS0sL2G25d7/mzu3O3fe9e+/e3X3fnfODL3PvnXO/Z85v5syZWRCAQCgUCoX+a6AMfBw0OEJgEiRjFpgD34Kcwk+kCvwbVLNCYBJcBSYcowDwwS/DVoA8kIFb4K9j5TmA9+F3YBssAVwN/gYyOQ/wKngv6BqsBGwBPoGkzQP4Ongt6BpsBbwBvh+oPQrwY+B1sBIwBfgaUD0Z8A74HqgGbAF+BpoeA9gP3gA6AbcCh4COp/YnwDngVaARsBKYAvwKND0N8DX4CmgEHAIOAUvAg/sT4A3wHdAIeAG4BmwA/t3zQdYAB4COAJeAr4FmwT9ABuAWqAa2Am+Amf1PwA3gBWAzsBG4BvQC9qOAVwHHgW5AE+A3YDuwHfgSuA4cBx4FjgE/Ad+Bq4EPwNfApeAm8BfwGPAi8CF4C/gUuA0sB+bNswFHgCuBvcBnQAlgFfA88CpwCHgQOAEsAs4DlwMvAs8C8ybg5NngDPAicBGYCjwFfA6cAWYBF4A3gE9AZeB54GvgMeBB4B3gY+AR4CbgZ+BlYAnwKPAp8DkQyvkUeAl4G3gduBT4BPgaeBDYADwKbAS+BBYCS4GjwKngMnA1uBlcDvQCdgDbNnfgIvAa+BHYBryIdB5L2AA2ACbAb2A98CnQDXgF/BLoBNwDngE+Atsu3OAz8D+oBuwFmgHPAJ8AfY7HGAi2AW2APdAJeA90AvYBmwEvgG2AS+A3cC+4BvgS2A7sBG4FNkMAbwDbAI+BXaDbEaAZ8E+YAewHdgE7AOuBvYDs4Gvge3AsmCfuQasA2YCpwM/A5uBU8B2YFvgKnA6sC3YGuybM8EWYANwInAMuB5YBtwwAZgB7ANuB3YC24DtgYnAqcF+4DlgK3AbsB04HjwGHAXuBX5HZnBmgA3ASWAP8F/gAnAesBG4GdgCvA6cgDYCSwCLgEXAAnABuAAsABuA8+A8cAK4CCwDC4ElwBJgAbAEWAIsARuA5cAycAm4BFwCLgCbgHXAFuAacA24BtwAbASuAjeBjcBG4CJwEbASuACsAKsBGYMswAZgIbAkuBBYCSwFFgMLgYfBw+BR8Ch4CCwCFgGLgEXAImABuAAsABcAi4B5wDwQBkYB0YA0YBEwBJiW1wLzgXlAnA+cAWYAM4AZwFzgXOA8cBayGljzLgGWAXOAecA8YA4wG5gLzAXOBeYCS4FlwHKgHGAcsByYH5gIzARmAlOA04CTgFOA04CTgFOA04AzgXnAHLAcWAssA5YAi4DFwGJgETAJmATMAOYBc4A5wBxgDjAHmAPMBOYCc4G5wFzgXOA8YDuwHdgO7AcuB5cDlwPXgRuBm8CtQAngKuAqcBW4CtwKXAcuA5eBy8AF4AKwAKwAK8AqYA0wBpgBTACGADNAnA98D3wX+Br4Dvhv4APgF8D/A3eAnwAvgfcP/H1+Qz1wHXhY5sD0/jrwFPh84DngdeDzwT8A/853P/ABeAAYBmwHdgFngO/AsuBTgHngW5WvHn8JNAJOARuB1cBVYCswCvgC3Ag8CFwEHgTuB+4FDgKHgKPAFcAFYAmwBFgGLAGWAEuAxWAxsAiwCLwPXEyuWzOAGcAcoHfgH/AM2AysBM4DdwJbZgI4C9wKHAOuAZeAacA0YCSQDfgW/L5cAywA5s0ZYAawFzgTmArMA2YC04BZwJnAOWADsAPYAewA3gM9gI/Ab8AWYFuw3tYAO4A9wA5gB7AD2AHsAHYCu4FdwC7gncCbwJvAmsCawJrAmsA9gUeBxwReBN4OeB74NnDPwPsFPwt8UvB/V4X/Kvwn8H/lf8L+q/wP+A/lS4ArsA/YD+4B5wCJgETAIKAaYAc4A5wBzgDHACsACsACsACsAMMAeYA84BpwClgMvAluAFcAaYAWwbEwDbgG3AvmAD0A14D3QDlqF9wAakzcthYN/AImATcAH4DugF4Hfv4HwA/gLVAL+AtUA3Y4E/A0+BnoBi4B/gY5HAf4BnwKdAN+Bb4FOh4L+Bd8A3QC9gEPgW7HAn4Hvg46ATcA34BeRwL8G3gD6AQsA4aBbseCngZ6AQuAmcAW4E1kA7Yt2I/A7uBXsB3YDtwE3AvuA4cAx4CDwP/Ar8I/AteA5cBSYAmwDFgMvEyuGzOAGcCcwDngbOA0YBSwGVgDHAWOA9+CXQW+CjYV+RpsLPI0WAQcAQ4CHwL/Ax8CfwNfAh8DjwAPAg+BW4EbgZuA7cAGYAPQDXgP/Aj0ADbNAuAL8B3QDFgF/AysnkxYAvwDNALWAWvAocDsZcB74C3Q8nLANmAdsAWYeirga2A/0A/YBdwBPgS6PQrwE+AXoBGwCjgBbLqUcBm4CHQCdgFvgR6PBTwPfAc0Ap4CbgGbTiWsBV4CmgFHgWfADkdhTgLPA52AhcAF4Dmg/qgAm4H9gDkQCgX+X8N/AZmAT8A/YBUwH9gMTAU8A54AmYBPwH9iE/yUoFAqFQqFQ/oX/AP5oNvwU6k1UAAAAAElFTkSuQmCC";

const PrintableReport: React.FC<PrintableReportProps> = ({ reportData }) => {
    const styles = `
      body{
        font-family: 'arial', sans-serif;
        font-size: 14px;
        margin-right: 0px;
        margin-bottom: 90px;
      }
      @page  {
        size: legal;
      }
      @media  print {
        .print {
          display: none;
        }
      }
      .kop{
        text-align: center;
        position: relative;
        padding-bottom: 5px;
        border-bottom: 2px solid #606060;
      }
      .kop img.logo {
        position: absolute;
        top: 0px;
        left: 15px;
        width: 80px;
      }
      .kop .model{
        position: absolute;
        top: 0px;
        right: 15px;
        border: 1px solid #000;
        padding: 2px 5px;
        font-size: 12px;
      }
      .kop .kantor {
        font-size: 16px;
        line-height: 1.2;
      }

      .title {
        text-align: center;
        margin: 15px 0;
      }
      .title .logo{
        width: 120px;
      }
      .title .no {
        text-decoration: underline;
        font-weight: bold;
      }
      .contents {
        font-size: 14px;
      }
      .pengadu{
        margin-left: 30px;
        margin-bottom: 0px;
      }
      .marginleft {
        margin-left: 30px;
      }
      .pengadu table tr td{
        padding: 1px 5px;
        font-size: 14px;
      }
      .title_td {
        width: 180px;
      }
      .number_td {
        width: 14px;
      }
      .subheading{
        font-weight: bold;
        width: 100%;
        padding: 5px 0;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        margin: 10px 0;
      }
      .bottom{
        margin-top: 30px;
      }
      .bottom .white-space{
        margin: 50px 0;
      }
      .terlapor td:nth-child(1){
        padding-left: 3em;
      }

      .page-break {
          page-break-after: always;
      }

      ol {
        padding-left: 35px;
        margin: 5px 0;
      }

      ul.strip {
          list-style: none;
          padding: 0;
          margin-left: 30px;
      }

      ul.strip li:before {
          content: "-"; 
          padding-right: 8px;
          color: black; 
      }

      li { 
          padding-left: 0px; 
      }

      td {
        vertical-align: top;
      }

      .saksi {
        page-break-inside: avoid;
      }

      td.paddingLeft {
        
      }

      table.table_uraian_kejadian {
          border-collapse: collapse;
          width: 100%;
      }

      table.table_uraian_kejadian th,  table.table_uraian_kejadian td {
          border: 1px solid black;
      }

      .footer {
          position:fixed;
          height:15px;
          bottom:0;
          font-size: 0.7em;
          text-align: right;
          width:100%;
      }
      * {
        margin: 0px;
        font-family: 'arial', sans-serif;
        font-size: 13px;
        line-height: 1.4;
      }
      .colon_td{
        width: 7px;
      }
    `;

    const pelapor = reportData.pelaporInfo;
    const today = new Date();

  return (
    <div className="print-only">
      <style>{styles}</style>
      <div className="report-body">

        <div className="kop">
            <img src={POLRI_LOGO_BASE64} alt="Logo Polri" className="logo" />
            <div className="model">Model : B</div>
            <div className="kantor">
                KEPOLISIAN NEGARA REPUBLIK INDONESIA<br/>
                DAERAH JAWA BARAT<br/>
                <strong>RESOR TASIKMALAYA</strong><br/>
                <span style={{fontSize: '12px', fontWeight: 'normal'}}>Jl. Raya Mangunreja No.1, Kec. Mangunreja, Kab. Tasikmalaya</span>
            </div>
        </div>

        <div className="title">
            <h3 className="no">LAPORAN POLISI</h3>
            Nomor : {reportData.nomorLaporanPolisi || '(Belum diisi)'}
        </div>
        
        <div className="subheading">YANG MELAPORKAN</div>

        <div className="pengadu">
          <table>
            <tbody>
              <tr>
                <td className="title_td">NAMA</td>
                <td className="colon_td">:</td>
                <td><strong>{pelapor?.namaLengkap || '(Belum diisi)'}</strong></td>
              </tr>
              <tr>
                <td className="title_td">TEMPAT / TGL LAHIR</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.tempatLahir || '(Belum diisi)'}, {pelapor?.tanggalLahir || '(Belum diisi)'} ({calculateAge(pelapor?.tanggalLahir)})</td>
              </tr>
              <tr>
                <td className="title_td">JENIS KELAMIN</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.jenisKelamin || '(Belum diisi)'}</td>
              </tr>
              <tr>
                <td className="title_td">KEWARGANEGARAAN</td>
                <td className="colon_td">:</td>
                <td>WNI</td>
              </tr>
              <tr>
                <td className="title_td">PEKERJAAN</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.pekerjaan || '(Belum diisi)'}</td>
              </tr>
               <tr>
                <td className="title_td">AGAMA</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.agama || '(Belum diisi)'}</td>
              </tr>
               <tr>
                <td className="title_td">SUKU</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.suku || '(Belum diisi)'}</td>
              </tr>
              <tr>
                <td className="title_td">ALAMAT</td>
                <td className="colon_td">:</td>
                <td>{pelapor?.alamat || '(Belum diisi)'}</td>
              </tr>
              <tr>
                <td className="title_td">No. Telp/HP</td>
                <td className="colon_td">:</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="subheading">PERISTIWA YANG DILAPORKAN</div>
        
        <div className="pengadu">
            <table>
                 <tbody>
                    <tr>
                        <td className="title_td">WAKTU KEJADIAN</td>
                        <td className="colon_td">:</td>
                        <td>{formatDateToIndonesian(reportData.waktuKejadian)}</td>
                    </tr>
                    <tr>
                        <td className="title_td">TEMPAT KEJADIAN</td>
                        <td className="colon_td">:</td>
                        <td>{reportData.alamatTkp || '(Belum diisi)'}</td>
                    </tr>
                    <tr>
                        <td className="title_td">APA YANG TERJADI</td>
                        <td className="colon_td">:</td>
                        <td>Kecelakaan Lalu Lintas</td>
                    </tr>
                    <tr>
                        <td className="title_td">URAIAN SINGKAT KEJADIAN</td>
                        <td className="colon_td">:</td>
                        <td>{reportData.kronologiKejadianUtama || '(Belum diisi)'}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div className="subheading">PIHAK-PIHAK YANG TERLIBAT</div>

        <div className="pengadu">
            <ol>
              {reportData.pihakTerlibat.length > 0 ? reportData.pihakTerlibat.map((pihak, index) => {
                const linkedEntity = reportData.involvedEntities.find(e => e.id === pihak.involvedEntityId);
                let peranDisplay = pihak.peran || '(Peran?)';
                if (linkedEntity?.type === 'Kendaraan') {
                  const { prefix } = getVehiclePrefixAndCategory(linkedEntity.jenisKendaraan);
                  peranDisplay = `${pihak.peran} ${prefix}${linkedEntity.jenisKendaraan} TNKB ${linkedEntity.nomorPolisi || '(NoPol?)'}`;
                } else if (linkedEntity?.type === 'Pejalan Kaki') {
                   peranDisplay = 'Pejalan Kaki';
                }
                
                return (
                  <li key={pihak.id}>
                    <strong><u>{peranDisplay}</u></strong><br/>
                    <table style={{marginLeft: '15px'}}>
                        <tbody>
                            <tr><td style={{width: '150px'}}>NAMA</td><td>:</td><td>{pihak.namaLengkap || '(Nama Belum Diisi)'}</td></tr>
                            <tr><td>NIK</td><td>:</td><td>{pihak.nomorIdentitas || '(NIK Belum Diisi)'}</td></tr>
                            <tr><td>TEMPAT/TGL LAHIR</td><td>:</td><td>{pihak.tempatLahir}, {pihak.tanggalLahir} ({calculateAge(pihak.tanggalLahir)})</td></tr>
                            <tr><td>ALAMAT</td><td>:</td><td>{pihak.alamat || '(Alamat Belum Diisi)'}</td></tr>
                            <tr><td>KONDISI</td><td>:</td><td>{pihak.tingkatLuka || 'N/A'}{pihak.didugaTersangka ? ' (Diduga Tersangka)' : ''}</td></tr>
                            {linkedEntity?.type === 'Kendaraan' && linkedEntity.kerusakan && <tr><td>KERUSAKAN</td><td>:</td><td>{linkedEntity.kerusakan}</td></tr>}
                        </tbody>
                    </table>
                  </li>
                );
              }) : <li>(Tidak ada data pihak terlibat)</li>}
            </ol>
        </div>

        <div className="subheading">SAKSI-SAKSI</div>
        <div className="pengadu">
             <ol>
              {reportData.saksiSaksi.length > 0 ? reportData.saksiSaksi.map((saksi, index) => (
                  <li key={saksi.id}>
                    <strong>Saksi {index + 1}</strong><br/>
                    <table style={{marginLeft: '15px'}}>
                        <tbody>
                            <tr><td style={{width: '150px'}}>NAMA</td><td>:</td><td>{saksi.namaLengkap || '(Nama Belum Diisi)'}</td></tr>
                            <tr><td>UMUR</td><td>:</td><td>{saksi.tanggalLahir ? calculateAge(saksi.tanggalLahir) : saksi.umurString}</td></tr>
                            <tr><td>PEKERJAAN</td><td>:</td><td>{saksi.pekerjaan || '(Pekerjaan Belum Diisi)'}</td></tr>
                            <tr><td>ALAMAT</td><td>:</td><td>{saksi.alamat || '(Alamat Belum Diisi)'}</td></tr>
                            <tr><td>KETERANGAN</td><td>:</td><td>{saksi.keteranganSaksi || '(Tidak ada keterangan)'}</td></tr>
                        </tbody>
                    </table>
                  </li>
              )) : <li>(Tidak ada data saksi)</li>}
            </ol>
        </div>

        <div className="subheading">BARANG BUKTI</div>
        <div className="marginleft">
            <ul className="strip">
                {(reportData.involvedEntities.filter(e => e.type === 'Kendaraan') as InvolvedVehicle[]).map((v, i) => {
                    const { prefix: vehiclePrefixBB } = getVehiclePrefixAndCategory(v.jenisKendaraan);
                    return <li key={v.id}>1 (satu) Unit Kendaraan {vehiclePrefixBB}{v.jenisKendaraan}{v.nomorPolisi ? ` TNKB ${v.nomorPolisi}` : ''}.</li>
                })}
                {(reportData.barangBuktiText || '').split('\n').filter(l => l.trim() !== '').map((item, i) => (
                    <li key={`bb-text-${i}`}>{item.replace(/^- /, '')}</li>
                ))}
            </ul>
        </div>
        
        <div className="subheading">TINDAKAN YANG TELAH DIAMBIL</div>
        <div className="marginleft">
           <ol>
             {(reportData.tindakanDilakukanText || '').split('\n').filter(l => l.trim() !== '').map((item, i) => (
                <li key={`act-${i}`}>{item.replace(/^\d+\.\s*/, '')}</li>
            ))}
           </ol>
        </div>

        <div className="bottom">
            <p>Laporan polisi ini dibuat dengan sebenarnya atas kekuatan sumpah dan jabatan kemudian ditutup dan ditandatangani di Tasikmalaya pada tanggal {formatDateOnlyIndonesian(today)}.</p>
            <table style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
                <tbody>
                    <tr>
                        <td style={{width: '50%'}}>
                            <p>Pelapor,</p>
                            <div className="white-space"></div>
                            <p><strong><u>{pelapor?.namaLengkap.toUpperCase() || '____________________'}</u></strong></p>
                        </td>
                        <td style={{width: '50%'}}>
                            <p>Yang Menerima Laporan,</p>
                            <div className="white-space"></div>
                            <p><strong><u>____________________</u></strong></p>
                            <p>Pangkat / NRP</p>
                        </td>
                    </tr>
                     <tr>
                        <td colSpan={2} style={{paddingTop: '30px'}}>
                            <p>Mengetahui,</p>
                            <p>a.n. KEPALA KEPOLISIAN RESOR TASIKMALAYA</p>
                            <p>KASAT LANTAS</p>
                            <div className="white-space"></div>
                            <p><strong><u>H. AJAT SUDRAJAT</u></strong></p>
                            <p>AKP NRP 72060416</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;