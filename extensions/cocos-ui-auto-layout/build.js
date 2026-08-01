/**
 * Compile helper — runs tsc and copies static panel files to dist/
 * Run: node build.js
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

console.log('📦 Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript compiled successfully.\n');
} catch (e) {
  console.error('❌ TypeScript compilation failed.');
  process.exit(1);
}

// Copy static panel files to dist/panel/
const staticSrc  = path.join(__dirname, 'static', 'panel');
const staticDest = path.join(__dirname, 'dist',   'panel');

if (!fs.existsSync(staticDest)) fs.mkdirSync(staticDest, { recursive: true });

for (const file of fs.readdirSync(staticSrc)) {
  fs.copyFileSync(path.join(staticSrc, file), path.join(staticDest, file));
  console.log(`  Copied: static/panel/${file} → dist/panel/${file}`);
}

// Copy static folder (icons etc) to dist/static
const iconSrc  = path.join(__dirname, 'static');
const iconDest = path.join(__dirname, 'dist');
for (const file of fs.readdirSync(iconSrc)) {
  if (fs.statSync(path.join(iconSrc, file)).isFile()) {
    fs.copyFileSync(path.join(iconSrc, file), path.join(iconDest, file));
  }
}

console.log('\n🚀 Build complete! You can now load the extension in Cocos Creator.');
console.log('   Copy the entire folder to your project\'s extensions/ directory.');
