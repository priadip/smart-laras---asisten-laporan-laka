# app.py
# File ini berisi aplikasi web Flask untuk membuat laporan otomatis.

import os
import json
import requests
from flask import Flask, request, render_template_string, jsonify
from PIL import Image
import pytesseract
import io

# Inisialisasi aplikasi Flask.
app = Flask(__name__)

# --- Konfigurasi API Gemini ---
# Mengambil kunci API dari environment variable yang diatur di wsgi.py di PythonAnywhere.
api_key = os.environ.get("GOOGLE_API_KEY")
api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

# --- Konfigurasi Tesseract OCR ---
# Pastikan Tesseract-OCR sudah terinstal di sistem.
# Di PythonAnywhere, ini sudah ada.
# pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract' # Baris ini tidak diperlukan di PythonAnywhere

# --- HTML Template untuk Antarmuka Pengguna ---
HTML_TEMPLATE = """
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generator Laporan dengan OCR</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
    </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 class="text-2xl font-bold mb-4 text-center text-gray-800">Generator Laporan dengan OCR</h1>
        <p class="text-gray-600 mb-6 text-center">Unggah gambar atau ketik teks untuk membuat laporan.</p>

        <form id="reportForm" class="space-y-6">
            <!-- Bagian Input Identitas -->
            <div class="p-6 bg-blue-50 rounded-lg shadow-sm">
                <h2 class="text-xl font-bold mb-4 text-blue-800">A. Data Identitas</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="nama" class="block text-gray-700 font-bold mb-2">Nama:</label>
                        <input type="text" id="nama" name="nama"
                               class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: Budi Santoso">
                    </div>
                    <div>
                        <label for="umur" class="block text-gray-700 font-bold mb-2">Umur:</label>
                        <input type="number" id="umur" name="umur"
                               class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: 35">
                    </div>
                    <div>
                        <label for="pekerjaan" class="block text-gray-700 font-bold mb-2">Pekerjaan:</label>
                        <input type="text" id="pekerjaan" name="pekerjaan"
                               class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: Wiraswasta">
                    </div>
                    <div>
                        <label for="alamat" class="block text-gray-700 font-bold mb-2">Alamat:</label>
                        <input type="text" id="alamat" name="alamat"
                               class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: Jl. Pahlawan No. 12">
                    </div>
                    <div class="md:col-span-2">
                        <label for="kabupaten" class="block text-gray-700 font-bold mb-2">Kabupaten:</label>
                        <input type="text" id="kabupaten" name="kabupaten"
                               class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: Kuningan">
                    </div>
                </div>
            </div>

            <!-- Bagian Input Kronologis dengan OCR -->
            <div class="p-6 bg-gray-50 rounded-lg shadow-sm">
                <h2 class="text-xl font-bold mb-4 text-gray-800">B. Kronologis Kejadian</h2>
                <div class="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
                    <label class="block text-gray-700 font-bold" for="image_file">Unggah Gambar:</label>
                    <input type="file" id="image_file" name="image_file" accept="image/*" class="text-gray-700">
                    <button type="button" id="ocrButton"
                            class="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105">
                        Lakukan OCR
                    </button>
                </div>
                <textarea id="kronologis" name="kronologis" rows="10"
                          class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Teks dari kronologis akan muncul di sini. Anda juga bisa mengetik secara manual."></textarea>
            </div>

            <div class="flex items-center justify-center">
                <button type="submit"
                        class="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full md:w-auto transition duration-300 ease-in-out transform hover:scale-105">
                    Buat Laporan Lengkap
                </button>
            </div>
        </form>

        <div id="loadingIndicator" class="hidden loading-overlay">
            <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <div id="messageBox" class="hidden fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-2xl z-20 text-center">
            <h3 id="messageTitle" class="font-bold text-xl mb-2"></h3>
            <p id="messageText" class="mb-4"></p>
            <button id="closeMessageBox" class="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg">Tutup</button>
        </div>
        <div id="backdrop" class="hidden fixed inset-0 bg-black opacity-50 z-10"></div>


        <div id="resultContainer" class="mt-8 hidden p-6 bg-green-100 rounded-lg border border-green-300 shadow-sm">
            <h2 class="text-xl font-bold mb-4 text-green-800">Laporan Lengkap:</h2>
            <div class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                <div class="mb-4">
                    <h3 class="font-bold">A. Data Identitas:</h3>
                    <div id="identityOutput" class="bg-white p-3 rounded-md border border-gray-200"></div>
                </div>
                <div class="mb-4">
                    <h3 class="font-bold">B. Pra Kejadian:</h3>
                    <div id="praKejadianOutput" class="bg-white p-3 rounded-md border border-gray-200"></div>
                </div>
                <div>
                    <h3 class="font-bold">C. Kronologis Kejadian:</h3>
                    <div id="kronologisOutput" class="bg-white p-3 rounded-md border border-gray-200"></div>
                </div>
            </div>
        </div>

        <div id="errorContainer" class="mt-8 hidden p-4 bg-red-100 rounded-lg border border-red-300 text-red-700 shadow-sm">
            <p id="errorMessage" class="font-medium"></p>
        </div>
    </div>

    <script>
        // Fungsi untuk menampilkan pesan pop-up kustom
        function showMessage(title, text) {
            const messageBox = document.getElementById('messageBox');
            const backdrop = document.getElementById('backdrop');
            document.getElementById('messageTitle').textContent = title;
            document.getElementById('messageText').textContent = text;
            messageBox.classList.remove('hidden');
            backdrop.classList.remove('hidden');
        }

        document.getElementById('closeMessageBox').addEventListener('click', function() {
            const messageBox = document.getElementById('messageBox');
            const backdrop = document.getElementById('backdrop');
            messageBox.classList.add('hidden');
            backdrop.classList.add('hidden');
        });

        document.getElementById('ocrButton').addEventListener('click', async function(event) {
            const fileInput = document.getElementById('image_file');
            const kronologisTextarea = document.getElementById('kronologis');
            const loadingIndicator = document.getElementById('loadingIndicator');
            const errorContainer = document.getElementById('errorContainer');
            errorContainer.classList.add('hidden');

            if (fileInput.files.length === 0) {
                showMessage('Perhatian', 'Silakan unggah gambar terlebih dahulu.');
                return;
            }

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('image_file', file);

            loadingIndicator.classList.remove('hidden');

            try {
                const response = await fetch('/ocr', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (response.ok) {
                    kronologisTextarea.value = result.text;
                } else {
                    document.getElementById('errorMessage').textContent = result.error;
                    errorContainer.classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('errorMessage').textContent = 'Terjadi kesalahan saat memproses OCR.';
                errorContainer.classList.remove('hidden');
            } finally {
                loadingIndicator.classList.add('hidden');
            }
        });

        document.getElementById('reportForm').addEventListener('submit', async function(event) {
            event.preventDefault();

            const nama = document.getElementById('nama').value;
            const umur = document.getElementById('umur').value;
            const pekerjaan = document.getElementById('pekerjaan').value;
            const alamat = document.getElementById('alamat').value;
            const kabupaten = document.getElementById('kabupaten').value;
            const kronologis = document.getElementById('kronologis').value;

            const loadingIndicator = document.getElementById('loadingIndicator');
            const resultContainer = document.getElementById('resultContainer');
            const errorContainer = document.getElementById('errorContainer');

            resultContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');

            // Cek apakah data identitas dan kronologis terisi
            if (!nama || !umur || !pekerjaan || !alamat || !kabupaten) {
                showMessage('Perhatian', 'Data Identitas tidak boleh kosong.');
                return;
            }
            if (!kronologis) {
                showMessage('Perhatian', 'Kronologis Kejadian tidak boleh kosong.');
                return;
            }

            loadingIndicator.classList.remove('hidden');

            try {
                const response = await fetch('/generate-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama, umur, pekerjaan, alamat, kabupaten, kronologis })
                });

                const result = await response.json();

                if (response.ok) {
                    document.getElementById('identityOutput').innerText = result.identity_text;
                    document.getElementById('praKejadianOutput').innerText = result.pra_kejadian_text;
                    document.getElementById('kronologisOutput').innerText = result.kronologis_text;
                    resultContainer.classList.remove('hidden');
                } else {
                    document.getElementById('errorMessage').textContent = result.error;
                    errorContainer.classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('errorMessage').textContent = 'Terjadi kesalahan saat membuat laporan. Silakan coba lagi.';
                errorContainer.classList.remove('hidden');
            } finally {
                loadingIndicator.classList.add('hidden');
            }
        });
    </script>
</body>
</html>
"""

# Helper function to safely extract text from Gemini API response
def get_text_from_gemini_response(response_json):
    """
    Ekstrak teks dari respons API Gemini dengan aman, menghindari KeyError.
    """
    try:
        return response_json['candidates'][0]['content']['parts'][0]['text'].strip()
    except (KeyError, IndexError, TypeError):
        return "Teks tidak dapat diekstrak dari respons API."

@app.route("/", methods=["GET"])
def index():
    """Menampilkan halaman utama dengan formulir."""
    return render_template_string(HTML_TEMPLATE)

@app.route("/ocr", methods=["POST"])
def ocr_endpoint():
    """
    Endpoint untuk menerima gambar, melakukan OCR, dan mengembalikan teks.
    """
    if 'image_file' not in request.files:
        return jsonify({'error': 'Tidak ada file gambar yang diunggah.'}), 400

    file = request.files['image_file']

    if file.filename == '':
        return jsonify({'error': 'Tidak ada file gambar yang dipilih.'}), 400

    if file:
        try:
            # Membaca file gambar dari request.
            image_stream = io.BytesIO(file.read())
            image = Image.open(image_stream)

            # Melakukan OCR. Menggunakan bahasa 'ind' untuk Bahasa Indonesia.
            text = pytesseract.image_to_string(image, lang='ind')

            return jsonify({'text': text}), 200
        except Exception as e:
            return jsonify({'error': f"Terjadi kesalahan saat memproses OCR: {e}"}), 500

    return jsonify({'error': 'Terjadi kesalahan yang tidak diketahui.'}), 500

@app.route("/generate-report", methods=["POST"])
def generate_report_endpoint():
    """
    Endpoint untuk menerima data formulir, memanggil Gemini API,
    dan mengembalikan laporan lengkap.
    """
    data = request.json
    nama = data.get("nama", "")
    umur = data.get("umur", "")
    pekerjaan = data.get("pekerjaan", "")
    alamat = data.get("alamat", "")
    kabupaten = data.get("kabupaten", "")
    kronologis_kejadian = data.get("kronologis", "")

    if not api_key:
        return jsonify({'error': "Kunci API Gemini tidak ditemukan."}), 500

    # Validasi input sederhana
    if not all([nama, umur, pekerjaan, alamat, kabupaten]):
        return jsonify({'error': "Data identitas tidak boleh kosong."}), 400

    if not kronologis_kejadian:
        return jsonify({'error': "Teks 'Kronologis Kejadian' tidak boleh kosong."}), 400

    try:
        # Bagian 1: Memproses Data Identitas dengan Gemini API
        identity_prompt = f"""
        Format data identitas berikut sesuai aturan ini: "Sdr. [Nama], [Umur] Th, [Pekerjaan], Alamat [Alamat] Kab. [Kabupaten]." Jangan menggunakan huruf kapital semua.

        Data:
        Nama: {nama}
        Umur: {umur}
        Pekerjaan: {pekerjaan}
        Alamat: {alamat}
        Kabupaten: {kabupaten}

        Tuliskan format identitasnya saja.
        """
        payload_identity = {"contents": [{"role": "user", "parts": [{"text": identity_prompt}]}]}
        response_identity = requests.post(f"{api_url}?key={api_key}", json=payload_identity)
        response_identity.raise_for_status()
        result_identity = response_identity.json()
        identity_text = get_text_from_gemini_response(result_identity)

        # Bagian 2: Memproses Kronologis untuk Pra Kejadian dengan Gemini API
        prompt_pra_kejadian = f"""
        Anda adalah asisten yang bertugas meringkas teks "Kronologis Kejadian" untuk bagian "Pra Kejadian" dalam laporan.
        Aturan untuk meringkas adalah sebagai berikut:
        1. Ambil ringkasan dari bagian "Kronologis Kejadian".
        2. Dimulai dari kata "Sewaktu".
        3. Berakhir tepat sebelum kalimat yang berbunyi "Akibat dari kejadian...".
        4. Tulis ringkasan tersebut tanpa menambahkan informasi lain.

        Berikut adalah teks "Kronologis Kejadian":

        "{kronologis_kejadian}"

        Tuliskan ringkasan "Pra Kejadian" sesuai aturan di atas.
        """
        payload_pra_kejadian = {"contents": [{"role": "user", "parts": [{"text": prompt_pra_kejadian}]}]}
        response_pra_kejadian = requests.post(f"{api_url}?key={api_key}", json=payload_pra_kejadian)
        response_pra_kejadian.raise_for_status()
        result_pra_kejadian = response_pra_kejadian.json()
        pra_kejadian_text = get_text_from_gemini_response(result_pra_kejadian)

        # Mengembalikan hasil sebagai JSON.
        full_report = {
            'identity_text': identity_text,
            'pra_kejadian_text': pra_kejadian_text,
            'kronologis_text': kronologis_kejadian
        }
        return jsonify(full_report), 200

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"Terjadi kesalahan API: {e}"}), 500
    except (json.JSONDecodeError, KeyError) as e:
        return jsonify({'error': f"Respons API tidak valid: {e}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan tidak terduga: {e}"}), 500

if __name__ == "__main__":
    # Ini hanya berjalan saat di lingkungan lokal, tidak di PythonAnywhere
    app.run(debug=True)
