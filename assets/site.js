// Mission: On The Move — shared site behavior
// No build step, no framework. Loaded on every page after style.css.

window.MOTM = window.MOTM || {
    // Make.com "MOTM Lead Capture" scenario (webhook -> MOTM Leads data store).
    // Verified end-to-end on 2026-09-01. Records key on email.
    LEAD_WEBHOOK_URL: 'https://hook.us1.make.com/55112i4h5pawle72wfe0u1dvidi4m46r'
};

(function () {
    'use strict';

   // Captures ?leader=<code> from a leader's tracked invite link and remembers
   // it for the rest of this browser session, so any lead-capture form the
   // visitor later submits gets tagged with who referred them.
   function captureLeaderCode() {
         try {
                 var fromUrl = new URLSearchParams(window.location.search).get('leader');
                 if (fromUrl) { sessionStorage.setItem('motm_leader', fromUrl); }
                 return sessionStorage.getItem('motm_leader') || '';
         } catch (e) {
                 return '';
         }
   }

   function isConfigured() {
         return typeof window.MOTM.LEAD_WEBHOOK_URL === 'string' &&
                 window.MOTM.LEAD_WEBHOOK_URL.indexOf('REPLACE_WITH') === -1 &&
                 window.MOTM.LEAD_WEBHOOK_URL.indexOf('http') === 0;
   }

   // Wires a <form data-lead-form="source_name"> to POST its fields as JSON
   // to the shared Make webhook. Honeypot field named "hp" is silently
   // dropped if filled (bot check) rather than shown as an error.
   function attachLeadForm(form) {
         var statusEl = form.querySelector('.form-status');
         var submitBtn = form.querySelector('[type=submit]');
         var source = form.getAttribute('data-lead-form') || 'unknown';

      function setStatus(kind, message) {
              if (!statusEl) return;
              statusEl.textContent = message;
              statusEl.className = 'form-status ' + kind;
      }

      if (!isConfigured()) {
              // Honest disabled state: don't let the visitor believe this submitted.
           Array.prototype.forEach.call(form.querySelectorAll('input, textarea, select, button[type=submit]'), function (el) {
                     el.disabled = true;
           });
              setStatus('err', 'This form isn’t connected yet — email charles@awtrescue.org instead.');
              return;
      }

      form.addEventListener('submit', function (evt) {
              evt.preventDefault();
              if (form.querySelector('[name=hp]') && form.querySelector('[name=hp]').value) {
                        // Honeypot tripped — pretend success, submit nothing.
                setStatus('ok', 'Thanks — we’ve got it.');
                        form.reset();
                        return;
              }

                                  var data = {};
              Array.prototype.forEach.call(form.elements, function (el) {
                        if (!el.name || el.name === 'hp' || el.disabled) return;
                        if (el.type === 'checkbox') { data[el.name] = el.checked ? 'true' : 'false'; return; }
                        data[el.name] = el.value;
              });
              data.form_type = source;
              data.source_page = source;
              data.submitted_at = new Date().toISOString();
              data.page_url = window.location.href;
              data.referred_by_leader = captureLeaderCode();

                                  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
              setStatus('ok', '');

                                  // application/x-www-form-urlencoded (via URLSearchParams) is a CORS
                                  // "simple request" — no preflight, works from a static GitHub Pages
                                  // origin straight to the Make webhook without extra server config.
                                  fetch(window.MOTM.LEAD_WEBHOOK_URL, {
                                            method: 'POST',
                                            body: new URLSearchParams(data)
                                  })
                .then(function (res) {
                            if (!res.ok) throw new Error('bad status ' + res.status);
                            setStatus('ok', 'Thanks — AWT has your details and will be in touch.');
                            form.reset();
                })
                .catch(function () {
                            setStatus('err', 'That didn’t go through — email charles@awtrescue.org so nothing gets lost.');
                })
                .finally(function () {
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.getAttribute('data-label') || 'Submit'; }
                });
      });
   }

   document.addEventListener('DOMContentLoaded', function () {
         captureLeaderCode(); // capture/persist ?leader= even on pages with no form
                                 Array.prototype.forEach.call(document.querySelectorAll('form[data-lead-form]'), attachLeadForm);
   });
})();
