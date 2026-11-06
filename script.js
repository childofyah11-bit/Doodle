(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const referenceCanvas = $('#referenceCanvas');
  const drawingCanvas = $('#drawingCanvas');
  const artboard = $('#artboard');
  const canvasScroll = $('#canvasScroll');
  const ref = referenceCanvas.getContext('2d', { willReadFrequently: true });
  const ctx = drawingCanvas.getContext('2d');
  const STORAGE_KEY = 'project-bob-sketch-v3';
  const MAX_HISTORY = 12;

  let sourceImage = null;
  let sourceData = '';
  let selectedTool = 'pencil';
  let isDrawing = false;
  let lastPoint = null;
  let history = [];
  let historyIndex = -1;
  let saveTimer;
  let toastTimer;
  let renderToken = 0;

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function setStatus(message) {
    const status = $('#saveStatus');
    if (status) status.textContent = message;
  }

  function saveSession() {
    setStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          width: drawingCanvas.width,
          height: drawingCanvas.height,
          drawing: drawingCanvas.toDataURL('image/png'),
          image: sourceData,
          opacity: $('#imageOpacity').value,
          mode: $('#imageMode').value,
          color: $('#brushColor').value,
          size: $('#brushSize').value,
          zoom: $('#zoomRange').value
        }));
        setStatus('Saved on this device');
      } catch (error) {
        // Storage quotas vary by browser. Drawing and export still work if autosave is unavailable.
        setStatus('Autosave unavailable — export to keep a copy');
      }
    }, 300);
  }

  function getSnapshot() {
    return ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
  }

  function resetHistory() {
    history = [getSnapshot()];
    historyIndex = 0;
    updateHistoryButtons();
  }

  function recordState() {
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(getSnapshot());
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $('#undoButton').disabled = historyIndex <= 0;
    $('#redoButton').disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    ctx.putImageData(history[index], 0, 0);
    updateHistoryButtons();
    saveSession();
  }

  function resizeCanvases(width, height, preserve = false) {
    const old = preserve && drawingCanvas.width ? document.createElement('canvas') : null;
    if (old) {
      old.width = drawingCanvas.width;
      old.height = drawingCanvas.height;
      old.getContext('2d').drawImage(drawingCanvas, 0, 0);
    }
    drawingCanvas.width = Math.max(1, Math.round(width));
    drawingCanvas.height = Math.max(1, Math.round(height));
    referenceCanvas.width = drawingCanvas.width;
    referenceCanvas.height = drawingCanvas.height;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (old) ctx.drawImage(old, 0, 0, drawingCanvas.width, drawingCanvas.height);
    updateArtboardSize();
    renderReference();
    resetHistory();
  }

  function updateArtboardSize() {
    const scale = Number($('#zoomRange').value) / 100 || 1;
    artboard.style.width = `${Math.round(drawingCanvas.width * scale)}px`;
    artboard.style.height = `${Math.round(drawingCanvas.height * scale)}px`;
    $('#zoomValue').value = `${Math.round(scale * 100)}%`;
  }

  function fitCanvas() {
    const availableWidth = Math.max(120, canvasScroll.clientWidth - 72);
    const availableHeight = Math.max(120, canvasScroll.clientHeight - 100);
    const scale = Math.min(availableWidth / drawingCanvas.width, availableHeight / drawingCanvas.height, 1);
    $('#zoomRange').value = String(Math.max(25, Math.min(200, Math.round(scale * 100))));
    updateArtboardSize();
  }

  function buildReferenceCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = referenceCanvas.width;
    canvas.height = referenceCanvas.height;
    const imageCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (sourceImage) imageCtx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function createOutline(imageData) {
    const { width, height, data } = imageData;
    const gray = new Float32Array(width * height);
    for (let p = 0, i = 0; i < data.length; p++, i += 4) {
      gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const output = ref.createImageData(width, height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        const gx = -gray[p - width - 1] + gray[p - width + 1] - 2 * gray[p - 1] + 2 * gray[p + 1] - gray[p + width - 1] + gray[p + width + 1];
        const gy = -gray[p - width - 1] - 2 * gray[p - width] - gray[p - width + 1] + gray[p + width - 1] + 2 * gray[p + width] + gray[p + width + 1];
        const i = p * 4;
        if (Math.hypot(gx, gy) > 85) {
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
    const base = buildReferenceCanvas();
    const imageCtx = base.getContext('2d', { willReadFrequently: true });
    let pixels;
    try {
      pixels = imageCtx.getImageData(0, 0, base.width, base.height);
    } catch (error) {
      toast('This image cannot be processed here. Try another image.');
      return;
    }
    if (mode === 'mono' || mode === 'enhance') {
      const data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        if (mode === 'mono') {
          const gray = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
          const shade = gray > 155 ? 255 : 40;
          data[i] = data[i + 1] = data[i + 2] = shade;
        } else {
          for (let channel = 0; channel < 3; channel++) data[i + channel] = Math.max(0, Math.min(255, (data[i + channel] - 128) * 1.3 + 128));
        }
      }
      imageCtx.putImageData(pixels, 0, 0);
    } else if (mode === 'outline') {
      imageCtx.putImageData(createOutline(pixels), 0, 0);
    }
    if (token !== renderToken) return;
    ref.globalAlpha = Number($('#imageOpacity').value) / 100;
    ref.drawImage(base, 0, 0);
    ref.globalAlpha = 1;
    const note = $('#modeNote');
    if (note) note.textContent = mode === 'outline' ? 'A local edge guide to help trace the main shapes.' : mode === 'mono' ? 'A simplified black-and-white reference.' : mode === 'enhance' ? 'Extra contrast makes details easier to see.' : 'A quiet guide layer under your drawing.';
    $('#opacityValue').value = `${$('#imageOpacity').value}%`;
  }

  function updateImageControls() {
    const hasImage = Boolean(sourceImage);
    $('#emptyState').hidden = hasImage;
    $('#referenceControls').hidden = !hasImage;
    $('#removeImageButton').hidden = !hasImage;
    $('#imageAction').textContent = hasImage ? 'Replace image' : 'Add an image';
  }

  function loadReference(dataUrl) {
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      sourceData = dataUrl;
      const ratio = Math.min(1, 1500 / image.width, 1200 / image.height);
      resizeCanvases(image.width * ratio, image.height * ratio);
      updateImageControls();
      fitCanvas();
      saveSession();
      toast('Image ready. Draw on the canvas to trace it.');
    };
    image.onerror = () => toast('Could not open that picture. Try PNG, JPG, or WebP.');
    image.src = dataUrl;
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please select an image file.');
    if (file.size > 12 * 1024 * 1024) return toast('Please use an image smaller than 12 MB.');
    const reader = new FileReader();
    reader.onload = () => loadReference(reader.result);
    reader.onerror = () => toast('Could not read that file. Please try again.');
    reader.readAsDataURL(file);
  }

  function getPoint(event) {
    const rect = drawingCanvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * drawingCanvas.width / rect.width, y: (event.clientY - rect.top) * drawingCanvas.height / rect.height };
  }

  function startStroke(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    drawingCanvas.setPointerCapture(event.pointerId);
    isDrawing = true;
    lastPoint = getPoint(event);
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = $('#brushColor').value;
    ctx.lineWidth = Number($('#brushSize').value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(lastPoint.x + 0.01, lastPoint.y + 0.01);
    ctx.stroke();
  }

  function continueStroke(event) {
    if (!isDrawing) return;
    const point = getPoint(event);
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = $('#brushColor').value;
    ctx.lineWidth = Number($('#brushSize').value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
  }

  function endStroke(event) {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
    recordState();
    saveSession();
    if (event && drawingCanvas.hasPointerCapture(event.pointerId)) drawingCanvas.releasePointerCapture(event.pointerId);
  }

  function clearDrawing() {
    const before = getSnapshot().data;
    let hasInk = false;
    for (let i = 3; i < before.length; i += 4) if (before[i] !== 0) { hasInk = true; break; }
    if (!hasInk) return toast('The drawing is already clear.');
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    recordState();
    saveSession();
    toast('Drawing cleared.');
  }

  function removeReference() {
    sourceImage = null;
    sourceData = '';
    ref.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    updateImageControls();
    saveSession();
    toast('Reference removed. Your drawing is still here.');
  }

  function exportDrawing() {
    const output = document.createElement('canvas');
    output.width = drawingCanvas.width;
    output.height = drawingCanvas.height;
    const out = output.getContext('2d');
    if (sourceImage && window.confirm('Include the reference image in the exported PNG? Select Cancel for a transparent drawing-only export.')) {
      const reference = buildReferenceCanvas();
      const imageCtx = reference.getContext('2d', { willReadFrequently: true });
      const mode = $('#imageMode').value;
      if (mode === 'outline' || mode === 'mono' || mode === 'enhance') {
        const pixels = imageCtx.getImageData(0, 0, reference.width, reference.height);
        if (mode === 'outline') imageCtx.putImageData(createOutline(pixels), 0, 0);
        else if (mode === 'mono') {
          for (let i = 0; i < pixels.data.length; i += 4) {
            const gray = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114;
            const value = gray > 155 ? 255 : 40;
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
          }
          imageCtx.putImageData(pixels, 0, 0);
        }
      }
      out.globalAlpha = Number($('#imageOpacity').value) / 100;
      out.drawImage(reference, 0, 0);
      out.globalAlpha = 1;
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
    $('#zoomRange').value = '100';
    resizeCanvases(900, 620);
    updateImageControls();
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
  $('#undoButton').addEventListener('click', () => restoreHistory(historyIndex - 1));
  $('#redoButton').addEventListener('click', () => restoreHistory(historyIndex + 1));
  $('#clearButton').addEventListener('click', clearDrawing);
  $('#fitButton').addEventListener('click', fitCanvas);
  $('#zoomRange').addEventListener('input', () => { updateArtboardSize(); saveSession(); });
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
  $('#imageOpacity').addEventListener('input', () => { renderReference(); saveSession(); });
  $('#imageMode').addEventListener('change', () => { renderReference(); saveSession(); });
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => chooseTool(button.dataset.tool)));
  drawingCanvas.addEventListener('pointerdown', startStroke);
  drawingCanvas.addEventListener('pointermove', continueStroke);
  drawingCanvas.addEventListener('pointerup', endStroke);
  drawingCanvas.addEventListener('pointercancel', endStroke);
  drawingCanvas.addEventListener('lostpointercapture', event => { if (isDrawing) endStroke(event); });
  document.addEventListener('keydown', event => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      restoreHistory(historyIndex + 1);
    } else if (!typing && event.key.toLowerCase() === 'b') chooseTool('pencil');
    else if (!typing && event.key.toLowerCase() === 'e') chooseTool('eraser');
  });
  canvasScroll.addEventListener('dragover', event => { event.preventDefault(); artboard.classList.add('drag-over'); });
  canvasScroll.addEventListener('dragleave', () => artboard.classList.remove('drag-over'));
  canvasScroll.addEventListener('drop', event => {
    event.preventDefault();
    artboard.classList.remove('drag-over');
    handleFile([...event.dataTransfer.files].find(file => file.type.startsWith('image/')));
  });
  window.addEventListener('resize', () => { if (Number($('#zoomRange').value) < 60) fitCanvas(); });

  function restoreSession() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (error) { saved = null; }
    if (!saved) {
      resizeCanvases(900, 620);
      updateImageControls();
      return;
    }
    $('#brushColor').value = saved.color || '#24211f';
    $('#brushSize').value = saved.size || '6';
    $('#brushSizeValue').value = `${$('#brushSize').value} px`;
    $('#imageOpacity').value = saved.opacity || '45';
    $('#imageMode').value = saved.mode || 'original';
    $('#zoomRange').value = saved.zoom || '100';
    const width = Math.min(1800, Math.max(1, Number(saved.width) || 900));
    const height = Math.min(1400, Math.max(1, Number(saved.height) || 620));

    const restoreDrawing = () => {
      resizeCanvases(width, height);
      const drawingImage = new Image();
      drawingImage.onload = () => {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        ctx.drawImage(drawingImage, 0, 0, drawingCanvas.width, drawingCanvas.height);
        resetHistory();
        updateImageControls();
        updateArtboardSize();
      };
      drawingImage.onerror = () => { updateImageControls(); toast('Autosave could not be restored. Start a new drawing.'); };
      if (saved.drawing) drawingImage.src = saved.drawing;
      else { updateImageControls(); resetHistory(); }
    };

    if (saved.image) {
      const image = new Image();
      image.onload = () => { sourceImage = image; sourceData = saved.image; restoreDrawing(); };
      image.onerror = () => { sourceImage = null; sourceData = ''; restoreDrawing(); };
      image.src = saved.image;
    } else {
      sourceImage = null;
      sourceData = '';
      restoreDrawing();
    }
  }

  try {
    restoreSession();
  } catch (error) {
    console.error('Project Bob startup error:', error);
    resizeCanvases(900, 620);
    updateImageControls();
    toast('The canvas had trouble starting. Reload the page to try again.');
  }
})();
