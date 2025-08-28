const sg = require('./src/scenarioGenerator.helpers.js');
console.log('sanitize("נשק", []) =>', sg.sanitizeWeaponName('נשק', []));
console.log('sanitize("weapon", ["blood"]) =>', sg.sanitizeWeaponName('weapon', ['blood']));
console.log('sanitize("weapon", []) =>', sg.sanitizeWeaponName('weapon', []));
console.log('sanitize("Garden Sickle", []) =>', sg.sanitizeWeaponName('Garden Sickle', []));
