import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendNewSubmissionToAgency,
  sendSubmissionConfirmToClient,
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const token = formData.get('token') as string | null
    const requestId = formData.get('requestId') as string | null
    const projectId = formData.get('projectId') as string | null
    const clientName = (formData.get('clientName') as string | null) ?? 'Client'
    const clientNote = (formData.get('clientNote') as string | null) ?? null
    const requestType = formData.get('requestType') as string | null
    const valueText = formData.get('valueText') as string | null
    const file = formData.get('file') as File | null

    // Basic validation
    if (!token || !requestId || !projectId || !requestType) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the token still matches the project
    const { data: projectRows } = await (admin as any).rpc('get_project_by_token', { token })
    if (!Array.isArray(projectRows) || projectRows.length === 0 || projectRows[0].id !== projectId) {
      return NextResponse.json({ error: 'Invalid or expired portal link.' }, { status: 403 })
    }

    // Bind the request and its rules to the project authorized by the portal token.
    const { data: assetReqForValidation, error: requestError } = await (admin as any)
      .from('asset_requests')
      .select('request_type, allowed_file_types, max_file_size_mb')
      .eq('id', requestId)
      .eq('project_id', projectId)
      .single()

    if (requestError || !assetReqForValidation) {
      return NextResponse.json({ error: 'Asset request not found in this project.' }, { status: 404 })
    }
    if (requestType !== assetReqForValidation.request_type) {
      return NextResponse.json({ error: 'Invalid request type.' }, { status: 400 })
    }
    if (requestType === 'file' && (!file || typeof file.arrayBuffer !== 'function')) {
      return NextResponse.json({ error: 'Please provide a file.' }, { status: 400 })
    }

    // Enforce upload rules before reading or storing the file.
    if (requestType === 'file' && file) {
      const maxSizeMb = assetReqForValidation.max_file_size_mb
      if (maxSizeMb != null && file.size > maxSizeMb * 1024 * 1024) {
        return NextResponse.json({ error: `File exceeds the ${maxSizeMb} MB limit.` }, { status: 400 })
      }
      const allowedExts = assetReqForValidation.allowed_file_types as string[] | null
      if (allowedExts && allowedExts.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const ok  = allowedExts.some(
          (t: string) => t.toLowerCase() === ext || (file.type && file.type.toLowerCase().includes(t.toLowerCase()))
        )
        if (!ok) {
          return NextResponse.json(
            { error: `Invalid file type ".${ext}". Allowed: ${allowedExts.join(', ')}` },
            { status: 400 }
          )
        }
      }
    }
    let filePath: string | null = null
    let fileName: string | null = null
    let fileSizeBytes: number | null = null
    let fileMimeType: string | null = null

    if (requestType === 'file' && file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${projectId}/${requestId}/${Date.now()}_${safeName}`

      const { error: uploadError } = await admin.storage
        .from('submissions')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('[portal/submit] Storage upload error:', uploadError.message)
        return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 })
      }

      // Smart file naming: if naming_rule is enabled on this asset request,
      // generate a professional filename for display purposes.
      // Storage path stays the same (original); we just update what's shown.
      let displayFileName = file.name
      try {
        const { data: assetReqForName } = await (admin as any)
          .from('asset_requests')
          .select('title, naming_rule')
          .eq('id', requestId)
          .single()

        if (assetReqForName?.naming_rule) {
          const { data: projForName } = await (admin as any)
            .from('projects')
            .select('title, client_name')
            .eq('id', projectId)
            .single()

          if (projForName) {
            const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            const slug = (s: string) =>
              s.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)

            const clientSlug  = slug(projForName.client_name ?? clientName ?? 'Client')
            const assetSlug   = slug(assetReqForName.title ?? 'Asset')
            const projectSlug = slug(projForName.title ?? 'Project')

            displayFileName = ext
              ? `${clientSlug}_${assetSlug}_${projectSlug}_${dateStr}.${ext}`
              : `${clientSlug}_${assetSlug}_${projectSlug}_${dateStr}`
          }
        }
      } catch (nameErr) {
        console.warn('[portal/submit] Smart naming error (non-fatal):', nameErr)
      }

      filePath = storagePath
      fileName = displayFileName
      fileSizeBytes = file.size
      fileMimeType = file.type
    } else if (requestType !== 'file' && !valueText) {
      return NextResponse.json({ error: 'Please provide a value.' }, { status: 400 })
    }

    // Upsert submission (one per asset_request — replace if already submitted)
    const { data: existingSub } = await (admin as any)
      .from('submissions')
      .select('id')
      .eq('asset_request_id', requestId)
      .eq('project_id', projectId)
      .maybeSingle()

    let submissionId: string

    if (existingSub?.id) {
      // Update existing submission
      const updatePayload: Record<string, unknown> = {
        client_name: clientName,
        client_note: clientNote,
        status: 'pending_review',
        ai_audit_status: 'pending',
        ai_audit_result: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      }
      if (requestType === 'file') {
        Object.assign(updatePayload, { file_name: fileName, file_path: filePath, file_size_bytes: fileSizeBytes, file_mime_type: fileMimeType, file_url: null, value_text: null })
      } else {
        Object.assign(updatePayload, { value_text: valueText, file_name: null, file_path: null, file_size_bytes: null, file_mime_type: null, file_url: null })
      }
      const { error: updateError } = await (admin as any).from('submissions').update(updatePayload).eq('id', existingSub.id)
      if (updateError) {
        console.error('[portal/submit] Submission update error:', updateError.message)
        return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 })
      }
      submissionId = existingSub.id
    } else {
      // Insert new submission
      const insertPayload: Record<string, unknown> = {
        asset_request_id: requestId,
        project_id: projectId,
        client_name: clientName,
        client_note: clientNote,
        status: 'pending_review',
        ai_audit_status: 'pending',
      }
      if (requestType === 'file') {
        Object.assign(insertPayload, { file_name: fileName, file_path: filePath, file_size_bytes: fileSizeBytes, file_mime_type: fileMimeType })
      } else {
        Object.assign(insertPayload, { value_text: valueText })
      }
      const { data: newSub, error: insertErr } = await (admin as any)
        .from('submissions')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insertErr) {
        console.error('[portal/submit] Submission insert error:', insertErr.message)
        return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 })
      }
      submissionId = newSub.id
    }

    // Fire-and-forget AI audit (non-blocking — client gets response immediately)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${appUrl}/api/ai/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, token }),
    }).catch((err) => console.error('[portal/submit] Audit trigger failed:', err))

    // Fire-and-forget emails
    ;(async () => {
      try {
        const [{ data: proj }, { data: req }] = await Promise.all([
          (admin as any)
            .from('projects')
            .select('title, client_email, client_name, magic_token, owner_id')
            .eq('id', projectId)
            .single(),
          (admin as any)
            .from('asset_requests')
            .select('title')
            .eq('id', requestId)
            .single(),
        ])

        if (!proj || !req) return

        const portalUrl = `${appUrl}/portal/${proj.magic_token}`
        const projectUrl = `${appUrl}/projects/${projectId}`

        // Get agency email from auth
        const { data: agencyUser } = await admin.auth.admin.getUserById(proj.owner_id)
        const agencyEmail = agencyUser?.user?.email

        await Promise.allSettled([
          agencyEmail
            ? sendNewSubmissionToAgency({
                agencyEmail,
                clientName: clientName ?? proj.client_name ?? 'Client',
                projectTitle: proj.title,
                requestTitle: req.title,
                projectUrl,
              })
            : Promise.resolve(),
          proj.client_email
            ? sendSubmissionConfirmToClient({
                clientEmail: proj.client_email,
                clientName: clientName ?? proj.client_name ?? 'Client',
                projectTitle: proj.title,
                requestTitle: req.title,
                portalUrl,
                agencyEmail: agencyEmail ?? undefined,
              })
            : Promise.resolve(),
        ])
      } catch (err) {
        console.error('[portal/submit] Email error:', err)
      }
    })()

    return NextResponse.json({ success: true, submissionId })
  } catch (err) {
    console.error('[portal/submit] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
