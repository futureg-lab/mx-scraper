import { decodeUnicodeCharacters } from "../utils/Utils";

let sample: string =
  "(C91) [Gerupin (Minazuki Juuzou)] Zuryu tto Irete Zubozubo tto Yareba Gekiharitsu 120% | Sliding in and Pounding it is 120% Effective (Girls und Panzer) [English] {darknight} n";

const x = decodeUnicodeCharacters(sample);
console.log(x);
