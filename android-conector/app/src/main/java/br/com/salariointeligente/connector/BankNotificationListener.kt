package br.com.salariointeligente.connector

import android.app.Notification
import android.os.Bundle
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
        const val PREF_LAST_NOTIFICATION_AT = "last_notification_at"
        const val PREF_LAST_NOTIFICATION_PACKAGE = "last_notification_package"
        const val PREF_NOTIFICATIONS_SEEN = "notifications_seen"
        const val PREF_EVENTS_DETECTED = "events_detected"
        const val PREF_LAST_BANK_AT = "last_bank_at"
        const val PREF_LAST_BANK_PACKAGE = "last_bank_package"
        const val PREF_LAST_BANK_RESULT = "last_bank_result"
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "Listener conectado; aguardando notificações novas em tempo real.")
        // O Android pode entregar notificações que já estavam na central ao conectar.
        // Isso serve para recuperar eventos pendentes, mas não comprova captura em tempo real.
        try {
            activeNotifications?.forEach { sbn -> processNotification(sbn, fromHistory = true) }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao verificar notificações ainda ativas", e)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        processNotification(sbn, fromHistory = false)
    }

    private fun extractNotificationText(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras ?: Bundle()
        val parts = mutableListOf<String>()
        fun add(value: CharSequence?) {
            val text = value?.toString()?.trim().orEmpty()
            if (text.isNotBlank() && text !in parts) parts.add(text)
        }
        add(extras.getCharSequence(Notification.EXTRA_TITLE))
        add(extras.getCharSequence(Notification.EXTRA_TEXT))
        add(extras.getCharSequence(Notification.EXTRA_BIG_TEXT))
        add(extras.getCharSequence(Notification.EXTRA_SUB_TEXT))
        add(extras.getCharSequence(Notification.EXTRA_INFO_TEXT))
        add(extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT))
        add(sbn.notification.tickerText)
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { add(it) }

        // Alguns bancos usam notificações no formato MessagingStyle.
        extras.getParcelableArray(Notification.EXTRA_MESSAGES)?.forEach { item ->
            val message = item as? Bundle
            add(message?.getCharSequence("text"))
        }
        return parts.joinToString(" — ").replace(Regex("\\s+"), " ").take(2000)
    }

    private fun processNotification(sbn: StatusBarNotification, fromHistory: Boolean) {
        try {
            val prefs = getSharedPreferences(ConnectorConfig.PREFS, MODE_PRIVATE)
            prefs.edit()
                .putLong(PREF_LAST_NOTIFICATION_AT, System.currentTimeMillis())
                .putString(PREF_LAST_NOTIFICATION_PACKAGE, sbn.packageName)
                .putInt(PREF_NOTIFICATIONS_SEEN, prefs.getInt(PREF_NOTIFICATIONS_SEEN, 0) + 1)
                .apply()

            Log.i(TAG, "Notificação ${if (fromHistory) "ativa/histórica" else "NOVA"}: pacote=${sbn.packageName}, chave=${sbn.key}, horário=${sbn.postTime}")

            val isBank = BankEventParser.isBankPackage(sbn.packageName)
            fun markBank(result: String) {
                if (!isBank) return
                prefs.edit()
                    .putLong(PREF_LAST_BANK_AT, System.currentTimeMillis())
                    .putString(PREF_LAST_BANK_PACKAGE, sbn.packageName)
                    .putString(PREF_LAST_BANK_RESULT, result)
                    .apply()
            }

            val token = prefs.getString(ConnectorConfig.DEVICE_TOKEN, null)
            if (token.isNullOrBlank()) {
                markBank("celular ainda não vinculado ao site")
                Log.w(TAG, "Notificação recebida, mas este celular ainda não está vinculado")
                return
            }

            val text = extractNotificationText(sbn)
            if (text.isBlank()) {
                markBank("notificação sem texto legível")
                Log.d(TAG, "Notificação sem texto legível; extras=${sbn.notification.extras?.keySet()?.joinToString()}")
                return
            }

            val event = BankEventParser.parse(sbn.packageName, text, sbn.key, sbn.postTime)
            if (event == null) {
                markBank("não reconhecida: " + BankEventParser.rejectionReason(sbn.packageName, text))
                // Não registrar o conteúdo bancário nos logs; somente diagnóstico estrutural.
                Log.d(TAG, "Não reconhecida: pacote=${sbn.packageName}, tamanho=${text.length}, extras=${sbn.notification.extras?.keySet()?.joinToString()}")
                return
            }

            markBank(if (event.optString("kind") == "income") "reconhecida como ENTRADA" else "reconhecida como SAÍDA")
            PendingSync.enqueue(this, event)
            prefs.edit().putInt(PREF_EVENTS_DETECTED, prefs.getInt(PREF_EVENTS_DETECTED, 0) + 1).apply()
            Log.i(TAG, "Movimentação identificada: ${event.optString("bank_name")} ${event.optString("kind")} · ${event.optString("amount")}")

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(this).enqueue(request)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao processar notificação", e)
        }
    }
}
