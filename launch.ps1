$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "ต้องติดตั้ง Node.js ก่อนจึงจะเปิดเว็บแอปได้"
}

Write-Host "Cipher Lab กำลังทำงานที่ http://127.0.0.1:4173"
Write-Host "เปิดลิงก์นี้ในเบราว์เซอร์ แล้วใช้ปุ่ม ติดตั้งแอป เพื่อติดตั้งเป็น PWA"
Write-Host "กด Ctrl+C ในหน้าต่างนี้เพื่อหยุดเว็บเซิร์ฟเวอร์"
node server.mjs --host 127.0.0.1 --port 4173
