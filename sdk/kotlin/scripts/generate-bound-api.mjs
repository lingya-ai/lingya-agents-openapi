// Generates one public Kotlin facade per OpenAPI tag from the canonical manifest.
//
// Retrofit keeps channelId in its wire-level signatures. These wrappers remove the
// client-bound parameter and inject it immediately before delegating the request.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('openapi/endpoints.json', root), 'utf8'));
const outputDir = new URL('src/main/kotlin/cloud/lingya/agents/sdk/api/', root);
await mkdir(outputDir, { recursive: true });

const upperFirst = (value) => `${value[0].toUpperCase()}${value.slice(1)}`;
const apiClass = (group) => group === 'sql' ? 'SQLApi' : `${upperFirst(group)}Api`;
const facadeClass = (group) => `${upperFirst(group)}Api`;
const blockingClass = (group) => `Blocking${upperFirst(group)}Api`;
const groups = [...new Set(manifest.map((operation) => operation.group))];

for (const group of groups) {
    await rm(new URL(`Lingya${upperFirst(group)}Api.kt`, outputDir), { force: true });
    await rm(new URL(`BlockingLingya${upperFirst(group)}Api.kt`, outputDir), { force: true });
}

function methodSignature(source, operationId) {
    const match = new RegExp(`suspend fun ${operationId}\\((.*)\\): Response<([^>]+)>`).exec(source);
    if (!match && operationId === 'streamChatEvents') {
        return {
            parameters: [
                '@Path("channelId") channelId: kotlin.String',
                '@Path("conversationId") conversationId: kotlin.String',
                '@Body aiChatStreamInput: AiChatStreamInput',
                '@Header("X-Request-ID") xRequestID: kotlin.String? = null',
            ],
            responseType: 'Unit',
        };
    }
    if (!match && operationId === 'probeEventStream') {
        return {
            parameters: [
                '@Path("channelId") channelId: kotlin.String',
                '@Body chatStreamProbeInput: ChatStreamProbeInput',
                '@Header("X-Request-ID") xRequestID: kotlin.String? = null',
            ],
            responseType: 'Unit',
        };
    }
    if (!match) throw new Error(`Cannot find generated Kotlin method ${operationId}`);
    return { parameters: match[1].split(/,\s+(?=@)/), responseType: match[2] };
}

function stripAnnotations(parameter) {
    return parameter
        .replace(/@\w+(?:\([^)]*\))?\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parameterName(parameter) {
    return stripAnnotations(parameter).split(':', 1)[0].trim();
}

function qualifyNestedEnums(parameter, source, generatedApi) {
    let result = stripAnnotations(parameter);
    for (const match of source.matchAll(/enum class (\w+)/g)) {
        result = result.replace(new RegExp(`\\b${match[1]}\\b`, 'g'), `${generatedApi}.${match[1]}`);
    }
    return result;
}

for (const group of groups) {
    const generatedApi = apiClass(group);
    const generatedAlias = `Generated${generatedApi}`;
    const className = facadeClass(group);
    const blockingName = blockingClass(group);
    const source = await readFile(new URL(`generated/src/main/kotlin/cloud/lingya/agents/sdk/generated/api/${generatedApi}.kt`, root), 'utf8');
    const operations = manifest.filter((operation) => operation.group === group);
    const asyncLines = [
        'package cloud.lingya.agents.sdk.api',
        '',
        'import cloud.lingya.agents.sdk.AgentsUserClient',
        'import cloud.lingya.agents.sdk.bodyOrThrow',
        'import cloud.lingya.agents.sdk.RequestOptions',
        'import cloud.lingya.agents.sdk.DownloadResponse',
        'import cloud.lingya.agents.sdk.filename',
        `import cloud.lingya.agents.sdk.generated.api.${generatedApi} as ${generatedAlias}`,
        'import cloud.lingya.agents.sdk.generated.model.*',
        'import kotlinx.coroutines.flow.Flow',
        '',
        '/**',
        ` * ${group} 分组的 channel 绑定异步接口。 / Channel-bound asynchronous ${group} operations.`,
        ' *',
        ' * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。',
        ' * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.',
        ' *',
        ' * @author 思追(shaco)',
        ' */',
        `public class ${className} internal constructor(`,
        '    private val channelId: String,',
        `    private val delegate: ${generatedAlias},`,
        '    private val userClient: AgentsUserClient,',
        ') {',
    ];
    const blockingLines = [
        'package cloud.lingya.agents.sdk.api',
        '',
        `import cloud.lingya.agents.sdk.generated.api.${generatedApi} as ${generatedAlias}`,
        'import cloud.lingya.agents.sdk.generated.model.*',
        'import kotlinx.coroutines.flow.toList',
        'import kotlinx.coroutines.runBlocking',
        'import cloud.lingya.agents.sdk.RequestOptions',
        'import cloud.lingya.agents.sdk.DownloadResponse',
        '',
        '/**',
        ` * ${group} 分组的 Java 友好阻塞接口。 / Java-friendly blocking ${group} operations.`,
        ' *',
        ' * @author 思追(shaco)',
        ' */',
        `public class ${blockingName} internal constructor(`,
        `    private val delegate: ${className},`,
        ') {',
    ];

    for (const operation of operations) {
        const generated = methodSignature(source, operation.operationId);
        const nonChannel = generated.parameters.slice(1);
        const bodyIndex = nonChannel.findIndex((parameter) => parameter.includes('@Body'));
        const parameters = nonChannel.map((parameter, index) => {
            const qualified = qualifyNestedEnums(parameter, source, generatedAlias);
            return index === bodyIndex ? qualified.replace(/^\w+:/, 'input:') : qualified;
        });
        const argumentNames = nonChannel.map((parameter, index) => index === bodyIndex ? 'input' : parameterName(parameter));
        const returnType = operation.sse
            ? operation.operationId === 'streamChatEvents' ? 'Flow<cloud.lingya.agents.sdk.event.AiChatBriefEvent>' : 'Flow<ChatStreamProbeEvent>'
            : generated.responseType === 'ResponseBody' ? 'ByteArray' : generated.responseType;
        const blockingReturn = operation.sse
            ? operation.operationId === 'streamChatEvents' ? 'List<cloud.lingya.agents.sdk.event.AiChatBriefEvent>' : 'List<ChatStreamProbeEvent>'
            : returnType;
        asyncLines.push('    /**');
        asyncLines.push(`     * ${operation.summary}`);
        asyncLines.push('     *');
        for (const parameter of operation.parameters.filter((parameter) => !parameter.boundFrom)) {
            const name = parameter.in === 'header' && parameter.name === 'X-Request-ID' ? 'xRequestID' : parameter.name === 'Accept' ? 'accept' : parameter.name;
            asyncLines.push(`     * @param ${name} ${parameter.description}`);
        }
        if (operation.requestBodySchema) asyncLines.push(`     * @param input ${operation.summary} 的强类型请求体。 / Typed request body for ${operation.operationId}.`);
        asyncLines.push('     * @return 契约定义的强类型响应。 / The typed response defined by the contract.');
        asyncLines.push('     */');
        asyncLines.push(`    public ${operation.sse ? 'fun' : 'suspend fun'} ${operation.operationId}(`);
        for (const parameter of parameters) asyncLines.push(`        ${parameter},`);
        asyncLines.push(`    ): ${returnType} = ${operation.operationId}(${[...argumentNames, 'RequestOptions()'].join(', ')})`);
        asyncLines.push(`    public ${operation.sse ? 'fun' : 'suspend fun'} ${operation.operationId}(`);
        for (const parameter of parameters) asyncLines.push(`        ${parameter},`);
        asyncLines.push('        requestOptions: RequestOptions,');
        asyncLines.push(`    ): ${returnType} =`);
        if (operation.sse) {
            asyncLines.push(`        userClient.${operation.operationId}Internal(${[...argumentNames, 'requestOptions'].join(', ')})`);
        } else {
            const call = `api.${group}.${operation.operationId}(${['channelId', ...argumentNames].join(', ')})`;
            asyncLines.push(generated.responseType === 'ResponseBody' ? `        userClient.execute(requestOptions) { api -> ${call}.bodyOrThrow().use { it.bytes() } }` : `        userClient.execute(requestOptions) { api -> ${call}.bodyOrThrow() }`);
        }
        asyncLines.push('');

        blockingLines.push('    /**');
        blockingLines.push(`     * ${operation.summary}`);
        blockingLines.push('     *');
        for (const parameter of operation.parameters.filter((parameter) => !parameter.boundFrom)) {
            const name = parameter.in === 'header' && parameter.name === 'X-Request-ID' ? 'xRequestID' : parameter.name === 'Accept' ? 'accept' : parameter.name;
            blockingLines.push(`     * @param ${name} ${parameter.description}`);
        }
        if (operation.requestBodySchema) blockingLines.push(`     * @param input ${operation.summary} 的强类型请求体。 / Typed request body for ${operation.operationId}.`);
        blockingLines.push('     * @return 契约定义的强类型响应。 / The typed response defined by the contract.');
        blockingLines.push('     */');
        blockingLines.push(`    public fun ${operation.operationId}(`);
        for (const parameter of parameters) blockingLines.push(`        ${parameter},`);
        blockingLines.push(`    ): ${blockingReturn} = runBlocking {`);
        blockingLines.push(`        delegate.${operation.operationId}(${argumentNames.join(', ')})${operation.sse ? '.toList()' : ''}`);
        blockingLines.push('    }');
        blockingLines.push('');
        blockingLines.push(`    public fun ${operation.operationId}(`);
        for (const parameter of parameters) blockingLines.push(`        ${parameter},`);
        blockingLines.push('        requestOptions: RequestOptions,');
        blockingLines.push(`    ): ${blockingReturn} = runBlocking { delegate.${operation.operationId}(${[...argumentNames, 'requestOptions'].join(', ')})${operation.sse ? '.toList()' : ''} }`);
        if (generated.responseType === 'ResponseBody') {
            asyncLines.push(`    public suspend fun ${operation.operationId}WithMetadata(`);
            for (const parameter of parameters) asyncLines.push(`        ${parameter},`);
            asyncLines.push('        requestOptions: RequestOptions = RequestOptions(),');
            asyncLines.push('    ): DownloadResponse = userClient.execute(requestOptions) { api ->');
            asyncLines.push(`        val response = api.${group}.${operation.operationId}(${['channelId', ...argumentNames].join(', ')})`);
            asyncLines.push('        response.bodyOrThrow().use { body -> DownloadResponse(body.bytes(), filename(response.headers()), response.headers()["Content-Type"], response.headers(), response.code(), response.headers()["X-Request-ID"]) }');
            asyncLines.push('    }');
            blockingLines.push(`    public fun ${operation.operationId}WithMetadata(`);
            for (const parameter of parameters) blockingLines.push(`        ${parameter},`);
            blockingLines.push('        requestOptions: RequestOptions = RequestOptions(),');
            blockingLines.push(`    ): DownloadResponse = runBlocking { delegate.${operation.operationId}WithMetadata(${[...argumentNames, 'requestOptions'].join(', ')}) }`);
        }
    }
    if (group === 'chat') blockingLines.push('    @JvmOverloads public fun subscribeChatEvents(conversationId: String, input: AiChatStreamInput, transport: String = "sse", requestOptions: RequestOptions = RequestOptions()): cloud.lingya.agents.sdk.ChatSubscription = delegate.subscribeChatEvents(conversationId, input, transport, requestOptions)');
    if (group === 'chat') asyncLines.push('    public fun subscribeChatEvents(conversationId: String, input: AiChatStreamInput, transport: String = "sse", requestOptions: RequestOptions = RequestOptions()): cloud.lingya.agents.sdk.ChatSubscription = userClient.subscribeChatEventsInternal(conversationId, input, transport, requestOptions)');
    asyncLines.push('}');
    blockingLines.push('}');
    await writeFile(new URL(`${className}.kt`, outputDir), `${asyncLines.join('\n')}\n`, 'utf8');
    await writeFile(new URL(`${blockingName}.kt`, outputDir), `${blockingLines.join('\n')}\n`, 'utf8');
}
