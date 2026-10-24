export type ViewId =
  | "projects"
  | "metadata"
  | "schemas"
  | "operations"
  | "security"
  | "validation"
  | "documentation"
  | "settings";

export interface NavigationItem {
  id: ViewId;
  label: string;
  badge?: string | number;
  icon: string;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  description: string | null;
  document_schema_version: number;
  created_at: string;
  updated_at: string;
}

export interface ApiInfo {
  title: string;
  version: string;
  summary?: string;
  description?: string;
}

export interface Server {
  url: string;
  description?: string;
}

export interface Tag {
  name: string;
  description?: string;
}

export interface SecurityScheme {
  type: "http" | "apiKey" | "oauth2" | "openIdConnect" | string;
  description?: string;
  scheme?: string; // "bearer", "basic"
  bearerFormat?: string; // "JWT"
  name?: string; // e.g. "X-API-KEY"
  in?: "header" | "query" | "cookie" | string;
  openIdConnectUrl?: string;
  flows?: unknown;
}

export interface SchemaDefinition {
  id?: string;
  name?: string;
  schema_type?: "string" | "integer" | "number" | "boolean" | "object" | "array" | "null";
  allows_null?: boolean;
  description?: string;
  properties?: Record<string, SchemaDefinition>;
  required?: string[];
  items?: SchemaDefinition;
  $ref?: string;
  allOf?: SchemaDefinition[];
  example?: unknown;
  enum_values?: unknown[];
  min_length?: number;
  max_length?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  min_items?: number;
  max_items?: number;
}

export type IssueSeverity = "error" | "warning" | "suggestion";

export interface DesignIssue {
  id: string;
  rule_id: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  location: string;
  suggestion?: string;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

export type ParameterLocation = "path" | "query" | "header" | "cookie";

export interface Parameter {
  name: string;
  location: ParameterLocation;
  description?: string;
  required: boolean;
  schema?: SchemaDefinition;
}

export interface MediaTypeDefinition {
  schema?: SchemaDefinition;
  example?: unknown;
}

export interface RequestBody {
  description?: string;
  required: boolean;
  content: Record<string, MediaTypeDefinition>;
}

export interface ResponseDefinition {
  status_code: string;
  description: string;
  content?: Record<string, MediaTypeDefinition>;
}

export interface Operation {
  id?: string;
  path: string;
  method: HttpMethod;
  operation_id?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  request_body?: RequestBody;
  responses?: ResponseDefinition[];
  deprecated?: boolean;
  security?: Record<string, string[]>[];
}

export interface ApiDefinition {
  openapi_version: string;
  info: ApiInfo;
  servers: Server[];
  tags: Tag[];
  schemas: Record<string, SchemaDefinition>;
  operations: Operation[];
  security_schemes?: Record<string, SecurityScheme>;
  security?: Record<string, string[]>[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  document_schema_version: number;
  document: ApiDefinition;
  created_at: string;
  updated_at: string;
}

export interface ImportWarning {
  location: string;
  message: string;
  impact: string;
}

export interface ImportReport {
  success: boolean;
  document: ApiDefinition | null;
  detected_version: string;
  warnings: ImportWarning[];
  schemas_count: number;
  operations_count: number;
}
