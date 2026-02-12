import { useState } from 'react';
import { createTemplate } from '../services';
import type { TemplateCreate } from '../types/models';
import { DEFAULT_TEMPLATE_SETTINGS } from '../types/models';
import { Plus, X } from 'lucide-react';

function TemplateBuilder() {
    // State for form data
    const [formData, setFormData] = useState<TemplateCreate>({
        name: '',
        description: '',
        sources: [],
        settings: DEFAULT_TEMPLATE_SETTINGS || {}
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'settings'>('basic');
    const [_urlInput, setUrlInput] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.name.trim()) {
            setError('Template name is required');
            return;
        }
        try {
            setIsLoading(true);
            const created = await createTemplate(formData);
            setSuccess(`Template "${created.name}" created successfully!`);
            setFormData({
                name: '',
                description: '',
                sources: [],
                settings: DEFAULT_TEMPLATE_SETTINGS
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create template');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="form-title">Create New Template</h2>
            <div className="form-tabs">
                <button
                    type="button"
                    className={activeTab === 'basic' ? 'form-tab is-active' : 'form-tab'}
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
            <form className="form" onSubmit={handleSubmit} autoComplete="off" style={{ flex: 1, minHeight: 0 }}>
                <div className="form-tab-panel">
                    {activeTab === 'basic' && (
                        <>
                            {/* Name Field */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-name">Template Name *</label>
                                <input
                                    id="template-name"
                                    className="form-input"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Python Documentation Helper"
                                    required
                                    autoFocus
                                />
                            </div>
                            {/* Description Field */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-desc">Description (optional)</label>
                                <textarea
                                    id="template-desc"
                                    className="form-textarea"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What is this template for?"
                                    rows={3}
                                />
                            </div>
                            {/* Document Sources: File Upload and URLs */}
                            <fieldset className="form-fieldset sources-fieldset">
                                <legend className="form-legend">Document Sources</legend>
                                <div className="sources-section sources-row">
                                    <div className="sources-upload">
                                        <label className="form-label" htmlFor="template-files">Upload Files</label>
                                        <input
                                            id="template-files"
                                            className="form-input sources-input-box"
                                            type="file"
                                            multiple
                                            onChange={e => {
                                                const files = Array.from(e.target.files || []);
                                                const fileNames = files.map(f => f.name);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    sources: [...(prev.sources || []), ...fileNames]
                                                }));
                                                e.target.value = '';
                                            }}
                                        />
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
                                                        {url}
                                                        <button type="button" className="sources-url-remove" onClick={() => setFormData(prev => ({ ...prev, sources: (prev.sources ?? []).filter(s => s !== url) }))} title="Remove URL">
                                                            <X size={16} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                {/* Show uploaded files */}
                                {(formData.sources ?? []).filter(src => !src.startsWith('http')).length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.95rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Files:</div>
                                        <ul className="sources-url-list">
                                            {(formData.sources ?? []).filter(src => !src.startsWith('http')).map(file => (
                                                <li className="sources-url-item" key={file}>
                                                    {file}
                                                    <button type="button" className="sources-url-remove" onClick={() => setFormData(prev => ({ ...prev, sources: (prev.sources ?? []).filter(s => s !== file) }))} title="Remove file">
                                                        <X size={16} />
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
                            {/* System Prompt (move to top) */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-system-prompt">System Prompt</label>
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
                                <span className="form-hint">
                                    The system prompt guides the AI's behavior for this template.
                                </span>
                            </div>
                            {/* Model Dropdown */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-model">Model</label>
                                <select
                                    id="template-model"
                                    className="form-select"
                                    value={formData.settings?.model || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), model: e.target.value }
                                    })}
                                >
                                    <option value="gpt-4o-mini">GPT-4o Mini (Fast, Cheap)</option>
                                    <option value="gpt-4o">GPT-4o (Better Quality)</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                            {/* Temperature Slider */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-temp">
                                    Temperature: {(formData.settings || DEFAULT_TEMPLATE_SETTINGS).temperature.toFixed(1)}
                                </label>
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
                                <span className="form-hint">
                                    0 = Focused and deterministic, 1 = Creative and random
                                </span>
                            </div>
                            {/* Chunk Size */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-chunksize">Chunk Size</label>
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
                                <span className="form-hint">
                                    Characters per chunk (default: 1000)
                                </span>
                            </div>
                            {/* Chunk Overlap */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-chunkoverlap">Chunk Overlap</label>
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
                                <span className="form-hint">
                                    Overlapping characters between chunks (default: 200)
                                </span>
                            </div>
                            {/* Retrieval K */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="template-retrievalk">Retrieved Chunks (K)</label>
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
                                <span className="form-hint">
                                    How many relevant chunks to retrieve (default: 4)
                                </span>
                            </div>
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
                    disabled={isLoading || !formData.name.trim()}
                >
                    {isLoading ? 'Creating...' : 'Create Template'}
                </button>
            </form>
        </div>
    );
}

export default TemplateBuilder;