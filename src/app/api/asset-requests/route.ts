import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertCanAddRequest, PlanLimitError } from '@/lib/stripe/limits'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Verify the caller is authenticated and return their user id.
 */
async function getAuthUserId(): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * POST /api/asset-requests
 * Insert a new asset request. Uses admin client so RLS is bypassed.
 * Validates that the caller owns the project before inserting.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { project_id, ...rest } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const admin = createAdminClient() as any

    // Verify caller owns the project
    const { data: project, error: projErr } = await admin
      .from('projects')
      .select('id, owner_id')
      .eq('id', project_id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await assertCanAddRequest(userId, project_id)

    // Insert the asset request
    const { data, error } = await admin
      .from('asset_requests')
      .insert({ project_id, ...rest })
      .select()
      .single()

    if (error) {
      console.error('[asset-requests POST] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 })
    }
    console.error('[asset-requests POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/asset-requests?id=xxx
 * Delete an asset request. Uses admin client so RLS is bypassed.
 * Validates that the caller owns the parent project before deleting.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient() as any

    // Fetch the request to get project_id, then verify ownership
    const { data: assetReq, error: fetchErr } = await admin
      .from('asset_requests')
      .select('id, project_id')
      .eq('id', id)
      .single()

    if (fetchErr || !assetReq) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 })
    }

    const { data: project } = await admin
      .from('projects')
      .select('owner_id')
      .eq('id', assetReq.project_id)
      .single()

    if (!project || project.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('asset_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[asset-requests DELETE] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[asset-requests DELETE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
