const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let count = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/<img[\s\S]*?>/g, (match) => {
    let matches = match.match(/loading=/g);
    let occurrences = matches ? matches.length : 0;
    if (occurrences > 1) {
      let replaced = false;
      return match.replace(/loading=(?:\"lazy\"|\'lazy\'|\{[^\}]*\})/g, (m) => {
        if (!replaced) { replaced = true; return m; }
        return '';
      });
    }
    return match;
  });
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Fixed ' + f);
    count++;
  }
}
console.log('Total fixed: ' + count);
