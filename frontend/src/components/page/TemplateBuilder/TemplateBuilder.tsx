
import { useState, useEffect } from 'react';
import { createTemplate, updateTemplate } from '../../../services';
import { getAvailableModels, prettifyModelName } from '../../../services/models';
import { uploadDocuments } from '../../../services/documents';
import type { Model } from '../../../types';
import type { TemplateCreate } from '../../../types/models';
import { DEFAULT_TEMPLATE_SETTINGS } from '../../../types/models';
import { Plus, Trash2 } from '../../../icons';
import { Modal } from '../../common/Modal/Modal';
import { FormField } from '../../common/FormField/FormField';
import style from './TemplateBuilder.module.css';

interface TemplateBuilderProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    initialData?: TemplateCreate;
    onSuccess?: (template: TemplateCreate) => void;
}

function TemplateBuilder({ open, onClose, mode, initialData, onSuccess }: TemplateBuilderProps) {
    const [formData, setFormData] = useState<TemplateCreate>(
        initialData || { name: '', description: '', sources: [], settings: DEFAULT_TEMPLATE_SETTINGS }
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState('');
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'settings'>('basic');
    const [_urlInput, setUrlInput] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<Model[]>([]);

    useEffect(() => {
        if (!open) {
            setNameError('');
            return;
        }
        if (open) {
            setFormData(initialData || { name: '', description: '', sources: [], settings: DEFAULT_TEMPLATE_SETTINGS });
            setError(null);
            setSuccess(null);
            setNameError('');
            setUploadError(null);
            setActiveTab('basic');
            setUrlInput('');

            void (async () => {
                try {
                    const models = await getAvailableModels();
                    setAvailableModels(models);
                } catch (modelsError) {
                    console.error('Failed to load available models for template builder:', modelsError);
                    setAvailableModels([]);
                }
            })();
        }
    }, [open, initialData]);

    /** Show just the filename part of a full server path or a bare filename. */
    const displayName = (source: string) => {
        const parts = source.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || source;
    };

    const handleFileUpload = async (files: File[]) => {
        if (files.length === 0) return;
        setIsUploadingFiles(true);
        setUploadError(null);
        try {
            const result = await uploadDocuments(files);
            const addedSources: string[] = [];
            const failedNames: string[] = [];

            for (const item of result.file_results) {
                if (item.source && (item.status === 'ingested' || item.status === 'cached' || item.status === 'uploaded')) {
                    addedSources.push(item.source);
                } else {
                    failedNames.push(item.file_name);
                }
            }

            if (addedSources.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    sources: [...(prev.sources || []), ...addedSources],
                }));
            }

            if (failedNames.length > 0) {
                setUploadError(`Failed to upload: ${failedNames.join(', ')}`);
            }
        } catch (err: any) {
            setUploadError(err.message || 'Failed to upload files');
        } finally {
            setIsUploadingFiles(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.name.trim()) {
            setNameError('Template name is required');
            setActiveTab('basic');
            return;
        }
        setNameError('');
        try {
            setIsLoading(true);
            let result;
            if (mode === 'create') {
                result = await createTemplate(formData);
            } else {
                // For edit mode, you likely need an id and data
                // If your updateTemplate expects (id, data):
                if (!initialData || !(initialData as any).id) {
                    throw new Error('No template id provided for update');
                }
                result = await updateTemplate((initialData as any).id, formData);
            }
            setSuccess(`Template "${result.name}" ${mode === 'create' ? 'created' : 'updated'} successfully!`);
            onSuccess?.(result);
            onClose();
        } catch (err: any) {
            setError(err.message || `Failed to ${mode === 'create' ? 'create' : 'update'} template`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Create New Template' : `Edit: ${formData.name || 'Template'}` }>
            <div className={style['template-builder-root']}>
                <div className={style['template-builder-header']}>
                    <p className={style['template-builder-subtitle']}>
                        {mode === 'create'
                            ? 'Create a compact reusable knowledge template for future chats.'
                            : 'Refine sources and model settings for this template.'}
                    </p>
                </div>
                <div className="form-tabs">
                    <button
                        type="button"
                        className={[
                            'form-tab',
                            activeTab === 'basic' ? 'is-active' : '',
                            nameError ? 'has-error' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setActiveTab('basic')}
                    >
                        Basic Info
                    </button>
                    <button
                        type="button"
                        className={activeTab === 'settings' ? 'form-tab is-active' : 'form-tab'}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </div>
                <form className={`${style['template-builder-form']}`} onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-tab-panel">
                        {activeTab === 'basic' && (
                            <>
                                {/* Name Field */}
                                <FormField label="Template Name" htmlFor="template-name" error={nameError} required>
                                    <input
                                        id="template-name"
                                        className={`form-input${nameError ? ' has-error' : ''}`}
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setNameError(''); }}
                                        placeholder="e.g., Python Documentation Helper"
                                        autoFocus
                                    />
                                </FormField>
                                {/* Description Field */}
                                <FormField label="Description" htmlFor="template-desc" hint="What is this template for?">
                                    <textarea
                                        id="template-desc"
                                        className="form-textarea"
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="What is this template for?"
                                        rows={3}
                                    />
                                </FormField>
                                {/* Document Sources: File Upload and URLs */}
                                <fieldset className="form-fieldset sources-fieldset">
                                    <legend className="form-legend">Document Sources</legend>
                                    <div className="sources-section sources-row">
                                        <div className="sources-upload">
                                            <label className="form-label" htmlFor="template-files">
                                                Upload Files{isUploadingFiles && <span className="form-hint"> — uploading…</span>}
                                            </label>
                                            <input
                                                id="template-files"
                                                className="form-input sources-input-box"
                                                type="file"
                                                multiple
                                                accept=".pdf,.txt,.md,.docx"
                                                disabled={isUploadingFiles}
                                                onChange={e => {
                                                    const files = Array.from(e.target.files || []);
                                                    e.target.value = '';
                                                    void handleFileUpload(files);
                                                }}
                                            />
                                            {uploadError && (
                                                <span className="form-hint" style={{ color: 'var(--ui-danger-bg)' }}>{uploadError}</span>
                                            )}
                                        </div>
                                        <div className="sources-urls">
                                            <label className="form-label" htmlFor="template-url-input">Add URL</label>
                                            <div className="sources-url-row">
                                                <input
                                                    id="template-url-input"
                                                    className="form-input sources-input-box"
                                                    type="text"
                                                    value={_urlInput}
                                                    onChange={e => setUrlInput(e.target.value)}
                                                    placeholder="https://example.com/document"
                                                />
                                                <button
                                                    className="sources-url-add-btn"
                                                    type="button"
                                                    onClick={() => {
                                                        const url = _urlInput.trim();
                                                        if (!url) return;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            sources: [...(prev.sources || []), url]
                                                        }));
                                                        setUrlInput('');
                                                    }}
                                                    title="Add URL"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                            {/* Show added URLs */}
                                            {(formData.sources ?? []).filter(src => src.startsWith('http')).length > 0 && (
                                                <ul className="sources-url-list">
                                                    {(formData.sources ?? []).filter(src => src.startsWith('http')).map(url => (
                                                        <li className="sources-url-item" key={url}>
                                                            <span className="sources-list-ellipsis">{url}</span>
                                                            <button type="button" className="sources-url-remove" onClick={() => setFormData(prev => ({ ...prev, sources: (prev.sources ?? []).filter(s => s !== url) }))} title="Remove URL">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    {/* Show uploaded files (all non-URL sources) */}
                                    {(formData.sources ?? []).filter(src => !src.startsWith('http')).length > 0 && (
                                        <div className="sources-files-list-wrap">
                                            <div className="sources-files-label">Files:</div>
                                            <ul className="sources-url-list">
                                                {(formData.sources ?? []).filter(src => !src.startsWith('http')).map(file => (
                                                    <li className="sources-url-item" key={file}>
                                                        <span className="sources-list-ellipsis" title={file}>{displayName(file)}</span>
                                                        <button type="button" className="sources-url-remove" onClick={() => setFormData(prev => ({ ...prev, sources: (prev.sources ?? []).filter(s => s !== file) }))} title="Remove file">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </fieldset>
                            </>
                        )}
                        {activeTab === 'settings' && (
                            <>
                                {/* System Prompt */}
                                <FormField label="System Prompt" htmlFor="template-system-prompt" hint="The system prompt guides the AI's behavior for this template.">
                                    <textarea
                                        id="template-system-prompt"
                                        className="form-textarea"
                                        value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).system_prompt}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), system_prompt: e.target.value }
                                        })}
                                        placeholder="Custom instructions for the AI (optional)"
                                        rows={3}
                                    />
                                </FormField>
                                {/* Model Dropdown */}
                                <FormField label="Model" htmlFor="template-model">
                                    <select
                                        id="template-model"
                                        className="form-select"
                                        value={formData.settings?.model || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), model: e.target.value }
                                        })}
                                    >
                                        {availableModels.length === 0 && (
                                            <option value={formData.settings?.model || DEFAULT_TEMPLATE_SETTINGS.model}>
                                                {prettifyModelName(formData.settings?.model || DEFAULT_TEMPLATE_SETTINGS.model)}
                                            </option>
                                        )}
                                        {availableModels.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                {/* Temperature Slider */}
                                <FormField
                                    label={`Temperature: ${(formData.settings || DEFAULT_TEMPLATE_SETTINGS).temperature.toFixed(1)}`}
                                    htmlFor="template-temp"
                                    hint="0 = Focused and deterministic, 1 = Creative and random"
                                >
                                    <input
                                        id="template-temp"
                                        className="form-input"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).temperature}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), temperature: parseFloat(e.target.value) }
                                        })}
                                    />
                                </FormField>
                                {/* Chunk Size */}
                                <FormField label="Chunk Size" htmlFor="template-chunksize" hint="Characters per chunk (default: 1000)">
                                    <input
                                        id="template-chunksize"
                                        className="form-input"
                                        type="number"
                                        min="1"
                                        value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).chunk_size}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), chunk_size: parseInt(e.target.value) || 1000 }
                                        })}
                                    />
                                </FormField>
                                {/* Chunk Overlap */}
                                <FormField label="Chunk Overlap" htmlFor="template-chunkoverlap" hint="Overlapping characters between chunks (default: 200)">
                                    <input
                                        id="template-chunkoverlap"
                                        className="form-input"
                                        type="number"
                                        min="0"
                                        value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).chunk_overlap}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), chunk_overlap: parseInt(e.target.value) || 200 }
                                        })}
                                    />
                                </FormField>
                                {/* Retrieval K */}
                                <FormField label="Retrieved Chunks (K)" htmlFor="template-retrievalk" hint="How many relevant chunks to retrieve (default: 4)">
                                    <input
                                        id="template-retrievalk"
                                        className="form-input"
                                        type="number"
                                        min="1"
                                        value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).retrieval_k}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), retrieval_k: parseInt(e.target.value) || 4 }
                                        })}
                                    />
                                </FormField>
                            </>
                        )}
                    </div>
                    {/* Error Message */}
                    {error && (
                        <div className="form-error">❌ {error}</div>
                    )}
                    {/* Success Message */}
                    {success && (
                        <div className="form-success">✅ {success}</div>
                    )}
                    {/* Save Button */}
                    <button
                        className="form-submit"
                        type="submit"
                        disabled={isLoading || isUploadingFiles}
                    >
                        {isUploadingFiles ? 'Uploading files…' : isLoading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Template' : 'Update Template')}
                    </button>
                </form>
            </div>
        </Modal>
    );
}

export default TemplateBuilder;