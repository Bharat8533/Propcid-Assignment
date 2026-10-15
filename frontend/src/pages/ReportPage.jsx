import React, { useState, useEffect } from 'react';
import {
  BarChart3, Filter, Search, Plus, Eye, Edit3, Trash2,
  Calendar, Building2, Briefcase, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, User
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

  // Fetch summary and registrations list
  const loadReportData = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page,
        limit: pagination.limit
      };

      // Strip empty filter keys
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

  // Handle Search Input submit / Enter
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
    <div className="container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {isAdmin ? 'System Audit & Analytics' : 'My Registrations & Dashboard'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isAdmin
              ? 'Complete overview of all broker and builder registrations across all agents.'
              : `Tracking registrations initiated by ${currentUser.name}.`}
          </p>
        </div>

        {currentUser.role === 'agent' && (
          <button
            className="btn btn-primary"
            onClick={onNavigateToForm}
          >
            <Plus size={16} />
            <span>New Registration</span>
          </button>
        )}
      </div>

      {/* KPI SUMMARY CARDS (split by Builder / Broker) */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Card 1: Total */}
          <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Registrations
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
              {summary.total?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <span>🏢 Builder: <strong>{summary.total?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.total?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 2: Submitted */}
          <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
              Submitted (Complete)
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emerald)', margin: '0.2rem 0' }}>
              {summary.submitted?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <span>🏢 Builder: <strong>{summary.submitted?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.submitted?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 3: Drafts */}
          <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' }}>
              Active Drafts
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber)', margin: '0.2rem 0' }}>
              {summary.drafts?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <span>🏢 Builder: <strong>{summary.drafts?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.drafts?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 4: Stale Drafts (R8) */}
          <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <AlertTriangle size={13} />
              <span>Stale Drafts (&gt;7d)</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--rose)', margin: '0.2rem 0' }}>
              {summary.staleDrafts?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <span>🏢 Builder: <strong>{summary.staleDrafts?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.staleDrafts?.broker || 0}</strong></span>
            </div>
          </div>

          {/* Card 5: Created Today (R9) */}
          <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Created Today
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>
              {summary.createdToday?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <span>🏢 Builder: <strong>{summary.createdToday?.builder || 0}</strong></span>
              <span>•</span>
              <span>💼 Broker: <strong>{summary.createdToday?.broker || 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* PER-AGENT TABLE (Admins Only) */}
      {isAdmin && agentStats.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '1rem' }}>
              Staff Performance Overview (Admin Audit)
            </h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Field Agent</th>
                  <th>Active Drafts</th>
                  <th>Submitted Total</th>
                  <th>Submitted Today</th>
                  <th>Avg. Draft Completion</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((agent) => (
                  <tr key={agent.agentId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <User size={15} color="var(--primary)" />
                        <span>{agent.agentName}</span>
                      </div>
                    </td>
                    <td>{agent.draftsCount}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>
                        {agent.submittedCount}
                      </span>
                    </td>
                    <td>{agent.submittedTodayCount}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-container" style={{ width: '80px', margin: 0 }}>
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${agent.avgDraftCompletion}%` }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
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
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 className="card-title">Registrations Directory</h2>

            {/* Mobile Filter Toggle Button */}
            <button
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <Filter size={15} />
              <span>{showMobileFilters ? 'Hide Filters' : 'Filter & Search'}</span>
            </button>
          </div>

          {/* Collapsible Filter Bar */}
          <div style={{
            display: showMobileFilters ? 'flex' : 'none',
            flexWrap: 'wrap',
            gap: '0.75rem',
            width: '100%',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            {/* Search */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem', flex: '1 1 200px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search name, email, mobile..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                style={{ minHeight: '38px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 0.75rem' }}>
                <Search size={15} />
              </button>
            </form>

            {/* Status Filter */}
            <select
              className="form-control"
              style={{ width: 'auto', minHeight: '38px', fontSize: '0.85rem' }}
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="submitted">Submitted Only</option>
            </select>

            {/* Type Filter */}
            <select
              className="form-control"
              style={{ width: 'auto', minHeight: '38px', fontSize: '0.85rem' }}
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="builder">Builders Only</option>
              <option value="broker">Brokers Only</option>
            </select>

            {/* Agent filter (Admin only) */}
            {isAdmin && (
              <select
                className="form-control"
                style={{ width: 'auto', minHeight: '38px', fontSize: '0.85rem' }}
                value={filters.agentId}
                onChange={(e) => setFilters(prev => ({ ...prev, agentId: e.target.value }))}
              >
                <option value="">All Agents</option>
                {DEMO_STAFF_USERS.filter(u => u.role === 'agent').map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {/* Date Range: From */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: 'auto', minHeight: '38px', fontSize: '0.8rem' }}
                value={filters.from}
                onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>

            {/* Date Range: To */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: 'auto', minHeight: '38px', fontSize: '0.8rem' }}
                value={filters.to}
                onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setFilters({ q: '', status: '', type: '', agentId: '', from: '', to: '' });
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div>Loading records...</div>
            </div>
          ) : registrations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No registrations found</p>
              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                Try adjusting your search criteria or register a new applicant.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Type</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Completion</th>
                  <th>Agent</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((item) => {
                  const stale = isDraftStale(item.updated_at, item.status);
                  const canEdit = currentUser.role === 'agent' && item.agent_id === currentUser.id && item.status === 'draft';
                  const canDelete =
                    (currentUser.role === 'agent' && item.agent_id === currentUser.id && item.status === 'draft') ||
                    currentUser.role === 'admin';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {item.full_name || <span style={{ color: 'var(--text-muted)' }}>Unnamed Draft</span>}
                        </div>
                        {item.email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.email}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {item.user_type === 'builder' ? <Building2 size={14} color="var(--primary)" /> : <Briefcase size={14} color="var(--emerald)" />}
                          {item.user_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {item.mobile || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                          <span className={`status-pill ${item.status === 'submitted' ? 'status-submitted' : 'status-draft'}`}>
                            {item.status}
                          </span>
                          {stale && (
                            <span className="status-pill status-stale" style={{ fontSize: '0.65rem' }}>
                              ⚠️ Stale (&gt;7d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div className="progress-container" style={{ width: '60px', margin: 0 }}>
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {item.completion}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {item.agent_name || `Agent #${item.agent_id}`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {/* View Button */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onEditRegistration(item.id)}
                            title="View Registration Details"
                          >
                            <Eye size={14} />
                            <span className="hide-on-mobile">View</span>
                          </button>

                          {/* Edit Button (Own drafts only) */}
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => onEditRegistration(item.id)}
                              title="Edit Draft"
                            >
                              <Edit3 size={14} />
                              <span className="hide-on-mobile">Edit</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteModalState({ isOpen: true, registration: item })}
                              title={isAdmin ? 'Delete registration (audit reason required)' : 'Delete draft'}
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
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} registrations)
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next <ChevronRight size={15} />
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
