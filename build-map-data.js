const fs = require('fs');
const path = require('path');

function cleanJsx(code) {
  return code
    .replace(/className=/g, 'class=')
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeMiterlimit=/g, 'stroke-miterlimit=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/strokeDasharray=/g, 'stroke-dasharray=')
    .replace(/stopColor=/g, 'stop-color=')
    .replace(/stopOpacity=/g, 'stop-opacity=')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

// Read Wallpaper
const wallpaperRaw = fs.readFileSync('aitumap-repo/src/shared/ui/general/map/Wallpaper.jsx', 'utf8');
const wallpaperMatch = wallpaperRaw.match(/<g id="WALLPAPER">[\s\S]*?<\/g>/);
const wallpaper = cleanJsx(wallpaperMatch[0]);

// Read IconsCommon
const iconsCommonRaw = fs.readFileSync('aitumap-repo/src/shared/ui/general/map/IconsCommon.jsx', 'utf8');
const iconsCommonMatch = iconsCommonRaw.match(/<g id="ICONS_COMMON">[\s\S]*?<\/g>/);
const iconsCommon = cleanJsx(iconsCommonMatch[0]);

// Read Stairs
const stairsRaw = fs.readFileSync('aitumap-repo/src/shared/ui/general/map/Stairs.jsx', 'utf8');
const fillStairsMatch = stairsRaw.match(/const FillStairs = \(\) => \{[\s\S]*?return \([\s\S]*?<>([\s\S]*?)<\/>/);
const defaultStairsMatch = stairsRaw.match(/const DefaultStairs = \(\) => \{[\s\S]*?return \([\s\S]*?<>([\s\S]*?)<\/>/);

const stairsFirst = cleanJsx('<g id="STAIRS">' + (fillStairsMatch ? fillStairsMatch[1] : '') + '</g>');
const stairsOther = cleanJsx('<g id="STAIRS">' + (defaultStairsMatch ? defaultStairsMatch[1] : '') + '</g>');

// Read Escapes
const escapes12Raw = fs.readFileSync('aitumap-repo/src/shared/ui/general/map/IconsEscapesFirstSecond.jsx', 'utf8');
const escapes12Match = escapes12Raw.match(/<g id="ICONS_ESCAPE_FIRST_SECOND">[\s\S]*?<\/g>/);
const escapes12 = cleanJsx(escapes12Match[0]);

const escapes23Raw = fs.readFileSync('aitumap-repo/src/shared/ui/general/map/IconsEscapesSecondThird.jsx', 'utf8');
const escapes23Match = escapes23Raw.match(/<g id="ICONS_ESCAPES_SECOND_THIRD">[\s\S]*?<\/g>/);
const escapes23 = cleanJsx(escapes23Match ? escapes23Match[0] : '');

// Read Floors
function extractFloor(file, floorId) {
  const raw = fs.readFileSync(file, 'utf8');
  const startTag = '<g id="' + floorId + '">';
  const startIdx = raw.indexOf(startTag);
  if (startIdx === -1) {
    throw new Error('Could not find ' + startTag + ' in ' + file);
  }
  const endIdx = raw.indexOf('</MapLayout>', startIdx);
  const slice = raw.slice(startIdx, endIdx);
  
  // Find where helper components start (<Stairs or <Icons)
  let cutIdx = slice.indexOf('<Stairs');
  if (cutIdx === -1) cutIdx = slice.indexOf('<Icons');
  if (cutIdx !== -1) {
    return cleanJsx(slice.slice(0, cutIdx).trim());
  }
  return cleanJsx(slice.trim());
}

const floor1 = extractFloor('aitumap-repo/src/shared/ui/others/C1_ALL_1.jsx', 'FIRST_FLOOR');
const floor2 = extractFloor('aitumap-repo/src/shared/ui/others/C1_ALL_2.jsx', 'SECOND_FLOOR');
const floor3 = extractFloor('aitumap-repo/src/shared/ui/others/C1_ALL_3.jsx', 'THIRD_FLOOR');

console.log('Floor 1 length:', floor1.length);
console.log('Floor 2 length:', floor2.length);
console.log('Floor 3 length:', floor3.length);

console.log('Floor 1 has ASSEMBLYHALL?', floor1.includes('ASSEMBLYHALL'));
console.log('Floor 2 has C1.2.245?', floor2.includes('C1.2.245'));
console.log('Floor 3 has C1.3.362P?', floor3.includes('C1.3.362P'));

// Output directory
fs.mkdirSync('integrations/aitumap', { recursive: true });

// Assemble complete SVG for each floor
function makeFloorSvg(floorBody, stairs, escapes) {
  return `<svg class="aitumap-svg" viewBox="0 0 924.69 396.16" xmlns="http://www.w3.org/2000/svg">
  ${wallpaper}
  ${floorBody}
  ${stairs}
  ${escapes}
  ${iconsCommon}
</svg>`;
}

// Ensure rooms with data-name like ASSEMBLYHALL also have id
function ensureIds(svg) {
  return svg.replace(/<g\s+data-name="([^"]+)"(?![^>]*\bid=)/g, (match, dataName) => {
    const primaryId = dataName.split('|')[0];
    return `<g id="${primaryId}" data-name="${dataName}"`;
  });
}

const fullFloor1 = ensureIds(makeFloorSvg(floor1, stairsFirst, escapes12));
const fullFloor2 = ensureIds(makeFloorSvg(floor2, stairsOther, escapes12));
const fullFloor3 = ensureIds(makeFloorSvg(floor3, stairsOther, escapes23));

const mapDataContent = `// Astana IT University Interactive Map - Extracted Vector Data from AITUMAP
// Source: https://github.com/Yuujiso/aitumap
window.AITUMAP_DATA = {
  viewBox: "0 0 924.69 396.16",
  floors: {
    1: {
      id: "first",
      name: "1 этаж",
      svg: ${JSON.stringify(fullFloor1)}
    },
    2: {
      id: "second",
      name: "2 этаж",
      svg: ${JSON.stringify(fullFloor2)}
    },
    3: {
      id: "third",
      name: "3 этаж",
      svg: ${JSON.stringify(fullFloor3)}
    }
  }
};
`;

fs.writeFileSync('integrations/aitumap/aitumap-data.js', mapDataContent, 'utf8');
console.log('Successfully wrote integrations/aitumap/aitumap-data.js');
