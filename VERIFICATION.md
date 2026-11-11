# TestRelay

## Version 0.2.0 — workbench redesign

The redesigned workbench was exercised in Edge against an isolated local DSH Web profile and a loopback coupon service, using the DSH `0.2.2-rc.1` runtime on Windows. The [screenshots](docs/ui) show the actual DSH sidebar. At 549 px and 364 px the panel fit without horizontal scrolling in both Chinese/light and English/dark configurations.

Two requests dispatched through the Agent tool returned HTTP 200. The panel selected the failed coupon and displayed the expected discount (0) alongside the observed value (10). After editing the coupon to `EXPIRED_B` and sending a retry, the original failure remained in the attempt history; the edited comparison appeared in the originating chat. The standalone editor was also used to send a JSON body and a numeric assertion to the fixture. This pass exercised the registered tool and renderer directly. The fresh-chat model routing check below was performed on 0.1.2.

## Earlier end-to-end acceptance (0.1.2)

Version 0.1.2 was verified on November 11, 2026, with DeepSeek Harness (DSH) Desktop `0.2.2-rc.1` on Windows and its bundled Node.js `24.21.0` runtime.

## Desktop chat

After restarting Desktop, the operator reopened an existing run and started a fresh standard chat. An ordinary-language request to test two coupons led the model to select `api_test_run`. The local HTTP fixture received one request per coupon. The model reported the following results.

| Coupon | HTTP status | Expected discount | Returned discount | Assertion |
|---|---:|---:|---:|---|
| `VALID10` | 200 | 10 | 10 | Passed |
| `EXPIRED_A` | 200 | 0 | 10 | Failed |

## Browser workbench

A separate DSH Web profile and fixture exercised the manual workflow in Edge. The operator saved and reopened the coupon case, then issued four requests. The fixture counted three requests for `EXPIRED_A` and one for `EXPIRED_B`.

| Action | Observed in the workbench |
|---|---|
| Send `EXPIRED_A` | The panel showed a waiting state before HTTP 200 arrived. The discount assertion showed expected 0, actual 10. |
| Change the coupon to `EXPIRED_B` and retry | The new attempt passed with discount 0. The original failed attempt remained visible. |
| Replay the original A and cancel | The panel showed cancellation after the fixture received the request. |
| Replay the original A once more | The assertion failed again with actual discount 10. |

The operator edited the comparison and sent it back. The originating chat displayed both attempt IDs, both discount values and the coupon change. The isolated profile had no model credential, so verification on that profile ended at message delivery. A new session in the same workspace could reopen the saved case and had an empty run history. A separate check displayed numeric `0` and string `"0"` distinctly.

A clean Web profile also installed the release bundle, opened TestRelay from the sidebar guide and sent `GET /health`. The workbench displayed HTTP 200 and the fixture's JSON response with `ok: true`.

## Automated checks

All 22 tests passed on the bundled Windows runtime for 0.2.0, with none skipped.

| Suite | Tests | Coverage |
|---|---:|---|
| [Client](tests/client.test.mjs) | 6 | Tool cards, sidebar updates, failure selection and attempt history, explicit manual dispatch with typed inputs, session-bound drafts and delivery confirmation |
| [Executor integration](tests/executor.integration.test.mjs) | 3 | Loopback HTTP, typed assertions, credentials, timeouts, cancellation and recovery |
| [Replay and evidence](tests/replay-evidence.test.mjs) | 7 | Request templates, redaction, original results and delivery to the originating session |
| [Store concurrency](tests/store.concurrency.test.mjs) | 6 | Concurrent writers, event pagination, interrupted hosts and legacy replay history |

The installed Electron host also accepted the plugin's queued text message with a synthetic session identity and preserved its request ID. Gateway reflection resolved `apiTestbench/perform`, its request argument, cancellation signal and session scope. [Host](index.js) · [RPC declaration](remote.js)

## Reproduce the checks

1. From the repository root, run `node --test` on a compatible Windows Node runtime with `node:sqlite`.
2. In a second terminal, run `node fixtures/quote-server/server.mjs 0 10000`. Leave it running and copy the loopback URL it prints. The arguments select an available port and a ten-second delay for `EXPIRED_A`.
3. In a standard DSH chat with TestRelay installed and a model configured, replace `<URL>` in this prompt and send it.

   > Test POST `<URL>/quote` with the JSON body `{"coupon":"VALID10"}`, then with `{"coupon":"EXPIRED_A"}`. Expect HTTP 200 for both. Expect the numeric discount to be 10 for the valid coupon and 0 for the expired coupon. Report each result.

4. Open the tool card while the expired coupon is pending. After it fails, change the coupon to `EXPIRED_B` in a retry. Check that the original still shows actual 10, the retry shows actual 0, and the reviewed comparison appears in the originating chat.
5. Open `<URL>/__counts` to compare fixture arrivals with the displayed attempts. Stop the fixture with Ctrl+C. [Fixture source](fixtures/quote-server/server.mjs)
