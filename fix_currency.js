const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Replace ${something.toFixed(2)} with Kes. {something.toFixed(2)}
  // Note: in JSX it looks like \${...toFixed(2)}
  newContent = newContent.replace(/\$\{([^}]+toFixed\(2\))\}/g, 'Kes. {$1}');
  
  // Replace literal $150 with Kes. 150
  newContent = newContent.replace(/\$([0-9]+)/g, 'Kes. $1');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log('Updated', file);
  }
});
console.log('Total files changed:', changedCount);
