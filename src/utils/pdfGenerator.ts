import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SEOPage, AuditStats, AIInsightData, GEOResult } from '../types/seo.js';

export function generateSEOReportPDF(domain: string, pages: SEOPage[], stats: AuditStats, aiInsight: any, auditEndTime: number | null) {
  const doc = new jsPDF();
  
  // Custom font styling
  doc.setFont('helvetica');
  
  // Title / Header
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); 
  doc.text(`SEO Audit Report: ${domain.replace(/^https?:\/\/(www\.)?/, '')}`, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const reportDate = auditEndTime ? new Date(auditEndTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString();
  const wixDetected = pages.some(p => p.url.includes('wixsite')) ? 'Wix' : 'Custom/Other';
  doc.text(`Pages crawled: ${pages.length} | Platform: ${wixDetected} | Date: ${reportDate}`, 14, 30);
  
  let yPos = 45;

  // 1. Executive Summary
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Summary', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  
  // Look for our structured AI response or fallback to a generated summary
  let execSummary = "No executive summary available.";
  if (aiInsight) {
    execSummary = typeof aiInsight === 'string' ? aiInsight : (aiInsight.executiveSummary || "");
    // truncate if too long?
  } else {
    // Generate programmatic summary based on stats and pages
    const missingH1 = pages.filter(p => !p.headers || !p.headers.h1 || p.headers.h1.length === 0);
    const blankPages = pages.filter(p => p.url.match(/blank-/));
    const noSchema = pages.filter(p => !p.structuredData || p.structuredData.length === 0);
    
    execSummary = `The audit analyzed ${pages.length} pages. While foundational elements exist, several critical issues were identified:\n` +
      `1. ${missingH1.length} pages are missing H1 tags, the primary on-page ranking signal.\n` + 
      (blankPages.length > 0 ? `2. ${blankPages.length} blank or demo pages are diluting the crawl budget.\n` : '') +
      `3. ${noSchema.length}/${pages.length} pages are missing schema markup (e.g., FAQ, SoftwareApplication, etc.), leaving rich snippet features untapped.\n\n` + 
      `Addressing these areas will typically provide the highest SEO impact for the least technical effort.`;
  }
  
  const splitSummary = doc.splitTextToSize(execSummary, 180);
  doc.text(splitSummary, 14, yPos);
  yPos += (splitSummary.length * 5) + 12;

  // 2. Critical Issues
  const criticalPages = pages.filter(p => p.issues && p.issues.some(i => i.type === 'critical')).slice(0, 5);
  
  if (criticalPages.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Critical Issues', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 6,
      head: [['Page Path', 'Issue', 'Why It Matters', 'How to Fix']],
      body: criticalPages.flatMap(p => 
        p.issues.filter(i => i.type === 'critical').map(i => {
          let path = p.url;
          try {
            const u = new URL(p.url);
            path = u.pathname + u.search;
          } catch (e) {}
          path = path || '/';
          if (path.length > 50) path = path.substring(0, 47) + '...';
          path = path.replace(/([/?&=_.-])/g, '$1 ');
          return [
            path,
            i.message,
            'Severely impacts search visibility and crawler interpretation.',
            'Address immediately through CMS settings or page structure.'
          ];
        })
      ).slice(0, 6),
      headStyles: { fillColor: [225, 29, 72] }, // Rose color for critical
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: { 
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // 3. High Priority Issues
  const warningPages = pages.filter(p => p.issues && p.issues.some(i => i.type === 'warning')).slice(0, 5);
  if (warningPages.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('3. High Priority Issues', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 6,
      head: [['Page Path', 'Issue', 'Why It Matters', 'How to Fix']],
      body: warningPages.flatMap(p => 
        p.issues.filter(i => i.type === 'warning').map(i => {
          let path = p.url;
          try {
            const u = new URL(p.url);
            path = u.pathname + u.search;
          } catch (e) {}
          path = path || '/';
          if (path.length > 50) path = path.substring(0, 47) + '...';
          path = path.replace(/([/?&=_.-])/g, '$1 ');
          return [
            path,
            i.message,
            'Reduces potential rank capability or CTR in SERPs.',
            'Optimize content length, ensure proper tags, fix structure.'
          ];
        })
      ).slice(0, 8),
      headStyles: { fillColor: [245, 158, 11] }, // Amber color
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: { 
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // 4. Quick Wins
  if (yPos > 250) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Quick Wins & Improvements', 14, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const quickWins = [
    "- FAQ schema on feature pages â€” can become FAQ rich snippets with near-zero content change.",
    "- SoftwareApplication schema on homepage & pricing.",
    "- Article schema on all blog posts via JSON-LD injection.",
    "- Internal links from blog -> product pages.",
    "- Add visual + schema breadcrumbs to all feature/product pages."
  ];
  quickWins.forEach(win => {
    doc.text(win, 14, yPos);
    yPos += 6;
  });
  yPos += 8;

  // 5. Priority Action Plan
  if (yPos > 230) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Priority Action Plan', 14, yPos);

  let roadMapBody = [
    ['1', 'Noindex 404 / blank error pages', 'Critical', 'Low'],
    ['2', 'Add proper Title & Meta description to top pages', 'Critical', 'Low'],
    ['3', 'Add H1 tags to landing pages missing primary headings', 'Critical', 'Medium'],
    ['4', 'Fix missing alt text on critical graphics', 'High', 'Medium'],
    ['5', 'Implement SoftwareApplication / FAQ Schema', 'High', 'Medium'],
    ['6', 'Trim oversized meta descriptions', 'Medium', 'Low'],
  ];

  if (aiInsight && Array.isArray(aiInsight.criticalRoadmap)) {
    roadMapBody = aiInsight.criticalRoadmap.map((item: any, idx: number) => {
      return [(idx + 1).toString(), item.task || 'Optimize', item.impact || 'High', item.effort || 'Medium'];
    });
  }
  
  autoTable(doc, {
    startY: yPos + 6,
    head: [['#', 'Action', 'Impact', 'Effort']],
    body: roadMapBody,
    headStyles: { fillColor: [59, 130, 246] }, // Blue
    styles: { fontSize: 9, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 130 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 }
    }
  });
  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 6. Keyword Strategy & Optimization
  if (yPos > 200) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('6. Keyword Strategy & Optimization', 14, yPos);
  yPos += 8;
  
  if (stats.keywordGaps && stats.keywordGaps.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Identified Content Gaps:', 14, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Missing semantic coverage typically targeted by competitors: ${stats.keywordGaps.join(', ')}`, 14, yPos, { maxWidth: 180 });
    yPos += 12;
  }

  if (stats.topKeywords && stats.topKeywords.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Keywords & Density Analysis:', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 6,
      head: [['Keyword', 'Usage Count', 'Average Density']],
      body: stats.topKeywords.slice(0, 10).map((k: any) => [
        k.word,
        k.count.toString(),
        `${k.density}%`
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    yPos += 15;
  }

  // 7. Page-by-Page Summary
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('7. Page-by-Page Summary', 14, yPos);
  
  autoTable(doc, {
    startY: yPos + 6,
    head: [['Page Path', 'Score', 'Top Issue']],
    body: pages.map(p => {
      let path = p.url;
      try {
        const u = new URL(p.url);
        path = u.pathname + u.search;
      } catch (e) {}
      path = path || '/';
      if (path.length > 70) path = path.substring(0, 67) + '...';
      // Add spaces after punctuation to allow wrapping in PDF
      path = path.replace(/([/?&=_.-])/g, '$1 ');
      return [
        path,
        `${Math.round(p.score)}`,
        (p.issues && p.issues.length > 0) ? p.issues[0].message : 'Pass'
      ];
    }),
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 15 },
      2: { cellWidth: 85 }
    }
  });

  doc.save('seo-audit-report.pdf');
}

export function generateGEOAuditChecklistPDF(domain: string, geoResult?: GEOResult | null) {
  const doc = new jsPDF();
  
  // Custom font styling
  doc.setFont('helvetica');
  
  // Title / Header
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); 
  doc.text('GEO Audit Checklist & Action Plan', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated for: ${domain.replace(/^https?:\/\/(www\.)?/, '')} | Date: ${new Date().toLocaleDateString()}`, 14, 30);
  
  let yPos = 40;

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const intro = "After completing these audit activities, you should have a clear picture of which parts of your site/content are AI-ready (well-structured, relevant, likely to be used) and which parts need work.";
  const splitIntro = doc.splitTextToSize(intro, 180);
  doc.text(splitIntro, 14, yPos);
  yPos += (splitIntro.length * 5) + 8;

  let sections: any[] = [];

  if (geoResult && geoResult.recommendations && geoResult.recommendations.length > 0) {
    sections = geoResult.recommendations.map(rec => {
      // Extract the NOTE from the action items if any
      const items = rec.actionItems || [];
      const noteItem = items.find(item => item.startsWith('NOTE:'));
      const cleanItems = items.filter(item => !item.startsWith('NOTE:'));
      
      return {
        title: rec.title,
        priority: rec.priority,
        desc: rec.description,
        findings: rec.findings,
        items: cleanItems,
        note: noteItem ? noteItem.replace(/^NOTE?:\s*/, "") : ''
      };
    });
  } else {
    // Fallback if not passed
    sections = [
      {
        title: "Technical SEO & Crawling",
        priority: "High",
        desc: "This audit examines whether AI bots can access, crawl, and understand your website's content. Unlike traditional search engines that use web crawlers, AI systems like ChatGPT use specialized bots (GPTBot, ClaudeBot, etc.) that may be blocked by your current settings without you realizing it.",
        items: [
          "Check your robots.txt file to ensure GPTBot, ClaudeBot, and Bing's GPT-4 bot are allowed to crawl your site",
          "Verify your site loads in under 3 seconds on mobile (use PageSpeed Insights)",
          "Implement Article schema markup on all blog posts and guides",
          "Add FAQ schema to any content with question-and-answer sections",
          "Ensure your XML sitemap includes all important pages and submit it to Google Search Console",
          "Fix any 404 errors or broken internal links that could confuse AI crawlers",
          "Add structured data for your organization (name, logo, contact info) on your homepage"
        ],
        note: "Think of this as making sure AI systems can \"read\" your website properly. If they can't access or understand your content, you won't appear in any AI responses."
      },
      {
        title: "Content Strategy - Topic Coverage",
        priority: "High",
        desc: "This analyzes whether you have comprehensive content covering the topics your audience asks AI tools about. AI systems prefer to cite sources that cover topics thoroughly rather than those with scattered, incomplete information.",
        items: [
          "Search your target keywords in ChatGPT and Perplexity to see which brands get mentioned",
          "Create a content map showing which topics you cover well vs. gaps in your coverage",
          "Develop comprehensive guides for your 3-5 most important business topics",
          "Create \"ultimate guides\" or pillar pages for your core topics"
        ],
        note: "AI tools need to see you as a comprehensive source on your topics. Partial coverage means you'll lose citations to competitors with more complete information. Pro tip: Use a GEO tool like Genrank, so you can easily monitor prompts where you are mentioned (or not)."
      },
      {
        title: "Content Structure - Quality/Format",
        priority: "Medium",
        desc: "This evaluates whether your content is structured and formatted in ways that AI systems can easily parse, understand, and cite. AI tools prefer content with a clear hierarchy, credible sources, and easy-to-extract information.",
        items: [
          "Add 3-5 authoritative sources/citations to each major article",
          "Include expert quotes or statistics in your content (AI tools love citing specific data)",
          "Break up long paragraphs into shorter sections with clear subheadings",
          "Add bullet points and numbered lists for easy AI extraction",
          "Create executive summaries for long-form content (500+ words at the top)",
          "Add \"Key Takeaways\" sections that AI can easily quote",
          "Include author bylines with expertise credentials",
          "Implement FAQ sections within relevant articles and mark them up with schema",
          "Ensure your content directly answers questions (not just provides general information)"
        ],
        note: "Remember: AI systems are looking for quotable, citable content. Make it easy for them to extract and reference your information."
      },
      {
        title: "Brand Entity Info",
        priority: "Medium",
        desc: "This examines how consistently and authoritatively your brand appears across the web. AI systems build an understanding of your company by cross-referencing multiple sources, so inconsistent information weakens your entity's strength.",
        items: [
          "Audit your company information across Crunchbase, LinkedIn, Wikipedia, and industry directories",
          "Ensure consistent company description, founding date, team size, and location everywhere",
          "Create or update your Google Business Profile with complete information",
          "Establish a Wikipedia presence (if eligible) or contribute to Wikidata",
          "Get your executives mentioned in industry publications and podcasts",
          "Ensure your team members have updated LinkedIn profiles mentioning your company",
          "Monitor how AI tools currently describe your brand using brand visibility tracking",
          "Fix any conflicting information about your company size, services, or history"
        ],
        note: "AI systems are essentially building a \"profile\" of your company. These systems have an obsessive need to consolidate the same data about your brand. Any Inconsistent information makes you appear less authoritative and trustworthy."
      },
      {
        title: "Off-site Reputation",
        priority: "Low",
        desc: "This tracks what others say about your brand across forums, reviews, social media, and news outlets. This is essentially almost the same principle as link building in SEO. The difference is where you get cited.",
        items: [
          "Set up Google Alerts for your brand name and key executives",
          "Monitor discussions about your company on Reddit, Quora, and industry forums",
          "Respond professionally to negative reviews or complaints (AI tools may cite these)",
          "Encourage satisfied customers to leave detailed reviews mentioning specific benefits",
          "Participate in industry discussions where you can add genuine value",
          "Publish thought leadership content on platforms that AI systems frequently crawl",
          "Build relationships with industry publications for positive coverage",
          "Implement AI agent workflows to maintain a consistent thought leadership presence"
        ],
        note: "Think of this as your \"digital reputation management\" for AI systems. What others say about you significantly influences how AI tools present your brand. Although this is marked as \"low\" priority, it is actually just as important as the other items on the checklist. However, this is currently marked as low due to the task's difficulty."
      }
    ];
  }

  sections.forEach((section, index) => {
    // Check if we need to add a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}. ${section.title}`, 14, yPos);
    
    // Priority badge approximation
    doc.setFontSize(9);
    if (section.priority === 'High') doc.setTextColor(220, 38, 38);
    else if (section.priority === 'Medium') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(37, 99, 235);
    doc.text(`Priority: ${section.priority}`, 170, yPos);
    
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(section.desc, 180);
    doc.text(splitDesc, 14, yPos);
    yPos += (splitDesc.length * 5) + 5;

    if (section.findings) {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text("Live Audit Findings:", 14, yPos);
      yPos += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42); // slate-900
      const splitFindings = doc.splitTextToSize(section.findings, 180);
      doc.text(splitFindings, 14, yPos);
      yPos += (splitFindings.length * 5) + 5;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Specific action items:", 14, yPos);
    yPos += 6;

    // Checkbox items
    doc.setFont("helvetica", "normal");
    section.items.forEach(item => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      // Checkbox square
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.rect(14, yPos - 3.5, 4, 4);
      
      doc.setTextColor(51, 65, 85); // slate-700
      const splitItem = doc.splitTextToSize(item, 170);
      doc.text(splitItem, 21, yPos);
      yPos += (splitItem.length * 5) + 3;
    });
    
    yPos += 3;
    
    if (yPos > 270) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139); // slate-500
    const splitNote = doc.splitTextToSize(section.note, 180);
    doc.text(splitNote, 14, yPos);
    yPos += (splitNote.length * 5) + 12;
  });

  doc.save('geo-audit-checklist.pdf');
}

