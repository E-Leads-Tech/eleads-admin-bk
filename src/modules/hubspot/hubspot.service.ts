import type { CompanyAppointmentsQuery } from "./hubspot.validation";
import type {
  AppointmentContact,
  AppointmentStatus,
  PaginatedAppointments,
  PeriodMetrics,
} from "./hubspot.types";
import HubspotRepository from "./hubspot.repository";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

class HubspotService {
  private computeMetrics(contacts: AppointmentContact[]): PeriodMetrics {
    const totalLeads = contacts.length;
    const sales = contacts.filter((c) => c.status === "Sale");
    const closingRate = totalLeads > 0 ? (sales.length * 100) / totalLeads : 0;
    const totalRevenue = contacts
      .filter((c) => c.revenue !== null && parseFloat(c.revenue) > 0)
      .reduce((sum, c) => sum + parseFloat(c.revenue!), 0);
    return { totalLeads, closingRate, totalRevenue };
  }

  private getPreviousMonthRange(reference: Date): {
    prevDateFrom: Date;
    prevDateTo: Date;
  } {
    const year = reference.getFullYear();
    const month = reference.getMonth(); // 0-indexed
    // day 0 of current month = last day of previous month
    const prevDateTo = new Date(year, month, 0, 23, 59, 59, 999);
    const prevDateFrom = new Date(
      prevDateTo.getFullYear(),
      prevDateTo.getMonth(),
      1,
    );
    return { prevDateFrom, prevDateTo };
  }

  private groupByMonth(
    contacts: AppointmentContact[],
  ): { month: string; total: number; sold: number }[] {
    const monthMap = new Map<number, { total: number; sold: number }>();
    for (const c of contacts) {
      const monthIndex = new Date(c.startAt).getMonth();
      const entry = monthMap.get(monthIndex) ?? { total: 0, sold: 0 };
      entry.total++;
      if (c.status === "Completed") entry.sold++;
      monthMap.set(monthIndex, entry);
    }
    return MONTH_NAMES.map((name, i) => ({
      month: name,
      total: monthMap.get(i)?.total ?? 0,
      sold: monthMap.get(i)?.sold ?? 0,
    }));
  }

  private groupByStatus(
    contacts: AppointmentContact[],
  ): { status: string; percentage: number; total: number }[] {
    const STATUSES: AppointmentStatus[] = [
      "Sale",
      "Completed",
      "Canceled",
      "Still Working",
    ];
    const totalContacts = contacts.length;
    const statusCount = new Map<AppointmentStatus, number>();
    for (const c of contacts) {
      if (c.status !== null && STATUSES.includes(c.status)) {
        statusCount.set(c.status, (statusCount.get(c.status) ?? 0) + 1);
      }
    }
    return STATUSES.map((status) => {
      const count = statusCount.get(status) ?? 0;
      return {
        status,
        percentage: totalContacts > 0 ? (count * 100) / totalContacts : 0,
        total: count,
      };
    });
  }
  async findCompanyByEmail(email: string) {
    const company = await HubspotRepository.searchCompanyByEmail(email);

    if (!company) return null;

    return {
      id: company.id,
      properties: company.properties,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  async getCompanyAppointmentsWithContacts(
    companyId: string,
    filters: CompanyAppointmentsQuery,
  ): Promise<PaginatedAppointments | null> {
    // 1. Get appointments for the company

    const appointmentsResult = await HubspotRepository.getCompanyAppointments(
      companyId,
      {
        status: filters.status,
        sortOrder: filters.sortOrder,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: filters.limit,
        after: filters.after,
      },
    );
    if (!appointmentsResult) return null;
    const appointments = appointmentsResult.items;

    if (appointments.length === 0) return null;

    // 2. Get contacts associated with these appointments
    const appointmentIds = appointments.map((apt) => apt.id);

    const contacts =
      await HubspotRepository.searchContactsByAppointmentIds(appointmentIds);

    if (contacts.length === 0)
      return {
        items: [],
        ...(appointmentsResult.paging !== undefined && {
          paging: appointmentsResult.paging,
        }),
      };

    // 3. Merge appointments with contacts by appointmentId
    const contactByAppointment = new Map(
      contacts.map((c) => [c.appointmentId, c]),
    );

    const results: AppointmentContact[] = appointments
      .filter((appointment) => contactByAppointment.has(appointment.id))
      .map((appointment) => {
        const contact = contactByAppointment.get(appointment.id)!;
        return {
          idContact: contact.id,
          idAppointment: appointment.id,
          firstname: contact.firstname,
          lastname: contact.lastname,
          email: contact.email,
          status: appointment.appointmentStatus as AppointmentStatus | null,
          product: contact.product,
          productDescription: contact.productDescription,
          phone: contact.mobilephone,
          revenue: appointment.revenue,
          startAt: appointment.startAt,
        };
      });

    // 4. Apply contact filters
    let filtered = results;
    if (filters.name) {
      const name = filters.name.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.firstname?.toLowerCase().includes(name) ||
          r.lastname?.toLowerCase().includes(name),
      );
    }

    return {
      items: filtered,
      ...(appointmentsResult.paging !== undefined && {
        paging: appointmentsResult.paging,
      }),
    };
  }

  async getCompanyLeadMetrics(
    companyId: string,
    filters: CompanyAppointmentsQuery,
  ) {
    // 1st call: current period (filtered)
    const currentResult = await this.getCompanyAppointmentsWithContacts(
      companyId,
      filters,
    );

    const current = currentResult?.items ?? [];
    const currentMetrics = this.computeMetrics(current);

    // Derive previous month range from dateFrom
    const reference = filters.dateFrom ?? filters.dateTo ?? new Date();
    const { prevDateFrom, prevDateTo } = this.getPreviousMonthRange(reference);

    // 2nd call: previous month
    const previousResult = await this.getCompanyAppointmentsWithContacts(
      companyId,
      {
        ...filters,
        dateFrom: prevDateFrom,
        dateTo: prevDateTo,
      },
    );
    const previous = previousResult?.items ?? [];
    const previousMetrics = this.computeMetrics(previous);

    // 3rd call: full current year — no status/limit/after/name filters
    // so groupByMonth reflects all appointments across all statuses for the year
    const year = reference.getFullYear();
    const annualResult = await this.getCompanyAppointmentsWithContacts(
      companyId,
      {
        sortOrder: filters.sortOrder,
        dateFrom: new Date(year, 0, 1),
        dateTo: new Date(year, 11, 31, 23, 59, 59, 999),
      },
    );
    const annualContacts = annualResult?.items ?? [];

    // Growth calculation
    const calcGrowth = (curr: number, prev: number) =>
      curr === 0 ? 0 : ((curr - prev) * 100) / curr;

    return {
      metrics: {
        totalLeads: currentMetrics.totalLeads,
        closingRate: currentMetrics.closingRate,
        totalRevenue: currentMetrics.totalRevenue,
        leadsPercentageGrowth: calcGrowth(
          currentMetrics.totalLeads,
          previousMetrics.totalLeads,
        ),
        closingRatePercentageGrowth: calcGrowth(
          currentMetrics.closingRate,
          previousMetrics.closingRate,
        ),
        revenuePercentageGrowth: calcGrowth(
          currentMetrics.totalRevenue,
          previousMetrics.totalRevenue,
        ),
      },
      annual: this.groupByMonth(annualContacts),
      status: this.groupByStatus(current),
      totalFiltered: current.length,
      totalAnnual: annualContacts.length,
    };
  }
}

export default new HubspotService();
