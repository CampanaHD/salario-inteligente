import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
};
const allowedPackages: Record<string, string> = {
  'com.nu.production': 'Nubank',
  'br.com.intermedium': 'Banco Inter',
  'br.com.bb.android': 'Banco do Brasil',
  'br.gov.caixa': 'Caixa',
  'com.bradesco': 'Bradesco',
  'com.santander.app': 'Santander',
  'com.itau': 'Itaú',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Configuração interna ausente.' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  if (body.action === 'pair') {
    const code = String(body.pair_code || '');
    if (!/^[a-f0-9]{48}$/i.test(code)) return json({ error: 'Código de pareamento inválido.' }, 400);
    const hash = await sha256(code);
    const { data: pairing, error } = await admin.from('bank_device_pairings')
      .select('id,user_id,device_name,expires_at,paired_at,is_active')
      .eq('pair_code_hash', hash).eq('is_active', true).is('paired_at', null).maybeSingle();
    if (error || !pairing) return json({ error: 'Código não encontrado ou já utilizado.' }, 401);
    if (!pairing.expires_at || new Date(pairing.expires_at).getTime() < Date.now())
      return json({ error: 'Código expirado. Gere outro pelo site.' }, 401);
    const deviceToken = [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
    const { data: claimed, error: updateError } = await admin.from('bank_device_pairings').update({
      device_token_hash: await sha256(deviceToken), pair_code_hash: null,
      paired_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
    }).eq('id', pairing.id).is('paired_at', null).select('id').maybeSingle();
    if (updateError || !claimed) return json({ error: 'Código já utilizado ou não foi possível concluir o pareamento.' }, 409);
    return json({ device_token: deviceToken, device_name: pairing.device_name });
  }

  if (body.action === 'sync') {
    const token = String(body.device_token || '');
    if (!/^[a-f0-9]{64}$/i.test(token)) return json({ error: 'Dispositivo não autorizado.' }, 401);
    const tokenHash = await sha256(token);
    const { data: device, error: deviceError } = await admin.from('bank_device_pairings')
      .select('id,user_id,is_active').eq('device_token_hash', tokenHash).maybeSingle();
    if (deviceError || !device || !device.is_active) return json({ error: 'Dispositivo revogado ou não autorizado.' }, 401);
    const events = Array.isArray(body.events) ? body.events.slice(0, 25) : [];
    const rows = [];
    for (const event of events) {
      const pkg = String(event.package_name || '');
      const bank = allowedPackages[pkg];
      const amount = Number(event.amount);
      const kind = event.kind === 'income' ? 'income' : event.kind === 'expense' ? 'expense' : null;
      const date = String(event.transaction_date || '');
      const externalId = String(event.external_id || '');
      const description = String(event.description || '').trim().slice(0, 120);
      if (!bank || !kind || !(amount > 0 && amount <= 100000000) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[a-f0-9]{32,64}$/i.test(externalId) || !description) continue;
      rows.push({
        user_id: device.user_id, description, category: String(event.category || 'Outros').slice(0, 60),
        amount: Math.round(amount * 100) / 100, transaction_date: date, kind, is_paid: true,
        notes: `Importado automaticamente pelo Conector Android · ${bank}`,
        bank_source: bank, external_id: externalId, transaction_source: 'android_notification',
      });
    }
    let inserted = 0;
    if (rows.length) {
      const { data, error } = await admin.from('transactions').upsert(rows, {
        onConflict: 'user_id,external_id', ignoreDuplicates: true,
      }).select('id');
      if (error) return json({ error: 'Falha ao registrar movimentações.' }, 500);
      inserted = data?.length || 0;
    }
    await admin.from('bank_device_pairings').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);
    return json({ received: events.length, accepted: rows.length, inserted });
  }
  return json({ error: 'Ação inválida.' }, 400);
});
