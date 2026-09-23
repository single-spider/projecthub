(function () {
  'use strict';

  document.documentElement.classList.toggle('desktop-host', !!window.launcherHost);

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

  const supplied = window.LauncherData && (window.LauncherData.root || window.LauncherData.MOCK_ROOT);
  if (!supplied || !window.LauncherTree || !window.LauncherTree.createController) {
    throw new Error('Launcher data/controller unavailable');
  }
  const controller = window.LauncherTree.createController(supplied);
  let state = controller.getState();
  let lastMode = null;
  let toastTimer = null;

  const nodes = Object.create(null);
  (function index(node) {
    nodes[node.id] = node;
    (node.children || []).forEach(index);
  }(supplied));

  const ringGeometry = [
    { r1: 184, r2: 286 },
    { r1: 304, r2: 384 },
    { r1: 402, r2: 478 }
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function polar(r, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return { x: 500 + r * Math.cos(radians), y: 500 + r * Math.sin(radians) };
  }

  function arcPath(radius, start, end) {
    const a = polar(radius, start), b = polar(radius, end);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }

  function wedgePath(r1, r2, start, end) {
    const p1 = polar(r1, start), p2 = polar(r1, end), p3 = polar(r2, end), p4 = polar(r2, start);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${r1} ${r1} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${r2} ${r2} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  function iconMarkup(name) {
    const common = 'viewBox="0 0 24 24" aria-hidden="true"';
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
    return `<svg ${common}>${icons[name] || icons.diamond}</svg>`;
  }

  function svgIcon(name, x, y, scale) {
    const markup = iconMarkup(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const s = scale || 1;
    return `<g class="wedge-icon" transform="translate(${(x - 12*s).toFixed(2)} ${(y - 12*s).toFixed(2)}) scale(${s})">${markup}</g>`;
  }

  function startAngle(parentId, count, depth) {
    if (parentId === 'projecthub') return -30;
    if (parentId === 'development') return -45;
    if (parentId === 'development-moneycontrol' || parentId === 'moneycontrol-tools') return -108;
    if (parentId === 'capture') return -45;
    if (parentId === 'capture-idea') return -45;
    if (parentId === 'ai') return -54;
    if (parentId === 'ai-ask') return -60;
    return -(180 / Math.max(1, count)) + (depth * 9);
  }

  function defs() {
    return `
      <defs>
        <pattern id="steelPattern" patternUnits="userSpaceOnUse" width="280" height="280" patternTransform="rotate(-18)">
          <image href="../assets/steel-silver.webp" x="0" y="0" width="280" height="280" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <pattern id="steelDarkPattern" patternUnits="userSpaceOnUse" width="260" height="260" patternTransform="rotate(22)">
          <image href="../assets/steel-dark.webp" x="0" y="0" width="260" height="260" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <linearGradient id="plateShade" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".36"/>
          <stop offset=".18" stop-color="#ffffff" stop-opacity=".06"/>
          <stop offset=".52" stop-color="#000000" stop-opacity=".06"/>
          <stop offset="1" stop-color="#000000" stop-opacity=".58"/>
        </linearGradient>
        <linearGradient id="plateSheen" x1="0" y1="0" x2="1" y2=".5">
          <stop offset="0" stop-color="#dce7eb" stop-opacity=".02"/>
          <stop offset=".42" stop-color="#ffffff" stop-opacity=".46"/>
          <stop offset=".48" stop-color="#ffffff" stop-opacity=".05"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="amberWash" cx="50%" cy="20%" r="85%">
          <stop offset="0" stop-color="#ffd68e" stop-opacity=".26"/>
          <stop offset=".5" stop-color="#d2852e" stop-opacity=".18"/>
          <stop offset="1" stop-color="#48260f" stop-opacity=".35"/>
        </radialGradient>
        <filter id="plateShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
          <feOffset in="blur" dy="8" result="off"/>
          <feColorMatrix in="off" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .78 0" result="shadow"/>
          <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="amberGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="fastenerShadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#000" flood-opacity=".9"/>
        </filter>
      </defs>`;
  }

  function decorations() {
    const arcs = [
      [494, -15, 32, false], [494, 49, 102, false], [494, 122, 175, false], [494, 196, 247, false], [494, 269, 318, false],
      [395, -18, 24, false], [395, 74, 111, false], [395, 164, 201, false], [395, 252, 293, false],
      [294, -12, 18, true], [294, 108, 129, false], [294, 226, 247, false]
    ];
    return `<g class="decorations">${arcs.map(a => `<path class="decor-arc${a[3] ? ' hot' : ''}" d="${arcPath(a[0], a[1], a[2])}"/>`).join('')}</g>`;
  }

  function renderRing(level, visibleDepth) {
    const geometry = ringGeometry[visibleDepth];
    const children = level.children || [];
    if (!geometry || !children.length) return '';
    const count = Math.min(children.length, 10);
    const gap = visibleDepth === 0 ? 5.2 : visibleDepth === 1 ? 4.2 : 3.4;
    const span = 360 / count;
    const start = startAngle(level.parentId, count, visibleDepth);
    const ringClass = `ring depth-${visibleDepth}`;
    let html = `<g class="${ringClass}" data-parent-id="${esc(level.parentId)}">`;

    children.slice(0, count).forEach((node, i) => {
      const a1 = start + i * span + gap / 2;
      const a2 = start + (i + 1) * span - gap / 2;
      const mid = (a1 + a2) / 2;
      const d = wedgePath(geometry.r1, geometry.r2, a1, a2);
      const labelR = (geometry.r1 + geometry.r2) / 2;
      const iconP = polar(labelR - (visibleDepth === 0 ? 13 : 10), mid);
      const labelP = polar(labelR + (visibleDepth === 0 ? 22 : 19), mid);
      const selected = level.selectedId === node.id;
      const hoverDistance = visibleDepth === 0 ? 9 : 7;
      const direction = polar(hoverDistance, mid);
      const dx = direction.x - 500, dy = direction.y - 500;
      const muted = level.selectedId && !selected;
      const fastener1 = polar(geometry.r1 + 13, mid);
      const fastener2 = polar(geometry.r2 - 13, mid);
      const iconScale = visibleDepth === 0 ? 1.35 : visibleDepth === 1 ? 1.15 : 1.0;
      html += `
        <g class="wedge${selected ? ' selected' : ''}${muted ? ' sibling-muted' : ''}"
           data-node-id="${esc(node.id)}" tabindex="0" role="button" aria-label="${esc(node.label)}"
           style="--hover-x:${dx.toFixed(2)}px;--hover-y:${dy.toFixed(2)}px">
          <path class="plate-under" d="${d}"/>
          <path class="plate-face" d="${d}"/>
          <path class="plate-shade" d="${d}"/>
          <path class="plate-sheen" d="${d}"/>
          <path class="plate-edge" d="${d}"/>
          <path class="plate-inner-edge" d="${d}"/>
          <path class="plate-active" d="${d}"/>
          <circle class="fastener" cx="${fastener1.x.toFixed(2)}" cy="${fastener1.y.toFixed(2)}" r="5.1"/>
          <circle class="fastener-core" cx="${fastener1.x.toFixed(2)}" cy="${fastener1.y.toFixed(2)}" r="1.7"/>
          <circle class="fastener" cx="${fastener2.x.toFixed(2)}" cy="${fastener2.y.toFixed(2)}" r="5.1"/>
          <circle class="fastener-core" cx="${fastener2.x.toFixed(2)}" cy="${fastener2.y.toFixed(2)}" r="1.7"/>
          ${svgIcon(node.icon || 'diamond', iconP.x, iconP.y, iconScale)}
          <text class="wedge-label" x="${labelP.x.toFixed(2)}" y="${labelP.y.toFixed(2)}">${esc(node.label)}</text>
          ${selected ? `<path class="selection-trace" d="${arcPath(geometry.r2 - 3, a1 + 3, a2 - 3)}"/>` : ''}
        </g>`;
    });

    if (level.selectedId) {
      const selectedIndex = children.findIndex(n => n.id === level.selectedId);
      if (selectedIndex >= 0) {
        const mid = start + (selectedIndex + .5) * span;
        const p1 = polar(geometry.r2 + 5, mid);
        const next = ringGeometry[visibleDepth + 1];
        if (next) {
          const p2 = polar(next.r1 - 5, mid);
          html += `<line class="connector-line" x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}"/><circle class="connector-node" cx="${p1.x.toFixed(2)}" cy="${p1.y.toFixed(2)}" r="4"/>`;
        }
      }
    }
    html += '</g>';
    return html;
  }

  function currentDisplayNode() {
    return state.current || supplied;
  }

  function render() {
    state = controller.getState();
    launcher.classList.toggle('dormant', !state.isOpen);
    launcher.classList.toggle('expanded', !!state.isOpen);
    launcher.classList.toggle('deep', state.path.length > 2);
    statusText.textContent = state.isOpen ? `DEPTH ${Math.max(1, state.path.length)}` : 'DORMANT';

    const current = currentDisplayNode();
    coreLabel.textContent = (current.label || 'ProjectHub').toUpperCase();
    coreHint.textContent = state.isOpen ? (state.path.length > 1 ? 'BACK' : 'ROOT') : 'SUMMON';
    core.setAttribute('aria-label', state.isOpen ? (state.path.length > 1 ? 'Back one level' : 'Collapse ProjectHub') : 'Summon ProjectHub');

    const levels = (state.levels || []).slice(-3);
    let markup = defs() + decorations();
    levels.forEach((level, index) => { markup += renderRing(level, index); });
    svg.innerHTML = markup;

    svg.querySelectorAll('.wedge').forEach(el => {
      const id = el.dataset.nodeId;
      const node = nodes[id];
      el.addEventListener('mouseenter', () => showContext(node, 'HOVER'));
      el.addEventListener('mouseleave', () => showContext(currentDisplayNode(), state.leaf ? 'ACTION' : 'READY'));
      el.addEventListener('focus', () => showContext(node, 'FOCUS'));
      el.addEventListener('click', event => {
        event.stopPropagation();
        const target = nodes[id];
        controller.select(id);
        state = controller.getState();
        render();
        if (target && (!target.children || !target.children.length)) {
          showToast(`${target.label.toUpperCase()} · mock action selected`);
        }
      });
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      });
    });

    renderCrumbs();
    if (state.isOpen) showContext(current, state.leaf ? 'ACTION' : 'READY');
    else context.hidden = true;
    notifyHost();
  }

  function renderCrumbs() {
    const pathNodes = state.path.map(id => nodes[id]).filter(Boolean);
    crumbs.innerHTML = pathNodes.map((node, index) => {
      const sep = index < pathNodes.length - 1 ? '<span class="sep">/</span>' : '';
      return `<button class="crumb${index === pathNodes.length - 1 ? ' active' : ''}" data-depth="${index}">${esc(node.label.toUpperCase())}</button>${sep}`;
    }).join('');
    crumbs.querySelectorAll('.crumb').forEach(button => {
      button.addEventListener('click', () => {
        const depth = Number(button.dataset.depth);
        while (controller.getState().path.length > depth + 1) controller.back();
        render();
      });
    });
  }

  function showContext(node, mode) {
    if (!state.isOpen || !node) { context.hidden = true; return; }
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
    const mode = state.isOpen ? 'expanded' : 'dormant';
    if (mode !== lastMode && host.setMode) {
      host.setMode(mode);
      lastMode = mode;
    }
    if (host.setPointerInteractive) host.setPointerInteractive(true);
  }

  function summon() {
    controller.open();
    render();
  }

  core.addEventListener('click', event => {
    event.stopPropagation();
    if (!state.isOpen) controller.open();
    else controller.back();
    render();
  });

  document.getElementById('demo-open').addEventListener('click', summon);
  document.getElementById('quit').addEventListener('click', () => host.quit ? host.quit() : window.close());

  launcher.addEventListener('click', event => {
    if (!state.isOpen) return;
    if (event.target === launcher || event.target.classList.contains('environment') || event.target.classList.contains('vignette')) {
      controller.collapse();
      render();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (state.isOpen) { controller.back(); render(); }
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.code === 'Space') {
      event.preventDefault();
      summon();
    }
  });

  if (host.onSummon) host.onSummon(summon);
  if (host.onMode) host.onMode(mode => {
    if (mode === 'expanded' && !controller.getState().isOpen) controller.open();
    if (mode === 'dormant' && controller.getState().isOpen) controller.collapse();
    render();
  });
  if (host.onHotkeyError) host.onHotkeyError(key => showToast(`Global shortcut unavailable: ${key}`));

  render();

  const params = new URLSearchParams(location.search);
  if (!window.launcherHost && params.get('open') === '1') {
    controller.open();
    const path = (params.get('path') || '').split('/').filter(Boolean);
    path.forEach(id => controller.select(id));
    render();
  }
}());
