import { ALPHABET, encrypt, explain, normalizeKey, substitutionAlphabet } from "./cipher-core.mjs";

/* ------------------------------------------------------------------ helpers */

const MINUS = "−";
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mod26 = (value) => ((value % 26) + 26) % 26;
const num = (value) => (value < 0 ? `${MINUS}${Math.abs(value)}` : String(value));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function modNote(raw, result) {
  if (raw === null) return "";
  if (raw >= 26) return `${raw} เกิน 25 จึงลบ 26 → ${raw} ${MINUS} 26 = ${result}`;
  if (raw < 0) return `${num(raw)} ติดลบ จึงบวก 26 → ${num(raw)} + 26 = ${result}`;
  return `${raw} อยู่ในช่วง 0–25 อยู่แล้ว ใช้ได้เลย`;
}

function modCell(raw, result) {
  if (raw >= 26) return `${raw} ${MINUS} 26 = ${result}`;
  if (raw < 0) return `${num(raw)} + 26 = ${result}`;
  return String(result);
}

function roleLabels(mode) {
  return mode === "encrypt"
    ? { input: "ข้อความ (P)", output: "รหัส (C)", inShort: "P", outShort: "C", verb: "เข้ารหัส" }
    : { input: "รหัส (C)", output: "ข้อความ (P)", inShort: "C", outShort: "P", verb: "ถอดรหัส" };
}

/** Scroll only inside `container` so `el` is visible (never scrolls the page). */
function revealIn(container, el, offsetTop = 0, offsetLeft = 0) {
  if (!container || !el) return;
  const box = container.getBoundingClientRect();
  const item = el.getBoundingClientRect();
  if (item.top < box.top + offsetTop) container.scrollTop += item.top - box.top - offsetTop - 6;
  else if (item.bottom > box.bottom) container.scrollTop += item.bottom - box.bottom + 6;
  if (item.left < box.left + offsetLeft) container.scrollLeft += item.left - box.left - offsetLeft - 6;
  else if (item.right > box.right) container.scrollLeft += item.right - box.right + 6;
}

function keywordGrid(key) {
  const keyword = normalizeKey(key);
  const unique = [...new Set(keyword)];
  const all = [...unique, ...[...ALPHABET].filter((letter) => !unique.includes(letter))];
  const width = unique.length;
  const rows = [];
  for (let i = 0; i < all.length; i += width) rows.push(all.slice(i, i + width));
  const colOf = {};
  all.forEach((letter, i) => { colOf[letter] = i % width; });
  return { keyword, unique, width, rows, colOf };
}

/* ------------------------------------------------------------------ content */

const TABS = {
  basics: { icon: "01", name: "พื้นฐาน", caption: "อ่านก่อนเริ่ม" },
  caesar: { icon: "C", name: "Caesar", caption: "เลื่อนทุกตัวเท่ากัน" },
  vigenere: { icon: "V", name: "Vigenère", caption: "คีย์วนซ้ำ" },
  autokey: { icon: "A", name: "Autokey", caption: "คีย์ต่อด้วยข้อความ" },
  general: { icon: "G", name: "General", caption: "แทนที่ด้วยตาราง" },
  beaufort: { icon: "B", name: "Beaufort", caption: "คีย์ลบข้อความ" },
  compare: { icon: "⇄", name: "เปรียบเทียบ", caption: "ทั้ง 5 วิธี" },
};
const TAB_ORDER = Object.keys(TABS);

const CIPHERS = {
  caesar: {
    name: "Caesar",
    thai: "รหัสซีซาร์",
    tagline: "เลื่อนตัวอักษรทุกตัวไปข้างหน้าเป็นระยะเท่ากัน ถ้าเลย Z ให้วนกลับไปเริ่มที่ A",
    facts: [["ประเภท", "แทนที่แบบอักษรเดียว"], ["กุญแจ", "ตัวเลข 0–25 หนึ่งตัว"], ["ยุค", "ราว 50 ปีก่อน ค.ศ."], ["ความยาก", "ง่ายมาก"]],
    formula: { encrypt: ["C = (P + k) mod 26"], decrypt: ["P = (C − k) mod 26"] },
    concept: [
      "ลองนึกภาพตัวอักษร A–Z เรียงเป็นวงกลม แล้วหมุนทั้งวงไป k ช่อง ตัวอักษรทุกตัวจะขยับไปเท่ากันหมด เช่น ถ้า k = 3 ตัว A จะกลายเป็น D, B กลายเป็น E และ Z จะวนกลับไปเป็น C",
      "คีย์ของ Caesar คือจำนวนช่องที่เลื่อน ในเอกสารตัวอย่างเขียนคีย์เป็นตัวอักษร D เพราะ D อยู่ตำแหน่งที่ 3 (นับ A = 0) จึงหมายถึงเลื่อน 3 ช่อง",
    ],
    history: "ตั้งชื่อตามจูเลียส ซีซาร์ ผู้นำโรมันที่ใช้วิธีนี้ส่งสารทางทหาร โดยเลื่อนตัวอักษร 3 ตำแหน่ง เป็นหนึ่งในรหัสลับที่เก่าแก่และรู้จักมากที่สุดในโลก",
    steps: [
      ["เปลี่ยนตัวอักษรเป็นตัวเลข", "ใช้ตาราง A = 0, B = 1, … Z = 25 เช่น I = 8"],
      ["บวกด้วยจำนวนที่เลื่อน (k)", "ตัวอย่างใช้คีย์ D = 3 จึงได้ 8 + 3 = 11"],
      ["ทำ mod 26", "ถ้าผลเกิน 25 ให้ลบ 26 เพื่อวนกลับ เช่น X: 23 + 3 = 26 → 26 − 26 = 0"],
      ["เปลี่ยนตัวเลขกลับเป็นตัวอักษร", "11 คือ L ดังนั้น I → L ทำแบบนี้ทุกตัว ได้ LFDPHLVDZ"],
    ],
    alt: "ใช้แถบตัวอักษรด้านล่างแทนการคำนวณได้: หาตัวต้นฉบับในแถวบน แล้วอ่านตัวที่อยู่ใต้มัน",
    decrypt: "ทำย้อนกลับ คือ ลบด้วย k แทนการบวก ถ้าผลติดลบให้บวก 26 เช่น L (11) − 3 = 8 → I หรือในแถบตัวอักษร ให้หาตัวรหัสในแถวล่าง แล้วอ่านตัวในแถวบน",
    pros: ["เข้าใจง่ายที่สุด เหมาะเป็นจุดเริ่มต้นของการเรียนรหัสลับ", "คิดในใจได้เร็ว ไม่ต้องจำคีย์ยาว"],
    cons: ["มีคีย์ที่ใช้ได้จริงแค่ 25 แบบ ลองครบทุกแบบ (brute force) ได้ในไม่กี่วินาที", "ตัวอักษรเดิมกลายเป็นตัวเดิมเสมอ จึงเดาได้จากความถี่ของตัวอักษร"],
    tip: "Caesar ก็คือ Vigenère ที่คีย์มีตัวอักษรเพียงตัวเดียว",
    example: { text: "ICAMEISAW", shift: 3, note: "ตัวอย่างจาก Excel: I CAME I SAW (ข้ามา ข้าเห็น) ใช้คีย์ D = เลื่อน 3" },
  },
  vigenere: {
    name: "Vigenère",
    thai: "รหัสคำกุญแจวนซ้ำ",
    tagline: "ใช้คำกุญแจวนซ้ำ ตัวอักษรแต่ละตัวจึงถูกเลื่อนไม่เท่ากัน ตามตัวอักษรของคีย์ในตำแหน่งนั้น",
    facts: [["ประเภท", "หลายชุดอักษร (Polyalphabetic)"], ["กุญแจ", "คำภาษาอังกฤษ วนซ้ำ"], ["ยุค", "ค.ศ. 1553"], ["ความยาก", "ปานกลาง"]],
    formula: { encrypt: ["Cᵢ = (Pᵢ + Kᵢ) mod 26"], decrypt: ["Pᵢ = (Cᵢ − Kᵢ) mod 26"] },
    concept: [
      "Vigenère คือการใช้ Caesar หลายตัวสลับกัน ตัวอักษรของคีย์แต่ละตัวบอกว่าตำแหน่งนั้นต้องเลื่อนกี่ช่อง เช่น คีย์ C = เลื่อน 2, I = เลื่อน 8, P = เลื่อน 15",
      "เขียนคีย์ซ้ำใต้ข้อความไปเรื่อย ๆ จนยาวเท่ากัน (CIPHERCIPHERC…) แล้วจับคู่ทีละตัว เพราะแต่ละตำแหน่งเลื่อนไม่เท่ากัน ตัวอักษรเดียวกันในข้อความจึงอาจกลายเป็นคนละตัวได้",
    ],
    history: "Giovan Battista Bellaso คิดค้นไว้เมื่อ ค.ศ. 1553 แต่ภายหลังถูกเรียกตามชื่อ Blaise de Vigenère นักการทูตชาวฝรั่งเศส รหัสนี้เคยได้ฉายาว่า “รหัสที่ไม่มีใครถอดได้” อยู่ราว 300 ปี จนมีผู้ค้นพบวิธีหาความยาวคีย์ในศตวรรษที่ 19",
    steps: [
      ["เขียนคีย์ซ้ำใต้ข้อความ", "ใต้ CYBERSECURITY วาง CIPHERCIPHERC (ข้ามช่องว่างและตัวเลข)"],
      ["เปลี่ยนทั้งสองแถวเป็นตัวเลข", "ข้อความ C = 2, Y = 24 … คีย์ C = 2, I = 8 …"],
      ["บวกเลขข้อความกับเลขคีย์ แล้ว mod 26", "C + C = 2 + 2 = 4 และ Y + I = 24 + 8 = 32 → 32 − 26 = 6"],
      ["เปลี่ยนกลับเป็นตัวอักษร", "4 = E, 6 = G … ทำครบทุกตัวได้ EGQLVJGKJYMKA"],
    ],
    alt: "หรือใช้ตาราง Vigenère (Tabula recta): หาแถวของคีย์ กับคอลัมน์ของข้อความ ตัวอักษรตรงจุดตัดคือคำตอบ",
    decrypt: "วางคีย์เดิมใต้ข้อความรหัส แล้วลบแทนการบวก (C − K) ถ้าติดลบให้บวก 26 ในตาราง: ไปที่แถวของคีย์ หาตัวรหัสในแถวนั้น แล้วอ่านหัวคอลัมน์",
    pros: ["ตัวอักษรเดียวกันกลายเป็นคนละตัวได้ จึงนับความถี่ตรง ๆ ไม่ได้", "คีย์ยิ่งยาวและสุ่ม ยิ่งเดายาก"],
    cons: ["คีย์วนซ้ำเป็นรอบ ถ้ารู้ความยาวคีย์ (เช่น ด้วยวิธีของ Kasiski) จะแยกเป็น Caesar หลายชุดแล้วถอดได้", "ถ้าคีย์สั้นมาก เช่น 1–2 ตัว แทบไม่ต่างจาก Caesar"],
    tip: "ถ้าคีย์มีตัวอักษรตัวเดียว Vigenère จะกลายเป็น Caesar ทันที",
    example: { text: "CYBERSECURITY", key: "CIPHER", note: "ตัวอย่างจาก Excel: CYBER SECURITY ใช้คีย์ CIPHER" },
  },
  autokey: {
    name: "Autokey",
    thai: "รหัสคีย์อัตโนมัติ",
    tagline: "เริ่มด้วยคีย์สั้น ๆ แล้วใช้ข้อความต้นฉบับต่อท้ายเป็นคีย์ คีย์จึงไม่วนซ้ำเป็นรอบ",
    facts: [["ประเภท", "หลายชุดอักษร (คีย์ไม่ซ้ำรอบ)"], ["กุญแจ", "คีย์เริ่มต้น + ตัวข้อความเอง"], ["ยุค", "ค.ศ. 1586"], ["ความยาก", "ปานกลาง"]],
    formula: { encrypt: ["K = คีย์เริ่มต้น + P₁P₂P₃…", "Cᵢ = (Pᵢ + Kᵢ) mod 26"], decrypt: ["Pᵢ = (Cᵢ − Kᵢ) mod 26", "P ที่ได้ ใช้เป็นคีย์ตัวถัดไป"] },
    concept: [
      "การคำนวณแต่ละตัวเหมือน Vigenère ทุกอย่าง (บวกแล้ว mod 26) ต่างกันที่วิธีสร้างแถวคีย์: เมื่อใช้คีย์เริ่มต้นครบแล้ว จะไม่วนกลับไปใช้ซ้ำ แต่นำข้อความต้นฉบับตั้งแต่ตัวแรกมาต่อเป็นคีย์แทน",
      "เช่น ข้อความ DEFENDTHEWALL คีย์เริ่มต้น NIGHT แถวคีย์จะเป็น NIGHT + DEFENDTH = NIGHTDEFENDTH ยาวเท่าข้อความพอดี",
    ],
    history: "Blaise de Vigenère อธิบายรหัสแบบนี้ไว้ในหนังสือเมื่อ ค.ศ. 1586 เพื่อแก้จุดอ่อนของคีย์ที่วนซ้ำ ซึ่งทำให้วิธีหาความยาวคีย์ใช้ไม่ได้ผล",
    steps: [
      ["วางคีย์เริ่มต้นก่อน", "ใต้ 5 ตัวแรก DEFEN วาง NIGHT"],
      ["ต่อคีย์ด้วยข้อความต้นฉบับ", "ตั้งแต่ตัวที่ 6 ใช้ข้อความตัวที่ 1, 2, 3 … (D, E, F, …) เป็นคีย์"],
      ["บวกเลขแล้ว mod 26 เหมือน Vigenère", "D + N = 3 + 13 = 16 → Q"],
      ["เปลี่ยนกลับเป็นตัวอักษร", "ทำครบทุกตัวได้ QMLLGGXMIJDES"],
    ],
    alt: "ในแถบคีย์ด้านล่าง สีเขียว = มาจากคีย์เริ่มต้น สีส้ม = มาจากข้อความต้นฉบับ (P1 คือข้อความตัวที่ 1)",
    decrypt: "รู้แค่คีย์เริ่มต้นก็ถอดได้: ถอดตัวแรก ๆ ด้วยคีย์เริ่มต้น (C − K) แล้วนำตัวที่ถอดได้ไปเป็นคีย์ของตัวถัด ๆ ไป จึงต้องถอดตามลำดับทีละตัว",
    pros: ["คีย์ไม่วนซ้ำเป็นรอบ วิธีหาความยาวคีย์แบบที่ใช้กับ Vigenère จึงใช้ไม่ได้", "จำแค่คีย์เริ่มต้นสั้น ๆ ก็พอ"],
    cons: ["คีย์ส่วนใหญ่คือข้อความภาษาอังกฤษ จึงเดาคำที่พบบ่อย เช่น THE แล้วไล่หาส่วนที่เหลือได้", "ถอดผิดตัวเดียว ตัวถัดไปจะผิดต่อเนื่องเป็นทอด ๆ"],
    tip: "สูตรคำนวณเหมือน Vigenère เป๊ะ จุดที่ต่างมีแค่ “แถวคีย์มาจากไหน”",
    example: { text: "DEFENDTHEWALL", key: "NIGHT", note: "ตัวอย่างจาก Excel: DEFEND THE WALL ใช้คีย์เริ่มต้น NIGHT" },
  },
  general: {
    name: "General substitution",
    thai: "รหัสแทนที่ด้วยคีย์เวิร์ด",
    tagline: "สร้างชุดตัวอักษรใหม่จากคีย์เวิร์ด แล้วแทนตัวอักษรแต่ละตัวด้วยตัวในตำแหน่งเดียวกันของชุดใหม่",
    facts: [["ประเภท", "แทนที่แบบอักษรเดียว"], ["กุญแจ", "คีย์เวิร์ด (ตัดตัวซ้ำ)"], ["ยุค", "ใช้มาหลายศตวรรษ"], ["ความยาก", "ปานกลาง (ต้องสร้างตาราง)"]],
    formula: { encrypt: ["C = ชุดใหม่[ตำแหน่งของ P]"], decrypt: ["P = A–Z[ตำแหน่งของ C ในชุดใหม่]"] },
    concept: [
      "วิธีนี้ไม่บวกลบตัวเลข แต่สร้าง “ตัวอักษรชุดใหม่” 26 ตัวขึ้นจากคีย์เวิร์ด แล้วจับคู่กับ A–Z ปกติ ตัวอักษรแต่ละตัวจะถูกแทนด้วยตัวที่อยู่ตำแหน่งเดียวกันในชุดใหม่",
      "วิธีสร้างชุดใหม่ตามเอกสาร: ตัดตัวซ้ำในคีย์เวิร์ด → เขียนเป็นแถวแรกของตาราง → เติมตัวอักษรที่เหลือตามลำดับทีละแถว → อ่านจากบนลงล่างทีละคอลัมน์",
    ],
    history: "รหัสแทนที่มีใช้มาตั้งแต่สมัยโบราณ ตารางแทนที่ที่เป็นไปได้มีถึง 26! ≈ 4 × 10²⁶ แบบ แต่ถูกถอดได้ด้วยการวิเคราะห์ความถี่ ซึ่ง Al-Kindi นักวิชาการชาวอาหรับอธิบายไว้ตั้งแต่ศตวรรษที่ 9 ส่วนการใช้คีย์เวิร์ดช่วยให้จำตารางได้ง่าย",
    steps: [
      ["ตัดตัวซ้ำในคีย์เวิร์ด", "BANGKOK → BANGKO (ตัด K ตัวที่ซ้ำออก) เหลือ 6 ตัว = ตาราง 6 คอลัมน์"],
      ["เติมตัวที่เหลือลงตาราง", "เขียน BANGKO เป็นแถวแรก แล้วเติม C D E F H I … (ข้ามตัวที่ใช้ไปแล้ว) แถวละ 6 ตัว"],
      ["อ่านทีละคอลัมน์จากบนลงล่าง", "คอลัมน์ 1 = BCJSY, คอลัมน์ 2 = ADLTZ, … ต่อกันได้ BCJSYADLTZNEMUGFPVKHQWOIRX"],
      ["แทนที่ทีละตัว", "วาง A–Z ไว้บน ชุดใหม่ไว้ล่าง: A → B, B → C, C → J … เช่น T → H"],
    ],
    alt: "ตัวอักษรที่มีสีเดียวกัน มาจากคอลัมน์เดียวกันในตาราง",
    decrypt: "ใช้ตารางเดิมแต่อ่านกลับด้าน: หาตัวรหัสในแถวล่าง (ชุดใหม่) แล้วอ่านตัวในแถวบน (A–Z) ที่อยู่ตรงกัน เช่น H อยู่ใต้ T จึงถอดได้ T",
    pros: ["มีรูปแบบตารางได้มหาศาล ลองทุกแบบไม่ไหว", "จำแค่คีย์เวิร์ดแทนการจำตารางทั้ง 26 ตัว"],
    cons: ["ตัวเดิมกลายเป็นตัวเดิมเสมอ จึงนับความถี่ได้ เช่น E มักพบบ่อยที่สุดในภาษาอังกฤษ", "ถ้ารู้คู่ตัวอักษรบางตัว ก็เดาคีย์เวิร์ดและตารางที่เหลือได้ง่ายขึ้น"],
    tip: "เคล็ดลับ: ตัวแรกของแต่ละคอลัมน์คือคีย์เวิร์ด อ่านลงจนสุดคอลัมน์ก่อนค่อยขึ้นคอลัมน์ถัดไป",
    example: { text: "THAIPERSON", key: "BANGKOK", note: "ตัวอย่างจาก Excel: THAI PERSON ใช้คีย์เวิร์ด BANGKOK" },
  },
  beaufort: {
    name: "Beaufort",
    thai: "รหัสโบฟอร์ต",
    tagline: "คล้าย Vigenère แต่ใช้ “คีย์ ลบ ข้อความ” และใช้สูตรเดียวกันทั้งเข้ารหัสและถอดรหัส",
    facts: [["ประเภท", "หลายชุดอักษร (ผกผันตัวเอง)"], ["กุญแจ", "คำภาษาอังกฤษ วนซ้ำ"], ["ยุค", "ค.ศ. 1710 / ศตวรรษที่ 19"], ["ความยาก", "ปานกลาง"]],
    formula: { encrypt: ["Cᵢ = (Kᵢ − Pᵢ) mod 26"], decrypt: ["Pᵢ = (Kᵢ − Cᵢ) mod 26", "สูตรเดิมทุกอย่าง"] },
    concept: [
      "วางคีย์ซ้ำใต้ข้อความเหมือน Vigenère แต่สลับการคำนวณเป็น เลขคีย์ ลบ เลขข้อความ ผลจึงติดลบบ่อย ต้องบวก 26 ให้กลับมาอยู่ในช่วง 0–25",
      "จุดพิเศษคือ “ผกผันตัวเอง” (reciprocal): ถ้านำข้อความรหัสไปเข้ารหัสซ้ำด้วยคีย์เดิม จะได้ข้อความต้นฉบับกลับมา จึงใช้ขั้นตอนเดียวกันทั้งสองทาง",
    ],
    history: "Giovanni Sestri อธิบายไว้ตั้งแต่ ค.ศ. 1710 แต่เรียกตามชื่อเซอร์ฟรานซิส โบฟอร์ต นายพลเรือชาวอังกฤษผู้คิดมาตราวัดความแรงลม หลักการเดียวกันนี้ถูกใช้ในเครื่องเข้ารหัส M-209 ของกองทัพสหรัฐฯ ช่วงสงครามโลกครั้งที่ 2",
    steps: [
      ["เขียนคีย์ซ้ำใต้ข้อความ", "ใต้ SENDHELPNOW วาง FINEFINEFIN"],
      ["เปลี่ยนเป็นตัวเลข", "ข้อความ S = 18 คีย์ F = 5"],
      ["เอาเลขคีย์ ลบ เลขข้อความ แล้ว mod 26", "5 − 18 = −13 ติดลบ จึงบวก 26 → 13"],
      ["เปลี่ยนกลับเป็นตัวอักษร", "13 = N ทำครบทุกตัวได้ NEABYECPSUR"],
    ],
    alt: "ใช้ตาราง: ไปที่คอลัมน์ของตัวต้นฉบับ ไล่ลงมาจนเจอตัวคีย์ แล้วอ่านหัวแถว",
    decrypt: "ใช้สูตรเดิมทุกอย่าง: K − C แล้ว mod 26 เช่น F (5) − N (13) = −8 → −8 + 26 = 18 = S ไม่ต้องจำสูตรใหม่ ลองกด “ถอดรหัส” ด้านบนจะเห็นว่าใช้การลบแบบเดียวกัน",
    pros: ["เข้ารหัสและถอดรหัสด้วยขั้นตอนเดียวกัน สร้างเครื่องมือหรือเครื่องจักรได้ง่าย", "ตัวอักษรเดียวกันกลายเป็นคนละตัวได้ เหมือน Vigenère"],
    cons: ["คีย์วนซ้ำเป็นรอบ จึงมีจุดอ่อนเดียวกับ Vigenère", "ลบผิดทิศ (P − K) เป็นความผิดพลาดที่พบบ่อยมาก"],
    tip: "ระวังทิศทางการลบ: Beaufort คือ คีย์ − ข้อความ ไม่ใช่ ข้อความ − คีย์",
    example: { text: "SENDHELPNOW", key: "FINE", note: "ตัวอย่างจาก Excel: SEND HELP NOW ใช้คีย์ FINE" },
  },
};
const CIPHER_ORDER = ["caesar", "vigenere", "autokey", "general", "beaufort"];

/* ------------------------------------------------------------------ state */

const ui = {};
let currentTab = null;
let onOpenEncryptor = () => {};
const lesson = { method: null, mode: "encrypt", text: "", key: "", shift: 3, step: 0, result: null, error: "", timer: null };
const quiz = { correct: 0, total: 0, current: null };

/* ------------------------------------------------------------------ shared pieces */

const tile = (letter, value, label, extra = "") =>
  `<span class="tile ${extra}"><b>${esc(letter)}</b><small>${esc(value)}</small><em>${esc(label)}</em></span>`;
const op = (symbol) => `<span class="eq-op">${symbol}</span>`;

function sectionHead(label, title, text = "") {
  return `<span class="step-label">${label}</span><h3>${title}</h3>${text ? `<p class="lesson-lead">${text}</p>` : ""}`;
}

function pagerHTML(tab) {
  const index = TAB_ORDER.indexOf(tab);
  const prev = TAB_ORDER[index - 1];
  const next = TAB_ORDER[index + 1];
  return `<nav class="lesson-pager" aria-label="หัวข้อก่อนหน้าและถัดไป">
    ${prev ? `<a href="#learn/${prev}"><small>← ก่อนหน้า</small><b>${TABS[prev].name}</b></a>` : "<span></span>"}
    ${next ? `<a class="pager-next" href="#learn/${next}"><small>ถัดไป →</small><b>${TABS[next].name}</b></a>` : "<span></span>"}
  </nav>`;
}

function alphabetGridHTML() {
  return `<div class="az-grid">${[...ALPHABET].map((letter, i) => `<span><b>${letter}</b><small>${i}</small></span>`).join("")}</div>`;
}

function wheelSVG() {
  const cx = 150;
  const cy = 150;
  const point = (i, r) => {
    const angle = (i / 26) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const letters = [...ALPHABET].map((letter, i) => {
    const [x, y] = point(i, 116);
    const [nx, ny] = point(i, 90);
    const hot = i === 0 || i === 25 ? " is-hot" : "";
    return `<text class="w-letter${hot}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${letter}</text><text class="w-num${hot}" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}">${i}</text>`;
  }).join("");
  const [ax, ay] = point(25.15, 140);
  const [bx, by] = point(25.85, 140);
  return `<svg class="wheel" viewBox="0 0 300 300" role="img" aria-label="วงล้อตัวอักษร A ถึง Z พร้อมเลข 0 ถึง 25 หลัง Z วนกลับไปที่ A">
    <defs><marker id="wheelArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="w-arrow-head"/></marker></defs>
    <circle class="w-ring" cx="${cx}" cy="${cy}" r="132"/><circle class="w-inner" cx="${cx}" cy="${cy}" r="72"/>
    ${letters}
    <path class="w-arrow" d="M${ax.toFixed(1)} ${ay.toFixed(1)} A140 140 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}" marker-end="url(#wheelArrow)"/>
    <text class="w-center" x="${cx}" y="${cy - 8}">mod 26</text>
    <text class="w-center-sub" x="${cx}" y="${cy + 14}">หลัง Z วนกลับ A</text>
  </svg>`;
}

/* ------------------------------------------------------------------ basics tab */

function basicsHTML() {
  const word = "HELLO";
  const caesar = encrypt(word, "caesar", { shift: 3 }).output;
  const vigenere = encrypt(word, "vigenere", { key: "KEY" }).output;
  const letterRow = (text, hot) => `<span class="mini-word">${[...text].map((l, i) => `<i class="${hot.includes(i) ? "is-hot" : ""}">${l}</i>`).join("")}</span>`;

  return `<article class="lesson">
    <header class="lesson-hero">
      <div class="lesson-hero-copy">
        <span class="step-label">00 / BASICS</span>
        <h2>พื้นฐานก่อนเริ่ม <small>ใช้กับทั้ง 5 วิธี</small></h2>
        <p>รหัสลับทั้ง 5 แบบในแอปนี้ใช้ความรู้ชุดเดียวกัน: เปลี่ยนตัวอักษรเป็นตัวเลข คำนวณ แล้ววนกลับด้วย mod 26 อ่านหน้านี้ให้เข้าใจก่อน แล้วทุกวิธีจะง่ายขึ้นมาก</p>
      </div>
      <div class="formula-card">
        <span>หัวใจของทุกวิธี</span>
        <code>ตัวอักษร → ตัวเลข → คำนวณ → mod 26 → ตัวอักษร</code>
        <p class="formula-legend">General substitution ใช้ตารางแทนการคำนวณ แต่หลักการ “จับคู่ตำแหน่ง” ยังเหมือนกัน</p>
      </div>
    </header>

    <div class="lesson-grid">
      <section class="lesson-card">
        ${sectionHead("01 / WORDS", "คำศัพท์ที่ต้องรู้")}
        <dl class="vocab">
          <div><dt>P <small>Plaintext</small></dt><dd>ข้อความต้นฉบับ ที่ทุกคนอ่านออก</dd></div>
          <div><dt>C <small>Ciphertext</small></dt><dd>ข้อความรหัส ที่ได้หลังเข้ารหัส</dd></div>
          <div><dt>K <small>Key</small></dt><dd>กุญแจ ใช้ทั้งตอนเข้ารหัสและถอดรหัส</dd></div>
          <div><dt>P → C <small>Encrypt</small></dt><dd>เข้ารหัส: เปลี่ยนข้อความเป็นรหัส</dd></div>
          <div><dt>C → P <small>Decrypt</small></dt><dd>ถอดรหัส: เปลี่ยนรหัสกลับเป็นข้อความ</dd></div>
        </dl>
      </section>
      <section class="lesson-card">
        ${sectionHead("02 / NUMBERS", "เปลี่ยนตัวอักษรเป็นตัวเลข", "นับ A เป็น 0 ไปจนถึง Z เป็น 25 รวม 26 ตัว ตัวเลขใต้ตัวอักษรคือค่าที่ใช้คำนวณ")}
        ${alphabetGridHTML()}
        <p class="soft-note">ตารางในหน้าเข้ารหัสแสดงลำดับ 1–26 เพื่อให้อ่านง่าย แต่การคำนวณจริงเริ่มที่ A = 0 เสมอ</p>
      </section>
    </div>

    <section class="lesson-card mod-card">
      <div class="mod-copy">
        ${sectionHead("03 / MOD 26", "mod 26 คือ “การวนกลับ”", "mod 26 คือเศษที่ได้จากการหารด้วย 26 ให้คิดเหมือนเข็มนาฬิกา: เดินเลย Z ไปก็วนกลับมาที่ A ถ้าถอยหลังเลย A ก็วนไปที่ Z ผลลัพธ์จึงอยู่ในช่วง 0–25 เสมอ")}
        <div class="table-scroll compact"><table class="steps-table">
          <thead><tr><th>ตัวอย่าง</th><th>ผลคำนวณ</th><th>ทำ mod 26</th><th>ความหมาย</th></tr></thead>
          <tbody>
            <tr><td>H (7) + 3</td><td>10</td><td class="mono">10</td><td>อยู่ในช่วง 0–25 ใช้ได้เลย → <b>K</b></td></tr>
            <tr><td>X (23) + 5</td><td>28</td><td class="mono">28 − 26 = 2</td><td>เกิน 25 ให้ลบ 26 → <b>C</b></td></tr>
            <tr><td>F (5) − S (18)</td><td>−13</td><td class="mono">−13 + 26 = 13</td><td>ติดลบ ให้บวก 26 → <b>N</b></td></tr>
          </tbody>
        </table></div>
        <p class="soft-note">จำง่าย ๆ: <b>เกิน 25 → ลบ 26</b> · <b>ติดลบ → บวก 26</b></p>
      </div>
      <div class="mod-visual">${wheelSVG()}</div>
    </section>

    <div class="lesson-grid">
      <section class="lesson-card">
        ${sectionHead("04 / FAMILIES", "รหัส 2 ตระกูล", `ลองเข้ารหัสคำว่า ${word} ซึ่งมีตัว L สองตัวติดกัน แล้วดูว่าแต่ละวิธีให้ผลอย่างไร`)}
        <div class="family">
          <div class="family-row"><span class="family-name">Caesar (+3)</span>${letterRow(word, [2, 3])}<span class="family-arrow">→</span>${letterRow(caesar, [2, 3])}</div>
          <p><b>อักษรเดียว (Monoalphabetic):</b> L ทั้งสองตัวกลายเป็น ${caesar[2]} เหมือนกัน ตัวเดิมได้ผลเดิมเสมอ ได้แก่ Caesar และ General</p>
          <div class="family-row"><span class="family-name">Vigenère (KEY)</span>${letterRow(word, [2, 3])}<span class="family-arrow">→</span>${letterRow(vigenere, [2, 3])}</div>
          <p><b>หลายชุดอักษร (Polyalphabetic):</b> L ตัวแรกเป็น ${vigenere[2]} ตัวที่สองเป็น ${vigenere[3]} เพราะใช้คีย์ต่างกัน ได้แก่ Vigenère, Autokey และ Beaufort</p>
        </div>
      </section>
      <section class="lesson-card">
        ${sectionHead("05 / RULES", "กติกาของแอปนี้")}
        <ul class="check-list">
          <li>ใช้เฉพาะตัวอักษรภาษาอังกฤษ A–Z ในการคำนวณ</li>
          <li>ช่องว่าง ตัวเลข สัญลักษณ์ และภาษาไทย คงเดิม และ<b>ไม่นับ</b>เป็นตำแหน่งของคีย์</li>
          <li>ตัวพิมพ์เล็ก/ใหญ่ คงเดิมตามข้อความต้นฉบับ</li>
          <li>คีย์ใช้เฉพาะ A–Z ตัวอื่นในคีย์จะถูกตัดทิ้ง</li>
        </ul>
        <div class="path-list">
          <span class="field-label">เริ่มเรียนตามลำดับนี้</span>
          ${CIPHER_ORDER.map((id, i) => `<a href="#learn/${id}"><span>${String(i + 1).padStart(2, "0")}</span><b>${TABS[id].name}</b><small>${TABS[id].caption}</small><i>→</i></a>`).join("")}
        </div>
      </section>
    </div>
    ${pagerHTML("basics")}
  </article>`;
}

/* ------------------------------------------------------------------ compare tab */

const COMPARE_DEFAULTS = {
  caesar: { shift: 3, label: "D (+3)" },
  vigenere: { key: "CIPHER", label: "CIPHER" },
  autokey: { key: "NIGHT", label: "NIGHT" },
  general: { key: "BANGKOK", label: "BANGKOK" },
  beaufort: { key: "FINE", label: "FINE" },
};

function compareHTML() {
  const rows = [
    ["caesar", "อักษรเดียว", "ตัวเลข 0–25", "C = P + k", "P = C − k", "25 แบบ", "ต่ำมาก", 1],
    ["vigenere", "หลายชุดอักษร", "คำ วนซ้ำ", "C = P + K", "P = C − K", "26ⁿ (n = ความยาวคีย์)", "ปานกลาง", 3],
    ["autokey", "หลายชุดอักษร", "คีย์เริ่มต้น + ข้อความ", "C = P + K", "P = C − K (ทีละตัว)", "26ⁿ", "ปานกลาง", 3],
    ["general", "อักษรเดียว", "คีย์เวิร์ด", "ตามตาราง", "อ่านตารางกลับด้าน", "สูงสุด 26!", "ต่ำ", 2],
    ["beaufort", "หลายชุดอักษร", "คำ วนซ้ำ", "C = K − P", "P = K − C (สูตรเดิม)", "26ⁿ", "ปานกลาง", 3],
  ];
  return `<article class="lesson">
    <header class="lesson-hero">
      <div class="lesson-hero-copy">
        <span class="step-label">06 / COMPARE</span>
        <h2>เปรียบเทียบทั้ง 5 วิธี <small>ดูความต่างในหน้าเดียว</small></h2>
        <p>ทุกวิธีเป็นรหัสแบบคลาสสิกสำหรับเรียนรู้หลักการ ไม่ควรใช้ปกป้องข้อมูลสำคัญจริง เพราะคอมพิวเตอร์ถอดได้ในเวลาไม่นาน</p>
      </div>
      <div class="formula-card">
        <span>สรุปสั้นที่สุด</span>
        <code>บวก: Caesar · Vigenère · Autokey</code>
        <code>ลบ: Beaufort</code>
        <code>ตาราง: General</code>
      </div>
    </header>

    <section class="lesson-card">
      ${sectionHead("01 / TABLE", "ตารางเปรียบเทียบ")}
      <div class="table-scroll compact"><table class="steps-table compare-table">
        <thead><tr><th>วิธี</th><th>ตระกูล</th><th>กุญแจ</th><th>เข้ารหัส</th><th>ถอดรหัส</th><th>จำนวนคีย์</th><th>ความแข็งแรง</th><th>ตัวอย่างจาก Excel</th></tr></thead>
        <tbody>${rows.map(([id, family, key, enc, dec, space, level, bars]) => {
          const ex = CIPHERS[id].example;
          const out = encrypt(ex.text, id, { key: ex.key, shift: ex.shift }).output;
          return `<tr>
            <td><a class="table-link" href="#learn/${id}">${TABS[id].name}</a></td><td>${family}</td><td>${key}</td>
            <td class="mono">${enc}</td><td class="mono">${dec}</td><td>${space}</td>
            <td><span class="meter" aria-label="${level}">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= bars ? "on" : ""}"></i>`).join("")}</span> ${level}</td>
            <td class="mono">${ex.text} → <b>${out}</b></td></tr>`;
        }).join("")}</tbody>
      </table></div>
    </section>

    <section class="lesson-card">
      ${sectionHead("02 / TRY", "ทดลองเทียบผลลัพธ์", "พิมพ์ข้อความเดียว แล้วดูว่าแต่ละวิธีให้ผลต่างกันอย่างไร (ใช้คีย์จากตัวอย่าง Excel)")}
      <label class="lesson-field wide"><span>ข้อความ</span><input id="compareInput" type="text" maxlength="40" value="HELLO WORLD" spellcheck="false" autocomplete="off" /></label>
      <div class="compare-results" id="compareResults"></div>
      <p class="soft-note">สังเกตตัวอักษรที่ซ้ำกัน เช่น L และ O ใน HELLO WORLD: Caesar และ General ให้ผลซ้ำเหมือนเดิม ส่วน Vigenère, Autokey และ Beaufort ให้ผลต่างกัน</p>
    </section>

    <section class="lesson-card">
      ${sectionHead("03 / CHOOSE", "ควรเริ่มจากวิธีไหน")}
      <ul class="check-list">
        <li><b>เพิ่งเริ่ม:</b> Caesar เข้าใจการเลื่อนและ mod 26</li>
        <li><b>อยากเห็นคีย์เป็นคำ:</b> Vigenère ต่อยอดจาก Caesar โดยตรง</li>
        <li><b>อยากรู้วิธีแก้จุดอ่อนคีย์วนซ้ำ:</b> Autokey</li>
        <li><b>อยากลองสูตรลบและรหัสที่ผกผันตัวเอง:</b> Beaufort</li>
        <li><b>อยากฝึกสร้างตาราง:</b> General substitution</li>
      </ul>
    </section>
    ${pagerHTML("compare")}
  </article>`;
}

function renderCompareResults() {
  const text = ui.compareInput.value;
  ui.compareResults.innerHTML = CIPHER_ORDER.map((id) => {
    const settings = COMPARE_DEFAULTS[id];
    const out = encrypt(text, id, settings).output;
    return `<a class="compare-row" href="#learn/${id}">
      <span class="compare-name"><b>${TABS[id].name}</b><small>คีย์ ${settings.label}</small></span>
      <code>${esc(out) || "—"}</code><i>ดูวิธีคิด →</i></a>`;
  }).join("");
}

/* ------------------------------------------------------------------ cipher tab */

function cipherHTML(id) {
  const c = CIPHERS[id];
  const caesar = id === "caesar";
  const keyLabel = { vigenere: "คำกุญแจ", autokey: "คีย์เริ่มต้น", general: "คีย์เวิร์ด", beaufort: "คำกุญแจ" }[id];
  const label = String(CIPHER_ORDER.indexOf(id) + 1).padStart(2, "0");
  return `<article class="lesson">
    <header class="lesson-hero">
      <div class="lesson-hero-copy">
        <span class="step-label">${label} / ${c.name.toUpperCase()}</span>
        <h2>${c.name} <small>${c.thai}</small></h2>
        <p>${c.tagline}</p>
        <dl class="fact-list">${c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      </div>
      <div class="formula-card">
        <span>สูตรเข้ารหัส</span>${c.formula.encrypt.map((line) => `<code>${line}</code>`).join("")}
        <span>สูตรถอดรหัส</span>${c.formula.decrypt.map((line) => `<code>${line}</code>`).join("")}
        <p class="formula-legend">P = ข้อความต้นฉบับ · C = ข้อความรหัส · K = คีย์ · ทุกตัวแปลงเป็นเลข 0–25 ก่อน</p>
      </div>
    </header>

    <div class="lesson-grid">
      <section class="lesson-card">
        ${sectionHead("01 / IDEA", "แนวคิด")}
        ${c.concept.map((p) => `<p class="lesson-text">${p}</p>`).join("")}
        <div class="history-note"><b>ที่มา</b><p>${c.history}</p></div>
      </section>
      <section class="lesson-card">
        ${sectionHead("02 / STEPS", "ขั้นตอนการคิด")}
        <ol class="step-list">${c.steps.map(([title, text], i) => `<li><span class="step-num">${i + 1}</span><div><b>${title}</b><p>${text}</p></div></li>`).join("")}</ol>
        <p class="tip-note"><span aria-hidden="true">💡</span>${c.alt}</p>
      </section>
    </div>

    <section class="lesson-card practice">
      <div class="practice-head">
        <div>${sectionHead("03 / WALKTHROUGH", "ลองทำทีละขั้น", "เปลี่ยนข้อความหรือคีย์ได้ กดถัดไปเพื่อดูการคิดทีละตัวอักษร หรือกดแถวในตารางเพื่อกระโดดไปขั้นนั้น")}</div>
        <div class="mode-toggle" role="group" aria-label="เลือกโหมด">
          <button type="button" data-mode="encrypt" aria-pressed="true">เข้ารหัส</button>
          <button type="button" data-mode="decrypt" aria-pressed="false">ถอดรหัส</button>
        </div>
      </div>
      <div class="practice-controls">
        <label class="lesson-field"><span id="lessonTextLabel">ข้อความต้นฉบับ</span><input id="lessonText" type="text" maxlength="40" spellcheck="false" autocomplete="off" /></label>
        ${caesar
          ? `<label class="lesson-field"><span>จำนวนที่เลื่อน <b class="key-chip" id="lessonShiftValue"></b></span><input id="lessonShift" type="range" min="0" max="25" /></label>`
          : `<label class="lesson-field"><span>${keyLabel}</span><input id="lessonKey" type="text" maxlength="20" spellcheck="false" autocomplete="off" /></label>`}
        <div class="practice-buttons">
          <button type="button" class="ghost-button" id="lessonReset">ตัวอย่าง Excel</button>
          <button type="button" class="ghost-button" id="lessonOpen">เปิดในหน้าเข้ารหัส ↗</button>
        </div>
      </div>
      <p class="example-note">${c.example.note}</p>
      <div class="practice-body">
        <div class="practice-left">
          <div class="focus-card" id="focusCard" aria-live="polite"></div>
          <div class="stepper">
            <button type="button" class="step-btn" data-go="first" aria-label="ไปขั้นแรก">⏮</button>
            <button type="button" class="step-btn" data-go="prev">◀ ก่อนหน้า</button>
            <span class="step-count" id="stepCount">0 / 0</span>
            <button type="button" class="step-btn" data-go="next">ถัดไป ▶</button>
            <button type="button" class="step-btn play" data-go="play" id="playButton">▶ เล่นอัตโนมัติ</button>
          </div>
          <div class="lesson-output"><span id="lessonOutputLabel">ผลลัพธ์</span><code id="lessonOutput"></code></div>
        </div>
        <div class="practice-visual" id="lessonVisual"></div>
      </div>
      <div id="lessonRibbon"></div>
      <div class="table-scroll lesson-table" id="lessonTableWrap" tabindex="0" role="region" aria-label="ตารางการคำนวณทีละตัว"><table class="steps-table" id="lessonTable"></table></div>
    </section>

    <div class="lesson-grid">
      <section class="lesson-card">
        ${sectionHead("04 / DECRYPT", "วิธีถอดรหัส")}
        <div class="formula-inline">${c.formula.decrypt.map((line) => `<code>${line}</code>`).join("")}</div>
        <p class="lesson-text">${c.decrypt}</p>
        <button type="button" class="ghost-button" id="tryDecrypt">ลองถอดรหัสตัวอย่าง ↑</button>
      </section>
      <section class="lesson-card">
        ${sectionHead("05 / PROS & CONS", "จุดเด่นและจุดอ่อน")}
        <ul class="pros-cons">
          ${c.pros.map((p) => `<li class="pro"><span>+</span>${p}</li>`).join("")}
          ${c.cons.map((p) => `<li class="con"><span>−</span>${p}</li>`).join("")}
        </ul>
        <p class="tip-note"><span aria-hidden="true">📌</span>${c.tip}</p>
      </section>
    </div>

    <section class="lesson-card quiz" id="quizCard">
      <div class="quiz-head">
        <div>${sectionHead("06 / QUIZ", "ทดสอบความเข้าใจ")}</div>
        <span class="quiz-score" id="quizScore"></span>
      </div>
      <p class="quiz-question" id="quizQuestion"></p>
      <div class="quiz-options" id="quizOptions"></div>
      <div class="quiz-feedback" id="quizFeedback" aria-live="polite"></div>
      <button type="button" class="ghost-button" id="quizNext">ข้อใหม่ ↻</button>
    </section>
    ${pagerHTML(id)}
  </article>`;
}

/* ---------- visuals */

function squareHTML(method) {
  const corner = method === "beaufort" ? "C╲P" : "K╲P";
  const head = [...ALPHABET].map((l, c) => `<th scope="col" data-c="${c}">${l}</th>`).join("");
  const body = [...ALPHABET].map((rowLetter, r) => {
    const cells = [...ALPHABET].map((_, c) => `<td data-r="${r}" data-c="${c}">${ALPHABET[(r + c) % 26]}</td>`).join("");
    return `<tr><th scope="row" data-r="${r}">${rowLetter}</th>${cells}</tr>`;
  }).join("");
  const caption = method === "beaufort"
    ? "วิธีอ่าน: คอลัมน์ = ตัวต้นฉบับ (P) → ไล่ลงจนเจอตัวคีย์ (K) → หัวแถวคือตัวรหัส (C)"
    : "วิธีอ่าน: แถว = คีย์ (K) · คอลัมน์ = ตัวต้นฉบับ (P) · ตัวตรงจุดตัด = ตัวรหัส (C)";
  return `<div class="visual-title"><b>${method === "beaufort" ? "ตารางสำหรับ Beaufort" : "ตาราง Vigenère (Tabula recta)"}</b><small>${caption}</small></div>
    <div class="square-wrap" id="squareWrap"><table class="square"><thead><tr><th class="corner">${corner}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function stripHTML(shift) {
  const cols = [...ALPHABET].map((letter, i) => `<div class="strip-col" data-i="${i}">
      <span class="s-plain">${letter}</span><span class="s-num">${i}</span><span class="s-arrow">↓</span><span class="s-cipher">${ALPHABET[(i + shift) % 26]}</span><span class="s-num">${(i + shift) % 26}</span></div>`).join("");
  return `<div class="visual-title"><b>แถบเลื่อนตัวอักษร (+${shift})</b><small>แถวบน = ต้นฉบับ · แถวล่าง = ตัวรหัสหลังเลื่อน ${shift} ช่อง</small></div>
    <div class="strip-wrap" id="stripWrap"><div class="strip">${cols}</div></div>
    <div class="strip-note">A → ${ALPHABET[shift]} · B → ${ALPHABET[(1 + shift) % 26]} · … · Z → ${ALPHABET[(25 + shift) % 26]} (วนกลับ)</div>`;
}

function keywordBuildHTML(key) {
  const grid = keywordGrid(key);
  const seen = new Set();
  const letters = [...grid.keyword].map((l) => {
    const dup = seen.has(l);
    seen.add(l);
    return `<i class="${dup ? "is-dup" : `c${grid.colOf[l] % 6}`}">${l}</i>`;
  }).join("");
  const head = Array.from({ length: grid.width }, (_, i) => `<th>${i + 1}</th>`).join("");
  const rows = grid.rows.map((row, r) => `<tr class="${r === 0 ? "kw-row" : ""}">${row.map((l, c) => `<td class="c${c % 6}" data-letter="${l}">${l}</td>`).join("")}</tr>`).join("");
  const sub = substitutionAlphabet(grid.keyword);
  const groups = [];
  let cursor = 0;
  for (let c = 0; c < grid.width; c += 1) {
    const size = grid.rows.filter((row) => row[c]).length;
    groups.push(`<i class="c${c % 6}">${sub.slice(cursor, cursor + size)}</i>`);
    cursor += size;
  }
  return `<div class="visual-title"><b>สร้างตารางแทนที่จาก “${esc(grid.keyword)}”</b><small>ทำตาม 3 ขั้นนี้ แล้วนำผลไปเทียบกับ A–Z ในแถบด้านล่าง</small></div>
    <div class="build">
      <div class="build-step"><span class="step-num">1</span><div><b>ตัดตัวซ้ำ → ${esc(grid.unique.join(""))} (${grid.width} ตัว)</b><div class="kw-letters">${letters}</div></div></div>
      <div class="build-step"><span class="step-num">2</span><div><b>เติมตัวที่เหลือ ทีละแถว แถวละ ${grid.width} ตัว</b>
        <div class="kw-grid-wrap"><table class="kw-grid" id="kwGrid"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div></div>
      <div class="build-step"><span class="step-num">3</span><div><b>อ่านลงทีละคอลัมน์ แล้วต่อกัน</b><div class="kw-read">${groups.join("")}</div></div></div>
    </div>`;
}

function mappingHTML(key) {
  const grid = keywordGrid(key);
  const sub = substitutionAlphabet(grid.keyword);
  const cols = [...ALPHABET].map((letter, i) => `<div class="map-col" data-i="${i}"><span class="m-plain">${letter}</span><span class="m-arrow">↓</span><span class="m-cipher c${grid.colOf[sub[i]] % 6}">${sub[i]}</span></div>`).join("");
  return `<div class="visual-title"><b>ตารางแทนที่ที่ได้</b><small>แถวบน = A–Z ปกติ · แถวล่าง = ชุดใหม่ (เข้ารหัส: บน → ล่าง · ถอดรหัส: ล่าง → บน)</small></div>
    <div class="strip-wrap" id="mapWrap"><div class="strip map">${cols}</div></div>`;
}

function ribbonHTML(res) {
  const labels = roleLabels(res.mode);
  const cols = res.steps.map((s, i) => `<button type="button" class="ribbon-col" data-step="${i}">
      <span class="r-in">${s.input}</span>
      <span class="r-key ${s.keySource === "text" ? "from-text" : "from-key"}">${s.keyLetter}${s.keySource === "text" ? `<sub>P${s.keySourceIndex + 1}</sub>` : ""}</span>
      <span class="r-out">${s.output}</span></button>`).join("");
  return `<div class="ribbon" data-mode="${res.mode}">
    <div class="visual-title"><b>${res.method === "autokey" ? "แถวคีย์ (คีย์เริ่มต้น + ข้อความ)" : "วางคีย์ซ้ำใต้ข้อความ"}</b>
      <small>${res.method === "autokey" ? `<i class="legend from-key"></i> คีย์เริ่มต้น <i class="legend from-text"></i> ข้อความต้นฉบับ (P1 = ข้อความตัวที่ 1)` : "คีย์วนซ้ำจนยาวเท่าข้อความ · กดตัวอักษรเพื่อดูขั้นนั้น"}</small></div>
    <div class="ribbon-body">
      <div class="ribbon-labels"><span>${labels.input}</span><span>คีย์ (K)</span><span>${labels.output}</span></div>
      <div class="ribbon-scroll" id="ribbonScroll">${cols}</div>
    </div></div>`;
}

/* ---------- table + focus */

function tableHTML(res) {
  const L = roleLabels(res.mode);
  if (res.method === "general") {
    const head = res.mode === "encrypt"
      ? `<th>ขั้น</th><th>${L.input}</th><th>ตำแหน่งใน A–Z</th><th>ตัวในชุดใหม่ ตำแหน่งเดียวกัน</th><th>${L.output}</th>`
      : `<th>ขั้น</th><th>${L.input}</th><th>ตำแหน่งในชุดใหม่</th><th>ตัวใน A–Z ตำแหน่งเดียวกัน</th><th>${L.output}</th>`;
    const rows = res.steps.map((s, i) => `<tr data-step="${i}"><td class="index-cell">${String(s.n).padStart(2, "0")}</td><td class="char-cell">${s.input}</td>
      <td class="mono">${res.mode === "encrypt" ? s.inputIndex : s.result}</td><td class="mono">${res.mode === "encrypt" ? `ชุดใหม่[${s.inputIndex}] = ${s.output}` : `A–Z[${s.result}] = ${s.output}`}</td><td class="cipher-cell">${s.output}</td></tr>`).join("");
    return `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody>`;
  }
  const keyHead = res.method === "caesar" ? "เลื่อน (k)" : "คีย์ (K)";
  const calcHead = res.method === "beaufort" ? "K − " + L.inShort : res.mode === "encrypt" ? "P + K" : "C − K";
  const rows = res.steps.map((s, i) => {
    const calc = res.method === "beaufort"
      ? `${s.keyIndex} ${MINUS} ${s.inputIndex} = ${num(s.raw)}`
      : res.mode === "encrypt" ? `${s.inputIndex} + ${s.keyIndex} = ${s.raw}` : `${s.inputIndex} ${MINUS} ${s.keyIndex} = ${num(s.raw)}`;
    const source = res.method === "autokey" ? `<small class="src ${s.keySource === "text" ? "from-text" : "from-key"}">${s.keySource === "text" ? `P${s.keySourceIndex + 1}` : "คีย์"}</small>` : "";
    return `<tr data-step="${i}"><td class="index-cell">${String(s.n).padStart(2, "0")}</td><td class="char-cell">${s.input}</td><td class="mono">${s.inputIndex}</td>
      <td class="key-cell">${s.keyLetter}${source}</td><td class="mono">${s.keyIndex}</td><td class="mono">${calc}</td>
      <td class="mono ${s.raw < 0 || s.raw > 25 ? "wrapped" : ""}">${modCell(s.raw, s.result)}</td><td class="cipher-cell">${s.output}</td></tr>`;
  }).join("");
  return `<thead><tr><th>ขั้น</th><th>${L.input}</th><th>เลข</th><th>${keyHead}</th><th>เลขคีย์</th><th>${calcHead}</th><th>mod 26</th><th>${L.output}</th></tr></thead><tbody>${rows}</tbody>`;
}

function focusHTML(res, s) {
  const L = roleLabels(res.mode);
  const keyLabel = res.method === "caesar" ? "เลื่อน (k)" : "คีย์ (K)";
  const out = tile(s.output, s.result, L.output, "is-result");
  let equation;
  const notes = [];

  if (res.method === "general") {
    equation = `${tile(s.input, res.mode === "encrypt" ? s.inputIndex : s.result, L.input)}${op("→")}<span class="eq-note">ตาราง<br />แทนที่</span>${op("→")}${out}`;
    notes.push(res.mode === "encrypt"
      ? `${s.input} อยู่ตำแหน่งที่ ${s.inputIndex} ของ A–Z ตัวในชุดใหม่ที่ตำแหน่งเดียวกันคือ <b>${s.output}</b>`
      : `${s.input} อยู่ตำแหน่งที่ ${s.result} ของชุดใหม่ ตัวใน A–Z ที่ตำแหน่งเดียวกันคือ <b>${s.output}</b>`);
  } else {
    const inTile = tile(s.input, s.inputIndex, L.input);
    const keyTile = tile(s.keyLetter, s.keyIndex, keyLabel, s.keySource === "text" ? "from-text" : "");
    const wrapped = s.raw < 0 || s.raw > 25;
    const tail = `${op("=")}<span class="eq-raw">${num(s.raw)}</span>${wrapped ? `${op("→")}<span class="eq-mod">mod 26<br /><b>${s.result}</b></span>` : ""}${op("→")}${out}`;
    equation = res.method === "beaufort"
      ? `${keyTile}${op(MINUS)}${inTile}${tail}`
      : `${inTile}${op(res.mode === "encrypt" ? "+" : MINUS)}${keyTile}${tail}`;
    notes.push(`${s.input} = ${s.inputIndex} และ ${res.method === "caesar" ? `เลื่อน ${s.keyIndex} (คีย์ ${s.keyLetter})` : `${s.keyLetter} = ${s.keyIndex}`}`);
    notes.push(modNote(s.raw, s.result));
    notes.push(`${s.result} คือตัวอักษร <b>${s.output}</b>`);
    if (res.method === "autokey") {
      notes.unshift(s.keySource === "text"
        ? `คีย์ตัวนี้มาจาก<b>ข้อความต้นฉบับตัวที่ ${s.keySourceIndex + 1}</b> (${s.keyLetter}) เพราะใช้คีย์เริ่มต้นครบแล้ว`
        : `คีย์ตัวนี้มาจาก<b>คีย์เริ่มต้น</b> ตัวที่ ${s.n}`);
    }
    const plain = res.mode === "encrypt" ? s.input : s.output;
    const cipher = res.mode === "encrypt" ? s.output : s.input;
    if (res.method === "vigenere" || res.method === "autokey") notes.push(`ในตาราง: แถว ${s.keyLetter} ตัดกับคอลัมน์ ${plain} ได้ ${cipher}`);
    if (res.method === "beaufort") notes.push(`ในตาราง: คอลัมน์ ${plain} ไล่ลงจนเจอ ${s.keyLetter} ที่แถว ${cipher}`);
  }

  return `<div class="focus-top"><span>ขั้นที่ ${s.n} จาก ${res.steps.length}</span><span>${L.verb}</span></div>
    <div class="equation">${equation}</div>
    <ul class="focus-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;
}

/* ---------- lesson logic */

function lessonOptions() {
  return { key: lesson.key, shift: lesson.shift };
}

function computeLesson() {
  lesson.error = "";
  lesson.result = null;
  if (lesson.method !== "caesar" && !normalizeKey(lesson.key)) {
    lesson.error = "ใส่คีย์เป็นตัวอักษร A–Z อย่างน้อย 1 ตัว";
    return;
  }
  const res = explain(lesson.text, lesson.method, lessonOptions(), lesson.mode);
  if (!res.steps.length) {
    lesson.error = "พิมพ์ข้อความที่มีตัวอักษร A–Z เพื่อเริ่มดูทีละขั้น";
    return;
  }
  lesson.result = res;
}

function renderVisual() {
  const m = lesson.method;
  if (m === "caesar") ui.visual.innerHTML = stripHTML(lesson.shift);
  else if (m === "general") ui.visual.innerHTML = normalizeKey(lesson.key) ? keywordBuildHTML(lesson.key) : "";
  else if (!ui.visual.querySelector(".square")) ui.visual.innerHTML = squareHTML(m);
}

function renderLesson() {
  stopPlay();
  computeLesson();
  const L = roleLabels(lesson.mode);
  ui.textLabel.textContent = lesson.mode === "encrypt" ? "ข้อความต้นฉบับ (P)" : "ข้อความรหัส (C)";
  ui.outputLabel.textContent = lesson.mode === "encrypt" ? "ผลการเข้ารหัส" : "ผลการถอดรหัส";
  if (ui.shiftValue) ui.shiftValue.textContent = `${ALPHABET[lesson.shift]} · +${lesson.shift}`;
  ui.modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === lesson.mode)));
  renderVisual();

  const res = lesson.result;
  if (!res) {
    ui.focus.innerHTML = `<p class="focus-empty">${lesson.error}</p>`;
    ui.ribbon.innerHTML = "";
    ui.table.innerHTML = "";
    ui.tableWrap.hidden = true;
    ui.output.textContent = "—";
    ui.stepCount.textContent = "0 / 0";
    ui.root.querySelectorAll(".step-btn").forEach((b) => { b.disabled = true; });
    return;
  }
  ui.root.querySelectorAll(".step-btn").forEach((b) => { b.disabled = false; });
  ui.tableWrap.hidden = false;
  ui.ribbon.innerHTML = lesson.method === "general" ? mappingHTML(lesson.key) : lesson.method === "caesar" ? "" : ribbonHTML(res);
  ui.table.innerHTML = tableHTML(res);
  ui.table.setAttribute("aria-label", `ตาราง${L.verb}ทีละตัว`);
  lesson.step = Math.min(lesson.step, res.steps.length - 1);
  setStep(lesson.step);
}

function setStep(index) {
  const res = lesson.result;
  if (!res) return;
  lesson.step = Math.max(0, Math.min(index, res.steps.length - 1));
  const s = res.steps[lesson.step];
  ui.focus.innerHTML = focusHTML(res, s);
  ui.stepCount.textContent = `${lesson.step + 1} / ${res.steps.length}`;
  ui.output.innerHTML = res.steps.map((step, i) => `<i class="${i < lesson.step ? "done" : i === lesson.step ? "now" : "todo"}">${step.output}</i>`).join("");

  ui.table.querySelectorAll("tr.is-current").forEach((tr) => tr.classList.remove("is-current"));
  const row = ui.table.querySelector(`tr[data-step="${lesson.step}"]`);
  row?.classList.add("is-current");

  const plainIndex = res.mode === "encrypt" ? s.inputIndex : s.result;
  const cipherIndex = res.mode === "encrypt" ? s.result : s.inputIndex;
  ui.root.querySelectorAll(".is-hit, .in-row, .in-col, .is-current-col, .is-source").forEach((el) => el.classList.remove("is-hit", "in-row", "in-col", "is-current-col", "is-source"));

  let visualTarget = null;
  if (res.method === "caesar") {
    visualTarget = ui.visual.querySelector(`.strip-col[data-i="${plainIndex}"]`);
    visualTarget?.classList.add("is-current-col");
  } else if (res.method === "general") {
    visualTarget = ui.visual.querySelector(`#kwGrid td[data-letter="${ALPHABET[cipherIndex]}"]`);
    visualTarget?.classList.add("is-hit");
    const mapCol = ui.ribbon.querySelector(`.map-col[data-i="${plainIndex}"]`);
    mapCol?.classList.add("is-current-col");
    revealIn(ui.ribbon.querySelector("#mapWrap"), mapCol);
  } else {
    const r = res.method === "beaufort" ? cipherIndex : s.keyIndex;
    const c = plainIndex;
    ui.visual.querySelectorAll(`[data-r="${r}"]`).forEach((el) => el.classList.add("in-row"));
    ui.visual.querySelectorAll(`[data-c="${c}"]`).forEach((el) => el.classList.add("in-col"));
    visualTarget = ui.visual.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    visualTarget?.classList.add("is-hit");
    const col = ui.ribbon.querySelector(`.ribbon-col[data-step="${lesson.step}"]`);
    col?.classList.add("is-current-col");
    if (s.keySource === "text") ui.ribbon.querySelector(`.ribbon-col[data-step="${s.keySourceIndex}"]`)?.classList.add("is-source");
    revealIn(ui.ribbon.querySelector("#ribbonScroll"), col);
  }
  // Only scrolls the small inner boxes, never the page.
  revealIn(ui.visual.querySelector("#squareWrap, #stripWrap"), visualTarget, 26, 26);
  revealIn(ui.tableWrap, row, 38);
}

function stopPlay() {
  window.clearInterval(lesson.timer);
  lesson.timer = null;
  if (ui.playButton) ui.playButton.textContent = "▶ เล่นอัตโนมัติ";
}

function togglePlay() {
  if (lesson.timer) return stopPlay();
  const res = lesson.result;
  if (!res) return;
  if (lesson.step >= res.steps.length - 1) setStep(0);
  ui.playButton.textContent = "❚❚ หยุด";
  lesson.timer = window.setInterval(() => {
    if (lesson.step >= lesson.result.steps.length - 1) return stopPlay();
    setStep(lesson.step + 1);
  }, 1400);
}

function setMode(mode) {
  if (mode === lesson.mode) return;
  // Feed the current result in as the new input, so encrypt → decrypt shows the round trip.
  if (lesson.result) lesson.text = lesson.result.output;
  lesson.mode = mode;
  lesson.step = 0;
  ui.text.value = lesson.text;
  renderLesson();
}

function resetExample() {
  const ex = CIPHERS[lesson.method].example;
  lesson.key = ex.key || "";
  lesson.shift = ex.shift ?? 3;
  lesson.text = lesson.mode === "encrypt" ? ex.text : encrypt(ex.text, lesson.method, { key: ex.key, shift: ex.shift }).output;
  lesson.step = 0;
  ui.text.value = lesson.text;
  if (ui.key) ui.key.value = lesson.key;
  if (ui.shift) ui.shift.value = String(lesson.shift);
  renderLesson();
}

function bindLesson(id) {
  const root = ui.content;
  Object.assign(ui, {
    root,
    text: root.querySelector("#lessonText"),
    textLabel: root.querySelector("#lessonTextLabel"),
    key: root.querySelector("#lessonKey"),
    shift: root.querySelector("#lessonShift"),
    shiftValue: root.querySelector("#lessonShiftValue"),
    modeButtons: [...root.querySelectorAll(".mode-toggle button")],
    focus: root.querySelector("#focusCard"),
    stepCount: root.querySelector("#stepCount"),
    playButton: root.querySelector("#playButton"),
    output: root.querySelector("#lessonOutput"),
    outputLabel: root.querySelector("#lessonOutputLabel"),
    visual: root.querySelector("#lessonVisual"),
    ribbon: root.querySelector("#lessonRibbon"),
    table: root.querySelector("#lessonTable"),
    tableWrap: root.querySelector("#lessonTableWrap"),
  });
  lesson.method = id;
  lesson.mode = "encrypt";
  lesson.step = 0;
  resetExample();

  ui.text.addEventListener("input", () => { lesson.text = ui.text.value; renderLesson(); });
  ui.key?.addEventListener("input", () => {
    lesson.key = ui.key.value;
    if (lesson.method === "general") ui.visual.innerHTML = "";
    renderLesson();
  });
  ui.shift?.addEventListener("input", () => { lesson.shift = Number(ui.shift.value); renderLesson(); });
  ui.modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  root.querySelector("#lessonReset").addEventListener("click", resetExample);
  root.querySelector("#lessonOpen").addEventListener("click", () => {
    const plain = lesson.mode === "encrypt" ? lesson.text : lesson.result?.output || "";
    onOpenEncryptor({ method: lesson.method, text: plain, key: lesson.key, shift: lesson.shift });
  });
  root.querySelector("#tryDecrypt").addEventListener("click", () => {
    if (lesson.mode === "encrypt") setMode("decrypt");
    root.querySelector(".practice").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  root.querySelector(".stepper").addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]")?.dataset.go;
    if (!go || !lesson.result) return;
    if (go === "play") return togglePlay();
    stopPlay();
    const last = lesson.result.steps.length - 1;
    setStep({ first: 0, prev: lesson.step - 1, next: lesson.step + 1 }[go] ?? last);
  });
  const jump = (event) => {
    const target = event.target.closest("[data-step]");
    if (!target) return;
    stopPlay();
    setStep(Number(target.dataset.step));
  };
  ui.table.addEventListener("click", jump);
  ui.ribbon.addEventListener("click", jump);

  bindQuiz(id);
}

/* ---------- quiz */

const QUIZ_WORDS = ["ATTACK", "SECRET", "PLANET", "BRIDGE", "GARDEN", "SIGNAL", "FOREST", "ROCKET"];
const QUIZ_SEEDS = ["KEY", "SUN", "ICE", "SKY", "MOON"];
const QUIZ_KEYWORDS = ["ZEBRA", "MANGO", "CASTLE", "PHUKET", "KEYWORD", "CHIANGMAI"];

function makeQuestion(method) {
  const letter = (i) => ALPHABET[mod26(i)];
  if (method === "autokey") {
    const word = pick(QUIZ_WORDS);
    const seed = pick(QUIZ_SEEDS);
    const position = randInt(seed.length + 1, word.length);
    const fullKey = (seed + word).slice(0, word.length);
    const answer = fullKey[position - 1];
    return {
      question: `ข้อความ <b>${word}</b> คีย์เริ่มต้น <b>${seed}</b> — ตัวอักษรตัวที่ ${position} (${word[position - 1]}) ใช้คีย์ตัวใด?`,
      answer,
      distractors: [seed[(position - 1) % seed.length], word[position - 1], word[position - seed.length] || "A"],
      explain: `แถวคีย์ = ${seed} + ข้อความ = <b>${fullKey}</b> ตัวที่ ${position} คือ <b>${answer}</b> (มาจากข้อความตัวที่ ${position - seed.length}) — ถ้าตอบ ${seed[(position - 1) % seed.length]} แปลว่าวนคีย์ซ้ำแบบ Vigenère`,
    };
  }
  if (method === "general") {
    const keyword = pick(QUIZ_KEYWORDS);
    const sub = substitutionAlphabet(keyword);
    const grid = keywordGrid(keyword);
    const rowRead = grid.rows.flat().join("");
    const p = randInt(0, 25);
    const answer = sub[p];
    return {
      question: `คีย์เวิร์ด <b>${keyword}</b> — ตัวอักษร <b>${ALPHABET[p]}</b> จะถูกแทนด้วยตัวใด? <small>(ลองสร้างตารางในกระดาษก่อน)</small>`,
      answer,
      distractors: [ALPHABET[sub.indexOf(ALPHABET[p])], rowRead[p], ALPHABET[p]],
      explain: `ตัดตัวซ้ำได้ ${grid.unique.join("")} → อ่านลงทีละคอลัมน์ได้ชุดใหม่ <b class="mono">${sub}</b> ตำแหน่งที่ ${p} (${ALPHABET[p]}) ตรงกับ <b>${answer}</b> — ระวัง: ต้องอ่าน<b>ลงทีละคอลัมน์</b> ไม่ใช่อ่านตามแถว`,
    };
  }
  const p = randInt(0, 25);
  const k = randInt(1, 25);
  if (method === "caesar") {
    const raw = p + k;
    return {
      question: `เลื่อน ${k} ช่อง (คีย์ ${ALPHABET[k]}) — ตัวอักษร <b>${ALPHABET[p]}</b> จะกลายเป็นตัวใด?`,
      answer: letter(raw),
      distractors: [letter(p - k), letter(raw + 1), letter(raw - 1)],
      explain: `${ALPHABET[p]} (${p}) + ${k} = ${raw}${raw > 25 ? ` → ${raw} − 26 = ${mod26(raw)}` : ""} → <b>${letter(raw)}</b>`,
    };
  }
  if (method === "vigenere") {
    const raw = p + k;
    return {
      question: `ข้อความ <b>${ALPHABET[p]}</b> กับคีย์ <b>${ALPHABET[k]}</b> เข้ารหัสด้วย Vigenère ได้ตัวใด?`,
      answer: letter(raw),
      distractors: [letter(p - k), letter(k - p), letter(raw + 1)],
      explain: `${ALPHABET[p]} (${p}) + ${ALPHABET[k]} (${k}) = ${raw}${raw > 25 ? ` → ${raw} − 26 = ${mod26(raw)}` : ""} → <b>${letter(raw)}</b>`,
    };
  }
  const raw = k - p;
  return {
    question: `ข้อความ <b>${ALPHABET[p]}</b> กับคีย์ <b>${ALPHABET[k]}</b> เข้ารหัสด้วย Beaufort ได้ตัวใด?`,
    answer: letter(raw),
    distractors: [letter(p - k), letter(p + k), letter(raw + 1)],
    explain: `${ALPHABET[k]} (${k}) − ${ALPHABET[p]} (${p}) = ${num(raw)}${raw < 0 ? ` → ${num(raw)} + 26 = ${mod26(raw)}` : ""} → <b>${letter(raw)}</b> — ต้องเป็น คีย์ − ข้อความ เสมอ`,
  };
}

function renderQuiz(method) {
  const q = makeQuestion(method);
  const options = new Set([q.answer]);
  for (const d of q.distractors) if (options.size < 4) options.add(d);
  while (options.size < 4) options.add(ALPHABET[randInt(0, 25)]);
  quiz.current = q;
  ui.quizQuestion.innerHTML = q.question;
  ui.quizOptions.innerHTML = shuffle([...options]).map((o) => `<button type="button" class="quiz-option" data-answer="${o}">${o}</button>`).join("");
  ui.quizFeedback.innerHTML = "";
  ui.quizFeedback.className = "quiz-feedback";
  ui.quizScore.textContent = quiz.total ? `ตอบถูก ${quiz.correct} / ${quiz.total}` : "เลือกคำตอบที่ถูกต้อง";
}

function bindQuiz(method) {
  Object.assign(ui, {
    quizQuestion: ui.content.querySelector("#quizQuestion"),
    quizOptions: ui.content.querySelector("#quizOptions"),
    quizFeedback: ui.content.querySelector("#quizFeedback"),
    quizScore: ui.content.querySelector("#quizScore"),
  });
  ui.quizOptions.addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (!button || ui.quizOptions.dataset.done === "1") return;
    ui.quizOptions.dataset.done = "1";
    const right = button.dataset.answer === quiz.current.answer;
    quiz.total += 1;
    if (right) quiz.correct += 1;
    ui.quizOptions.querySelectorAll(".quiz-option").forEach((b) => {
      b.disabled = true;
      if (b.dataset.answer === quiz.current.answer) b.classList.add("is-right");
    });
    if (!right) button.classList.add("is-wrong");
    ui.quizFeedback.className = `quiz-feedback ${right ? "good" : "bad"}`;
    ui.quizFeedback.innerHTML = `<b>${right ? "✓ ถูกต้อง!" : `✗ ยังไม่ใช่ คำตอบคือ ${quiz.current.answer}`}</b><p>${quiz.current.explain}</p>`;
    ui.quizScore.textContent = `ตอบถูก ${quiz.correct} / ${quiz.total}`;
  });
  ui.content.querySelector("#quizNext").addEventListener("click", () => {
    ui.quizOptions.dataset.done = "";
    renderQuiz(method);
  });
  renderQuiz(method);
}

/* ------------------------------------------------------------------ public */

function renderTabs(active) {
  ui.tabs.innerHTML = TAB_ORDER.map((id) => {
    const t = TABS[id];
    const current = id === active;
    return `<a class="learn-tab${current ? " is-active" : ""}${CIPHER_ORDER.includes(id) ? "" : " is-extra"}" href="#learn/${id}"${current ? ' aria-current="page"' : ""}>
      <span class="learn-tab-icon">${t.icon}</span><span class="learn-tab-name">${t.name}</span><span class="learn-tab-caption">${t.caption}</span></a>`;
  }).join("");
  ui.tabs.querySelector(".is-active")?.scrollIntoView({ block: "nearest", inline: "center" });
}

export function initLearn(options = {}) {
  onOpenEncryptor = options.onOpenEncryptor || onOpenEncryptor;
  ui.tabs = document.querySelector("#learnTabs");
  ui.content = document.querySelector("#learnContent");
}

export function showLearn(tab = "basics", { scrollToTabs = false } = {}) {
  const id = TABS[tab] ? tab : "basics";
  stopPlay();
  renderTabs(id);
  if (id !== currentTab) {
    currentTab = id;
    if (id === "basics") ui.content.innerHTML = basicsHTML();
    else if (id === "compare") {
      ui.content.innerHTML = compareHTML();
      ui.compareInput = ui.content.querySelector("#compareInput");
      ui.compareResults = ui.content.querySelector("#compareResults");
      ui.compareInput.addEventListener("input", renderCompareResults);
      renderCompareResults();
    } else {
      ui.content.innerHTML = cipherHTML(id);
      bindLesson(id);
    }
  }
  if (scrollToTabs && ui.tabs.getBoundingClientRect().top < 0) {
    ui.tabs.scrollIntoView({ block: "start" });
  }
}

export function leaveLearn() {
  stopPlay();
}
