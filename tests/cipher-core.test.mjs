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
