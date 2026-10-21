package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.SQLApi as GeneratedSQLApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * sql 分组的 Java 友好阻塞接口。 / Java-friendly blocking sql operations.
 *
 * @author 思追(shaco)
 */
public class BlockingSqlApi internal constructor(
    private val delegate: SqlApi,
) {
    /**
     * 分页读取 SQL 结果 / Get paged SQL results
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param resultId SQL 查询结果 ID。 / SQL query-result ID.
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getSqlQueryResult(
        conversationId: kotlin.String,
        resultId: kotlin.String,
        current: kotlin.Int? = 0,
        size: kotlin.Int? = 100,
    ): SqlQueryResultPage = runBlocking {
        delegate.getSqlQueryResult(conversationId, resultId, current, size)
    }

    /**
     * 读取 SQL 图表数据 / Get SQL chart data
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param resultId SQL 查询结果 ID。 / SQL query-result ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getSqlQueryChartData(
        conversationId: kotlin.String,
        resultId: kotlin.String,
    ): SqlChartDataset = runBlocking {
        delegate.getSqlQueryChartData(conversationId, resultId)
    }

    /**
     * 导出 SQL 结果 / Export SQL results
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param resultId SQL 查询结果 ID。 / SQL query-result ID.
     * @param format 导出格式。 / Export format.
     * @param accept 期望的导出媒体类型。 / Requested export media type.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun exportSqlQueryResult(
        conversationId: kotlin.String,
        resultId: kotlin.String,
        format: GeneratedSQLApi.FormatExportSqlQueryResult,
        accept: kotlin.String? = null,
    ): ByteArray = runBlocking {
        delegate.exportSqlQueryResult(conversationId, resultId, format, accept)
    }

}
