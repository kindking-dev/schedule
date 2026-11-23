const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING VERIFICATION OF SCHEDULE + AITUMAP INTEGRATION ---');

// 1. Check required files
const requiredFiles = [
  'index.html',
  'index.html.bak',
  'manifest.json',
  'sw.js',
  'assets/favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png',
  'config/room-mapping.js',
  'integrations/aitumap/aitumap-data.js',
  'integrations/aitumap/aitumap-viewer.js',
  'integrations/aitumap/aitumap.css',
  'integrations/aitumap/index.html',
  'server.js',
  'start.bat'
];

requiredFiles.forEach(f => {
  assert(fs.existsSync(f), `Missing required file: ${f}`);
  console.log(`[PASS] File exists: ${f}`);
});

// 2. Verify Schedule data in index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Check lessons array
assert(indexHtml.includes('id:"tue1"'), 'Missing tue1');
assert(indexHtml.includes('id:"sat6"'), 'Missing sat6');

// Count lessons
const lessonMatches = indexHtml.match(/\{id:"(tue\d|wed\d|fri\d|sat\d)"/g);
assert.strictEqual(lessonMatches.length, 14, `Expected 14 lessons, found ${lessonMatches ? lessonMatches.length : 0}`);
console.log(`[PASS] Schedule lessons integrity verified: exactly 14 lessons found.`);

// Verify specific classrooms
assert(indexHtml.includes('room:"C1.3.362"'), 'Missing C1.3.362');
assert(indexHtml.includes('room:"C1.2.245L"'), 'Missing C1.2.245L');
assert(indexHtml.includes('room:"Актовый зал"'), 'Missing Актовый зал');
assert(indexHtml.includes('room:"Онлайн"'), 'Missing Онлайн');
console.log(`[PASS] All lesson room data intact.`);

// 3. Test RoomMapping module
const RoomMapping = require('../config/room-mapping.js');

// Test C1.3.362
const r1 = RoomMapping.resolveRoom('C1.3.362');
assert(r1, 'resolveRoom(C1.3.362) returned null');
assert.strictEqual(r1.floor, 3, `Expected floor 3 for C1.3.362, got ${r1.floor}`);
assert.strictEqual(r1.block, 'C1.3', `Expected block C1.3, got ${r1.block}`);
assert.strictEqual(r1.roomId, 'C1.3.362P', `Expected SVG node C1.3.362P, got ${r1.roomId}`);
console.log(`[PASS] Room mapping: C1.3.362 -> Floor 3, Block C1.3, Node C1.3.362P`);

// Test C1.2.245L
const r2 = RoomMapping.resolveRoom('C1.2.245L');
assert(r2, 'resolveRoom(C1.2.245L) returned null');
assert.strictEqual(r2.floor, 2, `Expected floor 2 for C1.2.245L, got ${r2.floor}`);
assert.strictEqual(r2.block, 'C1.2', `Expected block C1.2, got ${r2.block}`);
assert.strictEqual(r2.roomId, 'C1.2.245', `Expected SVG node C1.2.245, got ${r2.roomId}`);
console.log(`[PASS] Room mapping: C1.2.245L -> Floor 2, Block C1.2, Node C1.2.245`);

// Test Актовый зал
const r3 = RoomMapping.resolveRoom('Актовый зал');
assert(r3, 'resolveRoom(Актовый зал) returned null');
assert.strictEqual(r3.floor, 1, `Expected floor 1 for Актовый зал, got ${r3.floor}`);
assert.strictEqual(r3.block, 'C1.1', `Expected block C1.1, got ${r3.block}`);
assert.strictEqual(r3.roomId, 'ASSEMBLYHALL', `Expected SVG node ASSEMBLYHALL, got ${r3.roomId}`);
console.log(`[PASS] Room mapping: Актовый зал -> Floor 1, Block C1.1, Node ASSEMBLYHALL`);

// Test Online
const rOnline = RoomMapping.resolveRoom('Онлайн');
assert(rOnline.isOnline, 'Expected isOnline: true for Онлайн');
console.log(`[PASS] Room mapping: Онлайн correctly recognized as online without room mapping.`);

// 4. Verify vector SVG nodes in aitumap-data.js
const mapDataContent = fs.readFileSync('integrations/aitumap/aitumap-data.js', 'utf8');

assert(mapDataContent.includes('id=\\"C1.3.362P\\"'), 'C1.3.362P SVG node missing in aitumap-data.js');
assert(mapDataContent.includes('id=\\"C1.2.245\\"'), 'C1.2.245 SVG node missing in aitumap-data.js');
assert(mapDataContent.includes('id=\\"ASSEMBLYHALL\\"'), 'ASSEMBLYHALL SVG node missing in aitumap-data.js');
console.log(`[PASS] All 3 SVG graphical nodes confirmed present in AITUMAP vector data.`);

// 5. Verify UI elements in index.html
assert(indexHtml.includes('id="mapBackdrop"'), 'Missing mapBackdrop');
assert(indexHtml.includes('id="scheduleMapMount"'), 'Missing scheduleMapMount');
assert(indexHtml.includes('class="room-badge-interactive"'), 'Missing room-badge-interactive in lesson card');
assert(indexHtml.includes('class="room-map-link"'), 'Missing room-map-link badge');
assert(indexHtml.includes('data-open-map'), 'Missing data-open-map trigger');
assert(indexHtml.includes('closeMapModal'), 'Missing closeMapModal handler');
assert(indexHtml.includes('Escape'), 'Missing Escape key handler');
console.log(`[PASS] All UI modal, card triggers, and accessibility handlers present in index.html.`);

console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');

