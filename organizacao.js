/* Organização visual e centralização das integrações nas Configurações. */
(function(){
  'use strict';
  const originalSettings = window.settingsHTML;
  if (typeof originalSettings === 'function' && typeof window.bankingHTML === 'function') {
    window.settingsHTML = function(){
      let base = originalSettings();
      base = base.replace('<section class="panel"><div class="panel-head"><div><h3>Dados e privacidade', '<section id="si-data-settings" class="panel"><div class="panel-head"><div><h3>Dados e privacidade');
      return `
        <section class="si-settings-welcome">
          <div class="si-settings-welcome-icon">⚙</div>
          <div><span class="si-kicker">CENTRAL DE CONTROLE</span><h2>Deixe tudo do seu jeito.</h2><p>Organize seus dados, preferências, segurança e conexões em um só lugar.</p></div>
        </section>
        <section class="si-settings-shortcuts" aria-label="Atalhos de configuração">
          <button type="button" data-settings-scroll="si-profile-settings"><span>👤</span><b>Perfil e salário</b><small>Dados e planejamento</small></button>
          <button type="button" data-settings-scroll="si-data-settings"><span>🛡️</span><b>Dados e privacidade</b><small>Backup e proteção</small></button>
          <button type="button" data-settings-scroll="si-bank-settings"><span>📱</span><b>Conexão bancária</b><small>Conector Android em desenvolvimento</small></button>
        </section>
        <div id="si-profile-settings" class="si-settings-section">${base}</div>
        <section id="si-bank-settings" class="si-bank-settings-wrap">
          <div class="si-section-heading"><div><span class="si-kicker">CONEXÕES E AUTOMAÇÕES</span><h2>Integração bancária</h2><p>Configure o conector do celular e acompanhe os dispositivos autorizados. Esta função continua em fase de desenvolvimento e validação.</p></div><span class="si-dev-status"><i></i> Em desenvolvimento</span></div>
          ${bankingHTML()}
        </section>`;
    };
  }

  const oldGoPage = window.goPage;
  if (typeof oldGoPage === 'function') {
    window.goPage = function(page){
      if(page === 'banking') page = 'settings';
      return oldGoPage(page);
    };
  }

  const oldBind = window.bindPageActions;
  if (typeof oldBind === 'function') {
    window.bindPageActions = function(){
      oldBind();
      if (document.getElementById('si-bank-settings')) {
        const host = document.getElementById('pageContent');
        if (host && !host.dataset.siSettingsBound) {
          host.dataset.siSettingsBound = '1';
          host.addEventListener('click', function(ev){
            const jump = ev.target.closest('[data-settings-scroll]');
            if (jump) {
              const target = document.getElementById(jump.dataset.settingsScroll);
              target?.scrollIntoView({behavior:'smooth', block:'start'});
              return;
            }
            if (ev.target.closest('#createBankPair')) createBankPairing();
            else if (ev.target.closest('#refreshBankDevices')) loadBankDevices();
            else if (ev.target.closest('#revokeAllBankDevices')) revokeAllBankDevices();
            else {
              const revoke = ev.target.closest('[data-revoke-bank-device]');
              if (revoke) revokeBankDevice(revoke.dataset.revokeBankDevice);
            }
          });
        }
        if (document.getElementById('bankDevicesList')) {
          loadBankDevices();
          loadConnectorRelease();
        }
      }
    };
  }

  // Destaca o calendário e a análise de combustível como recursos do produto.
  const oldDashboard = window.dashboardHTML;
  if (typeof oldDashboard === 'function') {
    window.dashboardHTML = function(){
      return oldDashboard() + `
        <section class="si-dashboard-tools">
          <div class="si-section-heading"><div><span class="si-kicker">CONTROLE INTELIGENTE</span><h2>Planeje os próximos passos</h2><p>Acesse rapidamente as ferramentas de acompanhamento.</p></div></div>
          <div class="si-tool-grid">
            <button type="button" data-go="calendar"><span class="si-tool-icon calendar">▦</span><b>Calendário financeiro</b><small>Veja vencimentos, receitas e despesas por dia.</small><em>Abrir calendário →</em></button>
            <button type="button" data-go="fuel"><span class="si-tool-icon fuel">⛽</span><b>Combustível e veículos</b><small>Acompanhe abastecimentos, consumo e previsão.</small><em>Ver veículos →</em></button>
            <button type="button" data-go="reports"><span class="si-tool-icon reports">▥</span><b>Relatórios completos</b><small>Compare períodos e acompanhe sua evolução.</small><em>Ver relatórios →</em></button>
          </div>
        </section>`;
    };
  }

  // A aba antiga deixa de ser um destino separado; o conector passa a morar em Configurações.
  document.querySelectorAll('[data-page="banking"]').forEach(el => el.remove());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-page="banking"]').forEach(el => el.remove()));
})();
