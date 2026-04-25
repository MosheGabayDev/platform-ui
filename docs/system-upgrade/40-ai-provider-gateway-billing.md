# 40 — AI Provider Gateway + Billing Metering Architecture

_Round 029 — 2026-04-24 | Updated R031 — 2026-04-25_
_Status: Architecture design complete. **Phase 1 implemented (platformengineer working tree, uncommitted — R031)**._

> **Core rule:** No module may call OpenAI, Gemini, Anthropic, Claude, or any LLM/STT/TTS provider SDK directly. All AI calls go through the AI Provider Gateway. Every call emits a usage event linked to org / user / module / session.

---

## §01 — Executive Summary

The platform has 55+ files across 20+ modules that import LLM provider SDKs (`openai`, `anthropic`, `google.generativeai`) directly outside of `apps/ai_providers/`. These bypassed calls:
- produce no billing records
- can use org API keys without attribution
- cannot be rate-limited or quota-enforced
- generate no audit trail

A sophisticated AI Provider layer already exists (`apps/ai_providers/` — registry, adapters, `AIUsageLog`, cost_tracker, fallback chain, circuit breaker). The gap is that most of the platform bypasses it entirely.

This round defines the canonical architecture to close that gap: a unified AI Provider Gateway, an extended usage event model, billing integration, streaming finalization, voice metering, and enforcement rules.

**New components needed (extend existing, do not duplicate):**
- `apps/ai_providers/gateway.py` — unified entry point (does not exist yet)
- `apps/ai_providers/policy.py` — quota pre-check + enforcement
- `apps/ai_providers/billing_adapter.py` — bridge between `AIUsageLog` and `apps/billing/` outbox
- `apps/ai_providers/schemas.py` — canonical request/response types
- `AIUsageLog` schema extension — 14 new fields (migration required)

**Existing components to reuse unchanged:**
- `apps/ai_providers/registry.py` — provider resolution (keep as-is)
- `apps/ai_providers/adapters/` — provider adapters (keep as-is)
- `apps/ai_providers/key_resolver.py` — `get_api_key()` / `get_provider_settings()` (keep as-is)
- `apps/ai_providers/cost_tracker.py` — `calculate_cost()` / `log_usage()` (extend, not replace)
- `apps/billing/service_billing.py` — `emit_billing_event()` (reuse)
- `apps/billing/outbox_writer.py` — billing outbox (reuse)

---

## §02 — Core Rule: No Direct LLM Calls

> This rule has no exceptions. It applies to all environments including dev, test, and CI.

```
AI Consumer (any module)
  → GatewayRequest (structured call)
  → AI Provider Gateway (apps/ai_providers/gateway.py)
  → Policy check (quota + rate limit)
  → Provider registry (resolve provider + model)
  → Provider adapter (OpenAI/Gemini/Anthropic/etc.)
  → External LLM provider
  → Usage extraction
  → Billing adapter (emit_billing_event)
  → AIUsageLog write
  → Return GatewayResponse
```

**Banned patterns (any of these in non-ai_providers code = VIOLATION):**

```python
# BANNED — direct SDK usage
import openai
from openai import OpenAI, AsyncOpenAI
import anthropic
from anthropic import Anthropic, AsyncAnthropic
import google.generativeai as genai
from google.generativeai import ...
import gemini

# BANNED — direct env var key access
os.getenv('OPENAI_API_KEY')
os.getenv('GEMINI_API_KEY')
os.getenv('ANTHROPIC_API_KEY')
```

**Required pattern:**

```python
# CORRECT
from apps.ai_providers.gateway import AIProviderGateway, GatewayRequest
from apps.ai_providers.key_resolver import get_api_key  # only in gateway/adapters

result = AIProviderGateway.call(GatewayRequest(
    org_id=org.id,
    user_id=user.id,
    module_id="helpdesk",
    feature_id="ticket_summarization",
    capability="chat",
    messages=[...],
    session_id=session.id,
    conversation_id=conversation_id,
))
```

---

## §03 — Current AI Provider / Billing Assessment

### What already exists in `apps/ai_providers/`

| Component | File | Status |
|-----------|------|--------|
| Provider registry (4-level hierarchy) | `registry.py` | ✅ Complete |
| Provider adapters (OpenAI, Gemini, Anthropic, Ollama) | `adapters/` | ✅ Complete |
| API key / config resolution | `key_resolver.py` | ✅ Complete |
| Cost calculation | `cost_tracker.py` — `calculate_cost()` | ✅ Complete |
| Async usage log write (Celery) | `cost_tracker.py` — `log_usage()` | ✅ Complete |
| `AIUsageLog` model (partitioned monthly) | `models.py` | ✅ Exists — needs extension |
| Fallback chain + circuit breaker | `registry.py` | ✅ Complete |
| Health monitoring | `health_monitor.py` | ✅ Complete |
| Internal routes | `internal_routes.py` | ✅ Complete |

### What already exists in `apps/billing/`

| Component | File | Status |
|-----------|------|--------|
| Multi-component rate config | `rate_config.py` | ✅ Complete |
| Service billing outbox writer | `service_billing.py` — `emit_billing_event()` | ✅ Complete |
| Billing outbox + consumer | `outbox_writer.py`, `consumer.py` | ✅ Complete |
| Recording billing | `recording_billing.py` | ✅ Complete |
| Feature flags | `feature_flags.py` | ✅ Complete |

### Critical gaps

| Gap | Impact |
|-----|--------|
| **55+ modules bypass `apps/ai_providers/` entirely** | LLM costs not tracked, not billed |
| No `gateway.py` unified entry point | Callers wire registry + adapter + cost_tracker manually (or skip them) |
| No quota pre-check before LLM calls | Orgs can exceed plan limits with no enforcement |
| No streaming finalization tracking | Streaming aborts produce partial usage, not billed |
| `AIUsageLog` missing 12 fields | No `conversation_id`, `feature_id`, `action_id`, `ai_action_invocation_id`, `status`, `correlation_id`, `is_estimated`, `cached_tokens`, `started_at`, `completed_at`, `billable_cost`, `quota_bucket` |
| No enforcement / lint rule | New code added daily bypassing the layer |

### Direct provider import scan results (2026-04-24)

Files with direct LLM imports outside `apps/ai_providers/`:

```
apps/admin/routes.py
apps/agents/ai_chat/chat_manager.py
apps/ai_agents/engine/agent_runner.py
apps/ai_settings/services/agent_engine.py
apps/ai_settings/services/interview_engine.py
apps/ala/tasks/commitment_task.py
apps/cicd_assistant/ai_service.py
apps/helpdesk/services/incident_memory_service.py
apps/helpdesk/services/screen_analyzer.py
apps/helpdesk/services/vision_service.py
apps/life_assistant/services/gemini_client.py        ← dedicated bypass client
apps/life_assistant/services/openai_fallback.py      ← dedicated bypass client
apps/mobile_voice/conversation_engine.py
apps/mobile_voice/title_generator.py
apps/ops_intelligence/services/ops_query_service.py
apps/personal_info/ai_chat/providers/gemini_provider.py  ← dedicated bypass client
apps/personal_info/ai_chat/providers/openai_provider.py  ← dedicated bypass client
apps/voice_support/call_manager.py
... (37 more files)
```

Total: **55+ files** across **20+ modules**.

---

## §04 — Target Architecture

```
┌────────────────────────────────────────────────────────────┐
│  AI CONSUMERS (all platform modules)                        │
│  Floating Assistant | AI Action Platform | Helpdesk AI     │
│  ALA | Mobile Voice | Agents | RAG | OPS Intelligence      │
│  Command Palette | Capability Context | Onboarding         │
│                      ↓ GatewayRequest                       │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│  AI PROVIDER GATEWAY  (apps/ai_providers/gateway.py)       │
│                                                            │
│  1. Validate GatewayRequest                                │
│  2. Policy check (policy.py)                               │
│     - quota pre-check                                      │
│     - rate limit check                                     │
│     - module enabled check                                 │
│     - PII redaction hooks                                  │
│  3. Resolve provider (registry.py)                         │
│  4. Resolve credentials (key_resolver.py)                  │
│  5. Execute via adapter (adapters/)                        │
│     - streaming support                                    │
│     - retry / failover                                     │
│  6. Extract usage (token counts, audio seconds)            │
│  7. Calculate cost (cost_tracker.calculate_cost())         │
│  8. Write AIUsageLog (cost_tracker.log_usage())            │
│  9. Emit billing event (billing_adapter.emit())            │
│  10. Return GatewayResponse                                │
└──────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┴───────────────┐
         │                             │
┌────────▼────────┐          ┌────────▼──────────────┐
│ Provider        │          │ Billing               │
│ Adapters        │          │                        │
│ OpenAI          │          │ AIUsageLog (write)     │
│ Gemini          │          │ billing_outbox (emit)  │
│ Anthropic       │          │ quota_bucket (decrement)│
│ Ollama          │          │ invoice_line_item (if  │
│ OpenAI compat.  │          │   billing_mode=usage)  │
└─────────────────┘          └────────────────────────┘
```

---

## §05 — AI Provider Gateway

### `GatewayRequest` — canonical call interface

```python
# apps/ai_providers/schemas.py

@dataclass
class GatewayRequest:
    # ─── Attribution (required) ────────────────────────────────────────────
    org_id: int
    user_id: int | None        # None for system calls; still requires org_id
    module_id: str             # "helpdesk" | "ala" | "floating_assistant" | ...
    feature_id: str            # "ticket_summarization" | "voice_reply" | ...

    # ─── Call parameters ──────────────────────────────────────────────────
    capability: str            # "chat" | "embedding" | "transcription" | "tts" | "vision"
    messages: list[dict] | None = None  # for chat/completion
    prompt: str | None = None           # for simple completion
    text: str | None = None             # for embedding / TTS
    audio_data: bytes | None = None     # for STT/transcription

    # ─── Correlation ──────────────────────────────────────────────────────
    session_id: str | None = None          # helpdesk/ALA/voice session
    conversation_id: str | None = None     # floating assistant conversation
    action_id: str | None = None           # AI Action Platform action_id
    ai_action_invocation_id: int | None = None  # FK to AIActionInvocation

    # ─── Provider hints (optional) ────────────────────────────────────────
    model_override: str | None = None
    stream: bool = False

    # ─── Billing ──────────────────────────────────────────────────────────
    non_billable: bool = False   # True for test/dev only; must be explicitly set

    # ─── Request tracking ─────────────────────────────────────────────────
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
```

### `GatewayResponse` — canonical response

```python
@dataclass
class GatewayResponse:
    content: str | None = None          # chat/completion result
    embeddings: list[list[float]] | None = None
    audio_bytes: bytes | None = None    # TTS output

    # ─── Usage ────────────────────────────────────────────────────────────
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    audio_input_seconds: float = 0.0
    audio_output_seconds: float = 0.0
    is_estimated: bool = False          # True if token count was estimated

    # ─── Billing result ───────────────────────────────────────────────────
    usage_log_id: int | None = None     # AIUsageLog.id written
    billable_cost_usd: float = 0.0

    # ─── Diagnostics ──────────────────────────────────────────────────────
    provider: str = ""
    model: str = ""
    provider_request_id: str | None = None
    latency_ms: int = 0
    stream_generator: Iterator[str] | None = None  # populated when stream=True

    # ─── Error ────────────────────────────────────────────────────────────
    error: GatewayError | None = None
```

### `AIProviderGateway` — main class

```python
# apps/ai_providers/gateway.py

class AIProviderGateway:
    """Unified entry point for all AI provider calls.

    This is the ONLY allowed way to call LLM/STT/TTS/embedding providers.
    Every call is:
    - policy-checked (quota + rate limit)
    - provider-resolved
    - usage-logged
    - billed

    Never instantiate provider adapters directly in module code.
    """

    @classmethod
    def call(cls, request: GatewayRequest) -> GatewayResponse:
        """Synchronous (non-streaming) call."""
        return cls._execute(request)

    @classmethod
    def call_stream(cls, request: GatewayRequest) -> GatewayResponse:
        """Streaming call. GatewayResponse.stream_generator is populated.

        Usage:
            resp = AIProviderGateway.call_stream(req)
            for chunk in resp.stream_generator:
                yield chunk
            # After iteration: usage is finalized automatically
        """
        request.stream = True
        return cls._execute(request)

    @classmethod
    def _execute(cls, request: GatewayRequest) -> GatewayResponse:
        """Full execution path — see §04 flow diagram."""
        started_at = datetime.utcnow()

        # 1. Validate
        cls._validate_request(request)

        # 2. Policy check
        policy_result = AIProviderPolicy.check(request)
        if not policy_result.allowed:
            return GatewayResponse(error=GatewayError(
                code="quota_exceeded",
                message=policy_result.denial_reason,
                http_status=429,
            ))

        # 3. Resolve provider
        provider, adapter = resolve_provider_and_adapter(request)

        # 4. Execute
        try:
            raw = adapter.chat(request.messages, model=request.model_override or provider.default_model)
            usage = cls._extract_usage(raw, request)
            cost = calculate_cost(provider.config, usage.model, usage.input_tokens, usage.output_tokens)

            # 5. Log usage + bill
            log_id = cls._write_usage(request, usage, cost, started_at, "success")
            cls._emit_billing(request, usage, cost)

            return GatewayResponse(
                content=raw.content,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                usage_log_id=log_id,
                billable_cost_usd=cost,
                provider=provider.provider_type,
                model=raw.model,
                latency_ms=int((datetime.utcnow() - started_at).total_seconds() * 1000),
            )

        except Exception as e:
            cls._write_usage(request, None, 0.0, started_at, "failed", error=str(e))
            raise GatewayError.from_provider_exception(e)
```

### Gateway responsibilities summary

| Responsibility | Component |
|---------------|-----------|
| Provider selection | `registry.py` → `resolve_provider()` |
| Model selection | `registry.py` model_override chain |
| Key/secret resolution | `key_resolver.py` → `get_provider_settings()` |
| Prompt payload validation | `schemas.py` → `GatewayRequest` validation |
| PII redaction hooks | `policy.py` → `pii_redact_hook()` |
| Quota pre-check | `policy.py` → `AIProviderPolicy.check()` |
| Billing reservation | `billing_adapter.py` (for usage-based plans) |
| Provider call | `adapters/` |
| Streaming support | `adapters/` + `gateway.py` streaming wrapper |
| Token/cost extraction | `cost_tracker.py` → `calculate_cost()` |
| Billing finalization | `billing_adapter.py` → `emit_billing_event()` |
| Usage event write | `cost_tracker.py` → `log_usage()` (extended) |
| Audit event write | `log_usage()` + `UserActivity` hook |
| Error normalization | `GatewayError` class in `schemas.py` |
| Retry/failover | `registry.py` fallback chain |

---

## §06 — Provider Registry and Adapters

### What already exists — reuse unchanged

The four-level provider resolution hierarchy already exists in `registry.py`:

```
1. User override       (AIUserOverride WHERE user_id AND capability)
2. Module override     (AIModuleOverride WHERE module_name)
3. System default      (AIProviderDefault WHERE capability)
4. Raise NoProviderConfigured
```

Adapters for OpenAI, Gemini, Anthropic, Ollama, OpenAI-compatible already exist.

### Only add: adapter streaming finalization hook

```python
# apps/ai_providers/adapters/base.py — ADD method

class AIProviderAdapter(ABC):
    # ... existing methods unchanged ...

    def chat_stream_with_usage(
        self,
        messages: list[dict],
        model: str | None = None,
        **kwargs,
    ) -> tuple[Iterator[str], Callable[[], UsageResult]]:
        """Streaming chat that also returns a usage-extraction callable.

        Returns:
            (chunk_iterator, get_final_usage)
            Caller must consume chunk_iterator fully and then call get_final_usage()
            to get token counts. If stream is interrupted, call get_final_usage()
            with is_partial=True.
        """
        raise NotImplementedError
```

### Provider secrets policy

| Rule | Detail |
|------|--------|
| Provider API keys stored in SSM only | `/platform/secrets/OPENAI_API_KEY`, etc. |
| Keys resolved only in `key_resolver.py` | No other file may read provider API key env vars |
| Keys never returned to client | Not in API responses, not in AI context, not in prompts |
| Keys never logged | Logger calls on provider config must exclude `api_key_ref` |
| Keys never in DB plaintext | `api_key_ref` is either an SSM param name or encrypted value |
| `get_api_key()` is the only allowed key access | Enforce via lint rule (see §15) |

---

## §07 — Extended LLM Usage Event Model

`AIUsageLog` already exists and is partitioned monthly. It needs 12 new fields (migration required).

### Extended `AIUsageLog` schema

```python
# apps/ai_providers/models.py — extension (migration 20260424_extend_ai_usage_log)

class AIUsageLog(db.Model):
    __tablename__ = "ai_usage_log"

    # ─── Existing fields (unchanged) ───────────────────────────────────────
    id                    # BigInteger PK
    org_id                # Integer NOT NULL
    provider_id           # BigInteger FK ai_providers.id
    provider_type         # String(30)
    capability            # String(40) — "chat"|"embedding"|"tts"|"transcription"
    module_name           # String(60) — module that made the call
    model                 # String(80)
    input_tokens          # Integer
    output_tokens         # Integer
    total_tokens          # Integer
    latency_ms            # Integer
    cost_usd              # Numeric(10,6) — provider cost estimate
    error_message         # Text
    request_metadata      # JSON
    user_id               # Integer
    session_id            # String(128)
    audio_input_tokens    # Integer
    audio_output_tokens   # Integer
    text_input_tokens     # Integer
    text_output_tokens    # Integer
    thoughts_tokens       # Integer
    event_type            # String(30) — maps to feature_id in new calls
    billing_mode          # String(20) — "flat"|"usage"|"free"
    idempotency_key       # String(128)
    created_at            # DateTime UTC

    # ─── NEW FIELDS (migration 20260424) ───────────────────────────────────
    feature_id            = db.Column(db.String(80), nullable=True)
    # Which feature within module_name triggered call (e.g. "ticket_summarization")

    conversation_id       = db.Column(db.String(128), nullable=True, index=True)
    # Floating assistant / chat conversation this call belongs to

    action_id             = db.Column(db.String(128), nullable=True)
    # AI Action Platform action_id if this call was part of action planning

    ai_action_invocation_id = db.Column(db.BigInteger, nullable=True, index=True)
    # FK to ai_action_invocations.id (not enforced FK — cross-table, different lifecycle)

    status                = db.Column(db.String(20), nullable=True)
    # "success"|"failed"|"partial"|"refunded"|"reserved" — replaces inferred from error_message

    started_at            = db.Column(db.DateTime(timezone=True), nullable=True)
    # When the provider call was initiated (latency_ms = completed_at - started_at)

    completed_at          = db.Column(db.DateTime(timezone=True), nullable=True)
    # When provider returned (or stream ended / was aborted)

    error_code            = db.Column(db.String(40), nullable=True)
    # Structured error: "quota_exceeded"|"rate_limited"|"provider_error"|"timeout"|"partial_stream"

    correlation_id        = db.Column(db.String(64), nullable=True, index=True)
    # GatewayRequest.correlation_id — links gateway request to usage row

    cached_tokens         = db.Column(db.Integer, nullable=True, default=0)
    # Prompt cache hits (provider-reported, e.g. Anthropic cache_read_input_tokens)

    is_estimated          = db.Column(db.Boolean, nullable=False, default=False)
    # True if token count was estimated (provider did not return usage metadata)

    billable_cost         = db.Column(db.Numeric(12, 6), nullable=True)
    # Platform billable amount after markup (may differ from cost_usd)

    quota_bucket          = db.Column(db.String(60), nullable=True)
    # Which quota this call consumed: "monthly_tokens"|"daily_calls"|"voice_minutes"
```

### Usage event lifecycle

```
GatewayRequest arrives
  → reservation row written (status='reserved') — for pre-paid quota plans
  → provider call executes
  → success: status='success', tokens filled, cost calculated
  → failure (pre-token): status='failed', error_code='provider_rejected', cost=0
  → failure (post-partial): status='partial', is_estimated=True, cost=partial estimate
  → stream abort: status='partial', completed_at=abort time, is_estimated=True
  → billing emitted after any terminal status
```

---

## §08 — Billing / Usage Metering Flow

### Full flow per LLM call

```
1. Classify request
   - capability: chat | embedding | tts | transcription | vision
   - quota_bucket: monthly_tokens | daily_calls | voice_minutes | storage_gb

2. Resolve org billing account
   - org.billing_plan_id → plan limits
   - org.billing_mode: "flat" | "usage" | "enterprise"

3. Quota pre-check (policy.py)
   - monthly_token_limit check
   - daily_call_limit check
   - voice_minutes_remaining check
   - If exceeded: HTTP 429 before provider is called

4. (Optional) Reserve estimated usage
   - Only for usage-based billing plans
   - Reservation row: status='reserved', estimated_tokens=N
   - Protects against overspend on concurrent calls

5. Execute provider call

6. Collect actual usage
   - Token counts from provider response
   - If provider returns no usage: estimate + mark is_estimated=True

7. Calculate billable amount
   a. Provider cost: cost_tracker.calculate_cost(config, model, input, output)
   b. Platform markup: multiply by org plan's markup_factor
   c. Currency: store in USD (Numeric), display conversion done at billing UI layer

8. Write AIUsageLog row (via cost_tracker.log_usage())
   - status=success, actual tokens, actual cost, correlation_id, feature_id, etc.

9. Decrement quota
   - Redis DECRBY monthly_tokens:{org_id} by total_tokens

10. Emit billing event (billing_adapter.emit())
    - event_type: "ai.llm.call" | "ai.tts.seconds" | "ai.stt.seconds"
    - via billing_outbox → consumer → ledger

11. Return GatewayResponse
    - usage_log_id, billable_cost_usd included
    - error details normalized (no provider internals leaked)
```

### Failed call billing rules

| Failure type | Tokens billed | Status | error_code |
|-------------|--------------|--------|------------|
| Provider rejected before generation | 0 | `failed` | `provider_rejected` |
| Provider timeout (no response) | 0 | `failed` | `timeout` |
| Streaming interrupted mid-generation | Estimated partial | `partial` | `partial_stream` |
| Gateway quota exceeded (never reached provider) | 0 | `failed` | `quota_exceeded` |
| Rate limited by provider | 0 | `failed` | `rate_limited` |
| User cancelled stream | Partial (provider-reported if available) | `partial` | `user_cancelled` |

---

## §09 — Quota and Plan Enforcement

### `AIProviderPolicy` (new file: `apps/ai_providers/policy.py`)

```python
# apps/ai_providers/policy.py

class PolicyResult:
    allowed: bool
    denial_reason: str | None
    quota_remaining: int | None

class AIProviderPolicy:
    """Quota and rate limit enforcement — called before every provider call.

    Checks happen in this order (fail-fast):
    1. Org is active
    2. Module is enabled for org
    3. Feature flag is on (if applicable)
    4. daily_calls limit not exceeded
    5. monthly_token_budget not exceeded
    6. voice_minutes_remaining > 0 (for voice calls)
    7. provider-level rate limit (Redis sliding window)

    All checks are Redis-first (cache), DB-fallback.
    """

    @classmethod
    def check(cls, request: GatewayRequest) -> PolicyResult: ...

    @classmethod
    def decrement_quota(cls, org_id: int, bucket: str, amount: int) -> int:
        """Decrement quota counter; return remaining."""
        ...

    @classmethod
    def reserve_estimated_usage(cls, org_id: int, estimated_tokens: int) -> str:
        """Reserve quota before call; returns reservation_id."""
        ...

    @classmethod
    def finalize_reservation(cls, reservation_id: str, actual_tokens: int) -> None:
        """Finalize reservation after call completes."""
        ...
```

### Quota buckets

| Bucket | Redis key | Reset period |
|--------|----------|-------------|
| `monthly_tokens` | `quota_tokens:{org_id}:{YYYY-MM}` | Monthly (TTL = end of month) |
| `daily_calls` | `quota_calls:{org_id}:{YYYY-MM-DD}` | Daily (TTL = end of day) |
| `voice_minutes` | `quota_voice:{org_id}:{YYYY-MM}` | Monthly |
| `concurrent_streams` | `quota_streams:{org_id}` | Real-time (decrement on stream end) |

### Plan limits (stored in `org_billing_rates` or new `org_ai_plan_limits` table)

| Limit | Starter | Pro | Enterprise |
|-------|---------|-----|-----------|
| Monthly tokens | 1M | 10M | Unlimited (alert-only) |
| Daily calls | 1,000 | 10,000 | Unlimited |
| Voice minutes/month | 100 | 1,000 | Custom |
| Streaming concurrent | 2 | 10 | Custom |

---

## §10 — Streaming Billing

### Streaming lifecycle

```
GatewayRequest(stream=True)
  → gateway creates streaming_usage_log row (status='reserved')
  → adapter.chat_stream_with_usage() called
  → generator yielded to caller chunk by chunk
  → on stream END (normal):
      get_final_usage() called → actual token counts
      AIUsageLog updated: status='success', tokens, cost, completed_at
      billing_adapter.emit() with actual usage
  → on stream ABORT (user cancel / network):
      caller calls gateway.finalize_stream(usage_log_id, is_partial=True)
      AIUsageLog updated: status='partial', is_estimated=True, completed_at=now()
      billing_adapter.emit() with estimated partial usage
  → on stream TIMEOUT (provider timeout mid-stream):
      error_code='partial_stream', status='partial', is_estimated=True
      billing_adapter.emit() with estimated partial usage
```

### Streaming finalization contract

Every module that uses `call_stream()` MUST call `gateway.finalize_stream()` in its cleanup path:

```python
resp = AIProviderGateway.call_stream(request)
try:
    for chunk in resp.stream_generator:
        yield chunk  # or send to websocket
except Exception:
    AIProviderGateway.finalize_stream(resp.usage_log_id, is_partial=True)
    raise
# No explicit finalize needed on normal end — handled internally
```

### Providers that don't return per-token usage in streaming

Some providers (older OpenAI models) only return usage at the end of a stream. Rule:
- Always request `stream_options={"include_usage": true}` if available
- If usage not returned: estimate from prompt length + generated character count
- Mark `is_estimated=True` on the usage row
- Billing uses estimated value; never zero-bill a completed stream

---

## §11 — Voice Usage Metering

Voice calls involve multiple billable components per session. All are attributed to the same `session_id` and `conversation_id`.

### Voice billing components

| Component | Unit | Metric | `capability` value |
|-----------|------|--------|-------------------|
| Speech-to-Text (STT) | audio_seconds | `audio_input_seconds` | `transcription` |
| LLM reasoning | tokens | `input_tokens`, `output_tokens` | `chat` |
| Text-to-Speech (TTS) | audio_seconds | `audio_output_seconds` | `tts` |
| Live session duration | minutes | session end time - start time | (via voice_session billing) |
| Transcription storage | GB-hours | file size × retention days | (via recording_billing.py) |

### Voice usage metering rules

1. Every STT call goes through gateway with `capability="transcription"`, `session_id=<voice_session_id>`
2. Every LLM call in a voice session goes through gateway with `capability="chat"`, `session_id=<voice_session_id>`, `feature_id="voice_reply"`
3. Every TTS call goes through gateway with `capability="tts"`, `session_id=<voice_session_id>`
4. All three are linked by `session_id` in `AIUsageLog` for per-session billing rollup
5. Live session minutes billed separately via `apps/billing/service_billing.emit_billing_event()` (already in place)
6. `quota_bucket = "voice_minutes"` for all voice-originated calls

### Gemini Live API (current voice path)

The current voice path uses Gemini Live API (WebRTC/gRPC from mobile-voice-gateway). Gemini Live reports:
- `audio_input_tokens` — STT tokens
- `audio_output_tokens` — TTS tokens
- `text_input_tokens` — LLM input
- `text_output_tokens` — LLM output
- `thoughts_tokens` — reasoning tokens

All of these fields already exist in `AIUsageLog`. The gap is that `mobile_voice/conversation_engine.py` directly calls Gemini SDK — it must be migrated to gateway.

---

## §12 — AI Action Platform Integration

Every AI Action that involves LLM reasoning (planning, parameter extraction, confirmation message generation) must link its usage to the `AIActionInvocation` row.

### Linkage contract

```python
# When AI Action Platform calls LLM for planning/reasoning:

request = GatewayRequest(
    org_id=org_id,
    user_id=actor_user_id,
    module_id=action_descriptor.module_id,
    feature_id=f"action_planning.{action_id}",
    capability="chat",
    messages=planning_messages,
    session_id=ai_session_id,
    conversation_id=conversation_id,
    action_id=action_id,                              # AI Action Platform action_id
    ai_action_invocation_id=invocation.id,            # FK to audit row
)
resp = AIProviderGateway.call(request)
```

### What is billable in AI Action Platform

| Step | Billable? | gateway call? |
|------|-----------|---------------|
| LLM planning (parameter extraction) | ✅ Yes | Required |
| LLM confirmation message generation | ✅ Yes (if LLM-generated) | Required |
| Static confirmation templates | ❌ No (no LLM) | Not needed |
| Action execution (backend function call) | ❌ No (no LLM) | Not needed |
| AI Action result summarization | ✅ Yes (if LLM-generated) | Required |
| Registry lookup | ❌ No | Not needed |
| Capability context load | ❌ No (cached JSON) | Not needed |

---

## §13 — Floating Assistant Cost Policy

### When LLM is and is not called

| Event | LLM call? | Billed? |
|-------|----------|---------|
| Page load | ❌ No | ❌ No |
| Route change | ❌ No | ❌ No |
| Icon hover | ❌ No | ❌ No |
| Icon click (first time in session) | ❌ No (context load only) | ❌ No |
| Drawer open | ❌ No | ❌ No |
| Static page description shown | ❌ No (from `PageAIContext`) | ❌ No |
| **User sends first free-text message** | ✅ Yes | ✅ Yes |
| **User sends follow-up message** | ✅ Yes | ✅ Yes |
| **Active workflow continues on navigation** | ✅ Yes (diff attached to prompt) | ✅ Yes |
| **Long conversation summarization** | ✅ Yes | ✅ Yes |
| Confirmation UI rendered | ❌ No (from session state) | ❌ No |
| Capability context re-fetch (context_version change) | ❌ No (REST GET, no LLM) | ❌ No |

### Floating assistant gateway attribution

```python
request = GatewayRequest(
    org_id=user.org_id,
    user_id=user.id,
    module_id="floating_assistant",
    feature_id="chat_message",          # or "conversation_summary"
    capability="chat",
    messages=conversation_messages,
    conversation_id=session.conversationId,
    session_id=None,                    # no voice session
)
```

### Context diff cost reduction

- `PageContextDiff` is computed locally — no LLM token cost
- `lastLLMContextHash` prevents re-sending unchanged capability context
- Estimated savings: 400–800 tokens per message when context is cached

---

## §14 — Provider Secrets Policy

| Rule | Enforcement |
|------|------------|
| API keys only in SSM Parameter Store | SSM sync script; never in `.env` committed to git |
| `get_api_key()` is the only allowed key access function | Lint rule + code review |
| Keys never in `api_key_ref` as plaintext | `_encryption.py` wraps all key storage |
| Keys never logged | Logger sanitizer on `request_metadata` |
| Keys never in AI context or prompts | PII redaction hook in `policy.py` |
| Keys never in `GatewayResponse` | Not a field |
| Keys never returned to frontend | API routes must not relay provider config |
| Rotation: SSM update → `ssm-secrets.sh sync-k8s` → pod restart | Documented in CLAUDE.md |

---

## §15 — Enforcement Rules

### Backend enforcement (hard rules)

1. No `import openai` / `from openai import` outside `apps/ai_providers/`
2. No `import anthropic` / `from anthropic import` outside `apps/ai_providers/`
3. No `import google.generativeai` outside `apps/ai_providers/`
4. No `os.getenv('OPENAI_API_KEY')` / `os.getenv('GEMINI_API_KEY')` / `os.getenv('ANTHROPIC_API_KEY')` outside `key_resolver.py`
5. No LLM call without `org_id` (gateway rejects `org_id=None`)
6. No LLM call without `module_id` (gateway rejects empty `module_id`)
7. No LLM call without writing `AIUsageLog` row (gateway always writes before returning)
8. No streaming call without a finalization path (gateway enforces via context manager)
9. No billing bypass except `non_billable=True` flag, which requires `module_id` prefix `"test_"` or env `FLASK_ENV=testing`
10. No provider error details leaked to client (gateway normalizes errors; raw provider response never in HTTP 500 body)

### Frontend enforcement

1. No direct LLM provider API calls from Next.js / React Native
2. No provider API keys in frontend env vars, bundles, or config files
3. All AI calls proxy through Flask backend (which uses gateway)

### CI/CD enforcement (lint rule)

Add to pre-commit / CI:

```yaml
# .github/workflows/lint.yml — add step

- name: Check for direct LLM provider imports
  run: |
    # Fail if any file outside apps/ai_providers/ imports provider SDKs directly
    VIOLATIONS=$(grep -rn \
      "import openai\|from openai\|import anthropic\|from anthropic\|import google.generativeai\|from google.generativeai" \
      apps/ \
      --include="*.py" \
      --exclude-dir=ai_providers \
      --exclude-dir=__pycache__ \
      --exclude="*test*" \
      -l)
    if [ -n "$VIOLATIONS" ]; then
      echo "FAIL: Direct LLM provider imports found outside apps/ai_providers/:"
      echo "$VIOLATIONS"
      exit 1
    fi
```

---

## §16 — Testing Strategy

### Required tests before gateway ships

**Gateway core:**
- [ ] `call()` with valid request → returns `GatewayResponse` with `usage_log_id`
- [ ] `call()` with `org_id=None` → raises `ValidationError`
- [ ] `call()` with `module_id=""` → raises `ValidationError`
- [ ] `call()` quota exceeded → returns `GatewayError(code='quota_exceeded')` before provider is called
- [ ] `call()` provider error → `AIUsageLog` row written with `status='failed'`
- [ ] `call()` provider returns no token usage → `is_estimated=True` in usage row
- [ ] `call_stream()` normal completion → `status='success'`, actual token counts
- [ ] `call_stream()` mid-stream abort → `status='partial'`, `is_estimated=True`

**Billing:**
- [ ] Successful call → `billing_outbox` row written
- [ ] Failed call (pre-token) → `billing_outbox` NOT written (or written with `amount_cents=0`)
- [ ] Partial stream → `billing_outbox` written with `amount_cents>0` and `is_estimated=True`
- [ ] `non_billable=True` with `FLASK_ENV=testing` → no billing outbox row
- [ ] `non_billable=True` without test env → gateway raises `PolicyError`

**Quota:**
- [ ] Monthly token limit → call blocked after limit reached
- [ ] Quota Redis key TTL = end of month
- [ ] Quota reset on new month (key expires)
- [ ] Quota decrement on success; no decrement on pre-provider failure

**Voice:**
- [ ] STT call → `capability='transcription'`, `quota_bucket='voice_minutes'`, `session_id` set
- [ ] Voice LLM call → `feature_id='voice_reply'`, `session_id` set, `audio_input_tokens` populated
- [ ] All three voice calls linked to same `session_id` in `AIUsageLog`

**Provider secrets:**
- [ ] `GatewayResponse` does not contain `api_key_ref` or any key value
- [ ] `request_metadata` in `AIUsageLog` does not contain API key

**Floating assistant:**
- [ ] First user message → `AIUsageLog` row with `module_id='floating_assistant'`, `conversation_id` set
- [ ] Drawer open → no `AIUsageLog` row created
- [ ] Route change → no `AIUsageLog` row created
- [ ] Static page description shown → no `AIUsageLog` row created

**AI Action Platform:**
- [ ] LLM planning call → `AIUsageLog` row with `action_id` and `ai_action_invocation_id` set
- [ ] Static confirmation template → no `AIUsageLog` row

**Direct import detection:**
- [ ] CI lint rule catches `import openai` in a new module-level file
- [ ] CI lint rule does NOT flag `apps/ai_providers/adapters/openai_adapter.py`

---

## §17 — Migration Plan

### Phase 1 (pre-R027): Add gateway + extend AIUsageLog

1. Write `apps/ai_providers/gateway.py` (new file — wraps existing registry + adapters + cost_tracker)
2. Write `apps/ai_providers/policy.py` (new file — quota pre-check)
3. Write `apps/ai_providers/billing_adapter.py` (new file — bridges to `emit_billing_event()`)
4. Write `apps/ai_providers/schemas.py` (new file — `GatewayRequest`, `GatewayResponse`, `GatewayError`)
5. Migration: add 12 new fields to `ai_usage_log` table
6. Add CI lint rule for direct provider imports
7. Write gateway unit tests (§16 gateway core)

### Phase 2 (R027–R028): Migrate priority modules

Migrate modules that serve production user traffic first:

| Module | Bypass files | Priority |
|--------|-------------|---------|
| `apps/helpdesk/` | 3 files | P1 — production path |
| `apps/mobile_voice/` | 2 files | P1 — voice billing |
| `apps/ai_agents/` | 1 file | P1 — agents production |
| `apps/ala/` | 1 file | P1 — voice production |
| `apps/ops_intelligence/` | 5 files | P2 |
| `apps/personal_info/` | 8 files | P2 |
| `apps/life_assistant/` | 12 files | P3 |

### Phase 3 (R029+): Complete migration + enforce lint

1. Migrate remaining 37 files
2. Enable CI lint rule to block merges with direct imports
3. Deprecate `life_assistant/services/gemini_client.py` and `openai_fallback.py` (dedicated bypass wrappers)
4. Remove `personal_info/ai_chat/providers/` wrapper layer
5. Backfill `feature_id` in existing `AIUsageLog` rows (best-effort via module_name mapping)

---

## §18 — Open Questions

| # | Question | Impact |
|---|----------|--------|
| Q1 | Gemini Live (WebRTC/gRPC voice) — the gateway currently only wraps REST adapters. Does Gemini Live need a separate gateway path, or is metering done post-session via the Gemini Live session summary event? | Voice billing completeness |
| Q2 | Should `billable_cost` be in USD or ILS? Current billing uses agorot/ILS in `billing/rate_config.py` but `cost_usd` is USD. | Currency consistency |
| Q3 | Non-billable mode: should test harnesses be allowed to set `non_billable=True` freely, or only via a signed test token? | Billing integrity |
| Q4 | How does the gateway handle multi-org system admin calls (capability context loads for multiple orgs)? | org_id ambiguity |
| Q5 | Provider fallback (AIFallbackChain): if primary fails mid-stream, does the stream restart on fallback? | Streaming reliability |
| Q6 | Monthly token quota reset: is it calendar-month or rolling 30 days? | Billing fairness |
| Q7 | Billing for LLM calls in test/dev: are org 1 (admin org) calls billed? | Dev cost tracking |
| Q8 | Should `AIUsageLog` rows be written synchronously (in request path) or async-only (Celery)? Async = possible loss on crash. | Usage data reliability |

---

## §19 — Acceptance Criteria

Round 029 is complete when:

- [ ] `40-ai-provider-gateway-billing.md` exists with §01–§19
- [ ] ADR-027 exists in decision log for "AI Provider Gateway + Mandatory Billing Metering"
- [ ] `35-platform-capabilities-build-order.md` has gateway migration track pre-R027
- [ ] `15-action-backlog.md` has gateway + billing migration tasks
- [ ] `CLAUDE.md` updated: no direct LLM imports rule + `AIProviderGateway.call()` example
- [ ] `docs/ARCHITECTURE.md` updated: AI Provider Gateway section
- [ ] `36-ai-action-platform.md` has note: all LLM calls in action planning go through gateway
- [ ] `38-floating-ai-assistant.md` has note: all LLM calls go through gateway with `module_id='floating_assistant'`
- [ ] `39-ai-architecture-consistency-pass.md` has note: gateway is enforcement mechanism for doc 39 §09 tool injection rules

---

_Document created: 2026-04-24 (Round 029)_
_Implementation gate: gateway.py must exist before any module migration starts. CI lint rule must be in place before migration is declared complete._
