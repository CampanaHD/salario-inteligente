package br.com.salariointeligente.connector

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class BankNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val token = getSharedPreferences(ConnectorConfig.PREFS, MODE_PRIVATE).getString(ConnectorConfig.DEVICE_TOKEN, null) ?: return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString().orEmpty()
        val body = extras.getCharSequence("android.bigText")?.toString()
            ?: extras.getCharSequence("android.text")?.toString().orEmpty()
        val text = listOf(title, body).filter { it.isNotBlank() }.joinToString(" — ")
        val event = BankEventParser.parse(sbn.packageName, text, sbn.key, sbn.postTime) ?: return
        PendingSync.enqueue(this, event)
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val request = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()
        WorkManager.getInstance(this).enqueue(request)
    }
}
