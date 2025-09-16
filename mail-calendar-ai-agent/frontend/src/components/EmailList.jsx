// Clean, de-duplicated EmailList component after resolving corruption
import React, { useState, useEffect } from 'react';
import { useAuth, useUI } from '../hooks/useApi.js';
import { databaseService } from '../services/api.js';
import { Mail, Calendar, Star, Clock, User, Search, Filter, ChevronDown, RefreshCw, Eye, MoreHorizontal, TrendingUp } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

const EmailList = () => {
  const auth = useAuth();
  const ui = useUI();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('processedAt');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadEmails(); }, [auth.email, sortBy, filterBy]);

  const loadEmails = async () => {
    if (!auth.email) return;
    try {
      setLoading(true);
      const response = await databaseService.getProcessedEmails(auth.email, 100);
      let emailData = response?.data?.emails || [];
      emailData = sortEmails(emailData, sortBy);
      emailData = filterEmails(emailData, filterBy);
      setEmails(emailData);
    } catch (e) {
      console.error('Failed to load emails', e);
      ui.addNotification({ type: 'error', message: 'Failed to load processed emails' });
    } finally { setLoading(false); }
  };

  const sortEmails = (list, key) => ([...list].sort((a, b) => {
    switch (key) {
      case 'processedAt': return new Date(b.processedAt) - new Date(a.processedAt);
      case 'importance': return (b.importanceScore || 0) - (a.importanceScore || 0);
      case 'subject': return (a.subject || '').localeCompare(b.subject || '');
      case 'sender': return (a.sender || '').localeCompare(b.sender || '');
      default: return 0;
    }
  }));

  const filterEmails = (list, key) => {
    switch (key) {
      case 'high-importance': return list.filter(e => (e.importanceScore || 0) >= 7);
      case 'has-deadline': return list.filter(e => e.hasDeadline);
      case 'has-calendar': return list.filter(e => e.hasCalendarEvent);
      case 'recent': { const d=new Date(); d.setDate(d.getDate()-3); return list.filter(e => new Date(e.processedAt) > d); }
      default: return list;
    }
  };

  const filtered = emails.filter(e =>
    (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.sender || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.aiSummary && e.aiSummary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const importanceColor = (s=0) => s>=8 ? 'text-red-600 bg-red-100' : s>=6 ? 'text-orange-600 bg-orange-100' : 'text-gray-600 bg-gray-100';
  const importanceLabel = (s=0) => s>=8 ? 'High' : s>=6 ? 'Medium' : 'Low';

  if (loading) return <div className="flex items-center justify-center py-12"><LoadingSpinner message="Loading processed emails..." /></div>;

  return (
    <div className="space-y-8">
      {/* Search & Controls */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="w-full max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search processed emails"
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className="input pl-10 bg-white/80 backdrop-blur-sm focus:bg-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium tracking-wide text-slate-600 uppercase">Sort</label>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="input w-auto min-w-40 text-sm">
              <option value="processedAt">Latest Processed</option>
              <option value="importance">Importance Score</option>
              <option value="subject">Subject</option>
              <option value="sender">Sender</option>
            </select>
          </div>
          <button className={`btn btn-secondary text-sm ${showFilters?'ring-1 ring-inset ring-primary-300 bg-primary-50 text-primary-700':''}`} onClick={()=>setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters?'rotate-180':''}`} />
          </button>
          <button className="btn btn-secondary text-sm" onClick={loadEmails} aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Filter Pills */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value:'all', label:'All Emails', count: emails.length },
              { value:'high-importance', label:'High Importance (7+)', count: emails.filter(e => (e.importanceScore||0) >=7).length },
              { value:'has-deadline', label:'Has Deadline', count: emails.filter(e => e.hasDeadline).length },
              { value:'has-calendar', label:'Calendar Event Created', count: emails.filter(e => e.hasCalendarEvent).length },
              { value:'recent', label:'Recent (3 days)', count: emails.filter(e => { const d=new Date(); d.setDate(d.getDate()-3); return new Date(e.processedAt) > d; }).length }
            ].map(o => (
              <button key={o.value} onClick={()=>setFilterBy(o.value)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterBy===o.value?'bg-primary-600 text-white border-primary-600 shadow-sm':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {o.label}
                <span className="ml-1.5 text-[10px] font-semibold opacity-70">{o.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {filtered.length > 0 && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px] text-slate-600">
          <p className="font-medium tracking-tight">Showing {filtered.length} of {emails.length} emails</p>
          <div className="flex items-center gap-4 flex-wrap">
            {['High','Medium','Low'].map(level => (
              <div key={level} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full border ${level==='High'?'bg-red-200 border-red-300': level==='Medium'?'bg-orange-200 border-orange-300':'bg-slate-200 border-slate-300'}`} />
                <span>{level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Items */}
      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map((email, i) => (
          <div
            key={email.id || i}
            onClick={()=>setSelectedEmail(selectedEmail?.id===email.id?null:email)}
            className={`rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5 transition-colors cursor-pointer hover:border-slate-300 ${selectedEmail?.id===email.id?'ring-1 ring-primary-500 border-primary-300':''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 leading-5 truncate flex items-center gap-2">
                    {(()=>{const p=new Date(email.processedAt); const h=(Date.now()-p.getTime())/36e5; return h<=24?<span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-600" aria-hidden="true" />:null;})()}
                    {email.subject || 'No Subject'}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${importanceColor(email.importanceScore)}`}><Star className="w-3 h-3" />{email.importanceScore || 0}</span>
                    {email.hasDeadline && <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3" />Deadline</span>}
                    {email.hasCalendarEvent && <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 border-green-200"><Calendar className="w-3 h-3" />Event</span>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[12px] text-slate-600 mb-3">
                  <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span className="truncate max-w-[14rem]">{email.sender}</span></div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /><span className="truncate">{new Date(email.processedAt).toLocaleString()}</span></div>
                </div>
                {email.aiSummary && <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 mb-2"><p className="text-[12px] leading-relaxed text-slate-700"><span className="font-medium text-slate-800">Summary:</span> {email.aiSummary}</p></div>}
              </div>
              <div className="flex items-center gap-1 ml-2" onClick={e=>e.stopPropagation()}>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Preview"><Eye className="w-4 h-4" /></button>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="More"><MoreHorizontal className="w-4 h-4" /></button>
              </div>
            </div>
            {selectedEmail?.id===email.id && (
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-2"><Mail className="w-4 h-4" />Content</h4>
                    <div className="rounded-xl border border-slate-200 bg-white/60 max-h-44 overflow-y-auto custom-scrollbar p-4"><p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{email.content || 'No content available'}</p></div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4" />Analysis</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3"><div className="text-lg font-semibold text-blue-600 leading-none mb-0.5">{email.importanceScore || 0}/10</div><div className="text-[11px] font-medium text-blue-700">{importanceLabel(email.importanceScore)} Importance</div></div>
                      <div className={`rounded-lg border p-3 ${email.hasDeadline?'border-yellow-200 bg-yellow-50/70':'border-slate-200 bg-slate-50/60'}`}><div className={`text-[11px] font-medium mb-1 ${email.hasDeadline?'text-yellow-700':'text-slate-600'}`}>Deadline</div><div className={`text-xs font-semibold ${email.hasDeadline?'text-yellow-600':'text-slate-500'}`}>{email.hasDeadline?'Detected':'None'}</div></div>
                      <div className={`rounded-lg border p-3 ${email.hasCalendarEvent?'border-green-200 bg-green-50/70':'border-slate-200 bg-slate-50/60'}`}><div className={`text-[11px] font-medium mb-1 ${email.hasCalendarEvent?'text-green-700':'text-slate-600'}`}>Calendar</div><div className={`text-xs font-semibold ${email.hasCalendarEvent?'text-green-600':'text-slate-500'}`}>{email.hasCalendarEvent?'Event Created':'None'}</div></div>
                      <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3"><div className="text-[11px] font-medium text-purple-700 mb-1">Processed</div><div className="text-xs font-semibold text-purple-600">{new Date(email.processedAt).toLocaleDateString()}</div></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Metadata</h4>
                  <div className="rounded-xl border border-slate-200 bg-white/60 p-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] leading-relaxed">
                      <div><dt className="font-medium text-slate-500 mb-0.5">Message ID</dt><dd className="text-slate-800 font-mono text-[10px] break-all">{email.messageId || email.id}</dd></div>
                      <div><dt className="font-medium text-slate-500 mb-0.5">Processed</dt><dd className="text-slate-800">{new Date(email.processedAt).toLocaleString()}</dd></div>
                      <div><dt className="font-medium text-slate-500 mb-0.5">Content Length</dt><dd className="text-slate-800">{email.content?`${email.content.length} chars`:'N/A'}</dd></div>
                      <div><dt className="font-medium text-slate-500 mb-0.5">Summary Length</dt><dd className="text-slate-800">{email.aiSummary?`${email.aiSummary.length} chars`:'N/A'}</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white/50">
            <Mail className="w-14 h-14 text-slate-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No emails found</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm leading-relaxed">{searchTerm ? 'No emails match your criteria. Adjust search or filters.' : 'No processed emails yet. Run processing to populate this list.'}</p>
            {!searchTerm && <div className="flex flex-col sm:flex-row items-center justify-center gap-4"><button className="btn btn-primary" onClick={()=>ui.setActiveTab('dashboard')}><TrendingUp className="w-4 h-4" />Dashboard</button><button className="btn btn-secondary" onClick={loadEmails}><RefreshCw className="w-4 h-4" />Refresh</button></div>}
            {searchTerm && <button className="btn btn-secondary" onClick={()=>setSearchTerm('')}>Clear Search</button>}
          </div>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-tr from-white via-slate-50 to-slate-100 p-6">
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase mb-5">Email Processing Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div className="flex flex-col items-center justify-center"><div className="text-xl font-semibold text-blue-600 tracking-tight mb-1">{filtered.filter(e => (e.importanceScore || 0) >= 7).length}</div><div className="text-[11px] font-medium text-slate-600 uppercase">High Priority</div></div>
            <div className="flex flex-col items-center justify-center"><div className="text-xl font-semibold text-amber-600 tracking-tight mb-1">{filtered.filter(e => e.hasDeadline).length}</div><div className="text-[11px] font-medium text-slate-600 uppercase">With Deadlines</div></div>
            <div className="flex flex-col items-center justify-center"><div className="text-xl font-semibold text-green-600 tracking-tight mb-1">{filtered.filter(e => e.hasCalendarEvent).length}</div><div className="text-[11px] font-medium text-slate-600 uppercase">Calendar Events</div></div>
            <div className="flex flex-col items-center justify-center"><div className="text-xl font-semibold text-purple-600 tracking-tight mb-1">{Math.round(filtered.reduce((acc,e)=>acc+(e.importanceScore||0),0)/filtered.length) || 0}</div><div className="text-[11px] font-medium text-slate-600 uppercase">Avg Importance</div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailList;
