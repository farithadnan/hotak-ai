import { useState } from 'react';
import { createTemplate } from '../services';
import type { TemplateCreate } from '../types/models';
import { DEFAULT_TEMPLATE_SETTINGS } from '../types/models';

function TemplateBuilder() {
    // State for form data
    const [formData, setFormData] = useState<TemplateCreate>({
        name: '',
        description: '',
        sources: [],
        settings: DEFAULT_TEMPLATE_SETTINGS || {}
    });

    // Add these new state variables:
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent page reload

        // Clear previous messages
        setError(null);
        setSuccess(null);

        // Validate name
        if (!formData.name.trim()) {
            setError('Template name is required');
            return;
        }

        try {
            setIsLoading(true);
            
            // Call API to create template
            const created = await createTemplate(formData);
            
            // Success!
            setSuccess(`Template "${created.name}" created successfully!`);
            
            // Reset form
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
        <div>
            <h2>Create New Template</h2>
            <form onSubmit={handleSubmit}>
                {/* Name Field */}
                <div>
                    <label>Template Name *</label>
                    <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Python Documentation Helper"
                    required
                    />
                </div>

                {/* Description Field */}
                <div>
                <label>Description (optional)</label>
                <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this template for?"
                    rows={3}
                />
                </div>

                {/* Sources Field */}
                <div>
                <label>Document Sources (optional)</label>
                <textarea
                    value={(formData.sources || []).join('\n')}
                    onChange={(e) => setFormData({ 
                    ...formData, 
                    sources: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    placeholder="Enter URLs or file paths, one per line"
                    rows={4}
                />
                </div>

                {/* Settings Section */}
                <fieldset style={{ border: '1px solid #ccc', padding: '15px', marginTop: '20px' }}>
                    <legend>Settings</legend>
                    
                    {/* Model Dropdown */}
                    <div>
                        <label>Model</label>
                        <select
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
                    <div>
                        <label>
                            Temperature: {(formData.settings || DEFAULT_TEMPLATE_SETTINGS).temperature.toFixed(1)}
                        </label>
                        <input
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
                        <small style={{ display: 'block', color: '#666' }}>
                            0 = Focused and deterministic, 1 = Creative and random
                        </small>
                    </div>

                    {/* Chunk Size */}
                    <div>
                        <label>Chunk Size</label>
                        <input
                            type="number"
                            min="1"
                            value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).chunk_size}
                            onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), chunk_size: parseInt(e.target.value) || 1000 }
                            })}
                        />
                        <small style={{ display: 'block', color: '#666' }}>
                            Characters per chunk (default: 1000)
                        </small>
                    </div>

                    {/* Chunk Overlap */}
                    <div>
                        <label>Chunk Overlap</label>
                        <input
                            type="number"
                            min="0"
                            value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).chunk_overlap}
                            onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), chunk_overlap: parseInt(e.target.value) || 200 }
                            })}
                        />
                        <small style={{ display: 'block', color: '#666' }}>
                            Overlapping characters between chunks (default: 200)
                        </small>
                    </div>

                    {/* Retrieval K */}
                    <div>
                        <label>Retrieved Chunks (K)</label>
                        <input
                            type="number"
                            min="1"
                            value={(formData.settings || DEFAULT_TEMPLATE_SETTINGS).retrieval_k}
                            onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...(formData.settings || DEFAULT_TEMPLATE_SETTINGS), retrieval_k: parseInt(e.target.value) || 4 }
                            })}
                        />
                        <small style={{ display: 'block', color: '#666' }}>
                            How many relevant chunks to retrieve (default: 4)
                        </small>
                    </div>
                </fieldset>


                {/* Error Message */}
                {error && (
                <div style={{ color: 'red', padding: '10px', backgroundColor: '#fee', marginTop: '10px' }}>
                    ❌ {error}
                </div>
                )}

                {/* Success Message */}
                {success && (
                <div style={{ color: 'green', padding: '10px', backgroundColor: '#efe', marginTop: '10px' }}>
                    ✅ {success}
                </div>
                )}

                {/* Save Button */}
                <button 
                type="submit" 
                disabled={isLoading || !formData.name.trim()}
                style={{ 
                    marginTop: '20px', 
                    padding: '10px 20px',
                    opacity: (isLoading || !formData.name.trim()) ? 0.5 : 1
                }}
                >
                {isLoading ? 'Creating...' : 'Create Template'}
                </button>

            </form>
        </div>
    );
}

export default TemplateBuilder;