# TestRelay

**DeepSeek Harness 的接口测试台。** Agent 发请求时，你能看到它正在测什么。断言失败时，打开那一次请求，改一个参数重发，再把两次实测的差异送回原对话。你也可以直接在右栏新建请求，保存为工作区用例。

比如测试过期优惠券，接口两次都返回 HTTP 200：

| 谁发起 | 请求中的券码 | 预期折扣 | 实际折扣 | 结果 |
| --- | --- | ---: | ---: | --- |
| Agent | `EXPIRED_A` | 0 | 10 | 失败 |
| 你，从上一次请求修改重发 | `EXPIRED_B` | 0 | 0 | 通过 |

右栏保留这两次请求。你能回看 Agent 当时为什么判断失败，也能编辑带有两次尝试编号和字段变化的摘要，发回原会话。

## 安装

已验证的宿主是 Windows 上的 DeepSeek Harness Desktop `0.2.2-rc.1`。先把源码克隆到准备长期保留的位置：

```sh
git clone https://github.com/JavaLyHn/dsh-testrelay.git
cd dsh-testrelay
```

在 PowerShell 中运行 `(Resolve-Path .).Path` 获取仓库的绝对路径，在 DSH 的 **Profile Bundle Manager** 中执行 `install_bundle`，将 `target` 填为该路径。安装后刷新界面，在关联了工作区的会话右栏打开 **TestRelay 接口测试台**。

已有 `@local/dsh-api-testbench` 安装的用户沿用原有插件标识和历史。通过目录链接安装时，在已链接的仓库目录运行 `git pull --ff-only`，然后完整退出并重启 DSH。卸载时，在同一管理器执行 `remove_bundle`，目标为 `@local/dsh-api-testbench`。

## 用本机接口试一次

1. 在仓库目录运行 `node fixtures/quote-server/server.mjs`。它会打印一个仅监听本机的地址，例如 `http://127.0.0.1:<端口>`。
2. 打开右栏，在普通对话里说：“帮我测一下 `http://127.0.0.1:<端口>/quote`。用 POST 发 JSON，字段叫 coupon。VALID10 应该抵扣 10，EXPIRED_A 应该抵扣 0，结果看 discount。”用上一步打印的真实端口替换占位符。
3. `EXPIRED_A` 会延迟约 3.5 秒。打开工具卡能看到等待状态、请求和预期。响应到达后，右栏会显示 HTTP 200，同时显示折扣断言失败。
4. 在失败尝试中把券码改成 `EXPIRED_B`，保留原断言并手动重试。对照结果后，点击 **将摘要发回此会话**。

要独立手测，在右栏点击 **新建请求**。同一工作区能共享保存的用例，各会话保留自己的运行历史。测试台记录经它发出的 HTTP 请求；Agent 使用 shell 或其他工具发送的请求不在这份历史中。

## 断言与凭据

断言支持 HTTP 状态码、JSON 字段存在和严格值比较，因此数字 `0`、字符串 `"0"`、`null` 和缺失字段会得到不同结果。例如：

```json
{"kind":"json_equals","path":"$.discount","expected":0,"basis":"user"}
```

在 DSH Credentials 中保管密钥，在环境里保存凭据引用，使用 `Bearer {{API_TOKEN}}` 等模板发请求。普通环境变量以明文保存在本地；可以用 `sensitiveFields` 指定需遮盖的业务字段。请求中途取消或超时，服务端可能已经收到它。手动重发 POST 前应确认重复执行的影响。

## 开发与验证

使用带有 `node:sqlite` 的 Node.js，已验证版本为 `24.21.0`。在仓库根目录运行 `node --test`；独立测试无需安装第三方依赖。内置的两个 Agent 工具是 `api_test_run` 和 `api_test_list_cases`。

[验证范围与复现方法](VERIFICATION.md) · [HTTP 执行器](host/executor.js) · [本地示例服务](fixtures/quote-server/server.mjs)
