package br.com.salariointeligente.connector

import java.security.MessageDigest
import java.text.Normalizer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import org.json.JSONObject

object BankEventParser {
    private val bankPackages = mapOf(
        "com.nu.production" to "Nubank", "br.com.intermedium" to "Banco Inter",
        "br.com.bb.android" to "Banco do Brasil", "br.gov.caixa" to "Caixa",
        "com.bradesco" to "Bradesco", "com.santander.app" to "Santander", "com.itau" to "Itaú"
    )
    private val amountRegex = Regex("(?i)R\\$[\\s\\u00A0]*([0-9.]+,[0-9]{2})|([0-9.]+,[0-9]{2})[\\s\\u00A0]*reais")
    private fun normalized(s: String) = Normalizer.normalize(s.lowercase(Locale("pt", "BR")), Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")
    private fun parseAmount(text: String): Double? {
        val m = amountRegex.find(text) ?: return null
        val raw = (m.groups[1]?.value ?: m.groups[2]?.value ?: return null).replace(".", "").replace(',', '.')
        return raw.toDoubleOrNull()
    }
    fun parse(packageName: String, text: String, notificationKey: String, postedAt: Long): JSONObject? {
        val bank = bankPackages[packageName] ?: return null
        val clean = text.replace(Regex("\\s+"), " ").trim()
        if (clean.isBlank() || clean.length > 1000) return null
        val n = normalized(clean)
        val hasMoneyMovement = listOf("pix", "compra", "debito", "transferencia", "ted", "recebeu", "recebido", "pagamento", "deposito").any { n.contains(it) }
        if (!hasMoneyMovement) return null
        val amount = parseAmount(clean) ?: return null
        if (amount <= 0.0) return null
        // Bancos variam a ordem das palavras: "Pix recebido", "Você recebeu um Pix",
        // "Pix de ... recebido". Considere também verbos de crédito/débito.
        val income = (
            (n.contains("pix") || n.contains("transferencia") || n.contains("ted") || n.contains("deposito")) &&
                listOf("receb", "credit", "entrada").any { n.contains(it) }
            ) || listOf("recebimento", "voce recebeu").any { n.contains(it) }
        val expense = (
            (n.contains("pix") || n.contains("transferencia") || n.contains("ted")) &&
                listOf("enviad", "debitad").any { n.contains(it) }
            ) || listOf("voce fez um pix", "voce enviou", "compra aprovada", "compra no debito", "debito realizado", "pagamento realizado", "pagamento efetuado").any { n.contains(it) } ||
            ((n.contains("pix") || n.contains("transferencia")) && listOf("realizad", "concluid", "feito").any { n.contains(it) })
        if (!income && !expense) return null
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(postedAt))
        val digest = MessageDigest.getInstance("SHA-256").digest("$packageName|$notificationKey|$clean".toByteArray())
        val id = digest.take(24).joinToString("") { "%02x".format(it) }
        val desc = when {
            income -> "${bank}: recebimento identificado"
            n.contains("pix") -> "${bank}: Pix enviado"
            n.contains("compra") -> "${bank}: compra identificada"
            n.contains("transferencia") -> "${bank}: transferência enviada"
            else -> "${bank}: pagamento identificado"
        }
        val category = when {
            n.contains("mercado") || n.contains("supermercado") -> "Alimentação"
            n.contains("combustivel") || n.contains("posto") -> "Transporte"
            n.contains("farmacia") || n.contains("hospital") -> "Saúde"
            else -> "Outros"
        }
        return JSONObject().put("package_name", packageName).put("bank_name", bank)
            .put("description", desc).put("amount", amount).put("kind", if (income) "income" else "expense")
            .put("transaction_date", date).put("external_id", id).put("category", category)
    }
}
