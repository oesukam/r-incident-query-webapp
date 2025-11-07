'use client';

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import {
  Search,
  Download,
  AlertTriangle,
  Calendar,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from './date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchableSelect } from '@/components/searchable-select';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  date: string;
  affectedEmails?: string[];
  description: string;
  status: 'active' | 'resolved' | 'investigating';
  fileId?: string;
  brandName?: string; // Added brand name to incident interface
  emailCount?: number; // Added emailCount to track leaked emails
  files?: Array<{ id: string; name: string; size?: number; type?: string }>; // Added files array
  changeLogs?: any[]; // Added changeLogs to check for added files
  [key: string]: any; // Allow additional fields from API
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const threatTypeOptions = [
  { value: 'all', label: 'All Threat Types' },
  // Dark Web threats
  { value: 'AccountCredentialsForSaleDW', label: 'Account Credentials For Sale (Dark Web)' },
  { value: 'ConsumerGoodsForSaleDW', label: 'Consumer Goods For Sale (Dark Web)' },
  { value: 'CreditDebitCardDataDW', label: 'Credit/Debit Card Data (Dark Web)' },
  { value: 'CyberRiskDW', label: 'Cyber Risk (Dark Web)' },
  { value: 'DepositFraudDW', label: 'Deposit Fraud (Dark Web)' },
  { value: 'ExecutiveMentionInPostDW', label: 'Executive Mention In Post (Dark Web)' },
  { value: 'FraudToolsDW', label: 'Fraud Tools (Dark Web)' },
  {
    value: 'PersonalIdentifiableInformationDW',
    label: 'Personal Identifiable Information (Dark Web)',
  },
  { value: 'PhysicalThreatToExecutiveDW', label: 'Physical Threat To Executive (Dark Web)' },
  { value: 'SourceCodeDW', label: 'Source Code (Dark Web)' },
  {
    value: 'ThirdPartyCorporateEmailLeaksDW',
    label: 'Third Party Corporate Email Leaks (Dark Web)',
  },
  { value: 'StealerMalwareCredentialsDW', label: 'Stealer Malware Credentials (Dark Web)' },
  { value: 'BotnetCredentialsDW', label: 'Botnet Credentials (Dark Web)' },
  {
    value: 'RemoteAccessTrojanCredentialsDW',
    label: 'Remote Access Trojan Credentials (Dark Web)',
  },
  {
    value: 'PhishingAsAServiceCredentialsDW',
    label: 'Phishing As A Service Credentials (Dark Web)',
  },
  // Social Media threats
  { value: 'BINIINDetailsSM', label: 'BIN/IIN Details (Social Media)' },
  { value: 'BrandMentionOnPageSM', label: 'Brand Mention On Page (Social Media)' },
  { value: 'CyberRiskSM', label: 'Cyber Risk (Social Media)' },
  { value: 'DepositFraudSM', label: 'Deposit Fraud (Social Media)' },
  { value: 'ExecutiveMentionOnPageSM', label: 'Executive Mention On Page (Social Media)' },
  { value: 'GenericPhysicalThreatSM', label: 'Generic Physical Threat (Social Media)' },
  { value: 'ImpersonationOfEmployeeSM', label: 'Impersonation Of Employee (Social Media)' },
  { value: 'ImpersonationOfExecutiveSM', label: 'Impersonation Of Executive (Social Media)' },
  { value: 'ImpersonationOfBrandSM', label: 'Impersonation Of Brand (Social Media)' },
  { value: 'LeakedCredentialsSM', label: 'Leaked Credentials (Social Media)' },
  { value: 'LeakedDocumentsSM', label: 'Leaked Documents (Social Media)' },
  { value: 'LegalThreatSM', label: 'Legal Threat (Social Media)' },
  {
    value: 'NegativeCommentTowardEmployeeSM',
    label: 'Negative Comment Toward Employee (Social Media)',
  },
  {
    value: 'NegativeCommentTowardOrganizationSM',
    label: 'Negative Comment Toward Organization (Social Media)',
  },
  { value: 'NewsPRStockCommentarySM', label: 'News/PR/Stock Commentary (Social Media)' },
  {
    value: 'PersonalIdentifiableInformationSM',
    label: 'Personal Identifiable Information (Social Media)',
  },
  { value: 'PhishingSM', label: 'Phishing (Social Media)' },
  { value: 'PhysicalThreatToEmployeeSM', label: 'Physical Threat To Employee (Social Media)' },
  { value: 'PhysicalThreatToEventSM', label: 'Physical Threat To Event (Social Media)' },
  { value: 'PhysicalThreatToExecutiveSM', label: 'Physical Threat To Executive (Social Media)' },
  { value: 'PhysicalThreatToLocationSM', label: 'Physical Threat To Location (Social Media)' },
  { value: 'ProtestPetitionBoycottsSM', label: 'Protest/Petition/Boycotts (Social Media)' },
  { value: 'SourceCodeSM', label: 'Source Code (Social Media)' },
  { value: 'EventSM', label: 'Event (Social Media)' },
  { value: 'CryptocurrencyScamSM', label: 'Cryptocurrency Scam (Social Media)' },
  { value: 'CounterfeitSM', label: 'Counterfeit (Social Media)' },
];

const brandNameOptions = [
  { value: 'All Brands', label: 'All Brands' },
  { value: 'Republic Core', label: 'Republic Core' },
];

export function IncidentQueryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [activeQuickRange, setActiveQuickRange] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('Republic Core');
  const [threatType, setThreatType] = useState<string>('ThirdPartyCorporateEmailLeaksDW');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const { toast } = useToast();

  const searchInProgressRef = useRef(false);

  const setToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDateRange({ from: today, to: new Date() });
    setActiveQuickRange('today');
  };

  const setThisWeek = () => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    firstDay.setHours(0, 0, 0, 0);
    setDateRange({ from: firstDay, to: new Date() });
    setActiveQuickRange('week');
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({ from: firstDay, to: new Date() });
    setActiveQuickRange('month');
  };

  const setThisYear = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    setDateRange({ from: firstDay, to: new Date() });
    setActiveQuickRange('year');
  };

  const handleSearch = useCallback(
    async (page = 1, customPageSize?: number) => {
      if (searchInProgressRef.current) {
        logger.debug('Search already in progress, skipping duplicate call');
        return;
      }

      searchInProgressRef.current = true;
      setIsLoading(true);
      setHasSearched(true);
      setCurrentPage(page);

      try {
        logger.info({ page, pageSize: customPageSize || pageSize }, 'Starting incident search');
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set('query', searchQuery.trim());
        }
        if (dateRange.from) {
          params.set('CreatedDateFrom', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          params.set('CreatedDateTo', dateRange.to.toISOString());
        }
        if (brandName !== 'All Brands') {
          params.set('BrandNames', brandName);
        }
        if (threatType !== 'all') {
          params.set('ThreatTypeCodes', threatType);
        }
        params.set('page', page.toString());
        params.set('pageSize', (customPageSize || pageSize).toString());

        const response = await fetch(`/api/incidents/search?${params.toString()}`);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to search incidents');
        }

        const data = await response.json();

        const incidentItems = data.items || [];

        const transformedIncidents: Incident[] = incidentItems.map((item: any) => ({
          id: item.id || item.incidentId || `INC-${Date.now()}`,
          title: item.title || item.name || 'Untitled Incident',
          severity: (item.severity?.toLowerCase() || 'medium') as Incident['severity'],
          date: item.date || item.createdDate || new Date().toISOString(),
          affectedEmails: item.affectedEmails || item.emails || [],
          description: item.description || item.details || 'No description available',
          status: (item.status?.toLowerCase() || 'active') as Incident['status'],
          fileId: item.fileId || item.attachmentId,
          brandName: item.brandName || item.brand,
          emailCount:
            item.emailCount ||
            item.leakedEmailsCount ||
            (item.affectedEmails || item.emails || []).length,
          files: item.files || item.attachments || [], // Added files from API response
          changeLogs: item.changeLogs || [], // Added changeLogs from API response
          ...item,
        }));

        logger.debug(
          {
            sampleIncident: transformedIncidents[0],
            emailCount: transformedIncidents[0]?.emailCount,
            fileId: transformedIncidents[0]?.fileId,
            files: transformedIncidents[0]?.files,
          },
          'Transformed incidents'
        );

        setIncidents(transformedIncidents);
        setTotalResults(data.totalCount || 0);

        toast({
          title: 'Search complete',
          description: `Found ${data.totalCount || 0} incident${data.totalCount !== 1 ? 's' : ''}`,
        });
      } catch (error) {
        logger.error({ error }, 'Search error');
        toast({
          title: 'Search failed',
          description: error instanceof Error ? error.message : 'Failed to search incidents',
          variant: 'destructive',
        });
        setIncidents([]);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
        searchInProgressRef.current = false;
      }
    },
    [searchQuery, dateRange, brandName, threatType, pageSize, toast]
  );

  const handleDownload = async (incident: Incident) => {
    setIsDownloading(incident.id);

    try {
      logger.info({ incidentId: incident.id }, 'Fetching incident details for download');

      const detailResponse = await fetch(`/api/incidents/detail?incidentId=${incident.id}`);

      if (!detailResponse.ok) {
        throw new Error('Failed to fetch incident details');
      }

      const detailData = await detailResponse.json();
      logger.debug({ detailData }, 'Incident details fetched');

      const documentFiles = detailData.documentFiles || [];
      if (documentFiles.length === 0) {
        throw new Error('No document files found for this incident');
      }

      logger.debug({ documentFiles }, 'Found document files');

      const allEmails = new Set<string>();

      for (const file of documentFiles) {
        const documentId = file.id || file.documentId;
        if (documentId) {
          logger.debug({ documentId }, 'Downloading file');

          const fileResponse = await fetch(`/api/incidents/download?documentId=${documentId}`);

          if (fileResponse.ok) {
            const fileContent = await fileResponse.text();
            logger.debug(
              { preview: fileContent.substring(0, 200), length: fileContent.length },
              'File content received'
            );

            const lines = fileContent.split('\n');
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

            for (const line of lines) {
              const matches = line.match(emailRegex);
              if (matches) {
                matches.forEach((email) => allEmails.add(email));
              }
            }
          }
        }
      }

      logger.info({ totalEmails: allEmails.size, incidentId: incident.id }, 'Emails extracted');

      if (allEmails.size === 0) {
        throw new Error('No email addresses found in the documents');
      }

      const csvContent = [
        'Incident ID,Email',
        ...Array.from(allEmails).map((email) => `${incident.id},${email}`),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileDate = new Date(incident.date).toISOString().split('T')[0]; // Format: YYYY-MM-DD
      a.download = `incident_${incident.id}_${fileDate}_emails.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download complete',
        description: `Downloaded ${allEmails.size} unique emails for incident ${incident.id}`,
      });
    } catch (error) {
      logger.error({ error, incidentId: incident.id }, 'Download error');
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download file',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-foreground';
      case 'medium':
        return 'bg-yellow-500 text-background';
      case 'low':
        return 'bg-blue-500 text-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-destructive text-destructive-foreground';
      case 'investigating':
        return 'bg-yellow-500 text-background';
      case 'resolved':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number(value);
    setPageSize(newPageSize);
    setCurrentPage(1);
    if (hasSearched) {
      handleSearch(1, newPageSize);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handleSearch(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalResults / pageSize);
    if (currentPage < totalPages) {
      handleSearch(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Security Incident Query
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search and manage security incidents across your organization
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Incidents
            </CardTitle>
            <CardDescription>
              Search by incident ID, title, or description and filter by date range, brand, and
              threat type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={setToday}
                    variant={activeQuickRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Today
                  </Button>
                  <Button
                    onClick={setThisWeek}
                    variant={activeQuickRange === 'week' ? 'default' : 'outline'}
                    size="sm"
                  >
                    This Week
                  </Button>
                  <Button
                    onClick={setThisMonth}
                    variant={activeQuickRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                  >
                    This Month
                  </Button>
                  <Button
                    onClick={setThisYear}
                    variant={activeQuickRange === 'year' ? 'default' : 'outline'}
                    size="sm"
                  >
                    This Year
                  </Button>
                </div>
                <div className="flex-1">
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                      setDateRange(range);
                      setActiveQuickRange(null);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Brand Name</label>
                <SearchableSelect
                  value={brandName}
                  onValueChange={setBrandName}
                  options={brandNameOptions}
                  placeholder="Select a brand"
                  searchPlaceholder="Search brands..."
                  emptyMessage="No brands found."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Threat Type
                </label>
                <SearchableSelect
                  value={threatType}
                  onValueChange={setThreatType}
                  options={threatTypeOptions}
                  placeholder="Select threat type"
                  searchPlaceholder="Search threat types..."
                  emptyMessage="No threat types found."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search incidents by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearch()}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <Button onClick={() => handleSearch()} className="gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {hasSearched && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Incidents</h2>
              <p className="text-sm text-muted-foreground">
                {totalResults} {totalResults === 1 ? 'result' : 'results'} found
                {totalResults > 0 && (
                  <span className="ml-2">
                    (Page {currentPage} of {Math.ceil(totalResults / pageSize)})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Results per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Incidents List */}
        {hasSearched && (
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">No incidents found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search keywords
                  </p>
                </CardContent>
              </Card>
            ) : (
              incidents.map((incident) => {
                return (
                  <Card key={incident.id} className="transition-all hover:border-primary/50">
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-xl">{incident.title}</CardTitle>
                            <Badge className={getSeverityColor(incident.severity)}>
                              {incident.severity.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(incident.status)}>
                              {incident.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 cursor-help">
                                    <AlertTriangle className="h-4 w-4" />
                                    {incident.id}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Incident ID: {incident.id}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 cursor-help">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(incident.date).toLocaleDateString()}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Incident Date: {new Date(incident.date).toLocaleString()}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {incident.brandName && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 cursor-help">
                                      <Building2 className="h-4 w-4" />
                                      {incident.brandName}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Brand: {incident.brandName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  onClick={() => handleDownload(incident)}
                                  variant="outline"
                                  className="gap-2 whitespace-nowrap border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                  disabled={
                                    !incident.changeLogs?.some((log) =>
                                      log.content?.includes('added to incident')
                                    ) || isDownloading === incident.id
                                  }
                                >
                                  {isDownloading === incident.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4" />
                                      Download Emails
                                    </>
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!incident.changeLogs?.some((log) =>
                              log.content?.includes('added to incident')
                            ) && (
                              <TooltipContent>
                                <p>No emails were leaked in this incident</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-foreground">{incident.description}</p>

                      {incident.affectedEmails && incident.affectedEmails.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-foreground">
                            Affected Email Addresses:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {incident.affectedEmails.slice(0, 3).map((email) => (
                              <Badge key={email} variant="secondary" className="font-mono text-xs">
                                {email}
                              </Badge>
                            ))}
                            {incident.affectedEmails.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{incident.affectedEmails.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Pagination */}
        {hasSearched && incidents.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
              variant="outline"
              size="sm"
              className="gap-1 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
                <span className="font-semibold text-foreground">
                  {Math.ceil(totalResults / pageSize)}
                </span>
              </span>
            </div>
            <Button
              onClick={handleNextPage}
              disabled={currentPage >= Math.ceil(totalResults / pageSize) || isLoading}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
