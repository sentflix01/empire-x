import client from './client';

export interface PartnerProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  images?: string;
}

export interface ProfilePartnership {
  id: string;
  share_code: string;
  profile_owner_id: string;
  profile_owner_name: string;
  business_owner_id?: string;
  business_id: string;
  business_name: string;
  business_logo_url?: string;
  business_description?: string;
  commission_rate: number | string;
  status: 'pending' | 'active' | 'declined' | 'terminated' | 'expired';
  starts_at: string;
  ends_at: string;
  products?: PartnerProduct[];
}

export const profilePartnershipsApi = {
  async mine(): Promise<ProfilePartnership[]> {
    const { data } = await client.get('/api/profile-partnerships/mine');
    return data.partnerships ?? [];
  },
  async forProfile(userId: string): Promise<ProfilePartnership[]> {
    const { data } = await client.get(`/api/profile-partnerships/profile/${userId}`);
    return data.partnerships ?? [];
  },
  async products(businessId: string): Promise<PartnerProduct[]> {
    const { data } = await client.get(`/api/profile-partnerships/business/${businessId}/products`);
    return data.products ?? [];
  },
  async create(input: { business_id: string; profile_owner_id: string; commission_rate: number; ends_at: string; product_ids: string[] }) {
    const { data } = await client.post('/api/profile-partnerships', input);
    return data.partnership as ProfilePartnership;
  },
  async accept(id: string) { return client.put(`/api/profile-partnerships/${id}/accept`); },
  async decline(id: string) { return client.put(`/api/profile-partnerships/${id}/decline`); },
  async terminate(id: string) { return client.put(`/api/profile-partnerships/${id}/terminate`); },
  async commissions() {
    const { data } = await client.get('/api/profile-partnerships/my-commissions');
    return data as { commissions: Array<Record<string, unknown>>; totals: { earnedByCurrency: Record<string, number>; paidByCurrency: Record<string, number> } };
  },
  async payouts() {
    const { data } = await client.get('/api/profile-partnerships/payouts');
    return data.payouts as Array<Record<string, unknown>>;
  },
  async recordPayout(partnershipId: string, commissionIds: string[], payment_reference?: string) {
    const { data } = await client.post(`/api/profile-partnerships/${partnershipId}/payouts`, {
      commission_ids: commissionIds,
      payment_reference,
    });
    return data.payout as Record<string, unknown>;
  },
};
