# Nodbusiness — Data Strategy

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| BI | Business Intelligence |
| CDP | Customer Data Platform |
| DWH | Data Warehouse |
| ELT | Extract, Load, Transform |
| ETL | Extract, Transform, Load |
| GDPR | General Data Protection Regulation |
| ML | Machine Learning |
| PII | Personally Identifiable Information |
| S3 | Simple Storage Service (AWS) |
| SQL | Structured Query Language |

---

## 1. Data Vision

> **Data is the competitive moat. Every transaction, interaction, and external data fetch enriches our understanding of African commerce — powering AI pricing, quality-adjusted revenue share, 4-factor discovery, and the external data gateway. We treat data as a product: governed, accessible, trustworthy, and monetizable.**

---

## 2. Data Architecture

### 2.1 Data Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SOURCES       │     │   INGESTION     │     │   STORAGE       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • PostgreSQL    │────▶│ • CDC (Debezium)│────▶│ • DWH           │
│   (OLTP)        │     │ • Kafka         │     │   (ClickHouse/  │
│ • Redis         │     │ • Batch (Airflow)     │   Druid)      │
│ • Event Logs    │     │ • Stream (Flink)      │ • Object Store │
│ • External APIs │     │ • API (REST)          │   (R2/S3)      │
│ • Client Events │     │                     │ • Feature Store│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CONSUMPTION   │     │   GOVERNANCE    │     │   ML/AI         │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • BI (Metabase/ │     │ • Catalog       │     │ • Feature Eng   │
│   Superset)     │     │ • Lineage       │     │ • Training      │
│ • Dashboards    │     │ • Quality       │     │ • Serving       │
│ • Embedded      │     │ • Access Ctrl   │     │ • Monitoring    │
│ • APIs          │     │ • Privacy       │     │ • A/B Testing   │
│ • Alerts        │     │ • Compliance    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 3. Data Domains

### 3.1 Core Domains

| Domain | Tables | Owner | Sensitivity | Retention |
|--------|--------|-------|-------------|-----------|
| **Users & Identity** | users, profiles, verification_requests | Auth Team | PII (High) | Account lifetime + 90d |
| **Showrooms** | showrooms, sections, field_mappings, external_data_sources | Product Team | Business (Medium) | Account lifetime + 1yr |
| **Commerce** | products, variants, orders, order_items, cart | Commerce Team | Financial (High) | 7 years (legal) |
| **Wallet & Payments** | wallets, wallet_transactions, commissions, audit_logs | Finance Team | Financial (Critical) | 7 years (legal) |
| **Social** | posts, comments, likes, follows, messages, conversations | Social Team | PII (Medium) | Account lifetime + 1yr |
| **Marketplace** | templates, widgets, integrations, developer_payouts | DevRel Team | Business (Medium) | 3 years |
| **DevOps & Observability** | telemetry_events, error_events, health_records, audit_logs | SRE Team | Operational (Low) | 2 years |
| **External Data** | external_health_records, proxy_cache | Platform Team | External (Variable) | Per source TTL |

### 3.2 Data Classification

| Classification | Examples | Access Control | Encryption | Retention |
|----------------|----------|----------------|------------|-----------|
| **Public** | Public showroom pages, published templates | Public read | TLS only | Indefinite |
| **Internal** | Analytics, metrics, DevOps logs | Team + Leads | TLS + at rest | 2 years |
| **Confidential** | Business metrics, user analytics | Role-based | TLS + at rest + field-level | 2 years |
| **PII** | Email, phone, address, government ID | Need-to-know + audit | TLS + at rest + field-level AES-256 | Account + 90d |
| **Financial** | Wallet balances, transactions, commissions | Finance + Audit only | TLS + at rest + field-level AES-256 | 7 years |
| **Credentials** | API keys, OAuth tokens, encryption keys | Vault only | AES-256-GCM + HKDF | Rotated annually |
| **Secrets** | JWT secrets, DB passwords, API secrets | Vault only | Vault-managed | Rotated quarterly |

---

## 4. Data Governance

### 4.1 Data Catalog

| Component | Tool | Owner |
|-----------|------|-------|
| **Catalog** | DataHub / Amundsen | Data Team |
| **Lineage** | OpenLineage + dbt | Data Team |
| **Quality** | Great Expectations / Soda | Data Team |
| **Glossary** | Notion + DataHub | Data Team |
| **Access Control** | AWS Lake Formation / custom RBAC | Security Team |

### 4.2 Data Quality Rules

| Dimension | Rule | Threshold | Action |
|-----------|------|-----------|--------|
| **Completeness** | Required fields non-null | 100% for PK/FK/required | Alert + block |
| **Uniqueness** | PK/UK no duplicates | 100% | Alert + block |
| **Validity** | Enum values, ranges, formats | 99.9% | Alert + quarantine |
| **Consistency** | FK referential integrity | 100% | Alert + block |
| **Timeliness** | ETL lag < 5 min | < 5 min | Alert |
| **Accuracy** | Reconciliation (wallet = SUM(tx)) | 100% | Alert + auto-fix |

### 4.3 Data Contracts

```yaml
# Example: orders table contract
table: orders
owner: commerce-team
schema:
  id: { type: uuid, primary_key: true, not_null: true }
  buyer_id: { type: uuid, not_null: true, fk: users.id }
  seller_id: { type: uuid, not_null: true, fk: users.id }
  product_id: { type: uuid, not_null: true, fk: products.id }
  total_price: { type: numeric(12,2), not_null: true, min: 0 }
  status: { type: enum, values: [pending, paid, shipped, delivered, cancelled, refunded] }
  created_at: { type: timestamp_tz, not_null: true }
quality_rules:
  - total_price >= 0
  - buyer_id != seller_id
  - status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')
sla:
  freshness: 5min
  completeness: 100%
```

---

## 5. Privacy & Compliance

### 5.1 GDPR / CCPA / Ethiopia Data Protection

| Right | Implementation | API |
|-------|----------------|-----|
| **Access** | `/api/user/export` (JSON + PDF) | `GET /api/v1/user/export` |
| **Rectification** | Profile edit + admin override | `PATCH /api/v1/user/profile` |
| **Erasure** | Anonymize (retain audit/financial) | `DELETE /api/v1/user/account` |
| **Portability** | JSON export (machine-readable) | `GET /api/v1/user/export?format=json` |
| **Restriction** | Feature flag `gdpr_restrict` | `PATCH /api/v1/user/privacy` |
| **Objection** | Opt-out flags (marketing, analytics) | `PATCH /api/v1/user/privacy` |
| **Consent** | Granular, recorded, withdrawable | `audit_logs` + consent table |

### 5.2 Data Processing Agreements (DPAs)

| Processor | Purpose | DPA Status |
|-----------|---------|------------|
| **Neon (PostgreSQL)** | Primary database | ✅ Signed |
| **Upstash (Redis)** | Cache, sessions, queues | ✅ Signed |
| **Cloudflare (R2, CDN, WAF)** | Object storage, edge, security | ✅ Signed |
| **Vercel** | Frontend hosting | ✅ Signed |
| **Railway** | Backend hosting | ✅ Signed |
| **SendGrid** | Transactional email | ✅ Signed |
| **Firebase (FCM)** | Push notifications | ✅ Signed |
| **Stripe** | Payments (card) | ✅ Signed |
| **Chapa** | Payments (ETB) | ✅ Signed |
| **Flutterwave** | Payments (KES/NGN) | ✅ Signed |

### 5.3 Data Residency

| Region | Data Stored | Legal Basis |
|--------|-------------|-------------|
| **EU (Frankfurt)** | EU user data | GDPR Art. 28 |
| **US (Virginia)** | Non-EU user data | Standard Contractual Clauses |
| **Africa (Cape Town/Johannesburg)** | African user data | Local laws + SCCs |

---

## 6. Analytics & BI

### 6.1 Key Metrics (North Star + Guardrails)

| Category | Metric | Definition | Target |
|----------|--------|------------|--------|
| **Growth** | MAU | Unique users active in 30 days | 10K (Y1), 100K (Y2), 500K (Y3) |
| **Growth** | Showrooms Published | Total live showrooms | 500 (Y1), 5K (Y2), 25K (Y3) |
| **Revenue** | MRR | Monthly recurring revenue | $25K (Y1), $125K (Y2), $500K (Y3) |
| **Revenue** | GMV | Gross merchandise value | $500K (Y1), $5M (Y2), $50M (Y3) |
| **Engagement** | Session Duration | Median time per session | >5 min |
| **Engagement** | Pages/Session | Avg pages viewed | >4 |
| **Conversion** | Free→Paid | % free showrooms upgrading | >5% |
| **Retention** | 30-day Retention | % users active day 30 | >40% |
| **Unit Economics** | LTV:CAC | Lifetime value / acquisition cost | >18:1 |
| **Platform** | Template Attach Rate | % showrooms using marketplace template | >30% |
| **Platform** | Developer Revenue Share | % GMV from marketplace | >20% |

### 6.2 Dashboard Hierarchy

| Level | Tool | Audience | Refresh |
|-------|------|----------|---------|
| **Executive** | Metabase/Superset | Founders, Board | Daily |
| **Team** | Metabase/Superset | Team Leads | Hourly |
| **Operational** | Grafana | SRE, Engineers | Real-time |
| **Embedded** | Custom (iframe) | Business Owners (in-app) | 5 min |
| **Developer** | Developer Portal | External Developers | Daily |

### 6.3 Key Dashboards

| Dashboard | Key Charts | Owner |
|-----------|------------|-------|
| **Executive Overview** | MAU, MRR, GMV, CAC, LTV, Churn | CEO |
| **Growth Funnel** | Signup → Publish → First Order → Paid | Growth Lead |
| **Revenue** | MRR, ARR, GMV, Revenue Mix, Cohorts | CFO |
| **Product** | Feature Adoption, DAU/MAU, Funnel | PM |
| **Commerce** | Orders, GMV, AOV, Conversion, Refunds | Commerce Lead |
| **Marketplace** | Templates, Installs, Developer Revenue, Quality | DevRel |
| **DevOps** | Latency, Errors, Saturation, Scorecard | SRE |
| **Security** | Auth Failures, Rate Limits, WAF Hits, Audit | Security |

---

## 6. ML/AI Data Pipeline

### 6.1 Feature Store

| Feature Group | Features | Update Frequency | Consumers |
|---------------|----------|------------------|-----------|
| **User** | `days_since_signup`, `total_orders`, `avg_order_value`, `preferred_categories`, `device_type`, `location_cluster` | Daily | Pricing, Discovery, Recommendations |
| **Business** | `showroom_age`, `total_products`, `avg_rating`, `response_time`, `completion_rate`, `verification_status` | Hourly | Discovery, Pricing, Quality Score |
| **Product** | `view_count`, `conversion_rate`, `avg_rating`, `return_rate`, `price_elasticity` | Daily | Pricing, Discovery, Recommendations |
| **Transaction** | `gmv_7d`, `gmv_30d`, `aov`, `conversion_rate`, `refund_rate`, `payment_method_mix` | Hourly | Pricing, Fraud, Forecasting |
| **External** | `source_health`, `fetch_latency`, `data_freshness`, `schema_stability` | Per fetch | PATENT 4 Gateway, PATENT 1 Pricing |

### 6.2 Model Training Pipeline

| Model | Type | Training Data | Retraining | Serving |
|-------|------|---------------|------------|---------|
| **AI Pricing (PATENT 1)** | Gradient Boosting (XGBoost) | Template performance + demand signals | Weekly | Real-time API (Redis cache) |
| **Quality Score (PATENT 2)** | Logistic Regression + GB | Template quality signals + outcomes | Daily | Real-time API |
| **Discovery Ranking (PATENT 3)** | Learning to Rank (LambdaMART) | Impressions, clicks, purchases, social | Daily | Real-time API (per-request) |
| **External Data Health (PATENT 4)** | Anomaly Detection (Isolation Forest) | Fetch logs, latency, errors | Continuous | Stream (Flink) |
| **Fraud Detection** | XGBoost + Rules | Transaction features + labels | Daily | Real-time (async) |
| **Demand Forecasting** | Prophet / TFT | Historical GMV + seasonality | Weekly | Batch (daily forecasts) |
| **Churn Prediction** | Survival Analysis | User activity + engagement | Weekly | Batch (daily scores) |

### 6.3 ML Operations (MLOps)

| Component | Tool | Practice |
|-----------|------|----------|
| **Feature Store** | Feast / custom (Redis + Parquet) | Point-in-time correctness |
| **Experiment Tracking** | MLflow / Weights & Biases | All runs logged |
| **Model Registry** | MLflow Model Registry | Versioned, staged (Staging/Prod) |
| **Training Pipeline** | Airflow / Prefect | Automated, reproducible |
| **Model Serving** | Triton / custom FastAPI | A/B testing, canary, rollback |
| **Monitoring** | Evidently / custom | Drift, performance, data quality |
| **A/B Testing** | Custom (flag-based) | Statistical significance required |

---

## 7. Data Platform Roadmap

| Phase | Timeline | Capabilities |
|-------|----------|--------------|
| **Phase 0 (Now)** | Months 0–3 | PostgreSQL + Redis + basic Metabase dashboards |
| **Phase 1** | Months 3–9 | CDC → Kafka → ClickHouse/Druid; Metabase → Superset; dbt models; basic ML (Pricing v1) |
| **Phase 2** | Months 9–18 | CDC → Kafka → ClickHouse (multi-node); Feature Store (Feast); MLflow; Pricing v2, Discovery v1, Quality v1; A/B testing framework |
| **Phase 3** | Months 18–36 | Multi-region DWH; Feature Store (Feast + online); Real-time ML (Flink); Full PATENT 1-4 models in production; A/B testing at scale; Real-time personalization |
| **Phase 4** | Year 3+ | Data Mesh (domain-owned data products); Real-time CDP; Automated ML (AutoML); Federated learning (privacy-preserving); Data marketplace (external data monetization) |

---

## 7. Data Team Structure

| Phase | Roles | Count |
|-------|-------|-------|
| **Phase 1** | Data Engineer (1), Analytics Engineer (1) | 2 |
| **Phase 2** | + ML Engineer (1), Data Analyst (1) | 4 |
| **Phase 3** | + ML Engineer (2), Data Platform Engineer (1), Data Governance (1) | 8 |
| **Phase 4** | + ML Platform Engineer (2), Data Product Manager (1), Data Privacy Officer (1) | 12 |

---

## 8. Data Budget (Projected)

| Category | Year 1 | Year 2 | Year 3 |
|----------|--------|--------|--------|
| **Storage (ClickHouse/R2)** | $200/mo | $1,000/mo | $5,000/mo |
| **Compute (Kafka/Flink/Airflow)** | $300/mo | $2,000/mo | $10,000/mo |
| **ML (Training/Serving)** | $100/mo | $1,500/mo | $8,000/mo |
| **BI Tools (Superset/Metabase)** | $100/mo | $500/mo | $2,000/mo |
| **Team** | $8,000/mo | $25,000/mo | $80,000/mo |
| **Total** | **~$8,700/mo** | **~$30,000/mo** | **~$105,000/mo** |

---

*This data strategy is the blueprint for our data moat. Review quarterly. Execute relentlessly.*

---

*Confidential. For Nodbusiness Technologies internal use only.*