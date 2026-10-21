// Normalize OpenAPI Generator whitespace without changing generated behavior.
import { readFile, readdir, writeFile } from 'node:fs/promises';

for (const directory of ['src/apis', 'src/models', 'docs']) {
    const root = new URL(`../${directory}/`, import.meta.url);
    for (const name of await readdir(root).catch(() => [])) {
        if (!name.endsWith('.ts') && !name.endsWith('.md')) continue;
        const path = new URL(name, root);
        const source = await readFile(path, 'utf8');
        const normalized = source.replace(/[\t ]+$/gm, '');
        if (normalized !== source) await writeFile(path, normalized, 'utf8');
    }
}
