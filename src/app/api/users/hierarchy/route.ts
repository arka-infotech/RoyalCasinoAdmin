import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backendProxy';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const superDistributorId = searchParams.get('super_distributor_id');
    const distributorId = searchParams.get('distributor_id');
    const parentId = searchParams.get('parent_id');
    const role = searchParams.get('role');

    let backendPath = '/api/users/hierarchy';
    let responseKey = 'options';

    if (distributorId) {
      backendPath = `/api/users/hierarchy?parent_id=${encodeURIComponent(distributorId)}&role=retailer`;
      responseKey = 'retailers';
    } else if (superDistributorId) {
      backendPath = `/api/users/hierarchy?parent_id=${encodeURIComponent(superDistributorId)}&role=distributor`;
      responseKey = 'distributors';
    } else if (parentId) {
      const roleQ = role ? `&role=${encodeURIComponent(role)}` : '';
      backendPath = `/api/users/hierarchy?parent_id=${encodeURIComponent(parentId)}${roleQ}`;
      responseKey = 'options';
    } else {
      // Top-level cascade: super distributors
      backendPath = '/api/users/hierarchy?role=super_distributor';
      responseKey = 'superDistributors';
    }

    const res = await backendFetch(backendPath);
    const data = await res.json();

    if (!res.ok || !data.success) {
      return NextResponse.json(data, { status: res.status });
    }

    const options = (data.data?.options ?? []) as Array<{
      id: string;
      username: string;
      commissionRate?: number;
    }>;

    const mapped = options.map((o) => ({
      id: o.id,
      username: o.username,
      commission_rate: o.commissionRate ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: { [responseKey]: mapped },
    });
  } catch (error) {
    console.error('Hierarchy proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Backend unavailable' },
      { status: 503 },
    );
  }
}
