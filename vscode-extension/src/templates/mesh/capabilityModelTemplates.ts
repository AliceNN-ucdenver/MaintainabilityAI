// ============================================================================
// Built-in Business Capability Model Templates
// Insurance (ACORD-inspired) and Banking (BIAN-based)
// ============================================================================

/**
 * Insurance Enterprise Capability Model (ACORD-inspired)
 * 10 L1 capabilities with ~35 L2 and ~105 L3
 * L1 keys 'insurance-operations' and 'policy-management' match existing BAR decorator paths.
 */
export function generateInsuranceCapabilityModel(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/decorator.json',
    $id: 'decorators/capability-model.json',
    'unique-id': 'insurance-enterprise-capability-map',
    name: 'Insurance Enterprise Capability Map',
    'model-type': 'insurance',
    'decorator-type': 'business-capability',
    definitions: {
      'insurance-operations': {
        level: 'L1', name: 'Insurance Operations', description: 'Core insurance business functions including claims, fraud, and customer communication.',
        children: {
          'claims-management': {
            level: 'L2', name: 'Claims Management', description: 'End-to-end claims lifecycle.',
            children: {
              'claims-adjudication': { level: 'L3', name: 'Claims Adjudication', description: 'Evaluation of claims against policy terms and coverage limits.' },
              'claims-intake': { level: 'L3', name: 'Claims Intake', description: 'First notice of loss capture and initial claim registration.' },
              'claims-settlement': { level: 'L3', name: 'Claims Settlement', description: 'Payment determination and disbursement for approved claims.' },
            },
          },
          'customer-communication': {
            level: 'L2', name: 'Customer Communication', description: 'Policyholder notifications and self-service interactions.',
            children: {
              'status-notifications': { level: 'L3', name: 'Status Notifications', description: 'Automated claim and policy status updates.' },
              'document-delivery': { level: 'L3', name: 'Document Delivery', description: 'Generation and delivery of policy documents.' },
              'self-service-portal': { level: 'L3', name: 'Self-Service Portal', description: 'Policyholder online account management.' },
            },
          },
          'fraud-prevention': {
            level: 'L2', name: 'Fraud Prevention', description: 'Detection and mitigation of fraudulent claims activity.',
            children: {
              'fraud-scoring': { level: 'L3', name: 'Fraud Scoring', description: 'AI-powered risk scoring of incoming claims.' },
              'fraud-investigation': { level: 'L3', name: 'Fraud Investigation', description: 'Case management for flagged claims requiring manual review.' },
              'fraud-analytics': { level: 'L3', name: 'Fraud Analytics', description: 'Pattern analysis and fraud trend reporting.' },
            },
          },
          'loss-adjusting': {
            level: 'L2', name: 'Loss Adjusting', description: 'Assessment and quantification of insured losses.',
            children: {
              'field-inspection': { level: 'L3', name: 'Field Inspection', description: 'On-site damage assessment and documentation.' },
              'loss-estimation': { level: 'L3', name: 'Loss Estimation', description: 'Calculation of covered loss amounts.' },
              'salvage-recovery': { level: 'L3', name: 'Salvage & Recovery', description: 'Recovery of value from damaged or abandoned property.' },
            },
          },
        },
      },
      'policy-management': {
        level: 'L1', name: 'Policy Management', description: 'Policy lifecycle from underwriting through renewal.',
        children: {
          'policy-administration': {
            level: 'L2', name: 'Policy Administration', description: 'Policy issuance, endorsements, and maintenance.',
            children: {
              'coverage-management': { level: 'L3', name: 'Coverage Management', description: 'Coverage definition, limits, and exclusions.' },
              'policy-renewal': { level: 'L3', name: 'Policy Renewal', description: 'Automated and manual renewal workflows.' },
              'endorsements': { level: 'L3', name: 'Endorsements', description: 'Mid-term policy modifications and riders.' },
            },
          },
          'underwriting': {
            level: 'L2', name: 'Underwriting', description: 'Risk assessment and policy pricing.',
            children: {
              'risk-assessment': { level: 'L3', name: 'Risk Assessment', description: 'Evaluation of applicant risk profile.' },
              'pricing-rating': { level: 'L3', name: 'Pricing & Rating', description: 'Premium calculation based on risk factors.' },
              'policy-binding': { level: 'L3', name: 'Policy Binding', description: 'Formal acceptance and issuance of coverage.' },
            },
          },
          'reinsurance': {
            level: 'L2', name: 'Reinsurance', description: 'Risk transfer and treaty management.',
            children: {
              'treaty-management': { level: 'L3', name: 'Treaty Management', description: 'Reinsurance treaty negotiation and administration.' },
              'facultative-placement': { level: 'L3', name: 'Facultative Placement', description: 'Individual risk placement with reinsurers.' },
              'cession-accounting': { level: 'L3', name: 'Cession Accounting', description: 'Premium and loss allocation to reinsurers.' },
            },
          },
        },
      },
      'claims': {
        level: 'L1', name: 'Claims', description: 'Strategic claims capabilities spanning all lines of business.',
        children: {
          'claims-strategy': {
            level: 'L2', name: 'Claims Strategy', description: 'Claims operating model and performance management.',
            children: {
              'claims-analytics': { level: 'L3', name: 'Claims Analytics', description: 'Data-driven claims performance insights.' },
              'claims-benchmarking': { level: 'L3', name: 'Claims Benchmarking', description: 'Industry comparison and best practice adoption.' },
              'supplier-management': { level: 'L3', name: 'Supplier Management', description: 'Vendor and repair network management.' },
            },
          },
          'subrogation': {
            level: 'L2', name: 'Subrogation', description: 'Recovery of claim costs from liable third parties.',
            children: {
              'subrogation-identification': { level: 'L3', name: 'Subrogation Identification', description: 'Detection of subrogation recovery opportunities.' },
              'subrogation-pursuit': { level: 'L3', name: 'Subrogation Pursuit', description: 'Legal and negotiation recovery actions.' },
              'subrogation-accounting': { level: 'L3', name: 'Subrogation Accounting', description: 'Tracking and reconciliation of recovered amounts.' },
            },
          },
          'litigation-management': {
            level: 'L2', name: 'Litigation Management', description: 'Legal defense and dispute resolution.',
            children: {
              'case-management': { level: 'L3', name: 'Case Management', description: 'Legal case tracking and coordination.' },
              'settlement-negotiation': { level: 'L3', name: 'Settlement Negotiation', description: 'Mediation and resolution of disputed claims.' },
            },
          },
        },
      },
      'channel-management': {
        level: 'L1', name: 'Channel Management', description: 'Distribution channel strategy and agent/broker management.',
        children: {
          'agency-management': {
            level: 'L2', name: 'Agency Management', description: 'Agent appointment, licensing, and performance.',
            children: {
              'agent-onboarding': { level: 'L3', name: 'Agent Onboarding', description: 'New agent appointment and licensing.' },
              'commission-management': { level: 'L3', name: 'Commission Management', description: 'Commission calculation and payment.' },
              'agent-performance': { level: 'L3', name: 'Agent Performance', description: 'Production tracking and incentive management.' },
            },
          },
          'digital-channels': {
            level: 'L2', name: 'Digital Channels', description: 'Online and mobile distribution.',
            children: {
              'web-portal': { level: 'L3', name: 'Web Portal', description: 'Customer and agent web applications.' },
              'mobile-app': { level: 'L3', name: 'Mobile App', description: 'Native mobile application capabilities.' },
              'api-marketplace': { level: 'L3', name: 'API Marketplace', description: 'Embedded insurance and partner integrations.' },
            },
          },
          'broker-management': {
            level: 'L2', name: 'Broker Management', description: 'Broker relationships and data exchange.',
            children: {
              'broker-connectivity': { level: 'L3', name: 'Broker Connectivity', description: 'Electronic data interchange with brokers.' },
              'broker-portal': { level: 'L3', name: 'Broker Portal', description: 'Broker self-service and submission management.' },
            },
          },
        },
      },
      'finance': {
        level: 'L1', name: 'Finance', description: 'Financial management, billing, and regulatory reporting.',
        children: {
          'billing-payments': {
            level: 'L2', name: 'Billing & Payments', description: 'Premium billing and payment processing.',
            children: {
              'premium-billing': { level: 'L3', name: 'Premium Billing', description: 'Invoice generation and billing cycle management.' },
              'payment-processing': { level: 'L3', name: 'Payment Processing', description: 'Payment collection and reconciliation.' },
              'collections': { level: 'L3', name: 'Collections', description: 'Delinquent premium recovery.' },
            },
          },
          'financial-reporting': {
            level: 'L2', name: 'Financial Reporting', description: 'Statutory and management reporting.',
            children: {
              'statutory-reporting': { level: 'L3', name: 'Statutory Reporting', description: 'Regulatory financial filings.' },
              'management-reporting': { level: 'L3', name: 'Management Reporting', description: 'Internal financial performance analysis.' },
              'tax-reporting': { level: 'L3', name: 'Tax Reporting', description: 'Tax compliance and optimization.' },
            },
          },
          'reserving': {
            level: 'L2', name: 'Reserving', description: 'Loss reserves and actuarial analysis.',
            children: {
              'case-reserves': { level: 'L3', name: 'Case Reserves', description: 'Individual claim reserve estimation.' },
              'bulk-reserves': { level: 'L3', name: 'Bulk Reserves', description: 'Aggregate reserve calculations (IBNR).' },
              'actuarial-analysis': { level: 'L3', name: 'Actuarial Analysis', description: 'Statistical modeling of loss development.' },
            },
          },
        },
      },
      'contract-administration': {
        level: 'L1', name: 'Contract Administration', description: 'Contract lifecycle and document management.',
        children: {
          'document-management': {
            level: 'L2', name: 'Document Management', description: 'Policy and contract document storage and retrieval.',
            children: {
              'document-generation': { level: 'L3', name: 'Document Generation', description: 'Automated creation of policy documents.' },
              'document-storage': { level: 'L3', name: 'Document Storage', description: 'Electronic document archival and retrieval.' },
              'correspondence': { level: 'L3', name: 'Correspondence', description: 'Outbound and inbound letter management.' },
            },
          },
          'contract-lifecycle': {
            level: 'L2', name: 'Contract Lifecycle', description: 'End-to-end contract management.',
            children: {
              'contract-creation': { level: 'L3', name: 'Contract Creation', description: 'New contract drafting and approval.' },
              'contract-amendments': { level: 'L3', name: 'Contract Amendments', description: 'Mid-term contract modifications.' },
              'contract-termination': { level: 'L3', name: 'Contract Termination', description: 'Cancellation and non-renewal processing.' },
            },
          },
        },
      },
      'marketing': {
        level: 'L1', name: 'Marketing', description: 'Marketing strategy, campaigns, and customer acquisition.',
        children: {
          'campaign-management': {
            level: 'L2', name: 'Campaign Management', description: 'Marketing campaign planning and execution.',
            children: {
              'campaign-planning': { level: 'L3', name: 'Campaign Planning', description: 'Target audience and message strategy.' },
              'campaign-execution': { level: 'L3', name: 'Campaign Execution', description: 'Multi-channel campaign delivery.' },
              'campaign-analytics': { level: 'L3', name: 'Campaign Analytics', description: 'ROI tracking and attribution.' },
            },
          },
          'market-research': {
            level: 'L2', name: 'Market Research', description: 'Competitive and market intelligence.',
            children: {
              'competitive-analysis': { level: 'L3', name: 'Competitive Analysis', description: 'Competitor product and pricing analysis.' },
              'customer-insights': { level: 'L3', name: 'Customer Insights', description: 'Customer behavior and preference analysis.' },
            },
          },
          'brand-management': {
            level: 'L2', name: 'Brand Management', description: 'Brand identity and reputation.',
            children: {
              'brand-strategy': { level: 'L3', name: 'Brand Strategy', description: 'Brand positioning and messaging.' },
              'reputation-monitoring': { level: 'L3', name: 'Reputation Monitoring', description: 'Social and media sentiment tracking.' },
            },
          },
        },
      },
      'customer-service': {
        level: 'L1', name: 'Customer Service', description: 'Customer experience and service delivery.',
        children: {
          'contact-center': {
            level: 'L2', name: 'Contact Center', description: 'Multi-channel customer contact management.',
            children: {
              'call-management': { level: 'L3', name: 'Call Management', description: 'Inbound/outbound call routing and handling.' },
              'chat-messaging': { level: 'L3', name: 'Chat & Messaging', description: 'Digital messaging and chatbot support.' },
              'email-management': { level: 'L3', name: 'Email Management', description: 'Customer email routing and response.' },
            },
          },
          'customer-experience': {
            level: 'L2', name: 'Customer Experience', description: 'CX measurement and optimization.',
            children: {
              'nps-surveys': { level: 'L3', name: 'NPS & Surveys', description: 'Customer satisfaction measurement.' },
              'journey-mapping': { level: 'L3', name: 'Journey Mapping', description: 'Customer journey analysis and optimization.' },
              'complaint-management': { level: 'L3', name: 'Complaint Management', description: 'Formal complaint tracking and resolution.' },
            },
          },
          'knowledge-management': {
            level: 'L2', name: 'Knowledge Management', description: 'Agent and customer knowledge resources.',
            children: {
              'knowledge-base': { level: 'L3', name: 'Knowledge Base', description: 'Searchable articles and FAQs.' },
              'training-resources': { level: 'L3', name: 'Training Resources', description: 'Agent training materials and guides.' },
            },
          },
        },
      },
      'enterprise-services': {
        level: 'L1', name: 'Enterprise Services', description: 'Shared enterprise capabilities and corporate functions.',
        children: {
          'data-analytics': {
            level: 'L2', name: 'Data & Analytics', description: 'Enterprise data management and analytics.',
            children: {
              'data-warehouse': { level: 'L3', name: 'Data Warehouse', description: 'Centralized data storage and modeling.' },
              'business-intelligence': { level: 'L3', name: 'Business Intelligence', description: 'Dashboards, reports, and ad-hoc analysis.' },
              'advanced-analytics': { level: 'L3', name: 'Advanced Analytics', description: 'Predictive modeling and machine learning.' },
            },
          },
          'compliance-regulatory': {
            level: 'L2', name: 'Compliance & Regulatory', description: 'Regulatory compliance and governance.',
            children: {
              'regulatory-tracking': { level: 'L3', name: 'Regulatory Tracking', description: 'Monitoring of regulatory changes.' },
              'compliance-reporting': { level: 'L3', name: 'Compliance Reporting', description: 'Filing and attestation management.' },
              'audit-management': { level: 'L3', name: 'Audit Management', description: 'Internal and external audit coordination.' },
            },
          },
          'human-resources': {
            level: 'L2', name: 'Human Resources', description: 'People management and talent development.',
            children: {
              'talent-acquisition': { level: 'L3', name: 'Talent Acquisition', description: 'Recruitment and hiring.' },
              'workforce-management': { level: 'L3', name: 'Workforce Management', description: 'Scheduling and capacity planning.' },
              'learning-development': { level: 'L3', name: 'Learning & Development', description: 'Employee training and career growth.' },
            },
          },
          'information-technology': {
            level: 'L2', name: 'Information Technology', description: 'IT infrastructure and application management.',
            children: {
              'infrastructure-ops': { level: 'L3', name: 'Infrastructure Ops', description: 'Cloud, network, and compute management.' },
              'application-management': { level: 'L3', name: 'Application Management', description: 'Application lifecycle and support.' },
              'cybersecurity': { level: 'L3', name: 'Cybersecurity', description: 'Security operations and threat management.' },
            },
          },
        },
      },
      'sales': {
        level: 'L1', name: 'Sales', description: 'Sales strategy, quoting, and pipeline management.',
        children: {
          'sales-management': {
            level: 'L2', name: 'Sales Management', description: 'Sales team and territory management.',
            children: {
              'territory-planning': { level: 'L3', name: 'Territory Planning', description: 'Geographic and segment territory assignment.' },
              'pipeline-management': { level: 'L3', name: 'Pipeline Management', description: 'Sales opportunity tracking and forecasting.' },
              'sales-performance': { level: 'L3', name: 'Sales Performance', description: 'Quota tracking and incentive management.' },
            },
          },
          'quoting': {
            level: 'L2', name: 'Quoting', description: 'Quote generation and comparison.',
            children: {
              'quote-generation': { level: 'L3', name: 'Quote Generation', description: 'Automated premium quote calculation.' },
              'quote-comparison': { level: 'L3', name: 'Quote Comparison', description: 'Multi-carrier or multi-option comparison.' },
              'proposal-management': { level: 'L3', name: 'Proposal Management', description: 'Formal proposal creation and delivery.' },
            },
          },
          'customer-acquisition': {
            level: 'L2', name: 'Customer Acquisition', description: 'Lead generation and conversion.',
            children: {
              'lead-management': { level: 'L3', name: 'Lead Management', description: 'Lead capture, scoring, and nurturing.' },
              'cross-sell-upsell': { level: 'L3', name: 'Cross-Sell & Upsell', description: 'Expansion of customer product portfolio.' },
            },
          },
        },
      },
    },
  }, null, 2);
}

/**
 * Banking Enterprise Capability Model (BIAN-based)
 * 5 L1 business areas with ~48 L2 business domains and representative L3 service domains.
 * Based on BIAN Service Landscape. Attribution: Banking Industry Architecture Network (BIAN).
 */
export function generateBankingCapabilityModel(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/decorator.json',
    $id: 'decorators/capability-model.json',
    'unique-id': 'banking-enterprise-capability-map',
    name: 'Banking Enterprise Capability Map (BIAN)',
    'model-type': 'banking',
    'decorator-type': 'business-capability',
    definitions: {
      'sales-and-service': {
        level: 'L1', name: 'Sales & Service', description: 'Customer-facing channels, sales, marketing, and relationship management.',
        children: {
          'channel-management': {
            level: 'L2', name: 'Channel Management', description: 'Branch, ATM, online, and mobile channel operations.',
            children: {
              'branch-operations': { level: 'L3', name: 'Branch Operations', description: 'Physical branch location management and operations.' },
              'atm-management': { level: 'L3', name: 'ATM Management', description: 'ATM network operations and cash management.' },
              'online-banking': { level: 'L3', name: 'Online Banking', description: 'Internet banking portal and features.' },
              'mobile-banking': { level: 'L3', name: 'Mobile Banking', description: 'Mobile app banking services.' },
            },
          },
          'customer-management': {
            level: 'L2', name: 'Customer Management', description: 'Customer lifecycle, onboarding, and relationship management.',
            children: {
              'customer-onboarding': { level: 'L3', name: 'Customer Onboarding', description: 'New customer registration and KYC.' },
              'customer-relationship': { level: 'L3', name: 'Customer Relationship', description: 'Ongoing relationship management and engagement.' },
              'customer-profile': { level: 'L3', name: 'Customer Profile', description: 'Customer data and preference management.' },
            },
          },
          'sales-product-management': {
            level: 'L2', name: 'Sales & Product Management', description: 'Product sales, cross-sell, and campaign management.',
            children: {
              'sales-planning': { level: 'L3', name: 'Sales Planning', description: 'Sales target setting and territory management.' },
              'campaign-management': { level: 'L3', name: 'Campaign Management', description: 'Marketing campaign execution and tracking.' },
              'product-advisory': { level: 'L3', name: 'Product Advisory', description: 'Needs-based product recommendations.' },
            },
          },
          'customer-servicing': {
            level: 'L2', name: 'Customer Servicing', description: 'Service requests, complaints, and customer support.',
            children: {
              'service-request-management': { level: 'L3', name: 'Service Request Management', description: 'Customer service ticket processing.' },
              'complaint-handling': { level: 'L3', name: 'Complaint Handling', description: 'Formal complaint resolution and tracking.' },
              'party-authentication': { level: 'L3', name: 'Party Authentication', description: 'Customer identity verification for service access.' },
            },
          },
        },
      },
      'reference-data': {
        level: 'L1', name: 'Reference Data', description: 'Master data management for parties, products, and market information.',
        children: {
          'party-data': {
            level: 'L2', name: 'Party Data', description: 'Customer, counterparty, and legal entity master data.',
            children: {
              'customer-directory': { level: 'L3', name: 'Customer Directory', description: 'Master customer record management.' },
              'legal-entity-directory': { level: 'L3', name: 'Legal Entity Directory', description: 'Corporate entity and hierarchy data.' },
              'counterparty-management': { level: 'L3', name: 'Counterparty Management', description: 'Trading and business counterparty data.' },
            },
          },
          'product-catalog': {
            level: 'L2', name: 'Product Catalog', description: 'Banking product definitions and configuration.',
            children: {
              'product-design': { level: 'L3', name: 'Product Design', description: 'New product creation and feature definition.' },
              'product-directory': { level: 'L3', name: 'Product Directory', description: 'Published product catalog and eligibility rules.' },
              'pricing-management': { level: 'L3', name: 'Pricing Management', description: 'Rate and fee schedule management.' },
            },
          },
          'market-data': {
            level: 'L2', name: 'Market Data', description: 'Financial market prices, indices, and analytics.',
            children: {
              'market-data-feeds': { level: 'L3', name: 'Market Data Feeds', description: 'Real-time and historical market data.' },
              'financial-market-analysis': { level: 'L3', name: 'Financial Market Analysis', description: 'Market trend analysis and forecasting.' },
              'benchmark-rates': { level: 'L3', name: 'Benchmark Rates', description: 'Reference rate management (SOFR, EURIBOR).' },
            },
          },
          'location-data': {
            level: 'L2', name: 'Location Data', description: 'Geographic and address reference data.',
            children: {
              'address-management': { level: 'L3', name: 'Address Management', description: 'Address validation and standardization.' },
              'geo-mapping': { level: 'L3', name: 'Geo Mapping', description: 'Branch and ATM location services.' },
            },
          },
        },
      },
      'operations-and-execution': {
        level: 'L1', name: 'Operations & Execution', description: 'Core banking operations: accounts, payments, lending, trading, and cards.',
        children: {
          'deposits-accounts': {
            level: 'L2', name: 'Deposits & Accounts', description: 'Savings, checking, and term deposit management.',
            children: {
              'current-account': { level: 'L3', name: 'Current Account', description: 'Checking/current account management.' },
              'savings-account': { level: 'L3', name: 'Savings Account', description: 'Savings and interest-bearing account management.' },
              'term-deposit': { level: 'L3', name: 'Term Deposit', description: 'Fixed-term deposit management.' },
            },
          },
          'payments': {
            level: 'L2', name: 'Payments', description: 'Payment initiation, clearing, and settlement.',
            children: {
              'payment-initiation': { level: 'L3', name: 'Payment Initiation', description: 'Outgoing payment instruction processing.' },
              'payment-execution': { level: 'L3', name: 'Payment Execution', description: 'Payment clearing and routing.' },
              'ach-processing': { level: 'L3', name: 'ACH Processing', description: 'Automated clearing house batch processing.' },
              'wire-transfer': { level: 'L3', name: 'Wire Transfer', description: 'Real-time gross settlement transfers.' },
              'cross-border-payments': { level: 'L3', name: 'Cross-Border Payments', description: 'International payment and FX conversion.' },
            },
          },
          'lending': {
            level: 'L2', name: 'Lending', description: 'Loan origination, servicing, and collections.',
            children: {
              'loan-origination': { level: 'L3', name: 'Loan Origination', description: 'Application, underwriting, and approval.' },
              'mortgage-management': { level: 'L3', name: 'Mortgage Management', description: 'Residential and commercial mortgage lifecycle.' },
              'loan-servicing': { level: 'L3', name: 'Loan Servicing', description: 'Payment processing and account maintenance.' },
              'collections-recovery': { level: 'L3', name: 'Collections & Recovery', description: 'Delinquent loan management and recovery.' },
            },
          },
          'cards': {
            level: 'L2', name: 'Cards', description: 'Credit, debit, and prepaid card operations.',
            children: {
              'card-issuance': { level: 'L3', name: 'Card Issuance', description: 'New card production and delivery.' },
              'card-authorization': { level: 'L3', name: 'Card Authorization', description: 'Real-time transaction authorization.' },
              'card-settlement': { level: 'L3', name: 'Card Settlement', description: 'Merchant and network settlement.' },
              'dispute-management': { level: 'L3', name: 'Dispute Management', description: 'Chargeback and dispute resolution.' },
            },
          },
          'trade-finance': {
            level: 'L2', name: 'Trade Finance', description: 'Letters of credit, guarantees, and trade documentation.',
            children: {
              'letter-of-credit': { level: 'L3', name: 'Letter of Credit', description: 'LC issuance, amendment, and settlement.' },
              'bank-guarantee': { level: 'L3', name: 'Bank Guarantee', description: 'Guarantee issuance and claim management.' },
              'trade-documentation': { level: 'L3', name: 'Trade Documentation', description: 'Document collection and presentation.' },
            },
          },
          'investment-management': {
            level: 'L2', name: 'Investment Management', description: 'Wealth management and investment product services.',
            children: {
              'portfolio-management': { level: 'L3', name: 'Portfolio Management', description: 'Investment portfolio construction and rebalancing.' },
              'mutual-fund-admin': { level: 'L3', name: 'Mutual Fund Administration', description: 'Fund accounting, NAV calculation.' },
              'custody-services': { level: 'L3', name: 'Custody Services', description: 'Securities safekeeping and settlement.' },
            },
          },
          'treasury-operations': {
            level: 'L2', name: 'Treasury Operations', description: 'Liquidity management and funding.',
            children: {
              'cash-management': { level: 'L3', name: 'Cash Management', description: 'Cash position monitoring and forecasting.' },
              'liquidity-management': { level: 'L3', name: 'Liquidity Management', description: 'Reserve and buffer management.' },
              'funding-management': { level: 'L3', name: 'Funding Management', description: 'Short and long-term funding operations.' },
            },
          },
        },
      },
      'risk-and-compliance': {
        level: 'L1', name: 'Risk & Compliance', description: 'Enterprise risk management, regulatory compliance, and fraud prevention.',
        children: {
          'credit-risk': {
            level: 'L2', name: 'Credit Risk', description: 'Credit risk assessment, scoring, and monitoring.',
            children: {
              'credit-scoring': { level: 'L3', name: 'Credit Scoring', description: 'Borrower creditworthiness assessment.' },
              'credit-monitoring': { level: 'L3', name: 'Credit Monitoring', description: 'Ongoing credit exposure tracking.' },
              'credit-provisioning': { level: 'L3', name: 'Credit Provisioning', description: 'Expected credit loss calculation.' },
            },
          },
          'market-risk': {
            level: 'L2', name: 'Market Risk', description: 'Market risk measurement and hedging.',
            children: {
              'var-calculation': { level: 'L3', name: 'VaR Calculation', description: 'Value-at-risk computation and back-testing.' },
              'stress-testing': { level: 'L3', name: 'Stress Testing', description: 'Scenario-based portfolio stress analysis.' },
              'hedging-management': { level: 'L3', name: 'Hedging Management', description: 'Derivative hedging strategy execution.' },
            },
          },
          'operational-risk': {
            level: 'L2', name: 'Operational Risk', description: 'Operational risk events and loss tracking.',
            children: {
              'incident-management': { level: 'L3', name: 'Incident Management', description: 'Operational risk event capture and resolution.' },
              'risk-control-testing': { level: 'L3', name: 'Risk Control Testing', description: 'Control effectiveness assessment.' },
              'business-continuity': { level: 'L3', name: 'Business Continuity', description: 'BCP planning and disaster recovery.' },
            },
          },
          'regulatory-compliance': {
            level: 'L2', name: 'Regulatory Compliance', description: 'Regulatory reporting and compliance management.',
            children: {
              'regulatory-reporting': { level: 'L3', name: 'Regulatory Reporting', description: 'Basel, CCAR, and statutory reporting.' },
              'compliance-monitoring': { level: 'L3', name: 'Compliance Monitoring', description: 'Ongoing regulatory adherence monitoring.' },
              'policy-management': { level: 'L3', name: 'Policy Management', description: 'Internal policy lifecycle management.' },
            },
          },
          'aml-kyc': {
            level: 'L2', name: 'AML / KYC', description: 'Anti-money laundering and know-your-customer.',
            children: {
              'customer-due-diligence': { level: 'L3', name: 'Customer Due Diligence', description: 'KYC verification and risk categorization.' },
              'transaction-monitoring': { level: 'L3', name: 'Transaction Monitoring', description: 'Suspicious activity detection and alerting.' },
              'sanctions-screening': { level: 'L3', name: 'Sanctions Screening', description: 'PEP and sanctions list screening.' },
            },
          },
          'fraud-management': {
            level: 'L2', name: 'Fraud Management', description: 'Fraud detection, investigation, and prevention.',
            children: {
              'fraud-detection': { level: 'L3', name: 'Fraud Detection', description: 'Real-time fraud pattern recognition.' },
              'fraud-investigation': { level: 'L3', name: 'Fraud Investigation', description: 'Case management for suspected fraud.' },
              'fraud-prevention': { level: 'L3', name: 'Fraud Prevention', description: 'Proactive fraud rule and model management.' },
            },
          },
        },
      },
      'business-support': {
        level: 'L1', name: 'Business Support', description: 'Corporate strategy, finance, HR, IT, and shared services.',
        children: {
          'financial-management': {
            level: 'L2', name: 'Financial Management', description: 'General ledger, AP/AR, and financial control.',
            children: {
              'general-ledger': { level: 'L3', name: 'General Ledger', description: 'Chart of accounts and journal management.' },
              'accounts-payable': { level: 'L3', name: 'Accounts Payable', description: 'Vendor payment processing.' },
              'accounts-receivable': { level: 'L3', name: 'Accounts Receivable', description: 'Revenue collection and invoicing.' },
              'financial-control': { level: 'L3', name: 'Financial Control', description: 'Period close and reconciliation.' },
            },
          },
          'human-resources': {
            level: 'L2', name: 'Human Resources', description: 'Talent management, payroll, and workforce planning.',
            children: {
              'talent-acquisition': { level: 'L3', name: 'Talent Acquisition', description: 'Recruitment and hiring management.' },
              'payroll-management': { level: 'L3', name: 'Payroll Management', description: 'Salary and benefits processing.' },
              'workforce-planning': { level: 'L3', name: 'Workforce Planning', description: 'Capacity and succession planning.' },
            },
          },
          'it-management': {
            level: 'L2', name: 'IT Management', description: 'IT service management and infrastructure.',
            children: {
              'service-desk': { level: 'L3', name: 'Service Desk', description: 'IT support and incident management.' },
              'infrastructure-management': { level: 'L3', name: 'Infrastructure Management', description: 'Cloud and on-premise infrastructure.' },
              'application-development': { level: 'L3', name: 'Application Development', description: 'Software development lifecycle management.' },
              'cybersecurity': { level: 'L3', name: 'Cybersecurity', description: 'Security operations and threat management.' },
            },
          },
          'corporate-strategy': {
            level: 'L2', name: 'Corporate Strategy', description: 'Strategic planning and performance management.',
            children: {
              'strategic-planning': { level: 'L3', name: 'Strategic Planning', description: 'Long-term business strategy formulation.' },
              'performance-management': { level: 'L3', name: 'Performance Management', description: 'KPI tracking and balanced scorecard.' },
              'innovation-management': { level: 'L3', name: 'Innovation Management', description: 'Innovation pipeline and emerging technology.' },
            },
          },
          'legal-services': {
            level: 'L2', name: 'Legal Services', description: 'Legal counsel and contract management.',
            children: {
              'legal-counsel': { level: 'L3', name: 'Legal Counsel', description: 'Internal legal advisory services.' },
              'contract-management': { level: 'L3', name: 'Contract Management', description: 'Vendor and partnership contract lifecycle.' },
            },
          },
          'procurement': {
            level: 'L2', name: 'Procurement', description: 'Vendor management and purchasing.',
            children: {
              'vendor-management': { level: 'L3', name: 'Vendor Management', description: 'Vendor selection, evaluation, and relationships.' },
              'purchasing': { level: 'L3', name: 'Purchasing', description: 'Purchase order and requisition management.' },
            },
          },
        },
      },
    },
  }, null, 2);
}
