// frontend-next/types/externalApi.ts

export interface ExternalDataSource {
  id: string;
  showroom_id: string;
  section_key: string;
  url: string;
  auth_method: 'none' | 'bearer_token' | 'api_key_header' | 'api_key_query';
  header_name?: string;
  query_param?: string;
  ttl_seconds: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  // NOTE: credential is NEVER returned to the frontend
}

export interface FieldMapping {
  id: string;
  source_id: string;
  source_path: string;
  target_field: string;
}

export interface HealthRecord {
  source_id?: string;        // present in health endpoint response; used for Refresh Cache
  section_key: string;
  section_label?: string;    // human-readable label; may be absent (fall back to section_key)
  url_preview: string;       // truncated URL, no credentials
  fetched_at: string | null;
  http_status: number | null;
  success?: boolean;         // raw success flag from health record; used in getDisplayStatus guard
  status: 'healthy' | 'failing' | 'never_fetched';
}
