import { supabase } from "@/integrations/supabase/client";
import { ExtractedData } from "@/types/database";
import { toast } from "sonner";

export interface ExtractionResult {
  extracted: ExtractedData | null;
  diagnostics: {
    model?: string;
    duration_ms?: number;
    confidence?: number;
    raw_args?: string;
    is_fallback?: boolean;
    retry_count?: number;
  };
}

interface RunExtractionOptions {
  filePath: string;
  fileName: string;
  fallbackMode?: boolean;
  maxRetries?: number;
}

const BACKOFF_BASE_MS = 2000; // 2s, 4s, 8s...
const MAX_BACKOFF_MS = 16000;

/**
 * Run AI extraction with automatic retry on 429 and fallback for low confidence.
 */
export async function runExtractionWithRetry({
  filePath,
  fileName,
  fallbackMode = false,
  maxRetries = 3,
}: RunExtractionOptions): Promise<ExtractionResult> {
  let retryCount = 0;
  let lastError: string | null = null;

  while (retryCount <= maxRetries) {
    try {
      const startTime = Date.now();
      
      const response = await supabase.functions.invoke('extract-invoice', {
        body: { filePath, fileName, fallbackMode }
      });

      const duration_ms = Date.now() - startTime;

      // Handle rate limit (429)
      if (response.error?.message?.includes('429') || 
          (response.data as any)?.code === 'RATE_LIMIT') {
        retryCount++;
        if (retryCount <= maxRetries) {
          const backoffMs = Math.min(BACKOFF_BASE_MS * Math.pow(2, retryCount - 1), MAX_BACKOFF_MS);
          toast.info(`Υπερβολικά πολλά αιτήματα. Επανάληψη σε ${backoffMs / 1000}s...`, {
            duration: backoffMs,
          });
          await sleep(backoffMs);
          continue;
        }
        throw new Error('Rate limit exceeded after retries');
      }

      // Handle credits exhausted (402)
      if (response.error?.message?.includes('402') || 
          (response.data as any)?.code === 'CREDITS_EXHAUSTED') {
        toast.error('Τα AI credits εξαντλήθηκαν. Προσθέστε credits στο Lovable Cloud.', {
          duration: 8000,
        });
        return {
          extracted: null,
          diagnostics: { duration_ms, retry_count: retryCount },
        };
      }

      // Handle other errors
      if (response.error) {
        console.error('Extraction error:', response.error);
        throw new Error(response.error.message || 'Extraction failed');
      }

      // Parse response
      const rawData = response.data as any;
      const extracted = (rawData?.extracted || rawData) as ExtractedData;
      const confidence = extracted?.confidence ?? rawData?._diagnostics?.confidence;

      const diagnostics = {
        model: rawData?._diagnostics?.model || (fallbackMode ? 'gemini-2.5-pro' : 'gemini-3-flash-preview'),
        duration_ms: rawData?._diagnostics?.duration_ms || duration_ms,
        confidence,
        raw_args: rawData?._diagnostics?.raw_args || JSON.stringify(extracted),
        is_fallback: fallbackMode,
        retry_count: retryCount,
      };

      // Auto-fallback: if confidence < 0.6 and not already in fallback mode, retry with pro model
      if (!fallbackMode && confidence !== undefined && confidence < 0.6 && retryCount < maxRetries) {
        console.log('[EXTRACTION] Low confidence, auto-falling back to pro model...');
        toast.info('Χαμηλή ακρίβεια. Επανάληψη με Pro model...', { duration: 3000 });
        
        return runExtractionWithRetry({
          filePath,
          fileName,
          fallbackMode: true,
          maxRetries: 1, // Only one fallback attempt
        });
      }

      return { extracted, diagnostics };

    } catch (error: any) {
      lastError = error.message || 'Unknown error';
      retryCount++;
      
      if (retryCount <= maxRetries) {
        const backoffMs = Math.min(BACKOFF_BASE_MS * Math.pow(2, retryCount - 1), MAX_BACKOFF_MS);
        console.log(`[EXTRACTION] Retry ${retryCount}/${maxRetries} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
  }

  // All retries exhausted
  toast.error(`Αποτυχία εξαγωγής: ${lastError}`, { duration: 5000 });
  return {
    extracted: null,
    diagnostics: { retry_count: retryCount },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
