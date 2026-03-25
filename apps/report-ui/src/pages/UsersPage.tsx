import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient, type User } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Users as UsersIcon, Plus, Pencil, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [addForm, setAddForm] = useState({ email: '', password: '', role: 'viewer' as 'admin' | 'viewer' });
  const [editForm, setEditForm] = useState({ role: 'viewer' as 'admin' | 'viewer', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getUsers();
      setUsers(res.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.loadError'));
      if ((err as Error).message?.includes('403') || (err as Error).message?.toLowerCase().includes('admin')) {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.createUser({
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
      });
      setShowAddModal(false);
      setAddForm({ email: '', password: '', role: 'viewer' });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const body: { role?: string; newPassword?: string } = { role: editForm.role };
      if (editForm.newPassword) body.newPassword = editForm.newPassword;
      await apiClient.updateUser(editingUser.id, body);
      setEditingUser(null);
      setEditForm({ role: 'viewer', newPassword: '' });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteUser(id);
      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.deleteError'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('nav.users')}</h1>
        <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
          {t('users.adminOnly')}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <span className="text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UsersIcon className="w-6 h-6" />
          {t('nav.users')}
        </h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {t('users.addUser')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('users.email')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('users.role')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('users.createdAt')}</th>
              <th className="px-6 py-3 text-right text-sm font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-6 py-4">{u.email}</td>
                <td className="px-6 py-4 capitalize">{u.role}</td>
                <td className="px-6 py-4 text-muted-foreground text-sm">
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  {deleteConfirm === u.id ? (
                    <span className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="text-destructive hover:underline text-sm"
                      >
                        {t('common.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="text-muted-foreground hover:underline text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(u);
                          setEditForm({ role: u.role as 'admin' | 'viewer', newPassword: '' });
                        }}
                        className="p-1.5 rounded hover:bg-muted"
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(u.id)}
                        disabled={currentUser?.id === u.id}
                        className="p-1.5 rounded hover:bg-muted text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-6 py-8 text-center text-muted-foreground">{t('users.noUsers')}</div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-md w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{t('users.addUser')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as 'admin' | 'viewer' }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('users.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-md w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{t('users.editUser')} – {editingUser.email}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'admin' | 'viewer' }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.newPasswordOptional')}</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setEditForm({ role: 'viewer', newPassword: '' }); }}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
