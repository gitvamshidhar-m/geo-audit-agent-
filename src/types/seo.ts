export interface KeywordDensity {
  word: string;
  count: number;
  density: number;
}

export interface SEOPage {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  statusCode: number;
  loadTime: number;
  images: SEOImage[];
  canonical: string;
  robots: string;
  ogTags: Record<string, string>;
  structuredData: any[];
  links: {
    internal: string[];
    external: string[];
  };
  headers: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  score: number;
  issues: SEOIssue[];
  performance: SEOPerformance;
  keywords: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  topics?: string[];
  keywordDensity?: KeywordDensity[];
  textToCodeRatio: number;
  imageMetrics: {
    total: number;
    missingAlt: number;
    missingAltPercent: number;
    genericAlt: number;
  };
  geoScore?: number;
  geoAudit?: GEOResult;
  bodyText?: string;
  aiPlagiarism?: AIPlagiarismResult;
}

export interface AIPlagiarismResult {
  aiPercentage: number;
  uniquenessIndex: number;
  clicheDensity: number;
  detectedCliches: string[];
  isHumanAuthentic: boolean;
  verdict: string;
  findings: string;
  rewrites: { original: string; suggested: string; benefit: string }[];
  detectedTone: string;
  toneAnalysis: string;
  toneScores: { dimension: string; score: number }[];
  genericAiScore?: number;
  hallucinatedFactsScore?: number;
  noExpertReviewScore?: number;
  massProducedSeoScore?: number;
  riskFindings?: { riskName: string; score: number; explanation: string; solution: string }[];
}

export interface GEODimension {
  name: string;
  score: number;
  description: string;
}

export interface GEOResult {
  bvs: number; // Brand Visibility Score
  dimensions: GEODimension[];
  engines: string[];
  recommendations: {
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    actionItems?: string[];
    findings?: string;
  }[];
}

export interface SEOPerformance {
  performanceScore: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  tbt: number; // Total Blocking Time
}

export interface SEOImage {
  src: string;
  alt: string;
  isMissingAlt: boolean;
  altQuality: 'good' | 'generic' | 'missing';
}

export interface SEOIssue {
  type: "critical" | "warning" | "info";
  message: string;
  category: "on-page" | "technical" | "content";
}

export interface AuditStats {
  totalPages: number;
  averageScore: number;
  criticalIssues: number;
  warningIssues: number;
  totalLinks: number;
  hasRobots: boolean;
  hasSitemap: boolean;
  topInternalPages: { url: string; count: number }[];
  topKeywords?: { word: string; count: number; density?: number }[];
  keywordGaps?: string[];
  geoScore?: number;
  seoVisibilityScore?: number;
  geoDirectives?: string[];
  wordCountDistribution?: {
    thin: number;
    standard: number;
    rich: number;
  };
  totalHeadings?: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  headingHealth?: {
    missingH1: number;
    multipleH1: number;
    healthy: number;
  };
  structuredDataCoverage?: number;
  socialGraphCoverage?: number;
  imageAltCoverage?: number;
  brokenLinksCount?: number;
  duplicateTitleCount?: number;
  duplicateDescriptionCount?: number;
  duplicateContentCount?: number;
  sentimentTrend?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topicalClusters?: { cluster: string; weight: number }[];
  aiRecognitionScore?: number;
  globalTechnicalHealth?: {
    robotsTxtExists: boolean;
    sitemapExists: boolean;
    hasSitemapInRobots: boolean;
    secureProtocol: boolean;
  };
  sitemapUrls?: string[];
  loadTimeDistribution?: {
    fast: number;
    moderate: number;
    slow: number;
  };
  optimizationRoadmap?: {
    category: string;
    tasks: { task: string; priority: 'High' | 'Medium' | 'Low'; description: string }[];
  }[];
}

export interface AIInsightData {
  executiveSummary: string;
  marketPosition: string;
  criticalRoadmap: {
    task: string;
    impact: string;
    effort: string;
    description: string;
    category?: string;
  }[];
  technicalAudit: {
    score: number;
    findings: string[];
    recommendation: string;
  };
  contentStrategy: {
    status: string;
    improvements: string[];
    suggestedMeta: { title: string; description: string };
  };
  semanticClusterAnalysis?: {
    topEntities: string[];
    contentGaps: string[];
    brandVibe: string;
  };
  geoStrategy?: {
    citationReadiness: string;
    informationGain: string[];
    schemaEffectiveness: string;
    actionableFixes: string[];
    detailedBreakdown?: GEOResult;
  };
  experimentationStrategy?: {
    hypotheses: {
      observation: string;
      hypothesis: string;
      metric: string;
    }[];
    abTests: {
      testName: string;
      description: string;
      expectedImpact: string;
      difficulty: string;
    }[];
  };
  marketIntelligence?: {
    targetAudienceGaps: string[];
    campaignOpportunities: {
      campaignName: string;
      description: string;
      targetChannels: string[];
      expectedOutcome: string;
    }[];
    messagingRefinements: {
      currentProblem: string;
      proposedMessaging: string;
      reasoning: string;
    }[];
    competitivePositioning?: {
      marketDifferentiator: string;
      threats: string[];
      opportunities: string[];
    };
    buyerPersonas?: {
      personaName: string;
      painPoints: string[];
      contentPreferences: string[];
    }[];
    pricingStrategy?: string;
  };
  detailedActionPlan?: {
    technical: string[];
    content: string[];
    ux: string[];
  };
  fullReport?: {
    priorityActionPlan: { id: number; action: string; impact: string; effort: string }[];
    criticalIssues: { url: string; issue: string; why: string; howToFix: string }[];
    highPriority: { url: string; issue: string; why: string; howToFix: string }[];
    quickWins: string[];
    pageSummary: { url: string; score: number; topIssue: string }[];
  };
}
