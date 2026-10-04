(function () {
  "use strict";

  /* ---------- Poster geometry (in the 2048 x 2048 poster) ---------- */
  var SIZE = 2048;
  // Photo window = the empty area inside the gold hexagon frame
  var HOLE = { x: 1373, y: 1054, w: 585, h: 669 };
  HOLE.cx = HOLE.x + HOLE.w / 2;
  HOLE.cy = HOLE.y + HOLE.h / 2;
  // Name placed under "প্রচারেঃ"
  var NAME = {
    cx: 1662,
    baseline: 1950,
    refText: "আপনার নাম",
    refWidth: 557,
    maxWidth: 620,
    minSize: 30,
  };
  var FONT_FAMILY =
    '"Hind Siliguri", "Nirmala UI", "Noto Sans Bengali", "Kalpurush", sans-serif';

  /* ---------- Elements ---------- */
  var canvas = document.getElementById("poster");
  var ctx = canvas.getContext("2d");
  var fileInput = document.getElementById("file");
  var drop = document.getElementById("drop");
  var dropTitle = document.getElementById("dropTitle");
  var nameInput = document.getElementById("name");
  var zoomInput = document.getElementById("zoom");
  var tools = document.getElementById("photoTools");
  var resetBtn = document.getElementById("resetPos");
  var removeBtn = document.getElementById("removePhoto");
  var dlPng = document.getElementById("dlPng");
  var dlJpg = document.getElementById("dlJpg");
  var loading = document.getElementById("loading");
  var hint = document.getElementById("dragHint");

  /* ---------- State ---------- */
  var template = new Image();
  var templateReady = false;
  var photo = null; // HTMLImageElement
  var zoom = 1; // 1 = "cover" fit
  var offX = 0,
    offY = 0; // photo centre offset from hole centre (poster px)
  var dirty = true;

  /* ---------- Helpers ---------- */
  function coverScale() {
    return (
      Math.max(HOLE.w / photo.naturalWidth, HOLE.h / photo.naturalHeight) * zoom
    );
  }
  function clampOffsets() {
    if (!photo) return;
    var s = coverScale();
    var maxX = Math.max(0, (photo.naturalWidth * s - HOLE.w) / 2);
    var maxY = Math.max(0, (photo.naturalHeight * s - HOLE.h) / 2);
    offX = Math.min(maxX, Math.max(-maxX, offX));
    offY = Math.min(maxY, Math.max(-maxY, offY));
  }
  function cleanName(v) {
    return (v || "").replace(/\s+/g, " ").trim();
  }
  function requestDraw() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(function () {
      draw(false);
    });
  }

  /* ---------- Drawing ---------- */
  function drawPlaceholder() {
    var g = ctx.createLinearGradient(0, HOLE.y, 0, HOLE.y + HOLE.h);
    g.addColorStop(0, "#dbe6f7");
    g.addColorStop(1, "#bcd0ee");
    ctx.fillStyle = g;
    ctx.fillRect(HOLE.x - 4, HOLE.y - 4, HOLE.w + 8, HOLE.h + 8);

    // simple person silhouette
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.beginPath();
    ctx.arc(HOLE.cx, HOLE.cy - 70, 105, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(HOLE.cx, HOLE.cy + 250, 220, 170, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(HOLE.cx - 220, HOLE.cy + 250, 440, 160);

    ctx.fillStyle = "rgba(30,58,138,.65)";
    ctx.font = "700 46px " + FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("আপনার ছবি এখানে বসবে", HOLE.cx, HOLE.y + HOLE.h - 70);
  }

  function drawPhoto() {
    var s = coverScale();
    var w = photo.naturalWidth * s,
      h = photo.naturalHeight * s;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo, HOLE.cx + offX - w / 2, HOLE.cy + offY - h / 2, w, h);
  }

  function nameFontSize(text) {
    ctx.font = "700 100px " + FONT_FAMILY;
    var refW = ctx.measureText(NAME.refText).width;
    var base = (100 * NAME.refWidth) / refW; // size that matches the original poster
    ctx.font = "700 " + base + "px " + FONT_FAMILY;
    var w = ctx.measureText(text).width;
    var size = w > NAME.maxWidth ? (base * NAME.maxWidth) / w : base;
    return Math.max(size, NAME.minSize);
  }

  function drawName(text, isPlaceholder) {
    var size = nameFontSize(text);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + size + "px " + FONT_FAMILY;
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, size * 0.012); // hairline stroke, keeps the weight close to the poster typography
    var color = isPlaceholder ? "rgba(0,0,0,.22)" : "#050505";
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.strokeText(text, NAME.cx, NAME.baseline);
    ctx.fillText(text, NAME.cx, NAME.baseline);
  }

  function draw(forExport) {
    dirty = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#fffbe8";
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (photo) drawPhoto();
    else if (!forExport) drawPlaceholder();
    else drawPlaceholder();

    if (templateReady) ctx.drawImage(template, 0, 0, SIZE, SIZE);

    var name = cleanName(nameInput.value);
    if (name) drawName(name, false);
    else if (!forExport) drawName(NAME.refText, true);
  }

  /* ---------- Photo loading ---------- */
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      alert("দয়া করে একটি ছবির ফাইল (JPG/PNG) বেছে নিন।");
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      photo = img;
      zoom = 1;
      offX = 0;
      offY = 0;
      zoomInput.value = 1;
      tools.hidden = false;
      canvas.classList.add("has-photo");
      dropTitle.textContent = "ছবি বদলান";
      hint.textContent = "ছবি টেনে সরান, জুম স্লাইডার/পিঞ্চ করে ছোট-বড় করুন।";
      dirty = false;
      draw(false);
    };
    img.onerror = function () {
      alert("ছবিটি খোলা যায়নি। অন্য একটি ছবি চেষ্টা করুন।");
    };
    img.src = url;
  }

  fileInput.addEventListener("change", function () {
    loadFile(fileInput.files && fileInput.files[0]);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.add("over");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.remove("over");
    });
  });
  drop.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  /* ---------- Controls ---------- */
  nameInput.addEventListener("input", requestDraw);

  zoomInput.addEventListener("input", function () {
    zoom = parseFloat(zoomInput.value) || 1;
    clampOffsets();
    requestDraw();
  });
  resetBtn.addEventListener("click", function () {
    zoom = 1;
    offX = 0;
    offY = 0;
    zoomInput.value = 1;
    requestDraw();
  });
  removeBtn.addEventListener("click", function () {
    photo = null;
    zoom = 1;
    offX = 0;
    offY = 0;
    zoomInput.value = 1;
    tools.hidden = true;
    canvas.classList.remove("has-photo");
    dropTitle.textContent = "ছবি বেছে নিন";
    hint.textContent =
      "ছবি আপলোড করলে সেটি আঙুল/মাউস দিয়ে টেনে সরাতে এবং জুম করতে পারবেন।";
    requestDraw();
  });

  /* ---------- Drag & pinch on the canvas ---------- */
  var pointers = {}; // id -> {x, y}
  var lastPinch = 0;

  function ratio() {
    return SIZE / canvas.getBoundingClientRect().width;
  }
  function pCount() {
    return Object.keys(pointers).length;
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (!photo) return;
    canvas.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    canvas.classList.add("dragging");
    if (pCount() === 2) {
      var p = Object.keys(pointers).map(function (k) {
        return pointers[k];
      });
      lastPinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!photo || !pointers[e.pointerId]) return;
    var prev = pointers[e.pointerId];
    var n = pCount();
    if (n === 1) {
      var r = ratio();
      offX += (e.clientX - prev.x) * r;
      offY += (e.clientY - prev.y) * r;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      clampOffsets();
      requestDraw();
    } else if (n === 2) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = Object.keys(pointers).map(function (k) {
        return pointers[k];
      });
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (lastPinch > 0) {
        zoom = Math.min(4, Math.max(1, (zoom * d) / lastPinch));
        zoomInput.value = zoom;
        clampOffsets();
        requestDraw();
      }
      lastPinch = d;
    }
  });

  function endPointer(e) {
    delete pointers[e.pointerId];
    if (pCount() < 2) lastPinch = 0;
    if (pCount() === 0) canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  canvas.addEventListener(
    "wheel",
    function (e) {
      if (!photo) return;
      e.preventDefault();
      zoom = Math.min(4, Math.max(1, zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
      zoomInput.value = zoom;
      clampOffsets();
      requestDraw();
    },
    { passive: false },
  );

  /* ---------- Download ---------- */
  function download(type, ext) {
    var name = cleanName(nameInput.value);
    if (!photo && !confirm("আপনি এখনও ছবি দেননি। ছবি ছাড়াই ডাউনলোড করবেন?"))
      return;
    if (!name && !confirm("আপনি এখনও নাম লেখেননি। নাম ছাড়াই ডাউনলোড করবেন?"))
      return;

    draw(true); // clean render (no placeholder text)
    canvas.toBlob(
      function (blob) {
        draw(false); // restore preview
        if (!blob) {
          alert("ডাউনলোড তৈরি করা যায়নি। আবার চেষ্টা করুন।");
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "election-poster." + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 4000);
      },
      type,
      0.95,
    );
  }
  dlPng.addEventListener("click", function () {
    download("image/png", "png");
  });
  dlJpg.addEventListener("click", function () {
    download("image/jpeg", "jpg");
  });

  /* ---------- Boot ---------- */
  template.onload = function () {
    templateReady = true;
    loading.classList.add("hide");
    dirty = false;
    draw(false);
  };
  template.onerror = function () {
    loading.textContent =
      "টেমপ্লেট লোড হয়নি। template.js ফাইলটি index.html এর পাশে আছে কিনা দেখুন।";
  };
  template.src = window.POSTER_TEMPLATE;

  var fontsReady = function () {
    dirty = false;
    draw(false);
  };
  if (document.fonts) {
    var loads = [
      document.fonts.load('700 40px "Hind Siliguri"', "আপনার নাম"),
      document.fonts.load('400 16px "Hind Siliguri"', "ছবি"),
    ];
    Promise.all(loads).then(fontsReady, fontsReady);
    if (document.fonts.ready) document.fonts.ready.then(fontsReady);
  }
  draw(false);
})();
