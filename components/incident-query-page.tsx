'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronUp,
  Mail,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface EmailData {
  email: string;
  username?: string;
  full_name?: string;
  source_description?: string;
  source_title?: string;
}

interface CachedEmailData {
  data: EmailData[];
  timestamp: number;
}

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
  const router = useRouter();
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
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [emailCache, setEmailCache] = useState<Record<string, EmailData[]>>({});
  const [loadingEmails, setLoadingEmails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const searchInProgressRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        toast({
          title: 'Logged out',
          description: 'You have been successfully logged out',
        });
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      logger.error('Logout error', { error });
      toast({
        title: 'Logout failed',
        description: 'An error occurred during logout',
        variant: 'destructive',
      });
    }
  }, [toast, router]);

  const CACHE_KEY = 'incident-email-cache';
  const EXPANDED_KEY = 'incident-expanded-state';
  const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Load cached data on mount
  useEffect(() => {
    try {
      // Load email cache
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed: Record<string, CachedEmailData> = JSON.parse(cachedData);
        const now = Date.now();
        const validCache: Record<string, EmailData[]> = {};

        // Filter out expired cache entries
        Object.entries(parsed).forEach(([incidentId, cachedEntry]) => {
          if (now - cachedEntry.timestamp < CACHE_EXPIRATION) {
            validCache[incidentId] = cachedEntry.data;
          }
        });

        if (Object.keys(validCache).length > 0) {
          setEmailCache(validCache);
          logger.info('Loaded email cache from storage', {
            cachedIncidents: Object.keys(validCache).length,
          });
        }
      }

      // Load expanded incidents state
      const expandedData = sessionStorage.getItem(EXPANDED_KEY);
      if (expandedData) {
        const expandedArray: string[] = JSON.parse(expandedData);
        setExpandedIncidents(new Set(expandedArray));
        logger.info('Loaded expanded incidents from storage', {
          expandedCount: expandedArray.length,
        });
      }
    } catch (error) {
      logger.error('Failed to load cache from storage', { error });
    }
  }, []);

  // Save cache to sessionStorage whenever it changes
  useEffect(() => {
    if (Object.keys(emailCache).length > 0) {
      try {
        const cacheWithTimestamp: Record<string, CachedEmailData> = {};
        Object.entries(emailCache).forEach(([incidentId, data]) => {
          cacheWithTimestamp[incidentId] = {
            data,
            timestamp: Date.now(),
          };
        });
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheWithTimestamp));
        logger.debug('Saved email cache to storage', {
          cachedIncidents: Object.keys(emailCache).length,
        });
      } catch (error) {
        logger.error('Failed to save email cache to storage', { error });
      }
    }
  }, [emailCache]);

  // Save expanded incidents state whenever it changes
  useEffect(() => {
    try {
      const expandedArray = Array.from(expandedIncidents);
      sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(expandedArray));
      if (expandedArray.length > 0) {
        logger.debug('Saved expanded incidents to storage', {
          expandedCount: expandedArray.length,
        });
      }
    } catch (error) {
      logger.error('Failed to save expanded incidents to storage', { error });
    }
  }, [expandedIncidents]);

  const setToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDateRange({ from: today, to: new Date() });
    setActiveQuickRange('today');
  };

  const setLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    setDateRange({ from: sevenDaysAgo, to: new Date() });
    setActiveQuickRange('last7days');
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    setDateRange({ from: thirtyDaysAgo, to: new Date() });
    setActiveQuickRange('last30days');
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
        logger.info('Starting incident search', { page, pageSize: customPageSize || pageSize });
        const params = new URLSearchParams();
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
          description: item.summary || item.description || 'No description available',
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

        logger.debug('Transformed incidents', {
          sampleIncident: transformedIncidents[0],
          emailCount: transformedIncidents[0]?.emailCount,
          fileId: transformedIncidents[0]?.fileId,
          files: transformedIncidents[0]?.files,
        });

        setIncidents(transformedIncidents);
        setTotalResults(data.totalCount || 0);

        toast({
          title: 'Search complete',
          description: `Found ${data.totalCount || 0} incident${data.totalCount !== 1 ? 's' : ''}`,
        });
      } catch (error) {
        logger.error('Search error', { error });
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
    [dateRange, brandName, threatType, pageSize, toast]
  );

  // Auto-search when filters change (after initial search)
  useEffect(() => {
    // Only auto-search if the user has performed at least one search
    if (hasSearched) {
      // Clear any pending search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce the search by 1500ms to allow changing multiple filters
      searchTimeoutRef.current = setTimeout(() => {
        logger.debug('Auto-triggering search due to filter change');
        handleSearch(1);
      }, 700);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, brandName, threatType, hasSearched]);

  const fetchIncidentEmails = useCallback(
    async (incident: Incident) => {
      setLoadingEmails((prev) => new Set(prev).add(incident.id));

      try {
        logger.info('Fetching incident emails', { incidentId: incident.id });

        const detailResponse = await fetch(`/api/incidents/detail?incidentId=${incident.id}`);

        if (!detailResponse.ok) {
          throw new Error('Failed to fetch incident details');
        }

        const detailData = await detailResponse.json();
        logger.debug('Incident details fetched', { detailData });

        const documentFiles = detailData.documentFiles || [];
        if (documentFiles.length === 0) {
          logger.warn('No document files found', { incidentId: incident.id });
          setEmailCache((prev) => ({ ...prev, [incident.id]: [] }));
          return [];
        }

        logger.debug('Found document files', { documentFiles });

        const emailMap = new Map<string, EmailData>();

        for (const file of documentFiles) {
          const documentId = file.id || file.documentId;
          if (documentId) {
            logger.debug('Downloading file', { documentId });

            const fileResponse = await fetch(`/api/incidents/download?documentId=${documentId}`);

            if (fileResponse.ok) {
              const contentType = fileResponse.headers.get('content-type') || '';
              const fileContent = await fileResponse.text();

              logger.debug('File content received', {
                contentType,
                preview: fileContent.substring(0, 300),
                length: fileContent.length,
                firstLineLength: fileContent.split('\n')[0]?.length,
              });

              const lines = fileContent.split('\n').filter((line) => line.trim());

              if (lines.length === 0) {
                logger.warn('File is empty', { documentId });
                continue;
              }

              // Helper function to parse CSV line handling quoted values
              const parseCSVLine = (line: string, delimiter: string): string[] => {
                const result: string[] = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                  const char = line[i];

                  if (char === '"') {
                    // Handle escaped quotes
                    if (inQuotes && line[i + 1] === '"') {
                      current += '"';
                      i++;
                    } else {
                      inQuotes = !inQuotes;
                    }
                  } else if (char === delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                  } else {
                    current += char;
                  }
                }
                result.push(current.trim());
                return result;
              };

              // Detect delimiter by checking first few lines
              const firstLine = lines[0];
              let delimiter = ',';
              const tabCount = (firstLine.match(/\t/g) || []).length;
              const commaCount = (firstLine.match(/,/g) || []).length;

              if (tabCount > commaCount) {
                delimiter = '\t';
              }

              logger.debug('Delimiter detected', { delimiter, tabCount, commaCount });

              // Check if first line contains headers
              const firstLineLower = firstLine.toLowerCase();
              const hasHeaders =
                /email/i.test(firstLineLower) ||
                /full_name/i.test(firstLineLower) ||
                /source/i.test(firstLineLower) ||
                /name/i.test(firstLineLower) ||
                /title/i.test(firstLineLower) ||
                /description/i.test(firstLineLower) ||
                /username/i.test(firstLineLower);

              if (hasHeaders) {
                // Parse structured CSV/TSV file
                const headers = parseCSVLine(lines[0], delimiter).map((h) =>
                  h.trim().replace(/^"|"$/g, '')
                );

                const emailIndex = headers.findIndex(
                  (h) =>
                    /email/i.test(h) || /e-mail/i.test(h) || /mail/i.test(h) || /Username/.test(h)
                );

                const fullNameIndex = headers.findIndex(
                  (h) => /full_name/i.test(h) || /fullname/i.test(h)
                );
                const sourceDescIndex = headers.findIndex(
                  (h) => /source_description/i.test(h) || /description/i.test(h) || /Title/.test(h)
                );
                const sourceTitleIndex = headers.findIndex(
                  (h) => /source_title/i.test(h) || /Source/.test(h)
                );

                logger.debug('CSV headers parsed', {
                  headers,
                  emailIndex,
                  fullNameIndex,
                  sourceDescIndex,
                  sourceTitleIndex,
                  totalLines: lines.length,
                });

                for (let i = 1; i < lines.length; i++) {
                  const columns = parseCSVLine(lines[i], delimiter).map((col) =>
                    col.trim().replace(/^"|"$/g, '')
                  );

                  if (emailIndex !== -1 && columns[emailIndex]) {
                    const email = columns[emailIndex].trim();
                    if (email && email.includes('@') && !email.includes('email')) {
                      emailMap.set(email, {
                        email,
                        full_name:
                          fullNameIndex !== -1 && columns[fullNameIndex]
                            ? columns[fullNameIndex]
                            : undefined,
                        source_description:
                          sourceDescIndex !== -1 && columns[sourceDescIndex]
                            ? columns[sourceDescIndex]
                            : undefined,
                        source_title:
                          sourceTitleIndex !== -1 && columns[sourceTitleIndex]
                            ? columns[sourceTitleIndex]
                            : undefined,
                      });
                    }
                  }
                }

                logger.debug('Emails extracted from CSV', {
                  extractedCount: emailMap.size,
                  documentId,
                });
              } else {
                // Fallback: Extract emails using regex
                logger.debug('No headers detected, using regex extraction', { documentId });
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                for (const line of lines) {
                  const matches = line.match(emailRegex);
                  if (matches) {
                    matches.forEach((email) => {
                      if (!emailMap.has(email)) {
                        emailMap.set(email, { email });
                      }
                    });
                  }
                }
              }
            } else {
              logger.warn('File download failed', { status: fileResponse.status, documentId });
            }
          }
        }

        const emailsArray = Array.from(emailMap.values());
        logger.info('Emails extracted and cached', {
          totalEmails: emailsArray.length,
          incidentId: incident.id,
        });

        setEmailCache((prev) => ({ ...prev, [incident.id]: emailsArray }));
        return emailsArray;
      } catch (error) {
        logger.error('Failed to fetch emails', { error, incidentId: incident.id });
        return [];
      } finally {
        setLoadingEmails((prev) => {
          const newSet = new Set(prev);
          newSet.delete(incident.id);
          return newSet;
        });
      }
    },
    [emailCache]
  );

  const toggleIncidentExpansion = useCallback(
    async (incident: Incident) => {
      const isExpanded = expandedIncidents.has(incident.id);

      if (isExpanded) {
        setExpandedIncidents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(incident.id);
          return newSet;
        });
      } else {
        setExpandedIncidents((prev) => new Set(prev).add(incident.id));

        // Refetch on expand if download button is not disabled (i.e., not currently downloading)
        const isDownloadButtonDisabled = isDownloading === incident.id;
        if (!isDownloadButtonDisabled && !loadingEmails.has(incident.id)) {
          await fetchIncidentEmails(incident);
        }
      }
    },
    [expandedIncidents, isDownloading, loadingEmails, fetchIncidentEmails]
  );

  const handleDownload = useCallback(
    async (incident: Incident) => {
      setIsDownloading(incident.id);

      try {
        logger.info('Starting download process', { incidentId: incident.id });

        // Always fetch fresh data if not already cached
        let emails = emailCache[incident.id];
        const needsFetch = !emails || emails.length === 0;

        if (needsFetch) {
          logger.info('Fetching incident details and emails', { incidentId: incident.id });
          toast({
            title: 'Preparing download',
            description: 'Fetching incident details and email data...',
          });
          emails = await fetchIncidentEmails(incident);
        }

        if (!emails || emails.length === 0) {
          throw new Error('No email addresses found for this incident');
        }

        logger.info('Generating CSV for download', {
          incidentId: incident.id,
          emailCount: emails.length,
        });

        const escapeCsvValue = (value: string | undefined) => {
          if (!value) return '';
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        const csvContent = [
          'Incident ID,Email,Full Name,Source,Description',
          ...emails.map((emailData) =>
            [
              incident.id,
              emailData.email,
              escapeCsvValue(emailData.full_name),
              escapeCsvValue(emailData.source_title),
              escapeCsvValue(emailData.source_description),
            ].join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileDate = new Date(incident.date).toISOString().split('T')[0];
        a.download = `incident_${incident.id}_${fileDate}_emails.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Download complete',
          description: `Downloaded ${emails.length} unique email${emails.length !== 1 ? 's' : ''} for incident ${incident.id}`,
        });

        logger.info('Download completed', { incidentId: incident.id, emailCount: emails.length });
      } catch (error) {
        logger.error('Download error', { error, incidentId: incident.id });
        toast({
          title: 'Download failed',
          description: error instanceof Error ? error.message : 'Failed to download file',
          variant: 'destructive',
        });
      } finally {
        setIsDownloading(null);
      }
    },
    [emailCache, fetchIncidentEmails, toast]
  );

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
          <div className="relative flex flex-col items-center gap-3">
            <div className="absolute right-0 top-0 flex items-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Security Incident Query
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search and manage security incidents across your organization
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardDescription className="text-lg font-medium">
              Filter incidents by date range, brand, and threat type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col items-center gap-4">
              <div className="w-full md:w-80">
                <label className="mb-2 block text-sm font-medium text-foreground text-center">
                  Brand Name
                </label>
                <SearchableSelect
                  value={brandName}
                  onValueChange={setBrandName}
                  options={brandNameOptions}
                  placeholder="Select a brand"
                  searchPlaceholder="Search brands..."
                  emptyMessage="No brands found."
                  centered
                />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex flex-col gap-3 items-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    onClick={setToday}
                    variant={activeQuickRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Today
                  </Button>
                  <Button
                    onClick={setLast7Days}
                    variant={activeQuickRange === 'last7days' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    onClick={setLast30Days}
                    variant={activeQuickRange === 'last30days' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Last 30 Days
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
                <div className="w-full sm:w-auto">
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
            <div className="mb-4 flex flex-col items-center gap-4">
              <div className="w-full md:w-[500px]">
                <label className="mb-2 block text-sm font-medium text-foreground text-center">
                  Threat Type
                </label>
                <SearchableSelect
                  value={threatType}
                  onValueChange={setThreatType}
                  options={threatTypeOptions}
                  placeholder="Select threat type"
                  searchPlaceholder="Search threat types..."
                  emptyMessage="No threat types found."
                  centered
                />
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <Button
                onClick={() => handleSearch()}
                className="gap-2 px-12 py-5 text-base w-full sm:w-64 md:w-72"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
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
                                  disabled={isDownloading === incident.id}
                                >
                                  {isDownloading === incident.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      {emailCache[incident.id] ? 'Downloading...' : 'Preparing...'}
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4" />
                                      Download Emails
                                      {emailCache[incident.id] && (
                                        <Badge variant="secondary" className="ml-1 text-xs">
                                          {emailCache[incident.id].length}
                                        </Badge>
                                      )}
                                    </>
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {emailCache[incident.id]
                                  ? `Download ${emailCache[incident.id].length} cached email${emailCache[incident.id].length !== 1 ? 's' : ''}`
                                  : 'Fetch incident details and download emails'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-foreground">{incident.description}</p>

                      <div className="mb-4">
                        <Button
                          onClick={() => toggleIncidentExpansion(incident)}
                          variant="outline"
                          className="w-full gap-2"
                          disabled={loadingEmails.has(incident.id)}
                        >
                          {loadingEmails.has(incident.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading emails...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4" />
                              {expandedIncidents.has(incident.id) ? (
                                <>
                                  <span>Hide Affected Emails</span>
                                  <ChevronUp className="h-4 w-4 ml-auto" />
                                </>
                              ) : (
                                <>
                                  <span>
                                    View Affected Emails
                                    {emailCache[incident.id] && (
                                      <span className="ml-2 text-muted-foreground">
                                        ({emailCache[incident.id].length} emails)
                                      </span>
                                    )}
                                  </span>
                                  <ChevronDown className="h-4 w-4 ml-auto" />
                                </>
                              )}
                            </>
                          )}
                        </Button>

                        {expandedIncidents.has(incident.id) && emailCache[incident.id] && (
                          <div className="mt-4 border rounded-lg overflow-hidden">
                            <div className="max-h-96 overflow-y-auto overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                      #
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                      Email / Username
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                      Full Name
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                      Source
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                      Description
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emailCache[incident.id].length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                      >
                                        No email addresses found for this incident
                                      </td>
                                    </tr>
                                  ) : (
                                    emailCache[incident.id].map((emailData, index) => (
                                      <tr
                                        key={`${incident.id}-${emailData.email}-${index}`}
                                        className="border-t hover:bg-muted/50"
                                      >
                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                          {index + 1}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs break-all">
                                          {emailData.email}
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                          {emailData.full_name || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-xs break-words">
                                          {emailData.source_title || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-md break-words">
                                          {emailData.source_description || '-'}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                            {emailCache[incident.id].length > 0 && (
                              <div className="px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground">
                                Total: {emailCache[incident.id].length} email
                                {emailCache[incident.id].length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
