(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const launcher = document.getElementById('launcher');
  const svg = document.getElementById('radial');
  const core = document.getElementById('core');
  const coreLabel = document.getElementById('core-label');
  const coreHint = document.getElementById('core-hint');
  const crumbs = document.getElementById('crumbs');
  const context = document.getElementById('context');
  const contextLabel = document.getElementById('context-label');
  const contextIcon = document.getElementById('context-icon');
  const contextDescription = document.getElementById('context-description');
  const contextState = document.getElementById('context-state');
  const statusText = document.getElementById('status-text');
  const toast = document.getElementById('toast');
  const host = window.launcherHost || {};

  document.documentElement.classList.toggle('desktop-host', !!window.launcherHost);

  const supplied = window.LauncherData && (window.LauncherData.root || window.LauncherData.MOCK_ROOT);
  if (!supplied || !window.LauncherTree || !window.LauncherTree.createController) {
    throw new Error('Launcher data/controller unavailable');
  }

  const controller = window.LauncherTree.createController(supplied);
  const nodes = Object.create(null);
  const ringRegistry = new Map();
  let state = controller.getState();
  let motion = 'dormant';
  let transitionLocked = false;
  let lastMode = null;
  let toastTimer = null;
  let connectorLayer;
  let ringLayer;

  (function index(node) {
    nodes[node.id] = node;
    (node.children || []).forEach(index);
  }(supplied));

  const ringGeometry = [
    { r1: 184, r2: 286 },
    { r1: 304, r2: 384 },
    { r1: 402, r2: 478 }
  ];

  const icons = {
    hub: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
    folder: '<path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/>',
    capture: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    code: '<path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    book: '<path d="M4 5c3-1 5 0 8 2v13c-3-2-5-3-8-2zM20 5c-3-1-5 0-8 2v13c3-2 5-3 8-2z"/>',
    wrench: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3z"/>',
    brain: '<path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 6 3 3 0 0 0 2 5 3 3 0 0 0 3 3M15 4a3 3 0 0 1 5 2 3 3 0 0 1 0 6 3 3 0 0 1-2 5 3 3 0 0 1-3 3M9 4v16M15 4v16M9 8H7M15 8h2M9 13H6M15 13h3M9 17H7M15 17h2"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 16h5"/>',
    git: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="8" cy="19" r="2"/><path d="M6 7v8a4 4 0 0 0 4 4M8 11h5a5 5 0 0 0 5-2"/>',
    docs: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 2 3 3 7 3s7-1 7-3V5M5 11v6c0 2 3 3 7 3s7-1 7-3v-6"/>',
    cube: '<path d="m12 3 8 4-8 4-8-4zM4 7v10l8 4 8-4V7M12 11v10"/>',
    spark: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    inbox: '<path d="M4 5h16l-2 14H6z"/><path d="M5 13h4l2 3h2l2-3h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4 10-10"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16zM14 6l4 4"/>',
    roadmap: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a3 3 0 0 1 3 3v6M16 15l2 1-2 1"/>',
    diamond: '<path d="m12 3 8 9-8 9-8-9z"/>',
    activity: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    braces: '<path d="M8 4H6a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2"/>',
    message: '<path d="M4 5h16v11H9l-5 4z"/>'
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function createSvg(name, attrs) {
    const el = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(key => el.setAttribute(key, attrs[key]));
    return el;
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: 500 + radius * Math.cos(radians),
      y: 500 + radius * Math.sin(radians)
    };
  }

  function vector(radius, angle) {
    const point = polar(radius, angle);
    return { x: point.x - 500, y: point.y - 500 };
  }

  function arcPath(radius, start, end) {
    const a = polar(radius, start);
    const b = polar(radius, end);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }

  function wedgePath(r1, r2, start, end) {
    const p1 = polar(r1, start);
    const p2 = polar(r1, end);
    const p3 = polar(r2, end);
    const p4 = polar(r2, start);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${r1} ${r1} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${r2} ${r2} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  function startAngle(parentId, count, depth) {
    if (parentId === 'projecthub') return -30;
    if (parentId === 'development') return -45;
    if (parentId === 'development-moneycontrol' || parentId === 'moneycontrol-tools') return -108;
    if (parentId === 'capture') return -45;
    if (parentId === 'capture-idea') return -45;
    if (parentId === 'ai') return -54;
    if (parentId === 'ai-ask') return -60;
    return -(180 / Math.max(1, count)) + depth * 9;
  }

  function iconMarkup(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.diamond}</svg>`;
  }

  function svgIcon(name, x, y, scale) {
    const s = scale || 1;
    return `<g class="wedge-icon" transform="translate(${(x - 12 * s).toFixed(2)} ${(y - 12 * s).toFixed(2)}) scale(${s})">${icons[name] || icons.diamond}</g>`;
  }

  function defsMarkup() {
    return `
      <defs>
        <pattern id="steelPattern" patternUnits="userSpaceOnUse" width="280" height="280" patternTransform="rotate(-18)">
          <image href="../assets/steel-silver.webp" x="0" y="0" width="280" height="280" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <pattern id="steelDarkPattern" patternUnits="userSpaceOnUse" width="260" height="260" patternTransform="rotate(22)">
          <image href="../assets/steel-dark.webp" x="0" y="0" width="260" height="260" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <linearGradient id="plateShade" x1="0" y1="0" x2=".85" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity=".36"/>
          <stop offset=".18" stop-color="#fff" stop-opacity=".06"/>
          <stop offset=".52" stop-color="#000" stop-opacity=".06"/>
          <stop offset="1" stop-color="#000" stop-opacity=".58"/>
        </linearGradient>
        <linearGradient id="plateSheen" x1="0" y1="0" x2="1" y2=".5">
          <stop offset="0" stop-color="#dce7eb" stop-opacity=".02"/>
          <stop offset=".42" stop-color="#fff" stop-opacity=".46"/>
          <stop offset=".48" stop-color="#fff" stop-opacity=".05"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="amberWash" cx="50%" cy="20%" r="85%">
          <stop offset="0" stop-color="#ffd68e" stop-opacity=".26"/>
          <stop offset=".5" stop-color="#d2852e" stop-opacity=".18"/>
          <stop offset="1" stop-color="#48260f" stop-opacity=".35"/>
        </radialGradient>
        <filter id="plateShadow" x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
          <feOffset in="blur" dy="8" result="off"/>
          <feColorMatrix in="off" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .78 0" result="shadow"/>
          <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="amberGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="fastenerShadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#000" flood-opacity=".9"/>
        </filter>
      </defs>`;
  }

  function decorationsMarkup() {
    const arcs = [
      [494, -15, 32, false], [494, 49, 102, false], [494, 122, 175, false],
      [494, 196, 247, false], [494, 269, 318, false], [395, -18, 24, false],
      [395, 74, 111, false], [395, 164, 201, false], [395, 252, 293, false],
      [294, -12, 18, true], [294, 108, 129, false], [294, 226, 247, false]
    ];
    return `<g class="decorations">${arcs.map(item =>
      `<path class="decor-arc${item[3] ? ' hot' : ''}" d="${arcPath(item[0], item[1], item[2])}"/>`
    ).join('')}</g>`;
  }

  function initializeSvg() {
    svg.innerHTML = defsMarkup() + decorationsMarkup() + '<g id="connector-layer"></g><g id="ring-layer"></g>';
    connectorLayer = svg.querySelector('#connector-layer');
    ringLayer = svg.querySelector('#ring-layer');
  }

  function ringParts(level, depth) {
    const geometry = ringGeometry[depth];
    const children = level.children || [];
    const count = Math.min(children.length, 10);
    const gap = depth === 0 ? 5.2 : depth === 1 ? 4.2 : 3.4;
    const span = 360 / Math.max(1, count);
    const start = startAngle(level.parentId, count, depth);
    return { geometry, children: children.slice(0, count), count, gap, span, start };
  }

  function selectedMidAngle(level, depth) {
    if (!level || !level.selectedId) return null;
    const parts = ringParts(level, depth);
    const index = parts.children.findIndex(node => node.id === level.selectedId);
    if (index < 0) return null;
    return parts.start + (index + .5) * parts.span;
  }

  function createWedge(node) {
    const wedge = createSvg('g', {
      class: 'wedge',
      'data-node-id': node.id,
      tabindex: '0',
      role: 'button',
      'aria-label': node.label
    });

    wedge.innerHTML = `
      <path class="plate-bed"/>
      <g class="wedge-carriage">
        <path class="plate-under"/>
        <path class="plate-face"/>
        <path class="plate-shade"/>
        <path class="plate-sheen"/>
        <path class="plate-edge"/>
        <path class="plate-inner-edge"/>
        <path class="plate-active"/>
        <g class="fasteners">
          <circle class="fastener fastener-a" r="5.1"/>
          <circle class="fastener-core fastener-core-a" r="1.7"/>
          <circle class="fastener fastener-b" r="5.1"/>
          <circle class="fastener-core fastener-core-b" r="1.7"/>
        </g>
        <g class="icon-slot"></g>
        <text class="wedge-label"></text>
        <path class="selection-trace"/>
      </g>`;

    wedge.addEventListener('mouseenter', () => showContext(node, 'HOVER'));
    wedge.addEventListener('mouseleave', () => showContext(state.current || supplied, state.leaf ? 'ACTION' : 'READY'));
    wedge.addEventListener('focus', () => showContext(node, 'FOCUS'));
    wedge.addEventListener('click', event => {
      event.stopPropagation();
      selectNode(node.id);
    });
    wedge.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectNode(node.id);
      }
    });
    return wedge;
  }

  function ensureRing(level, depth) {
    let record = ringRegistry.get(level.parentId);
    if (record) return record;

    const group = createSvg('g', {
      class: 'ring parked',
      'data-parent-id': level.parentId,
      'aria-hidden': 'true'
    });
    group.innerHTML = `
      <circle class="carrier-bed" cx="500" cy="500" pathLength="1"/>
      <circle class="carrier-track" cx="500" cy="500" pathLength="1"/>
      <circle class="carrier-highlight" cx="500" cy="500" pathLength="1"/>
      <g class="wedge-layer"></g>`;

    const wedgeLayer = group.querySelector('.wedge-layer');
    const wedgeMap = new Map();
    (level.children || []).forEach(node => {
      const wedge = createWedge(nodes[node.id] || node);
      wedgeLayer.appendChild(wedge);
      wedgeMap.set(node.id, wedge);
    });

    ringLayer.appendChild(group);
    record = { group, wedgeMap, depth: -1 };
    ringRegistry.set(level.parentId, record);
    updateRingGeometry(record, level, depth);
    return record;
  }

  function updateRingGeometry(record, level, depth, sourceAngle) {
    const parts = ringParts(level, depth);
    if (!parts.geometry) return;
    record.depth = depth;
    record.group.setAttribute('class', `ring depth-${depth}${record.group.classList.contains('parked') ? ' parked' : ''}${record.group.classList.contains('deploying') ? ' deploying' : ''}${record.group.classList.contains('retracting') ? ' retracting' : ''}`);
    record.group.dataset.depth = String(depth);
    record.group.style.setProperty('--source-angle', ((sourceAngle == null ? 0 : sourceAngle)).toFixed(2) + 'deg');

    const midRadius = (parts.geometry.r1 + parts.geometry.r2) / 2;
    const carrierWidth = (parts.geometry.r2 - parts.geometry.r1) + 18;
    record.group.querySelector('.carrier-bed').setAttribute('r', midRadius.toFixed(2));
    record.group.querySelector('.carrier-bed').setAttribute('stroke-width', carrierWidth.toFixed(2));
    record.group.querySelector('.carrier-track').setAttribute('r', midRadius.toFixed(2));
    record.group.querySelector('.carrier-track').setAttribute('stroke-width', Math.max(8, carrierWidth - 21).toFixed(2));
    record.group.querySelector('.carrier-highlight').setAttribute('r', (parts.geometry.r2 - 7).toFixed(2));

    parts.children.forEach((node, index) => {
      const wedge = record.wedgeMap.get(node.id);
      if (!wedge) return;
      const a1 = parts.start + index * parts.span + parts.gap / 2;
      const a2 = parts.start + (index + 1) * parts.span - parts.gap / 2;
      const mid = (a1 + a2) / 2;
      const d = wedgePath(parts.geometry.r1, parts.geometry.r2, a1, a2);
      const labelRadius = (parts.geometry.r1 + parts.geometry.r2) / 2;
      const iconPoint = polar(labelRadius - (depth === 0 ? 13 : 10), mid);
      const labelPoint = polar(labelRadius + (depth === 0 ? 22 : 19), mid);
      const hover = vector(depth === 0 ? 10 : 8, mid);
      const selected = vector(depth === 0 ? 6 : 5, mid);
      const deploy = vector(depth === 0 ? -23 : -19, mid);
      const overshoot = vector(depth === 0 ? 3.6 : 2.8, mid);
      const settle = vector(depth === 0 ? -1.3 : -1.0, mid);
      const lock = vector(-3, mid);
      const fanRotation = sourceAngle == null ? 0 : (sourceAngle - mid);
      const fastenerA = polar(parts.geometry.r1 + 13, mid);
      const fastenerB = polar(parts.geometry.r2 - 13, mid);
      const trace = arcPath(parts.geometry.r2 - 3, a1 + 3, a2 - 3);
      const iconScale = depth === 0 ? 1.35 : depth === 1 ? 1.15 : 1;

      wedge.style.setProperty('--hover-x', hover.x.toFixed(2) + 'px');
      wedge.style.setProperty('--hover-y', hover.y.toFixed(2) + 'px');
      wedge.style.setProperty('--select-x', selected.x.toFixed(2) + 'px');
      wedge.style.setProperty('--select-y', selected.y.toFixed(2) + 'px');
      wedge.style.setProperty('--deploy-x', deploy.x.toFixed(2) + 'px');
      wedge.style.setProperty('--deploy-y', deploy.y.toFixed(2) + 'px');
      wedge.style.setProperty('--overshoot-x', overshoot.x.toFixed(2) + 'px');
      wedge.style.setProperty('--overshoot-y', overshoot.y.toFixed(2) + 'px');
      wedge.style.setProperty('--settle-x', settle.x.toFixed(2) + 'px');
      wedge.style.setProperty('--settle-y', settle.y.toFixed(2) + 'px');
      wedge.style.setProperty('--lock-x', lock.x.toFixed(2) + 'px');
      wedge.style.setProperty('--lock-y', lock.y.toFixed(2) + 'px');
      wedge.style.setProperty('--stagger', String(index));
      wedge.style.setProperty('--fan-rotation', fanRotation.toFixed(2) + 'deg');

      wedge.querySelector('.plate-bed').setAttribute('d', d);
      ['plate-under', 'plate-face', 'plate-shade', 'plate-sheen', 'plate-edge', 'plate-inner-edge', 'plate-active'].forEach(className => {
        wedge.querySelector('.' + className).setAttribute('d', d);
      });
      wedge.querySelector('.selection-trace').setAttribute('d', trace);
      wedge.querySelector('.selection-trace').setAttribute('pathLength', '1');
      wedge.querySelector('.fastener-a').setAttribute('cx', fastenerA.x.toFixed(2));
      wedge.querySelector('.fastener-a').setAttribute('cy', fastenerA.y.toFixed(2));
      wedge.querySelector('.fastener-core-a').setAttribute('cx', fastenerA.x.toFixed(2));
      wedge.querySelector('.fastener-core-a').setAttribute('cy', fastenerA.y.toFixed(2));
      wedge.querySelector('.fastener-b').setAttribute('cx', fastenerB.x.toFixed(2));
      wedge.querySelector('.fastener-b').setAttribute('cy', fastenerB.y.toFixed(2));
      wedge.querySelector('.fastener-core-b').setAttribute('cx', fastenerB.x.toFixed(2));
      wedge.querySelector('.fastener-core-b').setAttribute('cy', fastenerB.y.toFixed(2));
      wedge.querySelector('.icon-slot').innerHTML = svgIcon(node.icon || 'diamond', iconPoint.x, iconPoint.y, iconScale);
      const label = wedge.querySelector('.wedge-label');
      label.setAttribute('x', labelPoint.x.toFixed(2));
      label.setAttribute('y', labelPoint.y.toFixed(2));
      label.textContent = node.label;
    });
  }

  function syncRings(options) {
    const desired = (state.levels || []).slice(-3);
    const desiredIds = new Set(desired.map(level => level.parentId));
    const fresh = [];

    ringRegistry.forEach((record, parentId) => {
      if (!desiredIds.has(parentId)) {
        record.group.classList.add('parked');
        record.group.classList.remove('deploying', 'retracting');
        record.group.setAttribute('aria-hidden', 'true');
      }
    });

    desired.forEach((level, depth) => {
      const existed = ringRegistry.has(level.parentId);
      const record = ensureRing(level, depth);
      const parentLevel = depth > 0 ? desired[depth - 1] : null;
      const sourceAngle = parentLevel ? selectedMidAngle(parentLevel, depth - 1) : null;
      updateRingGeometry(record, level, depth, sourceAngle);
      record.group.classList.toggle('selected-parent', !!level.selectedId);
      record.group.setAttribute('aria-hidden', 'false');

      record.wedgeMap.forEach((wedge, id) => {
        const selected = level.selectedId === id;
        wedge.classList.toggle('selected', selected);
        wedge.classList.toggle('sibling-muted', !!level.selectedId && !selected);
        wedge.classList.remove('locking', 'engaging', 'disengaging');
      });

      if (!existed || (options && options.activateIds && options.activateIds.has(level.parentId))) {
        record.group.classList.add('parked');
        fresh.push(record);
      } else {
        record.group.classList.remove('parked');
      }
    });

    updateConnectors(desired);
    return fresh;
  }

  function updateConnectors(levels) {
    connectorLayer.innerHTML = '';
    levels.forEach((level, depth) => {
      if (!level.selectedId || depth >= ringGeometry.length - 1) return;
      const parts = ringParts(level, depth);
      const index = parts.children.findIndex(node => node.id === level.selectedId);
      if (index < 0) return;
      const mid = parts.start + (index + .5) * parts.span;
      const p1 = polar(parts.geometry.r2 + 5, mid);
      const next = ringGeometry[depth + 1];
      const p2 = polar(next.r1 - 8, mid);
      const path = createSvg('path', {
        class: 'branch-connector',
        d: `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
        pathLength: '1'
      });
      connectorLayer.appendChild(path);
      connectorLayer.appendChild(createSvg('circle', {
        class: 'connector-node',
        cx: p1.x.toFixed(2),
        cy: p1.y.toFixed(2),
        r: '4'
      }));
    });
  }

  async function activateRecords(records, kind) {
    if (!records.length) return;
    await nextFrame();
    records.forEach(record => {
      record.group.classList.remove('parked');
      record.group.classList.add('deploying', kind === 'wake' ? 'wake-deploy' : 'branch-deploy');
    });
    await delay(kind === 'wake' ? 840 : 820);
    records.forEach(record => record.group.classList.remove('deploying', 'wake-deploy', 'branch-deploy'));
  }

  function setMotion(next) {
    motion = next;
    launcher.dataset.motion = next;
    statusText.textContent = next === 'ready'
      ? `DEPTH ${Math.max(1, state.path.length)}`
      : next.toUpperCase();
  }

  function renderInterface(options) {
    state = controller.getState();
    launcher.classList.toggle('dormant', !state.isOpen);
    launcher.classList.toggle('expanded', !!state.isOpen);
    launcher.classList.toggle('deep', state.path.length > 2);

    const current = state.current || supplied;
    coreLabel.textContent = (current.label || 'ProjectHub').toUpperCase();
    coreHint.textContent = state.isOpen ? (state.path.length > 1 ? 'BACK' : 'ROOT') : 'SUMMON';
    core.setAttribute('aria-label', state.isOpen ? (state.path.length > 1 ? 'Back one level' : 'Collapse ProjectHub') : 'Summon ProjectHub');

    const fresh = syncRings(options || {});
    renderCrumbs();

    if (state.isOpen) showContext(current, state.leaf ? 'ACTION' : 'READY');
    else context.hidden = true;

    notifyHost();
    return fresh;
  }

  function renderCrumbs() {
    const pathNodes = state.path.map(id => nodes[id]).filter(Boolean);
    crumbs.innerHTML = pathNodes.map((node, index) => {
      const sep = index < pathNodes.length - 1 ? '<span class="sep">/</span>' : '';
      return `<button class="crumb${index === pathNodes.length - 1 ? ' active' : ''}" data-depth="${index}">${esc(node.label.toUpperCase())}</button>${sep}`;
    }).join('');

    crumbs.querySelectorAll('.crumb').forEach(button => {
      button.addEventListener('click', async () => {
        if (transitionLocked) return;
        const depth = Number(button.dataset.depth);
        while (controller.getState().path.length > depth + 1) {
          await ascendOne();
        }
      });
    });
  }

  function showContext(node, mode) {
    if (!state.isOpen || !node) {
      context.hidden = true;
      return;
    }
    context.hidden = false;
    contextLabel.textContent = node.label.toUpperCase();
    contextIcon.innerHTML = iconMarkup(node.icon || 'diamond');
    const childCount = (node.children || []).length;
    contextDescription.textContent = node.description || (childCount ? `${childCount} child modules.` : 'Mock action.');
    contextState.textContent = childCount ? `${childCount} BRANCH${childCount === 1 ? '' : 'ES'}` : (mode || 'ACTION');
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function notifyHost() {
    const modeName = state.isOpen ? 'expanded' : 'dormant';
    if (modeName !== lastMode && host.setMode) {
      lastMode = modeName;
      host.setMode(modeName);
    }
    if (host.setPointerInteractive) host.setPointerInteractive(true);
  }

  function wedgeElement(id) {
    for (const record of ringRegistry.values()) {
      if (record.wedgeMap.has(id)) return record.wedgeMap.get(id);
    }
    return null;
  }

  async function summon() {
    if (transitionLocked || controller.getState().isOpen) return;
    transitionLocked = true;

    // When hosted by Electron, expand the transparent host first. The previous
    // version animated while Windows was still resizing/compositing the small
    // dormant window, which made the wake sequence effectively invisible.
    if (host.setMode && lastMode !== 'expanded') {
      lastMode = 'expanded';
      await host.setMode('expanded');
      await delay(135);
    }

    controller.open();
    state = controller.getState();
    setMotion('prewake');
    const fresh = renderInterface({ activateIds: new Set(['projecthub']) });
    await nextFrame();
    setMotion('waking');
    await activateRecords(fresh, 'wake');
    setMotion('ready');
    transitionLocked = false;
  }

  async function selectNode(id) {
    if (transitionLocked || !state.isOpen) return;
    const target = nodes[id];
    if (!target) return;
    const wedge = wedgeElement(id);

    transitionLocked = true;

    if (!target.children || target.children.length === 0) {
      setMotion('engaging');
      if (wedge) wedge.classList.add('engaging');
      await delay(250);
      controller.select(id);
      renderInterface();
      const selectedWedge = wedgeElement(id);
      if (selectedWedge) selectedWedge.classList.add('engaging');
      showToast(`${target.label.toUpperCase()} · mock action selected`);
      await delay(180);
      if (selectedWedge) selectedWedge.classList.remove('engaging');
      setMotion('ready');
      transitionLocked = false;
      return;
    }

    setMotion('locking');
    if (wedge) wedge.classList.add('locking');
    await delay(180);

    controller.select(id);
    state = controller.getState();
    const freshId = target.id;
    const fresh = renderInterface({ activateIds: new Set([freshId]) });
    setMotion('deploying');
    await activateRecords(fresh, 'branch');
    setMotion('ready');
    transitionLocked = false;
  }

  async function ascendOne() {
    if (transitionLocked || !state.isOpen) return;
    transitionLocked = true;

    const before = controller.getState();
    if (before.path.length <= 1) {
      await collapseLauncher();
      return;
    }

    const current = before.current;
    const currentRing = ringRegistry.get(current.id);

    setMotion('retracting');

    if (before.leaf) {
      const leafWedge = wedgeElement(current.id);
      if (leafWedge) leafWedge.classList.add('disengaging');
      await delay(230);
    } else if (currentRing && !currentRing.group.classList.contains('parked')) {
      currentRing.group.classList.add('retracting');
      await delay(390);
      currentRing.group.classList.add('parked');
      currentRing.group.classList.remove('retracting');
    } else {
      await delay(220);
    }

    controller.back();
    renderInterface();
    setMotion('ready');
    transitionLocked = false;
  }

  async function collapseLauncher() {
    if (!state.isOpen) return;
    transitionLocked = true;
    setMotion('collapsing');

    ringRegistry.forEach(record => {
      if (!record.group.classList.contains('parked')) record.group.classList.add('retracting');
    });

    await delay(520);
    controller.collapse();
    state = controller.getState();
    ringRegistry.forEach(record => {
      record.group.classList.remove('retracting', 'deploying');
      if (record.group.dataset.parentId !== 'projecthub') record.group.classList.add('parked');
    });
    renderInterface();
    setMotion('dormant');
    transitionLocked = false;
  }

  async function coreAction() {
    if (!state.isOpen) return summon();
    if (state.path.length > 1) return ascendOne();
    return collapseLauncher();
  }

  initializeSvg();
  renderInterface();
  setMotion('dormant');

  core.addEventListener('click', event => {
    event.stopPropagation();
    coreAction();
  });

  document.getElementById('demo-open').addEventListener('click', summon);
  document.getElementById('quit').addEventListener('click', () => host.quit ? host.quit() : window.close());

  launcher.addEventListener('click', event => {
    if (!state.isOpen || transitionLocked) return;
    if (event.target === launcher || event.target.classList.contains('environment') || event.target.classList.contains('vignette')) {
      collapseLauncher();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (state.isOpen) {
        event.preventDefault();
        state.path.length > 1 ? ascendOne() : collapseLauncher();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.code === 'Space') {
      event.preventDefault();
      summon();
    }
  });

  if (host.onSummon) host.onSummon(summon);
  if (host.onMode) host.onMode(modeName => {
    if (modeName === 'expanded') lastMode = 'expanded';
    if (modeName === 'dormant') {
      lastMode = 'dormant';
      if (controller.getState().isOpen && !transitionLocked) collapseLauncher();
    }
  });
  if (host.onHotkeyError) host.onHotkeyError(key => showToast(`Global shortcut unavailable: ${key}`));

  const params = new URLSearchParams(location.search);
  if (!window.launcherHost && params.get('open') === '1') {
    controller.open();
    const path = (params.get('path') || '').split('/').filter(Boolean);
    path.forEach(id => controller.select(id));
    state = controller.getState();
    renderInterface({ activateIds: new Set(state.levels.map(level => level.parentId)) });
    ringRegistry.forEach(record => record.group.classList.remove('parked', 'deploying', 'retracting'));
    setMotion('ready');
  }
}());
