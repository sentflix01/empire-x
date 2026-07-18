const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'components/ui');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      let text = fs.readFileSync(fullPath, 'utf8');
      const newText = text.replace(/React\.forwardRef\(/g, 'React.forwardRef<any, any>(');
      if (newText !== text) {
        fs.writeFileSync(fullPath, newText);
        console.log(fullPath);
      }
    }
  }
}

walk(root);
