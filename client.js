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
      .atb-root{box-sizing:border-box;color:var(--dsw-alias-label-primary);font:inherit}
      .atb-button{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:7px 10px;font:inherit;cursor:pointer}
      .atb-button:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
      .atb-button:disabled{opacity:.55;cursor:not-allowed}
      .atb-button:focus-visible,.atb-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .atb-row{display:flex;align-items:center;gap:9px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px;margin:6px 0}
      .atb-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:none}
      .atb-dot.running{background:var(--dsw-alias-state-warn-primary)}
      .atb-dot.passed{background:var(--dsw-alias-state-success-primary)}
      .atb-dot.failed{background:var(--dsw-alias-state-error-primary)}
      .atb-muted{color:var(--dsw-alias-label-secondary);font-size:12px}
      .atb-panel{box-sizing:border-box;min-height:100%;padding:14px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
      .atb-section{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:12px;margin:10px 0}
      .atb-case{border-top:1px solid var(--dsw-alias-border-l1);padding:12px 0}
      .atb-check{display:flex;flex-wrap:wrap;gap:6px 10px;padding:5px 0;font-size:13px}
      .atb-body{max-height:280px;overflow:auto;white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--dsw-alias-bg-base);border-radius:7px;padding:9px}
      .atb-input{box-sizing:border-box;width:100%;min-height:110px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:9px;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical}
      .atb-line{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .atb-history{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .atb-error{color:var(--dsw-alias-state-error-primary)}
      @media (max-width:480px){.atb-panel{padding:10px}.atb-line{align-items:flex-start;flex-direction:column}}
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
    const styles = () => h('style', { key: 'api-testbench-css' }, CSS);
    const buttonStyle = { border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', padding: '7px 10px', font: 'inherit', cursor: 'pointer' };

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

    function statusColor(status) {
      if (status === 'passed') return 'var(--dsw-alias-state-success-primary)';
      if (status === 'failed' || status === 'send_failed' || status === 'timed_out' || status === 'not_sent') return 'var(--dsw-alias-state-error-primary)';
      if (status === 'running' || status === 'pending' || status === 'indeterminate') return 'var(--dsw-alias-state-warn-primary)';
      return 'var(--dsw-alias-state-idle-primary)';
    }

    function checkExpectation(check) {
      if (check.kind === 'status_equals') return `HTTP ${check.expected}`;
      if (check.kind === 'json_exists') return `${check.path} exists`;
      return `${check.path} = ${safeString(check.expected)}`;
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
      return h('div', { className: 'atb-root' },
        styles(),
        h('div', { className: 'atb-row' },
          h('span', { className: `atb-dot ${statusClass}`, 'aria-hidden': true }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 600 } }, `${t('panelTitle')} · ${t(status)}`),
            h('div', { className: 'atb-muted' }, (toolFailed && props.block?.error?.message) || error || (run ? `${run.title}${activeCase ? ` · ${activeCase.name}` : ''}` : t('openRun'))),
            run && !error && outcomes ? h('div', { className: 'atb-muted' }, outcomes) : null,
          ),
          h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: open, 'aria-label': t('openRun') }, t('openRun')),
        ),
      );
    }

    function CheckList({ checks, onReview }) {
      if (!checks?.length) return h('div', { className: 'atb-muted' }, t('noChecks'));
      return h('div', null, checks.map((check, index) => {
        const state = check.state ?? 'indeterminate';
        const stateColorValue = state === 'passed' ? 'var(--dsw-alias-state-success-primary)' : state === 'failed' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-warn-primary)';
        const basisLabel = t(`basis_${check.basis ?? 'agent'}`);
        return h('div', { className: 'atb-check', key: `${check.kind}:${index}` },
          h('strong', { style: { minWidth: 64, color: stateColorValue } }, t(state === 'passed' ? 'checkPassed' : state === 'failed' ? 'checkFailed' : 'checkUnknown')),
          h('span', null, `${t(check.kind)}${check.path ? ` ${check.path}` : ''}`),
          Object.hasOwn(check, 'expected') ? h('span', { className: 'atb-muted' }, `${t('expected')}: ${safeString(check.expected)}`) : null,
          check.actualMissing ? h('span', { className: 'atb-muted' }, `${t('actual')}: ${t('missing')}`) : Object.hasOwn(check, 'actual') ? h('span', { className: 'atb-muted' }, `${t('actual')}: ${safeString(check.actual)}`) : null,
          h('span', { className: 'atb-muted' }, basisLabel),
          check.basisDetail ? h('span', { className: 'atb-muted' }, check.basisDetail) : null,
          check.reason ? h('span', { className: 'atb-muted' }, check.reason) : null,
          state === 'failed' && onReview ? h('button', { type: 'button', className: 'atb-button', onClick: onReview }, t('requestJson')) : null,
        );
      }));
    }

    function AttemptView({ attempt, onReview }) {
      const response = attempt.response;
      const elapsed = attempt.durationMs ?? (attempt.status === 'running' && attempt.startedAt ? Math.max(0, Date.now() - Date.parse(attempt.startedAt)) : null);
      return h('div', { className: 'atb-section', style: { marginLeft: 10 } },
        h('div', { className: 'atb-line' },
          h('strong', null, `${t('attempt')} ${attempt.id} · ${attempt.origin === 'agent' ? t('fromAgent') : t('userAction')}`),
          h('span', { style: { color: statusColor(attempt.status), fontWeight: 600 } }, t(statusKey(attempt.status))),
        ),
        attempt.parentAttemptId ? h('div', { className: 'atb-muted' }, `${t('parent')}: ${attempt.parentAttemptId}`) : null,
        attempt.request ? h('div', { className: 'atb-muted', style: { marginTop: 5, wordBreak: 'break-all' } }, `${attempt.request.method} ${attempt.request.url}`) : null,
        Number.isFinite(elapsed) ? h('div', { className: 'atb-muted' }, `${t('elapsed')}: ${elapsed} ms`) : null,
        attempt.request ? h('details', null, h('summary', null, t('requestDetails')), h('pre', { className: 'atb-body' }, JSON.stringify(attempt.request, null, 2))) : null,
        response ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'atb-muted' }, `${t('response')}: ${t('http')} ${response.status} ${response.statusText ?? ''}`),
          h(CheckList, { checks: attempt.checks, onReview }),
          h('details', { style: { marginTop: 7 } },
            h('summary', { style: { cursor: 'pointer', color: 'var(--dsw-alias-label-secondary)' } }, t('openDetails')),
            h('div', { className: 'atb-muted' }, t('requestHeaders')),
            h('pre', { className: 'atb-body' }, (response.headers ?? []).map(({ name, value }) => `${name}: ${value}`).join('\n') || '—'),
            h('div', { className: 'atb-muted', style: { margin: '8px 0 4px' } }, t('bodyPreview')),
            h('pre', { className: 'atb-body' }, response.bodyPreview || t('noBody')),
            response.bodyTruncated ? h('div', { className: 'atb-muted' }, t('bodyTruncated')) : null,
          ),
        ) : h('div', { className: 'atb-muted', style: { marginTop: 7 } }, attempt.error?.message ?? (attempt.status === 'running' ? t('waiting') : t('noBody'))),
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

    function ManualWorkbench(props) {
      const { draft, setDraft, environments, savedCases, selectedCaseId, setSelectedCaseId, onOpenCase, onNewRequest, onSaveCase, onRun,
        environmentEditorOpen, onToggleEnvironment, onNewEnvironment, environmentDraft, onEnvironmentChange, onSaveEnvironment,
        busy, status, error, environmentStatus } = props;
      const fieldStyle = { boxSizing: 'border-box', width: '100%', minWidth: 0, border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 8, background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', padding: '8px 9px', font: 'inherit' };
      const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 5 };
      const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 10, marginTop: 9 };
      const button = (label, onClick, disabled = false) => h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick, disabled }, label);
      const bodyDisabled = draft.method === 'GET' || draft.method === 'HEAD';
      return h('section', { className: 'atb-section', 'aria-label': t('manualWorkbench') },
        h('div', { className: 'atb-line' }, h('strong', null, t('manualWorkbench')), h('span', { className: 'atb-muted' }, t('manualNoSend'))),
        h('div', { style: gridStyle },
          h('label', { style: labelStyle }, t('environment'),
            h('select', { value: draft.environmentId, onChange: (event) => setDraft({ environmentId: event.target.value }), style: fieldStyle, 'aria-label': t('environment') },
              environments.map((environment) => h('option', { key: environment.id, value: environment.id }, `${environment.name} · ${environment.id}`)),
            ),
          ),
          h('div', null,
            h('div', { style: labelStyle }, t('savedCase')),
            h('div', { style: { display: 'flex', gap: 7 } },
              h('select', { value: selectedCaseId, onChange: (event) => setSelectedCaseId(event.target.value), style: { ...fieldStyle, flex: 1 }, 'aria-label': t('savedCase') },
                h('option', { value: '' }, t('selectSavedCase')),
                savedCases.map((item) => h('option', { key: item.id, value: item.id }, `${item.name} · ${item.request?.method ?? 'GET'} ${item.request?.url ?? ''}`)),
              ),
              button(t('openCase'), onOpenCase, !selectedCaseId),
            ),
          ),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 } },
          button(t('newRequest'), onNewRequest),
          button(environmentEditorOpen ? t('closeEnvironmentEditor') : t('editEnvironment'), onToggleEnvironment),
          button(t('newEnvironment'), onNewEnvironment),
        ),
        environmentEditorOpen ? h('div', { className: 'atb-section', style: { margin: '12px 0 0' } },
          h('strong', null, t('environmentSettings')),
          h('div', { style: gridStyle },
            h('label', { style: labelStyle }, t('environmentName'), h('input', { value: environmentDraft.name, onChange: (event) => onEnvironmentChange('name', event.target.value), style: fieldStyle, 'aria-label': t('environmentName') })),
            h('label', { style: labelStyle }, t('baseUrl'), h('input', { value: environmentDraft.baseUrl, onChange: (event) => onEnvironmentChange('baseUrl', event.target.value), style: fieldStyle, placeholder: 'https://api.example.test', 'aria-label': t('baseUrl') })),
          ),
          h('div', { style: gridStyle },
            h('label', { style: labelStyle }, t('variablesJson'), h('textarea', { className: 'atb-input', style: { minHeight: 78 }, value: environmentDraft.variablesText, onChange: (event) => onEnvironmentChange('variablesText', event.target.value), 'aria-label': t('variablesJson') })),
            h('label', { style: labelStyle }, t('credentialRefsJson'), h('textarea', { className: 'atb-input', style: { minHeight: 78 }, value: environmentDraft.credentialRefsText, onChange: (event) => onEnvironmentChange('credentialRefsText', event.target.value), 'aria-label': t('credentialRefsJson') })),
          ),
          h('label', { style: { ...labelStyle, marginTop: 9 } }, t('sensitiveFieldsJson'), h('textarea', { className: 'atb-input', style: { minHeight: 56 }, value: environmentDraft.sensitiveFieldsText, onChange: (event) => onEnvironmentChange('sensitiveFieldsText', event.target.value), 'aria-label': t('sensitiveFieldsJson') })),
          h('div', { className: 'atb-muted', style: { marginTop: 6 } }, t('credentialHint')),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginTop: 8 } }, button(t('saveEnvironment'), onSaveEnvironment, busy), environmentStatus ? h('span', { className: 'atb-muted', role: 'status' }, t(environmentStatus)) : null),
        ) : null,
        h('div', { style: gridStyle },
          h('label', { style: labelStyle }, t('runTitle'), h('input', { value: draft.title, onChange: (event) => setDraft({ title: event.target.value }), style: fieldStyle, 'aria-label': t('runTitle') })),
          h('label', { style: labelStyle }, t('caseName'), h('input', { value: draft.name, onChange: (event) => setDraft({ name: event.target.value }), style: fieldStyle, 'aria-label': t('caseName') })),
        ),
        h('label', { style: { ...labelStyle, marginTop: 9 } }, t('purpose'), h('input', { value: draft.purpose, onChange: (event) => setDraft({ purpose: event.target.value }), style: fieldStyle, 'aria-label': t('purpose') })),
        h('div', { style: gridStyle },
          h('label', { style: labelStyle }, t('method'), h('select', { value: draft.method, onChange: (event) => setDraft({ method: event.target.value }), style: fieldStyle, 'aria-label': t('method') }, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => h('option', { key: method, value: method }, method)))),
          h('label', { style: labelStyle }, t('requestUrl'), h('input', { value: draft.url, onChange: (event) => setDraft({ url: event.target.value }), style: fieldStyle, placeholder: '/v1/quote or https://api.example.test/v1/quote', 'aria-label': t('requestUrl') })),
        ),
        h('div', { style: gridStyle },
          h('label', { style: labelStyle }, t('queryJson'), h('textarea', { className: 'atb-input', value: draft.queryText, onChange: (event) => setDraft({ queryText: event.target.value }), 'aria-label': t('queryJson') })),
          h('label', { style: labelStyle }, t('headersJson'), h('textarea', { className: 'atb-input', value: draft.headersText, onChange: (event) => setDraft({ headersText: event.target.value }), 'aria-label': t('headersJson') })),
        ),
        h('div', { style: gridStyle },
          bodyDisabled
            ? h('div', { className: 'atb-muted', role: 'status', style: { padding: '8px 0' } }, t('bodyDisabledForMethod'))
            : h('label', { style: labelStyle }, t('bodyJson'), h('textarea', { className: 'atb-input', value: draft.bodyText, onChange: (event) => setDraft({ bodyText: event.target.value }), 'aria-label': t('bodyJson') })),
          h('label', { style: labelStyle }, t('checksJson'), h('textarea', { className: 'atb-input', value: draft.checksText, onChange: (event) => setDraft({ checksText: event.target.value }), 'aria-label': t('checksJson') })),
        ),
        h('div', { className: 'atb-muted', style: { marginTop: 6 } }, t('manualJsonHint')),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 9 } },
          button(t('saveCase'), onSaveCase, busy || !draft.environmentId),
          button(busy ? t('sending') : t('runRequest'), onRun, busy || !draft.environmentId || !draft.url.trim()),
          status ? h('span', { className: 'atb-muted', role: 'status' }, t(status)) : null,
        ),
        error ? h('div', { className: 'atb-error', role: 'alert', style: { marginTop: 8 } }, error) : null,
      );
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
      const params = props.params;
      const sessionId = props.sessionId;
      const callId = typeof params.callId === 'string' ? params.callId : '';
      const initialRunId = typeof params.runId === 'string' ? params.runId : '';
      const [selectedRunId, setSelectedRunId] = React.useState(initialRunId);
      const [snapshot, setSnapshot] = React.useState(null);
      const [manualOpen, setManualOpen] = React.useState(() => !callId && !initialRunId);
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
      const retryEditors = React.useRef(new Map());
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
      const initialCases = (run?.cases ?? []).map((item) => item.attempts?.[0]?.status ?? item.status);
      const activeAttempts = (run?.cases ?? []).flatMap((item) => item.attempts ?? []).filter((item) => item.status === 'running').length;
      const lastHandoff = run?.handoffs?.at(-1);
      const savedHandoff = handoffDrafts.get(draftKey);
      const matchingHandoff = (run?.handoffs ?? []).find((entry) => entry.requestId === savedHandoff?.id);
      const delivery = matchingHandoff?.status ?? sendState;
      const unknownDelivery = delivery === 'unknown';
      const sendBusy = delivery === 'sending' || delivery === 'pending';
      return h('div', { className: 'atb-root atb-panel' },
        styles(),
        h('div', { className: 'atb-line' },
          h('div', null,
            h('h2', { style: { margin: '0 0 4px', fontSize: 17 } }, t('panelTitle')),
            h('div', { className: 'atb-muted' }, run ? `${t('source')}: ${run.origin === 'agent' ? t('fromAgent') : t('manual')} · ${t('environment')}: ${run.cases?.[0]?.environmentId ?? '—'}` : t('guideDescription')),
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            run ? h('span', { className: 'atb-muted' }, `${t('caseCount')}: ${initialCases.length} · ${t('passed')} ${initialCases.filter((status) => status === 'passed').length} · ${t('failed')} ${initialCases.filter((status) => status === 'failed').length} · ${t('active')} ${activeAttempts}`) : null,
            h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: newManualRequest }, t('newRequest')),
          ),
        ),
        loadError ? h('div', { className: 'atb-section atb-error', role: 'alert' }, `${t('detailUnavailable')} ${loadError}`) : null,
        manualOpen ? h(ManualWorkbench, {
          draft: manualDraft,
          setDraft: updateManualDraft,
          environments,
          savedCases,
          selectedCaseId: selectedSavedCaseId,
          setSelectedCaseId: setSelectedSavedCaseId,
          onOpenCase: openSavedCase,
          onNewRequest: newManualRequest,
          onSaveCase: saveManualCase,
          onRun: runManual,
          environmentEditorOpen,
          onToggleEnvironment: toggleEnvironmentEditor,
          onNewEnvironment: newEnvironment,
          environmentDraft,
          onEnvironmentChange: updateEnvironmentDraft,
          onSaveEnvironment: saveEnvironment,
          busy: manualBusy,
          status: manualStatus,
          error: manualError,
          environmentStatus,
        }) : null,
        !run ? (manualOpen || loadError ? null : h('div', { className: 'atb-section' },
          t('noRun'),
        )) : h(React.Fragment, null,
          h('section', { className: 'atb-section' },
            h('div', { className: 'atb-line' },
              h('strong', null, run.title),
              h('span', { style: { color: statusColor(run.status), fontWeight: 600 } }, t(statusKey(run.status))),
            ),
            h('div', { className: 'atb-muted', style: { marginTop: 5 } }, `${run.id}${Number.isSafeInteger(run.turn) ? ` · ${t('turn')} ${run.turn}` : ''}${Number.isSafeInteger(run.step) ? ` · ${t('step')} ${run.step}` : ''}`),
          ),
          (run.cases ?? []).map((testCase) => {
            const attempts = testCase.attempts ?? [];
            const latest = attempts.at(-1);
            const initial = attempts[0];
            const state = initial?.status ?? testCase.status ?? 'pending';
            const expectations = (testCase.checks ?? []).map(checkExpectation).join(' · ');
            const retryState = retryStates[testCase.id] ?? {};
            const retryConfirmation = retryConfirmations[testCase.id] ?? {};
            const sourceAttemptId = retrySourceAttemptIds[testCase.id] ?? attempts.at(-1)?.id ?? '';
            const sourceAttempt = attempts.find((item) => item.id === sourceAttemptId) ?? attempts.at(-1);
            const draft = retryDrafts[sourceAttempt?.id] ?? JSON.stringify(sourceAttempt?.request ?? testCase.request ?? {}, null, 2);
            const retryAttemptVisible = attempts.length > 0;
            const persistedRetry = retryState.attemptId && attempts.some((attempt) => attempt.id === retryState.attemptId);
            const retryDisabled = runActive || Boolean(retryingCaseId) || !retryAttemptVisible || (retryState.status === 'started' && !persistedRetry) || (retryState.status === 'confirm-environment' && !retryConfirmation.confirmed);
            return h('section', { className: 'atb-case', key: testCase.id },
              h('div', { className: 'atb-line' },
                h('strong', null, testCase.purpose || testCase.name),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { color: statusColor(state), fontWeight: 600 } }, `${t('original')}: ${t(statusKey(state))}`),
                  attempts.length > 1 ? h('span', { style: { color: statusColor(latest.status) } }, `${t('retryResult')}: ${t(statusKey(latest.status))}`) : null,
                  latest?.status === 'running' ? h('button', {
                    type: 'button', className: 'atb-button', style: buttonStyle, disabled: Boolean(cancellingAttemptId),
                    onClick: () => cancelAttempt(latest.id),
                  }, cancellingAttemptId === latest.id ? t('cancelling') : t('cancelRequest')) : null,
                ),
              ),
              h('div', { className: 'atb-muted', style: { marginTop: 4 } }, `${t('expected')}: ${expectations || t('noChecks')}`),
              h('div', { className: 'atb-muted', style: { marginTop: 3 } }, `${testCase.request?.method ?? ''} ${testCase.request?.url ?? ''}`),
              attempts.map((attempt) => h(AttemptView, { key: attempt.id, attempt, onReview: () => {
                setRetrySourceAttemptIds((old) => ({ ...old, [testCase.id]: attempt.id }));
                setRetryConfirmations((old) => ({ ...old, [testCase.id]: {} }));
                setRetryStates((old) => ({ ...old, [testCase.id]: {} }));
                retryEditors.current.get(testCase.id)?.focus();
              } })),
              retryAttemptVisible ? h('div', { className: 'atb-section' },
                h('strong', null, t('retryTitle')),
                h('div', { className: 'atb-muted', style: { marginTop: 5, marginBottom: 8 } }, t('retryHint')),
                h('label', { style: { display: 'block', fontWeight: 600, marginBottom: 6 } }, t('retrySource')),
                h('select', {
                  value: sourceAttempt?.id ?? '',
                  disabled: run.status === 'running' || Boolean(retryingCaseId),
                  onChange: (event) => {
                    const selected = attempts.find((item) => item.id === event.target.value);
                    setRetrySourceAttemptIds((old) => ({ ...old, [testCase.id]: event.target.value }));
                    setRetryConfirmations((old) => { const next = { ...old }; delete next[testCase.id]; return next; });
                    setRetryStates((old) => { const next = { ...old }; delete next[testCase.id]; return next; });
                    if (!selected) return;
                  },
                  style: { boxSizing: 'border-box', width: '100%', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 8, background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', padding: '8px 9px', marginBottom: 8 },
                  'aria-label': t('retrySource'),
                }, attempts.map((attempt, index) => h('option', { key: attempt.id, value: attempt.id }, `${t('attempt')} ${index + 1} · ${t(statusKey(attempt.status))}`))),
                h('label', { style: { display: 'block', fontWeight: 600, marginBottom: 6 } }, t('requestJson')),
                h('textarea', {
                  className: 'atb-input',
                  ref: (node) => { if (node) retryEditors.current.set(testCase.id, node); else retryEditors.current.delete(testCase.id); },
                  value: draft,
                  disabled: run.status === 'running' || Boolean(retryingCaseId),
                  onChange: (event) => {
                    setRetryDrafts((old) => ({ ...old, [sourceAttempt.id]: event.target.value }));
                    setRetryConfirmations((old) => { const next = { ...old }; delete next[testCase.id]; return next; });
                    setRetryStates((old) => { const next = { ...old }; delete next[testCase.id]; return next; });
                  },
                  'aria-label': t('requestJson'),
                }),
                retryState.status === 'confirm-environment' ? h('div', { className: 'atb-section', style: { marginTop: 8 } },
                  h('div', { className: 'atb-muted atb-error', role: 'alert' },
                    `${t('retryEnvironmentWarning')} ${t('recordedTarget')}: ${retryConfirmation.previousEnvironment?.baseUrl || '—'} → ${t('currentTarget')}: ${retryConfirmation.currentEnvironment?.baseUrl || '—'}${retryConfirmation.credentialReferencesPresent ? ` · ${t('credentialsResolveNow')}` : ''}`,
                  ),
                  h('label', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 } },
                    h('input', {
                      type: 'checkbox',
                      checked: retryConfirmation.confirmed === true,
                      onChange: (event) => setRetryConfirmations((old) => ({ ...old, [testCase.id]: { ...old[testCase.id], confirmed: event.target.checked } })),
                      'aria-label': t('confirmCurrentEnvironment'),
                    }),
                    h('span', null, t('confirmCurrentEnvironment')),
                  ),
                ) : null,
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 } },
                  h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: () => retryCase(testCase, sourceAttempt, true), disabled: retryDisabled }, t('replayOriginal')),
                  h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: () => retryCase(testCase, sourceAttempt), disabled: retryDisabled }, retryingCaseId === testCase.id ? t('retrying') : (retryState.status === 'confirm-environment' && retryConfirmation.confirmed ? t('retryConfirmAndSend') : t('retry'))),
                ),
                retryState.status === 'started' ? h('div', { className: 'atb-muted', role: 'status', style: { marginTop: 7 } }, `${t('retryStarted')} ${retryState.attemptId}`) : null,
                retryState.status === 'failed' ? h('div', { className: 'atb-muted atb-error', role: 'alert', style: { marginTop: 7 } }, `${t('retryFailed')} ${retryState.message}`) : null,
              ) : null,
            );
          }),
          h('section', { className: 'atb-section' },
            h('label', { htmlFor: 'atb-summary', style: { display: 'block', fontWeight: 600, marginBottom: 7 } }, t('summaryLabel')),
            h('textarea', { id: 'atb-summary', className: 'atb-input', value: summary, disabled: sendBusy, onChange: (event) => {
              const text = event.target.value;
              requestId.current = `api-testbench-${makeId()}`;
              handoffDrafts.set(draftKey, { id: requestId.current, dirty: true, text, state: '' });
              setSummary(text); setSummaryDirty(true); setSendState('');
            }, 'aria-label': t('summaryLabel') }),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 } },
              h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: () => send(unknownDelivery), disabled: sendBusy || !summary.trim() || runActive || delivery === 'accepted' || delivery === 'sent' }, sendBusy ? t('sending') : unknownDelivery ? t('confirmUnknown') : t('sendSummary')),
              h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: copy, disabled: !summary }, t('copy')),
            ),
            unknownDelivery ? h('div', { className: 'atb-error', role: 'alert' }, t('verifyDelivery')) : null,
            delivery === 'accepted' || delivery === 'sent' ? h('div', { className: 'atb-muted', role: 'status', style: { marginTop: 7 } }, t('sent')) : null,
            delivery === 'rejected' || delivery === 'failed' ? h('div', { className: 'atb-muted atb-error', role: 'alert', style: { marginTop: 7 } }, t('sendFailed')) : null,
            !sendState && lastHandoff ? h('div', { className: 'atb-muted', role: lastHandoff.status === 'accepted' ? 'status' : 'alert', style: { marginTop: 7 } }, `${t('lastHandoff')}: ${t(`handoff_${lastHandoff.status}`)} · ${lastHandoff.requestId}`) : null,
            copyState === 'copied' ? h('div', { className: 'atb-muted', role: 'status', style: { marginTop: 7 } }, t('copied')) : null,
            copyState === 'failed' ? h('div', { className: 'atb-muted atb-error', role: 'alert', style: { marginTop: 7 } }, t('copyFailed')) : null,
          ),
        ),
        history.length > 1 ? h('div', { className: 'atb-section' },
          h('strong', null, t('history')),
          !callId && selectedRunId ? h('button', { type: 'button', className: 'atb-button', style: buttonStyle, onClick: () => setSelectedRunId('') }, t('followLatest')) : null,
          h('div', { className: 'atb-history' }, history.map((item) => h('button', {
            key: item.id,
            type: 'button',
            className: 'atb-button',
            style: { ...buttonStyle, ...(item.id === run?.id ? { borderColor: 'var(--dsw-alias-brand-primary)' } : {}) },
            onClick: () => { setSelectedRunId(item.id); setSendState(''); },
          }, item.title))),
        ) : null,
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
