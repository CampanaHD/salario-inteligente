package br.com.salariointeligente.connector

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object PendingSync {
    private const val KEY = "pending_events"
    private val lock = Any()
    fun enqueue(context: Context, event: JSONObject) = synchronized(lock) {
        val prefs = context.getSharedPreferences(ConnectorConfig.PREFS, Context.MODE_PRIVATE)
        val old = try { JSONArray(prefs.getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }
        if (old.length() >= 100) return@synchronized
        val id = event.optString("external_id")
        for (i in 0 until old.length()) if (old.optJSONObject(i)?.optString("external_id") == id) return@synchronized
        old.put(event)
        prefs.edit().putString(KEY, old.toString()).apply()
    }
    fun snapshot(context: Context): JSONArray = synchronized(lock) {
        val prefs = context.getSharedPreferences(ConnectorConfig.PREFS, Context.MODE_PRIVATE)
        try { JSONArray(prefs.getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }
    }
    fun removeSent(context: Context, sent: Set<String>) = synchronized(lock) {
        val prefs = context.getSharedPreferences(ConnectorConfig.PREFS, Context.MODE_PRIVATE)
        val old = try { JSONArray(prefs.getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }
        val next = JSONArray()
        for (i in 0 until old.length()) { val item = old.optJSONObject(i) ?: continue; if (!sent.contains(item.optString("external_id"))) next.put(item) }
        prefs.edit().putString(KEY, next.toString()).apply()
    }
}
