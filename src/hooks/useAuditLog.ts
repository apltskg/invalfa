import { supabase } from "@/integrations/supabase/client";

type AuditAction = 'match' | 'unmatch' | 'create_income' | 'link_folder' | 'auto_match';

export async function logAuditAction(params: {
  itemId: string;
  action: AuditAction;
  oldStatus?: string;
  newStatus?: string;
  matchedRecordId?: string;
  matchedRecordType?: 'income' | 'folder';
  details?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('invoice_audit_log' as any).insert({
      invoice_list_item_id: params.itemId,
      action: params.action,
      old_status: params.oldStatus || null,
      new_status: params.newStatus || null,
      matched_record_id: params.matchedRecordId || null,
      matched_record_type: params.matchedRecordType || null,
      user_id: user?.id || null,
      details: params.details || {},
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

export async function getAuditLog(itemId: string) {
  const { data } = await supabase
    .from('invoice_audit_log' as any)
    .select('*')
    .eq('invoice_list_item_id', itemId)
    .order('created_at', { ascending: false });
  return data || [];
}
