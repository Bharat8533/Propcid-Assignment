import React, { useState, useEffect } from 'react';
import {
  Filter, Search, Plus, Eye, Edit3, Trash2,
  Building2, Briefcase, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, User
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'System Audit & Analytics' : 'My Registrations & Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Complete overview of all broker and builder registrations across all agents.'
              : `Tracking registrations initiated by ${currentUser.name}.`}
          </p>
        </div>

        {currentUser.role === 'agent' && (
          <button
            onClick={onNavigateToForm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>New Registration</span>
          </button>
        )}
      </div>

      {/* KPI SUMMARY CARDS */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Total */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Registrations
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 my-1">
              {summary.total?.total || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex gap-2">
              <span>🏢 Builder: <strong>{summary.total?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.total?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 2: Submitted */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Submitted (Complete)
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 my-1">
              {summary.submitted?.total || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex gap-2">
              <span>🏢 Builder: <strong>{summary.submitted?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.submitted?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 3: Drafts */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              Active Drafts
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-600 my-1">
              {summary.drafts?.total || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex gap-2">
              <span>🏢 Builder: <strong>{summary.drafts?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.drafts?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 4: Stale Drafts (R8) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>Stale Drafts (&gt;7d)</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-red-600 my-1">
              {summary.staleDrafts?.total || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex gap-2">
              <span>🏢 Builder: <strong>{summary.staleDrafts?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.staleDrafts?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 5: Created Today (R9) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm col-span-2 md:col-span-1">
            <div className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">
              Created Today
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 my-1">
              {summary.createdToday?.total || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex gap-2">
              <span>🏢 Builder: <strong>{summary.createdToday?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.createdToday?.broker || 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* PER-AGENT TABLE (Admins Only) */}
      {isAdmin && agentStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Staff Performance Overview (Admin Audit)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="p-3 pl-4">Field Agent</th>
                  <th className="p-3">Active Drafts</th>
                  <th className="p-3">Submitted Total</th>
                  <th className="p-3">Submitted Today</th>
                  <th className="p-3 pr-4">Avg. Draft Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentStats.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-slate-50/70">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <User size={14} className="text-blue-600" />
                        <span>{agent.agentName}</span>
                      </div>
                    </td>
                    <td className="p-3">{agent.draftsCount}</td>
                    <td className="p-3 font-semibold text-emerald-600">{agent.submittedCount}</td>
                    <td className="p-3">{agent.submittedTodayCount}</td>
                    <td className="p-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${agent.avgDraftCompletion}%` }}
                          />
                        </div>
                        <span className="font-semibold text-xs text-slate-700">
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold text-slate-900">Registrations Directory</h2>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
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
            <form onSubmit={handleSearchSubmit} className="flex gap-1.5 flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search name, email, mobile..."
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center"
              >
                <Search size={14} />
              </button>
            </form>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="submitted">Submitted Only</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="">All Types</option>
              <option value="builder">Builders Only</option>
              <option value="broker">Brokers Only</option>
            </select>

            {/* Agent filter (Admin only) */}
            {isAdmin && (
              <select
                value={filters.agentId}
                onChange={(e) => setFilters((prev) => ({ ...prev, agentId: e.target.value }))}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
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
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400">From:</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
              />
            </div>

            {/* Date Range: To */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400">To:</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
              />
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={() => setFilters({ q: '', status: '', type: '', agentId: '', from: '', to: '' })}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
              <div className="text-xs">Loading registrations...</div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-semibold text-sm">No registrations found</p>
              <p className="text-xs mt-1">Try adjusting your filters or register a new client.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 whitespace-nowrap">
                  <th className="p-3 pl-4">Applicant Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Completion</th>
                  <th className="p-3">Agent</th>
                  <th className="p-3">Last Updated</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-900">
                          {item.full_name || <span className="text-slate-400">Unnamed Draft</span>}
                        </div>
                        {item.email && <div className="text-[11px] text-slate-400">{item.email}</div>}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize">
                          {item.user_type === 'builder' ? (
                            <Building2 size={14} className="text-blue-600" />
                          ) : (
                            <Briefcase size={14} className="text-emerald-600" />
                          )}
                          {item.user_type}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-xs text-slate-700">
                        {item.mobile || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'submitted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                          {stale && (
                            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              ⚠️ Stale (&gt;7d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {item.completion}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-slate-600">
                        {item.agent_name || `Agent #${item.agent_id}`}
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-slate-400">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditRegistration(item.id)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                            title="View"
                          >
                            <Eye size={13} />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEditRegistration(item.id)}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 flex items-center gap-1"
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
                              className="p-1 rounded text-red-600 hover:bg-red-50"
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
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} registrations)
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
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
