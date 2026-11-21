const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en.ts');
const hiPath = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'hi.ts');
const bnPath = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'bn.ts');

let en = fs.readFileSync(enPath, 'utf8');
let hi = fs.readFileSync(hiPath, 'utf8');
let bn = fs.readFileSync(bnPath, 'utf8');

// Add to en
if (!en.includes('forgotPassword:')) {
  en = en.replace('forgotPasswordLink:', "forgotPassword: 'Forgot PIN or Password?',\n      forgotPasswordLink:");
}
if (!en.includes('noAccountPrompt:')) {
  en = en.replace('noAccount:', "noAccountPrompt: \"Don't have an account?\",\n      createAccountLink: 'Sign up here',\n      noAccount:");
}
if (!en.includes('minutesUnit:')) {
  en = en.replace('periodWeek:', "minutesUnit: 'min',\n    periodWeek:");
}
fs.writeFileSync(enPath, en, 'utf8');

// Add to hi
if (!hi.includes('forgotPassword:')) {
  hi = hi.replace('forgotPasswordLink:', "forgotPassword: 'पिन या पासवर्ड भूल गए?',\n      forgotPasswordLink:");
}
if (!hi.includes('noAccountPrompt:')) {
  hi = hi.replace('noAccount:', "noAccountPrompt: 'क्या आपका खाता नहीं है?',\n      createAccountLink: 'यहाँ नया खाता बनाएँ',\n      noAccount:");
}
fs.writeFileSync(hiPath, hi, 'utf8');

// Add to bn
if (!bn.includes('forgotPassword:')) {
  bn = bn.replace('forgotPasswordLink:', "forgotPassword: 'পিন বা পাসওয়ার্ড ভুলে গেছেন?',\n      forgotPasswordLink:");
}
if (!bn.includes('noAccountPrompt:')) {
  bn = bn.replace('noAccount:', "noAccountPrompt: 'কোন অ্যাকাউন্ট নেই?',\n      createAccountLink: 'এখানে নিবন্ধন করুন',\n      noAccount:");
}
if (!bn.includes('minutesUnit:')) {
  bn = bn.replace('periodWeek:', "minutesUnit: 'মিনিট',\n    periodWeek:");
}
fs.writeFileSync(bnPath, bn, 'utf8');

console.log('✓ Synced remaining 4 keys to en, hi, bn');
