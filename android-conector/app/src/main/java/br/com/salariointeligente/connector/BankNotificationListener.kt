
package br.com.salariointeligente.connector

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class BankNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "SI_CONNECTOR"
    }

    override fun onListenerConnected() {
        super.onListenerConnected()

        Log.i(TAG, "Serviço de notificações conectado!")

        // Tenta processar notificações que ainda estão visíveis
        // na central de notificações do Android.
        try {
            activeNotifications?.forEach { sbn ->
                processNotification(sbn)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao verificar notificações ativas", e)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        processNotification(sbn)
    }

    private fun processNotification(sbn: StatusBarNotification) {
        try {
            val token = getSharedPreferences(
                ConnectorConfig.PREFS,
                MODE_PRIVATE
            ).getString(ConnectorConfig.DEVICE_TOKEN, null)

            if (token.isNullOrBlank()) {
                Log.w(TAG, "Dispositivo ainda não está vinculado")
                return
            }

            val extras = sbn.notification.extras

            val title = extras
                .getCharSequence("android.title")
                ?.toString()
                .orEmpty()

            val bigText = extras
                .getCharSequence("android.bigText")
                ?.toString()
                .orEmpty()

            val normalText = extras
                .getCharSequence("android.text")
                ?.toString()
                .orEmpty()

            // Se bigText estiver vazio, utiliza android.text.
            val body = bigText.ifBlank { normalText }

            val text = listOf(title, body)
                .filter { it.isNotBlank() }
                .joinToString(" — ")

            Log.d(TAG, "Notificação recebida do pacote: ${sbn.packageName}")

            val event = BankEventParser.parse(
                sbn.packageName,
                text,
                sbn.key,
                sbn.postTime
            )

            if (event == null) {
                Log.d(TAG, "Notificação recebida, mas não reconhecida pelo parser")
                return
            }

            PendingSync.enqueue(this, event)

            Log.i(
                TAG,
                "Movimentação reconhecida: ${event.optString("bank_name")} " +
                    "${event.optString("kind")} - ${event.optString("amount")}"
            )

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(this).enqueue(request)

            Log.d(TAG, "Sincronização agendada")

        } catch (e: Exception) {
            Log.e(TAG, "Erro ao processar notificação", e)
        }
    }
}
