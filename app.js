(() => {
  'use strict';

  // -----------------------------
  // MathOrbit expression engine
  // -----------------------------
  // This is intentionally implemented without eval() and without a plotting library.
  // Expressions are tokenized, parsed into an AST, then evaluated numerically.

  const FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    exp: Math.exp,
    log: Math.log,
    ln: Math.log,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
  };

  const CONSTANTS = {
    pi: Math.PI,
    e: Math.E,
  };

  class Tokenizer {
    constructor(source) {
      this.source = source;
      this.index = 0;
      this.tokens = [];
    }

    tokenize() {
      while (this.index < this.source.length) {
        const ch = this.source[this.index];

        if (/\s/.test(ch)) {
          this.index += 1;
          continue;
        }

        if (/[0-9.]/.test(ch)) {
          this.tokens.push(this.readNumber());
          continue;
        }

        if (/[A-Za-z_]/.test(ch)) {
          this.tokens.push(this.readIdentifier());
          continue;
        }

        if ('+-*/^(),'.includes(ch)) {
          this.tokens.push({ type: ch, value: ch });
          this.index += 1;
          continue;
        }

        throw new Error(`Unexpected character “${ch}”`);
      }

      this.tokens.push({ type: 'EOF', value: null });
      return this.tokens;
    }

    readNumber() {
      const start = this.index;
      let sawDot = false;

      while (this.index < this.source.length) {
        const ch = this.source[this.index];
        if (ch === '.') {
          if (sawDot) break;
          sawDot = true;
          this.index += 1;
          continue;
        }
        if (!/[0-9]/.test(ch)) break;
        this.index += 1;
      }

      if (/[eE]/.test(this.source[this.index] || '')) {
        const exponentStart = this.index;
        this.index += 1;
        if (/[+-]/.test(this.source[this.index] || '')) this.index += 1;
        const digitStart = this.index;
        while (/[0-9]/.test(this.source[this.index] || '')) this.index += 1;
        if (digitStart === this.index) this.index = exponentStart;
      }

      const raw = this.source.slice(start, this.index);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`Invalid number “${raw}”`);
      return { type: 'NUMBER', value };
    }

    readIdentifier() {
      const start = this.index;
      while (/[A-Za-z0-9_]/.test(this.source[this.index] || '')) this.index += 1;
      return { type: 'IDENTIFIER', value: this.source.slice(start, this.index).toLowerCase() };
    }
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.index = 0;
    }

    parse() {
      const node = this.parseAddSub();
      if (!this.match('EOF')) throw new Error(`Unexpected token “${this.peek().value}”`);
      return node;
    }

    peek() {
      return this.tokens[this.index];
    }

    match(type) {
      return this.peek().type === type;
    }

    consume(type, message) {
      if (!this.match(type)) throw new Error(message || `Expected ${type}`);
      return this.tokens[this.index++];
    }

    parseAddSub() {
      let node = this.parseMulDiv();
      while (this.match('+') || this.match('-')) {
        const operator = this.tokens[this.index++].type;
        const right = this.parseMulDiv();
        node = { type: 'binary', operator, left: node, right };
      }
      return node;
    }

    parseMulDiv() {
      let node = this.parseUnary();
      while (this.match('*') || this.match('/')) {
        const operator = this.tokens[this.index++].type;
        const right = this.parseUnary();
        node = { type: 'binary', operator, left: node, right };
      }
      return node;
    }

    parseUnary() {
      if (this.match('+') || this.match('-')) {
        const operator = this.tokens[this.index++].type;
        return { type: 'unary', operator, argument: this.parseUnary() };
      }
      return this.parsePower();
    }

    parsePower() {
      let node = this.parsePrimary();
      if (this.match('^')) {
        this.index += 1;
        node = { type: 'binary', operator: '^', left: node, right: this.parseUnary() };
      }
      return node;
    }

    parsePrimary() {
      if (this.match('NUMBER')) {
        return { type: 'number', value: this.consume('NUMBER').value };
      }

      if (this.match('IDENTIFIER')) {
        const name = this.consume('IDENTIFIER').value;

        if (this.match('(')) {
          if (!FUNCTIONS[name]) throw new Error(`Unknown function “${name}”`);
          this.consume('(');
          const argument = this.parseAddSub();
          this.consume(')', 'Expected closing parenthesis')
          return { type: 'call', name, argument };
        }

        if (name === 'x') return { type: 'variable' };
        if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
          return { type: 'number', value: CONSTANTS[name] };
        }
        throw new Error(`Unknown symbol “${name}”`);
      }

      if (this.match('(')) {
        this.consume('(');
        const node = this.parseAddSub();
        this.consume(')', 'Expected closing parenthesis');
        return node;
      }

      throw new Error(`Expected a number, x, function, or parenthesis`);
    }
  }

  function evaluateNode(node, x) {
    switch (node.type) {
      case 'number': return node.value;
      case 'variable': return x;
      case 'unary': {
        const value = evaluateNode(node.argument, x);
        return node.operator === '-' ? -value : value;
      }
      case 'binary': {
        const left = evaluateNode(node.left, x);
        const right = evaluateNode(node.right, x);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '^': return Math.pow(left, right);
          default: return NaN;
        }
      }
      case 'call': return FUNCTIONS[node.name](evaluateNode(node.argument, x));
      default: return NaN;
    }
  }

  function normalizeExpression(input) {
    let source = input.trim();
    source = source.replace(/π/g, 'pi').replace(/[−–—]/g, '-');
    const yEquals = source.match(/^y\s*=\s*(.+)$/i);
    if (yEquals) source = yEquals[1];
    return source;
  }

  function compileExpression(input) {
    const source = normalizeExpression(input);
    if (!source) throw new Error('Enter an expression');
    const tokens = new Tokenizer(source).tokenize();
    const ast = new Parser(tokens).parse();
    return (x) => evaluateNode(ast, x);
  }

  // -----------------------------
  // Graph state + expression UI
  // -----------------------------

  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const expressionList = document.getElementById('expressionList');
  const expressionTemplate = document.getElementById('expressionTemplate');
  const cursorReadout = document.getElementById('cursorReadout');

  const COLORS = ['#38bdf8', '#fb7185', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#f97316'];
  let expressions = [];
  let nextExpressionId = 1;

  const view = {
    originX: 0,
    originY: 0,
    scale: 55,
    initialized: false,
  };

  const pointer = {
    dragging: false,
    id: null,
    lastX: 0,
    lastY: 0,
  };

  function addExpression(text = '') {
    const expression = {
      id: nextExpressionId++,
      text,
      color: COLORS[expressions.length % COLORS.length],
      visible: true,
      fn: null,
      error: null,
    };
    expressions.push(expression);
    renderExpressionRow(expression);
    compileAndRender(expression);
    saveExpressions();
  }

  function renderExpressionRow(expression) {
    const fragment = expressionTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.expression-row');
    const dot = fragment.querySelector('.visibility-dot');
    const input = fragment.querySelector('.expression-input');
    const status = fragment.querySelector('.expression-status');
    const deleteButton = fragment.querySelector('.delete-expression');

    row.dataset.id = expression.id;
    dot.style.background = expression.color;
    input.value = expression.text;

    input.addEventListener('input', () => {
      expression.text = input.value;
      compileAndRender(expression, status);
      saveExpressions();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        addExpression('');
        requestAnimationFrame(() => expressionList.lastElementChild?.querySelector('input')?.focus());
      }
    });

    dot.addEventListener('click', () => {
      expression.visible = !expression.visible;
      dot.classList.toggle('off', !expression.visible);
      draw();
      saveExpressions();
    });

    deleteButton.addEventListener('click', () => {
      expressions = expressions.filter((item) => item.id !== expression.id);
      row.remove();
      if (expressions.length === 0) addExpression('');
      draw();
      saveExpressions();
    });

    expressionList.appendChild(fragment);
    updateExpressionStatus(expression, status);
  }

  function compileAndRender(expression, statusElement) {
    try {
      expression.fn = compileExpression(expression.text);
      const testValue = expression.fn(0.123456789);
      if (typeof testValue !== 'number') throw new Error('Expression is not numeric');
      expression.error = null;
    } catch (error) {
      expression.fn = null;
      expression.error = error.message;
    }

    if (!statusElement) {
      statusElement = expressionList.querySelector(`[data-id="${expression.id}"] .expression-status`);
    }
    updateExpressionStatus(expression, statusElement);
    draw();
  }

  function updateExpressionStatus(expression, statusElement) {
    if (!statusElement) return;
    if (!expression.text.trim()) {
      statusElement.textContent = 'Type a function of x';
      statusElement.classList.remove('error');
      return;
    }
    if (expression.error) {
      statusElement.textContent = expression.error;
      statusElement.classList.add('error');
    } else {
      statusElement.textContent = 'Ready';
      statusElement.classList.remove('error');
    }
  }

  function saveExpressions() {
    try {
      localStorage.setItem('mathorbit-expressions', JSON.stringify(expressions.map(({ text, visible, color }) => ({ text, visible, color }))));
    } catch (_) {}
  }

  function loadExpressions() {
    try {
      const saved = JSON.parse(localStorage.getItem('mathorbit-expressions') || 'null');
      if (Array.isArray(saved) && saved.length) {
        saved.forEach((item) => {
          const expression = {
            id: nextExpressionId++,
            text: typeof item.text === 'string' ? item.text : '',
            color: item.color || COLORS[expressions.length % COLORS.length],
            visible: item.visible !== false,
            fn: null,
            error: null,
          };
          expressions.push(expression);
          renderExpressionRow(expression);
          const dot = expressionList.querySelector(`[data-id="${expression.id}"] .visibility-dot`);
          dot?.classList.toggle('off', !expression.visible);
          compileAndRender(expression);
        });
        return;
      }
    } catch (_) {}

    addExpression('sin(x)');
    addExpression('0.15*x^2 - 3');
  }

  // -----------------------------
  // Canvas graph renderer
  // -----------------------------

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!view.initialized) {
      view.originX = rect.width / 2;
      view.originY = rect.height / 2;
      view.initialized = true;
    }
    draw();
  }

  function canvasSize() {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function worldToScreen(x, y) {
    return {
      x: view.originX + x * view.scale,
      y: view.originY - y * view.scale,
    };
  }

  function screenToWorld(px, py) {
    return {
      x: (px - view.originX) / view.scale,
      y: (view.originY - py) / view.scale,
    };
  }

  function niceGridStep() {
    const desiredPixels = 85;
    const rawStep = desiredPixels / view.scale;
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3.5) niceFraction = 2;
    else if (fraction < 7.5) niceFraction = 5;
    else niceFraction = 10;
    return niceFraction * Math.pow(10, exponent);
  }

  function formatTick(value, step) {
    if (Math.abs(value) < step * 1e-7) return '0';
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    const bounded = Math.min(8, decimals + (step < 1 ? 0 : 0));
    return Number(value.toFixed(bounded)).toString();
  }

  function draw() {
    if (!view.initialized) return;
    const { width, height } = canvasSize();
    if (width <= 0 || height <= 0) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, 0, width, height);

    drawGrid(width, height);
    drawFunctions(width, height);
  }

  function drawGrid(width, height) {
    const step = niceGridStep();
    const left = screenToWorld(0, 0).x;
    const right = screenToWorld(width, 0).x;
    const top = screenToWorld(0, 0).y;
    const bottom = screenToWorld(0, height).y;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1b2940';
    ctx.fillStyle = '#72819a';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';

    const startX = Math.ceil(left / step) * step;
    for (let x = startX; x <= right + step * 0.5; x += step) {
      const sx = worldToScreen(x, 0).x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }

    const startY = Math.ceil(bottom / step) * step;
    for (let y = startY; y <= top + step * 0.5; y += step) {
      const sy = worldToScreen(0, y).y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
    }

    ctx.strokeStyle = '#6b7d99';
    ctx.lineWidth = 1.4;

    if (view.originY >= 0 && view.originY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, view.originY);
      ctx.lineTo(width, view.originY);
      ctx.stroke();
    }

    if (view.originX >= 0 && view.originX <= width) {
      ctx.beginPath();
      ctx.moveTo(view.originX, 0);
      ctx.lineTo(view.originX, height);
      ctx.stroke();
    }

    ctx.fillStyle = '#8292ab';
    const labelY = Math.min(height - 6, Math.max(14, view.originY + 16));
    for (let x = startX; x <= right + step * 0.5; x += step) {
      if (Math.abs(x) < step * 0.1) continue;
      const sx = worldToScreen(x, 0).x;
      ctx.fillText(formatTick(x, step), sx + 4, labelY);
    }

    const labelX = Math.min(width - 44, Math.max(6, view.originX + 7));
    for (let y = startY; y <= top + step * 0.5; y += step) {
      if (Math.abs(y) < step * 0.1) continue;
      const sy = worldToScreen(0, y).y;
      ctx.fillText(formatTick(y, step), labelX, sy - 4);
    }

    ctx.restore();
  }

  function drawFunctions(width, height) {
    const pixelStep = 1.25;
    const jumpThreshold = Math.max(180, height * 0.8);

    expressions.forEach((expression) => {
      if (!expression.visible || !expression.fn) return;

      ctx.save();
      ctx.strokeStyle = expression.color;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      let hasSegment = false;
      let lastY = null;

      for (let px = 0; px <= width + pixelStep; px += pixelStep) {
        const x = (px - view.originX) / view.scale;
        let y;
        try {
          y = expression.fn(x);
        } catch (_) {
          y = NaN;
        }

        if (!Number.isFinite(y)) {
          hasSegment = false;
          lastY = null;
          continue;
        }

        const py = view.originY - y * view.scale;
        if (!Number.isFinite(py) || Math.abs(py) > 1e7) {
          hasSegment = false;
          lastY = null;
          continue;
        }

        if (!hasSegment || lastY === null || Math.abs(py - lastY) > jumpThreshold) {
          ctx.moveTo(px, py);
          hasSegment = true;
        } else {
          ctx.lineTo(px, py);
        }
        lastY = py;
      }

      ctx.stroke();
      ctx.restore();
    });
  }

  function zoomAt(factor, screenX, screenY) {
    const before = screenToWorld(screenX, screenY);
    view.scale = Math.min(10000, Math.max(8, view.scale * factor));
    view.originX = screenX - before.x * view.scale;
    view.originY = screenY + before.y * view.scale;
    draw();
  }

  function resetView() {
    const { width, height } = canvasSize();
    view.scale = 55;
    view.originX = width / 2;
    view.originY = height / 2;
    draw();
  }

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const factor = Math.exp(-event.deltaY * 0.0012);
    zoomAt(factor, x, y);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (event) => {
    pointer.dragging = true;
    pointer.id = event.pointerId;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const world = screenToWorld(localX, localY);
    cursorReadout.textContent = `x = ${world.x.toFixed(3)}, y = ${world.y.toFixed(3)}`;

    if (!pointer.dragging || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    view.originX += dx;
    view.originY += dy;
    draw();
  });

  function stopDragging(event) {
    if (event.pointerId !== pointer.id) return;
    pointer.dragging = false;
    pointer.id = null;
    canvas.classList.remove('dragging');
  }

  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);

  document.getElementById('zoomInBtn').addEventListener('click', () => {
    const { width, height } = canvasSize();
    zoomAt(1.35, width / 2, height / 2);
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const { width, height } = canvasSize();
    zoomAt(1 / 1.35, width / 2, height / 2);
  });

  document.getElementById('centerBtn').addEventListener('click', resetView);
  document.getElementById('homeViewBtn').addEventListener('click', resetView);

  document.getElementById('addExpressionBtn').addEventListener('click', () => {
    addExpression('');
    requestAnimationFrame(() => expressionList.lastElementChild?.querySelector('input')?.focus());
  });

  document.querySelectorAll('.example-chip').forEach((button) => {
    button.addEventListener('click', () => {
      addExpression(button.dataset.expression || '');
      requestAnimationFrame(() => expressionList.lastElementChild?.querySelector('input')?.focus());
    });
  });

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas.parentElement);
  window.addEventListener('resize', resizeCanvas);

  loadExpressions();
  resizeCanvas();
})();
