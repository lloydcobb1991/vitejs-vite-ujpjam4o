import React, { useState, useRef } from 'react';
import {
  Search,
  Download,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';

// IMPORTANT: Update this to your proxy URL
const PROXY_URL = 'https://ignitecs.co/ignite/proxy.php';

export default function TheBeacon() {
  const [allContacts, setAllContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  // Filters
  const [selectedRoles, setSelectedRoles] = useState(
    new Set(['Owner', 'CEO', 'Founder'])
  );
  const [selectedIndustries, setSelectedIndustries] = useState(
    new Set(['Cannabis', 'Hospitality'])
  );
  const [selectedSizes, setSelectedSizes] = useState(
    new Set(['11,20', '21,50', '51,100', '101,200', '201,500'])
  );
  const [location, setLocation] = useState('United States');
  const [maxPages, setMaxPages] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time: timestamp, message, type }]);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const proxyCall = async (endpoint, params, payload) => {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, params, payload }),
    });
    if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
    return response.json();
  };

  const runSearch = async () => {
    setIsSearching(true);
    setProgress(0);
    setLogs([]);
    setAllContacts([]);
    setFilteredContacts([]);
    setSelectedIds(new Set());

    const roles = Array.from(selectedRoles);
    const industries = Array.from(selectedIndustries);
    const sizes = Array.from(selectedSizes);

    log(`Searching ${industries.length} industries, ${roles.length} roles...`);

    const candidates = [];
    for (let page = 1; page <= maxPages; page++) {
      setProgress((page / (maxPages * 2)) * 100);
      log(`Fetching page ${page}/${maxPages}...`);

      const payload = {
        person_titles: roles,
        q_organization_keyword_tags: industries,
        organization_num_employees_ranges: sizes,
        per_page: 10,
        page: page,
      };
      if (location) payload.person_locations = [location];

      try {
        const data = await proxyCall('mixed_people/api_search', null, payload);
        const people = data.people || [];
        if (!people.length) {
          log(`Page ${page}: no more results`);
          break;
        }
        const withEmail = people.filter((p) => p.has_email).length;
        log(`Page ${page}: ${people.length} results, ${withEmail} with email`);
        candidates.push(...people);
      } catch (e) {
        log(`Page ${page} error: ${e.message}`, 'error');
        break;
      }
      await sleep(300);
    }

    log(`Found ${candidates.length} candidates. Enriching...`);

    const toEnrich = candidates.filter((p) => p.has_email).slice(0, 50);
    if (!toEnrich.length) {
      log('No contacts with emails found. Try different filters.', 'error');
      setIsSearching(false);
      return;
    }

    const enriched = [];
    const BATCH = 10;
    for (let i = 0; i < toEnrich.length; i += BATCH) {
      const batch = toEnrich.slice(i, i + BATCH);
      setProgress(50 + (i / toEnrich.length) * 50);
      log(
        `Enriching ${i + 1}–${Math.min(i + BATCH, toEnrich.length)} of ${
          toEnrich.length
        }...`
      );
      try {
        const data = await proxyCall(
          'people/bulk_match',
          'reveal_personal_emails=false&reveal_phone_number=false',
          { details: batch.map((p) => ({ id: p.id })) }
        );
        const matches = (data.matches || []).filter((p) => p.email);
        enriched.push(...matches);
        log(`Got ${matches.length} contacts`);
      } catch (e) {
        log(`Enrichment error: ${e.message}`, 'error');
      }
      await sleep(400);
    }

    setProgress(100);
    log(
      `Done — ${enriched.length} prospects ready.`,
      enriched.length > 0 ? 'success' : 'error'
    );
    setAllContacts(enriched);
    applyFilters(enriched);
    setIsSearching(false);
  };

  const applyFilters = (contacts = allContacts) => {
    const EXCLUDE_INDUSTRIES = [
      'medical',
      'hospital',
      'dental',
      'pharma',
      'health care',
      'banking',
      'financial services',
      'insurance',
      'law',
      'legal',
      'accounting',
      'real estate',
      'government',
      'education',
      'marketing & advertising',
      'public relations',
      'staffing',
      'management consulting',
      'market research',
    ];

    let filtered = contacts.filter((p) => {
      const ind = (p.organization?.industry || '').toLowerCase();
      if (EXCLUDE_INDUSTRIES.some((ex) => ind.includes(ex))) return false;
      if (!searchQuery) return true;
      const searchable = [
        p.first_name,
        p.last_name,
        p.email,
        p.title,
        p.organization?.name,
        p.organization?.industry,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(searchQuery.toLowerCase());
    });

    filtered.sort((a, b) => {
      if (sortBy === 'company')
        return (a.organization?.name || '').localeCompare(
          b.organization?.name || ''
        );
      if (sortBy === 'title')
        return (a.title || '').localeCompare(b.title || '');
      return `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      );
    });

    setFilteredContacts(filtered);
  };

  const exportCSV = (selectedOnly = false) => {
    const data = selectedOnly
      ? filteredContacts.filter((p) => selectedIds.has(p.id))
      : filteredContacts;

    if (!data.length) return;

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Title',
      'Company',
      'Industry',
      'Company Size',
      'LinkedIn',
    ];
    const rows = data.map((p) => [
      p.first_name || '',
      p.last_name || '',
      p.email || '',
      p.title || '',
      p.organization?.name || '',
      p.organization?.industry || '',
      p.organization?.estimated_num_employees || '',
      p.linkedin_url || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTag = (set, setter, value) => {
    const newSet = new Set(set);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    setter(newSet);
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredContacts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleRow = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  React.useEffect(() => {
    applyFilters();
  }, [searchQuery, sortBy]);

  return (
    <div
      style={{
        background: '#f5f5f5',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '320px',
            background: 'white',
            borderRight: '2px solid #e8e8e8',
            overflowY: 'auto',
          }}
        >
          <FilterSection
            title="Job Titles"
            options={[
              'Owner',
              'CEO',
              'Founder',
              'President',
              'VP',
              'Director',
              'Manager',
              'Head of',
              'Chief',
            ]}
            selected={selectedRoles}
            onToggle={(val) => toggleTag(selectedRoles, setSelectedRoles, val)}
          />
          <FilterSection
            title="Industries"
            options={[
              'Cannabis',
              'Hospitality',
              'Restaurant',
              'Retail',
              'E-commerce',
              'SaaS',
              'Technology',
              'Manufacturing',
            ]}
            selected={selectedIndustries}
            onToggle={(val) =>
              toggleTag(selectedIndustries, setSelectedIndustries, val)
            }
          />
          <FilterSection
            title="Company Size"
            options={[
              { label: '1–10', value: '1,10' },
              { label: '11–20', value: '11,20' },
              { label: '21–50', value: '21,50' },
              { label: '51–100', value: '51,100' },
              { label: '101–200', value: '101,200' },
              { label: '201–500', value: '201,500' },
              { label: '500+', value: '501,1000' },
            ]}
            selected={selectedSizes}
            onToggle={(val) => toggleTag(selectedSizes, setSelectedSizes, val)}
          />

          <div style={{ padding: '20px', borderBottom: '1px solid #e8e8e8' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#666',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Location
            </div>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              <option value="United States">United States</option>
              <option value="">Worldwide</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          <div style={{ padding: '20px', borderBottom: '1px solid #e8e8e8' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#666',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Results per search
            </div>
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              <option value="2">20 contacts (2 pages)</option>
              <option value="3">30 contacts (3 pages)</option>
              <option value="5">50 contacts (5 pages)</option>
              <option value="10">100 contacts (10 pages)</option>
            </select>
          </div>

          <div style={{ padding: '20px' }}>
            <button
              onClick={runSearch}
              disabled={isSearching}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '4px',
                border: 'none',
                background: isSearching ? '#ccc' : '#da291c',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSearching ? (
                <>
                  <Loader
                    size={16}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Search Prospects
                </>
              )}
            </button>
            {isSearching && (
              <div
                style={{
                  marginTop: '10px',
                  background: '#e8e8e8',
                  height: '6px',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: '#da291c',
                    height: '100%',
                    width: `${progress}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>

          {/* Logs */}
          <div
            style={{
              padding: '20px',
              borderTop: '2px solid #e8e8e8',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#666',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Activity Log
            </div>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  color:
                    log.type === 'error'
                      ? '#da291c'
                      : log.type === 'success'
                      ? '#28a745'
                      : '#666',
                  marginBottom: '6px',
                  display: 'flex',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#999', minWidth: '60px' }}>
                  {log.time}
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              background: 'white',
              borderBottom: '1px solid #e8e8e8',
              padding: '15px 30px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
              }}
            >
              <div
                style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}
              >
                {filteredContacts.length} results
                {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => exportCSV(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #da291c',
                      background: 'white',
                      color: '#da291c',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Export Selected
                  </button>
                )}
                <button
                  onClick={() => exportCSV(false)}
                  disabled={!filteredContacts.length}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: filteredContacts.length ? '#da291c' : '#ccc',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: filteredContacts.length ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Filter results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              >
                <option value="name">Sort: Name</option>
                <option value="company">Sort: Company</option>
                <option value="title">Sort: Title</option>
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#fafafa' }}>
            {filteredContacts.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                }}
              >
                <Zap
                  size={48}
                  color="#da291c"
                  style={{ opacity: 0.3, marginBottom: '20px' }}
                />
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}
                >
                  Ready to find prospects
                </div>
                <div style={{ fontSize: '14px' }}>
                  Configure your filters and click Search
                </div>
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: 'white',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#f9f9f9',
                      borderBottom: '2px solid #e8e8e8',
                    }}
                  >
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        width: '40px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === filteredContacts.length &&
                          filteredContacts.length > 0
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Title
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Company
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Industry
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((person, i) => (
                    <tr
                      key={person.id}
                      style={{
                        borderBottom: '1px solid #e8e8e8',
                        background: i % 2 === 0 ? 'white' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(person.id)}
                          onChange={() => toggleRow(person.id)}
                        />
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                        }}
                      >
                        {person.first_name} {person.last_name}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          color: '#666',
                        }}
                      >
                        {person.title || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          color: '#1a1a1a',
                        }}
                      >
                        {person.organization?.name || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          color: '#da291c',
                          fontWeight: '600',
                        }}
                      >
                        {person.email || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          color: '#666',
                        }}
                      >
                        {person.organization?.industry || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          color: '#666',
                        }}
                      >
                        {person.organization?.estimated_num_employees || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function FilterSection({ title, options, selected, onToggle }) {
  return (
    <div style={{ padding: '20px', borderBottom: '1px solid #e8e8e8' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#666',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          const isActive = selected.has(value);
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: isActive ? '2px solid #da291c' : '2px solid #e8e8e8',
                background: isActive ? '#fff5f5' : 'white',
                color: isActive ? '#da291c' : '#666',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}