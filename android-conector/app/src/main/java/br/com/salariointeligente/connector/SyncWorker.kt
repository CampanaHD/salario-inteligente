package br.com.salariointeligente.connector

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    companion object {
        const val PREF_LAST_SYNC_AT = "last_sync_at"
        const val PREF_LAST_SYNC_ERROR = "last_sync_error"
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(ConnectorConfig.PREFS, Context.MODE_PRIVATE)
        val token = prefs.getString(ConnectorConfig.DEVICE_TOKEN, null) ?: return Result.success()
        val events = PendingSync.snapshot(applicationContext)
        if (events.length() == 0) return Result.success()
        return try {
            val sent = mutableSetOf<String>()
            for (i in 0 until events.length()) {
                val event = events.getJSONObject(i)
                Api.sync(token, event)
                sent.add(event.optString("external_id"))
            }
            PendingSync.removeSent(applicationContext, sent)
            prefs.edit()
                .putLong(PREF_LAST_SYNC_AT, System.currentTimeMillis())
                .remove(PREF_LAST_SYNC_ERROR)
                .apply()
            Result.success()
        } catch (e: Exception) {
            prefs.edit()
                .putLong(PREF_LAST_SYNC_AT, System.currentTimeMillis())
                .putString(PREF_LAST_SYNC_ERROR, (e.message ?: e.javaClass.simpleName).take(160))
                .apply()
            Result.retry()
        }
    }
}
