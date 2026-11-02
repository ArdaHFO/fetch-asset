import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { assertCanAudit, PlanLimitError } from '@/lib/stripe/limits'
import { auditSubmission } from '@/lib/ai/audit'
import type { AssetRequest, Submission } from '@/lib/supabase/types'

/**
 * POST /api/ai/audit
 * Body: { submissionId: string, token?: string }
 * Requires the project owner session or a valid portal token for that project.
 *
 * Fetches the submission + its asset_request, runs Llama 3.3 audit,
 * saves the result back to submissions.ai_audit_result, and
 * optionally auto-approves if quality_score >= 8.
 */
export async function POST(request: NextRequest) {
  let authorizedSubmissionId: string | null = null
  try {
    const body = await request.json()
    const { submissionId, token } = body as { submissionId?: string; token?: string }

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch submission
    const { data: subRow } = await (admin as any)
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (!subRow) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    }

    const submission = subRow as Submission

    // Enforce audit limit for project owner
    const { data: proj } = await (admin as any)
      .from('projects')
      .select('owner_id')
      .eq('id', submission.project_id)
      .single()
    if (!proj?.owner_id) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    let authorized = false
    if (typeof token === 'string' && token) {
      const { data: projectRows } = await (admin as any).rpc('get_project_by_token', { token })
      authorized = Array.isArray(projectRows) && projectRows.some((row: { id: string }) => row.id === submission.project_id)
    }
    if (!authorized) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      authorized = !!user && user.id === proj.owner_id
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    authorizedSubmissionId = submissionId
    if (proj.owner_id) {
      try {
        await assertCanAudit(proj.owner_id)
      } catch (limitErr) {
        if (limitErr instanceof PlanLimitError) {
          const { error: statusError } = await (admin as any).from('submissions').update({ ai_audit_status: 'error' }).eq('id', submissionId)
          if (statusError) throw statusError
          return NextResponse.json({ error: limitErr.message, code: limitErr.code }, { status: 403 })
        }
        throw limitErr
      }
    }

    // Fetch asset request
    const { data: reqRow } = await (admin as any)
      .from('asset_requests')
      .select('*')
      .eq('id', submission.asset_request_id)
      .eq('project_id', submission.project_id)
      .single()

    if (!reqRow) {
      return NextResponse.json({ error: 'Asset request not found.' }, { status: 404 })
    }

    const assetRequest = reqRow as AssetRequest

    // Mutate only after permission, quota and request checks pass.
    const { error: processingError } = await (admin as any)
      .from('submissions')
      .update({ ai_audit_status: 'processing' })
      .eq('id', submissionId)
    if (processingError) throw processingError

    // Run audit
    const result = await auditSubmission(assetRequest, submission)

    // Determine new status
    const newStatus = result.auto_approve && result.quality_score >= 8
      ? 'approved'
      : submission.status

    // Save result
    const { error: resultError } = await (admin as any)
      .from('submissions')
      .update({
        ai_audit_result: result as unknown as Record<string, unknown>,
        ai_audit_status: 'complete',
        status: newStatus,
      })
      .eq('id', submissionId)
    if (resultError) throw resultError

    return NextResponse.json({ success: true, result, submissionId })
  } catch (err) {
    console.error('[api/ai/audit] Error:', err)

    // The request body has already been consumed. Only mark an authorized item.
    if (authorizedSubmissionId) {
      try {
        const admin = createAdminClient()
        const { error: statusError } = await (admin as any)
          .from('submissions')
          .update({ ai_audit_status: 'error' })
          .eq('id', authorizedSubmissionId)
        if (statusError) throw statusError
      } catch (statusError) {
        console.error('[api/ai/audit] Failed to save error status:', statusError)
      }
    }

    const message = err instanceof Error ? err.message : 'Audit failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
