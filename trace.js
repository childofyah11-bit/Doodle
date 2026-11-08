(() => {
  'use strict';

  const referenceCanvas = document.querySelector('#referenceCanvas');
  const drawingCanvas = document.querySelector('#drawingCanvas');
  const referenceContext = referenceCanvas.getContext('2d');
  const drawingContext = drawingCanvas.getContext('2d');
  const imageInput = document.querySelector('#imageInput');
  const opacityInput = document.querySelector('#opacity');
  const brushSizeInput = document.querySelector('#brushSize');
  const brushColorInput = document.querySelector('#brushColor');
  const emptyState = document.querySelector('#emptyState');
  const status = document.querySelector('#status');
  let isDrawing = false;
  let lastPoint = null;
  let mode = 'pencil';

  drawingContext.lineCap = 'round';
  drawingContext.lineJoin = 'round';

  function announce(message) {
    status.textContent = message;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const pencilActive = mode === 'pencil';
    document.querySelector('#pencilButton').classList.toggle('active', pencilActive);
    document.querySelector('#pencilButton').setAttribute('aria-pressed', String(pencilActive));
    document.querySelector('#eraserButton').classList.toggle('active', !pencilActive);
    document.querySelector('#eraserButton').setAttribute('aria-pressed', String(!pencilActive));
    drawingCanvas.style.cursor = pencilActive ? 'crosshair' : 'cell';
  }

  function pointFromEvent(event) {
    const rect = drawingCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * drawingCanvas.width / rect.width,
      y: (event.clientY - rect.top) * drawingCanvas.height / rect.height
    };
  }

  function startStroke(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    drawingCanvas.setPointerCapture(event.pointerId);
    isDrawing = true;
    lastPoint = pointFromEvent(event);
    drawingContext.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    drawingContext.strokeStyle = brushColorInput.value;
    drawingContext.lineWidth = Number(brushSizeInput.value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    drawingContext.beginPath();
    drawingContext.moveTo(lastPoint.x, lastPoint.y);
    drawingContext.lineTo(lastPoint.x + 0.01, lastPoint.y + 0.01);
    drawingContext.stroke();
  }

  function continueStroke(event) {
    if (!isDrawing) return;
    const point = pointFromEvent(event);
    drawingContext.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    drawingContext.strokeStyle = brushColorInput.value;
    drawingContext.lineWidth = Number(brushSizeInput.value) * drawingCanvas.width / drawingCanvas.getBoundingClientRect().width;
    drawingContext.beginPath();
    drawingContext.moveTo(lastPoint.x, lastPoint.y);
    drawingContext.lineTo(point.x, point.y);
    drawingContext.stroke();
    lastPoint = point;
  }

  function endStroke(event) {
    if (!isDrawing) return;
    isDrawing = false;
    drawingContext.globalCompositeOperation = 'source-over';
    if (event && drawingCanvas.hasPointerCapture(event.pointerId)) drawingCanvas.releasePointerCapture(event.pointerId);
  }

  function loadReference(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      announce('Please choose an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      announce('Choose an image smaller than 12 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        referenceContext.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
        const scale = Math.min(referenceCanvas.width / image.width, referenceCanvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        referenceContext.drawImage(image, (referenceCanvas.width - width) / 2, (referenceCanvas.height - height) / 2, width, height);
        emptyState.hidden = true;
        document.querySelector('#imageAction').textContent = 'Replace reference image';
        announce('Reference image added. Start tracing on the canvas.');
      };
      image.onerror = () => announce('That image could not be opened. Try another one.');
      image.src = reader.result;
    };
    reader.onerror = () => announce('Could not read that image. Please try again.');
    reader.readAsDataURL(file);
  }

  function exportPng() {
    const output = document.createElement('canvas');
    output.width = drawingCanvas.width;
    output.height = drawingCanvas.height;
    const context = output.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
    context.globalAlpha = Number(opacityInput.value) / 100;
    context.drawImage(referenceCanvas, 0, 0);
    context.globalAlpha = 1;
    context.drawImage(drawingCanvas, 0, 0);
    const link = document.createElement('a');
    link.download = 'doodle-tracing.png';
    link.href = output.toDataURL('image/png');
    link.click();
    announce('Your tracing was exported as a PNG.');
  }

  imageInput.addEventListener('change', event => {
    loadReference(event.target.files[0]);
    event.target.value = '';
  });
  opacityInput.addEventListener('input', () => {
    const opacity = Number(opacityInput.value);
    referenceCanvas.style.opacity = String(opacity / 100);
    document.querySelector('#opacityValue').value = `${opacity}%`;
  });
  brushSizeInput.addEventListener('input', () => {
    document.querySelector('#sizeValue').value = `${brushSizeInput.value} px`;
  });
  document.querySelector('#pencilButton').addEventListener('click', () => setMode('pencil'));
  document.querySelector('#eraserButton').addEventListener('click', () => setMode('eraser'));
  document.querySelector('#clearButton').addEventListener('click', () => {
    drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    announce('Tracing cleared. Your reference image is still here.');
  });
  document.querySelector('#exportButton').addEventListener('click', exportPng);
  drawingCanvas.addEventListener('pointerdown', startStroke);
  drawingCanvas.addEventListener('pointermove', continueStroke);
  drawingCanvas.addEventListener('pointerup', endStroke);
  drawingCanvas.addEventListener('pointercancel', endStroke);
  drawingCanvas.addEventListener('lostpointercapture', endStroke);
})();
