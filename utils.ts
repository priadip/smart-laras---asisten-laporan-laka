// src/utils.ts

// Fungsi untuk mengonversi angka menjadi terbilang dalam Bahasa Indonesia
// Ini adalah implementasi sederhana dan mungkin perlu disempurnakan untuk kasus yang lebih kompleks
export const numToWordsID = (num: number): string => {
  if (num === 0) return "nol";

  const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
  const teens = ["sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas", "tujuh belas", "delapan belas", "sembilan belas"];
  const tens = ["", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh", "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"];
  const scales = ["", "ribu", "juta", "miliar", "triliun"];

  let words = "";
  let i = 0;

  if (num < 0) {
    words += "minus ";
    num = Math.abs(num);
  }

  do {
    const n = num % 1000;
    if (n !== 0) {
      let currentWords = "";
      const hundreds = Math.floor(n / 100);
      const remainder = n % 100;

      if (hundreds === 1) {
        currentWords += "seratus";
      } else if (hundreds > 1) {
        currentWords += units[hundreds] + " ratus";
      }

      if (remainder > 0) {
        if (currentWords !== "") currentWords += " ";
        if (remainder < 10) {
          currentWords += teens[remainder - 10];
        } else if (remainder >= 10 && remainder < 20) {
          currentWords += tens[Math.floor(remainder / 10)];
          if (remainder % 10 !== 0) {
            currentWords += " " + units[remainder % 10];
          }
        }
      }

      if (currentWords !== "") {
        if (i > 0) {
          if (words !== "") words = currentWords + " " + scales[i] + " " + words;
          else words = currentWords + " " + scales[i];
        } else {
          words = currentWords;
        }
      }
    }
    num = Math.floor(num / 1000);
    i++;
  } while (num > 0);

  return words.trim();
};
