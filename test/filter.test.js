const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { filterPo, PRIORITIES } = require("../po.js");

const SAMPLE = [
  "# Translation header",
  "msgid \"\"",
  "msgstr \"\"",
  "\"Language: ja\\n\"",
  "",
  "#. Short description.",
  "#, fuzzy, gp-priority: high",
  "msgid \"Keep me\"",
  "msgstr \"残す\"",
  "",
  "#. Found in changelog list item.",
  "#, gp-priority: low",
  "msgid \"Drop me\"",
  "msgstr \"捨てる\"",
  "",
  "#. Hidden note.",
  "#, gp-priority: hidden",
  "msgid \"Secret\"",
  "msgstr \"秘密\"",
  "",
  "#: wp-includes/example.php:10",
  "msgid \"Untagged\"",
  "msgstr \"フラグなし\"",
  "",
  "#, gp-priority: normal",
  "msgid \"Plain\"",
  "msgstr \"通常\"",
].join("\n");

test("priorities are the four GlotPress values", () => {
  assert.deepEqual(PRIORITIES, ["high", "normal", "low", "hidden"]);
});

test("default exclude set drops low and hidden and keeps the header", () => {
  const result = filterPo(SAMPLE, ["low", "hidden"]);
  assert.equal(result.stats.header, true);
  assert.equal(result.stats.units, 5);
  assert.equal(result.stats.kept, 3);
  assert.equal(result.stats.excluded, 2);
  assert.match(result.text, /msgid ""/);
  assert.match(result.text, /Language: ja/);
  assert.match(result.text, /Keep me/);
  assert.match(result.text, /Untagged/);
  assert.match(result.text, /Plain/);
  assert.doesNotMatch(result.text, /Drop me/);
  assert.doesNotMatch(result.text, /Secret/);
});

test("kept units preserve comments and flags exactly", () => {
  const result = filterPo(SAMPLE, ["low", "hidden"]);
  assert.match(result.text, /#\. Short description\.\n#, fuzzy, gp-priority: high\nmsgid "Keep me"/);
  assert.match(result.text, /#: wp-includes\/example\.php:10\nmsgid "Untagged"/);
});

test("header stays even when every priority is excluded", () => {
  const result = filterPo(SAMPLE, ["high", "normal", "low", "hidden"]);
  assert.equal(result.stats.kept, 0);
  assert.equal(result.stats.excluded, 5);
  assert.match(result.text, /# Translation header/);
  assert.match(result.text, /msgid ""/);
  assert.doesNotMatch(result.text, /msgid "Keep me"/);
  assert.equal(result.text.endsWith("\n"), true);
});

test("missing gp-priority is normal", () => {
  const result = filterPo(SAMPLE, ["normal"]);
  assert.equal(result.stats.byPriority.normal.excluded, 2);
  assert.doesNotMatch(result.text, /Untagged/);
  assert.doesNotMatch(result.text, /Plain/);
  assert.match(result.text, /Keep me/);
  assert.match(result.text, /Drop me/);
});

test("priority inside a comment or msgid is not a flag", () => {
  const text = [
    'msgid ""',
    'msgstr ""',
    "",
    "#. remember gp-priority: low",
    'msgid "See gp-priority: low in the docs"',
    'msgstr "ドキュメント"',
  ].join("\n");
  const result = filterPo(text, ["low", "hidden"]);
  assert.equal(result.stats.byPriority.normal.kept, 1);
  assert.match(result.text, /See gp-priority: low in the docs/);
});

test("multiline msgid, plural, msgctxt, and obsolete units round-trip", () => {
  const text = [
    'msgid ""',
    'msgstr ""',
    "",
    "msgctxt \"verb\"",
    "#, gp-priority: high",
    'msgid ""',
    '"Line one\\n"',
    '"line two"',
    'msgstr ""',
    '"一行\\n"',
    '"二行"',
    "",
    "#, gp-priority: low",
    'msgid "One file"',
    'msgid_plural "%d files"',
    'msgstr[0] "1 ファイル"',
    'msgstr[1] "%d ファイル"',
    "",
    "#~ #, gp-priority: hidden",
    '#~ msgid "Old"',
    '#~ msgstr "古い"',
  ].join("\n");
  const result = filterPo(text, ["low", "hidden"]);
  assert.match(result.text, /msgctxt "verb"/);
  assert.match(result.text, /"Line one\\n"\n"line two"/);
  assert.doesNotMatch(result.text, /One file/);
  assert.doesNotMatch(result.text, /#~ msgid "Old"/);
  assert.equal(result.stats.byPriority.high.kept, 1);
  assert.equal(result.stats.byPriority.low.excluded, 1);
  assert.equal(result.stats.byPriority.hidden.excluded, 1);
});

test("header with a priority flag is still kept and not counted as a unit", () => {
  const text = ["#, gp-priority: low", 'msgid ""', 'msgstr ""', '"X-Generator: GlotPress\\n"'].join("\n");
  const result = filterPo(text, ["low", "hidden"]);
  assert.equal(result.stats.header, true);
  assert.equal(result.stats.units, 0);
  assert.match(result.text, /X-Generator: GlotPress/);
});

test("CRLF input and a leading BOM still parse", () => {
  const text = "\uFEFFmsgid \"\"\r\nmsgstr \"\"\r\n\r\nmsgid \"A\"\r\nmsgstr \"あ\"\r\n";
  const result = filterPo(text, ["low", "hidden"]);
  assert.equal(result.stats.header, true);
  assert.equal(result.stats.kept, 1);
  assert.match(result.text, /msgid "A"\nmsgstr "あ"\n/);
});

test("combined flag order and unknown priority", () => {
  const text = [
    "#, gp-priority: high, fuzzy",
    'msgid "High"',
    'msgstr "高"',
    "",
    "#, fuzzy",
    "#, gp-priority: hidden",
    'msgid "Hide"',
    'msgstr "隠す"',
    "",
    "#, gp-priority: urgent",
    'msgid "Unknown"',
    'msgstr "不明"',
  ].join("\n");
  const kept = filterPo(text, ["hidden"]);
  assert.match(kept.text, /gp-priority: high, fuzzy/);
  assert.match(kept.text, /Unknown/);
  assert.doesNotMatch(kept.text, /Hide/);
  const dropped = filterPo(text, ["normal"]);
  assert.doesNotMatch(dropped.text, /Unknown/);
});

test("pages assets stay relative", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="po\.js"/);
  assert.match(html, /src="app\.js"/);
  assert.doesNotMatch(html, /(?:href|src)="\//);
  assert.equal(fs.existsSync(path.join(__dirname, "..", ".nojekyll")), true);
});
