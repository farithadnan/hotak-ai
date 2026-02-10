import { useState, useEffect } from 'react';
import { getTemplates } from '../services';
import type { Template } from '../types/models';

function TemplateList() {
  // State to store fetched templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates when component mounts
  useEffect(() => {
    loadTemplates();
  }, []); // Empty array = run once on mount

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Templates</h2>
      
      {isLoading && <p>Loading templates...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {!isLoading && !error && templates.length === 0 && (
        <p>No templates yet. Create your first template above!</p>
      )}
      
      {!isLoading && !error && templates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {templates.map((template) => (
            <div 
              key={template.id} 
              style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{template.name}</h3>
              <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                {template.description || 'No description'}
              </p>
              <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>
                Sources: {template.sources?.length ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplateList;