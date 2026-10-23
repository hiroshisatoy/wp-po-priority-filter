(function () {
  var LABELS = {
    high: "高",
    normal: "通常",
    low: "低",
    hidden: "非表示",
  };

  var fileInput = document.getElementById("file-input");
  var dropzone = document.getElementById("dropzone");
  var fileNameEl = document.getElementById("file-name");
  var source = document.getElementById("source");
  var summary = document.getElementById("summary");
  var counts = document.getElementById("counts");
  var preview = document.getElementById("preview");
  var downloadBtn = document.getElementById("download");

  var fileName = "";
  var filteredText = "";

  function selectedExcludes() {
    return PoFilter.PRIORITIES.filter(function (name) {
      var box = document.getElementById("exclude-" + name);
      return box && box.checked;
    });
  }

  function downloadName(name) {
    if (!name) return "filtered.po";
    var base = name.replace(/\.pot?$/i, "");
    return base + ".filtered.po";
  }

  function render() {
    var text = source.value;
    counts.replaceChildren();
    if (!text.trim()) {
      filteredText = "";
      summary.textContent = ".po を読み込むと、残す件数と除外する件数がここに出ます。";
      preview.textContent = "";
      downloadBtn.disabled = true;
      return;
    }

    var result = PoFilter.filterPo(text, selectedExcludes());
    filteredText = result.text;
    var stats = result.stats;
    var headerNote = stats.header
      ? "空の msgid ヘッダーは残しています。"
      : "空の msgid ヘッダーは見つかりませんでした。";
    summary.textContent =
      "翻訳単位 " +
      stats.units +
      " 件のうち " +
      stats.kept +
      " 件を残し、" +
      stats.excluded +
      " 件を除外しました。" +
      headerNote;

    PoFilter.PRIORITIES.forEach(function (name) {
      var row = stats.byPriority[name];
      var li = document.createElement("li");
      li.textContent =
        name +
        "（" +
        LABELS[name] +
        "） " +
        row.total +
        " 件 / 除外 " +
        row.excluded +
        " 件";
      counts.appendChild(li);
    });

    var lines = result.text.split("\n");
    var head = lines.slice(0, 40).join("\n");
    preview.textContent = lines.length > 40 ? head + "\n…" : head;
    downloadBtn.disabled = false;
  }

  function loadFile(file) {
    if (!file) return;
    fileName = file.name || "";
    fileNameEl.textContent = fileName ? "読み込み: " + fileName : "";
    var reader = new FileReader();
    reader.onload = function () {
      source.value = String(reader.result || "");
      render();
    };
    reader.onerror = function () {
      summary.textContent = "ファイルを読めませんでした。";
      downloadBtn.disabled = true;
    };
    reader.readAsText(file);
  }

  source.addEventListener("input", render);
  PoFilter.PRIORITIES.forEach(function (name) {
    document.getElementById("exclude-" + name).addEventListener("change", render);
  });

  fileInput.addEventListener("change", function () {
    loadFile(fileInput.files && fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      if (type === "drop") {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        loadFile(file);
      }
      dropzone.classList.remove("is-dragover");
    });
  });

  downloadBtn.addEventListener("click", function () {
    if (downloadBtn.disabled) return;
    var blob = new Blob([filteredText], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = downloadName(fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  render();
})();
