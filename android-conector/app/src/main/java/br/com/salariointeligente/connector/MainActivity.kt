package br.com.salariointeligente.connector

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
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

    private lateinit var statusHost: LinearLayout
    private lateinit var lastNotification: TextView
    private lateinit var restrictedHelp: LinearLayout
    private lateinit var accessButton: Button

    private companion object {
        val BG: Int = Color.parseColor("#0F1718")
        val CARD: Int = Color.parseColor("#182223")
        val LINE: Int = Color.parseColor("#2B3A3C")
        val INK: Int = Color.parseColor("#E3EFEF")
        val MUTED: Int = Color.parseColor("#9BB0B4")
        val ACCENT: Int = Color.parseColor("#48C6A5")
        val ON_ACCENT: Int = Color.parseColor("#06251E")
        val WARN: Int = Color.parseColor("#F5C542")
        val BAD: Int = Color.parseColor("#FF7C89")
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun shape(color: Int, radius: Int, stroke: Int? = null): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
            if (stroke != null) setStroke(dp(1), stroke)
        }

    private fun label(value: String, size: Float, color: Int, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun card(): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = shape(CARD, 18, LINE)
            setPadding(dp(18), dp(18), dp(18), dp(18))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(14) }
        }

    private fun primaryButton(title: String, onClick: () -> Unit): Button =
        Button(this).apply {
            text = title
            setAllCaps(false)
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ON_ACCENT)
            background = shape(ACCENT, 14)
            stateListAnimator = null
            setOnClickListener { onClick() }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(50)
            ).apply { topMargin = dp(14) }
        }

    private fun secondaryButton(title: String, onClick: () -> Unit): Button =
        Button(this).apply {
            text = title
            setAllCaps(false)
            textSize = 14f
            setTextColor(INK)
            background = shape(Color.TRANSPARENT, 14, LINE)
            stateListAnimator = null
            setOnClickListener { onClick() }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(46)
            ).apply { topMargin = dp(10) }
        }

    private fun stepBadge(number: String): TextView =
        label(number, 13f, ON_ACCENT, true).apply {
            gravity = Gravity.CENTER
            background = shape(ACCENT, 10)
            layoutParams = LinearLayout.LayoutParams(dp(28), dp(28)).apply { rightMargin = dp(12) }
        }

    private fun stepHeader(number: String, title: String): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(stepBadge(number))
            addView(label(title, 16f, INK, true))
        }

    private fun statusRow(title: String, value: String, tint: Int): LinearLayout {
        val dot = GradientDrawable()
        dot.shape = GradientDrawable.OVAL
        dot.setColor(tint)

        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER_VERTICAL
        row.setPadding(0, dp(7), 0, dp(7))

        val marker = View(this)
        marker.background = dot
        marker.layoutParams = LinearLayout.LayoutParams(dp(10), dp(10)).apply { rightMargin = dp(10) }
        row.addView(marker)

        row.addView(
            label(title, 14f, MUTED),
            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        )
        row.addView(label(value, 14f, tint, true))
        return row
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.setBackgroundColor(BG)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(22), dp(18), dp(28))
        }

        val scroll = ScrollView(this).apply {
            setBackgroundColor(BG)
            isFillViewport = true
            addView(root)
        }

        // Android 15+ desenha o app sob as barras do sistema; reserva o espaço delas.
        scroll.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 35) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            }
            insets
        }

        // Cabeçalho
        root.addView(
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(2), 0, 0, dp(18))

                addView(
                    label("S", 22f, ON_ACCENT, true).apply {
                        gravity = Gravity.CENTER
                        background = shape(ACCENT, 16)
                        layoutParams = LinearLayout.LayoutParams(dp(52), dp(52)).apply { rightMargin = dp(14) }
                    }
                )
                addView(
                    LinearLayout(context).apply {
                        orientation = LinearLayout.VERTICAL
                        addView(label("Salário Inteligente", 20f, INK, true))
                        addView(label("Conector bancário · beta", 13f, MUTED))
                    }
                )
            }
        )

        // Situação atual
        val statusCard = card()
        statusCard.addView(label("SITUAÇÃO", 11f, ACCENT, true))
        statusHost = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(6), 0, 0)
        }
        statusCard.addView(statusHost)
        lastNotification = label("", 12f, MUTED).apply { setPadding(0, dp(8), 0, 0) }
        statusCard.addView(lastNotification)
        root.addView(statusCard)

        // Passo 1: vincular
        val pairCard = card()
        pairCard.addView(stepHeader("1", "Vincular ao site"))
        pairCard.addView(
            label(
                "No site, abra Integração bancária, gere o código de pareamento e cole abaixo.",
                13f,
                MUTED
            ).apply { setPadding(0, dp(10), 0, dp(10)) }
        )

        val code = EditText(this).apply {
            hint = "Código de pareamento"
            setHintTextColor(MUTED)
            setTextColor(INK)
            textSize = 15f
            setSingleLine(true)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            background = shape(BG, 12, LINE)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        pairCard.addView(
            code,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val pair = primaryButton("Vincular ao Salário Inteligente") {}
        pairCard.addView(pair)
        root.addView(pairCard)

        // Passo 2: notificações
        val accessCard = card()
        accessCard.addView(stepHeader("2", "Ler notificações do banco"))
        accessCard.addView(
            label(
                "O app só lê notificações de bancos e envia valor, descrição e tipo da movimentação. " +
                    "O texto original não é guardado.",
                13f,
                MUTED
            ).apply { setPadding(0, dp(10), 0, 0) }
        )

        accessButton = primaryButton("Ativar notificações") { openListenerSettings() }
        accessCard.addView(accessButton)

        restrictedHelp = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = shape(Color.parseColor("#2A2412"), 14, Color.parseColor("#5C4A16"))
            setPadding(dp(14), dp(14), dp(14), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(14) }

            addView(label("A chave está cinza ou aparece “Configuração restrita”?", 14f, WARN, true))
            addView(
                label(
                    "O Android bloqueia essa permissão em apps instalados fora da loja. " +
                        "É uma proteção do sistema, e libera uma única vez:\n\n" +
                        "1. Toque em “Ativar notificações”, tente ligar a chave e toque em OK no aviso.\n" +
                        "2. Toque em “Abrir informações do app” aqui embaixo.\n" +
                        "3. Toque nos três pontinhos ⋮ no canto superior direito e escolha " +
                        "“Permitir configurações restritas”.\n" +
                        "4. Volte e ligue a chave do Salário Inteligente Conector.",
                    13f,
                    INK
                ).apply { setPadding(0, dp(8), 0, 0) }
            )
            addView(secondaryButton("Abrir informações do app") { openAppInfo() })
        }
        accessCard.addView(restrictedHelp)
        root.addView(accessCard)

        // Rodapé
        val version = try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        } catch (e: Exception) {
            ""
        }
        root.addView(
            label("Versão $version", 12f, MUTED).apply {
                gravity = Gravity.CENTER
                setPadding(0, dp(4), 0, 0)
            }
        )

        setContentView(scroll)

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

    /** Abre direto a tela do nosso serviço quando o Android permite; senão, a lista geral. */
    private fun openListenerSettings() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                val component = ComponentName(this, BankNotificationListener::class.java)
                startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                        .putExtra(
                            Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                            component.flattenToString()
                        )
                )
            } else {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        } catch (e: Exception) {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
    }

    private fun openAppInfo() {
        try {
            startActivity(
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName")
                )
            )
        } catch (e: Exception) {
            Toast.makeText(this, "Abra Configurações › Apps › Salário Inteligente Conector.", Toast.LENGTH_LONG).show()
        }
    }

    private fun refreshStatus() {
        val prefs = getSharedPreferences(ConnectorConfig.PREFS, MODE_PRIVATE)
        val linked = prefs.contains(ConnectorConfig.DEVICE_TOKEN)
        val enabled = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        )?.contains(packageName) == true
        val seen = prefs.getInt(BankNotificationListener.PREF_NOTIFICATIONS_SEEN, 0)
        val detected = prefs.getInt(BankNotificationListener.PREF_EVENTS_DETECTED, 0)
        val lastPackage = prefs.getString(BankNotificationListener.PREF_LAST_NOTIFICATION_PACKAGE, null)
        val lastAt = prefs.getLong(BankNotificationListener.PREF_LAST_NOTIFICATION_AT, 0L)

        statusHost.removeAllViews()
        statusHost.addView(
            statusRow("Vínculo com o site", if (linked) "Ativo" else "Não vinculado", if (linked) ACCENT else WARN)
        )
        statusHost.addView(
            statusRow("Acesso às notificações", if (enabled) "Autorizado" else "Desativado", if (enabled) ACCENT else BAD)
        )
        statusHost.addView(statusRow("Notificações recebidas", seen.toString(), if (seen > 0) ACCENT else MUTED))
        statusHost.addView(statusRow("Movimentações identificadas", detected.toString(), if (detected > 0) ACCENT else MUTED))

        lastNotification.text = if (lastAt > 0L) {
            "Última notificação: ${lastPackage ?: "pacote desconhecido"} · " +
                java.text.DateFormat.getTimeInstance().format(java.util.Date(lastAt))
        } else {
            "Ainda não chegou nenhuma notificação desde a instalação."
        }

        accessButton.text = if (enabled) "Acesso autorizado ✓  (gerenciar)" else "Ativar notificações"
        // A trava de “configurações restritas” existe a partir do Android 13.
        restrictedHelp.visibility =
            if (!enabled && Build.VERSION.SDK_INT >= 33) View.VISIBLE else View.GONE
    }

    override fun onResume() {
        super.onResume()
        if (::statusHost.isInitialized) refreshStatus()
    }

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }
}
