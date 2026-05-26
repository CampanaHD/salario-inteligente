const SUPABASE_URL = 'https://oshsqrebvmcayyxpwbsr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zaHNxcmVidm1jYXl5eHB3YnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDU2OTQsImV4cCI6MjA5NTMyMTY5NH0._f-ClyvpBgDZqhvdtlcu7w5LV67cvBWewMTK5wjYzLY';

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );