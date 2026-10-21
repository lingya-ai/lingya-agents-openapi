package cloud.lingya.agents.sdk.event

internal class SseEventParser {
    private val dataLines = mutableListOf<String>()

    fun accept(line: String): String? {
        if (line.isEmpty()) return dispatch()
        if (line.startsWith(':')) return null
        val separator = line.indexOf(':')
        val field = if (separator < 0) line else line.substring(0, separator)
        var value = if (separator < 0) "" else line.substring(separator + 1)
        if (value.startsWith(' ')) value = value.substring(1)
        if (field == "data") dataLines += value
        return null
    }

    fun finish(): String? = null

    private fun dispatch(): String? {
        if (dataLines.isEmpty()) return null
        val data = dataLines.joinToString("\n")
        dataLines.clear()
        return data
    }
}
