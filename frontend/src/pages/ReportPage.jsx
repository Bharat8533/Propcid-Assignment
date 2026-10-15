import React, { useState, useEffect } from 'react';
import {
  Filter, Search, Plus, Eye, Edit3, Trash2,
  Building2, Briefcase, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, User, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { isDraftStale } from '../utils/validation';
import { DEMO_STAFF_USERS } from '../constants/indianData';
import DeleteModal from '../components/DeleteModal';

export default function ReportPage({
  currentUser,
  onNavigateToForm,
  onEditRegistration,
  showToast
}) {
  const [summary, setSummary] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    type: '',
    agentId: '',
    from: '',
    to: ''
  });

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    registration: null
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const loadReportData = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page,
        limit: pagination.limit
      };

      Object.keys(params).forEach(k => {
        if (!params[k]) delete params[k];
      });

      const [summaryRes, listRes] = await Promise.all([
        api.getSummary(params),
        api.getRegistrations(params)
      ]);

      if (summaryRes) {
        setSummary(summaryRes.summary);
        if (summaryRes.agentStats) setAgentStats(summaryRes.agentStats);
      }

      if (listRes) {
        setRegistrations(listRes.items || []);
        if (listRes.pagination) {
          setPagination(listRes.pagination);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error fetching report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(1);
  }, [filters.status, filters.type, filters.agentId, filters.from, filters.to]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReportData(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadReportData(newPage);
  };

  const handleDeleteConfirm = async (id, reason) => {
    try {
      setDeleteLoading(true);
      await api.deleteRegistration(id, reason);
      showToast('Registration deleted successfully', 'success');
      setDeleteModalState({ isOpen: false, registration: null });
      loadReportData(pagination.page);
    } catch (err) {
      showToast(err.message || 'Error deleting registration', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              {isAdmin ? 'System Audit' : 'Agent Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isAdmin ? 'Executive Compliance Dashboard' : 'My Registration Records'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Real-time platform overview: monitoring completion metrics, draft lifecycle, and broker/builder split.'
              : `Managing client registrations and compliance submissions for ${currentUser.name}.`}
          </p>
        </div>

        {currentUser.role === 'agent' && (
          <button
            onClick={onNavigateToForm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-sm font-bold hover:from-indigo-700 hover:to-indigo-800 flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95"
          >
            <Plus size={16} />
            <span>New Registration</span>
          </button>
        )}
      </div>

      {/* KPI SUMMARY CARDS */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Card 1: Total */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entries</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 my-1.5">{summary.total?.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">🏢 {summary.total?.builder || 0}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">💼 {summary.total?.broker || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Submitted */}
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Submitted</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 my-1.5">{summary.submitted?.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <span className="bg-emerald-50 px-2 py-0.5 rounded-md">🏢 {summary.submitted?.builder || 0}</span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded-md">💼 {summary.submitted?.broker || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Drafts */}
          <div className="bg-white border border-amber-100 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Active Drafts</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 my-1.5">{summary.drafts?.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                <span className="bg-amber-50 px-2 py-0.5 rounded-md">🏢 {summary.drafts?.builder || 0}</span>
                <span className="bg-amber-50 px-2 py-0.5 rounded-md">💼 {summary.drafts?.broker || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Stale Drafts (R8) */}
          <div className="bg-white border border-rose-100 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                <AlertTriangle size={12} /> Stale (&gt;7d)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 my-1.5">{summary.staleDrafts?.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-medium">
                <span className="bg-rose-50 px-2 py-0.5 rounded-md">🏢 {summary.staleDrafts?.builder || 0}</span>
                <span className="bg-rose-50 px-2 py-0.5 rounded-md">💼 {summary.staleDrafts?.broker || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 5: Created Today (R9) */}
          <div className="bg-white border border-indigo-100 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group col-span-2 lg:col-span-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Created Today</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 my-1.5">{summary.createdToday?.total || 0}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                <span className="bg-indigo-50 px-2 py-0.5 rounded-md">🏢 {summary.createdToday?.builder || 0}</span>
                <span className="bg-indigo-50 px-2 py-0.5 rounded-md">💼 {summary.createdToday?.broker || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PER-AGENT TABLE (Admins Only) */}
      {isAdmin && agentStats.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Staff Performance &amp; Completion Audit
              </h2>
              <p className="text-xs text-slate-500">Cross-agent productivity metrics and real-time draft progress.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Admin Exclusive
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                  <th className="p-4 pl-6">Field Agent</th>
                  <th className="p-4">Active Drafts</th>
                  <th className="p-4">Submitted Total</th>
                  <th className="p-4">Submitted Today</th>
                  <th className="p-4 pr-6">Avg. Draft Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {agentStats.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {agent.agentName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{agent.agentName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{agent.draftsCount}</td>
                    <td className="p-4 font-bold text-emerald-600">{agent.submittedCount}</td>
                    <td className="p-4 text-slate-700">{agent.submittedTodayCount}</td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                            style={{ width: `${agent.avgDraftCompletion}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs text-slate-800">
                          {agent.avgDraftCompletion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTRATIONS LIST & FILTERS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Registration Records</h2>
              <p className="text-xs text-slate-500">Search, inspect and audit registrations across categories.</p>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Filter size={14} />
              <span>{showMobileFilters ? 'Hide Filters' : 'Filter & Search'}</span>
            </button>
          </div>

          {/* Collapsible Filter Bar */}
          <div
            className={`mt-4 pt-4 border-t border-slate-100 flex-wrap gap-2.5 items-center ${
              showMobileFilters ? 'flex' : 'hidden'
            }`}
          >
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-1.5 flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search by name, email, mobile..."
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center shadow-sm"
              >
                <Search size={14} />
              </button>
            </form>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="submitted">Submitted Only</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="">All Categories</option>
              <option value="builder">Builders Only</option>
              <option value="broker">Brokers Only</option>
            </select>

            {/* Agent filter (Admin only) */}
            {isAdmin && (
              <select
                value={filters.agentId}
                onChange={(e) => setFilters((prev) => ({ ...prev, agentId: e.target.value }))}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
              >
                <option value="">All Agents</option>
                {DEMO_STAFF_USERS.filter((u) => u.role === 'agent').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range: From */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
              />
            </div>

            {/* Date Range: To */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
              />
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={() => setFilters({ q: '', status: '', type: '', agentId: '', from: '', to: '' })}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <div className="text-xs font-semibold">Updating directory records...</div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <p className="font-bold text-sm text-slate-600">No registrations found</p>
              <p className="text-xs mt-1 text-slate-400">Try modifying your filter parameters or create a new entry.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80 whitespace-nowrap">
                  <th className="p-4 pl-6">Applicant Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Completion</th>
                  <th className="p-4">Assigned Agent</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {registrations.map((item) => {
                  const stale = isDraftStale(item.updated_at, item.status);
                  const canEdit =
                    currentUser.role === 'agent' &&
                    item.agent_id === currentUser.id &&
                    item.status === 'draft';
                  const canDelete =
                    (currentUser.role === 'agent' &&
                      item.agent_id === currentUser.id &&
                      item.status === 'draft') ||
                    currentUser.role === 'admin';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900">
                          {item.full_name || <span className="text-slate-400 font-normal">Unnamed Draft</span>}
                        </div>
                        {item.email && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.email}</div>}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold capitalize">
                          {item.user_type === 'builder' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Building2 size={13} /> Builder
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Briefcase size={13} /> Broker
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-xs text-slate-700">
                        {item.mobile ? `+91 ${item.mobile}` : '—'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                              item.status === 'submitted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                          {stale && (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                              ⚠️ Stale (&gt;7d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {item.completion}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs text-slate-700">
                        {item.agent_name || `Agent #${item.agent_id}`}
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditRegistration(item.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-sm transition-colors"
                            title="View"
                          >
                            <Eye size={13} />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEditRegistration(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 border border-indigo-200/80 transition-colors"
                              title="Edit Draft"
                            >
                              <Edit3 size={13} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteModalState({ isOpen: true, registration: item })
                              }
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                              title={
                                isAdmin
                                  ? 'Delete registration (audit reason required)'
                                  : 'Delete draft'
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paging Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} registrations)
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-bold shadow-sm"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-bold shadow-sm"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalState.isOpen}
        registration={deleteModalState.registration}
        userRole={currentUser.role}
        onClose={() => setDeleteModalState({ isOpen: false, registration: null })}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}
