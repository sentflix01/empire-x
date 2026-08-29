# Nodbusiness — Documentation Hub

> **Classification:** Confidential — Internal Use Only
> **Last Updated:** August 2026
> **Version:** 1.0

---

## Quick Navigation

| Category | Description | Key Documents |
|----------|-------------|---------------|
| **[Strategy](./strategy/)** | Vision, architecture, GTM, competitive, AI/ML, scaling | [Manifesto](./strategy/PRODUCT_MANIFESTO.md) • [Architecture](./strategy/TECHNICAL_ARCHITECTURE.md) • [GTM](./strategy/GO_TO_MARKET_STRATEGY.md) • [Competitive](./strategy/COMPETITIVE_ANALYSIS.md) • [AI/ML](./strategy/AI_ML_STRATEGY.md) • [Scaling](./strategy/SCALING_STRATEGY.md) • [Security](./strategy/SECURITY_ARCHITECTURE.md) • [Data](./strategy/DATA_STRATEGY.md) • [API Design](./strategy/API_DESIGN_GUIDELINES.md) • [Developer Platform](./strategy/DEVELOPER_PLATFORM_STRATEGY.md) • [Ops](./strategy/OPERATIONAL_EXCELLENCE.md) |
| **[Investor](./investor/)** | Pitch, financials, legal, equity, communications | [Executive Summary](./investor/pitch/EXECUTIVE_SUMMARY.md) • [Financial Projections](./investor/pitch/FINANCIAL_PROJECTIONS.md) • [Pitch Deck](./investor/pitch/DECK.md) • [Fundraising Strategy](./investor/FUNDRAISING_STRATEGY.md) • [Valuation Model](./investor/VALUATION_MODEL.md) • [Equity & Cap Table](./investor/EQUITY_AND_CAP_TABLE.md) • [Term Sheet Guide](./investor/legal/TERM_SHEET_GUIDE.md) • [SAFE Guide](./investor/legal/SAFE_AGREEMENT_GUIDE.md) • [Convertible Note](./investor/legal/CONVERTIBLE_NOTE_GUIDE.md) • [Due Diligence](./investor/legal/DUE_DILIGENCE_CHECKLIST.md) • [Shareholder Agreement](./investor/legal/SHAREHOLDER_AGREEMENT.md) • [Investor FAQ](./investor/communications/INVESTOR_FAQ.md) • [Update Template](./investor/communications/INVESTOR_UPDATE_TEMPLATE.md) |
| **[Patent](./patent/)** | Strategy, provisional drafts, prior art, filings | [Strategy](./patent/PATENT_STRATEGY.md) • [PATENT 1: AI Pricing](./patent/provisional/PATENT_1_AI_PRICING.md) • [PATENT 2: Revenue Share](./patent/provisional/PATENT_2_REVENUE_SHARE.md) • [PATENT 3: Discovery](./patent/provisional/PATENT_3_DISCOVERY.md) • [PATENT 4: External Data](./patent/provisional/PATENT_4_SECTION_DATA_BINDING.md) • [Prior Art Search](./patent/prior_art/PRIOR_ART_SEARCH.md) • [Competitive Analysis](./patent/COMPETITIVE_PATENT_ANALYSIS.md) • [Filing Tracker](./patent/filings/FILING_TRACKER.md) • [Trade Secrets](./patent/TRADE_SECRET_REGISTER.md) |
| **[Legal](./legal/)** | Terms, Privacy, DPA, compliance, policies | [Terms of Service](./legal/TERMS_OF_SERVICE.md) • [Privacy Policy](./legal/PRIVACY_POLICY.md) • [DPA Template](./legal/DPA_TEMPLATE.md) • [Cookie Policy](./legal/COOKIE_POLICY.md) • [Refund Policy](./legal/REFUND_POLICY.md) |
| **[Compliance](./compliance/)** | SOC2, GDPR, PCI, audit evidence | [SOC2 Roadmap](./compliance/SOC2_ROADMAP.md) • [GDPR Audit](./compliance/GDPR_AUDIT.md) • [PCI SAQ-A Evidence](./compliance/PCI_SAQ_A_EVIDENCE.md) • [Ethiopia Data Protection](./compliance/ETHIOPIA_DATA_PROTECTION.md) |
| **[Brand](./brand/)** | Guidelines, voice, design system, assets | [Brand Guidelines](./brand/BRAND_GUIDELINES.md) • [Voice & Tone](./brand/VOICE_TONE.md) • [Design System](./brand/DESIGN_SYSTEM.md) • [Logo Usage](./brand/LOGO_USAGE.md) |
| **[Finance](./finance/)** | Cap table, financial model, unit economics | [Cap Table](./finance/CAP_TABLE.md) • [Financial Model](./finance/FINANCIAL_MODEL.md) • [Unit Economics Calculator](./finance/UNIT_ECONOMICS_CALCULATOR.md) • [Budget Tracker](./finance/BUDGET_TRACKER.md) |
| **[People](./people/)** | Org, hiring, compensation, equity | [Org Chart](./people/ORG_CHART.md) • [Hiring Plan](./people/HIRING_PLAN.md) • [Compensation Bands](./people/COMPENSATION_BANDS.md) • [Equity Plan](./people/EQUITY_PLAN.md) • [Culture Deck](./people/CULTURE_DECK.md) |
| **[Trust & Safety](./trust-safety/)** | Moderation, abuse, spam, content policy | [Moderation Policy](./trust-safety/MODERATION_POLICY.md) • [Abuse Reporting](./trust-safety/ABUSE_REPORTING.md) • [Spam Prevention](./trust-safety/SPAM_PREVENTION.md) • [Content Policy](./trust-safety/CONTENT_POLICY.md) |
| **[Operations](./operations/)** | Technical debt, backups, runbooks, audit | [Technical Debt](./operations/TECHNICAL_DEBT.md) • [Backups](./operations/BACKUPS.md) • [Runbooks Index](./operations/RUNBOOKS_INDEX.md) • [Implementation Logs](./operations/log-report/) |
| **[Production](./Production/)** | Auto-generated encyclopedia, API reference, task logs | [Backend](./Production/backend/) • [Frontend](./Production/frontend-next/) • [API Reference](./Production/api-reference.md) • [Encyclopedia Index](./Production/ENCYCLOPEDIA_INDEX.md) |
| **[Infrastructure](./infrastructure/)** | Network, DB, CI/CD, monitoring, secrets | [Network Diagram](./infrastructure/NETWORK_DIAGRAM.md) • [Database Schema](./infrastructure/DATABASE_SCHEMA.md) • [CI/CD Pipeline](./infrastructure/CI_CD_PIPELINE.md) • [Monitoring Stack](./infrastructure/MONITORING_STACK.md) • [Secrets Management](./infrastructure/SECRETS_MANAGEMENT.md) |
| **[Architecture](./architecture/)** | System design, decisions, patterns | [ADR Index](./architecture/ADR_INDEX.md) • [System Context](./architecture/SYSTEM_CONTEXT.md) • [Data Flow](./architecture/DATA_FLOW.md) |

---

## Document Standards

| Standard | Rule |
|----------|------|
| **Classification** | Every doc starts with `> Classification: Confidential — Internal Use Only` |
| **Acronyms Table** | Every doc includes acronyms table at top |
| **Version Header** | `> Version: X.Y` • `> Last Updated: YYYY-MM` |
| **Acronyms** | Defined on first use, collected in table |
| **Cross-References** | Use relative paths: `./strategy/PRODUCT_MANIFESTO.md` |
| **Code Blocks** | Language-tagged: ```typescript, ```sql, ```json |
| **Tables** | Markdown, header row, aligned pipes |
| **Diagrams** | Mermaid (```mermaid) or ASCII |
| **Confidentiality Footer** | `*Confidential. For Nodbusiness Technologies internal use only.*` |

---

## Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| **Index Update** | Every new doc | Doc author |
| **Link Check** | Monthly | Docs owner |
| **Classification Review** | Quarterly | Legal |
| **Archive Old Versions** | Per release | Docs owner |
| **Search Index Rebuild** | Weekly | CI/CD |

---

## Contributing

1. Create new doc in correct folder
2. Follow standards above
3. Update this README index
4. PR with `docs:` prefix
5. Review by area owner

---

## Search Tips

- **By acronym:** Search acronym table in any doc
- **By feature:** Check `strategy/` for product/tech, `investor/` for raise, `legal/` for compliance
- **By component:** `Production/` has auto-generated per-file docs
- **By audit:** `operations/log-report/` has implementation history

---

*Confidential. For Nodbusiness Technologies internal use only.*