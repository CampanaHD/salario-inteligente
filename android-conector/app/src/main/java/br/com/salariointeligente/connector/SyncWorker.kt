package br.com.salariointeligente.connector

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
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
            Result.success()
        } catch (_: Exception) { Result.retry() }
    }
}
