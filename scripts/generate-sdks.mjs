// Canonical generator. Normal SDK builds use committed output and need no sibling checkout.
import { readFile, writeFile, readdir, mkdir, copyFile, rm, mkdtemp } from 'node:fs/promises';
import { resolve, join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), check = args.includes('--check');
const language = args.find(v => v.startsWith('--language='))?.split('=')[1];
const output = args.find(v => v.startsWith('--output='))?.slice(9);
const languages = ['typescript', 'python', 'rust', 'kotlin'];
if (language && !languages.includes(language)) throw new Error('Unknown SDK language');
if (output && !language) throw new Error('--output requires --language');
const version = JSON.parse(await readFile(join(root, 'openapi/lingya-agents-v1.json'))).info.version;
const jar = process.env.OPENAPI_GENERATOR_JAR ?? join(root, 'build/openapi-generator-cli-7.25.0.jar');
const lock = JSON.parse(await readFile(join(root, 'generator.lock.json'), 'utf8'));
let jarBytes;
try { jarBytes = await readFile(jar); }
catch (error) {
    if (process.env.OPENAPI_GENERATOR_JAR || error.code !== 'ENOENT') throw error;
    const response = await fetch(lock.openapiGenerator.url);
    if (!response.ok) throw new Error(`Generator download failed: ${response.status}`);
    jarBytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(jarBytes).digest('hex') !== lock.openapiGenerator.sha256) throw new Error('Generator checksum mismatch');
    await mkdir(dirname(jar), { recursive: true }); await writeFile(jar, jarBytes);
}
if (createHash('sha256').update(jarBytes).digest('hex') !== lock.openapiGenerator.sha256) throw new Error('Generator checksum mismatch');

function run(command, argv, cwd) {
    const result = spawnSync(command, argv, { cwd, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
    if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr ?? ''}${result.stdout ?? ''}`);
}
const ignoredDirectories = new Set(['.git', '.ruff_cache', '.mypy_cache', '__pycache__', 'node_modules', '.gradle', 'target', 'dist', 'build']);
async function files(dir, prefix = '') {
    const result = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        if (entry.name.endsWith('.pyc') || entry.name === '.DS_Store') continue;
        const name = join(prefix, entry.name);
        if (entry.isDirectory()) result.push(...await files(join(dir, entry.name), name));
        else result.push(name.split(sep).join('/'));
    }
    return result.sort();
}
async function copy(from, to) { await mkdir(dirname(to), { recursive: true }); await copyFile(from, to); }
for (const lang of language ? [language] : languages) {
    const destination = output ? resolve(output) : resolve(root, `../lingya-agents-sdk-${lang}`);
    const stage = await mkdtemp(join(tmpdir(), `lingya-${lang}-`));
    try {
        for (const name of ['lingya-agents-v1.yaml', 'endpoints.json', 'transports.json']) await copy(join(root, 'openapi', name), join(stage, 'openapi', name));
        const snapshot = YAML.parse(await readFile(join(stage, 'openapi/lingya-agents-v1.yaml'), 'utf8'));
        snapshot.info.description = 'Public Lingya Agents channel API. HMAC credentials belong on trusted servers; client tokens are single-use.';
        await writeFile(join(stage, 'openapi/lingya-agents-v1.yaml'), YAML.stringify(snapshot, { indent: 2, lineWidth: 0, aliasDuplicateObjects: false }));
        for (const name of await files(join(root, 'test-vectors'))) await copy(join(root, 'test-vectors', name), join(stage, 'test-vectors', name));
        await writeFile(join(stage, 'CONTRACT_VERSION'), `${version}\n`);
        const source = join(root, 'sdk', lang);
        for (const name of await files(source)) await copy(join(source, name), join(stage, name));
        const config = lang === 'typescript' || lang === 'kotlin' ? 'openapi-generator/config.yaml' : 'openapi-generator-config.json';
        const generated = join(stage, '_generated');
        const generator = { typescript: 'typescript-fetch', python: 'python', rust: 'rust', kotlin: 'kotlin' }[lang];
        const javaArgs = ['-jar', jar, 'generate', '-g', generator, '-i', join(stage, 'openapi/lingya-agents-v1.yaml'), '-c', join(stage, config), '-o', generated, `--additional-properties=hideGenerationTimestamp=true${lang === 'python' ? ',generateSourceCodeOnly=false' : ''}`];
        if (lang === 'python' || lang === 'rust') javaArgs.push('--global-property=models,modelDocs=true,modelTests=false');
        try { await readdir(join(stage, 'openapi-generator/templates')); javaArgs.push('-t', join(stage, 'openapi-generator/templates')); } catch {}
        run('java', javaArgs, root);
        const generatedRoot = lang === 'typescript' ? 'src' : lang === 'python' ? 'lingya_agents_sdk/models' : lang === 'rust' ? 'src/models' : 'src/main/kotlin';
        for (const name of await files(join(generated, generatedRoot))) {
            if (lang === 'typescript' && !name.startsWith('models/') && !name.startsWith('apis/')) continue;
            await copy(join(generated, generatedRoot, name), join(stage, lang === 'kotlin' ? 'generated/src/main/kotlin' : generatedRoot, name));
        }
        // API/model references are generated and owned alongside their source models.
        let referenceDocs = [];
        try { referenceDocs = await files(join(generated, 'docs')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        for (const name of referenceDocs.filter(name => name.endsWith('.md'))) await copy(join(generated, 'docs', name), join(stage, 'docs', name));
        const operations = JSON.parse(await readFile(join(stage, 'openapi/endpoints.json'), 'utf8'));
        const groups = [...new Set(operations.map(operation => operation.group))];
        await mkdir(join(stage, 'docs'), { recursive: true });
        for (const group of groups) {
            const apiName = group === 'sql' ? 'SQLApi' : `${group[0].toUpperCase()}${group.slice(1)}Api`;
            const rows = operations.filter(operation => operation.group === group).map(operation =>
                `| \`${operation.operationId}\` | \`${operation.method} ${operation.path}\` | ${operation.summary.replaceAll('|', '\\|')} | ${operation.requestBodySchema ?? '—'} | ${operation.response.schema ?? operation.response.mediaType ?? '—'} |`);
            const content = `# ${apiName} HTTP 契约参考 / HTTP contract reference\n\n本页从契约操作清单生成。operationId 是跨语言契约标识，表格不是 SDK 方法签名；业务调用方式见 [SDK README](../README.md)，请求选项、认证、下载及订阅规则见 [生命周期说明](request-lifecycle.md)。channelId 由 SDK 根客户端绑定，无需逐次传入。\n\nGenerated from the operation manifest. Operation IDs identify the wire contract, not language-specific call signatures. Use the SDK README and lifecycle guide for high-level calls; channelId is bound at construction.\n\n| operationId | HTTP | 说明 / Summary | Body schema | Response |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n${group === 'chat' ? '高级订阅 subscribeChatEvents / subscribe_chat_events 默认 SSE，可选择 WebSocket；原 stream 方法兼容保留。SSE 收到 End 后立即关闭，WebSocket complete/1000 正常结束且不补造 End。\n' : ''}`;
            await writeFile(join(stage, 'docs', `${apiName}.md`), content);
        }
        if (lang === 'rust') {
            const modules = [];
            for (const name of (await files(join(stage, 'src/models'))).filter(v => v.endsWith('.rs') && v !== 'mod.rs')) {
                const module = name.slice(0, -3);
                const source = await readFile(join(stage, 'src/models', name), 'utf8');
                const symbol = /pub (?:struct|enum|type) (\w+)/.exec(source)?.[1];
                if (symbol) modules.push(`pub mod ${module};\npub use self::${module}::${symbol};`);
            }
            await writeFile(join(stage, 'src/models/mod.rs'), '#![allow(clippy::derivable_impls, clippy::manual_map, clippy::too_many_arguments)]\n' + modules.join('\n') + '\n');
        }
        // Only the validated, freshly created temporary directory is recursively removed.
        await rm(generated, { recursive: true });
        if (lang === 'typescript') { run('node', ['scripts/finalize-generated.mjs'], stage); run('node', ['scripts/generate-bound-api.mjs'], stage); }
        else if (lang === 'kotlin') run('node', ['scripts/generate-bound-api.mjs'], stage);
        else { if (lang === 'python') run(process.env.PYTHON ?? 'python', ['scripts/finalize_models.py'], stage); run(process.env.PYTHON ?? 'python', ['scripts/generate_bound_api.py'], stage); }
        if (lang === 'rust') run('cargo', ['fmt', '--all'], stage);
        const owned = await files(stage), hashes = {};
        for (const name of owned) {
            const file = join(stage, name);
            const value = await readFile(file, 'utf8');
            const normalized = value.replace(/\r\n/g, '\n');
            const clean = name.endsWith('.md') ? normalized.replace(/[ \t]+$/gm, '') : normalized;
            if (value !== clean) await writeFile(file, clean);
        }
        for (const name of owned) hashes[name] = createHash('sha256').update(await readFile(join(stage, name))).digest('hex');
        await writeFile(join(stage, 'SDK_GENERATION.json'), JSON.stringify({ contractVersion: version, generatorVersion: '7.25.0', runtimeVersion: lock.runtimeVersion, generatorSha256: lock.openapiGenerator.sha256, files: hashes }, null, 2) + '\n');
        owned.push('SDK_GENERATION.json');
        let previous = {};
        try { previous = JSON.parse(await readFile(join(destination, 'SDK_GENERATION.json'))).files; } catch {}
        // One-time migration of known obsolete generator-owned reference pages from before
        // SDK_GENERATION.json tracked documentation. Never remove arbitrary user docs.
        const removedModelDocs = ['AiChatRequestBriefEvent', 'AiChatResponseBriefEvent', 'AssistantChatMessage', 'ChatMessage', 'ChatOptions', 'ConversationShareCreated', 'ConversationShareInput', 'ConversationShareList', 'ConversationShareRecord', 'ConversationShareRevoked', 'SystemChatMessage', 'ToolCall', 'ToolResponse', 'ToolResponseChatMessage', 'UserChatMessage'];
        const legacyDocs = [];
        for (const model of removedModelDocs) {
            const name = `docs/${model}.md`;
            try {
                const value = await readFile(join(destination, name), 'utf8');
                if (new RegExp(`^# ${model}\\s*$`, 'm').test(value) && (value.includes('公开协议结构') || (value.includes('## Properties') || value.includes('## Enum Variants')) && value.includes('[[Back to Model list]]'))) legacyDocs.push(name);
            } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        const stale = [...new Set([...Object.keys(previous), ...legacyDocs])].filter(name => !owned.includes(name));
        for (const name of [...owned, ...stale]) {
            const target = resolve(destination, name);
            if (!target.startsWith(destination + sep)) throw new Error('Unsafe generated path');
            if (stale.includes(name)) { if (check) throw new Error(`Stale generated file ${lang}/${name}`); await rm(target, { force: true }); continue; }
            if (check) {
                let actual;
                try { actual = await readFile(target); } catch { throw new Error(`Missing generated file ${lang}/${name}`); }
                if (!actual.equals(await readFile(join(stage, name)))) throw new Error(`Generated drift: ${lang}/${name}`);
            } else await copy(join(stage, name), target);
        }
        console.log(`${check ? 'Verified' : 'Generated'} ${lang}: ${owned.length} files`);
    } finally { await rm(stage, { recursive: true, force: true }); }
}
