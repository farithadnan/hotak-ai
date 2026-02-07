import { useState, useEffect } from 'react';
import { getTemplates, deleteTemplate } from '../services/api';
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
      
      console.log('Fetching templates...');
      const data = await getTemplates();
      console.log('Received data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array?', Array.isArray(data));
      
      setTemplates(data.templates);
      
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>My Templates</h2>
      
      {isLoading && <p>Loading templates...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <p>Templates loaded: {templates.length}</p>
    </div>
  );
}

export default TemplateList;