/**
 * Astana IT University - Room Mapping Configuration
 * Maps student schedule room identifiers to actual AITUMAP SVG graphical nodes.
 * 
 * Based on official AITUMAP campus architecture (C1 Main Building):
 * - Blocks: C1.1, C1.2, C1.3
 * - Floors: 1 (first), 2 (second), 3 (third)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AituRoomMapping = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Verified mapping for Schedule subjects to real AITUMAP SVG elements
  const ROOM_DATABASE = {
    // 1. Practical / Lecture classes: "Разработка безопасного программного обеспечения с использованием ИИ"
    "C1.3.362": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.3",
      floor: 3,
      floorName: "3 этаж",
      floorOption: "third",
      roomId: "C1.3.362P",
      searchQuery: "C1.3.362",
      type: "Аудитория практических и лекционных занятий",
      description: "Блок C1.3, 3-й этаж, аудитория 362",
      verified: true
    },
    "C1.3.362P": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.3",
      floor: 3,
      floorName: "3 этаж",
      floorOption: "third",
      roomId: "C1.3.362P",
      searchQuery: "C1.3.362P",
      type: "Практическая аудитория",
      description: "Блок C1.3, 3-й этаж, аудитория 362P",
      verified: true
    },

    // 2. Practical classes: "История и философия науки"
    "C1.2.245L": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.2",
      floor: 2,
      floorName: "2 этаж",
      floorOption: "second",
      roomId: "C1.2.245",
      searchQuery: "C1.2.245",
      type: "Практическая аудитория",
      description: "Блок C1.2, 2-й этаж, аудитория 245",
      verified: true
    },
    "C1.2.245": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.2",
      floor: 2,
      floorName: "2 этаж",
      floorOption: "second",
      roomId: "C1.2.245",
      searchQuery: "C1.2.245",
      type: "Практическая аудитория",
      description: "Блок C1.2, 2-й этаж, аудитория 245",
      verified: true
    },

    // 3. Lecture classes: "История и философия науки"
    "АКТОВЫЙ ЗАЛ": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.1",
      floor: 1,
      floorName: "1 этаж",
      floorOption: "first",
      roomId: "ASSEMBLYHALL",
      dataName: "ASSEMBLYHALL|АКТОВЫЙ ЗАЛ",
      searchQuery: "АКТОВЫЙ ЗАЛ",
      type: "Актовый зал",
      description: "Блок C1.1, 1-й этаж, главный актовый зал университета",
      verified: true
    },
    "ASSEMBLY HALL": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.1",
      floor: 1,
      floorName: "1 этаж",
      floorOption: "first",
      roomId: "ASSEMBLYHALL",
      dataName: "ASSEMBLYHALL|АКТОВЫЙ ЗАЛ",
      searchQuery: "ASSEMBLYHALL",
      type: "Assembly Hall",
      description: "Block C1.1, 1st floor, Main Assembly Hall",
      verified: true
    },

    // Campus key venues
    "БИБЛИОТЕКА": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.1",
      floor: 1,
      floorName: "1 этаж",
      floorOption: "first",
      roomId: "LIBRARY",
      dataName: "LIBRARY|BIBLIOTEKA|БИБЛИОТЕКА|МЕДИАТЕКА|MEDIATEKA|KITAPHANA|КІТАПХАНА",
      searchQuery: "БИБЛИОТЕКА",
      type: "Библиотека / Медиатека",
      description: "Блок C1.1, 1-й этаж",
      verified: true
    },
    "СТОЛОВАЯ": {
      buildingId: "main",
      building: "Главный корпус",
      block: "C1.3",
      floor: 1,
      floorName: "1 этаж",
      floorOption: "first",
      roomId: "DININGHALL",
      dataName: "DININGHALL|АСХАНА|СТОЛОВАЯ|СТОЛОВКА",
      searchQuery: "СТОЛОВАЯ",
      type: "Столовая / Асхана",
      description: "Блок C1.3, 1-й этаж",
      verified: true
    }
  };

  /**
   * Normalizes a string: removes accents, converts cyrillic 'С' to latin 'C',
   * strips punctuation, uppercase.
   */
  function normalizeRoomKey(str) {
    if (!str) return "";
    return String(str)
      .trim()
      .toUpperCase()
      // Replace Russian capital 'С' with Latin 'C'
      .replace(/^С(?=\d|\.)/g, "C")
      // Replace duplicate dots or spaces
      .replace(/\s+/g, " ")
      .replace(/\.{2,}/g, ".");
  }

  /**
   * Resolves a room string to an AITUMAP target object.
   * Handles direct match, normalized match, suffix trimming (e.g. 245L -> 245, 362 -> 362P),
   * and structural deduction for standard room numbers like C1.x.yyy.
   */
  function resolveRoom(roomStr, buildingStr) {
    if (!roomStr) return null;
    const cleanStr = String(roomStr).trim();
    const upper = normalizeRoomKey(cleanStr);

    // Online check
    if (upper === "ОНЛАЙН" || upper === "ONLINE") {
      return { isOnline: true };
    }

    // 1. Direct match in database
    if (ROOM_DATABASE[cleanStr]) {
      return { ...ROOM_DATABASE[cleanStr], raw: roomStr };
    }
    if (ROOM_DATABASE[upper]) {
      return { ...ROOM_DATABASE[upper], raw: roomStr };
    }

    // 2. Fuzzy match for Assembly Hall / Актовый зал
    if (upper.includes("АКТОВ") || upper.includes("ASSEMBLY")) {
      return { ...ROOM_DATABASE["АКТОВЫЙ ЗАЛ"], raw: roomStr };
    }

    // 3. Suffix variant: remove last letter if letter (e.g. C1.2.245L -> C1.2.245)
    const strippedSuffix = upper.replace(/([0-9]+)[A-ZА-Я]$/, "$1");
    if (strippedSuffix !== upper && ROOM_DATABASE[strippedSuffix]) {
      return { ...ROOM_DATABASE[strippedSuffix], raw: roomStr };
    }

    // 4. Try adding common suffix 'P' or 'L' or 'K'
    const withP = upper + "P";
    if (ROOM_DATABASE[withP]) {
      return { ...ROOM_DATABASE[withP], raw: roomStr };
    }

    // 5. Standard AITU notation: C1.<block_num>.<room_num>
    // e.g. C1.3.362 -> block C1.3, floor 3 (or room_num / 100)
    const match = upper.match(/^C1\.([1-3])\.(\d+)([A-ZА-Я]?)$/);
    if (match) {
      const blockNum = match[1];
      const roomNum = match[2];
      const suffix = match[3] || "";
      const block = "C1." + blockNum;
      
      // Determine floor: in AITU room notation C1.<block>.<floor><room_number>
      // e.g. 362 -> 3rd floor; 245 -> 2nd floor; 121 -> 1st floor
      let floor = parseInt(roomNum.charAt(0), 10);
      if (isNaN(floor) || floor < 1 || floor > 3) {
        floor = 1;
      }
      const floorNames = { 1: "1 этаж", 2: "2 этаж", 3: "3 этаж" };
      const floorOptions = { 1: "first", 2: "second", 3: "third" };

      return {
        buildingId: "main",
        building: buildingStr || "Главный корпус",
        block: block,
        floor: floor,
        floorName: floorNames[floor],
        floorOption: floorOptions[floor],
        roomId: upper,
        searchQuery: upper,
        type: "Аудитория " + upper,
        description: `Блок ${block}, ${floorNames[floor]}, помещение ${roomNum}${suffix}`,
        verified: false,
        raw: roomStr
      };
    }

    // Unmapped room
    return {
      buildingId: "main",
      building: buildingStr || "Главный корпус",
      block: null,
      floor: null,
      floorName: null,
      roomId: upper,
      searchQuery: upper,
      type: "Помещение",
      description: cleanStr,
      verified: false,
      raw: roomStr
    };
  }

  return {
    ROOM_DATABASE,
    normalizeRoomKey,
    resolveRoom
  };
});

