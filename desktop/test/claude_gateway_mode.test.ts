import assert from "node:assert/strict";
import test from "node:test";
import { CLAUDE_GATEWAY, SUBSCRIPTION_MODELS } from "../src/verticals/finance/lib/ai-models.ts";
import { textOf, withRenderer } from "./helpers/render.ts";

const claudeModel = SUBSCRIPTION_MODELS.find((m) => m.provider === "cli-claude")!;
const claudeStatus = (over: Record<string, unknown> = {}) => ({
  provider: "cli-claude", name: "Claude Code", installed: true, authenticated: true, available: true,
  version: "2.1.228 (Claude Code)", status: "ready", detail: "已安装；网关模式：走启动环境里的网关配置，不是 claude.ai 订阅", ...over,
});

test("Claude Code 网关模式:「接入 AI」卡片如实标成网关模式,不再写订阅登录;默认模式的文字不变", async () => {
  const texts = await withRenderer(async (r) => {
    const { SubscriptionAgentCard } = await r.load("/src/verticals/finance/pages/Settings.tsx");
    const card = (status: unknown) => textOf(r.html(SubscriptionAgentCard,
      { model: claudeModel, status: status as never, probeFailed: false, selected: false, onSelect: () => {} }));
    return {
      gateway: card(claudeStatus({ mode: "gateway" })),
      gatewayMissing: card(claudeStatus({ mode: "gateway", available: false, authenticated: false, status: "not_authenticated" })),
      subscription: card(claudeStatus()),
    };
  });
  assert.match(texts.gateway, /Claude Code 可用 网关模式/, "卡片上看得见是网关模式");
  assert.ok(texts.gateway.includes(CLAUDE_GATEWAY.description));
  assert.doesNotMatch(texts.gateway, /订阅登录/, "网关模式不拿订阅登录冒充");
  assert.match(texts.gatewayMissing, /配置不全/, "缺网关变量时不说「未登录」");
  assert.match(texts.subscription, /Claude Code 可用/);
  assert.ok(texts.subscription.includes(claudeModel.description));
  assert.doesNotMatch(texts.subscription, /网关/, "默认模式不出现网关字样");
});

test("首次接入弹窗:Claude Code 网关模式下这一项也如实改口,另外两家不受影响", async () => {
  const texts = await withRenderer(async (r) => {
    const { QuickAiConnectOptions } = await r.load("/src/verticals/finance/components/ui/QuickAiConnect.tsx");
    const options = (claudeGateway: boolean) => textOf(r.html(QuickAiConnectOptions, { claudeGateway, busy: "", disabled: false, onConnect: () => {} }));
    return { gateway: options(true), subscription: options(false) };
  });
  assert.ok(texts.gateway.includes(CLAUDE_GATEWAY.label) && texts.gateway.includes(CLAUDE_GATEWAY.description));
  assert.doesNotMatch(texts.gateway, /Claude订阅/);
  assert.ok(texts.subscription.includes("Claude订阅") && texts.subscription.includes("使用本机 Claude Code 登录"));
  for (const t of Object.values(texts)) assert.ok(t.includes("Codex订阅版") && t.includes("WorkBuddy CLI"));
});

test("网关模式的说明写清三件事:不是订阅、开关是什么、产品只转交不保存凭据", () => {
  assert.match(CLAUDE_GATEWAY.note, /不是 claude\.ai 订阅/);
  assert.match(CLAUDE_GATEWAY.note, /VRA_CLAUDE_GATEWAY=1/);
  assert.match(CLAUDE_GATEWAY.note, /不读取也不保存凭据/);
  for (const copy of Object.values(CLAUDE_GATEWAY)) assert.doesNotMatch(copy, /订阅登录/, copy);
});
