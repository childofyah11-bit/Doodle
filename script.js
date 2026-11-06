(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const referenceCanvas = $('#referenceCanvas');
  const drawingCanvas = $('#drawingCanvas');
  const ref = referenceCanvas.getContext('2d', { willReadFrequently: true });
  const ctx = drawingCanvas.getContext('2d');
  const artboard = $('#artboard');
  const canvasScroll = $('#canvasScroll');
  const HISTORY_LIMIT = 18;
  const STORAGE_KEY = 'project-bob-sketch-v3';

  let sourceImage = null;
  let sourceData = '';
  let selectedTool = 'pencil';
  let drawing = false;
  let lastPoint = null;
  let history = [];
  let historyIndex = -1;
  let saveTimer = null;
  let toastTimer = null;
  let renderToken = 0;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  function setStatus(message = 'Saved on this device') {
    $('#saveStatus').textContent = message;
  }

  function saveSession() {
    setStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const payload = {
          width: drawingCanvas.width,
          height: drawingCanvas.height,
          drawing: drawingCanvas.toDataURL('image/png'),
          image: sourceData,
          opacity: $('#imageOpacity').value,
          mode: $('#imageMode').value,
          color: $('#brushColor').value,
          size: $('#brushSize').value,
          zoom: $('#zoomRange').value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setStatus('Saved on this device');
      } catch (error) {
        setStatus('Export to keep a copy');
      }
    }, 350);
  }

  function snapshot() {
    return ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
  }

  function resetHistory() {
    history = [snapshot()];
    historyIndex = 0;
    updateHistoryButtons();
  }

  function commitHistory(before) {
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(before);
    history.push(snapshot());
    history = history.slice(-HISTORY_LIMIT);
    // Store complete states; the previous state was already in the list, so remove duplicate entries.
    const compact = [];
    for (let i = 0; i < history.length; i++) {
      if (i === 0 || i % 2 === 0) compact.push(history[i]);
    }
    history = compact;
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $('#undoButton').disabled = historyIndex <= 0;
    $('#redoButton').disabled = historyIndex >= history.length - 1;
  }

  function restoreState(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    ctx.putImageData(history[historyIndex], 0, 0);
    updateHistoryButtons();
    saveSession();
  }

  function undo() { restoreState(historyIndex - 1); }
  function redo() { restoreState(historyIndex + 1); }

  function resizeCanvases(width, height, keepDrawing = false) {
    const old = keepDrawing && drawingCanvas.width ? document.createElement('canvas') : null;
    if (old) {
      old.width = drawingCanvas.width;
      old.height = drawingCanvas.height;
      old.getContext('2d').drawImage(drawingCanvas, 0, 0);
    }
    drawingCanvas.width = width;
    drawingCanvas.height = height;
    referenceCanvas.width = width;
    referenceCanvas.height = height;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (old) ctx.drawImage(old, 0, 0, width, height);
    $('#emptyState').hidden = Boolean(sourceImage);
    $('#referenceControls').hidden = !sourceImage;
    $('#removeImageButton').hidden = !sourceImage;
    $('#imageAction').textContent = sourceImage ? 'Replace image' : 'Add an image';
    resetHistory();
    updateArtboardSize();
    renderReference();
  }

  function updateArtboardSize() {
    const zoom = Number($('#zoomRange').value) / 100;
    artboard.style.width = `${Math.round(drawingCanvas.width * zoom)}px`;
    artboard.style.height = `${Math.round(drawingCanvas.height * zoom)}px`;
    $('#zoomValue').value = `${Math.round(zoom * 100)}%`;
  }

  function fitCanvas() {
    const pad = 72;
    const scale = Math.min((canvasScroll.clientWidth - pad) / drawingCanvas.width, (canvasScroll.clientHeight - pad - 30) / drawingCanvas.height, 1);
    const percent = Math.max(25, Math.min(200, Math.round(scale * 100)));
    $('#zoomRange').value = String(percent);
    updateArtboardSize();
  }

  function drawImageBase(canvas) {
    if (!sourceImage) return;
    const c = canvas.getContext('2d', { willReadFrequently: true });
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  }

  function makeOutline(imageData) {
    const { width, height, data } = imageData;
    const gray = new Float32Array(width * height);
    for (let p = 0, i = 0; i < data.length; p++, i += 4) {
      gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const output = ref.createImageData(width, height);
    const threshold = 86;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        const gx = -gray[p - width - 1] + gray[p - width + 1] - 2 * gray[p - 1] + 2 * gray[p + 1] - gray[p + width - 1] + gray[p + width + 1];
        const gy = -gray[p - width - 1] - 2 * gray[p - width] - gray[p - width + 1] + gray[p + width - 1] + 2 * gray[p + width] + gray[p + width + 1];
        const i = p * 4;
        if (Math.hypot(gx, gy) >= threshold) {
          output.data[i] = 45; output.data[i + 1] = 42; output.data[i + 2] = 37; output.data[i + 3] = 255;
        }
      }
    }
    return output;
  }

  function renderReference() {
    const token = ++renderToken;
    ref.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    if (!sourceImage) return;
    const mode = $('#imageMode').value;
    $('#modeNote').textContent = mode === 'outline' ? 'A local edge guide to help you trace the main shapes.' : mode === 'mono' ? 'A simplified black-and-white reference.' : mode === 'enhance' ? 'More contrast for details that are hard to see.' : 'A quiet guide layer under your drawing.';
    $('#opacityValue').value = `${$('#imageOpacity').value}%`;
    const base = document.createElement('canvas');
    base.width = referenceCanvas.width;
    base.height = referenceCanvas.height;
    drawImageBase(base);
    const imageCtx = base.getContext('2d', { willReadFrequently: true });
    let pixels;
    try { pixels = imageCtx.getImageData(0, 0, base.width, base.height); }
    catch (error) { toast('This image cannot be processed in this browser.'); return; }
    if (mode === 'mono' || mode === 'enhance') {
      const d = pixels.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
        if (mode === 'mono') {
          const value = gray > 155 ? 255 : 40;
          d[i] = d[i + 1] = d[i + 2] = value;
        } else {
          for (let channel = 0; channel < 3; channel++) d[i + channel] = Math.max(0, Math.min(255, (d[i + channel] - 128) * 1.3 + 128));
        }
      }
      imageCtx.putImageData(pixels, 0, 0);
    } else if (mode === 'outline') {
      imageCtx.putImageData(makeOutline(pixels), 0, 0);
    }
    if (token !== renderToken) return;
    ref.globalAlpha = Number($('#imageOpacity').value) / 100;
    ref.drawImage(base, 0, 0);
    ref.globalAlpha = 1;
  }

  function loadReference(dataUrl) {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      sourceData = dataUrl;
      const scale = Math.min(1, 1500 / img.width, 1200 / img.height);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      resizeCanvases(width, height, false);
      $('#emptyState').hidden = true;
      $('#referenceControls').hidden = false;
      $('#removeImageButton').hidden = false;
      $('#imageAction').textContent = 'Replace image';
      fitCanvas();
      saveSession();
      toast('Reference added. Start tracing!');
    };
    img.onerror = () => toast('Could not open that image. Try a PNG, JPG, or WebP.');
    img.src = dataUrl;
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Choose an image file to use as a reference.'); return; }
    if (file.size > 12 * 1024 * 1024) { toast('That image is large. Please choose one under 12 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => loadReference(reader.result);
    reader.onerror = () => toast('Could not read that file. Please try again.');
    reader.readAsDataURL(file);
  }

  function pointerPosition(event) {
    const rect = drawingCanvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * drawingCanvas.width / rect.width, y: (event.clientY - rect.top) * drawingCanvas.height / rect.height };
  }

  function startStroke(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    drawingCanvas.setPointerCapture(event.pointerId);
    drawing = true;
    lastPoint = pointerPosition(event);
    const before = snapshot();
    drawingCanvas.dataset.beforeStroke = 'ready';
    drawingCanvas._beforeStroke = before;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(lastPoint.x + 0.01, lastPoint.y + 0.01);
    ctx.lineWidth = Number($('#brushSize').value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    ctx.strokeStyle = $('#brushColor').value;
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.stroke();
  }

  function continueStroke(event) {
    if (!drawing) return;
    const point = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.lineWidth = Number($('#brushSize').value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    ctx.strokeStyle = $('#brushColor').value;
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.stroke();
    lastPoint = point;
  }

  function endStroke(event) {
    if (!drawing) return;
    drawing = false;
    ctx.globalCompositeOperation = 'source-over';
    const before = drawingCanvas._beforeStroke;
    if (before) {
      if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
      history.push(snapshot());
      if (history.length > HISTORY_LIMIT) history.shift();
      historyIndex = history.length - 1;
      updateHistoryButtons();
      saveSession();
    }
    drawingCanvas._beforeStroke = null;
    if (drawingCanvas.hasPointerCapture(event.pointerId)) drawingCanvas.releasePointerCapture(event.pointerId);
  }

  function clearDrawing() {
    if (!drawingCanvas.width) return;
    if (!ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data.some((value, index) => index % 4 === 3 && value !== 0)) {
      toast('The drawing is already clear.'); return;
    }
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    history.push(snapshot());
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
    saveSession();
    toast('Drawing cleared.');
  }

  function removeReference() {
    sourceImage = null;
    sourceData = '';
    ref.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    $('#referenceControls').hidden = true;
    $('#removeImageButton').hidden = true;
    $('#imageAction').textContent = 'Add an image';
    $('#emptyState').hidden = false;
    saveSession();
    toast('Reference removed. Your drawing is still here.');
  }

  function exportDrawing() {
    const output = document.createElement('canvas');
    output.width = drawingCanvas.width;
    output.height = drawingCanvas.height;
    const out = output.getContext('2d');
    const includeReference = sourceImage && window.confirm('Include the reference image in the exported PNG? Choose Cancel for a transparent drawing-only export.');
    if (includeReference) {
      const temp = document.createElement('canvas');
      temp.width = referenceCanvas.width;
      temp.height = referenceCanvas.height;
      const oldAlpha = ref.globalAlpha;
      ref.globalAlpha = 1;
      renderReference();
      temp.getContext('2d').drawImage(referenceCanvas, 0, 0);
      ref.globalAlpha = oldAlpha;
      out.drawImage(temp, 0, 0);
      renderReference();
    }
    out.drawImage(drawingCanvas, 0, 0);
    const link = document.createElement('a');
    link.download = 'project-bob-sketch.png';
    link.href = output.toDataURL('image/png');
    link.click();
    toast('Your PNG is ready.');
  }

  function newCanvas() {
    if (!window.confirm('Start a new blank canvas? Your current sketch will be replaced.')) return;
    sourceImage = null;
    sourceData = '';
    $('#imageMode').value = 'original';
    $('#imageOpacity').value = '45';
    resizeCanvases(900, 620, false);
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    $('#emptyState').hidden = false;
    $('#referenceControls').hidden = true;
    $('#removeImageButton').hidden = true;
    $('#imageAction').textContent = 'Add an image';
    $('#zoomRange').value = '100';
    updateArtboardSize();
    saveSession();
    toast('Fresh canvas, fresh start.');
  }

  function chooseTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('selected', button.dataset.tool === tool));
    drawingCanvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
  }

  $('#addImageButton').addEventListener('click', () => $('#imageInput').click());
  $('#uploadCard').addEventListener('click', () => $('#imageInput').click());
  $('#imageInput').addEventListener('change', event => { handleFile(event.target.files[0]); event.target.value = ''; });
  $('#removeImageButton').addEventListener('click', removeReference);
  $('#newButton').addEventListener('click', newCanvas);
  $('#exportButton').addEventListener('click', exportDrawing);
  $('#undoButton').addEventListener('click', undo);
  $('#redoButton').addEventListener('click', redo);
  $('#clearButton').addEventListener('click', clearDrawing);
  $('#fitButton').addEventListener('click', fitCanvas);
  $('#zoomRange').addEventListener('input', updateArtboardSize);
  $('#brushSize').addEventListener('input', () => { $('#brushSizeValue').value = `${$('#brushSize').value} px`; saveSession(); });
  $('#brushColor').addEventListener('input', () => {
    document.querySelectorAll('.swatch').forEach(button => button.classList.toggle('active', button.dataset.color.toLowerCase() === $('#brushColor').value.toLowerCase()));
    $('#colorName').textContent = 'Custom';
    saveSession();
  });
  document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => {
    $('#brushColor').value = button.dataset.color;
    $('#colorName').textContent = ({ '#24211f': 'Ink', '#e35d42': 'Tomato', '#3f72c5': 'Blue', '#418a68': 'Leaf', '#e0a52e': 'Ochre' })[button.dataset.color] || 'Custom';
    document.querySelectorAll('.swatch').forEach(item => item.classList.toggle('active', item === button));
    saveSession();
  }));
  $('#imageOpacity').addEventListener('input', () => { $('#opacityValue').value = `${$('#imageOpacity').value}%`; renderReference(); saveSession(); });
  $('#imageMode').addEventListener('change', () => { renderReference(); saveSession(); });
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => chooseTool(button.dataset.tool)));
  drawingCanvas.addEventListener('pointerdown', startStroke);
  drawingCanvas.addEventListener('pointermove', continueStroke);
  drawingCanvas.addEventListener('pointerup', endStroke);
  drawingCanvas.addEventListener('pointercancel', endStroke);
  drawingCanvas.addEventListener('lostpointercapture', event => { if (drawing) endStroke(event); });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault(); redo();
    } else if (!isTyping && event.key.toLowerCase() === 'b') chooseTool('pencil');
    else if (!isTyping && event.key.toLowerCase() === 'e') chooseTool('eraser');
  });
  canvasScroll.addEventListener('dragover', event => { event.preventDefault(); artboard.classList.add('drag-over'); });
  canvasScroll.addEventListener('dragleave', () => artboard.classList.remove('drag-over'));
  canvasScroll.addEventListener('drop', event => {
    event.preventDefault(); artboard.classList.remove('drag-over');
    handleFile([...event.dataTransfer.files].find(file => file.type.startsWith('image/')));
  });
  window.addEventListener('resize', () => { if (Number($('#zoomRange').value) < 100) fitCanvas(); });

  function restoreSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) {
        resizeCanvases(900, 620, false);
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        resetHistory();
        return;
      }
      $('#brushColor').value = saved.color || '#24211f';
      $('#brushSize').value = saved.size || '6';
      $('#brushSizeValue').value = `${$('#brushSize').value} px`;
      $('#imageOpacity').value = saved.opacity || '45';
      $('#imageMode').value = saved.mode || 'original';
      $('#zoomRange').value = saved.zoom || '100';
      if (saved.image) {
        const img = new Image();
        img.onload = () => {
          sourceImage = img; sourceData = saved.image;
          resizeCanvases(saved.width || 900, saved.height || 620, false);
          const drawing = new Image();
          drawing.onload = () => {
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            ctx.drawImage(drawing, 0, 0, drawingCanvas.width, drawingCanvas.height);
            resetHistory();
            renderReference();
            updateArtboardSize();
          };
          drawing.src = saved.drawing;
        };
        img.onerror = () => { localStorage.removeItem(STORAGE_KEY); resizeCanvases(900, 620, false); };
        img.src = saved.image;
      } else if (saved.drawing) {
        const drawing = new Image();
        drawing.onload = () => {
          resizeCanvases(drawing.width || saved.width || 900, drawing.height || saved.height || 620, false);
          ctx.drawImage(drawing, 0, 0, drawingCanvas.width, drawingCanvas.height);
          resetHistory();
          $('#emptyState').hidden = true;
          updateArtboardSize();
        };
        drawing.src = saved.drawing;
      } else {
        resizeCanvases(saved.width || 900, saved.height || 620, false);
        resetHistory();
      }
    } catch (error) {
      resizeCanvases(900, 620, false);
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      resetHistory();
      setStatus('Autosave unavailable');
    }
  }

  restoreSession();
})();
