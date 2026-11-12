
package br.com.salariointeligente.connector

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {

    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (20 * resources.displayMetrics.density).toInt()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            gravity = Gravity.CENTER_VERTICAL
        }

        root.addView(
            TextView(this).apply {
                text = "Salário Inteligente Conector"
                textSize = 24f
                setPadding(0, 0, 0, pad)
            }
        )

        root.addView(
            TextView(this).apply {
                text = "1. Gere um código em Integração bancária no site.\n" +
                    "2. Cole o código abaixo para vincular este celular.\n" +
                    "3. Autorize o acesso às notificações."
                textSize = 15f
                setPadding(0, 0, 0, pad)
            }
        )

        val code = EditText(this).apply {
            hint = "Código de pareamento"
            setSingleLine(true)
        }

        root.addView(
            code,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val pair = Button(this).apply {
            text = "Vincular ao Salário Inteligente"
        }

        root.addView(pair)

        val access = Button(this).apply {
            text = "Ativar acesso às notificações"
            setOnClickListener {
                startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                )
            }
        }

        root.addView(access)

        status = TextView(this).apply {
            textSize = 14f
            setPadding(0, pad, 0, 0)
        }

        root.addView(status)

        setContentView(root)

        refreshStatus()

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodic = PeriodicWorkRequestBuilder<SyncWorker>(
            15,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "si-bank-sync",
            ExistingPeriodicWorkPolicy.KEEP,
            periodic
        )

        pair.setOnClickListener {
            val value = code.text.toString().trim()

            if (value.isBlank()) {
                Toast.makeText(
                    this,
                    "Cole o código gerado no site.",
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }

            pair.isEnabled = false

            executor.execute {
                try {
                    val token = Api.pair(value)

                    getSharedPreferences(
                        ConnectorConfig.PREFS,
                        MODE_PRIVATE
                    ).edit()
                        .putString(ConnectorConfig.DEVICE_TOKEN, token)
                        .apply()

                    runOnUiThread {
                        code.setText("")
                        pair.isEnabled = true
                        refreshStatus()

                        Toast.makeText(
                            this,
                            "Celular vinculado!",
                            Toast.LENGTH_LONG
                        ).show()
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        pair.isEnabled = true

                        Toast.makeText(
                            this,
                            e.message ?: "Falha no pareamento",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }
    }

    private fun refreshStatus() {
        val linked = getSharedPreferences(
            ConnectorConfig.PREFS,
            MODE_PRIVATE
        ).contains(ConnectorConfig.DEVICE_TOKEN)

        status.text = if (linked) {
            "Dispositivo vinculado. Ative o acesso às notificações para iniciar a captura."
        } else {
            "Este celular ainda não está vinculado."
        }
    }

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }
}
