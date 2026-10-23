(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PoFilter = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PRIORITIES = ["high", "normal", "low", "hidden"];

  function unescapePoString(value) {
    var out = "";
    for (var i = 0; i < value.length; i++) {
      if (value.charAt(i) !== "\\") {
        out += value.charAt(i);
        continue;
      }
      var next = value.charAt(++i);
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else if (next === "r") out += "\r";
      else if (next === "\\") out += "\\";
      else if (next === '"') out += '"';
      else if (!next) out += "\\";
      else out += next;
    }
    return out;
  }

  function detectPriority(lines) {
    var found = null;
    for (var i = 0; i < lines.length; i++) {
      var match = /^(?:#~\s*)?#,\s*(.*)$/.exec(lines[i]);
      if (!match) continue;
      var re = /gp-priority:\s*([A-Za-z]+)/g;
      var flag;
      while ((flag = re.exec(match[1]))) {
        var name = flag[1].toLowerCase();
        if (PRIORITIES.indexOf(name) !== -1) found = name;
      }
    }
    return found || "normal";
  }

  function extractMsgid(lines) {
    for (var i = 0; i < lines.length; i++) {
      var match = /^(?:#~\s*)?msgid\s+"(.*)"\s*$/.exec(lines[i]);
      if (!match) continue;
      var value = unescapePoString(match[1]);
      for (var j = i + 1; j < lines.length; j++) {
        var continuation = /^(?:#~\s*)?"(.*)"\s*$/.exec(lines[j]);
        if (!continuation) break;
        value += unescapePoString(continuation[1]);
      }
      return value;
    }
    return null;
  }

  function analyzeEntry(raw) {
    var lines = raw.split("\n");
    var msgid = extractMsgid(lines);
    return {
      raw: raw,
      msgid: msgid,
      priority: detectPriority(lines),
      isHeader: msgid === "",
      isUnit: msgid !== null && msgid !== "",
    };
  }

  function parsePo(text) {
    var src = String(text == null ? "" : text).replace(/^\uFEFF/, "");
    src = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = src.split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();

    var entries = [];
    var buf = [];
    function flush() {
      if (!buf.length) return;
      entries.push(analyzeEntry(buf.join("\n")));
      buf = [];
    }

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "") flush();
      else buf.push(lines[i]);
    }
    flush();
    return entries;
  }

  function emptyBuckets() {
    var buckets = {};
    for (var i = 0; i < PRIORITIES.length; i++) {
      buckets[PRIORITIES[i]] = { total: 0, kept: 0, excluded: 0 };
    }
    return buckets;
  }

  function filterPo(text, exclude) {
    var excludeSet = {};
    var list = exclude || [];
    for (var i = 0; i < list.length; i++) excludeSet[list[i]] = true;

    var entries = parsePo(text);
    var stats = {
      units: 0,
      kept: 0,
      excluded: 0,
      header: false,
      byPriority: emptyBuckets(),
    };
    var kept = [];

    for (var n = 0; n < entries.length; n++) {
      var entry = entries[n];
      if (entry.isHeader) {
        stats.header = true;
        kept.push(entry.raw);
        continue;
      }
      if (!entry.isUnit) {
        kept.push(entry.raw);
        continue;
      }
      stats.units += 1;
      var bucket = stats.byPriority[entry.priority];
      bucket.total += 1;
      if (excludeSet[entry.priority]) {
        stats.excluded += 1;
        bucket.excluded += 1;
      } else {
        stats.kept += 1;
        bucket.kept += 1;
        kept.push(entry.raw);
      }
    }

    return {
      text: kept.length ? kept.join("\n\n") + "\n" : "",
      stats: stats,
      entries: entries,
    };
  }

  return {
    PRIORITIES: PRIORITIES,
    parsePo: parsePo,
    filterPo: filterPo,
  };
});
