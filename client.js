window.__ModuleLoader__.load({
  id: '@local/dsh-api-testbench',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const PACKAGE = '@local/dsh-api-testbench';
    const KIND = 'api-testbench';
    const NAMESPACE = 'apiTestbench';
    let remoteMountError = '';
    const { z } = require('zod');
    const CSS = `
      .atb-root {
        --tr-surface: var(--dsw-alias-bg-base, Canvas);
        --tr-ink: var(--dsw-alias-label-primary, CanvasText);
        --tr-bg: color-mix(in srgb, var(--tr-surface) 98%, #239077);
        --tr-muted: color-mix(in srgb, var(--tr-ink) 65%, var(--tr-surface));
        --tr-border: color-mix(in srgb, var(--tr-ink) 15%, var(--tr-surface));
        --tr-line: color-mix(in srgb, var(--tr-ink) 9%, var(--tr-surface));
        --tr-accent: color-mix(in srgb, #008367 66%, var(--tr-ink));
        --tr-soft: color-mix(in srgb, var(--tr-accent) 8%, var(--tr-surface));
        --tr-good: color-mix(in srgb, #168152 71%, var(--tr-ink));
        --tr-bad: color-mix(in srgb, #d04638 77%, var(--tr-ink));
        --tr-warn: color-mix(in srgb, #bc8022 69%, var(--tr-ink));
        --tr-code-bg: color-mix(in srgb, var(--tr-ink) 4%, var(--tr-surface));
        --tr-mono: ui-monospace, "Cascadia Code", Consolas, "SFMono-Regular", monospace;
        --tr-pad: clamp(12px, 3.5cqi, 22px);
        box-sizing:border-box; min-width:0; max-width:100%; color:var(--tr-ink);
        font:400 13px/1.5 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei UI", sans-serif;
        text-align:start; font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased;
      }
      .atb-root *, .atb-root *::before, .atb-root *::after {box-sizing:border-box}
      .atb-root :is(button,input,select,textarea) {font:inherit;color:inherit}
      .atb-root button {cursor:pointer}
      .atb-root :is(button,input,select,textarea,summary,[tabindex]):focus-visible {
        outline:2px solid var(--tr-accent);outline-offset:2px
      }
      .atb-root :is(button,input,select,textarea):disabled {opacity:.52;cursor:not-allowed}
      .tr-panel {min-height:100%;width:100%;background:var(--tr-bg);container:relay / inline-size}
      .tr-workbench {min-width:0;width:100%;max-width:1080px;margin:0 auto;padding:0 var(--tr-pad) 22px}
      .tr-brandbar {display:flex;align-items:center;gap:10px;padding:14px var(--tr-pad);background:var(--tr-surface);border-bottom:1px solid var(--tr-border)}
      .tr-workbench>.tr-brandbar {margin:0 calc(-1 * var(--tr-pad))}
      .tr-brand {display:inline-flex;gap:9px;align-items:center;min-width:0;white-space:nowrap}
      .tr-brandmark {flex:none;display:block;width:30px;height:30px}
      .tr-brandname {font:720 19px/1.1 system-ui,sans-serif;letter-spacing:-.85px;color:var(--tr-ink)}
      .tr-env {display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:33%;margin-left:3px;padding:3px 7px;border:1px solid var(--tr-border);border-radius:5px;color:var(--tr-muted);font:500 11px/1.3 var(--tr-mono)}
      .tr-env span {overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tr-brandbar>.tr-btn {margin-inline-start:auto}
      .tr-icon {vertical-align:middle;display:inline-block;flex:none;pointer-events:none}
      .tr-btn,.tr-button,.tr-icon-btn {display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;max-width:100%;border:1px solid var(--tr-border);border-radius:6px;background:var(--tr-surface);padding:5px 10px;color:var(--tr-ink);font-weight:580!important;font-size:12px!important;line-height:1.3!important;text-decoration:none;cursor:pointer}
      .tr-icon-btn {padding:5px;width:30px;min-height:30px}
      .tr-btn:hover:not(:disabled),.tr-button:hover:not(:disabled),.tr-icon-btn:hover:not(:disabled) {background:var(--tr-code-bg);border-color:color-mix(in srgb,var(--tr-ink) 28%,var(--tr-surface))}
      .atb-root .tr-primary {color:var(--tr-surface);background:var(--tr-accent);border-color:var(--tr-accent)}
      .atb-root .tr-primary:hover:not(:disabled) {background:color-mix(in srgb,var(--tr-accent) 86%,var(--tr-ink));border-color:var(--tr-accent)}
      .tr-eyebrow {display:inline-flex;align-items:center;gap:6px;margin:0;color:var(--tr-muted);font-size:10px;font-weight:680;letter-spacing:.1em;text-transform:uppercase}
      .tr-run {padding:16px 0 0;min-width:0}
      .tr-run-head {display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:7px 12px;min-width:0}
      .tr-run-title {margin:4px 0 2px;font-size:clamp(17px,4cqi,22px);line-height:1.35;font-weight:670;letter-spacing:-.025em;overflow-wrap:anywhere;text-wrap:pretty}
      .tr-run-meta {display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;color:var(--tr-muted);font-size:11.5px}
      .tr-run-bar {display:flex;gap:3px;height:3px;overflow:hidden;border-radius:5px;background:var(--tr-line);margin:8px 0 0}
      .tr-run-bar span {min-width:2px;border-radius:2px;background:var(--tr-tone,var(--tr-muted))}
      .atb-root [data-status] {--tr-tone:var(--tr-muted)}
      .atb-root [data-status="passed"] {--tr-tone:var(--tr-good)}
      .atb-root :is([data-status="failed"],[data-status="send_failed"],[data-status="timed_out"]) {--tr-tone:var(--tr-bad)}
      .atb-root :is([data-status="running"],[data-status="pending"],[data-status="indeterminate"]) {--tr-tone:var(--tr-warn)}
      .tr-summary-strip {display:flex;align-items:center;flex-wrap:wrap;gap:5px 12px;margin:7px 0;color:var(--tr-muted)}
      .tr-metric {display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--tr-tone,var(--tr-muted))}
      .tr-metric strong {color:inherit;font-weight:700}
      .tr-request-list {display:grid;overflow:hidden;background:var(--tr-surface);border:1px solid var(--tr-border);border-radius:9px}
      .tr-request-row {position:relative;width:100%;min-width:0;margin:0;text-align:start;appearance:none;background:transparent;border:0;color:var(--tr-ink);cursor:pointer}
      .tr-request-row+.tr-request-row {border-top:1px solid var(--tr-line)}
      .tr-request-row:hover {background:var(--tr-code-bg)}
      .tr-request-row[aria-selected="true"],.tr-request-row[aria-pressed="true"] {background:var(--tr-soft);box-shadow:inset 3px 0 var(--tr-accent)}
      .tr-method {display:inline-flex;align-items:center;justify-content:center;align-self:center;min-width:39px;width:fit-content;border-radius:4px;padding:2px 5px;white-space:nowrap;font:700 10.5px/1.5 var(--tr-mono);letter-spacing:.025em;color:var(--tr-accent);background:var(--tr-soft)}
      .tr-method[data-method="POST"] {color:var(--tr-warn);background:color-mix(in srgb,var(--tr-warn) 12%,var(--tr-surface))}
      .tr-method:is([data-method="PUT"],[data-method="PATCH"]) {color:color-mix(in srgb,#526fc8 68%,var(--tr-ink));background:color-mix(in srgb,#7685d0 12%,var(--tr-surface))}
      .tr-method[data-method="DELETE"] {color:var(--tr-bad);background:color-mix(in srgb,var(--tr-bad) 10%,var(--tr-surface))}
      .tr-state {display:inline-flex;align-items:center;justify-content:center;gap:4px;width:fit-content;white-space:nowrap;flex-shrink:0;color:var(--tr-tone,var(--tr-muted));font-size:11px;font-weight:650}
      .tr-detail {margin-top:13px;background:var(--tr-surface);border:1px solid var(--tr-border);border-radius:9px;min-width:0;overflow:clip}
      .tr-detail-head {padding:12px 14px 9px;min-width:0}
      .tr-tabs {display:flex;align-items:stretch;gap:clamp(2px,1.5cqi,10px);border-bottom:1px solid var(--tr-border);padding:0 10px;overflow-x:auto;scrollbar-width:thin}
      .tr-tab {position:relative;display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:none;color:var(--tr-muted)!important;background:transparent;border:0;padding:9px 5px;font-weight:560!important;font-size:12px!important;white-space:nowrap}
      .tr-tab:hover {color:var(--tr-ink)!important}
      .tr-tab[aria-selected="true"] {color:var(--tr-accent)!important}
      .tr-tab[aria-selected="true"]::after {content:"";position:absolute;inset:auto 2px -1px;height:3px;background:var(--tr-accent);border-radius:3px 3px 0 0}
      .tr-tab-body {padding:12px 14px;min-width:0}
      .tr-check-row {min-width:0}
      .tr-compare {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--tr-border);border-radius:7px;background:var(--tr-border)}
      .tr-compare>* {background:var(--tr-code-bg);padding:8px 11px;min-width:0}
      .tr-compare code {font:600 15px/1.4 var(--tr-mono);overflow-wrap:anywhere}
      .tr-code,.tr-editor {display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;margin:0;border:1px solid var(--tr-border);border-radius:6px;background:var(--tr-code-bg);color:var(--tr-ink);padding:10px 12px;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;tab-size:2;font:12px/1.6 var(--tr-mono)!important}
      .tr-code {max-height:300px}
      textarea.tr-editor {min-height:112px;resize:vertical}
      .tr-kv {margin:0;min-width:0}
      .tr-actions {display:flex;align-items:center;flex-wrap:wrap;gap:6px}
      .tr-disclosure {min-width:0}
      .tr-alert {padding:9px 11px;margin:8px 0;border:1px solid color-mix(in srgb,var(--tr-bad) 27%,var(--tr-surface));border-radius:6px;color:var(--tr-bad);background:color-mix(in srgb,var(--tr-bad) 5%,var(--tr-surface));overflow-wrap:anywhere}
      .tr-empty {margin-block:15px;display:grid;justify-items:center;text-align:center;gap:8px;padding:32px 16px;color:var(--tr-muted);border:1px dashed var(--tr-border);border-radius:10px;background:var(--tr-surface)}
      .tr-empty h3 {margin:0;color:var(--tr-ink);font-size:16px}
      .tr-chat {display:flex;align-items:center;gap:10px;margin:5px 0;padding:9px 11px;border:1px solid var(--tr-border);border-radius:9px;background:var(--tr-surface);container:relaychat / inline-size}
      .tr-chat .tr-brandmark {width:26px;height:26px}
      .tr-chat-copy {min-width:0;flex:1;display:grid;gap:1px}
      .tr-chat-title,.tr-chat-desc {display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tr-chat-title {font-weight:640;font-size:12px}
      .tr-chat-desc {color:var(--tr-muted);font-size:11.5px}
      .tr-chat .tr-state {color:var(--tr-tone);font-weight:600}
      .tr-chat-open {color:var(--tr-accent)}
      @container relay (max-width:390px) {
        .tr-brandbar {gap:7px;padding:11px var(--tr-pad)}
        .tr-brandname {font-size:17px}
        .tr-brandmark {width:26px;height:26px}
        .tr-env {max-width:26%}
        .tr-detail-head,.tr-tab-body {padding-inline:10px}
      }
      @container relaychat (max-width:285px) {.tr-chat .tr-state {display:none}}

      .tr-run-head {
        position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr);gap:0;
        margin:0 0 14px;padding:13px 16px 12px;border-radius:10px;overflow:hidden;
        background:linear-gradient(112deg,#163d36 0%,#164c41 74%,#1c5749 100%);color:#f3faf6;
      }
      .tr-run-head::before {
        content:"";position:absolute;pointer-events:none;z-index:-1;inset:0 0 auto auto;width:110px;height:76%;
        background:radial-gradient(circle at 2px 2px,rgba(207,245,204,.17) .8px,transparent 1px) 0 0/9px 9px;
        mask-image:linear-gradient(to left,black,transparent)
      }
      .tr-run-head .tr-run-meta {display:flex;justify-content:space-between;align-items:center}
      .tr-run-head .tr-eyebrow {color:#b1d7c8;font-size:10px;font-weight:600;letter-spacing:.065em}
      .tr-run-head .tr-state {line-height:1.45;font-size:10.5px;padding:2px 6px;border:1px solid #ffffff35;color:#dbecde;border-radius:4px}
      .tr-run-head .tr-run-title {margin:5px 0 9px;color:#f5faf6;font-size:clamp(16px,3.6cqi,20px);line-height:1.37;font-weight:640}
      .tr-run-head .tr-summary-strip {margin:0;gap:5px 14px}
      .tr-run-head .tr-metric {color:#c2d8ce;align-items:baseline;font-size:11px;font-weight:450;gap:4px}
      .tr-run-head .tr-metric strong {font:650 13px/1.35 var(--tr-mono);color:#fff}
      .tr-run-head .tr-metric[data-status="passed"] strong {color:#c9f5a7}
      .tr-run-head .tr-metric[data-status="failed"] strong {color:#ffb5a7}
      .tr-run-head .tr-run-bar {height:3px;width:100%;margin-top:10px;background:#ffffff22}
      .tr-run-head .tr-run-bar span {background:#89a99e}
      .tr-run-head .tr-run-bar [data-status="passed"] {background:#c6ed97}
      .tr-run-head .tr-run-bar [data-status="failed"] {background:#f19d87}
      .tr-run-head .tr-run-bar [data-status="running"] {background:#efd082}
      .tr-list-label {display:flex;align-items:center;gap:6px;margin:0 0 6px 2px;color:var(--tr-muted);font-size:11px;font-weight:600;line-height:1.5}
      .tr-list-label .tr-icon {color:var(--tr-accent)}
      .tr-request-row {display:grid;align-items:center;gap:8px;grid-template-columns:auto minmax(0,1fr) auto auto;padding:8px 11px;min-height:44px}
      .tr-request-row>.tr-state {grid-column:4;justify-self:end}
      .tr-request-row .tr-state {padding:2px 6px;border-radius:4px;background:color-mix(in srgb,var(--tr-tone) 8%,var(--tr-surface))}
      .tr-row-main {min-width:0;display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr);gap:8px;align-items:baseline}
      .tr-row-main>* {overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .tr-row-path,.tr-http {font:600 12px/1.45 var(--tr-mono);letter-spacing:-.025em}
      .tr-row-name {color:var(--tr-muted);font-size:12px}
      .tr-http {color:var(--tr-muted);font-size:11px;font-weight:550}
      .tr-detail-head {display:grid;gap:4px}
      .tr-detail-head h3 {margin:0;color:var(--tr-ink);font-size:15px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
      .tr-detail-head p {margin:0;color:var(--tr-muted);line-height:1.5;font-size:12px;overflow-wrap:anywhere}
      .tr-detail-meta {display:flex;align-items:center;flex-wrap:wrap;gap:4px 9px;margin-top:3px;color:var(--tr-muted);font-size:11px}
      .tr-detail-meta>* {display:inline-flex;align-items:center;gap:4px}
      .tr-detail-meta code {font:550 10.5px/1.55 var(--tr-mono);background:var(--tr-code-bg);border:1px solid var(--tr-line);border-radius:4px;padding:0 4px}
      .tr-detail-head+.tr-tabs {background:var(--tr-bg);border-top:1px solid var(--tr-line)}
      .tr-checks {display:grid;gap:9px}
      .tr-check-row {padding:0 0 9px;border-bottom:1px solid var(--tr-line)}
      .tr-check-row:last-child {padding-bottom:0;border:none}
      .tr-check-title {display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;margin:0 0 6px}
      .tr-check-title>code {font:600 12px/1.4 var(--tr-mono);color:var(--tr-ink);overflow-wrap:anywhere}
      .tr-check-title>span:not(.tr-state) {color:var(--tr-muted);font-size:11px}
      .tr-check-title>.tr-state {margin-inline-start:auto}
      .tr-check-basis {display:block;margin-top:4px;color:var(--tr-muted);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
      .tr-kv {display:grid;gap:3px;align-content:start;padding:4px 0}
      .tr-kv>span {font-size:11px;line-height:1.35;color:var(--tr-muted)}
      .tr-kv>code {color:var(--tr-ink);font:500 12px/1.45 var(--tr-mono);white-space:pre-wrap;overflow-wrap:anywhere}
      .tr-compare .tr-kv {padding:7px 11px}
      .tr-compare .tr-kv>code {font-weight:620;font-size:15px}
      .tr-check-row[data-status="failed"] .tr-compare>:last-child {background:color-mix(in srgb,var(--tr-bad) 7%,var(--tr-surface))}
      .tr-check-row[data-status="failed"] .tr-compare>:last-child>code {color:var(--tr-bad)}
      .tr-detail>.tr-actions {border-top:1px solid var(--tr-line);padding:10px 14px}
      .tr-detail>.tr-actions:empty {display:none}
      .tr-detail>.tr-alert,.tr-detail>p {margin:9px 14px}
      .tr-detail .tr-editor {background:var(--tr-bg);color:var(--tr-ink);padding:10px 14px 12px;border:0;border-radius:0;font:inherit!important;white-space:normal}
      .tr-editor label,.tr-handoff>label {display:grid;gap:6px;color:var(--tr-muted);font-size:12px}
      .tr-editor .tr-actions,.tr-handoff .tr-actions {margin-top:8px}
      .tr-detail textarea.tr-code,.tr-handoff textarea.tr-code {min-height:148px;resize:vertical}
      .tr-disclosure>summary {display:flex;align-items:center;gap:7px;min-height:32px;cursor:pointer;color:var(--tr-muted);font-size:12px;font-weight:560;list-style:none}
      .tr-disclosure>summary::-webkit-details-marker {display:none}
      .tr-disclosure>summary::after {content:"";height:6px;width:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);margin-inline-start:auto;margin-inline-end:2px}
      .tr-disclosure[open]>summary::after {transform:rotate(45deg)}
      .tr-disclosure>summary:hover,.tr-disclosure[open]>summary {color:var(--tr-ink)}
      .tr-identifiers {padding:0 14px;border-top:1px solid var(--tr-line)}
      .tr-identifiers>summary {font-size:11px}
      .tr-identifiers[open] {padding-bottom:10px}
      .tr-identifiers .tr-kv {grid-template-columns:80px minmax(0,1fr);gap:7px}
      .tr-disclosure:is(.tr-handoff,.tr-history) {border:1px solid var(--tr-border);border-radius:7px;padding:3px 11px;margin-top:8px;background:var(--tr-surface)}
      .tr-handoff>summary .tr-icon {color:var(--tr-accent)}
      .tr-handoff[open],.tr-history[open] {padding-bottom:11px}
      .tr-history>summary span {font:500 10px/1.35 var(--tr-mono);padding:1px 5px;border-radius:3px;background:var(--tr-code-bg)}
      .tr-history-row,.tr-attempt-row {display:flex;flex-wrap:wrap;align-items:center;gap:5px 9px;width:100%;text-align:start;border:0;border-top:1px solid var(--tr-line);background:transparent;padding:7px 6px;color:var(--tr-ink);font-size:12px!important}
      .tr-history-row .tr-state,.tr-attempt-row .tr-state {margin-inline-start:auto}
      .tr-history-row[aria-current="true"],.tr-attempt-row[aria-pressed="true"] {background:var(--tr-soft)}
      .tr-attempt-row>span:not(.tr-state) {color:var(--tr-muted);font-size:11px}
      .tr-attempt-row>code {font:11px var(--tr-mono)}
      .tr-evidence {display:grid;gap:8px}
      .tr-evidence h4 {margin:0 0 5px;color:var(--tr-muted);font-size:12px;font-weight:580}
      .tr-evidence>.tr-kv {display:grid;grid-template-columns:minmax(65px,auto) minmax(0,1fr);align-items:baseline;gap:10px}
      .tr-evidence .tr-code {font-size:11.5px!important}
      .tr-json {padding:8px 0}
      .tr-code-line {display:grid;grid-template-columns:2.8em minmax(0,1fr);gap:9px}
      .tr-code-line>code {font:inherit;color:inherit;min-width:0}
      .tr-line-no {color:var(--tr-muted);user-select:none;text-align:end;padding-right:7px;border-right:1px solid var(--tr-border)}
      .tr-token-key {color:var(--tr-accent);font-weight:600}
      .tr-token-string {color:var(--tr-good)}
      .tr-token-literal {color:color-mix(in srgb,#9865ba 78%,var(--tr-ink))}
      .tr-delta {margin:0 14px 10px;background:var(--tr-soft);padding:7px 10px;border-radius:5px;font-size:11.5px;line-height:1.6;overflow-wrap:anywhere}
      .tr-delta>span {display:block;color:var(--tr-muted);margin-bottom:2px}
      .tr-delta-field {display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 7px;font:550 11.5px/1.6 var(--tr-mono)}
      .tr-delta del {color:var(--tr-bad)} .tr-delta ins {color:var(--tr-good);text-decoration:none;font-weight:650}
      .tr-run :is(.tr-tab-body,.tr-checks) .tr-empty {padding:12px;margin:0}
      @container relay (max-width:440px) {
        .tr-row-main {display:grid;grid-template-columns:minmax(0,1fr);gap:1px}
        .tr-request-row {padding-block:6px;gap:6px}
        .tr-row-name {font-size:11px}
        .tr-run-head {padding:11px 12px}
        .tr-run-head .tr-summary-strip {gap:4px 12px}
      }
      @container relay (max-width:325px) {
        .tr-env {display:none}
        .tr-detail-meta {gap:3px 6px}
        .tr-request-row {padding-inline:7px}
        .tr-request-row .tr-state {padding-inline:2px}
        .tr-method {min-width:32px;font-size:10px}
      }
    `;

    const en = {
      panelTitle: 'TestRelay API Testbench', guideDescription: 'Create manual API checks, inspect real responses, and compare retries.',
      openRun: 'Open API test', requestPreparing: 'Preparing request', waiting: 'Waiting for response',
      finished: 'Run complete', unavailable: 'Run status unavailable', noRun: 'No API test run is available in this session yet.',
      currentRun: 'Current run', history: 'Recent runs', purpose: 'Purpose', expected: 'Expected',
      attempt: 'Attempt', response: 'Response', checks: 'Checks', http: 'HTTP', status: 'Status',
      pass: 'Passed', fail: 'Failed', received: 'Response received · no assertions', indeterminate: 'Cannot determine',
      manual: 'Manual', parent: 'Parent attempt', runLabel: 'Run', originLabel: 'Origin', userAction: 'User action',
      requestChanged: 'Request changes', requestUnchanged: 'No request changes',
      retryTitle: 'Manual retry', retryHint: 'Choose any recorded attempt as the replay source, edit the request JSON if needed, then choose Retry. Each retry is a separate attempt; no request is sent until you choose the button.',
      retrySource: 'Replay from attempt', requestJson: 'Request JSON', retry: 'Retry edited request', retrying: 'Retrying…', retryStarted: 'Retry attempt recorded.',
      retryEnvironmentWarning: 'Review the recorded and current target before sending.', recordedTarget: 'Recorded target', currentTarget: 'Current target', credentialsResolveNow: 'Credential references will be resolved at send time.', confirmCurrentEnvironment: 'I confirm using the current target and settings, including any credential references.', retryConfirmAndSend: 'Retry with current environment',
      retryFailed: 'Retry was not sent.', invalidJson: 'Enter valid JSON for the request.', bodyTruncated: 'Response body was truncated at the configured read limit.',
      not_sent: 'Not sent', send_failed: 'Send failed', timed_out: 'Timed out', cancelled: 'Cancelled',
      cancelRequest: 'Cancel request', cancelling: 'Cancelling…', cancelFailed: 'The active request could not be cancelled.',
      interrupted: 'Interrupted', pending: 'Preparing', running: 'Waiting for response',
      passed: 'Passed', failed: 'Failed', unknown: 'Unknown state',
      status_equals: 'HTTP status equals', json_exists: 'JSON field exists', json_equals: 'JSON field equals',
      basis_user: 'User expectation', basis_project: 'Project expectation', basis_agent: 'Agent assumption',
      actual: 'Actual', missing: 'Missing', bodyPreview: 'Sanitized response preview',
      sendSummary: 'Send summary to this chat', sending: 'Sending…', sent: 'Summary sent to the originating chat.',
       lastHandoff: 'Most recent send', handoff_accepted: 'accepted by the originating chat', handoff_rejected: 'rejected by the originating chat', handoff_failed: 'failed; retry is available', handoff_pending: 'still processing',
      sendFailed: 'The originating chat did not accept the summary. You can copy it or retry.',
      summaryLabel: 'Review and edit the summary before sending', copy: 'Copy summary', copied: 'Copied',
      copyFailed: 'Copy failed; select and copy the text manually.', source: 'Source', fromAgent: 'Agent run',
      turn: 'Turn', step: 'Step', environment: 'Environment', detailUnavailable: 'Progress could not be loaded.',
      caseCount: 'Cases', noBody: 'No response body', openDetails: 'Show sanitized details',
      checkPassed: 'pass', checkFailed: 'fail', checkUnknown: 'unknown',
      manualWorkbench: 'Manual request workbench', manualNoSend: 'Nothing is sent until you choose Run request.',
      savedCase: 'Saved case', selectSavedCase: 'Select a saved case', openCase: 'Open', newRequest: 'New request',
      editEnvironment: 'Edit environment', closeEnvironmentEditor: 'Close environment settings', newEnvironment: 'New environment',
      environmentSettings: 'Environment settings', environmentName: 'Environment name', baseUrl: 'Base URL',
      variablesJson: 'Variables JSON', credentialRefsJson: 'Credential references JSON', sensitiveFieldsJson: 'Sensitive fields JSON',
      credentialHint: 'Store secrets as credential references. TestRelay saves ordinary variables in the local workspace.',
      saveEnvironment: 'Save environment', runTitle: 'Run title', caseName: 'Case name', method: 'Method', requestUrl: 'URL or path',
      advancedRequestFields: 'Query, headers, body JSON', queryJson: 'Query JSON entries', headersJson: 'Header JSON entries', bodyJson: 'Body JSON', bodyDisabledForMethod: 'GET and HEAD requests do not send a body; the body editor is closed.', checksJson: 'Checks JSON',
      manualJsonHint: 'Query and headers are arrays of {"name":"...","value":"..."}. Body is {"kind":"none"}, {"kind":"json","value":...}, or {"kind":"text","value":"..."}. Checks use the TestRelay assertion format.',
      invalidRequestFields: 'Enter a valid JSON object for query, headers, and body.', invalidChecks: 'Enter a valid JSON array for checks.',
      invalidVariablesJson: 'Variables must be valid JSON.', invalidCredentialRefsJson: 'Credential references must be valid JSON.', invalidSensitiveFieldsJson: 'Sensitive fields must be a valid JSON array.',
      saveCase: 'Save case', runRequest: 'Run request', caseSaved: 'Saved case.', environmentSaved: 'Environment saved.', manualStarted: 'Request started; progress is recorded in this run.',
    };
    const zh = {
      panelTitle: 'TestRelay 接口测试台', guideDescription: '创建手动 API 检查、查看真实响应并对比重试。',
      openRun: '打开接口测试', requestPreparing: '正在准备请求', waiting: '等待响应',
      finished: '运行完成', unavailable: '无法读取运行状态', noRun: '此会话尚无接口测试运行记录。',
      currentRun: '本次运行', history: '最近运行', purpose: '测试目的', expected: '预期结果',
      attempt: '尝试', response: '响应', checks: '断言', http: 'HTTP', status: '状态',
      pass: '通过', fail: '失败', received: '已收到响应 · 未设置断言', indeterminate: '无法判定',
      manual: '手动', parent: '上一次尝试', runLabel: '运行', originLabel: '来源', userAction: '用户操作',
      requestChanged: '请求差异', requestUnchanged: '请求未变化',
      retryTitle: '手动重试', retryHint: '可选择任意已记录的尝试作为重放起点，编辑请求 JSON 后点击“重试”。每次重试都会保留为单独的尝试；点击按钮前不会发送请求。',
      retrySource: '从此尝试重放', requestJson: '请求 JSON', retry: '重试已编辑的请求', retrying: '正在重试…', retryStarted: '重试尝试已记录。',
      retryEnvironmentWarning: '发送前请核对记录的目标和当前目标。', recordedTarget: '记录的目标', currentTarget: '当前目标', credentialsResolveNow: '发送时会重新解析凭据引用。', confirmCurrentEnvironment: '我确认使用当前目标和设置（包括凭据引用）。', retryConfirmAndSend: '使用当前环境重试',
      retryFailed: '未发送重试请求。', invalidJson: '请输入有效的请求 JSON。', bodyTruncated: '响应正文已按配置的读取上限截断。',
      not_sent: '未发送', send_failed: '发送失败', timed_out: '超时', cancelled: '已取消',
      cancelRequest: '取消请求', cancelling: '正在取消…', cancelFailed: '无法取消当前请求。',
      interrupted: '已中断', pending: '准备中', running: '等待响应',
      passed: '通过', failed: '失败', unknown: '未知状态',
      status_equals: 'HTTP 状态码等于', json_exists: 'JSON 字段存在', json_equals: 'JSON 字段等于',
      basis_user: '用户预期', basis_project: '项目预期', basis_agent: 'Agent 假设',
      actual: '实际值', missing: '字段缺失', bodyPreview: '脱敏响应预览',
      sendSummary: '将摘要发回此会话', sending: '正在发送…', sent: '摘要已发送到原始会话。',
       lastHandoff: '最近一次发送', handoff_accepted: '原会话已接受', handoff_rejected: '原会话已拒绝', handoff_failed: '发送失败，可重试', handoff_pending: '仍在处理中',
      sendFailed: '原会话未接受摘要。可复制后手动发送，或重试。',
      summaryLabel: '发送前请检查并编辑摘要', copy: '复制摘要', copied: '已复制',
      copyFailed: '复制失败，请手动选择文本复制。', source: '来源', fromAgent: 'Agent 运行',
      turn: '轮次', step: '步骤', environment: '环境', detailUnavailable: '无法读取进度。',
      caseCount: '用例', noBody: '无响应正文', openDetails: '显示脱敏详情',
      checkPassed: '通过', checkFailed: '失败', checkUnknown: '未判定',
      manualWorkbench: '手动请求工作台', manualNoSend: '点击“发送请求”前不会发送任何请求。',
      savedCase: '已保存用例', selectSavedCase: '选择已保存用例', openCase: '打开', newRequest: '新建请求',
      editEnvironment: '编辑环境', closeEnvironmentEditor: '关闭环境设置', newEnvironment: '新建环境',
      environmentSettings: '环境设置', environmentName: '环境名称', baseUrl: '基础 URL',
      variablesJson: '变量 JSON', credentialRefsJson: '凭据引用 JSON', sensitiveFieldsJson: '敏感字段 JSON',
      credentialHint: '密钥请使用凭据引用。TestRelay 将普通变量保存在本地工作区。',
      saveEnvironment: '保存环境', runTitle: '运行标题', caseName: '用例名称', method: '方法', requestUrl: 'URL 或路径',
      advancedRequestFields: 'Query、Headers、Body JSON', queryJson: 'Query 参数 JSON', headersJson: 'Headers JSON', bodyJson: 'Body JSON', bodyDisabledForMethod: 'GET 和 HEAD 请求不会发送正文；正文编辑器已关闭。', checksJson: '断言 JSON',
      manualJsonHint: 'Query 和 Headers 是 {"name":"...","value":"..."} 数组。Body 可用 {"kind":"none"}、{"kind":"json","value":...} 或 {"kind":"text","value":"..."}。断言使用 TestRelay 的断言格式。',
      invalidRequestFields: '请输入有效的 Query、Headers、Body JSON 对象。', invalidChecks: '请输入有效的断言 JSON 数组。',
      invalidVariablesJson: '环境变量必须是有效 JSON。', invalidCredentialRefsJson: '凭据引用必须是有效 JSON。', invalidSensitiveFieldsJson: '敏感字段必须是有效的 JSON 数组。',
      saveCase: '保存用例', runRequest: '发送请求', caseSaved: '用例已保存。', environmentSaved: '环境已保存。', manualStarted: '请求已启动；进度已记录在本次运行中。',
    };
    Object.assign(en, { elapsed: 'Elapsed', requestHeaders: 'Response headers', requestDetails: 'Request template', followLatest: 'Follow latest run', replayOriginal: 'Replay unchanged', not_started: 'Not dispatched', handoff_unknown: 'delivery unknown', handoff_uncertain: 'delivery unknown', confirmUnknown: 'Retry with original send ID', verifyDelivery: 'Delivery is uncertain. Check the originating conversation before retrying.', checkPending: 'Awaiting response', noChecks: 'No assertions', original: 'Original result', retryResult: 'Latest retry', active: 'Active', excluded: 'Not started' });
    Object.assign(zh, { elapsed: '耗时', requestHeaders: '响应头', requestDetails: '请求模板', followLatest: '跟随最新运行', replayOriginal: '原样复测', not_started: '未派发', handoff_unknown: '送达未知', handoff_uncertain: '送达未知', confirmUnknown: '用原发送标识重试', verifyDelivery: '无法确定是否送达，请先核对原会话，再决定是否重试。', checkPending: '等待实际响应', noChecks: '未设置断言', original: '原始结果', retryResult: '最近复测', active: '执行中', excluded: '未派发' });
    const dictionaries = { en, zh, 'zh-CN': zh };

    const apiRequestSchema = () => z.strictObject({
      sessionId: z.string().min(1),
      action: z.string().min(1),
      payload: z.record(z.string(), z.json()),
    });
    const apiResultSchema = () => z.record(z.string(), z.json());
    const apiCodec = {
      mode: 'strict',
      typeSymbol: `${PACKAGE}#ApiRequest`,
      create: apiRequestSchema,
      jsonSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          action: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
        },
        required: ['sessionId', 'action', 'payload'],
        additionalProperties: false,
      },
    };
    // rc.1 exposes Zod through its Web loader. Like the official action-cards
    // bundle, keep the Remote descriptor inside this bundle, including wire names.
    const endpoint = 'apiTestbench/perform';
    const performMethod = {
      id: `${PACKAGE}#${endpoint}`, service: NAMESPACE, namespace: NAMESPACE, method: 'perform',
      description: 'Session-scoped TestRelay API Testbench UI operation.',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: apiCodec, strictCodec: apiCodec }],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#ApiValue`, create: apiResultSchema, jsonSchema: { type: 'object', additionalProperties: true } },
      input() {
        return {
          create: () => z.strictObject({ request: apiRequestSchema() }),
          jsonSchema: { type: 'object', properties: { request: apiCodec.jsonSchema }, required: ['request'], additionalProperties: false },
        };
      },
      invoke(remote, input, signal) { return remote[NAMESPACE].perform(input.request, signal); },
    };
    const TYPERT_REMOTE = { package: PACKAGE, descriptors: [performMethod], methods: { [endpoint]: performMethod } };

    let runtimeCtx;
    let performHostAction;
    let translate = (key) => key;
    const t = (key) => translate(key);
    en.interfaceLanguage = 'en';
    zh.interfaceLanguage = 'zh';
    const ui = (english, chinese) => t('interfaceLanguage') === 'zh' ? chinese : english;
    const styles = () => h('style', { key: 'api-testbench-css' }, CSS + (typeof MANUAL_CSS === 'string' ? MANUAL_CSS : ''));
    const glyphs = {
      activity: 'M2 12h4l3-7 5 14 3-7h5', plus: 'M12 5v14M5 12h14', check: 'm5 12 4 4L19 6',
      x: 'm6 6 12 12M18 6 6 18', clock: 'M12 3a9 9 0 1 0 .01 0ZM12 7v5l3 2',
      chevron: 'm9 5 7 7-7 7', chevronDown: 'm6 9 6 6 6-6',
      arrow: 'M4 12h15m-6-6 6 6-6 6', arrowLeft: 'M20 12H5m6-6-6 6 6 6',
      copy: 'M8 8h12v13H8zM16 8V3H3v13h5', braces: 'M8 3H7c-2 0-2 2-2 4v1c0 3-2 4-3 4 2 0 3 1 3 4v1c0 2 0 4 2 4h1m8-18h1c2 0 2 2 2 4v1c0 3 2 4 3 4-2 0-3 1-3 4v1c0 2 0 4-2 4h-1',
      layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
      history: 'M3 6v5h5M3.5 10a9 9 0 1 1 1 7m7.5-10v5l3 2',
      repeat: 'M4 11V9a3 3 0 0 1 3-3h12l-3-3m4 10v2a3 3 0 0 1-3 3H5l3 3m8-12 3-3M8 15l-3 3',
      edit: 'm14 5 5 5M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15l-1 6Z',
      link: 'm10 14 4-4M8 16l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 8a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 0 0-5-5l-1 1',
      server: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h1m-1 10h1',
      list: 'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
      inbox: 'm3 14 3-9h12l3 9v5H3v-5Zm0 0h5l2 3h4l2-3h5',
      alert: 'm12 3 9 17H3L12 3Zm0 6v5m0 3h.01', code: 'm7 7-5 5 5 5m10-10 5 5-5 5m-3-13-4 16',
      response: 'M3 5h18v14H3zM3 9h18m-14 5 2 2 4-4',
      more: 'M4 12h1m6 0h1m6 0h1', globe: 'M12 3a9 9 0 1 0 .01 0Zm0 0c-4 4-4 14 0 18m0-18c4 4 4 14 0 18m-9-9h18',
      handoff: 'M3 7h13l-3-3m3 3-3 3M21 17H8l3-3m-3 3 3 3', send: 'm21 3-6 18-4-8-8-4 18-6Zm0 0L11 13',
      save: 'M4 3h13l4 4v14H3V3h1Zm3 0v6h9V3M7 21v-8h10v8',
      trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15m-9 3v8m4-8v8',
      settings: 'M4 6h6m4 0h6M4 12h10m4 0h2M4 18h2m4 0h10M10 4v4m4 2v4m-8 2v4',
      folder: 'M3 6h6l2 2h10v11H3V6Z',
    };
    function Icon({ name, size = 16, className = '' }) {
      return h('svg', { className: 'tr-icon ' + className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', focusable: 'false', 'aria-hidden': true }, h('path', { d: glyphs[name] ?? glyphs.activity }));
    }
    function RelayMark() {
      return h('svg', { className: 'tr-brandmark', width: 30, height: 30, viewBox: '0 0 32 32', fill: 'none', focusable: 'false', 'aria-hidden': true },
        h('rect', { width: 32, height: 32, rx: 8, fill: '#105a4c' }),
        h('path', { d: 'M6.5 19.5h4l6.8-10h7', stroke: '#dbffa4', strokeWidth: 2.8, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        h('path', { d: 'M7.5 23h7l6.8-10h4', stroke: '#fff', strokeWidth: 2.8, strokeLinejoin: 'round', strokeLinecap: 'round' }));
    }
    function WorkbenchHeader({ manualOpen, onNewRequest, onRuns, environment }) {
      return h('header', { className: 'tr-brandbar' },
        h('div', { className: 'tr-brand', 'aria-label': t('panelTitle') }, h(RelayMark), h('strong', { className: 'tr-brandname' }, 'TestRelay')),
        typeof environment === 'string' && environment ? h('span', { className: 'tr-env', title: t('environment') + ': ' + environment }, h(Icon, { name: 'server', size: 12 }), h('span', null, environment)) : null,
        h('button', { type: 'button', className: 'tr-btn' + (manualOpen ? '' : ' tr-primary'), onClick: manualOpen ? onRuns : onNewRequest }, h(Icon, { name: manualOpen ? 'arrowLeft' : 'plus', size: 14 }), manualOpen ? ui('Runs', '运行记录') : t('newRequest')));
    }

    function useLocaleRevision() {
      const locale = runtimeCtx?.locale;
      if (!locale?.subscribe) return 0;
      return React.useSyncExternalStore(
        (notify) => locale.subscribe(notify),
        () => locale.getSnapshot().revision,
        () => locale.getSnapshot().revision,
      );
    }

    function remoteError(result) {
      if (result?.ok === false) throw result.error ?? new Error('Remote call failed');
      return result?.ok === true && Object.hasOwn(result, 'value') ? result.value : result;
    }

    async function callHost(sessionId, action, payload, signal) {
      if (!performHostAction) throw new Error(remoteMountError || 'TestRelay API Testbench Host connection is not mounted.');
      const result = await performHostAction({ sessionId, action, payload: payload ?? {} }, signal);
      return remoteError(result);
    }

    function safeString(value) {
      if (value === undefined) return '—';
      return JSON.stringify(value, null, 2);
    }

    function statusKey(status) {
      return Object.hasOwn(en, status) ? status : 'unknown';
    }

    function collectRequestChanges(before, after, path = 'request', output = []) {
      if (output.length >= 12) return output;
      if (JSON.stringify(before) === JSON.stringify(after)) return output;
      const beforeObject = before !== null && typeof before === 'object';
      const afterObject = after !== null && typeof after === 'object';
      if (beforeObject && afterObject && Array.isArray(before) === Array.isArray(after)) {
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
        for (const key of keys) {
          const childPath = Array.isArray(before) ? `${path}[${key}]` : `${path}.${key}`;
          collectRequestChanges(before[key], after[key], childPath, output);
          if (output.length >= 12) break;
        }
        return output;
      }
      output.push({ path, before, after });
      return output;
    }

    function summaryValue(value) {
      if (value === undefined) return t('missing');
      const text = JSON.stringify(value);
      return text.length > 180 ? `${text.slice(0, 177)}…` : text;
    }

    function summaryFromRun(run) {
      if (!run) return '';
      const lines = [`${t('panelTitle')} — ${run.title}`, `${t('runLabel')}: ${run.id}`, `${t('originLabel')}: ${run.origin === 'agent' ? t('fromAgent') : t('manual')}`];
      const cases = run.cases ?? [];
      const compared = cases.filter((item) => item.attempts?.at(-1)?.parentAttemptId);
      for (const testCase of compared.length ? compared : cases) {
        const allAttempts = testCase.attempts ?? [];
        const latestAttempt = allAttempts.at(-1);
        const replaySource = latestAttempt?.parentAttemptId ? allAttempts.find((item) => item.id === latestAttempt.parentAttemptId) : null;
        const attempts = replaySource ? [replaySource, latestAttempt] : allAttempts.slice(-2);
        lines.push(`- ${testCase.name}`);
        if (!attempts.length) lines.push(`  - ${t(statusKey(testCase.status ?? 'pending'))}`);
        for (const attempt of attempts) {
          const source = attempt.origin === 'agent' ? t('fromAgent') : t('userAction');
          const http = attempt.response?.status ? `; ${t('http')} ${attempt.response.status}` : '';
          const requestLabel = attempt.request ? `; ${attempt.request.method} ${attempt.request.url}` : '';
          lines.push(`  - ${t('attempt')} ${attempt.id} (${source}): ${t(statusKey(attempt.status))}${http}${requestLabel}`);
          for (const [index, check] of (attempt.checks ?? []).entries()) {
            if (replaySource) {
              const first = replaySource.checks?.[index];
              const last = latestAttempt.checks?.[index];
              if (first?.state === 'passed' && last?.state === 'passed'
                && JSON.stringify(first.actual) === JSON.stringify(last.actual)) continue;
            }
            const actual = check.actualMissing ? t('missing') : Object.hasOwn(check, 'actual') ? summaryValue(check.actual) : t('indeterminate');
            lines.push(`    - ${t(check.kind)}${check.path ? ` ${check.path}` : ''}; ${t('expected')}: ${summaryValue(check.expected)}; ${t('actual')}: ${actual} (${t(check.state ?? 'indeterminate')})`);
          }
          if (attempt.error?.message) lines.push(`    - ${attempt.error.message}`);
        }
        if (attempts.length > 1) {
          const changes = collectRequestChanges(attempts.at(-2).request, attempts.at(-1).request);
          lines.push(`  - ${t('requestChanged')}:`);
          if (!changes.length) lines.push(`    - ${t('requestUnchanged')}`);
          for (const change of changes) lines.push(`    - ${change.path}: ${summaryValue(change.before)} → ${summaryValue(change.after)}`);
        }
      }
      const text = lines.join('\n');
      return text.length <= 12_000 ? text : `${text.slice(0, 11_997)}…`;
    }

    function TestbenchCallRow(props) {
      useLocaleRevision();
      const [run, setRun] = React.useState(null);
      const [error, setError] = React.useState('');
      const sessionId = props.sessionId;
      const callId = props.callId;
      const phase = props.phase;
      React.useEffect(() => {
        let closed = false;
        let timer;
        let lastRun = null;
        const controller = new AbortController();
        const poll = async () => {
          if (closed || phase === 'preparing') return;
          try {
            const value = await callHost(sessionId, 'runForCall', { callId }, controller.signal);
            if (closed) return;
            if (value?.run) {
              lastRun = value.run;
              setRun(value.run);
              setError('');
            } else if (phase === 'result') setError(t('noRun'));
          } catch (cause) {
            if (!closed && !controller.signal.aborted) setError(cause?.message ?? String(cause));
          }
          if (!closed && (phase !== 'result' || lastRun?.status === 'running')) timer = setTimeout(poll, 550);
        };
        if (phase !== 'preparing') poll();
        return () => { closed = true; clearTimeout(timer); controller.abort(); };
      }, [sessionId, callId, phase]);

      const toolFailed = phase === 'result' && props.block?.isError;
      const status = toolFailed ? 'failed' : error ? 'unavailable' : run?.status === 'running'
        ? ((run.cases ?? []).some((item) => item.status === 'running') ? 'waiting' : 'requestPreparing')
        : run ? statusKey(run.status) : phase === 'preparing' ? 'requestPreparing' : phase === 'result' ? 'unavailable' : 'requestPreparing';
      const activeCase = (run?.cases ?? []).find((item) => item.status === 'running' || item.status === 'pending');
      const cases = run?.cases ?? [];
      const outcomes = [...new Set(cases.map((item) => item.status))].map((state) => `${t(statusKey(state))} ${cases.filter((item) => item.status === state).length}`).join(' · ');
      const open = () => {
        try {
          const params = { callId, sessionId };
          if (run?.id) params.runId = run.id;
          runtimeCtx.sidebarRight.openTab(KIND, { params });
        } catch (cause) { setError(cause?.message ?? String(cause)); }
      };
      const statusClass = error || toolFailed ? 'failed' : run?.status === 'running' ? 'running' : run?.cases?.some((item) => ['failed', 'send_failed', 'timed_out', 'not_sent', 'cancelled', 'interrupted'].includes(item.status)) ? 'failed' : run?.cases?.every((item) => item.status === 'passed') ? 'passed' : '';
      const description = (toolFailed && props.block?.error?.message) || error || activeCase?.name || outcomes || t(status);
      return h('div', { className: 'atb-root' }, styles(),
        h('div', { className: 'tr-chat' }, h(RelayMark),
          h('div', { className: 'tr-chat-copy' },
            h('strong', { className: 'tr-chat-title', title: run?.title }, run?.title || 'TestRelay'),
            h('span', { className: 'tr-chat-desc', title: description }, description)),
          h('span', { className: 'tr-state', 'data-status': statusClass }, h(Icon, { name: statusClass === 'failed' ? 'alert' : statusClass === 'passed' ? 'check' : 'activity', size: 13 }), t(status)),
          h('button', { type: 'button', className: 'tr-icon-btn tr-chat-open', title: t('openRun'), onClick: open, 'aria-label': t('openRun') }, h(Icon, { name: 'arrow', size: 15 }))));
    }

    function resultButton(text, icon, onClick, options = {}) {
      const { primary, ...attributes } = options;
      return h('button', { type: 'button', className: primary ? 'tr-button tr-primary' : 'tr-button', onClick, ...attributes },
        icon ? h(Icon, { name: icon, size: 14 }) : null, text);
    }

    function resultState(state) {
      const name = state === 'passed' ? 'check' : ['failed', 'send_failed', 'timed_out'].includes(state) ? 'x'
        : ['running', 'pending'].includes(state) ? 'clock' : state === 'finished' ? 'check' : 'activity';
      return h('span', { className: 'tr-state', 'data-status': state }, h(Icon, { name, size: 13 }), t(statusKey(state)));
    }

    function resultDuration(attempt) {
      if (!attempt) return '';
      const ms = attempt.durationMs ?? (attempt.status === 'running' ? Date.now() - Date.parse(attempt.startedAt) : NaN);
      if (!Number.isFinite(ms)) return '';
      return ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : Math.max(0, Math.round(ms)) + ' ms';
    }

    function resultPath(url) {
      if (!url) return '—';
      try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch { return url; }
    }

    function resultMeta(label, value) {
      return h('div', { className: 'tr-kv' }, h('span', null, label), h('code', null, value));
    }

    function CheckList({ checks, waiting }) {
      if (!checks?.length) return h('p', { className: 'tr-empty' }, t('noChecks'));
      const render = (check, index) => {
        const state = waiting ? 'pending' : check.state ?? 'indeterminate';
        const actual = waiting ? '—' : check.actualMissing ? t('missing') : Object.hasOwn(check, 'actual') ? safeString(check.actual) : '—';
        const expected = check.kind === 'json_exists' ? ui('Present', '存在') : safeString(check.expected);
        return h('div', { className: 'tr-check-row', key: index, 'data-status': state },
          h('div', { className: 'tr-check-title' }, h('code', null, check.path || 'HTTP'), h('span', null, t(check.kind)), resultState(state)),
          h('div', { className: 'tr-compare' },
            resultMeta(t('expected'), expected), resultMeta(t('actual'), actual)),
          h('small', { className: 'tr-check-basis' }, [t('basis_' + (check.basis ?? 'agent')), check.basisDetail, !waiting && check.reason].filter(Boolean).join(' · ')),
        );
      };
      if (waiting || !checks.some(check => check.state === 'failed')) return h('div', { className: 'tr-checks' }, checks.map(render));
      const passed = checks.filter(check => check.state === 'passed');
      return h('div', { className: 'tr-checks' },
        checks.filter(check => check.state === 'failed').map(render),
        checks.filter(check => check.state !== 'failed' && check.state !== 'passed').map(render),
        passed.length ? h('details', { className: 'tr-disclosure tr-passed-checks' },
          h('summary', null, h(Icon, { name: 'check', size: 14 }), ui('Passed checks', '已通过断言') + ' · ' + passed.length),
          passed.map(render)) : null);
    }

    // Tokens stay text nodes, including quoted markup. Keep large previews cheap.
    function CodePreview({ value, json }) {
      const text = String(value ?? '');
      if (!json || !text || text.length > 12000 || text.split('\n', 161).length > 160) {
        return h('pre', { className: 'tr-code' }, text);
      }
      const token = /"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:true|false|null)\b/g;
      const rows = text.split('\n');
      return h('pre', { className: 'tr-code tr-json' }, rows.map((line, index) => {
        const parts = [];
        let pos = 0;
        for (const match of line.matchAll(token)) {
          if (match.index > pos) parts.push(line.slice(pos, match.index));
          pos = match.index + match[0].length;
          const kind = match[0][0] !== '"' ? 'literal' : /^\s*:/.test(line.slice(pos)) ? 'key' : 'string';
          parts.push(h('span', { key: match.index, className: 'tr-token-' + kind }, match[0]));
        }
        parts.push(line.slice(pos));
        return h('span', { className: 'tr-code-line', key: index },
          h('span', { className: 'tr-line-no', 'aria-hidden': true }, index + 1),
          h('code', null, parts, index === rows.length - 1 ? '' : '\n'));
      }));
    }
    function AttemptView({ attempt, testCase, tab }) {
      const response = attempt?.response;
      if (tab === 'checks') return h(CheckList, {
        checks: attempt?.checks?.length ? attempt.checks : testCase.checks,
        waiting: !attempt || attempt.status === 'running' || attempt.status === 'pending',
      });
      if (tab === 'request') {
        const request = attempt?.request ?? testCase.request;
        return request ? h('div', { className: 'tr-evidence' },
          resultMeta(t('method'), request.method), resultMeta(t('requestUrl'), request.url),
          request.query?.length ? resultMeta(ui('Query', '查询参数'), request.query.filter(x => x.enabled !== false).map(x => x.name + '=' + x.value).join('&')) : null,
          request.headers?.length ? h('section', null, h('h4', null, ui('Request headers', '请求头')), h('pre', { className: 'tr-code' }, request.headers.map(x => (x.enabled === false ? '× ' : '') + x.name + ': ' + x.value).join('\n'))) : null,
          request.body && request.body.kind !== 'none' ? h('section', null, h('h4', null, ui('Body', '请求体')), h(CodePreview, { json: request.body.kind === 'json', value: request.body.kind === 'text' ? request.body.value : JSON.stringify(request.body.value, null, 2) })) : null,
        ) : h('p', { className: 'tr-empty' }, ui('No request recorded.', '没有已记录的请求。'));
      }
      if (!response) return h('p', { className: 'tr-empty' }, attempt?.error?.message || (attempt?.status === 'running' ? t('waiting') : t('noBody')));
      return h('div', { className: 'tr-evidence' },
        h('h4', null, ui('Response body', '响应体')),
        h(CodePreview, { value: response.bodyPreview || t('noBody'), json: /^\s*[[{]/.test(response.bodyPreview ?? '') }),
        response.bodyTruncated || response.previewTruncated ? h('small', null, response.bodyTruncated ? t('bodyTruncated') : ui('Preview truncated.', '预览已截断。')) : null,
        h('details', { className: 'tr-disclosure' }, h('summary', null, t('requestHeaders') + ' (' + (response.headers?.length ?? 0) + ')'),
          h('pre', { className: 'tr-code' }, (response.headers ?? []).map(x => x.name + ': ' + x.value).join('\n') || '—')),
      );
    }

    function freshManualDraft(environmentId = 'direct') {
      return {
        title: 'Manual API test', name: 'New API request', purpose: '', environmentId, savedCaseId: '',
        method: 'GET', url: '',
        queryText: '[]', headersText: '[]', bodyText: JSON.stringify({ kind: 'none' }, null, 2),
        checksText: '[]',
      };
    }

    function parseManualDraft(draft) {
      let query;
      let headers;
      let body;
      let checks;
      const bodyDisabled = draft.method === 'GET' || draft.method === 'HEAD';
      try {
        query = JSON.parse(draft.queryText || '[]');
        headers = JSON.parse(draft.headersText || '[]');
        body = bodyDisabled ? { kind: 'none' } : JSON.parse(draft.bodyText || '{"kind":"none"}');
      } catch { throw new Error(t('invalidRequestFields')); }
      try { checks = JSON.parse(draft.checksText || '[]'); }
      catch { throw new Error(t('invalidChecks')); }
      if (!Array.isArray(query) || !Array.isArray(headers) || !body || typeof body !== 'object' || Array.isArray(body)) throw new Error(t('invalidRequestFields'));
      if (!Array.isArray(checks)) throw new Error(t('invalidChecks'));
      const request = { method: draft.method, url: draft.url, query, headers, body: bodyDisabled ? { kind: 'none' } : body };
      return { request, checks };
    }

    const MANUAL_CSS = `
      .tr-manual{container-type:inline-size;min-width:0;padding-top:20px;color:var(--tr-ink);font-size:13px}
      .tr-manual *{box-sizing:border-box}
      .tr-manual button,.tr-manual input,.tr-manual select,.tr-manual textarea{font-family:inherit}
      .tr-manual label{min-width:0}
      .tr-manual-top,.tr-manual-actions,.tr-manual-send,.tr-manual-inline,.tr-manual-sectionhead{display:flex;align-items:center;gap:8px}
      .tr-manual-top{justify-content:space-between;gap:8px 14px;margin:0 0 16px}
      .tr-manual-title{min-width:0;overflow-wrap:anywhere;margin:0;font:670 clamp(18px,4.3cqi,23px)/1.25 system-ui,sans-serif;letter-spacing:-.025em}
      .tr-manual-top .tr-btn{flex:none}
      .tr-manual-tools{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;margin:8px 0 13px}
      .tr-manual-actions{flex-wrap:wrap;gap:6px}
      .tr-manual .tr-btn,.tr-manual .tr-icon-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
      .tr-manual .tr-icon-btn{width:30px;height:30px;flex:none}
      .tr-manual :is(input:not([type=checkbox]),select,textarea){border:1px solid var(--tr-border);border-radius:6px;background:var(--tr-surface);color:var(--tr-ink);font-size:12px;min-width:0}
      .tr-manual :is(input:not([type=checkbox]),select){min-height:32px;padding:5px 8px}
      .tr-manual :is(button,input,textarea,select,summary):focus-visible{outline:2px solid var(--tr-accent);outline-offset:1px}
      .tr-manual input::placeholder,.tr-manual textarea::placeholder{color:var(--tr-muted);opacity:.8}
      .tr-manual .tr-manual-env{max-width:min(170px,45cqw);font-weight:600}
      .tr-manual-env-label{display:inline-flex;gap:6px;align-items:center;color:var(--tr-muted);font-size:12px}
      .tr-manual-selectwrap{position:relative;display:inline-flex;align-items:center;min-width:0}
      .tr-manual-selectwrap>.tr-icon{position:absolute;right:5px;pointer-events:none;color:var(--tr-muted)}
      .tr-manual .tr-manual-tools select.tr-manual-env{appearance:none;min-height:27px;padding:4px 21px 4px 6px;background:transparent;border:0;border-radius:5px;color:var(--tr-ink);cursor:pointer}
      .tr-manual .tr-manual-tools :is(.tr-btn,.tr-icon-btn){min-height:27px;height:27px;padding-block:3px;border-color:transparent;background:transparent;color:var(--tr-muted)}
      .tr-manual .tr-manual-tools .tr-icon-btn{width:25px}
      .tr-manual .tr-manual-tools :is(button,select):hover{background:var(--tr-code-bg);color:var(--tr-ink)}
      .tr-manual-send{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;margin:0}
      .tr-manual-target{display:flex;min-width:0;align-items:stretch;overflow:hidden;border:1px solid color-mix(in srgb,var(--tr-accent) 23%,var(--tr-border));border-radius:8px;background:var(--tr-surface)}
      .tr-manual-target:focus-within{border-color:var(--tr-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--tr-accent) 13%,transparent)}
      .tr-manual-verb{flex:none;border-right:1px solid var(--tr-border);background:var(--tr-soft)}
      .tr-manual-verb>.tr-icon{right:8px;color:var(--tr-accent)}
      .tr-manual .tr-manual-target select.tr-manual-method{appearance:none;align-self:stretch;min-width:75px;min-height:43px;height:100%;padding:0 24px 0 10px;border:0;border-radius:0;background:transparent;color:var(--tr-accent);font:750 12px/1 var(--tr-mono,monospace);cursor:pointer}
      .tr-manual .tr-manual-target input.tr-manual-url{border:0;border-radius:0;font:500 12.5px/1.4 var(--tr-mono,monospace);flex:1;width:0;min-height:43px;padding:6px 11px;background:transparent}
      .tr-manual .tr-manual-target :is(input,select):focus-visible{outline:none}
      .tr-manual .tr-manual-send .tr-primary{min-height:45px;gap:7px;padding-inline:16px;border-radius:8px}
      .tr-manual-config{overflow:hidden;border:1px solid var(--tr-border);border-radius:9px;background:var(--tr-surface)}
      .tr-manual .tr-manual-tabs{display:flex;align-items:end;gap:18px;overflow-x:auto;padding:3px 12px 0;margin:0;border:0;border-bottom:1px solid var(--tr-border);border-radius:0;background:var(--tr-surface);scrollbar-width:thin}
      .tr-manual-tabs [role=tab]{appearance:none;position:relative;background:transparent;color:var(--tr-muted);padding:7px 0 9px;border:0;border-radius:0;white-space:nowrap;cursor:pointer;font-size:12px;font-weight:600;line-height:18px}
      .tr-manual-tabs [role=tab][aria-selected=true]{color:var(--tr-accent);box-shadow:inset 0 -2px var(--tr-accent)}
      .tr-manual-tabs .tr-manual-count{margin-left:4px;opacity:.85;font-variant-numeric:tabular-nums}
      .tr-manual-pane{padding:13px 12px;min-width:0}
      .tr-manual-tablepane{padding:0}
      .tr-manual-kv{min-width:0;overflow:hidden;border-bottom:1px solid var(--tr-border)}
      .tr-manual-kvrow{display:grid;grid-template-columns:24px minmax(0,.9fr) minmax(0,1.1fr) 28px;align-items:center;gap:2px;padding:2px 7px}
      .tr-manual-kvrow+.tr-manual-kvrow{border-top:1px solid var(--tr-border)}
      .tr-manual-kvrow.tr-manual-columns{padding-block:5px;background:var(--tr-bg);color:var(--tr-muted);font-size:11px;font-weight:600}
      .tr-manual-columns span{padding-inline:7px}
      .tr-manual-kvrow input[type=checkbox]{margin:0 auto;accent-color:var(--tr-accent)}
      .tr-manual .tr-manual-kvrow input[type=text]{width:100%;border:0;border-radius:4px;background:transparent;padding:6px 7px;min-height:31px}
      .atb-root .tr-manual .tr-manual-kvrow input[type=text]:focus-visible{outline:none;box-shadow:inset 0 0 0 1.5px var(--tr-accent);background:var(--tr-surface)}
      .tr-manual .tr-manual-kvrow .tr-icon-btn{width:25px;min-height:25px;height:25px;border:0;background:transparent;color:var(--tr-muted)}
      .tr-manual .tr-manual-kvrow .tr-icon-btn:hover:not(:disabled){background:var(--tr-code-bg);color:var(--tr-ink)}
      .tr-manual-kvrow[data-enabled=false] input[type=text]{color:var(--tr-muted)}
      .tr-manual-pane .tr-manual-add{margin-top:8px}
      .tr-manual .tr-manual-tablepane .tr-manual-add{margin:3px 6px;border:0;background:transparent;min-height:30px;color:var(--tr-accent)}
      .tr-manual .tr-manual-code{display:block;width:100%;min-height:118px;resize:vertical;padding:10px;font:12px/1.6 ui-monospace,monospace;tab-size:2;background:var(--tr-code-bg);color:var(--tr-ink)}
      .tr-manual .tr-manual-smallcode{min-height:55px}
      .tr-manual-subhead{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--tr-muted);font-size:12px}
      .tr-manual-field{display:grid;gap:4px;font-size:12px;color:var(--tr-muted)}
      .tr-manual-field>span{font-weight:600}
      .tr-manual-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:9px}
      .tr-manual-box{border:1px solid var(--tr-border);border-radius:7px;padding:11px;margin:0 0 12px;display:grid;gap:10px;background:var(--tr-surface)}
      .tr-manual-sectionhead{justify-content:space-between;font-weight:650;color:var(--tr-ink)}
      .tr-manual-check{display:grid;gap:9px;border:1px solid var(--tr-border);border-radius:6px;padding:9px;margin-bottom:6px}
      .tr-manual-check .tr-manual-inline select:first-child{flex:1}
      .tr-manual-inline>.tr-manual-case-select{flex:1}
      .tr-manual-note,.tr-manual-error,.tr-manual-status{font-size:12px;line-height:1.5}
      .tr-manual-note{color:var(--tr-muted)}
      .tr-manual-error{color:var(--tr-bad)}
      .tr-manual-status{color:var(--tr-good)}
      .tr-manual .tr-manual-meta{border-top:1px solid var(--tr-border);margin-top:4px}
      .tr-manual-meta>summary{cursor:pointer;color:var(--tr-muted);font-size:12px;padding:8px 0;list-style-position:inside}
      .tr-manual-meta[open]>.tr-manual-grid{margin-bottom:8px}
      .tr-manual details.tr-manual-properties{margin-top:12px;border:0}
      .tr-manual-properties>summary{display:flex;align-items:center;gap:7px;list-style:none;padding:8px 2px;font-weight:600}
      .tr-manual-properties>summary::-webkit-details-marker{display:none}
      .tr-manual-properties>summary>.tr-icon{transform:rotate(-90deg)}
      .tr-manual-properties[open]>summary>.tr-icon{transform:rotate(0deg)}
      .tr-manual-properties[open]>.tr-manual-grid{padding:7px 0}
      @container (max-width:350px){
        .tr-manual .tr-manual-target select.tr-manual-method{min-width:65px;padding-left:7px}
        .tr-manual .tr-manual-target input.tr-manual-url{padding-inline:7px}
        .tr-manual .tr-manual-send .tr-primary{padding-inline:10px}
        .tr-manual .tr-manual-tabs{gap:13px;padding-inline:9px}
        .tr-manual-tools .tr-manual-actions{gap:2px}
        .tr-manual .tr-manual-env{max-width:115px}
      }
    `;

    function editorButton(label, onClick, { icon, className = 'tr-btn', disabled = false, iconOnly = false, ...attributes } = {}) {
      return h('button', { type: 'button', className, onClick, disabled, 'aria-label': label, title: iconOnly ? label : undefined, ...attributes },
        icon ? h(Icon, { name: icon, size: 14 }) : null, iconOnly ? null : label);
    }

    function editorField(label, control) {
      return h('label', { className: 'tr-manual-field' }, h('span', null, label), control);
    }

    function draftArray(source) {
      try { const value = JSON.parse(source || '[]'); return Array.isArray(value) ? value : []; }
      catch { return []; }
    }

    function ParameterEditor({ rows, onChange, header }) {
      const keyInput = React.useRef(null);
      const focusRow = React.useRef(null);
      const empty = { name: '', value: '', enabled: true };
      const name = header ? ui('Header', '请求头') : ui('Parameter', '参数');
      const keyHint = header ? 'Content-Type' : ui('Parameter name', '参数名');
      const valueHint = header ? 'application/json' : ui('Value', '值');
      const shown = rows.length ? rows : [empty];
      const update = (index, fields) => onChange(shown.map((row, i) => i === index ? { ...row, ...fields } : row));
      return h(React.Fragment, null,
        h('div', { className: 'tr-manual-kv' },
          h('div', { className: 'tr-manual-kvrow tr-manual-columns', 'aria-hidden': true },
            h('span'), h('span', null, ui('Key', '键')), h('span', null, ui('Value', '值')), h('span')),
          shown.map((row, index) => {
            const keyLabel = name + ' ' + (index + 1);
            return h('div', { key: index, className: 'tr-manual-kvrow', 'data-enabled': row.enabled !== false },
              h('input', { type: 'checkbox', checked: row.enabled !== false, 'aria-label': keyLabel + ' · ' + ui('Enabled', '启用'), onChange: (e) => update(index, { enabled: e.target.checked }) }),
              h('input', { type: 'text', placeholder: keyHint, value: row.name, 'aria-label': keyLabel + ' · ' + ui('Key', '键'),
                ref: (input) => {
                  if (index === 0) keyInput.current = input;
                  if (input && focusRow.current === index) { focusRow.current = null; input.focus(); }
                }, onChange: (e) => update(index, { name: e.target.value }) }),
              h('input', { type: 'text', placeholder: valueHint, value: row.value, 'aria-label': keyLabel + ' · ' + ui('Value', '值'), onChange: (e) => update(index, { value: e.target.value }) }),
              editorButton(keyLabel + ' · ' + ui('Remove', '删除'), () => onChange(rows.filter((_, i) => i !== index)), { icon: 'trash', iconOnly: true, className: 'tr-icon-btn', disabled: !rows.length }));
          })),
        editorButton(header ? ui('Add header', '添加请求头') : ui('Add parameter', '添加参数'), () => {
          if (!rows.length) { keyInput.current?.focus(); return; }
          focusRow.current = rows.length;
          onChange([...rows, empty]);
        },
          { icon: 'plus', className: 'tr-btn tr-manual-add' }));
    }

    const JSON_BODY_PREFIX = '{"kind":"json","value":';

    function manualBodyParts(source) {
      if (source?.startsWith(JSON_BODY_PREFIX) && source.endsWith('}')) return { kind: 'json', text: source.slice(JSON_BODY_PREFIX.length, -1) };
      try {
        const body = JSON.parse(source);
        if (body.kind === 'text') return { kind: 'text', text: body.value };
        if (body.kind === 'json') return { kind: 'json', text: JSON.stringify(body.value, null, 2) };
      } catch {}
      return { kind: 'none', text: '' };
    }

    function BodyEditor({ method, body, onChange }) {
      if (method === 'GET' || method === 'HEAD') return h('div', { className: 'tr-manual-note' }, ui('This method sends no request body.', '此方法不发送请求正文。'));
      const write = (kind, text) => onChange(kind === 'json' ? JSON_BODY_PREFIX + text + '}' :
        JSON.stringify(kind === 'text' ? { kind, value: text } : { kind: 'none' }));
      return h(React.Fragment, null,
        h('label', { className: 'tr-manual-subhead' }, ui('Body type', '正文类型'),
          h('select', { value: body.kind, onChange: (e) => write(e.target.value, body.text || (e.target.value === 'json' ? '{}' : '')) },
            h('option', { value: 'none' }, ui('None', '无')), h('option', { value: 'json' }, 'JSON'), h('option', { value: 'text' }, ui('Text', '纯文本')))),
        body.kind !== 'none' ? h('textarea', { className: 'tr-manual-code', spellCheck: false,
          'aria-label': body.kind === 'json' ? ui('JSON body', 'JSON 正文') : ui('Text body', '文本正文'), value: body.text,
          placeholder: body.kind === 'json' ? '{ "coupon": "VALID10" }' : '', onChange: (e) => write(body.kind, e.target.value) }) : null);
    }
    function AssertionsEditor({ checks, expectedInputs, onChange }) {
      const kinds = [
        ['status_equals', ui('Status equals', '状态码等于')],
        ['json_equals', ui('JSON value equals', 'JSON 值等于')],
        ['json_exists', ui('JSON path exists', 'JSON 路径存在')],
      ];
      const baseCheck = (kind, previous = {}) => ({
        kind, basis: previous.basis || 'user', ...(previous.basisDetail ? { basisDetail: previous.basisDetail } : {}),
        ...(kind === 'status_equals' ? { expected: 200 } : { path: previous.path || '$.value' }),
        ...(kind === 'json_equals' ? { expected: null } : {}),
      });
      const update = (index, next, raw = expectedInputs[index]) => {
        const inputs = checks.map((_, i) => i === index ? raw : expectedInputs[i]);
        onChange(checks.map((check, i) => i === index ? next : check), inputs);
      };
      const add = () => onChange([...checks, baseCheck('status_equals')], [...expectedInputs, null]);
      return h(React.Fragment, null,
        checks.map((check, index) => {
          const uid = (index + 1) + ' · ';
          const text = expectedInputs[index] ?? (Object.hasOwn(check, 'expected') ? JSON.stringify(check.expected) : '');
          return h('div', { key: index, className: 'tr-manual-check' },
            h('div', { className: 'tr-manual-inline' },
              h('select', { value: check.kind, 'aria-label': uid + ui('Assertion type', '断言类型'),
                onChange: (e) => update(index, baseCheck(e.target.value, check), null) },
                kinds.map(([value, label]) => h('option', { key: value, value }, label))),
              editorButton(ui('Remove assertion', '删除断言') + ' ' + (index + 1), () => onChange(checks.filter((_, i) => i !== index), expectedInputs.filter((_, i) => i !== index)),
                { icon: 'trash', className: 'tr-icon-btn', iconOnly: true })),
            h('div', { className: 'tr-manual-grid' },
              check.kind !== 'status_equals' ? editorField(ui('JSON path', 'JSON 路径'), h('input', {
                value: check.path ?? '', placeholder: '$.discount', onChange: (e) => update(index, { ...check, path: e.target.value }) })) : null,
              check.kind !== 'json_exists' ? editorField(check.kind === 'status_equals' ? ui('Expected status', '预期状态码') : ui('Expected JSON value', '预期值（JSON）'),
                h('input', { value: text, spellCheck: false, inputMode: check.kind === 'status_equals' ? 'numeric' : 'text', placeholder: check.kind === 'status_equals' ? '200' : '0, "ok", null',
                  onChange: (e) => {
                    const raw = e.target.value;
                    let value;
                    try { value = JSON.parse(raw); } catch { value = null; }
                    update(index, { ...check, expected: value }, raw);
                  } })) : null,
              editorField(ui('Expectation source', '预期来源'), h('select', { value: check.basis ?? 'agent', onChange: (e) => update(index, { ...check, basis: e.target.value }) },
                [['user', ui('User', '用户')], ['project', ui('Project', '项目')], ['agent', ui('Agent', 'Agent')]].map(([value, label]) => h('option', { key: value, value }, label))))),
            h('details', { className: 'tr-manual-meta' }, h('summary', null, ui('Source note', '依据说明')),
              h('input', { 'aria-label': uid + ui('Source note', '依据说明'), value: check.basisDetail ?? '', placeholder: ui('File or requirement', '文件位置或需求说明'), onChange: (e) => update(index, { ...check, basisDetail: e.target.value }) })));
        }),
        checks.length ? null : h('div', { className: 'tr-manual-note' }, ui('Add an assertion to check the response.', '添加断言以校验响应。')),
        editorButton(ui('Add assertion', '添加断言'), add, { icon: 'plus', className: 'tr-btn tr-manual-add', disabled: checks.length >= 30 }));
    }

    function EnvironmentEditor({ draft, change, save, close, busy, status }) {
      const fields = [
        ['name', ui('Name', '环境名称')], ['baseUrl', ui('Base URL', '基础地址'), 'https://api.example.com'],
      ];
      const jsonFields = [
        ['variablesText', ui('Variables', '普通变量'), '{"REGION":"west"}'],
        ['credentialRefsText', ui('Credential references', '凭据引用'), '{"API_TOKEN":"DSH_CREDENTIAL_NAME"}'],
        ['sensitiveFieldsText', ui('Redacted fields', '脱敏字段'), '["internalNote"]'],
      ];
      return h('section', { className: 'tr-manual-box', 'aria-label': ui('Environment settings', '环境设置') },
        h('div', { className: 'tr-manual-sectionhead' }, ui('Environment settings', '环境设置'),
          editorButton(ui('Close', '关闭'), close, { iconOnly: true, icon: 'chevronDown', className: 'tr-icon-btn' })),
        h('div', { className: 'tr-manual-grid' }, fields.map(([key, label, placeholder]) =>
          h('label', { key, className: 'tr-manual-field' }, h('span', null, label), h('input', { value: draft[key], placeholder, onChange: (e) => change(key, e.target.value) })))),
        h('div', { className: 'tr-manual-grid' }, jsonFields.map(([key, label, placeholder]) =>
          h('label', { key, className: 'tr-manual-field' }, h('span', null, label + ' · JSON'), h('textarea', { value: draft[key], spellCheck: false,
            className: 'tr-manual-code tr-manual-smallcode', placeholder, onChange: (e) => change(key, e.target.value) })))),
        h('div', { className: 'tr-manual-note' }, t('credentialHint')),
        h('div', { className: 'tr-manual-actions' }, editorButton(ui('Save environment', '保存环境'), save, { icon: 'save', disabled: busy }),
          status ? h('span', { className: 'tr-manual-status', role: 'status' }, t(status)) : null));
    }

    function ManualWorkbench(props) {
      const { draft, setDraft, environments, savedCases, selectedCaseId, setSelectedCaseId, onOpenCase, onNewRequest, onSaveCase, onRun,
        environmentEditorOpen, onToggleEnvironment, onNewEnvironment, environmentDraft, onEnvironmentChange, onSaveEnvironment,
        busy, status, error, environmentStatus } = props;
      const [tab, setTab] = React.useState('query');
      const [library, showLibrary] = React.useState(false);
      const query = draftArray(draft.queryText), headers = draftArray(draft.headersText), checks = draftArray(draft.checksText);
      const expectedInputs = draft.manualExpectedInputs ?? [];
      const body = manualBodyParts(draft.bodyText);
      const bodyAllowed = draft.method !== 'GET' && draft.method !== 'HEAD';
      const tabs = [
        ['query', ui('Params', '参数'), query.length], ['headers', ui('Headers', '请求头'), headers.length],
        ['body', ui('Body', '正文'), 0], ['checks', ui('Assertions', '断言'), checks.length],
      ];
      let issue = '';
      if (bodyAllowed && body.kind === 'json') {
        try { JSON.parse(body.text); } catch { issue = ui('Enter a valid JSON body.', '请输入有效的 JSON 正文。'); }
      }
      if (!issue && [...query, ...headers].some((row) => row.enabled !== false && !row.name.trim())) {
        issue = ui('Name or disable each empty parameter or header.', '请填写空白参数或请求头的名称，或取消勾选。');
      }
      if (!issue) {
        for (const [index, check] of checks.entries()) {
          if (check.kind !== 'status_equals' && !check.path?.trim()) { issue = ui('Enter a JSON path for the assertion.', '请填写断言的 JSON 路径。'); break; }
          if (check.kind === 'status_equals' && (!Number.isInteger(check.expected) || check.expected < 100 || check.expected > 599)) {
            issue = ui('Expected HTTP status must be 100–599.', '预期 HTTP 状态码须为 100–599。'); break;
          }
          if (check.kind === 'json_equals' && typeof expectedInputs[index] === 'string') {
            try { JSON.parse(expectedInputs[index]); } catch { issue = ui('Expected values use JSON, e.g. 0, "ok" or null.', '预期值使用 JSON 格式，例如 0、"ok" 或 null。'); break; }
          }
        }
      }
      const targetReady = !busy && !issue && Boolean(draft.environmentId) && Boolean(draft.url.trim());
      const setArray = (key, rows) => setDraft({ [key]: JSON.stringify(rows) });
      const toolButton = (label, cb, icon, attributes = {}) => editorButton(label, cb, { icon, ...attributes });
      const onTabKey = (e, index) => {
        let targetIndex;
        if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') targetIndex = (index + tabs.length - 1) % tabs.length;
        else if (e.key === 'Home') targetIndex = 0;
        else if (e.key === 'End') targetIndex = tabs.length - 1;
        else return;
        e.preventDefault(); setTab(tabs[targetIndex][0]); e.currentTarget.parentNode.children[targetIndex]?.focus();
      };
      const requestName = draft.name?.trim();
      const displayName = !requestName || (!draft.savedCaseId && requestName === 'New API request') ? ui('New request', '新建请求') : requestName;
      return h('section', { className: 'tr-manual', 'aria-label': ui('Request editor', '请求编辑器') },
        h('header', { className: 'tr-manual-top' },
          h('h2', { className: 'tr-manual-title' }, displayName),
          toolButton(ui('Save case', '保存用例'), onSaveCase, 'save', { disabled: !targetReady })),
        h('div', { className: 'tr-manual-send' },
          h('div', { className: 'tr-manual-target' },
            h('span', { className: 'tr-manual-selectwrap tr-manual-verb' },
              h('select', { className: 'tr-method tr-manual-method', value: draft.method, 'aria-label': t('method'), onChange: (e) => setDraft({ method: e.target.value }) },
                ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => h('option', { key: method, value: method }, method))),
              h(Icon, { name: 'chevronDown', size: 12 })),
            h('input', { className: 'tr-manual-url', value: draft.url, spellCheck: false, autoComplete: 'off', 'aria-label': t('requestUrl'),
              placeholder: 'https://api.example.com/v1/items', onChange: (e) => setDraft({ url: e.target.value }),
              onKeyDown: (e) => { if (e.key === 'Enter' && !e.nativeEvent?.isComposing && targetReady) { e.preventDefault(); onRun(); } } })),
          toolButton(ui('Send', '发送'), onRun, 'send', { className: 'tr-btn tr-primary', disabled: !targetReady })),
        h('div', { className: 'tr-manual-tools' },
          h('div', { className: 'tr-manual-actions' },
            h('label', { className: 'tr-manual-env-label' }, t('environment'),
              h('span', { className: 'tr-manual-selectwrap' },
                h('select', { className: 'tr-manual-env', 'aria-label': t('environment'), value: draft.environmentId, onChange: (e) => setDraft({ environmentId: e.target.value }) },
                  environments.map((entry) => h('option', { key: entry.id, value: entry.id },
                    entry.id === 'direct' && entry.name === 'Direct input' ? ui('Direct input', '直接输入') :
                    entry.id === 'local' && entry.name === 'Local development' ? ui('Local development', '本地开发') : entry.name))),
                h(Icon, { name: 'chevronDown', size: 12 }))),
            toolButton(ui('Edit environment', '编辑环境'), onToggleEnvironment, 'settings', { iconOnly: true, className: 'tr-icon-btn', 'aria-expanded': environmentEditorOpen }),
            toolButton(ui('New environment', '新建环境'), onNewEnvironment, 'plus', { iconOnly: true, className: 'tr-icon-btn' })),
          toolButton(ui('Saved cases', '用例库'), () => showLibrary(!library), 'folder', { 'aria-expanded': library })),
        environmentEditorOpen ? h(EnvironmentEditor, { draft: environmentDraft, change: onEnvironmentChange, save: onSaveEnvironment,
          close: onToggleEnvironment, busy, status: environmentStatus }) : null,
        library ? h('section', { className: 'tr-manual-box' },
          h('div', { className: 'tr-manual-sectionhead' }, ui('Saved cases', '已保存用例'),
            toolButton(ui('New request', '新建请求'), () => { onNewRequest(); showLibrary(false); }, 'plus')),
          savedCases.length ? h('div', { className: 'tr-manual-inline' },
            h('select', { className: 'tr-manual-case-select', value: selectedCaseId, 'aria-label': ui('Saved case', '已保存用例'), onChange: (e) => setSelectedCaseId(e.target.value) },
              h('option', { value: '' }, ui('Select a saved case', '选择用例')),
              savedCases.map((item) => h('option', { key: item.id, value: item.id }, (item.request?.method || 'GET') + '  ' + item.name))),
            editorButton(ui('Open', '打开'), () => { onOpenCase(); showLibrary(false); }, { disabled: !selectedCaseId }))
            : h('div', { className: 'tr-manual-note' }, ui('No saved cases in this workspace.', '此工作区暂无已保存用例。'))) : null,
        h('section', { className: 'tr-manual-config', 'aria-label': ui('Request configuration', '请求配置') },
          h('div', { className: 'tr-tabs tr-manual-tabs', role: 'tablist', 'aria-label': ui('Request configuration', '请求配置') },
          tabs.map(([key, label, count], index) => h('button', { type: 'button', key, role: 'tab', 'aria-selected': tab === key, tabIndex: tab === key ? 0 : -1,
            onKeyDown: (e) => onTabKey(e, index), onClick: () => setTab(key) }, label,
            count ? h('span', { className: 'tr-manual-count' }, count) : null))),
          h('div', { className: 'tr-manual-pane' + (['query', 'headers'].includes(tab) ? ' tr-manual-tablepane' : ''), role: 'tabpanel', 'aria-label': tabs.find(([key]) => key === tab)[1] },
          tab === 'query' ? h(ParameterEditor, { rows: query, onChange: (rows) => setArray('queryText', rows), header: false }) : null,
          tab === 'headers' ? h(ParameterEditor, { rows: headers, onChange: (rows) => setArray('headersText', rows), header: true }) : null,
          tab === 'body' ? h(BodyEditor, { method: draft.method, body, onChange: (bodyText) => setDraft({ bodyText }) }) : null,
          tab === 'checks' ? h(AssertionsEditor, { checks, expectedInputs, onChange: (rows, inputs) => setDraft({ checksText: JSON.stringify(rows), manualExpectedInputs: inputs }) }) : null)),
        h('details', { className: 'tr-manual-meta tr-manual-properties' }, h('summary', null, h(Icon, { name: 'chevronDown', size: 13 }), ui('Request name and description', '请求名称与说明')),
          h('div', { className: 'tr-manual-grid' },
            [['name', t('caseName')], ['title', t('runTitle')], ['purpose', t('purpose')]].map(([key, label]) =>
              h('label', { key, className: 'tr-manual-field' }, h('span', null, label),
                h('input', { value: draft[key], onChange: (e) => setDraft({ [key]: e.target.value }) }))))),
        error || issue ? h('div', { className: 'tr-manual-error', role: 'alert' }, error || issue) : null,
        status ? h('div', { className: 'tr-manual-status', role: 'status' }, t(status)) : null);
    }

    const handoffDrafts = new Map();

    function TestbenchPanel(props) {
      let tabInfo = {};
      const useTabInfo = props.hooks?.tabInfo ?? props.useTabInfo;
      try { if (typeof useTabInfo === 'function') tabInfo = useTabInfo() ?? {}; } catch {}
      const params = tabInfo.tab?.navigation?.params ?? tabInfo.tab?.params ?? {};
      return h(SessionPanel, { key: JSON.stringify([props.sessionId, params.callId, params.runId]), sessionId: props.sessionId, params });
    }

    function SessionPanel(props) {
      useLocaleRevision();
      // Result-browser selection belongs to one run; polling never overwrites a user's selection.
      const [inspection, setInspection] = React.useState({});
      const params = props.params;
      const sessionId = props.sessionId;
      const callId = typeof params.callId === 'string' ? params.callId : '';
      const initialRunId = typeof params.runId === 'string' ? params.runId : '';
      const [selectedRunId, setSelectedRunId] = React.useState(initialRunId);
      const [snapshot, setSnapshot] = React.useState(null);
      const [manualOpen, setManualOpen] = React.useState(false);
      const [manualDraft, setManualDraft] = React.useState(() => freshManualDraft());
      const [environments, setEnvironments] = React.useState([]);
      const [savedCases, setSavedCases] = React.useState([]);
      const [selectedSavedCaseId, setSelectedSavedCaseId] = React.useState('');
      const [manualBusy, setManualBusy] = React.useState(false);
      const [manualStatus, setManualStatus] = React.useState('');
      const [manualError, setManualError] = React.useState('');
      const [environmentEditorOpen, setEnvironmentEditorOpen] = React.useState(false);
      const [environmentDraft, setEnvironmentDraft] = React.useState({ id: '', name: '', baseUrl: '', variablesText: '{}', credentialRefsText: '{}', sensitiveFieldsText: '[]' });
      const [environmentStatus, setEnvironmentStatus] = React.useState('');
      const [loadError, setLoadError] = React.useState('');
      const [summary, setSummary] = React.useState('');
      const [sendState, setSendState] = React.useState('');
      const [copyState, setCopyState] = React.useState('');
      const [retryDrafts, setRetryDrafts] = React.useState({});
      const [retrySourceAttemptIds, setRetrySourceAttemptIds] = React.useState({});
      const [retryConfirmations, setRetryConfirmations] = React.useState({});
      const [retryStates, setRetryStates] = React.useState({});
      const [retryingCaseId, setRetryingCaseId] = React.useState('');
      const [cancellingAttemptId, setCancellingAttemptId] = React.useState('');
      const [summaryDirty, setSummaryDirty] = React.useState(false);
      const cursorRef = React.useRef(0);
      const requestId = React.useRef(`api-testbench-${makeId()}`);
      const manualRequestId = React.useRef('');
      const manualEditing = React.useRef(false);
      const retryRequestIds = React.useRef({});
      React.useEffect(() => { setSelectedRunId(initialRunId); }, [initialRunId]);

      React.useEffect(() => {
        let closed = false;
        const controller = new AbortController();
        const load = async () => {
          try {
            const [environmentResult, caseResult] = await Promise.all([
              callHost(sessionId, 'listEnvironments', {}, controller.signal),
              callHost(sessionId, 'listCases', { limit: 200 }, controller.signal),
            ]);
            if (closed) return;
            const nextEnvironments = environmentResult?.environments ?? [];
            setEnvironments(nextEnvironments);
            setSavedCases(caseResult?.cases ?? []);
            setManualDraft((old) => nextEnvironments.some((item) => item.id === old.environmentId)
              ? old
              : { ...old, environmentId: nextEnvironments.find((item) => item.id === 'direct')?.id ?? nextEnvironments[0]?.id ?? '' });
          } catch (cause) {
            if (!closed && !controller.signal.aborted) setManualError(cause?.message ?? String(cause));
          }
        };
        load();
        return () => { closed = true; controller.abort(); };
      }, [sessionId]);

      React.useEffect(() => {
        let closed = false;
        let timer;
        const controller = new AbortController();
        cursorRef.current = 0;
        let settled = false;
        let supportsChanges = true;
        const poll = async () => {
          if (closed) return;
          try {
            if (!selectedRunId && callId) {
              const found = await callHost(sessionId, 'runForCall', { callId }, controller.signal);
              if (closed) return;
              if (found?.run?.id) { setSelectedRunId(found.run.id); return; }
              else {
                setSnapshot((old) => old ?? { run: null, history: [], events: [] });
                setLoadError('');
                timer = setTimeout(poll, 450);
                return;
              }
            }
            if (settled && supportsChanges) {
              let update;
              try {
                update = await callHost(sessionId, 'changes', { afterSeq: cursorRef.current }, controller.signal);
              } catch (cause) {
                // An older Host may still be loaded during a live client update.
                // Its original snapshot command already supports this cursor.
                if (!/\bUnknown (?:API Testbench )?action:\s*changes\b/i.test(cause?.message ?? String(cause))) throw cause;
                supportsChanges = false;
              }
              if (closed) return;
              if (update?.changed === false) {
                cursorRef.current = update.cursor;
                setLoadError('');
                timer = setTimeout(poll, 600);
                return;
              }
            }
            const value = await callHost(sessionId, 'snapshot', { ...(selectedRunId ? { runId: selectedRunId } : {}), afterSeq: cursorRef.current }, controller.signal);
            if (closed) return;
            cursorRef.current = Number.isSafeInteger(value?.cursor) ? value.cursor : cursorRef.current;
            setSnapshot(value);
            setLoadError('');
            settled = value?.run?.status !== 'running' && !value?.run?.cases?.some((item) => item.attempts?.some((attempt) => attempt.status === 'running'));
            // With no pinned history/call, each snapshot resolves the newest run.
            // Keep the idle tab subscribed so a new Agent run appears here too.
            timer = setTimeout(poll, 600);
          } catch (cause) {
            if (!closed && !controller.signal.aborted) {
              setLoadError(cause?.message ?? String(cause));
              timer = setTimeout(poll, 1500);
            }
          }
        };
        poll();
        return () => { closed = true; clearTimeout(timer); controller.abort(); };
      }, [sessionId, selectedRunId, callId, retryingCaseId]);

      const run = snapshot?.run ?? null;
      const runActive = run?.status === 'running' || run?.cases?.some((item) => item.attempts?.some((a) => a.status === 'running'));
      const draftKey = JSON.stringify([sessionId, run?.id]);
      React.useEffect(() => {
        const kept = handoffDrafts.get(draftKey);
        if (run && !manualEditing.current) setManualOpen(false);
        setSummaryDirty(Boolean(kept?.dirty));
        setRetryDrafts({});
        setRetrySourceAttemptIds({});
        setRetryConfirmations({});
        setRetryStates({});
        retryRequestIds.current = {};
        setSummary(kept?.dirty ? kept.text : run ? summaryFromRun(run) : '');
        const last = run?.handoffs?.at(-1);
        setSendState(kept?.state ?? (last?.status === 'unknown' ? 'unknown' : ''));
        requestId.current = kept?.id ?? (last?.status === 'unknown' ? last.requestId : `api-testbench-${makeId()}`);
      }, [draftKey]);
      React.useEffect(() => {
        const cached = handoffDrafts.get(draftKey);
        if (run && !cached?.dirty) {
          const next = summaryFromRun(run);
          setSummary(next);
          if (cached && cached.text !== next) {
            handoffDrafts.delete(draftKey);
            requestId.current = `api-testbench-${makeId()}`;
            setSendState('');
          }
        }
      }, [run, draftKey]);

      const send = async (confirmUnknown = false) => {
        if (!run || !summary.trim()) return;
        const entry = { text: summary, dirty: summaryDirty, id: requestId.current, state: 'sending' };
        handoffDrafts.set(draftKey, entry);
        setSendState('sending');
        try {
          const result = await callHost(sessionId, 'sendToSession', { runId: run.id, requestId: entry.id, text: summary, ...(confirmUnknown ? { confirmUnknown: true } : {}) });
          if (result?.requestId && result.requestId !== entry.id && requestId.current === entry.id) {
            requestId.current = result.requestId;
            entry.id = result.requestId;
          }
          entry.state = result?.accepted ? 'sent' : result?.uncertain ? 'unknown' : result?.pending ? 'pending' : 'failed';
        } catch { entry.state = 'unknown'; }
        if (requestId.current === entry.id) setSendState(entry.state);
      };
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(summary);
          setCopyState('copied');
        } catch { setCopyState('failed'); }
      };
      const updateManualDraft = (patch) => {
        manualEditing.current = true;
        manualRequestId.current = '';
        setManualDraft((old) => ({ ...old, ...patch }));
        setManualError('');
        setManualStatus('');
      };
      const newManualRequest = () => {
        manualEditing.current = true;
        manualRequestId.current = '';
        setManualDraft(freshManualDraft(manualDraft.environmentId || 'direct'));
        setSelectedSavedCaseId('');
        setManualError('');
        setManualStatus('');
        setEnvironmentEditorOpen(false);
        setManualOpen(true);
      };
      const openSavedCase = () => {
        const item = savedCases.find((savedCase) => savedCase.id === selectedSavedCaseId);
        if (!item) return;
        manualEditing.current = true;
        const request = item.request ?? {};
        manualRequestId.current = '';
        setManualDraft({
          title: item.name,
          name: item.name,
          purpose: item.purpose ?? item.name,
          environmentId: item.environmentId ?? manualDraft.environmentId,
          savedCaseId: item.id,
          method: request.method ?? 'GET',
          url: request.url ?? '',
          queryText: JSON.stringify(request.query ?? [], null, 2),
          headersText: JSON.stringify(request.headers ?? [], null, 2),
          bodyText: JSON.stringify(request.body ?? { kind: 'none' }, null, 2),
          checksText: JSON.stringify(item.checks ?? [], null, 2),
        });
        setManualError('');
        setManualStatus('');
        setManualOpen(true);
      };
      const saveManualCase = async () => {
        setManualBusy(true);
        setManualError('');
        setManualStatus('');
        try {
          const parsed = parseManualDraft(manualDraft);
          const caseId = manualDraft.savedCaseId || `saved-case-${makeId()}`;
          if (!manualDraft.savedCaseId) setManualDraft((old) => ({ ...old, savedCaseId: caseId }));
          const result = await callHost(sessionId, 'saveCase', {
            id: caseId,
            name: manualDraft.name,
            purpose: manualDraft.purpose,
            environmentId: manualDraft.environmentId,
            request: parsed.request,
            checks: parsed.checks,
          });
          const saved = result?.case;
          if (!saved?.id) throw new Error('The Host did not confirm the saved case.');
          manualRequestId.current = '';
          setSavedCases((old) => [saved, ...old.filter((item) => item.id !== saved.id)]);
          setSelectedSavedCaseId(saved.id);
          setManualDraft((old) => ({ ...old, savedCaseId: saved.id }));
          setManualStatus('caseSaved');
        } catch (cause) { setManualError(cause?.message ?? String(cause)); }
        finally { setManualBusy(false); }
      };
      const updateEnvironmentDraft = (field, value) => {
        setEnvironmentDraft((old) => ({ ...old, [field]: value }));
        setEnvironmentStatus('');
        setManualError('');
      };
      const toggleEnvironmentEditor = () => {
        if (environmentEditorOpen) { setEnvironmentEditorOpen(false); return; }
        const environment = environments.find((item) => item.id === manualDraft.environmentId);
        if (environment) setEnvironmentDraft({
          id: environment.id,
          name: environment.name,
          baseUrl: environment.baseUrl ?? '',
          variablesText: JSON.stringify(environment.variables ?? {}, null, 2),
          credentialRefsText: JSON.stringify(environment.credentialRefs ?? {}, null, 2),
          sensitiveFieldsText: JSON.stringify(environment.sensitiveFields ?? [], null, 2),
        });
        setEnvironmentStatus('');
        setEnvironmentEditorOpen(true);
      };
      const newEnvironment = () => {
        setEnvironmentDraft({ id: '', name: 'New environment', baseUrl: '', variablesText: '{}', credentialRefsText: '{}', sensitiveFieldsText: '[]' });
        setEnvironmentStatus('');
        setManualError('');
        setEnvironmentEditorOpen(true);
      };
      const saveEnvironment = async () => {
        setManualBusy(true);
        setManualError('');
        setEnvironmentStatus('');
        try {
          const environmentId = environmentDraft.id || `environment-${makeId()}`;
          if (!environmentDraft.id) setEnvironmentDraft((old) => ({ ...old, id: environmentId }));
          let variables;
          let credentialRefs;
          let sensitiveFields;
          try { variables = JSON.parse(environmentDraft.variablesText || '{}'); } catch { throw new Error(t('invalidVariablesJson')); }
          try { credentialRefs = JSON.parse(environmentDraft.credentialRefsText || '{}'); } catch { throw new Error(t('invalidCredentialRefsJson')); }
          try { sensitiveFields = JSON.parse(environmentDraft.sensitiveFieldsText || '[]'); } catch { throw new Error(t('invalidSensitiveFieldsJson')); }
          const result = await callHost(sessionId, 'saveEnvironment', {
            id: environmentId,
            name: environmentDraft.name,
            baseUrl: environmentDraft.baseUrl,
            variables,
            credentialRefs,
            sensitiveFields,
          });
          const saved = result?.environment;
          if (!saved?.id) throw new Error('The Host did not confirm the environment.');
          manualRequestId.current = '';
          setEnvironments((old) => [saved, ...old.filter((item) => item.id !== saved.id)]);
          setEnvironmentDraft({
            id: saved.id,
            name: saved.name,
            baseUrl: saved.baseUrl ?? '',
            variablesText: JSON.stringify(saved.variables ?? {}, null, 2),
            credentialRefsText: JSON.stringify(saved.credentialRefs ?? {}, null, 2),
            sensitiveFieldsText: JSON.stringify(saved.sensitiveFields ?? [], null, 2),
          });
          setManualDraft((old) => ({ ...old, environmentId: saved.id }));
          setEnvironmentStatus('environmentSaved');
        } catch (cause) { setManualError(cause?.message ?? String(cause)); }
        finally { setManualBusy(false); }
      };
      const runManual = async () => {
        setManualBusy(true);
        setManualError('');
        setManualStatus('');
        try {
          const parsed = parseManualDraft(manualDraft);
          const actionId = manualRequestId.current || (manualRequestId.current = makeId());
          const result = await callHost(sessionId, 'runManual', {
            requestId: actionId,
            title: manualDraft.title,
            name: manualDraft.name,
            purpose: manualDraft.purpose,
            environmentId: manualDraft.environmentId,
            ...(manualDraft.savedCaseId ? { savedCaseId: manualDraft.savedCaseId } : {}),
            request: parsed.request,
            checks: parsed.checks,
          });
          if (!result?.runId) throw new Error('The Host did not confirm the manual API run.');
          manualRequestId.current = '';
          setManualStatus('manualStarted');
          manualEditing.current = false;
          setSelectedRunId(result.runId);
          setManualOpen(false);
        } catch (cause) { setManualError(cause?.message ?? String(cause)); }
        finally { setManualBusy(false); }
      };
      const cancelAttempt = async (attemptId) => {
        setCancellingAttemptId(attemptId);
        try {
          const result = await callHost(sessionId, 'cancelAttempt', { attemptId });
          if (!result?.cancelled && result?.reason !== 'not-running') setManualError(t('cancelFailed'));
        } catch { setManualError(t('cancelFailed')); }
        finally { setCancellingAttemptId((current) => current === attemptId ? '' : current); }
      };
      const retryCase = async (testCase, replaySource, unchanged = false) => {
        if (!run || runActive || !testCase.attempts?.length || retryingCaseId) return;
        const source = replaySource ?? testCase.attempts.at(-1);
        if (!source) return;
        const draft = (!unchanged && retryDrafts[source.id]) || JSON.stringify(source.request ?? testCase.request ?? {}, null, 2);
        let request;
        try { request = JSON.parse(draft); }
        catch {
          setRetryStates((old) => ({ ...old, [testCase.id]: { status: 'failed', message: t('invalidJson') } }));
          return;
        }
        const retryKey = JSON.stringify([source.id, draft]);
        const actionId = retryRequestIds.current[retryKey] ?? (retryRequestIds.current[retryKey] = makeId());
        const confirmation = retryConfirmations[testCase.id] ?? {};
        setRetryingCaseId(testCase.id);
        setRetryStates((old) => ({ ...old, [testCase.id]: { status: 'sending', message: '' } }));
        try {
          const result = await callHost(sessionId, 'retryAttempt', {
            runId: run.id,
            caseId: testCase.id,
            parentAttemptId: source.id,
            requestId: actionId,
            request,
            confirmEnvironmentChange: confirmation.confirmed === true,
            ...(confirmation.stamp ? { confirmedEnvironmentStamp: confirmation.stamp } : {}),
          });
          if (result?.confirmationRequired) {
            setRetryConfirmations((old) => ({ ...old, [testCase.id]: {
              confirmed: false,
              stamp: result.environmentStamp,
              environmentChanged: result.environmentChanged,
              credentialReferencesPresent: result.credentialReferencesPresent,
              previousEnvironment: result.previousEnvironment,
              currentEnvironment: result.currentEnvironment,
            } }));
            setRetryStates((old) => ({ ...old, [testCase.id]: { status: 'confirm-environment', message: result.message ?? '' } }));
            return;
          }
          if (!result?.attemptId || result.run?.id !== run.id) throw new Error('The Host did not confirm the retry attempt.');
          setRetryConfirmations((old) => { const next = { ...old }; delete next[testCase.id]; return next; });
          delete retryRequestIds.current[retryKey];
          setRetrySourceAttemptIds((old) => ({ ...old, [testCase.id]: result.attemptId }));
          setRetryStates((old) => ({ ...old, [testCase.id]: { status: 'started', message: '', attemptId: result.attemptId } }));
        } catch (cause) {
          setRetryStates((old) => ({ ...old, [testCase.id]: { status: 'failed', message: cause?.message ?? String(cause) } }));
        } finally {
          setRetryingCaseId((current) => current === testCase.id ? '' : current);
        }
      };

      const history = snapshot?.history ?? [];
      const cases = run?.cases ?? [];
      const originalState = item => item.attempts?.[0]?.status ?? item.status ?? 'pending';
      const needsAttention = state => ['failed', 'timed_out', 'send_failed', 'not_sent', 'interrupted', 'indeterminate', 'cancelled'].includes(state);
      const initialCases = cases.map(originalState);
      const active = cases.flatMap(item => item.attempts ?? []).filter(item => item.status === 'running').length;
      const selection = inspection.runId === run?.id ? inspection : {};
      const selected = cases.find(item => item.id === selection.caseId)
        ?? cases.find(item => item.attempts?.some(entry => entry.status === 'running'))
        ?? cases.find(item => originalState(item) === 'failed') ?? cases.find(item => needsAttention(originalState(item))) ?? cases[0];
      const attempts = selected?.attempts ?? [];
      const attempt = attempts.find(item => item.id === retrySourceAttemptIds[selected?.id])
        ?? attempts.find(item => item.status === 'running') ?? attempts[0];
      const parentAttempt = attempt?.parentAttemptId ? attempts.find(item => item.id === attempt.parentAttemptId) : null;
      const deltas = parentAttempt?.request && attempt?.request ? collectRequestChanges(parentAttempt.request, attempt.request).slice(0, 3) : [];
      const deltaValue = value => {
        const formatted = summaryValue(value);
        return formatted.length > 52 ? formatted.slice(0, 51) + '…' : formatted;
      };
      const attemptNumber = attempt ? attempts.indexOf(attempt) + 1 : 0;
      const tab = selected?.id === selection.caseId ? selection.tab || 'checks' : 'checks';
      const retryState = retryStates[selected?.id] ?? {};
      const confirmation = retryConfirmations[selected?.id] ?? {};
      const editing = !!attempt && selection.editAttemptId === attempt.id;
      const editorValue = retryDrafts[attempt?.id] ?? JSON.stringify(attempt?.request ?? selected?.request ?? {}, null, 2);
      const lastHandoff = run?.handoffs?.at(-1);
      const matchingHandoff = (run?.handoffs ?? []).find(item => item.requestId === handoffDrafts.get(draftKey)?.id);
      const delivery = matchingHandoff?.status ?? sendState;
      const unknownDelivery = delivery === 'unknown';
      const sendBusy = delivery === 'sending' || delivery === 'pending';
      const waitingForAttempt = retryState.status === 'started' && !attempts.some(item => item.id === retryState.attemptId);
      const blocked = runActive || Boolean(retryingCaseId) || waitingForAttempt || !attempt;
      const waitingConfirmation = retryState.status === 'confirm-environment';
      const environmentId = manualOpen ? manualDraft.environmentId : selected?.environmentId ?? cases[0]?.environmentId;
      const envName = environments.find(item => item.id === environmentId)?.name;
      const environment = environmentId === 'direct' && (!envName || envName === 'Direct input') ? ui('Direct input', '直接输入')
        : environmentId === 'local' && (!envName || envName === 'Local development') ? ui('Local development', '本地开发') : envName ?? environmentId ?? '';
      const changeView = patch => setInspection({ ...selection, runId: run?.id, caseId: selected?.id, ...patch });
      const chooseCase = item => setInspection({ runId: run.id, caseId: item.id, tab: 'checks' });
      const openBuilder = () => { manualEditing.current = true; setManualOpen(true); };
      const openRuns = () => { manualEditing.current = false; setManualOpen(false); };
      const selectAttempt = item => {
        setRetrySourceAttemptIds(old => ({ ...old, [selected.id]: item.id }));
        setRetryConfirmations(old => ({ ...old, [selected.id]: {} }));
        setRetryStates(old => ({ ...old, [selected.id]: {} }));
        changeView({ tab: 'checks', editAttemptId: null });
      };
      const replay = unchanged => {
        changeView({ retryMode: unchanged ? 'original' : 'edited' });
        return retryCase(selected, attempt, unchanged);
      };
      const tabList = [
        ['checks', ui('Checks', '断言')], ['request', ui('Request', '请求')],
        ['response', t('response')], ['attempts', ui('Attempts', '尝试') + ' ' + attempts.length],
      ];
      const caseIndex = cases.indexOf(selected);
      const panelId = 'tr-evidence-' + sessionId + '-' + run?.id + '-' + caseIndex;
      const switchTab = (event, index) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + 4) % 4;
        changeView({ tab: tabList[next][0] });
        event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
      };
      const requestKeyboard = (event, index) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? cases.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + cases.length) % cases.length;
        chooseCase(cases[next]);
        event.currentTarget.parentElement.querySelectorAll('[role="option"]')[next]?.focus();
      };
      const originalCounts = initialCases.reduce((counts, status) => {
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {});
      const metric = (label, count, state) => h('div', { className: 'tr-metric', 'data-status': state },
        h('strong', null, count), h('span', null, label));
      const meta = run ? [
        run.origin === 'agent' ? t('fromAgent') : t('manual'),
        Number.isSafeInteger(run.turn) && t('turn') + ' ' + run.turn,
        Number.isSafeInteger(run.step) && t('step') + ' ' + run.step,
      ].filter(Boolean).join(' · ') : '';
      return h('div', { className: 'atb-root tr-panel' },
        styles(),
        h('div', { className: 'tr-workbench' },
          h(WorkbenchHeader, { manualOpen, onNewRequest: openBuilder, onRuns: openRuns, environment: manualOpen ? '' : environment }),
          loadError ? h('p', { className: 'tr-alert', role: 'alert' }, t('detailUnavailable') + ' ' + loadError) : null,
          manualError && !manualOpen ? h('p', { className: 'tr-alert', role: 'alert' }, manualError) : null,
          manualOpen ? h(ManualWorkbench, {
            draft: manualDraft, setDraft: updateManualDraft, environments, savedCases,
            selectedCaseId: selectedSavedCaseId, setSelectedCaseId: setSelectedSavedCaseId,
            onOpenCase: openSavedCase, onNewRequest: newManualRequest, onSaveCase: saveManualCase, onRun: runManual,
            environmentEditorOpen, onToggleEnvironment: toggleEnvironmentEditor, onNewEnvironment: newEnvironment,
            environmentDraft, onEnvironmentChange: updateEnvironmentDraft, onSaveEnvironment: saveEnvironment,
            busy: manualBusy, status: manualStatus, error: manualError, environmentStatus,
          }) : !run ? h('div', { className: 'tr-empty' },
            h(Icon, { name: 'inbox', size: 26 }), h('p', null, t('noRun'))) :
          h('div', { className: 'tr-run', key: run.id },
            h('header', { className: 'tr-run-head' },
              h('div', { className: 'tr-run-meta' }, h('span', { className: 'tr-eyebrow' }, meta), resultState(run.status)),
              h('h2', { className: 'tr-run-title' }, run.title),
              h('div', { className: 'tr-summary-strip', 'aria-label': ui('Original run', '原始运行') },
                metric(ui('Requests', '请求'), cases.length, 'total'), metric(t('passed'), originalCounts.passed ?? 0, 'passed'),
                metric(t('failed'), originalCounts.failed ?? 0, 'failed'), metric(t('active'), active, 'running')),
              h('div', { className: 'tr-run-bar', 'aria-hidden': true }, Object.entries(originalCounts).map(([status, count]) =>
                h('span', { key: status, 'data-status': status, style: { flexGrow: count } }))),
            ),
            h('h3', { className: 'tr-list-label' }, h(Icon, { name: 'list', size: 13 }), ui('Requests', '请求清单')),
            h('div', { className: 'tr-request-list', role: 'listbox', 'aria-label': ui('Requests', '请求') },
              cases.map((item, index) => {
                const first = item.attempts?.[0];
                const request = first?.request ?? item.request;
                const state = originalState(item);
                return h('button', {
                  type: 'button', key: item.id, role: 'option', 'aria-selected': item === selected, tabIndex: item === selected ? 0 : -1,
                  className: 'tr-request-row', 'data-status': state, 'data-case-id': item.id,
                  onClick: () => chooseCase(item), onKeyDown: event => requestKeyboard(event, index),
                  title: [item.name, request?.url, t(statusKey(state))].filter(Boolean).join(' · '),
                }, h('span', { className: 'tr-method', 'data-method': request?.method }, request?.method ?? '—'),
                h('span', { className: 'tr-row-main' }, h('code', { className: 'tr-row-path' }, resultPath(request?.url)), h('small', { className: 'tr-row-name' }, item.name)),
                first?.response ? h('span', { className: 'tr-http' }, first.response.status) : null, resultState(state));
              })),
            selected ? h('section', { className: 'tr-detail', 'aria-label': ui('Request detail', '请求详情') },
              h('header', { className: 'tr-detail-head' },
                h('h3', null, selected.name),
                selected.purpose && selected.purpose !== selected.name ? h('p', null, selected.purpose) : null,
                h('div', { className: 'tr-detail-meta' },
                  h('span', null, t('attempt') + ' ' + (attemptNumber || '—') + ' / ' + attempts.length),
                  attempt ? h('span', null, attempt.origin === 'agent' ? t('fromAgent') : t('userAction')) : null,
                  attempt?.response ? h('code', null, 'HTTP ' + attempt.response.status) : null,
                  resultDuration(attempt) ? h('span', null, resultDuration(attempt)) : null, resultState(attempt?.status ?? selected.status))),
              h('div', { className: 'tr-tabs', role: 'tablist', 'aria-label': ui('Evidence', '执行证据') },
                tabList.map(([id, text], index) => h('button', { type: 'button', key: id, role: 'tab', className: 'tr-tab', 'data-tab': id,
                  id: panelId + '-' + id, 'aria-controls': panelId, 'aria-selected': tab === id, tabIndex: tab === id ? 0 : -1,
                  onClick: () => changeView({ tab: id }), onKeyDown: event => switchTab(event, index) }, text))),
              h('div', { className: 'tr-tab-body', role: 'tabpanel', id: panelId, 'aria-labelledby': panelId + '-' + tab, tabIndex: 0 },
                tab === 'attempts' ? (attempts.length ? attempts.map((item, index) => h('button', {
                  type: 'button', key: item.id, 'data-attempt-id': item.id, className: 'tr-attempt-row', 'data-status': item.status,
                  'aria-pressed': attempt?.id === item.id, onClick: () => selectAttempt(item),
                }, h('strong', null, t('attempt') + ' ' + (index + 1)), h('span', null, item.origin === 'agent' ? t('fromAgent') : t('userAction')),
                item.response ? h('code', null, 'HTTP ' + item.response.status) : null, resultState(item.status),
                h('span', null, resultDuration(item)))) : h('p', { className: 'tr-empty' }, ui('No attempt recorded.', '暂无尝试记录。')))
                  : h(AttemptView, { attempt, testCase: selected, tab })),
              deltas.length ? h('div', { className: 'tr-delta' },
                h('span', null, ui('Changes from attempt', '相比尝试') + ' ' + (attempts.indexOf(parentAttempt) + 1)),
                deltas.map(change => h('div', { key: change.path, className: 'tr-delta-field' },
                  h('code', { title: change.path }, change.path.replace(/^request\.(?:body\.value\.)?/, '')),
                  h('del', null, deltaValue(change.before)), h('span', { 'aria-hidden': true }, '→'), h('ins', null, deltaValue(change.after))))) : null,
              attempt?.error?.message && tab !== 'response' ? h('p', { className: 'tr-alert', role: 'status' }, attempt.error.message) : null,
              h('div', { className: 'tr-actions' },
                attempt && !editing ? resultButton(ui('Edit and retry', '修改后试一次'), 'edit', () => changeView({ editAttemptId: attempt.id }), { primary: true, disabled: blocked }) : null,
                attempt && !waitingConfirmation ? resultButton(t('replayOriginal'), 'repeat', () => replay(true), { disabled: blocked }) : null,
                attempts.at(-1)?.status === 'running' ? resultButton(t('cancelRequest'), 'x', () => cancelAttempt(attempts.at(-1).id), { disabled: !!cancellingAttemptId }) : null),
              editing ? h('div', { className: 'tr-editor' },
                h('label', null, t('requestJson'), h('textarea', { className: 'tr-code', value: editorValue, 'aria-label': t('requestJson'), autoFocus: true,
                  onChange: event => {
                    setRetryDrafts(old => ({ ...old, [attempt.id]: event.target.value }));
                    setRetryConfirmations(old => ({ ...old, [selected.id]: {} }));
                    setRetryStates(old => ({ ...old, [selected.id]: {} }));
                  }, disabled: blocked })),
                h('div', { className: 'tr-actions' },
                  !waitingConfirmation ? resultButton(t('retry'), 'send', () => replay(false), { primary: true, disabled: blocked }) : null,
                  resultButton(ui('Close editor', '收起编辑器'), 'x', () => changeView({ editAttemptId: null })))) : null,
              waitingConfirmation ? h('div', { className: 'tr-alert' },
                h('p', null, t('retryEnvironmentWarning')), resultMeta(t('recordedTarget'), confirmation.previousEnvironment?.baseUrl || '—'),
                resultMeta(t('currentTarget'), confirmation.currentEnvironment?.baseUrl || '—'),
                confirmation.credentialReferencesPresent ? h('p', null, t('credentialsResolveNow')) : null,
                h('label', null, h('input', { type: 'checkbox', checked: !!confirmation.confirmed,
                  onChange: e => setRetryConfirmations(old => ({ ...old, [selected.id]: { ...confirmation, confirmed: e.target.checked } })) }), t('confirmCurrentEnvironment')),
                resultButton(t('retryConfirmAndSend'), 'send', () => replay(selection.retryMode === 'original'), { primary: true, disabled: blocked || !confirmation.confirmed })) : null,
              retryState.status === 'failed' ? h('p', { className: 'tr-alert', role: 'alert' }, t('retryFailed') + ' ' + retryState.message) : null,
              retryState.status === 'sending' || waitingForAttempt ? h('p', { role: 'status' }, t('retrying')) : null,
              h('details', { className: 'tr-disclosure tr-identifiers' },
                h('summary', null, ui('Execution metadata', '执行元信息')),
                resultMeta(t('runLabel'), run.id), resultMeta(ui('Case', '用例'), selected.id),
                attempt ? resultMeta(t('attempt'), attempt.id) : null,
                attempt?.parentAttemptId ? resultMeta(t('parent'), attempt.parentAttemptId) : null,
                attempt?.startedAt ? resultMeta(ui('Started', '开始时间'), attempt.startedAt) : null))
              : null,
            h('details', { className: 'tr-disclosure tr-handoff' },
              h('summary', null, h(Icon, { name: 'handoff', size: 15 }), ui('Handoff to Agent', '交还给 Agent')),
              h('label', null, t('summaryLabel'), h('textarea', { id: 'atb-summary', className: 'tr-code', value: summary, disabled: sendBusy,
                onChange: e => {
                  const text = e.target.value;
                  requestId.current = 'api-testbench-' + makeId();
                  handoffDrafts.set(draftKey, { id: requestId.current, dirty: true, text, state: '' });
                  setSummary(text); setSummaryDirty(true); setSendState('');
                }, 'aria-label': t('summaryLabel') })),
              h('div', { className: 'tr-actions' },
                resultButton(sendBusy ? t('sending') : unknownDelivery ? t('confirmUnknown') : t('sendSummary'), 'send', () => send(unknownDelivery), {
                  primary: true, disabled: sendBusy || !summary.trim() || runActive || delivery === 'accepted' || delivery === 'sent',
                }), resultButton(t('copy'), 'copy', copy, { disabled: !summary })),
              unknownDelivery ? h('p', { className: 'tr-alert', role: 'alert' }, t('verifyDelivery')) : null,
              ['accepted', 'sent'].includes(delivery) ? h('p', { role: 'status' }, t('sent')) : null,
              ['rejected', 'failed'].includes(delivery) ? h('p', { className: 'tr-alert', role: 'alert' }, t('sendFailed')) : null,
              !sendState && lastHandoff ? h('p', { role: 'status' }, t('lastHandoff') + ' · ' + t('handoff_' + lastHandoff.status)) : null,
              copyState ? h('p', { role: 'status' }, t(copyState === 'copied' ? 'copied' : 'copyFailed')) : null),
            history.length ? h('details', { className: 'tr-disclosure tr-history' },
              h('summary', null, h(Icon, { name: 'history', size: 15 }), t('history'), h('span', null, history.length)),
              !callId && selectedRunId ? resultButton(t('followLatest'), 'activity', () => setSelectedRunId('')) : null,
              history.map(item => h('button', { key: item.id, type: 'button', className: 'tr-history-row', 'aria-current': run.id === item.id ? 'true' : undefined,
                onClick: () => { setSelectedRunId(item.id); setSendState(''); } }, item.title, resultState(item.status)))) : null,
          ),
        ),
      );
    }

    function makeId() {
      try { return globalThis.crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
    }

    return {
      inject: ['remote', 'slots', 'locale', 'sidebarRight', 'sidebarRightTabs'],
      apply(ctx) {
        runtimeCtx = ctx;
        translate = ctx.locale.bind('apiTestbench');
        return ctx.effect(async () => {
          const disposers = [];
          try {
            const unmount = await ctx.remote.$mount(TYPERT_REMOTE);
            if (typeof unmount === 'function') disposers.push(unmount);
            // Gateway mounts a Cordis namespace service. Only the injected
            // child context can access it (as in rc.1's action-cards client).
            const rpc = ctx.inject(['remote.apiTestbench'], (inner) => {
              performHostAction = (request, signal) => inner.remote.apiTestbench.perform(request, signal);
            });
            disposers.push(() => { performHostAction = undefined; return rpc.dispose(); });
            await rpc;
            remoteMountError = '';
          } catch (cause) {
            remoteMountError = cause?.message ?? String(cause);
          }
          for (const [locale, dictionary] of Object.entries(dictionaries)) disposers.push(ctx.locale.register('apiTestbench', locale, dictionary));
          disposers.push(ctx.sidebarRightTabs.register({
            id: PACKAGE,
            kind: KIND,
            title: () => t('panelTitle'),
            guide: [{ id: 'open', order: 50, title: () => t('panelTitle'), description: () => t('guideDescription') }],
            keepMounted: true,
          }));
          const bodyInjection = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: PACKAGE }, TestbenchPanel));
          if (typeof bodyInjection === 'function') disposers.push(bodyInjection);
          const toolInjection = ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'api_test_run' }, TestbenchCallRow));
          if (typeof toolInjection === 'function') disposers.push(toolInjection);
          return async () => { for (const dispose of disposers.reverse()) await dispose?.(); };
        });
      },
    };
  },
});
