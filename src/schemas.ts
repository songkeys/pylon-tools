import { z } from "zod";

const passthroughObject = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.object(shape).passthrough();

const nullishString = z.string().nullish();
const nullishBoolean = z.boolean().nullish();
const nullishNumber = z.number().nullish();
const nullishInteger = z.number().int().nullish();
const nullishStringArray = z.array(z.string()).nullish();
const nullishArray = <ItemSchema extends z.ZodTypeAny>(itemSchema: ItemSchema) =>
  z.array(itemSchema).nullish();

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
  operator: string;
  subfilters?: SearchFilter[] | undefined;
  value?: string | undefined;
  values?: string[] | undefined;
};

export const searchFilterSchema: z.ZodType<SearchFilter> = z.lazy(() =>
  passthroughObject({
    field: z.string().optional().describe("Pylon field name to filter on"),
    operator: z.string().describe("Pylon filter operator, such as equals, in, not_in, and, or"),
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

export const textSearchParamsSchema = searchParamsSchema.extend({
  search_text: z
    .string()
    .optional()
    .describe("Optional fuzzy text search intersected with the provided filter"),
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
  cursor: nullishString,
  has_next_page: nullishBoolean,
});

export const errorResponseSchema = passthroughObject({
  errors: z.array(z.string()).optional(),
  request_id: nullishString,
});

export const apiResponseSchema = <DataSchema extends z.ZodType>(dataSchema: DataSchema) =>
  passthroughObject({
    data: dataSchema.nullish(),
    request_id: nullishString,
  });

export const pageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  passthroughObject({
    data: z.array(itemSchema).nullish(),
    pagination: paginationSchema.nullish(),
    request_id: nullishString,
  });

export const genericResponseSchema = z.unknown();

export const userReferenceSchema = passthroughObject({
  email: nullishString,
  id: nullishString,
});

export const externalIdSchema = passthroughObject({
  external_id: nullishString,
  label: nullishString,
});

export const accountReferenceSchema = passthroughObject({
  external_ids: nullishArray(externalIdSchema),
  id: nullishString,
});

export const contactReferenceSchema = passthroughObject({
  email: nullishString,
  id: nullishString,
});

export const issueReferenceSchema = passthroughObject({
  id: nullishString,
  number: nullishInteger,
});

export const teamReferenceSchema = passthroughObject({
  id: nullishString,
});

const customFieldScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const customFieldValueSchema = passthroughObject({
  slug: nullishString,
  value: customFieldScalarSchema.optional(),
  values: z.array(customFieldScalarSchema).nullish(),
});

export const customFieldsSchema = z.record(z.string(), z.union([customFieldValueSchema, z.null()]));

export const channelSchema = passthroughObject({
  channel_id: nullishString,
  channel_name: nullishString,
  channel_url: nullishString,
  is_internal: nullishBoolean,
  is_primary: nullishBoolean,
  mirror_to: passthroughObject({
    channel_id: nullishString,
    source: nullishString,
  }).nullish(),
  source: nullishString,
});

export const accountSchema = passthroughObject({
  channels: nullishArray(channelSchema),
  created_at: nullishString,
  crm_settings: passthroughObject({
    details: z
      .array(
        passthroughObject({
          id: nullishString,
          source: nullishString,
        }),
      )
      .nullish(),
  }).nullish(),
  custom_fields: customFieldsSchema.nullish(),
  domain: nullishString,
  domains: nullishStringArray,
  external_ids: nullishArray(externalIdSchema),
  id: nullishString,
  is_disabled: nullishBoolean,
  latest_customer_activity_time: nullishString,
  name: nullishString,
  owner: userReferenceSchema.nullish(),
  primary_domain: nullishString,
  tags: nullishStringArray,
  type: nullishString,
  updated_at: nullishString,
});

export const contactSchema = passthroughObject({
  account: accountReferenceSchema.nullish(),
  avatar_url: nullishString,
  custom_fields: customFieldsSchema.nullish(),
  email: nullishString,
  emails: nullishStringArray,
  external_ids: nullishArray(externalIdSchema),
  id: nullishString,
  integration_user_ids: z
    .array(
      passthroughObject({
        id: nullishString,
        source: nullishString,
      }),
    )
    .nullish(),
  name: nullishString,
  phone_numbers: nullishStringArray,
  portal_role: nullishString,
  portal_role_id: nullishString,
  primary_phone_number: nullishString,
});

const secondsByStatusSchema = z.record(z.string(), nullishNumber);

export const issueSchema = passthroughObject({
  account: accountReferenceSchema.nullish(),
  assignee: userReferenceSchema.nullish(),
  attachment_urls: nullishStringArray,
  author_unverified: nullishBoolean,
  body_html: nullishString,
  business_hours_first_response_seconds: nullishInteger,
  business_hours_resolution_seconds: nullishInteger,
  business_hours_time_in_status_seconds: secondsByStatusSchema.nullish(),
  chat_widget_info: passthroughObject({
    page_url: nullishString,
  }).nullish(),
  child_issues: nullishArray(issueReferenceSchema),
  created_at: nullishString,
  csat_responses: z
    .array(
      passthroughObject({
        comment: nullishString,
        score: nullishInteger,
      }),
    )
    .nullish(),
  custom_fields: customFieldsSchema.nullish(),
  customer_portal_visible: nullishBoolean,
  external_issues: z
    .array(
      passthroughObject({
        external_id: nullishString,
        link: nullishString,
        source: nullishString,
      }),
    )
    .nullish(),
  first_response_breach_time: nullishString,
  first_response_seconds: nullishInteger,
  first_response_time: nullishString,
  id: nullishString,
  latest_message_time: nullishString,
  link: nullishString,
  number: nullishInteger,
  number_of_touches: nullishInteger,
  parent_issue_group: issueReferenceSchema.nullish(),
  requester: contactReferenceSchema.nullish(),
  resolution_breach_time: nullishString,
  resolution_seconds: nullishInteger,
  resolution_time: nullishString,
  slack: passthroughObject({
    channel_id: nullishString,
    message_ts: nullishString,
    workspace_id: nullishString,
  }).nullish(),
  snoozed_until_time: nullishString,
  source: nullishString,
  state: nullishString,
  tags: nullishStringArray,
  team: teamReferenceSchema.nullish(),
  time_in_status_seconds: secondsByStatusSchema.nullish(),
  title: nullishString,
  type: nullishString,
  updated_at: nullishString,
});

export const issueFollowerSchema = passthroughObject({
  id: nullishString,
  type: nullishString,
});

export const userSchema = passthroughObject({
  avatar_url: nullishString,
  email: nullishString,
  emails: nullishStringArray,
  id: nullishString,
  name: nullishString,
  role_id: nullishString,
  status: nullishString,
});

export const teamSchema = passthroughObject({
  id: nullishString,
  name: nullishString,
  users: nullishArray(userReferenceSchema),
});

export const meSchema = passthroughObject({
  id: nullishString,
  name: nullishString,
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
export type TextSearchParams = z.input<typeof textSearchParamsSchema>;
export type TeamListResponse = z.infer<typeof teamListResponseSchema>;
export type TeamResponse = z.infer<typeof teamResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
