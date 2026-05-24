import { z } from "zod";

const passthroughObject = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.object(shape).passthrough();

export const cursorSchema = z
  .string()
  .optional()
  .describe("Pagination cursor returned by a previous Pylon response");

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(999)
  .optional()
  .default(100)
  .describe("Maximum number of items to return");

export type SearchFilter = {
  field?: string | undefined;
  operator?: string | undefined;
  subfilters?: SearchFilter[] | undefined;
  value?: string | undefined;
  values?: string[] | undefined;
};

export const searchFilterSchema: z.ZodType<SearchFilter> = z.lazy(() =>
  passthroughObject({
    field: z.string().optional().describe("Pylon field name to filter on"),
    operator: z
      .string()
      .optional()
      .describe("Pylon filter operator, such as equals, in, not_in, and, or"),
    subfilters: z
      .array(searchFilterSchema)
      .optional()
      .describe("Nested filters for compound operators"),
    value: z.string().optional().describe("Single string value for the filter"),
    values: z.array(z.string()).optional().describe("Multiple string values for the filter"),
  }).describe("Pylon search filter"),
);

export const searchParamsSchema = z.object({
  cursor: cursorSchema,
  filter: searchFilterSchema,
  limit: limitSchema,
});

export const issueListParamsSchema = z.object({
  end_time: z.string().describe("End of the issue creation window as an RFC3339 timestamp"),
  start_time: z.string().describe("Start of the issue creation window as an RFC3339 timestamp"),
});

export const accountListParamsSchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

export const contactRetrieveParamsSchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

export const paginationSchema = passthroughObject({
  cursor: z.string().optional(),
  has_next_page: z.boolean().optional(),
});

export const errorResponseSchema = passthroughObject({
  errors: z.array(z.string()).optional(),
  request_id: z.string().optional(),
});

export const apiResponseSchema = <DataSchema extends z.ZodType>(dataSchema: DataSchema) =>
  passthroughObject({
    data: dataSchema.optional(),
    request_id: z.string().optional(),
  });

export const pageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  passthroughObject({
    data: z.array(itemSchema).optional(),
    pagination: paginationSchema.optional(),
    request_id: z.string().optional(),
  });

export const genericResponseSchema = z.unknown();

export const userReferenceSchema = passthroughObject({
  email: z.string().optional(),
  id: z.string().optional(),
});

export const customFieldValueSchema = passthroughObject({
  slug: z.string().optional(),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
});

export const customFieldsSchema = z.record(z.string(), customFieldValueSchema);

export const externalIdSchema = passthroughObject({
  external_id: z.string().optional(),
  label: z.string().optional(),
});

export const channelSchema = passthroughObject({
  channel_id: z.string().optional(),
  is_internal: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  mirror_to: passthroughObject({
    channel_id: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
  source: z.string().optional(),
});

export const accountSchema = passthroughObject({
  channels: z.array(channelSchema).optional(),
  created_at: z.string().optional(),
  crm_settings: passthroughObject({
    details: z
      .array(
        passthroughObject({
          id: z.string().optional(),
          source: z.string().optional(),
        }),
      )
      .optional(),
  }).optional(),
  custom_fields: customFieldsSchema.optional(),
  domain: z.string().optional(),
  domains: z.array(z.string()).optional(),
  external_ids: z.array(externalIdSchema).optional(),
  id: z.string().optional(),
  is_disabled: z.boolean().optional(),
  latest_customer_activity_time: z.string().optional(),
  name: z.string().optional(),
  owner: userReferenceSchema.optional(),
  primary_domain: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().optional(),
});

export const contactSchema = passthroughObject({
  account: passthroughObject({
    id: z.string().optional(),
  }).optional(),
  avatar_url: z.string().optional(),
  custom_fields: customFieldsSchema.optional(),
  email: z.string().optional(),
  emails: z.array(z.string()).optional(),
  external_ids: z.array(externalIdSchema).optional(),
  id: z.string().optional(),
  integration_user_ids: z
    .array(
      passthroughObject({
        id: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .optional(),
  name: z.string().optional(),
  phone_numbers: z.array(z.string()).optional(),
  portal_role: z.string().optional(),
  portal_role_id: z.string().optional(),
  primary_phone_number: z.string().optional(),
});

const secondsByStatusSchema = z.record(z.string(), z.number());

export const issueSchema = passthroughObject({
  account: passthroughObject({
    id: z.string().optional(),
  }).optional(),
  assignee: userReferenceSchema.optional(),
  attachment_urls: z.array(z.string()).optional(),
  author_unverified: z.boolean().optional(),
  body_html: z.string().optional(),
  business_hours_first_response_seconds: z.number().optional(),
  business_hours_resolution_seconds: z.number().optional(),
  business_hours_time_in_status_seconds: secondsByStatusSchema.optional(),
  chat_widget_info: passthroughObject({
    page_url: z.string().optional(),
  }).optional(),
  created_at: z.string().optional(),
  csat_responses: z
    .array(
      passthroughObject({
        comment: z.string().optional(),
        score: z.number().optional(),
      }),
    )
    .optional(),
  custom_fields: customFieldsSchema.optional(),
  customer_portal_visible: z.boolean().optional(),
  external_issues: z
    .array(
      passthroughObject({
        external_id: z.string().optional(),
        link: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .optional(),
  first_response_seconds: z.number().optional(),
  first_response_time: z.string().optional(),
  id: z.string().optional(),
  latest_message_time: z.string().optional(),
  link: z.string().optional(),
  number: z.number().optional(),
  number_of_touches: z.number().optional(),
  requester: userReferenceSchema.optional(),
  resolution_breach_time: z.string().optional(),
  resolution_seconds: z.number().optional(),
  resolution_time: z.string().optional(),
  slack: passthroughObject({
    channel_id: z.string().optional(),
    message_ts: z.string().optional(),
    workspace_id: z.string().optional(),
  }).optional(),
  snoozed_until_time: z.string().optional(),
  source: z.string().optional(),
  state: z.string().optional(),
  tags: z.array(z.string()).optional(),
  team: passthroughObject({
    id: z.string().optional(),
  }).optional(),
  time_in_status_seconds: secondsByStatusSchema.optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  updated_at: z.string().optional(),
});

export const issueFollowerSchema = passthroughObject({
  id: z.string().optional(),
  type: z.string().optional(),
});

export const userSchema = passthroughObject({
  avatar_url: z.string().optional(),
  email: z.string().optional(),
  emails: z.array(z.string()).optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  role_id: z.string().optional(),
  status: z.string().optional(),
});

export const teamSchema = passthroughObject({
  id: z.string().optional(),
  name: z.string().optional(),
  users: z.array(userReferenceSchema).optional(),
});

export const meSchema = passthroughObject({
  id: z.string().optional(),
  name: z.string().optional(),
});

export const accountResponseSchema = apiResponseSchema(accountSchema);
export const accountPageSchema = pageResponseSchema(accountSchema);
export const contactResponseSchema = apiResponseSchema(contactSchema);
export const contactPageSchema = pageResponseSchema(contactSchema);
export const issueResponseSchema = apiResponseSchema(issueSchema);
export const issuePageSchema = pageResponseSchema(issueSchema);
export const issueFollowersResponseSchema = apiResponseSchema(z.array(issueFollowerSchema));
export const meResponseSchema = apiResponseSchema(meSchema);
export const teamResponseSchema = apiResponseSchema(teamSchema);
export const teamListResponseSchema = pageResponseSchema(teamSchema);
export const userResponseSchema = apiResponseSchema(userSchema);
export const userListResponseSchema = pageResponseSchema(userSchema);
export const userPageSchema = pageResponseSchema(userSchema);

export type Account = z.infer<typeof accountSchema>;
export type AccountListParams = z.input<typeof accountListParamsSchema>;
export type AccountPage = z.infer<typeof accountPageSchema>;
export type AccountResponse = z.infer<typeof accountResponseSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ContactPage = z.infer<typeof contactPageSchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
export type ContactRetrieveParams = z.input<typeof contactRetrieveParamsSchema>;
export type GenericResponse = z.infer<typeof genericResponseSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type IssueFollower = z.infer<typeof issueFollowerSchema>;
export type IssueFollowersResponse = z.infer<typeof issueFollowersResponseSchema>;
export type IssueListParams = z.input<typeof issueListParamsSchema>;
export type IssuePage = z.infer<typeof issuePageSchema>;
export type IssueResponse = z.infer<typeof issueResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type SearchParams = z.input<typeof searchParamsSchema>;
export type TeamListResponse = z.infer<typeof teamListResponseSchema>;
export type TeamResponse = z.infer<typeof teamResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
