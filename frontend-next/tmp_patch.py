from pathlib import Path
for path in Path('components/ui').rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    new = text.replace('React.forwardRef(', 'React.forwardRef<any, any>(')
    if new != text:
        path.write_text(new, encoding='utf-8')
        print(path)
