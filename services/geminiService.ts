import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { GEMINI_MODEL_TEXT_MULTIMODAL, OCR_PROMPT_TEMPLATE, OCR_PROMPT_SAKSI_TEMPLATE } from '../constants';
import { GeminiOcrResult, GeminiExtractedSaksiData } from '../types';

// TODO: Ganti placeholder ini dengan kunci API Gemini Anda yang valid.
// Anda bisa mendapatkan kunci API dari https://aistudio.google.com/
const API_KEY = "AIzaSyCvqRhqBzX3ub4KeGphCZhZNVcgKVApHSE";

let ai: GoogleGenAI | null = null;

if (API_KEY && API_KEY !== "MASUKKAN_KUNCI_API_GEMINI_ANDA_DI_SINI") {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error("Kunci API Gemini tidak ditemukan atau tidak valid. Silakan periksa geminiService.ts.");
}

const ocrResultSchema = {
    type: Type.OBJECT,
    properties: {
        documentType: { type: Type.STRING, description: "Jenis dokumen: KTP, SIM, KK, STNK, LAINNYA, atau null." },
        namaLengkap: { type: Type.STRING },
        nomorIdentitas: { type: Type.STRING, description: "NIK dari KTP/KK atau No SIM dari SIM." },
        alamat: { type: Type.STRING, description: "Alamat lengkap sesuai format yang diinstruksikan." },
        tempatLahir: { type: Type.STRING },
        tanggalLahir: { type: Type.STRING, description: "Format DD-MM-YYYY." },
        jenisKelamin: { type: Type.STRING },
        pekerjaan: { type: Type.STRING },
        agama: { type: Type.STRING },
        nomorPolisi: { type: Type.STRING },
        familyMembers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    namaLengkap: { type: Type.STRING },
                    nomorIdentitas: { type: Type.STRING, description: "NIK anggota keluarga." },
                    alamat: { type: Type.STRING, description: "Alamat lengkap anggota keluarga." },
                    tempatLahir: { type: Type.STRING },
                    tanggalLahir: { type: Type.STRING, description: "Format DD-MM-YYYY." },
                    jenisKelamin: { type: Type.STRING },
                    pekerjaan: { type: Type.STRING },
                    hubunganKeluarga: { type: Type.STRING },
                },
            }
        },
        alamatKartuKeluarga: { type: Type.STRING },
        jenisKendaraanStnk: { type: Type.STRING },
        namaPemilikStnk: { type: Type.STRING },
        alamatStnk: { type: Type.STRING },
    },
};

const saksiDataSchema = {
    type: Type.OBJECT,
    properties: {
        namaLengkap: { type: Type.STRING },
        nomorIdentitas: { type: Type.STRING },
        alamat: { type: Type.STRING },
        tempatLahir: { type: Type.STRING },
        tanggalLahir: { type: Type.STRING, description: "Format DD-MM-YYYY." },
        jenisKelamin: { type: Type.STRING },
        pekerjaan: { type: Type.STRING },
    }
};


export const imageToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

const parseGeminiResponse = <T>(response: GenerateContentResponse): T | null => {
  let jsonString = response.text.trim();
  
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonString.match(fenceRegex);
  if (match && match[2]) {
    jsonString = match[2].trim();
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (parseError) {
    console.error("Failed to parse JSON response from Gemini:", parseError, "Raw response:", jsonString);
    // It's possible Gemini returns a valid response but not JSON, e.g. an error message or refusal.
    // We can throw an error that includes this raw response for better debugging.
    throw new Error(`Failed to parse data from AI. Raw response: ${jsonString.substring(0, 500)}`);
  }
};


export const extractInfoFromDocument = async (imageFile: File): Promise<GeminiOcrResult | null> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check API_KEY.");
  }

  try {
    const imagePart = await imageToGenerativePart(imageFile);
    const prompt = OCR_PROMPT_TEMPLATE("id");

    const contents = {
      parts: [imagePart, { text: prompt }],
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT_MULTIMODAL,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: ocrResultSchema,
            temperature: 0.1, // Lower temperature for more deterministic OCR
        }
    });
    
    const parsedData = parseGeminiResponse<GeminiOcrResult>(response);

    // Normalize to empty strings if Gemini returns null, for easier handling in UI
    if (parsedData) {
      return {
        documentType: parsedData.documentType || null,
        namaLengkap: parsedData.namaLengkap || "",
        nomorIdentitas: parsedData.nomorIdentitas || "",
        alamat: parsedData.alamat || "",
        tempatLahir: parsedData.tempatLahir || "",
        tanggalLahir: parsedData.tanggalLahir || "",
        jenisKelamin: parsedData.jenisKelamin || null,
        pekerjaan: parsedData.pekerjaan || "",
        agama: parsedData.agama || "",
        nomorPolisi: parsedData.nomorPolisi || "",
        familyMembers: parsedData.familyMembers ? parsedData.familyMembers.map(member => ({
          namaLengkap: member.namaLengkap || "",
          nomorIdentitas: member.nomorIdentitas || "",
          alamat: member.alamat || "",
          tempatLahir: member.tempatLahir || "",
          tanggalLahir: member.tanggalLahir || "",
          jenisKelamin: member.jenisKelamin || null,
          pekerjaan: member.pekerjaan || "",
          hubunganKeluarga: member.hubunganKeluarga || "",
        })) : null,
        alamatKartuKeluarga: parsedData.alamatKartuKeluarga || "",
        jenisKendaraanStnk: parsedData.jenisKendaraanStnk || "",
        namaPemilikStnk: parsedData.namaPemilikStnk || "",
        alamatStnk: parsedData.alamatStnk || "",
      };
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API for Party Data:", error);
    if (error instanceof Error) {
         throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with Gemini API.");
  }
};

export const extractSaksiInfoFromDocument = async (imageFile: File): Promise<GeminiExtractedSaksiData | null> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check API_KEY.");
  }

  try {
    const imagePart = await imageToGenerativePart(imageFile);
    const prompt = OCR_PROMPT_SAKSI_TEMPLATE("id");

    const contents = {
      parts: [imagePart, { text: prompt }],
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT_MULTIMODAL,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: saksiDataSchema,
            temperature: 0.1, 
        }
    });

    const parsedData = parseGeminiResponse<GeminiExtractedSaksiData>(response);
    
    // Normalize to empty strings
    if (parsedData) {
      return {
        namaLengkap: parsedData.namaLengkap || "",
        nomorIdentitas: parsedData.nomorIdentitas || "",
        alamat: parsedData.alamat || "",
        tempatLahir: parsedData.tempatLahir || "",
        tanggalLahir: parsedData.tanggalLahir || "",
        jenisKelamin: parsedData.jenisKelamin || null,
        pekerjaan: parsedData.pekerjaan || "",
      };
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API for Saksi Data:", error);
    if (error instanceof Error) {
         throw new Error(`Gemini API error for Saksi: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with Gemini API for Saksi.");
  }
};
