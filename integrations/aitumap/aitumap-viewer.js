/**
 * Astana IT University - Interactive Map Viewer Engine
 * Native high-performance vector rendering with pan/zoom, auto-centering,
 * floor switching, room beacon pulse, and postMessage integration.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['../../config/room-mapping.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../config/room-mapping.js'));
  } else {
    root.AituMapViewer = factory(root.AituRoomMapping);
  }
})(typeof self !== 'undefined' ? self : this, function (RoomMapping) {
  'use strict';

  const SVG_WIDTH = 924.69;
  const SVG_HEIGHT = 396.16;

  class AituMapViewer {
    constructor(container, options = {}) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      if (!container) {
        throw new Error('AituMapViewer: container element not found');
      }

      this.container = container;
      this.options = Object.assign({
        initialFloor: 1,
        theme: 'dark',
        enableSearch: true,
        enableControls: true,
        onRoomFound: null,
        onRoomNotFound: null,
        onRoomClick: null,
        onFloorChange: null
      }, options);

      this.currentFloor = this.options.initialFloor;
      this.selectedRoom = null;
      this.selectedRoomFloor = null;
      this.selectedRoomElement = null;

      // Transform state
      this.transform = {
        x: 0,
        y: 0,
        scale: 1
      };

      // Drag / Pan state
      this.isPanning = false;
      this.startPointer = { x: 0, y: 0 };
      this.startTransform = { x: 0, y: 0 };
      this.touchDistance = 0;

      // Bound event handlers for clean disposal
      this._onWheel = this._onWheel.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._onTouchStart = this._onTouchStart.bind(this);
      this._onTouchMove = this._onTouchMove.bind(this);
      this._onTouchEnd = this._onTouchEnd.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onMessage = this._onMessage.bind(this);

      this._init();
    }

    _init() {
      this.container.classList.add('aitumap-container');
      this._applyTheme(this.options.theme);

      // Create DOM elements
      this.container.innerHTML = `
        <div class="aitumap-viewport" id="aituViewport">
          <div class="aitumap-stage" id="aituStage"></div>
          <div class="aitumap-beacon" id="aituBeacon" style="display:none;">
            <div class="aitumap-beacon-ring"></div>
            <div class="aitumap-beacon-dot"></div>
          </div>
        </div>

        <div class="aitumap-controls-top">
          ${this.options.enableSearch ? `
          <div class="aitumap-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" class="aitumap-search-input" id="aituSearchInput" placeholder="Поиск (362, 245, Актовый зал)..." aria-label="Поиск по карте">
          </div>` : '<div></div>'}

          <div class="aitumap-floor-pill" role="tablist" aria-label="Выбор этажа">
            <button class="aitumap-floor-btn" data-floor="1" type="button" role="tab">1 этаж</button>
            <button class="aitumap-floor-btn" data-floor="2" type="button" role="tab">2 этаж</button>
            <button class="aitumap-floor-btn" data-floor="3" type="button" role="tab">3 этаж</button>
          </div>
        </div>

        ${this.options.enableControls ? `
        <div class="aitumap-zoom-controls">
          <button class="aitumap-btn" id="aituZoomIn" title="Приблизить" aria-label="Приблизить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button class="aitumap-btn" id="aituZoomOut" title="Отдалить" aria-label="Отдалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
          </button>
          <button class="aitumap-btn accent" id="aituCenterRoom" title="К выбранной аудитории" aria-label="Центрировать выбранную аудиторию">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
          </button>
          <button class="aitumap-btn" id="aituResetView" title="Сбросить масштаб" aria-label="Показать весь корпус">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
        </div>` : ''}

        <div class="aitumap-status-banner hidden" id="aituStatusBanner">
          <span class="aitumap-status-dot" id="aituStatusDot"></span>
          <span id="aituStatusText"></span>
          <button class="aitumap-floor-jump-badge" id="aituFloorJumpBtn" style="display:none;" type="button">Перейти на этаж</button>
        </div>

        <div class="aitumap-loader" id="aituLoader">
          <div class="aitumap-spinner"></div>
          <div class="aitumap-loader-text">Загрузка интерактивной карты AITU…</div>
        </div>
      `;

      this.viewport = this.container.querySelector('#aituViewport');
      this.stage = this.container.querySelector('#aituStage');
      this.beacon = this.container.querySelector('#aituBeacon');
      this.statusBanner = this.container.querySelector('#aituStatusBanner');
      this.statusDot = this.container.querySelector('#aituStatusDot');
      this.statusText = this.container.querySelector('#aituStatusText');
      this.floorJumpBtn = this.container.querySelector('#aituFloorJumpBtn');
      this.loader = this.container.querySelector('#aituLoader');

      this._bindEvents();

      // Render the active floor
      this.setFloor(this.currentFloor, false);
      this.fitToViewport(false);

      // Hide loader
      setTimeout(() => {
        if (this.loader) {
          this.loader.classList.add('fade-out');
          setTimeout(() => { this.loader.style.display = 'none'; }, 300);
        }
      }, 150);

      // Broadcast ready
      this._emit('MAP_READY', { currentFloor: this.currentFloor });
    }

    _bindEvents() {
      // Mouse & Pointer navigation
      this.viewport.addEventListener('wheel', this._onWheel, { passive: false });
      this.viewport.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointercancel', this._onPointerUp);

      // Touch events
      this.viewport.addEventListener('touchstart', this._onTouchStart, { passive: false });
      this.viewport.addEventListener('touchmove', this._onTouchMove, { passive: false });
      this.viewport.addEventListener('touchend', this._onTouchEnd);

      // Window resize
      window.addEventListener('resize', this._onResize);

      // postMessage listener
      window.addEventListener('message', this._onMessage);

      // UI controls
      const floorBtns = this.container.querySelectorAll('.aitumap-floor-btn');
      floorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const floor = parseInt(btn.dataset.floor, 10);
          this.setFloor(floor, true);
        });
      });

      const zoomInBtn = this.container.querySelector('#aituZoomIn');
      if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomBy(1.3));

      const zoomOutBtn = this.container.querySelector('#aituZoomOut');
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomBy(1 / 1.3));

      const resetBtn = this.container.querySelector('#aituResetView');
      if (resetBtn) resetBtn.addEventListener('click', () => this.fitToViewport(true));

      const centerRoomBtn = this.container.querySelector('#aituCenterRoom');
      if (centerRoomBtn) {
        centerRoomBtn.addEventListener('click', () => {
          if (this.selectedRoom) {
            this.focusRoom(this.selectedRoom, true);
          } else {
            this.fitToViewport(true);
          }
        });
      }

      if (this.floorJumpBtn) {
        this.floorJumpBtn.addEventListener('click', () => {
          if (this.selectedRoomFloor) {
            this.setFloor(this.selectedRoomFloor, true);
            if (this.selectedRoom) {
              this.focusRoom(this.selectedRoom, true);
            }
          }
        });
      }

      // Search bar
      const searchInput = this.container.querySelector('#aituSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (val.length >= 2) {
            this.openRoom(val);
          } else if (!val) {
            this.clearHighlight();
            this.hideStatus();
          }
        });
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.openRoom(searchInput.value.trim());
          }
        });
      }
    }

    _applyTheme(theme) {
      this.theme = theme;
      this.container.dataset.theme = theme;
      if (theme === 'light') {
        this.container.classList.add('light-theme');
      } else {
        this.container.classList.remove('light-theme');
      }
    }

    setTheme(theme) {
      this._applyTheme(theme);
    }

    setFloor(floorNum, animate = true) {
      floorNum = parseInt(floorNum, 10);
      if (isNaN(floorNum) || floorNum < 1 || floorNum > 3) {
        floorNum = 1;
      }

      this.currentFloor = floorNum;

      // Update floor pills
      const floorBtns = this.container.querySelectorAll('.aitumap-floor-btn');
      floorBtns.forEach(btn => {
        const active = parseInt(btn.dataset.floor, 10) === floorNum;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      // Get SVG string from AITUMAP_DATA
      if (!window.AITUMAP_DATA || !window.AITUMAP_DATA.floors[floorNum]) {
        console.error('AITUMAP_DATA missing for floor', floorNum);
        return;
      }

      const floorSvg = window.AITUMAP_DATA.floors[floorNum].svg;
      this.stage.innerHTML = floorSvg;

      // Wire click interactions on rooms
      this._wireRoomInteractions();

      // Check if previously selected room belongs to this floor
      if (this.selectedRoom) {
        if (this.selectedRoomFloor === floorNum) {
          this._highlightRoomInDOM(this.selectedRoom);
          this._updateBeaconPosition();
          this.showStatus(`Аудитория ${this.selectedRoom} выбрана`, false);
        } else {
          this.clearHighlight();
          this.beacon.style.display = 'none';
          this.showStatus(`Аудитория находится на ${this.selectedRoomFloor} этаже`, true, true);
        }
      }

      if (this.options.onFloorChange) {
        this.options.onFloorChange(floorNum);
      }
      this._emit('FLOOR_CHANGED', { floor: floorNum });
    }

    _wireRoomInteractions() {
      const roomGroups = this.stage.querySelectorAll('.map-groups-rooms > g, .map-groups-rooms-vk > g');
      roomGroups.forEach(group => {
        const dataName = group.getAttribute('data-name') || group.id;
        if (!dataName) return;

        group.style.cursor = 'pointer';
        group.addEventListener('click', (e) => {
          e.stopPropagation();
          const cleanName = dataName.split('|')[0];
          this.selectRoom(cleanName, group);
        });
      });
    }

    selectRoom(roomName, groupElement) {
      this.clearHighlight();
      this.selectedRoom = roomName;
      this.selectedRoomFloor = this.currentFloor;
      this.selectedRoomElement = groupElement;

      if (groupElement) {
        groupElement.classList.add('room-selected-target');
        this._updateBeaconPosition();
      }

      this.showStatus(`Выбрано: ${roomName}`, false);

      if (this.options.onRoomClick) {
        this.options.onRoomClick({ room: roomName, floor: this.currentFloor, elementId: groupElement ? groupElement.id : null });
      }
      this._emit('ROOM_CLICKED', { room: roomName, floor: this.currentFloor, elementId: groupElement ? groupElement.id : null });
    }

    /**
     * Central API method: Opens and highlights a room by name / code.
     * Switches to the proper floor, centers the map, and shows the pulse beacon.
     */
    openRoom(roomQuery) {
      if (!roomQuery) return false;

      // Resolve room via mapping configuration
      const resolved = RoomMapping ? RoomMapping.resolveRoom(roomQuery) : null;
      const targetFloor = (resolved && resolved.floor) ? resolved.floor : this._deduceFloorFromQuery(roomQuery);
      const targetId = (resolved && resolved.roomId) ? resolved.roomId : roomQuery;

      this.selectedRoom = roomQuery;
      this.selectedRoomFloor = targetFloor || this.currentFloor;

      // Switch floor if needed
      if (targetFloor && targetFloor !== this.currentFloor) {
        this.setFloor(targetFloor, false);
      }

      // Find the SVG element on this floor
      const element = this._findElementForRoom(targetId, roomQuery);

      if (element) {
        this.selectedRoomElement = element;
        this.clearHighlight();
        element.classList.add('room-selected-target');

        // Smoothly pan & zoom to the room
        this.focusRoomElement(element, true);
        this.showStatus(`Аудитория найдена: ${roomQuery}`, false);

        const resultData = {
          room: roomQuery,
          floor: this.currentFloor,
          building: (resolved && resolved.building) ? resolved.building : "Главный корпус",
          elementId: element.id || targetId,
          verified: !!(resolved && resolved.verified)
        };

        if (this.options.onRoomFound) {
          this.options.onRoomFound(resultData);
        }
        this._emit('ROOM_FOUND', resultData);
        return true;
      } else {
        this.beacon.style.display = 'none';
        this.showStatus(`Не удалось найти аудиторию «${roomQuery}» на карте`, true);

        const notFoundData = { room: roomQuery, floor: this.currentFloor };
        if (this.options.onRoomNotFound) {
          this.options.onRoomNotFound(notFoundData);
        }
        this._emit('ROOM_NOT_FOUND', notFoundData);
        return false;
      }
    }

    _deduceFloorFromQuery(q) {
      if (!q) return null;
      const upper = String(q).toUpperCase();
      if (upper.includes('АКТОВ') || upper.includes('ASSEMBLY') || upper.includes('СТОЛОВ') || upper.includes('БИБЛИОТ')) {
        return 1;
      }
      const match = upper.match(/C1\.[1-3]\.([1-3])\d{2}/);
      if (match) {
        return parseInt(match[1], 10);
      }
      const matchShort = upper.match(/([1-3])\d{2}/);
      if (matchShort) {
        return parseInt(matchShort[1], 10);
      }
      return null;
    }

    _findElementForRoom(targetId, query) {
      if (!this.stage) return null;

      // 1. Direct ID match
      let el = this.stage.querySelector(`#${CSS.escape(targetId)}`);
      if (el) return el;

      // 2. data-name attribute exact or substring match
      const upperQuery = String(query).toUpperCase();
      el = this.stage.querySelector(`[data-name*="${upperQuery}"]`);
      if (el) return el;

      // 3. Normalized / Suffix variations
      const cleanUpper = upperQuery.replace(/^С(?=\d|\.)/g, "C");
      el = this.stage.querySelector(`[data-name*="${cleanUpper}"]`);
      if (el) return el;

      // 4. Room number digits only (e.g. 362)
      const digitsMatch = upperQuery.match(/\d{3}/);
      if (digitsMatch) {
        const digits = digitsMatch[0];
        el = this.stage.querySelector(`[data-name*="${digits}"]`);
        if (el) return el;
      }

      // 5. Special keywords
      if (upperQuery.includes('АКТОВ') || upperQuery.includes('ASSEMBLY')) {
        el = this.stage.querySelector('#ASSEMBLYHALL, [data-name*="ASSEMBLYHALL"], [data-name*="АКТОВЫЙ"]');
        if (el) return el;
      }
      if (upperQuery.includes('СТОЛОВ') || upperQuery.includes('DINING')) {
        el = this.stage.querySelector('#DININGHALL, [data-name*="DININGHALL"], [data-name*="СТОЛОВАЯ"]');
        if (el) return el;
      }
      if (upperQuery.includes('БИБЛИОТ') || upperQuery.includes('LIBRARY')) {
        el = this.stage.querySelector('#LIBRARY, [data-name*="LIBRARY"], [data-name*="БИБЛИОТЕКА"]');
        if (el) return el;
      }

      return null;
    }

    _highlightRoomInDOM(roomQuery) {
      const el = this._findElementForRoom(roomQuery, roomQuery);
      if (el) {
        this.selectedRoomElement = el;
        el.classList.add('room-selected-target');
      }
    }

    clearHighlight() {
      if (!this.stage) return;
      const targets = this.stage.querySelectorAll('.room-selected-target, .room-map-group-search-target');
      targets.forEach(t => {
        t.classList.remove('room-selected-target');
        t.classList.remove('room-map-group-search-target');
      });
      if (this.beacon) {
        this.beacon.style.display = 'none';
      }
    }

    /**
     * Smoothly focuses viewport on an SVG element.
     */
    focusRoomElement(element, animate = true) {
      if (!element || !element.getBBox) return;

      try {
        const bbox = element.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        const vpWidth = this.viewport.clientWidth;
        const vpHeight = this.viewport.clientHeight;

        // Choose optimal scale: 2.3 for standard rooms, 1.6 for large halls
        let targetScale = 2.4;
        if (bbox.width > 120 || bbox.height > 80) {
          targetScale = 1.7;
        }

        const targetX = vpWidth / 2 - centerX * targetScale;
        const targetY = vpHeight / 2 - centerY * targetScale;

        this.setTransform(targetX, targetY, targetScale, animate);
        this._setBeaconPosition(centerX, centerY);
      } catch (err) {
        console.warn('Could not compute bounding box for room:', err);
      }
    }

    _setBeaconPosition(svgX, svgY) {
      if (!this.beacon) return;
      this.beaconRoomPos = { x: svgX, y: svgY };
      this._updateBeaconPosition();
      this.beacon.style.display = 'flex';
    }

    _updateBeaconPosition() {
      if (!this.beacon || !this.beaconRoomPos) return;
      const screenX = this.transform.x + this.beaconRoomPos.x * this.transform.scale;
      const screenY = this.transform.y + this.beaconRoomPos.y * this.transform.scale;
      this.beacon.style.left = `${screenX}px`;
      this.beacon.style.top = `${screenY}px`;
    }

    focusRoom(roomQuery, animate = true) {
      this.openRoom(roomQuery);
    }

    /**
     * Fits the entire campus SVG inside the viewport.
     */
    fitToViewport(animate = true) {
      const vpWidth = this.viewport.clientWidth || 800;
      const vpHeight = this.viewport.clientHeight || 500;

      const padding = 36;
      const scaleX = (vpWidth - padding * 2) / SVG_WIDTH;
      const scaleY = (vpHeight - padding * 2) / SVG_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 1.25);

      const x = (vpWidth - SVG_WIDTH * scale) / 2;
      const y = (vpHeight - SVG_HEIGHT * scale) / 2;

      this.setTransform(x, y, scale, animate);
    }

    setTransform(x, y, scale, animate = false) {
      // Scale clamping
      scale = Math.max(0.4, Math.min(scale, 5.0));

      this.transform = { x, y, scale };

      if (animate) {
        this.stage.classList.add('smooth-animate');
        clearTimeout(this._animTimer);
        this._animTimer = setTimeout(() => {
          this.stage.classList.remove('smooth-animate');
        }, 460);
      } else {
        this.stage.classList.remove('smooth-animate');
      }

      this.stage.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      this._updateBeaconPosition();
    }

    zoomBy(factor, focalX = null, focalY = null) {
      const vpWidth = this.viewport.clientWidth;
      const vpHeight = this.viewport.clientHeight;

      const fx = focalX !== null ? focalX : vpWidth / 2;
      const fy = focalY !== null ? focalY : vpHeight / 2;

      const newScale = Math.max(0.4, Math.min(this.transform.scale * factor, 5.0));
      const actualFactor = newScale / this.transform.scale;

      const newX = fx - (fx - this.transform.x) * actualFactor;
      const newY = fy - (fy - this.transform.y) * actualFactor;

      this.setTransform(newX, newY, newScale, true);
    }

    showStatus(text, isWarning = false, showFloorJump = false) {
      if (!this.statusBanner) return;
      this.statusText.textContent = text;
      this.statusDot.classList.toggle('warning', isWarning);
      this.floorJumpBtn.style.display = showFloorJump ? 'inline-block' : 'none';
      if (showFloorJump && this.selectedRoomFloor) {
        this.floorJumpBtn.textContent = `На ${this.selectedRoomFloor} этаж →`;
      }
      this.statusBanner.classList.remove('hidden');

      clearTimeout(this._statusTimer);
      if (!showFloorJump) {
        this._statusTimer = setTimeout(() => {
          this.hideStatus();
        }, 5000);
      }
    }

    hideStatus() {
      if (this.statusBanner) {
        this.statusBanner.classList.add('hidden');
      }
    }

    // Touch & Pointer interaction listeners
    _onWheel(e) {
      e.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;

      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.15 : (1 / 1.15);
      this.zoomBy(factor, focalX, focalY);
    }

    _onPointerDown(e) {
      if (e.target.closest('.aitumap-btn') || e.target.closest('.aitumap-floor-pill') || e.target.closest('.aitumap-search-box') || e.target.closest('.aitumap-status-banner')) {
        return;
      }
      this.isPanning = true;
      this.viewport.classList.add('is-panning');
      this.stage.classList.remove('smooth-animate');
      this.startPointer = { x: e.clientX, y: e.clientY };
      this.startTransform = { x: this.transform.x, y: this.transform.y };
    }

    _onPointerMove(e) {
      if (!this.isPanning) return;
      const dx = e.clientX - this.startPointer.x;
      const dy = e.clientY - this.startPointer.y;
      this.setTransform(this.startTransform.x + dx, this.startTransform.y + dy, this.transform.scale, false);
    }

    _onPointerUp() {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.classList.remove('is-panning');
      }
    }

    _onTouchStart(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.touchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.touchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
        this.startTransform = { ...this.transform };
      }
    }

    _onTouchMove(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.touchDistance > 0) {
          const factor = dist / this.touchDistance;
          const rect = this.viewport.getBoundingClientRect();
          const focalX = this.touchCenter.x - rect.left;
          const focalY = this.touchCenter.y - rect.top;

          const newScale = Math.max(0.4, Math.min(this.startTransform.scale * factor, 5.0));
          const actualFactor = newScale / this.startTransform.scale;

          const newX = focalX - (focalX - this.startTransform.x) * actualFactor;
          const newY = focalY - (focalY - this.startTransform.y) * actualFactor;
          this.setTransform(newX, newY, newScale, false);
        }
      }
    }

    _onTouchEnd() {
      this.touchDistance = 0;
    }

    _onResize() {
      if (!this.selectedRoomElement) {
        this.fitToViewport(false);
      } else {
        this._updateBeaconPosition();
      }
    }

    _emit(type, payload = {}) {
      const message = Object.assign({ type, source: 'AITUMAP' }, payload);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
    }

    _onMessage(event) {
      // Validate event and structure
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'OPEN_ROOM':
          if (data.room) {
            this.openRoom(data.room);
          }
          break;
        case 'SET_FLOOR':
          if (data.floor) {
            this.setFloor(data.floor, true);
          }
          break;
        case 'SET_THEME':
          if (data.theme) {
            this.setTheme(data.theme);
          }
          break;
        case 'CENTER_ROOM':
          if (this.selectedRoom) {
            this.focusRoom(this.selectedRoom, true);
          }
          break;
        case 'RESET_VIEW':
          this.fitToViewport(true);
          break;
        case 'CLEAR_HIGHLIGHT':
          this.clearHighlight();
          break;
      }
    }

    destroy() {
      this.viewport.removeEventListener('wheel', this._onWheel);
      this.viewport.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
      this.viewport.removeEventListener('touchstart', this._onTouchStart);
      this.viewport.removeEventListener('touchmove', this._onTouchMove);
      this.viewport.removeEventListener('touchend', this._onTouchEnd);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('message', this._onMessage);
    }
  }

  return AituMapViewer;
});

