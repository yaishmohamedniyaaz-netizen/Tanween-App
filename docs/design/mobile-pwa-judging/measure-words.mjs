/* Measures every word of Mushaf page 562 in the app's own HafsUthmanic at a
   100px reference size, so lines can be packed to fit a phone-width page.
   Writes words.json; run once, or again if the page or font changes. */
import fs from "node:fs";
const page = JSON.parse(fs.readFileSync("../../../public/pages/p562.json", "utf8"));
const words = [];
for (const line of page.lines) for (const w of line.words ?? []) words.push(w.text);
const uniq = [...new Set(words)];
const hafs = fs.readFileSync("hafs.b64", "utf8").trim();
fs.writeFileSync("/tmp/measure.html", `<!doctype html><meta charset="utf-8">
<style>@font-face{font-family:H;src:url(data:font/woff2;base64,${hafs}) format("woff2");font-display:block}
span{font-family:H;font-size:100px;white-space:nowrap;line-height:1}</style>
<div id="p"></div><pre id="out"></pre>
<script>
var ws=${JSON.stringify(uniq)},p=document.getElementById("p"),o={};
document.fonts.ready.then(function(){
  ws.forEach(function(t){var e=document.createElement("span");e.textContent=t;p.appendChild(e);o[t]=+(e.getBoundingClientRect().width/100).toFixed(4)});
  document.getElementById("out").textContent=JSON.stringify(o);
});
</script>`);
console.log("measure page written,", uniq.length, "unique words");
