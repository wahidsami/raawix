import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { Building2, Plus, Globe, ScanSearch, Edit, Trash2, ExternalLink, Upload, ImageIcon } from 'lucide-react';

interface Entity {
  id: string;
  nameEn: string;
  nameAr?: string;
  type: string;
  sector?: string;
  status: string;
  notes?: string;
  logoPath?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    properties: number;
    scans: number;
    contacts: number;
  };
  properties?: Array<{
    id: string;
    domain: string;
    displayNameEn?: string;
    displayNameAr?: string;
    isPrimary: boolean;
  }>;
}

export default function EntitiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    type: 'private' as 'government' | 'private',
    sector: '',
    status: 'active' as 'active' | 'onboarding' | 'paused',
    notes: '',
    logoPath: '',
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEntities();
      setEntities(response.entities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
        setError('Invalid file type. Only PNG, JPG, and SVG are allowed.');
        return;
      }
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setError('File too large. Maximum size is 2MB.');
        return;
      }
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('logo', logoFile);

      // Get token from localStorage (correct key: raawix_token)
      const token = localStorage.getItem('raawix_token');
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/entity-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload logo');
      }

      const data = await response.json();
      return data.path;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Upload logo if a new one was selected
      let logoPath = formData.logoPath;
      if (logoFile) {
        const uploadedPath = await uploadLogo();
        if (uploadedPath) {
          logoPath = uploadedPath;
        }
      }

      const entityData = { ...formData, logoPath };

      let createdEntityId: string | undefined;
      if (editingEntity) {
        await apiClient.updateEntity(editingEntity.id, entityData);
      } else {
        const { entity: created } = await apiClient.createEntity(entityData);
        createdEntityId = created?.id;
      }

      setShowCreateModal(false);
      setEditingEntity(null);
      setLogoFile(null);
      setLogoPreview(null);
      setFormData({
        nameEn: '',
        nameAr: '',
        type: 'private',
        sector: '',
        status: 'active',
        notes: '',
        logoPath: '',
      });
      fetchEntities();
      if (createdEntityId) {
        navigate(`/entities/${createdEntityId}?tab=properties`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entity');
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      nameEn: entity.nameEn,
      nameAr: entity.nameAr || '',
      type: entity.type as 'government' | 'private',
      sector: entity.sector || '',
      status: entity.status as 'active' | 'onboarding' | 'paused',
      notes: entity.notes || '',
      logoPath: entity.logoPath || '',
    });
    // Set logo preview if entity has a logo
    if (entity.logoPath) {
      setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/${entity.logoPath}`);
    } else {
      setLogoPreview(null);
    }
    setLogoFile(null);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.delete') + '?')) return;
    try {
      await apiClient.deleteEntity(id);
      fetchEntities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entity');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 text-white';
      case 'onboarding':
        return 'bg-yellow-600 text-white';
      case 'paused':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error && !entities.length) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            setEditingEntity(null);
            setLogoFile(null);
            setLogoPreview(null);
            setFormData({
              nameEn: '',
              nameAr: '',
              type: 'private',
              sector: '',
              status: 'active',
              notes: '',
              logoPath: '',
            });
            setShowCreateModal(true);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('entities.addEntity')}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      {entities.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            {t('entities.noEntities')}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t('entities.noEntities')} {t('entities.addEntity')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            {t('entities.addEntity')}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.nameEn')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.type')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.status')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.totalProperties')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.totalScans')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entities.map((entity) => (
                <tr key={entity.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{entity.nameEn}</div>
                      {entity.nameAr && (
                        <div className="text-sm text-muted-foreground">{entity.nameAr}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">
                      {entity.type === 'government' ? t('entities.typeGovernment') : t('entities.typePrivate')}
                    </span>
                    {entity.sector && (
                      <div className="text-xs text-muted-foreground">{entity.sector}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(entity.status)}`}>
                      {t(`entities.status${entity.status.charAt(0).toUpperCase() + entity.status.slice(1)}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{entity._count.properties}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ScanSearch className="w-4 h-4 text-muted-foreground" />
                      <span>{entity._count.scans}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/entities/${entity.id}`)}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        {t('common.view')}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleEdit(entity)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entity.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingEntity ? t('entities.editEntity') : t('entities.addEntity')}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.nameEn')} *</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.nameAr')}</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('entities.logo') || 'Entity Logo'}
                </label>
                <div className="space-y-2">
                  {logoPreview && (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Logo uploaded</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background hover:bg-muted cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {logoFile ? logoFile.name : (logoPreview ? 'Change Logo' : 'Upload Logo')}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {(logoFile || logoPreview) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                          setFormData({ ...formData, logoPath: '' });
                        }}
                        className="text-destructive hover:text-destructive/80 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or SVG. Max 2MB.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.type')} *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'government' | 'private' })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="private">{t('entities.typePrivate')}</option>
                  <option value="government">{t('entities.typeGovernment')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.sector')}</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'onboarding' | 'paused' })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="active">{t('entities.statusActive')}</option>
                  <option value="onboarding">{t('entities.statusOnboarding')}</option>
                  <option value="paused">{t('entities.statusPaused')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEntity(null);
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                  disabled={uploading}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

