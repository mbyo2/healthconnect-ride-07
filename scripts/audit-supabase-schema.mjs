import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const schemaPath = 'C:/Users/Administrator/.codex/attachments/cd8e59e1-8730-4cc3-ac13-6f2f477cc213/pasted-text.txt';
const schema = readFileSync(schemaPath, 'utf8');
const schemaTables = new Set([...schema.matchAll(/CREATE TABLE public\.([a-z0-9_]+)/gi)].map((match) => match[1]));

const files = [];
const visit = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) visit(path);
    else if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }
};
visit(join(root, 'src'));
visit(join(root, 'supabase', 'functions'));

const usages = { tables: new Map(), rpc: new Map(), storage: new Map() };
const collect = (kind, value, file) => {
  if (!usages[kind].has(value)) usages[kind].set(value, new Set());
  usages[kind].get(value).add(relative(root, file).replaceAll('\\', '/'));
};

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\.from\(\s*["']([a-z0-9_]+)["']/gi)) collect('tables', match[1], file);
  for (const match of source.matchAll(/\.rpc\(\s*["']([a-z0-9_]+)["']/gi)) collect('rpc', match[1], file);
  for (const match of source.matchAll(/\.storage\.from\(\s*["']([a-z0-9_-]+)["']/gi)) collect('storage', match[1], file);
}

const print = (title, values) => {
  console.log(`\n${title}`);
  for (const value of [...values].sort()) {
    console.log(`${value}: ${[...usages[title === 'TABLES' ? 'tables' : title === 'RPC' ? 'rpc' : 'storage'].get(value)].sort().join(', ')}`);
  }
};

const usedTables = new Set(usages.tables.keys());
const missingTables = [...usedTables].filter((table) => !schemaTables.has(table));
const unusedSchemaTables = [...schemaTables].filter((table) => !usedTables.has(table));
print('TABLES', usedTables);
print('RPC', usages.rpc.keys());
print('STORAGE', usages.storage.keys());
console.log(`\nMISSING_TABLES\n${missingTables.sort().join('\n') || '(none)'}`);
console.log(`\nUNUSED_SCHEMA_TABLES\n${unusedSchemaTables.sort().join('\n') || '(none)'}`);
