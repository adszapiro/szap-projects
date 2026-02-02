/**
 * Research Paper Manager
 * Handles PDF storage, extraction, and strategy deployment
 */

import { getSupabase, savePaper, updatePaperStatus, getPaper, getAllPapers, getStrategiesByPaper, initializeStrategyPerformance } from "../db.js";
import { extractStrategiesFromText, extractStrategiesFromKeyIdeas, validateStrategyCode } from "./extractor.js";
import { PaperMetadata, ExtractedStrategy, KNOWN_PAPERS, PaperSource } from "./types.js";

// PDF parsing (using pdf-parse if available)
let pdfParse: any;
try {
  pdfParse = require("pdf-parse");
} catch {
  console.log("pdf-parse not available, PDF upload disabled");
}

/**
 * Add a new research paper to the database
 */
export async function addPaper(params: {
  url?: string;
  title: string;
  authors?: string[];
  year?: number;
  source?: PaperSource;
  abstract?: string;
  keyInsights?: string[];
}): Promise<string> {
  const paperId = await savePaper({
    title: params.title,
    authors: params.authors || [],
    year: params.year,
    source: params.source || "other",
    pdf_url: params.url,
    abstract: params.abstract,
    key_insights: params.keyInsights || [],
  });

  console.log(`📄 Added paper: "${params.title}" (${paperId})`);
  return paperId;
}

/**
 * Add a paper from the known papers list
 */
export async function addKnownPaper(title: string): Promise<string | null> {
  const paper = KNOWN_PAPERS.find(p => 
    p.title.toLowerCase().includes(title.toLowerCase()) ||
    title.toLowerCase().includes(p.title.toLowerCase())
  );

  if (!paper) {
    console.log(`Paper not found in known list: ${title}`);
    return null;
  }

  return addPaper({
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    source: paper.source,
    url: paper.url,
    keyInsights: paper.keyIdeas,
  });
}

/**
 * Add all known papers to the database
 */
export async function addAllKnownPapers(): Promise<string[]> {
  const ids: string[] = [];
  
  for (const paper of KNOWN_PAPERS) {
    // Check if already exists
    const existing = await getAllPapers();
    const exists = existing.some(p => 
      p.title.toLowerCase() === paper.title.toLowerCase()
    );

    if (exists) {
      console.log(`⏭️  Skipping "${paper.title}" (already exists)`);
      continue;
    }

    const id = await addPaper({
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      source: paper.source,
      url: paper.url,
      keyInsights: paper.keyIdeas,
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Upload and parse a PDF file
 */
export async function uploadPDF(
  paperId: string,
  pdfBuffer: Buffer
): Promise<string> {
  if (!pdfParse) {
    throw new Error("PDF parsing not available. Install pdf-parse.");
  }

  // Parse PDF
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;

  // Store in Supabase storage
  const storagePath = `papers/${paperId}.pdf`;
  const { error: uploadError } = await getSupabase()
    .storage
    .from("research-papers")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
    });

  if (uploadError) {
    console.error("Failed to upload PDF:", uploadError);
  } else {
    // Update paper record with storage path
    await getSupabase()
      .from("research_papers")
      .update({ pdf_storage_path: storagePath })
      .eq("id", paperId);
  }

  return text;
}

/**
 * Extract strategies from a paper
 */
export async function extractStrategies(
  paperId: string
): Promise<ExtractedStrategy[]> {
  const paper = await getPaper(paperId);
  if (!paper) {
    throw new Error(`Paper not found: ${paperId}`);
  }

  console.log(`🔬 Extracting strategies from: "${paper.title}"`);

  let strategies: ExtractedStrategy[] = [];

  // If we have key insights, use those (faster, cheaper)
  if (paper.key_insights && paper.key_insights.length > 0) {
    strategies = await extractStrategiesFromKeyIdeas(
      paper.key_insights,
      {
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        source: paper.source as PaperSource,
      }
    );
  }
  // TODO: If we have PDF text, use that
  // else if (paper.pdf_storage_path) { ... }

  // Update paper status
  await updatePaperStatus(paperId, "extracted");

  console.log(`   Found ${strategies.length} strategies`);
  return strategies;
}

/**
 * Deploy extracted strategies to the tournament
 */
export async function deployStrategies(
  paperId: string,
  strategies: ExtractedStrategy[]
): Promise<string[]> {
  const strategyIds: string[] = [];
  const paper = await getPaper(paperId);

  for (const strategy of strategies) {
    // Validate code
    const validation = validateStrategyCode(strategy.code);
    if (!validation.valid) {
      console.log(`   ⚠️ Invalid strategy "${strategy.name}": ${validation.error}`);
      continue;
    }

    // Determine asset class
    const assetClass = strategy.assetClass === "both" 
      ? "stock"  // Default to stock for "both"
      : strategy.assetClass;

    // Insert strategy
    const { data, error } = await getSupabase()
      .from("strategies")
      .insert({
        name: strategy.name,
        description: `${strategy.description} | Paper: ${paper?.title || "Unknown"}`,
        code: strategy.code,
        source_model: "claude-extraction",
        status: "deployed",
        asset_class: assetClass,
        symbols: strategy.symbols,
        paper_id: paperId,
      })
      .select("id")
      .single();

    if (error) {
      console.log(`   ❌ Failed to deploy "${strategy.name}": ${error.message}`);
      continue;
    }

    // Initialize performance tracking (for bandit)
    await initializeStrategyPerformance(data.id);

    strategyIds.push(data.id);
    console.log(`   ✓ Deployed: ${strategy.name}`);
  }

  // Update paper status
  if (strategyIds.length > 0) {
    await updatePaperStatus(paperId, "active");
  }

  return strategyIds;
}

/**
 * Full pipeline: Add paper → Extract strategies → Deploy
 */
export async function processPaper(params: {
  title: string;
  authors?: string[];
  year?: number;
  source?: PaperSource;
  keyInsights?: string[];
  pdfBuffer?: Buffer;
}): Promise<{
  paperId: string;
  strategyIds: string[];
}> {
  // 1. Add paper
  const paperId = await addPaper(params);

  // 2. Upload PDF if provided
  if (params.pdfBuffer) {
    await uploadPDF(paperId, params.pdfBuffer);
  }

  // 3. Extract strategies
  const strategies = await extractStrategies(paperId);

  // 4. Deploy strategies
  const strategyIds = await deployStrategies(paperId, strategies);

  return { paperId, strategyIds };
}

/**
 * Get paper statistics
 */
export async function getPaperStats(): Promise<{
  totalPapers: number;
  activePapers: number;
  pendingPapers: number;
  totalStrategies: number;
}> {
  const papers = await getAllPapers();
  
  let totalStrategies = 0;
  for (const paper of papers) {
    const strategies = await getStrategiesByPaper(paper.id);
    totalStrategies += strategies.length;
  }

  return {
    totalPapers: papers.length,
    activePapers: papers.filter(p => p.status === "active").length,
    pendingPapers: papers.filter(p => p.status === "pending").length,
    totalStrategies,
  };
}

/**
 * List all papers with their strategies
 */
export async function listPapersWithStrategies(): Promise<Array<{
  paper: any;
  strategies: any[];
}>> {
  const papers = await getAllPapers();
  const results = [];

  for (const paper of papers) {
    const strategies = await getStrategiesByPaper(paper.id);
    results.push({ paper, strategies });
  }

  return results;
}
