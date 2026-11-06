(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fileInput = $('imageFile');
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const paletteEl = $('palette');
  const statusEl = $('status');
  const CELL = 14;
  const MAX_HISTORY = 30;

  let sourceImage = null;
  let puzzle = null;
  let selectedColor = -1;
  let fills = new Uint8Array(0);
  let history = [];
  let historyAt = -1;
  let pointerStart = null;

  const say = (message) => { statusEl.textContent = message; };
  const rgbHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const distance = (r, g, b, color) => {
    // Weighted RGB distance approximates how people perceive color differences.
    const dr = r - color[0], dg = g - color[1], db = b - color[2];
    return 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
  };

  $('colorCount').addEventListener('input', () => { $('colorCountValue').value = $('colorCount').value; });
  $('detail').addEventListener('input', () => { $('detailValue').value = $('detail').value; });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      say('Please choose a PNG, JPG, or WebP image.');
      fileInput.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      say('That image is over 12 MB. Please choose a smaller one.');
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => say('Could not read that file. Please try another image.');
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        sourceImage = image;
        $('fileName').textContent = file.name;
        $('makePuzzle').disabled = false;
        say('Image ready. Adjust the settings and make your puzzle.');
      };
      image.onerror = () => say('Could not open that picture. Please try another image.');
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  $('makePuzzle').addEventListener('click', () => {
    if (!sourceImage) return;
    $('makePuzzle').disabled = true;
    say('Building a palette and finding regions…');
    // Let the browser paint the progress message before doing local image work.
    setTimeout(() => {
      try {
        puzzle = buildPuzzle(sourceImage, Number($('colorCount').value), Number($('detail').value));
        fills = new Uint8Array(puzzle.regionCount);
        selectedColor = 0;
        history = [];
        historyAt = -1;
        saveHistory();
        $('emptyState').hidden = true;
        canvas.hidden = false;
        $('export').disabled = false;
        $('reset').disabled = false;
        $('fillAll').disabled = false;
        $('boardTitle').textContent = 'Your numbered puzzle';
        renderPalette();
        renderBoard();
        updateProgress();
        say(`Puzzle ready: ${puzzle.regionCount} regions and ${puzzle.colors.length} colors. Choose a number to start.`);
      } catch (error) {
        console.error(error);
        say('The image was too complex for this browser. Try a smaller picture or lower the detail.');
      } finally {
        $('makePuzzle').disabled = false;
      }
    }, 30);
  });

  function buildPuzzle(image, colorCount, requestedWidth) {
    const ratio = image.naturalHeight / image.naturalWidth;
    const width = Math.max(50, Math.min(220, requestedWidth));
    const height = Math.max(40, Math.min(300, Math.round(width * ratio)));
    const work = document.createElement('canvas');
    work.width = width;
    work.height = height;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    wctx.fillStyle = '#fff';
    wctx.fillRect(0, 0, width, height);
    wctx.drawImage(image, 0, 0, width, height);
    const pixels = wctx.getImageData(0, 0, width, height).data;
    const total = width * height;

    // Deterministic lightweight k-means color quantization.
    const sampleStep = Math.max(1, Math.floor(total / 12000));
    const samples = [];
    for (let p = 0; p < total; p += sampleStep) {
      const i = p * 4;
      samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
    const k = Math.min(colorCount, samples.length);
    let centers = Array.from({ length: k }, (_, i) => samples[Math.floor((i + 0.5) * samples.length / k)].slice());
    for (let iteration = 0; iteration < 9; iteration++) {
      const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
      for (let n = 0; n < samples.length; n++) {
        const sample = samples[n];
        let best = 0, bestDistance = Infinity;
        for (let c = 0; c < k; c++) {
          const d = distance(sample[0], sample[1], sample[2], centers[c]);
          if (d < bestDistance) { bestDistance = d; best = c; }
        }
        sums[best][0] += sample[0]; sums[best][1] += sample[1]; sums[best][2] += sample[2]; sums[best][3]++;
      }
      centers = centers.map((center, i) => sums[i][3]
        ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]]
        : center);
    }

    const clusterMap = new Uint8Array(total);
    for (let p = 0; p < total; p++) {
      const i = p * 4;
      let best = 0, bestDistance = Infinity;
      for (let c = 0; c < k; c++) {
        const d = distance(pixels[i], pixels[i + 1], pixels[i + 2], centers[c]);
        if (d < bestDistance) { bestDistance = d; best = c; }
      }
      clusterMap[p] = best;
    }

    // Split each color into connected components so every numbered patch can be filled independently.
    const regionMap = new Int32Array(total);
    regionMap.fill(-1);
    const stack = new Int32Array(total);
    const regions = [];
    for (let start = 0; start < total; start++) {
      if (regionMap[start] !== -1) continue;
      const id = regions.length;
      const cluster = clusterMap[start];
      let top = 0, count = 0, sumX = 0, sumY = 0;
      stack[top++] = start;
      regionMap[start] = id;
      while (top) {
        const p = stack[--top];
        const x = p % width, y = Math.floor(p / width);
        count++; sumX += x; sumY += y;
        const neighbors = [x > 0 ? p - 1 : -1, x + 1 < width ? p + 1 : -1,
          y > 0 ? p - width : -1, y + 1 < height ? p + width : -1];
        for (const next of neighbors) {
          if (next >= 0 && regionMap[next] === -1 && clusterMap[next] === cluster) {
            regionMap[next] = id;
            stack[top++] = next;
          }
        }
      }
      regions.push({ cluster, size: count, x: sumX / count, y: sumY / count });
    }
    return { width, height, centers, clusterMap, regionMap, regions, regionCount: regions.length };
  }

  function renderPalette() {
    paletteEl.replaceChildren();
    paletteEl.classList.remove('empty');
    puzzle.colors = puzzle.centers.map((color, index) => ({ index, color, hex: rgbHex(color) }));
    puzzle.colors.forEach(({ index, hex }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-color';
      button.setAttribute('aria-label', `Color ${index + 1}, ${hex}`);
      button.title = `Number ${index + 1} · ${hex}`;
      button.style.setProperty('--swatch', hex);
      button.innerHTML = `<span class="swatch-chip"></span><span class="swatch-number">${index + 1}</span><span class="swatch-hex">${hex}</span>`;
      button.addEventListener('click', () => {
        selectedColor = index;
        renderPalette();
        say(`Color ${index + 1} selected. Tap regions marked ${index + 1}.`);
      });
      if (selectedColor === index) button.classList.add('selected');
      paletteEl.append(button);
    });
  }

  function renderBoard() {
    if (!puzzle) return;
    const { width, height, regionMap, regions, centers } = puzzle;
    canvas.width = width * CELL;
    canvas.height = height * CELL;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let p = 0; p < regionMap.length; p++) {
      const regionId = regionMap[p];
      if (!fills[regionId]) continue;
      const x = (p % width) * CELL, y = Math.floor(p / width) * CELL;
      ctx.fillStyle = rgbHex(centers[regions[regionId].cluster]);
      ctx.fillRect(x, y, CELL, CELL);
    }
    // Draw fine boundaries between connected regions.
    ctx.beginPath();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const id = regionMap[p];
        if (x + 1 < width && regionMap[p + 1] !== id) {
          ctx.moveTo((x + 1) * CELL, y * CELL);
          ctx.lineTo((x + 1) * CELL, (y + 1) * CELL);
        }
        if (y + 1 < height && regionMap[p + width] !== id) {
          ctx.moveTo(x * CELL, (y + 1) * CELL);
          ctx.lineTo((x + 1) * CELL, (y + 1) * CELL);
        }
      }
    }
    ctx.strokeStyle = 'rgba(58, 55, 49, .42)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Number one label per patch, positioned at its pixel centroid.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let id = 0; id < regions.length; id++) {
      if (fills[id]) continue;
      const region = regions[id];
      if (region.size < 3) continue;
      const x = (region.x + 0.5) * CELL;
      const y = (region.y + 0.5) * CELL;
      const number = String(region.cluster + 1);
      ctx.font = `700 ${Math.max(8, Math.min(12, CELL * 0.72))}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.strokeText(number, x, y);
      ctx.fillStyle = region.cluster === selectedColor ? '#24221f' : '#655f57';
      ctx.fillText(number, x, y);
    }
    canvas.style.width = `${width * CELL}px`;
    canvas.style.height = `${height * CELL}px`;
    canvas.setAttribute('aria-label', `Color-by-number board, ${width} by ${height} cells. Click a numbered region to color it.`);
  }

  canvas.addEventListener('click', (event) => {
    if (!puzzle) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * puzzle.width / rect.width);
    const y = Math.floor((event.clientY - rect.top) * puzzle.height / rect.height);
    if (x < 0 || y < 0 || x >= puzzle.width || y >= puzzle.height) return;
    const regionId = puzzle.regionMap[y * puzzle.width + x];
    if (fills[regionId]) return;
    const region = puzzle.regions[regionId];
    if (region.cluster !== selectedColor) {
      say(`That patch is number ${region.cluster + 1}. Choose that palette number to fill it.`);
      return;
    }
    saveHistory();
    fills[regionId] = 1;
    renderBoard();
    updateProgress();
    say(`Filled a number ${selectedColor + 1} region.`);
  });

  $('fillAll').addEventListener('click', () => {
    if (!puzzle || selectedColor < 0) return;
    let changed = false;
    for (let id = 0; id < puzzle.regions.length; id++) {
      if (!fills[id] && puzzle.regions[id].cluster === selectedColor) { changed = true; break; }
    }
    if (!changed) return say('All regions for this number are already filled.');
    saveHistory();
    for (let id = 0; id < puzzle.regions.length; id++) {
      if (puzzle.regions[id].cluster === selectedColor) fills[id] = 1;
    }
    renderBoard();
    updateProgress();
    say(`Filled every region for number ${selectedColor + 1}.`);
  });

  function saveHistory() {
    if (historyAt < history.length - 1) history = history.slice(0, historyAt + 1);
    history.push(fills.slice());
    if (history.length > MAX_HISTORY) history.shift();
    historyAt = history.length - 1;
    updateHistoryButtons();
  }
  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyAt = index;
    fills = history[index].slice();
    renderBoard();
    updateProgress();
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    $('undo').disabled = historyAt <= 0;
    $('redo').disabled = historyAt < 0 || historyAt >= history.length - 1;
  }
  $('undo').addEventListener('click', () => restoreHistory(historyAt - 1));
  $('redo').addEventListener('click', () => restoreHistory(historyAt + 1));
  $('reset').addEventListener('click', () => {
    if (!puzzle || !fills.some(Boolean)) return say('Your puzzle is already blank.');
    if (!window.confirm('Clear all filled regions and start this puzzle again?')) return;
    saveHistory();
    fills.fill(0);
    renderBoard();
    updateProgress();
    say('Puzzle reset. Your generated palette is still here.');
  });

  function updateProgress() {
    const done = fills.reduce((sum, value) => sum + value, 0);
    const total = puzzle ? puzzle.regionCount : 0;
    const percent = total ? Math.round(done / total * 100) : 0;
    $('progressText').textContent = `${done} / ${total} regions · ${percent}%`;
    if (done === total && total) {
      $('boardTitle').textContent = 'Puzzle complete!';
      say('Beautiful work — your puzzle is complete. Export it when you are ready.');
    }
  }

  $('export').addEventListener('click', () => {
    if (!puzzle) return;
    const output = document.createElement('canvas');
    output.width = puzzle.width * 4;
    output.height = puzzle.height * 4;
    const out = output.getContext('2d');
    out.fillStyle = '#fff';
    out.fillRect(0, 0, output.width, output.height);
    for (let p = 0; p < puzzle.regionMap.length; p++) {
      const regionId = puzzle.regionMap[p];
      if (!fills[regionId]) continue;
      const region = puzzle.regions[regionId];
      out.fillStyle = rgbHex(puzzle.centers[region.cluster]);
      out.fillRect((p % puzzle.width) * 4, Math.floor(p / puzzle.width) * 4, 4, 4);
    }
    const link = document.createElement('a');
    link.download = 'project-bob-color-by-number.png';
    link.href = output.toDataURL('image/png');
    link.click();
    say('Your colored PNG has been exported.');
  });

  // Keep the board usable on touch screens and prevent accidental drag behavior.
  canvas.addEventListener('dragstart', (event) => event.preventDefault());
})();
