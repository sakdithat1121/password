import { ALPHABET, encrypt, normalizeKey } from "./cipher-core.mjs";
import { initLearn, leaveLearn, showLearn } from "./learn.js";

const METHODS = {
  caesar: { name: "Caesar", defaultKey: "D", label: "จำนวนตัวอักษรที่เลื่อน" },
  vigenere: { name: "Vigenère", defaultKey: "CIPHER", label: "คำกุญแจ" },
  autokey: { name: "Autokey", defaultKey: "NIGHT", label: "คีย์เริ่มต้น" },
  general: { name: "General substitution", short: "General", defaultKey: "BANGKOK", label: "คีย์เวิร์ด" },
  beaufort: { name: "Beaufort", defaultKey: "FINE", label: "คำกุญแจ" },
};

const els = {
  plainText: document.querySelector("#plainText"),
  methodGrid: document.querySelector("#methodGrid"),
  keyBox: document.querySelector("#keyBox"),
  keyInput: document.querySelector("#keyInput"),
  keyLabel: document.querySelector("#keyLabel"),
  keyHint: document.querySelector("#keyHint"),
  keyChip: document.querySelector("#keyChip"),
  shiftBox: document.querySelector("#shiftBox"),
  shiftInput: document.querySelector("#shiftInput"),
  shiftChip: document.querySelector("#shiftChip"),
  output: document.querySelector("#cipherOutput"),
  resultMethod: document.querySelector("#resultMethod"),
  tableBody: document.querySelector("#tableBody"),
  charCount: document.querySelector("#charCount"),
  letterCount: document.querySelector("#letterCount"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  clearButton: document.querySelector("#clearButton"),
  sampleButton: document.querySelector("#sampleButton"),
  installButton: document.querySelector("#installButton"),
  installButtonText: document.querySelector("#installButtonText"),
  installDialog: document.querySelector("#installDialog"),
  installSteps: document.querySelector("#installSteps"),
  toast: document.querySelector("#toast"),
  encryptView: document.querySelector("#encryptView"),
  learnView: document.querySelector("#learnView"),
  viewLinks: document.querySelectorAll("[data-view-link]"),
};

let selectedMethod = "vigenere";
let currentResult = { output: "", rows: [], method: selectedMethod, key: "CIPHER" };
let deferredInstallPrompt = null;
let toastTimer;

function setMethod(method) {
  selectedMethod = method;
  document.querySelectorAll(".method-card").forEach((button) => {
    const selected = button.dataset.method === method;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const details = METHODS[method];
  const caesar = method === "caesar";
  els.keyBox.classList.toggle("is-hidden", caesar);
  els.shiftBox.classList.toggle("is-hidden", !caesar);
  if (!caesar) {
    els.keyLabel.textContent = details.label;
    els.keyInput.value = details.defaultKey;
    els.keyChip.textContent = normalizeKey(els.keyInput.value) || "A–Z";
    els.keyHint.textContent = method === "general"
      ? "เติมคีย์เวิร์ดที่ตัดอักษรซ้ำลงตาราง แล้วอ่านอักษรจากบนลงล่างทีละคอลัมน์"
      : method === "autokey"
        ? "เมื่อใช้คีย์เริ่มต้นครบแล้ว จะต่อคีย์ด้วยข้อความต้นฉบับ"
        : "ใช้เฉพาะตัวอักษร A–Z; คีย์จะวนซ้ำไปตามตัวอักษรที่เข้ารหัส";
  }
  render();
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderTable(rows, emptyMessage = "พิมพ์ข้อความเพื่อดูรายละเอียดทีละตัวอักษร") {
  const fragment = document.createDocumentFragment();
  let encryptedIndex = 0;
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.encrypted) encryptedIndex += 1;
    tr.append(
      createCell(row.encrypted ? String(encryptedIndex).padStart(2, "0") : "—", "index-cell"),
      createCell(row.plain, "char-cell"),
      createCell(row.position, "index-cell"),
      createCell(row.key, "key-cell"),
      createCell(row.cipher, row.encrypted ? "cipher-cell" : "index-cell"),
    );
    const formulaCell = document.createElement("td");
    const formula = document.createElement("span");
    formula.className = "formula-chip";
    formula.textContent = row.formula;
    formulaCell.append(formula);
    tr.append(formulaCell);
    fragment.append(tr);
  }
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    const td = document.createElement("td");
    td.colSpan = 6;
    const mark = document.createElement("span");
    mark.className = "empty-mark";
    mark.textContent = "✳";
    td.append(mark, document.createTextNode(` ${emptyMessage}`));
    tr.append(td);
    fragment.append(tr);
  }
  els.tableBody.replaceChildren(fragment);
}

function render() {
  const text = els.plainText.value;
  const method = METHODS[selectedMethod];
  const keyValue = selectedMethod === "caesar" ? "" : els.keyInput.value;
  const normalizedKey = selectedMethod === "caesar" ? "" : normalizeKey(keyValue);
  const validKey = selectedMethod === "caesar" || normalizedKey.length > 0;
  const result = validKey
    ? encrypt(text, selectedMethod, { key: keyValue, shift: els.shiftInput.value })
    : { output: "", rows: [], method: selectedMethod, key: "" };

  if (selectedMethod !== "caesar") {
    const normalized = normalizeKey(els.keyInput.value);
    els.keyChip.textContent = normalized || "ใส่คีย์";
    const invalidKey = Boolean(text) && !normalized;
    els.keyBox.classList.toggle("has-error", invalidKey);
    els.keyInput.setAttribute("aria-invalid", String(invalidKey));
    if (invalidKey) els.keyHint.textContent = "ใส่ตัวอักษร A–Z อย่างน้อยหนึ่งตัวเพื่อเริ่มเข้ารหัส";
  }
  els.shiftChip.textContent = `${ALPHABET[Number(els.shiftInput.value)]} · +${els.shiftInput.value}`;
  els.charCount.textContent = `${[...text].length.toLocaleString("th-TH")} ตัวอักษร`;
  const encryptedCount = [...text].filter((character) => /[A-Za-z]/.test(character)).length;
  els.letterCount.textContent = String(encryptedCount).padStart(2, "0");
  els.resultMethod.textContent = selectedMethod === "caesar"
    ? `${method.name} · ${result.key}`
    : `${method.short || method.name} · ${normalizedKey || "ใส่คีย์"}`;

  if (!text || !validKey) {
    els.output.textContent = "";
    const placeholder = document.createElement("span");
    placeholder.className = "output-placeholder";
    placeholder.textContent = !text ? "กำลังรอข้อความของคุณ" : "ใส่คีย์ A–Z เพื่อเริ่มเข้ารหัส";
    const cursor = document.createElement("span");
    cursor.className = "cursor-dot";
    placeholder.append(cursor);
    els.output.append(placeholder);
  } else {
    els.output.textContent = result.output;
  }

  els.copyButton.disabled = !text || !validKey;
  els.downloadButton.disabled = !text || !validKey;
  renderTable(
    text && validKey ? result.rows : [],
    !text ? "พิมพ์ข้อความเพื่อดูรายละเอียดทีละตัวอักษร" : "ใส่คีย์ A–Z เพื่อดูตารางการเข้ารหัส",
  );
  currentResult = result;
}

function notify(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2300);
}

async function copyResult() {
  if (!currentResult.output) return;
  try {
    await navigator.clipboard.writeText(currentResult.output);
    notify("คัดลอกผลลัพธ์แล้ว");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = currentResult.output;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.append(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    notify("คัดลอกผลลัพธ์แล้ว");
  }
}

function csvValue(value) {
  const raw = String(value);
  const safe = /^[\t\r\n ]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv() {
  if (!currentResult.rows.length) return;
  const methodName = METHODS[currentResult.method].name;
  const rows = [["ลำดับ", "ต้นฉบับ", "ตำแหน่ง A-Z", "คีย์ / ตัวแทน", "ผลลัพธ์", "วิธีคำนวณ"]];
  let encryptedIndex = 0;
  currentResult.rows.forEach((row) => {
    if (row.encrypted) encryptedIndex += 1;
    rows.push([row.encrypted ? encryptedIndex : "", row.plain, row.position, row.key, row.cipher, row.formula]);
  });
  const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cipher-${currentResult.method}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`ดาวน์โหลดตาราง ${methodName} แล้ว`);
}

function showInstallGuide() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) {
    els.installSteps.innerHTML = "<p>✓ ติดตั้ง Cipher Lab บนอุปกรณ์นี้แล้ว</p><p>เปิดใช้งานได้จากหน้าจอหลักหรือรายการแอป</p>";
  } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    els.installSteps.innerHTML = "<p><b>iPhone / iPad</b></p><p>1. เปิดหน้านี้ใน Safari</p><p>2. แตะปุ่มแชร์ แล้วเลือก <b>เพิ่มไปยังหน้าจอโฮม</b></p>";
  } else if (/android/i.test(navigator.userAgent)) {
    els.installSteps.innerHTML = "<p><b>Android</b></p><p>1. เปิดหน้านี้ใน Chrome</p><p>2. แตะเมนู ⋮ แล้วเลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></p>";
  } else {
    els.installSteps.innerHTML = "<p><b>คอมพิวเตอร์</b></p><p>เปิดหน้านี้ใน Chrome หรือ Edge แล้วกดไอคอนติดตั้งในแถบที่อยู่ หรือเลือก <b>ติดตั้ง Cipher Lab</b> จากเมนูเบราว์เซอร์</p>";
  }
  if (typeof els.installDialog.showModal === "function") els.installDialog.showModal();
}

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice?.outcome === "accepted") notify("เริ่มติดตั้ง Cipher Lab แล้ว");
    return;
  }
  showInstallGuide();
}

els.methodGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-method]");
  if (button) setMethod(button.dataset.method);
});
els.plainText.addEventListener("input", render);
els.keyInput.addEventListener("input", render);
els.shiftInput.addEventListener("input", render);
els.copyButton.addEventListener("click", copyResult);
els.downloadButton.addEventListener("click", downloadCsv);
els.installButton.addEventListener("click", installApp);
els.clearButton.addEventListener("click", () => {
  els.plainText.value = "";
  els.plainText.focus();
  render();
});
els.sampleButton.addEventListener("click", () => {
  setMethod("vigenere");
  els.plainText.value = "cybersecurity";
  els.plainText.focus();
  render();
  notify("โหลดตัวอย่างจากตาราง Vigenère แล้ว");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installButtonText.textContent = "ติดตั้งแอป";
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  els.installButtonText.textContent = "ติดตั้งแล้ว";
  notify("ติดตั้ง Cipher Lab แล้ว");
});

if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) {
  els.installButtonText.textContent = "ติดตั้งแล้ว";
}

// Views: #encrypt (default), #learn, #learn/<topic>
let currentView = null;
function route() {
  const [view, topic] = location.hash.replace(/^#/, "").split("/");
  const next = view === "learn" ? "learn" : "encrypt";
  const changed = next !== currentView;
  currentView = next;
  els.encryptView.hidden = next !== "encrypt";
  els.learnView.hidden = next !== "learn";
  els.viewLinks.forEach((link) => {
    if (link.dataset.viewLink === next) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = next === "learn" ? "เรียนรู้วิธีคิด — Cipher Lab" : "Cipher Lab — ห้องทดลองเข้ารหัส";
  if (next === "learn") showLearn(topic, { scrollToTabs: !changed });
  else leaveLearn();
  if (changed) window.scrollTo(0, 0);
}

initLearn({
  onOpenEncryptor({ method, text, key, shift }) {
    location.hash = "encrypt";
    setMethod(method);
    if (method === "caesar") els.shiftInput.value = String(shift);
    else els.keyInput.value = key;
    els.plainText.value = text;
    render();
    notify(`เปิดตัวอย่าง ${METHODS[method].name} ในหน้าเข้ารหัสแล้ว`);
  },
});
window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

render();
