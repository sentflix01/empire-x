import client from './client';

export interface MewachoGroup {
  id: string;
  name: string;
  description?: string;
  purpose: string;
  target_amount?: number;
  cover_photo?: string;
  invite_code: string;
  status: 'active' | 'closed';
  created_by: string;
  member_count?: number;
  total_collected?: number;
  my_role?: string;
  created_at: string;
}

export interface MewachoActivity {
  id: string;
  group_id: string;
  user_id?: string;
  type: 'contribution' | 'message' | 'withdrawal' | 'system';
  content?: string;
  metadata?: Record<string, any>;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface MewachoContribution {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'failed';
  is_anonymous: boolean;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface MewachoWithdrawal {
  id: string;
  group_id: string;
  requested_by: string;
  requested_by_name?: string;
  amount: number;
  destination_type: string;
  destination_ref: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requires_approval: boolean;
  approved_by?: string[];
  note?: string;
  created_at: string;
}

export const mewachoApi = {
  listGroups: () =>
    client.get<MewachoGroup[]>('/api/mewacho/groups').then(r => r.data),

  getGroup: (id: string) =>
    client.get(`/api/mewacho/groups/${id}`).then(r => r.data),

  createGroup: (data: Partial<MewachoGroup>) =>
    client.post<MewachoGroup>('/api/mewacho/groups', data).then(r => r.data),

  joinGroup: (inviteCode: string) =>
    client.get(`/api/mewacho/groups/join/${inviteCode}`).then(r => r.data),

  contribute: (groupId: string, amount: number, is_anonymous = false) =>
    client.post<{ checkout_url: string; session_id: string; contribution_id: string }>(
      `/api/mewacho/groups/${groupId}/contribute`,
      { amount, is_anonymous }
    ).then(r => r.data),

  sendMessage: (groupId: string, content: string) =>
    client.post(`/api/mewacho/groups/${groupId}/message`, { content }).then(r => r.data),

  requestWithdrawal: (groupId: string, data: {
    amount: number; destination_type: string; destination_ref: string; note?: string;
  }) =>
    client.post(`/api/mewacho/groups/${groupId}/withdraw`, data).then(r => r.data),

  approveWithdrawal: (wid: string) =>
    client.put(`/api/mewacho/withdrawals/${wid}/approve`).then(r => r.data),

  rejectWithdrawal: (wid: string) =>
    client.put(`/api/mewacho/withdrawals/${wid}/reject`).then(r => r.data),
};
