/**
 * Zarith Template Engine
 * Biblioteca de boilerplates e componentes pré-definidos.
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  type: 'full-project' | 'component' | 'module';
  files: { path: string; content: string }[];
}

const BOILERPLATES: Template[] = [
  {
    id: 'nextjs-auth-crud',
    name: 'Next.js + Supabase Auth & CRUD',
    description: 'Template completo com autenticação, dashboard e operações de banco.',
    type: 'full-project',
    files: [
      { path: 'package.json', content: '{ "name": "zarith-app", "dependencies": { "next": "latest", "@supabase/supabase-js": "latest" } }' },
      { path: 'lib/supabase.ts', content: 'import { createClient } from "@supabase/supabase-js";' },
      { path: 'pages/index.tsx', content: 'export default function Home() { return <div>Zarith App</div> }' }
    ]
  },
  {
    id: 'react-dashboard-ui',
    name: 'Dashboard UI Component',
    description: 'Layout de dashboard moderno com sidebar e charts.',
    type: 'component',
    files: [
      { path: 'components/Dashboard.tsx', content: 'export const Dashboard = () => { return <aside>Sidebar</aside> }' }
    ]
  }
];

export const templatesService = {
  listTemplates() {
    return BOILERPLATES;
  },

  findTemplate(query: string) {
    const q = query.toLowerCase();
    return BOILERPLATES.find(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  },

  getTemplateById(id: string) {
    return BOILERPLATES.find(t => t.id === id);
  }
};
