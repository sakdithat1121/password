import test from "node:test";
import assert from "node:assert/strict";
import { encrypt, normalizeKey, substitutionAlphabet } from "../cipher-core.mjs";

test("Caesar matches the Excel example with key D (+3)", () => {
  assert.equal(encrypt("icameisaw", "caesar", { shift: 3 }).output, "lfdphlvdz");
});

test("Vigenere matches the Excel example with key CIPHER", () => {
  assert.equal(encrypt("cybersecurity", "vigenere", { key: "cipher" }).output, "egqlvjgkjymka");
});

test("Autokey continues with plaintext after the seed key", () => {
  assert.equal(encrypt("defendthewall", "autokey", { key: "night" }).output, "qmllggxmijdes");
});

test("General substitution matches the Excel keyword-column mapping", () => {
  assert.equal(substitutionAlphabet("bangkok"), "BCJSYADLTZNEMUGFPVKHQWOIRX");
  assert.equal(encrypt("thaiperson", "general", { key: "bangkok" }).output, "hlbtfyvkgu");
});

test("Beaufort matches the Excel example with repeating key FINE", () => {
  assert.equal(encrypt("sendhelpnow", "beaufort", { key: "fine" }).output, "neabyecpsur");
});

test("preserves case, spaces, digits, punctuation, and key alignment", () => {
  assert.equal(encrypt("Cyber Security 2026!", "vigenere", { key: "cipher" }).output, "Egqlv Jgkjymka 2026!");
  assert.equal(encrypt("ไทย AB 42!", "caesar", { shift: 3 }).output, "ไทย DE 42!");
});

test("wraps Caesar shifts and preserves symbols", () => {
  assert.equal(encrypt("Zz!", "caesar", { shift: 3 }).output, "Cc!");
  assert.equal(encrypt("Ab", "caesar", { shift: 29 }).output, "De");
});

test("normalizes keys to A-Z and requires keys for keyed ciphers", () => {
  assert.equal(normalizeKey(" C1i-PHËR "), "CIPHR");
  assert.equal(encrypt("a", "vigenere", { key: "CIPHER-2026" }).output, "c");
  assert.throws(() => encrypt("hello", "vigenere", { key: " 123 " }), /requires an A–Z key/);
});

test("rejects unknown methods and invalid text types", () => {
  assert.throws(() => encrypt("hello", "rot13"), /Unknown cipher method/);
  assert.throws(() => encrypt(42, "caesar"), /Text must be a string/);
});

import { decrypt, explain, METHODS } from "../cipher-core.mjs";

const EXAMPLES = [
  ["icameisaw", "caesar", { shift: 3 }],
  ["cybersecurity", "vigenere", { key: "cipher" }],
  ["defendthewall", "autokey", { key: "night" }],
  ["thaiperson", "general", { key: "bangkok" }],
  ["sendhelpnow", "beaufort", { key: "fine" }],
];

test("explain() gives the same output as encrypt() for every Excel example", () => {
  for (const [text, method, options] of EXAMPLES) {
    assert.equal(explain(text, method, options).output, encrypt(text, method, options).output, method);
  }
});

test("decrypt() reverses every method, keeping case and symbols", () => {
  const text = "Defend the East Wall, 2026!";
  for (const method of METHODS) {
    const options = { key: "Bangkok", shift: 7 };
    const secret = encrypt(text, method, options).output;
    assert.equal(decrypt(secret, method, options), text, method);
  }
});

test("explain() records the arithmetic behind each letter", () => {
  const [first] = explain("S", "beaufort", { key: "F" }).steps;
  assert.deepEqual(
    { input: first.input, inputIndex: first.inputIndex, keyIndex: first.keyIndex, raw: first.raw, result: first.result, output: first.output },
    { input: "S", inputIndex: 18, keyIndex: 5, raw: -13, result: 13, output: "N" },
  );
  const caesar = explain("X", "caesar", { shift: 3 }).steps[0];
  assert.equal(caesar.raw, 26);
  assert.equal(caesar.output, "A");
});

test("autokey key stream switches from the seed to the plaintext", () => {
  const steps = explain("defendthewall", "autokey", { key: "night" }).steps;
  assert.equal(steps.map((step) => step.keyLetter).join(""), "NIGHTDEFENDTH");
  assert.equal(steps[4].keySource, "key");
  assert.equal(steps[5].keySource, "text");
  assert.equal(steps[5].keySourceIndex, 0);
  const back = explain("qmllggxmijdes", "autokey", { key: "night" }, "decrypt");
  assert.equal(back.output, "defendthewall");
  assert.equal(back.steps.map((step) => step.keyLetter).join(""), "NIGHTDEFENDTH");
});

test("Beaufort is its own inverse", () => {
  assert.equal(encrypt("neabyecpsur", "beaufort", { key: "fine" }).output, "sendhelpnow");
});
