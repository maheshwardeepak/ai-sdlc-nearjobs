const fs = require('fs');

const text = fs.readFileSync(0, 'utf8');

const patterns = {
  missingModule: /Cannot find module/g,
  zodMismatch: /ZodError|z\.record/g,
  implicitAny: /implicitly has an 'any' type/g,
  routerTyping: /cannot be named without a reference/g,
  jestMismatch: /Cannot find name 'jest'/g
};

const summary = {};

for (const [key, regex] of Object.entries(patterns)) {
  summary[key] = (text.match(regex) || []).length;
}

console.log(JSON.stringify(summary, null, 2));
