package br.com.salariointeligente.connector

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Api {
    private fun post(body: JSONObject): JSONObject {
        val conn = (URL(ConnectorConfig.FUNCTION_URL).openConnection() as HttpURLConnection)
        conn.requestMethod = "POST"
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("apikey", ConnectorConfig.SUPABASE_ANON_KEY)
        conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        val code = conn.responseCode
        val stream = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?: throw IllegalStateException("Servidor respondeu HTTP $code sem conteúdo")
        val response = stream.bufferedReader().use { it.readText() }
        conn.disconnect()
        val json = JSONObject(response)
        if (json.has("error")) throw IllegalStateException(json.getString("error"))
        return json
    }
    
fun pair(code: String): String {
    val result = post(
        JSONObject()
            .put("action", "pair")
            .put("pair_code", code.trim())
    )

    val token = result.optString("device_token", "")

    if (token.isBlank()) {
        throw IllegalStateException(
            "Resposta inesperada do servidor: $result"
        )
    }

    return token
}

    fun sync(token: String, event: JSONObject) {
    val result = post(
        JSONObject()
            .put("action", "sync")
            .put("device_token", token)
            .put("events", JSONArray().put(event))
    )

    val accepted = result.optInt("accepted", 0)

    if (accepted == 0) {
        throw IllegalStateException(
            "Servidor recebeu, mas rejeitou a movimentação: $result"
        )
    }

    android.util.Log.d(
        "SI_CONNECTOR",
        "Movimentação aceita pelo servidor: $result"
    )
}
}
