package br.com.salariointeligente.connector

object ConnectorConfig {
    // Mantém o mesmo projeto Supabase do Salário Inteligente.
    const val SUPABASE_URL = "https://oshsqrebvmcayyxpwbsr.supabase.co"
    const val FUNCTION_URL = "$SUPABASE_URL/functions/v1/bank-connector"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zaHNxcmVidm1jYXl5eHB3YnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDU2OTQsImV4cCI6MjA5NTMyMTY5NH0._f-ClyvpBgDZqhvdtlcu7w5LV67cvBWewMTK5wjYzLY"
    const val PREFS = "si_connector_secure_prefs"
    const val DEVICE_TOKEN = "device_token"
}
