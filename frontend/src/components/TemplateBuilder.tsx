import { useState } from 'react';
import type { TemplateCreate } from '../types/models';
import { DEFAULT_TEMPLATE_SETTINGS } from '../types/models';

function TemplateBuilder() {
  // State for form data
  const [formData, setFormData] = useState<TemplateCreate>({
    name: '',
    description: '',
    sources: [],
    settings: DEFAULT_TEMPLATE_SETTINGS
  });

  return (
    <div>
      <h2>Create New Template</h2>
      <form>
        <p>Form fields will go here</p>
      </form>
    </div>
  );
}

export default TemplateBuilder;