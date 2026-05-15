import axios from "axios";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

type HubSpotSearchFilter = {
  propertyName: string;
  operator: string;
  value?: string;
  values?: string[];
  highValue?: string | undefined;
};

type HubSpotSearchRequest = {
  filterGroups: { filters: HubSpotSearchFilter[] }[];
  properties?: string[];
  sorts?: { propertyName: string; direction: "ASCENDING" | "DESCENDING" }[];
  limit?: number;
  after?: string;
};

type HubSpotObject = {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
};

type HubspotAppointment = {
  id: string;
  properties: {
    hs_appointment_start: string;
    hs_createdate: string;
    hs_lastmodifieddate: string;
    hs_object_id: string;
    hpg_contract_amount: string | null;
    hs_pipeline_stage: string | null;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
};

type HubspotAppointmentSearchResponse = {
  total: number;
  results: HubspotAppointment[];
  paging?: { next?: { after: string } };
};

type HubspotContact = {
  id: string;
  properties: {
    firstname: string | null;
    lastname: string | null;
    email: string | null;
    product: string | null;
    product_description: string | null;
    mobilephone: string | null;
  };
};

type HubSpotContactSearchResponse = {
  total: number;
  results: HubspotContact[];
  paging?: { next?: { after: string } };
};

type HubSpotAssociationBatchResult = {
  from: { id: string };
  to: {
    toObjectId: number;
    associationTypes: {
      category: string;
      typeId: number;
      label: string | null;
    }[];
  }[];
};

type HubSpotAssociationBatchResponse = {
  status: string;
  results: HubSpotAssociationBatchResult[];
  startedAt: string;
  completedAt: string;
};

type HubSpotContactBatchReadResponse = {
  status: string;
  results: HubspotContact[];
};

type HubSpotSearchResponse = {
  total: number;
  results: HubSpotObject[];
  paging?: { next?: { after: string } };
};

const APPOINTMENT_STATUSES = [
  { id: "1985917637", label: "Still Working" },
  { id: "1998960329", label: "Completed" },
  { id: "2064242394", label: "Canceled" },
  { id: "3502094039", label: "Sale" },
] as const;

type AppointmentsQuery = {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  status?: string | undefined;
  sortOrder?: "ASCENDING" | "DESCENDING" | undefined;
  limit?: number | undefined;
  after?: string | undefined;
};

export type NormalizedAppointment = {
  id: string;
  revenue: string | null;
  startAt: string;
  createdAt: string;
  url: string;
  appointmentStatus: string | null;
};

export type NormalizedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  product: string | null;
  productDescription: string | null;
  mobilephone: string | null;
};

function getAccessToken(): string {
  const token = process.env.HUBSPOT_API_KEY;
  if (!token) {
    throw new Error("HUBSPOT_API_KEY is not configured");
  }
  return token;
}

const hubspotClient = axios.create({
  baseURL: HUBSPOT_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

hubspotClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getAccessToken()}`;
  return config;
});

async function hubspotFetch<T>(
  path: string,
  options: { method?: string; body?: string } = {},
): Promise<T> {
  const { data } = await hubspotClient.request<T>({
    url: path,
    method: (options.method as any) ?? "GET",
    data: options.body ? JSON.parse(options.body) : undefined,
  });

  return data;
}

class HubspotRepository {
  async searchCompanyByEmail(email: string): Promise<HubSpotObject | null> {
    const body: HubSpotSearchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "company_email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      sorts: [
        {
          propertyName: "hs_appointment_start",
          direction: "DESCENDING",
        },
      ],
      properties: ["name", "domain", "company_email"],
      limit: 1,
    };

    const result = await hubspotFetch<HubSpotSearchResponse>(
      "/crm/objects/2026-03/companies/search",
      { method: "POST", body: JSON.stringify(body) },
    );

    return result.results[0] ?? null;
  }

  async getCompanyAppointments(
    companyId: string,
    filters?: AppointmentsQuery,
  ): Promise<{
    items: NormalizedAppointment[];
    paging?: { next?: { after: string } };
  } | null> {
    const body: HubSpotSearchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.company",
              operator: "EQ",
              value: companyId,
            },

            ...(filters?.dateTo && filters?.dateFrom
              ? [
                  {
                    propertyName: "hs_appointment_start",
                    operator: "BETWEEN",
                    value: filters.dateFrom.toISOString(),
                    highValue: filters.dateTo.toISOString(),
                  },
                ]
              : []),

            ...(filters?.status
              ? (() => {
                  const match = APPOINTMENT_STATUSES.find(
                    (s) => s.label === filters.status,
                  );

                  return match
                    ? [
                        {
                          propertyName: "hs_pipeline_stage",
                          operator: "EQ",
                          value: match.id,
                        },
                      ]
                    : [];
                })()
              : [
                  {
                    propertyName: "hs_pipeline_stage",
                    operator: "IN",
                    values: APPOINTMENT_STATUSES.map((s) => s.id),
                  },
                ]),
          ],
        },
      ],
      sorts: [
        {
          propertyName: "hs_appointment_start",
          direction: filters?.sortOrder ?? "DESCENDING",
        },
      ],
      properties: [
        "hs_pipeline_stage",
        "hs_appointment_start",
        "hpg_contract_amount",
        "hs_createdate",
      ],
      limit: filters?.limit ?? 100,
      ...(filters?.after !== undefined && { after: filters.after }),
    };

    try {
      const response = await hubspotFetch<HubspotAppointmentSearchResponse>(
        "/crm/objects/2026-03/appointments/search",
        { method: "POST", body: JSON.stringify(body) },
      );

      if (!response.results || !response.results.length) return null;
      return {
        items: response.results.map((appointment) => ({
          id: appointment.id,
          revenue: appointment.properties.hpg_contract_amount,
          startAt: appointment.properties.hs_appointment_start,
          createdAt: appointment.properties.hs_createdate,
          url: appointment.url,
          appointmentStatus:
            APPOINTMENT_STATUSES.find(
              (s) => s.id === appointment.properties.hs_pipeline_stage,
            )?.label ?? null,
        })),
        ...(response.paging !== undefined && { paging: response.paging }),
      };
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }

  async searchContactsByAppointmentIds(
    appointmentIds: string[],
  ): Promise<Array<NormalizedContact & { appointmentId: string }>> {
    const associationBody = {
      inputs: appointmentIds.map((id) => ({ id })),
    };

    const associationResponse =
      await hubspotFetch<HubSpotAssociationBatchResponse>(
        "/crm/associations/2026-03/appointments/contacts/batch/read",
        { method: "POST", body: JSON.stringify(associationBody) },
      );

    if (!associationResponse.results || !associationResponse.results.length) {
      return [];
    }

    // Build a reverse map: contactId -> appointmentId (first contact per appointment)
    const contactToAppointment = new Map<string, string>();
    for (const result of associationResponse.results) {
      const appointmentId = result.from.id;
      for (const assoc of result.to) {
        const contactId = String(assoc.toObjectId);
        if (!contactToAppointment.has(contactId)) {
          contactToAppointment.set(contactId, appointmentId);
        }
      }
    }

    const contactIds = [...contactToAppointment.keys()];
    if (!contactIds.length) return [];

    const contactsBody = {
      inputs: contactIds.map((id) => ({ id })),
      properties: [
        "firstname",
        "lastname",
        "email",
        "product",
        "product_description",
        "phone",
        "mobilephone",
      ],
    };

    const contactsResponse =
      await hubspotFetch<HubSpotContactBatchReadResponse>(
        "/crm/objects/2026-03/contacts/batch/read",
        { method: "POST", body: JSON.stringify(contactsBody) },
      );

    if (!contactsResponse.results || !contactsResponse.results.length) {
      return [];
    }

    return contactsResponse.results
      .filter((contact) => contactToAppointment.has(contact.id))
      .map((contact) => ({
        id: contact.id,
        appointmentId: contactToAppointment.get(contact.id)!,
        firstname: contact.properties.firstname,
        lastname: contact.properties.lastname,
        email: contact.properties.email,
        product: contact.properties.product,
        productDescription: contact.properties.product_description,
        mobilephone: contact.properties.mobilephone,
      }));
  }
}

export default new HubspotRepository();
